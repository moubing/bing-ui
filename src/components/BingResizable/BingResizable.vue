<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { Component, CSSProperties } from 'vue'
import { gsap } from 'gsap'
import {
  ArrowDownLeft,
  ArrowDownRight,
  ArrowLeftRight,
  ArrowUpDown,
  ArrowUpLeft,
  ArrowUpRight,
} from '../../icons'
import type {
  BingResizableDelta,
  BingResizableDirection,
  BingResizableEmits,
  BingResizableExpose,
  BingResizablePayload,
  BingResizablePosition,
  BingResizableProps,
  BingResizableResolvedSize,
  BingResizableSize,
} from './BingResizable.types'
import BingIcon from '../BingIcon/BingIcon.vue'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const defaultDirections: BingResizableDirection[] = [
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
]

const handleIcons: Record<BingResizableDirection, Component> = {
  top: ArrowUpDown,
  right: ArrowLeftRight,
  bottom: ArrowUpDown,
  left: ArrowLeftRight,
  'top-left': ArrowUpLeft,
  'top-right': ArrowUpRight,
  'bottom-left': ArrowDownLeft,
  'bottom-right': ArrowDownRight,
}

const props = withDefaults(defineProps<BingResizableProps>(), {
  size: undefined,
  defaultSize: () => ({ width: 320, height: 220 }),
  position: undefined,
  defaultPosition: () => ({ x: 0, y: 0 }),
  minWidth: 80,
  minHeight: 80,
  maxWidth: undefined,
  maxHeight: undefined,
  mode: 'fixed',
  snapMode: 'live',
  directions: () => [
    'right',
    'bottom',
    'bottom-right',
  ],
  step: 1,
  disabled: false,
  lockAspectRatio: false,
  contain: false,
  showSize: false,
  handleSize: 12,
  ariaLabel: undefined,
})

const emit = defineEmits<BingResizableEmits>()

const rootRef = ref<HTMLElement | null>(null)
const surfaceRef = ref<HTMLElement | null>(null)
const feedbackRef = ref<HTMLElement | null>(null)
const liveSize = ref<BingResizableResolvedSize>(toResolvedSize(props.defaultSize))
const draftSize = ref<BingResizableResolvedSize>(toResolvedSize(props.defaultSize))
const livePosition = ref<BingResizablePosition>(toResolvedPosition(props.defaultPosition))
const draftPosition = ref<BingResizablePosition>(toResolvedPosition(props.defaultPosition))
const hasLiveSize = ref(false)
const hasLivePosition = ref(false)
const isResizing = ref(false)
const activeDirection = ref<BingResizableDirection | null>(null)

interface ResizeSnapshot {
  direction: BingResizableDirection
  startClientX: number
  startClientY: number
  startSize: BingResizableResolvedSize
  startPosition: BingResizablePosition
  aspectRatio: number
  keyboardAxis?: 'width' | 'height'
  mode: NonNullable<BingResizableProps['mode']>
  snapMode: NonNullable<BingResizableProps['snapMode']>
  parentSize: BingResizableResolvedSize | null
}

let snapshot: ResizeSnapshot | undefined
let lastDelta: BingResizableDelta = { x: 0, y: 0 }
let previousDocumentCursor = ''
let previousBodyCursor = ''
let previousDocumentUserSelect = ''
let previousBodyUserSelect = ''
let isDocumentInteractionLocked = false

const rootClasses = computed(() => [
  'bing-resizable',
  `bing-resizable--${props.mode}`,
  {
    'is-disabled': props.disabled,
    'is-resizing': isResizing.value,
    'is-contain': props.contain,
    'is-ratio-locked': props.lockAspectRatio,
  },
])

const displaySizeSource = computed<BingResizableSize>(() => {
  if (isResizing.value) {
    return draftSize.value
  }

  if (props.size) {
    return props.size
  }

  return hasLiveSize.value ? liveSize.value : props.defaultSize
})

const displayPosition = computed<BingResizablePosition>(() => {
  if (isResizing.value) {
    return draftPosition.value
  }

  if (props.position) {
    return toResolvedPosition(props.position)
  }

  return hasLivePosition.value ? livePosition.value : toResolvedPosition(props.defaultPosition)
})

const visibleSize = computed<BingResizableResolvedSize>(() => toResolvedSize(displaySizeSource.value))

const rootStyle = computed<CSSProperties>(() => {
  const position = displayPosition.value

  return {
    width: normalizeSize(displaySizeSource.value.width),
    height: normalizeSize(displaySizeSource.value.height),
    minWidth: normalizeSize(props.minWidth),
    minHeight: normalizeSize(props.minHeight),
    maxWidth: normalizeSize(props.maxWidth),
    maxHeight: normalizeSize(props.maxHeight),
    left: `${position.x}px`,
    top: `${position.y}px`,
    '--bing-resizable-handle-size': `${Math.max(6, props.handleSize)}px`,
  }
})

const normalizedDirections = computed(() =>
  props.directions.filter((direction) => defaultDirections.includes(direction)),
)

