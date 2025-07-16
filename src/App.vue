<template>
  <v-app>
    <v-main>
      <v-responsive class="align-center mx-auto pa-5" max-width="900">
        <v-row>
          <v-col cols="12" class="pa-1">
            <h1 class="banner">
              Sequence Operator
              <v-btn 
                icon 
                @click="showHelpDialog = true" 
                class="help-button"
                :size="isMobile ? 'small' : 'medium'"
              >
                <v-icon>mdi-help-circle</v-icon>
              </v-btn>
            </h1>
          </v-col>
        </v-row>
        
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
            <v-btn icon @click="showMemoryDialog = true" left style="z-index: 999;" :size="isMobile ? 'small' : 'medium'" class="pa-1"><v-icon left>mdi-memory</v-icon></v-btn>
            <v-btn icon @click="memorizeResult" left style="z-index: 999;" :size="isMobile ? 'small' : 'medium'" class="pa-1"><v-icon left>mdi-content-save</v-icon></v-btn>
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
          <v-col cols="2" md="2" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="reverseSeq()" block><v-icon left>mdi-rewind</v-icon></v-btn>
          </v-col>
          <v-col cols="2" md="2" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="rotateSeq()" block><v-icon left>mdi-refresh</v-icon></v-btn>
          </v-col>
          <v-col cols="2" md="2" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="cyclicalDifferenceSeq()" block>Δ</v-btn>
          </v-col>
          <v-col cols="2" md="2" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="cyclicalAntidifferenceSeq()" block>∑</v-btn>
          </v-col>
          <v-col cols="2" md="2" class="pa-1 d-flex justify-center">
            <v-btn color="darkgray" @click="timesNSeq()" block>×n</v-btn>
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
                          :placeholder="'0 1 2...'"
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

        <!-- Help Dialog -->
        <v-dialog v-model="showHelpDialog" max-width="900" class="pa-1" scrollable>
          <v-card>
            <v-card-title>
              <span><v-icon left>mdi-help-circle</v-icon>Help</span>
              <v-btn @click="showHelpDialog = false" icon :style="'float:right;text-align:right;'">
                <v-icon>mdi-window-close</v-icon>
              </v-btn>
            </v-card-title>
            <v-card-text>
              <div class="help-content">
                <h3>Sequence Operator<small style="font-size:0.6em; color:#888; margin-left:1em;">v{{ appVersion }}</small></h3>
                <p>This application allows you to perform various operations on numeric sequences.</p>
                
                <h4>Changing Numeric Base</h4>
                <p>Use the <strong>Base</strong> dropdown to select between:</p>
                <ul>
                  <li><strong>Base 8 (Octal)</strong> - Uses digits 0-7</li>
                  <li><strong>Base 10 (Decimal)</strong> - Standard decimal numbers</li>
                  <li><strong>Base 16 (Hexadecimal)</strong> - Uses digits 0-9 and letters A-F</li>
                </ul>
                <p>When using bases other than 10, you can also select the <strong>Word Size</strong> to control the amount of digits for each number.</p>

                <h4>Combiners</h4>
                <p>Combiners determine how two sequences are paired:</p>
                <ul>
                  <li><strong>Product</strong> - Cartesian product of sequences (all X,Y pairs)</li>
                  <li><strong>SwappedProduct</strong> - Just like Product but with order swapped</li>
                  <li><strong>Convolution</strong> - Convolutional combination summing products at each position</li>
                  <li><strong>Triangular</strong> - Only combines when Y index ≤ X index (lower triangular)</li>
                  <li><strong>SwappedTriangular</strong> - Just like Triangular but with order swapped</li>
                  <li><strong>Recycle</strong> - Recycles shorter sequence to match LCM of lengths</li>
                  <li><strong>Divisive</strong> - Stretches each sequence by LCM(lengths)/own_length, taking every nth element</li>
                  <li><strong>Apply</strong> - Uses Y sequence values as indices into X sequence</li>
                  <li><strong>MixedRadix</strong> - Makes a cartesian product of the values of X (i.e. X=2 2 2 -> result of length 2^3), enumerates all vectors and combine them each with Y using the operation only to take the sum (try X=2 2 2 and Y=1 2 4 with op Multiply to get 0 1 2 3 4 5 6 7)</li>
                </ul>

                <h4>Operations</h4>
                <p>Operations define what to do with paired elements:</p>
                <ul>
                  <li><strong>Add</strong> - Addition (+)</li>
                  <li><strong>Subtract</strong> - Subtraction (-)</li>
                  <li><strong>Multiply</strong> - Multiplication (×)</li>
                  <li><strong>Divide</strong> - Division (÷)</li>
                  <li><strong>X</strong> - Returns the X value used by the combiner, which may not be exactly the value from the sequence in all cases</li>
                  <li><strong>Y</strong> - Returns the Y value used by the combiner, which may not be exactly the value from the sequence in all cases</li>
                  <li><strong>Power</strong> - X raised to power Y</li>
                  <li><strong>Log</strong> - Logarithm of X base Y</li>
                  <li><strong>Min</strong> - Minimum of X and Y</li>
                  <li><strong>Max</strong> - Maximum of X and Y</li>
                  <li><strong>Modulo</strong> - Remainder (%)</li>
                  <li><strong>Bounce</strong> - Bouncing modulo operation</li>
                  <li><strong>Distance</strong> - |Y-X|</li>
                  <li><strong>And</strong> - Bitwise AND (&amp;)</li>
                  <li><strong>Nand</strong> - Bitwise NAND</li>
                  <li><strong>Or</strong> - Bitwise OR (|)</li>
                  <li><strong>Nor</strong> - Bitwise NOR</li>
                  <li><strong>Implication</strong> - Logical implication (→)</li>
                  <li><strong>ReverseImplication</strong> - Reverse logical implication (←)</li>
                  <li><strong>Xor</strong> - Bitwise XOR (⊕)</li>
                  <li><strong>Xnor</strong> - Bitwise XNOR</li>
                  <li><strong>ShiftBits</strong> - Bit shifting operation where Y is the number of positions to shift, using big endian, positive Y is left shift, negative Y is right shift</li>
                  <li><strong>ProjectBits</strong> - Projects the bits of X on the 1 bits of Y. For example X=1 and Y=5 results in 1 and X=2 and Y=5 results in 4.</li>
                  <li><strong>LCM</strong> - Least common multiple</li>
                  <li><strong>GCD</strong> - Greatest common divisor</li>
                  <li><strong>Equal/NotEqual</strong> - Equality comparisons</li>
                  <li><strong>LessThan/GreaterThan</strong> - Ordering comparisons</li>
                  <li><strong>Binomial</strong> - Binomial coefficient</li>
                  <li><strong>ExpandBits/ExpandBitsFill</strong> - Bit expansion operations; each bit of X becomes Y bits: ExpandBits pads with zeros, ExpandBitsFill repeats the bit</li>
                  <li><strong>PermuteBits</strong> - Y values used to generate a permutation of the bits of X through Lehmer codes</li>
                  <li><strong>HardThreshold</strong> - Threshold operation that returns 0 if |X| > |Y|, otherwise returns X unchanged</li>
                  <li><strong>CantorIntervalBinaryNumber</strong> - Experimental operation that uses numbers in X and Y to generate binary patterns where the bits are equidistant and with a certain number of 1 bits determined by Cantor encodings (may eventually change)</li>
                  <li><strong>RandInt</strong> - Random integer between min(X,Y) and max(X,Y)</li>
                  <li><strong>Bits</strong> - Converts X elements to binary with Y digits (big endian)</li>
                  <li><strong>Trits</strong> - Converts X elements to balanced ternary with Y digits (big endian)</li>
				          <li><strong>IterateBetween</strong> - Iterates between the value of X to Y (exclusively)</li>
                </ul>

                <h4>Control Buttons</h4>
                <ul>
                  <li><strong><v-icon size="small">mdi-swap-horizontal</v-icon> Swap</strong> - Swaps X and Y sequences</li>
                  <li><strong><v-icon size="small">mdi-clipboard</v-icon> Copy</strong> - Copies result to clipboard</li>
                   <li><strong><v-icon size="small">mdi-memory</v-icon> Memory</strong> - Opens the memory dialog to view and manage stored sequences</li>
                  <li><strong><v-icon size="small">mdi-content-save</v-icon> Save</strong> - Saves the current result to memory</li>
                  <li><strong>x:=, y:=</strong> - Assigns result to X or Y sequence</li>
                  <li><strong>x+=, y+=</strong> - Appends result to X or Y sequence</li>
                </ul>

                <h4>Result Operations</h4>
                <p>These operations modify the result sequence in place:</p>
                <ul>
                  <li><strong><v-icon size="small">mdi-rewind</v-icon> Reverse</strong> - Reverses the sequence</li>
                  <li><strong><v-icon size="small">mdi-refresh</v-icon> Rotate</strong> - Rotates sequence by specified steps</li>
                  <li><strong>Δ Cyclical Difference</strong> - Computes differences between consecutive elements (wrapping around)</li>
                  <li><strong>∑ Cyclical Antidifference</strong> - Computes cumulative sum starting from user-specified k value (inverse of cyclical difference)</li>
                  <li><strong>×n Times n</strong> - Rearranges the sequence so each element is replaced by the element at index <code>(i*n)%size</code></li>
                </ul>

                <h4>Examples</h4>
                <p><strong>Cyclical Difference (Δ):</strong></p>
                <p>Input: <code>1 3 2 5</code> → Output: <code>2 -1 3 -4</code></p>
                <p>Each element is the difference to the next element (last wraps to first).</p>
                
                <p><strong>Cyclical Antidifference (∑):</strong></p>
                <p>Input: <code>2 -1 3 -4</code> with k=5 → Output: <code>1 3 2 5</code></p>
                <p>Computes cumulative sum starting from user-specified k value, which is the inverse operation of cyclical difference.</p>

                <h4>Memory</h4>
                <p>The Memory feature allows you to store, recall, and manage sequences for later use. Sequences are saved to your browser's local storage and persist between sessions.</p>
                <ul>
                  <li><strong>Saving to Memory</strong> - Click the <v-icon size="small">mdi-content-save</v-icon> Save button to store the current result sequence in memory.</li>
                  <li><strong>Viewing Memory</strong> - Click the <v-icon size="small">mdi-memory</v-icon> Memory button to open the memory dialog, which lists all stored sequences with their indices and sizes.</li>
                  <li><strong>Recalling a Sequence</strong> - In the memory dialog, click the <v-icon size="small">mdi-arrow-down</v-icon> Recall button next to a sequence to load it into the result field.</li>
                  <li><strong>Editing a Sequence</strong> - In the memory dialog, edit the text field labeled <code>M[index]</code> to modify a stored sequence.</li>
                  <li><strong>Deleting a Sequence</strong> - In the memory dialog, click the <v-icon size="small">mdi-delete</v-icon> Delete button next to a sequence to remove it from memory.</li>
                  <li><strong>Adding a New Sequence</strong> - In the memory dialog, click the <v-icon size="small">mdi-plus</v-icon> Add button to prompt for a new sequence to store.</li>
                </ul>
              </div>
            </v-card-text>
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
import pkg from '../package.json';
const appVersion = pkg.version;
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
const showHelpDialog = ref(false);
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
  //for(let i=0;i<memoryList.value.length;i++) memoryList.value[i]=convert(memoryList.value[i], newSys,oldSys,wordSize)
}

