<template>
  <div class="node-palette">
    <div class="palette-search">
      <v-text-field
        v-model="query"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        placeholder="Search nodes…"
        prepend-inner-icon="mdi-magnify"
        aria-label="Search nodes"
      ></v-text-field>
    </div>
    <div class="palette-scroll">
      <template v-for="group in groupedEntries" :key="group.label">
        <div v-if="group.items.length" class="palette-group">
          <div class="palette-group-label">{{ group.label }}</div>
          <button
            v-for="(entry, i) in group.items"
            :key="group.label + i"
            class="palette-item"
            :draggable="true"
            :aria-label="'Add ' + entry.label"
            @click="$emit('add', entry)"
            @dragstart="onDragStart(entry, $event)"
          >
            <v-icon size="16" class="palette-item-icon" :style="{ color: colorFor(entry.category) }">{{ entry.icon }}</v-icon>
            <span class="palette-item-label">{{ entry.label }}</span>
          </button>
        </div>
      </template>
      <div v-if="!hasResults" class="palette-empty">No matches.</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { PaletteEntry, NodeCategory } from '@/patch/nodes';
import { CATEGORY_COLORS } from '@/patch/nodes';

const props = defineProps<{ entries: PaletteEntry[] }>();
defineEmits<{ (e: 'add', entry: PaletteEntry): void }>();

const query = ref('');

const GROUP_ORDER = ['Sources & Sinks', 'Combine', 'Unary', 'Tritwise', 'Programs', 'Misc'];
const CATEGORY_TO_GROUP: Record<NodeCategory, string> = {
  source: 'Sources & Sinks',
  sink: 'Sources & Sinks',
  binary: 'Combine',
  unary: 'Unary',
  tritwise: 'Tritwise',
  program: 'Programs',
  misc: 'Misc',
};

function colorFor(cat: NodeCategory) {
  return CATEGORY_COLORS[cat];
}

const filtered = computed(() => {
  const q = (query.value ?? '').trim().toLowerCase();
  if (!q) return props.entries;
  return props.entries.filter((e) => (e.label + ' ' + (e.keywords ?? '')).toLowerCase().includes(q));
});

const groupedEntries = computed(() =>
  GROUP_ORDER.map((label) => ({
    label,
    items: filtered.value.filter((e) => CATEGORY_TO_GROUP[e.category] === label),
  })),
);

const hasResults = computed(() => filtered.value.length > 0);

function onDragStart(entry: PaletteEntry, ev: DragEvent) {
  ev.dataTransfer?.setData('application/x-patch-node', JSON.stringify(entry));
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'copy';
}
</script>

<style scoped>
.node-palette {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #101216;
  border-right: 1px solid #23262c;
}
.palette-search {
  padding: 8px;
  border-bottom: 1px solid #23262c;
}
.palette-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 4px 0 12px;
}
.palette-group {
  margin-bottom: 4px;
}
.palette-group-label {
  font-size: 0.66rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #7a8290;
  padding: 6px 10px 2px;
}
.palette-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  text-align: left;
  padding: 5px 10px;
  background: transparent;
  border: none;
  color: #dfe3e8;
  cursor: pointer;
  font-size: 0.76rem;
}
.palette-item:hover {
  background: #1b1e24;
}
.palette-item:focus-visible {
  outline: 2px solid #7cc4ff;
  outline-offset: -2px;
}
.palette-item-icon {
  flex: 0 0 auto;
}
.palette-item-label {
  flex: 1 1 auto;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.palette-empty {
  padding: 12px;
  color: #7a8290;
  font-size: 0.76rem;
  text-align: center;
}
</style>
