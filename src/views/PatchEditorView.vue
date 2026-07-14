<template>
  <div class="patch-editor" @dragover.prevent @drop="onDrop">
    <!-- Toolbar -->
    <div class="patch-toolbar">
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" size="small" variant="tonal" class="pt-name" append-icon="mdi-menu-down">
            {{ graph.name }}
          </v-btn>
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-file-plus" title="New" @click="newProgram" />
          <v-list-item prepend-icon="mdi-content-save" title="Save" @click="saveCurrentProgram" />
          <v-list-item prepend-icon="mdi-content-save-edit" title="Save As…" @click="openSaveAs" />
          <v-list-item prepend-icon="mdi-folder-open" title="Load…" @click="openLoad" />
          <v-list-item prepend-icon="mdi-rename-box" title="Rename…" @click="openRename" />
          <v-list-item prepend-icon="mdi-delete" title="Delete" @click="deleteCurrentProgram" />
        </v-list>
      </v-menu>

      <div class="pt-spacer"></div>

      <v-btn size="small" variant="text" icon title="Undo (Ctrl+Z)" :disabled="!canUndo" @click="doUndo"><v-icon>mdi-undo</v-icon></v-btn>
      <v-btn size="small" variant="text" icon title="Redo (Ctrl+Y)" :disabled="!canRedo" @click="doRedo"><v-icon>mdi-redo</v-icon></v-btn>
      <v-btn size="small" variant="text" icon title="Import JSON" @click="triggerImport"><v-icon>mdi-import</v-icon></v-btn>
      <v-btn size="small" variant="text" icon title="Export JSON" @click="exportProgram"><v-icon>mdi-export</v-icon></v-btn>
      <v-btn size="small" variant="text" icon title="Re-run (reroll random)" @click="rerunAll"><v-icon>mdi-refresh</v-icon></v-btn>
      <v-btn size="small" variant="text" icon :color="showGrid ? 'primary' : undefined" title="Toggle grid" @click="showGrid = !showGrid"><v-icon>mdi-grid</v-icon></v-btn>
      <v-btn size="small" variant="text" icon :color="snap ? 'primary' : undefined" title="Snap to grid" @click="snap = !snap"><v-icon>mdi-magnet</v-icon></v-btn>
      <input ref="fileInput" type="file" accept="application/json,.json" class="d-none" @change="onImportFile" />
    </div>

    <!-- Breadcrumbs for subprogram navigation -->
    <div v-if="breadcrumbs.length" class="patch-breadcrumbs">
      <template v-for="(bc, i) in breadcrumbs" :key="i">
        <a class="crumb" @click="breadcrumbBack(i)">{{ bc.name }}</a>
        <v-icon size="14">mdi-chevron-right</v-icon>
      </template>
      <span class="crumb current">{{ graph.name }}</span>
    </div>

    <!-- Main area -->
    <div class="patch-main">
      <div v-if="!mobile && paletteOpen" class="patch-palette">
        <NodePalette :entries="paletteEntries" @add="addFromPalette" />
      </div>
      <v-btn
        v-if="!mobile"
        class="palette-toggle"
        icon
        size="x-small"
        variant="tonal"
        :title="paletteOpen ? 'Collapse palette' : 'Expand palette'"
        @click="paletteOpen = !paletteOpen"
      >
        <v-icon>{{ paletteOpen ? 'mdi-chevron-left' : 'mdi-chevron-right' }}</v-icon>
      </v-btn>
      <PatchCanvas
        ref="canvasRef"
        class="patch-canvas-el"
        :graph="graph"
        :results="results"
        :active="active"
        :snap="snap"
        :show-grid="showGrid"
        :resolve-program="resolveProgram"
        :subprogram-names="subprogramNames"
        :memory-length="memoryList.length"
        @commit="onCommit"
        @toast="showToast"
        @open-subprogram="openSubprogram"
        @reroll="rerollNode"
        @quick-add="onQuickAdd"
        @selection-change="onSelectionChange"
      />
    </div>

    <!-- Status bar -->
    <div class="patch-status">
      <span>{{ Math.round(graph.viewport.zoom * 100) }}%</span>
      <span>{{ graph.nodes.length }} nodes · {{ graph.edges.length }} wires</span>
      <span class="pt-spacer"></span>
      <span :class="{ 'status-eval': evaluating }">{{ evaluating ? 'evaluating…' : statusSummary }}</span>
    </div>

    <!-- Mobile add FAB -->
    <v-btn v-if="mobile" class="patch-fab" icon color="primary" size="large" @click="mobilePalette = true">
      <v-icon>mdi-plus</v-icon>
    </v-btn>
    <v-bottom-sheet v-model="mobilePalette">
      <div class="mobile-palette">
        <NodePalette :entries="paletteEntries" @add="addFromPaletteMobile" />
      </div>
    </v-bottom-sheet>

    <!-- Quick-add popup -->
    <v-dialog v-model="quickAdd.open" max-width="420" scrollable>
      <v-card>
        <v-card-title class="text-body-1">Add node</v-card-title>
        <div class="quick-add-body">
          <NodePalette :entries="paletteEntries" @add="addFromQuickAdd" />
        </div>
      </v-card>
    </v-dialog>

    <!-- Load dialog -->
    <v-dialog v-model="loadDialog" max-width="520" scrollable>
      <v-card>
        <v-card-title>Load program</v-card-title>
        <v-card-text>
          <v-list v-if="programMetas.length" density="compact">
            <v-list-item
              v-for="p in programMetas"
              :key="p.id"
              :title="p.name"
              :subtitle="`${p.nodeCount} nodes · ${formatDate(p.updatedAt)}`"
              @click="loadProgramById(p.id)"
            >
              <template #append>
                <v-btn icon size="x-small" variant="text" @click.stop="removeProgram(p.id)"><v-icon size="16">mdi-delete</v-icon></v-btn>
              </template>
            </v-list-item>
          </v-list>
          <div v-else class="text-medium-emphasis">No saved programs.</div>
        </v-card-text>
        <v-card-actions><v-spacer /><v-btn @click="loadDialog = false">Close</v-btn></v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Name dialog (Save As / Rename) -->
    <v-dialog v-model="nameDialog.open" max-width="420">
      <v-card>
        <v-card-title>{{ nameDialog.title }}</v-card-title>
        <v-card-text>
          <v-text-field v-model="nameDialog.value" label="Program name" autofocus hide-details @keydown.enter="confirmName" />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="nameDialog.open = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmName">OK</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-snackbar v-model="toast.open" :timeout="2600" location="bottom">{{ toast.message }}</v-snackbar>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue';
