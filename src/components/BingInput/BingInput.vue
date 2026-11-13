<script setup lang="ts">
import '../../theme/text-control.css'
import { computed, nextTick, onBeforeUnmount, ref, useId, useSlots, watch } from 'vue'
import { useClickFeedback } from '../../motion/useClickFeedback'
import { useTextControlCaret } from '../../motion/useTextControlCaret'
import { useControlAttrs } from '../../utils/controlAttrs'
import { useTextControl } from '../../utils/useTextControl'
import { useFormControl } from '../BingForm/useFormControl'
import { ChevronDown, ChevronUp, Eye, EyeOff, LoaderCircle, X } from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import { finiteNumber, normalizeNumber, numberConstraints, stepNumber } from './numberInput'
import { useNumberScrub } from './useNumberScrub'
import type { BingInputEmits, BingInputExpose, BingInputProps } from './BingInput.types'

const props = withDefaults(defineProps<BingInputProps>(), {
  modelValue: '', type: 'text', disabled: undefined, readonly: false, clearable: undefined,
  smoothCaret: true, block: false, debounceDelay: 180, clearAriaLabel: '清空输入', autocomplete: 'off',
  clampOnBlur: true, passwordToggle: true, showCount: false, loading: false, scrub: false,
})
const emit = defineEmits<BingInputEmits>()
defineOptions({ inheritAttrs: false })
const { rootAttrs, controlAttrs } = useControlAttrs()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby } = useFormControl(props)
const { playClickFeedback } = useClickFeedback()
const slots = useSlots()
const descriptionId = useId()
const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const caretLayerRef = ref<HTMLElement | null>(null)
const caretRef = ref<HTMLElement | null>(null)
useTextControlCaret(inputRef, caretLayerRef, caretRef, () => props.smoothCaret && props.type !== 'password')

const isNumber = computed(() => props.type === 'number')
const hasIcon = computed(() => Boolean(props.icon || slots.icon))
const hasPrefix = computed(() => Boolean(props.prefix || slots.prefix))
const hasSuffix = computed(() => Boolean(props.suffix || slots.suffix))
const passwordVisible = ref(false)
const hasPasswordToggle = computed(() => props.type === 'password' && props.passwordToggle)
const limits = computed(() => numberConstraints(props.min, props.max, props.step))
const numberDraft = ref<string>()
let incompleteNumber = false
let lastValidNumber = finiteNumber(props.modelValue)
let reconcileRequest = 0
let disposed = false
let stepDelayTimer: ReturnType<typeof setTimeout> | undefined
let stepRepeatTimer: ReturnType<typeof setInterval> | undefined

const text = useTextControl({
  root: rootRef, field: inputRef, value: () => props.modelValue,
  draft: () => isNumber.value ? numberDraft.value : undefined,
  disabled: () => resolvedDisabled.value, readonly: () => props.readonly,
  clearable: () => props.clearable ?? props.type === 'search',
  maxLength: () => props.maxLength ?? controlAttrs().maxlength, showCount: () => props.showCount,
  debounceDelay: () => props.debounceDelay,
  publish(value, event) {
    if (isNumber.value) {
      numberDraft.value = value
      // 原生 number 的 badInput 会把 value 暴露为空；不能将编辑中的 '-' / '1e' 当成清空。
      incompleteNumber = Boolean(inputRef.value?.validity.badInput) ||
        (['.', ','].includes((event as InputEvent).data ?? '') && event.type === 'input')
      if (incompleteNumber) return false
      const number = finiteNumber(value)
      if (value !== '' && number === null) return false
      lastValidNumber = number
      emit('update:modelValue', number)
    } else emit('update:modelValue', value)
    emit('input', value, event)
  },
  clear() {
    numberDraft.value = undefined
    incompleteNumber = false
    lastValidNumber = null
    emit('update:modelValue', isNumber.value ? null : '')
    emit('clear')
    if (isNumber.value) reconcileNumber()
  },
  debounced: value => emit('debounced-input', value),
  change: () => formItem?.handleControlChange(),
  commit: event => { commitNumber(event) },
  blur: () => formItem?.handleControlBlur(),
})
const { composing, displayValue, hasValue, clearEnabled, canClear, maxLength, countText, countTone,
  liveMessage, limitFeedback, reducedFeedback, handleInput, handleCompositionStart, handleCompositionEnd,
  handleClear, handleFocusIn, handleFocusOut, handleBeforeinput } = text

