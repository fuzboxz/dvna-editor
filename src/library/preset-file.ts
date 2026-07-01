// src/library/preset-file.ts
// Presets are serialized JSON *files* (downloaded / uploaded), NOT an in-app DB.
// Pure module: serialize the current patch to a preset object, and strictly
// validate+sanitize incoming JSON before applying it. No DOM, no IndexedDB,
// no Svelte — so it is fully unit-testable.
//
// Security (design.md §8 #4 sanitization, #5 schema-validated import):
//   - Raw JSON is rejected wholesale on any structural problem.
//   - Byte-size cap before parse; entry-count cap on `values`.
//   - Every value is clamped to its param's range; unknown keys are dropped;
//     missing params fall back to their neutral default.

import { PARAMS } from '../midi/ccMap';
import { clampForRange, defaultForRange } from '../midi/clamp';
import { sanitizeName } from './name';

export const PRESET_FORMAT = 'dvna-preset';
export const PRESET_VERSION = 1;
/** Hard cap on raw JSON text length we'll parse (bytes-ish). */
export const MAX_PRESET_BYTES = 64 * 1024;

export interface PresetFile {
  format: typeof PRESET_FORMAT;
  version: typeof PRESET_VERSION;
  name: string;
  createdAt: number; // epoch ms
  values: Record<string, number>; // paramId -> clamped logical value
}

export class PresetParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PresetParseError';
  }
}

/**
 * Sanitize an arbitrary values map into a complete, clamped snapshot keyed by
 * paramId. Unknown keys dropped; missing/invalid params fall back to default.
 */
export function sanitizeValues(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of PARAMS) {
    const v = raw[p.id];
    out[p.id] =
      typeof v === 'number' && Number.isFinite(v)
        ? clampForRange(v, p.highRes)
        : defaultForRange(p.highRes);
  }
  return out;
}

/** Build a sanitized preset object from a name + a values map. Pure. */
export function buildPreset(name: string, values: Record<string, unknown>): PresetFile {
  return {
    format: PRESET_FORMAT,
    version: PRESET_VERSION,
    name: sanitizeName(name) || 'untitled',
    createdAt: Date.now(),
    values: sanitizeValues(values),
  };
}

/** Serialize a preset to pretty JSON (stable-ish key order within values). */
export function serializePreset(p: PresetFile): string {
  return JSON.stringify(p, null, 2);
}

/**
 * Strictly validate + sanitize an *already-parsed* object into a PresetFile.
 * Throws PresetParseError on any structural problem (wholesale rejection).
 */
export function parsePreset(data: unknown): PresetFile {
  if (typeof data !== 'object' || data === null) {
    throw new PresetParseError('preset is not an object');
  }
  const obj = data as Record<string, unknown>;

  if (obj.format !== PRESET_FORMAT) {
    throw new PresetParseError(`unsupported format (expected "${PRESET_FORMAT}")`);
  }
  if (obj.version !== PRESET_VERSION) {
    throw new PresetParseError(`unsupported version (expected ${PRESET_VERSION})`);
  }

  const name = sanitizeName(typeof obj.name === 'string' ? obj.name : '');
  const createdAt =
    typeof obj.createdAt === 'number' && Number.isFinite(obj.createdAt) ? obj.createdAt : Date.now();

  if (typeof obj.values !== 'object' || obj.values === null) {
    throw new PresetParseError('missing or invalid "values" object');
  }
  const rawValues = obj.values as Record<string, unknown>;
  // Reject obviously oversized/garbage payloads even before per-field work.
  const keys = Object.keys(rawValues);
  if (keys.length > PARAMS.length * 4) {
    throw new PresetParseError(`too many value entries (${keys.length})`);
  }

  return {
    format: PRESET_FORMAT,
    version: PRESET_VERSION,
    name,
    createdAt,
    values: sanitizeValues(rawValues),
  };
}

/** Parse a JSON string (with byte cap) then validate. Throws PresetParseError. */
export function parsePresetJson(text: string): PresetFile {
  if (text.length > MAX_PRESET_BYTES) {
    throw new PresetParseError(`file exceeds ${MAX_PRESET_BYTES} bytes`);
  }
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new PresetParseError('invalid JSON');
  }
  return parsePreset(data);
}

/**
 * Turn a preset name into a safe filename stem (no path separators, control
 * chars, or leading dots). Browsers also sanitize <a download>, but we belt-and-braces.
 */
export function toFileName(name: string): string {
  const stem =
    sanitizeName(name)
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/^\.+/g, '')
      .trim() || 'untitled';
  return `${stem}.json`;
}
