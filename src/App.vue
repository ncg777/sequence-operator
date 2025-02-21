<template>
  <v-app>
    <v-main>
      <v-responsive class="align-center mx-auto pa-4" max-width="900">
        <h1 class="banner">
          Sequence Operator
        </h1>
        
        <v-row >
            <v-col cols="12" md="12" :style="'position:absolute;text-align:right; padding-right:0; margin-right:0;'">
              <v-btn @click="swapXY" icon :style="'z-index:9999'">
                <v-icon>mdi-swap-horizontal</v-icon>
              </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="textX"
              :label="`x (${xSize})`"
              outlined
              dense
              placeholder="0 1 2..."
              @keypress="validateKeypress"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="textY"
              :label="`y (${ySize})`"
              outlined
              dense
              placeholder="0 1 2..."
              @keypress="validateKeypress"
            ></v-text-field>
          </v-col>
        </v-row>
        
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="combiner"
              :items="combinerOptions"
              label="Combiner"
              outlined
              dense
            ></v-select>
          </v-col>
          <v-col cols="12" md="6">
            <v-select
              v-model="operation"
              :items="operationOptions"
              label="Operation"
              outlined
              dense
            ></v-select>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12">
            <v-btn color="primary" @click="applyOperation" block>
              Apply
            </v-btn>
          </v-col>
        </v-row>
        <v-row >
            <v-col cols="12" md="12" :style="'position:absolute;text-align:right;padding-right:0;'">
              <v-btn icon @click="copyResultToClipboard" style="z-index: 9999;">
              <v-icon left>mdi-clipboard</v-icon>
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          
          <v-col cols="12" md="12">
            <v-text-field
              v-model="textResult"
              :label="`Result (${resultSize})`"
              outlined
              dense
              readonly
            ></v-text-field>
          </v-col>
        </v-row>
        
        <v-row>
          <v-col cols="6" md="6">
            <v-btn color="secondary" @click="setXFromResult" block>Set X</v-btn>
          </v-col>
          <v-col cols="6" md="6">
            <v-btn color="secondary" @click="setYFromResult" block>Set Y</v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="6" md="6">
            <v-btn color="secondary" @click="pasteToX" block>Paste to X</v-btn>
          </v-col>
          <v-col cols="6" md="6">
            <v-btn color="secondary" @click="pasteToY" block>Paste to Y</v-btn>
          </v-col>
        </v-row>
      </v-responsive>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed  } from 'vue';
import { Combiner, Operation, Sequence } from 'ultra-mega-enumerator';

// Initialize reactive variables
const textX = ref<string>('');
const textY = ref<string>('');
const textResult = ref<string>('');
const combiner = ref<Combiner>(Combiner.Product);
const operation = ref<Operation>(Operation.Add);

// Define options for selects
const combinerOptions = Object.values(Combiner);
const operationOptions = Object.values(Operation);


// Handler for Apply button
const applyOperation = () => {
  try {
    const resultSequence = Sequence.combine(combiner.value, operation.value, Sequence.parse(textX.value), Sequence.parse(textY.value));
    textResult.value = resultSequence.toString();
  } catch (error) {
    textResult.value = `Error: ${(error as Error).message}`;
  }
};
const copyResultToClipboard = () => {
  navigator.clipboard.writeText(textResult.value);
}
// Handlers for Set X and Set Y buttons
const setXFromResult = () => {
  textX.value = textResult.value;
};

const setYFromResult = () => {
  textY.value = textResult.value;
};

const pasteToX = () => {
  textX.value = textX.value.split(' ').concat(textResult.value.split(' ')).join(' ');
};

const pasteToY = () => {
  textY.value = textY.value.split(' ').concat(textResult.value.split(' ')).join(' ');
};
const validateKeypress = (event: { key: string; preventDefault: () => void; }) => {
  if (!/[0-9\s-]/.test(event.key)) {
    event.preventDefault();
  }
};
const swapXY = () => {
      [textX.value, textY.value] = [textY.value, textX.value];
    }
// Computed properties to get the sizes of sequences
const xSize = computed(() => {
  try {
    const sequence = Sequence.parse(textX.value);
    return sequence.size();
  } catch {
    return 0;
  }
});

const ySize = computed(() => {
  try {
    const sequence = Sequence.parse(textY.value);
    return sequence.size();
  } catch {
    return 0;
  }
});

const resultSize = computed(() => {
  try {
    const sequence = Sequence.parse(textResult.value);
    return sequence.size();
  } catch {
    return 0;
  }
});
</script>

<style scoped>
body, * {
  color: #00aa00;
  background-color: #000000;
}
.banner {
  text-align: center;
  padding:0.5em;
}

</style>