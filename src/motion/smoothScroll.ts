import { prefersReducedMotion as systemPrefersReducedMotion } from './reducedMotion'

export interface SmoothScrollOptions {
  duration?: number
  stepSize?: number
  pulseScale?: number
  accelerationDelta?: number
  accelerationMax?: number
  keyboardStep?: number
  keyboard?: boolean
  smoothTouchpad?: boolean
  respectReducedMotion?: boolean
}

export type SmoothScrollValue = boolean | SmoothScrollOptions

export interface ResolvedSmoothScrollOptions {
  duration: number
  stepSize: number
  pulseScale: number
  accelerationDelta: number
  accelerationMax: number
  keyboardStep: number
  keyboard: boolean
  smoothTouchpad: boolean
  respectReducedMotion: boolean
}

export interface SmoothScrollAxes {
  horizontal: boolean
  vertical: boolean
}

export interface SmoothScrollControllerOptions {
  getElement: () => HTMLElement | null
  getOptions?: () => SmoothScrollOptions | undefined
  getAxes?: () => SmoothScrollAxes
  isEnabled?: () => boolean
  /** 是否减少动效；默认只读取系统设置。 */
  prefersReducedMotion?: () => boolean
}

export interface SmoothScrollController {
  cancel: () => void
  handleKeydown: (event: KeyboardEvent) => boolean
  handleWheel: (event: WheelEvent) => boolean
  isAnimating: () => boolean
}

interface ScrollImpulse {
  x: number
  y: number
  lastX: number
  lastY: number
  start: number
  duration: number
  pulseScale: number
}

interface LegacyWheelEvent extends WheelEvent {
  wheelDelta?: number
  wheelDeltaX?: number
  wheelDeltaY?: number
}

const scrollableOverflow = /^(auto|scroll|overlay)$/
const editableSelector = [
  'button',
  'input',
  'select',
  'textarea',
  'video',
  'audio',
  '[contenteditable="true"]',
  '[role="textbox"]',
].join(',')

export const defaultSmoothScrollOptions: Readonly<ResolvedSmoothScrollOptions> = Object.freeze({
  duration: 400,
  stepSize: 100,
  pulseScale: 4,
  accelerationDelta: 50,
  accelerationMax: 3,
  keyboardStep: 50,
  keyboard: true,
  smoothTouchpad: false,
  respectReducedMotion: true,
})

export const compactSmoothScrollOptions: Readonly<SmoothScrollOptions> = Object.freeze({
  duration: 280,
  stepSize: 72,
  pulseScale: 4,
  accelerationDelta: 50,
  accelerationMax: 2,
  keyboard: false,
  smoothTouchpad: false,
  respectReducedMotion: true,
})

export function resolveComponentSmoothScroll(
  value: SmoothScrollValue | undefined,
  preset: SmoothScrollOptions = {},
  enforced: SmoothScrollOptions = {},
): false | SmoothScrollOptions {
  if (value === false) {
    return false
  }

  return {
    ...preset,
    ...(typeof value === 'object' ? value : {}),
    ...enforced,
  }
}

function finiteNumber(value: number | undefined, fallback: number, minimum: number) {
  return Number.isFinite(value) ? Math.max(minimum, value as number) : fallback
}

export function resolveSmoothScrollOptions(
  options: SmoothScrollOptions | undefined,
): ResolvedSmoothScrollOptions {
  return {
    duration: finiteNumber(options?.duration, defaultSmoothScrollOptions.duration, 0),
    stepSize: finiteNumber(options?.stepSize, defaultSmoothScrollOptions.stepSize, 0),
    pulseScale: finiteNumber(options?.pulseScale, defaultSmoothScrollOptions.pulseScale, 0.1),
    accelerationDelta: finiteNumber(
      options?.accelerationDelta,
      defaultSmoothScrollOptions.accelerationDelta,
      0,
    ),
    accelerationMax: finiteNumber(
      options?.accelerationMax,
      defaultSmoothScrollOptions.accelerationMax,
      1,
    ),
    keyboardStep: finiteNumber(
      options?.keyboardStep,
      defaultSmoothScrollOptions.keyboardStep,
      0,
    ),
    keyboard: options?.keyboard ?? defaultSmoothScrollOptions.keyboard,
    smoothTouchpad: options?.smoothTouchpad ?? defaultSmoothScrollOptions.smoothTouchpad,
    respectReducedMotion:
      options?.respectReducedMotion ?? defaultSmoothScrollOptions.respectReducedMotion,
  }
}

function rawPulse(progress: number, scale: number) {
  const scaledProgress = progress * scale

  if (scaledProgress < 1) {
    return scaledProgress - (1 - Math.exp(-scaledProgress))
  }

  const accelerationEnd = Math.exp(-1)
  const tail = 1 - Math.exp(-(scaledProgress - 1))

  return accelerationEnd + tail * (1 - accelerationEnd)
}

