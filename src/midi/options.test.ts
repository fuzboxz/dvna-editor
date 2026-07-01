// src/midi/options.test.ts
import { describe, it, expect } from 'vitest';
import { PARAMS, PARAM_BY_ID } from './ccMap';
import {
  isDiscrete,
  optionCount,
  optionsFor,
  valueToOptionIndex,
  optionIndexToValue,
  WAVEFORMS,
  FILTER_MODES,
  VCA_DRONE,
} from './options';

describe('discrete metadata', () => {
  it('marks the known discrete params', () => {
    expect(isDiscrete(PARAM_BY_ID.get('filter-mode')!)).toBe(true);
    expect(isDiscrete(PARAM_BY_ID.get('osc1-wave')!)).toBe(true);
    expect(isDiscrete(PARAM_BY_ID.get('vca-drone')!)).toBe(true);
    // A continuous param is not discrete.
    expect(isDiscrete(PARAM_BY_ID.get('filter-cutoff')!)).toBe(false);
  });

  it('has the sweep-confirmed counts', () => {
    expect(optionCount(PARAM_BY_ID.get('filter-mode')!)).toBe(6);
    expect(optionCount(PARAM_BY_ID.get('osc1-wave')!)).toBe(11);
    expect(optionCount(PARAM_BY_ID.get('vca-drone')!)).toBe(2);
  });

  it('option lists match sweep', () => {
    expect(optionsFor(PARAM_BY_ID.get('filter-mode')!)).toEqual(FILTER_MODES);
    expect(optionsFor(PARAM_BY_ID.get('osc1-wave')!)).toEqual(WAVEFORMS);
    expect(optionsFor(PARAM_BY_ID.get('vca-drone')!)).toEqual(VCA_DRONE);
  });

  it('all 4 oscillators share the waveform list', () => {
    for (const id of ['osc1-wave', 'osc2-wave', 'osc3-wave', 'osc4-wave']) {
      expect(optionsFor(PARAM_BY_ID.get(id)!)).toEqual(WAVEFORMS);
    }
  });
});

describe('even banding (value <-> option index)', () => {
  it('filter mode: 0->LP12, 22->LP24, 44->BP12, 66->BP24, 88->HP12, 110->HP24 (sweep-confirmed)', () => {
    const p = PARAM_BY_ID.get('filter-mode')!;
    expect(valueToOptionIndex(p, 0)).toBe(0);
    expect(valueToOptionIndex(p, 21)).toBe(0);
    expect(valueToOptionIndex(p, 22)).toBe(1);
    expect(valueToOptionIndex(p, 43)).toBe(1);
    expect(valueToOptionIndex(p, 44)).toBe(2);
    expect(valueToOptionIndex(p, 66)).toBe(3);
    expect(valueToOptionIndex(p, 88)).toBe(4);
    expect(valueToOptionIndex(p, 110)).toBe(5);
    expect(valueToOptionIndex(p, 127)).toBe(5);
  });

  it('midpoint send-values land in the correct band (round-trip) for every discrete param', () => {
    for (const p of PARAMS) {
      if (!isDiscrete(p)) continue;
      const n = optionCount(p);
      for (let i = 0; i < n; i++) {
        const sendValue = optionIndexToValue(p, i);
        expect(sendValue).toBeGreaterThanOrEqual(0);
        expect(sendValue).toBeLessThanOrEqual(127);
        expect(valueToOptionIndex(p, sendValue)).toBe(i);
      }
    }
  });

  it('optionIndexToValue clamps out-of-range indices', () => {
    const p = PARAM_BY_ID.get('filter-mode')!;
    expect(optionIndexToValue(p, -5)).toBe(optionIndexToValue(p, 0));
    expect(optionIndexToValue(p, 999)).toBe(optionIndexToValue(p, 5));
  });

  it('valueToOptionIndex clamps out-of-range values', () => {
    const p = PARAM_BY_ID.get('osc1-wave')!;
    expect(valueToOptionIndex(p, -10)).toBe(0);
    expect(valueToOptionIndex(p, 999)).toBe(optionCount(p) - 1);
    expect(valueToOptionIndex(p, NaN)).toBe(0);
  });

  it('continuous params: helpers return safe defaults', () => {
    const p = PARAM_BY_ID.get('filter-cutoff')!;
    expect(optionCount(p)).toBe(0);
    expect(isDiscrete(p)).toBe(false);
    expect(valueToOptionIndex(p, 64)).toBe(0);
    expect(optionIndexToValue(p, 3)).toBe(0);
  });

  it('drone: 0 -> Off, 127 -> On', () => {
    const p = PARAM_BY_ID.get('vca-drone')!;
    expect(valueToOptionIndex(p, 0)).toBe(0);
    expect(valueToOptionIndex(p, 127)).toBe(1);
    expect(optionsFor(p)[valueToOptionIndex(p, optionIndexToValue(p, 1))]).toBe('On');
  });
});
