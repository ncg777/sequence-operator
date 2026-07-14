<template>
  <div
    ref="rootEl"
    class="patch-canvas"
    :class="{ wiring: !!wireDrag, grid: showGrid }"
    @pointerdown="onBackgroundPointerDown"
    @wheel="onWheel"
    @dblclick="onBackgroundDblClick"
    @contextmenu.prevent
  >
    <div class="patch-transform" :style="transformStyle">
      <!-- Wire layer -->
      <svg class="wire-layer" :style="{ overflow: 'visible' }">
        <PatchWire
          v-for="w in wireGeometries"
          :key="w.id"
          :x1="w.x1"
          :y1="w.y1"
          :x2="w.x2"
          :y2="w.y2"
          :numeric="w.numeric"
          :selected="selectedEdges.has(w.id)"
          @select="selectEdge(w.id, $event)"
          @contextmenu="openEdgeMenu(w.id, $event)"
        />
        <PatchWire
          v-if="liveWire"
          :x1="liveWire.x1"
          :y1="liveWire.y1"
          :x2="liveWire.x2"
          :y2="liveWire.y2"
          :numeric="liveWire.numeric"
          live
          highlight
        />
        <rect
          v-if="rubber"
          :x="Math.min(rubber.x1, rubber.x2)"
          :y="Math.min(rubber.y1, rubber.y2)"
          :width="Math.abs(rubber.x2 - rubber.x1)"
          :height="Math.abs(rubber.y2 - rubber.y1)"
          class="rubber-band"
        />
      </svg>

      <!-- Nodes -->
      <PatchNode
        v-for="node in graph.nodes"
        :key="node.id"
        :node="node"
        :inputs="portsFor(node).inputs"
        :outputs="portsFor(node).outputs"
        :result="results.get(node.id)"
        :selected="selectedNodes.has(node.id)"
        :wired-inputs="wiredInputsFor(node.id)"
        :subprogram-name="subprogramNames[String(node.params.programId)] || ''"
        :memory-length="memoryLength"
        @node-pointerdown="onNodePointerDown(node.id, $event)"
        @port-pointerdown="onPortPointerDown(node.id, $event)"
        @contextmenu="openNodeMenu(node.id, $event)"
        @param="onParam(node.id, $event)"
        @reroll="$emit('reroll', node.id)"
        @open-subprogram="$emit('open-subprogram', node.id)"
        @copy="copyToClipboard"
        @resize-start="onCommentResizeStart(node.id, $event)"
      />
    </div>

    <!-- Context menu -->
    <v-menu v-model="menu.open" :style="menuStyle" location="end">
      <v-list density="compact" min-width="180">
        <template v-if="menu.kind === 'node'">
          <v-list-item v-if="menuNodeIsSubprogram" prepend-icon="mdi-open-in-new" title="Open" @click="menuOpenSubprogram" />
          <v-list-item prepend-icon="mdi-content-duplicate" title="Duplicate" @click="menuDuplicate" />
          <v-list-item prepend-icon="mdi-link-off" title="Disconnect all" @click="menuDisconnect" />
          <v-list-item prepend-icon="mdi-history" title="Export to history" @click="menuExportHistory" />
          <v-list-item prepend-icon="mdi-delete" title="Delete" @click="menuDelete" />
        </template>
        <template v-else-if="menu.kind === 'edge'">
          <v-list-item prepend-icon="mdi-delete" title="Delete wire" @click="menuDeleteEdge" />
        </template>
      </v-list>
    </v-menu>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted, onBeforeUnmount } from 'vue';
import PatchNode from './PatchNode.vue';
import PatchWire from './PatchWire.vue';
import type { Graph, NodeInstance } from '@/patch/graph';
import { wouldCreateCycle, nextNodeId } from '@/patch/graph';
import { nodePorts } from '@/patch/nodes';
import type { PortType } from '@/patch/graph';
import { portAnchor } from '@/patch/layout';
import type { EvalResults } from '@/patch/evaluator';
import { formatSeqForDisplay, useSharedState } from '@/composables/useSharedState';

