import { Combiner, Numbers, Operation, Sequence } from 'ultra-mega-enumerator';
export { Combiner, Numbers, Operation, Sequence };
export const COMBINERS = Object.values(Combiner);
export const OPERATIONS = Object.values(Operation);
export const UNARY_TRITWISE_OPS = {
    Buf: Numbers.tritBuf,
    Not: Numbers.tritNot,
    Pnot: Numbers.tritPnot,
    Nnot: Numbers.tritNnot,
    Abs: Numbers.tritAbs,
    Clu: Numbers.tritClu,
    Cld: Numbers.tritCld,
    Inc: Numbers.tritInc,
    Dec: Numbers.tritDec,
    Rtu: Numbers.tritRtu,
    Rtd: Numbers.tritRtd,
    Isp: Numbers.tritIsp,
    Isz: Numbers.tritIsz,
    Isn: Numbers.tritIsn,
};
/** Parse a space-separated sequence string into a Sequence object. */
export function parseSeq(s) {
    return Sequence.parse(s.trim());
}
/** Combine two sequences using the specified combiner and operation. */
export function combine(combiner, operation, x, y) {
    const seqX = parseSeq(x);
    const seqY = parseSeq(y);
    return Sequence.combine(combiner, operation, seqX, seqY).toString();
}
/** Rotate a sequence by n steps. */
export function rotate(sequence, n) {
    return parseSeq(sequence).rotate(n).toString();
}
/** Reverse a sequence. */
export function reverse(sequence) {
    const arr = parseSeq(sequence).toArray().reverse();
    return new Sequence(...arr).toString();
}
/** Compute the cyclical difference of a sequence. */
export function cyclicalDifference(sequence) {
    return parseSeq(sequence).cyclicalDifference().toString();
}
/** Compute the cyclical antidifference of a sequence starting from k. */
export function cyclicalAntidifference(sequence, k) {
    return parseSeq(sequence).cyclicalAntidifference(k).toString();
}
/** Compute the difference of a sequence. */
export function difference(sequence) {
    return parseSeq(sequence).difference().toString();
}
/** Compute the antidifference of a sequence starting from k. */
export function antidifference(sequence, k) {
    return parseSeq(sequence).antidifference(k).toString();
}
/** Return the sign of each element in the sequence (+1, -1, or 0). */
export function signs(sequence) {
    return parseSeq(sequence).signs().toString();
}
/**
 * Sample every n-th element cyclically (TimesN).
 * The result at position i is the element at position (i * n) % size.
 */
export function timesN(sequence, n) {
    const s = parseSeq(sequence);
    const size = s.size();
    const out = new Sequence(...Array(size).fill(0));
    for (let i = 0; i < size; i++) {
        out.set(i, s.get((i * n) % size));
    }
    return out.toString();
}
/**
 * Permute the blocks of a sequence according to a permutation array.
 * The sequence is divided into `permutation.length` blocks as evenly as possible,
 * and the blocks are reordered according to the permutation.
 */
export function permuteBlocks(sequence, permutation) {
    const seqArr = sequence.trim().split(/\s+/).filter(item => item !== '');
    const numBlocks = Math.max(...permutation) + 1;
    if (numBlocks > seqArr.length) {
        throw new Error('More blocks than elements in sequence.');
    }
    const baseBlock = Math.floor(seqArr.length / numBlocks);
    const rem = seqArr.length % numBlocks;
    const blockSizes = Array(numBlocks).fill(baseBlock).map((blockSize, i) => blockSize + (i < rem ? 1 : 0));
    let idx = 0;
    const blocks = [];
    for (let i = 0; i < numBlocks; i++) {
        blocks.push(seqArr.slice(idx, idx + blockSizes[i]));
        idx += blockSizes[i];
    }
    const permuted = [];
    for (const pi of permutation) {
        if (pi < 0 || pi >= numBlocks) {
            throw new Error(`Permutation index ${pi} is out of range.`);
        }
        permuted.push(...blocks[pi]);
    }
    return permuted.join(' ');
}
/**
 * Generate a Composition-Driven Binary Hierarchical Permutation and apply it
 * to a sequence.  The sequence length must equal 2^sum(composition).
 *
 * @param sequence     Space-separated integers to permute.
 * @param composition  Array of positive integers defining binary subdivision levels.
 * @param permutation  A permutation of {0 … k-1} where k = composition.length.
 */
export function hierarchicalPermute(sequence, composition, permutation) {
    const k = composition.length;
    if (permutation.length !== k) {
        throw new Error(`Composition length (${k}) must equal permutation length (${permutation.length}).`);
    }
    for (let i = 0; i < k; i++) {
        if (!Number.isInteger(composition[i]) || composition[i] < 1) {
            throw new Error(`Composition values must be positive integers (got ${composition[i]} at index ${i}).`);
        }
    }
    const sortedPerm = [...permutation].sort((a, b) => a - b);
    for (let i = 0; i < k; i++) {
        if (sortedPerm[i] !== i) {
            throw new Error(`Permutation must be a rearrangement of 0..${k - 1} (got ${permutation.join(', ')}).`);
        }
    }
    const sumComp = composition.reduce((a, b) => a + b, 0);
    const z = Math.pow(2, sumComp);
    const seqArr = sequence.trim().split(/\s+/).filter(s => s !== '');
    if (seqArr.length !== z) {
        throw new Error(`Sequence length (${seqArr.length}) must equal 2^sum(composition) = ${z}.`);
    }
    // Build the p (place-value) array
    const p = [1];
    for (let i = 1; i < k; i++) {
        p[i] = p[i - 1] * Math.pow(2, composition[permutation[i - 1]]);
    }
    // Generate the CDBHP index mapping
    const o = new Array(z);
    for (let m = 0; m < z; m++) {
        let t = m;
        const j = new Array(k);
        for (let i = 0; i < k; i++) {
            const n = Math.pow(2, composition[i]);
            j[i] = t % n;
            t = (t - j[i]) / n;
        }
        let f = 0;
        for (let i = 0; i < k; i++) {
            f += j[permutation[i]] * p[i];
        }
        o[m] = f;
    }
    // Apply the permutation: newResult[i] = sequence[o[i]]
    return o.map(idx => seqArr[idx]).join(' ');
}
/** Apply a unary tritwise operation to every element in the sequence. */
export function unaryTritwise(sequence, op) {
    const fn = UNARY_TRITWISE_OPS[op];
    const numbers = parseSeq(sequence).toArray().map(fn);
    return new Sequence(...numbers).toString();
}
