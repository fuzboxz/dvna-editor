import { describe, it, expect } from 'vitest';
import {
  PRESET_FORMAT,
  PRESET_VERSION,
  MAX_PRESET_BYTES,
  buildPreset,
  serializePreset,
  parsePreset,
  parsePresetJson,
  sanitizeValues,
  toFileName,
  PresetParseError,
} from './preset-file';
import { PARAMS } from '../midi/ccMap';
import { clampForRange, defaultForRange } from '../midi/clamp';

describe('sanitizeValues', () => {
  it('returns a complete value for every known param', () => {
    const out = sanitizeValues({});
    expect(Object.keys(out).sort()).toEqual(PARAMS.map((p) => p.id).sort());
  });

  it('defaults missing params to their neutral value', () => {
    const out = sanitizeValues({});
    for (const p of PARAMS) expect(out[p.id]).toBe(defaultForRange(p.highRes));
  });

  it('clamps out-of-range values into range', () => {
    const seven = PARAMS.find((p) => !p.highRes)!;
    const hi = PARAMS.find((p) => p.highRes)!;
    expect(sanitizeValues({ [seven.id]: 9999 })[seven.id]).toBe(127);
    expect(sanitizeValues({ [seven.id]: -50 })[seven.id]).toBe(0);
    expect(sanitizeValues({ [hi.id]: 99999 })[hi.id]).toBe(16383);
    expect(sanitizeValues({ [hi.id]: -10 })[hi.id]).toBe(0);
  });

  it('truncates fractional values and drops unknown keys', () => {
    const seven = PARAMS.find((p) => !p.highRes)!;
    const out = sanitizeValues({ [seven.id]: 64.7, 'bogus': 1 });
    expect(out[seven.id]).toBe(64);
    expect('bogus' in out).toBe(false);
  });

  it('falls back to default for non-numeric / non-finite input', () => {
    const p = PARAMS.find((x) => !x.highRes)!;
    expect(sanitizeValues({ [p.id]: 'x' as unknown as number })[p.id]).toBe(defaultForRange(p.highRes));
    expect(sanitizeValues({ [p.id]: NaN })[p.id]).toBe(defaultForRange(p.highRes));
    expect(sanitizeValues({ [p.id]: Infinity })[p.id]).toBe(defaultForRange(p.highRes));
  });
});

describe('buildPreset / serializePreset round-trip', () => {
  it('builds a well-formed preset with clamped values', () => {
    const p = buildPreset('  Pluck  ', { 'reverb-mix': 9999 });
    expect(p.format).toBe(PRESET_FORMAT);
    expect(p.version).toBe(PRESET_VERSION);
    expect(p.name).toBe('Pluck');
    expect(p.values['reverb-mix']).toBe(127);
    expect(Object.keys(p.values).length).toBe(PARAMS.length);
  });

  it('serialize -> parse is a clean round-trip', () => {
    const original = buildPreset('Echo', { 'reverb-mix': 100, 'filter-cutoff': 8192 });
    const json = serializePreset(original);
    const back = parsePresetJson(json);
    expect(back.format).toBe(original.format);
    expect(back.version).toBe(original.version);
    expect(back.name).toBe(original.name);
    expect(back.values).toEqual(original.values);
  });
});

describe('parsePreset (strict validation)', () => {
  it('rejects non-objects', () => {
    expect(() => parsePreset(null)).toThrow(PresetParseError);
    expect(() => parsePreset(42)).toThrow(PresetParseError);
    expect(() => parsePreset('hi')).toThrow(PresetParseError);
    expect(() => parsePreset([1, 2, 3])).toThrow(PresetParseError);
  });

  it('rejects wrong format / version', () => {
    expect(() => parsePreset({ format: 'other', version: 1 })).toThrow(PresetParseError);
    expect(() => parsePreset({ format: PRESET_FORMAT, version: 99 })).toThrow(PresetParseError);
  });

  it('rejects missing values object', () => {
    expect(() =>
      parsePreset({ format: PRESET_FORMAT, version: PRESET_VERSION }),
    ).toThrow(PresetParseError);
    expect(() =>
      parsePreset({ format: PRESET_FORMAT, version: PRESET_VERSION, values: 5 }),
    ).toThrow(PresetParseError);
  });

  it('accepts a preset without a name (defaults to empty/untitled)', () => {
    const p = parsePreset({
      format: PRESET_FORMAT,
      version: PRESET_VERSION,
      values: { 'reverb-mix': 50 },
    });
    expect(p.values['reverb-mix']).toBe(50);
  });

  it('clamps hostile values instead of rejecting (defense in depth)', () => {
    const p = parsePreset({
      format: PRESET_FORMAT,
      version: PRESET_VERSION,
      name: 'x',
      values: { 'reverb-mix': -1000, 'filter-cutoff': 999999 },
    });
    expect(p.values['reverb-mix']).toBe(0);
    expect(p.values['filter-cutoff']).toBe(16383);
  });

  it('rejects oversized value maps', () => {
    const huge: Record<string, number> = {};
    for (let i = 0; i < PARAMS.length * 4 + 5; i++) huge[`k${i}`] = 1;
    expect(() =>
      parsePreset({ format: PRESET_FORMAT, version: PRESET_VERSION, values: huge }),
    ).toThrow(PresetParseError);
  });
});

describe('parsePresetJson', () => {
  it('rejects invalid JSON', () => {
    expect(() => parsePresetJson('{not json')).toThrow(PresetParseError);
  });

  it('rejects oversized payloads', () => {
    const huge = 'x'.repeat(MAX_PRESET_BYTES + 1);
    expect(() => parsePresetJson(huge)).toThrow(PresetParseError);
  });

  it('parses a valid JSON string', () => {
    const json = serializePreset(buildPreset('Test', {}));
    const p = parsePresetJson(json);
    expect(p.name).toBe('Test');
  });
});

describe('toFileName', () => {
  it('strips path separators and appends .json', () => {
    expect(toFileName('My / Patch: *?')).toBe('My  Patch.json');
  });

  it('falls back to untitled.json for empty names', () => {
    expect(toFileName('   ')).toBe('untitled.json');
  });

  it('strips leading dots', () => {
    expect(toFileName('..hidden')).toBe('hidden.json');
  });
});
