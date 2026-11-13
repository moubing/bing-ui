<script setup lang="ts">
import '../../theme/text-control.css'
import { useTextControl } from '../../utils/useTextControl'
import { useTextareaAutosize } from './useTextareaAutosize'
import BingButton from '../BingButton/BingButton.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import { useFormControl } from '../BingForm/useFormControl'
import { useControlAttrs } from '../../utils/controlAttrs'
import { useTextControlCaret } from '../../motion/useTextControlCaret'
import { computed, mergeProps, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { X } from '../../icons'
import BingIcon from '../BingIcon/BingIcon.vue'
import type {
  BingTextareaEmits,
  BingTextareaExpose,
  BingTextareaProps,
} from './BingTextarea.types'

const props = withDefaults(defineProps<BingTextareaProps>(), {
  id: undefined,
  modelValue: '',
  placeholder: undefined,
  disabled: undefined,
  readonly: false,
  clearable: false,
  smoothCaret: true,
  rows: 3,
  autosize: false,
  autosizeTransition: true,
  submitOn: 'none',
  maxLength: undefined,
  showCount: false,
  size: undefined,
  block: false,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
  name: undefined,
  autocomplete: undefined,
  spellcheck: undefined,
  resize: 'vertical',
  clearAriaLabel: '清空文本',
})

const emit = defineEmits<BingTextareaEmits>()
defineOptions({ inheritAttrs: false })
const { rootAttrs, controlAttrs } = useControlAttrs()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby } = useFormControl(props)

const textareaRef = ref<HTMLTextAreaElement | null>(null)
const caretLayerRef = ref<HTMLElement | null>(null)
const caretRef = ref<HTMLElement | null>(null)
useTextControlCaret(textareaRef, caretLayerRef, caretRef, () => props.smoothCaret)
const scrollbarRef = ref<BingScrollbarExpose | null>(null)
const rootRef = ref<HTMLElement | null>(null)
let undoSnapshot: { value: string; expiresAt: number } | undefined
let undoTimer: ReturnType<typeof setTimeout> | undefined
let undoRequest = 0
let disposed = false

const { composing, displayValue, hasValue, clearEnabled, canClear, maxLength: resolvedMaxLength, countText, countTone,
  liveMessage, limitFeedback, reducedFeedback, reducedMotion, handleInput, handleCompositionStart, handleCompositionEnd,
  handleClear: clearText, handleFocusIn, handleFocusOut, handleBeforeinput, isEnterCommit, handleKeydown: resetCompositionCommit } = useTextControl({
  root: rootRef, field: textareaRef, value: () => props.modelValue,
  disabled: () => resolvedDisabled.value, readonly: () => props.readonly, clearable: () => props.clearable,
  maxLength: () => props.maxLength ?? controlAttrs().maxlength, showCount: () => props.showCount,
  publish(value, event) { emit('update:modelValue', value); emit('input', value, event) },
  clear() { emit('update:modelValue', ''); emit('clear') },
  change: () => formItem?.handleControlChange(),
  blur: () => { discardUndo(); formItem?.handleControlBlur() },
  displayChanged: () => autosize.schedule(),
})

const rootClasses = computed(() => [
  'bing-textarea', 'bing-text-control',
  `bing-textarea--${resolvedSize.value}`,
  `bing-textarea--status-${resolvedStatus.value}`,
  {
    'is-block': props.block || Boolean(formItem),
    'is-disabled': resolvedDisabled.value,
    'is-readonly': props.readonly,
    'is-error': resolvedStatus.value === 'error',
    'is-success': resolvedStatus.value === 'success',
    'is-warning': resolvedStatus.value === 'warning',
    'has-clear': clearEnabled.value,
    'is-motion-reduced': reducedMotion.value,
    'is-invalid': resolvedStatus.value === 'error',
    'has-value': hasValue.value,
    'can-clear': canClear.value,
    'has-footer': props.showCount,
    'is-resizable': props.resize !== 'none',
  },
])

const autosize = useTextareaAutosize({
  field: textareaRef, root: rootRef, value: () => displayValue.value,
  autosize: () => props.autosize, rows: () => props.rows, transition: () => props.autosizeTransition,
  reducedMotion, layout: () => [resolvedSize.value, clearEnabled.value],
  updateScrollbar: () => scrollbarRef.value?.update(), resize: height => emit('resize', height),
})
const formattedCount = computed(() => props.countFormatter?.(displayValue.value.length, resolvedMaxLength.value) ?? countText.value)
const submitShortcuts = computed(() => props.submitOn === 'enter' ? 'Enter' : props.submitOn === 'mod-enter' ? 'Control+Enter Meta+Enter' : undefined)

