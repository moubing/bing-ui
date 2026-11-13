<script lang="ts">
let colorPickerIdSeed = 0

const defaultPanelWidth = 320
const defaultTriggerWidth = 280
const commitDebounceDelay = 180
</script>

<script setup lang="ts">
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import { useClickFeedback } from '../../motion/useClickFeedback'
import { useFormControl, isolateFormControls } from '../BingForm/useFormControl'
import { useOverlay } from '../../utils/overlay'
import { computeFloatingPosition, useFloatingAutoUpdate } from '../../utils/floating'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { ChevronDown } from '../../icons'
import { gsap } from 'gsap'
import BingIcon from '../BingIcon/BingIcon.vue'
import {
  createGlassCssVariables,
  defaultGlassEffect,
} from '../../utils/glass'
import { writeTextWithClipboardApi, writeTextWithTextareaFallback } from '../../utils/clipboard'
import BingColorPickerFormatEditor from './BingColorPickerFormatEditor.vue'
import BingColorPickerSpectrum from './BingColorPickerSpectrum.vue'
import {
  clamp,
  createColorValue,
  defaultColor,
  defaultPresets,
  getColorFormatValue,
  getHueFromHex,
  hexToRgb,
  hsvToRgb,
  normalizeAlpha,
  normalizeCssLength,
  normalizeHex,
  normalizeHue,
  normalizePreset,
  parseColorInput,
  parseCssSize,
  resolveAlpha,
  resolveColor,
  rgbToHex,
  rgbToHsv,
} from './BingColorPicker.utils'
import type { HsvColor, NormalizedPreset, ParsedColor } from './BingColorPicker.utils'
import type {
  BingColorPickerChangePayload,
  BingColorPickerEmits,
  BingColorPickerExpose,
  BingColorPickerFormat,
  BingColorPickerProps,
} from './BingColorPicker.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const { vClickFeedback, playClickFeedback } = useClickFeedback()
const props = withDefaults(defineProps<BingColorPickerProps>(), {
  id: undefined,
  modelValue: defaultColor,
  presets: () => defaultPresets,
  disabled: undefined,
  size: undefined,
  block: false,
  width: undefined,
  minWidth: 180,
  panelWidth: defaultPanelWidth,
  copyLabel: '复制',
  copiedLabel: '已复制',
  copyResetDelay: 1400,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
  glass: defaultGlassEffect.glass,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
})

const emit = defineEmits<BingColorPickerEmits>()
const clientReady = useClientReady()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby } = useFormControl(props)
isolateFormControls()

const colorPickerId = `bing-color-picker-${++colorPickerIdSeed}`
const panelId = `${colorPickerId}-panel`

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const spectrumRef = ref<InstanceType<typeof BingColorPickerSpectrum> | null>(null)
const committedHex = ref(resolveColor(props.modelValue))
const committedAlpha = ref(resolveAlpha(props.modelValue))
const selectedHex = ref(committedHex.value)
const selectedAlpha = ref(committedAlpha.value)
const selectedFormat = ref<BingColorPickerFormat>('hex')
const activeHue = ref(rgbToHsv(hexToRgb(selectedHex.value)).h)
const isOpen = ref(false)
const shouldRenderPanel = ref(false)
const copiedFormat = ref<BingColorPickerFormat | null>(null)
const panelPosition = ref({
  left: 0,
  placement: 'bottom' as 'bottom' | 'top',
  top: 0,
  width: defaultPanelWidth,
})

let isListeningForOutside = false
let panelTimeline: gsap.core.Timeline | undefined
let copyResetTimer: number | undefined
let commitTimer: number | undefined
let pendingCommitSource: BingColorPickerChangePayload['source'] | undefined
let pendingModelEcho: { value: string } | undefined

