import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  compactSmoothScrollOptions,
  createSmoothScrollController,
  defaultSmoothScrollOptions,
  pulseEase,
  resolveComponentSmoothScroll,
  resolveSmoothScrollOptions,
} from './smoothScroll'
import type { SmoothScrollController, SmoothScrollOptions } from './smoothScroll'

describe('smoothScroll motion utilities', () => {
  it('normalizes the pulse curve and keeps it monotonic', () => {
    const samples = [0, 0.1, 0.25, 0.5, 0.75, 1].map((value) => pulseEase(value, 4))

    expect(samples[0]).toBe(0)
    expect(samples.at(-1)).toBe(1)
    expect(samples).toEqual([...samples].sort((left, right) => left - right))
    expect(samples[3]).toBeCloseTo(0.7924, 3)
  })

  it('fills defaults and clamps unsafe numeric options', () => {
    expect(resolveSmoothScrollOptions(undefined)).toEqual(defaultSmoothScrollOptions)
    expect(
      resolveSmoothScrollOptions({
        duration: -10,
        pulseScale: 0,
        accelerationMax: 0,
      }),
    ).toMatchObject({
      duration: 0,
      pulseScale: 0.1,
      accelerationMax: 1,
    })
  })

  it('provides a compact preset for semantic lists', () => {
    expect(compactSmoothScrollOptions).toEqual({
      duration: 280,
      stepSize: 72,
      pulseScale: 4,
      accelerationDelta: 50,
      accelerationMax: 2,
      keyboard: false,
      smoothTouchpad: false,
      respectReducedMotion: true,
    })
  })

  it('merges component values between a preset and enforced options', () => {
    const preset = {
      duration: 280,
      stepSize: 72,
      keyboard: false,
    }
    const enforced = {
      keyboard: false,
      smoothTouchpad: false,
    }

    expect(resolveComponentSmoothScroll(false, preset, enforced)).toBe(false)
    expect(resolveComponentSmoothScroll(undefined, preset, enforced)).toEqual({
      duration: 280,
      stepSize: 72,
      keyboard: false,
      smoothTouchpad: false,
    })
    expect(resolveComponentSmoothScroll(true, preset, enforced)).toEqual({
      duration: 280,
      stepSize: 72,
      keyboard: false,
      smoothTouchpad: false,
    })
    expect(
      resolveComponentSmoothScroll(
        {
          duration: 180,
          keyboard: true,
          pulseScale: 5,
        },
        preset,
        enforced,
      ),
    ).toEqual({
      duration: 180,
      stepSize: 72,
      keyboard: false,
      pulseScale: 5,
      smoothTouchpad: false,
    })
  })
})