import { useDisplay } from 'vuetify';
import NodePalette from '@/components/NodePalette.vue';
import PatchCanvas from '@/components/PatchCanvas.vue';
import type { Graph, NodeInstance } from '@/patch/graph';
import { createEmptyGraph, cloneGraph, nextNodeId, uuid } from '@/patch/graph';
import { getNodeType, basePaletteEntries } from '@/patch/nodes';
import type { PaletteEntry } from '@/patch/nodes';
import { evaluateGraph } from '@/patch/evaluator';
import type { EvalResults, CacheEntry } from '@/patch/evaluator';
import * as store from '@/patch/store';
import { useSharedState } from '@/composables/useSharedState';

const props = withDefaults(defineProps<{ active?: boolean }>(), { active: true });

const { mobile } = useDisplay();
const shared = useSharedState();
const { selectedNumberSystem, wordSize, memoryList } = shared;

const graph = reactive<Graph>(store.loadCurrent() ?? createEmptyGraph('Untitled'));
const results = ref<EvalResults>(new Map());
const evaluating = ref(false);

const snap = ref(false);
const showGrid = ref(true);
const paletteOpen = ref(true);
const canvasRef = ref<InstanceType<typeof PatchCanvas> | null>(null);
const fileInput = ref<HTMLInputElement | null>(null);
const mobilePalette = ref(false);

const selection = reactive<{ nodes: string[]; edges: string[] }>({ nodes: [], edges: [] });

