// src/midi/scales.ts
// Per-parameter display scales. Lets a slider operate in real units (e.g. ms) with a
// non-linear (exponential) mapping to the raw CC value, so the control feels perceptually
// even and matches the device's actual (exponential) time curves.
//
// Ranges are firmware-derived (firmware-re/findings-units-time.md). Delay Time is HIGH
// confidence; envelope/reverb/vibrato ranges are approximate (tables found, CC-attribution
// not code-confirmed) — but because the slider always spans the full CC range (displayMax -> ccMax),
// an approximate endpoint only affects the *label*, never the reachable CC range.

import type { ParamDef } from './ccMap';

export interface ParamScale {
  /** Display unit shown next to the value (e.g. "ms"). */
  unit: string;
  /** Slider min/max/step in display units. */
  displayMin: number;
  displayMax: number;
  step: number;
  /** Convert a CC value (0..nativeMax) to a display value. */
  toDisplay: (ccValue: number, p: ParamDef) => number;
  /** Convert a display value to a CC value (0..nativeMax), clamped. */
  toCC: (displayValue: number, p: ParamDef) => number;
}

function nativeMax(p: ParamDef): number {
  return p.highRes ? 16383 : 127;
}

/**
 * Exponential time scale in milliseconds: ms = minMs * (maxMs/minMs)^(cc/ccMax).
 * This is the inverse of the device's exponential time curves, giving a slider that is
 * linear in TIME (more resolution at short times, where it matters).
 */
export function expTime(minMs: number, maxMs: number): ParamScale {
  const ratio = maxMs / minMs;
  const logR = Math.log(ratio);
  return {
    unit: 'ms',
    displayMin: minMs,
    displayMax: maxMs,
    step: maxMs > 200 ? 1 : 0.1,
    toDisplay: (cc, p) => {
      const ccMax = nativeMax(p);
      const n = Math.max(0, Math.min(1, cc / ccMax));
      return minMs * Math.pow(ratio, n);
    },
    toCC: (ms, p) => {
      const ccMax = nativeMax(p);
      const m = Math.max(minMs, Math.min(maxMs, ms));
      const n = Math.log(m / minMs) / logR;
      return Math.max(0, Math.min(ccMax, Math.round(n * ccMax)));
    },
  };
}

/** Scales per param id. Params absent here use the raw 0..max slider. */
export const SCALES: Readonly<Record<string, ParamScale>> = {
  'delay-time': expTime(5, 680), // HIGH confidence (firmware breakpoints 21/64/149/341/683 ms)
  'vca-attack': expTime(0.2, 43), // approx
  'vca-decay': expTime(32, 1365), // approx
  'filter-env-attack': expTime(0.2, 43), // approx
  'filter-env-decay': expTime(32, 1365), // approx
  'reverb-decay': expTime(128, 1195), // approx
  'vibrato-delay': expTime(1, 19), // approx
  // Note: glide-rate excluded — firmware table is ambiguous (rate vs time).
};

/** The scale for a param, or undefined if it uses a raw slider. */
export function scaleFor(p: ParamDef): ParamScale | undefined {
  return SCALES[p.id];
}

/** True if the param has a non-linear display scale. */
export function hasScale(p: ParamDef): boolean {
  return p.id in SCALES;
}

/**
 * Default linear percent scale (0-100% integer) for continuous params with no known real unit.
 * Snaps to whole percent values. The CC value is derived from the integer percent, so
 * very fine 14-bit granularity is traded for a clean whole-number UX (per request).
 */
export function percentFor(p: ParamDef): ParamScale {
  const max = nativeMax(p);
  return {
    unit: '%',
    displayMin: 0,
    displayMax: 100,
    step: 1,
    toDisplay: (cc) => Math.round((cc / max) * 100),
    toCC: (pct) => Math.max(0, Math.min(max, Math.round((pct / 100) * max))),
  };
}

/** Resolve the effective scale for a continuous param: time (ms) if known, else percent. */
export function effectiveScale(p: ParamDef): ParamScale {
  return SCALES[p.id] ?? percentFor(p);
}
