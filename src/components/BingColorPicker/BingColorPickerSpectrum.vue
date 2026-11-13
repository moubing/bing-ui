<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { CSSProperties } from 'vue'
import type { BingColorPickerChangeSource } from './BingColorPicker.types'
import { clamp } from './BingColorPicker.utils'
import type { ColorValue } from './BingColorPicker.utils'

type SpectrumSource = Extract<BingColorPickerChangeSource, 'field' | 'slider'>

const vividSliderSaturation = 84
const vividSliderValue = 93

const props = defineProps<{
  idPrefix: string
  hue: number
  saturation: number
  value: number
  color: ColorValue
  alpha: number
  disabled: boolean
}>()

const emit = defineEmits<{
  'hsv-change': [hue: number, saturation: number, value: number, source: SpectrumSource]
  'alpha-change': [alpha: number]
  commit: [source: SpectrumSource | 'alpha']
}>()

const hueInputId = computed(() => `${props.idPrefix}-hue`)
const alphaInputId = computed(() => `${props.idPrefix}-alpha`)
const colorFieldRef = ref<HTMLElement | null>(null)

let isListeningForColorFieldDrag = false
let isDraggingColorField = false

const currentAlphaPercent = computed(() => Math.round(props.alpha * 100))
const selectedColorStyle = computed<CSSProperties>(() => ({
  '--bing-color-picker-selected-color': props.color.rgba,
}) as CSSProperties)
const colorFieldStyle = computed<CSSProperties>(() => ({
  '--bing-color-picker-field-hue': `hsl(${props.hue}, 100%, 50%)`,
}) as CSSProperties)
const colorFieldMarkerStyle = computed<CSSProperties>(() => ({
  ...selectedColorStyle.value,
  left: `${props.saturation}%`,
  top: `${100 - props.value}%`,
}) as CSSProperties)
const colorFieldValueText = computed(
  () =>
    `饱和度 ${Math.round(props.saturation)}%，亮度 ${Math.round(
      props.value,
    )}%`,
)
const rangeStyle = computed<CSSProperties>(() => ({
  '--bing-color-picker-thumb-color': props.color.hex,
}) as CSSProperties)
const alphaRangeStyle = computed<CSSProperties>(() => ({
  '--bing-color-picker-alpha-rgb': `${props.color.rgb.r}, ${props.color.rgb.g}, ${props.color.rgb.b}`,
  '--bing-color-picker-thumb-color': props.color.rgba,
}) as CSSProperties)

onBeforeUnmount(removeColorFieldDragListeners)

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function getColorFieldValues(clientX: number, clientY: number) {
  const field = colorFieldRef.value

  if (!field) {
    return undefined
  }

  const bounds = field.getBoundingClientRect()
  const width = bounds.width || 1
  const height = bounds.height || 1
  const x = clamp((clientX - bounds.left) / width, 0, 1)
  const y = clamp((clientY - bounds.top) / height, 0, 1)

  return {
    saturation: Math.round(x * 100),
    value: Math.round((1 - y) * 100),
  }
}

function commitColorFieldPoint(clientX: number, clientY: number) {
  const values = getColorFieldValues(clientX, clientY)

  if (!values) {
    return
  }

  emit('hsv-change', props.hue, values.saturation, values.value, 'field')
}

function handleColorFieldPointerDown(event: PointerEvent) {
  if (props.disabled) {
    return
  }

  event.preventDefault()
  colorFieldRef.value?.focus()
  isDraggingColorField = true
  commitColorFieldPoint(event.clientX, event.clientY)
  addColorFieldDragListeners()
}

function handleWindowColorFieldPointerMove(event: PointerEvent) {
  if (!isDraggingColorField) {
    return
  }

  event.preventDefault()
  commitColorFieldPoint(event.clientX, event.clientY)
}

function handleWindowColorFieldPointerUp(event: PointerEvent) {
  if (!isDraggingColorField) {
    return
  }

  event.preventDefault()
  commitColorFieldPoint(event.clientX, event.clientY)
  isDraggingColorField = false
  removeColorFieldDragListeners()
  emit('commit', 'field')
}

function handleColorFieldKeydown(event: KeyboardEvent) {
  if (props.disabled) {
    return
  }

  const step = event.shiftKey ? 10 : 2
  let nextSaturation = props.saturation
  let nextValue = props.value

  if (event.key === 'ArrowLeft') {
    nextSaturation -= step
  } else if (event.key === 'ArrowRight') {
    nextSaturation += step
  } else if (event.key === 'ArrowDown') {
    nextValue -= step
  } else if (event.key === 'ArrowUp') {
    nextValue += step
  } else {
    return
  }

  event.preventDefault()
  emit('hsv-change', props.hue, nextSaturation, nextValue, 'field')
}

function handleHueInput(event: Event) {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  const hue = Number.parseFloat(target.value)
  const safeHue = Number.isFinite(hue) ? hue : 0
  const saturation =
    props.saturation <= 1 && props.value >= 99
      ? vividSliderSaturation
      : props.saturation
  const value = props.value <= 1 ? vividSliderValue : props.value

  emit('hsv-change', safeHue, saturation, value, 'slider')
}

