import { computed, nextTick, onBeforeUnmount, onBeforeUpdate, onMounted, ref, watch, watchEffect, type Ref } from 'vue'
import { useReducedMotion } from '../motion/reducedMotion'

type TextField = HTMLInputElement | HTMLTextAreaElement

interface TextControlOptions {
  root: Ref<HTMLElement | null>
  field: Ref<TextField | null>
  value: () => unknown
  draft?: () => string | undefined
  disabled: () => boolean
  readonly: () => boolean
  clearable: () => boolean
  maxLength: () => unknown
  showCount: () => boolean
  debounceDelay?: () => number
  publish: (value: string, event: Event) => boolean | void
  clear: () => void
  debounced?: (value: string) => void
  change?: () => void
  commit?: (event: Event) => void
  blur?: () => void
  displayChanged?: () => void
}

/** Input / Textarea 的编辑会话；原生 blur 事件与整个控件的失焦校验分开处理。 */
export function useTextControl(options: TextControlOptions) {
  const composing = ref(false)
  const compositionValue = ref('')
  const maxLength = ref<number>()
  const liveMessage = ref('')
  const limitFeedback = ref(false)
  const reducedFeedback = ref(false)
  const reducedMotion = ref(false)
  const syncReducedMotion = () => { reducedMotion.value = prefersReducedMotion(options.root.value?.ownerDocument.defaultView) }
  const prefersReducedMotion = useReducedMotion({ onChange: syncReducedMotion })
  onMounted(syncReducedMotion)
  let compositionStartValue = ''
  let compositionCommit: string | undefined
  let resumeDebouncedInput = false
  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let feedbackTimer: ReturnType<typeof setTimeout> | undefined
  let focusRequest = 0
  let feedbackRequest = 0
  let disposed = false

  function syncMaxLength() {
    const raw = options.maxLength()
    const value = raw === undefined || raw === null || raw === '' ? NaN : Number(raw)
    maxLength.value = Number.isInteger(value) && value >= 0 ? value : undefined
  }
  watchEffect(syncMaxLength)
  // useAttrs() 不是响应式对象；兼容动态 maxlength 属性。
  onBeforeUpdate(syncMaxLength)

  const displayValue = computed(() => composing.value ? compositionValue.value : options.draft?.() ?? String(options.value() ?? ''))
  const hasValue = computed(() => displayValue.value.length > 0)
  const clearEnabled = computed(() => options.clearable() && !options.readonly() && !options.disabled())
  const canClear = computed(() => clearEnabled.value && hasValue.value)
  const characterCount = computed(() => displayValue.value.length)
  const countText = computed(() => maxLength.value === undefined ? String(characterCount.value) : `${characterCount.value}/${maxLength.value}`)
  const countTone = computed(() => maxLength.value === undefined ? 'default' : characterCount.value >= maxLength.value ? 'danger' : characterCount.value >= maxLength.value * 0.9 ? 'warning' : 'default')

  watch([countTone, maxLength, options.showCount], ([tone], [previous]) => {
    if (!options.showCount() || maxLength.value === undefined || tone === 'default') liveMessage.value = ''
    else if (tone !== previous) liveMessage.value = tone === 'danger' ? '已达到字数上限' : `还可输入 ${maxLength.value - characterCount.value} 个字`
  })

  function clearDebounce() {
    clearTimeout(debounceTimer)
    debounceTimer = undefined
  }
  function debounce(value: string) {
    if (!options.debounced) return
    clearDebounce()
    const delay = Math.max(0, Math.floor(options.debounceDelay?.() ?? 0))
    if (!delay) options.debounced(value)
    else debounceTimer = setTimeout(() => { debounceTimer = undefined; options.debounced?.(value) }, delay)
  }
  function publish(value: string, event: Event) {
    if (options.disabled() || options.readonly() || options.publish(value, event) === false) return
    debounce(value)
    options.change?.()
  }
  function handleInput(event: Event) {
    const value = (event.target as TextField).value
    if (composing.value || (event as InputEvent).isComposing) compositionValue.value = value
    else {
      const duplicate = compositionCommit === value
      compositionCommit = undefined
      if (!duplicate) publish(value, event)
    }
    options.displayChanged?.()
  }
  function handleCompositionStart(event: CompositionEvent) {
    compositionStartValue = (event.target as TextField).value
    compositionValue.value = compositionStartValue
    compositionCommit = undefined
    composing.value = true
    resumeDebouncedInput = debounceTimer !== undefined
    clearDebounce()
  }
  function handleCompositionEnd(event: Event) {
    if (!composing.value) return
    const value = options.field.value?.value ?? compositionValue.value
    composing.value = false
    compositionCommit = value
    if (value !== compositionStartValue) publish(value, event)
    else if (resumeDebouncedInput) debounce(value)
    resumeDebouncedInput = false
    options.displayChanged?.()
  }
  function handleKeydown(event: KeyboardEvent) {
    if (!composing.value && !event.isComposing && event.keyCode !== 229) compositionCommit = undefined
  }
  function isEnterCommit(event: KeyboardEvent, mode: 'enter' | 'mod-enter' = 'enter') {
    return event.key === 'Enter' && !composing.value && !event.isComposing && event.keyCode !== 229 &&
      !event.altKey && !event.shiftKey && !event.defaultPrevented &&
      (mode === 'mod-enter' ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey)
  }
  function handleClear() {
    if (!canClear.value) return
    composing.value = false
    compositionCommit = undefined
    resumeDebouncedInput = false
    clearDebounce()
    options.clear()
    options.debounced?.('')
    options.change?.()
    liveMessage.value = ''
    options.field.value?.focus()
    options.displayChanged?.()
  }
  function handleFocusIn() { focusRequest += 1 }
  async function handleFocusOut(event: FocusEvent) {
    const root = options.root.value
    if (!root || (event.relatedTarget instanceof Node && root.contains(event.relatedTarget))) return
    const request = ++focusRequest
    await nextTick()
    if (disposed || request !== focusRequest || options.root.value !== root || root.contains(root.ownerDocument.activeElement)) return
    options.commit?.(event)
    await nextTick()
    if (!disposed && request === focusRequest && !root.contains(root.ownerDocument.activeElement)) options.blur?.()
  }
  async function handleBeforeinput(event: InputEvent) {
    const field = options.field.value
    if (!field || !options.showCount() || maxLength.value === undefined || composing.value || event.isComposing ||
      options.disabled() || options.readonly() || !event.inputType.startsWith('insert') ||
      (field instanceof HTMLInputElement && field.type === 'number')) return
    const selection = (field.selectionEnd ?? 0) - (field.selectionStart ?? 0)
    const inserted = event.data ?? event.dataTransfer?.getData('text/plain') ?? ''
    if (field.value.length - selection + inserted.length <= maxLength.value && field.value.length - selection < maxLength.value) return
    if (selection > 0 && inserted.length <= selection) return
    const request = ++feedbackRequest
    clearTimeout(feedbackTimer)
    limitFeedback.value = false
    await nextTick()
    if (disposed || request !== feedbackRequest) return
    reducedFeedback.value = prefersReducedMotion(field.ownerDocument.defaultView)
    limitFeedback.value = true
    feedbackTimer = setTimeout(() => { limitFeedback.value = false }, 240)
  }
  watch(options.value, value => {
    if (!composing.value && String(value ?? '') !== compositionCommit) compositionCommit = undefined
  })
  watch([options.disabled, options.readonly], () => {
    if (!options.disabled() && !options.readonly()) return
    composing.value = false
    compositionCommit = undefined
    resumeDebouncedInput = false
    clearDebounce()
  })
  onBeforeUnmount(() => {
    disposed = true
    focusRequest += 1
    feedbackRequest += 1
    clearDebounce()
    clearTimeout(feedbackTimer)
  })
  return { composing, displayValue, hasValue, clearEnabled, canClear, maxLength, countText, countTone, liveMessage,
    limitFeedback, reducedFeedback, reducedMotion, publish, handleInput, handleCompositionStart, handleCompositionEnd,
    handleKeydown, isEnterCommit, handleClear, handleFocusIn, handleFocusOut, handleBeforeinput }
}
