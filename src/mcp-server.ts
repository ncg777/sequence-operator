#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import {
  COMBINERS,
  OPERATIONS,
  UNARY_TRITWISE_OPS,
  antidifference,
  combine,
  cyclicalAntidifference,
  cyclicalDifference,
  difference,
  hierarchicalPermute,
  permuteBlocks,
  reverse,
  rotate,
  signs,
  timesN,
  unaryTritwise,
} from './lib.js';
import type { UnaryTritwiseOpName } from './lib.js';
import { Combiner, Operation } from './lib.js';

const COMBINER_VALUES = COMBINERS as [string, ...string[]];
const OPERATION_VALUES = OPERATIONS as [string, ...string[]];
const TRIT_OP_VALUES = Object.keys(UNARY_TRITWISE_OPS) as [UnaryTritwiseOpName, ...UnaryTritwiseOpName[]];

const server = new McpServer({
  name: 'sequence-operator',
  version: process.env.npm_package_version ?? 'unknown',
});

server.tool(
  'combine',
  'Combine two sequences using a combiner and an operation. Returns the result sequence as a space-separated string.',
  {
    x:         z.string().describe('First sequence (space-separated integers)'),
    y:         z.string().describe('Second sequence (space-separated integers)'),
    combiner:  z.enum(COMBINER_VALUES).describe(`Combiner to use: ${COMBINERS.join(', ')}`),
    operation: z.enum(OPERATION_VALUES).describe(`Operation to apply: ${OPERATIONS.join(', ')}`),
  },
  ({ x, y, combiner: c, operation: op }) => ({
    content: [{ type: 'text', text: combine(c as Combiner, op as Operation, x, y) }],
  })
);

server.tool(
  'rotate',
  'Rotate a sequence by n steps (positive = left, negative = right). Returns the rotated sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
    steps:    z.number().int().describe('Number of rotation steps (positive = left, negative = right)'),
  },
  ({ sequence, steps }) => ({
    content: [{ type: 'text', text: rotate(sequence, steps) }],
  })
);

server.tool(
  'reverse',
  'Reverse a sequence. Returns the reversed sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
  },
  ({ sequence }) => ({
    content: [{ type: 'text', text: reverse(sequence) }],
  })
);

server.tool(
  'cyclical_difference',
  'Compute the cyclical difference of a sequence (each element minus the next, wrapping around). Returns the result sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
  },
  ({ sequence }) => ({
    content: [{ type: 'text', text: cyclicalDifference(sequence) }],
  })
);

server.tool(
  'cyclical_antidifference',
  'Compute the cyclical antidifference (inverse of cyclical difference) of a sequence. Returns the result sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
    k:        z.number().int().default(0).describe('Starting value (default: 0)'),
  },
  ({ sequence, k }) => ({
    content: [{ type: 'text', text: cyclicalAntidifference(sequence, k) }],
  })
);

server.tool(
  'difference',
  'Compute the difference of a sequence (each element minus the previous). Returns the result sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
  },
  ({ sequence }) => ({
    content: [{ type: 'text', text: difference(sequence) }],
  })
);

server.tool(
  'antidifference',
  'Compute the antidifference (cumulative sum) of a sequence. Returns the result sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
    k:        z.number().int().default(0).describe('Starting value (default: 0)'),
  },
  ({ sequence, k }) => ({
    content: [{ type: 'text', text: antidifference(sequence, k) }],
  })
);

server.tool(
  'signs',
  'Return the sign (+1, -1, or 0) of each element in a sequence. Returns the sign sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
  },
  ({ sequence }) => ({
    content: [{ type: 'text', text: signs(sequence) }],
  })
);

server.tool(
  'times_n',
  'Sample every n-th element cyclically: result[i] = sequence[(i * n) % size]. Returns the resampled sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
    n:        z.number().int().min(1).describe('Scale factor (positive integer)'),
  },
  ({ sequence, n }) => ({
    content: [{ type: 'text', text: timesN(sequence, n) }],
  })
);

server.tool(
  'permute_blocks',
  'Divide a sequence into equally-sized blocks and reorder them according to a permutation. Returns the reordered sequence.',
  {
    sequence:    z.string().describe('Sequence (space-separated integers)'),
    permutation: z.array(z.number().int().min(0)).describe('Array of block indices specifying the new order (e.g. [1, 0, 2])'),
  },
  ({ sequence, permutation }) => ({
    content: [{ type: 'text', text: permuteBlocks(sequence, permutation) }],
  })
);

server.tool(
  'hierarchical_permute',
  'Apply a composition-driven binary hierarchical permutation (CDBHP) to a sequence. The sequence length must equal 2^sum(composition). The composition defines binary subdivision levels and the permutation reorders them hierarchically.',
  {
    sequence:    z.string().describe('Sequence (space-separated integers, length must be 2^sum(composition))'),
    composition: z.array(z.number().int().min(1)).describe('Composition array of positive integers defining binary subdivision levels (e.g. [1, 2, 1])'),
    permutation: z.array(z.number().int().min(0)).describe('Permutation of 0..k-1 where k = composition length (e.g. [2, 0, 1])'),
  },
  ({ sequence, composition, permutation }) => ({
    content: [{ type: 'text', text: hierarchicalPermute(sequence, composition, permutation) }],
  })
);

server.tool(
  'unary_tritwise',
  'Apply a unary tritwise (balanced-ternary) operation to every element in a sequence. Returns the result sequence.',
  {
    sequence: z.string().describe('Sequence (space-separated integers)'),
    op:       z.enum(TRIT_OP_VALUES).describe(`Unary tritwise operation: ${TRIT_OP_VALUES.join(', ')}`),
  },
  ({ sequence, op }) => ({
    content: [{ type: 'text', text: unaryTritwise(sequence, op as UnaryTritwiseOpName) }],
  })
);

server.tool(
  'list_combiners',
  'List all available combiners for the combine operation.',
  {},
  () => ({
    content: [{ type: 'text', text: COMBINERS.join('\n') }],
  })
);

server.tool(
  'list_operations',
  'List all available operations for the combine operation.',
  {},
  () => ({
    content: [{ type: 'text', text: OPERATIONS.join('\n') }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
