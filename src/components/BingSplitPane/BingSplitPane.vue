<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import type { BingSplitPaneProps, BingSplitPaneEmits, BingSplitPaneExpose,
  BingSplitPaneCancelReason, BingSplitPaneResizeSource } from './BingSplitPane.types'

const props = withDefaults(defineProps<BingSplitPaneProps>(), {
  sideSize: undefined, defaultSideSize: 320, minSideSize: 160, maxSideSize: 640,
  minMainSize: 240, keyboardStep: 12, disabled: false, ariaLabel: '调整侧栏宽度',
})
const emit = defineEmits<BingSplitPaneEmits>()
const root = ref<HTMLElement | null>(null)
const handle = ref<HTMLElement | null>(null)
const sideId = `bing-split-pane-${useId()}-side`
const localSize = ref(props.defaultSideSize)
const draftSize = ref<number | null>(null)
const containerWidth = ref<number | null>(null)
let observer: ResizeObserver | undefined
let drag: { pointerId: number; x: number; size: number; width: number | null } | undefined

function finite(value: number, fallback: number) { return Number.isFinite(value) ? value : fallback }
function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }
const minimum = computed(() => Math.max(0, finite(props.minSideSize, 160)))
const maximum = computed(() => Math.max(minimum.value, finite(props.maxSideSize, 640)))
const preferredSize = computed(() => clamp(finite(props.sideSize ?? localSize.value, finite(props.defaultSideSize, 320)), minimum.value, maximum.value))
const available = computed(() => containerWidth.value === null ? maximum.value
  : Math.max(0, containerWidth.value - Math.max(0, finite(props.minMainSize, 240))))
const actualMax = computed(() => Math.min(maximum.value, available.value))
const actualMin = computed(() => Math.min(minimum.value, actualMax.value))
const actualSize = computed(() => clamp(draftSize.value ?? preferredSize.value, actualMin.value, actualMax.value))
const canResize = computed(() => !props.disabled && actualMax.value > actualMin.value)
const rootStyle = computed(() => ({ '--bing-split-side-size': `${actualSize.value}px` }))

function payload(source: BingSplitPaneResizeSource, size = actualSize.value, preferred = preferredSize.value) {
  return { size, preferredSize: preferred, source }
}

function cleanupDrag() {
  const pointerId = drag?.pointerId
  drag = undefined
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerCancel)
  window.removeEventListener('keydown', onGlobalKeydown, true)
  window.removeEventListener('blur', onBlur)
  if (pointerId !== undefined && handle.value?.hasPointerCapture?.(pointerId)) {
    handle.value.releasePointerCapture(pointerId)
  }
}

function cancel(reason: BingSplitPaneCancelReason) {
  if (!drag) return
  cleanupDrag()
  draftSize.value = null
  emit('resize-cancel', { ...payload('pointer'), reason })
}

function begin(event: PointerEvent) {
  if (!canResize.value || drag || event.button !== 0 || event.isPrimary === false) return
  event.preventDefault()
  handle.value?.focus({ preventScroll: true })
  drag = { pointerId: event.pointerId, x: event.clientX, size: actualSize.value, width: containerWidth.value }
  draftSize.value = actualSize.value
  try { handle.value?.setPointerCapture(event.pointerId) } catch { /* 合成事件由窗口监听处理。 */ }
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerCancel)
  window.addEventListener('keydown', onGlobalKeydown, true)
  window.addEventListener('blur', onBlur)
  emit('resize-start', payload('pointer'))
}

function onPointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return
  const next = clamp(drag.size + drag.x - event.clientX, actualMin.value, actualMax.value)
  if (next === draftSize.value) return
  draftSize.value = next
  emit('resize', payload('pointer'))
}

function commit(next: number, source: BingSplitPaneResizeSource) {
  const preferred = clamp(next, minimum.value, maximum.value)
  const result = payload(source, clamp(preferred, actualMin.value, actualMax.value), preferred)
  if (preferred !== preferredSize.value) {
    if (props.sideSize === undefined) localSize.value = preferred
    emit('update:sideSize', preferred)
  }
  draftSize.value = null
  emit('resize-end', result)
}