function handleHueChange() {
  emit('commit', 'slider')
}

function handleAlphaInput(event: Event) {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  const alpha = Number.parseFloat(target.value)

  emit('alpha-change', Number.isFinite(alpha) ? alpha / 100 : 1)
}

function handleAlphaChange() {
  emit('commit', 'alpha')
}

function addColorFieldDragListeners() {
  if (!isBrowser() || isListeningForColorFieldDrag) {
    return
  }

  window.addEventListener('pointermove', handleWindowColorFieldPointerMove)
  window.addEventListener('pointerup', handleWindowColorFieldPointerUp)
  window.addEventListener('pointercancel', handleWindowColorFieldPointerUp)
  isListeningForColorFieldDrag = true
}

function removeColorFieldDragListeners() {
  if (!isBrowser() || !isListeningForColorFieldDrag) {
    return
  }

  window.removeEventListener('pointermove', handleWindowColorFieldPointerMove)
  window.removeEventListener('pointerup', handleWindowColorFieldPointerUp)
  window.removeEventListener('pointercancel', handleWindowColorFieldPointerUp)
  isListeningForColorFieldDrag = false
}

function cancelDrag() {
  isDraggingColorField = false
  removeColorFieldDragListeners()
}

defineExpose({ cancelDrag })
</script>

<template>
  <section class="bing-color-picker__spectrum">
    <div
      ref="colorFieldRef"
      class="bing-color-picker__field"
      :style="colorFieldStyle"
      role="slider"
      tabindex="0"
      aria-label="颜色饱和度与亮度"
      :aria-valuetext="colorFieldValueText"
      :aria-disabled="disabled || undefined"
      @pointerdown="handleColorFieldPointerDown"
      @keydown="handleColorFieldKeydown"
    >
      <span
        class="bing-color-picker__field-marker"
        :style="colorFieldMarkerStyle"
        aria-hidden="true"
      ></span>
    </div>

    <div class="bing-color-picker__spectrum-controls">
      <div class="bing-color-picker__spectrum-row">
        <span
          class="bing-color-picker__preview"
          :style="selectedColorStyle"
          aria-hidden="true"
        ></span>

        <label class="bing-color-picker__sr-only" :for="hueInputId">
          色相
        </label>
        <input
          :id="hueInputId"
          class="bing-color-picker__range bing-color-picker__range--hue"
          type="range"
          min="0"
          max="359"
          step="1"
          :value="hue"
          :style="rangeStyle"
          :disabled="disabled"
          @input="handleHueInput"
          @change="handleHueChange"
        />

        <span class="bing-color-picker__spectrum-value">{{ hue }}°</span>
      </div>

      <div class="bing-color-picker__spectrum-row">
        <span
          class="bing-color-picker__alpha-preview"
          :style="selectedColorStyle"
          aria-hidden="true"
        ></span>

        <label class="bing-color-picker__sr-only" :for="alphaInputId">
          不透明度
        </label>
        <input
          :id="alphaInputId"
          class="bing-color-picker__range bing-color-picker__range--alpha"
          type="range"
          min="0"
          max="100"
          step="1"
          :value="currentAlphaPercent"
          :style="alphaRangeStyle"
          :disabled="disabled"
          @input="handleAlphaInput"
          @change="handleAlphaChange"
        />

        <span class="bing-color-picker__spectrum-value">{{ currentAlphaPercent }}%</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.bing-color-picker__spectrum {
  position: relative;
  z-index: 1;
  display: grid;
  gap: 8px;
  padding: 0;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.bing-color-picker__field {
  --bing-color-picker-field-hue: hsl(330, 100%, 50%);
  position: relative;
  height: 132px;
  overflow: hidden;
  border-radius: 4px;
  background: linear-gradient(to top, #000 0%, transparent 100%), linear-gradient(to right, #fff 0%, var(--bing-color-picker-field-hue) 100%);
  cursor: crosshair;
  touch-action: none;
}

.bing-color-picker__field:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-color-picker__field[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.58;
}

.bing-color-picker__field-marker {
  box-sizing: border-box;
  position: absolute;
  z-index: 1;
  width: 14px;
  height: 14px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--bing-color-picker-selected-color);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.4);
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.bing-color-picker__spectrum-controls {
  display: grid;
  gap: 6px;
}

.bing-color-picker__spectrum-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
}

.bing-color-picker__preview,
.bing-color-picker__alpha-preview {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--bing-color-picker-selected-color);
}

