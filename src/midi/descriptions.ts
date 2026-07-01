// src/midi/descriptions.ts
// Human-readable description for every parameter (sourced from the DVNA User's Guide).
// Shown in the UI under each parameter name.

import type { ParamDef } from './ccMap';

export const DESCRIPTIONS: Readonly<Record<string, string>> = {
  'osc1-wave': 'Waveform for oscillator 1: off, sine, triangle, saw, rectangle, or variable types (wavefolder, variable-slope, pulse-width, pulse train, wavetable).',
  'osc2-wave': 'Waveform for oscillator 2 (same options as osc 1).',
  'osc3-wave': 'Waveform for oscillator 3 (same options as osc 1).',
  'osc4-wave': 'Waveform for oscillator 4 (same options as osc 1).',
  shape: 'Adjusts the variable attribute of the selected waveform (wavefolder gain, triangle tilt, saw morph, or pulse width).',
  'shape-lfo-phase': 'Phase offset of the shape-modulation LFO across the four oscillators.',
  'shape-lfo-speed': 'Rate of the shape modulation LFO. (Clock-sync sets a ratio.)',
  'shape-lfo-depth': 'Modulation amount applied to Shape.',

  'fm-master': 'Selects which oscillator is the FM modulator (its output feeds the frequency of the others).',
  'fm-amount-1': 'FM depth applied to carrier oscillator 1. Higher = brighter, more complex.',
  'fm-amount-2': 'FM depth applied to carrier oscillator 2.',
  'fm-amount-3': 'FM depth applied to carrier oscillator 3.',

  'level-morph-index': 'Index into the predefined level-variation table across all four oscillators.',
  'level-morph-intensity': 'Blend of the selected level variation into the mix. Min = levels unaltered.',
  'level-morph-lfo-speed': 'Rate of the Level Morph LFO.',
  'level-morph-lfo-depth': 'Modulation amount applied to Level Morph.',
  'pan-morph-index': 'Index into the predefined panoramic (left/right) distribution table.',
  'pan-morph-intensity': 'Maximum stereo spread. Min = mono center; max = full L-R separation.',
  'pan-morph-lfo-speed': 'Rate of the Pan Morph LFO.',
  'pan-morph-lfo-depth': 'Modulation amount applied to Pan Morph.',

  'glide-rate': 'Portamento time between consecutive notes.',
  'vibrato-delay': 'Rise time for vibrato to reach full depth after a note is triggered.',
  'vibrato-speed': 'Rate of the vibrato LFO.',
  'vibrato-level': 'Depth of pitch modulation from the vibrato LFO.',

  'filter-cutoff': 'Corner frequency of the stereo (dual) filter.',
  'filter-resonance': 'Emphasis at the cutoff frequency. Self-oscillates at high values.',
  'filter-mode': 'Filter response type: LP12/24, BP12/24, HP12/24.',
  'filter-lfo-spread': 'Phase offset between the dual (L/R) filter LFOs for stereo movement.',
  'filter-lfo-speed': 'Rate of the Filter LFO.',
  'filter-lfo-depth': 'Modulation intensity applied to the cutoff.',
  'filter-env-attack': 'Filter envelope attack duration (linear rise).',
  'filter-env-decay': 'Filter envelope decay (AD/Looping) or release (ASR) duration (exponential).',
  'filter-env-amount': 'Modulation intensity applied to the cutoff.',

  drive: 'Soft-clipping overdrive on the stereo signal (tanh-like).',

  'vca-attack': 'VCA envelope attack duration (linear rise).',
  'vca-decay': 'VCA envelope decay (AD/Looping) or release (ASR) duration (exponential).',
  'vca-drone': 'Forces the VCA fully open, bypassing the envelope (drone).',

  'reverb-mix': 'Reverb dry/wet mix. Midpoint = equal levels.',
  'reverb-diffusion': 'Diffusion ("Bokeh") of the reverberation.',
  'reverb-decay': 'Duration of the reverb tail.',
  'reverb-shade': 'Reverb tone. CW = brighter.',
  'delay-mix': 'Dry/wet blend of the delay.',
  'delay-time': 'Delay time (approx. 5 ms to 680 ms).',
  'delay-feedback': 'Repeat count. Self-oscillates at high values.',
  'delay-parameter': 'Mode-dependent: ping-pong ratio / Zenith buffer / Interval pitch shift.',
  'delay-lpf': 'Low-frequency content of the delayed signal (tone low / low-cut).',
  'delay-hpf': 'High-frequency content of the delayed signal (brightness).',
  'delay-mod-speed': 'Rate of the delay modulation LFO.',
  'delay-mod-depth': 'Delay modulation depth (chorus/flanger at short times).',
  'bit-grind': 'Bit-reduction amount (after the mixer, before the filter).',
  'bit-shift': 'Input offset applied before bit reduction (more pronounced effect).',
  'decimator-factor': 'Sample-rate reduction amount.',

  'master-volume': 'Global output level. Reduce if CLIP appears.',

  'arp-skip': 'Probability that a note in the arpeggiated sequence is omitted.',
  'arp-sync-ratio': 'Tempo ratio when the Master Clock is synced to MIDI clock.',
  'euclidean-beats': 'Number of active steps in the Euclidean pattern.',
};

/** The description for a param (empty string if none). */
export function describe(p: ParamDef): string {
  return DESCRIPTIONS[p.id] ?? '';
}