describe('平滑滚动的输入设备识别', () => {
  let controller: SmoothScrollController | undefined

  afterEach(() => {
    controller?.cancel()
    vi.restoreAllMocks()
  })

  function setup(options: SmoothScrollOptions = {}) {
    const element = document.createElement('div')
    Object.defineProperties(element, {
      clientHeight: { value: 120 },
      scrollHeight: { value: 1200 },
      clientWidth: { value: 120 },
      scrollWidth: { value: 1200 },
    })
    controller = createSmoothScrollController({
      getElement: () => element,
      getOptions: () => ({ duration: 0, accelerationMax: 1, ...options }),
    })
    return element
  }

  function wheel(init: WheelEventInit, legacy: Record<string, number> = {}) {
    const event = new WheelEvent('wheel', { cancelable: true, ...init })
    // 测试环境的 WheelEvent 构造器没有传递修饰键。
    for (const key of ['ctrlKey', 'shiftKey'] as const) {
      if (init[key] !== undefined) Object.defineProperty(event, key, { value: init[key] })
    }
    for (const [key, value] of Object.entries(legacy)) {
      Object.defineProperty(event, key, { value })
    }
    return event
  }

  it.each([40, 80, 96, 133.333333])('鼠标像素步长为 %s 时仍保留平滑处理和实际距离', deltaY => {
    const element = setup()
    const event = wheel({ deltaY }, { wheelDeltaY: -120 })
    expect(controller!.handleWheel(event)).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(element.scrollTop).toBeCloseTo(deltaY * 100 / 120, 4)
  })

  it.each([0.8, 0.9, 1.1, 1.25, 1.5, 1.75, 2])('Chrome 页面缩放为 %s 时，取整后的鼠标档位仍触发惯性', zoom => {
    const element = setup()
    const deltaY = 100 / zoom
    const event = wheel({ deltaY }, { wheelDeltaY: -Math.trunc(120 / zoom) })
    expect(controller!.handleWheel(event)).toBe(true)
    expect(event.defaultPrevented).toBe(true)
    expect(element.scrollTop).toBeCloseTo(deltaY * 100 / 120, 4)
  })

  it('缩放后的鼠标与触控板切换时，仍保留触控板的连续输入', () => {
    const element = setup()
    for (const deltaY of [2.5, 6.25, 30]) {
      const event = wheel({ deltaY }, { wheelDeltaY: -deltaY * 3 })
      expect(controller!.handleWheel(event)).toBe(false)
    }
    const mouse = wheel({ deltaY: 100 / 1.1 }, { wheelDeltaY: -109 })
    expect(controller!.handleWheel(mouse)).toBe(true)
    const afterMouse = element.scrollTop
    for (const deltaY of [30, 12.5, 2.5]) {
      const event = wheel({ deltaY }, { wheelDeltaY: -deltaY * 3 })
      expect(controller!.handleWheel(event)).toBe(false)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(element.scrollTop).toBe(afterMouse)
  })

  it('横向鼠标滚轮和 Shift 滚轮使用相同的设备识别', () => {
    const element = setup()
    expect(controller!.handleWheel(wheel({ deltaX: 80 }, { wheelDeltaX: -120 }))).toBe(true)
    expect(controller!.handleWheel(wheel({ deltaY: 96, shiftKey: true }, { wheelDeltaY: -120 }))).toBe(true)
    expect(element.scrollLeft).toBeCloseTo((80 + 96) * 100 / 120, 4)
    expect(element.scrollTop).toBe(0)
  })

  it('缩放档位支持横向、Shift 映射和反向滚动', () => {
    const element = setup()
    expect(controller!.handleWheel(wheel({ deltaX: 100 / 1.1 }, { wheelDeltaX: -109 }))).toBe(true)
    expect(controller!.handleWheel(wheel({ deltaY: 100 / 1.1, shiftKey: true }, { wheelDeltaY: -109 }))).toBe(true)
    expect(element.scrollLeft).toBeCloseTo(2 * 100 / 1.1 * 100 / 120, 4)
    expect(controller!.handleWheel(wheel({ deltaX: -100 / 1.1 }, { wheelDeltaX: 109 }))).toBe(true)
    expect(element.scrollLeft).toBeCloseTo(100 / 1.1 * 100 / 120, 4)
    expect(element.scrollTop).toBe(0)
  })

  it('没有档位信息和细小的比例相近输入不因缩放修复被接管', () => {
    const element = setup()
    for (const event of [wheel({ deltaY: 100 / 1.1 }), wheel({ deltaY: 5 }, { wheelDeltaY: -6 })]) {
      expect(controller!.handleWheel(event)).toBe(false)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(element.scrollTop).toBe(0)
  })

  it.each([WheelEvent.DOM_DELTA_LINE, WheelEvent.DOM_DELTA_PAGE])('以行或页为单位的滚轮不会误判为触控板（mode=%s）', deltaMode => {
    const element = setup()
    expect(controller!.handleWheel(wheel({ deltaY: 1, deltaMode }))).toBe(true)
    expect(element.scrollTop).toBeGreaterThan(0)
  })

  it('触控板的细小连续增量默认保持原生，显式开启时才平滑处理', () => {
    const element = setup()
    for (const deltaY of [2.5, 6.25, 3]) {
      const event = wheel({ deltaY }, { wheelDeltaY: -deltaY * 3 })
      expect(controller!.handleWheel(event)).toBe(false)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(element.scrollTop).toBe(0)
    controller!.cancel()
    const optedIn = setup({ smoothTouchpad: true })
    expect(controller!.handleWheel(wheel({ deltaY: 6.25 }, { wheelDeltaY: -18.75 }))).toBe(true)
    expect(optedIn.scrollTop).toBeGreaterThan(0)
  })

  it('鼠标元数据缺失时仍能处理标准滚轮，并保留减少动态效果和缩放手势', () => {
    const element = setup()
    expect(controller!.handleWheel(wheel({ deltaY: 120 }))).toBe(true)
    expect(element.scrollTop).toBe(100)
    const zoom = wheel({ deltaY: 80, ctrlKey: true }, { wheelDeltaY: -120 })
    expect(controller!.handleWheel(zoom)).toBe(false)
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList)
    const reduced = wheel({ deltaY: 80 }, { wheelDeltaY: -120 })
    expect(controller!.handleWheel(reduced)).toBe(false)
    expect(element.scrollTop).toBe(100)
  })
})
