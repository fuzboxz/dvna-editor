<script lang="ts">
  import { PARAMS } from '../midi/ccMap';
  import type { CcLogEntry } from '../midi/midi.svelte';
  import type { DvnaMidi } from '../midi/midi.svelte';

  let { midi }: { midi: DvnaMidi } = $props();

  // Reverse-lookup: CC number -> human label.
  const byCc = new Map<number, string>();
  for (const p of PARAMS) {
    byCc.set(p.msb, `${p.name} (MSB)`);
    if (p.lsb != null) byCc.set(p.lsb, `${p.name} (LSB)`);
  }
  const MODE: Record<number, string> = {
    120: 'All Sound Off',
    123: 'All Notes Off',
    64: 'Sustain Off',
  };

  function label(e: CcLogEntry): string {
    if (e.kind === 'pb') return 'Pitch Bend';
    if (e.kind === 'mode') return MODE[e.controller] ?? `ChMode ${e.controller}`;
    return byCc.get(e.controller) ?? `CC${e.controller}`;
  }

  function fmtTime(ms: number): string {
    const d = new Date(ms);
    return `${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}.${String(d.getMilliseconds()).padStart(3, '0')}`;
  }
</script>

<section class="debug">
  <div class="dbg-head">
    <span class="dbg-title">🧪 CC OUT (MOCK)</span>
    <span class="dbg-count">{midi.ccLog.length} captured</span>
    <button class="btn btn-small" onclick={() => midi.clearLog()}>CLEAR</button>
  </div>

  {#if midi.ccLog.length === 0}
    <p class="dbg-empty">No MIDI sent yet. Tweak a slider, randomize, load a preset, or hit panic — every outgoing message is captured here.</p>
  {:else}
    <div class="dbg-log">
      {#each midi.ccLog as e (e.seq)}
        <div class="row" data-kind={e.kind}>
          <span class="c-seq">#{e.seq}</span>
          <span class="c-time">{fmtTime(e.t)}</span>
          <span class="c-ch">CH{e.ch + 1}</span>
          <span class="c-label">{label(e)}</span>
          {#if e.kind === 'pb'}
            <span class="c-val">{e.value}</span>
          {:else}
            <span class="c-val">CC{e.controller} = {e.value}</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .debug {
    border: 1px solid var(--border);
    background: var(--panel);
    margin-top: 0.75rem;
  }
  .dbg-head {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--border);
    background: var(--panel-2);
  }
  .dbg-title {
    color: var(--text-bright);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.78rem;
  }
  .dbg-count {
    color: var(--dim);
    font-size: 0.66rem;
    font-variant-numeric: tabular-nums;
    margin-right: auto;
  }
  .btn-small {
    padding: 0.2rem 0.5rem;
    font-size: 0.68rem;
  }
  .dbg-empty {
    color: var(--dim);
    font-size: 0.74rem;
    padding: 0.7rem 0.6rem;
    margin: 0;
  }
  .dbg-log {
    max-height: 280px;
    overflow-y: auto;
    font-size: 0.72rem;
  }
  .row {
    display: grid;
    grid-template-columns: 3.5rem 5.5rem 3rem 1fr auto;
    gap: 0.5rem;
    align-items: baseline;
    padding: 0.18rem 0.6rem;
    border-bottom: 1px dotted var(--border);
    font-variant-numeric: tabular-nums;
  }
  .row[data-kind='mode'] .c-label,
  .row[data-kind='pb'] .c-label {
    color: var(--red-bright);
  }
  .c-seq {
    color: var(--dim);
  }
  .c-time {
    color: var(--dim);
  }
  .c-ch {
    color: var(--text);
  }
  .c-label {
    color: var(--text-bright);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .c-val {
    color: var(--text);
    justify-self: end;
  }
</style>
