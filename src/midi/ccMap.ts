// src/midi/ccMap.ts
// The complete DVNA MIDI CC parameter table (from the official MIDI CC chart).
// Every parameter is normalized at definition time: MSB/LSB clamped to [0,127].
// See implementation-plan.md slice 1.1.

import { clamp7 } from './clamp';

export type ParamGroup =
  | 'osc'
  | 'fm'
  | 'morph'
  | 'voice'
  | 'filter'
  | 'drive'
  | 'vca'
  | 'fx'
  | 'master'
  | 'arp';

export interface ParamDef {
  /** Stable machine id (slug). */
  readonly id: string;
  /** Human-readable label. */
  readonly name: string;
  /** UI grouping. */
  readonly group: ParamGroup;
  /** MSB (Most Significant Byte) CC number, 0-127. */
  readonly msb: number;
  /** LSB CC number for 14-bit params, or null for 7-bit-only params. */
  readonly lsb: number | null;
  /** True when this param supports 14-bit (LSB present). */
  readonly highRes: boolean;
}

export interface ParamGroupInfo {
  readonly id: ParamGroup;
  readonly label: string;
}

/** Build a ParamDef, deriving `highRes` and clamping CC numbers defensively. */
function p(
  id: string,
  name: string,
  group: ParamGroup,
  msb: number,
  lsb: number | null,
): ParamDef {
  return Object.freeze({
    id,
    name,
    group,
    msb: clamp7(msb),
    lsb: lsb === null ? null : clamp7(lsb),
    highRes: lsb !== null,
  });
}

/** UI group labels, in display order (ARP first per UX request). */
export const PARAM_GROUPS: readonly ParamGroupInfo[] = [
  { id: 'arp', label: 'Arp / Euclidean' },
  { id: 'osc', label: 'Oscillators & Shape' },
  { id: 'fm', label: 'FM' },
  { id: 'morph', label: 'Morph' },
  { id: 'voice', label: 'Glide & Vibrato' },
  { id: 'filter', label: 'Filter' },
  { id: 'drive', label: 'Drive' },
  { id: 'vca', label: 'VCA' },
  { id: 'fx', label: 'FX (Reverb / Delay / Crush)' },
  { id: 'master', label: 'Master' },
];

