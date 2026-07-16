/**
 * nodes.ts — Node type registry for the Patch editor.
 *
 * Each node type is declared once with its metadata, ports, parameters and an
 * `evaluate` function that delegates to `src/lib.ts`. The palette, canvas
 * rendering, serialization and evaluator are all driven by this registry, so
 * adding a future operation means adding one entry (or, for combiner/operation
 * combinations, nothing at all — those lists are derived at runtime from the
 * `COMBINERS`/`OPERATIONS` exports).
 */
import {
  COMBINERS,
  OPERATIONS,
  UNARY_TRITWISE_OPS,
  combine,
  append,
  rotate,
  reverse,
  difference,
  antidifference,
  cyclicalDifference,
  cyclicalAntidifference,
  signs,
  timesN,
  permuteBlocks,
  hierarchicalPermute,
  unaryTritwise,
  permutationOrbit,
} from '@/lib';
import type { Combiner, Operation, UnaryTritwiseOpName } from '@/lib';
import type { Graph, NodeInstance, PortType } from './graph';

export type NodeCategory = 'source' | 'binary' | 'unary' | 'tritwise' | 'program' | 'sink' | 'misc';

export interface PortDef {
  name: string;
  type: PortType;
  label: string;
  /** Optional ports have an inline parameter fallback when unwired. */
  optional?: boolean;
}

export type ParamKind = 'seqtext' | 'text' | 'number' | 'select' | 'slot';

export interface SelectOption {
  title: string;
  value: string;
}

export interface ParamDef {
  key: string;
  label: string;
  kind: ParamKind;
  default: unknown;
  options?: SelectOption[];
  /** Inline control is dimmed/disabled when this input port is wired. */
  boundPort?: string;
}

export interface MemoryAccess {
  read(slot: number): string;
  write(slot: number, value: string): void;
}

export interface EvalContext {
  inputs: Record<string, string | undefined>;
  params: Record<string, unknown>;
  memory: MemoryAccess;
  base: number;
  wordSize: number;
}

export interface NodeType {
  type: string;
  label: string;
  category: NodeCategory;
  icon: string;
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  description?: string;
  /** Dynamic ports are resolved elsewhere (subprogram instances). */
  dynamicPorts?: boolean;
  isNondeterministic?: (params: Record<string, unknown>) => boolean;
  /** Return the outputs by port name, or `null` to signal a waiting/no-value state. */
  evaluate?: (ctx: EvalContext) => Record<string, string> | null;
}

export interface PaletteEntry {
  type: string;
  label: string;
  category: NodeCategory;
  icon: string;
  params?: Record<string, unknown>;
  keywords?: string;
  /** For saved-program subprogram entries. */
  programId?: string;
}

export const CATEGORY_COLORS: Record<NodeCategory, string> = {
  source: '#2e7d32',
  binary: '#1565c0',
  unary: '#6a1b9a',
  tritwise: '#00838f',
  program: '#e65100',
  sink: '#455a64',
  misc: '#5d4037',
};

export const CATEGORY_LABELS: Record<NodeCategory, string> = {
  source: 'Sources & Sinks',
  binary: 'Combine',
  unary: 'Unary',
  tritwise: 'Tritwise',
  program: 'Programs',
  sink: 'Sources & Sinks',
  misc: 'Misc',
};

// --- Options derived at runtime from the library exports ---
const combinerOptions: SelectOption[] = COMBINERS.map((c) => ({ title: String(c), value: String(c) }));
const operationOptions: SelectOption[] = OPERATIONS.map((o) => ({ title: String(o), value: String(o) }));
const tritwiseOpNames = Object.keys(UNARY_TRITWISE_OPS) as UnaryTritwiseOpName[];
const tritwiseOptions: SelectOption[] = tritwiseOpNames.map((n) => ({ title: n, value: n }));

// --- Helpers ---
function parseIntList(s: string): number[] {
  return s
    .trim()
    .split(/\s+/)
    .filter((x) => x !== '')
    .map((x) => parseInt(x, 10))
    .filter((x) => !isNaN(x));
}