const currentNumber = computed(() => finiteNumber(numberDraft.value ?? props.modelValue))
const canIncrease = computed(() => !resolvedDisabled.value && !props.readonly && stepNumber(currentNumber.value, 1, limits.value) !== currentNumber.value)
const canDecrease = computed(() => !resolvedDisabled.value && !props.readonly && stepNumber(currentNumber.value, -1, limits.value) !== currentNumber.value)
const scrubEnabled = computed(() => isNumber.value && props.scrub && hasPrefix.value && !resolvedDisabled.value && !props.readonly)
const scrub = useNumberScrub({
  field: inputRef, enabled: () => scrubEnabled.value, value: () => currentNumber.value,
  step: (steps, event) => { stepValue(steps, event, false) },
  finish(event, initial) {
    commitNumber(event)
    void nextTick(() => {
      if (!disposed && finiteNumber(props.modelValue) !== initial) inputRef.value?.dispatchEvent(new Event('change', { bubbles: true }))
    })
  },
  cancel(value, event) {
    if (!resolvedDisabled.value && !props.readonly && isNumber.value && value !== currentNumber.value) writeNumber(value, event)
    reconcileNumber()
  },
})

const rootClasses = computed(() => [
  'bing-input', 'bing-text-control', 'bing-input--' + resolvedSize.value, 'bing-input--status-' + resolvedStatus.value,
  { 'is-block': props.block, 'is-disabled': resolvedDisabled.value, 'is-readonly': props.readonly,
    'is-invalid': resolvedStatus.value === 'error', 'is-error': resolvedStatus.value === 'error',
    'is-success': resolvedStatus.value === 'success', 'is-warning': resolvedStatus.value === 'warning',
    'has-icon': hasIcon.value, 'has-value': hasValue.value, 'can-clear': canClear.value,
    'has-actions': clearEnabled.value || isNumber.value || hasPasswordToggle.value || (props.loading && !hasIcon.value),
    'is-scrubbing': scrub.active.value, 'is-motion-reduced': text.reducedMotion.value },
])
const describedby = computed(() => [resolvedAriaDescribedby.value, hasPrefix.value ? descriptionId + '-prefix' : '', hasSuffix.value ? descriptionId + '-suffix' : ''].filter(Boolean).join(' ') || undefined)

