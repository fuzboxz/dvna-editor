// src/midi/scales.test.ts
import { describe, it, expect } from 'vitest';
import { PARAM_BY_ID } from './ccMap';
import { scaleFor, hasScale, expTime, SCALES, percentFor, effectiveScale } from './scales';

describe('expTime scale', () => {
  const s = expTime(5, 680); // delay-like

  it('toDisplay maps endpoints correctly (min at cc 0, max at cc max)', () => {
    expect(s.toDisplay(0, PARAM_BY_ID.get('delay-time')!)).toBeCloseTo(5, 5);
    expect(s.toDisplay(16383, PARAM_BY_ID.get('delay-time')!)).toBeCloseTo(680, 5);
  });

  it('is monotonic increasing and exponential (midpoint is geometric mean, not arithmetic)', () => {
    const p = PARAM_BY_ID.get('delay-time')!;
    const mid = s.toDisplay(16383 / 2, p); // cc at half -> ms
    const geo = Math.sqrt(5 * 680); // ~58.3 ms
    expect(mid).toBeCloseTo(geo, 1);
    // exponential: half-way in cc is much less than half-way in ms (340)
    expect(mid).toBeLessThan(340);
  });

  it('round-trips toDisplay -> toCC back to the original cc', () => {
    const p = PARAM_BY_ID.get('delay-time')!;
    for (const cc of [0, 1, 100, 4000, 8191, 12000, 16382, 16383]) {
      const ms = s.toDisplay(cc, p);
      expect(s.toCC(ms, p)).toBe(cc);
    }
  });

  it('toCC clamps display values outside the range to the CC endpoints', () => {
    const p = PARAM_BY_ID.get('delay-time')!;
    expect(s.toCC(0.001, p)).toBe(0); // below min -> cc 0
    expect(s.toCC(100000, p)).toBe(16383); // above max -> cc max
  });

  it('works for 7-bit params (reverb decay, max 127)', () => {
    const p = PARAM_BY_ID.get('reverb-decay')!;
    const sc = scaleFor(p)!;
    expect(sc.toDisplay(0, p)).toBeCloseTo(128, 3);
    expect(sc.toDisplay(127, p)).toBeCloseTo(1195, 3);
    expect(sc.toCC(1195, p)).toBe(127);
  });
});

describe('scale registry', () => {
  it('has scales for the time params', () => {
    for (const id of [
      'delay-time',
      'vca-attack',
      'vca-decay',
      'filter-env-attack',
      'filter-env-decay',
      'reverb-decay',
      'vibrato-delay',
    ]) {
      expect(hasScale(PARAM_BY_ID.get(id)!)).toBe(true);
    }
  });

  it('does NOT scale continuous non-time params (e.g. cutoff, resonance)', () => {
    expect(hasScale(PARAM_BY_ID.get('filter-cutoff')!)).toBe(false);
    expect(hasScale(PARAM_BY_ID.get('filter-resonance')!)).toBe(false);
    expect(hasScale(PARAM_BY_ID.get('drive')!)).toBe(false);
  });

  it('every scaled param maps its full CC range to the labelled ms range', () => {
    for (const [id, sc] of Object.entries(SCALES)) {
      const p = PARAM_BY_ID.get(id)!;
      const ccMax = p.highRes ? 16383 : 127;
      expect(sc.toDisplay(0, p)).toBeCloseTo(sc.displayMin, 3);
      expect(sc.toDisplay(ccMax, p)).toBeCloseTo(sc.displayMax, 3);
      // full range reachable from display side
      expect(sc.toCC(sc.displayMax, p)).toBe(ccMax);
      expect(sc.toCC(sc.displayMin, p)).toBe(0);
    }
  });
});

describe('percent scale (default for continuous params without exact units)', () => {
  it('7-bit param: snaps to whole percent 0-100', () => {
    const p = PARAM_BY_ID.get('reverb-mix')!; // 7-bit continuous
    const sc = percentFor(p);
    expect(sc.unit).toBe('%');
    expect(sc.step).toBe(1);
    expect(sc.toDisplay(0, p)).toBe(0);
    expect(sc.toDisplay(127, p)).toBe(100);
    // every display value is an integer
    for (const cc of [0, 1, 32, 64, 100, 126, 127]) {
      const pct = sc.toDisplay(cc, p);
      expect(Number.isInteger(pct)).toBe(true);
      // round-trips within 1 CC unit
      expect(Math.abs(sc.toCC(pct, p) - cc)).toBeLessThanOrEqual(1);
    }
  });

  it('14-bit param: also whole percent 0-100', () => {
    const p = PARAM_BY_ID.get('filter-cutoff')!; // 14-bit
    const sc = percentFor(p);
    expect(sc.step).toBe(1);
    expect(sc.toDisplay(0, p)).toBe(0);
    expect(sc.toDisplay(16383, p)).toBe(100);
    expect(sc.toCC(100, p)).toBe(16383);
    expect(sc.toCC(50, p)).toBe(8192);
    expect(Number.isInteger(sc.toDisplay(8191, p))).toBe(true);
  });

  it('percent clamps out-of-range input', () => {
    const p = PARAM_BY_ID.get('reverb-mix')!; // 7-bit
    const sc = percentFor(p);
    expect(sc.toCC(-50, p)).toBe(0);
    expect(sc.toCC(9999, p)).toBe(127);
  });
});

describe('effectiveScale', () => {
  it('returns the time (ms) scale for scaled params', () => {
    const p = PARAM_BY_ID.get('delay-time')!;
    expect(effectiveScale(p).unit).toBe('ms');
  });

  it('falls back to percent for other continuous params', () => {
    expect(effectiveScale(PARAM_BY_ID.get('filter-cutoff')!).unit).toBe('%');
    expect(effectiveScale(PARAM_BY_ID.get('drive')!).unit).toBe('%');
    expect(effectiveScale(PARAM_BY_ID.get('master-volume')!).unit).toBe('%');
  });
});
