<script setup lang="ts">
import { useClickFeedback } from '../../motion/useClickFeedback'
import { useFormControl } from '../BingForm/useFormControl'
import { computed, inject, onBeforeUnmount, onMounted, ref, useSlots } from 'vue'
import type { CSSProperties } from 'vue'
import { checkboxMarkPaths } from '../../icons'
import { bingCheckboxGroupContextKey } from '../BingCheckboxGroup/BingCheckboxGroup.context'
import type { BingCheckboxEmits, BingCheckboxProps } from './BingCheckbox.types'
import { useCheckboxMotion } from './useCheckboxMotion'

const props = withDefaults(defineProps<BingCheckboxProps>(), {
  id: undefined,
  modelValue: false,
  indeterminate: false,
  disabled: undefined,
  size: undefined,
  shape: 'rounded',
  tone: 'primary',
  label: undefined,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
  name: undefined,
  value: undefined,
  decorative: false,
})

const emit = defineEmits<BingCheckboxEmits>()
const { playClickFeedback } = useClickFeedback()
const slots = useSlots()
const checkboxGroup = inject(bingCheckboxGroupContextKey, null)
const { formItem, resolvedSize, resolvedDisabled, resolvedStatus, resolvedId, resolvedAriaDescribedby } = useFormControl({
  get id() { return props.id },
  get size() { return props.size ?? checkboxGroup?.size.value },
  get disabled() { return checkboxGroup?.disabled.value || props.disabled },
  get status() { return props.status ?? checkboxGroup?.status.value },
  get ariaDescribedby() { return props.ariaDescribedby },
}, { register: !checkboxGroup })

const rootRef = ref<HTMLElement | null>(null)
const mounted = ref(false)
const controlRef = ref<HTMLElement | null>(null)
const fillRef = ref<HTMLElement | null>(null)
const checkRef = ref<SVGPathElement | null>(null)
const mixedRef = ref<SVGPathElement | null>(null)
let nativeClick: MouseEvent | undefined
let unregister: (() => void) | undefined

const hasLabel = computed(() => Boolean(props.label || slots.default))

const resolvedName = computed(() => props.name ?? checkboxGroup?.name.value)
const isChecked = computed(() => {
  if (!checkboxGroup) {
    return props.modelValue
  }

  return checkboxGroup.modelValue.value.some((value) => value === props.value)
})
const { isAnimating, isCheckExiting, reducedMotion, playNative, markDirect } = useCheckboxMotion(
  { root: rootRef, fill: fillRef, check: checkRef, mixed: mixedRef },
  { checked: () => isChecked.value, mixed: () => props.indeterminate,
    status: () => resolvedStatus.value, decorative: () => props.decorative },
)
const rootClasses = computed(() => [
  'bing-checkbox',
  typeof resolvedSize.value === 'string' ? `bing-checkbox--${resolvedSize.value}` : undefined,
  `bing-checkbox--${props.shape}`,
  `bing-checkbox--${props.tone}`,
  `bing-checkbox--status-${resolvedStatus.value}`,
  {
    'is-checked': isChecked.value,
    'is-indeterminate': props.indeterminate,
    'is-disabled': resolvedDisabled.value,
    'is-invalid': resolvedStatus.value === 'error',
    'is-decorative': props.decorative,
    'is-check-exiting': isCheckExiting.value,
    'is-animating': isAnimating.value,
    // 系统偏好在服务端不可知，水合完成后再添加对应样式类。
    'is-reduced-motion': mounted.value && reducedMotion.value,
    'has-label': hasLabel.value && !props.decorative,
  },
])

const rootStyle = computed<CSSProperties | undefined>(() => {
  if (typeof resolvedSize.value !== 'number') {
    return undefined
  }

  return {
    '--bing-checkbox-size': `${resolvedSize.value}px`,
    '--bing-checkbox-default-stroke': `${resolvedSize.value * 1.75 / 18}px`,
    '--bing-checkbox-radius': props.shape === 'circle' ? '50%' : `${Math.max(2, Math.round(resolvedSize.value * 0.22))}px`,
  }
})

