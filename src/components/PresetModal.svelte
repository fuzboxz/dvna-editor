<script lang="ts">
  import { liveState } from '../state/liveState.svelte';
  import { buildPreset, serializePreset, toFileName } from '../library/preset-file';
  import { isValidName, MAX_PRESET_NAME } from '../library/name';

  let { open = $bindable(), onClose = () => {} }: { open?: boolean; onClose?: () => void } = $props();

  let name = $state('');
  const canSave = $derived(isValidName(name));
  let inputEl = $state<HTMLInputElement | null>(null);

  // Clear the field + focus whenever the modal opens.
  $effect(() => {
    if (open) {
      name = '';
      queueMicrotask(() => inputEl?.focus());
    }
  });

  function close() {
    open = false;
    onClose();
  }

  function save() {
    if (!canSave) return;
    const preset = buildPreset(name, { ...liveState });
    const blob = new Blob([serializePreset(preset)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = toFileName(preset.name);
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    close();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      close();
    }
  }
</script>

{#if open}
  <div class="backdrop"></div>
  <div
    class="modal"
    role="dialog"
    aria-modal="true"
    aria-label="Save preset"
    tabindex="-1"
    onkeydown={onKey}
  >
    <div class="m-head">
      <span>💾 SAVE PRESET</span>
      <button class="m-x" onclick={close} aria-label="Cancel">✕</button>
    </div>
    <form onsubmit={(e) => { e.preventDefault(); save(); }}>
      <input
        bind:this={inputEl}
        class="m-input"
        type="text"
        placeholder="patch name…"
        maxlength={MAX_PRESET_NAME}
        bind:value={name}
        onkeydown={onKey}
      />
      <div class="m-actions">
        <button type="button" class="btn" onclick={close}>CANCEL</button>
        <button type="submit" class="btn btn-primary" disabled={!canSave}>SAVE .JSON</button>
      </div>
    </form>
  </div>
{/if}

<style>
  .backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    z-index: 50;
  }
  .modal {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 51;
    width: min(360px, 92vw);
    border: 1px solid var(--border);
    background: var(--panel);
    box-shadow: 0 0 0 1px var(--bg), 0 8px 32px rgba(0, 0, 0, 0.6);
  }
  .m-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.4rem 0.6rem;
    border-bottom: 1px solid var(--border);
    background: var(--panel-2);
    color: var(--text-bright);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    font-size: 0.78rem;
  }
  .m-x {
    background: none;
    border: none;
    color: var(--dim);
    cursor: pointer;
    font-size: 0.8rem;
  }
  .m-x:hover {
    color: var(--text-bright);
  }
  form {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    padding: 0.7rem 0.6rem;
  }
  .m-input {
    width: 100%;
    background: var(--bg);
    color: var(--text-bright);
    border: 1px solid var(--border);
    border-radius: 0;
    padding: 0.35rem 0.45rem;
    font-size: 0.85rem;
    font-family: var(--mono);
  }
  .m-input:focus {
    outline: none;
    border-color: var(--text);
  }
  .m-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.4rem;
  }
  .btn {
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
    padding: 0.3rem 0.7rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    cursor: pointer;
  }
  .btn:hover {
    border-color: var(--text);
    color: var(--text-bright);
  }
  .btn:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .btn-primary {
    border-color: var(--text-bright);
    color: var(--text-bright);
  }
</style>
