#!/usr/bin/env node
import { Command } from 'commander';
import {
  COMBINERS,
  OPERATIONS,
  UNARY_TRITWISE_OPS,
  antidifference,
  combine,
  cyclicalAntidifference,
  cyclicalDifference,
  difference,
  permuteBlocks,
  reverse,
  rotate,
  signs,
  timesN,
  unaryTritwise,
} from './lib.js';
import type { UnaryTritwiseOpName } from './lib.js';

const program = new Command();

program
  .name('sequence-operator')
  .description('CLI for sequence operations')
  .version(process.env.npm_package_version ?? 'unknown');

program
  .command('combine')
  .description('Combine two sequences using a combiner and an operation')
  .requiredOption('-x, --x <sequence>', 'First sequence (space-separated integers)')
  .requiredOption('-y, --y <sequence>', 'Second sequence (space-separated integers)')
  .requiredOption('-c, --combiner <combiner>', `Combiner: ${COMBINERS.join(', ')}`)
  .requiredOption('-o, --operation <operation>', `Operation: ${OPERATIONS.join(', ')}`)
  .action(({ x, y, combiner: c, operation: op }) => {
    console.log(combine(c, op, x, y));
  });

program
  .command('rotate')
  .description('Rotate a sequence by n steps')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .requiredOption('-n, --steps <n>', 'Number of rotation steps', parseInt)
  .action(({ sequence, steps }) => {
    console.log(rotate(sequence, steps));
  });

program
  .command('reverse')
  .description('Reverse a sequence')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .action(({ sequence }) => {
    console.log(reverse(sequence));
  });

program
  .command('cyclical-difference')
  .description('Compute the cyclical difference of a sequence')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .action(({ sequence }) => {
    console.log(cyclicalDifference(sequence));
  });

program
  .command('cyclical-antidifference')
  .description('Compute the cyclical antidifference of a sequence')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .option('-k, --k <k>', 'Starting value', parseInt, 0)
  .action(({ sequence, k }) => {
    console.log(cyclicalAntidifference(sequence, k));
  });

program
  .command('difference')
  .description('Compute the difference of a sequence')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .action(({ sequence }) => {
    console.log(difference(sequence));
  });

program
  .command('antidifference')
  .description('Compute the antidifference of a sequence')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .option('-k, --k <k>', 'Starting value', parseInt, 0)
  .action(({ sequence, k }) => {
    console.log(antidifference(sequence, k));
  });

program
  .command('signs')
  .description('Return the sign (+1, -1, 0) of each element in a sequence')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .action(({ sequence }) => {
    console.log(signs(sequence));
  });

program
  .command('times-n')
  .description('Sample every n-th element cyclically (result[i] = sequence[(i*n) % size])')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .requiredOption('-n, --n <n>', 'Scale factor (positive integer)', parseInt)
  .action(({ sequence, n }) => {
    console.log(timesN(sequence, n));
  });

program
  .command('permute-blocks')
  .description('Permute the blocks of a sequence')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .requiredOption('-p, --permutation <permutation>', 'Permutation (space-separated indices, e.g. "1 0 2")')
  .action(({ sequence, permutation }) => {
    const parsedPermutation = permutation.trim().split(/\s+/).map(Number);
    console.log(permuteBlocks(sequence, parsedPermutation));
  });

program
  .command('unary-tritwise')
  .description('Apply a unary tritwise operation to every element in a sequence')
  .requiredOption('-s, --sequence <sequence>', 'Sequence (space-separated integers)')
  .requiredOption('-o, --op <op>', `Operation: ${Object.keys(UNARY_TRITWISE_OPS).join(', ')}`)
  .action(({ sequence, op }) => {
    console.log(unaryTritwise(sequence, op as UnaryTritwiseOpName));
  });

program.parse();
