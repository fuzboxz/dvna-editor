// src/midi/encode.test.ts
import { describe, it, expect } from 'vitest';
import { decode14, split14, encodeParam } from './encode';
import { PARAM_BY_ID } from './ccMap';

describe('14-bit split / decode round-trip', () => {
  it('split14 then decode14 is identity across the range', () => {
    for (const v of [0, 1, 127, 128, 8191, 8192, 16382, 16383]) {
      const { msb, lsb } = split14(v);
      expect(decode14(msb, lsb)).toBe(v);
    }
  });
  it('split14 produces 7-bit components', () => {
    const { msb, lsb } = split14(16383);
    expect(msb).toBe(127);
    expect(lsb).toBe(127);
    expect(msb).toBeLessThanOrEqual(127);
    expect(lsb).toBeLessThanOrEqual(127);
  });
  it('decode14 clamps its inputs', () => {
    expect(decode14(200, 200)).toBe(16383);
    expect(decode14(-1, -1)).toBe(0);
  });
});

describe('encodeParam', () => {
  it('encodes a 7-bit param as a single CC on its MSB controller', () => {
    const osc1 = PARAM_BY_ID.get('osc1-wave')!;
    expect(osc1.highRes).toBe(false);
    const msgs = encodeParam(osc1, 42);
    expect(msgs).toEqual([{ controller: 110, value: 42 }]);
  });

  it('clamps a 7-bit param value', () => {
    const osc1 = PARAM_BY_ID.get('osc1-wave')!;
    expect(encodeParam(osc1, 200)).toEqual([{ controller: 110, value: 127 }]);
    expect(encodeParam(osc1, -5)).toEqual([{ controller: 110, value: 0 }]);
    expect(encodeParam(osc1, NaN)).toEqual([{ controller: 110, value: 0 }]);
  });

  it('encodes a 14-bit param as MSB then LSB, in that order', () => {
    const cutoff = PARAM_BY_ID.get('filter-cutoff')!; // msb 15, lsb 47
    expect(cutoff.highRes).toBe(true);
    const msgs = encodeParam(cutoff, 16383);
    expect(msgs).toEqual([
      { controller: 15, value: 127 }, // MSB first
      { controller: 47, value: 127 }, // LSB second
    ]);
  });

  it('14-bit encoding matches split14', () => {
    const shape = PARAM_BY_ID.get('shape')!; // msb 3, lsb 35
    const value = 5000;
    const { msb, lsb } = split14(value);
    const msgs = encodeParam(shape, value);
    expect(msgs[0]).toEqual({ controller: 3, value: msb });
    expect(msgs[1]).toEqual({ controller: 35, value: lsb });
  });

  it('clamps a 14-bit param value', () => {
    const cutoff = PARAM_BY_ID.get('filter-cutoff')!;
    expect(encodeParam(cutoff, 99999)).toEqual([
      { controller: 15, value: 127 },
      { controller: 47, value: 127 },
    ]);
    expect(encodeParam(cutoff, -10)).toEqual([
      { controller: 15, value: 0 },
      { controller: 47, value: 0 },
    ]);
  });
});
