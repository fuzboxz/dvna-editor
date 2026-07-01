// src/state/liveState.svelte.ts
// Reactive source of truth for every parameter's current value.
// DVNA is MIDI-IN-only and cannot report its state, so the browser's liveState
// is the sole authority. Changing a value updates this store AND streams CC(s).

import { PARAMS, type ParamDef } from '../midi/ccMap';
import { clampForRange, defaultForRange } from '../midi/clamp';
import type { DvnaMidi } from '../midi/midi.svelte';

/** Neutral default value for a param (mid-range). */
export function defaultValue(p: ParamDef): number {
  return defaultForRange(p.highRes);
}

/**
 * Reactive map: paramId -> current logical value.
 * A plain $state record; Svelte 5 proxies it for deep reactivity.
 */
export const liveState = $state<Record<string, number>>(
  Object.fromEntries(PARAMS.map((p) => [p.id, defaultValue(p)])),
);

/** Clamp to the param's range and return the sanitized value. */
export function clampForParam(p: ParamDef, value: number): number {
  return clampForRange(value, p.highRes);
}

/**
 * Set a parameter's value: updates liveState and streams the CC(s) to DVNA.
 * Returns the clamped value actually applied.
 */
export function setParam(p: ParamDef, value: number, midi: DvnaMidi): number {
  const v = clampForParam(p, value);
  liveState[p.id] = v;
  midi.sendParam(p, v);
  return v;
}