const timesNSeq = () => {
  const scaleInput = prompt("Enter the scale (n):", "2");
  if (scaleInput === null) return;
  const scale = parseInt(scaleInput.trim());
  if (isNaN(scale) || scale < 1) {
    alert("Invalid scale. Please enter a positive integer.");
    return;
  }
  const s = Sequence.parse(textResult.value);
  const o = new Sequence(...Array(s.size()).fill(0));
  for (let i = 0; i < o.size(); i++) {
    const idx = (i * scale) % o.size();
    o.set(i, s.get(idx)!);
  }
  textResult.value = o.toString();
};

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

const cyclicalDifferenceSeq = () => {
  const currentSequence = Sequence.parse(textResult.value);
  const resultSequence = currentSequence.cyclicalDifference();
  textResult.value = resultSequence.toString();
};

const cyclicalAntidifferenceSeq = () => {
  const kInput = prompt("Enter the value of k (starting value):", "0");
  if (kInput === null) return; // User cancelled
  
  const k = parseInt(kInput.trim());
  if (isNaN(k)) {
    alert("Invalid input. Please enter a valid number.");
    return;
  }
  
  const currentSequence = Sequence.parse(textResult.value);
  const resultSequence = currentSequence.cyclicalAntidifference(k);
  textResult.value = resultSequence.toString();
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
  addSequence(getAsNumbers(textResult.value).map(String).join(' '));
  alert("sequence saved");
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
  textResult.value = formatSequence(getAsNumbers(memoryList.value[index]));
  showMemoryDialog.value = false;
};


