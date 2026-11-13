import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingSlider from './BingSlider.vue'
import BingConfigProvider from '../BingConfigProvider/BingConfigProvider.vue'
import type { BingSliderProps, BingSliderValue, BingSliderExpose } from './BingSlider.types'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
function mountSlider(props: BingSliderProps = {}, options: {
  reject?: boolean; reduced?: boolean; rtl?: boolean; coerce?: (value: BingSliderValue) => BingSliderValue
} = {}) {
  const host = document.createElement('div')
  host.style.cssText = 'width: 480px; margin: 80px 40px;'
  if (options.rtl) host.dir = 'rtl'
  document.body.append(host)
  const model = ref<BingSliderValue>(props.modelValue ?? props.defaultValue ?? (props.range ? [0, 100] : 20))
  const live = ref(props)
  const updates = vi.fn()
  const changes = vi.fn()
  const reduced = ref(options.reduced ?? false)
  const exposed = ref<BingSliderExpose>()
  const app = createApp({ render: () => h(BingConfigProvider, { reducedMotion: reduced.value ? 'always' : 'never' }, () =>
    h(BingSlider<boolean>, {
      ...live.value, ref: exposed, modelValue: model.value, onChange: changes,
      'onUpdate:modelValue': (next: BingSliderValue) => { updates(next); if (!options.reject) model.value = options.coerce?.(next) ?? next },
    }),
  ) })
  app.mount(host)
  mounted.push({ app, host })
  const root = host.querySelector<HTMLElement>('.bing-slider')!
  const inputs = () => [...host.querySelectorAll<HTMLInputElement>('input')]
  const center = (index = 0) => {
    const rect = root.querySelectorAll('.bing-slider__positioner')[index]!.getBoundingClientRect()
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  }
  const point = (fraction: number) => {
    const rect = root.getBoundingClientRect()
    const size = parseFloat(getComputedStyle(root).getPropertyValue('--bing-slider-thumb-size'))
    if (live.value.orientation === 'vertical') return { x: rect.x + 16, y: rect.y + size / 2 + (1 - fraction) * (rect.height - size) }
    return { x: rect.x + size / 2 + (options.rtl ? 1 - fraction : fraction) * (rect.width - size), y: rect.y + 16 }
  }
  return { root, model, live, updates, changes, reduced, exposed, inputs, center, point, app }
}
async function pointer(target: EventTarget, type: string, point: { x: number; y: number }, pointerType = 'mouse') {
  target.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerId: 7, isPrimary: true, pointerType,
    button: 0, buttons: type === 'pointerup' ? 0 : 1, clientX: point.x, clientY: point.y,
  }))
  await nextTick()
}
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
afterEach(() => {
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
})

