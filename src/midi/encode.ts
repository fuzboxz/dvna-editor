// src/midi/encode.ts
// 14-bit (MSB/LSB) <-> logical value conversion + parameter -> CC message encoding.
// See design.md §8 (#3 clamping). All inputs are clamped before producing bytes.

import { clamp7, clamp14 } from './clamp';
import type { ParamDef } from './ccMap';

/** A single CC message ready for Web MIDI send(): [status, controller, value]. */
export interface CCMessage {
  controller: number; // 0-127
  value: number;      // 0-127
}

/** Combine a 7-bit MSB and 7-bit LSB into a 14-bit value. Inputs are clamped. */
export function decode14(msb: number, lsb: number): number {
  return ((clamp7(msb) & 0x7f) << 7) | (clamp7(lsb) & 0x7f);
}

/** Split a 14-bit value into its MSB and LSB 7-bit components. Input is clamped. */
export function split14(value: number): { msb: number; lsb: number } {
  const v = clamp14(value);
  return { msb: (v >> 7) & 0x7f, lsb: v & 0x7f };
}

/**
 * Encode a parameter's logical value into the CC message(s) to send.
 * - 7-bit param  -> one message on its MSB controller.
 * - 14-bit param -> two messages: MSB first, then LSB (the order DVNA expects).
 * Values are clamped to valid ranges; the result is always safe to transmit.
 */
export function encodeParam(p: ParamDef, value: number): CCMessage[] {
  if (p.lsb === null) {
    return [{ controller: p.msb, value: clamp7(value) }];
  }
  const v = clamp14(value);
  return [
    { controller: p.msb, value: (v >> 7) & 0x7f }, // MSB
    { controller: p.lsb, value: v & 0x7f },        // LSB
  ];
}