function handleClick(event: MouseEvent) {
  if (event.defaultPrevented || resolvedDisabled.value || props.decorative) return
  nativeClick = event
}

function handleChange(event: Event) {
  if (resolvedDisabled.value || props.decorative) return
  const target = event.target as HTMLInputElement
  const checked = target.checked
  const click = nativeClick
  nativeClick = undefined
  playSelection(checked, click ?? event)

  if (checkboxGroup && props.value !== undefined) {
    checkboxGroup.updateValue(props.value, checked, event, click)
    return
  }

  emit('update:modelValue', checked)
  emit('change', checked, event)
  formItem?.handleControlChange()
}

function playSelection(checked: boolean, event: Event) {
  playNative(checked, props.indeterminate)
  if (checked) playClickFeedback(event, controlRef.value)
}

function handleBlur(event: FocusEvent) {
  emit('blur', event)
  checkboxGroup?.handleCheckboxBlur(event)

  if (!checkboxGroup) {
    formItem?.handleControlBlur()
  }
}

onMounted(() => {
  mounted.value = true
  if (rootRef.value && !props.decorative) unregister = checkboxGroup?.register(rootRef.value, {
    value: () => props.value, disabled: () => resolvedDisabled.value, markDirect, playSelection,
  })
})
onBeforeUnmount(() => unregister?.())
</script>

<template>
  <component
    :is="decorative ? 'span' : 'label'"
    ref="rootRef"
    :class="rootClasses"
    :style="rootStyle"
    :aria-hidden="decorative || undefined"
  >
    <input
      v-if="!decorative"
      class="bing-checkbox__input"
      :id="resolvedId"
      type="checkbox"
      :checked="isChecked"
      :indeterminate="indeterminate"
      :disabled="resolvedDisabled"
      :name="resolvedName"
      :value="value"
      :aria-label="ariaLabel || undefined"
      :aria-describedby="resolvedAriaDescribedby"
      :aria-invalid="resolvedStatus === 'error' || undefined"
      @change="handleChange"
      @click="handleClick"
      @focus="emit('focus', $event)"
      @blur="handleBlur"
    />

    <span ref="controlRef" class="bing-checkbox__control" aria-hidden="true">
      <span ref="fillRef" class="bing-checkbox__fill"></span>
      <svg class="bing-checkbox__mark" viewBox="0 0 24 24" fill="none" focusable="false">
        <path ref="checkRef" class="bing-checkbox__check" :d="checkboxMarkPaths.check" pathLength="1" />
        <path ref="mixedRef" class="bing-checkbox__mixed" :d="checkboxMarkPaths.mixed" pathLength="1" />
      </svg>
    </span>

    <span v-if="!decorative && hasLabel" class="bing-checkbox__label">
      <slot>{{ label }}</slot>
    </span>
  </component>
</template>

<style scoped>
.bing-checkbox {
  --bing-click-particle-color: var(--bing-muted);
  --bing-checkbox-size: 18px;
  --bing-checkbox-radius: var(--bing-radius-sm, 4px);
  --bing-checkbox-hit-height: var(--bing-control-height-md, 36px);
  --bing-checkbox-font-size: var(--bing-font-size-md, 0.875rem);
  --bing-checkbox-default-stroke: 1.75px;
  --bing-checkbox-hit-size: 32px;
  --bing-checkbox-color: var(--bing-accent);
  --bing-checkbox-color-strong: var(--bing-accent-strong);
  --bing-checkbox-hover-border: rgb(var(--bing-accent-rgb) / 0.48);

  /* 隐藏 input 随 label 定位，避免获焦时滚动错误的祖先容器。 */
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--bing-text);
  cursor: pointer;
  font: inherit;
  font-size: var(--bing-checkbox-font-size);
  user-select: none;
}

.bing-checkbox.has-label {
  min-height: var(--bing-checkbox-hit-height);
}

