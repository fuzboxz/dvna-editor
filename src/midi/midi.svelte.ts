// src/midi/midi.svelte.ts
// Web MIDI connection layer for DVNA (one-way: computer -> DVNA).
// Svelte 5 runes class — fields are reactive in components.
// Security: every byte is clamped before transmit (design.md §8 #3, #7).
//   - access requested only on explicit user gesture (connect()).
//   - sysex disabled (DVNA is MIDI-IN-only; no sysex needed).
//   - send helpers always clamp channel/controller/value.

import { clamp7, clampChannel } from './clamp';
import { encodeParam } from './encode';
import type { ParamDef } from './ccMap';

export type MidiStatus =
  | 'unsupported' // browser lacks Web MIDI
  | 'disconnected' // supported, not yet connected
  | 'connecting'
  | 'connected' // access granted; an output may or may not be selected
  | 'error';

export interface MidiPortInfo {
  id: string;
  name: string;
  manufacturer: string;
}

/** A CC-monitor log entry captured by the dev-only mock output. */
export interface CcLogEntry {
  seq: number;
  t: number; // epoch ms
  ch: number; // 0-15
  controller: number; // 0-127, or -1 for pitch bend
  value: number; // 0-127 (CC) or 0-16383 (pitch bend)
  kind: 'cc' | 'mode' | 'pb';
}

/** Minimal structural shape we need from a MIDI output port (real or mock). */
interface SendableOutput {
  open(): Promise<unknown>;
  send(data: number[]): void;
}

export class DvnaMidi {
  // Reactive state (Svelte 5 runes).
  status = $state<MidiStatus>('disconnected');
  error = $state<string>('');
  outputs = $state<MidiPortInfo[]>([]);
  selectedOutputId = $state<string>('');
  channel = $state<number>(0); // 0-15 (displayed as +1)

  // Non-reactive internals.
  private access: MIDIAccess | null = null;
  private output: SendableOutput | null = null;
  private mock = false;
  private seq = 0;

  // Dev-only CC monitor (populated only while the mock output is active).
  ccLog = $state<CcLogEntry[]>([]);

  /** True if the current browser supports the Web MIDI API. */
  get isSupported(): boolean {
    return typeof navigator !== 'undefined' && typeof navigator.requestMIDIAccess === 'function';
  }

  get hasOutput(): boolean {
    return this.output !== null;
  }

  /** True while running on the dev-only mock output (no real device). */
  get isMock(): boolean {
    return this.mock;
  }

  get selectedOutputName(): string {
    return this.outputs.find((o) => o.id === this.selectedOutputId)?.name ?? '(none)';
  }

  /** Request MIDI access. MUST be called from a user gesture (button click). */
  async connect(): Promise<void> {
    this.error = '';
    if (!this.isSupported) {
      this.status = 'unsupported';
      return;
    }
    this.status = 'connecting';
    try {
      this.access = await navigator.requestMIDIAccess({ sysex: false });
      this.access.onstatechange = () => this.refresh();
      this.refresh();
      this.status = 'connected';
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.status = 'error';
    }
  }

  /** Re-read the output port list and reconcile the current selection. */
  private refresh(): void {
    const list: MidiPortInfo[] = [];
    this.access?.outputs.forEach((port) =>
      list.push({
        id: port.id,
        name: port.name ?? '(unnamed)',
        manufacturer: port.manufacturer ?? '',
      }),
    );
    this.outputs = list;

    // Drop selection if the port disappeared.
    const stillThere = list.some((o) => o.id === this.selectedOutputId);
    if (!stillThere) {
      this.output = null;
      this.selectedOutputId = '';
    }

    // Auto-select the U2MIDI Pro if nothing is selected (matches our hardware).
    if (!this.selectedOutputId) {
      const preferred = list.find((o) => o.name.toLowerCase().includes('u2midi'));
      if (preferred) this.selectOutput(preferred.id);
    }
  }

  /** Select an output port by id. Returns false if the id is unknown. */
  selectOutput(id: string): boolean {
    const port = this.access?.outputs.get(id);
    if (!port) {
      this.selectedOutputId = '';
      this.output = null;
      return false;
    }
    this.output = port;
    this.selectedOutputId = id;
    // Ensure the port is open (open() is idempotent if already open).
    port.open().catch(() => {
      /* swallow; selection still recorded; send() will surface failures */
    });
    return true;
  }

