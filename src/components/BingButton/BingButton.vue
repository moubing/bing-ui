<script setup lang="ts">
import { computed, onBeforeUnmount, ref, useSlots, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type {
  BingButtonEmits,
  BingButtonProps,
  BingButtonTextEffect,
  BingButtonTextEffectTrigger,
  BingButtonTextShine,
} from './BingButton.types'
import BingAnimatedText from '../BingAnimatedText/BingAnimatedText.vue'
import { useFormControl } from '../BingForm/useFormControl'
import { enterLiquidHover, leaveLiquidHover, resetLiquidHover } from '../../motion/liquidHover'
import { useClickFeedback } from '../../motion/useClickFeedback'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const props = withDefaults(defineProps<BingButtonProps>(), {
  variant: 'primary',
  size: undefined,
  rounded: 'md',
  htmlType: 'button',
  disabled: undefined,
  loading: false,
  block: false,
  throttle: false,
  throttleDelay: 600,
  textSwap: false,
  shineColor: undefined,
  shineBaseColor: undefined,
  shineSpeed: 1.6,
  shineDelay: 0,
  shineInterval: 2.4,
  shineDirection: 'left',
  shineAngle: 120,
  textJumpY: -6,
  textJumpStagger: 0.035,
  textJumpDuration: 0.34,
  textJumpEase: 'power2.out',
  textJumpReturnEase: 'back.out(2.4)',
  textJumpRepeatDelay: 1.2,
  ariaLabel: undefined,
})

const emit = defineEmits<BingButtonEmits>()
const { resolvedSize, resolvedDisabled } = useFormControl(props, { register: false })
const slots = useSlots()

const lastAcceptedClickAt = ref(0)
const liquidRef = ref<HTMLElement | null>(null)
let isLiquidActive = false
const { playClickFeedback } = useClickFeedback()

const isUnavailable = computed(() => resolvedDisabled.value || props.loading)
const normalizedThrottleDelay = computed(() => Math.max(0, props.throttleDelay))
const hasDefaultSlot = computed(() => Boolean(slots.default))
const hasPrefix = computed(() => Boolean(slots.prefix))
const hasSuffix = computed(() => Boolean(slots.suffix))
const resolvedTextShine = computed<BingButtonTextShine>(
  () => props.textShine ?? (props.variant === 'primary' ? 'always' : 'none'),
)
const resolvedTextEffect = computed<BingButtonTextEffect>(() => {
  if (props.loading && hasDefaultSlot.value) return 'jump'

  if (props.textEffect) {
    return props.textEffect
  }

  return resolvedTextShine.value === 'none' ? 'none' : 'shine'
})
const resolvedTextEffectTrigger = computed<BingButtonTextEffectTrigger>(() => {
  if (props.loading && hasDefaultSlot.value) return 'always'

  if (props.textEffectTrigger) {
    return props.textEffectTrigger
  }

  if (resolvedTextEffect.value === 'jump') {
    return 'hover'
  }

  return resolvedTextShine.value === 'hover' ? 'hover' : 'always'
})
const usesShinyText = computed(() => resolvedTextEffect.value === 'shine')
const hasTextEffect = computed(() => resolvedTextEffect.value !== 'none')

const buttonClasses = computed(() => [
  'bing-button',
  `bing-button--${props.variant}`,
  `bing-button--${resolvedSize.value}`,
  `bing-button--rounded-${props.rounded}`,
  {
    'is-block': props.block,
    'is-disabled': resolvedDisabled.value,
    'is-loading': props.loading,
    'is-icon-only': !hasDefaultSlot.value && (hasPrefix.value || hasSuffix.value),
    [`bing-button--text-${resolvedTextEffect.value}`]: hasTextEffect.value,
    [`bing-button--text-trigger-${resolvedTextEffectTrigger.value}`]: hasTextEffect.value,
    [`bing-button--shine-${resolvedTextEffectTrigger.value}`]: usesShinyText.value,
    [`bing-button--shine-direction-${props.shineDirection}`]: usesShinyText.value,
  },
])

const buttonStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {}

  if (!usesShinyText.value) {
    return style
  }

  style['--animated-text-shine-angle'] = `${props.shineAngle}deg`

  if (props.shineColor) {
    style['--animated-text-shine-color'] = props.shineColor
  }

  if (props.shineBaseColor) {
    style['--animated-text-shine-base-color'] = props.shineBaseColor
  }

  return style
})