const props = withDefaults(
  defineProps<{
    graph: Graph;
    results: EvalResults;
    active?: boolean;
    snap?: boolean;
    showGrid?: boolean;
    resolveProgram?: (id: string) => Graph | undefined;
    subprogramNames?: Record<string, string>;
    memoryLength?: number;
  }>(),
  { active: true, snap: false, showGrid: true, subprogramNames: () => ({}), memoryLength: 10 },
);

const emit = defineEmits<{
  (e: 'commit', coalesceKey?: string): void;
  (e: 'toast', message: string): void;
  (e: 'open-subprogram', nodeId: string): void;
  (e: 'reroll', nodeId: string): void;
  (e: 'quick-add', pos: { x: number; y: number }): void;
  (e: 'selection-change', sel: { nodes: string[]; edges: string[] }): void;
}>();

const { addResultOpToHistory } = useSharedState();

const rootEl = ref<HTMLElement | null>(null);
const vp = computed(() => props.graph.viewport);

const transformStyle = computed(() => ({
  transform: `translate(${vp.value.x}px, ${vp.value.y}px) scale(${vp.value.zoom})`,
  transformOrigin: '0 0',
}));

// --- Selection ---
const selectedNodes = reactive(new Set<string>());
const selectedEdges = reactive(new Set<string>());

function emitSelection() {
  emit('selection-change', { nodes: [...selectedNodes], edges: [...selectedEdges] });
}
function clearSelection() {
  selectedNodes.clear();
  selectedEdges.clear();
  emitSelection();
}
function selectOnlyNode(id: string) {
  selectedEdges.clear();
  selectedNodes.clear();
  selectedNodes.add(id);
  emitSelection();
}
function toggleNode(id: string) {
  if (selectedNodes.has(id)) selectedNodes.delete(id);
  else selectedNodes.add(id);
  emitSelection();
}
function selectEdge(id: string, ev: PointerEvent) {
  ev.stopPropagation();
  if (!ev.shiftKey) {
    selectedNodes.clear();
    selectedEdges.clear();
  }
  selectedEdges.add(id);
  emitSelection();
}

// --- Ports ---
function portsFor(node: NodeInstance) {
  return nodePorts(node, props.resolveProgram);
}
function wiredInputsFor(nodeId: string): string[] {
  return props.graph.edges.filter((e) => e.to.node === nodeId).map((e) => e.to.port);
}
function portTypeOf(nodeId: string, port: string, side: 'in' | 'out'): PortType {
  const node = props.graph.nodes.find((n) => n.id === nodeId);
  if (!node) return 'Seq';
  const p = portsFor(node);
  const list = side === 'in' ? p.inputs : p.outputs;
  return list.find((x) => x.name === port)?.type ?? 'Seq';
}
function portIndex(nodeId: string, port: string, side: 'in' | 'out'): number {
  const node = props.graph.nodes.find((n) => n.id === nodeId);
  if (!node) return 0;
  const p = portsFor(node);
  const list = side === 'in' ? p.inputs : p.outputs;
  return Math.max(0, list.findIndex((x) => x.name === port));
}
function anchorOf(nodeId: string, port: string, side: 'in' | 'out') {
  const node = props.graph.nodes.find((n) => n.id === nodeId);
  if (!node) return { x: 0, y: 0 };
  return portAnchor(node, side, portIndex(nodeId, port, side));
}

// --- Wire geometry ---
const wireGeometries = computed(() =>
  props.graph.edges.map((e) => {
    const a = anchorOf(e.from.node, e.from.port, 'out');
    const b = anchorOf(e.to.node, e.to.port, 'in');
    return {
      id: e.id,
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      numeric: portTypeOf(e.from.node, e.from.port, 'out') === 'Num',
    };
  }),
);

// --- Interaction state ---
type WireDrag = { fromNode: string; fromPort: string; fromType: PortType };
const wireDrag = ref<WireDrag | null>(null);
const liveWire = ref<{ x1: number; y1: number; x2: number; y2: number; numeric: boolean } | null>(null);
const rubber = ref<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

let mode: 'idle' | 'pan' | 'move' | 'wire' | 'rubber' | 'comment-resize' = 'idle';
let panStart = { x: 0, y: 0, vx: 0, vy: 0 };
let moveStart = { x: 0, y: 0 };
let movePositions: Record<string, { x: number; y: number }> = {};
let moved = false;
let resizeNodeId = '';
let resizeStart = { x: 0, y: 0, w: 0, h: 0 };
const activePointers = new Map<number, { x: number; y: number }>();
let pinchDist = 0;