const sizeText = computed(() => {
  const size = isResizing.value ? draftSize.value : visibleSize.value

  return `${Math.round(size.width)} × ${Math.round(size.height)}`
})

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function normalizeSize(value: number | string | undefined) {
  if (typeof value === 'number') {
    return `${value}px`
  }

  return value
}

function toPixels(value: number | string | undefined, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value)

    if (Number.isFinite(numeric)) {
      return numeric
    }
  }

  return fallback
}

function toResolvedSize(size: BingResizableSize | undefined): BingResizableResolvedSize {
  return {
    width: Math.max(0, toPixels(size?.width, 320)),
    height: Math.max(0, toPixels(size?.height, 220)),
  }
}

function toResolvedPosition(
  position: Partial<BingResizablePosition> | undefined,
): BingResizablePosition {
  return {
    x: toPixels(position?.x, 0),
    y: toPixels(position?.y, 0),
  }
}

function roundPixel(value: number) {
  return Math.round(value * 1000) / 1000
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function snap(value: number, step: number) {
  if (!Number.isFinite(step) || step <= 1) {
    return value
  }

  return Math.round(value / step) * step
}

function hasSameSize(first: BingResizableResolvedSize, second: BingResizableResolvedSize) {
  return Math.abs(first.width - second.width) < 0.001 && Math.abs(first.height - second.height) < 0.001
}

function hasSamePosition(first: BingResizablePosition, second: BingResizablePosition) {
  return Math.abs(first.x - second.x) < 0.001 && Math.abs(first.y - second.y) < 0.001
}

function getStep() {
  if (typeof props.step === 'number') {
    const step = Math.max(1, props.step)

    return {
      x: step,
      y: step,
    }
  }

  return {
    x: Math.max(1, props.step.x ?? 1),
    y: Math.max(1, props.step.y ?? 1),
  }
}

function getDirectionFlags(direction: BingResizableDirection) {
  return {
    top: direction.includes('top'),
    right: direction.includes('right'),
    bottom: direction.includes('bottom'),
    left: direction.includes('left'),
  }
}

function getCursor(direction: BingResizableDirection) {
  if (direction === 'top' || direction === 'bottom') {
    return 'ns-resize'
  }

  if (direction === 'left' || direction === 'right') {
    return 'ew-resize'
  }

  if (direction === 'top-left' || direction === 'bottom-right') {
    return 'nwse-resize'
  }

  return 'nesw-resize'
}

function isResizeCursor(cursor: string) {
  return ['ew-resize', 'ns-resize', 'nwse-resize', 'nesw-resize'].includes(cursor)
}

function getTransformOrigin(direction: BingResizableDirection) {
  const flags = getDirectionFlags(direction)
  const x = flags.left ? '100%' : flags.right ? '0%' : '50%'
  const y = flags.top ? '100%' : flags.bottom ? '0%' : '50%'

  return `${x} ${y}`
}

function getHandleLabel(direction: BingResizableDirection) {
  const labels: Record<BingResizableDirection, string> = {
    top: '上边',
    right: '右边',
    bottom: '下边',
    left: '左边',
    'top-left': '左上角',
    'top-right': '右上角',
    'bottom-left': '左下角',
    'bottom-right': '右下角',
  }
  return `调整${labels[direction]}尺寸`
}

function readCurrentSize(): BingResizableResolvedSize {
  const rect = rootRef.value?.getBoundingClientRect()

  return {
    width: rect?.width ? rect.width : toPixels(displaySizeSource.value.width, visibleSize.value.width),
    height: rect?.height
      ? rect.height
      : toPixels(displaySizeSource.value.height, visibleSize.value.height),
  }
}

function readParentSize() {
  if (!props.contain) {
    return null
  }

  const parent = rootRef.value?.parentElement
  const rect = parent?.getBoundingClientRect()

  if (!parent || !rect?.width || !rect?.height) {
    return null
  }

  const style = window.getComputedStyle(parent)
  const horizontalInset =
    toPixels(style.paddingLeft, 0) +
    toPixels(style.paddingRight, 0) +
    toPixels(style.borderLeftWidth, 0) +
    toPixels(style.borderRightWidth, 0)
  const verticalInset =
    toPixels(style.paddingTop, 0) +
    toPixels(style.paddingBottom, 0) +
    toPixels(style.borderTopWidth, 0) +
    toPixels(style.borderBottomWidth, 0)

  return {
    width: Math.max(0, rect.width - horizontalInset),
    height: Math.max(0, rect.height - verticalInset),
  }
}

function getSizeLimits() {
  return {
    minWidth: Math.max(0, toPixels(props.minWidth, 0)),
    minHeight: Math.max(0, toPixels(props.minHeight, 0)),
    maxWidth: Math.max(0, toPixels(props.maxWidth, Number.POSITIVE_INFINITY)),
    maxHeight: Math.max(0, toPixels(props.maxHeight, Number.POSITIVE_INFINITY)),
  }
}

function clampSize(width: number, height: number, currentSnapshot?: ResizeSnapshot) {
  const limits = getSizeLimits()

  if (props.lockAspectRatio && currentSnapshot && currentSnapshot.aspectRatio > 0) {
    const ratio = currentSnapshot.aspectRatio
    const primaryAxis = getPrimaryResizeAxis(
      currentSnapshot.direction,
      currentSnapshot,
    )
    const desiredWidth = primaryAxis === 'width' ? width : height * ratio
    const minWidth = Math.max(limits.minWidth, limits.minHeight * ratio)
    const maxWidth = Math.min(limits.maxWidth, limits.maxHeight * ratio)
    const constrainedWidth = clamp(desiredWidth, minWidth, maxWidth)

    return {
      width: constrainedWidth,
      height: constrainedWidth / ratio,
    }
  }

  return {
    width: clamp(width, limits.minWidth, limits.maxWidth),
    height: clamp(height, limits.minHeight, limits.maxHeight),
  }
}

function applyAspectRatio(
  width: number,
  height: number,
  direction: BingResizableDirection,
  currentSnapshot: ResizeSnapshot,
) {
  if (!props.lockAspectRatio || currentSnapshot.aspectRatio <= 0) {
    return {
      width,
      height,
    }
  }

  const flags = getDirectionFlags(direction)
  const ratio = currentSnapshot.aspectRatio

  if (
    currentSnapshot.keyboardAxis === 'width'
    || ((flags.left || flags.right) && !(flags.top || flags.bottom))
  ) {
    return {
      width,
      height: width / ratio,
    }
  }

  if (
    currentSnapshot.keyboardAxis === 'height'
    || ((flags.top || flags.bottom) && !(flags.left || flags.right))
  ) {
    return {
      width: height * ratio,
      height,
    }
  }

  // 将角点位移投影到固定比例的对角线上；切换拖动方向时也保持连续。
  const widthDelta = width - currentSnapshot.startSize.width
  const heightDelta = height - currentSnapshot.startSize.height
  const projectedHeightDelta = (widthDelta * ratio + heightDelta) / (ratio * ratio + 1)

  return {
    width: currentSnapshot.startSize.width + projectedHeightDelta * ratio,
    height: currentSnapshot.startSize.height + projectedHeightDelta,
  }
}

function getPrimaryResizeAxis(
  direction: BingResizableDirection,
  currentSnapshot: ResizeSnapshot,
) {
  const flags = getDirectionFlags(direction)

  if ((flags.left || flags.right) && !(flags.top || flags.bottom)) {
    return 'width'
  }

  if ((flags.top || flags.bottom) && !(flags.left || flags.right)) {
    return 'height'
  }

  // 比例锁定后的角手柄始终沿起始尺寸的长边吸附，避免过零或舍入时换轴。
  return currentSnapshot.aspectRatio >= 1 ? 'width' : 'height'
}

function applyStep(
  width: number,
  height: number,
  direction: BingResizableDirection,
  currentSnapshot: ResizeSnapshot,
) {
  const step = getStep()

  if (props.lockAspectRatio && currentSnapshot.aspectRatio > 0) {
    const primaryAxis = getPrimaryResizeAxis(direction, currentSnapshot)

    if (primaryAxis === 'width') {
      const steppedWidth = snap(width, step.x)

      return {
        width: steppedWidth,
        height: steppedWidth / currentSnapshot.aspectRatio,
      }
    }

    const steppedHeight = snap(height, step.y)

    return {
      width: steppedHeight * currentSnapshot.aspectRatio,
      height: steppedHeight,
    }
  }

  return {
    width: snap(width, step.x),
    height: snap(height, step.y),
  }
}

function resolvePositionFromSize(
  size: BingResizableResolvedSize,
  currentSnapshot: ResizeSnapshot,
) {
  const flags = getDirectionFlags(currentSnapshot.direction)

  if (currentSnapshot.mode === 'mirror') {
    const changesWidth = Math.abs(size.width - currentSnapshot.startSize.width) > 0.001
    const changesHeight = Math.abs(size.height - currentSnapshot.startSize.height) > 0.001

    return {
      x: changesWidth
        ? currentSnapshot.startPosition.x + (currentSnapshot.startSize.width - size.width) / 2
        : currentSnapshot.startPosition.x,
      y: changesHeight
        ? currentSnapshot.startPosition.y + (currentSnapshot.startSize.height - size.height) / 2
        : currentSnapshot.startPosition.y,
    }
  }

  return {
    x: flags.left
      ? currentSnapshot.startPosition.x + currentSnapshot.startSize.width - size.width
      : currentSnapshot.startPosition.x,
    y: flags.top
      ? currentSnapshot.startPosition.y + currentSnapshot.startSize.height - size.height
      : currentSnapshot.startPosition.y,
  }
}

function applyContainment(
  size: BingResizableResolvedSize,
  position: BingResizablePosition,
  currentSnapshot: ResizeSnapshot,
) {
  if (!currentSnapshot.parentSize) {
    return {
      size,
      position,
    }
  }

  let width = size.width
  let height = size.height
  let x = position.x
  let y = position.y

  if (x < 0) {
    width += x
    x = 0
  }

  if (y < 0) {
    height += y
    y = 0
  }

  if (x + width > currentSnapshot.parentSize.width) {
    width = currentSnapshot.parentSize.width - x
  }

  if (y + height > currentSnapshot.parentSize.height) {
    height = currentSnapshot.parentSize.height - y
  }

  const containedSize = clampSize(width, height)

  return {
    size: containedSize,
    position: {
      x,
      y,
    },
  }
}

function getResizeResult(
  currentSnapshot: ResizeSnapshot,
  deltaX: number,
  deltaY: number,
  snapToStep = currentSnapshot.snapMode === 'live',
) {
  const flags = getDirectionFlags(currentSnapshot.direction)
  const resizeScale = currentSnapshot.mode === 'mirror' ? 2 : 1
  let width =
    currentSnapshot.startSize.width +
    ((flags.right ? deltaX : 0) - (flags.left ? deltaX : 0)) * resizeScale
  let height =
    currentSnapshot.startSize.height +
    ((flags.bottom ? deltaY : 0) - (flags.top ? deltaY : 0)) * resizeScale

  const ratioSize = applyAspectRatio(width, height, currentSnapshot.direction, currentSnapshot)
  width = ratioSize.width
  height = ratioSize.height

  if (snapToStep) {
    const stepSize = applyStep(width, height, currentSnapshot.direction, currentSnapshot)
    width = stepSize.width
    height = stepSize.height
  }

  let size = clampSize(width, height, currentSnapshot)
  let position = resolvePositionFromSize(size, currentSnapshot)
  const contained = applyContainment(size, position, currentSnapshot)

  size = contained.size
  position = contained.position

  return {
    size: {
      width: roundPixel(size.width),
      height: roundPixel(size.height),
    },
    position: {
      x: roundPixel(position.x),
      y: roundPixel(position.y),
    },
  }
}

function createSnapshot(
  direction: BingResizableDirection,
  startClientX: number,
  startClientY: number,
): ResizeSnapshot {
  const startSize = readCurrentSize()

  return {
    direction,
    startClientX,
    startClientY,
    startSize,
    startPosition: displayPosition.value,
    aspectRatio: startSize.height > 0 ? startSize.width / startSize.height : 1,
    mode: props.mode,
    snapMode: props.snapMode,
    parentSize: readParentSize(),
  }
}

function createPayload(
  direction: BingResizableDirection,
  delta: BingResizableDelta,
  event: PointerEvent | KeyboardEvent,
): BingResizablePayload {
  return {
    direction,
    size: draftSize.value,
    position: draftPosition.value,
    delta,
    event,
  }
}

function commitDraft() {
  if (!props.size) {
    liveSize.value = draftSize.value
    hasLiveSize.value = true
  }

  if (!props.position) {
    livePosition.value = draftPosition.value
    hasLivePosition.value = true
  }

  emit('update:size', draftSize.value)
  emit('update:position', draftPosition.value)
}

function lockDocumentInteraction(direction: BingResizableDirection) {
  if (!isBrowser() || isDocumentInteractionLocked) {
    return
  }

  const cursor = getCursor(direction)
  previousDocumentCursor = isResizeCursor(document.documentElement.style.cursor)
    ? ''
    : document.documentElement.style.cursor
  previousBodyCursor = isResizeCursor(document.body?.style.cursor ?? '')
    ? ''
    : (document.body?.style.cursor ?? '')
  previousDocumentUserSelect = document.documentElement.style.userSelect
  previousBodyUserSelect = document.body?.style.userSelect ?? ''
  document.documentElement.style.cursor = cursor
  document.body.style.cursor = cursor
  document.documentElement.style.userSelect = 'none'
  document.body.style.userSelect = 'none'
  isDocumentInteractionLocked = true
}

function unlockDocumentInteraction() {
  if (!isBrowser() || !isDocumentInteractionLocked) {
    return
  }

  document.documentElement.style.cursor = previousDocumentCursor
  document.body.style.cursor = previousBodyCursor
  document.documentElement.style.userSelect = previousDocumentUserSelect
  document.body.style.userSelect = previousBodyUserSelect
  previousDocumentCursor = ''
  previousBodyCursor = ''
  previousDocumentUserSelect = ''
  previousBodyUserSelect = ''
  isDocumentInteractionLocked = false
}

function addDragListeners() {
  if (!isBrowser()) {
    return
  }

  window.addEventListener('pointermove', handlePointerMove)
  window.addEventListener('pointerup', handlePointerEnd)
  window.addEventListener('pointercancel', handlePointerEnd)
  window.addEventListener('pointerout', handleWindowPointerOut)
  window.addEventListener('blur', handleResizeAbort)
  window.addEventListener('keydown', handleGlobalKeydown)
  document.addEventListener('visibilitychange', handleVisibilityChange)

  try {
    if (window.parent && window.parent !== window) {
      window.parent.addEventListener('pointerup', handlePointerEnd)
      window.parent.addEventListener('pointercancel', handlePointerEnd)
      window.parent.addEventListener('blur', handleResizeAbort)
    }
  } catch {
    // Parent window access can be blocked outside same-origin preview frames.
  }
}

function removeDragListeners() {
  if (!isBrowser()) {
    return
  }

  window.removeEventListener('pointermove', handlePointerMove)
  window.removeEventListener('pointerup', handlePointerEnd)
  window.removeEventListener('pointercancel', handlePointerEnd)
  window.removeEventListener('pointerout', handleWindowPointerOut)
  window.removeEventListener('blur', handleResizeAbort)
  window.removeEventListener('keydown', handleGlobalKeydown)
  document.removeEventListener('visibilitychange', handleVisibilityChange)

  try {
    if (window.parent && window.parent !== window) {
      window.parent.removeEventListener('pointerup', handlePointerEnd)
      window.parent.removeEventListener('pointercancel', handlePointerEnd)
      window.parent.removeEventListener('blur', handleResizeAbort)
    }
  } catch {
    // Parent window access can be blocked outside same-origin preview frames.
  }
}

function playResizeStartFeedback(direction: BingResizableDirection) {
  if (prefersReducedMotion()) {
    return
  }

  if (surfaceRef.value) {
    gsap.to(surfaceRef.value, {
      scale: 1.006,
      transformOrigin: getTransformOrigin(direction),
      duration: 0.16,
      ease: 'power2.out',
      overwrite: true,
      force3D: true,
    })
  }

  if (feedbackRef.value) {
    gsap.fromTo(
      feedbackRef.value,
      { autoAlpha: 0, scale: 0.985 },
      {
        autoAlpha: 1,
        scale: 1,
        transformOrigin: getTransformOrigin(direction),
        duration: 0.18,
        ease: 'power2.out',
        overwrite: true,
        force3D: true,
      },
    )
  }
}

function playResizeEndFeedback(direction: BingResizableDirection) {
  if (prefersReducedMotion()) {
    return
  }

  if (surfaceRef.value) {
    gsap.to(surfaceRef.value, {
      scale: 1,
      transformOrigin: getTransformOrigin(direction),
      duration: 0.42,
      ease: 'elastic.out(1, 0.78)',
      overwrite: true,
      force3D: true,
    })
  }

  if (feedbackRef.value) {
    gsap.to(feedbackRef.value, {
      autoAlpha: 0,
      scale: 1.018,
      transformOrigin: getTransformOrigin(direction),
      duration: 0.28,
      ease: 'power3.out',
      overwrite: true,
      force3D: true,
    })
  }
}

function beginResize(direction: BingResizableDirection, event: PointerEvent) {
  if (props.disabled || event.button !== 0) {
    return
  }

  event.preventDefault()
  snapshot = createSnapshot(direction, event.clientX, event.clientY)
  lastDelta = { x: 0, y: 0 }
  draftSize.value = snapshot.startSize
  draftPosition.value = snapshot.startPosition
  activeDirection.value = direction
  isResizing.value = true
  lockDocumentInteraction(direction)
  addDragListeners()
  playResizeStartFeedback(direction)

  try {
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  } catch {
    // Window-level listeners keep drag updates reliable when pointer capture is unavailable.
  }

  emit('resize-start', createPayload(direction, lastDelta, event))
}

function handlePointerMove(event: PointerEvent) {
  if (!snapshot) {
    return
  }

  event.preventDefault()
  lastDelta = {
    x: event.clientX - snapshot.startClientX,
    y: event.clientY - snapshot.startClientY,
  }

  const next = getResizeResult(snapshot, lastDelta.x, lastDelta.y)

  if (hasSameSize(next.size, draftSize.value) && hasSamePosition(next.position, draftPosition.value)) {
    return
  }

  draftSize.value = next.size
  draftPosition.value = next.position
  commitDraft()
  emit('resize', createPayload(snapshot.direction, lastDelta, event))
}

function finishResize(event?: PointerEvent | KeyboardEvent, emitEnd = true) {
  const currentSnapshot = snapshot

  removeDragListeners()
  unlockDocumentInteraction()

  if (!currentSnapshot) {
    return
  }

  const direction = currentSnapshot.direction

  if (currentSnapshot.snapMode === 'end') {
    const next = getResizeResult(currentSnapshot, lastDelta.x, lastDelta.y, true)
    draftSize.value = next.size
    draftPosition.value = next.position
  }

  commitDraft()

  if (event && emitEnd) {
    emit('resize-end', createPayload(direction, lastDelta, event))
  }

  playResizeEndFeedback(direction)
  snapshot = undefined
  activeDirection.value = null
  isResizing.value = false
}

function handlePointerEnd(event: PointerEvent) {
  finishResize(event)
}

function handleResizeAbort() {
  finishResize(undefined, false)
}

function handleWindowPointerOut(event: PointerEvent) {
  if (event.relatedTarget) {
    return
  }

  const isOutsideWindow =
    event.clientX <= 0 ||
    event.clientY <= 0 ||
    event.clientX >= window.innerWidth ||
    event.clientY >= window.innerHeight

  if (isOutsideWindow) {
    handleResizeAbort()
  }
}

function handleVisibilityChange() {
  if (document.visibilityState === 'hidden') {
    handleResizeAbort()
  }
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    finishResize(event)
  }
}