  /**
   * DEV ONLY. Enable a mock MIDI output that captures (but does not transmit) every
   * outgoing CC, so features can be exercised without a real DVNA connected. Never
   * reachable in production builds (the UI only calls this under import.meta.env.DEV).
   */
  enableMock(): void {
    const mockPort: MidiPortInfo = { id: '__mock__', name: '🧪 Mock DVNA', manufacturer: 'debug' };
    this.outputs = [mockPort];
    this.selectedOutputId = mockPort.id;
    this.output = {
      open: () => Promise.resolve(),
      send: (data: number[]) => this.record(data),
    };
    this.access = null;
    this.mock = true;
    this.error = '';
    this.status = 'connected';
  }

  /** Clear the dev CC monitor. */
  clearLog(): void {
    this.ccLog = [];
    this.seq = 0;
  }

  /** Decode an outgoing MIDI message into the CC monitor (mock only). */
  private record(bytes: number[]): void {
    if (!bytes.length) return;
    const status = bytes[0];
    const ch = status & 0x0f;
    switch (status >> 4) {
      case 0xb: {
        if (bytes.length < 3) return;
        const controller = bytes[1];
        const value = bytes[2];
        const kind = controller >= 120 ? 'mode' : 'cc';
        this.pushLog({ seq: this.seq++, t: Date.now(), ch, controller, value, kind });
        return;
      }
      case 0xe: {
        if (bytes.length < 3) return;
        const value = bytes[1] | (bytes[2] << 7); // 14-bit
        this.pushLog({ seq: this.seq++, t: Date.now(), ch, controller: -1, value, kind: 'pb' });
        return;
      }
      default:
        return;
    }
  }

  private pushLog(e: CcLogEntry): void {
    this.ccLog = [e, ...this.ccLog].slice(0, 300);
  }

  setChannel(ch: number): void {
    this.channel = clampChannel(ch);
  }

  /** Send a raw CC (clamped). No-op if no output selected. */
  sendCC(controller: number, value: number): boolean {
    const status = 0xb0 | clampChannel(this.channel);
    return this.sendBytes([status, clamp7(controller), clamp7(value)]);
  }

  /** Encode + send a parameter's value (14-bit -> MSB then LSB). No-op if no output. */
  sendParam(p: ParamDef, value: number): boolean {
    if (!this.output) return false;
    const status = 0xb0 | clampChannel(this.channel);
    let ok = true;
    for (const m of encodeParam(p, value)) {
      ok = this.sendBytes([status, clamp7(m.controller), clamp7(m.value)]) && ok;
    }
    return ok;
  }

  /** Stream a full parameter set (used for preset recall). Returns count of params sent. */
  sendAll(entries: ReadonlyArray<{ param: ParamDef; value: number }>): number {
    let n = 0;
    for (const { param, value } of entries) {
      if (this.sendParam(param, value)) n++;
    }
    return n;
  }

  /**
   * MIDI panic: stop all sound immediately without altering the patch.
   * Sends All Notes Off (123) + All Sound Off (120) + sustain off (64) +
   * pitch-bend centered, broadcast on all 16 channels for robustness.
   * (Deliberately NOT CC 121 "Reset All Controllers" — that would change patch values.)
   */
  panic(): boolean {
    if (!this.output) return false;
    let ok = true;
    for (let ch = 0; ch < 16; ch++) {
      const cc = 0xb0 | ch;
      ok = this.sendBytes([cc, 123, 0]) && ok; // all notes off
      ok = this.sendBytes([cc, 120, 0]) && ok; // all sound off
      ok = this.sendBytes([cc, 64, 0]) && ok; // sustain/damper off
      ok = this.sendBytes([0xe0 | ch, 0x00, 0x40]) && ok; // pitch bend center
    }
    return ok;
  }

  private sendBytes(bytes: number[]): boolean {
    if (!this.output) return false;
    try {
      this.output.send(bytes);
      return true;
    } catch {
      return false;
    }
  }
}
