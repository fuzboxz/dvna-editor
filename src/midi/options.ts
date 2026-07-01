// src/midi/options.ts
// Discrete-parameter enumerations + even-banding helpers.
// Option lists are sweep-confirmed against the device over MIDI CC:
//   - Filter Mode: 6 CC-reachable modes (panel knob has 10 incl. Notch/All-Pass, but CC tops out at HP24).
//   - Oscillator Waveform: 11 (sweep ends at Wavetable).
//   - VCA Drone: off / on.
// Banding is even: index = floor(value * N / 128); safe send-value = round((i+0.5)*128/N) - 1.

import type { ParamDef } from './ccMap';

export const WAVEFORMS: readonly string[] = [
  'Off',
  'Sine',
  'Triangle',
  'Saw',
  'Rectangle',
  'Sine + wavefolder',
  'Var-slope triangle',
  'Variable saw',
  'Rectangle (PW)',
  'Pulse train',
  'Wavetable',
];

export const FILTER_MODES: readonly string[] = [
  'LP12',
  'LP24',
  'BP12',
  'BP24',
  'HP12',
  'HP24',
];

export const VCA_DRONE: readonly string[] = ['Off', 'On'];

/** Discrete options per param id. Params absent here are continuous. */
export const DISCRETE_OPTIONS: Readonly<Record<string, readonly string[]>> = {
  'osc1-wave': WAVEFORMS,
  'osc2-wave': WAVEFORMS,
  'osc3-wave': WAVEFORMS,
  'osc4-wave': WAVEFORMS,
  'filter-mode': FILTER_MODES,
  'vca-drone': VCA_DRONE,
};

/** True if the param is a discrete selector with a known option list. */
export function isDiscrete(p: ParamDef): boolean {
  return p.id in DISCRETE_OPTIONS;
}

/** Number of options for a discrete param (0 if continuous). */
export function optionCount(p: ParamDef): number {
  return DISCRETE_OPTIONS[p.id]?.length ?? 0;
}

/** Options array for a discrete param (empty if continuous). */
export function optionsFor(p: ParamDef): readonly string[] {
  return DISCRETE_OPTIONS[p.id] ?? [];
}

/**
 * Band width the device uses: step = ceil(128 / N).
 * (Sweep-confirmed for filter mode N=6: bands start at 0/22/44/66/88/110.)
 */
export function bandStep(n: number): number {
  return Math.ceil(128 / n);
}

/**
 * Map a 7-bit CC value (0-127) to an option index.
 * Device formula: index = min(N-1, floor(value / step)).
 */
export function valueToOptionIndex(p: ParamDef, value: number): number {
  const n = optionCount(p);
  if (n <= 0) return 0;
  const v = Math.max(0, Math.min(127, Math.trunc(value) || 0));
  const step = bandStep(n);
  return Math.min(n - 1, Math.floor(v / step));
}

/**
 * Map an option index to a safe mid-band CC value (0-127) guaranteed to land in that
 * option's band: band_start + floor(step / 2).
 */
export function optionIndexToValue(p: ParamDef, index: number): number {
  const n = optionCount(p);
  if (n <= 0) return 0;
  const i = Math.max(0, Math.min(n - 1, Math.trunc(index) || 0));
  const step = bandStep(n);
  return Math.max(0, Math.min(127, i * step + Math.floor(step / 2)));
}