function handleClick(event: MouseEvent) {
  if (event.defaultPrevented) return
  if (isUnavailable.value) {
    event.preventDefault()
    return
  }

  const now = Date.now()
  const delay = normalizedThrottleDelay.value
  const elapsed = now - lastAcceptedClickAt.value

  if (props.throttle && delay > 0 && lastAcceptedClickAt.value > 0 && elapsed < delay) {
    event.preventDefault()
    emit('throttled', {
      event,
      remaining: delay - elapsed,
    })
    return
  }

  lastAcceptedClickAt.value = now
  playClickFeedback(event)
  emit('click', event)
}

function handleFocus(event: FocusEvent) {
  emit('focus', event)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
}

function resetLiquid() {
  isLiquidActive = false
  if (liquidRef.value) resetLiquidHover(liquidRef.value)
}

function handlePointerHover(event: PointerEvent) {
  const liquid = liquidRef.value
  if (!liquid || isUnavailable.value || event.pointerType === 'touch') return
  if (prefersReducedMotion()) {
    resetLiquid()
    return
  }

  const button = event.currentTarget as HTMLButtonElement
  const rect = button.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  // 兼容外部容器的缩放，将指针位置还原到按钮内部坐标。
  const localX = (event.clientX - rect.left) * (button.offsetWidth / rect.width) - button.clientLeft
  const localY = (event.clientY - rect.top) * (button.offsetHeight / rect.height) - button.clientTop
  const x = Math.max(0, Math.min(button.clientWidth, localX))
  const y = Math.max(0, Math.min(button.clientHeight, localY))
  liquid.style.setProperty('--button-liquid-x', `${x}px`)
  liquid.style.setProperty('--button-liquid-y', `${y}px`)
  liquid.style.transformOrigin = `${x}px ${y}px`

  if (!isLiquidActive) {
    isLiquidActive = true
    enterLiquidHover(liquid)
  }
}

function handlePointerLeave() {
  if (!isLiquidActive || !liquidRef.value) return
  isLiquidActive = false
  if (prefersReducedMotion()) {
    resetLiquid()
  } else {
    leaveLiquidHover(liquidRef.value)
  }
}

watch([isUnavailable, () => props.variant], ([unavailable, variant]) => {
  if (unavailable || variant === 'primary') resetLiquid()
})

onBeforeUnmount(() => {
  resetLiquid()
})
</script>

