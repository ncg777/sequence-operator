/**
 * store.ts — Persistence and undo/redo for the Patch editor.
 *
 * Programs are stored in localStorage under `SEQOP_*` keys (consistent with the
 * classic interface). The working copy is autosaved on every mutation, and a
 * snapshot-based undo/redo history (>= 100 steps) backs all structural and
 * parameter edits.
 */
import type { Graph } from './graph';
import { cloneGraph, FORMAT_VERSION } from './graph';

const PROGRAMS_KEY = 'SEQOP_programs';
const CURRENT_KEY = 'SEQOP_currentProgram';

interface StoredProgram {
  graph: Graph;
  updatedAt: number;
}

export interface ProgramMeta {
  id: string;
  name: string;
  nodeCount: number;
  updatedAt: number;
}

function readMap(): Record<string, StoredProgram> {
  try {
    const raw = localStorage.getItem(PROGRAMS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, StoredProgram>;
  } catch {
    return {};
  }
}

function writeMap(map: Record<string, StoredProgram>): void {
  localStorage.setItem(PROGRAMS_KEY, JSON.stringify(map));
}

export function listPrograms(): ProgramMeta[] {
  const map = readMap();
  return Object.values(map)
    .map((s) => ({ id: s.graph.id, name: s.graph.name, nodeCount: s.graph.nodes.length, updatedAt: s.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProgram(id: string): Graph | undefined {
  const map = readMap();
  const s = map[id];
  return s ? cloneGraph(s.graph) : undefined;
}

export function saveProgram(graph: Graph): void {
  const map = readMap();
  map[graph.id] = { graph: cloneGraph(graph), updatedAt: Date.now() };
  writeMap(map);
}

export function deleteProgram(id: string): void {
  const map = readMap();
  delete map[id];
  writeMap(map);
}

export function renameProgram(id: string, name: string): void {
  const map = readMap();
  if (map[id]) {
    map[id].graph.name = name;
    map[id].updatedAt = Date.now();
    writeMap(map);
  }
}

/** Resolver used by the evaluator to look up subprogram references. */
export function resolveProgram(id: string): Graph | undefined {
  return getProgram(id);
}

// --- Working copy autosave (debounced) ---
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveCurrent(graph: Graph): void {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    localStorage.setItem(CURRENT_KEY, JSON.stringify(graph));
  }, 300);
}

export function loadCurrent(): Graph | null {
  try {
    const raw = localStorage.getItem(CURRENT_KEY);
    if (!raw) return null;
    const g = JSON.parse(raw) as Graph;
    if (!g || typeof g !== 'object' || !Array.isArray(g.nodes)) return null;
    if (typeof g.formatVersion !== 'number') g.formatVersion = FORMAT_VERSION;
    return g;
  } catch {
    return null;
  }
}

// --- Undo / redo ---
export class UndoStack {
  private undoStack: string[] = [];
  private redoStack: string[] = [];
  private lastKey: string | null = null;
  private readonly limit: number;

  constructor(limit = 200) {
    this.limit = limit;
  }

  /** Record the current state. `coalesceKey` merges consecutive edits of the same field. */
  push(graph: Graph, coalesceKey?: string): void {
    const snapshot = JSON.stringify(graph);
    if (this.undoStack.length > 0) {
      const top = this.undoStack[this.undoStack.length - 1];
      if (top === snapshot) return;
      if (coalesceKey && coalesceKey === this.lastKey) {
        this.undoStack[this.undoStack.length - 1] = snapshot;
        this.redoStack = [];
        return;
      }
    }
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.limit) this.undoStack.shift();
    this.redoStack = [];
    this.lastKey = coalesceKey ?? null;
  }

  canUndo(): boolean {
    return this.undoStack.length > 1;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): Graph | null {
    if (this.undoStack.length <= 1) return null;
    const current = this.undoStack.pop() as string;
    this.redoStack.push(current);
    this.lastKey = null;
    return JSON.parse(this.undoStack[this.undoStack.length - 1]) as Graph;
  }

  redo(): Graph | null {
    const next = this.redoStack.pop();
    if (!next) return null;
    this.undoStack.push(next);
    this.lastKey = null;
    return JSON.parse(next) as Graph;
  }

  reset(graph: Graph): void {
    this.undoStack = [JSON.stringify(graph)];
    this.redoStack = [];
    this.lastKey = null;
  }
}