const glassStyle = computed(() =>
  createGlassCssVariables('bing-color-picker', {
    glass: props.glass,
    glassBlur: props.glassBlur,
    glassOpacity: props.glassOpacity,
    glassSaturation: props.glassSaturation,
  }),
)
const rootStyle = computed(() => {
  const style: Record<string, string> = {
    '--bing-color-picker-min-width': normalizeCssLength(props.minWidth),
    '--bing-color-picker-width': `${defaultTriggerWidth}px`,
    ...glassStyle.value,
  }

  if (props.width !== undefined) {
    style['--bing-color-picker-width'] = normalizeCssLength(props.width)
  }

  return style
})
const panelAutoUpdate = useFloatingAutoUpdate(updatePanelPosition, {
  enabled: () => isOpen.value,
})

const overlayZIndex = useConfigZIndex('colorPicker')
const overlay = useOverlay({
  open: () => shouldRenderPanel.value,
  elements: () => [rootRef.value, panelRef.value],
  zIndex: () => overlayZIndex.value,
  onEscape: () => closePanel(true),
})

const panelStyle = computed<CSSProperties>(() => ({
  left: `${panelPosition.value.left}px`,
  position: 'fixed',
  top: `${panelPosition.value.top}px`,
  width: `${panelPosition.value.width}px`,
  zIndex: overlay.zIndex.value,
  ...glassStyle.value,
}) as CSSProperties)
const rootClasses = computed(() => [
  'bing-color-picker',
  `bing-color-picker--${resolvedSize.value}`,
  `bing-color-picker--status-${resolvedStatus.value}`,
  {
    'is-open': isOpen.value,
    'is-block': props.block || Boolean(formItem),
    'is-disabled': resolvedDisabled.value,
    'is-invalid': resolvedStatus.value === 'error',
  },
])
const panelClasses = computed(() => [
  'bing-color-picker__panel',
  `is-placement-${panelPosition.value.placement}`,
  {
    'is-glass': props.glass,
  },
])
const selectedColor = computed(() => createColorValue(selectedHex.value, selectedAlpha.value))
const committedColor = computed(() => createColorValue(committedHex.value, committedAlpha.value))
const currentHsv = computed<HsvColor>(() => ({
  ...rgbToHsv(selectedColor.value.rgb),
  h: activeHue.value,
}))
const committedColorStyle = computed<CSSProperties>(() => ({
  '--bing-color-picker-selected-color': committedColor.value.rgba,
}) as CSSProperties)
const normalizedPresets = computed(() =>
  props.presets
    .map(normalizePreset)
    .filter((preset): preset is NormalizedPreset => Boolean(preset)),
)
const triggerDisplayValue = computed(() =>
  getColorFormatValue(committedColor.value, selectedFormat.value),
)
const triggerAriaLabel = computed(
  () => props.ariaLabel ?? `已选颜色 ${triggerDisplayValue.value}`,
)

watch(
  () => props.modelValue,
  (value) => {
    if (pendingModelEcho?.value === value) {
      pendingModelEcho = undefined
      return
    }
    pendingModelEcho = undefined
    syncSelectedColor(value)
  },
)

watch(
  () => [props.panelWidth, props.presets.length],
  () => {
    if (isOpen.value) {
      void nextTick(panelAutoUpdate.schedule)
    }
  },
)

watch(
  () => resolvedDisabled.value,
  (disabled) => {
    if (disabled) {
      closePanel()
    }
  },
)

onBeforeUnmount(() => {
  removeOutsideListener()
  panelAutoUpdate.dispose()
  clearCopyResetTimer()
  clearCommitTimer()
  killPanelTimeline()
  gsap.killTweensOf([panelRef.value, ...getPanelItemElements()].filter(Boolean))
})

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function syncSelectedColor(value: string | null | undefined) {
  const parsed = parseColorInput(value)
  const normalized = parsed?.hex ?? defaultColor

  clearCommitTimer()
  pendingCommitSource = undefined
  selectedHex.value = normalized
  selectedAlpha.value = parsed?.alpha ?? 1
  committedHex.value = normalized
  committedAlpha.value = parsed?.alpha ?? 1
  activeHue.value = getHueFromHex(normalized, activeHue.value)
}

