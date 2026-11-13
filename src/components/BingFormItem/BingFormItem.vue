<script setup lang="ts">
import { computed, defineComponent, h, inject, nextTick, onBeforeUnmount, provide, ref, shallowReactive, useId, watch } from 'vue'
import type { CSSProperties, ComputedRef } from 'vue'
import { gsap } from 'gsap'
import {
  bingFormContextKey,
  bingFormItemContextKey,
  type BingFormNextHintField,
} from '../BingForm/BingForm.context'
import { findFormControlTarget } from '../BingForm/formFocus'
import type {
  BingFormBreakpoint,
  BingFormResponsiveNumber,
} from '../BingForm/BingForm.types'
import type { BingFormItemProps } from './BingFormItem.types'
import { useConfigSize } from '../../utils/config'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const props = withDefaults(defineProps<BingFormItemProps>(), {
  prop: undefined,
  label: undefined,
  required: false,
  span: 1,
  help: undefined,
  showMessage: true,
  labelPosition: undefined,
})

const form = inject(bingFormContextKey, null)
const fieldId = `bing-form-item-${useId()}`
const rootRef = ref<HTMLElement | null>(null)
const messageAnimations = new Map<Element, gsap.core.Tween>()
const leavingMessages = new Set<Element>()
let unmounted = false
let validationRequest = 0

const controlId = computed(() => `${fieldId}-control`)
const controls = shallowReactive(new Set<{ id: ComputedRef<string>; group: boolean }>())
const nextHintField: BingFormNextHintField = {
  label: () => props.label ?? props.prop ?? '字段',
  element: () => rootRef.value,
  target: getFocusTarget,
}
const unregisterNextHint = form?.nextHint?.register(nextHintField)
const labelId = computed(() => props.label ? `${fieldId}-label` : undefined)
const labelFor = computed(() => {
  const registered = [...controls]
  return registered.length === 0 ? controlId.value : registered.length === 1 && !registered[0]!.group ? registered[0]!.id.value : undefined
})
// 控件先注册，标签再读取实际 ID；独立渲染也保证 SSR 与 hydration 的关联一致。
const FieldLabel = defineComponent({
  setup(_props, { slots }) {
    return () => h('label', { id: labelId.value, for: labelFor.value }, slots.default?.())
  },
})
const errors = computed(() => (props.prop && form ? form.getFieldErrors(props.prop) : []))
const hasError = computed(() => errors.value.length > 0)
const message = computed(() => (hasError.value ? errors.value[0] : props.help))
const shouldShowMessage = computed(() => props.showMessage && Boolean(message.value))
const messageId = computed(() => (shouldShowMessage.value ? `${fieldId}-message` : undefined))
const ariaDescribedby = messageId
const status = computed(() => (hasError.value ? 'error' : 'default'))
const resolvedSize = useConfigSize(() => form?.size.value)
const resolvedDisabled = computed(() => form?.disabled.value ?? false)
const resolvedLabelPosition = computed(
  () => props.labelPosition ?? form?.labelPosition.value ?? 'top',
)
const resolvedLabelWidth = computed(() => form?.labelWidth.value ?? '112px')

const rootClasses = computed(() => [
  'bing-form-item',
  `bing-form-item--${resolvedSize.value}`,
  `bing-form-item--label-${resolvedLabelPosition.value}`,
  {
    'is-required': props.required,
    'is-invalid': hasError.value,
    'is-disabled': resolvedDisabled.value,
    'has-label': Boolean(props.label),
    'has-message': shouldShowMessage.value,
  },
])

const rootStyle = computed<CSSProperties>(() => {
  const span = normalizeResponsiveNumber(props.span)
  const columns = form?.columns.value ?? normalizeResponsiveNumber(1)
  const clampedSpan = clampResponsiveSpan(span, columns)

  return {
    '--bing-form-item-span-base': String(clampedSpan.base),
    '--bing-form-item-span-sm': String(clampedSpan.sm),
    '--bing-form-item-span-md': String(clampedSpan.md),
    '--bing-form-item-span-lg': String(clampedSpan.lg),
    '--bing-form-item-span-xl': String(clampedSpan.xl),
    '--bing-form-item-label-width': resolvedLabelWidth.value,
  } as CSSProperties
})

