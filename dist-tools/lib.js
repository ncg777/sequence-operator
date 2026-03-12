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
/** Apply a unary tritwise operation to every element in the sequence. */
export function unaryTritwise(sequence, op) {
    const fn = UNARY_TRITWISE_OPS[op];
    const numbers = parseSeq(sequence).toArray().map(fn);
    return new Sequence(...numbers).toString();
}