// --- Saved programs cache (full graphs, for ports + evaluation + palette) ---
const programsMap = ref<Record<string, Graph>>({});
const programMetas = ref<store.ProgramMeta[]>([]);
function refreshPrograms() {
  const metas = store.listPrograms();
  programMetas.value = metas;
  const map: Record<string, Graph> = {};
  for (const meta of metas) {
    const g = store.getProgram(meta.id);
    if (g) map[meta.id] = g;
  }
  programsMap.value = map;
}
const resolveProgram = (id: string): Graph | undefined => programsMap.value[id];
const subprogramNames = computed<Record<string, string>>(() => {
  const out: Record<string, string> = {};
  for (const g of Object.values(programsMap.value)) out[g.id] = g.name;
  return out;
});
const paletteEntries = computed<PaletteEntry[]>(() => {
  const saved: PaletteEntry[] = Object.values(programsMap.value)
    .filter((g) => g.id !== graph.id)
    .map((g) => ({
      type: 'subprogram',
      label: g.name,
      category: 'program',
      icon: 'mdi-package-variant-closed',
      programId: g.id,
      keywords: 'subprogram program ' + g.name,
    }));
  return [...basePaletteEntries(), ...saved];
});

// --- Evaluation ---
const memory = { read: shared.readMemory, write: shared.writeMemory };
const cache = new Map<string, CacheEntry>();
const nonces = new Map<string, number>();
let evalTimer: ReturnType<typeof setTimeout> | null = null;

function evaluateNow() {
  evaluating.value = true;
  try {
    results.value = evaluateGraph(graph, {
      memory,
      base: selectedNumberSystem.value,
      wordSize: wordSize.value,
      resolveProgram,
      cache,
      nonces,
    });
  } finally {
    evaluating.value = false;
  }
}
function scheduleEval() {
  if (evalTimer) clearTimeout(evalTimer);
  evalTimer = setTimeout(evaluateNow, 50);
}

const statusSummary = computed(() => {
  let errors = 0;
  let waiting = 0;
  for (const r of results.value.values()) {
    if (r.error) errors++;
    else if (r.waiting) waiting++;
  }
  if (errors) return `${errors} error${errors > 1 ? 's' : ''}`;
  if (waiting) return `${waiting} waiting`;
  return 'ready';
});

// --- Undo/redo ---
const undo = new store.UndoStack();
const canUndo = ref(false);
const canRedo = ref(false);
function refreshUndoState() {
  canUndo.value = undo.canUndo();
  canRedo.value = undo.canRedo();
}
function onCommit(coalesceKey?: string) {
  undo.push(cloneGraph(graph), coalesceKey);
  refreshUndoState();
}
function applyGraph(g: Graph) {
  graph.formatVersion = g.formatVersion;
  graph.id = g.id;
  graph.name = g.name;
  graph.nodes = g.nodes;
  graph.edges = g.edges;
  graph.viewport = g.viewport;
}
function doUndo() {
  const g = undo.undo();
  if (g) {
    applyGraph(g);
    refreshUndoState();
  }
}
function doRedo() {
  const g = undo.redo();
  if (g) {
    applyGraph(g);
    refreshUndoState();
  }
}

// --- Watchers ---
watch(
  () => [graph.nodes, graph.edges] as const,
  () => {
    scheduleEval();
    store.saveCurrent(cloneGraph(graph));
  },
  { deep: true },
);
watch([selectedNumberSystem, wordSize], scheduleEval);
watch(memoryList, scheduleEval, { deep: true });
watch(
  () => props.active,
  (a) => {
    if (a) scheduleEval();
  },
);

// --- Node creation ---
function referencesProgram(fromId: string, targetId: string, seen = new Set<string>()): boolean {
  if (fromId === targetId) return true;
  if (seen.has(fromId)) return false;
  seen.add(fromId);
  const g = programsMap.value[fromId];
  if (!g) return false;
  for (const n of g.nodes) {
    if (n.type === 'subprogram') {
      const pid = String(n.params.programId ?? '');
      if (pid && referencesProgram(pid, targetId, seen)) return true;
    }
  }
  return false;
}