function normalizeResponsiveNumber(value: BingFormResponsiveNumber) {
  const breakpoints: BingFormBreakpoint[] = ['base', 'sm', 'md', 'lg', 'xl']
  const normalized: Record<BingFormBreakpoint, number> = {
    base: 1,
    sm: 1,
    md: 1,
    lg: 1,
    xl: 1,
  }

  if (typeof value === 'number') {
    const span = Math.max(1, Math.floor(value))

    breakpoints.forEach((breakpoint) => {
      normalized[breakpoint] = span
    })

    return normalized
  }

  let last = 1
  breakpoints.forEach((breakpoint) => {
    const next = value[breakpoint]

    if (typeof next === 'number') {
      last = Math.max(1, Math.floor(next))
    }

    normalized[breakpoint] = last
  })

  return normalized
}

function clampResponsiveSpan(
  span: Record<BingFormBreakpoint, number>,
  columns: Record<BingFormBreakpoint, number>,
) {
  const breakpoints: BingFormBreakpoint[] = ['base', 'sm', 'md', 'lg', 'xl']
  const clamped = {} as Record<BingFormBreakpoint, number>

  breakpoints.forEach((breakpoint) => {
    clamped[breakpoint] = Math.min(span[breakpoint], Math.max(1, columns[breakpoint]))
  })

  return clamped
}

async function validateAfterModelFlush(trigger: 'change' | 'blur') {
  if (!props.prop || !form) {
    return
  }

  const prop = props.prop
  const request = ++validationRequest

  await nextTick()

  if (request !== validationRequest || props.prop !== prop) {
    return
  }

  await form.validateField(prop, trigger)
}

function handleControlChange() {
  void validateAfterModelFlush('change')
}

function handleControlBlur() {
  void validateAfterModelFlush('blur')
}

function scrollToField() {
  rootRef.value?.scrollIntoView({
    block: 'center',
    behavior: prefersReducedMotion() ? 'auto' : 'smooth',
  })
}

function getFocusTarget() {
  const root = rootRef.value
  if (!root || resolvedDisabled.value) return null
  for (const control of controls) {
    const element = root.ownerDocument.getElementById(control.id.value)
    const target = element && root.contains(element) ? findFormControlTarget(element) : null
    if (target) return target
  }
  // 原生或自定义控件可通过默认插槽参与提交错误定位。
  return controls.size ? null : findFormControlTarget(root.querySelector<HTMLElement>('.bing-form-item__control'))
}

function handleMessageBeforeEnter(element: Element) {
  if (element.classList.contains('is-error') && !prefersReducedMotion()) {
    // 只改变透明度，整句文字的位置和字号始终不动。
    gsap.set(element, { opacity: 0 })
  }
}

function handleMessageEnter(element: Element, done: () => void) {
  if (!element.classList.contains('is-error') || prefersReducedMotion()) {
    done()
    return
  }

  animateMessage(element, 1, 0.16, done)
}

function handleMessageLeave(element: Element, done: () => void) {
  cancelMessageAnimation(element)
  // 离场只保留视觉残影，避免已修正的错误继续作为字段描述被读出。
  element.setAttribute('aria-hidden', 'true')
  if (!element.classList.contains('is-error') || prefersReducedMotion()) {
    // 等当前渲染完成，避免 out-in 在同步离场时重入 Vue 的节点更新。
    void nextTick(() => { if (!unmounted) done() })
    return
  }

  leavingMessages.add(element)
  animateMessage(element, 0, 0.1, done)
}

function animateMessage(element: Element, opacity: number, duration: number, done: () => void) {
  const animation = gsap.to(element, {
    opacity,
    duration,
    ease: 'power1.out',
    clearProps: 'opacity',
    overwrite: true,
    onComplete: () => {
      messageAnimations.delete(element)
      leavingMessages.delete(element)
      done()
    },
  })
  messageAnimations.set(element, animation)
}

function cancelMessageAnimation(element: Element) {
  messageAnimations.get(element)?.kill()
  messageAnimations.delete(element)
  leavingMessages.delete(element)
}

