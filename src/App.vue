<template>
  <v-app>
    <v-main>
      <v-responsive class="align-center mx-auto pa-5" max-width="900">
        <h1 class="banner">
          Sequence Operator
        </h1>
        
        <v-row>
          <v-col cols="6" class="pa-1">
            <v-select
            v-model="selectedNumberSystem"
            :items="[8,10,16]"
            label="Base"
          ></v-select>
          </v-col>
          <v-col cols="6" class="pa-1">
            <v-select
              v-if="selectedNumberSystem!=10"
              v-model="wordSize"
              :items="getWordSizes(selectedNumberSystem)"
              label="Word Size (bits)"
              outlined
              dense
              :disabled="!selectedNumberSystem"
            ></v-select>
          </v-col>
        </v-row>
        
        <v-row>
          <v-col cols="12" md="12" class="px-4" :style="'position:absolute;text-align:right; padding-right:0; margin-right:0;'">
            <v-btn @click="swapXY" icon :style="'z-index:999'" :size="isMobile ? 'small' : 'medium'" class="pa-1">
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
          <v-col cols="12" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="applyOperation" block>
              <v-icon left>mdi-calculator</v-icon>
            </v-btn>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="3" md="3" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="assignToX" block>x:=</v-btn>
          </v-col>
          <v-col cols="3" md="3" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="pasteToX" block>x+=</v-btn>
          </v-col>
          <v-col cols="3" md="3" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="assignToY" block>y:=</v-btn>
          </v-col>
          <v-col cols="3" md="3" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="pasteToY" block>y+=</v-btn>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12" md="12" class="px-4" :style="'position:absolute;text-align:right;padding-right:0;'">
            <v-btn icon @click="copyResultToClipboard" style="z-index: 999;" :size="isMobile ? 'small' : 'medium'" class="pa-1">
              <v-icon left>mdi-clipboard</v-icon>
            </v-btn>
            <!--
            <v-btn icon @click="showMemoryDialog = true" left style="z-index: 999;" :size="isMobile ? 'small' : 'medium'" class="pa-1"><v-icon left>mdi-memory</v-icon></v-btn>
            <v-btn icon @click="memorizeResult" left style="z-index: 999;" :size="isMobile ? 'small' : 'medium'" class="pa-1"><v-icon left>mdi-content-save</v-icon></v-btn>
            -->
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
          <v-col cols="6" md="6" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="reverseSeq()" block><v-icon left>mdi-rewind</v-icon></v-btn>
          </v-col>
          <v-col cols="6" md="6" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="rotateSeq()" block><v-icon left>mdi-refresh</v-icon></v-btn>
          </v-col>
        </v-row>

        <!-- Memory Dialog -->
        <v-dialog v-model="showMemoryDialog" max-width="800" class="pa-1" scrollable>
          <v-card>
            <v-card-title><span><v-icon left>mdi-memory</v-icon>Memory</span>
              <v-btn @click="showMemoryDialog = false" icon :style="'float:right;text-align:right;'"><v-icon>mdi-window-close</v-icon></v-btn>
            </v-card-title>
            <v-card-text>              
              <v-list class="pa-0">
                <v-list-item
                  v-for="(seq, index) in memoryList"
                  :key="index"
                  :class="{'pa-0': true}"
                >

                  <v-row>
                    <v-col cols="12" md="12" class="px-0" :style="'position:absolute;text-align:right; padding-right:0; margin-right:0;'">
                      <v-btn
                          icon
                          :size="isMobile ? 'small' : 'medium'"
                          :style="'z-index:999'"
                          @click="recall(index)"
                          class="pa-1"
                        >
                          <v-icon>mdi-arrow-down</v-icon>
                        </v-btn>
                        
                        <v-btn
                          icon
                          :size="isMobile ? 'small' : 'medium'"
                          :style="'z-index:999'"
                          class="pa-1"
                          @click="deleteSequence(index)"
                        >
                          <v-icon>mdi-delete</v-icon>
                        </v-btn>
                    </v-col>
                  </v-row>
                  <v-row>
                    <v-col cols="12" md="12" class="pa-1">
                      <v-text-field
                          v-model="memoryList[index]"
                          outlined
                          dense
                          :label="`M[${index}] (${memSize(index)})`"
                          :placeholder="selectedNumberSystem ? '0A 1B 2C...' : '0 1 2...'"
                        ></v-text-field>
                    </v-col>
                  </v-row>
                </v-list-item>
              </v-list>
          </v-card-text>
          <v-card-actions>
            <v-btn @click="promptSequence" icon><v-icon>mdi-plus</v-icon></v-btn>
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
import { useDisplay } from 'vuetify';
// Initialize reactive variables
const textX = ref<string>('');
const textY = ref<string>('');
const textResult = ref<string>('');
const combiner = ref<Combiner>(Combiner.Product);
const operation = ref<Operation>(Operation.Add);
const selectedNumberSystem = ref<number>(10);
const wordSize = ref<number>(16);

