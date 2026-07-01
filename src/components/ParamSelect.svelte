<script lang="ts">
  import type { ParamDef } from '../midi/ccMap';
  import { optionsFor, valueToOptionIndex, optionIndexToValue } from '../midi/options';
  import { describe } from '../midi/descriptions';

  let {
    param,
    value,
    oninput,
  }: {
    param: ParamDef;
    value: number;
    oninput: (v: number) => void;
  } = $props();

  const opts = $derived(optionsFor(param));
  const selectedIndex = $derived(valueToOptionIndex(param, value));
  const description = $derived(describe(param));

  function choose(e: Event) {
    const idx = Number((e.currentTarget as HTMLSelectElement).value);
    oninput(optionIndexToValue(param, idx));
  }
</script>

<div class="param-row">
  <div class="param-head">
    <span class="param-name">{param.name}</span>
    <span class="param-ctrl">
      <select class="param-select" aria-label={param.name} value={selectedIndex} onchange={choose}>
        {#each opts as label, i}
          <option value={i}>{label}</option>
        {/each}
      </select>
      <span class="param-unit">sel</span>
    </span>
  </div>
  {#if description}
    <p class="param-desc">{description}</p>
  {/if}
</div>
