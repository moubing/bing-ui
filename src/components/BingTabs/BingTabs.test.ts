import { enableAutoUnmount, mount } from '@vue/test-utils'
import { gsap } from 'gsap'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import BingTabs from './BingTabs.vue'
import type { BingTabItem } from './BingTabs.types'

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
})

const items: BingTabItem[] = [
  { value: 'overview', label: 'Overview' },
  { value: 'details', label: 'Details' },
  { value: 'metrics', label: 'Metrics' },
]

function rect(left: number, top: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  }
}

async function waitForAnimationFrame() {
  await new Promise((resolve) => setTimeout(resolve, 20))
  await nextTick()
}

describe('BingTabs', () => {
  it('smooths horizontal wheel scrolling by default and supports opting out', async () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-tabs').element as HTMLElement

    Object.defineProperties(root, {
      clientWidth: { value: 160, configurable: true },
      scrollWidth: { value: 480, configurable: true },
    })

    const smoothWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 120,
    })
    root.dispatchEvent(smoothWheel)

    expect(smoothWheel.defaultPrevented).toBe(true)

    await wrapper.setProps({ smoothScroll: false })

    const nativeWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 120,
    })
    root.dispatchEvent(nativeWheel)

    expect(nativeWheel.defaultPrevented).toBe(false)
    const shiftedWheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120, shiftKey: true })
    root.dispatchEvent(shiftedWheel)
    expect(shiftedWheel.defaultPrevented).toBe(false)
  })

  it('leaves vertical wheel input native', () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-tabs').element as HTMLElement

    Object.defineProperties(root, {
      clientWidth: { value: 160, configurable: true },
      scrollWidth: { value: 480, configurable: true },
    })

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    root.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(false)
  })

  it('keeps native horizontal touchpad scrolling from reaching a parent gesture handler', () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-tabs').element as HTMLElement
    const parent = root.parentElement as HTMLElement
    const parentWheel = vi.fn()

    Object.defineProperties(root, {
      clientWidth: { value: 160, configurable: true },
      scrollWidth: { value: 480, configurable: true },
      scrollLeft: { value: 0, writable: true, configurable: true },
    })
    parent.addEventListener('wheel', parentWheel)

    const touchpadWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 2,
    })
    root.dispatchEvent(touchpadWheel)

    expect(touchpadWheel.defaultPrevented).toBe(false)
    expect(parentWheel).not.toHaveBeenCalled()

    parent.removeEventListener('wheel', parentWheel)
  })

  it('cancels wheel animation before keyboard focus moves to another tab', () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-tabs').element as HTMLElement
    const cancelFrame = vi.spyOn(window, 'cancelAnimationFrame')

    Object.defineProperties(root, {
      clientWidth: { value: 160, configurable: true },
      scrollWidth: { value: 480, configurable: true },
      scrollLeft: { value: 0, writable: true, configurable: true },
    })

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 120,
    })
    root.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)

    cancelFrame.mockClear()
    wrapper.findAll('[role="tab"]')[0].element.dispatchEvent(
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'ArrowRight',
      }),
    )

    expect(cancelFrame).toHaveBeenCalled()
  })

  it('renders tabs and marks the active item', () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
        modelValue: 'details',
      },
    })

    expect(wrapper.findAll('[role="tab"]')).toHaveLength(3)
    expect(wrapper.findAll('.bing-tabs__tab-surface')).toHaveLength(3)
    expect(wrapper.get('[aria-selected="true"]').text()).toBe('Details')
    expect(wrapper.get('.bing-tabs').classes()).toContain('bing-tabs--pill')
  })

  it('emits v-model and change payload on click', async () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
        modelValue: 'overview',
      },
    })

    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['details']])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      value: 'details',
      previousValue: 'overview',
      item: items[1],
      previousItem: items[0],
    })
  })

  it('does not emit from disabled tabs', async () => {
    const wrapper = mount(BingTabs, {
      props: {
        items: [
          items[0],
          { ...items[1], disabled: true },
          items[2],
        ],
        modelValue: 'overview',
      },
    })

    await wrapper.findAll('[role="tab"]')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.findAll('[role="tab"]')[1].attributes()).toHaveProperty('disabled')
  })

  it('supports arrow-key activation and skips disabled items', async () => {
    const wrapper = mount(BingTabs, {
      props: {
        items: [
          items[0],
          { ...items[1], disabled: true },
          items[2],
        ],
        modelValue: 'overview',
      },
      attachTo: document.body,
    })

    await wrapper.findAll('[role="tab"]')[0].trigger('keydown', { key: 'ArrowRight' })

    expect(wrapper.emitted('update:modelValue')).toEqual([['metrics']])
  })

  it('keeps focus movement separate when activation is manual', async () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
        modelValue: 'overview',
        activation: 'manual',
      },
      attachTo: document.body,
    })

    const tabButtons = wrapper.findAll('[role="tab"]')
    await tabButtons[0].trigger('keydown', { key: 'ArrowRight' })

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(tabButtons[1].element).toBe(document.activeElement)

    await tabButtons[1].trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toEqual([['details']])
  })

  it('keeps auto activation focus on the active tab when a controlled update is rejected', async () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
        modelValue: 'overview',
      },
      attachTo: document.body,
    })

    const tabButtons = wrapper.findAll('[role="tab"]')
    const tabElements = tabButtons.map((tab) => tab.element as HTMLButtonElement)
    tabElements[0].focus()

    await tabButtons[0].trigger('keydown', { key: 'ArrowRight' })
    await nextTick()

    expect(wrapper.emitted('update:modelValue')).toEqual([['details']])
    expect(tabElements[0]).toBe(document.activeElement)
    expect(tabButtons[0].attributes('tabindex')).toBe('0')
    expect(tabButtons[1].attributes('tabindex')).toBe('-1')
  })

  it('syncs auto activation focus when the controlled active tab changes externally', async () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
        modelValue: 'overview',
      },
      attachTo: document.body,
    })

    const tabButtons = wrapper.findAll('[role="tab"]')
    const tabElements = tabButtons.map((tab) => tab.element as HTMLButtonElement)
    tabElements[0].focus()

    await wrapper.setProps({ modelValue: 'metrics' })
    await nextTick()

    expect(tabElements[2]).toBe(document.activeElement)
    expect(tabButtons[2].attributes('tabindex')).toBe('0')
    expect(tabButtons[0].attributes('tabindex')).toBe('-1')
  })

  it('animates the active indicator with GSAP transforms', async () => {
    const fromTo = vi.spyOn(gsap, 'fromTo')
    const wrapper = mount(BingTabs, {
      props: {
        items,
        modelValue: 'overview',
      },
      attachTo: document.body,
    })

    const root = wrapper.get('.bing-tabs').element as HTMLElement
    const indicator = wrapper.get('.bing-tabs__indicator').element as HTMLElement
    const tabs = wrapper.findAll('[role="tab"]').map((tab) => tab.element as HTMLElement)
    const surfaces = tabs.map(
      (tab) => tab.querySelector('.bing-tabs__tab-surface') as HTMLElement,
    )

    root.getBoundingClientRect = () => rect(0, 0, 320, 52)
    Object.defineProperty(root, 'clientLeft', { value: 1, configurable: true })
    Object.defineProperty(root, 'clientTop', { value: 1, configurable: true })
    tabs[0].getBoundingClientRect = () => rect(4, 6, 96, 40)
    tabs[1].getBoundingClientRect = () => rect(102, 6, 100, 40)
    surfaces[0].getBoundingClientRect = () => rect(6, 6, 92, 40)
    surfaces[1].getBoundingClientRect = () => rect(104, 6, 96, 40)
    indicator.getBoundingClientRect = () => rect(6, 6, 92, 40)

    await wrapper.setProps({ modelValue: 'details' })
    await waitForAnimationFrame()

    const indicatorCall = fromTo.mock.calls.find(([target]) => target === indicator)
    const contentElements = tabs.map((tab) => tab.querySelector('.bing-tabs__tab-content'))

    expect(indicatorCall?.[1]).toMatchObject({
      x: 5,
      y: 5,
    })
    expect(indicatorCall?.[2]).toMatchObject({
      x: 103,
      y: 5,
      scaleX: 1,
      scaleY: 1,
      duration: 0.42,
    })
    expect(indicator.style.width).toBe('96px')
    expect(indicator.style.height).toBe('40px')
    expect(fromTo.mock.calls.some(([target]) => contentElements.includes(target as Element))).toBe(false)
  })

  it('converts indicator measurements back to layout pixels inside a scaled container', async () => {
    const fromTo = vi.spyOn(gsap, 'fromTo')
    const wrapper = mount(BingTabs, {
      props: {
        items,
        modelValue: 'overview',
      },
      attachTo: document.body,
    })

    const root = wrapper.get('.bing-tabs').element as HTMLElement
    const indicator = wrapper.get('.bing-tabs__indicator').element as HTMLElement
    const tabs = wrapper.findAll('[role="tab"]').map((tab) => tab.element as HTMLElement)
    const surfaces = tabs.map(
      (tab) => tab.querySelector('.bing-tabs__tab-surface') as HTMLElement,
    )

    // 与上一个用例相同的布局，但整体处在 transform: scale(2) 的容器里：视口矩形全部翻倍，布局尺寸不变。
    Object.defineProperty(root, 'offsetWidth', { value: 320, configurable: true })
    Object.defineProperty(root, 'offsetHeight', { value: 52, configurable: true })
    Object.defineProperty(root, 'clientLeft', { value: 1, configurable: true })
    Object.defineProperty(root, 'clientTop', { value: 1, configurable: true })
    root.getBoundingClientRect = () => rect(0, 0, 640, 104)
    surfaces[0].getBoundingClientRect = () => rect(12, 12, 184, 80)
    surfaces[1].getBoundingClientRect = () => rect(208, 12, 192, 80)
    indicator.getBoundingClientRect = () => rect(12, 12, 184, 80)

    await wrapper.setProps({ modelValue: 'details' })
    await waitForAnimationFrame()

    const indicatorCall = fromTo.mock.calls.find(([target]) => target === indicator)

    expect(indicatorCall?.[1]).toMatchObject({ x: 5, y: 5, scaleX: expect.closeTo(92 / 96, 5), scaleY: 1 })
    expect(indicatorCall?.[2]).toMatchObject({ x: 103, y: 5, scaleX: 1, scaleY: 1 })
    expect(indicator.style.width).toBe('96px')
    expect(indicator.style.height).toBe('40px')
  })

  it('supports custom item slot content', () => {
    const wrapper = mount(BingTabs, {
      props: {
        items,
        modelValue: 'overview',
      },
      slots: {
        item: '<template #item="{ item }"><strong>{{ item.label }}</strong></template>',
      },
    })

    expect(wrapper.findAll('strong')).toHaveLength(3)
  })
})
