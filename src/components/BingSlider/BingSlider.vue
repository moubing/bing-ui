<script setup lang="ts" generic="Range extends boolean = false">
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useFormControl } from '../BingForm/useFormControl'
import { useControlAttrs } from '../../utils/controlAttrs'
import { useSliderMotion } from '../../motion/sliderMotion'
import { createSliderScale, lockSliderDocument, sameSliderValue, sliderValues } from './BingSlider.utils'
import type { BingSliderProps, BingSliderEmits, BingSliderExpose, BingSliderValue, BingSliderModelValue } from './BingSlider.types'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<BingSliderProps<Range>>(), { disabled: undefined })
const emit = defineEmits<BingSliderEmits<Range>>()
const { rootAttrs, controlAttrs } = useControlAttrs()
const root = ref<HTMLElement | null>(null)
const inputs = ref<HTMLInputElement[]>([])
const localValue = ref<BingSliderValue | undefined>(props.defaultValue)
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby } = useFormControl(props)
const scale = computed(() => createSliderScale(props))
// 父级渲染可能创建内容相同的新 marks 数组，只有有效数值约束变化才中断手势。
const scaleConstraints = computed(() => {
  const { min, max, step, distance, stops } = scale.value
  return JSON.stringify([min, max, step, distance, stops])
})
const value = computed(() => scale.value.normalize(props.modelValue ?? localValue.value ?? (props.range ? undefined : 0), !!props.range))
// 拖动期间由手势拥有预览值，父级确认值只在手势结束后接管显示。
const pointerValue = ref<BingSliderValue>()
const displayValue = computed(() => pointerValue.value ?? value.value)
const values = computed(() => sliderValues(displayValue.value))
const disabled = computed(() => resolvedDisabled.value || scale.value.first === scale.value.last)
const vertical = computed(() => props.orientation === 'vertical')
const positions = (next: BingSliderValue) => sliderValues(next).map(scale.value.fraction)
const motion = useSliderMotion(root, positions(value.value))
const { reduced, initialStyle } = motion
const activeIndex = ref(0)
const dragging = ref(false)
const pointerFocus = ref(false)
const keyboardFocus = ref(false)
const visibleTooltip = ref<number | null>(null)
const tooltipMode = computed(() => props.tooltip ?? 'never')
const labelledby = computed(() => props.ariaLabelledby ?? (props.range ? formItem?.labelId?.value : undefined))
const topIndex = computed(() => props.range && values.value[0] === scale.value.last ? 0 : activeIndex.value)
let tooltipTimer: ReturnType<typeof setTimeout> | undefined
let pending: BingSliderValue | undefined
let lastCommitted = value.value
let keyEditing = false
let commitTicket = 0
let updateTicket = 0
let disposed = false
let focusingPointer = false
const rangeKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'])

