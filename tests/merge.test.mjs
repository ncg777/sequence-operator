import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

let server;
let merge;
let evaluateGraph;
let createEmptyGraph;
let getNodeType;
let basePaletteEntries;

before(async () => {
  // Load the same TypeScript modules used by the patch view, including its alias.
  server = await createServer({
    configFile: false,
    root: fileURLToPath(new URL('../', import.meta.url)),
    resolve: { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } },
    server: { middlewareMode: true, hmr: false, watch: null },
    logLevel: 'error',
  });
  ({ merge } = await server.ssrLoadModule('/src/lib.ts'));
  ({ evaluateGraph } = await server.ssrLoadModule('/src/patch/evaluator.ts'));
  ({ createEmptyGraph } = await server.ssrLoadModule('/src/patch/graph.ts'));
  ({ getNodeType, basePaletteEntries } = await server.ssrLoadModule('/src/patch/nodes.ts'));
});

after(async () => {
  await server?.close();
});

test('merge alternates equal-length inputs, beginning with x', () => {
  assert.equal(merge('1 2 3', '4 5 6'), '1 4 2 5 3 6');
  assert.equal(merge('4 5 6', '1 2 3'), '4 1 5 2 6 3');
});

test('merge repeats coprime lengths until both cycles finish', () => {
  assert.equal(merge('1 2', '7 8 9'), '1 7 2 8 1 9 2 7 1 8 2 9');
});

test('merge uses the least common cycle for lengths with a common factor', () => {
  assert.equal(merge('1 2', '7 8 9 10'), '1 7 2 8 1 9 2 10');
});

test('merge repeats either shorter input, including scalar sequences', () => {
  assert.equal(merge('1 2 3', '9'), '1 9 2 9 3 9');
  assert.equal(merge('9', '1 2 3'), '9 1 9 2 9 3');
});

test('merge preserves zero, negative and duplicate values and normalizes whitespace', () => {
  assert.equal(merge(' \n-1\t0  -1 ', ' 2\n2\t3 '), '-1 2 0 2 -1 3');
});

test('merge returns an empty result when either input is empty', () => {
  assert.equal(merge('', '1 2'), '');
  assert.equal(merge('1 2', ' \n\t'), '');
  assert.equal(merge('', ''), '');
});

function node(id, type, params = {}) {
  return { id, type, x: 0, y: 0, params };
}

function edge(id, from, to, port) {
  return { id, from: { node: from, port: 'out' }, to: { node: to, port } };
}

function mergePatch() {
  const graph = createEmptyGraph('Merge test');
  graph.nodes = [
    node('display', 'display'),
    node('merge', 'merge'),
    node('x', 'sequence', { value: '1 2' }),
    node('y', 'sequence', { value: '7 8 9' }),
  ];
  graph.edges = [
    edge('x-merge', 'x', 'merge', 'x'),
    edge('y-merge', 'y', 'merge', 'y'),
    edge('merge-display', 'merge', 'display', 'in'),
  ];
  return graph;
}

const options = {
  memory: { read: () => '', write: () => {} },
  base: 10,
  wordSize: -1,
};

test('patch palette provides Merge with two required inputs and no operation parameters', () => {
  const entry = basePaletteEntries().find((entry) => entry.type === 'merge');
  assert.equal(entry?.label, 'Merge');
  assert.match(entry.keywords, /interleave/);
  const type = getNodeType('merge');
  assert.deepEqual(type.inputs.map((port) => port.name), ['x', 'y']);
  assert.ok(type.inputs.every((port) => !port.optional && port.type === 'Seq'));
  assert.deepEqual(type.params, []);
});

test('patch evaluator sends the merged sequence downstream after a JSON round trip', () => {
  const graph = JSON.parse(JSON.stringify(mergePatch()));
  const results = evaluateGraph(graph, options);
  assert.equal(results.get('merge').outputs.out, '1 7 2 8 1 9 2 7 1 8 2 9');
  assert.equal(results.get('display').inputs.in, results.get('merge').outputs.out);
  assert.ok([...results.values()].every((result) => !result.error && !result.waiting));
});

test('merge and its downstream node wait for a missing, empty or invalid source', () => {
  for (const state of ['missing', 'empty', 'invalid']) {
    const graph = mergePatch();
    if (state === 'missing') graph.edges = graph.edges.filter((edge) => edge.id !== 'y-merge');
    else graph.nodes.find((node) => node.id === 'y').params.value = state === 'empty' ? '' : 'oops';
    const results = evaluateGraph(graph, options);
    assert.equal(results.get('merge').waiting, true, state);
    assert.deepEqual(results.get('merge').outputs, {}, state);
    assert.equal(results.get('display').waiting, true, state);
    if (state === 'invalid') assert.match(results.get('y').error, /Invalid sequence literal/);
  }
});

test('merge accepts a ready but empty upstream result', () => {
  const graph = mergePatch();
  graph.nodes.find((node) => node.id === 'y').type = 'combine';
  graph.nodes.find((node) => node.id === 'y').params = {
    combiner: 'Product', operation: 'Add', x: '', y: '',
  };
  const results = evaluateGraph(graph, options);
  assert.equal(results.get('merge').outputs.out, '');
  assert.ok(!results.get('merge').waiting);
  assert.equal(results.get('display').inputs.in, '');
});

test('merge uses canonical values from sources in other display bases', () => {
  const graph = mergePatch();
  graph.nodes.find((node) => node.id === 'x').params.value = 'A B';
  graph.nodes.find((node) => node.id === 'y').params.value = 'F';
  const results = evaluateGraph(graph, { ...options, base: 16, wordSize: 8 });
  assert.equal(results.get('merge').outputs.out, '10 15 11 15');
});

test('one source can feed both merge ports', () => {
  const graph = mergePatch();
  graph.edges.find((edge) => edge.id === 'y-merge').from.node = 'x';
  const results = evaluateGraph(graph, options);
  assert.equal(results.get('merge').outputs.out, '1 1 2 2');
});

test('merge works inside a subprogram with named inputs and output', () => {
  const body = mergePatch();
  body.nodes.find((node) => node.id === 'x').type = 'input';
  body.nodes.find((node) => node.id === 'x').params = { name: 'x', ptype: 'Seq' };
  body.nodes.find((node) => node.id === 'y').type = 'input';
  body.nodes.find((node) => node.id === 'y').params = { name: 'y', ptype: 'Seq' };
  body.nodes.find((node) => node.id === 'display').type = 'output';
  body.nodes.find((node) => node.id === 'display').params = { name: 'out' };

  const graph = mergePatch();
  graph.nodes.find((node) => node.id === 'merge').type = 'subprogram';
  graph.nodes.find((node) => node.id === 'merge').params = { programId: body.id };
  const results = evaluateGraph(graph, {
    ...options,
    resolveProgram: (id) => id === body.id ? body : undefined,
  });
  assert.equal(results.get('display').inputs.in, '1 7 2 8 1 9 2 7 1 8 2 9');
});
