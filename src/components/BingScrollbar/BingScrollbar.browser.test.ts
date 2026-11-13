import { describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import BingScrollbar from './BingScrollbar.vue'

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

async function waitFor(condition: () => boolean, timeout = 1_500) {
  const startedAt = performance.now()

  while (!condition()) {
    if (performance.now() - startedAt > timeout) {
      throw new Error('Timed out while waiting for the browser layout to settle')
    }

    await wait(16)
  }
}

describe('BingScrollbar smooth scrolling in a browser', () => {
  it('重放线上 110% 缩放档位后，首格滚轮与后续反向都保留完整惯性', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      render: () => h(BingScrollbar, { height: 180, smooth: { accelerationMax: 1 } },
        { default: () => h('div', { style: 'height: 1400px;' }, '缩放滚轮回归') }),
    })
    try {
      app.mount(host)
      await nextTick()
      const viewport = host.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
      viewport.scrollTop = 300
      for (const sign of [1, -1]) {
        const before = viewport.scrollTop
        const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: sign * 100 / 1.1 })
        Object.defineProperty(event, 'wheelDeltaY', { value: sign * -109 })
        viewport.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
        expect(viewport.scrollTop).toBe(before)
        await waitFor(() => viewport.scrollTop !== before)
        expect(Math.abs(viewport.scrollTop - before)).toBeLessThan(75)
        await waitFor(() => Math.abs(viewport.scrollTop - before - sign * 100 / 1.1 * 100 / 120) < 1)
        await wait(80)
      }
      expect(viewport.scrollTop).toBeCloseTo(300, 0)
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('像素步长变化的鼠标滚轮会接续平滑动画，不会中途切回原生跳动', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const app = createApp({
      render: () => h(BingScrollbar, {
        height: 180,
        smooth: { accelerationMax: 1, respectReducedMotion: false },
      }, { default: () => h('div', { style: 'height: 900px;' }, '连续滚动内容') }),
    })
    try {
      app.mount(host)
      await nextTick()
      const viewport = host.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
      let target = 0
      for (const deltaY of [80, 96, 100]) {
        const before = viewport.scrollTop
        const event = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY })
        Object.defineProperty(event, 'wheelDeltaY', { value: -120 })
        viewport.dispatchEvent(event)
        target += deltaY * 100 / 120
        expect(event.defaultPrevented).toBe(true)
        expect(viewport.scrollTop).toBe(before)
        await waitFor(() => viewport.scrollTop > before)
        expect(viewport.scrollTop).toBeLessThan(target)
        await wait(60)
      }
      await waitFor(() => Math.abs(viewport.scrollTop - target) < 0.5)
      expect(viewport.scrollTop).toBeCloseTo(230, 0)
    } finally {
      app.unmount()
      host.remove()
    }
  })

  it('enables smooth focusable scrolling by default and keeps explicit opt-outs native', async () => {
    const host = document.createElement('div')
    host.style.width = '320px'
    document.body.appendChild(host)

    const app = createApp({
      render: () =>
        h('div', [
          h(
            BingScrollbar,
            { height: 120 },
            {
              default: () => h('div', { style: 'height: 600px;' }, 'Default smooth content'),
            },
          ),
          h(
            BingScrollbar,
            { focusable: false, height: 120, smooth: false },
            {
              default: () => h('div', { style: 'height: 600px;' }, 'Native content'),
            },
          ),
        ]),
    })

    app.mount(host)
    await nextTick()
    await wait(32)

    const scrollbars = host.querySelectorAll<HTMLElement>('.bing-scrollbar')
    const viewports = host.querySelectorAll<HTMLElement>('.bing-scrollbar__viewport')

    expect(scrollbars).toHaveLength(2)
    expect(scrollbars[0].classList.contains('is-smooth')).toBe(true)
    expect(viewports[0].tabIndex).toBe(0)
    expect(scrollbars[1].classList.contains('is-smooth')).toBe(false)
    expect(viewports[1].hasAttribute('tabindex')).toBe(false)

    const smoothWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewports[0].dispatchEvent(smoothWheel)

    const nativeWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewports[1].dispatchEvent(nativeWheel)

    expect(smoothWheel.defaultPrevented).toBe(true)
    expect(nativeWheel.defaultPrevented).toBe(false)

    app.unmount()
    host.remove()
  })

  it('animates the viewport and releases the wheel at the lower boundary', async () => {
    const host = document.createElement('div')
    host.style.width = '320px'
    document.body.appendChild(host)

    const app = createApp({
      render: () =>
        h(
          BingScrollbar,
          {
            always: true,
            height: 180,
            smooth: {
              duration: 600,
              accelerationMax: 1,
              respectReducedMotion: false,
              smoothTouchpad: true,
            },
          },
          {
            default: () =>
              h('div', { style: 'height: 900px; padding: 12px;' }, 'Smooth browser content'),
          },
        ),
    })

    app.mount(host)
    await nextTick()
    await wait(32)

    const viewport = host.querySelector<HTMLElement>('.bing-scrollbar__viewport')
    expect(viewport).not.toBeNull()
    expect(host.querySelector('.bing-scrollbar')?.classList.contains('is-smooth')).toBe(true)
    expect(viewport!.scrollHeight).toBeGreaterThan(viewport!.clientHeight)

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewport!.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(true)
    await waitFor(() => viewport!.scrollTop > 0)
    expect(viewport!.scrollTop).toBeGreaterThan(0)
    expect(viewport!.scrollTop).toBeLessThan(100)

    await wait(650)
    expect(viewport!.scrollTop).toBeCloseTo(100, 1)

    viewport!.scrollTop = viewport!.scrollHeight - viewport!.clientHeight
    const boundaryWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewport!.dispatchEvent(boundaryWheel)

    expect(boundaryWheel.defaultPrevented).toBe(false)

    app.unmount()
    host.remove()
  })

  it('lets nested BingScrollbar instances hand wheel control to each other at boundaries', async () => {
    const host = document.createElement('div')
    host.style.width = '360px'
    document.body.appendChild(host)

    const smooth = {
      duration: 120,
      accelerationMax: 1,
      respectReducedMotion: false,
      smoothTouchpad: true,
    }
    const app = createApp({
      render: () =>
        h(
          BingScrollbar,
          { always: true, height: 260, smooth },
          {
            default: () => [
              h('div', { style: 'height: 120px;' }, 'Outer beginning'),
              h(
                BingScrollbar,
                { always: true, height: 120, smooth },
                {
                  default: () => h('div', { style: 'height: 600px;' }, 'Inner content'),
                },
              ),
              h('div', { style: 'height: 520px;' }, 'Outer ending'),
            ],
          },
        ),
    })

    app.mount(host)
    await nextTick()
    await wait(32)

    const viewports = host.querySelectorAll<HTMLElement>('.bing-scrollbar__viewport')
    const outerViewport = viewports[0]
    const innerViewport = viewports[1]

    expect(viewports).toHaveLength(2)

    const innerWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    innerViewport.dispatchEvent(innerWheel)

    expect(innerWheel.defaultPrevented).toBe(true)
    await wait(180)
    expect(innerViewport.scrollTop).toBeCloseTo(100, 1)
    expect(outerViewport.scrollTop).toBe(0)

    innerViewport.scrollTop = innerViewport.scrollHeight - innerViewport.clientHeight
    const chainedWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    innerViewport.dispatchEvent(chainedWheel)

    expect(chainedWheel.defaultPrevented).toBe(true)
    await wait(180)
    expect(innerViewport.scrollTop).toBeCloseTo(
      innerViewport.scrollHeight - innerViewport.clientHeight,
      1,
    )
    expect(outerViewport.scrollTop).toBeCloseTo(100, 1)

    app.unmount()
    host.remove()
  })
})