function getKeyboardDelta(direction: BingResizableDirection, event: KeyboardEvent) {
  const flags = getDirectionFlags(direction)
  const step = getStep()
  const multiplier = event.shiftKey ? 4 : 1
  const xAmount = step.x * multiplier
  const yAmount = step.y * multiplier

  if (event.key === 'ArrowLeft' && (flags.left || flags.right)) {
    return { x: -xAmount, y: 0 }
  }

  if (event.key === 'ArrowRight' && (flags.left || flags.right)) {
    return { x: xAmount, y: 0 }
  }

  if (event.key === 'ArrowUp' && (flags.top || flags.bottom)) {
    return { x: 0, y: -yAmount }
  }

  if (event.key === 'ArrowDown' && (flags.top || flags.bottom)) {
    return { x: 0, y: yAmount }
  }

  return null
}

function handleHandleKeydown(direction: BingResizableDirection, event: KeyboardEvent) {
  if (props.disabled) {
    return
  }

  const delta = getKeyboardDelta(direction, event)

  if (!delta) {
    return
  }

  event.preventDefault()
  const keyboardSnapshot = createSnapshot(direction, 0, 0)
  // 方向键仍按对应轴完整移动一个步长，不使用指针角点的投影。
  keyboardSnapshot.keyboardAxis = delta.x !== 0 ? 'width' : 'height'
  const next = getResizeResult(keyboardSnapshot, delta.x, delta.y, true)

  draftSize.value = next.size
  draftPosition.value = next.position
  activeDirection.value = direction
  isResizing.value = true
  emit('resize-start', createPayload(direction, { x: 0, y: 0 }, event))
  commitDraft()
  emit('resize', createPayload(direction, delta, event))
  emit('resize-end', createPayload(direction, delta, event))
  playResizeStartFeedback(direction)
  playResizeEndFeedback(direction)
  activeDirection.value = null
  isResizing.value = false
}

