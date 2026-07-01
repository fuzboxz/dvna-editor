# DVNA:EDIT

A **frontend-only** web editor for the **Doboz Audio DVNA** chord & texture synthesizer. Create, modify, and generate presets live over MIDI using the **Web MIDI API**. No backend, no server, **zero runtime network calls** — it's a static bundle that runs entirely in the browser and talks directly to your MIDI interface.

> ⚠️ **Chromium-only.** Web MIDI is only available in Chrome/Edge. Other browsers get a short notice and nothing else.

---

## Why it works the way it does (architecture)

The DVNA has **TRS MIDI-IN only** — no OUT, no THRU. A Phase-0 SysEx spike confirmed there is **no return path** from the device: Identity Replies and preset-dump reads are physically impossible, and blind SysEx writes are forbidden by the safety posture. So the editor is a **one-way, computer→DVNA CC streamer**, and the browser's state is the sole source of truth.

```
Browser (Chrome, Web MIDI API)
        │  navigator.requestMIDIAccess({ sysex: false })   ← user gesture only
        ▼
OS MIDI (e.g. CoreMIDI)
        │
        ▼
USB MIDI interface (e.g. U2MIDI Pro)        ← enumerated as an output port
        │
        ▼  TRS (Type A/B)
DVNA   (receives only)
```

There is no read-back, so on-device preset slots stay opaque. Presets live as **files** you own (see below).

---

## Features

- **Live parameter editor** — all **56 CC parameters** across 10 tabbed groups (Arp, Osc/Shape, FM, Morph, Glide & Vibrato, Filter, Drive, VCA, FX, Master).
  - **14-bit** params send MSB+LSB; continuous `%` controls snap to whole numbers, time params use an exponential ms scale.
  - **Discrete** params (filter mode, oscillator waveforms, drone) render as labeled dropdowns.
  - Each change streams CC(s) to DVNA immediately.
- **Randomizer** — per-page `🎲 RANDOMIZE PAGE` and global `🎲 ALL`; Master Volume is always excluded.
- **Preset files** — `💾 SAVE` downloads the current patch as sanitized JSON; `📂 LOAD` validates and applies a file (streaming all CCs to DVNA). Round-trips cleanly.
- **Panic** — `⏹ PANIC` sends All-Notes-Off + All-Sound-Off + sustain-off + pitch-bend-center across all 16 channels (deliberately not CC 121, so the patch is unchanged).
- **Dev mock mode** — a `🧪 MOCK` button (dev builds only) fakes the MIDI output and shows a live **CC monitor**, so features can be exercised without a device. Stripped from production.

---

## Tech stack

| Area | Choice | Why |
|---|---|---|
| UI | **Svelte 5** (runes) | Tiny output, minimal audit surface, great for real-time knob UIs. |
| Build | **Vite** | Fast HMR, clean static build for Pages. |
| Language | **TypeScript** (strict) | Enforces the value-clamping/sanitization that underpins security. |
| Tests | **Vitest** | Clamping, schema validation, sanitization, randomizer, 14-bit round-trip. |
| Browser | **Chromium** (Chrome/Edge) | Native Web MIDI; no polyfill. |

---

## Security posture (secure-by-default)

The app ships a **strict CSP** and is designed to be verifiably safe and offline:

```
default-src 'self';
script-src 'self';                  /* no inline scripts, no unsafe-eval */
style-src  'self';                  /* production: no unsafe-inline — all styles external */
img-src    'self' data:;
connect-src 'self';                 /* forbids any runtime fetch/XHR/WebSocket */
base-uri 'self'; form-action 'self'; object-src 'none';
```

> In **dev only**, a Vite plugin relaxes `style-src` to `'self' 'unsafe-inline'` because Vite's HMR injects CSS via inline `<style>` elements. The production build ships a single external stylesheet, so it stays strict — the `unsafe-inline` escape hatch never reaches production.
>
> `frame-ancestors` is intentionally omitted: browsers ignore it when delivered via `<meta>`, and GitHub Pages allows no custom headers, so clickjacking CSP isn't enforceable on a static deploy.

1. **Strict CSP** — `default-src 'self'`; no inline scripts, no `unsafe-eval`, no remote origins, no runtime CDN; production `style-src` has no `unsafe-inline`.
2. **Fully offline** — zero runtime network requests (no telemetry, no `fetch`); works in airplane mode after first load.
3. **Input clamping** — CC `[0,127]`, 14-bit `[0,16383]`, channel `[0,15]` enforced before any byte is sent.
4. **Output sanitization** — preset names sanitized + length-capped and always rendered as text (Svelte auto-escapes); no `innerHTML`/`eval` anywhere.
5. **Schema-validated JSON import** — strict shape + per-field clamping + size/count limits; malformed input rejected wholesale, never partially applied.
6. **SysEx disabled** — `requestMIDIAccess({ sysex: false })`; no SysEx bytes are ever produced.
7. **Web MIDI hygiene** — access requested only on an explicit user gesture; never auto-connects or auto-transmits on load.
8. **Supply chain** — committed lockfile, `npm audit` clean, minimal dependencies.

---

## Preset file format

Presets are portable JSON files (`dvna-preset` v1):

```json
{
  "format": "dvna-preset",
  "version": 1,
  "name": "Pluck",
  "createdAt": 1751400000000,
  "values": { "reverb-mix": 100, "filter-cutoff": 8192, "…": "… (56 params)" }
}
```

On load, the file is schema-validated, every value is clamped into range (unknown keys dropped, missing params fall back to their neutral default), then the patch is applied and streamed to DVNA.

---

## Getting started

```bash
npm install          # restore deps from the lockfile
npm run dev          # dev server (http://localhost:5173) — try 🧪 MOCK without a device
npm run build        # static production bundle in dist/
npm run preview      # serve the production build locally
npm test             # run the unit suite
npm run check        # svelte-check + tsc type check
```

Connect a USB MIDI interface, route TRS to the DVNA's MIDI IN, open the app in Chrome, hit **CONNECT**, pick the interface + channel, and start editing.

---

## Project structure

```
src/
  midi/        clamp, encode (14-bit MSB/LSB), ccMap (56 params), options, scales, midi.svelte.ts (connection)
  state/       liveState.svelte.ts (reactive source of truth), randomize.ts
  library/     name.ts (sanitization), preset-file.ts (serialize + strict validate)
  components/  ParamSlider, ParamSelect, PresetModal, DebugPanel (dev)
  App.svelte   console-style UI (tabs, toolbar icons, CRT theme)
index.html     strict CSP
public/        favicon.svg
```

---

## Status & notes

- **MIDI-IN-only by hardware** → CC-streaming is the final architecture; SysEx is out of scope.
- `liveState` in the browser is the sole source of truth; recalling/streaming a patch reproduces its sound.
- Parameter units recovered where possible from firmware analysis; some device values are icon/bar-only and use a best-fit `%` or ms scale.
