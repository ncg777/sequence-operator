/**
 * useSharedState.ts
 *
 * Shared, reactive application state used by both the Classic interface
 * (ClassicView) and the Patch editor (PatchEditorView). The state is held in
 * module-level singleton refs so every consumer sees the same data and the same
 * localStorage-backed persistence, keeping the two interfaces in sync.
 *
 * Persisted under the existing `SEQOP_*` localStorage keys so that data created
 * by the classic interface continues to work unchanged.
 */
import { ref, watch } from 'vue';

export type CombineEntry = {
  type?: 'combine';
  x: string;
  y: string;
  combiner: string;
  operation: string;
  result: string;
  timestamp: string;
};
export type ResultOpEntry = {
  type: 'result-op';
  resultOp: string;
  params?: Record<string, string | number>;
  input: string;
  result: string;
  timestamp: string;
};
export type HistoryEntry = CombineEntry | ResultOpEntry;

// --- Module-level singleton state (shared across all components) ---
const selectedNumberSystem = ref<number>(10);
const wordSize = ref<number>(16);
const memoryList = ref<string[]>([]);
const historyList = ref<HistoryEntry[]>([]);

let initialized = false;

/** Load persisted state and register persistence watchers exactly once. */
function initSharedState() {
  if (initialized) return;
  initialized = true;

  // Memory
  try {
    const storedMEM = localStorage.getItem('SEQOP_memoryList');
    if (storedMEM) memoryList.value = JSON.parse(storedMEM);
  } catch {
    memoryList.value = [];
  }

  // History
  try {
    const storedHistory = localStorage.getItem('SEQOP_historyList');
    if (storedHistory) historyList.value = JSON.parse(storedHistory);
  } catch {
    historyList.value = [];
  }

  // Word size (load first so it isn't clobbered by the base default below)
  let storedWS: number | null = null;
  try {
    const storedWSRaw = localStorage.getItem('SEQOP_wordsize');
    if (storedWSRaw) {
      storedWS = JSON.parse(storedWSRaw);
      wordSize.value = storedWS as number;
    }
  } catch {
    storedWS = null;
  }

  // Number system / base
  try {
    const storedSysRaw = localStorage.getItem('SEQOP_sys');
    selectedNumberSystem.value = storedSysRaw ? JSON.parse(storedSysRaw) : 10;
  } catch {
    selectedNumberSystem.value = 10;
  }

  // Default word size derived from the base when none was persisted
  if (storedWS === null) {
    switch (selectedNumberSystem.value) {
      case 16: wordSize.value = 16; break;
      case 8: wordSize.value = 12; break;
      case 10: wordSize.value = -1; break;
    }
  }

  // Persistence
  watch(memoryList, (v) => localStorage.setItem('SEQOP_memoryList', JSON.stringify(v)), { deep: true });
  watch(historyList, (v) => localStorage.setItem('SEQOP_historyList', JSON.stringify(v)), { deep: true });
  watch(selectedNumberSystem, (v) => localStorage.setItem('SEQOP_sys', JSON.stringify(v)));
  watch(wordSize, (v) => localStorage.setItem('SEQOP_wordsize', JSON.stringify(v)));
}

initSharedState();

// --- Pure display helpers (base/word-size aware) ---

export const getWordSizes = (sys: number): number[] =>
  sys == 16 ? [4, 8, 12, 16, 20, 24, 28] : sys == 8 ? [3, 6, 9, 12, 15, 18, 21, 24, 27, 30] : [];

export function parseSequence(text: string, sys: number, _wordSize: number): number[] {
  const strings = text.split(/\s+/).filter((s) => s !== '');
  return strings.map((str) => parseInt(str, sys));
}

export function formatNumber(num: number, sys: number, wsize: number): string {
  if (sys == 10) return num.toString();
  const digits = wsize / (sys == 16 ? 4 : 3);
  const maxUnsigned = 1 << wsize;
  const unsignedNum = num % maxUnsigned;
  const str = unsignedNum.toString(sys).toUpperCase();
  return str.padStart(digits, '0');
}

/** Format a canonical (decimal, space-separated) sequence in the current base. */
export function formatSeqForDisplay(canonical: string): string {
  const nums = canonical.split(/\s+/).filter((s) => s !== '').map(Number);
  if (!selectedNumberSystem.value) return nums.map(String).join(' ');
  return nums.map((n) => formatNumber(n, selectedNumberSystem.value, wordSize.value)).join(' ');
}

export function useSharedState() {
  const getAsNumbers = (str: string): number[] => {
    if (selectedNumberSystem.value) {
      return parseSequence(str, selectedNumberSystem.value, wordSize.value);
    }
    return str.split(/\s+/).map(Number).filter((num) => !isNaN(num));
  };

  const formatSequence = (numbers: number[]): string => {
    if (selectedNumberSystem.value) {
      return numbers.map((num) => formatNumber(num, selectedNumberSystem.value, wordSize.value)).join(' ');
    }
    return numbers.map(String).join(' ');
  };

  const addCombineToHistory = (entry: Omit<CombineEntry, 'timestamp' | 'type'>) => {
    historyList.value.push({ type: 'combine', ...entry, timestamp: new Date().toLocaleString() });
  };

  const addResultOpToHistory = (
    resultOp: string,
    input: string,
    result: string,
    params?: Record<string, string | number>,
  ) => {
    historyList.value.push({ type: 'result-op', resultOp, params, input, result, timestamp: new Date().toLocaleString() });
  };

  /** Read the raw (canonical) content of a shared memory slot. */
  const readMemory = (slot: number): string => memoryList.value[slot] ?? '';

  /** Write a canonical sequence into a shared memory slot, extending as needed. */
  const writeMemory = (slot: number, value: string) => {
    while (memoryList.value.length <= slot) memoryList.value.push('');
    memoryList.value[slot] = value;
  };

  return {
    selectedNumberSystem,
    wordSize,
    memoryList,
    historyList,
    getWordSizes,
    parseSequence,
    formatNumber,
    formatSeqForDisplay,
    getAsNumbers,
    formatSequence,
    addCombineToHistory,
    addResultOpToHistory,
    readMemory,
    writeMemory,
  };
}
