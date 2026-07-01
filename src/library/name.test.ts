import { describe, it, expect } from 'vitest';
import { sanitizeName, isValidName, MAX_PRESET_NAME } from './name';

describe('sanitizeName', () => {
  it('trims surrounding whitespace', () => {
    expect(sanitizeName('  pluck  ')).toBe('pluck');
  });

  it('strips C0 control characters and DEL', () => {
    expect(sanitizeName('a\tb\nc\x00d\x1fe\x7F')).toBe('abcde');
  });

  it('caps length to MAX_PRESET_NAME', () => {
    const long = 'x'.repeat(MAX_PRESET_NAME + 50);
    expect(sanitizeName(long).length).toBe(MAX_PRESET_NAME);
  });

  it('returns empty string for non-strings', () => {
    expect(sanitizeName(123 as unknown as string)).toBe('');
    expect(sanitizeName(null as unknown as string)).toBe('');
    expect(sanitizeName(undefined as unknown as string)).toBe('');
  });

  it('preserves unicode/emoji (not control chars)', () => {
    expect(sanitizeName('bäss ♪ 🔥')).toBe('bäss ♪ 🔥');
  });
});

describe('isValidName', () => {
  it('true for non-empty sanitized names', () => {
    expect(isValidName('pluck')).toBe(true);
    expect(isValidName('  pluck ')).toBe(true);
  });

  it('false for empty / whitespace-only / control-only input', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('    ')).toBe(false);
    expect(isValidName('\x00\x01')).toBe(false);
  });
});