export function pulseEase(progress: number, scale = defaultSmoothScrollOptions.pulseScale) {
  if (progress <= 0) {
    return 0
  }

  if (progress >= 1) {
    return 1
  }

  const safeScale = Math.max(0.1, scale)
  return rawPulse(progress, safeScale) / rawPulse(1, safeScale)
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function now() {
  return typeof performance !== 'undefined' && typeof performance.now === 'function'
    ? performance.now()
    : Date.now()
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value))
}

function sign(value: number) {
  return value === 0 ? 0 : value > 0 ? 1 : -1
}

function canScroll(element: HTMLElement, axis: 'x' | 'y', delta: number) {
  if (delta === 0) {
    return false
  }

  if (axis === 'x') {
    const maximum = Math.max(0, element.scrollWidth - element.clientWidth)
    return maximum > 0 && (delta < 0 ? element.scrollLeft > 0 : element.scrollLeft < maximum - 0.5)
  }

  const maximum = Math.max(0, element.scrollHeight - element.clientHeight)
  return maximum > 0 && (delta < 0 ? element.scrollTop > 0 : element.scrollTop < maximum - 0.5)
}

function getEventElement(event: Event) {
  const target = event.composedPath?.()[0] ?? event.target
  return target instanceof Element ? target : null
}

function getParentElement(element: Element) {
  if (element.parentElement) {
    return element.parentElement
  }

  const root = element.getRootNode?.()
  return root && 'host' in root && root.host instanceof Element ? root.host : null
}

function nestedScrollerCanConsume(
  event: Event,
  viewport: HTMLElement,
  deltaX: number,
  deltaY: number,
) {
  let element = getEventElement(event)

  while (element && element !== viewport) {
    if (element instanceof HTMLElement) {
      const canConsumeX = deltaX !== 0 && canScroll(element, 'x', deltaX)
      const canConsumeY = deltaY !== 0 && canScroll(element, 'y', deltaY)

      if (!canConsumeX && !canConsumeY) {
        element = getParentElement(element)
        continue
      }

      const style = window.getComputedStyle(element)
      const overflowX = style.overflowX || element.style.overflowX || element.style.overflow
      const overflowY = style.overflowY || element.style.overflowY || element.style.overflow
      const consumesX = canConsumeX && scrollableOverflow.test(overflowX)
      const consumesY = canConsumeY && scrollableOverflow.test(overflowY)

      if (consumesX || consumesY) {
        return true
      }
    }

    element = getParentElement(element)
  }

  return false
}

function normalizeWheelDelta(event: WheelEvent, element: HTMLElement, axes: SmoothScrollAxes) {
  const legacyEvent = event as LegacyWheelEvent
  let x = event.deltaX || -Number(legacyEvent.wheelDeltaX || 0)
  let y = event.deltaY || -Number(legacyEvent.wheelDeltaY || 0)

  if (!x && !y) {
    y = -Number(legacyEvent.wheelDelta || 0)
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    x *= 40
    y *= 40
  } else if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    x *= Math.max(1, element.clientWidth)
    y *= Math.max(1, element.clientHeight)
  }

  if (event.shiftKey && axes.horizontal && Math.abs(y) > Math.abs(x)) {
    x = y
    y = 0
  }

  if (!axes.horizontal) {
    x = 0
  }

  if (!axes.vertical) {
    y = 0
  }

  return { x, y }
}

function scaleWheelDelta(delta: number, stepSize: number) {
  return Math.abs(delta) > 1.2 ? delta * (stepSize / 120) : delta
}

function isEditableTarget(event: Event) {
  const target = getEventElement(event)
  return target instanceof HTMLElement && Boolean(target.closest(editableSelector))
}

