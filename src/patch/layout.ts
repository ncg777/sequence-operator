/**
 * layout.ts — Deterministic geometry for nodes and ports.
 *
 * Port anchor positions depend only on the node position and the port index so
 * that wires attach precisely regardless of the parameter/preview area height.
 * The node components render ports at exactly these offsets.
 */
import type { NodeInstance } from './graph';

export const NODE_WIDTH = 210;
export const HEADER_H = 34;
export const PORT_TOP = 12;
export const PORT_GAP = 26;

export type PortSide = 'in' | 'out';

/** Vertical offset (within the node body, below the header) of a port at the given index. */
export function portOffsetY(index: number): number {
  return PORT_TOP + index * PORT_GAP + PORT_GAP / 2;
}

/** Absolute anchor position (graph coordinates) of a port. */
export function portAnchor(node: NodeInstance, side: PortSide, index: number, nodeWidth = NODE_WIDTH): { x: number; y: number } {
  return {
    x: node.x + (side === 'in' ? 0 : nodeWidth),
    y: node.y + HEADER_H + portOffsetY(index),
  };
}

/** Height of the port region for a node with the given port counts. */
export function portRegionHeight(inputs: number, outputs: number): number {
  const rows = Math.max(inputs, outputs, 1);
  return PORT_TOP * 2 + rows * PORT_GAP;
}