function reconcileNumber() {
  const request = ++reconcileRequest
  void nextTick(() => {
    if (disposed || request !== reconcileRequest || !isNumber.value || scrub.active.value) return
    numberDraft.value = undefined
    incompleteNumber = false
    lastValidNumber = finiteNumber(props.modelValue)
    if (inputRef.value) inputRef.value.value = lastValidNumber === null ? '' : String(lastValidNumber)
  })
}
function writeNumber(value: number | null, event: Event) {
  const field = inputRef.value
  if (!field) return
  field.value = value === null ? '' : String(value)
  incompleteNumber = false
  text.publish(field.value, event)
}
function commitNumber(event: Event) {
  if (!isNumber.value || resolvedDisabled.value || props.readonly || composing.value || scrub.active.value) return props.modelValue
  const field = inputRef.value
  const incomplete = field?.validity.badInput || incompleteNumber
  const previous = incomplete ? lastValidNumber : currentNumber.value
  let value = incomplete ? lastValidNumber : finiteNumber(field?.value ?? props.modelValue)
  if (value !== null && props.clampOnBlur) value = normalizeNumber(value, limits.value)
  if (value !== previous) writeNumber(value, event)
  reconcileNumber()
  return value
}
function stepValue(steps: number, event: Event, change = true) {
  if (!isNumber.value || resolvedDisabled.value || props.readonly || composing.value) return false
  const value = stepNumber(currentNumber.value, steps, limits.value)
  if (value === currentNumber.value) return false
  writeNumber(value, event)
  if (change) {
    inputRef.value?.dispatchEvent(new Event('change', { bubbles: true }))
    reconcileNumber()
  }
  return true
}
function stopStepping() {
  clearTimeout(stepDelayTimer)
  clearInterval(stepRepeatTimer)
  stepDelayTimer = undefined
  stepRepeatTimer = undefined
  if (typeof window === 'undefined') return
  window.removeEventListener('pointerup', stopStepping)
  window.removeEventListener('pointercancel', stopStepping)
  window.removeEventListener('blur', stopStepping)
}
function startStepping(direction: 1 | -1, event: PointerEvent) {
  if (event.button !== 0 || props.readonly || resolvedDisabled.value) return
  event.preventDefault()
  stopStepping()
  inputRef.value?.focus()
  const steps = direction * (event.shiftKey ? 10 : 1)
  if (!stepValue(steps, event)) return
  playClickFeedback(event)
  window.addEventListener('pointerup', stopStepping)
  window.addEventListener('pointercancel', stopStepping)
  window.addEventListener('blur', stopStepping)
  stepDelayTimer = setTimeout(() => {
    stepDelayTimer = undefined
    stepRepeatTimer = setInterval(() => { if (!stepValue(steps, event)) stopStepping() }, 80)
  }, 400)
}
function handleStepClick(direction: 1 | -1, event: MouseEvent) {
  if (event.detail === 0 && !(event as PointerEvent).pointerType) {
    inputRef.value?.focus()
    if (stepValue(direction * (event.shiftKey ? 10 : 1), event)) playClickFeedback(event)
  }
}
function handleKeydown(event: KeyboardEvent) {
  text.handleKeydown(event)
  emit('keydown', event)
  if (event.defaultPrevented || composing.value || event.isComposing || event.keyCode === 229 || props.readonly || resolvedDisabled.value) return
  if (isNumber.value && (event.key === 'ArrowUp' || event.key === 'ArrowDown') && !event.altKey && !event.ctrlKey && !event.metaKey) {
    event.preventDefault()
    stepValue((event.key === 'ArrowUp' ? 1 : -1) * (event.shiftKey ? 10 : 1), event)
  } else if (text.isEnterCommit(event)) emit('enter', isNumber.value ? commitNumber(event) : inputRef.value?.value ?? '', event)
}
function handleBlur(event: FocusEvent) {
  handleCompositionEnd(event)
  emit('blur', event)
}
async function togglePassword(event: MouseEvent) {
  const field = inputRef.value
  if (!field || resolvedDisabled.value) return
  const selection = [field.selectionStart, field.selectionEnd, field.selectionDirection] as const
  const scrollLeft = field.scrollLeft
  handleCompositionEnd(event)
  passwordVisible.value = !passwordVisible.value
  await nextTick()
  if (disposed || resolvedDisabled.value || inputRef.value !== field || props.type !== 'password') return
  // Chromium 的密码编辑器在布局时重建选区；先完成类型切换的布局，再恢复选区。
  field.getBoundingClientRect()
  field.focus({ preventScroll: true })
  if (selection[0] !== null && selection[1] !== null) field.setSelectionRange(selection[0], selection[1], selection[2] ?? undefined)
  field.scrollLeft = scrollLeft
}
function focus() { inputRef.value?.focus() }
function blur() { inputRef.value?.blur() }
function select() { inputRef.value?.select() }
watch([resolvedDisabled, () => props.readonly, () => props.type], () => {
  stopStepping()
  passwordVisible.value = false
  numberDraft.value = undefined
  incompleteNumber = false
})
watch(() => props.passwordToggle, value => { if (!value) passwordVisible.value = false })
watch(() => props.modelValue, value => {
  if (composing.value || scrub.active.value) return
  lastValidNumber = finiteNumber(value)
  if (finiteNumber(numberDraft.value) !== lastValidNumber) { numberDraft.value = undefined; incompleteNumber = false }
})
onBeforeUnmount(() => { disposed = true; reconcileRequest += 1; stopStepping() })
defineExpose<BingInputExpose>({ get input() { return inputRef.value }, focus, blur, select })
</script>

