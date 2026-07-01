// src/library/name.ts
// Preset-name sanitization. Names are always rendered as text by Svelte (no HTML
// interpolation), so this is a hygiene/clamp pass, not a security boundary:
// trim, strip control characters, and cap length.

export const MAX_PRESET_NAME = 64;

/**
 * Sanitize a preset name: trim surrounding whitespace, strip C0 control chars and
 * DEL, and cap to MAX_PRESET_NAME. Non-strings become ''.
 */
export function sanitizeName(raw: string): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001F\u007F]/g, '') // control chars + DEL
    .trim()
    .slice(0, MAX_PRESET_NAME);
}

/** True if a name is non-empty after sanitization. */
export function isValidName(raw: string): boolean {
  return sanitizeName(raw).length > 0;
}
