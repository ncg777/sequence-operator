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
            <v-btn @click="swapXY" icon :style="'z-index:999'" :size="isMobile ? 'x-small' : 'small'">
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
          <v-col cols="3" md="3" class="pa-1">
            <v-btn color="secondary" @click="assignToXNow" block>X:=</v-btn>
          </v-col>
          <v-col cols="3" md="3" class="pa-1">
            <v-btn color="secondary" @click="pasteToXNow" block>X+=</v-btn>
          </v-col>
          <v-col cols="3" md="3" class="pa-1">
            <v-btn color="secondary" @click="assignToYNow" block>Y:=</v-btn>
          </v-col>
          <v-col cols="3" md="3" class="pa-1">
            <v-btn color="secondary" @click="pasteToYNow" block>Y+=</v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="12" class="px-4" :style="'position:absolute;text-align:right;padding-right:0;'">
            <v-btn icon @click="copyResultToClipboard" style="z-index: 999;" :size="isMobile ? 'x-small' : 'small'">
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
        <!-- Memory Button -->
        <v-row>
          <v-col cols="12" class="pa-1">
            <v-btn @click="showMemoryDialog = true" block>Memory</v-btn>
          </v-col>
        </v-row>

        <!-- Memory Dialog -->
        <v-dialog v-model="showMemoryDialog" max-width="800" scrollable>
          <v-card>
            <v-card-title>Memory</v-card-title>
            <v-card-text>
            <v-list class="pa-0">
              <v-list-item
                v-for="(seq, index) in memoryList"
                :key="index"
                :class="{'pa-0': true}"
              >
                <v-row
                  :class="{'flex-column': isMobile, 'align-center': true, 'pa-0': true}"
                  :no-gutters="isMobile"
                >
                  <!-- Sequence Textbox -->
                  <v-col :cols="isMobile ? 12 : 8">
                    <v-text-field
                      v-model="memoryList[index]"
                      outlined
                      dense
                      :placeholder="hexMode ? '0A 1B 2C...' : '0 1 2...'"
                    ></v-text-field>
                  </v-col>
                  <!-- Buttons -->
                  <v-col
                    :cols="isMobile ? 12 : 4"
                    class="d-flex flex-wrap justify-end"
                  >
                    <v-btn
                      :size="isMobile ? 'x-small' : 'small'"
                      @click="assignToX(index)"
                    >
                      X:=
                    </v-btn>
                    <v-btn
                      :size="isMobile ? 'x-small' : 'small'"
                      @click="pasteToX(index)"
                    >
                      X+=
                    </v-btn>
                    <v-btn
                      :size="isMobile ? 'x-small' : 'small'"
                      @click="assignToY(index)"
                    >
                      Y:=
                    </v-btn>
                    <v-btn
                      :size="isMobile ? 'x-small' : 'small'"
                      @click="pasteToY(index)"
                    >
                      Y+=
                    </v-btn>
                    <v-btn
                      icon
                      :size="isMobile ? 'xx-small' : 'x-small'"
                      :style="'display:inline;'"
                      @click="deleteSequence(index)"
                    >
                      <v-icon>mdi-delete</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-list-item>
            </v-list>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="addSequence">+ Add Sequence</v-btn>
            <v-spacer></v-spacer>
            <v-btn @click="showMemoryDialog = false">Close</v-btn>
          </v-card-actions>
          </v-card>
        </v-dialog>
      </v-responsive>
    </v-main>
  </v-app>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Combiner, Operation, Sequence } from 'ultra-mega-enumerator';
import { useDisplay } from 'vuetify'
// Initialize reactive variables
const textX = ref<string>('');
const textY = ref<string>('');
const textResult = ref<string>('');
const combiner = ref<Combiner>(Combiner.Product);
const operation = ref<Operation>(Operation.Add);
const hexMode = ref<boolean>(false);
const wordSize = ref<number>(8);