watch(hasError, (invalid) => {
  if (!invalid) return
  // 快速修正后又出现错误时，结束旧离场，让最新错误立即进入。
  for (const element of leavingMessages) messageAnimations.get(element)?.progress(1)
})

watch(() => props.showMessage, (visible) => {
  if (!visible) for (const element of messageAnimations.keys()) cancelMessageAnimation(element)
})

watch(
  () => props.prop,
  (prop, _previousProp, onCleanup) => {
    if (!form || !prop) {
      return
    }

    const field = {
      prop,
      scrollToField,
      element: () => rootRef.value,
      target: getFocusTarget,
    }

    form.registerField(field)

    onCleanup(() => {
      form.unregisterField(field)
    })
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  unmounted = true
  validationRequest += 1
  unregisterNextHint?.()

  for (const element of messageAnimations.keys()) cancelMessageAnimation(element)
})

provide(bingFormItemContextKey, {
  controlId,
  ariaDescribedby,
  isInvalid: hasError,
  status,
  size: resolvedSize,
  disabled: resolvedDisabled,
  handleControlChange,
  handleControlBlur,
  labelId,
  nextControlId: (fallbackId) => controls.size === 0 ? controlId.value : fallbackId,
  registerControl(control) {
    controls.add(control)
    return () => { controls.delete(control) }
  },
})
</script>

<template>
  <div ref="rootRef" :class="rootClasses" :style="rootStyle">
    <div class="bing-form-item__control">
      <slot
        :id="controlId"
        :status="status"
        :aria-describedby="ariaDescribedby"
        :invalid="hasError"
        :disabled="resolvedDisabled"
        :size="resolvedSize"
      />
    </div>

    <FieldLabel v-if="label" class="bing-form-item__label">
      <span class="bing-form-item__label-text">{{ label }}</span>
      <span v-if="required" class="bing-form-item__required" aria-hidden="true">*</span>
      <span class="bing-form-item__colon" aria-hidden="true">:</span>
    </FieldLabel>

    <div v-if="showMessage" class="bing-form-item__message-slot" aria-live="polite">
      <p
        :id="messageId"
        class="bing-form-item__message"
        :class="{ 'is-error': hasError }"
        :role="shouldShowMessage ? hasError ? 'alert' : 'status' : undefined"
      >
        <Transition
          mode="out-in"
          :css="false"
          @before-enter="handleMessageBeforeEnter"
          @enter="handleMessageEnter"
          @leave="handleMessageLeave"
          @enter-cancelled="cancelMessageAnimation"
          @leave-cancelled="cancelMessageAnimation"
        >
          <span
            v-if="shouldShowMessage"
            :key="hasError ? 'error' : 'help'"
            class="bing-form-item__message-text"
            :class="{ 'is-error': hasError }"
          >
            {{ message }}
          </span>
        </Transition>
      </p>
    </div>
  </div>
</template>

<style scoped>
.bing-form-item {
  --bing-form-item-message-min-height: 16px;

  box-sizing: border-box;
  display: grid;
  grid-column: span var(--bing-form-item-span-base);
  min-width: 0;
  gap: 6px;
  color: var(--bing-text);
}

.bing-form-item--label-left {
  grid-template-columns: var(--bing-form-item-label-width) minmax(0, 1fr);
  align-items: start;
  column-gap: 12px;
}

.bing-form-item--label-left .bing-form-item__label {
  min-height: var(--bing-form-item-control-height);
  align-self: start;
  align-items: center;
  justify-content: flex-end;
  text-align: right;
}

.bing-form-item--label-left .bing-form-item__control {
  display: flex;
  min-height: var(--bing-form-item-control-height);
  align-items: center;
}

.bing-form-item--label-left:not(.has-label) .bing-form-item__control {
  grid-column: 2;
}

.bing-form-item--label-left .bing-form-item__message-slot {
  grid-column: 2;
}

.bing-form-item--sm {
  --bing-form-item-control-height: var(--bing-control-height-sm, 32px);
  --bing-form-item-label-size: var(--bing-font-size-sm, 0.8125rem);
  --bing-form-item-message-size: 12px;
}

