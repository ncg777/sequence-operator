<template>
  <!-- Comment sticky note -->
  <div
    v-if="isComment"
    class="patch-node comment-node"
    :class="{ selected }"
    :style="commentStyle"
    @pointerdown.stop="emit('node-pointerdown', $event)"
    @contextmenu.prevent="emit('contextmenu', $event)"
  >
    <textarea
      class="comment-text"
      :value="String(node.params.text ?? '')"
      placeholder="Comment…"
      @pointerdown.stop
      @input="onParam('text', ($event.target as HTMLTextAreaElement).value)"
    ></textarea>
    <div class="comment-resize" @pointerdown.stop.prevent="emit('resize-start', $event)"></div>
  </div>

  <!-- Regular node -->
  <div
    v-else
    class="patch-node"
    :class="{ selected, waiting, 'has-error': !!errorMsg }"
    :style="cardStyle"
    @pointerdown.stop
    @contextmenu.prevent="emit('contextmenu', $event)"
  >
    <div class="pn-header" :style="{ background: headerColor }" @pointerdown.stop="emit('node-pointerdown', $event)" @dblclick="onHeaderDblClick">
      <v-icon size="16" class="pn-header-icon">{{ icon }}</v-icon>
      <span class="pn-title">{{ title }}</span>
      <v-btn
        v-if="nondet"
        icon
        size="x-small"
        variant="text"
        density="compact"
        class="pn-header-btn"
        title="Reroll"
        @pointerdown.stop
        @click.stop="emit('reroll')"
      >
        <v-icon size="14">mdi-autorenew</v-icon>
      </v-btn>
      <v-icon v-if="errorMsg" size="16" color="red-lighten-1" class="pn-error-icon" :title="errorMsg">mdi-alert-circle</v-icon>
    </div>

    <div class="pn-body" :style="{ position: 'relative' }">
      <!-- Port region (fixed height so ports stay put) -->
      <div :style="{ height: regionH + 'px', position: 'relative' }">
        <template v-for="(p, i) in inputs" :key="'in-' + p.name">
          <div
            class="pn-port-hit"
            :style="portHitStyle('in', i)"
            :data-node="node.id"
            :data-port="p.name"
            data-side="in"
            :data-ptype="p.type"
            @pointerdown.stop="emit('port-pointerdown', { side: 'in', port: p.name, ev: $event })"
          >
            <span
              class="pn-dot"
              :class="[p.type === 'Num' ? 'num' : 'seq', { connected: wiredInputs.includes(p.name), 'wire-target': wireTargetClass(p.type) === 'target', 'wire-dim': wireTargetClass(p.type) === 'dim' }]"
            ></span>
          </div>
          <span class="pn-port-label in" :style="{ top: labelTop(i) }">{{ p.label }}</span>
        </template>

        <template v-for="(p, i) in outputs" :key="'out-' + p.name">
          <div
            class="pn-port-hit"
            :style="portHitStyle('out', i)"
            :data-node="node.id"
            :data-port="p.name"
            data-side="out"
            :data-ptype="p.type"
            @pointerdown.stop="emit('port-pointerdown', { side: 'out', port: p.name, ev: $event })"
          >
            <span class="pn-dot" :class="[p.type === 'Num' ? 'num' : 'seq', 'out']"></span>
          </div>
          <span class="pn-port-label out" :style="{ top: labelTop(i) }">{{ p.label }}</span>
        </template>
      </div>

      <!-- Inline parameters -->
      <div v-if="params.length" class="pn-params">
        <template v-for="param in params" :key="param.key">
          <v-select
            v-if="param.kind === 'select'"
            :model-value="node.params[param.key]"
            :items="param.options"
            :label="param.label"
            density="compact"
            variant="outlined"
            hide-details
            class="pn-field"
            @pointerdown.stop
            @update:model-value="onParam(param.key, $event)"
          ></v-select>
          <v-select
            v-else-if="param.kind === 'slot'"
            :model-value="Number(node.params[param.key])"
            :items="slotItems"
            :label="'M[i]'"
            density="compact"
            variant="outlined"
            hide-details
            class="pn-field"
            @pointerdown.stop
            @update:model-value="onParam(param.key, $event)"
          ></v-select>
          <v-text-field
            v-else
            :model-value="node.params[param.key]"
            :label="param.label"
            :type="param.kind === 'number' ? 'number' : 'text'"
            :disabled="isBound(param)"
            density="compact"
            variant="outlined"
            hide-details
            class="pn-field"
            :placeholder="param.kind === 'seqtext' ? '0 1 2…' : ''"
            @pointerdown.stop
            @update:model-value="onParam(param.key, $event)"
          ></v-text-field>
        </template>
      </div>

      <!-- Live preview / display sink -->
      <div v-if="showPreview" class="pn-preview" :class="{ 'is-display': node.type === 'display' }">
        <template v-if="waiting">
          <span class="pn-waiting">waiting…</span>
        </template>
        <template v-else-if="errorMsg">
          <span class="pn-errtext">{{ errorMsg }}</span>
        </template>
        <template v-else>
          <span class="pn-preview-val">{{ previewTruncated }}</span>
          <span class="pn-badge">{{ previewLen }}</span>
          <v-btn
            v-if="node.type === 'display'"
            icon
            size="x-small"
            variant="text"
            density="compact"
            class="pn-copy"
            title="Copy"
            @pointerdown.stop
            @click.stop="emit('copy', previewValue)"
          >
            <v-icon size="14">mdi-clipboard-outline</v-icon>
          </v-btn>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { NodeInstance } from '@/patch/graph';