// Initialize reactive variables
const showMemoryDialog = ref(false);
const memoryList = ref<string[]>([]);

// Define options for selects
const combinerOptions = Object.values(Combiner);
const operationOptions = Object.values(Operation);


const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);



watch(hexMode, (newHexMode) => {
  const convert = (text: string, toHex: boolean) => {
    if (!text.trim()) return text;
    const numbers = text.split(/\s+/).map(num => (toHex ? formatNumberAsHex(parseInt(num, 10), wordSize.value) : parseInt(num, 16).toString()));
    return numbers.join(' ');
  };

  textX.value = convert(textX.value, newHexMode);
  textY.value = convert(textY.value, newHexMode);
  textResult.value = convert(textResult.value, newHexMode);
});
function parseHexSequence(text: string, wordSize: number): number[] {
  const hexStrings = text.split(/\s+/).filter(s => s !== '');
  return hexStrings.map(hex => parseInt(hex, 16));
}

function formatNumberAsHex(num: number, wordSize: number): string {
  const digits = wordSize / 4;
  const maxUnsigned = 1 << wordSize;
  // Wrap around using modulo and ensure positive range
  let unsignedNum = num % maxUnsigned;
  let hex = unsignedNum.toString(16).toUpperCase();
  return hex.padStart(digits, '0');
}
const getAsNumbers = (str:string) => {
  if (hexMode.value) {
    return parseHexSequence(str, wordSize.value);
  } else {
    return str.split(/\s+/).map(Number).filter(num => !isNaN(num));
  }
};

const getResultAsNumbers = () => {
  return getAsNumbers(textResult.value);
};

const formatSequence = (numbers: number[]) => {
  if (hexMode.value) {
    return numbers.map(num => formatNumberAsHex(num, wordSize.value)).join(' ');
  } else {
    return numbers.map(String).join(' ');
  }
};

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
const assignToXNow = () => {
  textX.value = textResult.value;
};

const assignToYNow = () => {
  textY.value = textResult.value;
};

const pasteToXNow = () => {
  textX.value = textX.value.split(' ').concat(textResult.value.split(' ')).join(' ');
};

const pasteToYNow = () => {
  textY.value = textY.value.split(' ').concat(textResult.value.split(' ')).join(' ');
};
const validateKeypress = (event: { key: string; preventDefault: () => void; }) => {
  if (!hexMode.value && !/[0-9\s-]/.test(event.key)) {
    event.preventDefault();
  }
  if (hexMode.value && !/[A-Fa-f0-9\s-]/.test(event.key)) {
    event.preventDefault();
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

// Load memory from local storage
const loadMemory = () => {
  try {
    const stored = localStorage.getItem('memoryList');
    if (stored) {
      memoryList.value = JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load memory from local storage:', error);
    memoryList.value = [];
  }
};
loadMemory();

// Watch memoryList and save to local storage
watch(memoryList, (newList) => {
  localStorage.setItem('memoryList', JSON.stringify(newList));
}, { deep: true });

// Memory operations
const assignToX = (index: number) => {
  textX.value = memoryList.value[index];
};

const assignToY = (index: number) => {
  textY.value = memoryList.value[index];
};

const pasteToX = (index: number) => {
  textX.value = formatSequence(getAsNumbers(textX.value).concat(getAsNumbers(memoryList.value[index])));
};

const pasteToY = (index: number) => {
  textY.value = formatSequence(getAsNumbers(textY.value).concat(getAsNumbers(memoryList.value[index])));
};

const deleteSequence = (index: number) => {
  memoryList.value.splice(index, 1);
};

const addSequence = () => {
  const newSeq = prompt('Enter new sequence:');
  if (newSeq) {
    memoryList.value.push(newSeq);
  }
};
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
@media (max-width: 600px) {
  .v-btn {
    margin: 2px !important; /* Tighten margins */
    padding: 0 6px !important; /* Reduce padding */
  }
}
</style>