function syncInputs(next = value.value) {
  sliderValues(next).forEach((number, index) => { if (inputs.value[index]) inputs.value[index]!.value = String(number) })
}
function showTooltip(index: number) {
  clearTimeout(tooltipTimer)
  visibleTooltip.value = index
}
function hideTooltip() {
  clearTimeout(tooltipTimer)
  if (keyboardFocus.value) return
  tooltipTimer = setTimeout(() => { visibleTooltip.value = null }, 600)
}
function reconcileValue(next?: BingSliderValue) {
  const ticket = ++updateTicket
  // 活跃手势中不逐帧回写父级值；结束后等待最后一轮受控更新，再统一收敛。
  void nextTick(() => {
    if (disposed || ticket !== updateTicket || pointer?.active) return
    pointerValue.value = undefined
    syncInputs()
    if (next === undefined || !sameSliderValue(next, value.value)) motion.move(positions(value.value), true)
  })
}
function requestValue(next: BingSliderValue, animate: boolean, force = false) {
  if (disabled.value) return
  const previous = pointer?.active ? displayValue.value : pending ?? value.value
  if (pointer?.active) pointerValue.value = next
  if (!force && sameSliderValue(next, previous)) {
    if (!animate) {
      syncInputs(next)
      motion.move(positions(next), false)
      reconcileValue(next)
    }
    return
  }
  pending = next
  if (props.modelValue === undefined) localValue.value = next
  syncInputs(next)
  motion.move(positions(next), animate)
  emit('update:modelValue', next as BingSliderModelValue<Range>)
  reconcileValue(next)
}
function requestAt(index: number, raw: number, animate: boolean) {
  requestValue(scale.value.update(displayValue.value, index, raw), animate)
}
function commit() {
  const ticket = ++commitTicket
  void nextTick(() => {
    if (disposed || ticket !== commitTicket || disabled.value) return
    pending = undefined
    const next = value.value
    if (sameSliderValue(next, lastCommitted)) return
    lastCommitted = next
    emit('change', next as BingSliderModelValue<Range>)
    formItem?.handleControlChange()
  })
}
function cancelPending() {
  commitTicket++
  keyEditing = false
  pending = undefined
}
function onInput(index: number, event: Event) {
  if (disabled.value) { syncInputs(); return }
  const raw = (event.target as HTMLInputElement).valueAsNumber
  const current = value.value
  let next = scale.value.update(current, index, raw)
  // 移动端读屏可能只调节原生 range 一个单位，离散档位仍应能向前/后移动。
  const currentNumber = sliderValues(current)[index]!
  if (scale.value.stops && raw !== currentNumber && sameSliderValue(next, current)) {
    next = scale.value.nudge(current, index, Math.sign(raw - currentNumber), 1)
  }
  requestValue(next, false)
}
function onChange(index: number, event: Event) {
  if (disabled.value) { syncInputs(); return }
  onInput(index, event)
  if (!keyEditing && !pointer) commit()
}
function onKeydown(index: number, event: KeyboardEvent) {
  if (disabled.value || !rangeKeys.has(event.key) || event.altKey || event.ctrlKey || event.metaKey) return
  event.preventDefault()
  if (pointer) return
  pointerFocus.value = false
  keyboardFocus.value = true
  activeIndex.value = index
  keyEditing = true
  showTooltip(index)
  const current = value.value
  const currentNumber = sliderValues(current)[index]!
  const rtl = !vertical.value && root.value && getComputedStyle(root.value).direction === 'rtl'
  let next: BingSliderValue
  if (event.key === 'Home' || event.key === 'End') {
    next = scale.value.update(current, index, event.key === 'Home' ? scale.value.first : scale.value.last)
  } else if (event.key === 'PageUp' || event.key === 'PageDown') {
    const direction = event.key === 'PageUp' ? 1 : -1
    const amount = Math.max(scale.value.step, (scale.value.max - scale.value.min) / 10)
    next = scale.value.update(current, index, currentNumber + direction * amount)
    if (scale.value.stops && sameSliderValue(next, current)) next = scale.value.nudge(current, index, direction, 1)
  } else {
    let direction = event.key === 'ArrowRight' || event.key === 'ArrowUp' ? 1 : -1
    if (rtl && (event.key === 'ArrowRight' || event.key === 'ArrowLeft')) direction *= -1
    next = scale.value.nudge(current, index, direction, event.shiftKey ? 10 : 1)
  }
  requestValue(next, !event.key.startsWith('Arrow'))
}
function finishKeys(event: KeyboardEvent) {
  if (!rangeKeys.has(event.key)) return
  keyEditing = false
  if (pending !== undefined) commit()
}
function onFocus(index: number, event: FocusEvent) {
  activeIndex.value = index
  if (!focusingPointer) pointerFocus.value = false
  keyboardFocus.value = !pointerFocus.value && (event.target as HTMLElement).matches(':focus-visible')
  if (keyboardFocus.value) showTooltip(index)
  emit('focus', event)
}
function onBlur(event: FocusEvent) {
  keyEditing = false
  keyboardFocus.value = false
  hideTooltip()
  if (!pointer && pending !== undefined) commit()
  emit('blur', event)
  // 范围内从第一个滑块 Tab 到第二个滑块不视为离开整个表单控件。
  if (!root.value?.contains(event.relatedTarget as Node | null)) formItem?.handleControlBlur()
}
function focusPointer(index: number) {
  pointerFocus.value = true
  keyboardFocus.value = false
  activeIndex.value = index
  focusingPointer = true
  inputs.value[index]?.focus({ preventScroll: true })
  focusingPointer = false
}

interface PointerSession {
  id: number; type: string; x: number; y: number; started: number; excursion: number
  start: number; travel: number; thumbSize: number; vertical: boolean; reversed: boolean; index: number; offset: number
  active: boolean; rejected: boolean; overlap: boolean; onThumb: boolean; original: BingSliderValue
}
let pointer: PointerSession | undefined
// 指针捕获会把 click / dblclick 重定向到根节点，记录两次真实的滑块点按。
const thumbClicks: Array<number | null> = []
let unlockDocument: (() => void) | undefined
let pointerWindow: Window | undefined

