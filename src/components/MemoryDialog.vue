<template>
  <v-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" max-width="640"
    class="pa-1 memory-dialog" scrollable>
    <v-card class="memory-card">
      <v-card-title>
        <span><v-icon left>mdi-memory</v-icon>Memory</span>
        <v-btn @click="close" icon :style="'float:right;text-align:right;'"><v-icon>mdi-window-close</v-icon></v-btn>
      </v-card-title>
      <v-card-text>
        <v-list class="pa-0 memory-list">
          <v-list-item v-for="(seq, index) in memoryList" :key="index"
            :class="{ 'pa-0': true, 'memory-list-item': true }">
            <v-row no-gutters>
              <v-col cols="12" md="12" class="px-4 memory-actions-col"
                :style="'position:absolute;text-align:right;padding-right:0;margin-top:1em;'">
                <v-btn icon size="x-small" density="compact" variant="text" @click="copyMemorySequence(index)"
                  title="Copy sequence">
                  <v-icon size="x-small">mdi-clipboard-outline</v-icon>
                </v-btn>
                <v-btn icon size="x-small" density="compact" variant="text" @click="setComposeSource(index)"
                  :title="composeSourceIndex === index ? 'Selected as source' : 'Use as source for compose'">
                  <v-icon size="x-small">{{ composeSourceIndex === index ? 'mdi-check-circle' : 'mdi-target' }}</v-icon>
                </v-btn>
                <v-btn icon size="x-small" density="compact" variant="text" :disabled="composeSourceIndex === null"
                  @click="prependToMemory(index)" title="Prepend selected source to this sequence">
                  <v-icon size="x-small">mdi-arrow-collapse-left</v-icon>
                </v-btn>
                <v-btn icon size="x-small" density="compact" variant="text" :disabled="composeSourceIndex === null"
                  @click="appendToMemory(index)" title="Append selected source to this sequence">
                  <v-icon size="x-small">mdi-arrow-collapse-right</v-icon>
                </v-btn>
                <v-btn icon size="x-small" density="compact" variant="text" @click="recall(index)"
                  title="Recall sequence">
                  <v-icon size="x-small">mdi-arrow-down</v-icon>
                </v-btn>
                <v-btn icon size="x-small" density="compact" variant="text" @click="deleteSequence(index)"
                  title="Delete sequence">
                  <v-icon size="x-small">mdi-delete</v-icon>
                </v-btn>
              </v-col>
            </v-row>
            <v-row no-gutters>
              <v-col cols="12" md="12" class="pa-1">
                <v-text-field v-model="memoryList[index]" outlined density="compact" hide-details
                  class="memory-entry-field" :label="`M[${index}] (${memSize(index)})`" :placeholder="'0 1 2...'" />
              </v-col>
            </v-row>
          </v-list-item>
        </v-list>
      </v-card-text>
      <v-card-actions>
        <span class="memory-compose-label" v-if="composeSourceIndex !== null">source: M[{{ composeSourceIndex }}]</span>
        <v-btn @click="promptSequence" icon><v-icon>mdi-plus</v-icon></v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <!-- Add Sequence Dialog -->
  <v-dialog v-model="showAddSequenceDialog" max-width="480" class="pa-1">
    <v-card>
      <v-card-title>
        <span><v-icon left>mdi-plus</v-icon>Add Sequence</span>
        <v-btn @click="showAddSequenceDialog = false" icon :style="'float:right;text-align:right;'"><v-icon>mdi-window-close</v-icon></v-btn>
      </v-card-title>
      <v-card-text>
        <v-text-field v-model="newSequenceInput" outlined dense autofocus label="New sequence" placeholder="0 1 2..."
          @keydown.enter="confirmAddSequence" />
      </v-card-text>
      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn @click="showAddSequenceDialog = false">Cancel</v-btn>
        <v-btn color="primary" @click="confirmAddSequence">Add</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useSharedState } from '@/composables/useSharedState';

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'recall', sequence: string): void;
}>();

const { memoryList, getAsNumbers, formatSequence } = useSharedState();

const composeSourceIndex = ref<number | null>(null);
const showAddSequenceDialog = ref(false);
const newSequenceInput = ref('');

const close = () => emit('update:modelValue', false);

const copyMemorySequence = (index: number) => {
  const seq = memoryList.value[index];
  if (!seq) return;
  navigator.clipboard.writeText(seq);
};

const setComposeSource = (index: number) => {
  composeSourceIndex.value = index;
};

const prependToMemory = (targetIndex: number) => {
  if (composeSourceIndex.value === null) return;
  const source = getAsNumbers(memoryList.value[composeSourceIndex.value] ?? '');
  const target = getAsNumbers(memoryList.value[targetIndex] ?? '');
  memoryList.value[targetIndex] = formatSequence(source.concat(target));
};

const appendToMemory = (targetIndex: number) => {
  if (composeSourceIndex.value === null) return;
  const source = getAsNumbers(memoryList.value[composeSourceIndex.value] ?? '');
  const target = getAsNumbers(memoryList.value[targetIndex] ?? '');
  memoryList.value[targetIndex] = formatSequence(target.concat(source));
};

const recall = (index: number) => {
  const seq = formatSequence(getAsNumbers(memoryList.value[index] ?? ''));
  emit('recall', seq);
  close();
};

const deleteSequence = (index: number) => {
  if (composeSourceIndex.value === index) {
    composeSourceIndex.value = null;
  } else if (composeSourceIndex.value !== null && composeSourceIndex.value > index) {
    composeSourceIndex.value -= 1;
  }
  memoryList.value.splice(index, 1);
};

const memSize = (i: number) => getAsNumbers(memoryList.value[i]).length;

const promptSequence = () => {
  newSequenceInput.value = '';
  showAddSequenceDialog.value = true;
};

const confirmAddSequence = () => {
  const newSeq = newSequenceInput.value;
  if (newSeq) {
    memoryList.value.push(getAsNumbers(newSeq).join(' '));
  }
  showAddSequenceDialog.value = false;
};
</script>

<style scoped>
.memory-dialog {
  font-size: 0.76rem;
}

.memory-card .v-card-title {
  min-height: 34px;
  padding: 6px 10px !important;
}

.memory-card .v-card-text {
  padding: 8px !important;
}

.memory-card .v-card-actions {
  min-height: 28px;
  padding: 4px 8px 8px !important;
}

.memory-list-item {
  min-height: 0 !important;
  border-bottom: 1px solid #222;
  padding-top: 4px !important;
  padding-bottom: 4px !important;
  position: relative;
}

.memory-actions-col {
  text-align: right;
  padding-bottom: 0 !important;
  position: absolute;
  top: 3px;
  right: 6px;
  width: auto;
  max-width: none;
  z-index: 999;
  display: flex;
  justify-content: flex-end;
  gap: 0;
  background: transparent;
  pointer-events: none;
}

.memory-actions-col .v-btn {
  pointer-events: auto;
  opacity: 0.85;
}

.memory-actions-col .v-btn:hover {
  opacity: 1;
}

.memory-entry-field :deep(input) {
  font-size: 0.74rem !important;
  line-height: 1.1 !important;
}

.memory-entry-field :deep(.v-field__input) {
  min-height: 40px !important;
  padding-top: 16px !important;
  padding-bottom: 4px !important;
}

.memory-entry-field :deep(.v-field__label) {
  top: 8px !important;
}

.memory-entry-field :deep(.v-field-label--floating) {
  top: 2px !important;
  font-size: 0.62rem !important;
}

.memory-compose-label {
  font-size: 0.66rem;
  opacity: 0.85;
  margin-right: auto;
}
</style>