function discardUndo() {
  undoSnapshot = undefined
  undoRequest += 1
  clearTimeout(undoTimer)
  undoTimer = undefined
}
function handleClear() {
  if (!canClear.value) return
  discardUndo()
  undoSnapshot = { value: textareaRef.value?.value ?? displayValue.value, expiresAt: Date.now() + 5000 }
  undoTimer = setTimeout(discardUndo, 5000)
  const request = undoRequest
  clearText()
  void nextTick(() => {
    // 只为父级接受的清除保留撤销；受控拒绝不制造无效的历史。
    if (!disposed && request === undoRequest && props.modelValue !== '') discardUndo()
  })
}
function handleUndo(event: KeyboardEvent) {
  if (event.defaultPrevented || composing.value || event.isComposing || event.keyCode === 229 ||
    props.readonly || resolvedDisabled.value || event.altKey || event.shiftKey ||
    !(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'z' || !undoSnapshot) return false
  const field = textareaRef.value
  const root = rootRef.value
  if (!field || !root?.contains(root.ownerDocument.activeElement) || Date.now() >= undoSnapshot.expiresAt) {
    discardUndo()
    return false
  }
  const value = undoSnapshot.value
  discardUndo()
  const request = undoRequest
  event.preventDefault()
  emit('update:modelValue', value)
  formItem?.handleControlChange()
  field.focus({ preventScroll: true })
  void nextTick(() => {
    if (disposed || request !== undoRequest || textareaRef.value !== field) return
    field.value = props.modelValue
    field.setSelectionRange(field.value.length, field.value.length)
    autosize.schedule()
  })
  return true
}
function handleEditingInput(event: Event) { discardUndo(); handleInput(event) }
function handleEditingComposition(event: CompositionEvent) { discardUndo(); handleCompositionStart(event) }
function handleFocus(event: FocusEvent) { emit('focus', event) }
function handleBlur(event: FocusEvent) { handleCompositionEnd(event); emit('blur', event) }
function handleKeydown(event: KeyboardEvent) {
  resetCompositionCommit(event)
  emit('keydown', event)
  if (handleUndo(event) || resolvedDisabled.value || props.readonly || props.submitOn === 'none') return
  if (isEnterCommit(event, props.submitOn)) {
    event.preventDefault()
    emit('submit', textareaRef.value?.value ?? displayValue.value, event)
  }
}
function handleRootKeydown(event: KeyboardEvent) {
  if (event.target !== textareaRef.value) handleUndo(event)
}

function focus(event?: MouseEvent) {
  if (event?.target instanceof Element && event.target.closest('.bing-scrollbar__rail')) return
  textareaRef.value?.focus()
}

function blur() {
  textareaRef.value?.blur()
}

function select() {
  textareaRef.value?.select()
}

watch(() => props.modelValue, value => { if (undoSnapshot && value !== '') discardUndo() })
watch([resolvedDisabled, () => props.readonly, () => props.clearable], discardUndo)
onBeforeUnmount(() => { disposed = true; discardUndo() })

defineExpose<BingTextareaExpose>({
  get textarea() {
    return textareaRef.value
  },
  focus,
  blur,
  select,
})
</script>

<template>
  <div v-bind="rootAttrs()" ref="rootRef" :class="rootClasses" @click="focus" @focusin="handleFocusIn" @focusout="handleFocusOut" @keydown="handleRootKeydown">
    <BingScrollbar ref="scrollbarRef" class="bing-textarea__scroll" :vertical="autosize.verticalScrollbar.value" :smooth="false" :focusable="false" :min-thumb-size="12" horizontal>
      <template #viewport="{ viewportRef, viewportAttrs }">
        <textarea
          v-bind="mergeProps(controlAttrs(), viewportAttrs)"
          :ref="element => { textareaRef = element as HTMLTextAreaElement | null; viewportRef(element) }"
          class="bing-textarea__field"
          :id="resolvedId"
          :value="displayValue"
          :placeholder="placeholder"
          :disabled="resolvedDisabled"
          :readonly="readonly"
          :rows="rows"
          :maxlength="resolvedMaxLength"
          :name="name"
          :autocomplete="autocomplete"
          :spellcheck="spellcheck"
          :aria-label="ariaLabel || undefined"
          :aria-describedby="resolvedAriaDescribedby"
          :aria-invalid="resolvedStatus === 'error' || undefined"
          :aria-keyshortcuts="submitShortcuts ?? (controlAttrs()['aria-keyshortcuts'] as string | undefined)"
          @input="handleEditingInput"
          @beforeinput="handleBeforeinput"
          @compositionstart="handleEditingComposition"
          @compositionend="handleCompositionEnd"
          @focus="handleFocus"
          @blur="handleBlur"
          @keydown="handleKeydown"
        />
        <span ref="caretLayerRef" class="bing-textarea__caret-layer" aria-hidden="true">
          <span ref="caretRef" class="bing-textarea__caret" />
        </span>
      </template>
    </BingScrollbar>

    <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
      v-if="clearEnabled"
      class="bing-textarea__clear bing-text-control__action bing-text-control__clear"
      :class="{ 'is-visible': canClear }"
      :aria-hidden="!canClear || undefined"
      :tabindex="canClear ? 0 : -1"
      :aria-label="clearAriaLabel"
      @mousedown.prevent
      @click.stop="handleClear"
    >
      <template #prefix>
        <BingIcon :icon="X" size="xs" :stroke-width="1.75" />
      </template>
    </BingButton>

    <span v-if="showCount" class="bing-textarea__count bing-text-control__count" :class="['is-' + countTone, { 'is-limit': limitFeedback, 'is-reduced': reducedFeedback }]">
      {{ formattedCount }}
    </span>
    <span v-if="showCount" class="bing-text-control__live" aria-live="polite" aria-atomic="true">{{ liveMessage }}</span>
  </div>
</template>

<style scoped>
.bing-textarea {
  --bing-textarea-min-height: var(--bing-control-height-md, 36px);
  --bing-textarea-padding-x: 10px;
  --bing-textarea-padding-y: 7px;
  --bing-textarea-radius: var(--bing-radius-md, 6px);
  --bing-textarea-font-size: var(--bing-font-size-md, 0.875rem);
  --bing-textarea-line-height: 20px;

  box-sizing: border-box;
  position: relative;
  display: inline-grid;
  width: 320px;
  max-width: 100%;
  min-height: var(--bing-textarea-min-height);
  border-radius: var(--bing-textarea-radius);
}

.bing-textarea.is-block {
  display: grid;
  width: 100%;
}

.bing-textarea--sm {
  --bing-textarea-min-height: var(--bing-control-height-sm, 32px);
  --bing-textarea-padding-x: 8px;
  --bing-textarea-padding-y: 6px;
  --bing-textarea-font-size: var(--bing-font-size-sm, 0.8125rem);
  --bing-textarea-line-height: 18px;
}

.bing-textarea--lg {
  --bing-textarea-min-height: var(--bing-control-height-lg, 40px);
  --bing-textarea-padding-x: 12px;
  --bing-textarea-padding-y: 9px;
}

.bing-textarea__field {
  box-sizing: border-box;
  display: block;
  width: 100%;
  min-width: 0;
  min-height: calc(var(--bing-textarea-min-height) - 2px);
  padding: var(--bing-textarea-padding-y) var(--bing-textarea-padding-x);
  padding-bottom: calc(var(--bing-textarea-padding-y) + 8px);
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: var(--bing-textarea-font-size);
  font-weight: 400;
  line-height: var(--bing-textarea-line-height);
  outline: none;
  resize: v-bind(resize);
}

.bing-textarea__scroll {
  --bing-scrollbar-horizontal-right: 16px;
}

.bing-textarea__field[data-smooth-caret] { caret-color: transparent; }
.bing-textarea__caret-layer { position: absolute; inset: 0; overflow: hidden; pointer-events: none; user-select: none; }
.bing-textarea__caret { position: absolute; left: 0; top: 0; width: 2px; border-radius: 1px; background: currentColor; visibility: hidden; }
.bing-textarea__caret[data-active] { visibility: visible; will-change: transform; }
.bing-textarea__caret[data-active].is-idle { animation: bing-textarea-caret-blink 1s ease-in-out infinite; }
@keyframes bing-textarea-caret-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
@media (prefers-reduced-motion: reduce), (forced-colors: active), (pointer: coarse) {
  .bing-textarea__field[data-smooth-caret] { caret-color: auto; }
  .bing-textarea__caret-layer { display: none; }
}

.bing-textarea.is-resizable .bing-textarea__scroll :deep(.bing-scrollbar__rail--vertical) {
  bottom: 16px;
}

.bing-textarea.has-clear .bing-textarea__field {
  padding-right: calc(var(--bing-textarea-padding-x) + 34px);
}

.bing-textarea__field::placeholder {
  color: var(--bing-placeholder);
}

.bing-textarea__field:disabled {
  color: var(--bing-disabled-text);
  cursor: not-allowed;
}

.bing-textarea__field:disabled::placeholder {
  color: var(--bing-disabled-text);
}

.bing-textarea__clear {
  position: absolute;
  top: calc((var(--bing-textarea-min-height) - 26px) / 2);
  right: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 0;
  border-radius: var(--bing-radius-sm);
  background: transparent;
  color: var(--bing-muted);
  cursor: pointer;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-textarea__clear:hover {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}

.bing-textarea__clear:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-textarea__count {
  font-variant-numeric: tabular-nums;
  padding: 0 var(--bing-textarea-padding-x) 6px;
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  text-align: right;
  pointer-events: none;
}

.bing-textarea.is-disabled .bing-textarea__count {
  color: var(--bing-disabled-text);
}

@media (prefers-reduced-motion: reduce) {
  .bing-textarea,
  .bing-textarea__clear {
    transition: none;
  }
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-textarea__clear.bing-button {
  --button-height: 24px;
  --button-icon-size: 14px;
  min-height: 24px;
  width: var(--button-height);
  padding: 0;
}
</style>
