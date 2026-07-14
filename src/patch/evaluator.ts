/**
 * evaluator.ts — Reactive dataflow evaluation of a patch graph.
 *
 * Nodes are evaluated in topological order. Each node gathers the values of its
 * incoming edges; required inputs that are unwired or fed by a waiting/errored
 * upstream leave the node in a "waiting" state (no evaluation, no error).
 * Exceptions thrown by the underlying `lib.ts` functions are caught per node and
 * surfaced as that node's error. Non-deterministic nodes (e.g. RandInt) cache
 * their output so unrelated graph changes don't reroll them.
 */
import type { Graph, NodeInstance } from './graph';
import { topologicalOrder, incomingEdge, findNode } from './graph';
import { getNodeType, nodePorts, subprogramPorts } from './nodes';
import type { MemoryAccess } from './nodes';

export interface NodeResult {
  outputs: Record<string, string>;
  inputs: Record<string, string | undefined>;
  error?: string;
  waiting?: boolean;
  nondeterministic?: boolean;
}

export type EvalResults = Map<string, NodeResult>;

export interface CacheEntry {
  key: string;
  outputs: Record<string, string>;
}

export interface EvaluateOptions {
  memory: MemoryAccess;
  base: number;
  wordSize: number;
  resolveProgram?: (id: string) => Graph | undefined;
  cache?: Map<string, CacheEntry>;
  nonces?: Map<string, number>;
  /** Bound input values when evaluating a subprogram body (name -> value). */
  inputBindings?: Record<string, string | undefined>;
  /** Referenced program ids currently being evaluated (recursion guard). */
  programStack?: string[];
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`).join(',')}}`;
}

export function evaluateGraph(graph: Graph, opts: EvaluateOptions): EvalResults {
  const results: EvalResults = new Map();
  const cache = opts.cache;
  const nonces = opts.nonces;
  const stack = opts.programStack ?? [];

  const order = topologicalOrder(graph);
  const ordered = new Set(order);

  // Nodes not present in the topological order belong to a cycle.
  for (const n of graph.nodes) {
    if (!ordered.has(n.id)) {
      results.set(n.id, { outputs: {}, inputs: {}, error: 'Part of a cycle' });
    }
  }

  for (const id of order) {
    const node = findNode(graph, id);
    if (!node) continue;
    const nt = getNodeType(node.type);
    if (!nt) {
      results.set(id, { outputs: {}, inputs: {}, error: `Unknown node type: ${node.type}` });
      continue;
    }

    const ports = nodePorts(node, opts.resolveProgram);

    // Gather inputs from incoming edges.
    const inputs: Record<string, string | undefined> = {};
    let waiting = false;
    for (const port of ports.inputs) {
      const edge = incomingEdge(graph, id, port.name);
      if (edge) {
        const up = results.get(edge.from.node);
        const val = up && !up.error && !up.waiting ? up.outputs[edge.from.port] : undefined;
        if (val === undefined) {
          if (!port.optional) waiting = true;
        } else {
          inputs[port.name] = val;
        }
      } else if (!port.optional) {
        waiting = true;
      }
    }

    // Input nodes act as sources bound to the subprogram's arguments.
    if (node.type === 'input') {
      const name = String(node.params.name ?? 'in');
      const bound = opts.inputBindings ? opts.inputBindings[name] : undefined;
      if (bound !== undefined && bound !== '') {
        results.set(id, { outputs: { out: bound }, inputs });
        continue;
      }
    }

    if (waiting) {
      results.set(id, { outputs: {}, inputs, waiting: true });
      continue;
    }

    const nondeterministic = nt.isNondeterministic ? nt.isNondeterministic(node.params) : false;

    try {
      let out: Record<string, string> | null;

      if (node.type === 'subprogram') {
        out = evaluateSubprogram(node, inputs, opts, stack);
      } else if (nt.evaluate) {
        if (nondeterministic && cache) {
          const key = stableStringify({ inputs, params: node.params, nonce: nonces?.get(id) ?? 0 });
          const cached = cache.get(id);
          if (cached && cached.key === key) {
            results.set(id, { outputs: cached.outputs, inputs, nondeterministic: true });
            continue;
          }
          out = nt.evaluate({ inputs, params: node.params, memory: opts.memory, base: opts.base, wordSize: opts.wordSize });
          if (out) cache.set(id, { key, outputs: out });
        } else {
          out = nt.evaluate({ inputs, params: node.params, memory: opts.memory, base: opts.base, wordSize: opts.wordSize });
        }
      } else {
        out = {};
      }

      if (out === null) {
        results.set(id, { outputs: {}, inputs, waiting: true });
      } else {
        results.set(id, { outputs: out, inputs, nondeterministic });
      }
    } catch (e) {
      results.set(id, { outputs: {}, inputs, error: (e as Error).message || String(e) });
    }
  }

  return results;
}

function evaluateSubprogram(
  node: NodeInstance,
  inputs: Record<string, string | undefined>,
  opts: EvaluateOptions,
  stack: string[],
): Record<string, string> {
  const programId = String(node.params.programId ?? '');
  if (!programId) throw new Error('No program selected');
  const ref = opts.resolveProgram ? opts.resolveProgram(programId) : undefined;
  if (!ref) throw new Error('Referenced program not found');
  if (stack.includes(programId)) throw new Error('Recursive subprogram reference');

  const ports = subprogramPorts(ref);
  const bindings: Record<string, string | undefined> = {};
  for (const p of ports.inputs) bindings[p.name] = inputs[p.name];

  const subResults = evaluateGraph(ref, {
    ...opts,
    inputBindings: bindings,
    programStack: [...stack, programId],
    // Sub-evaluations use a fresh cache/nonces to stay isolated.
    cache: undefined,
    nonces: undefined,
  });

  const outputs: Record<string, string> = {};
  for (const n of ref.nodes) {
    if (n.type === 'output') {
      const name = String(n.params.name ?? 'out');
      const r = subResults.get(n.id);
      const val = r?.inputs?.in;
      if (val !== undefined) outputs[name] = val;
    }
  }
  return outputs;
}