<template>
  <div v-bind="rootAttrs()" ref="rootRef" :class="rootClasses" @click="focus" @focusin="handleFocusIn" @focusout="handleFocusOut">
    <span v-if="hasIcon" class="bing-input__icon">
      <BingIcon v-if="loading" :icon="LoaderCircle" class="bing-text-control__spinner" size="sm" />
      <slot v-else name="icon"><BingIcon v-if="icon" :icon="icon" size="sm" :stroke-width="1.75" :decorative="!iconLabel" :label="iconLabel" /></slot>
    </span>
    <span v-if="hasPrefix" :id="descriptionId + '-prefix'" class="bing-input__prefix" :class="{ 'is-scrubbable': scrubEnabled }" @pointerdown="scrub.start">
      <slot name="prefix">{{ prefix }}</slot>
    </span>
    <span class="bing-input__content">
      <input v-bind="controlAttrs()" ref="inputRef" class="bing-input__field" :id="resolvedId" :value="displayValue"
        :type="type === 'password' && passwordVisible ? 'text' : type" :min="min" :max="max" :step="step"
        :inputmode="(controlAttrs().inputmode as 'numeric' | 'decimal' | undefined) ?? (isNumber ? (!limits.any && Number.isInteger(limits.step) ? 'numeric' : 'decimal') : undefined)"
        :maxlength="maxLength" :placeholder="placeholder" :disabled="resolvedDisabled" :readonly="readonly"
        :name="name" :autocomplete="autocomplete" :spellcheck="spellcheck" :aria-label="ariaLabel || undefined"
        :aria-describedby="[describedby, controlAttrs()['aria-describedby']].filter(Boolean).join(' ') || undefined"
        :aria-invalid="resolvedStatus === 'error' || undefined" :aria-busy="loading || undefined"
        @input="handleInput" @beforeinput="handleBeforeinput" @compositionstart="handleCompositionStart" @compositionend="handleCompositionEnd"
        @focus="emit('focus', $event)" @blur="handleBlur" @keydown="handleKeydown" />
      <span ref="caretLayerRef" class="bing-input__caret-layer" aria-hidden="true"><span ref="caretRef" class="bing-input__caret" /></span>
    </span>
    <span v-if="hasSuffix" :id="descriptionId + '-suffix'" class="bing-input__suffix"><slot name="suffix">{{ suffix }}</slot></span>
    <span v-if="showCount" class="bing-input__count bing-text-control__count" :class="['is-' + countTone, { 'is-limit': limitFeedback, 'is-reduced': reducedFeedback }]">{{ countText }}</span>
    <span v-if="clearEnabled || isNumber || hasPasswordToggle || (loading && !hasIcon)" class="bing-input__actions">
      <BingIcon v-if="loading && !hasIcon" :icon="LoaderCircle" class="bing-text-control__spinner" size="sm" />
      <span v-if="isNumber" class="bing-input__stepper">
        <button type="button" class="bing-input__step" tabindex="-1" aria-label="增加数值" :disabled="!canIncrease"
          @pointerdown="startStepping(1, $event)" @pointerleave="stopStepping" @click.stop="handleStepClick(1, $event)"><BingIcon :icon="ChevronUp" size="xs" :stroke-width="1.75" /></button>
        <button type="button" class="bing-input__step" tabindex="-1" aria-label="减少数值" :disabled="!canDecrease"
          @pointerdown="startStepping(-1, $event)" @pointerleave="stopStepping" @click.stop="handleStepClick(-1, $event)"><BingIcon :icon="ChevronDown" size="xs" :stroke-width="1.75" /></button>
      </span>
      <BingButton v-if="clearEnabled" class="bing-input__clear bing-text-control__action bing-text-control__clear" :class="{ 'is-visible': canClear }"
        variant="ghost" size="xs" rounded="sm" :throttle="false" :aria-label="clearAriaLabel" :aria-hidden="!canClear || undefined" :tabindex="canClear ? 0 : -1"
        @mousedown.prevent @click.stop="handleClear"><template #prefix><BingIcon :icon="X" size="xs" :stroke-width="1.75" /></template></BingButton>
      <BingButton v-if="hasPasswordToggle" class="bing-input__password bing-text-control__action" variant="ghost" size="xs" rounded="sm" :throttle="false"
        :disabled="resolvedDisabled" :aria-label="passwordVisible ? '隐藏密码' : '显示密码'" :aria-pressed="passwordVisible"
        @mousedown.prevent @click.stop="togglePassword">
        <template #prefix><span class="bing-input__eyes" :class="{ 'is-visible': passwordVisible }"><BingIcon :icon="Eye" size="xs" /><BingIcon :icon="EyeOff" size="xs" /></span></template>
      </BingButton>
    </span>
    <span v-if="showCount" class="bing-text-control__live" aria-live="polite" aria-atomic="true">{{ liveMessage }}</span>
  </div>
</template>

