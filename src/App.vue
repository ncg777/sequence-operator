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
    <footer class="App-footer">
      <a
        href="https://paypal.me/ncg7777"
        target="_blank"
        rel="noreferrer"
      >
        ❤️ Support Sequence Operator
      </a>
    </footer>
  </v-app>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ClassicView from '@/views/ClassicView.vue';
import PatchEditorView from '@/views/PatchEditorView.vue';

const activeTab = ref<'classic' | 'patch'>('classic');
</script>

<style scoped>
.App-footer {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 10;
}

.App-footer a {
  color: rgb(var(--v-theme-primary));
  text-decoration: none;
}

.App-footer a:hover,
.App-footer a:focus-visible {
  text-decoration: underline;
}
</style>