<template>
  <button
    :type="htmlType"
    :class="buttonClasses"
    :style="buttonStyle"
    :disabled="isUnavailable"
    :aria-busy="loading || undefined"
    :aria-label="ariaLabel"
    @click="handleClick"
    @focus="handleFocus"
    @blur="handleBlur"
    @pointerenter="handlePointerHover"
    @pointermove="handlePointerHover"
    @pointerleave="handlePointerLeave"
    @pointercancel="resetLiquid"
  >
    <span v-if="variant !== 'primary'" ref="liquidRef" class="bing-button__liquid" aria-hidden="true"></span>
    <span class="bing-button__content">
      <span v-if="!hasDefaultSlot" class="bing-button__loading-indicator" aria-hidden="true">
        <span class="bing-button__spinner"></span>
      </span>

      <span class="bing-button__resting-content">
        <span v-if="hasPrefix" class="bing-button__icon bing-button__icon--prefix">
          <slot name="prefix" />
        </span>
        <span v-if="hasDefaultSlot" class="bing-button__label">
          <BingAnimatedText
            class="bing-button__animated-text"
            :effect="resolvedTextEffect"
            :trigger="resolvedTextEffectTrigger"
            :disabled="resolvedDisabled"
            hover-target=".bing-button"
            :swap="textSwap"
            :shine-speed="shineSpeed"
            :shine-delay="shineDelay"
            :shine-interval="shineInterval"
            :shine-direction="shineDirection"
            :shine-angle="shineAngle"
            :jump-y="textJumpY"
            :jump-stagger="textJumpStagger"
            :jump-duration="textJumpDuration"
            :jump-ease="textJumpEase"
            :jump-return-ease="textJumpReturnEase"
            :jump-repeat-delay="textJumpRepeatDelay"
          >
            <slot />
          </BingAnimatedText>
        </span>
        <span v-if="hasSuffix" class="bing-button__icon bing-button__icon--suffix">
          <slot name="suffix" />
        </span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.bing-button {
  --button-bg: var(--bing-surface-solid);
  --button-color: var(--bing-heading);
  --button-border: var(--bing-border);
  --button-shadow: none;
  --button-sheen-opacity: 0;
  --button-interaction-overlay: rgb(var(--bing-heading-rgb) / 0.05);
  --button-interaction-opacity: 0;
  --button-interaction-scale: 0.94;
  --bing-click-particle-color: var(--bing-muted);
  --button-text-shadow: none;
  --button-text-line-height: 1.22;
  --button-liquid-rgb: var(--bing-liquid-rgb);
  --button-liquid-strength: var(--bing-liquid-strength);
  --animated-text-shine-base-color: currentColor;
  --animated-text-shine-color: rgb(var(--bing-highlight-rgb) / 0.96);
  --animated-text-shine-angle: 120deg;

  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: fit-content;
  flex-shrink: 0;
  max-width: 100%;
  overflow: hidden;
  isolation: isolate;
  border: 1px solid var(--button-border);
  background: var(--button-bg);
  color: var(--button-color);
  cursor: pointer;
  font-weight: var(--bing-font-weight-control, 500);
  line-height: var(--button-text-line-height);
  text-decoration: none;
  text-shadow: var(--button-text-shadow);
  user-select: none;
  vertical-align: middle;
  filter: none;
  box-shadow: var(--button-shadow);
  transition:
    background var(--bing-duration-normal) var(--bing-ease-smooth),
    border-color var(--bing-duration-normal) var(--bing-ease-smooth),
    box-shadow 360ms var(--bing-ease-smooth),
    color var(--bing-duration-normal) var(--bing-ease-smooth),
    filter var(--bing-duration-normal) var(--bing-ease-smooth),
    opacity var(--bing-duration-normal) var(--bing-ease-smooth);
  box-sizing: border-box;
  --button-height: var(--bing-control-height-md, 36px);
}

.bing-button::before {
  position: absolute;
  inset: 1px;
  z-index: 1;
  border-radius: inherit;
  background:
    linear-gradient(180deg, rgb(var(--bing-highlight-rgb) / 0.34), transparent 58%),
    linear-gradient(
      90deg,
      rgb(var(--bing-highlight-rgb) / 0.2),
      transparent 28%,
      transparent 72%,
      rgb(var(--bing-highlight-rgb) / 0.16)
    );
  content: '';
  opacity: var(--button-sheen-opacity);
  pointer-events: none;
  transition: opacity 360ms var(--bing-ease-smooth);
}

.bing-button::after {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: var(--button-interaction-overlay);
  content: '';
  opacity: var(--button-interaction-opacity);
  pointer-events: none;
  transform: scale(var(--button-interaction-scale));
  transition:
    opacity 380ms var(--bing-ease-smooth),
    transform 420ms var(--bing-ease-smooth);
}

.bing-button__liquid {
  --button-liquid-x: 50%;
  --button-liquid-y: 50%;

  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  background: radial-gradient(
    circle at var(--button-liquid-x) var(--button-liquid-y),
    rgb(var(--button-liquid-rgb) / var(--button-liquid-strength)) 0%,
    rgb(var(--button-liquid-rgb) / var(--button-liquid-strength)) 64%,
    rgb(var(--button-liquid-rgb) / calc(var(--button-liquid-strength) * 0.72)) 82%,
    rgb(var(--button-liquid-rgb) / calc(var(--button-liquid-strength) * 0.35)) 100%
  );
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.08);
}

.bing-button:focus-visible {
  outline: 3px solid var(--bing-focus);
  outline-offset: 3px;
}

.bing-button:hover:not(:disabled) {
  --button-interaction-opacity: 0.12;
  --button-interaction-scale: 1;

  filter: brightness(1.02) saturate(1.04);
}

.bing-button:active:not(:disabled) {
  --button-interaction-opacity: 0.2;
  --button-interaction-scale: 1.03;

  filter: brightness(0.98) saturate(1.02);
}