.bing-checkbox:not(.has-label, .is-decorative)::before {
  position: absolute;
  inset: min(0px, calc((var(--bing-checkbox-size) - var(--bing-checkbox-hit-size)) / 2));
  content: '';
}

.bing-checkbox--sm {
  --bing-checkbox-default-stroke: 1.5px;
  --bing-checkbox-hit-size: 28px;
  --bing-checkbox-size: 16px;
  --bing-checkbox-hit-height: var(--bing-control-height-sm, 32px);
  --bing-checkbox-font-size: var(--bing-font-size-sm, 0.8125rem);
}

.bing-checkbox--lg {
  --bing-checkbox-default-stroke: 2px;
  --bing-checkbox-size: 20px;
  --bing-checkbox-hit-height: var(--bing-control-height-lg, 40px);
}

.bing-checkbox--secondary {
  --bing-checkbox-color: var(--bing-secondary);
  --bing-checkbox-color-strong: var(--bing-secondary-strong);
  --bing-checkbox-hover-border: rgb(var(--bing-secondary-rgb) / 0.48);
}

.bing-checkbox--status-success {
  --bing-checkbox-color: var(--bing-success);
  --bing-checkbox-color-strong: var(--bing-success-strong);
  --bing-checkbox-hover-border: rgb(var(--bing-success-rgb) / 0.5);
}

.bing-checkbox--status-warning {
  --bing-checkbox-color: var(--bing-warning);
  --bing-checkbox-color-strong: var(--bing-warning-strong);
  --bing-checkbox-hover-border: rgb(var(--bing-warning-rgb) / 0.56);
}

.bing-checkbox--status-error {
  --bing-checkbox-color: var(--bing-danger);
  --bing-checkbox-color-strong: var(--bing-danger-strong);
  --bing-checkbox-hover-border: rgb(var(--bing-danger-rgb) / 0.52);
}

.bing-checkbox--circle {
  --bing-checkbox-radius: 999px;
}

