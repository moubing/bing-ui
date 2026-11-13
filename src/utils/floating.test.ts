import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import {
  computeFloatingPosition,
  getAvailableSpace,
  isVerticalSide,
  resolveFloatingSide,
  useFloatingAutoUpdate,
} from './floating'
import type { FloatingAlign, FloatingRect, FloatingSide, FloatingSize } from './floating'

const viewport = { width: 1000, height: 800 }

function rect(left: number, top: number, width: number, height: number): FloatingRect {
  return { left, top, width, height, right: left + width, bottom: top + height }
}

describe('computeFloatingPosition', () => {
  it('places below the anchor with gap and start alignment', () => {
    expect(
      computeFloatingPosition({
        anchor: rect(100, 100, 200, 32),
        floating: { width: 240, height: 300 },
        side: 'bottom',
        gap: 8,
        padding: 12,
        viewport,
      }),
    ).toEqual({ side: 'bottom', left: 100, top: 140 })
  })

  it('flips to the opposite side when the preferred side is too small', () => {
    const position = computeFloatingPosition({
      anchor: rect(100, 700, 200, 32),
      floating: { width: 240, height: 300 },
      side: 'bottom',
      gap: 8,
      padding: 12,
      viewport,
    })

    expect(position).toEqual({ side: 'top', left: 100, top: 392 })
  })

  it('keeps the preferred side when flipping is disabled and shifts into the viewport', () => {
    const position = computeFloatingPosition({
      anchor: rect(100, 700, 200, 32),
      floating: { width: 240, height: 300 },
      side: 'bottom',
      flip: 'none',
      gap: 8,
      padding: 12,
      viewport,
    })

    expect(position).toEqual({ side: 'bottom', left: 100, top: 488 })
  })

  it('only limits the start edge on the main axis when shiftMainAxis is false', () => {
    const position = computeFloatingPosition({
      anchor: rect(100, 500, 200, 32),
      floating: { width: 240, height: 400 },
      side: 'bottom',
      flip: 'none',
      gap: 8,
      padding: 12,
      viewport,
      shiftMainAxis: false,
    })

    expect(position.top).toBe(540)
  })

  it('aligns center and end on both axes and clamps the cross axis', () => {
    const anchor = rect(400, 300, 100, 40)

    expect(
      computeFloatingPosition({ anchor, floating: { width: 200, height: 50 }, side: 'top', align: 'center', viewport }),
    ).toMatchObject({ left: 350, top: 250 })
    expect(
      computeFloatingPosition({ anchor, floating: { width: 200, height: 100 }, side: 'right', align: 'end', viewport }),
    ).toMatchObject({ left: 500, top: 240 })
    expect(
      computeFloatingPosition({
        anchor: rect(950, 300, 40, 40),
        floating: { width: 200, height: 50 },
        side: 'bottom',
        padding: 12,
        viewport,
      }).left,
    ).toBe(788)
  })

  it('best flip tries remaining sides and falls back to the largest space', () => {
    expect(
      resolveFloatingSide({
        anchor: rect(10, 10, 40, 20),
        floating: { width: 100, height: 40 },
        side: 'top',
        flip: 'best',
        viewport,
      }),
    ).toBe('bottom')
    expect(
      resolveFloatingSide({
        anchor: rect(0, 0, 1000, 800),
        floating: { width: 100, height: 40 },
        side: 'left',
        flip: 'best',
        viewport,
      }),
    ).toBe('left')
  })
})

/*
 * 以下参照实现原样摘自重构前各组件中的定位代码，用随机输入验证公共实现与之逐值一致。
 */
function legacyClamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function legacyClampSafe(value: number, min: number, max: number) {
  return max < min ? min : Math.min(max, Math.max(min, value))
}

// BingColorPicker / BingDatePicker
function legacyVerticalPicker(anchor: FloatingRect, width: number, height: number, vw: number, vh: number) {
  const pad = 12
  const gap = 8
  const below = vh - anchor.bottom - gap - pad
  const above = anchor.top - gap - pad
  const placement = below >= height || below >= above ? 'bottom' : 'top'
  const left = legacyClampSafe(anchor.left, pad, Math.max(pad, vw - pad - width))
  const maxTop = Math.max(pad, vh - pad - height)
  const top =
    placement === 'bottom'
      ? legacyClampSafe(anchor.bottom + gap, pad, maxTop)
      : legacyClampSafe(anchor.top - gap - height, pad, maxTop)

  return { side: placement, left, top }
}

