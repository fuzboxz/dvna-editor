// src/midi/clamp.test.ts
import { describe, it, expect } from 'vitest';
import { clamp7, clamp14, clampChannel, isValid7, isValid14 } from './clamp';

describe('clamp7', () => {
  it('passes through in-range integers', () => {
    expect(clamp7(0)).toBe(0);
    expect(clamp7(64)).toBe(64);
    expect(clamp7(127)).toBe(127);
  });
  it('clamps above the max', () => {
    expect(clamp7(128)).toBe(127);
    expect(clamp7(9999)).toBe(127);
  });
  it('clamps below zero', () => {
    expect(clamp7(-1)).toBe(0);
    expect(clamp7(-100)).toBe(0);
  });
  it('truncates floats toward zero', () => {
    expect(clamp7(63.9)).toBe(63);
    expect(clamp7(0.99)).toBe(0);
  });
  it('coerces non-numbers safely to 0', () => {
    expect(clamp7(NaN)).toBe(0);
    expect(clamp7(Infinity)).toBe(127);
    expect(clamp7(-Infinity)).toBe(0);
    // Secure-by-default: non-number inputs (even numeric strings) are treated as
    // an invalid value -> safe zero, never implicitly parsed.
    // @ts-expect-error runtime guard against bad input
    expect(clamp7('50')).toBe(0);
    // @ts-expect-error runtime guard against bad input
    expect(clamp7(undefined)).toBe(0);
    // @ts-expect-error runtime guard against bad input
    expect(clamp7(null)).toBe(0);
  });
});

describe('clamp14', () => {
  it('passes through in-range integers', () => {
    expect(clamp14(0)).toBe(0);
    expect(clamp14(8191)).toBe(8191);
    expect(clamp14(16383)).toBe(16383);
  });
  it('clamps to [0, 16383]', () => {
    expect(clamp14(-5)).toBe(0);
    expect(clamp14(16384)).toBe(16383);
    expect(clamp14(1_000_000)).toBe(16383);
  });
  it('coerces NaN to 0', () => {
    expect(clamp14(NaN)).toBe(0);
  });
});

describe('clampChannel', () => {
  it('clamps to [0, 15]', () => {
    expect(clampChannel(0)).toBe(0);
    expect(clampChannel(15)).toBe(15);
    expect(clampChannel(16)).toBe(15);
    expect(clampChannel(-3)).toBe(0);
  });
});

describe('isValid7 / isValid14', () => {
  it('isValid7', () => {
    expect(isValid7(0)).toBe(true);
    expect(isValid7(127)).toBe(true);
    expect(isValid7(128)).toBe(false);
    expect(isValid7(-1)).toBe(false);
    expect(isValid7(1.5)).toBe(false);
    expect(isValid7(NaN)).toBe(false);
  });
  it('isValid14', () => {
    expect(isValid14(0)).toBe(true);
    expect(isValid14(16383)).toBe(true);
    expect(isValid14(16384)).toBe(false);
    expect(isValid14(NaN)).toBe(false);
  });
});