function toGraph(ev: { clientX: number; clientY: number }) {
  const r = rootEl.value!.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left - vp.value.x) / vp.value.zoom,
    y: (ev.clientY - r.top - vp.value.y) / vp.value.zoom,
  };
}
function snapVal(v: number): number {
  return props.snap ? Math.round(v / 20) * 20 : v;
}

/** Graph-space coordinate of an arbitrary client point (used for drag-drop). */
function clientToGraph(clientX: number, clientY: number) {
  return toGraph({ clientX, clientY });
}
/** Graph-space coordinate at the centre of the visible canvas (used for palette add). */
function centerPoint() {
  const r = rootEl.value?.getBoundingClientRect();
  if (!r) return { x: 0, y: 0 };
  return {
    x: (r.width / 2 - vp.value.x) / vp.value.zoom,
    y: (r.height / 2 - vp.value.y) / vp.value.zoom,
  };
}

// --- Background (pan / rubber-band) ---
function onBackgroundPointerDown(ev: PointerEvent) {
  activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (activePointers.size === 2) {
    const pts = [...activePointers.values()];
    pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    mode = 'idle';
    return;
  }
  if (ev.shiftKey) {
    mode = 'rubber';
    const g = toGraph(ev);
    rubber.value = { x1: g.x, y1: g.y, x2: g.x, y2: g.y };
  } else {
    mode = 'pan';
    panStart = { x: ev.clientX, y: ev.clientY, vx: vp.value.x, vy: vp.value.y };
    if (!ev.shiftKey) clearSelection();
  }
  attachWindow();
}

// --- Node interactions ---
function onNodePointerDown(id: string, ev: PointerEvent) {
  activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
  if (ev.shiftKey) {
    toggleNode(id);
  } else if (!selectedNodes.has(id)) {
    selectOnlyNode(id);
  }
  mode = 'move';
  moved = false;
  moveStart = { x: ev.clientX, y: ev.clientY };
  movePositions = {};
  for (const nid of selectedNodes) {
    const n = props.graph.nodes.find((x) => x.id === nid);
    if (n) movePositions[nid] = { x: n.x, y: n.y };
  }
  attachWindow();
}

function onPortPointerDown(nodeId: string, payload: { side: 'in' | 'out'; port: string; ev: PointerEvent }) {
  const { side, port, ev } = payload;
  if (side === 'out') {
    wireDrag.value = { fromNode: nodeId, fromPort: port, fromType: portTypeOf(nodeId, port, 'out') };
  } else {
    // Rewire: detach existing edge feeding this input, drag its source end.
    const edge = props.graph.edges.find((e) => e.to.node === nodeId && e.to.port === port);
    if (!edge) return;
    wireDrag.value = { fromNode: edge.from.node, fromPort: edge.from.port, fromType: portTypeOf(edge.from.node, edge.from.port, 'out') };
    props.graph.edges = props.graph.edges.filter((e) => e.id !== edge.id);
    emit('commit', 'detach');
  }
  mode = 'wire';
  const a = anchorOf(wireDrag.value.fromNode, wireDrag.value.fromPort, 'out');
  const g = toGraph(ev);
  liveWire.value = { x1: a.x, y1: a.y, x2: g.x, y2: g.y, numeric: wireDrag.value.fromType === 'Num' };
  attachWindow();
}

function onCommentResizeStart(id: string, ev: PointerEvent) {
  const n = props.graph.nodes.find((x) => x.id === id);
  if (!n) return;
  mode = 'comment-resize';
  resizeNodeId = id;
  resizeStart = { x: ev.clientX, y: ev.clientY, w: n.width ?? 200, h: n.height ?? 120 };
  attachWindow();
}