describe('BingSlider 指针、几何与无障碍', () => {
  it.each([false, true])('keeps vertical geometry, labels and tooltips aligned from bottom to top, rtl=%s', async rtl => {
    const slider = mountSlider({ orientation: 'vertical', tooltip: 'always', marks: [{ value: 0, label: '低' }, { value: 100, label: '高' }] }, { reduced: true, rtl })
    expect(getComputedStyle(slider.root).touchAction).toBe('pan-x')
    for (const height of [200, 320]) {
      slider.root.style.height = `${height}px`
      for (const value of [0, 1, 50, 99, 100]) {
        slider.model.value = value
        await nextTick()
        const start = slider.root.querySelector('.bing-slider__fill-window')!.getBoundingClientRect()
        expect(Math.abs(start.top - slider.center().y)).toBeLessThan(0.5)
        expect(Math.abs(slider.point(value / 100).y - slider.center().y)).toBeLessThan(0.5)
        const root = slider.root.getBoundingClientRect()
        for (const element of slider.root.querySelectorAll('.bing-slider__mark-label, .bing-slider__tooltip')) {
          const rect = element.getBoundingClientRect()
          expect(rect.top).toBeGreaterThanOrEqual(root.top - 0.5)
          expect(rect.bottom).toBeLessThanOrEqual(root.bottom + 0.5)
        }
      }
    }
    const range = mountSlider({ orientation: 'vertical', range: true, modelValue: [20, 70] }, { reduced: true, rtl })
    const fill = range.root.querySelector('.bing-slider__fill')!.getBoundingClientRect()
    const start = range.root.querySelector('.bing-slider__fill-window')!.getBoundingClientRect()
    expect(Math.abs(fill.bottom - range.center(0).y)).toBeLessThan(0.5)
    expect(Math.abs(start.top - range.center(1).y)).toBeLessThan(0.5)
  })

  it('preserves vertical grab offset, follows outside the control and commits once', async () => {
    const slider = mountSlider({ orientation: 'vertical', defaultValue: 40 }, { reduced: true })
    const start = slider.center()
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', { x: start.x, y: start.y + 5 })
    expect(slider.updates).not.toHaveBeenCalled()
    const target = { x: start.x + 120, y: slider.point(0.7).y + 5 }
    await pointer(window, 'pointermove', target)
    expect(slider.model.value).toBe(70)
    expect(slider.changes).not.toHaveBeenCalled()
    await pointer(window, 'pointerup', target)
    expect(slider.changes.mock.calls).toEqual([[70]])
  })

  it('continues dragging when a parent recreates equivalent marks, but ends on changed constraints', async () => {
    const slider = mountSlider({ orientation: 'vertical', modelValue: 35, marks: [0, 35, 70, 100], snapToMarks: true }, { reduced: true })
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    await pointer(window, 'pointermove', slider.point(0.7))
    slider.live.value = { ...slider.live.value, marks: [{ value: 0, label: '最低' }, 35, 70, 100] }
    await nextTick()
    expect(slider.root.classList.contains('is-dragging')).toBe(true)
    await pointer(window, 'pointermove', slider.point(1))
    expect(slider.model.value).toBe(100)
    await pointer(window, 'pointerup', slider.point(1))
    expect(slider.changes.mock.calls).toEqual([[100]])
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    slider.live.value = { ...slider.live.value, marks: [0, 25, 50, 100] }
    await nextTick()
    expect(slider.root.classList.contains('is-dragging')).toBe(false)
    expect(document.documentElement.style.cursor).not.toBe('grabbing')
  })

  it('keeps a rejected vertical drag at each preview position until release', async () => {
    const slider = mountSlider({ orientation: 'vertical', modelValue: 30 }, { reject: true })
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    for (const number of [45, 60, 78, 51]) {
      await pointer(window, 'pointermove', slider.point(number / 100))
      await delay(80)
      expect(Math.abs(slider.center().y - slider.point(number / 100).y)).toBeLessThan(0.5)
      expect(slider.inputs()[0]!.value).toBe(String(number))
    }
    await pointer(window, 'pointerup', slider.point(0.51))
    await expect.poll(() => Math.abs(slider.center().y - slider.point(0.3).y)).toBeLessThan(0.5)
    expect(slider.changes).not.toHaveBeenCalled()
  })

  it('uses vertical touch intent, defers taps and cancels horizontal swipes', async () => {
    const slider = mountSlider({ orientation: 'vertical' }, { reduced: true })
    const start = slider.point(0.8)
    await pointer(slider.root, 'pointerdown', start, 'touch')
    expect(slider.model.value).toBe(20)
    await pointer(window, 'pointerup', start, 'touch')
    expect(slider.changes.mock.calls).toEqual([[80]])
    const next = slider.point(0.2)
    await pointer(slider.root, 'pointerdown', next, 'touch')
    await pointer(window, 'pointermove', { x: next.x + 30, y: next.y + 2 }, 'touch')
    await pointer(window, 'pointercancel', next, 'touch')
    expect(slider.model.value).toBe(80)
    await pointer(slider.root, 'pointerdown', next, 'touch')
    await pointer(window, 'pointermove', slider.point(0.4), 'touch')
    expect(slider.model.value).toBe(40)
    await pointer(window, 'pointerup', slider.point(0.4), 'touch')
    expect(slider.changes.mock.calls).toEqual([[80], [40]])
  })

  it('resolves vertical overlaps in both directions and stops at the other thumb', async () => {
    const slider = mountSlider({ orientation: 'vertical', range: true, modelValue: [50, 50] }, { reduced: true, rtl: true })
    for (const [target, expected] of [[30, [30, 50]], [70, [50, 70]]] as const) {
      slider.model.value = [50, 50]
      await nextTick()
      await pointer(slider.root.querySelector('.is-top .bing-slider__thumb')!, 'pointerdown', slider.center())
      await pointer(window, 'pointermove', slider.point(target / 100))
      await pointer(window, 'pointerup', slider.point(target / 100))
      expect(slider.model.value).toEqual(expected)
    }
    slider.live.value = { orientation: 'vertical', range: true, minDistance: 10 }
    slider.model.value = [20, 70]
    await nextTick()
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    await pointer(window, 'pointermove', slider.point(0.9))
    expect(slider.model.value).toEqual([60, 70])
    expect(parseFloat(slider.root.style.getPropertyValue('--bing-slider-edge0'))).toBe(0)
    await pointer(window, 'pointerup', slider.point(0.9))
  })

  it.each([
    { orientation: 'horizontal' as const, rtl: false }, { orientation: 'horizontal' as const, rtl: true },
    { orientation: 'vertical' as const, rtl: false }, { orientation: 'vertical' as const, rtl: true },
  ])('holds $orientation edge feedback without jitter, rtl=$rtl', async ({ orientation, rtl }) => {
    const slider = mountSlider({ orientation, modelValue: 30 }, { rtl, reject: true })
    const thumb = slider.root.querySelector<HTMLElement>('.bing-slider__thumb')!
    const axis = orientation === 'vertical' ? 'y' : 'x'
    for (const [fraction, accepted] of [[1.6, 100], [-0.6, 0]]) {
      await pointer(thumb, 'pointerdown', slider.center())
      const target = slider.point(fraction!)
      await pointer(window, 'pointermove', target)
      const offset = parseFloat(slider.root.style.getPropertyValue('--bing-slider-edge0'))
      const squeeze = Number(slider.root.style.getPropertyValue('--bing-slider-squeeze0'))
      expect(Math.abs(offset)).toBeGreaterThan(3)
      expect(Math.abs(offset)).toBeLessThanOrEqual(6)
      expect(Math.sign(offset)).toBe(Math.sign(target[axis] - slider.point(accepted! / 100)[axis]))
      expect(squeeze).toBeGreaterThanOrEqual(0.9)
      expect(squeeze).toBeLessThan(1)
      await delay(100)
      expect(parseFloat(slider.root.style.getPropertyValue('--bing-slider-edge0'))).toBe(offset)
      expect(Math.abs(slider.center()[axis] - slider.point(accepted! / 100)[axis])).toBeLessThan(0.5)
      const painted = thumb.getBoundingClientRect()
      const paintedCenter = axis === 'x' ? painted.x + painted.width / 2 : painted.y + painted.height / 2
      expect(Math.abs(paintedCenter - slider.center()[axis] - offset)).toBeLessThan(0.5)
      const paintedRatio = axis === 'x' ? painted.width / painted.height : painted.height / painted.width
      expect(Math.abs(paintedRatio - squeeze)).toBeLessThan(0.01)
      expect(slider.inputs()[0]!.value).toBe(String(accepted))
      await pointer(window, 'pointerup', target)
      await expect.poll(() => Math.abs(parseFloat(slider.root.style.getPropertyValue('--bing-slider-edge0')))).toBeLessThan(0.01)
      await expect.poll(() => Math.abs(slider.center()[axis] - slider.point(0.3)[axis])).toBeLessThan(0.5)
    }
    expect(slider.updates.mock.calls).toEqual([[100], [0]])
    expect(slider.changes).not.toHaveBeenCalled()
  })

  it('removes edge feedback when returning in bounds and skips it with reduced motion', async () => {
    const slider = mountSlider({ defaultValue: 70 })
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    await pointer(window, 'pointermove', slider.point(1.5))
    expect(slider.model.value).toBe(100)
    await pointer(window, 'pointermove', slider.point(0.8))
    expect(slider.model.value).toBe(80)
    expect(parseFloat(slider.root.style.getPropertyValue('--bing-slider-edge0'))).toBe(0)
    await pointer(window, 'pointermove', slider.point(1.5))
    slider.reduced.value = true
    await nextTick()
    expect(parseFloat(slider.root.style.getPropertyValue('--bing-slider-edge0'))).toBe(0)
    await pointer(window, 'pointermove', slider.point(2))
    expect(parseFloat(slider.root.style.getPropertyValue('--bing-slider-edge0'))).toBe(0)
    await pointer(window, 'pointerup', slider.point(2))
    expect(slider.changes.mock.calls).toEqual([[100]])
  })

  it.each(['disabled', 'orientation', 'Escape', 'pointercancel', 'lostpointercapture', 'blur'])('cleans up edge feedback on %s', async reason => {
    const slider = mountSlider()
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    await pointer(window, 'pointermove', slider.point(1.5))
    if (reason === 'disabled') slider.live.value = { disabled: true }
    else if (reason === 'orientation') slider.live.value = { orientation: 'vertical' }
    else if (reason === 'Escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    else if (reason === 'blur') window.dispatchEvent(new Event('blur'))
    else await pointer(reason === 'lostpointercapture' ? slider.root : window, reason, slider.point(1.5))
    await expect.poll(() => Math.abs(parseFloat(slider.root.style.getPropertyValue('--bing-slider-edge0')))).toBeLessThan(0.01)
    expect(slider.root.classList.contains('is-dragging')).toBe(false)
    expect(document.documentElement.style.cursor).not.toBe('grabbing')
    if (reason === 'disabled' || reason === 'orientation' || reason === 'Escape') expect(slider.changes).not.toHaveBeenCalled()
  })

  it('kills an edge return animation on unmount', async () => {
    const slider = mountSlider()
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    await pointer(window, 'pointermove', slider.point(1.5))
    await pointer(window, 'pointerup', slider.point(1.5))
    slider.app.unmount()
    const offset = slider.root.style.getPropertyValue('--bing-slider-edge0')
    const item = mounted.splice(mounted.findIndex(item => item.app === slider.app), 1)[0]!
    item.host.remove()
    await delay(280)
    expect(slider.root.style.getPropertyValue('--bing-slider-edge0')).toBe(offset)
    expect(document.documentElement.style.cursor).not.toBe('grabbing')
  })

  it.each([false, true])('resets with a real double click and preserves native focus, reduced=%s', async reduced => {
    const slider = mountSlider({ defaultValue: 80, resetValue: 30 }, { reduced })
    await userEvent.dblClick(slider.root.querySelector<HTMLElement>('.bing-slider__thumb')!)
    expect(slider.model.value).toBe(30)
    expect(slider.changes.mock.calls).toEqual([[30]])
    expect(slider.updates.mock.calls).toEqual([[30]])
    expect(document.activeElement).toBe(slider.inputs()[0])
    await expect.poll(() => Math.abs(slider.center().x - slider.point(0.3).x)).toBeLessThan(0.5)
  })

  it('does not reset when a track double click brings the thumb underneath the second click', async () => {
    const slider = mountSlider({ defaultValue: 20, resetValue: 80 }, { reduced: true })
    await userEvent.dblClick(slider.root)
    expect(slider.model.value).toBe(50)
    expect(slider.updates.mock.calls).toEqual([[50]])
    expect(slider.changes.mock.calls).toEqual([[50]])
  })

  it('keeps native input and change in the same turn synchronized with the accepted visual value', async () => {
    const slider = mountSlider({}, { reduced: true })
    const input = slider.inputs()[0]!
    input.value = '60'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
    await nextTick()
    expect(slider.model.value).toBe(60)
    expect(Math.abs(slider.center().x - slider.point(0.6).x)).toBeLessThan(0.5)
    expect(slider.updates.mock.calls).toEqual([[60]])
    expect(slider.changes.mock.calls).toEqual([[60]])
  })

  it('preserves off-center grabbing, follows outside the control and commits once', async () => {
    const slider = mountSlider({ defaultValue: 40 }, { reduced: true })
    const start = slider.center()
    const thumb = slider.root.querySelector('.bing-slider__thumb')!
    await pointer(thumb, 'pointerdown', { x: start.x + 6, y: start.y })
    expect(slider.updates).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(slider.inputs()[0])
    expect(document.documentElement.style.cursor).toBe('grabbing')
    await pointer(window, 'pointermove', { x: start.x + 6 + 46.4, y: start.y + 120 })
    expect(slider.model.value).toBe(50)
    expect(slider.changes).not.toHaveBeenCalled()
    await pointer(window, 'pointerup', { x: start.x + 52.4, y: start.y + 120 })
    slider.inputs()[0]!.blur()
    await nextTick()
    expect(slider.changes.mock.calls).toEqual([[50]])
    expect(document.documentElement.style.cursor).not.toBe('grabbing')
  })

  it('animates jumps, follows subsequent drag frames immediately and continues interrupted jumps', async () => {
    const slider = mountSlider({ defaultValue: 20 })
    const old = slider.center().x
    await pointer(slider.root, 'pointerdown', slider.point(0.8))
    expect(slider.model.value).toBe(80)
    expect(slider.center().x).toBeLessThan(slider.point(0.8).x)
    await delay(65)
    expect(slider.center().x).toBeGreaterThan(old)
    await pointer(window, 'pointermove', slider.point(0.6))
    expect(Math.abs(slider.center().x - slider.point(0.6).x)).toBeLessThan(0.5)
    await pointer(window, 'pointerup', slider.point(0.6))
    slider.model.value = 100
    await nextTick()
    await delay(50)
    const intermediate = slider.center().x
    slider.model.value = 0
    await nextTick()
    expect(Math.abs(slider.center().x - intermediate)).toBeLessThan(2)
    await expect.poll(() => Math.abs(slider.center().x - slider.point(0).x)).toBeLessThan(0.5)
  })

  it('uses immediate positions with reduced motion and rolls rejected controlled values back', async () => {
    const immediate = mountSlider({}, { reduced: true })
    await pointer(immediate.root, 'pointerdown', immediate.point(0.8))
    expect(Math.abs(immediate.center().x - immediate.point(0.8).x)).toBeLessThan(0.5)
    await pointer(window, 'pointerup', immediate.point(0.8))
    const rejected = mountSlider({ modelValue: 30 }, { reject: true })
    await pointer(rejected.root, 'pointerdown', rejected.point(0.8))
    await pointer(window, 'pointerup', rejected.point(0.8))
    expect(rejected.updates).toHaveBeenCalledWith(80)
    expect(rejected.changes).not.toHaveBeenCalled()
    expect(rejected.inputs()[0]!.value).toBe('30')
    await expect.poll(() => Math.abs(rejected.center().x - rejected.point(0.3).x)).toBeLessThan(0.5)
  })

  it.each([
    { pointerType: 'mouse', reduced: false }, { pointerType: 'touch', reduced: false },
    { pointerType: 'mouse', reduced: true }, { pointerType: 'touch', reduced: true },
  ])('keeps a rejected $pointerType drag stable until release, reduced=$reduced', async ({ pointerType, reduced }) => {
    const slider = mountSlider({ modelValue: 30, tooltip: 'auto', marks: [30, 50, 70] }, { reject: true, reduced })
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center(), pointerType)
    for (const next of [45, 60, 78, 51]) {
      await pointer(window, 'pointermove', slider.point(next / 100), pointerType)
      // 停留多个动画帧，捕捉下一帧回弹或受控重渲染抢占位置的抖动。
      await delay(80)
      expect(Math.abs(slider.center().x - slider.point(next / 100).x)).toBeLessThan(0.5)
      expect(slider.inputs()[0]!.value).toBe(String(next))
      expect(slider.root.querySelector('.bing-slider__tooltip-body')!.textContent).toBe(String(next))
      const fill = slider.root.querySelector('.bing-slider__fill')!.getBoundingClientRect()
      expect(Math.abs(fill.right - slider.center().x)).toBeLessThan(0.5)
      expect(slider.model.value).toBe(30)
      expect(slider.changes).not.toHaveBeenCalled()
    }
    await pointer(window, 'pointerup', slider.point(0.51), pointerType)
    await expect.poll(() => Math.abs(slider.center().x - slider.point(0.3).x)).toBeLessThan(0.5)
    expect(slider.inputs()[0]!.value).toBe('30')
    expect(slider.root.querySelector('.bing-slider__tooltip-body')!.textContent).toBe('30')
    expect(slider.updates.mock.calls).toEqual([[45], [60], [78], [51]])
    expect(slider.changes).not.toHaveBeenCalled()
  })

  it('keeps a rejected range preview constrained and restores the tuple after release', async () => {
    const slider = mountSlider({ range: true, modelValue: [20, 70], minDistance: 10, tooltip: 'always' }, { reject: true })
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    await pointer(window, 'pointermove', slider.point(0.9))
    await delay(80)
    expect(slider.inputs().map(input => input.value)).toEqual(['60', '70'])
    expect(Math.abs(slider.center().x - slider.point(0.6).x)).toBeLessThan(0.5)
    expect(slider.model.value).toEqual([20, 70])
    await pointer(window, 'pointerup', slider.point(0.9))
    await expect.poll(() => Math.abs(slider.center().x - slider.point(0.2).x)).toBeLessThan(0.5)
    expect(slider.inputs().map(input => input.value)).toEqual(['20', '70'])
    expect(slider.changes).not.toHaveBeenCalled()
  })

  it('defers parent corrections while dragging and commits the accepted value on release', async () => {
    const slider = mountSlider({ modelValue: 30 }, { coerce: next => Math.min(Number(next), 50) })
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center())
    for (const next of [60, 80]) {
      await pointer(window, 'pointermove', slider.point(next / 100))
      await delay(80)
      expect(Math.abs(slider.center().x - slider.point(next / 100).x)).toBeLessThan(0.5)
      expect(slider.inputs()[0]!.value).toBe(String(next))
      expect(slider.model.value).toBe(50)
      expect(slider.changes).not.toHaveBeenCalled()
    }
    await pointer(window, 'pointerup', slider.point(0.8))
    await expect.poll(() => Math.abs(slider.center().x - slider.point(0.5).x)).toBeLessThan(0.5)
    expect(slider.inputs()[0]!.value).toBe('50')
    expect(slider.changes.mock.calls).toEqual([[50]])
  })

  it.each(['blur', 'disabled', 'Escape', 'pointercancel', 'lostpointercapture'])('settles rejected previews when dragging ends via %s', async reason => {
    const slider = mountSlider({ modelValue: 30 }, { reject: true, reduced: true })
    const pointerType = reason === 'pointercancel' ? 'touch' : 'mouse'
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center(), pointerType)
    await pointer(window, 'pointermove', slider.point(0.8), pointerType)
    expect(slider.inputs()[0]!.value).toBe('80')
    if (reason === 'blur') window.dispatchEvent(new Event('blur'))
    else if (reason === 'disabled') slider.live.value = { disabled: true }
    else if (reason === 'Escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    else await pointer(reason === 'lostpointercapture' ? slider.root : window, reason, slider.point(0.8), pointerType)
    await expect.poll(() => Math.abs(slider.center().x - slider.point(0.3).x)).toBeLessThan(0.5)
    expect(slider.inputs()[0]!.value).toBe('30')
    expect(slider.changes).not.toHaveBeenCalled()
    expect(document.documentElement.style.cursor).not.toBe('grabbing')
  })

  it('stops an in-flight jump while the thumb is held and finishes at the accepted value on release', async () => {
    const slider = mountSlider({ defaultValue: 20 })
    slider.model.value = 90
    await nextTick()
    await delay(45)
    const grabbed = slider.center()
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', grabbed)
    await delay(80)
    expect(Math.abs(slider.center().x - grabbed.x)).toBeLessThan(0.5)
    expect(slider.updates).not.toHaveBeenCalled()
    await pointer(window, 'pointerup', grabbed)
    await expect.poll(() => Math.abs(slider.center().x - slider.point(0.9).x)).toBeLessThan(0.5)
    expect(slider.changes).not.toHaveBeenCalled()
  })

  it('settles an in-flight jump when the global reduced-motion preference changes', async () => {
    const slider = mountSlider({ defaultValue: 20 })
    slider.model.value = 100
    await nextTick()
    slider.reduced.value = true
    await nextTick()
    expect(Math.abs(slider.center().x - slider.point(1).x)).toBeLessThan(0.5)
    expect(slider.root.classList.contains('is-reduced')).toBe(true)
  })

  it('uses resolved CSS thumb lengths for pointer geometry and preserves the new color tokens', async () => {
    const slider = mountSlider({}, { reduced: true })
    slider.root.style.setProperty('--bing-slider-thumb-size', 'calc(1rem + 8px)')
    slider.root.style.setProperty('--bing-slider-color', 'rgb(20, 130, 190)')
    const root = slider.root.getBoundingClientRect()
    const thumbSize = slider.root.querySelector('.bing-slider__positioner')!.getBoundingClientRect().width
    const target = { x: root.x + thumbSize / 2 + (root.width - thumbSize) * 0.8, y: root.y + 16 }
    await pointer(slider.root, 'pointerdown', target)
    await pointer(window, 'pointerup', target)
    expect(slider.model.value).toBe(80)
    expect(Math.abs(slider.center().x - target.x)).toBeLessThan(0.5)
    expect(getComputedStyle(slider.root.querySelector('.bing-slider__fill')!).backgroundColor).toBe('rgb(20, 130, 190)')
  })

  it('cancels an active touch gesture without committing and ignores other pointers', async () => {
    const slider = mountSlider({ defaultValue: 20 }, { reduced: true })
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center(), 'touch')
    window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 8, clientX: slider.point(0.9).x, clientY: slider.point(0.9).y }))
    expect(slider.model.value).toBe(20)
    await pointer(window, 'pointermove', slider.point(0.5), 'touch')
    expect(slider.model.value).toBe(50)
    await pointer(window, 'pointercancel', slider.point(0.5), 'touch')
    expect(slider.model.value).toBe(20)
    expect(slider.changes).not.toHaveBeenCalled()
  })

  it.each([false, true])('aligns fill endpoints with thumb centers, rtl=%s', async rtl => {
    const slider = mountSlider({}, { reduced: true, rtl })
    for (const value of [0, 1, 50, 99, 100]) {
      slider.model.value = value
      await nextTick()
      const fill = slider.root.querySelector('.bing-slider__fill')!.getBoundingClientRect()
      const start = slider.root.querySelector('.bing-slider__fill-window')!.getBoundingClientRect()
      expect(Math.abs((rtl ? start.left : fill.right) - slider.center().x)).toBeLessThanOrEqual(0.5)
    }
    const range = mountSlider({ range: true, modelValue: [20, 70] }, { reduced: true, rtl })
    const fill = range.root.querySelector('.bing-slider__fill')!.getBoundingClientRect()
    const start = range.root.querySelector('.bing-slider__fill-window')!.getBoundingClientRect()
    expect(Math.abs(start.left - range.center(rtl ? 1 : 0).x)).toBeLessThanOrEqual(0.5)
    expect(Math.abs(fill.right - range.center(rtl ? 0 : 1).x)).toBeLessThanOrEqual(0.5)
  })

  it('defers touch taps, rejects vertical intent and cancellation, and allows horizontal dragging', async () => {
    const slider = mountSlider({}, { reduced: true })
    const start = slider.point(0.8)
    await pointer(slider.root, 'pointerdown', start, 'touch')
    expect(slider.model.value).toBe(20)
    await pointer(window, 'pointerup', start, 'touch')
    expect(slider.changes.mock.calls).toEqual([[80]])
    const next = slider.point(0.3)
    await pointer(slider.root, 'pointerdown', next, 'touch')
    await pointer(window, 'pointermove', { x: next.x + 2, y: next.y + 30 }, 'touch')
    await pointer(window, 'pointercancel', { x: next.x + 2, y: next.y + 30 }, 'touch')
    expect(slider.model.value).toBe(80)
    expect(slider.changes).toHaveBeenCalledTimes(1)
    await pointer(slider.root, 'pointerdown', next, 'touch')
    await pointer(window, 'pointermove', { x: next.x + 5, y: next.y }, 'touch')
    expect(slider.model.value).toBe(80)
    await pointer(window, 'pointermove', slider.point(0.4), 'touch')
    expect(slider.model.value).toBe(40)
    await pointer(window, 'pointerup', slider.point(0.4), 'touch')
    expect(slider.changes.mock.calls).toEqual([[80], [40]])
  })

  it('does not interpret a long touch or a vertical swipe returning to origin as a tap', async () => {
    const slider = mountSlider({}, { reduced: true })
    const point = slider.point(0.8)
    await pointer(slider.root, 'pointerdown', point, 'touch')
    await delay(320)
    await pointer(window, 'pointerup', point, 'touch')
    await pointer(slider.root, 'pointerdown', point, 'touch')
    await pointer(window, 'pointermove', { x: point.x, y: point.y + 20 }, 'touch')
    await pointer(window, 'pointerup', point, 'touch')
    expect(slider.updates).not.toHaveBeenCalled()
    expect(slider.changes).not.toHaveBeenCalled()
  })

  it('reverts Esc to the pointer-down tuple without committing and restores document styles', async () => {
    const previous = document.documentElement.style.cssText
    document.documentElement.style.setProperty('cursor', 'crosshair', 'important')
    document.documentElement.style.setProperty('user-select', 'text')
    try {
      const slider = mountSlider({ range: true, modelValue: [20, 70] }, { reduced: true })
      await pointer(slider.root, 'pointerdown', slider.point(0.5))
      await pointer(window, 'pointermove', slider.point(0.9))
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }))
      await nextTick()
      await pointer(window, 'pointerup', slider.point(0.9))
      expect(slider.model.value).toEqual([20, 70])
      expect(slider.changes).not.toHaveBeenCalled()
      expect(document.documentElement.style.cursor).toBe('crosshair')
      expect(document.documentElement.style.getPropertyPriority('cursor')).toBe('important')
      expect(document.documentElement.style.userSelect).toBe('text')
    } finally { document.documentElement.style.cssText = previous }
  })

  it('cleans up capture, pending commits and global listeners when disabled or unmounted', async () => {
    const slider = mountSlider({}, { reduced: true })
    await pointer(slider.root, 'pointerdown', slider.point(0.8))
    slider.live.value = { disabled: true }
    await nextTick()
    await pointer(window, 'pointerup', slider.point(0.8))
    expect(slider.changes).not.toHaveBeenCalled()
    expect(document.documentElement.style.cursor).not.toBe('grabbing')
    slider.live.value = { disabled: false }
    await nextTick()
    await pointer(slider.root, 'pointerdown', slider.point(0.6))
    const afterUnmount = slider.point(0.1)
    slider.app.unmount()
    await pointer(window, 'pointermove', afterUnmount)
    await pointer(window, 'pointerup', afterUnmount)
    expect(slider.model.value).toBe(60)
    expect(slider.changes).not.toHaveBeenCalled()
    expect(document.documentElement.style.cursor).not.toBe('grabbing')
    mounted.splice(mounted.findIndex(item => item.app === slider.app), 1)[0]!.host.remove()
  })

  it('commits pointercancel and lost capture once for mouse input', async () => {
    const slider = mountSlider({}, { reduced: true })
    await pointer(slider.root, 'pointerdown', slider.point(0.7))
    await pointer(window, 'pointercancel', slider.point(0.7))
    await pointer(slider.root, 'lostpointercapture', slider.point(0.7))
    expect(slider.changes.mock.calls).toEqual([[70]])
    await pointer(slider.root, 'pointerdown', slider.point(0.8))
    await pointer(slider.root, 'lostpointercapture', slider.point(0.8))
    expect(slider.changes.mock.calls).toEqual([[70], [80]])
  })

  it('selects the nearer thumb, enforces distance, and resolves overlaps by drag direction', async () => {
    const slider = mountSlider({ range: true, modelValue: [20, 70], minDistance: 10 }, { reduced: true })
    await pointer(slider.root, 'pointerdown', slider.point(0.85))
    await pointer(window, 'pointerup', slider.point(0.85))
    expect(slider.model.value).toEqual([20, 85])
    await pointer(slider.root.querySelector('.bing-slider__thumb')!, 'pointerdown', slider.center(0))
    await pointer(window, 'pointermove', slider.point(0.95))
    await pointer(window, 'pointerup', slider.point(0.95))
    expect(slider.model.value).toEqual([75, 85])
    slider.live.value = { range: true }
    for (const [start, destination, expected] of [[50, 30, [30, 50]], [50, 70, [50, 70]], [100, 80, [80, 100]]] as const) {
      slider.model.value = [start, start]
      await nextTick()
      await pointer(slider.root.querySelector('.is-top .bing-slider__thumb')!, 'pointerdown', slider.center())
      await pointer(window, 'pointermove', slider.point(destination / 100))
      await pointer(window, 'pointerup', slider.point(destination / 100))
      expect(slider.model.value).toEqual(expected)
    }
  })

  it('keeps native label focus, two tab stops and form serialization', async () => {
    const slider = mountSlider({ range: true, name: 'price', id: 'price-slider', ariaLabel: '价格', modelValue: [20, 70] })
    const form = document.createElement('form')
    const label = document.createElement('label')
    label.htmlFor = 'price-slider'
    label.textContent = '价格区间'
    slider.root.before(form)
    form.append(label, slider.root)
    await userEvent.click(label)
    expect(document.activeElement).toBe(slider.inputs()[0])
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(slider.inputs()[1])
    expect(new FormData(form).getAll('price')).toEqual(['20', '70'])
    expect(slider.exposed.value!.input).toBe(slider.inputs()[0])
    expect(slider.exposed.value!.inputs).toHaveLength(2)
    slider.exposed.value!.focus(0)
    expect(document.activeElement).toBe(slider.inputs()[0])
  })

  it('shows auto tooltips on keyboard focus, keeps the ring on the thumb and hides after blur', async () => {
    const slider = mountSlider({ tooltip: 'auto' }, { reduced: true })
    const thumb = slider.root.querySelector<HTMLElement>('.bing-slider__thumb')!
    expect(slider.root.querySelector('.is-visible')).toBeNull()
    await userEvent.keyboard('{Tab}')
    slider.exposed.value!.focus()
    await nextTick()
    expect(slider.root.querySelector('.bing-slider__tooltip-anchor')!.classList.contains('is-visible')).toBe(true)
    expect(getComputedStyle(thumb).outlineStyle).toBe('solid')
    expect(getComputedStyle(slider.root).outlineStyle).toBe('none')
    await userEvent.keyboard('{ArrowRight}')
    expect(slider.model.value).toBe(21)
    slider.exposed.value!.blur()
    await nextTick()
    expect(slider.root.querySelector('.is-visible')).not.toBeNull()
    await expect.poll(() => slider.root.querySelector('.is-visible')).toBeNull()
  })

  it.each([false, true])('keeps formatted bubbles and mark labels inside both edges, rtl=%s', async rtl => {
    const slider = mountSlider({ tooltip: 'always', formatTooltip: number => number + ' 像素', marks: [{ value: 0, label: '紧凑' }, { value: 100, label: '宽松' }] }, { reduced: true, rtl })
    for (const number of [0, 100]) {
      slider.model.value = number
      await nextTick()
      const root = slider.root.getBoundingClientRect()
      for (const element of slider.root.querySelectorAll('.bing-slider__tooltip, .bing-slider__mark-label')) {
        const rect = element.getBoundingClientRect()
        expect(rect.left).toBeGreaterThanOrEqual(root.left - 0.5)
        expect(rect.right).toBeLessThanOrEqual(root.right + 0.5)
      }
    }
  })

  it.each([['sm', 14, 4, 28], ['md', 16, 5, 32], ['lg', 20, 6, 36]] as const)('renders %s dimensions and all status colors', async (size, thumbSize, trackSize, hitSize) => {
    const slider = mountSlider({ size })
    expect(slider.root.querySelector('.bing-slider__thumb')!.getBoundingClientRect().width).toBe(thumbSize)
    expect(slider.root.querySelector('.bing-slider__rail')!.getBoundingClientRect().height).toBe(trackSize)
    expect(slider.root.getBoundingClientRect().height).toBe(hitSize)
    for (const status of ['success', 'warning', 'error'] as const) {
      slider.live.value = { size, status }
      await nextTick()
      const style = getComputedStyle(slider.root)
      expect(style.getPropertyValue('--bing-slider-color').trim()).toBe(style.getPropertyValue('--bing-' + (status === 'error' ? 'danger' : status)).trim())
    }
  })
})