export function createSmoothScrollController(
  controllerOptions: SmoothScrollControllerOptions,
): SmoothScrollController {
  const prefersReducedMotion = controllerOptions.prefersReducedMotion ?? (() => systemPrefersReducedMotion())
  let queue: ScrollImpulse[] = []
  let frame: number | undefined
  let lastInputTime = 0
  let directionX = 0
  let directionY = 0
  let deltaBuffer: number[] = []
  let remainderX = 0
  let remainderY = 0

  function getOptions() {
    return resolveSmoothScrollOptions(controllerOptions.getOptions?.())
  }

  function getAxes(): SmoothScrollAxes {
    return controllerOptions.getAxes?.() ?? { horizontal: true, vertical: true }
  }

  function enabled() {
    return controllerOptions.isEnabled?.() ?? true
  }

  function cancelFrame() {
    if (!isBrowser() || frame === undefined) {
      return
    }

    window.cancelAnimationFrame(frame)
    frame = undefined
  }

  function cancel() {
    cancelFrame()
    queue = []
    lastInputTime = 0
    directionX = 0
    directionY = 0
    remainderX = 0
    remainderY = 0
  }

  function applyDelta(element: HTMLElement, x: number, y: number) {
    if (x !== 0 || remainderX !== 0) {
      const maximumX = Math.max(0, element.scrollWidth - element.clientWidth)
      const targetX = clamp(element.scrollLeft + x + remainderX, 0, maximumX)
      element.scrollLeft = targetX
      remainderX = targetX - element.scrollLeft
    }

    if (y !== 0 || remainderY !== 0) {
      const maximumY = Math.max(0, element.scrollHeight - element.clientHeight)
      const targetY = clamp(element.scrollTop + y + remainderY, 0, maximumY)
      element.scrollTop = targetY
      remainderY = targetY - element.scrollTop
    }
  }

  function step() {
    frame = undefined

    const element = controllerOptions.getElement()
    if (!element || !enabled()) {
      cancel()
      return
    }

    const currentTime = now()
    let frameX = 0
    let frameY = 0

    queue.forEach((item) => {
      const elapsed = currentTime - item.start
      const finished = item.duration === 0 || elapsed >= item.duration
      const progress = finished ? 1 : pulseEase(elapsed / item.duration, item.pulseScale)
      const nextX = item.x * progress
      const nextY = item.y * progress

      frameX += nextX - item.lastX
      frameY += nextY - item.lastY
      item.lastX = nextX
      item.lastY = nextY
    })

    queue = queue.filter((item) => currentTime - item.start < item.duration)
    applyDelta(element, frameX, frameY)

    if (queue.length > 0) {
      frame = window.requestAnimationFrame(step)
      return
    }

    directionX = 0
    directionY = 0
    remainderX = 0
    remainderY = 0
  }

  function startFrame() {
    if (!isBrowser() || frame !== undefined) {
      return
    }

    if (typeof window.requestAnimationFrame !== 'function') {
      step()
      return
    }

    frame = window.requestAnimationFrame(step)
  }

  function enqueue(rawX: number, rawY: number) {
    const element = controllerOptions.getElement()
    if (!element || (!rawX && !rawY)) {
      return false
    }

    const options = getOptions()
    const nextDirectionX = sign(rawX)
    const nextDirectionY = sign(rawY)
    const reversed =
      (nextDirectionX !== 0 && directionX !== 0 && nextDirectionX !== directionX) ||
      (nextDirectionY !== 0 && directionY !== 0 && nextDirectionY !== directionY)

    if (reversed) {
      cancel()
    }

    const currentTime = now()
    const elapsed = lastInputTime ? currentTime - lastInputTime : Number.POSITIVE_INFINITY
    let acceleration = 1

    if (options.accelerationDelta > 0 && elapsed < options.accelerationDelta) {
      acceleration = Math.min(
        (1 + options.accelerationDelta / Math.max(1, elapsed)) / 2,
        options.accelerationMax,
      )
    }

    const x = rawX * acceleration
    const y = rawY * acceleration

    directionX = sign(x) || directionX
    directionY = sign(y) || directionY
    lastInputTime = currentTime

    if (options.duration === 0 || !isBrowser() || typeof window.requestAnimationFrame !== 'function') {
      applyDelta(element, x, y)
      return true
    }

    queue.push({
      x,
      y,
      lastX: 0,
      lastY: 0,
      start: currentTime,
      duration: options.duration,
      pulseScale: options.pulseScale,
    })
    startFrame()
    return true
  }

  function allBufferedDeltasDivisibleBy(divisor: number) {
    return deltaBuffer.length === 3 && deltaBuffer.every((delta) => delta % divisor === 0)
  }

  function isTouchpad(event: WheelEvent, delta: number) {
    // 行、页单位本身就是离散滚轮输入，不能用转换后的像素值识别触控板。
    if (event.deltaMode !== WheelEvent.DOM_DELTA_PIXEL) {
      return false
    }

    const legacyEvent = event as LegacyWheelEvent
    const wheelX = legacyEvent.wheelDeltaX || 0
    const wheelY = legacyEvent.wheelDeltaY || 0
    const vertical = Math.abs(wheelY) >= Math.abs(wheelX)
    const wheelDelta = (vertical ? wheelY : wheelX) || legacyEvent.wheelDelta || 0
    const pixelDelta = vertical ? event.deltaY : event.deltaX
    // Chromium 的常见鼠标输入是 120 档位 / 100 CSS px；页面缩放会同时缩放两者，
    // 且 wheelDelta 会取整（110% 时为 109 / 90.909），不能只检查是否整除 120。
    // 只把有反向档位信息、符合该比例的输入补认成鼠标，不改变实际距离，也不接管细小增量。
    const scaledWheel = Math.abs(wheelDelta) >= 24 && wheelDelta * pixelDelta < 0 &&
      Math.abs(Math.abs(wheelDelta) - Math.abs(pixelDelta) * 1.2) < 1
    if (scaledWheel) {
      return false
    }
    // 鼠标的像素步长会随缩放、系统设置变化；优先用保留滚轮档位的信息识别设备。
    // 这些可选字段只参与识别，实际滚动距离仍由标准 deltaX / deltaY 决定。
    const absoluteDelta = Math.abs(wheelDelta || delta)
    if (!absoluteDelta) {
      return false
    }

    if (deltaBuffer.length === 0) {
      deltaBuffer = [absoluteDelta, absoluteDelta, absoluteDelta]
    }

    deltaBuffer.push(absoluteDelta)
    deltaBuffer.shift()

    const dpiScaledWheel = absoluteDelta > 120 && allBufferedDeltasDivisibleBy(absoluteDelta)
    return (
      !allBufferedDeltasDivisibleBy(120) &&
      !allBufferedDeltasDivisibleBy(100) &&
      !dpiScaledWheel
    )
  }

  function prepareDelta(event: WheelEvent) {
    const element = controllerOptions.getElement()
    if (!element) {
      return null
    }

    const options = getOptions()
    const normalized = normalizeWheelDelta(event, element, getAxes())
    const primaryDelta = Math.abs(normalized.y) >= Math.abs(normalized.x) ? normalized.y : normalized.x

    if (!options.smoothTouchpad && isTouchpad(event, primaryDelta)) {
      return null
    }

    let x = scaleWheelDelta(normalized.x, options.stepSize)
    let y = scaleWheelDelta(normalized.y, options.stepSize)

    if (x && !canScroll(element, 'x', x)) {
      x = 0
    }

    if (y && !canScroll(element, 'y', y)) {
      y = 0
    }

    if ((!x && !y) || nestedScrollerCanConsume(event, element, x, y)) {
      return null
    }

    return { x, y }
  }

  function handleWheel(event: WheelEvent) {
    if (
      !isBrowser() ||
      !enabled() ||
      event.defaultPrevented ||
      event.ctrlKey ||
      (getOptions().respectReducedMotion && prefersReducedMotion())
    ) {
      return false
    }

    const delta = prepareDelta(event)
    if (!delta) {
      if (!event.defaultPrevented) {
        cancel()
      }
      return false
    }

    event.preventDefault()
    return enqueue(delta.x, delta.y)
  }

  function handleKeydown(event: KeyboardEvent) {
    const element = controllerOptions.getElement()
    const options = getOptions()
    if (
      !isBrowser() ||
      !element ||
      !enabled() ||
      !options.keyboard ||
      event.defaultPrevented ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      (event.shiftKey && event.key !== ' ') ||
      isEditableTarget(event) ||
      (options.respectReducedMotion && prefersReducedMotion())
    ) {
      return false
    }

    const axes = getAxes()
    let x = 0
    let y = 0

    switch (event.key) {
      case 'ArrowUp':
        y = axes.vertical ? -options.keyboardStep : 0
        break
      case 'ArrowDown':
        y = axes.vertical ? options.keyboardStep : 0
        break
      case 'ArrowLeft':
        x = axes.horizontal ? -options.keyboardStep : 0
        break
      case 'ArrowRight':
        x = axes.horizontal ? options.keyboardStep : 0
        break
      case 'PageUp':
        y = axes.vertical ? -element.clientHeight * 0.9 : 0
        break
      case 'PageDown':
      case ' ':
        y = axes.vertical ? element.clientHeight * (event.shiftKey ? -0.9 : 0.9) : 0
        break
      case 'Home':
        y = axes.vertical ? -element.scrollTop : 0
        x = !axes.vertical && axes.horizontal ? -element.scrollLeft : 0
        break
      case 'End':
        y = axes.vertical
          ? Math.max(0, element.scrollHeight - element.clientHeight - element.scrollTop)
          : 0
        x = !axes.vertical && axes.horizontal
          ? Math.max(0, element.scrollWidth - element.clientWidth - element.scrollLeft)
          : 0
        break
      default:
        return false
    }

    if (x && !canScroll(element, 'x', x)) {
      x = 0
    }
    if (y && !canScroll(element, 'y', y)) {
      y = 0
    }
    if (!x && !y) {
      return false
    }

    event.preventDefault()
    return enqueue(x, y)
  }

  return {
    cancel,
    handleKeydown,
    handleWheel,
    isAnimating: () => frame !== undefined || queue.length > 0,
  }
}