// Initialize reactive variables
const showMemoryDialog = ref(false);
const memoryList = ref<string[]>([]);

// Define options for selects
const combinerOptions = Object.values(Combiner);
const operationOptions = Object.values(Operation);
const firstLoad = ref(true);
const { mobile } = useDisplay();
const isMobile = computed(() => mobile.value);
const updateSequences = (newSys:number, oldSys:number, wordSize:number) => {
  const convert = (text: string, newSys:number, oldSys:number, wordSize:number) => {
    if (!text.trim()) return text;
    const numbers = text.split(/\s+/).map(num => 
      (newSys==16 ? formatNumber(parseInt(num, oldSys),newSys, wordSize) : 
        (newSys==8 ? formatNumber(parseInt(num, oldSys),newSys, wordSize) : parseInt(num, oldSys).toString())));
    return numbers.join(' ');
  };

  textX.value = convert(textX.value, newSys,oldSys,wordSize);
  textY.value = convert(textY.value, newSys,oldSys,wordSize);
  textResult.value = convert(textResult.value, newSys,oldSys,wordSize);
  for(let i=0;i<memoryList.value.length;i++) memoryList.value[i]=convert(memoryList.value[i], newSys,oldSys,wordSize)
}
watch(selectedNumberSystem, (newSys, oldSys) => {
  if (firstLoad.value) {
    firstLoad.value = false;
    return;
  }
  updateSequences(newSys,oldSys,wordSize.value);
  localStorage.setItem('SEQOP_sys', JSON.stringify(newSys));
  
  wordSize.value = (newSys == 8 ? 12 : (newSys == 16 ? 16 : -1));
});

watch(wordSize, (newWordSize) => {
  localStorage.setItem('SEQOP_wordsize', JSON.stringify(newWordSize));
  updateSequences(selectedNumberSystem.value, selectedNumberSystem.value, newWordSize);
});

const getWordSizes = (sys:number) => ((sys == 16 ? [4,8,12,16,20,24,28] : (sys == 8 ? [3,6,9,12,15,18,21,24,27,30] : [])));
function parseSequence(text: string, sys:number,wordSize: number): number[] {
  const strings = text.split(/\s+/).filter(s => s !== '');
  return strings.map(str => parseInt(str, sys));
}

function formatNumber(num: number, sys:number, wordSize: number): string {
  if(sys==10) return num.toString();
  const digits = wordSize / (sys == 16 ? 4 : 3);
  const maxUnsigned = 1 << wordSize;
  // Wrap around using modulo and ensure positive range
  let unsignedNum = num % maxUnsigned;
  let str = unsignedNum.toString(sys).toUpperCase();
  return str.padStart(digits, '0');
}


const getAsNumbers = (str:string) => {
  if (selectedNumberSystem.value) {
    return parseSequence(str, selectedNumberSystem.value, wordSize.value);
  } else {
    return str.split(/\s+/).map(Number).filter(num => !isNaN(num));
  }
};

const formatSequence = (numbers: number[]) => {
  if (selectedNumberSystem.value) {
    return numbers.map(num => formatNumber(num, selectedNumberSystem.value, wordSize.value)).join(' ');
  } else {
    return numbers.map(String).join(' ');
  }
};

const rotateSeq = () => {
  const steps = window.prompt(`Enter the number of steps to rotate:`)?.trim();
  const stepsNumber = parseInt(steps || '0', 10); // Get rotation steps from user
  if (!isNaN(stepsNumber)) {
    const currentSequence = Sequence.parse(textResult.value);
    const rotatedSequence = currentSequence.rotate(stepsNumber);
    textResult.value = rotatedSequence.toString();
  } else {
    alert("Invalid input for rotation steps. Please enter a valid number.");
  }
};

const reverseSeq = () => {
  const currentSequence = Sequence.parse(textResult.value);
  const reversedSequence = new Sequence(...currentSequence.toArray().reverse());
  textResult.value = reversedSequence.toString();
};