.bing-form-item--md {
  --bing-form-item-control-height: var(--bing-control-height-md, 36px);
  --bing-form-item-label-size: var(--bing-font-size-md, 0.875rem);
  --bing-form-item-message-size: 12px;
}

.bing-form-item--lg {
  --bing-form-item-control-height: var(--bing-control-height-lg, 40px);
  --bing-form-item-label-size: var(--bing-font-size-md, 0.875rem);
  --bing-form-item-message-size: 12px;
}

.bing-form-item__label {
  order: -1;
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 4px;
  color: var(--bing-heading);
  font-size: var(--bing-form-item-label-size);
  font-weight: 400;
  letter-spacing: 0;
  line-height: 20px;
}

.bing-form-item__label-text {
  min-width: 0;
  overflow-wrap: anywhere;
}

.bing-form-item__required {
  color: var(--bing-danger);
  font-weight: 400;
}

.bing-form-item__colon {
  margin-left: -4px;
  color: var(--bing-heading);
  font-weight: 400;
}

.bing-form-item--label-top .bing-form-item__colon {
  display: none;
}

.bing-form-item__control {
  position: relative;
  min-width: 0;
}

.bing-form-item__control :deep(.bing-input),
.bing-form-item__control :deep(.bing-select),
.bing-form-item__control :deep(.bing-tree-select),
.bing-form-item__control :deep(.bing-textarea) {
  width: 100%;
}

.bing-form-item__message-slot {
  display: grid;
  align-content: start;
  min-height: var(--bing-form-item-message-min-height);
}

.bing-form-item__message {
  min-height: var(--bing-form-item-message-min-height);
  margin: 0;
  color: var(--bing-muted);
  font-size: var(--bing-form-item-message-size);
  font-weight: 400;
  line-height: 16px;
  overflow-wrap: anywhere;
}

.bing-form-item__message.is-error,
.bing-form-item__message-text.is-error {
  color: var(--bing-danger-strong);
}

.bing-form-item__message-text {
  display: block;
  width: 100%;
}

.bing-form-item.bing-form-field-move,
.bing-form-item.bing-form-field-enter-active,
.bing-form-item.bing-form-field-leave-active {
  transition:
    opacity 220ms var(--bing-ease-smooth),
    transform 260ms var(--bing-ease-smooth),
    filter 220ms var(--bing-ease-smooth);
}

.bing-form-item.bing-form-field-enter-active,
.bing-form-item.bing-form-field-leave-active {
  will-change: opacity, transform;
}

.bing-form-item.bing-form-field-enter-from,
.bing-form-item.bing-form-field-leave-to {
  opacity: 0;
  filter: blur(3px);
  transform: translate3d(0, -6px, 0) scale(0.985);
}

.bing-form-item.bing-form-field-leave-active {
  pointer-events: none;
}

.bing-form-item.is-disabled .bing-form-item__label,
.bing-form-item.is-disabled .bing-form-item__required,
.bing-form-item.is-disabled .bing-form-item__colon,
.bing-form-item.is-disabled .bing-form-item__message,
.bing-form-item.is-disabled .bing-form-item__message-text {
  color: var(--bing-disabled-text);
}

@container (min-width: 640px) {
  .bing-form-item {
    grid-column: span var(--bing-form-item-span-sm);
  }
}

@container (min-width: 768px) {
  .bing-form-item {
    grid-column: span var(--bing-form-item-span-md);
  }
}

@container (min-width: 1024px) {
  .bing-form-item {
    grid-column: span var(--bing-form-item-span-lg);
  }
}

@container (min-width: 1280px) {
  .bing-form-item {
    grid-column: span var(--bing-form-item-span-xl);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-form-item.bing-form-field-move,
  .bing-form-item.bing-form-field-enter-active,
  .bing-form-item.bing-form-field-leave-active,
  .bing-form-item__message {
    transition: none;
    will-change: auto;
  }

  .bing-form-item.bing-form-field-enter-from,
  .bing-form-item.bing-form-field-leave-to {
    opacity: 1;
    filter: none;
    transform: none;
  }
}
</style>
