<template>
  <v-app>
    <v-main>
      <v-responsive class="align-center mx-auto pa-5" max-width="900">
        <h1 class="banner">
          Sequence Operator
        </h1>
        
        <!-- HEX Mode and Word Size Controls -->
        <v-row>
          <v-col cols="6" class="pa-1">
            <v-switch v-model="hexMode" label="HEX Mode"></v-switch>
          </v-col>
          <v-col cols="6" class="pa-1">
            <v-select
              v-model="wordSize"
              :items="[4,8,12,16,20,24,28,32]"
              label="Word Size (bits)"
              outlined
              dense
              :disabled="!hexMode"
            ></v-select>
          </v-col>
        </v-row>
        
        <v-row>
          <v-col cols="12" md="12" class="px-4" :style="'position:absolute;text-align:right; padding-right:0; margin-right:0;'">
            <v-btn @click="swapXY" icon :style="'z-index:9999'">
              <v-icon>mdi-swap-horizontal</v-icon>
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="6" class="pa-1">
            <v-text-field
              v-model="textX"
              :label="`x (${xSize})`"
              outlined
              dense
              placeholder="0 1 2..."
              @keypress="validateKeypress"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6" class="pa-1">
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
          <v-col cols="12" md="6" class="pa-1">
            <v-select
              v-model="combiner"
              :items="combinerOptions"
              label="Combiner"
              outlined
              dense
            ></v-select>
          </v-col>
          <v-col cols="12" md="6" class="pa-1">
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
          <v-col cols="12" class="pa-1">
            <v-btn color="primary" @click="applyOperation" block>
              Apply
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="12" class="px-4" :style="'position:absolute;text-align:right;padding-right:0;'">
            <v-btn icon @click="copyResultToClipboard" style="z-index: 9999;">
              <v-icon left>mdi-clipboard</v-icon>
            </v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="12" class="pa-1">
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
          <v-col cols="6" md="6" class="pa-1">
            <v-btn color="secondary" @click="setXFromResult" block>Set X</v-btn>
          </v-col>
          <v-col cols="6" md="6" class="pa-1">
            <v-btn color="secondary" @click="setYFromResult" block>Set Y</v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="6" md="6" class="pa-1">
            <v-btn color="secondary" @click="pasteToX" block>Paste to X</v-btn>
          </v-col>
          <v-col cols="6" md="6" class="pa-1">
            <v-btn color="secondary" @click="pasteToY" block>Paste to Y</v-btn>
          </v-col>
        </v-row>
      </v-responsive>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { Combiner, Operation, Sequence } from 'ultra-mega-enumerator';

// Initialize reactive variables
const textX = ref<string>('');
const textY = ref<string>('');
const textResult = ref<string>('');
const combiner = ref<Combiner>(Combiner.Product);
const operation = ref<Operation>(Operation.Add);
const hexMode = ref<boolean>(false);
const wordSize = ref<number>(8);

// Define options for selects
const combinerOptions = Object.values(Combiner);
const operationOptions = Object.values(Operation);

// Helper functions for HEX mode
function parseHexToSigned(hex: string, wordSize: number): number {
  const maxUnsigned = BigInt(1) << BigInt(wordSize);
  const half = BigInt(1) << (BigInt(wordSize) - 1n);
  let num = BigInt(`0x${hex}`);
  num &= (maxUnsigned - 1n); // Take least significant bits
  if (num >= half) {
    num -= maxUnsigned; // Convert to signed
  }
  return Number(num);
}

function parseHexSequence(text: string, wordSize: number): number[] {
  const hexStrings = text.split(/\s+/).filter(s => s !== '');
  return hexStrings.map(hex => parseHexToSigned(hex, wordSize));
}

function formatNumberAsHex(num: number, wordSize: number): string {
  const digits = wordSize / 4;
  const maxUnsigned = BigInt(1) << BigInt(wordSize);
  // Wrap around using modulo and ensure positive range
  let unsignedNum = (BigInt(num) % maxUnsigned + maxUnsigned) % maxUnsigned;
  let hex = unsignedNum.toString(16).toUpperCase();
  return hex.padStart(digits, '0');
}

// Handler for Apply button
const applyOperation = () => {
  try {
    let sequenceX, sequenceY;
    if (hexMode.value) {
      const numbersX = parseHexSequence(textX.value, wordSize.value);
      sequenceX = Sequence.parse(numbersX.map(String).join(' '));
      const numbersY = parseHexSequence(textY.value, wordSize.value);
      sequenceY = Sequence.parse(numbersY.map(String).join(' '));
    } else {
      sequenceX = Sequence.parse(textX.value);
      sequenceY = Sequence.parse(textY.value);
    }
    const resultSequence = Sequence.combine(combiner.value, operation.value, sequenceX, sequenceY);
    if (hexMode.value) {
      const decimalStr = resultSequence.toString();
      const numbers = decimalStr.split(/\s+/).map(Number);
      textResult.value = numbers.map(num => formatNumberAsHex(num, wordSize.value)).join(' ');
    } else {
      textResult.value = resultSequence.toString();
    }
  } catch (error) {
    textResult.value = `Error: ${(error as Error).message}`;
  }
};

const copyResultToClipboard = () => {
  navigator.clipboard.writeText(textResult.value);
};

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
  if (hexMode.value) {
    if (!/[0-9a-fA-F\s]/.test(event.key)) {
      event.preventDefault();
    }
  } else {
    if (!/[0-9\s-]/.test(event.key)) {
      event.preventDefault();
    }
  }
};

const swapXY = () => {
  [textX.value, textY.value] = [textY.value, textX.value];
};

// Computed properties to get the sizes of sequences
const xSize = computed(() => {
  const parts = textX.value.split(/\s+/).filter(s => s !== '');
  return parts.length;
});

const ySize = computed(() => {
  const parts = textY.value.split(/\s+/).filter(s => s !== '');
  return parts.length;
});

const resultSize = computed(() => {
  const parts = textResult.value.split(/\s+/).filter(s => s !== '');
  return parts.length;
});
</script>

<style scoped>
body, * {
  color: #00aa00;
  background-color: #000000;
  padding:0;
}
.banner {
  text-align: center;
  padding-bottom: 0.5em;
  padding-top:0;
}
</style>