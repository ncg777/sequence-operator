<template>
  <div class="pbn">
    <!-- Folder header (skipped for the synthetic root node, whose `folder` is null) -->
    <div
      v-if="node.folder"
      class="pbn-row pbn-folder"
      :style="{ paddingLeft: depth * 14 + 6 + 'px' }"
      draggable="true"
      @dragstart="onDragStartFolder"
      @dragover.prevent
      @drop.stop="onDropOnFolder"
      @click="expanded = !expanded"
    >
      <v-icon size="16">{{ expanded ? 'mdi-chevron-down' : 'mdi-chevron-right' }}</v-icon>
      <v-icon size="16" class="pbn-folder-icon">{{ expanded ? 'mdi-folder-open-outline' : 'mdi-folder-outline' }}</v-icon>
      <span class="pbn-name">{{ node.folder.name }}</span>
      <span class="pbn-spacer"></span>
      <v-menu>
        <template #activator="{ props: menuProps }">
          <v-btn v-bind="menuProps" icon size="x-small" variant="text" @click.stop><v-icon size="16">mdi-dots-vertical</v-icon></v-btn>
        </template>
        <v-list density="compact">
          <v-list-item prepend-icon="mdi-folder-plus-outline" title="New subfolder" @click="openNewSubfolder" />
          <v-list-item prepend-icon="mdi-pencil-outline" title="Rename" @click="openRenameFolder" />
          <v-list-item prepend-icon="mdi-file-export-outline" title="Export folder…" @click="exportThisFolder" />
          <v-list-item prepend-icon="mdi-delete-outline" title="Delete" @click="openDeleteFolder" />
        </v-list>
      </v-menu>
    </div>

    <template v-if="expanded">
      <ProgramBrowserNode
        v-for="child in node.folders"
        :key="child.folder?.id"
        :node="child"
        :depth="depth + 1"
        :active-id="activeId"
        :selected-ids="selectedIds"
        @load="$emit('load', $event)"
        @toast="$emit('toast', $event)"
        @changed="$emit('changed')"
        @toggle-select="$emit('toggle-select', $event)"
      />

      <div
        v-for="p in node.programs"
        :key="p.id"
        class="pbn-row pbn-program"
        :class="{ 'pbn-active': p.id === activeId }"
        :style="{ paddingLeft: (depth + 1) * 14 + 6 + 'px' }"
        draggable="true"
        @dragstart="onDragStartProgram($event, p.id)"
        @click="$emit('load', p.id)"
      >
        <v-checkbox-btn
          density="compact"
          :model-value="selectedIds.includes(p.id)"
          @click.stop="$emit('toggle-select', p.id)"
        />
        <v-icon size="16" class="pbn-program-icon">mdi-file-code-outline</v-icon>
        <div class="pbn-program-text">
          <span class="pbn-name">{{ p.name }}</span>
          <span class="pbn-subtitle">{{ p.nodeCount }} nodes · {{ formatDate(p.updatedAt) }}</span>
        </div>
        <span class="pbn-spacer"></span>
        <v-menu>
          <template #activator="{ props: menuProps }">
            <v-btn v-bind="menuProps" icon size="x-small" variant="text" @click.stop><v-icon size="16">mdi-dots-vertical</v-icon></v-btn>
          </template>
          <v-list density="compact">
            <v-list-item prepend-icon="mdi-folder-open-outline" title="Load" @click="$emit('load', p.id)" />
            <v-list-item prepend-icon="mdi-content-duplicate" title="Duplicate" @click="duplicateProgram(p)" />
            <v-list-item prepend-icon="mdi-pencil-outline" title="Rename" @click="openRenameProgram(p)" />
            <v-list-item prepend-icon="mdi-file-export-outline" title="Export…" @click="exportThisProgram(p)" />
            <v-list-item prepend-icon="mdi-delete-outline" title="Delete" @click="openDeleteProgram(p)" />
          </v-list>
        </v-menu>
      </div>

      <div v-if="node.folder && !node.folders.length && !node.programs.length" class="pbn-empty">Empty folder.</div>
    </template>

    <!-- Text prompt dialog (new subfolder / rename folder / rename program) -->
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

    <!-- Confirm dialog (delete folder / delete program) -->
    <v-dialog v-model="confirmDialog.open" max-width="380">
      <v-card>
        <v-card-title class="text-body-1">{{ confirmDialog.title }}</v-card-title>
        <v-card-text>{{ confirmDialog.message }}</v-card-text>
        <v-card-actions>
          <v-spacer />
          <v-btn @click="confirmDialog.open = false">Cancel</v-btn>
          <v-btn color="error" @click="confirmDelete">Delete</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import * as store from '@/patch/store';
import * as bundle from '@/patch/bundle';
import type { ProgramTreeNode, ProgramMeta } from '@/patch/store';

const props = defineProps<{
  node: ProgramTreeNode;
  depth: number;
  activeId: string | null;
  selectedIds: string[];
}>();