function firstInt(portVal: string | undefined, paramVal: unknown): number {
  if (portVal !== undefined && portVal.trim() !== '') {
    return Math.trunc(Number(portVal.trim().split(/\s+/)[0]));
  }
  return Math.trunc(Number(paramVal));
}

function seqOrParam(portVal: string | undefined, paramVal: unknown): string {
  return portVal !== undefined ? portVal : String(paramVal ?? '');
}

const SEQ = (name: string, label: string, optional = false): PortDef => ({ name, type: 'Seq', label, optional });
const NUM = (name: string, label: string, optional = false): PortDef => ({ name, type: 'Num', label, optional });

// --- Registry ---
const registry: Record<string, NodeType> = {};
function register(t: NodeType) {
  registry[t.type] = t;
}

// Source / sink nodes
register({
  type: 'sequence',
  label: 'Sequence',
  category: 'source',
  icon: 'mdi-numeric',
  inputs: [],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'value', label: 'value', kind: 'seqtext', default: '' }],
  description: 'Literal sequence source (respects the display base).',
  evaluate: ({ params, base }) => {
    const raw = String(params.value ?? '').trim();
    if (!raw) return null;
    const nums = raw.split(/\s+/).filter((s) => s !== '').map((s) => parseInt(s, base || 10));
    if (nums.some((n) => isNaN(n))) throw new Error('Invalid sequence literal.');
    return { out: nums.join(' ') };
  },
});

register({
  type: 'number',
  label: 'Number',
  category: 'source',
  icon: 'mdi-pound',
  inputs: [],
  outputs: [NUM('out', 'out')],
  params: [{ key: 'value', label: 'value', kind: 'number', default: 0 }],
  description: 'Scalar integer constant for parameter ports.',
  evaluate: ({ params }) => {
    const v = params.value;
    if (v === '' || v === null || v === undefined) return null;
    const n = Math.trunc(Number(v));
    if (isNaN(n)) return null;
    return { out: String(n) };
  },
});

register({
  type: 'memoryRead',
  label: 'Memory Read',
  category: 'source',
  icon: 'mdi-memory',
  inputs: [],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'slot', label: 'slot', kind: 'slot', default: 0 }],
  description: 'Emits the content of a shared memory slot M[i].',
  evaluate: ({ params, memory }) => {
    const val = memory.read(Math.trunc(Number(params.slot)) || 0).trim();
    if (!val) return null;
    return { out: val };
  },
});

register({
  type: 'memoryWrite',
  label: 'Memory Write',
  category: 'source',
  icon: 'mdi-content-save',
  inputs: [SEQ('in', 'in')],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'slot', label: 'slot', kind: 'slot', default: 0 }],
  description: 'Writes its input into a shared memory slot; passes value through.',
  evaluate: ({ inputs, params, memory }) => {
    const val = inputs.in ?? '';
    memory.write(Math.trunc(Number(params.slot)) || 0, val);
    return { out: val };
  },
});

register({
  type: 'display',
  label: 'Display',
  category: 'sink',
  icon: 'mdi-eye',
  inputs: [SEQ('in', 'in')],
  outputs: [],
  params: [],
  description: 'Terminal sink for viewing/copying a result.',
  evaluate: () => ({}),
});

// Binary combine node (parameterized by combiner + operation)
register({
  type: 'combine',
  label: 'Combine',
  category: 'binary',
  icon: 'mdi-set-merge',
  inputs: [SEQ('x', 'x'), SEQ('y', 'y')],
  outputs: [SEQ('out', 'out')],
  params: [
    { key: 'combiner', label: 'Combiner', kind: 'select', default: combinerOptions[0]?.value ?? 'Product', options: combinerOptions },
    { key: 'operation', label: 'Operation', kind: 'select', default: operationOptions[0]?.value ?? 'Add', options: operationOptions },
  ],
  description: 'Combines two sequences via lib.combine(combiner, operation, x, y).',
  isNondeterministic: (params) => params.operation === 'RandInt',
  evaluate: ({ inputs, params }) => {
    const out = combine(params.combiner as Combiner, params.operation as Operation, inputs.x ?? '', inputs.y ?? '');
    return { out };
  },
});