// BingDropDown
function legacyDropDown(
  anchor: FloatingRect,
  sidePref: FloatingSide,
  align: 'start' | 'end',
  gap: number,
  panelWidth: number,
  panelHeight: number,
  vw: number,
  vh: number,
) {
  const pad = 12
  const below = vh - anchor.bottom - gap - pad
  const above = anchor.top - gap - pad
  const leftSpace = anchor.left - gap - pad
  const rightSpace = vw - anchor.right - gap - pad
  let placement: FloatingSide
  let left: number
  let top: number

  if (sidePref === 'left' || sidePref === 'right') {
    placement =
      sidePref === 'left'
        ? leftSpace >= panelWidth || leftSpace >= rightSpace ? 'left' : 'right'
        : rightSpace >= panelWidth || rightSpace >= leftSpace ? 'right' : 'left'
    const rawLeft = placement === 'left' ? anchor.left - gap - panelWidth : anchor.right + gap
    const rawTop = align === 'end' ? anchor.bottom - panelHeight : anchor.top
    left = legacyClamp(rawLeft, pad, Math.max(pad, vw - pad - panelWidth))
    top = legacyClamp(rawTop, pad, Math.max(pad, vh - pad - panelHeight))
  } else {
    placement =
      sidePref === 'top'
        ? above >= panelHeight || above >= below ? 'top' : 'bottom'
        : below >= panelHeight || below >= above ? 'bottom' : 'top'
    const rawLeft = align === 'end' ? anchor.right - panelWidth : anchor.left
    left = legacyClamp(rawLeft, pad, Math.max(pad, vw - pad - panelWidth))
    top =
      placement === 'bottom'
        ? legacyClamp(anchor.bottom + gap, pad, vh - pad)
        : legacyClamp(anchor.top - gap - panelHeight, pad, vh - pad)
  }

  return { side: placement, left, top }
}

// BingSelect / BingTreeSelect
function legacySelect(
  anchor: FloatingRect,
  panelPlacement: FloatingSide | 'auto',
  align: 'start' | 'middle' | 'end',
  gap: number,
  desiredHeight: number,
  panelHeight: number,
  width: number,
  vw: number,
  vh: number,
) {
  const pad = 12
  let placement: FloatingSide

  if (panelPlacement !== 'auto') {
    placement = panelPlacement
  } else {
    const below = vh - anchor.bottom - gap - pad
    const above = anchor.top - gap - pad
    placement = below >= desiredHeight || below >= above ? 'bottom' : 'top'
  }

  const maxLeft = Math.max(pad, vw - pad - width)
  const maxTop = Math.max(pad, vh - pad - panelHeight)
  let left: number
  let top: number

  if (placement === 'left') left = legacyClamp(anchor.left - gap - width, pad, maxLeft)
  else if (placement === 'right') left = legacyClamp(anchor.right + gap, pad, maxLeft)
  else
    left = legacyClamp(
      align === 'middle' ? anchor.left + anchor.width / 2 - width / 2 : align === 'end' ? anchor.right - width : anchor.left,
      pad,
      maxLeft,
    )

  if (placement === 'bottom') top = legacyClamp(anchor.bottom + gap, pad, maxTop)
  else if (placement === 'top') top = legacyClamp(anchor.top - gap - panelHeight, pad, maxTop)
  else
    top = legacyClamp(
      align === 'middle' ? anchor.top + anchor.height / 2 - panelHeight / 2 : align === 'end' ? anchor.bottom - panelHeight : anchor.top,
      pad,
      maxTop,
    )

  return { side: placement, left, top }
}

// BingTooltip（不含设备像素对齐）
function legacyTooltip(
  anchor: FloatingRect,
  preferred: FloatingSide,
  align: FloatingAlign,
  offset: number,
  pad: number,
  size: FloatingSize,
  vw: number,
  vh: number,
) {
  const space = (p: FloatingSide) =>
    p === 'top'
      ? Math.max(0, anchor.top - offset - pad)
      : p === 'bottom'
        ? Math.max(0, vh - anchor.bottom - offset - pad)
        : p === 'left'
          ? Math.max(0, anchor.left - offset - pad)
          : Math.max(0, vw - anchor.right - offset - pad)
  const main = (p: FloatingSide) => (p === 'top' || p === 'bottom' ? size.height : size.width)
  const opposite = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' } as const
  const candidates = [preferred, opposite[preferred], 'top', 'bottom', 'right', 'left'].filter(
    (item, index, items): item is FloatingSide => items.indexOf(item) === index,
  )
  const placement =
    candidates.find((p) => space(p) >= main(p)) ??
    candidates.reduce((best, p) => (space(p) > space(best) ? p : best))
  const alignStart = (start: number, anchorSize: number, panel: number) =>
    align === 'start' ? start : align === 'end' ? start + anchorSize - panel : start + anchorSize / 2 - panel / 2
  const raw =
    placement === 'top' || placement === 'bottom'
      ? {
          left: alignStart(anchor.left, anchor.width, size.width),
          top: placement === 'top' ? anchor.top - offset - size.height : anchor.bottom + offset,
        }
      : {
          left: placement === 'left' ? anchor.left - offset - size.width : anchor.right + offset,
          top: alignStart(anchor.top, anchor.height, size.height),
        }

  return {
    side: placement,
    left: legacyClampSafe(raw.left, pad, Math.max(pad, vw - size.width - pad)),
    top: legacyClampSafe(raw.top, pad, Math.max(pad, vh - size.height - pad)),
  }
}

