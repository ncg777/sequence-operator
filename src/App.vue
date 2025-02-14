<template>
  <v-app>
    <v-main>
      <v-container fluid class="pa-4">
        <h1 class="banner">
          Sequence-Operator
        </h1>
        
        <v-row >
            <v-col cols="12" md="12" :style="'position:absolute;text-align:right;'">
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
              placeholder="1 2 3..."
              @keypress="validateKeypress"
            ></v-text-field>
          </v-col>
          <v-col cols="12" md="6">
            <v-text-field
              v-model="textY"
              :label="`y (${ySize})`"
              outlined
              dense
              placeholder="1 2 3..."
              @keypress="validateKeypress"
            ></v-text-field>
          </v-col>
        </v-row>
        
        <v-row>
          <v-col cols="12" md="6">
            <v-select
              v-model="scale"
              :items="scaleOptions"
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
          <v-col cols="4" md="4">
            <v-btn color="secondary" @click="copyResultToClipboard" block>
              <v-icon left>mdi-clipboard</v-icon>
              Copy
            </v-btn>
          </v-col>
          <v-col cols="4" md="4">
            <v-btn color="secondary" @click="setXFromResult" block>Set X</v-btn>
          </v-col>
          <v-col cols="4" md="4">
            <v-btn color="secondary" @click="setYFromResult" block>Set Y</v-btn>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed  } from 'vue';
import { Sequence } from './Sequence';
import { Numbers } from './Numbers';

// Define Operation Enum
enum Operation {
  Add = 'Add',
  Subtract = 'Subtract',
  Multiply = 'Multiply',
  Divide = 'Divide',
  X = 'X',
  Y = 'Y',
  Power = 'Power',
  Log = 'Log',
  Min = 'Min',
  Max = 'Max',
  Modulo = 'Modulo',
  Bounce = 'Bounce',
  And = 'And',
  Nand = 'Nand',
  Or = 'Or',
  Nor = 'Nor',
  Implication = 'Implication',
  ReverseImplication = 'ReverseImplication',
  Xor = 'Xor',
  Xnor = 'Xnor',
  ShiftLeft = 'ShiftLeft',
  ShiftRight = 'ShiftRight',
  LCM = 'LCM',
  GCD = 'GCD',
  Equal = 'Equal',
  NotEqual = 'NotEqual',
  LessThan = 'LessThan',
  LessThanOrEqual = 'LessThanOrEqual',
  GreaterThan = 'GreaterThan',
  GreaterThanOrEqual = 'GreaterThanOrEqual',
  Binomial = 'Binomial',
}

// Define Combiner Enum
enum Combiner {
  Product = 'Product',
  LCM = 'LCM',
  Apply = 'Apply',
}

// Initialize reactive variables
const textX = ref<string>('');
const textY = ref<string>('');
const textResult = ref<string>('');
const scale = ref<Combiner>(Combiner.Product);
const operation = ref<Operation>(Operation.Add);

// Define options for selects
const scaleOptions = Object.values(Combiner);
const operationOptions = Object.values(Operation);

// Define operations map similar to the Java version
const ops = new Map<Operation, (x: number, y: number) => number>([
  [Operation.Add, (x, y) => x + y],
  [Operation.Subtract, (x, y) => x - y],
  [Operation.Multiply, (x, y) => x * y],
  [Operation.Divide, (x, y) => y !== 0 ? Math.floor(x / y) : 0],
  [Operation.X, (x, y) => x],
  [Operation.Y, (x, y) => y],
  [Operation.Power, (x, y) => Math.round(Math.pow(x, y))],
  [Operation.Log, (x, y) => y > 1 && x > 0 ? Math.floor(Math.log(x) / Math.log(y)) : 0],
  [Operation.Min, (x, y) => Math.min(x, y)],
  [Operation.Max, (x, y) => Math.max(x, y)],
  [Operation.Modulo, (x, y) => y !== 0 ? x % y : 0],
  [Operation.Bounce, (x, y) => {
    if (y === 0) return 0;
    const mod = x % (2 * y);
    return mod <= y ? mod : 2 * y - mod;
  }],
  [Operation.And, (x, y) => x & y],
  [Operation.Nand, (x, y) => ~(x & y)],
  [Operation.Or, (x, y) => x | y],
  [Operation.Nor, (x, y) => ~(x | y)],
  [Operation.Implication, (x, y) => (~x) | y],
  [Operation.ReverseImplication, (x, y) => (~y) | x],
  [Operation.Xor, (x, y) => x ^ y],
  [Operation.Xnor, (x, y) => ~(x ^ y)],
  [Operation.ShiftLeft, (x, y) => x << y],
  [Operation.ShiftRight, (x, y) => x >> y],
  [Operation.LCM, (x, y) => Numbers.lcm(x, y)],
  [Operation.GCD, (x, y) => Numbers.gcd(x, y)],
  [Operation.Equal, (x, y) => (x === y ? 1 : 0)],
  [Operation.NotEqual, (x, y) => (x !== y ? 1 : 0)],
  [Operation.LessThan, (x, y) => (x < y ? 1 : 0)],
  [Operation.LessThanOrEqual, (x, y) => (x <= y ? 1 : 0)],
  [Operation.GreaterThan, (x, y) => (x > y ? 1 : 0)],
  [Operation.GreaterThanOrEqual, (x, y) => (x >= y ? 1 : 0)],
  [Operation.Binomial, (x, y) => Numbers.binomial(x,y)],
]);

// Utility function to get length based on scale
const getLength = (x: Sequence, y: Sequence): number => {
  switch (scale.value) {
    case Combiner.Apply:
      return y.size();
    case Combiner.LCM:
      return Numbers.lcm(x.size(), y.size());
    case Combiner.Product:
    default:
      return x.size() * y.size();
  }
};

// Function to get the result sequence based on selected operation and scale
const getResult = (x: Sequence, y: Sequence): Sequence => {
  const n = getLength(x, y);
  const o = new Sequence();
  for (let i = 0; i < n; i++) {
    const xVal = scale.value === Combiner.Apply
      ? x.get(y.get(i)! % x.size())!
      : scale.value === Combiner.LCM
        ? x.get(i % x.size())!
        : x.get(Math.floor(i / y.size()))!;

    const yVal = y.get(i % y.size())!;

    const operationFn = ops.get(operation.value);
    if (operationFn) {
      o.add(operationFn(xVal, yVal));
    }
  }
  return o;
};

// Handler for Apply button
const applyOperation = () => {
  try {
    const xSequence = Sequence.parse(textX.value);
    const ySequence = Sequence.parse(textY.value);
    const resultSequence = getResult(xSequence, ySequence);
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