const deleteSequence = (index: number) => {
  memoryList.value.splice(index, 1);
};

const promptSequence = () => {
  const newSeq = prompt('Enter new sequence:');
  if (newSeq) {
    memoryList.value.push(getAsNumbers(newSeq).join(' '));
  }
};
const addSequence = (seq:string) => {
  if (seq) {
    memoryList.value.push(getAsNumbers(seq).join(' '));
  }
};
onMounted(() => {
  firstLoad.value=false;
});
</script>

<style scoped>
body, * {
  background-color: #000000;
  padding:0;
}
.banner {
  text-align: center;
  padding-bottom: 0.5em;
  padding-top:0;
  position: relative;
}
.help-button {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}
.help-content {
  line-height: 1.6;
}
.help-content h3 {
  margin-top: 0;
  margin-bottom: 1em;
}
.help-content h4 {
  margin-top: 1.5em;
  margin-bottom: 0.5em;
  color: #00aa00;
}
.help-content ul {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.help-content li {
  margin-bottom: 0.3em;
}
.help-content code {
  background-color: #2a2a2a;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: monospace;
}
@media (max-width: 600px) {
  .v-btn {
    margin: 2px !important; /* Tighten margins */
    padding: 0 6px !important; /* Reduce padding */
  }
}
</style>