function getChangePayload(source: BingColorPickerChangePayload['source']) {
  return {
    ...selectedColor.value,
    value: selectedColor.value.hex,
    source,
  }
}

function clearCommitTimer() {
  if (!isBrowser() || commitTimer === undefined) {
    commitTimer = undefined
    return
  }

  window.clearTimeout(commitTimer)
  commitTimer = undefined
}

function flushColorCommit(source = pendingCommitSource) {
  clearCommitTimer()

  const commitSource = source ?? 'field'
  const normalized = selectedColor.value.hex
  const hasChanged =
    committedHex.value !== normalized || committedAlpha.value !== selectedAlpha.value
  const hasPendingCommit = pendingCommitSource !== undefined

  pendingCommitSource = undefined

  if (!hasChanged && !hasPendingCommit) {
    return
  }

  committedHex.value = normalized
  committedAlpha.value = selectedAlpha.value
  // The public model is RGB hex; its own v-model echo must retain local alpha.
  const modelEcho = { value: normalized }
  pendingModelEcho = modelEcho
  emit('update:modelValue', normalized)
  emit('change', getChangePayload(commitSource))
  formItem?.handleControlChange()
  void nextTick(() => {
    if (pendingModelEcho === modelEcho) pendingModelEcho = undefined
  })
}

function scheduleColorCommit(source: BingColorPickerChangePayload['source']) {
  pendingCommitSource = source
  clearCommitTimer()

  if (!isBrowser()) {
    flushColorCommit(source)
    return
  }

  commitTimer = window.setTimeout(() => {
    flushColorCommit(source)
  }, commitDebounceDelay)
}

function commitColor(
  hex: string,
  source: BingColorPickerChangePayload['source'],
  options: { immediate?: boolean } = {},
) {
  const normalized = normalizeHex(hex)

  if (!normalized) {
    return
  }

  if (source === 'preset') {
    activeHue.value = getHueFromHex(normalized, activeHue.value)
  }

  selectedHex.value = normalized

  if (options.immediate) {
    flushColorCommit(source)
    return
  }

  scheduleColorCommit(source)
}

function commitParsedColor(
  parsed: ParsedColor,
  source: BingColorPickerChangePayload['source'],
  options: { immediate?: boolean } = {},
) {
  const normalized = normalizeHex(parsed.hex)

  if (!normalized) {
    return
  }

  selectedHex.value = normalized
  selectedAlpha.value = normalizeAlpha(parsed.alpha)
  activeHue.value = getHueFromHex(normalized, activeHue.value)

  if (options.immediate) {
    flushColorCommit(source)
    return
  }

  scheduleColorCommit(source)
}

function commitHsvColor(
  hue: number,
  saturation: number,
  value: number,
  source: BingColorPickerChangePayload['source'],
) {
  const normalizedHue = normalizeHue(hue)

  activeHue.value = normalizedHue
  commitColor(
    rgbToHex(
      hsvToRgb({
        h: normalizedHue,
        s: clamp(saturation, 0, 100),
        v: clamp(value, 0, 100),
      }),
    ),
    source,
  )
}

function commitAlpha(alpha: number) {
  selectedAlpha.value = normalizeAlpha(alpha)
  scheduleColorCommit('alpha')
}

function handleFormatCommit(parsed: ParsedColor, immediate: boolean) {
  commitParsedColor(parsed, 'input', { immediate })
}

function handleFormatBlur() {
  formItem?.handleControlBlur()
}

function selectPreset(preset: NormalizedPreset) {
  commitColor(preset.value, 'preset', { immediate: true })
}

function addOutsideListener() {
  if (!isBrowser() || isListeningForOutside) {
    return
  }

  window.addEventListener('pointerdown', handleWindowPointerDown, true)
  isListeningForOutside = true
}