function makeNode(entry: PaletteEntry, pos: { x: number; y: number }): NodeInstance | null {
  const nt = getNodeType(entry.type);
  if (!nt) return null;
  const params: Record<string, unknown> = {};
  for (const p of nt.params) params[p.key] = p.default;
  if (entry.params) Object.assign(params, entry.params);
  if (entry.type === 'subprogram') {
    const pid = entry.programId ?? '';
    if (!pid) return null;
    if (pid === graph.id || referencesProgram(pid, graph.id)) {
      showToast('Recursive subprogram reference rejected.');
      return null;
    }
    params.programId = pid;
  }
  const node: NodeInstance = { id: nextNodeId(), type: entry.type, x: Math.round(pos.x), y: Math.round(pos.y), params };
  if (entry.type === 'comment') {
    node.width = 200;
    node.height = 120;
  }
  return node;
}
function addNode(entry: PaletteEntry, pos: { x: number; y: number }) {
  const node = makeNode(entry, pos);
  if (!node) return;
  graph.nodes.push(node);
  onCommit('add-node');
}
function addFromPalette(entry: PaletteEntry) {
  const c = canvasRef.value?.centerPoint?.() ?? { x: 100, y: 100 };
  addNode(entry, c);
}
function addFromPaletteMobile(entry: PaletteEntry) {
  addFromPalette(entry);
  mobilePalette.value = false;
}
const quickAdd = reactive<{ open: boolean; x: number; y: number }>({ open: false, x: 0, y: 0 });
function onQuickAdd(pos: { x: number; y: number }) {
  quickAdd.x = pos.x;
  quickAdd.y = pos.y;
  quickAdd.open = true;
}
function addFromQuickAdd(entry: PaletteEntry) {
  addNode(entry, { x: quickAdd.x, y: quickAdd.y });
  quickAdd.open = false;
}

function rerollNode(nodeId: string) {
  nonces.set(nodeId, (nonces.get(nodeId) ?? 0) + 1);
  evaluateNow();
}
function rerunAll() {
  cache.clear();
  evaluateNow();
  showToast('Re-ran the graph.');
}

// --- Selection ---
function onSelectionChange(sel: { nodes: string[]; edges: string[] }) {
  selection.nodes = sel.nodes;
  selection.edges = sel.edges;
}

// --- Program management ---
function newProgram() {
  applyGraph(createEmptyGraph('Untitled'));
  undo.reset(cloneGraph(graph));
  refreshUndoState();
  evaluateNow();
}
function saveCurrentProgram() {
  store.saveProgram(graph);
  refreshPrograms();
  showToast('Saved.');
}
const nameDialog = reactive<{ open: boolean; title: string; value: string; mode: 'saveas' | 'rename' }>({
  open: false,
  title: '',
  value: '',
  mode: 'saveas',
});
function openSaveAs() {
  nameDialog.mode = 'saveas';
  nameDialog.title = 'Save As';
  nameDialog.value = graph.name;
  nameDialog.open = true;
}
function openRename() {
  nameDialog.mode = 'rename';
  nameDialog.title = 'Rename program';
  nameDialog.value = graph.name;
  nameDialog.open = true;
}
function confirmName() {
  const name = nameDialog.value.trim();
  if (!name) return;
  if (nameDialog.mode === 'saveas') {
    graph.name = name;
    graph.id = uuid();
    store.saveProgram(graph);
  } else {
    graph.name = name;
    if (programsMap.value[graph.id]) store.renameProgram(graph.id, name);
  }
  refreshPrograms();
  nameDialog.open = false;
  onCommit('rename');
  showToast('Saved.');
}
const loadDialog = ref(false);
function openLoad() {
  refreshPrograms();
  loadDialog.value = true;
}
function loadProgramById(id: string) {
  const g = store.getProgram(id);
  if (!g) return;
  applyGraph(g);
  undo.reset(cloneGraph(graph));
  refreshUndoState();
  loadDialog.value = false;
  evaluateNow();
}
function removeProgram(id: string) {
  store.deleteProgram(id);
  refreshPrograms();
}
function deleteCurrentProgram() {
  if (programsMap.value[graph.id]) {
    store.deleteProgram(graph.id);
    refreshPrograms();
  }
  newProgram();
  showToast('Deleted.');
}