import type { NodeResult } from '@/patch/evaluator';
import type { PortDef, ParamDef } from '@/patch/nodes';
import { CATEGORY_COLORS, getNodeType } from '@/patch/nodes';
import { NODE_WIDTH, portOffsetY, portRegionHeight } from '@/patch/layout';
import { formatSeqForDisplay } from '@/composables/useSharedState';

const props = withDefaults(
  defineProps<{
    node: NodeInstance;
    inputs: PortDef[];
    outputs: PortDef[];
    result?: NodeResult;
    selected?: boolean;
    wiredInputs?: string[];
    subprogramName?: string;
    memoryLength?: number;
    /** Type of the wire currently being dragged, or null when not wiring. */
    wireDragType?: 'Seq' | 'Num' | null;
  }>(),
  { selected: false, wiredInputs: () => [], subprogramName: '', memoryLength: 10, wireDragType: null },
);

const emit = defineEmits<{
  (e: 'node-pointerdown', ev: PointerEvent): void;
  (e: 'port-pointerdown', payload: { side: 'in' | 'out'; port: string; ev: PointerEvent }): void;
  (e: 'contextmenu', ev: MouseEvent): void;
  (e: 'param', payload: { key: string; value: unknown }): void;
  (e: 'reroll'): void;
  (e: 'open-subprogram'): void;
  (e: 'copy', value: string): void;
  (e: 'resize-start', ev: PointerEvent): void;
}>();

const nodeType = computed(() => getNodeType(props.node.type));
const isComment = computed(() => props.node.type === 'comment');
const params = computed<ParamDef[]>(() => (isComment.value ? [] : nodeType.value?.params ?? []));
const icon = computed(() => nodeType.value?.icon ?? 'mdi-shape');
const headerColor = computed(() => CATEGORY_COLORS[nodeType.value?.category ?? 'misc']);
const title = computed(() => {
  if (props.node.type === 'subprogram') return props.subprogramName || 'Subprogram';
  return nodeType.value?.label ?? props.node.type;
});

const nodeWidth = computed(() => NODE_WIDTH);
const regionH = computed(() => portRegionHeight(props.inputs.length, props.outputs.length));

const cardStyle = computed(() => ({
  left: props.node.x + 'px',
  top: props.node.y + 'px',
  width: nodeWidth.value + 'px',
}));

const commentStyle = computed(() => ({
  left: props.node.x + 'px',
  top: props.node.y + 'px',
  width: (props.node.width ?? 200) + 'px',
  height: (props.node.height ?? 120) + 'px',
}));

const nondet = computed(() => nodeType.value?.isNondeterministic?.(props.node.params) ?? false);

const waiting = computed(() => props.result?.waiting ?? false);
const errorMsg = computed(() => props.result?.error);

const hasSeqOutput = computed(() => props.outputs.some((p) => p.name === 'out'));
const showPreview = computed(() => props.node.type === 'display' || hasSeqOutput.value);

const previewValue = computed(() => {
  const r = props.result;
  if (!r) return '';
  if (props.node.type === 'display') return r.inputs?.in ?? '';
  return r.outputs?.out ?? '';
});
const previewDisplay = computed(() => formatSeqForDisplay(previewValue.value));
const previewTruncated = computed(() => {
  const s = previewDisplay.value;
  return s.length > 26 ? s.slice(0, 26) + '…' : s || '—';
});
const previewLen = computed(() => {
  const v = previewValue.value.trim();
  return v ? v.split(/\s+/).filter(Boolean).length : 0;
});

const slotItems = computed(() => {
  const max = Math.max(10, props.memoryLength);
  return Array.from({ length: max }, (_, i) => ({ title: `M[${i}]`, value: i }));
});

function isBound(param: ParamDef): boolean {
  return !!param.boundPort && props.wiredInputs.includes(param.boundPort);
}