function reset() {
  draftSize.value = toResolvedSize(props.defaultSize)
  draftPosition.value = toResolvedPosition(props.defaultPosition)
  liveSize.value = draftSize.value
  livePosition.value = draftPosition.value
  hasLiveSize.value = true
  hasLivePosition.value = true
  emit('update:size', draftSize.value)
  emit('update:position', draftPosition.value)
}

function getSize() {
  return isResizing.value ? draftSize.value : toResolvedSize(displaySizeSource.value)
}

function getPosition() {
  return displayPosition.value
}

onBeforeUnmount(() => {
  removeDragListeners()
  unlockDocumentInteraction()
  gsap.killTweensOf([surfaceRef.value, feedbackRef.value].filter(Boolean))
})

defineExpose<BingResizableExpose>({
  reset,
  getSize,
  getPosition,
})
</script>

<template>
  <div
    ref="rootRef"
    :class="rootClasses"
    :style="rootStyle"
    role="group"
    :aria-label="ariaLabel"
  >
    <div ref="surfaceRef" class="bing-resizable__surface">
      <div class="bing-resizable__content">
        <slot />
      </div>

      <span ref="feedbackRef" class="bing-resizable__feedback" aria-hidden="true"></span>

      <output v-if="showSize" class="bing-resizable__size" aria-hidden="true">
        {{ sizeText }}
      </output>

      <button
        v-for="direction in normalizedDirections"
        :key="direction"
        type="button"
        class="bing-resizable__handle"
        :class="[
          `bing-resizable__handle--${direction}`,
          { 'is-active': activeDirection === direction },
        ]"
        :aria-label="getHandleLabel(direction)"
        :disabled="disabled"
        @pointerdown="beginResize(direction, $event)"
        @keydown="handleHandleKeydown(direction, $event)"
      >
        <slot name="handle" :direction="direction" :active="activeDirection === direction">
          <span class="bing-resizable__handle-mark" aria-hidden="true">
            <span class="bing-resizable__handle-line"></span>
            <BingIcon
              class="bing-resizable__handle-icon"
              :icon="handleIcons[direction]"
              :size="direction.includes('-') ? 13 : 14"
              :stroke-width="1.75"
            />
          </span>
        </slot>
      </button>
    </div>
  </div>
