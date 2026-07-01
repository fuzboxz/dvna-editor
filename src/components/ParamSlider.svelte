<script lang="ts">
  import type { ParamDef } from '../midi/ccMap';
  import { effectiveScale } from '../midi/scales';
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

  const scale = $derived(effectiveScale(param));
  const sliderValue = $derived(scale.toDisplay(value, param));
  const decimals = $derived(scale.step < 1 ? 1 : 0);
  const numValue = $derived(Number(sliderValue.toFixed(decimals)));
  const description = $derived(describe(param));
  // Accessible name for the controls: param name + unit (description is shown visually too).
  const ariaLabel = $derived(`${param.name} (${scale.unit})`);

  function commit(v: number) {
    oninput(scale.toCC(v, param));
  }
</script>

<div class="param-row">
  <div class="param-head">
    <span class="param-name">{param.name}</span>
    <span class="param-ctrl">
      <input
        class="param-slider"
        type="range"
        aria-label={ariaLabel}
        min={scale.displayMin}
        max={scale.displayMax}
        step={scale.step}
        value={sliderValue}
        oninput={(e) => commit(Number(e.currentTarget.value))}
      />
      <input
        class="param-num"
        type="number"
        aria-label={ariaLabel}
        min={scale.displayMin}
        max={scale.displayMax}
        step={scale.step}
        value={numValue}
        onchange={(e) => commit(Number(e.currentTarget.value))}
      />
      <span class="param-unit">{scale.unit}</span>
    </span>
  </div>
  {#if description}
    <p class="param-desc">{description}</p>
  {/if}
</div>