.bing-checkbox__input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.bing-checkbox__control {
  position: relative;
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: var(--bing-checkbox-size);
  height: var(--bing-checkbox-size);
  border: 1px solid var(--bing-border-strong);
  border-radius: var(--bing-checkbox-radius);
  background: var(--bing-control-bg);
  color: var(--bing-accent-contrast);
  box-shadow: var(--bing-control-shadow);
  outline: 2px solid transparent;
  outline-offset: 0;
  translate: var(--checkbox-shake-x, 0px) 0;
  /* 持续保留缩放合成层，避免按压结束时边缘重新栅格化而跳动。 */
  will-change: transform;
  transition:
    transform 280ms cubic-bezier(0.34, 1.56, 0.64, 1),
    outline-color 160ms ease-out,
    outline-offset 160ms ease-out,
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-checkbox:hover:not(.is-disabled, .is-decorative) .bing-checkbox__control {
  border-color: var(--bing-checkbox-hover-border);
}

.bing-checkbox__input:focus-visible + .bing-checkbox__control {
  outline-color: var(--bing-focus);
  outline-offset: 2px;
}

.bing-checkbox:not(.is-disabled, .is-decorative, .is-reduced-motion):active .bing-checkbox__control,
.bing-checkbox:not(.is-disabled, .is-decorative, .is-reduced-motion) .bing-checkbox__input:active + .bing-checkbox__control {
  transform: scale(0.86);
  transition: transform 90ms ease-out;
}

.bing-checkbox--status-error .bing-checkbox__control {
  border-color: var(--bing-danger);
}

.bing-checkbox--status-success .bing-checkbox__control {
  border-color: var(--bing-success);
}

.bing-checkbox--status-warning .bing-checkbox__control {
  border-color: var(--bing-warning);
}

.bing-checkbox.is-checked .bing-checkbox__control,
.bing-checkbox.is-check-exiting .bing-checkbox__control,
.bing-checkbox.is-indeterminate .bing-checkbox__control {
  border-color: var(--bing-checkbox-color-strong);
  box-shadow: none;
}

.bing-checkbox:hover:is(.is-checked, .is-check-exiting, .is-indeterminate):not(
    .is-disabled,
    .is-decorative
  )
  .bing-checkbox__control {
  border-color: var(--bing-checkbox-color-strong);
}

.bing-checkbox__fill {
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: var(--bing-checkbox-color-strong);
  opacity: 0;
  transform: scale(0.5);
  pointer-events: none;
}

.bing-checkbox.is-checked .bing-checkbox__fill,
.bing-checkbox.is-indeterminate .bing-checkbox__fill {
  opacity: 1;
  transform: scale(1);
}

.bing-checkbox__mark {
  position: relative;
  width: 70%;
  height: 70%;
  overflow: visible;
  pointer-events: none;
  stroke: currentColor;
  stroke-width: var(--bing-checkbox-stroke, var(--bing-checkbox-default-stroke));
  stroke-linecap: round;
  stroke-linejoin: round;
}

.bing-checkbox--circle .bing-checkbox__mark {
  width: 62%;
  height: 62%;
}

.bing-checkbox__check,
.bing-checkbox__mixed {
  vector-effect: non-scaling-stroke;
  opacity: 0;
  stroke-dasharray: 1;
  stroke-dashoffset: 0;
}

.bing-checkbox.is-checked:not(.is-indeterminate) .bing-checkbox__check {
  opacity: 1;
}

.bing-checkbox__mixed {
  --checkbox-mixed-scale: 0;
  transform-box: fill-box;
  transform-origin: center;
  transform: scaleX(var(--checkbox-mixed-scale));
}

@media (hover: hover) and (pointer: fine) {
  .bing-checkbox:hover:not(.is-checked, .is-indeterminate, .is-disabled, .is-decorative, .is-animating) .bing-checkbox__control {
    background: color-mix(in srgb, var(--bing-checkbox-color) 6%, var(--bing-control-bg));
  }

  .bing-checkbox:hover:not(.is-checked, .is-indeterminate, .is-disabled, .is-decorative, .is-animating) .bing-checkbox__check {
    stroke: var(--bing-checkbox-hover-border);
    opacity: 0.24;
  }

  .bing-checkbox:active:hover:not(.is-checked, .is-indeterminate, .is-disabled, .is-decorative, .is-animating) .bing-checkbox__check {
    opacity: 0.5;
  }

  .bing-checkbox:hover:is(.is-checked, .is-indeterminate):not(.is-disabled, .is-decorative) .bing-checkbox__fill {
    background: color-mix(in srgb, var(--bing-checkbox-color-strong) 92%, white);
  }
}

.bing-checkbox.is-indeterminate .bing-checkbox__mixed {
  --checkbox-mixed-scale: 1;
  opacity: 1;
}

.bing-checkbox__label {
  min-width: 0;
  color: var(--bing-heading);
  font-weight: 400;
  line-height: 20px;
}

.bing-checkbox.is-disabled {
  cursor: not-allowed;
  color: var(--bing-disabled-text);
}

.bing-checkbox.is-disabled .bing-checkbox__label {
  color: var(--bing-disabled-text);
}

.bing-checkbox.is-disabled .bing-checkbox__control {
  border-color: var(--bing-control-disabled-border);
  background: var(--bing-control-disabled-bg);
  box-shadow: none;
  color: var(--bing-disabled-text);
}

.bing-checkbox.is-disabled:is(.is-checked, .is-check-exiting, .is-indeterminate)
  .bing-checkbox__control {
  border-color: var(--bing-checkbox-color-strong);
  background: var(--bing-control-bg);
  color: var(--bing-accent-contrast);
  opacity: 0.42;
}

.bing-checkbox.is-decorative {
  pointer-events: none;
}

.bing-checkbox.is-reduced-motion .bing-checkbox__control {
  transform: none;
  transition: none;
}

@media (prefers-reduced-motion: reduce) {
  .bing-checkbox__control {
    transform: none !important;
    transition: none;
  }
}
</style>
