import { enableAutoUnmount, mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BingSplitPane from './BingSplitPane.vue'
import type { BingSplitPaneProps } from './BingSplitPane.types'

enableAutoUnmount(afterEach)
let resize: (width: number) => void
beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) {
      resize = width => callback([{ contentRect: { width } } as ResizeObserverEntry], this as unknown as ResizeObserver)
    }
    observe() {}
    disconnect() {}
  })
})
afterEach(() => vi.unstubAllGlobals())
async function pane(props: BingSplitPaneProps = {}) {
  const wrapper = mount(BingSplitPane, { props: {
    defaultSideSize: 360, minSideSize: 320, maxSideSize: 560, minMainSize: 600, ...props,
  }, slots: { default: '<p>正文</p>', side: '<p>文档属性</p>' } })
  resize(1200)
  await nextTick()
  return wrapper
}
function move(type: string, x = 800, pointerId = 7) {
  window.dispatchEvent(new PointerEvent(type, { pointerId, clientX: x }))
}

describe('BingSplitPane', () => {
  it('preserves the preferred size through container constraints without emitting updates', async () => {
    const wrapper = await pane({ sideSize: 560 })
    const handle = wrapper.get('[role="separator"]')
    expect(handle.attributes('aria-valuenow')).toBe('560')
    resize(1000)
    await nextTick()
    expect(handle.attributes('aria-valuenow')).toBe('400')
    expect(handle.attributes('aria-valuemax')).toBe('400')
    resize(720)
    await nextTick()
    expect(handle.attributes('aria-valuenow')).toBe('120')
    expect(handle.attributes('aria-valuemin')).toBe('120')
    resize(1200)
    await nextTick()
    expect(handle.attributes('aria-valuenow')).toBe('560')
    expect(wrapper.emitted('update:sideSize')).toBeUndefined()
  })

  it('keeps the last measured size while detached or hidden instead of collapsing the side pane', async () => {
    // mount() 未挂入文档，等同 KeepAlive 缓存时被移出的状态。
    const wrapper = await pane({ sideSize: 560 })
    const handle = wrapper.get('[role="separator"]')
    resize(0)
    await nextTick()
    expect(handle.attributes('aria-valuenow')).toBe('560')
    expect(handle.attributes('aria-valuemax')).toBe('560')
    expect(wrapper.attributes('style')).toContain('--bing-split-side-size: 560px')
    resize(1000)
    await nextTick()
    expect(handle.attributes('aria-valuenow')).toBe('400')
    expect(wrapper.emitted('update:sideSize')).toBeUndefined()
  })

  it('cancels an uncommitted drag when the pane becomes hidden', async () => {
    const wrapper = await pane()
    const handle = wrapper.get('[role="separator"]')
    await handle.trigger('pointerdown', { button: 0, isPrimary: true, pointerId: 7, clientX: 840 })
    move('pointermove', 780)
    resize(0)
    await nextTick()
    expect(wrapper.emitted('resize-cancel')?.[0]?.[0]).toMatchObject({ reason: 'container', preferredSize: 360 })
    expect(handle.attributes('aria-valuenow')).toBe('360')
  })

  it('grows the right pane when dragged left, and commits only on matching pointer release', async () => {
    const wrapper = await pane()
    const handle = wrapper.get('[role="separator"]')
    await handle.trigger('pointerdown', { button: 0, isPrimary: true, pointerId: 7, clientX: 840 })
    move('pointermove', 780, 99)
    expect(wrapper.emitted('resize')).toBeUndefined()
    move('pointermove', 780)
    await nextTick()
    expect(handle.attributes('aria-valuenow')).toBe('420')
    expect(wrapper.emitted('update:sideSize')).toBeUndefined()
    move('pointerup', 760)
    await nextTick()
    expect(wrapper.emitted('update:sideSize')).toEqual([[440]])
    expect(wrapper.emitted('resize-end')).toEqual([[{ size: 440, preferredSize: 440, source: 'pointer' }]])
    expect(handle.attributes('aria-valuenow')).toBe('440')
  })

  it.each(['escape', 'pointercancel', 'blur', 'container', 'props', 'unmount'])(
    'cancels uncommitted dragging on %s without saving the draft', async reason => {
      const wrapper = await pane()
      const handle = wrapper.get('[role="separator"]')
      await handle.trigger('pointerdown', { button: 0, isPrimary: true, pointerId: 7, clientX: 840 })
      move('pointermove', 780)
      if (reason === 'escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
      if (reason === 'pointercancel') move('pointercancel')
      if (reason === 'blur') window.dispatchEvent(new Event('blur'))
      if (reason === 'container') resize(1000)
      if (reason === 'props') await wrapper.setProps({ disabled: true })
      if (reason === 'unmount') wrapper.unmount()
      await nextTick()
      expect(wrapper.emitted('resize-cancel')?.[0]?.[0]).toMatchObject({ reason, preferredSize: 360 })
      expect(wrapper.emitted('update:sideSize')).toBeUndefined()
      move('pointerup', 780)
      expect(wrapper.emitted('resize-end')).toBeUndefined()
      if (reason !== 'unmount') expect(handle.attributes('aria-valuenow')).toBe('360')
    },
  )

  it('does not replace a compressed preference after a click without dragging', async () => {
    const wrapper = await pane({ sideSize: 560 })
    resize(1000)
    await nextTick()
    await wrapper.get('[role="separator"]').trigger('pointerdown', { button: 0, isPrimary: true, pointerId: 7, clientX: 600 })
    move('pointerup', 600)
    expect(wrapper.emitted('update:sideSize')).toBeUndefined()
    expect(wrapper.emitted('resize-end')?.[0]?.[0]).toMatchObject({ size: 400, preferredSize: 560 })
  })

  it('supports arrows, boundaries, Enter and double-click reset without mutating controlled state', async () => {
    const wrapper = await pane({ sideSize: 400 })
    const handle = wrapper.get('[role="separator"]')
    for (const [key, value] of [['ArrowLeft', 412], ['ArrowRight', 388], ['Home', 320], ['End', 560], ['Enter', 360]] as const) {
      await handle.trigger('keydown', { key })
      expect(wrapper.emitted('update:sideSize')?.at(-1)).toEqual([value])
      expect(handle.attributes('aria-valuenow')).toBe('400')
    }
    await handle.trigger('dblclick')
    expect(wrapper.emitted('update:sideSize')?.at(-1)).toEqual([360])
    await wrapper.setProps({ disabled: true })
    const count = wrapper.emitted('resize-end')?.length
    await handle.trigger('keydown', { key: 'End' })
    expect(wrapper.emitted('resize-end')).toHaveLength(count!)
  })
})