// --- Global pointer handling ---
function onWindowMove(ev: PointerEvent) {
  if (activePointers.has(ev.pointerId)) activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });

  if (activePointers.size === 2 && (mode === 'pan' || mode === 'idle')) {
    const pts = [...activePointers.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    if (pinchDist > 0) {
      const cx = (pts[0].x + pts[1].x) / 2;
      const cy = (pts[0].y + pts[1].y) / 2;
      zoomAt(cx, cy, dist / pinchDist);
    }
    pinchDist = dist;
    return;
  }

  if (mode === 'pan') {
    vp.value.x = panStart.vx + (ev.clientX - panStart.x);
    vp.value.y = panStart.vy + (ev.clientY - panStart.y);
  } else if (mode === 'move') {
    const dx = (ev.clientX - moveStart.x) / vp.value.zoom;
    const dy = (ev.clientY - moveStart.y) / vp.value.zoom;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) moved = true;
    for (const nid of Object.keys(movePositions)) {
      const n = props.graph.nodes.find((x) => x.id === nid);
      if (n) {
        n.x = snapVal(movePositions[nid].x + dx);
        n.y = snapVal(movePositions[nid].y + dy);
      }
    }
  } else if (mode === 'wire' && liveWire.value) {
    const g = toGraph(ev);
    liveWire.value.x2 = g.x;
    liveWire.value.y2 = g.y;
  } else if (mode === 'rubber' && rubber.value) {
    const g = toGraph(ev);
    rubber.value.x2 = g.x;
    rubber.value.y2 = g.y;
  } else if (mode === 'comment-resize') {
    const n = props.graph.nodes.find((x) => x.id === resizeNodeId);
    if (n) {
      n.width = Math.max(120, resizeStart.w + (ev.clientX - resizeStart.x) / vp.value.zoom);
      n.height = Math.max(70, resizeStart.h + (ev.clientY - resizeStart.y) / vp.value.zoom);
    }
  }
}

function onWindowUp(ev: PointerEvent) {
  activePointers.delete(ev.pointerId);

  if (mode === 'move') {
    if (moved) emit('commit', 'move');
  } else if (mode === 'wire') {
    finishWire(ev);
  } else if (mode === 'rubber') {
    finishRubber();
  } else if (mode === 'comment-resize') {
    emit('commit', 'resize');
  }

  if (activePointers.size === 0) {
    mode = 'idle';
    pinchDist = 0;
    detachWindow();
  }
}

function finishWire(ev: PointerEvent) {
  const target = portAt(ev.clientX, ev.clientY);
  const drag = wireDrag.value;
  wireDrag.value = null;
  liveWire.value = null;
  if (!drag || !target) return;
  if (target.side !== 'in') return;
  tryConnect(drag.fromNode, drag.fromPort, drag.fromType, target.node, target.port, target.ptype as PortType);
}

function finishRubber() {
  if (!rubber.value) return;
  const x1 = Math.min(rubber.value.x1, rubber.value.x2);
  const x2 = Math.max(rubber.value.x1, rubber.value.x2);
  const y1 = Math.min(rubber.value.y1, rubber.value.y2);
  const y2 = Math.max(rubber.value.y1, rubber.value.y2);
  selectedNodes.clear();
  selectedEdges.clear();
  for (const n of props.graph.nodes) {
    if (n.x >= x1 && n.x <= x2 && n.y >= y1 && n.y <= y2) selectedNodes.add(n.id);
  }
  emitSelection();
  rubber.value = null;
}

function portAt(clientX: number, clientY: number) {
  const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
  const hit = el?.closest('.pn-port-hit') as HTMLElement | null;
  if (!hit) return null;
  return {
    node: hit.dataset.node as string,
    port: hit.dataset.port as string,
    side: hit.dataset.side as 'in' | 'out',
    ptype: hit.dataset.ptype as string,
  };
}

function tryConnect(fromNode: string, fromPort: string, fromType: PortType, toNode: string, toPort: string, toType: PortType) {
  if (toType === 'Num' && fromType === 'Seq') {
    emit('toast', 'A Seq output cannot connect to a Num input.');
    return;
  }
  if (fromNode === toNode) {
    emit('toast', 'Cannot connect a node to itself.');
    return;
  }
  if (wouldCreateCycle(props.graph, fromNode, toNode)) {
    emit('toast', 'Connection rejected: would create a cycle.');
    shake();
    return;
  }
  props.graph.edges = props.graph.edges.filter((e) => !(e.to.node === toNode && e.to.port === toPort));
  props.graph.edges.push({ id: nextNodeId(), from: { node: fromNode, port: fromPort }, to: { node: toNode, port: toPort } });
  emit('commit', 'connect');
}

