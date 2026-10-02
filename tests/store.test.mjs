import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let server;
let store;
let createEmptyGraph;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

before(async () => {
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../', import.meta.url)),
    resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, ws: false, watch: null },
    logLevel: 'error',
  });
  store = await server.ssrLoadModule('/src/patch/store.ts');
  ({ createEmptyGraph } = await server.ssrLoadModule('/src/patch/graph.ts'));
});

beforeEach(() => {
  const data = new Map();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
    },
  });
});

after(async () => {
  await server?.close();
  if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
  else delete globalThis.localStorage;
});

function saveProgram(name, folderId = null) {
  const graph = createEmptyGraph(name);
  store.saveProgram(graph, folderId);
  return graph.id;
}

for (const nested of [false, true]) {
  test(`deleting a ${nested ? 'nested' : 'top-level'} folder removes every descendant and preserves other content`, () => {
    const parent = nested ? store.createFolder('Parent') : null;
    // Create descendants first so folder storage order differs from tree order.
    const child = store.createFolder('Child');
    const grandchild = store.createFolder('Grandchild', child.id);
    const target = store.createFolder('Delete me', parent?.id ?? null);
    store.moveFolder(child.id, target.id);
    const emptyChild = store.createFolder('Empty child', target.id);
    const sibling = store.createFolder('Sibling', parent?.id ?? null);
    const siblingChild = store.createFolder('Sibling child', sibling.id);

    const deletedPrograms = [
      saveProgram('Direct', target.id),
      saveProgram('Child program', child.id),
      saveProgram('Grandchild program', grandchild.id),
    ];
    saveProgram('Root');
    saveProgram('Parent program', parent?.id ?? null);
    saveProgram('Sibling program', sibling.id);
    saveProgram('Sibling child program', siblingChild.id);
    const legacyId = saveProgram('Legacy root program');
    const programsBefore = JSON.parse(localStorage.getItem('SEQOP_programs'));
    delete programsBefore[legacyId].folderId;
    localStorage.setItem('SEQOP_programs', JSON.stringify(programsBefore));

    const deletedFolders = new Set([target.id, child.id, grandchild.id, emptyChild.id]);
    const survivingFolders = store.listFolders().filter((folder) => !deletedFolders.has(folder.id));
    const survivingPrograms = Object.fromEntries(
      Object.entries(programsBefore).filter(([id]) => !deletedPrograms.includes(id)),
    );

    store.deleteFolder(target.id);

    assert.deepEqual(store.listFolders(), survivingFolders);
    assert.deepEqual(JSON.parse(localStorage.getItem('SEQOP_programs')), survivingPrograms);
    assert.deepEqual(new Set(store.listPrograms().map((program) => program.id)), new Set(Object.keys(survivingPrograms)));
    for (const id of deletedPrograms) assert.equal(store.getProgram(id), undefined);
  });
}

test('deleting an empty folder preserves programs and its parent', () => {
  const parent = store.createFolder('Parent');
  const empty = store.createFolder('Empty', parent.id);
  saveProgram('Parent program', parent.id);
  const programsBefore = localStorage.getItem('SEQOP_programs');

  store.deleteFolder(empty.id);

  assert.deepEqual(store.listFolders(), [parent]);
  assert.equal(localStorage.getItem('SEQOP_programs'), programsBefore);
});

test('deleting a missing folder leaves all stored content unchanged', () => {
  store.createFolder('Keep');
  saveProgram('Root');
  saveProgram('Orphaned program', 'missing');
  const foldersBefore = localStorage.getItem('SEQOP_folders');
  const programsBefore = localStorage.getItem('SEQOP_programs');

  store.deleteFolder('missing');

  assert.equal(localStorage.getItem('SEQOP_folders'), foldersBefore);
  assert.equal(localStorage.getItem('SEQOP_programs'), programsBefore);
});