/** Returns 'target' (highlight) when this input port can accept the dragged wire,
 *  'dim' when it cannot, or '' when no wire drag is active. */
function wireTargetClass(portType: 'Seq' | 'Num'): '' | 'target' | 'dim' {
  if (!props.wireDragType) return '';
  // A Num output can connect to a Seq input (coercion), but not the reverse.
  const compatible = props.wireDragType === portType || (props.wireDragType === 'Num' && portType === 'Seq');
  return compatible ? 'target' : 'dim';
}

function portHitStyle(side: 'in' | 'out', i: number) {
  return {
    position: 'absolute' as const,
    top: portOffsetY(i) - 22 + 'px',
    left: (side === 'in' ? -22 : nodeWidth.value - 22) + 'px',
    width: '44px',
    height: '44px',
  };
}

function labelTop(i: number): string {
  return portOffsetY(i) - 9 + 'px';
}

function onParam(key: string, value: unknown) {
  emit('param', { key, value });
}

function onHeaderDblClick() {
  if (props.node.type === 'subprogram') emit('open-subprogram');
}
</script>

<style scoped>
.patch-node {
  position: absolute;
  background: #14161a;
  border: 1px solid #2c2f36;
  border-radius: 6px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
  color: #e8e8e8;
  user-select: none;
  font-size: 0.78rem;
}
.patch-node.selected {
  border-color: #ffd166;
  box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.5);
}
.patch-node.has-error {
  border-color: #e53935;
}
.patch-node.waiting {
  opacity: 0.92;
}
.pn-header {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 34px;
  padding: 0 6px;
  border-top-left-radius: 6px;
  border-top-right-radius: 6px;
  cursor: grab;
}
.pn-header-icon {
  flex: 0 0 auto;
}
.pn-title {
  flex: 1 1 auto;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 0.76rem;
}
.pn-header-btn {
  flex: 0 0 auto;
}
.pn-error-icon {
  flex: 0 0 auto;
  cursor: help;
}
.pn-body {
  padding: 2px 8px 8px;
}
.pn-port-hit {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: crosshair;
  z-index: 5;
  touch-action: none;
}
.pn-dot {
  width: 14px;
  height: 14px;
  background: #5c8f6f;
  border: 2px solid #0b0c0e;
  box-sizing: content-box;
}
.pn-dot.seq {
  border-radius: 50%;
  background: #5c8f6f;
}
.pn-dot.num {
  transform: rotate(45deg);
  background: #9c7cff;
}
.pn-dot.connected {
  box-shadow: 0 0 0 2px rgba(124, 196, 255, 0.6);
}
.pn-dot.wire-target {
  box-shadow: 0 0 0 3px rgba(255, 209, 102, 0.8);
  transform: scale(1.3);
}
.pn-dot.num.wire-target {
  transform: rotate(45deg) scale(1.3);
}
.pn-dot.wire-dim {
  opacity: 0.25;
}
.pn-dot.out {
  background: #7fae8f;
}
.pn-port-label {
  position: absolute;
  font-size: 0.66rem;
  color: #aab;
  pointer-events: none;
  line-height: 1;
}
.pn-port-label.in {
  left: 12px;
}
.pn-port-label.out {
  right: 12px;
  text-align: right;
}
.pn-params {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 2px;
}
.pn-field {
  font-size: 0.72rem;
}
.pn-field :deep(.v-field__input) {
  min-height: 30px !important;
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  font-size: 0.72rem;
}
.pn-preview {
  margin-top: 6px;
  padding: 3px 6px;
  background: #0c0d10;
  border: 1px solid #23262c;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  font-family: monospace;
  font-size: 0.7rem;
}
.pn-preview.is-display {
  background: #101418;
}
.pn-preview-val {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: #cfe;
}
.pn-badge {
  flex: 0 0 auto;
  background: #23384a;
  color: #9cd;
  border-radius: 8px;
  padding: 0 6px;
  font-size: 0.62rem;
}
.pn-waiting {
  color: #888;
  font-style: italic;
}
.pn-errtext {
  color: #ff8a80;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pn-copy {
  flex: 0 0 auto;
}
.comment-node {
  position: absolute;
  background: #4a4326;
  border: 1px solid #7a6f36;
  border-radius: 4px;
  padding: 4px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.5);
}
.comment-node.selected {
  border-color: #ffd166;
  box-shadow: 0 0 0 2px rgba(255, 209, 102, 0.5);
}
.comment-text {
  width: 100%;
  height: 100%;
  background: transparent;
  border: none;
  outline: none;
  color: #fff8e1;
  resize: none;
  font-size: 0.8rem;
  font-family: inherit;
}
.comment-resize {
  position: absolute;
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
  background: linear-gradient(135deg, transparent 50%, #7a6f36 50%);
}
</style>