function shake() {
  const el = rootEl.value;
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
}

// --- Zoom / wheel ---
function zoomAt(clientX: number, clientY: number, factor: number) {
  const r = rootEl.value!.getBoundingClientRect();
  const gx = (clientX - r.left - vp.value.x) / vp.value.zoom;
  const gy = (clientY - r.top - vp.value.y) / vp.value.zoom;
  const newZoom = Math.min(3, Math.max(0.25, vp.value.zoom * factor));
  vp.value.x = clientX - r.left - gx * newZoom;
  vp.value.y = clientY - r.top - gy * newZoom;
  vp.value.zoom = newZoom;
}
function onWheel(ev: WheelEvent) {
  ev.preventDefault();
  zoomAt(ev.clientX, ev.clientY, ev.deltaY < 0 ? 1.1 : 0.9);
}

function onBackgroundDblClick(ev: MouseEvent) {
  const g = toGraph(ev);
  emit('quick-add', g);
}

// --- Params ---
function onParam(nodeId: string, payload: { key: string; value: unknown }) {
  const node = props.graph.nodes.find((n) => n.id === nodeId);
  if (!node) return;
  node.params[payload.key] = payload.value;
  emit('commit', `param:${nodeId}:${payload.key}`);
}

function copyToClipboard(value: string) {
  if (value) navigator.clipboard?.writeText(formatSeqForDisplay(value));
}

// --- Context menu ---
const menu = reactive<{ open: boolean; kind: 'node' | 'edge'; targetId: string; x: number; y: number }>({
  open: false,
  kind: 'node',
  targetId: '',
  x: 0,
  y: 0,
});
const menuStyle = computed(() => ({ position: 'fixed' as const, left: menu.x + 'px', top: menu.y + 'px' }));
const menuNodeIsSubprogram = computed(() => {
  const n = props.graph.nodes.find((x) => x.id === menu.targetId);
  return n?.type === 'subprogram';
});
function openNodeMenu(id: string, ev: MouseEvent) {
  if (!selectedNodes.has(id)) selectOnlyNode(id);
  menu.kind = 'node';
  menu.targetId = id;
  menu.x = ev.clientX;
  menu.y = ev.clientY;
  menu.open = true;
}
function openEdgeMenu(id: string, ev: MouseEvent) {
  menu.kind = 'edge';
  menu.targetId = id;
  menu.x = ev.clientX;
  menu.y = ev.clientY;
  menu.open = true;
}
function menuDuplicate() {
  duplicateSelection();
  menu.open = false;
}
function menuDelete() {
  deleteSelection();
  menu.open = false;
}
function menuDeleteEdge() {
  props.graph.edges = props.graph.edges.filter((e) => e.id !== menu.targetId);
  selectedEdges.delete(menu.targetId);
  emit('commit', 'delete-edge');
  menu.open = false;
}
function menuDisconnect() {
  const id = menu.targetId;
  props.graph.edges = props.graph.edges.filter((e) => e.from.node !== id && e.to.node !== id);
  emit('commit', 'disconnect');
  menu.open = false;
}
function menuExportHistory() {
  const n = props.graph.nodes.find((x) => x.id === menu.targetId);
  const r = props.results.get(menu.targetId);
  const val = n?.type === 'display' ? r?.inputs?.in : r?.outputs?.out;
  if (val) {
    addResultOpToHistory(`Patch: ${n?.type ?? 'node'}`, '', val);
    emit('toast', 'Exported to history.');
  } else {
    emit('toast', 'Node has no value to export.');
  }
  menu.open = false;
}
function menuOpenSubprogram() {
  emit('open-subprogram', menu.targetId);
  menu.open = false;
}

