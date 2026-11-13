import { getCurrentInstance, onBeforeUnmount } from 'vue'

/**
 * 浮层定位的公共几何计算与视口跟随。
 *
 * 几何部分是纯函数：给定锚点矩形、浮层尺寸与视口，求出方向和左上角坐标。
 * 各组件只负责测量自身尺寸、决定首选方向，并在结果上叠加各自的派生状态
 * （最大高度、变换原点、侧边工具栏等）。
 */

export type FloatingSide = 'top' | 'bottom' | 'left' | 'right'
export type FloatingAlign = 'start' | 'center' | 'end'

/**
 * - `none`：始终使用首选方向。
 * - `opposite`：首选方向放不下且对侧空间更大时翻到对侧。
 * - `best`：依次尝试首选、对侧及其余方向，取第一个放得下的；都放不下时取空间最大的。
 */
export type FloatingFlip = 'none' | 'opposite' | 'best'

export interface FloatingRect {
  top: number
  right: number
  bottom: number
  left: number
  width: number
  height: number
}

export interface FloatingSize {
  width: number
  height: number
}

export interface FloatingLayoutOptions {
  /** 锚点与浮层的间距。 */
  gap?: number
  /** 浮层与视口边缘保留的最小距离。 */
  padding?: number
  /** 默认读取当前窗口尺寸。 */
  viewport?: FloatingSize
}

export interface ResolveFloatingSideOptions extends FloatingLayoutOptions {
  anchor: FloatingRect
  floating: FloatingSize
  side: FloatingSide
  flip?: FloatingFlip
}

export interface ComputeFloatingPositionOptions extends ResolveFloatingSideOptions {
  align?: FloatingAlign
  /**
   * 主轴方向是否把整个浮层推回视口。默认 `true`；
   * 为 `false` 时只保证浮层起点不越过视口边距，浮层可以向外延伸。
   */
  shiftMainAxis?: boolean
}

export interface FloatingPosition {
  side: FloatingSide
  left: number
  top: number
}

const oppositeSides: Record<FloatingSide, FloatingSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
}

export function getOppositeSide(side: FloatingSide) {
  return oppositeSides[side]
}

export function isVerticalSide(side: FloatingSide) {
  return side === 'top' || side === 'bottom'
}

export function getViewportSize(): FloatingSize {
  if (typeof window === 'undefined') {
    return { width: 0, height: 0 }
  }

  return { width: window.innerWidth, height: window.innerHeight }
}

/** 限制在区间内；区间无效时取下限。 */
export function clampToRange(value: number, min: number, max: number) {
  if (max < min) {
    return min
  }

  return Math.min(max, Math.max(min, value))
}

/** 对齐到设备像素，避免半像素模糊。 */
export function snapToDevicePixel(value: number) {
  if (typeof window === 'undefined') {
    return Math.round(value)
  }

  const ratio = window.devicePixelRatio || 1

  return Math.round(value * ratio) / ratio
}

/** 锚点某一侧到视口边距之间的可用空间，可能为负数。 */
export function getAvailableSpace(
  anchor: FloatingRect,
  side: FloatingSide,
  { gap = 0, padding = 0, viewport = getViewportSize() }: FloatingLayoutOptions = {},
) {
  if (side === 'top') {
    return anchor.top - gap - padding
  }

  if (side === 'bottom') {
    return viewport.height - anchor.bottom - gap - padding
  }

  if (side === 'left') {
    return anchor.left - gap - padding
  }

  return viewport.width - anchor.right - gap - padding
}

function getMainSize(side: FloatingSide, floating: FloatingSize) {
  return isVerticalSide(side) ? floating.height : floating.width
}