function removeOutsideListener() {
  if (!isBrowser() || !isListeningForOutside) {
    return
  }

  window.removeEventListener('pointerdown', handleWindowPointerDown, true)
  isListeningForOutside = false
}

function updatePanelPosition() {
  if (!isBrowser() || !rootRef.value || !panelRef.value) {
    return
  }

  const viewportPadding = 12
  const panelGap = 8
  const anchorRect = rootRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const configuredWidth = parseCssSize(props.panelWidth, defaultPanelWidth)
  const maxWidth = Math.max(0, viewportWidth - viewportPadding * 2)
  const width = Math.min(Math.max(anchorRect.width, configuredWidth), maxWidth)
  panelRef.value.style.width = `${width}px`
  const panelHeight = panelRef.value.offsetHeight || 340
  const { side, left, top } = computeFloatingPosition({
    anchor: anchorRect,
    floating: { width, height: panelHeight },
    side: 'bottom',
    gap: panelGap,
    padding: viewportPadding,
    viewport: { width: viewportWidth, height: viewportHeight },
  })

  panelPosition.value = {
    left,
    placement: side as 'bottom' | 'top',
    top,
    width,
  }
}

function getPanelStaticElements() {
  return Array.from(
    panelRef.value?.querySelectorAll<HTMLElement>(
      '.bing-color-picker__spectrum, .bing-color-picker__format-editor',
    ) ?? [],
  )
}

function getPanelPresetElements() {
  return Array.from(
    panelRef.value?.querySelectorAll<HTMLElement>(
      '.bing-color-picker__preset-color',
    ) ?? [],
  )
}

function getPanelItemElements() {
  return [...getPanelStaticElements(), ...getPanelPresetElements()]
}

function killPanelTimeline() {
  panelTimeline?.kill()
  panelTimeline = undefined
}

function playOpenAnimation() {
  const panel = panelRef.value

  if (!panel) {
    return
  }

  const staticItems = getPanelStaticElements()
  const presetItems = getPanelPresetElements()
  const items = [...staticItems, ...presetItems]
  const opensAbove = panelPosition.value.placement === 'top'
  killPanelTimeline()
  gsap.killTweensOf([panel, ...items])

  if (prefersReducedMotion()) {
    gsap.set([panel, ...items], {
      autoAlpha: 1,
      y: 0,
      clearProps: 'transform',
    })
    return
  }

  panelTimeline = gsap.timeline({
    defaults: {
      duration: 0.22,
      ease: 'power3.out',
      overwrite: true,
    },
    onComplete: () => {
      gsap.set([panel, ...items], {
        clearProps: 'transform',
      })
      panelTimeline = undefined
    },
  })

  panelTimeline
    .fromTo(
      panel,
      {
        autoAlpha: 0,
        y: opensAbove ? 6 : -6,
        transformOrigin: opensAbove ? '50% 100%' : '50% 0%',
      },
      {
        autoAlpha: 1,
        force3D: false,
        y: 0,
        duration: 0.2,
      },
      0,
    )
    .fromTo(
      staticItems,
      {
        autoAlpha: 0,
        y: opensAbove ? -4 : 4,
      },
      {
        autoAlpha: 1,
        force3D: false,
        y: 0,
        duration: 0.16,
      },
      0.05,
    )
    .fromTo(
      presetItems,
      {
        autoAlpha: 0,
        y: opensAbove ? -4 : 4,
      },
      {
        autoAlpha: 1,
        force3D: false,
        y: 0,
        duration: 0.18,
        stagger: 0.02,
      },
      0.06,
    )
}

function finishClose(restoreFocus: boolean) {
  shouldRenderPanel.value = false

  if (restoreFocus) {
    triggerRef.value?.focus()
  }
}