// --- Selection operations (exposed to parent) ---
function duplicateSelection() {
  const ids = [...selectedNodes];
  const newIds: string[] = [];
  for (const id of ids) {
    const n = props.graph.nodes.find((x) => x.id === id);
    if (!n) continue;
    const copy: NodeInstance = { ...JSON.parse(JSON.stringify(n)), id: nextNodeId(), x: n.x + 30, y: n.y + 30 };
    props.graph.nodes.push(copy);
    newIds.push(copy.id);
  }
  if (newIds.length) {
    selectedNodes.clear();
    selectedEdges.clear();
    newIds.forEach((i) => selectedNodes.add(i));
    emitSelection();
    emit('commit', 'duplicate');
  }
}
function deleteSelection() {
  if (selectedNodes.size === 0 && selectedEdges.size === 0) return;
  const nodeIds = new Set(selectedNodes);
  props.graph.nodes = props.graph.nodes.filter((n) => !nodeIds.has(n.id));
  props.graph.edges = props.graph.edges.filter(
    (e) => !nodeIds.has(e.from.node) && !nodeIds.has(e.to.node) && !selectedEdges.has(e.id),
  );
  selectedNodes.clear();
  selectedEdges.clear();
  emitSelection();
  emit('commit', 'delete');
}
function nudgeSelection(dx: number, dy: number) {
  if (selectedNodes.size === 0) return;
  for (const id of selectedNodes) {
    const n = props.graph.nodes.find((x) => x.id === id);
    if (n) {
      n.x += dx;
      n.y += dy;
    }
  }
  emit('commit', 'nudge');
}

// --- Keyboard ---
function isEditableTarget(t: EventTarget | null): boolean {
  const el = t as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}
function onKeyDown(ev: KeyboardEvent) {
  if (!props.active) return;
  if (isEditableTarget(ev.target)) return;
  if (ev.key === 'Delete' || ev.key === 'Backspace') {
    ev.preventDefault();
    deleteSelection();
  } else if (ev.key === 'ArrowLeft') {
    ev.preventDefault();
    nudgeSelection(-(props.snap ? 20 : 5), 0);
  } else if (ev.key === 'ArrowRight') {
    ev.preventDefault();
    nudgeSelection(props.snap ? 20 : 5, 0);
  } else if (ev.key === 'ArrowUp') {
    ev.preventDefault();
    nudgeSelection(0, -(props.snap ? 20 : 5));
  } else if (ev.key === 'ArrowDown') {
    ev.preventDefault();
    nudgeSelection(0, props.snap ? 20 : 5);
  }
}

// --- Window listener management ---
let windowAttached = false;
function attachWindow() {
  if (windowAttached) return;
  windowAttached = true;
  window.addEventListener('pointermove', onWindowMove);
  window.addEventListener('pointerup', onWindowUp);
  window.addEventListener('pointercancel', onWindowUp);
}
function detachWindow() {
  windowAttached = false;
  window.removeEventListener('pointermove', onWindowMove);
  window.removeEventListener('pointerup', onWindowUp);
  window.removeEventListener('pointercancel', onWindowUp);
}

onMounted(() => window.addEventListener('keydown', onKeyDown));
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown);
  detachWindow();
});

defineExpose({ duplicateSelection, deleteSelection, clearSelection, selectedNodes, selectedEdges, centerPoint, clientToGraph });
</script>

<style scoped>
.patch-canvas {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #0a0b0d;
  touch-action: none;
  cursor: grab;
}
.patch-canvas.grid {
  background-image: radial-gradient(#1c1f26 1px, transparent 1px);
  background-size: 20px 20px;
}
.patch-canvas.wiring {
  cursor: crosshair;
}
.patch-transform {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 0;
}
.wire-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 1px;
  height: 1px;
  overflow: visible;
  pointer-events: none;
}
.rubber-band {
  fill: rgba(124, 196, 255, 0.12);
  stroke: #7cc4ff;
  stroke-width: 1;
  stroke-dasharray: 4 3;
}
.patch-canvas :deep(.wiring .pn-dot) {
  transform: scale(1.3);
}
.patch-canvas :deep(.wiring .pn-dot.num) {
  transform: rotate(45deg) scale(1.3);
}
.shake {
  animation: patch-shake 0.3s;
}
@keyframes patch-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-4px); }
  75% { transform: translateX(4px); }
}
@media (prefers-reduced-motion: reduce) {
  .shake {
    animation: none;
  }
}
</style>