export function resolveFloatingSide({
  anchor,
  floating,
  side,
  flip = 'opposite',
  ...layout
}: ResolveFloatingSideOptions): FloatingSide {
  if (flip === 'none') {
    return side
  }

  const spaceOf = (candidate: FloatingSide) => getAvailableSpace(anchor, candidate, layout)

  if (flip === 'opposite') {
    const opposite = getOppositeSide(side)
    const preferredSpace = spaceOf(side)

    return preferredSpace >= getMainSize(side, floating) || preferredSpace >= spaceOf(opposite)
      ? side
      : opposite
  }

  const candidates = [side, getOppositeSide(side), 'top', 'bottom', 'right', 'left'].filter(
    (item, index, items): item is FloatingSide => items.indexOf(item) === index,
  )
  const clampedSpaceOf = (candidate: FloatingSide) => Math.max(0, spaceOf(candidate))
  const fitting = candidates.find(
    (candidate) => clampedSpaceOf(candidate) >= getMainSize(candidate, floating),
  )

  if (fitting) {
    return fitting
  }

  return candidates.reduce((best, candidate) =>
    clampedSpaceOf(candidate) > clampedSpaceOf(best) ? candidate : best,
  )
}

function getAlignedStart(align: FloatingAlign, anchorStart: number, anchorSize: number, size: number) {
  if (align === 'end') {
    return anchorStart + anchorSize - size
  }

  if (align === 'center') {
    return anchorStart + anchorSize / 2 - size / 2
  }

  return anchorStart
}

export function computeFloatingPosition(options: ComputeFloatingPositionOptions): FloatingPosition {
  const {
    anchor,
    floating,
    align = 'start',
    gap = 0,
    padding = 0,
    viewport = getViewportSize(),
    shiftMainAxis = true,
  } = options
  const side = resolveFloatingSide({ ...options, gap, padding, viewport })
  const vertical = isVerticalSide(side)
  const rawLeft = vertical
    ? getAlignedStart(align, anchor.left, anchor.width, floating.width)
    : side === 'left'
      ? anchor.left - gap - floating.width
      : anchor.right + gap
  const rawTop = vertical
    ? side === 'top'
      ? anchor.top - gap - floating.height
      : anchor.bottom + gap
    : getAlignedStart(align, anchor.top, anchor.height, floating.height)
  const maxLeft =
    !vertical && !shiftMainAxis
      ? viewport.width - padding
      : Math.max(padding, viewport.width - padding - floating.width)
  const maxTop =
    vertical && !shiftMainAxis
      ? viewport.height - padding
      : Math.max(padding, viewport.height - padding - floating.height)

  return {
    side,
    left: clampToRange(rawLeft, padding, maxLeft),
    top: clampToRange(rawTop, padding, maxTop),
  }
}

export interface FloatingAutoUpdateOptions {
  /** 返回 `false` 时忽略本次调度，例如浮层已经关闭。 */
  enabled?: () => boolean
}

export interface FloatingAutoUpdate {
  /** 开始监听窗口尺寸变化与任意祖先滚动。重复调用无副作用。 */
  start: () => void
  /** 停止监听。 */
  stop: () => void
  /** 在下一帧执行更新，同一帧内的多次调度会合并。 */
  schedule: () => void
  /** 取消尚未执行的更新。 */
  cancel: () => void
  /** 停止监听并取消待执行的更新。 */
  dispose: () => void
}

/**
 * 浮层打开期间跟随视口变化重新定位。
 * 在组件 setup 中调用时会在卸载前自动释放。
 */
export function useFloatingAutoUpdate(
  update: () => void,
  { enabled }: FloatingAutoUpdateOptions = {},
): FloatingAutoUpdate {
  let listening = false
  let frame = 0

  function cancel() {
    if (!frame || typeof window === 'undefined') {
      return
    }

    window.cancelAnimationFrame(frame)
    frame = 0
  }

  function schedule() {
    if (typeof window === 'undefined' || (enabled && !enabled())) {
      return
    }

    cancel()
    frame = window.requestAnimationFrame(() => {
      frame = 0
      update()
    })
  }

  function start() {
    if (listening || typeof window === 'undefined') {
      return
    }

    window.addEventListener('resize', schedule)
    window.addEventListener('scroll', schedule, true)
    listening = true
  }

  function stop() {
    if (!listening || typeof window === 'undefined') {
      return
    }

    window.removeEventListener('resize', schedule)
    window.removeEventListener('scroll', schedule, true)
    listening = false
  }

  function dispose() {
    stop()
    cancel()
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(dispose)
  }

  return { start, stop, schedule, cancel, dispose }
}