.bing-button:disabled {
  cursor: not-allowed;
  opacity: 0.58;
}

.bing-button.is-loading:not(.is-disabled):disabled {
  cursor: progress;
  opacity: 1;
}

.bing-button.is-block {
  width: 100%;
}

.bing-button--primary {
  --button-liquid-rgb: var(--bing-highlight-rgb);
  --button-liquid-strength: 0.08;
  --button-bg: var(--bing-accent-solid);
  --button-color: var(--bing-accent-contrast);
  --button-border: rgb(var(--bing-accent-solid-rgb) / 0.96);
  --button-shadow: var(--bing-shadow-sm);
  --button-sheen-opacity: 0;
  --button-interaction-overlay: rgb(var(--bing-accent-strong-rgb) / 0.12);
  --button-text-shadow: none;
  --animated-text-shine-base-color: var(--bing-accent-contrast);
  --animated-text-shine-color:
    color-mix(in oklab, var(--bing-accent-contrast) 52%, var(--bing-accent-solid));
}

.bing-button--primary:hover:not(:disabled) {
  --button-interaction-opacity: 0.24;
  --button-interaction-scale: 1;
  --button-shadow: var(--bing-shadow-sm);
  --button-sheen-opacity: 0.06;

  filter: brightness(1.025) saturate(1.06);
}

.bing-button--primary:active:not(:disabled) {
  --button-interaction-opacity: 0.76;
  --button-interaction-scale: 1.08;
  --button-border: rgb(var(--bing-accent-strong-rgb) / 0.94);
  --button-shadow: inset 0 1px 2px rgb(var(--bing-shadow-rgb) / 0.12);
  --button-sheen-opacity: 0.04;

  filter: saturate(1.1);
}

.bing-button--secondary {
  --button-interaction-overlay: transparent;
  --button-bg: var(--bing-surface-muted);
  --button-color: var(--bing-heading);
  --button-border: transparent;
  --button-shadow: none;
  --button-sheen-opacity: 0;
  --animated-text-shine-color: var(--bing-muted);
}

.bing-button--tertiary {
  --button-interaction-overlay: transparent;
  --button-bg: var(--bing-surface-solid);
  --button-color: var(--bing-heading);
  --button-border: var(--bing-border-strong);
  --button-shadow: var(--bing-control-shadow);
  --button-sheen-opacity: 0;
  --animated-text-shine-color: var(--bing-muted);
}

.bing-button--ghost {
  --button-bg: transparent;
  --button-color: var(--bing-text);
  --button-border: transparent;
  --button-shadow: none;
  --button-sheen-opacity: 0;
  --button-interaction-overlay: var(--bing-surface-hover);
  --animated-text-shine-color: var(--bing-muted);
}

.bing-button--ghost:hover:not(:disabled) {
  --button-color: var(--bing-heading);
  --button-border: transparent;
  --button-shadow: none;
  --button-sheen-opacity: 0;
  --button-interaction-opacity: 0.96;
  --button-interaction-scale: 1;

  filter: none;
}

.bing-button--ghost:active:not(:disabled) {
  --button-color: var(--bing-heading);
  --button-border: transparent;
  --button-shadow: none;
  --button-sheen-opacity: 0;
  --button-interaction-opacity: 1;
  --button-interaction-scale: 1.04;

  filter: none;
}

.bing-button--danger {
  --bing-click-particle-color: var(--bing-danger-strong);
  --button-liquid-rgb: var(--bing-danger-rgb);
  --button-liquid-edge-rgb: var(--bing-danger-rgb);
  --button-bg: var(--bing-danger-soft);
  --button-color: var(--bing-danger-strong);
  --button-border: rgb(var(--bing-danger-rgb) / 0.22);
  --animated-text-shine-color: rgb(var(--bing-danger-strong-rgb) / 0.92);
}

.bing-button--success {
  --bing-click-particle-color: var(--bing-success-strong);
  --button-liquid-rgb: var(--bing-success-rgb);
  --button-liquid-edge-rgb: var(--bing-success-rgb);
  --button-bg: var(--bing-success-soft);
  --button-color: var(--bing-success-strong);
  --button-border: rgb(var(--bing-success-rgb) / 0.22);
  --animated-text-shine-color: rgb(var(--bing-success-strong-rgb) / 0.92);
}

