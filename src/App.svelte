<script lang="ts">
  import { DvnaMidi } from './midi/midi.svelte';
  import { PARAM_GROUPS, PARAMS, paramsInGroup, type ParamGroup } from './midi/ccMap';
  import { liveState, setParam } from './state/liveState.svelte';
  import { randomizeValues, randomizeGroup, isRandomizable } from './state/randomize';
  import { isDiscrete } from './midi/options';
  import { clampForRange, defaultForRange } from './midi/clamp';
  import { parsePresetJson, type PresetFile } from './library/preset-file';
  import ParamSlider from './components/ParamSlider.svelte';
  import ParamSelect from './components/ParamSelect.svelte';
  import PresetModal from './components/PresetModal.svelte';
  import DebugPanel from './components/DebugPanel.svelte';

  const midi = new DvnaMidi();

  // Dev-only mock mode (tree-shaken out of production builds).
  const debug = import.meta.env.DEV;

  // Active tab (ARP is the first page).
  let activeGroup = $state<ParamGroup>('arp');

  // Preset modal + file load.
  let saveModalOpen = $state(false);
  let fileInput = $state<HTMLInputElement | null>(null);
  let message = $state<{ kind: 'ok' | 'err'; text: string } | null>(null);
  let toastTimer: ReturnType<typeof setTimeout> | undefined;

  const TAB_CODE: Record<ParamGroup, string> = {
    osc: 'OSC',
    fm: 'FM',
    morph: 'MORPH',
    voice: 'VOICE',
    filter: 'FLT',
    drive: 'DRV',
    vca: 'VCA',
    fx: 'FX',
    master: 'MAST',
    arp: 'ARP',
  };

  function surprise() {
    const vals = randomizeValues();
    for (const p of PARAMS) {
      if (p.id in vals) setParam(p, vals[p.id], midi);
    }
  }

  const randomizableOnPage = $derived(
    paramsInGroup(activeGroup).filter((p) => isRandomizable(p)),
  );
  function randomizePage() {
    const vals = randomizeGroup(activeGroup);
    for (const p of paramsInGroup(activeGroup)) {
      if (p.id in vals) setParam(p, vals[p.id], midi);
    }
  }

  function toast(kind: 'ok' | 'err', text: string) {
    message = { kind, text };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (message = null), 4000);
  }

  /** Write a validated preset into liveState and stream every CC to DVNA. */
  function applyPreset(p: PresetFile): void {
    const entries = PARAMS.map((param) => ({
      param,
      value: clampForRange(p.values[param.id] ?? defaultForRange(param.highRes), param.highRes),
    }));
    for (const { param, value } of entries) {
      liveState[param.id] = value;
    }
    midi.sendAll(entries);
  }

  async function onFile(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // allow re-selecting the same file
    if (!file) return;
    try {
      const text = await file.text();
      const preset = parsePresetJson(text);
      applyPreset(preset);
      toast('ok', `Loaded “${preset.name || 'untitled'}” — ${PARAMS.length} params sent.`);
    } catch (err) {
      toast('err', err instanceof Error ? err.message : 'failed to load file');
    }
  }

  const statusText: Record<typeof midi.status, string> = {
    unsupported: 'NO WEB MIDI',
    disconnected: 'OFFLINE',
    connecting: 'LINKING…',
    connected: 'ONLINE',
    error: 'ERROR',
  };
</script>