function rawAt(event: { clientX: number; clientY: number }, session: PointerSession) {
  const coordinate = session.vertical ? event.clientY : event.clientX
  const fraction = (coordinate - session.start - session.thumbSize / 2 - session.offset) / session.travel
  return scale.value.fromFraction(session.reversed ? 1 - fraction : fraction)
}
function nearestIndex(raw: number) {
  if (!props.range) return 0
  const [low, high] = values.value as [number, number]
  if (low === high) return raw < low || low === scale.value.last ? 0 : raw > high ? 1 : activeIndex.value
  return Math.abs(raw - low) <= Math.abs(raw - high) ? 0 : 1
}
function activatePointer(session: PointerSession) {
  session.active = true
  pointerValue.value = value.value
  dragging.value = true
  focusPointer(session.index)
  showTooltip(session.index)
  unlockDocument ??= lockSliderDocument(root.value!.ownerDocument)
}
function onPointerDown(event: PointerEvent) {
  if (disabled.value || pointer || event.button !== 0 || !root.value) return
  if ((event.target as Element).closest('[data-slider-mark]')) return
  const rect = root.value.getBoundingClientRect()
  const thumbSize = root.value.querySelector('.bing-slider__positioner')!.getBoundingClientRect().width
  const length = vertical.value ? rect.height : rect.width
  if (length <= thumbSize) return
  const start = vertical.value ? rect.top : rect.left
  const coordinate = vertical.value ? event.clientY : event.clientX
  const reversed = vertical.value || getComputedStyle(root.value).direction === 'rtl'
  const fraction = (coordinate - start - thumbSize / 2) / (length - thumbSize)
  const raw = scale.value.fromFraction(reversed ? 1 - fraction : fraction)
  const targetThumb = (event.target as Element).closest<HTMLElement>('[data-slider-thumb]')
  const index = targetThumb ? Number(targetThumb.dataset.sliderThumb) : nearestIndex(raw)
  const center = start + thumbSize / 2 + (reversed ? 1 - motion.fraction(index) : motion.fraction(index)) * (length - thumbSize)
  const hit = !!targetThumb || (event.pointerType === 'touch' && Math.abs(coordinate - center) <= 22)
  if (event.pointerType !== 'touch') event.preventDefault()
  pointer = {
    id: event.pointerId, type: event.pointerType, x: event.clientX, y: event.clientY, started: event.timeStamp,
    excursion: 0, start, travel: length - thumbSize, thumbSize, vertical: vertical.value, reversed, index,
    offset: hit ? coordinate - center : 0, active: false, rejected: false,
    overlap: !!props.range && values.value[0] === values.value[1] && hit, onThumb: hit, original: value.value,
  }
  focusPointer(index)
  pointerWindow = root.value.ownerDocument.defaultView ?? undefined
  pointerWindow?.addEventListener('pointermove', onPointerMove, { passive: false })
  pointerWindow?.addEventListener('pointerup', onPointerEnd)
  pointerWindow?.addEventListener('pointercancel', onPointerEnd)
  pointerWindow?.addEventListener('keydown', onEscape, true)
  pointerWindow?.addEventListener('blur', onWindowBlur)
  try { root.value.setPointerCapture?.(event.pointerId) } catch { /* window 监听负责无捕获环境。 */ }
  if (hit || event.pointerType !== 'touch') {
    activatePointer(pointer)
    motion.releaseEdges(false)
    if (hit) motion.stop()
    if (!hit) requestAt(index, rawAt(event, pointer), true)
  }
}
function onPointerMove(event: PointerEvent) {
  const session = pointer
  if (!session || event.pointerId !== session.id || session.rejected) return
  const dx = event.clientX - session.x
  const dy = event.clientY - session.y
  const along = session.vertical ? dy : dx
  const across = session.vertical ? dx : dy
  session.excursion = Math.max(session.excursion, Math.hypot(dx, dy))
  if (!session.active) {
    if (Math.abs(across) >= 6 && Math.abs(across) >= Math.abs(along)) { session.rejected = true; return }
    if (Math.abs(along) <= 6 || Math.abs(along) <= Math.abs(across)) return
    activatePointer(session)
    motion.releaseEdges(false)
  }
  if (session.overlap && Math.abs(along) > 0) {
    session.index = along * (session.reversed ? -1 : 1) < 0 ? 0 : 1
    session.overlap = false
    focusPointer(session.index)
    showTooltip(session.index)
  }
  event.preventDefault()
  const raw = rawAt(event, session)
  requestAt(session.index, raw, false)
  const number = values.value[session.index]!
  const excess = raw < scale.value.first && number === scale.value.first ? raw - scale.value.first
    : raw > scale.value.last && number === scale.value.last ? raw - scale.value.last : 0
  motion.stretch(session.index, excess / (scale.value.max - scale.value.min) * session.travel * (session.reversed ? -1 : 1))
}
function releasePointer(animateEdge = true) {
  const session = pointer
  pointer = undefined
  dragging.value = false
  pointerWindow?.removeEventListener('pointermove', onPointerMove)
  pointerWindow?.removeEventListener('pointerup', onPointerEnd)
  pointerWindow?.removeEventListener('pointercancel', onPointerEnd)
  pointerWindow?.removeEventListener('keydown', onEscape, true)
  pointerWindow?.removeEventListener('blur', onWindowBlur)
  pointerWindow = undefined
  if (session && root.value?.hasPointerCapture?.(session.id)) root.value.releasePointerCapture(session.id)
  unlockDocument?.()
  unlockDocument = undefined
  if (session?.active || !animateEdge) motion.releaseEdges(animateEdge)
  hideTooltip()
  if (session?.active) reconcileValue()
}
function onPointerEnd(event: PointerEvent) {
  const session = pointer
  if (!session || event.pointerId !== session.id) return
  if (event.type === 'pointerup') {
    const moved = Math.max(session.excursion, Math.hypot(event.clientX - session.x, event.clientY - session.y))
    thumbClicks.push(session.onThumb && moved < 6 ? session.index : null)
    if (thumbClicks.length > 2) thumbClicks.shift()
  }
  if (event.type === 'pointercancel' && session.type === 'touch') {
    releasePointer()
    if (session.active && !sameSliderValue(value.value, session.original)) requestValue(session.original, true)
    cancelPending()
    return
  }
  if (!session.active && !session.rejected && event.type === 'pointerup'
    && Math.max(session.excursion, Math.hypot(event.clientX - session.x, event.clientY - session.y)) < 6
    && event.timeStamp - session.started < 300) {
    activatePointer(session)
    requestAt(session.index, rawAt(event, session), true)
  }
  releasePointer()
  if (session.active && pending !== undefined) commit()
}
function onWindowBlur() {
  const active = pointer?.active
  releasePointer()
  if (active && pending !== undefined) commit()
}
function onEscape(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !pointer) return
  event.preventDefault()
  event.stopPropagation()
  const original = pointer.original
  releasePointer()
  requestValue(original, true, true)
  cancelPending()
}
function onMark(value: number) {
  if (disabled.value) return
  const index = nearestIndex(value)
  focusPointer(index)
  showTooltip(index)
  requestAt(index, value, true)
  commit()
  hideTooltip()
}
function onReset(event: MouseEvent) {
  const thumb = (event.target as Element).closest<HTMLElement>('[data-slider-thumb]')
  const index = thumb ? Number(thumb.dataset.sliderThumb)
    : event.target === root.value && thumbClicks.length === 2 && thumbClicks[0] === thumbClicks[1] ? thumbClicks[1] : null
  thumbClicks.length = 0
  if (index == null) return
  if (disabled.value || props.resetValue === undefined || pointer) return
  event.preventDefault()
  cancelPending()
  motion.releaseEdges(false)
  focusPointer(index)
  showTooltip(index)
  requestValue(scale.value.normalize(props.resetValue, !!props.range), true)
  commit()
  hideTooltip()
}
function thumbLabel(index: number) {
  if (!props.range) return props.ariaLabel
  return props.thumbAriaLabels?.[index] ?? (labelledby.value ? undefined
    : [props.ariaLabel, index === 0 ? '最小值' : '最大值'].filter(Boolean).join(' '))
}
function thumbLabelledby(index: number) {
  if (props.range && props.thumbAriaLabels?.[index]) return undefined
  if (!labelledby.value) return undefined
  return props.range ? labelledby.value + ' ' + resolvedId.value + '-label-' + index : labelledby.value
}
function isFilled(mark: number) {
  return mark <= values.value.at(-1)! && (!props.range || mark >= values.value[0]!)
}

