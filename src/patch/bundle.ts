/**
 * bundle.ts — ZIP-based multi-program/folder export & import for the Patch editor's
 * program browser.
 *
 * Bundle layout:
 *   manifest.json          — { formatVersion, exportedAt, folders: Folder[], programs: [...] }
 *   programs/<id>.json     — raw Graph JSON for each included program
 *
 * The single-program JSON export/import in PatchEditorView is untouched and stays
 * backward compatible; `importBundle` also accepts a plain `.json` file for that case.
 */
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import type { Graph } from './graph';
import { uuid } from './graph';
import * as store from './store';
import type { Folder } from './store';

const BUNDLE_FORMAT_VERSION = 1;

export type ConflictPolicy = 'skip' | 'rename' | 'overwrite';

interface ManifestProgramEntry {
  id: string;
  name: string;
  folderId: string | null;
  file: string;
}

interface Manifest {
  formatVersion: number;
  exportedAt: number;
  folders: Folder[];
  programs: ManifestProgramEntry[];
}

export interface ImportResult {
  imported: number;
  skipped: number;
  overwritten: number;
  renamed: number;
}

function downloadBlob(bytes: Uint8Array, filename: string): void {
  const blob = new Blob([bytes as BlobPart], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Collects every ancestor folder id (inclusive) needed to root the given folder ids. */
function withAncestors(folders: Folder[], ids: Set<string>): Folder[] {
  const byId = new Map(folders.map((f) => [f.id, f]));
  const out = new Set<string>();
  for (const id of ids) {
    let current: string | null = id;
    while (current !== null && !out.has(current)) {
      out.add(current);
      current = byId.get(current)?.parentId ?? null;
    }
  }
  return folders.filter((f) => out.has(f.id));
}

/** Recursively collects a folder id + all descendant folder ids. */
function collectSubfolderIds(folderId: string): Set<string> {
  const all = store.listFolders();
  const byParent = new Map<string | null, Folder[]>();
  for (const f of all) {
    const list = byParent.get(f.parentId) ?? [];
    list.push(f);
    byParent.set(f.parentId, list);
  }
  const out = new Set<string>([folderId]);
  const queue = [folderId];
  while (queue.length) {
    const id = queue.pop() as string;
    for (const child of byParent.get(id) ?? []) {
      if (!out.has(child.id)) {
        out.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return out;
}

function buildBundle(programIds: string[], includeFolders: Folder[], detachRootId: string | null): Uint8Array {
  const allPrograms = store.listPrograms();
  const programSet = new Set(programIds);
  const included = allPrograms.filter((p) => programSet.has(p.id));

  const folders = includeFolders.map((f) => ({ ...f }));
  if (detachRootId !== null) {
    const rootFolder = folders.find((f) => f.id === detachRootId);
    if (rootFolder) rootFolder.parentId = null;
  }

  const files: Record<string, Uint8Array> = {};
  const manifestPrograms: ManifestProgramEntry[] = [];
  for (const p of included) {
    const g = store.getProgram(p.id);
    if (!g) continue;
    const file = `programs/${p.id}.json`;
    files[file] = strToU8(JSON.stringify(g));
    manifestPrograms.push({ id: p.id, name: p.name, folderId: p.folderId, file });
  }
  const manifest: Manifest = {
    formatVersion: BUNDLE_FORMAT_VERSION,
    exportedAt: Date.now(),
    folders,
    programs: manifestPrograms,
  };
  files['manifest.json'] = strToU8(JSON.stringify(manifest, null, 2));
  return zipSync(files, { level: 6 });
}

/** Exports an arbitrary set of programs (by id) as a self-contained ZIP, preserving their folder paths. */
export function exportPrograms(ids: string[], filename = 'programs.zip'): void {
  const allFolders = store.listFolders();
  const allPrograms = store.listPrograms();
  const idSet = new Set(ids);
  const neededFolderIds = new Set<string>();
  for (const p of allPrograms) if (idSet.has(p.id) && p.folderId) neededFolderIds.add(p.folderId);
  const folders = withAncestors(allFolders, neededFolderIds);
  downloadBlob(buildBundle(ids, folders, null), filename);
}

/** Exports a folder and all its subfolders/programs as a ZIP, rooted at that folder. */
export function exportFolder(folderId: string, filename?: string): void {
  const allFolders = store.listFolders();
  const subtreeIds = collectSubfolderIds(folderId);
  const folders = allFolders.filter((f) => subtreeIds.has(f.id));
  const programIds = store
    .listPrograms()
    .filter((p) => p.folderId !== null && subtreeIds.has(p.folderId))
    .map((p) => p.id);
  const folder = allFolders.find((f) => f.id === folderId);
  downloadBlob(buildBundle(programIds, folders, folderId), filename ?? `${folder?.name ?? 'folder'}.zip`);
}

/** Exports the entire library (every folder + program) as a single ZIP. */
export function exportAll(filename = 'sequence-operator-library.zip'): void {
  const folders = store.listFolders();
  const ids = store.listPrograms().map((p) => p.id);
  downloadBlob(buildBundle(ids, folders, null), filename);
}

function importSingleGraph(g: Graph, folderId: string | null, policy: ConflictPolicy, result: ImportResult): void {
  if (typeof g.formatVersion !== 'number') g.formatVersion = 1;
  if (!g.viewport) g.viewport = { x: 0, y: 0, zoom: 1 };

  const existing = store.getProgram(g.id);
  if (!existing) {
    store.saveProgram(g, folderId);
    result.imported++;
    return;
  }

  switch (policy) {
    case 'skip':
      result.skipped++;
      return;
    case 'overwrite':
      store.saveProgram(g, folderId);
      result.overwritten++;
      return;
    case 'rename': {
      const copy: Graph = { ...g, id: uuid(), name: `${g.name} (imported)` };
      store.saveProgram(copy, folderId);
      result.renamed++;
      return;
    }
  }
}

/**
 * Imports a bundle. Accepts either a legacy single-program `.json` file (imported at
 * the library root) or a `.zip` bundle produced by exportPrograms/exportFolder/exportAll,
 * whose folder hierarchy is recreated with fresh ids (never merged into existing folders).
 */
export async function importBundle(file: File, policy: ConflictPolicy): Promise<ImportResult> {
  const result: ImportResult = { imported: 0, skipped: 0, overwritten: 0, renamed: 0 };
  const buf = new Uint8Array(await file.arrayBuffer());

  if (file.name.toLowerCase().endsWith('.json')) {
    const g = JSON.parse(strFromU8(buf)) as Graph;
    if (!g || !Array.isArray(g.nodes) || !Array.isArray(g.edges)) throw new Error('Invalid program file');
    importSingleGraph(g, null, policy, result);
    return result;
  }

  const zip = unzipSync(buf);
  const manifestRaw = zip['manifest.json'];
  if (!manifestRaw) throw new Error('Missing manifest.json in bundle');
  const manifest = JSON.parse(strFromU8(manifestRaw)) as Manifest;

  // Recreate the folder hierarchy with fresh ids (never merged into existing folders).
  const folderIdMap = new Map<string, string>();
  const byId = new Map(manifest.folders.map((f) => [f.id, f]));
  const createOrdered = (f: Folder): string => {
    const mapped = folderIdMap.get(f.id);
    if (mapped) return mapped;
    const newParentId = f.parentId ? createOrdered(byId.get(f.parentId) as Folder) : null;
    const created = store.createFolder(f.name, newParentId);
    folderIdMap.set(f.id, created.id);
    return created.id;
  };
  for (const f of manifest.folders) createOrdered(f);

  for (const entry of manifest.programs) {
    const raw = zip[entry.file];
    if (!raw) continue;
    const g = JSON.parse(strFromU8(raw)) as Graph;
    const targetFolderId = entry.folderId ? (folderIdMap.get(entry.folderId) ?? null) : null;
    importSingleGraph(g, targetFolderId, policy, result);
  }
  return result;
}
