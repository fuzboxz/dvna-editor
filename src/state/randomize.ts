// src/state/randomize.ts
// Random patch generator ("Surprise me").
// Every parameter is randomized across its full native range (0-127 for 7-bit,
// 0-16383 for 14-bit). DVNA maps/clamps incoming CC values to valid options
// internally, so no client-side musical-range constraints are needed.
//
// This module is PURE (no runes/DOM) so it is unit-testable.

import { PARAMS, paramsInGroup, type ParamDef, type ParamGroup } from '../midi/ccMap';

/** Native max value for a param (127 or 16383). */
export function nativeMax(p: ParamDef): number {
  return p.highRes ? 16383 : 127;
}

/** Inclusive random integer in [lo, hi]. */
function randInt(lo: number, hi: number): number {
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

/** Parameters excluded from randomization (kept at their current value). */
const EXCLUDE_FROM_RANDOM = new Set<string>([
  'master-volume', // never silence or blast the output on a surprise
]);

/** True if a param should be randomized. */
export function isRandomizable(p: ParamDef): boolean {
  return !EXCLUDE_FROM_RANDOM.has(p.id);
}

/** Generate a single random value for a param across its full range. */
export function randomizeOne(p: ParamDef): number {
  return randInt(0, nativeMax(p));
}

/**
 * Generate a full random patch: a map of paramId -> value for every randomizable
 * parameter. Excluded params (e.g. master-volume) are omitted so they keep their
 * current value. Pure; does not touch state or MIDI.
 */
export function randomizeValues(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PARAMS) {
    if (isRandomizable(p)) out[p.id] = randomizeOne(p);
  }
  return out;
}

/**
 * Generate a random patch for a single group/page only: paramId -> value for every
 * randomizable parameter in that group. Excluded params are omitted.
 */
export function randomizeGroup(group: ParamGroup): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of paramsInGroup(group)) {
    if (isRandomizable(p)) out[p.id] = randomizeOne(p);
  }
  return out;
}