</template>

<style scoped>
.bing-resizable {
  --bing-resizable-handle-size: 12px;
  --bing-resizable-radius: 8px;
  --bing-resizable-border: var(--bing-border);
  --bing-resizable-border-active: rgb(var(--bing-accent-rgb) / 0.42);
  --bing-resizable-handle-color: var(--bing-muted);
  --bing-resizable-handle-stroke: 2px;
  --bing-resizable-corner-dot-size: 5px;
  --bing-resizable-handle-hover-bg: var(--bing-control-hover-bg);
  --bing-resizable-handle-hover-border: var(--bing-border-strong);
  --bing-resizable-shadow: var(--bing-shadow-sm);

  position: relative;
  display: inline-block;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  font-size: 14px;
  line-height: 20px;
  font-weight: 400;
  color: var(--bing-text);
  transform-origin: 0 0;
}

.bing-resizable__surface {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: inherit;
  min-height: inherit;
  overflow: visible;
  border: 1px solid var(--bing-resizable-border);
  border-radius: var(--bing-resizable-radius);
  background: var(--bing-surface-solid);
  box-shadow: var(--bing-resizable-shadow);
  transform-origin: 50% 50%;
  transition:
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth),
    filter var(--bing-duration-fast) var(--bing-ease-smooth);
  will-change: transform;
}