function playCloseAnimation(restoreFocus = false) {
  const panel = panelRef.value

  if (!panel || prefersReducedMotion()) {
    finishClose(restoreFocus)
    return
  }

  const staticItems = getPanelStaticElements()
  const presetItems = getPanelPresetElements()
  const items = [...staticItems, ...presetItems]
  const closesAbove = panelPosition.value.placement === 'top'
  killPanelTimeline()
  gsap.killTweensOf([panel, ...items])

  panelTimeline = gsap.timeline({
    defaults: {
      duration: 0.14,
      ease: 'power2.in',
      overwrite: true,
    },
    onComplete: () => {
      panelTimeline = undefined
      finishClose(restoreFocus)
    },
  })

  panelTimeline
    .to(
      presetItems,
      {
        autoAlpha: 0,
        force3D: false,
        y: closesAbove ? 4 : -4,
        stagger: {
          each: 0.012,
          from: 'end',
        },
      },
      0,
    )
    .to(
      staticItems,
      {
        autoAlpha: 0,
        force3D: false,
        y: closesAbove ? 4 : -4,
        duration: 0.12,
      },
      0.02,
    )
    .to(
      panel,
      {
        autoAlpha: 0,
        force3D: false,
        y: closesAbove ? 6 : -6,
        duration: 0.16,
      },
      0.02,
    )
}

async function openPanel() {
  if (resolvedDisabled.value || isOpen.value) {
    return
  }

  shouldRenderPanel.value = true
  isOpen.value = true
  addOutsideListener()
  panelAutoUpdate.start()
  emit('open')

  await nextTick()
  updatePanelPosition()
  playOpenAnimation()
}

function closePanel(restoreFocus = false) {
  if (!isOpen.value) {
    return
  }

  if (pendingCommitSource) {
    flushColorCommit(pendingCommitSource)
  }

  isOpen.value = false
  removeOutsideListener()
  spectrumRef.value?.cancelDrag()
  panelAutoUpdate.dispose()
  emit('close')
  playCloseAnimation(restoreFocus)
}

function togglePanel() {
  if (resolvedDisabled.value) {
    return
  }

  if (isOpen.value) {
    closePanel()
    return
  }

  void openPanel()
}

function isPickerInteractionTarget(target: EventTarget | null): target is Node {
  if (!(target instanceof Node)) {
    return false
  }

  return Boolean(overlay.contains(target) || rootRef.value?.contains(target) || panelRef.value?.contains(target))
}

function handleWindowPointerDown(event: PointerEvent) {
  if (!isPickerInteractionTarget(event.target)) {
    closePanel()
  }
}

function handleTriggerBlur(event: FocusEvent) {
  if (isPickerInteractionTarget(event.relatedTarget)) {
    return
  }

  formItem?.handleControlBlur()
}

