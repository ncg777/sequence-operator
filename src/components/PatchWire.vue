<template>
  <g>
    <!-- Wide invisible hit area for easier selection -->
    <path
      :d="d"
      fill="none"
      stroke="transparent"
      :stroke-width="18"
      style="pointer-events: stroke; cursor: pointer;"
      @pointerdown="$emit('select', $event)"
      @contextmenu.prevent="$emit('contextmenu', $event)"
    />
    <path
      :d="d"
      fill="none"
      :stroke="strokeColor"
      :stroke-width="selected ? 3.5 : 2.5"
      :stroke-dasharray="live ? '6 5' : undefined"
      :opacity="dimmed ? 0.3 : 1"
      style="pointer-events: none;"
    />
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    selected?: boolean;
    highlight?: boolean;
    dimmed?: boolean;
    live?: boolean;
    numeric?: boolean;
  }>(),
  { selected: false, highlight: false, dimmed: false, live: false, numeric: false },
);

defineEmits<{ (e: 'select', ev: PointerEvent): void; (e: 'contextmenu', ev: MouseEvent): void }>();

const d = computed(() => {
  const dx = Math.abs(props.x2 - props.x1);
  const off = Math.max(40, dx / 2);
  const c1x = props.x1 + off;
  const c2x = props.x2 - off;
  return `M ${props.x1} ${props.y1} C ${c1x} ${props.y1} ${c2x} ${props.y2} ${props.x2} ${props.y2}`;
});

const strokeColor = computed(() => {
  if (props.highlight) return '#7cc4ff';
  if (props.selected) return '#ffd166';
  return props.numeric ? '#9c7cff' : '#5c8f6f';
});
</script>
