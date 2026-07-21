/**
 * store.ts — Persistence and undo/redo for the Patch editor.
 *
 * Programs are stored in localStorage under `SEQOP_*` keys (consistent with the
 * classic interface). The working copy is autosaved on every mutation, and a
 * snapshot-based undo/redo history (>= 100 steps) backs all structural and
 * parameter edits.
 */
import type { Graph } from './graph';
import { cloneGraph, uuid, FORMAT_VERSION } from './graph';

const PROGRAMS_KEY = 'SEQOP_programs';
const CURRENT_KEY = 'SEQOP_currentProgram';
const FOLDERS_KEY = 'SEQOP_folders';

interface StoredProgram {
  graph: Graph;
  updatedAt: number;
  /** Containing folder id, or null/undefined for the root. */
  folderId?: string | null;
}

export interface ProgramMeta {
  id: string;
  name: string;
  nodeCount: number;
  updatedAt: number;
  folderId: string | null;
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
}

export interface ProgramTreeNode {
  folder: Folder | null; // null for the synthetic root
  folders: ProgramTreeNode[];
  programs: ProgramMeta[];
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
  try {
    localStorage.setItem(PROGRAMS_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors (QuotaExceededError, private mode, etc.)
  }
}

export function listPrograms(): ProgramMeta[] {
  const map = readMap();
  return Object.values(map)
    .map((s) => ({
      id: s.graph.id,
      name: s.graph.name,
      nodeCount: s.graph.nodes.length,
      updatedAt: s.updatedAt,
      folderId: s.folderId ?? null,
    }))
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getProgram(id: string): Graph | undefined {
  const map = readMap();
  const s = map[id];
  return s ? cloneGraph(s.graph) : undefined;
}

export function saveProgram(graph: Graph, folderId?: string | null): void {
  const map = readMap();
  const existing = map[graph.id];
  map[graph.id] = {
    graph: cloneGraph(graph),
    updatedAt: Date.now(),
    folderId: folderId !== undefined ? folderId : (existing?.folderId ?? null),
  };
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

/** Assigns a program to a folder (null = root). No-op if the program doesn't exist. */
export function moveProgram(id: string, folderId: string | null): void {
  const map = readMap();
  if (map[id]) {
    map[id].folderId = folderId;
    writeMap(map);
  }
}

/** Creates a copy of a saved program ("Copy of ...") in the same folder. Returns the new id, if any. */
export function duplicateProgram(id: string): string | undefined {
  const map = readMap();
  const s = map[id];
  if (!s) return undefined;
  const copy = cloneGraph(s.graph);
  copy.id = uuid();
  copy.name = `Copy of ${s.graph.name}`;
  map[copy.id] = { graph: copy, updatedAt: Date.now(), folderId: s.folderId ?? null };
  writeMap(map);
  return copy.id;
}

/** Resolver used by the evaluator to look up subprogram references. */
export function resolveProgram(id: string): Graph | undefined {
  return getProgram(id);
}

// --- Folders ---

function readFolders(): Folder[] {
  try {
    const raw = localStorage.getItem(FOLDERS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as Folder[];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeFolders(folders: Folder[]): void {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch {
    // Ignore storage errors (QuotaExceededError, private mode, etc.)
  }
}

export function listFolders(): Folder[] {
  return readFolders();
}

export function createFolder(name: string, parentId: string | null = null): Folder {
  const folders = readFolders();
  const folder: Folder = { id: uuid(), name, parentId };
  folders.push(folder);
  writeFolders(folders);
  return folder;
}

export function renameFolder(id: string, name: string): void {
  const folders = readFolders();
  const f = folders.find((x) => x.id === id);
  if (f) {
    f.name = name;
    writeFolders(folders);
  }
}

/** Returns true if `ancestorId` is `id` itself or an ancestor of `id` within `folders`. */
function isSelfOrAncestor(folders: Folder[], id: string, ancestorId: string): boolean {
  let current: string | null = id;
  const byId = new Map(folders.map((f) => [f.id, f]));
  while (current !== null) {
    if (current === ancestorId) return true;
    current = byId.get(current)?.parentId ?? null;
  }
  return false;
}

/** Moves a folder under a new parent. No-op if this would create a cycle. */
export function moveFolder(id: string, newParentId: string | null): void {
  const folders = readFolders();
  const f = folders.find((x) => x.id === id);
  if (!f) return;
  if (newParentId !== null) {
    if (newParentId === id) return; // can't be its own parent
    if (isSelfOrAncestor(folders, newParentId, id)) return; // would create a cycle
  }
  f.parentId = newParentId;
  writeFolders(folders);
}

/**
 * Deletes a folder, reparenting its child folders and programs up to the
 * deleted folder's parent (root if it had none).
 */
export function deleteFolder(id: string): void {
  const folders = readFolders();
  const target = folders.find((x) => x.id === id);
  if (!target) return;
  const parentId = target.parentId;
  const remaining = folders.filter((x) => x.id !== id);
  for (const f of remaining) {
    if (f.parentId === id) f.parentId = parentId;
  }
  writeFolders(remaining);

  const map = readMap();
  let changed = false;
  for (const s of Object.values(map)) {
    if ((s.folderId ?? null) === id) {
      s.folderId = parentId;
      changed = true;
    }
  }
  if (changed) writeMap(map);
}

/** Builds a nested tree of folders/programs rooted at the top level (parentId === null). */
export function buildTree(): ProgramTreeNode {
  const folders = readFolders();
  const programs = listPrograms();

  const nodeOf = (folder: Folder | null): ProgramTreeNode => ({ folder, folders: [], programs: [] });
  const byId = new Map<string | null, ProgramTreeNode>();
  const root = nodeOf(null);
  byId.set(null, root);
  for (const f of folders) byId.set(f.id, nodeOf(f));

  for (const f of folders) {
    const node = byId.get(f.id)!;
    const parent = byId.get(f.parentId) ?? root;
    parent.folders.push(node);
  }
  for (const p of programs) {
    const parent = byId.get(p.folderId) ?? root;
    parent.programs.push(p);
  }
  return root;
}

// --- Working copy autosave (debounced) ---
let autosaveTimer: ReturnType<typeof setTimeout> | null = null;

export function saveCurrent(graph: Graph): void {
  if (autosaveTimer) clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => {
    try {
      localStorage.setItem(CURRENT_KEY, JSON.stringify(graph));
    } catch {
      // Ignore storage errors (QuotaExceededError, private mode, etc.)
    }
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