register({
  type: 'append',
  label: 'Append',
  category: 'binary',
  icon: 'mdi-plus-box-outline',
  inputs: [SEQ('x', 'x'), SEQ('y', 'y')],
  outputs: [SEQ('out', 'out')],
  params: [],
  description: 'Appends sequence y to the end of sequence x.',
  evaluate: ({ inputs }) => ({ out: append(inputs.x ?? '', inputs.y ?? '') }),
});

// Unary sequence nodes
register({
  type: 'reverse',
  label: 'Reverse',
  category: 'unary',
  icon: 'mdi-rewind',
  inputs: [SEQ('in', 'in')],
  outputs: [SEQ('out', 'out')],
  params: [],
  evaluate: ({ inputs }) => ({ out: reverse(inputs.in ?? '') }),
});

register({
  type: 'rotate',
  label: 'Rotate',
  category: 'unary',
  icon: 'mdi-refresh',
  inputs: [SEQ('in', 'in'), NUM('n', 'n', true)],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'n', label: 'n', kind: 'number', default: 1, boundPort: 'n' }],
  evaluate: ({ inputs, params }) => ({ out: rotate(inputs.in ?? '', firstInt(inputs.n, params.n)) }),
});

register({
  type: 'difference',
  label: 'Difference (Δ)',
  category: 'unary',
  icon: 'mdi-delta',
  inputs: [SEQ('in', 'in')],
  outputs: [SEQ('out', 'out')],
  params: [],
  evaluate: ({ inputs }) => ({ out: difference(inputs.in ?? '') }),
});

register({
  type: 'antidifference',
  label: 'Antidifference (∑)',
  category: 'unary',
  icon: 'mdi-sigma',
  inputs: [SEQ('in', 'in'), NUM('k', 'k', true)],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'k', label: 'k', kind: 'number', default: 0, boundPort: 'k' }],
  evaluate: ({ inputs, params }) => ({ out: antidifference(inputs.in ?? '', firstInt(inputs.k, params.k)) }),
});

register({
  type: 'cyclicalDifference',
  label: 'Cyclical Difference',
  category: 'unary',
  icon: 'mdi-delta',
  inputs: [SEQ('in', 'in')],
  outputs: [SEQ('out', 'out')],
  params: [],
  evaluate: ({ inputs }) => ({ out: cyclicalDifference(inputs.in ?? '') }),
});

register({
  type: 'cyclicalAntidifference',
  label: 'Cyclical Antidifference',
  category: 'unary',
  icon: 'mdi-sigma',
  inputs: [SEQ('in', 'in'), NUM('k', 'k', true)],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'k', label: 'k', kind: 'number', default: 0, boundPort: 'k' }],
  evaluate: ({ inputs, params }) => ({ out: cyclicalAntidifference(inputs.in ?? '', firstInt(inputs.k, params.k)) }),
});

register({
  type: 'signs',
  label: 'Signs',
  category: 'unary',
  icon: 'mdi-plus-minus',
  inputs: [SEQ('in', 'in')],
  outputs: [SEQ('out', 'out')],
  params: [],
  evaluate: ({ inputs }) => ({ out: signs(inputs.in ?? '') }),
});

register({
  type: 'timesN',
  label: 'Times N (×n)',
  category: 'unary',
  icon: 'mdi-close',
  inputs: [SEQ('in', 'in'), NUM('n', 'n', true)],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'n', label: 'n', kind: 'number', default: 2, boundPort: 'n' }],
  evaluate: ({ inputs, params }) => ({ out: timesN(inputs.in ?? '', firstInt(inputs.n, params.n)) }),
});