/** All DVNA parameters, in CC-chart order. Frozen + read-only. */
export const PARAMS: readonly ParamDef[] = Object.freeze([
  // --- Oscillators & Shape ---
  p('osc1-wave', 'Oscillator #1 Waveform', 'osc', 110, null),
  p('osc2-wave', 'Oscillator #2 Waveform', 'osc', 111, null),
  p('osc3-wave', 'Oscillator #3 Waveform', 'osc', 112, null),
  p('osc4-wave', 'Oscillator #4 Waveform', 'osc', 113, null),
  p('shape', 'Shape', 'osc', 3, 35),
  p('shape-lfo-phase', 'Shape LFO Phase', 'osc', 64, null),
  p('shape-lfo-speed', 'Shape LFO Speed', 'osc', 5, 37),
  p('shape-lfo-depth', 'Shape LFO Depth', 'osc', 7, 39),

  // --- FM ---
  p('fm-master', 'FM Master Oscillator', 'fm', 114, null),
  p('fm-amount-1', 'FM Amount #1', 'fm', 8, 40),
  p('fm-amount-2', 'FM Amount #2', 'fm', 9, 41),
  p('fm-amount-3', 'FM Amount #3', 'fm', 10, 42),

  // --- Morph ---
  p('level-morph-index', 'Level Morph Index', 'morph', 11, 43),
  p('level-morph-intensity', 'Level Morph Intensity', 'morph', 65, null),
  p('level-morph-lfo-speed', 'Level Morph LFO Speed', 'morph', 66, null),
  p('level-morph-lfo-depth', 'Level Morph LFO Depth', 'morph', 12, 44),
  p('pan-morph-index', 'Pan. Morph Index', 'morph', 13, 45),
  p('pan-morph-intensity', 'Pan. Morph Intensity', 'morph', 67, null),
  p('pan-morph-lfo-speed', 'Pan. Morph LFO Speed', 'morph', 68, null),
  p('pan-morph-lfo-depth', 'Pan. Morph LFO Depth', 'morph', 14, 46),

  // --- Glide & Vibrato ---
  p('glide-rate', 'Glide Rate', 'voice', 69, null),
  p('vibrato-delay', 'Vibrato Delay', 'voice', 89, null),
  p('vibrato-speed', 'Vibrato Speed', 'voice', 90, null),
  p('vibrato-level', 'Vibrato Level', 'voice', 91, null),

  // --- Filter ---
  p('filter-cutoff', 'Filter Cutoff Frequency', 'filter', 15, 47),
  p('filter-resonance', 'Filter Resonance', 'filter', 16, 48),
  p('filter-mode', 'Filter Mode', 'filter', 117, null),
  p('filter-lfo-spread', 'Filter LFO Spread', 'filter', 93, null),
  p('filter-lfo-speed', 'Filter LFO Speed', 'filter', 17, 49),
  p('filter-lfo-depth', 'Filter LFO Depth', 'filter', 94, null),
  p('filter-env-attack', 'Filter Envelope Attack', 'filter', 18, 50),
  p('filter-env-decay', 'Filter Envelope Decay/Release', 'filter', 19, 51),
  p('filter-env-amount', 'Filter Envelope Amount', 'filter', 95, null),

  // --- Drive ---
  p('drive', 'Drive', 'drive', 20, 52),

  // --- VCA ---
  p('vca-attack', 'VCA Attack', 'vca', 21, 53),
  p('vca-decay', 'VCA Decay/Release', 'vca', 22, 54),
  p('vca-drone', 'VCA Drone', 'vca', 118, null),

  // --- FX ---
  p('reverb-mix', 'Reverb Mix', 'fx', 78, null),
  p('reverb-diffusion', 'Reverb Diffusion', 'fx', 79, null),
  p('reverb-decay', 'Reverb Decay', 'fx', 80, null),
  p('reverb-shade', 'Reverb Shade', 'fx', 81, null),
  p('delay-mix', 'Delay Mix', 'fx', 82, null),
  p('delay-time', 'Delay Time', 'fx', 23, 55),
  p('delay-feedback', 'Delay Feedback', 'fx', 24, 56),
  p('delay-parameter', 'Delay Parameter', 'fx', 25, 57),
  p('delay-lpf', 'Delay LPF', 'fx', 85, null),
  p('delay-hpf', 'Delay HPF', 'fx', 86, null),
  p('delay-mod-speed', 'Delay Mod Speed', 'fx', 83, null),
  p('delay-mod-depth', 'Delay Mod Depth', 'fx', 84, null),
  p('bit-grind', 'Bit Grind', 'fx', 87, null),
  p('bit-shift', 'Bit Shift', 'fx', 88, null),
  p('decimator-factor', 'Decimator Factor', 'fx', 119, null),

  // --- Master ---
  p('master-volume', 'Master Volume', 'master', 26, 58),

  // --- Arp / Euclidean ---
  p('arp-skip', 'Arp Skip', 'arp', 92, null),
  p('arp-sync-ratio', 'Arp Sync Ratio', 'arp', 115, null),
  p('euclidean-beats', 'Euclidean Beats', 'arp', 116, null),
]);

/** Quick lookup by id. */
export const PARAM_BY_ID: ReadonlyMap<string, ParamDef> = new Map(
  PARAMS.map((paramDef) => [paramDef.id, paramDef] as const),
);

/** Params belonging to a group, in defined order. */
export function paramsInGroup(group: ParamGroup): readonly ParamDef[] {
  return PARAMS.filter((paramDef) => paramDef.group === group);
}
