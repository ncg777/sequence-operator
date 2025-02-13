export class Sequence{
    private items: number[];

    constructor(...items: number[]) {
        this.items = items??[];
    }
    toString() {
        return this.toArray().join(' ');
    }
    add(item: number) {
        this.items.push(item);
    }

    size(): number {
        return this.items.length;
    }

    get(index: number): number | undefined {
        return this.items[index];
    }
    set(index: number, value:number): void {
        this.items[index] = value;
    }
    toArray(): number[] {
        return this.items;
    }
    // New signs method
    signs(): Sequence {
        const signArray = this.items.map(item => {
            if (item > 0) return 1;
            else if (item < 0) return -1;
            return 0;
        });
        return new Sequence(...signArray); // Create a new Sequence with sign values
    }
    isNatural(): boolean {
        return this.items.every(n => n >= 0);
    }
    difference(): Sequence {
        if (this.size() < 2) {
            throw new Error("Difference requires at least two elements.");
        }
        const output = this.items.slice(1).map((item, index) => item - this.items[index]);
        return new Sequence(...output);
    }

    cyclicalDifference(): Sequence {
        if (this.size() == 0) {
            return new Sequence();
        }
        if (this.size() == 1) {
            return new Sequence(...[0]);
        }
        const output = this.items.map((item, index) => {
            return this.items[(index + 1) % this.size()] - item;
        });
        return new Sequence(...output);
    }

    antidifference(k: number): Sequence {
        const output:number[] = new Array(this.size() + 1);
        output[0] = k;
        for (let i = 0; i < this.size(); i++) {
            output[i + 1] = output[i] + this.items[i];
        }
        return new Sequence(...output);
    }

    cyclicalAntidifference(k: number): Sequence {
        const output:number[] = new Array(this.size());
        output[this.size() - 1] = k;
        for (let i = 0; i < this.size(); i++) {
            output[i] = output[(i - 1 + this.size()) % this.size()] + this.items[(i - 1 + this.size()) % this.size()];
        }
        return new Sequence(...output);
    }
    getSymmetries(): number[] {
        const symmetries: number[] = [];
        const n = this.size();
        for (let i = 0; i < n * 2; i++) {
            let axis = Math.floor(i / 2);
            let found = true;
            if (i % 2 === 0) {
                for (let j = 0; j < 1 + Math.floor(n / 2); j++) {
                    if (this.get((axis + j) % n) !== this.get((n + axis - j) % n)) {
                        found = false;
                        break;
                    }
                }
            } else {
                for (let j = 0; j < 1 + Math.floor(n / 2); j++) {
                    if (this.get((axis + j + 1) % n) !== this.get((n + axis - j) % n)) {
                        found = false;
                        break;
                    }
                }
            }
            if (found) {
                symmetries.push(i / 2);
            }
        }
        return symmetries;
    }

    static parse(s: string): Sequence {
        const output = new Sequence();
        const trimmed = s.trim().replace(/[,]/g, "");
        let str0 = trimmed.startsWith('[') && trimmed.endsWith(']')
            ? trimmed.substring(1, trimmed.length - 1)
            : trimmed;
        const ss = str0.split(/\s+/);
        for (const i of ss) {
            if (i.trim() !== '') {
                output.add(parseInt(i.trim()));
            }
        }
        return output;
    }

    getMean(): number {
        return this.sum() / this.size();
    }

    sum(): number {
        return this.items.reduce((a, b) => a + b, 0);
    }

    getMin(): number {
        return Math.min(...this.items);
    }

    getMax(): number {
        return Math.max(...this.items);
    }

    multiply(k: number): Sequence {
        const seq = new Sequence();
        for (const item of this.items) {
            seq.add(item * k);
        }
        return seq;
    }

    rotate(n: number): Sequence {
        const rotatedItems = [...this.items.slice(-n), ...this.items.slice(0, -n)];
        const resultSeq = new Sequence();
        for (const item of rotatedItems) {
            resultSeq.add(item);
        }
        return resultSeq;
    }

    // Additional helper methods

    static fromArray(arr: number[]): Sequence {
        const seq = new Sequence();
        for (const item of arr) {
            seq.add(item);
        }
        return seq;
    }

    // Frequency map
    frequencyMap(): Map<number, number> {
        const freqMap = new Map<number, number>();
        for (const item of this.items) {
            freqMap.set(item, (freqMap.get(item) || 0) + 1);
        }
        return freqMap;
    }

    static genRnd(length: number, amp: number, sum: number, maxAmp: number, exclude0: boolean): Sequence {
        if (length <= 1 || amp < 1 || maxAmp < 2 || (exclude0 && maxAmp < 2) ||
            (Math.abs(sum) >= maxAmp)) {
            throw new Error("Invalid parameters for random sequence generation.");
        }

        const sequence = new Sequence();
        let currVal = sum;
        sequence.add(currVal);
        const possibleValues: number[] = [];

        while (sequence.size() < length) {
            possibleValues.length = 0;
            for (let i = -amp; i <= amp; i++) {
                if (Math.abs(currVal + i) < maxAmp && (i !== 0 || !exclude0)) {
                    possibleValues.push(i);
                }
            }
            if (possibleValues.length === 0) break;

            const randomIndex = Math.floor(Math.random() * possibleValues.length);
            currVal += possibleValues[randomIndex];
            sequence.add(currVal);
        }
        return sequence;
    }

    // Calculate interval vector for a specific condition
    private static calculateIntervalVector(n: number, conditionFn: (j: number) => boolean): Sequence {
        const m = Math.floor(n / 2);
        const result = new Sequence();

        for (let i = 1; i <= m; i++) {
            let count = 0;
            for (let j = 0; j < n; j++) {
                if (conditionFn(j) && conditionFn((i + j) % n)) {
                    count++;
                }
            }
            if (i === m && n % 2 === 0) {
                count = Math.floor(count / 2);
            }
            result.add(count);
        }
        return result;
    }

    // Calculate interval vector for a boolean array
    static calcIntervalVector(input: boolean[]): Sequence {
        const n = input.length;
        return this.calculateIntervalVector(n, (j: number) => input[j]);
    }

    // Calculate interval vector for a BitSet (presented as an array as TypeScript doesn't have BitSet)
    static calcIntervalVectorBitSet(input: boolean[], n: number): Sequence {
        return this.calculateIntervalVector(n, (j: number) => input[j]);
    }

    // For distinct values in a sequence input
    static calcIntervalVectorDistinct(sequence: Sequence): Map<number, Sequence> {
        const output = new Map<number, Sequence>();
        const distinctValues = new Set(sequence.toArray());

        for (const value of distinctValues) {
            const booleanArray = sequence.toArray().map(item => item === value);
            const intervalVector = this.calcIntervalVector(booleanArray);
            output.set(value, intervalVector);
        }
        return output;
    }

    // Alternative overload to handle Integer[] while avoiding code duplication
    static calcIntervalVectorInts(input: number[]): Map<number, Sequence> {
        const sequence = new Sequence(...input);
        return this.calcIntervalVectorDistinct(sequence);
    }

}