function handleKeydown(event: KeyboardEvent) {
  if (resolvedDisabled.value) return
  if (event.key === 'Escape' && (event.defaultPrevented || !overlay.isTop(event))) return
  if (event.key === 'Escape' && isOpen.value) {
    event.preventDefault()
    closePanel(true)
    return
  }

  if (
    event.currentTarget === triggerRef.value &&
    (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown')
  ) {
    event.preventDefault()
    playClickFeedback(event, triggerRef.value)
    void openPanel()
  }
}

function clearCopyResetTimer() {
  if (!isBrowser() || copyResetTimer === undefined) {
    copyResetTimer = undefined
    return
  }

  window.clearTimeout(copyResetTimer)
  copyResetTimer = undefined
}

function scheduleCopyReset() {
  clearCopyResetTimer()

  if (!isBrowser()) {
    return
  }

  copyResetTimer = window.setTimeout(() => {
    copyResetTimer = undefined
    copiedFormat.value = null
  }, Math.max(0, props.copyResetDelay))
}

async function copyFormatValue(format: BingColorPickerFormat, value: string) {
  try {
    let clipboardError: unknown
    let copiedWithClipboard = false

    try {
      copiedWithClipboard = await writeTextWithClipboardApi(value)
    } catch (error) {
      clipboardError = error
    }

    const copied = copiedWithClipboard || writeTextWithTextareaFallback(value)

    if (!copied) {
      throw clipboardError instanceof Error
        ? clipboardError
        : new Error('复制功能暂不可用。')
    }

    copiedFormat.value = format
    emit('copy', {
      color: selectedColor.value,
      format,
      value,
    })

    await nextTick()
    scheduleCopyReset()
  } catch (error) {
    emit('copyError', error instanceof Error ? error : new Error(String(error)))
  }
}

defineExpose<BingColorPickerExpose>({
  focus: () => triggerRef.value?.focus(),
  blur: () => triggerRef.value?.blur(),
  openPanel: () => {
    void openPanel()
  },
  closePanel: () => closePanel(true),
})
</script>

<template>
  <div ref="rootRef" :class="rootClasses" :style="rootStyle">
    <button v-click-feedback
      :id="resolvedId"
      ref="triggerRef"
      class="bing-color-picker__trigger"
      type="button"
      :disabled="resolvedDisabled"
      :aria-label="triggerAriaLabel"
      :aria-describedby="resolvedAriaDescribedby"
      :aria-invalid="resolvedStatus === 'error' || undefined"
      aria-haspopup="dialog"
      :aria-expanded="isOpen"
      :aria-controls="panelId"
      @click="togglePanel"
      @blur="handleTriggerBlur"
      @keydown="handleKeydown"
    >
      <span class="bing-color-picker__swatch-wrap" aria-hidden="true">
        <span class="bing-color-picker__swatch" :style="committedColorStyle"></span>
      </span>
      <span class="bing-color-picker__trigger-value">
        <span class="bing-color-picker__trigger-format">{{ triggerDisplayValue }}</span>
      </span>
      <span class="bing-color-picker__chevron" aria-hidden="true">
        <BingIcon :icon="ChevronDown" size="sm" :stroke-width="1.75" />
      </span>
    </button>

    <Teleport v-if="clientReady" to="body">
      <div
        v-if="shouldRenderPanel"
        :id="panelId"
        ref="panelRef"
        :class="panelClasses"
        :style="panelStyle"
        role="dialog"
        :aria-label="triggerAriaLabel"
        @keydown="handleKeydown"
        @pointerdown.stop
        @click.stop
      >
        <BingScrollbar class="bing-color-picker__scroll" :focusable="false">
          <div class="bing-color-picker__body">
            <BingColorPickerSpectrum
              ref="spectrumRef"
              :id-prefix="colorPickerId"
              :hue="currentHsv.h"
              :saturation="currentHsv.s"
              :value="currentHsv.v"
              :color="selectedColor"
              :alpha="selectedAlpha"
              :disabled="resolvedDisabled"
              @hsv-change="commitHsvColor"
              @alpha-change="commitAlpha"
              @commit="flushColorCommit"
            />

            <div class="bing-color-picker__presets" aria-label="预设颜色">
              <button v-click-feedback
                v-for="preset in normalizedPresets"
                :key="preset.value"
                class="bing-color-picker__preset"
                :class="{ 'is-selected': preset.value === selectedColor.hex }"
                type="button"
                :aria-label="`选择 ${preset.label}`"
                :aria-pressed="preset.value === selectedColor.hex"
                :title="preset.label"
                :disabled="resolvedDisabled"
                @click="selectPreset(preset)"
              >
                <span class="bing-color-picker__preset-surface" aria-hidden="true">
                  <span
                    class="bing-color-picker__preset-color"
                    :style="{ backgroundColor: preset.value }"
                  ></span>
                </span>
              </button>
            </div>

            <BingColorPickerFormatEditor
              v-model:format="selectedFormat"
              :id-prefix="colorPickerId"
              :color="selectedColor"
              :disabled="resolvedDisabled"
              :copied="copiedFormat === selectedFormat"
              :copy-label="copyLabel"
              :copied-label="copiedLabel"
              @commit="handleFormatCommit"
              @blur="handleFormatBlur"
              @copy="copyFormatValue"
            />
          </div>
        </BingScrollbar>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bing-color-picker {
  --bing-color-picker-height: var(--bing-control-height-md, 36px);
  --bing-color-picker-radius: 6px;
  --bing-color-picker-min-width: 180px;
  --bing-color-picker-width: 280px;
  --bing-color-picker-swatch-size: 20px;
  --bing-color-picker-font-size: 14px;
  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  width: var(--bing-color-picker-width);
  min-width: min(100%, var(--bing-color-picker-min-width));
  max-width: 100%;
  color: var(--bing-text);
  font-size: var(--bing-color-picker-font-size);
  font-weight: 400;
  vertical-align: middle;
}

.bing-color-picker.is-block {
  display: flex;
  width: 100%;
}

.bing-color-picker--sm {
  --bing-color-picker-height: var(--bing-control-height-sm, 32px);
  --bing-color-picker-swatch-size: 18px;
  --bing-color-picker-font-size: 13px;
}

.bing-color-picker--lg {
  --bing-color-picker-height: var(--bing-control-height-lg, 40px);
  --bing-color-picker-swatch-size: 22px;
}

.bing-color-picker__trigger {
  box-sizing: border-box;
  position: relative;
  display: grid;
  width: 100%;
  min-width: 0;
  min-height: var(--bing-color-picker-height);
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  padding: 0 4px 0 10px;
  border: 1px solid var(--bing-control-border);
  border-radius: var(--bing-color-picker-radius);
  background: var(--bing-control-bg);
  box-shadow: var(--bing-control-shadow);
  color: var(--bing-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: border-color var(--bing-duration-fast) var(--bing-ease-smooth), background var(--bing-duration-fast) var(--bing-ease-smooth), box-shadow var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-color-picker__trigger:hover:not(:disabled) {
  border-color: var(--bing-control-hover-border);
  background: var(--bing-control-hover-bg);
}

.bing-color-picker.is-open .bing-color-picker__trigger,
.bing-color-picker__trigger:focus-visible {
  border-color: var(--bing-control-hover-border);
  box-shadow: var(--bing-control-focus-shadow);
}

.bing-color-picker.bing-color-picker--status-error:not(.is-disabled) .bing-color-picker__trigger {
  border-color: var(--bing-danger);
}

.bing-color-picker.bing-color-picker--status-success:not(.is-disabled) .bing-color-picker__trigger {
  border-color: rgb(var(--bing-success-rgb) / 0.3);
}

.bing-color-picker.bing-color-picker--status-warning:not(.is-disabled) .bing-color-picker__trigger {
  border-color: rgb(var(--bing-warning-rgb) / 0.38);
}

.bing-color-picker__trigger:disabled {
  border-color: var(--bing-control-disabled-border);
  background: var(--bing-control-disabled-bg);
  box-shadow: none;
  color: var(--bing-disabled-text);
  cursor: not-allowed;
}

.bing-color-picker__swatch-wrap,
.bing-color-picker__swatch,
.bing-color-picker__trigger-value,
.bing-color-picker__chevron {
  position: relative;
  z-index: 1;
}

.bing-color-picker__swatch-wrap {
  box-sizing: border-box;
  display: inline-grid;
  width: var(--bing-color-picker-swatch-size);
  height: var(--bing-color-picker-swatch-size);
  place-items: stretch;
  overflow: hidden;
  border: 1px solid var(--bing-border-strong);
  border-radius: 4px;
  background: conic-gradient(#d4d4d8 25%, #fff 0 50%, #d4d4d8 0 75%, #fff 0) 0 0 / 8px 8px;
}

.bing-color-picker__swatch {
  width: 100%;
  height: 100%;
  background: var(--bing-color-picker-selected-color);
}

.bing-color-picker__trigger-value {
  display: block;
  min-width: 0;
}

.bing-color-picker__trigger-format {
  display: block;
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font: inherit;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-color-picker__chevron {
  display: inline-grid;
  width: 24px;
  height: 24px;
  place-items: center;
  color: var(--bing-muted);
  transition: transform var(--bing-duration-normal) var(--bing-ease-smooth);
}

.bing-color-picker.is-open .bing-color-picker__chevron {
  transform: rotate(180deg);
}

.bing-color-picker__scroll {
  --bing-scrollbar-gutter: 0px;
  max-height: calc(100vh - 26px);
  border-radius: inherit;
}

.bing-color-picker__scroll :deep(.bing-scrollbar__viewport) {
  overscroll-behavior: contain;
}

.bing-color-picker__body {
  display: grid;
  align-content: start;
  gap: 10px;
  padding: 12px;
}

.bing-color-picker__panel {
  box-sizing: border-box;
  max-width: calc(100vw - 24px);
  max-height: calc(100vh - 24px);
  border: 1px solid var(--bing-popover-border);
  border-radius: 8px;
  background: rgb(var(--bing-surface-rgb) / var(--bing-color-picker-glass-opacity, 0.86));
  background-clip: padding-box;
  color: var(--bing-text);
  font-size: 13px;
  font-weight: 400;
  box-shadow: var(--bing-popover-shadow);
  opacity: 0;
  transform-origin: 50% 0%;
  visibility: hidden;
  backdrop-filter: blur(var(--bing-color-picker-glass-blur, 16px)) saturate(var(--bing-color-picker-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-color-picker-glass-blur, 16px)) saturate(var(--bing-color-picker-glass-saturation, 1.05));
}

.bing-color-picker__panel.is-placement-top {
  transform-origin: 50% 100%;
}

.bing-color-picker__presets {
  --bing-color-picker-preset-gap: 6px;

  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(8, minmax(0, 1fr));
  gap: 0;
  margin: calc(var(--bing-color-picker-preset-gap) / -2);
}

.bing-color-picker__preset {
  box-sizing: border-box;
  display: inline-grid;
  min-width: 0;
  aspect-ratio: 1;
  place-items: stretch;
  padding: calc(var(--bing-color-picker-preset-gap) / 2);
  border: 0;
  background: transparent;
  cursor: pointer;
}

.bing-color-picker__preset-surface {
  box-sizing: border-box;
  display: inline-grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  transition: border-color var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-color-picker__preset:hover:not(:disabled) > .bing-color-picker__preset-surface,
.bing-color-picker__preset.is-selected > .bing-color-picker__preset-surface {
  border-color: var(--bing-heading);
}

.bing-color-picker__preset:focus-visible {
  outline: none;
}

.bing-color-picker__preset:focus-visible > .bing-color-picker__preset-surface {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-color-picker__preset:disabled {
  cursor: not-allowed;
  opacity: 0.56;
}

.bing-color-picker__preset-color {
  box-sizing: border-box;
  width: calc(100% - 4px);
  height: calc(100% - 4px);
  border: 1px solid var(--bing-border);
  border-radius: 3px;
}

@media (max-width: 420px) {
  .bing-color-picker__panel {
    padding: 10px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-color-picker__trigger,
  .bing-color-picker__chevron,
  .bing-color-picker__preset,
  .bing-color-picker__preset-surface,
  .bing-color-picker__preset-color {
    transition: none;
  }

  .bing-color-picker__panel,
  .bing-color-picker__preset,
  .bing-color-picker__preset-surface,
  .bing-color-picker__preset-color {
    transform: none !important;
  }
}

.bing-color-picker__trigger:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 1px;
}

.bing-color-picker.is-disabled .bing-color-picker__swatch-wrap { opacity: 0.5; }

.bing-color-picker.is-disabled .bing-color-picker__chevron { color: var(--bing-disabled-text); }
</style>