<main>
  <!-- Terminal title bar -->
  <header class="term-bar">
    <div class="brand">
      <span class="title">DVNA:EDIT</span>
    </div>
    <div class="tools">
      <button class="btn" onclick={() => midi.connect()} disabled={midi.status === 'connecting'}>
        {midi.status === 'connected' ? 'RECONNECT' : 'CONNECT'}
      </button>
      {#if debug && midi.status !== 'connected'}
        <button class="btn" onclick={() => midi.enableMock()} title="Dev: fake MIDI output, no device needed">🧪 MOCK</button>
      {/if}
      {#if midi.status === 'connected'}
        <button class="btn icon-btn" onclick={() => (saveModalOpen = true)} title="Save preset to JSON file">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h11l3 3v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/><path d="M8 3v5h7V3"/><path d="M8 21v-6h8v6"/></svg>
          SAVE
        </button>
        <button class="btn icon-btn" onclick={() => fileInput?.click()} title="Load preset from JSON file">
          <svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v1H3z"/><path d="M3 11h18l-2 7a2 2 0 0 1-2 1H5a2 2 0 0 1-2-1z"/></svg>
          LOAD
        </button>
        <input
          bind:this={fileInput}
          class="hidden-input"
          type="file"
          accept=".json,application/json"
          onchange={onFile}
        />
        <button class="btn" onclick={surprise} title="Randomize every parameter">🎲 ALL</button>
        <button class="btn btn-red" onclick={() => midi.panic()} title="All Notes Off + All Sound Off">⏹ PANIC</button>
        <label class="field">
          OUT
          <select value={midi.selectedOutputId} onchange={(e) => midi.selectOutput(e.currentTarget.value)}>
            {#each midi.outputs as port}
              <option value={port.id}>{port.name}</option>
            {/each}
          </select>
        </label>
        <label class="field">
          CH
          <select value={midi.channel} onchange={(e) => midi.setChannel(Number(e.currentTarget.value))}>
            {#each Array(16) as _, i}
              <option value={i}>{i + 1}</option>
            {/each}
          </select>
        </label>
      {/if}
      <span class="status" data-status={midi.status}>● {statusText[midi.status]}</span>
    </div>
  </header>

  {#if midi.status === 'unsupported'}
    <div class="notice">⚠ NO WEB MIDI — USE CHROME OR EDGE. EVERYTHING STAYS ON YOUR DEVICE.</div>
  {/if}
  {#if midi.status === 'error' && midi.error}
    <div class="notice">⚠ {midi.error}</div>
  {/if}
  {#if message}
    <div class="notice" data-kind={message.kind}>{message.kind === 'ok' ? '✓' : '⚠'} {message.text}</div>
  {/if}

  {#if midi.status === 'connected'}
    <!-- Tab bar -->
    <nav class="tabs">
      {#each PARAM_GROUPS as group}
        <button
          class="tab"
          class:active={activeGroup === group.id}
          onclick={() => (activeGroup = group.id)}
          title={group.label}
        >
          {TAB_CODE[group.id]}
        </button>
      {/each}
    </nav>

    <!-- Active group panel -->
    <section class="panel">
      <div class="panel-head">
        <span class="panel-title">{PARAM_GROUPS.find((g) => g.id === activeGroup)?.label}</span>
        <div class="panel-actions">
          <span class="panel-count">{paramsInGroup(activeGroup).length} PARAMS</span>
          <button
            class="btn btn-small"
            onclick={randomizePage}
            disabled={randomizableOnPage.length === 0}
            title="Randomize only this page"
          >
            🎲 RANDOMIZE PAGE
          </button>
        </div>
      </div>
      <div class="rows">
        {#each paramsInGroup(activeGroup) as p (p.id)}
          {#if isDiscrete(p)}
            <ParamSelect param={p} value={liveState[p.id]} oninput={(v: number) => setParam(p, v, midi)} />
          {:else}
            <ParamSlider param={p} value={liveState[p.id]} oninput={(v: number) => setParam(p, v, midi)} />
          {/if}
        {/each}
      </div>
    </section>
  {/if}

  {#if midi.isMock}
    <DebugPanel {midi} />
  {/if}

  <PresetModal bind:open={saveModalOpen} />

  <div class="crt-overlay"></div>
</main>

<style>
  main {
    max-width: 820px;
    margin: 0 auto;
    padding: 0.75rem 1rem 3rem;
  }

  /* Terminal title bar */
  .term-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    flex-wrap: wrap;
    border: 1px solid var(--border);
    background: var(--panel);
    padding: 0.45rem 0.6rem;
    position: sticky;
    top: 0;
    z-index: 5;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .title {
    color: var(--text-bright);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: bold;
  }
  .tools {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .btn {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.2rem 0.55rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
  }
  .btn:hover {
    border-color: var(--red);
    color: var(--text-bright);
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn-red {
    border-color: var(--red);
    color: var(--red-bright);
  }
  .btn-red:hover {
    background: var(--red);
    color: #000;
  }
  .icon-btn .ic {
    width: 14px;
    height: 14px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.6;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  .hidden-input {
    display: none;
  }
  .field {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.62rem;
    color: var(--dim);
    text-transform: uppercase;
  }
  .field select {
    font-size: 0.7rem;
    padding: 0.1rem 0.2rem;
    border-radius: 0;
  }
  .status {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--dim);
  }
  .status[data-status='connected'] {
    color: var(--text-bright);
  }
  .status[data-status='error'] {
    color: var(--red-bright);
  }
  .status[data-status='unsupported'] {
    color: var(--text-bright);
  }

  .notice {
    border: 1px solid var(--border);
    color: var(--text-bright);
    background: var(--panel);
    padding: 0.55rem 0.7rem;
    margin-top: 0.6rem;
    font-size: 0.74rem;
    letter-spacing: 0.02em;
  }
  .notice[data-kind='err'] {
    border-color: var(--red);
    color: var(--red-bright);
  }

  /* Tab bar */
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0;
    margin: 0.75rem 0 0;
    border-bottom: 1px solid var(--border);
  }
  .tab {
    background: var(--panel);
    color: var(--dim);
    border: 1px solid var(--border);
    border-bottom: none;
    margin-right: -1px;
    padding: 0.35rem 0.7rem;
    font-size: 0.72rem;
    letter-spacing: 0.08em;
    cursor: pointer;
    text-transform: uppercase;
  }
  .tab:hover {
    color: var(--text-bright);
  }
  .tab.active {
    color: var(--text-bright);
    border-color: var(--text-bright);
    border-bottom: 1px solid var(--bg);
    position: relative;
    z-index: 2;
  }

  /* Panel */
  .panel {
    border: 1px solid var(--border);
    border-top: none;
    background: var(--panel);
  }
  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--border);
    background: var(--panel-2);
  }
  .panel-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .btn-small {
    padding: 0.2rem 0.5rem;
    font-size: 0.68rem;
  }
  .panel-title {
    color: var(--text-bright);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.78rem;
  }
  .panel-count {
    color: var(--dim);
    font-size: 0.66rem;
    letter-spacing: 0.08em;
  }
  .rows {
    padding: 0 0.2rem;
  }
</style>