// Handler for Apply button
const applyOperation = () => {
  try {
    let sequenceX, sequenceY;
    if (selectedNumberSystem.value) {
      const numbersX = parseSequence(textX.value,selectedNumberSystem.value, wordSize.value);
      sequenceX = Sequence.parse(numbersX.map(String).join(' '));
      const numbersY = parseSequence(textY.value,selectedNumberSystem.value, wordSize.value);
      sequenceY = Sequence.parse(numbersY.map(String).join(' '));
    } else {
      sequenceX = Sequence.parse(textX.value);
      sequenceY = Sequence.parse(textY.value);
    }
    const resultSequence = Sequence.combine(combiner.value, operation.value, sequenceX, sequenceY);
    if (selectedNumberSystem.value) {
      const decimalStr = resultSequence.toString();
      const numbers = decimalStr.split(/\s+/).map(Number);
      textResult.value = numbers.map(num => formatNumber(num, selectedNumberSystem.value, wordSize.value)).join(' ');
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
const memorizeResult = () => {
  addSequence(textResult.value);
};
// Handlers for Set X and Set Y buttons
const assignToX = () => {
  textX.value = textResult.value;
};

const assignToY = () => {
  textY.value = textResult.value;
};

const pasteToX = () => {
  textX.value = formatSequence(getAsNumbers(textX.value).concat(getAsNumbers(textResult.value)));
};

const pasteToY = () => {
  textY.value = formatSequence(getAsNumbers(textY.value).concat(getAsNumbers(textResult.value)));
};
const validateKeypress = (event: { key: string; preventDefault: () => void; }) => {
  if (!selectedNumberSystem.value && !/[0-9\s-]/.test(event.key)) {
    event.preventDefault();
  }
  if (selectedNumberSystem.value && !/[A-Fa-f0-9\s-]/.test(event.key)) {
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
const memSize = (i:number) => {
  return getAsNumbers(memoryList.value[i]).length;
};
const ySize = computed(() => {
  const parts = textY.value.split(/\s+/).filter(s => s !== '');
  return parts.length;
});

const resultSize = computed(() => {
  const parts = textResult.value.split(/\s+/).filter(s => s !== '');
  return parts.length;
});

// Load memory from local storage
const loadFromStorage = () => {
  try {
    const storedMEM = localStorage.getItem('SEQOP_memoryList');
    if (storedMEM) {
      memoryList.value = JSON.parse(storedMEM);
    }
  } catch (error) {
    memoryList.value = [];
  }

  // Load wordSize first
  let storedWS = null;
  try {
    const storedWSRaw = localStorage.getItem('SEQOP_wordsize');
    if (storedWSRaw) {
      storedWS = JSON.parse(storedWSRaw);
      wordSize.value = storedWS;
    }
  } catch (error) {
    storedWS = null;
  }

  // Now load selectedNumberSystem
  try {
    const storedSysRaw = localStorage.getItem('SEQOP_sys');
    if (storedSysRaw) {
      selectedNumberSystem.value = JSON.parse(storedSysRaw);
    } else {
      selectedNumberSystem.value = 10;
    }
  } catch (error) {
    selectedNumberSystem.value = 10;
  }

  // If wordSize wasn't loaded, set default based on selectedNumberSystem
  if (storedWS === null) {
    switch(selectedNumberSystem.value) {
      case 16:
        wordSize.value = 16;
        break;
      case 8:
        wordSize.value = 12;
        break;
      case 10:
        wordSize.value = -1;
        break;
    }
  }
};
loadFromStorage();

// Watch memoryList and save to local storage
watch(memoryList, (newList) => {
  localStorage.setItem('SEQOP_memoryList', JSON.stringify(newList));
}, { deep: true });

// Memory operations
const recall = (index: number) => {
  textResult.value = memoryList.value[index];
  showMemoryDialog.value = false;
};


const deleteSequence = (index: number) => {
  memoryList.value.splice(index, 1);
};

const promptSequence = () => {
  const newSeq = prompt('Enter new sequence:');
  if (newSeq) {
    memoryList.value.push(formatSequence(getAsNumbers(newSeq)));
  }
};
const addSequence = (seq:string) => {
  if (seq) {
    memoryList.value.push(formatSequence(getAsNumbers(seq)));
  }
};
onMounted(() => {
  firstLoad.value=false;
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
@media (max-width: 600px) {
  .v-btn {
    margin: 2px !important; /* Tighten margins */
    padding: 0 6px !important; /* Reduce padding */
  }
}
</style>