function createRandom(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    return seed / 4294967296
  }
}

describe('floating geometry matches the previous per-component implementations', () => {
  const random = createRandom(20261026)
  const between = (min: number, max: number) => Math.round(min + random() * (max - min))
  const pick = <T,>(items: readonly T[]) => items[Math.floor(random() * items.length)]
  const sides = ['top', 'bottom', 'left', 'right'] as const
  const runs = 3000

  function randomCase() {
    const vw = between(240, 1600)
    const vh = between(240, 1000)
    const anchor = rect(between(-80, vw), between(-80, vh), between(0, 400), between(0, 80))
    return { vw, vh, anchor, width: between(40, 900), height: between(20, 900) }
  }

  it('color picker and date picker', () => {
    for (let i = 0; i < runs; i += 1) {
      const { vw, vh, anchor, width, height } = randomCase()
      const result = computeFloatingPosition({
        anchor,
        floating: { width, height },
        side: 'bottom',
        gap: 8,
        padding: 12,
        viewport: { width: vw, height: vh },
      })

      expect(result).toEqual(legacyVerticalPicker(anchor, width, height, vw, vh))
    }
  })

  it('drop down', () => {
    for (let i = 0; i < runs; i += 1) {
      const { vw, vh, anchor, width, height } = randomCase()
      const side = pick(sides)
      const align = pick(['start', 'end'] as const)
      const gap = pick([0, 8])
      const result = computeFloatingPosition({
        anchor,
        floating: { width, height },
        side,
        align,
        gap,
        padding: 12,
        viewport: { width: vw, height: vh },
        shiftMainAxis: !isVerticalSide(side),
      })

      expect(result).toEqual(legacyDropDown(anchor, side, align, gap, width, height, vw, vh))
    }
  })

  it('select and tree select', () => {
    for (let i = 0; i < runs; i += 1) {
      const { vw, vh, anchor, width, height } = randomCase()
      const panelPlacement = pick(['auto', ...sides] as const)
      const align = pick(['start', 'middle', 'end'] as const)
      const gap = between(0, 16)
      const desiredHeight = between(20, 900)
      const layout = { gap, padding: 12, viewport: { width: vw, height: vh } }
      const side =
        panelPlacement === 'auto'
          ? resolveFloatingSide({ anchor, floating: { width, height: desiredHeight }, side: 'bottom', ...layout })
          : panelPlacement
      const result = computeFloatingPosition({
        anchor,
        floating: { width, height },
        side,
        flip: 'none',
        align: align === 'middle' ? 'center' : align,
        ...layout,
      })

      expect(result).toEqual(legacySelect(anchor, panelPlacement, align, gap, desiredHeight, height, width, vw, vh))
    }
  })

  it('tooltip', () => {
    for (let i = 0; i < runs; i += 1) {
      const { vw, vh, anchor, width, height } = randomCase()
      const side = pick(sides)
      const align = pick(['start', 'center', 'end'] as const)
      const offset = between(0, 16)
      const padding = between(0, 16)
      const result = computeFloatingPosition({
        anchor,
        floating: { width, height },
        side,
        flip: 'best',
        align,
        gap: offset,
        padding,
        viewport: { width: vw, height: vh },
      })

      expect(result).toEqual(legacyTooltip(anchor, side, align, offset, padding, { width, height }, vw, vh))
    }
  })

  it('available space helper', () => {
    const anchor = rect(100, 200, 50, 20)

    expect(getAvailableSpace(anchor, 'bottom', { gap: 8, padding: 12, viewport })).toBe(560)
    expect(getAvailableSpace(anchor, 'top', { gap: 8, padding: 12, viewport })).toBe(180)
  })
})

describe('useFloatingAutoUpdate', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('coalesces scroll and resize into one frame and stops on unmount', () => {
    const frames: FrameRequestCallback[] = []
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      frames.push(callback)
      return frames.length
    })
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined)
    const update = vi.fn()
    let tracker!: ReturnType<typeof useFloatingAutoUpdate>
    const wrapper = mount(
      defineComponent({
        setup() {
          tracker = useFloatingAutoUpdate(update)
          return () => h('div')
        },
      }),
    )

    tracker.start()
    tracker.start()
    window.dispatchEvent(new Event('resize'))
    document.dispatchEvent(new Event('scroll'))
    frames.at(-1)?.(0)

    expect(update).toHaveBeenCalledTimes(1)

    wrapper.unmount()
    frames.length = 0
    window.dispatchEvent(new Event('resize'))

    expect(frames).toHaveLength(0)
  })

  it('skips scheduling while disabled', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame')
    const tracker = useFloatingAutoUpdate(() => undefined, { enabled: () => false })

    tracker.schedule()

    expect(raf).not.toHaveBeenCalled()
  })
})