.bing-resizable__content {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: inherit;
}

.bing-resizable__feedback {
  position: absolute;
  inset: -1px;
  z-index: 2;
  border: 1px solid rgb(var(--bing-accent-rgb) / 0.4);
  border-radius: inherit;
  background: transparent;
  box-shadow: 0 0 0 1px var(--bing-border-strong);
  opacity: 0;
  pointer-events: none;
  will-change: opacity, transform;
}

.bing-resizable__size {
  position: absolute;
  right: 10px;
  bottom: 10px;
  z-index: 4;
  padding: 4px 7px;
  border: 1px solid rgb(var(--bing-heading-rgb) / 0.08);
  border-radius: 4px;
  background: rgb(var(--bing-surface-rgb) / 0.78);
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  opacity: 0;
  pointer-events: none;
  transform: translateY(4px);
  transition:
    opacity var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-resizable:hover .bing-resizable__surface,
.bing-resizable.is-resizing .bing-resizable__surface {
  border-color: var(--bing-resizable-border-active);
  box-shadow: var(--bing-shadow-sm);
}

.bing-resizable.is-resizing .bing-resizable__size {
  opacity: 1;
  transform: translateY(0);
}

.bing-resizable__handle {
  position: absolute;
  z-index: 5;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--bing-accent-strong);
  opacity: 1;
  outline: none;
  touch-action: none;
  transition:
    opacity var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-resizable__handle:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 2px;
}

