// src/state/randomize.test.ts
import { describe, it, expect } from 'vitest';
import { PARAMS } from '../midi/ccMap';
import { randomizeOne, randomizeValues, nativeMax, isRandomizable, randomizeGroup } from './randomize';

describe('randomizeOne', () => {
  it('returns a value within [0, nativeMax] for every param', () => {
    for (const p of PARAMS) {
      const max = nativeMax(p);
      for (let i = 0; i < 50; i++) {
        const v = randomizeOne(p);
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(max);
      }
    }
  });

  it('produces integers only', () => {
    for (const p of PARAMS) {
      for (let i = 0; i < 20; i++) {
        expect(Number.isInteger(randomizeOne(p))).toBe(true);
      }
    }
  });

  it('can reach both ends of the range (eventually)', () => {
    // 7-bit params should be able to hit 0 and 127 within a reasonable sample.
    const seven = PARAMS.filter((p) => !p.highRes);
    const hit = new Set<number>();
    for (let i = 0; i < 4000 && (hit.size < 2 || !hit.has(0) || !hit.has(127)); i++) {
      hit.add(randomizeOne(seven[0]));
    }
    expect(hit.has(0)).toBe(true);
    expect(hit.has(127)).toBe(true);
  });
});

describe('randomizeValues', () => {
  it('returns an entry for every randomizable parameter (excludes master-volume)', () => {
    const vals = randomizeValues();
    const expected = PARAMS.filter((p) => isRandomizable(p)).map((p) => p.id).sort();
    expect(Object.keys(vals).sort()).toEqual(expected);
    expect('master-volume' in vals).toBe(false);
  });

  it('every value is within range', () => {
    const vals = randomizeValues();
    for (const p of PARAMS) {
      if (p.id in vals) {
        expect(vals[p.id]).toBeGreaterThanOrEqual(0);
        expect(vals[p.id]).toBeLessThanOrEqual(nativeMax(p));
      }
    }
  });

  it('is non-deterministic across calls (sanity)', () => {
    const a = randomizeValues();
    const b = randomizeValues();
    const diffs = PARAMS.filter((p) => a[p.id] !== b[p.id]).length;
    // Extremely unlikely all 56 are identical twice.
    expect(diffs).toBeGreaterThan(0);
  });
});

describe('randomizeGroup', () => {
  it('only includes randomizable params of that group', () => {
    const vals = randomizeGroup('drive');
    expect(Object.keys(vals)).toEqual(['drive']); // drive group has only 'drive'
  });

  it('respects exclusions (master group excludes master-volume)', () => {
    const vals = randomizeGroup('master');
    expect('master-volume' in vals).toBe(false);
    expect(Object.keys(vals)).toEqual([]);
  });

  it('covers every param of a multi-param group (filter) within range', () => {
    const vals = randomizeGroup('filter');
    const filterIds = PARAMS.filter((p) => p.group === 'filter').map((p) => p.id);
    expect(Object.keys(vals).sort()).toEqual(filterIds.sort());
    for (const p of PARAMS.filter((p) => p.group === 'filter')) {
      expect(vals[p.id]).toBeGreaterThanOrEqual(0);
      expect(vals[p.id]).toBeLessThanOrEqual(nativeMax(p));
    }
  });
});