<style scoped>
.bing-input {
  --bing-input-height: var(--bing-control-height-md, 36px);
  --bing-input-padding-x: 10px;
  --bing-input-gap: 8px;
  --bing-input-radius: var(--bing-radius-md, 6px);
  --bing-input-font-size: var(--bing-font-size-md, 0.875rem);
  box-sizing: border-box;
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 280px;
  max-width: 100%;
  min-height: var(--bing-input-height);
  gap: var(--bing-input-gap);
  padding: 0 var(--bing-input-padding-x);
  border-radius: var(--bing-input-radius);
}
.bing-input.has-actions { padding-right: 7px; }
.bing-input.is-block { display: flex; width: 100%; }
.bing-input--sm { --bing-input-height: var(--bing-control-height-sm, 32px); --bing-input-padding-x: 8px; --bing-input-font-size: var(--bing-font-size-sm, 0.8125rem); }
.bing-input--lg { --bing-input-height: var(--bing-control-height-lg, 40px); --bing-input-padding-x: 12px; }
.bing-input__icon { display: inline-flex; align-items: center; justify-content: center; color: var(--bing-muted); pointer-events: none; }
.bing-input__prefix, .bing-input__suffix { color: var(--bing-muted); font-size: var(--bing-input-font-size); white-space: nowrap; }
.bing-input__prefix.is-scrubbable { cursor: ew-resize; touch-action: none; user-select: none; }
.bing-input.is-scrubbing { cursor: ew-resize; }
.bing-input.is-disabled :is(.bing-input__icon, .bing-input__prefix, .bing-input__suffix) { color: var(--bing-disabled-text); }
.bing-input__content { position: relative; display: grid; flex: 1; min-width: 0; }
.bing-input__field {
  box-sizing: border-box; min-width: 0; width: 100%; height: calc(var(--bing-input-height) - 4px);
  padding: 0; border: 0; background: transparent; color: inherit; font: inherit;
  font-size: var(--bing-input-font-size); font-weight: 400; line-height: 1.5; outline: none;
}
.bing-input__field::placeholder { color: var(--bing-placeholder); }
.bing-input__field[data-smooth-caret] { caret-color: transparent; }
.bing-input__caret-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; user-select: none; }
.bing-input__caret { position: absolute; left: 0; width: 2px; border-radius: 1px; background: currentColor; visibility: hidden; }
.bing-input__caret[data-active] { visibility: visible; will-change: transform; }
.bing-input__caret[data-active].is-idle { animation: bing-input-caret-blink 1s ease-in-out infinite; }
@keyframes bing-input-caret-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce), (forced-colors: active), (pointer: coarse) {
  .bing-input__field[data-smooth-caret] { caret-color: auto; }
  .bing-input__caret-layer { display: none; }
}
.bing-input__field:disabled { color: var(--bing-disabled-text); cursor: not-allowed; }
.bing-input__field:disabled::placeholder { color: var(--bing-disabled-text); }
.bing-input__field::-webkit-search-cancel-button { display: none; }
.bing-input__field[type='number'] { appearance: textfield; -moz-appearance: textfield; }
.bing-input__field::-webkit-inner-spin-button, .bing-input__field::-webkit-outer-spin-button { margin: 0; -webkit-appearance: none; }
.bing-input__actions { display: inline-flex; align-items: center; gap: 2px; }
.bing-input__stepper { display: grid; width: 20px; }
.bing-input__step { display: grid; place-items: center; width: 20px; height: 12px; padding: 0; border: 0; border-radius: 2px; background: transparent; color: var(--bing-muted); cursor: pointer; touch-action: none; }
.bing-input__step:hover:not(:disabled) { background: var(--bing-surface-hover); color: var(--bing-heading); }
.bing-input__step:focus-visible { outline: 2px solid var(--bing-focus); outline-offset: 1px; }
.bing-input__step:disabled { color: var(--bing-disabled-text); cursor: not-allowed; }
.bing-input__clear.bing-button, .bing-input__password.bing-button {
  --button-height: 24px; --button-icon-size: 14px;
  min-height: 24px; width: 24px; padding: 0; flex: none; color: var(--bing-muted);
}
.bing-input__eyes { display: grid; }
.bing-input__clear:focus-visible, .bing-input__password:focus-visible { outline: 2px solid var(--bing-focus); outline-offset: 1px; }
.bing-input__eyes :deep(.bing-icon) { grid-area: 1 / 1; transition: opacity 0.14s ease, transform 0.14s ease; }
.bing-input__eyes :deep(.bing-icon:last-child), .bing-input__eyes.is-visible :deep(.bing-icon:first-child) { opacity: 0; transform: scale(0.85); }
.bing-input__eyes.is-visible :deep(.bing-icon:last-child) { opacity: 1; transform: scale(1); }
.bing-input.is-motion-reduced .bing-input__eyes :deep(.bing-icon) { transition: none; }
@media (prefers-reduced-motion: reduce) { .bing-input__eyes :deep(.bing-icon) { transition: none; } }
</style>
