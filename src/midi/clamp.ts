// src/midi/clamp.ts
// Value-safety primitives. Every value that can reach the MIDI output is funneled
// through these so the device never receives an out-of-range byte.
// See design.md §8 (security posture #3: input clamping).

function toInt(v: number): number {
  if (Number.isFinite(v)) return Math.trunc(v);
  // Non-finite inputs: treat Infinity as an extreme high, -Infinity as extreme low,
  // and NaN as a safe zero. All are subsequently clamped to range.
  if (v === Infinity) return Number.MAX_SAFE_INTEGER;
  if (v === -Infinity) return -Number.MAX_SAFE_INTEGER;
  return 0; // NaN
}

/** Clamp a 7-bit CC value to [0, 127]. */
export function clamp7(v: number): number {
  return Math.min(127, Math.max(0, toInt(v)));
}

/** Clamp a 14-bit (hi-res) value to [0, 16383]. */
export function clamp14(v: number): number {
  return Math.min(16383, Math.max(0, toInt(v)));
}

/** Clamp a MIDI channel to [0, 15] (0-indexed). */
export function clampChannel(ch: number): number {
  return Math.min(15, Math.max(0, toInt(ch)));
}

/** Neutral default value for a range given its bit depth. */
export function defaultForRange(highRes: boolean): number {
  return highRes ? 8192 : 64;
}

/** Clamp a value to a range given its bit depth. */
export function clampForRange(value: number, highRes: boolean): number {
  return highRes ? clamp14(value) : clamp7(value);
}

/** True if the logical value is a valid 7-bit value. */
export function isValid7(v: number): boolean {
  return Number.isInteger(v) && v >= 0 && v <= 127;
}

/** True if the logical value is a valid 14-bit value. */
export function isValid14(v: number): boolean {
  return Number.isInteger(v) && v >= 0 && v <= 16383;
}