register({
  type: 'permuteBlocks',
  label: 'Permute Blocks (π)',
  category: 'unary',
  icon: 'mdi-shuffle-variant',
  inputs: [SEQ('in', 'in'), SEQ('p', 'p', true)],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'p', label: 'permutation', kind: 'seqtext', default: '1 0', boundPort: 'p' }],
  evaluate: ({ inputs, params }) => ({ out: permuteBlocks(inputs.in ?? '', parseIntList(seqOrParam(inputs.p, params.p))) }),
});

register({
  type: 'hierarchicalPermute',
  label: 'Hierarchical Permute (H)',
  category: 'unary',
  icon: 'mdi-file-tree',
  inputs: [SEQ('in', 'in'), SEQ('c', 'c', true), SEQ('p', 'p', true)],
  outputs: [SEQ('out', 'out')],
  params: [
    { key: 'c', label: 'composition', kind: 'seqtext', default: '1 1', boundPort: 'c' },
    { key: 'p', label: 'permutation', kind: 'seqtext', default: '1 0', boundPort: 'p' },
  ],
  evaluate: ({ inputs, params }) => ({
    out: hierarchicalPermute(inputs.in ?? '', parseIntList(seqOrParam(inputs.c, params.c)), parseIntList(seqOrParam(inputs.p, params.p))),
  }),
});

register({
  type: 'permutationOrbit',
  label: 'Permutation Orbit',
  category: 'unary',
  icon: 'mdi-atom',
  inputs: [SEQ('in', 'in')],
  outputs: [SEQ('out', 'out')],
  params: [],
  evaluate: ({ inputs }) => ({ out: permutationOrbit(inputs.in ?? '') }),
});

// Unary tritwise node
register({
  type: 'tritwise',
  label: 'Tritwise (▽)',
  category: 'tritwise',
  icon: 'mdi-triangle-outline',
  inputs: [SEQ('in', 'in')],
  outputs: [SEQ('out', 'out')],
  params: [{ key: 'op', label: 'operation', kind: 'select', default: tritwiseOptions[0]?.value ?? 'Buf', options: tritwiseOptions }],
  evaluate: ({ inputs, params }) => ({ out: unaryTritwise(inputs.in ?? '', params.op as UnaryTritwiseOpName) }),
});

// Program composition nodes
register({
  type: 'input',
  label: 'Input',
  category: 'program',
  icon: 'mdi-import',
  inputs: [],
  outputs: [SEQ('out', 'out')],
  params: [
    { key: 'name', label: 'name', kind: 'text', default: 'in' },
    { key: 'ptype', label: 'type', kind: 'select', default: 'Seq', options: [{ title: 'Seq', value: 'Seq' }, { title: 'Num', value: 'Num' }] },
    { key: 'default', label: 'default', kind: 'seqtext', default: '' },
  ],
  description: 'Declares a named external input of the current program.',
  evaluate: ({ params }) => {
    // Top-level evaluation uses the declared default (subprogram binding is
    // handled by the evaluator before this is reached).
    const raw = String(params.default ?? '').trim();
    if (!raw) return null;
    return { out: raw };
  },
});

register({
  type: 'output',
  label: 'Output',
  category: 'program',
  icon: 'mdi-export',
  inputs: [SEQ('in', 'in')],
  outputs: [],
  params: [{ key: 'name', label: 'name', kind: 'text', default: 'out' }],
  description: 'Declares a named external output of the current program.',
  evaluate: () => ({}),
});

register({
  type: 'subprogram',
  label: 'Subprogram',
  category: 'program',
  icon: 'mdi-package-variant-closed',
  inputs: [],
  outputs: [],
  params: [{ key: 'programId', label: 'program', kind: 'text', default: '' }],
  description: 'An instance of another saved program.',
  dynamicPorts: true,
  // Evaluation is handled specially by the evaluator.
});

register({
  type: 'comment',
  label: 'Comment',
  category: 'misc',
  icon: 'mdi-comment-text-outline',
  inputs: [],
  outputs: [],
  params: [{ key: 'text', label: 'text', kind: 'text', default: 'Comment' }],
  description: 'Free-text sticky note.',
});