// --- Import / export ---
function exportProgram() {
  const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${graph.name || 'program'}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
function triggerImport() {
  fileInput.value?.click();
}
function onImportFile(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  if (file) importFile(file);
  input.value = '';
}
function importFile(file: File) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const g = JSON.parse(String(reader.result)) as Graph;
      if (!g || !Array.isArray(g.nodes) || !Array.isArray(g.edges)) throw new Error('Invalid file');
      if (typeof g.formatVersion !== 'number') g.formatVersion = 1;
      if (!g.viewport) g.viewport = { x: 0, y: 0, zoom: 1 };
      applyGraph(g);
      undo.reset(cloneGraph(graph));
      refreshUndoState();
      evaluateNow();
      showToast('Imported.');
    } catch (e) {
      showToast('Import failed: ' + (e as Error).message);
    }
  };
  reader.readAsText(file);
}
function onDrop(ev: DragEvent) {
  const nd = ev.dataTransfer?.getData('application/x-patch-node');
  if (nd) {
    ev.preventDefault();
    try {
      const entry = JSON.parse(nd) as PaletteEntry;
      const pos = canvasRef.value?.clientToGraph?.(ev.clientX, ev.clientY) ?? { x: 100, y: 100 };
      addNode(entry, pos);
    } catch {
      /* ignore */
    }
    return;
  }
  const file = ev.dataTransfer?.files?.[0];
  if (file && file.name.endsWith('.json')) {
    ev.preventDefault();
    importFile(file);
  }
}

// --- Subprogram navigation ---
const breadcrumbs = ref<{ name: string; graph: Graph }[]>([]);
function openSubprogram(nodeId: string) {
  const n = graph.nodes.find((x) => x.id === nodeId);
  if (!n) return;
  const pid = String(n.params.programId ?? '');
  const ref = store.getProgram(pid);
  if (!ref) {
    showToast('Referenced program not found.');
    return;
  }
  breadcrumbs.value.push({ name: graph.name, graph: cloneGraph(graph) });
  applyGraph(ref);
  undo.reset(cloneGraph(graph));
  refreshUndoState();
  evaluateNow();
}
function breadcrumbBack(index: number) {
  store.saveProgram(graph);
  refreshPrograms();
  const target = breadcrumbs.value[index];
  breadcrumbs.value = breadcrumbs.value.slice(0, index);
  applyGraph(target.graph);
  undo.reset(cloneGraph(graph));
  refreshUndoState();
  evaluateNow();
}

// --- Toast ---
const toast = reactive<{ open: boolean; message: string }>({ open: false, message: '' });
function showToast(message: string) {
  toast.message = message;
  toast.open = true;
}

// --- Keyboard (undo/redo) ---
function onKeyDown(ev: KeyboardEvent) {
  if (!props.active) return;
  const t = ev.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !ev.shiftKey) {
    ev.preventDefault();
    doUndo();
  } else if ((ev.ctrlKey || ev.metaKey) && (ev.key.toLowerCase() === 'y' || (ev.key.toLowerCase() === 'z' && ev.shiftKey))) {
    ev.preventDefault();
    doRedo();
  }
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown);
  refreshPrograms();
  undo.reset(cloneGraph(graph));
  refreshUndoState();
  nextTick(evaluateNow);
});
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  if (evalTimer) clearTimeout(evalTimer);
});
</script>

<style scoped>
.patch-editor {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 50px);
  background: #0a0b0d;
  position: relative;
}
.patch-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-bottom: 1px solid #23262c;
  background: #101216;
  flex-wrap: wrap;
}
.pt-name {
  text-transform: none;
  max-width: 240px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pt-spacer {
  flex: 1 1 auto;
}
.patch-breadcrumbs {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px;
  background: #0e1013;
  border-bottom: 1px solid #23262c;
  font-size: 0.76rem;
}
.crumb {
  color: #7cc4ff;
  cursor: pointer;
}
.crumb.current {
  color: #cfe;
  cursor: default;
}
.patch-main {
  flex: 1 1 auto;
  display: flex;
  min-height: 0;
}
.patch-palette {
  width: 230px;
  flex: 0 0 auto;
  min-height: 0;
}
.palette-toggle {
  flex: 0 0 auto;
  align-self: center;
  margin: 0 2px;
  z-index: 10;
}
.patch-canvas-el {
  flex: 1 1 auto;
  min-width: 0;
}
.patch-status {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 3px 10px;
  border-top: 1px solid #23262c;
  background: #101216;
  font-size: 0.72rem;
  color: #9aa4b0;
}
.status-eval {
  color: #ffd166;
}
.patch-fab {
  position: absolute;
  right: 16px;
  bottom: 44px;
  z-index: 20;
}
.mobile-palette {
  height: 60vh;
  background: #101216;
}
.quick-add-body {
  height: 50vh;
}
.d-none {
  display: none;
}
</style>
