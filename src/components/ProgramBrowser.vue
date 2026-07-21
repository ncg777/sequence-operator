<template>
  <div class="program-browser">
    <div class="pb-toolbar">
      <v-text-field
        v-model="search"
        density="compact"
        variant="outlined"
        hide-details
        clearable
        placeholder="Search programs…"
        prepend-inner-icon="mdi-magnify"
        aria-label="Search programs"
      />
      <div class="pb-toolbar-actions">
        <v-btn size="x-small" variant="text" icon title="New folder" @click="openNewRootFolder"><v-icon size="16">mdi-folder-plus-outline</v-icon></v-btn>
        <v-btn size="x-small" variant="text" icon title="Import…" @click="triggerImport"><v-icon size="16">mdi-file-import-outline</v-icon></v-btn>
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" size="x-small" variant="text" icon title="Export"><v-icon size="16">mdi-file-export-outline</v-icon></v-btn>
          </template>
          <v-list density="compact">
            <v-list-item
              :disabled="!selectedIds.length"
              :title="`Export selected (${selectedIds.length})`"
              prepend-icon="mdi-check-circle-outline"
              @click="exportSelected"
            />
            <v-list-item title="Export entire library…" prepend-icon="mdi-archive-outline" @click="exportAll" />
          </v-list>
        </v-menu>
        <input ref="fileInput" type="file" accept="application/json,.json,.zip" class="d-none" @change="onFileSelected" />
      </div>
    </div>

    <div class="pb-root-row" @dragover.prevent @drop="onDropToRoot">
      <v-icon size="16">mdi-home-outline</v-icon>
      <span>Root (drop here to un-file)</span>
    </div>

    <div class="pb-scroll">
      <ProgramBrowserNode
        :node="filteredTree"
        :depth="0"
        :active-id="activeId"
        :selected-ids="selectedIds"
        @load="onLoad"
        @toast="onToast"
        @changed="onChanged"
        @toggle-select="onToggleSelect"
      />
      <div v-if="!tree.folders.length && !tree.programs.length" class="pb-empty">No saved programs yet.</div>
    </div>

    <!-- New folder dialog -->
    <v-dialog v-model="textDialog.open" max-width="380">
      <v-card>
        <v-card-title class="text-body-1">{{ textDialog.title }}</v-card-title>
        <v-card-text>
          <v-text-field
            v-model="textDialog.value"
            density="compact"
            variant="outlined"
            autofocus
            hide-details
            @keydown.enter="confirmTextDialog"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="textDialog.open = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmTextDialog">{{ textDialog.confirmLabel }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- Import conflict-policy dialog -->
    <v-dialog v-model="importDialogOpen" max-width="420">
      <v-card>
        <v-card-title class="text-body-1">Import programs</v-card-title>
        <v-card-text>
          <div class="pb-import-file">{{ pendingFile?.name }}</div>
          <v-radio-group v-model="importPolicy" density="compact" hide-details>
            <v-radio label="Rename imported copies on conflict (safest)" value="rename" />
            <v-radio label="Overwrite existing programs with the same id" value="overwrite" />
            <v-radio label="Skip programs that already exist" value="skip" />
          </v-radio-group>
        </v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="importDialogOpen = false">Cancel</v-btn>
          <v-btn color="primary" @click="confirmImport">Import</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import * as store from '@/patch/store';
import * as bundle from '@/patch/bundle';
import type { ProgramTreeNode } from '@/patch/store';
import ProgramBrowserNode from './ProgramBrowserNode.vue';

const props = defineProps<{ activeId: string | null }>();
const emit = defineEmits<{
  (e: 'load', id: string): void;
  (e: 'toast', message: string): void;
  (e: 'changed'): void;
}>();

const tree = ref<ProgramTreeNode>({ folder: null, folders: [], programs: [] });
const search = ref('');
const selectedIds = ref<string[]>([]);
const fileInput = ref<HTMLInputElement | null>(null);

function refresh() {
  tree.value = store.buildTree();
}
onMounted(refresh);
defineExpose({ refresh });

function filterTree(node: ProgramTreeNode, q: string): ProgramTreeNode {
  if (!q) return node;
  const query = q.toLowerCase();
  const programs = node.programs.filter((p) => p.name.toLowerCase().includes(query));
  const folders = node.folders
    .map((f) => filterTree(f, q))
    .filter((f) => f.programs.length > 0 || f.folders.length > 0 || (f.folder?.name.toLowerCase().includes(query) ?? false));
  return { folder: node.folder, folders, programs };
}
const filteredTree = computed(() => filterTree(tree.value, search.value.trim()));

function onLoad(id: string) {
  emit('load', id);
}
function onToast(message: string) {
  emit('toast', message);
}
function onChanged() {
  refresh();
  emit('changed');
}
function onToggleSelect(id: string) {
  const i = selectedIds.value.indexOf(id);
  if (i >= 0) selectedIds.value.splice(i, 1);
  else selectedIds.value.push(id);
}

interface TextDialogState {
  open: boolean;
  title: string;
  value: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
}
const textDialog = ref<TextDialogState>({ open: false, title: '', value: '', confirmLabel: 'Create', onConfirm: () => {} });
function confirmTextDialog() {
  const value = textDialog.value.value.trim();
  if (!value) return;
  textDialog.value.onConfirm(value);
  textDialog.value.open = false;
}
function openNewRootFolder() {
  textDialog.value = {
    open: true,
    title: 'New folder',
    value: '',
    confirmLabel: 'Create',
    onConfirm: (name) => {
      store.createFolder(name, null);
      onChanged();
    },
  };
}

function onDropToRoot(ev: DragEvent) {
  if (!ev.dataTransfer) return;
  const programId = ev.dataTransfer.getData('application/x-seqop-program');
  const folderId = ev.dataTransfer.getData('application/x-seqop-folder');
  if (programId) {
    store.moveProgram(programId, null);
    onChanged();
  } else if (folderId) {
    store.moveFolder(folderId, null);
    onChanged();
  }
}

// --- Export ---
function exportSelected() {
  if (!selectedIds.value.length) return;
  bundle.exportPrograms(selectedIds.value, 'programs.zip');
  emit('toast', `Exported ${selectedIds.value.length} program(s).`);
}
function exportAll() {
  bundle.exportAll();
  emit('toast', 'Exported library.');
}

// --- Import ---
const importPolicy = ref<bundle.ConflictPolicy>('rename');
const importDialogOpen = ref(false);
const pendingFile = ref<File | null>(null);

function triggerImport() {
  fileInput.value?.click();
}
function onFileSelected(ev: Event) {
  const input = ev.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = '';
  if (!file) return;
  pendingFile.value = file;
  importDialogOpen.value = true;
}
async function confirmImport() {
  const file = pendingFile.value;
  importDialogOpen.value = false;
  if (!file) return;
  try {
    const result = await bundle.importBundle(file, importPolicy.value);
    onChanged();
    emit(
      'toast',
      `Imported ${result.imported}, overwritten ${result.overwritten}, renamed ${result.renamed}, skipped ${result.skipped}.`,
    );
  } catch (e) {
    emit('toast', 'Import failed: ' + (e as Error).message);
  }
  pendingFile.value = null;
}
</script>

<style scoped>
.program-browser {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #101216;
  border-right: 1px solid #23262c;
}
.pb-toolbar {
  padding: 8px;
  border-bottom: 1px solid #23262c;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.pb-toolbar-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
.pb-root-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  font-size: 0.7rem;
  color: #7a8290;
  border-bottom: 1px dashed #23262c;
}
.pb-scroll {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 4px 0 12px;
}
.pb-empty {
  padding: 12px;
  color: #7a8290;
  font-size: 0.76rem;
  text-align: center;
}
.pb-import-file {
  font-size: 0.76rem;
  color: #7a8290;
  margin-bottom: 8px;
  word-break: break-all;
}
</style>
