import { Combiner, Numbers, Operation, Sequence } from 'ultra-mega-enumerator';
export { Combiner, Numbers, Operation, Sequence };
export declare const COMBINERS: Combiner[];
export declare const OPERATIONS: Operation[];
export type UnaryTritwiseOpName = 'Buf' | 'Not' | 'Pnot' | 'Nnot' | 'Abs' | 'Clu' | 'Cld' | 'Inc' | 'Dec' | 'Rtu' | 'Rtd' | 'Isp' | 'Isz' | 'Isn';
export declare const UNARY_TRITWISE_OPS: Record<UnaryTritwiseOpName, (n: number) => number>;
/** Parse a space-separated sequence string into a Sequence object. */
export declare function parseSeq(s: string): Sequence;
/** Combine two sequences using the specified combiner and operation. */
export declare function combine(combiner: Combiner, operation: Operation, x: string, y: string): string;
/** Rotate a sequence by n steps. */
export declare function rotate(sequence: string, n: number): string;
/** Reverse a sequence. */
export declare function reverse(sequence: string): string;
/** Compute the cyclical difference of a sequence. */
export declare function cyclicalDifference(sequence: string): string;
/** Compute the cyclical antidifference of a sequence starting from k. */
export declare function cyclicalAntidifference(sequence: string, k: number): string;
/** Compute the difference of a sequence. */
export declare function difference(sequence: string): string;
/** Compute the antidifference of a sequence starting from k. */
export declare function antidifference(sequence: string, k: number): string;
/** Return the sign of each element in the sequence (+1, -1, or 0). */
export declare function signs(sequence: string): string;
/**
 * Sample every n-th element cyclically (TimesN).
 * The result at position i is the element at position (i * n) % size.
 */
export declare function timesN(sequence: string, n: number): string;
/**
 * Permute the blocks of a sequence according to a permutation array.
 * The sequence is divided into `permutation.length` blocks as evenly as possible,
 * and the blocks are reordered according to the permutation.
 */
export declare function permuteBlocks(sequence: string, permutation: number[]): string;
/**
 * Generate a Composition-Driven Binary Hierarchical Permutation and apply it
 * to a sequence.  The sequence length must equal 2^sum(composition).
 *
 * @param sequence     Space-separated integers to permute.
 * @param composition  Array of positive integers defining binary subdivision levels.
 * @param permutation  A permutation of {0 … k-1} where k = composition.length.
 */
export declare function hierarchicalPermute(sequence: string, composition: number[], permutation: number[]): string;
/** Apply a unary tritwise operation to every element in the sequence. */
export declare function unaryTritwise(sequence: string, op: UnaryTritwiseOpName): string;