export const nodeTypes = registry;

export function getNodeType(type: string): NodeType | undefined {
  return registry[type];
}

/** Derive the input/output ports of a subprogram instance from a referenced program. */
export function subprogramPorts(refGraph: Graph | undefined): { inputs: PortDef[]; outputs: PortDef[] } {
  const inputs: PortDef[] = [];
  const outputs: PortDef[] = [];
  if (!refGraph) return { inputs, outputs };
  for (const n of refGraph.nodes) {
    if (n.type === 'input') {
      const name = String(n.params.name ?? 'in');
      const ptype: PortType = n.params.ptype === 'Num' ? 'Num' : 'Seq';
      inputs.push({ name, type: ptype, label: name });
    } else if (n.type === 'output') {
      const name = String(n.params.name ?? 'out');
      outputs.push({ name, type: 'Seq', label: name });
    }
  }
  return { inputs, outputs };
}

/** Resolve the effective ports of a node instance (static, or dynamic for subprograms). */
export function nodePorts(
  node: NodeInstance,
  resolveProgram?: (id: string) => Graph | undefined,
): { inputs: PortDef[]; outputs: PortDef[] } {
  const nt = registry[node.type];
  if (!nt) return { inputs: [], outputs: [] };
  if (nt.dynamicPorts && node.type === 'subprogram') {
    const ref = resolveProgram ? resolveProgram(String(node.params.programId ?? '')) : undefined;
    return subprogramPorts(ref);
  }
  return { inputs: nt.inputs, outputs: nt.outputs };
}

/** Base palette entries (saved-program subprogram entries are appended by the UI). */
export function basePaletteEntries(): PaletteEntry[] {
  const entries: PaletteEntry[] = [];

  // Sources & sinks
  for (const t of ['sequence', 'number', 'memoryRead', 'memoryWrite', 'display']) {
    const nt = registry[t];
    entries.push({ type: t, label: nt.label, category: nt.category, icon: nt.icon });
  }

  // Combine: generic + one preconfigured entry per combiner
  entries.push({ type: 'combine', label: 'Combine', category: 'binary', icon: registry.combine.icon, keywords: 'combiner operation binary' });
  entries.push({ type: 'append', label: 'Append', category: 'binary', icon: registry.append.icon, keywords: 'concat concatenate join binary' });
  for (const c of COMBINERS) {
    entries.push({
      type: 'combine',
      label: `Combine ▸ ${c}`,
      category: 'binary',
      icon: registry.combine.icon,
      params: { combiner: String(c) },
      keywords: `combine ${c}`,
    });
  }

  // Unary
  for (const t of [
    'reverse', 'rotate', 'difference', 'antidifference', 'cyclicalDifference',
    'cyclicalAntidifference', 'signs', 'timesN', 'permuteBlocks', 'hierarchicalPermute', 'permutationOrbit',
  ]) {
    const nt = registry[t];
    entries.push({ type: t, label: nt.label, category: nt.category, icon: nt.icon });
  }

  // Tritwise: generic + one preconfigured entry per op
  entries.push({ type: 'tritwise', label: 'Tritwise (▽)', category: 'tritwise', icon: registry.tritwise.icon, keywords: 'trit ternary' });
  for (const op of tritwiseOpNames) {
    entries.push({ type: 'tritwise', label: `Tritwise ▸ ${op}`, category: 'tritwise', icon: registry.tritwise.icon, params: { op }, keywords: `tritwise ${op}` });
  }

  // Programs
  entries.push({ type: 'input', label: 'Input', category: 'program', icon: registry.input.icon });
  entries.push({ type: 'output', label: 'Output', category: 'program', icon: registry.output.icon });

  // Misc
  entries.push({ type: 'comment', label: 'Comment', category: 'misc', icon: registry.comment.icon });

  return entries;
}

export { combinerOptions, operationOptions, tritwiseOptions };
