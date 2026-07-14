<template>
  <v-app>
    <v-main>
      <v-tabs v-model="activeTab" grow aria-label="Application view">
        <v-tab value="classic" prepend-icon="mdi-calculator">Classic</v-tab>
        <v-tab value="patch" prepend-icon="mdi-vector-polyline">Patch</v-tab>
      </v-tabs>
      <ClassicView v-if="activeTab === 'classic'" />
      <PatchEditorView v-else :active="activeTab === 'patch'" />
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClassicView from '@/views/ClassicView.vue';
import PatchEditorView from '@/views/PatchEditorView.vue';

const activeTab = ref<'classic' | 'patch'>('classic');
</script>
