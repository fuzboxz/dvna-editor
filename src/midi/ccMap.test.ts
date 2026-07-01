// src/midi/ccMap.test.ts
import { describe, it, expect } from 'vitest';
import { PARAMS, PARAM_BY_ID, PARAM_GROUPS, paramsInGroup, type ParamDef } from './ccMap';

describe('PARAMS integrity', () => {
  it('has the expected parameter count (56)', () => {
    expect(PARAMS.length).toBe(56);
  });

  it('every MSB and LSB is in [0, 127]', () => {
    for (const p of PARAMS) {
      expect(p.msb).toBeGreaterThanOrEqual(0);
      expect(p.msb).toBeLessThanOrEqual(127);
      if (p.lsb !== null) {
        expect(p.lsb).toBeGreaterThanOrEqual(0);
        expect(p.lsb).toBeLessThanOrEqual(127);
      }
    }
  });

  it('highRes is consistent with lsb presence', () => {
    for (const p of PARAMS) {
      expect(p.highRes).toBe(p.lsb !== null);
    }
  });

  it('a param never shares its MSB with its own LSB', () => {
    for (const p of PARAMS) {
      if (p.lsb !== null) expect(p.lsb).not.toBe(p.msb);
    }
  });

  it('all MSB controllers are unique', () => {
    const msbs = PARAMS.map((p) => p.msb);
    expect(new Set(msbs).size).toBe(msbs.length);
  });

  it('all LSB controllers are unique', () => {
    const lsbs = PARAMS.map((p) => p.lsb).filter((v): v is number => v !== null);
    expect(new Set(lsbs).size).toBe(lsbs.length);
  });

  it('all ids are unique slugs', () => {
    const ids = PARAMS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9-]+$/);
  });

  it('every param belongs to a known group', () => {
    const known = new Set(PARAM_GROUPS.map((g) => g.id));
    for (const p of PARAMS) expect(known.has(p.group)).toBe(true);
  });

  it('definitions are frozen (immutable)', () => {
    const first = PARAMS[0] as ParamDef;
    expect(() => {
      // @ts-expect-error mutating a readonly field
      first.msb = 0;
    }).toThrow();
  });
});

describe('PARAM_BY_ID', () => {
  it('indexes every parameter', () => {
    for (const p of PARAMS) expect(PARAM_BY_ID.get(p.id)).toBe(p);
  });
  it('returns undefined for unknown ids', () => {
    expect(PARAM_BY_ID.get('does-not-exist')).toBeUndefined();
  });
});

describe('paramsInGroup', () => {
  it('returns the subset for a group', () => {
    const drive = paramsInGroup('drive');
    expect(drive.map((p) => p.id)).toEqual(['drive']);
  });
  it('every group has at least one param', () => {
    for (const g of PARAM_GROUPS) {
      expect(paramsInGroup(g.id).length).toBeGreaterThan(0);
    }
  });
});