.bing-resizable__handle:disabled {
  cursor: not-allowed;
  opacity: 0.24;
}

.bing-resizable__handle-mark {
  position: relative;
  overflow: visible;
  display: grid;
  place-items: center;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: var(--bing-accent-strong);
  transform-origin: 50% 50%;
  transition:
    background-color var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    box-shadow var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth),
    opacity var(--bing-duration-fast) var(--bing-ease-smooth);
  will-change: transform;
}

.bing-resizable__handle-line {
  position: absolute;
  inset: 0;
  pointer-events: none;
  transition:
    opacity var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-resizable__handle-line::before,
.bing-resizable__handle-line::after {
  position: absolute;
  content: '';
  border-radius: 999px;
  background: var(--bing-resizable-handle-color);
  box-shadow: none;
}

.bing-resizable__handle-line::after {
  display: none;
}

.bing-resizable__handle-icon {
  position: relative;
  z-index: 1;
  opacity: 0;
  filter: drop-shadow(0 1px 1px rgb(var(--bing-shadow-rgb) / 0.1));
  transform: scale(0.72);
  transition:
    opacity var(--bing-duration-fast) var(--bing-ease-smooth),
    transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-resizable__handle:hover:not(:disabled) .bing-resizable__handle-mark,
.bing-resizable__handle.is-active .bing-resizable__handle-mark,
.bing-resizable__handle:focus-visible .bing-resizable__handle-mark {
  border-color: var(--bing-resizable-handle-hover-border);
  background: var(--bing-resizable-handle-hover-bg);
  box-shadow: var(--bing-shadow-sm);
  transform: scale(1);
}

.bing-resizable__handle:hover:not(:disabled) .bing-resizable__handle-line,
.bing-resizable__handle.is-active .bing-resizable__handle-line,
.bing-resizable__handle:focus-visible .bing-resizable__handle-line {
  opacity: 0;
  transform: scale(0.72);
}

.bing-resizable__handle:hover:not(:disabled) .bing-resizable__handle-icon,
.bing-resizable__handle.is-active .bing-resizable__handle-icon,
.bing-resizable__handle:focus-visible .bing-resizable__handle-icon {
  opacity: 1;
  transform: scale(1);
}

.bing-resizable__handle:hover:not(:disabled) .bing-resizable__handle-mark,
.bing-resizable__handle.is-active .bing-resizable__handle-mark,
.bing-resizable__handle:focus-visible .bing-resizable__handle-mark {
  transform: scale(1.08);
}

.bing-resizable__handle--left,
.bing-resizable__handle--right {
  top: 50%;
  width: calc(var(--bing-resizable-handle-size) + 16px);
  height: calc(var(--bing-resizable-handle-size) + 30px);
  margin-top: calc((var(--bing-resizable-handle-size) + 30px) / -2);
  cursor: ew-resize;
}

.bing-resizable__handle--left {
  left: calc((var(--bing-resizable-handle-size) + 16px) / -2);
}

.bing-resizable__handle--right {
  right: calc((var(--bing-resizable-handle-size) + 16px) / -2);
}

.bing-resizable__handle--top,
.bing-resizable__handle--bottom {
  left: 50%;
  width: calc(var(--bing-resizable-handle-size) + 30px);
  height: calc(var(--bing-resizable-handle-size) + 16px);
  margin-left: calc((var(--bing-resizable-handle-size) + 30px) / -2);
  cursor: ns-resize;
}

.bing-resizable__handle--top {
  top: calc((var(--bing-resizable-handle-size) + 16px) / -2);
}

.bing-resizable__handle--bottom {
  bottom: calc((var(--bing-resizable-handle-size) + 16px) / -2);
}

.bing-resizable__handle--top-left,
.bing-resizable__handle--top-right,
.bing-resizable__handle--bottom-left,
.bing-resizable__handle--bottom-right {
  width: calc(var(--bing-resizable-handle-size) + 12px);
  height: calc(var(--bing-resizable-handle-size) + 12px);
}

.bing-resizable__handle--top-left {
  top: calc((var(--bing-resizable-handle-size) + 12px) / -2);
  left: calc((var(--bing-resizable-handle-size) + 12px) / -2);
  cursor: nwse-resize;
}

.bing-resizable__handle--top-right {
  top: calc((var(--bing-resizable-handle-size) + 12px) / -2);
  right: calc((var(--bing-resizable-handle-size) + 12px) / -2);
  cursor: nesw-resize;
}

.bing-resizable__handle--bottom-left {
  bottom: calc((var(--bing-resizable-handle-size) + 12px) / -2);
  left: calc((var(--bing-resizable-handle-size) + 12px) / -2);
  cursor: nesw-resize;
}

.bing-resizable__handle--bottom-right {
  right: calc((var(--bing-resizable-handle-size) + 12px) / -2);
  bottom: calc((var(--bing-resizable-handle-size) + 12px) / -2);
  cursor: nwse-resize;
}

.bing-resizable__handle--left .bing-resizable__handle-mark,
.bing-resizable__handle--right .bing-resizable__handle-mark {
  width: calc(var(--bing-resizable-handle-size) + 10px);
  height: calc(var(--bing-resizable-handle-size) + 16px);
}

.bing-resizable__handle--left .bing-resizable__handle-line::before,
.bing-resizable__handle--right .bing-resizable__handle-line::before {
  top: 50%;
  left: 50%;
  width: var(--bing-resizable-handle-stroke);
  height: calc(var(--bing-resizable-handle-size) + 12px);
  transform: translate(-50%, -50%);
}

.bing-resizable__handle--top .bing-resizable__handle-mark,
.bing-resizable__handle--bottom .bing-resizable__handle-mark {
  width: calc(var(--bing-resizable-handle-size) + 16px);
  height: calc(var(--bing-resizable-handle-size) + 10px);
}

.bing-resizable__handle--top .bing-resizable__handle-line::before,
.bing-resizable__handle--bottom .bing-resizable__handle-line::before {
  top: 50%;
  left: 50%;
  width: calc(var(--bing-resizable-handle-size) + 12px);
  height: var(--bing-resizable-handle-stroke);
  transform: translate(-50%, -50%);
}

.bing-resizable__handle--top-left .bing-resizable__handle-mark,
.bing-resizable__handle--top-right .bing-resizable__handle-mark,
.bing-resizable__handle--bottom-left .bing-resizable__handle-mark,
.bing-resizable__handle--bottom-right .bing-resizable__handle-mark {
  width: calc(var(--bing-resizable-handle-size) + 12px);
  height: calc(var(--bing-resizable-handle-size) + 12px);
  border-radius: 8px;
}

.bing-resizable__handle--top-left .bing-resizable__handle-line::before,
.bing-resizable__handle--top-right .bing-resizable__handle-line::before,
.bing-resizable__handle--bottom-left .bing-resizable__handle-line::before,
.bing-resizable__handle--bottom-right .bing-resizable__handle-line::before {
  display: block;
  box-sizing: border-box;
  top: 50%;
  left: 50%;
  width: var(--bing-resizable-corner-dot-size);
  height: var(--bing-resizable-corner-dot-size);
  border: 0;
  border-radius: 999px;
  transform: translate(-50%, -50%);
}

.bing-resizable.is-resizing,
.bing-resizable.is-resizing * {
  user-select: none;
}

.bing-resizable.is-disabled {
  color: var(--bing-disabled-text);
}

.bing-resizable.is-disabled .bing-resizable__surface {
  border-color: var(--bing-control-disabled-border);
}

@media (prefers-reduced-motion: reduce) {
  .bing-resizable__surface,
  .bing-resizable__feedback,
  .bing-resizable__handle,
  .bing-resizable__handle-mark,
  .bing-resizable__size {
    transition: none;
  }
}
</style>
