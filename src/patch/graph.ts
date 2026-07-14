/**
 * graph.ts — Graph model, topological sort and cycle detection for the Patch editor.
 *
 * A program is a directed acyclic graph (DAG) of node instances connected by
 * edges. Sequences flow along edges as space-separated integer strings (the
 * canonical format used by `lib.ts`).
 */

export type PortType = 'Seq' | 'Num';

export interface NodeInstance {
  id: string;
  type: string;
  x: number;
  y: number;
  params: Record<string, unknown>;
  /** Optional explicit size (used by comment nodes). */
  width?: number;
  height?: number;
}

export interface EndpointRef {
  node: string;
  port: string;
}

export interface Edge {
  id: string;
  from: EndpointRef;
  to: EndpointRef;
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface Graph {
  formatVersion: number;
  id: string;
  name: string;
  nodes: NodeInstance[];
  edges: Edge[];
  viewport: Viewport;
}

export const FORMAT_VERSION = 1;

/** RFC4122-ish v4 uuid (crypto when available, Math.random fallback). */
export function uuid(): string {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (c && typeof c.randomUUID === 'function') return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    const v = ch === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let nodeCounter = 0;
export function nextNodeId(): string {
  nodeCounter += 1;
  return `n${Date.now().toString(36)}_${nodeCounter}`;
}

export function createEmptyGraph(name = 'Untitled'): Graph {
  return {
    formatVersion: FORMAT_VERSION,
    id: uuid(),
    name,
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

export function findNode(graph: Graph, id: string): NodeInstance | undefined {
  return graph.nodes.find((n) => n.id === id);
}

/** The single edge feeding a given input port, if any. */
export function incomingEdge(graph: Graph, nodeId: string, port: string): Edge | undefined {
  return graph.edges.find((e) => e.to.node === nodeId && e.to.port === port);
}

/** All edges leaving a given output port. */
export function outgoingEdges(graph: Graph, nodeId: string, port: string): Edge[] {
  return graph.edges.filter((e) => e.from.node === nodeId && e.from.port === port);
}

/** Build adjacency (node -> downstream node ids) from edges. */
function buildAdjacency(graph: Graph): Map<string, Set<string>> {
  const adj = new Map<string, Set<string>>();
  for (const n of graph.nodes) adj.set(n.id, new Set());
  for (const e of graph.edges) {
    const set = adj.get(e.from.node);
    if (set) set.add(e.to.node);
  }
  return adj;
}

/**
 * Kahn topological sort. Returns node ids in evaluation order. If the graph
 * contains a cycle the returned array omits the nodes involved in the cycle
 * (callers treat missing nodes as un-evaluated).
 */
export function topologicalOrder(graph: Graph): string[] {
  const adj = buildAdjacency(graph);
  const indegree = new Map<string, number>();
  for (const n of graph.nodes) indegree.set(n.id, 0);
  for (const e of graph.edges) {
    indegree.set(e.to.node, (indegree.get(e.to.node) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, deg] of indegree) if (deg === 0) queue.push(id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift() as string;
    order.push(id);
    for (const next of adj.get(id) ?? []) {
      const d = (indegree.get(next) ?? 0) - 1;
      indegree.set(next, d);
      if (d === 0) queue.push(next);
    }
  }
  return order;
}

/** True when the graph currently contains at least one cycle. */
export function hasCycle(graph: Graph): boolean {
  return topologicalOrder(graph).length !== graph.nodes.length;
}

/**
 * Would adding an edge from `fromNode` to `toNode` create a cycle? An edge
 * A->B is safe unless B can already reach A (which would close a loop).
 */
export function wouldCreateCycle(graph: Graph, fromNode: string, toNode: string): boolean {
  if (fromNode === toNode) return true;
  const adj = buildAdjacency(graph);
  // Can `toNode` reach `fromNode` following existing edges?
  const stack = [toNode];
  const seen = new Set<string>();
  while (stack.length) {
    const cur = stack.pop() as string;
    if (cur === fromNode) return true;
    if (seen.has(cur)) continue;
    seen.add(cur);
    for (const next of adj.get(cur) ?? []) stack.push(next);
  }
  return false;
}

export function cloneGraph(graph: Graph): Graph {
  return JSON.parse(JSON.stringify(graph));
}