function onPointerUp(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId) return
  onPointerMove(event)
  // 没有实际调整时保留偏好，不能把受容器限制的临时宽度落盘。
  const next = actualSize.value === drag.size ? preferredSize.value : actualSize.value
  cleanupDrag()
  commit(next, 'pointer')
}
function onPointerCancel(event: PointerEvent) {
  if (event.pointerId === drag?.pointerId) cancel('pointercancel')
}
function onLostCapture(event: PointerEvent) {
  if (event.pointerId === drag?.pointerId) cancel('capture-lost')
}
function onBlur() { cancel('blur') }
function onGlobalKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !drag) return
  event.preventDefault()
  event.stopPropagation()
  cancel('escape')
}
function applyImmediate(next: number, source: BingSplitPaneResizeSource) {
  if (props.disabled) return
  cancel('props')
  emit('resize-start', payload(source))
  emit('resize', payload(source, clamp(next, actualMin.value, actualMax.value)))
  commit(next, source)
}
function reset() {
  applyImmediate(clamp(finite(props.defaultSideSize, 320), minimum.value, maximum.value), 'reset')
}
function onKeydown(event: KeyboardEvent) {
  if (props.disabled || drag) return
  if (event.key === 'Enter') {
    event.preventDefault()
    reset()
    return
  }
  if (!canResize.value) return
  const step = Math.max(1, finite(props.keyboardStep, 12))
  const next = event.key === 'ArrowLeft' ? actualSize.value + step
    : event.key === 'ArrowRight' ? actualSize.value - step
    : event.key === 'Home' ? actualMin.value
    : event.key === 'End' ? actualMax.value : null
  if (next === null) return
  event.preventDefault()
  applyImmediate(clamp(next, actualMin.value, actualMax.value), 'keyboard')
}

function rendered(element: HTMLElement) {
  return element.isConnected && element.getClientRects().length > 0
}
function measure(width: number) {
  // KeepAlive 移出文档或 display:none 时会报告 0，并非容器真的变窄；保留上次有效宽度，
  // 避免重新显示时侧栏先以 0 宽渲染一帧再展开。未提交的拖动仍按容器收缩取消。
  if (width <= 0 && root.value && !rendered(root.value)) {
    cancel('container')
    return
  }
  if (drag && drag.width !== null && width < drag.width) cancel('container')
  containerWidth.value = Math.max(0, width)
}
watch(() => [props.sideSize, props.minSideSize, props.maxSideSize, props.minMainSize, props.disabled], () => cancel('props'))
onMounted(() => {
  if (!root.value) return
  measure(root.value.clientWidth)
  observer = new ResizeObserver(entries => {
    const entry = entries[0]
    if (entry) measure(entry.contentRect.width)
  })
  observer.observe(root.value)
})
onBeforeUnmount(() => {
  cancel('unmount')
  observer?.disconnect()
})
defineExpose<BingSplitPaneExpose>({ reset })
</script>

<template>
  <div ref="root" class="bing-split-pane" :class="{ 'is-resizing': draftSize !== null }" :style="rootStyle">
    <div class="bing-split-pane__main"><slot /></div>
    <div :id="sideId" class="bing-split-pane__side"><slot name="side" :size="actualSize" /></div>
    <button ref="handle" type="button" role="separator" class="bing-split-pane__handle"
      :disabled="disabled" :aria-disabled="disabled" :class="{ 'is-fixed': !canResize }"
      :aria-label="ariaLabel" :aria-controls="sideId"
      aria-orientation="vertical" :aria-valuemin="actualMin" :aria-valuemax="actualMax"
      :aria-valuenow="actualSize" :aria-valuetext="`${Math.round(actualSize)} 像素`"
      @pointerdown="begin" @lostpointercapture="onLostCapture" @keydown="onKeydown" @dblclick="reset" />
  </div>
</template>

<style scoped>
.bing-split-pane {
  box-sizing: border-box;
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--bing-split-side-size);
  min-width: 0;
  min-height: 0;
}
.bing-split-pane__main,
.bing-split-pane__side {
  min-width: 0;
  min-height: 0;
  overflow: clip;
}
.bing-split-pane__handle {
  position: absolute;
  inset-block: 0;
  left: calc(100% - var(--bing-split-side-size));
  transform: translateX(-50%);
  z-index: 1;
  width: 8px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: col-resize;
  touch-action: none;
}
.bing-split-pane__handle::after {
  position: absolute;
  inset-block: 0;
  left: 3px;
  width: 1px;
  background: var(--bing-border);
  content: '';
}
.bing-split-pane__handle:hover::after,
.bing-split-pane__handle:focus-visible::after,
.is-resizing .bing-split-pane__handle::after { background: var(--bing-accent); width: 2px; }
.bing-split-pane__handle:focus-visible { outline: 2px solid var(--bing-focus); outline-offset: -2px; }
.bing-split-pane__handle.is-fixed { cursor: default; }
.is-resizing { user-select: none; cursor: col-resize; }
</style>