watch(value, next => {
  if (pointer?.active) return
  if (pending === undefined) { lastCommitted = next; motion.move(positions(next), true) }
  else if (!sameSliderValue(next, pending)) motion.move(positions(next), true)
  syncInputs(next)
}, { flush: 'post' })
watch([disabled, scaleConstraints, () => props.range, vertical], () => {
  thumbClicks.length = 0
  releasePointer(false)
  cancelPending()
  if (disabled.value) { clearTimeout(tooltipTimer); visibleTooltip.value = null; keyboardFocus.value = false }
}, { flush: 'sync' })
onBeforeUnmount(() => {
  disposed = true
  releasePointer(false)
  cancelPending()
  clearTimeout(tooltipTimer)
})

defineExpose<BingSliderExpose>({
  get input() { return inputs.value[0] ?? null },
  get inputs() { return inputs.value.filter(Boolean) },
  focus: (index = 0) => { pointerFocus.value = false; inputs.value[index]?.focus() },
  blur: () => inputs.value.forEach(input => input?.blur()),
})
</script>

<template>
  <div ref="root" v-bind="rootAttrs()" class="bing-slider"
    :class="['bing-slider--' + resolvedSize, 'bing-slider--' + resolvedStatus, {
      'is-disabled': disabled, 'is-range': range, 'is-dragging': dragging, 'is-vertical': vertical,
      'is-pointer-focus': pointerFocus, 'is-reduced': reduced, 'has-labels': scale.marks.some(mark => mark.label),
    }]" :style="initialStyle" @pointerdown="onPointerDown" @lostpointercapture="onPointerEnd" @dblclick="onReset">
    <div class="bing-slider__rail" aria-hidden="true">
      <div class="bing-slider__fill-window"><div class="bing-slider__fill" /></div>
    </div>
    <div v-for="mark in scale.marks" :key="mark.value" class="bing-slider__mark"
      :class="{ 'is-filled': isFilled(mark.value) }" :style="{ '--bing-slider-position': scale.fraction(mark.value) }">
      <span class="bing-slider__tick" aria-hidden="true" />
      <button v-if="mark.label" class="bing-slider__mark-label" type="button" tabindex="-1"
        :disabled="disabled" data-slider-mark @click="onMark(mark.value)">{{ mark.label }}</button>
    </div>
    <div v-for="(number, index) in values" :key="index" class="bing-slider__positioner"
      :class="{ 'is-active': dragging && activeIndex === index, 'is-top': topIndex === index }"
      :style="{ '--bing-slider-position': 'var(--bing-slider-p' + index + ')',
        '--bing-slider-edge': 'var(--bing-slider-edge' + index + ', 0px)',
        '--bing-slider-squeeze': 'var(--bing-slider-squeeze' + index + ', 1)' }"
      :data-slider-thumb="index">
      <input :id="index === 0 ? resolvedId : resolvedId + '-' + index"
        :ref="element => { if (element) inputs[index] = element as HTMLInputElement; else inputs.splice(index, 1) }"
        v-bind="controlAttrs()" class="bing-slider__input" type="range" :name="name"
        :min="range ? scale.inputBounds(index, displayValue).min : scale.min"
        :max="range ? scale.inputBounds(index, displayValue).max : scale.max"
        :step="scale.stops ? 'any' : scale.step" :value="number" :disabled="disabled"
        :aria-orientation="vertical ? 'vertical' : 'horizontal'"
        :aria-label="thumbLabel(index)" :aria-labelledby="thumbLabelledby(index)" :aria-describedby="resolvedAriaDescribedby"
        :aria-valuetext="formatValueText?.(number)" :aria-invalid="resolvedStatus === 'error' || undefined"
        @input="onInput(index, $event)" @change="onChange(index, $event)" @keydown="onKeydown(index, $event)"
        @keyup="finishKeys" @focus="onFocus(index, $event)" @blur="onBlur" />
      <span class="bing-slider__thumb" aria-hidden="true" />
      <span v-if="range" :id="resolvedId + '-label-' + index" class="bing-slider__sr-only">{{ index === 0 ? '最小值' : '最大值' }}</span>
      <div v-if="tooltipMode !== 'never'" class="bing-slider__tooltip-anchor" aria-hidden="true"
        :class="{ 'is-visible': tooltipMode === 'always' || (!disabled && visibleTooltip === index) }">
        <div class="bing-slider__tooltip"><span class="bing-slider__tooltip-body">{{ formatTooltip?.(number) ?? String(number) }}</span></div>
        <span class="bing-slider__tooltip-arrow" />
      </div>
    </div>
  </div>
</template>

<style scoped src="./BingSlider.css"></style>