.bing-color-picker__alpha-preview {
  background:
    linear-gradient(
      45deg,
      rgba(148, 163, 184, 0.22) 25%,
      transparent 25% 75%,
      rgba(148, 163, 184, 0.22) 75%
    ),
    linear-gradient(
      45deg,
      rgba(148, 163, 184, 0.22) 25%,
      transparent 25% 75%,
      rgba(148, 163, 184, 0.22) 75%
    ),
    rgba(255, 255, 255, 0.72);
  background-position:
    0 0,
    5px 5px,
    0 0;
  background-size:
    10px 10px,
    10px 10px,
    auto;
  opacity: 1;
}

.bing-color-picker__spectrum-value {
  min-width: 44px;
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 20px;
  text-align: right;
  white-space: nowrap;
}

.bing-color-picker__range {
  --bing-color-picker-thumb-color: var(--bing-accent);

  width: 100%;
  height: 20px;
  margin: 0;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

.bing-color-picker__range:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.bing-color-picker__range:focus-visible {
  outline: none;
}

.bing-color-picker__range--hue::-webkit-slider-runnable-track {
  height: 10px;
  border: 1px solid var(--bing-border);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    #ef4444 0%,
    #f59e0b 16.6%,
    #eab308 28%,
    #22c55e 43%,
    #06b6d4 58%,
    #3b82f6 72%,
    #a855f7 86%,
    #ef4444 100%
  );

}

.bing-color-picker__range--hue::-moz-range-track {
  height: 10px;
  border: 1px solid var(--bing-border);
  border-radius: 999px;
  background: linear-gradient(
    90deg,
    #ef4444 0%,
    #f59e0b 16.6%,
    #eab308 28%,
    #22c55e 43%,
    #06b6d4 58%,
    #3b82f6 72%,
    #a855f7 86%,
    #ef4444 100%
  );

}

.bing-color-picker__range--alpha::-webkit-slider-runnable-track {
  --bing-color-picker-alpha-track-inset: 16px;
  --bing-color-picker-alpha-clear-stop: 18%;

  height: 10px;
  border: 1px solid var(--bing-border);
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      rgba(var(--bing-color-picker-alpha-rgb), 0) 0%,
      rgba(var(--bing-color-picker-alpha-rgb), 0) var(--bing-color-picker-alpha-clear-stop),
      rgba(var(--bing-color-picker-alpha-rgb), 1) 100%
    ),
    linear-gradient(45deg, rgba(148, 163, 184, 0.26) 25%, transparent 25% 75%, rgba(148, 163, 184, 0.26) 75%),
    linear-gradient(45deg, rgba(148, 163, 184, 0.26) 25%, transparent 25% 75%, rgba(148, 163, 184, 0.26) 75%),
    rgba(255, 255, 255, 0.7);
  background-position:
    var(--bing-color-picker-alpha-track-inset) 0,
    0 0,
    5px 5px,
    0 0;
  background-repeat:
    no-repeat,
    repeat,
    repeat,
    repeat;
  background-size:
    calc(100% - var(--bing-color-picker-alpha-track-inset)) 100%,
    10px 10px,
    10px 10px,
    auto;

}

.bing-color-picker__range--alpha::-moz-range-track {
  --bing-color-picker-alpha-track-inset: 16px;
  --bing-color-picker-alpha-clear-stop: 18%;

  height: 10px;
  border: 1px solid var(--bing-border);
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      rgba(var(--bing-color-picker-alpha-rgb), 0) 0%,
      rgba(var(--bing-color-picker-alpha-rgb), 0) var(--bing-color-picker-alpha-clear-stop),
      rgba(var(--bing-color-picker-alpha-rgb), 1) 100%
    ),
    linear-gradient(45deg, rgba(148, 163, 184, 0.26) 25%, transparent 25% 75%, rgba(148, 163, 184, 0.26) 75%),
    linear-gradient(45deg, rgba(148, 163, 184, 0.26) 25%, transparent 25% 75%, rgba(148, 163, 184, 0.26) 75%),
    rgba(255, 255, 255, 0.7);
  background-position:
    var(--bing-color-picker-alpha-track-inset) 0,
    0 0,
    5px 5px,
    0 0;
  background-repeat:
    no-repeat,
    repeat,
    repeat,
    repeat;
  background-size:
    calc(100% - var(--bing-color-picker-alpha-track-inset)) 100%,
    10px 10px,
    10px 10px,
    auto;

}

.bing-color-picker__range::-webkit-slider-thumb {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  margin-top: -4px;
  appearance: none;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--bing-color-picker-thumb-color);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35);
}

.bing-color-picker__range::-moz-range-thumb {
  box-sizing: border-box;
  width: 16px;
  height: 16px;
  border: 2px solid #fff;
  border-radius: 50%;
  background: var(--bing-color-picker-thumb-color);
  box-shadow: 0 0 0 1px rgb(0 0 0 / 0.35);
}

.bing-color-picker__range:focus-visible::-webkit-slider-thumb {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-color-picker__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
  margin: -1px;
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .bing-color-picker__field {
    transition: none;
  }

  .bing-color-picker__field,
  .bing-color-picker__spectrum {
    transform: none !important;
  }
}

.bing-color-picker__range:focus-visible::-moz-range-thumb {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}
</style>