const emit = defineEmits<{
  (e: 'load', id: string): void;
  (e: 'toast', message: string): void;
  (e: 'changed'): void;
  (e: 'toggle-select', id: string): void;
}>();

const expanded = ref(true);

interface TextDialogState {
  open: boolean;
  title: string;
  value: string;
  confirmLabel: string;
  onConfirm: (value: string) => void;
}
const textDialog = ref<TextDialogState>({ open: false, title: '', value: '', confirmLabel: 'OK', onConfirm: () => {} });

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}
const confirmDialog = ref<ConfirmDialogState>({ open: false, title: '', message: '', onConfirm: () => {} });

function confirmTextDialog() {
  const value = textDialog.value.value.trim();
  if (!value) return;
  textDialog.value.onConfirm(value);
  textDialog.value.open = false;
}
function confirmDelete() {
  confirmDialog.value.onConfirm();
  confirmDialog.value.open = false;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

// --- Folder actions ---
function openNewSubfolder() {
  const folderId = props.node.folder?.id ?? null;
  textDialog.value = {
    open: true,
    title: 'New subfolder',
    value: '',
    confirmLabel: 'Create',
    onConfirm: (name) => {
      store.createFolder(name, folderId);
      emit('changed');
    },
  };
}
function openRenameFolder() {
  const folder = props.node.folder;
  if (!folder) return;
  textDialog.value = {
    open: true,
    title: 'Rename folder',
    value: folder.name,
    confirmLabel: 'Rename',
    onConfirm: (name) => {
      store.renameFolder(folder.id, name);
      emit('changed');
    },
  };
}
function openDeleteFolder() {
  const folder = props.node.folder;
  if (!folder) return;
  confirmDialog.value = {
    open: true,
    title: 'Delete folder',
    message: `Delete "${folder.name}"? Its programs and subfolders will move up to the parent folder.`,
    onConfirm: () => {
      store.deleteFolder(folder.id);
      emit('changed');
      emit('toast', 'Folder deleted.');
    },
  };
}
function exportThisFolder() {
  const folder = props.node.folder;
  if (!folder) return;
  bundle.exportFolder(folder.id);
  emit('toast', 'Exported folder.');
}
function onDragStartFolder(ev: DragEvent) {
  const folder = props.node.folder;
  if (!folder || !ev.dataTransfer) return;
  ev.dataTransfer.setData('application/x-seqop-folder', folder.id);
  ev.dataTransfer.effectAllowed = 'move';
}
function onDropOnFolder(ev: DragEvent) {
  const folder = props.node.folder;
  if (!folder || !ev.dataTransfer) return;
  const programId = ev.dataTransfer.getData('application/x-seqop-program');
  const folderId = ev.dataTransfer.getData('application/x-seqop-folder');
  if (programId) {
    store.moveProgram(programId, folder.id);
    emit('changed');
  } else if (folderId && folderId !== folder.id) {
    store.moveFolder(folderId, folder.id);
    emit('changed');
  }
}

// --- Program actions ---
function duplicateProgram(p: ProgramMeta) {
  store.duplicateProgram(p.id);
  emit('changed');
  emit('toast', 'Duplicated.');
}
function openRenameProgram(p: ProgramMeta) {
  textDialog.value = {
    open: true,
    title: 'Rename program',
    value: p.name,
    confirmLabel: 'Rename',
    onConfirm: (name) => {
      store.renameProgram(p.id, name);
      emit('changed');
    },
  };
}
function openDeleteProgram(p: ProgramMeta) {
  confirmDialog.value = {
    open: true,
    title: 'Delete program',
    message: `Delete "${p.name}"? This cannot be undone.`,
    onConfirm: () => {
      store.deleteProgram(p.id);
      emit('changed');
      emit('toast', 'Deleted.');
    },
  };
}
function exportThisProgram(p: ProgramMeta) {
  bundle.exportPrograms([p.id], `${p.name || 'program'}.zip`);
  emit('toast', 'Exported.');
}
function onDragStartProgram(ev: DragEvent, id: string) {
  if (!ev.dataTransfer) return;
  ev.dataTransfer.setData('application/x-seqop-program', id);
  ev.dataTransfer.effectAllowed = 'move';
}
</script>

<style scoped>
.pbn-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 6px;
  font-size: 0.76rem;
  cursor: pointer;
  color: #dfe3e8;
  user-select: none;
}
.pbn-row:hover {
  background: #1b1e24;
}
.pbn-folder {
  font-weight: 500;
}
.pbn-folder-icon {
  color: #d8b26b;
}
.pbn-program-icon {
  color: #7cc4ff;
  flex: 0 0 auto;
}
.pbn-active {
  background: #163049;
  border-left: 2px solid #7cc4ff;
}
.pbn-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pbn-program-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1 1 auto;
}
.pbn-subtitle {
  font-size: 0.64rem;
  color: #7a8290;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.pbn-spacer {
  flex: 1 1 auto;
}
.pbn-empty {
  padding: 4px 10px;
  font-size: 0.7rem;
  color: #7a8290;
}
</style>