.bing-button--warning {
  --bing-click-particle-color: var(--bing-warning-strong);
  --button-liquid-rgb: var(--bing-warning-rgb);
  --button-liquid-edge-rgb: var(--bing-warning-rgb);
  --button-bg: var(--bing-warning-soft);
  --button-color: var(--bing-warning-strong);
  --button-border: rgb(var(--bing-warning-rgb) / 0.24);
  --animated-text-shine-color: rgb(var(--bing-warning-strong-rgb) / 0.96);
}

.bing-button--xs {
  min-height: var(--button-height);
  padding: 0 8px;
  font-size: 0.75rem;
  --button-height: var(--bing-control-height-xs, 28px);
}

.bing-button--sm {
  min-height: var(--button-height);
  padding: 0 10px;
  font-size: var(--bing-font-size-sm);
  --button-height: var(--bing-control-height-sm, 32px);
}

.bing-button--md {
  min-height: var(--button-height);
  padding: 0 12px;
  font-size: var(--bing-font-size-md);
  --button-height: var(--bing-control-height-md, 36px);
}

.bing-button--lg {
  min-height: var(--button-height);
  padding: 0 16px;
  font-size: var(--bing-font-size-md);
  --button-height: var(--bing-control-height-lg, 40px);
}

.bing-button--xl {
  min-height: var(--button-height);
  padding: 0 20px;
  font-size: var(--bing-font-size-lg);
  --button-height: var(--bing-control-height-xl, 44px);
}

.bing-button--rounded-none {
  border-radius: 0;
}

.bing-button--rounded-sm {
  border-radius: var(--bing-radius-sm);
}

.bing-button--rounded-md {
  border-radius: var(--bing-radius-md);
}

.bing-button--rounded-lg {
  border-radius: var(--bing-radius-lg);
}

.bing-button--rounded-full {
  border-radius: 999px;
}

.bing-button.is-icon-only {
  aspect-ratio: 1;
  padding-inline: 0;
}

.bing-button--xs.is-icon-only {
  width: var(--button-height);
}

.bing-button--sm.is-icon-only {
  width: var(--button-height);
}

.bing-button--md.is-icon-only {
  width: var(--button-height);
}

.bing-button--lg.is-icon-only {
  width: var(--button-height);
}

.bing-button--xl.is-icon-only {
  width: var(--button-height);
}

.bing-button__content {
  position: relative;
  z-index: 2;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.bing-button__resting-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  gap: 0.58em;
  opacity: 1;
  transition: opacity var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-button__loading-indicator {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-button.is-loading.is-icon-only .bing-button__resting-content {
  opacity: 0;
  transition-delay: 80ms;
}

.bing-button.is-loading .bing-button__loading-indicator {
  opacity: 1;
  transition-delay: 80ms;
}

.bing-button__label {
  display: block;
  min-width: 0;
  padding-block: 0.06em;
  margin-block: -0.06em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: var(--button-text-line-height);
}

.bing-button--text-jump .bing-button__label {
  padding-block: 8px;
  margin-block: -8px;
}

.bing-button__animated-text {
  display: block;
  max-width: 100%;
  line-height: inherit;
  /* loading 拆字前后使用相同字距，避免英文连字或字偶距导致按钮变宽。 */
  font-kerning: none;
  font-variant-ligatures: none;
  text-rendering: optimizeSpeed;
}

/* 省略号必须落在实际承载文字的行盒上；装饰拆字层仍保留原有测量和定位。 */
.bing-button__animated-text :deep(.bing-animated-text__content) {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
}

.bing-button__icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  width: var(--button-icon-size, 1rem);
  height: var(--button-icon-size, 1rem);
}

.bing-button__icon :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

.bing-button__spinner {
  width: 1em;
  height: 1em;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 999px;
  animation: bing-spin 800ms linear infinite;
}

@keyframes bing-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-button__liquid {
    display: none;
  }

  .bing-button,
  .bing-button::before,
  .bing-button::after,
  .bing-button__resting-content,
  .bing-button__loading-indicator,
  .bing-button__spinner {
    animation: none;
    transition: none;
  }
}
</style>
