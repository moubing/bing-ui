import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick, ref } from 'vue'
import BingScrollbar from './BingScrollbar.vue'
import scrollbarSource from './BingScrollbar.vue?raw'
import type { BingScrollbarExpose } from './BingScrollbar.types'

enableAutoUnmount(afterEach)

function setMetric(element: Element, property: string, value: number) {
  Object.defineProperty(element, property, {
    configurable: true,
    value,
  })
}

function setScrollPosition(element: Element, property: 'scrollLeft' | 'scrollTop', value: number) {
  Object.defineProperty(element, property, {
    configurable: true,
    writable: true,
    value,
  })
}

describe('BingScrollbar', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('自定义视口保留文本框语义，替换元素后公开方法绑定到新视口', async () => {
    const version = ref(0)
    const wrapper = mount(BingScrollbar, {
      props: { smooth: false },
      slots: {
        viewport: ({ viewportRef, viewportAttrs }) => h('textarea', {
          ...viewportAttrs, ref: viewportRef, key: version.value, 'aria-label': '日志内容', rows: 3,
        }),
      },
    })
    const api = wrapper.vm as unknown as BingScrollbarExpose
    const first = wrapper.get('textarea').element
    expect(api.viewport).toBe(first)
    expect(wrapper.find('.bing-scrollbar__viewport').exists()).toBe(false)
    expect(first.getAttribute('aria-label')).toBe('日志内容')
    expect(first.hasAttribute('role')).toBe(false)
    setMetric(first, 'clientHeight', 80)
    setMetric(first, 'scrollHeight', 400)
    setScrollPosition(first, 'scrollTop', 0)
    api.scrollTo(90)
    expect(first.scrollTop).toBe(90)
    await wrapper.get('textarea').trigger('scroll')
    expect(wrapper.emitted('scroll')).toHaveLength(1)

    version.value++
    await nextTick()
    const second = wrapper.get('textarea').element
    expect(api.viewport).toBe(second)
    expect(second).not.toBe(first)
    setMetric(second, 'clientHeight', 80)
    setMetric(second, 'scrollHeight', 400)
    setScrollPosition(second, 'scrollTop', 0)
    api.scrollTo(150)
    expect(second.scrollTop).toBe(150)
    expect(first.scrollTop).toBe(90)
  })

  it('renders slot content and hides the rail without overflow', async () => {
    const wrapper = mount(BingScrollbar, {
      slots: {
        default: '<div>可滚动内容</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element

    setMetric(viewport, 'clientHeight', 120)
    setMetric(viewport, 'scrollHeight', 120)
    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).toContain('可滚动内容')
    expect(wrapper.classes()).not.toContain('has-overflow')
    expect(wrapper.get('.bing-scrollbar__rail').attributes('style')).toContain('display: none')
  })

  it('calculates thumb size and position from native scroll metrics', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        always: true,
        minThumbSize: 28,
      },
      slots: {
        default: '<div style="height: 400px;">Long content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element
    const rail = wrapper.get('.bing-scrollbar__rail').element

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 400)
    setMetric(rail, 'clientHeight', 88)
    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 100,
    })

    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('has-overflow')
    expect(wrapper.get('.bing-scrollbar__thumb').attributes('style')).toContain('height: 28px')
    expect(wrapper.get('.bing-scrollbar__thumb').attributes('style')).toContain(
      'translate(-50%, 20px)',
    )
  })

  it('only puts an overflowing viewport in the tab order when focusable and enabled', async () => {
    const wrapper = mount(BingScrollbar, {
      slots: {
        default: '<div style="height: 400px;">Long content</div>',
      },
    })
    const viewportWrapper = wrapper.get('.bing-scrollbar__viewport')
    const viewport = viewportWrapper.element

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 400)
    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    expect(viewportWrapper.attributes('tabindex')).toBe('0')
    expect(viewportWrapper.attributes('role')).toBe('region')
    expect(viewportWrapper.attributes('aria-label')).toBe('可滚动内容')

    await wrapper.setProps({ focusable: false })
    expect(viewportWrapper.attributes('tabindex')).toBeUndefined()
    expect(viewportWrapper.attributes('role')).toBeUndefined()
    expect(viewportWrapper.attributes('aria-label')).toBeUndefined()

    await wrapper.setProps({ focusable: true, disabled: true })
    expect(viewportWrapper.attributes('tabindex')).toBeUndefined()
  })

  it('emits native scroll events', async () => {
    const wrapper = mount(BingScrollbar, {
      slots: {
        default: '<div>Content</div>',
      },
    })

    await wrapper.get('.bing-scrollbar__viewport').trigger('scroll')

    expect(wrapper.emitted('scroll')).toHaveLength(1)
  })

  it('updates both thumbs without rendering the content again and still reacts to slot data', async () => {
    const text = ref('滚动内容')
    const renderContent = vi.fn(() => h('div', text.value))
    const wrapper = mount(BingScrollbar, {
      props: { horizontal: true },
      slots: { default: renderContent },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element
    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 400)
    setMetric(viewport, 'clientWidth', 200)
    setMetric(viewport, 'scrollWidth', 600)
    setMetric(wrapper.get('.bing-scrollbar__rail--vertical').element, 'clientHeight', 88)
    setMetric(wrapper.get('.bing-scrollbar__rail--horizontal').element, 'clientWidth', 180)
    setScrollPosition(viewport, 'scrollTop', 0)
    setScrollPosition(viewport, 'scrollLeft', 0)
    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await nextTick()
    await wrapper.get('.bing-scrollbar__viewport').trigger('scroll')
    renderContent.mockClear()

    for (const position of [20, 40, 60, 80, 100]) {
      viewport.scrollTop = position
      viewport.scrollLeft = position
      await wrapper.get('.bing-scrollbar__viewport').trigger('scroll')
    }
    expect(renderContent).not.toHaveBeenCalled()
    expect(wrapper.get('.bing-scrollbar__thumb--vertical').attributes('style')).toContain('translate(-50%, 20px)')
    expect(wrapper.get('.bing-scrollbar__thumb--horizontal').attributes('style')).toContain('translate(30px, -50%)')

    text.value = '更新后的内容'
    await nextTick()
    expect(wrapper.text()).toContain('更新后的内容')
    expect(wrapper.get('.bing-scrollbar__thumb--vertical').attributes('style')).toContain('translate(-50%, 20px)')
  })

  it('supports numeric scrollTo through the exposed API', async () => {
    const wrapper = mount(BingScrollbar, {
      slots: {
        default: '<div>Content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 500)
    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 0,
    })

    ;(wrapper.vm as unknown as BingScrollbarExpose).scrollTo(160)
    await wrapper.vm.$nextTick()

    expect(viewport.scrollTop).toBe(160)
  })

  it('calculates horizontal thumb size and position when enabled', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        horizontal: true,
        always: true,
        minThumbSize: 24,
      },
      slots: {
        default: '<div style="width: 600px;">Wide content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element
    const rail = wrapper.get('.bing-scrollbar__rail--horizontal').element

    setMetric(viewport, 'clientWidth', 200)
    setMetric(viewport, 'scrollWidth', 600)
    setMetric(rail, 'clientWidth', 180)
    Object.defineProperty(viewport, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 100,
    })

    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('has-horizontal-overflow')
    expect(wrapper.get('.bing-scrollbar__thumb--horizontal').attributes('style')).toContain(
      'width: 60px',
    )
    expect(wrapper.get('.bing-scrollbar__thumb--horizontal').attributes('style')).toContain(
      'translate(30px, -50%)',
    )
  })

  it('ignores tiny overflow within the configured tolerance', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        horizontal: true,
        always: true,
        overflowTolerance: 8,
      },
      slots: {
        default: '<div style="width: 205px;">Nearly fitting content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element

    setMetric(viewport, 'clientWidth', 200)
    setMetric(viewport, 'scrollWidth', 205)

    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).not.toContain('has-horizontal-overflow')
    expect(wrapper.get('.bing-scrollbar__rail--horizontal').attributes('style')).toContain(
      'display: none',
    )
  })

  it('maps shift wheel movement to horizontal scrolling', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        horizontal: true,
        always: true,
        smooth: false,
      },
      slots: {
        default: '<div style="width: 600px;">Wide content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element
    const rail = wrapper.get('.bing-scrollbar__rail--horizontal').element

    setMetric(viewport, 'clientWidth', 200)
    setMetric(viewport, 'scrollWidth', 600)
    setMetric(rail, 'clientWidth', 180)
    Object.defineProperty(viewport, 'scrollLeft', {
      configurable: true,
      writable: true,
      value: 0,
    })

    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    await wrapper.get('.bing-scrollbar__viewport').trigger('wheel', {
      deltaY: 72,
      shiftKey: true,
    })

    expect(wrapper.classes()).not.toContain('is-smooth')
    expect(viewport.scrollLeft).toBeGreaterThan(0)
    await vi.waitFor(() => {
      expect(Math.round(viewport.scrollLeft)).toBe(72)
    })
  })

  it('turns coarse wheel input into a pulse-eased scroll by default', async () => {
    const wrapper = mount(BingScrollbar, {
      slots: {
        default: '<div style="height: 500px;">Long content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 500)
    setScrollPosition(viewport, 'scrollTop', 0)
    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewport.dispatchEvent(event)

    expect(wrapper.classes()).toContain('is-smooth')
    expect(event.defaultPrevented).toBe(true)
    await vi.waitFor(() => {
      expect(viewport.scrollTop).toBeCloseTo(100, 1)
    })
  })

  it('keeps native vertical wheel behavior available with smooth=false', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        smooth: false,
      },
      slots: {
        default: '<div style="height: 500px;">Long content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 500)
    setScrollPosition(viewport, 'scrollTop', 0)
    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewport.dispatchEvent(event)

    expect(wrapper.classes()).not.toContain('is-smooth')
    expect(event.defaultPrevented).toBe(false)
    expect(viewport.scrollTop).toBe(0)
  })

  it('exposes handleWheel and reports whether the event was consumed', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        horizontal: true,
        smooth: {
          duration: 0,
          respectReducedMotion: false,
          smoothTouchpad: true,
        },
      },
      slots: {
        default: '<div style="height: 500px;">Long content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element
    const scrollbar = wrapper.vm as unknown as BingScrollbarExpose

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 500)
    setMetric(viewport, 'clientWidth', 100)
    setMetric(viewport, 'scrollWidth', 500)
    setScrollPosition(viewport, 'scrollTop', 0)
    setScrollPosition(viewport, 'scrollLeft', 0)
    scrollbar.update()
    await wrapper.vm.$nextTick()

    const smoothWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })

    expect(scrollbar.handleWheel(smoothWheel)).toBe(true)
    expect(smoothWheel.defaultPrevented).toBe(true)
    expect(viewport.scrollTop).toBe(100)

    await wrapper.setProps({ smooth: false })
    expect(wrapper.classes()).toContain('has-horizontal-overflow')
    expect(wrapper.classes()).not.toContain('is-smooth')
    const legacyWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    Object.defineProperty(legacyWheel, 'shiftKey', { configurable: true, value: true })

    expect(legacyWheel.shiftKey).toBe(true)
    expect(scrollbar.handleWheel(legacyWheel)).toBe(true)
    expect(legacyWheel.defaultPrevented).toBe(true)

    scrollbar.stop()
    setScrollPosition(viewport, 'scrollLeft', 400)
    const boundaryWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    Object.defineProperty(boundaryWheel, 'shiftKey', { configurable: true, value: true })

    expect(scrollbar.handleWheel(boundaryWheel)).toBe(false)
    expect(boundaryWheel.defaultPrevented).toBe(false)

    const nativeWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })

    expect(scrollbar.handleWheel(nativeWheel)).toBe(false)
    expect(nativeWheel.defaultPrevented).toBe(false)
  })

  it('allows wheel input to chain outward at the smooth viewport boundary', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        smooth: {
          duration: 32,
          respectReducedMotion: false,
          smoothTouchpad: true,
        },
      },
      slots: {
        default: '<div style="height: 500px;">Long content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 500)
    setScrollPosition(viewport, 'scrollTop', 400)
    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewport.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(viewport.scrollTop).toBe(400)
  })

  it('leaves a nested native scroller in control until it reaches its boundary', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        smooth: {
          duration: 32,
          respectReducedMotion: false,
          smoothTouchpad: true,
        },
      },
      slots: {
        default: `
          <div class="nested-scroll" style="height: 60px; overflow-y: auto;">
            <div style="height: 300px;">Nested content</div>
          </div>
        `,
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element
    const nested = wrapper.get('.nested-scroll').element

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 500)
    setScrollPosition(viewport, 'scrollTop', 0)
    setMetric(nested, 'clientHeight', 60)
    setMetric(nested, 'scrollHeight', 300)
    setScrollPosition(nested, 'scrollTop', 0)
    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    const event = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    nested.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(false)
    expect(viewport.scrollTop).toBe(0)
  })

  it('uses the same smooth queue for keyboard scrolling', async () => {
    const wrapper = mount(BingScrollbar, {
      props: {
        smooth: {
          duration: 32,
          keyboardStep: 48,
          respectReducedMotion: false,
        },
      },
      slots: {
        default: '<div style="height: 500px;">Long content</div>',
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element

    setMetric(viewport, 'clientHeight', 100)
    setMetric(viewport, 'scrollHeight', 500)
    setScrollPosition(viewport, 'scrollTop', 0)
    ;(wrapper.vm as unknown as BingScrollbarExpose).update()
    await wrapper.vm.$nextTick()

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowDown',
    })
    viewport.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    await vi.waitFor(() => {
      expect(viewport.scrollTop).toBeCloseTo(48, 1)
    })
  })

  it('lets vertical wheel gestures chain to outer scrollers', () => {
    const viewportRule = scrollbarSource.match(/\.bing-scrollbar__viewport\s*{[^}]+}/)?.[0] ?? ''

    expect(viewportRule).toContain('overscroll-behavior-x: contain')
    expect(viewportRule).toContain('overscroll-behavior-y: auto')
    expect(viewportRule).not.toContain('overscroll-behavior: contain')
  })

  it('clips the shell without creating a hidden programmatic scroll container', () => {
    const shellRule = scrollbarSource.match(/\.bing-scrollbar\s*{[^}]+}/)?.[0] ?? ''

    expect(shellRule).toContain('overflow: clip')
    expect(shellRule).not.toContain('overflow: hidden')
  })

  it('uses theme channels for the thumb and rail track', () => {
    const railRule = scrollbarSource.match(/\.bing-scrollbar__rail\s*{[^}]+}/)?.[0] ?? ''
    const thumbRule = scrollbarSource.match(/\.bing-scrollbar__thumb\s*{[^}]+}/)?.[0] ?? ''
    const verticalRailRule =
      scrollbarSource.match(/\.bing-scrollbar__rail--vertical\s*{[^}]+}/)?.[0] ?? ''
    const horizontalRailRule =
      scrollbarSource.match(/\.bing-scrollbar__rail--horizontal\s*{[^}]+}/)?.[0] ?? ''
    const verticalThumbRule =
      scrollbarSource.match(/\.bing-scrollbar__thumb--vertical\s*{[^}]+}/)?.[0] ?? ''
    const horizontalThumbRule =
      scrollbarSource.match(/\.bing-scrollbar__thumb--horizontal\s*{[^}]+}/)?.[0] ?? ''

    expect(railRule).toContain('border: 0')
    expect(railRule).toContain('background: rgb(var(--bing-heading-rgb) / 0.075)')
    expect(railRule).not.toContain('box-shadow')
    expect(thumbRule).toContain('var(--bing-heading-rgb)')
    expect(verticalRailRule).toContain('width: 4px')
    expect(horizontalRailRule).toContain('height: 4px')
    expect(verticalThumbRule).toContain('width: 100%')
    expect(horizontalThumbRule).toContain('height: 100%')
    expect(scrollbarSource).not.toContain('width: 6px')
    expect(scrollbarSource).not.toContain('height: 6px')
    expect(thumbRule).not.toContain('linear-gradient')
    expect(scrollbarSource).not.toContain('rgba(244, 114, 182')
    expect(scrollbarSource).not.toContain('rgba(56, 189, 248, 0.46)')
    expect(scrollbarSource).not.toContain('rgba(14, 165, 233, 0.58)')
    expect(scrollbarSource).not.toContain('rgba(100, 116, 139, 0.42)')
    expect(scrollbarSource).not.toContain('rgba(71, 85, 105, 0.56)')
  })
})
