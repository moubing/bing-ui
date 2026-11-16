import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingTabs from './BingTabs.vue'
import BingButton from '../BingButton/BingButton.vue'
import type { BingTabItem, BingTabValue } from './BingTabs.types'

interface MountedTabs {
  app: App<Element>
  changes: BingTabValue[]
  host: HTMLElement
}

const mountedTabs: MountedTabs[] = []

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

async function waitFor(condition: () => boolean, timeout = 1_500) {
  const startedAt = performance.now()

  while (!condition()) {
    if (performance.now() - startedAt > timeout) {
      throw new Error('Timed out while waiting for the tabs layout to settle')
    }

    await wait(16)
  }
}

function mountTabs(items: BingTabItem[], block = false) {
  const host = document.createElement('div')
  const modelValue = ref<BingTabValue>(items[2].value)
  const changes: BingTabValue[] = []

  host.style.width = '520px'
  host.style.margin = '80px'
  document.body.appendChild(host)

  const app = createApp({
    render: () =>
      h(BingTabs, {
        animated: false,
        block,
        items,
        modelValue: modelValue.value,
        smoothScroll: false,
        'onUpdate:modelValue': (value: BingTabValue) => {
          modelValue.value = value
          changes.push(value)
        },
      }),
  })

  app.mount(host)
  mountedTabs.push({ app, changes, host })

  return { changes, host }
}

function getSurface(tab: HTMLElement) {
  const surface = tab.querySelector<HTMLElement>('.bing-tabs__tab-surface')

  if (!surface) {
    throw new Error('Expected the tab visual surface to be rendered')
  }

  return surface
}

function expectRectsToMatch(actual: DOMRect, expected: DOMRect, tolerance = 0.55) {
  expect(Math.abs(actual.left - expected.left)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.top - expected.top)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.width - expected.width)).toBeLessThanOrEqual(tolerance)
  expect(Math.abs(actual.height - expected.height)).toBeLessThanOrEqual(tolerance)
}

afterEach(() => {
  mountedTabs.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
})

describe('BingTabs hit areas in a browser', () => {
  for (const size of ['sm', 'md', 'lg'] as const) {
    it(`centers ${size} tabs with toolbar content before and after horizontal overflow`, async () => {
      const host = document.createElement('div')
      host.style.cssText = 'display:flex;align-items:center;gap:12px;width:700px;margin:20px;font-size:14px;line-height:20px'
      document.body.appendChild(host)
      const app = createApp({ render: () => [
        h('span', { 'data-alignment-key': '', style: 'flex-shrink:0;font-size:12px;line-height:18px' }, 'REQ-11'),
        h(BingTabs, { size, variant: 'soft', animated: false, items: [
          { value: 'edit', label: '需求文档正文' }, { value: 'diff', label: '需求版本比较' },
        ] }),
        h(BingButton, { size: 'sm', style: 'flex-shrink:0' }, () => '保存版本'),
      ] })
      app.mount(host)
      mountedTabs.push({ app, host, changes: [] })
      await nextTick()
      const scroll = host.querySelector<HTMLElement>('.bing-tabs__scroll')!
      const tabs = host.querySelector<HTMLElement>('[role="tablist"]')!
      const key = host.querySelector<HTMLElement>('[data-alignment-key]')!
      const save = host.querySelector<HTMLElement>('.bing-button')!
      const center = (element: HTMLElement) => {
        const rect = element.getBoundingClientRect()
        return rect.top + rect.height / 2
      }
      const checkAlignment = () => {
        for (const element of [scroll, key, save]) {
          expect(Math.abs(center(tabs) - center(element))).toBeLessThanOrEqual(0.55)
        }
      }
      await waitFor(() => tabs.classList.contains('is-indicator-ready'))
      expect(scroll.classList.contains('has-horizontal-overflow')).toBe(false)
      const height = scroll.getBoundingClientRect().height
      checkAlignment()
      host.style.width = '260px'
      await expect.poll(() => scroll.classList.contains('has-horizontal-overflow')).toBe(true)
      checkAlignment()
      expect(scroll.getBoundingClientRect().height).toBe(height)
      const rail = scroll.querySelector<HTMLElement>('.bing-scrollbar__rail--horizontal')!
      expect(rail.getBoundingClientRect().top).toBeGreaterThanOrEqual(tabs.getBoundingClientRect().bottom)
      expect(rail.getBoundingClientRect().bottom).toBeLessThanOrEqual(scroll.getBoundingClientRect().bottom)
      host.style.width = '700px'
      host.style.zoom = '1.25'
      await expect.poll(() => scroll.classList.contains('has-horizontal-overflow')).toBe(false)
      checkAlignment()
    })
  }

  it('keeps visual spacing while making adjacent tabs continuously clickable', async () => {
    const items: BingTabItem[] = [
      { label: 'Overview', value: 'overview' },
      { label: 'Details', value: 'details' },
      { label: 'Metrics', value: 'metrics' },
    ]
    const { changes, host } = mountTabs(items)

    await nextTick()
    await waitFor(() => host.querySelector('.bing-tabs')?.classList.contains('is-indicator-ready') ?? false)

    const tabs = Array.from(host.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    const first = tabs[0]
    const second = tabs[1]
    const third = tabs[2]
    const firstRect = first.getBoundingClientRect()
    const secondRect = second.getBoundingClientRect()
    const firstSurfaceRect = getSurface(first).getBoundingClientRect()
    const secondSurfaceRect = getSurface(second).getBoundingClientRect()
    const y = firstSurfaceRect.top + firstSurfaceRect.height / 2
    const beforeSecond = document.elementFromPoint(secondRect.left - 1, y) as HTMLElement | null
    const afterFirst = document.elementFromPoint(firstRect.right + 1, y) as HTMLElement | null

    expect(secondRect.left - firstRect.right).toBeCloseTo(0, 1)
    expect(secondSurfaceRect.left - firstSurfaceRect.right).toBeCloseTo(4, 1)
    expect(beforeSecond?.closest('[role="tab"]')).toBe(first)
    expect(afterFirst?.closest('[role="tab"]')).toBe(second)
    expect(getComputedStyle(beforeSecond!).cursor).toBe('pointer')
    expect(getComputedStyle(afterFirst!).cursor).toBe('pointer')

    expectRectsToMatch(
      host.querySelector<HTMLElement>('.bing-tabs__indicator')!.getBoundingClientRect(),
      getSurface(third).getBoundingClientRect(),
    )

    afterFirst!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: firstRect.right + 1,
        clientY: y,
      }),
    )
    await nextTick()
    await waitFor(() => second.getAttribute('aria-selected') === 'true')
    await wait(32)

    expectRectsToMatch(
      host.querySelector<HTMLElement>('.bing-tabs__indicator')!.getBoundingClientRect(),
      getSurface(second).getBoundingClientRect(),
    )

    beforeSecond!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: secondRect.left - 1,
        clientY: y,
      }),
    )
    await nextTick()

    expect(changes).toEqual(['details', 'overview'])
    expect(first.getAttribute('aria-selected')).toBe('true')
  })

  it('distributes block tabs evenly without reintroducing hit gaps', async () => {
    const items: BingTabItem[] = [
      { label: 'Overview', value: 'overview' },
      { label: 'Details', value: 'details' },
      { label: 'Metrics', value: 'metrics' },
    ]
    const { host } = mountTabs(items, true)

    await nextTick()
    await waitFor(() => host.querySelector('.bing-tabs')?.classList.contains('is-indicator-ready') ?? false)

    const root = host.querySelector<HTMLElement>('.bing-tabs')!
    const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
    const firstRect = tabs[0].getBoundingClientRect()
    const secondRect = tabs[1].getBoundingClientRect()
    const thirdRect = tabs[2].getBoundingClientRect()
    const firstSurfaceRect = getSurface(tabs[0]).getBoundingClientRect()
    const secondSurfaceRect = getSurface(tabs[1]).getBoundingClientRect()

    expect(root.classList).toContain('is-block')
    expect(secondRect.left - firstRect.right).toBeCloseTo(0, 1)
    expect(secondSurfaceRect.left - firstSurfaceRect.right).toBeCloseTo(4, 1)
    expect(firstRect.width).toBeCloseTo(secondRect.width, 1)
    expect(secondRect.width).toBeCloseTo(thirdRect.width, 1)
    expect(thirdRect.right).toBeLessThanOrEqual(root.getBoundingClientRect().right)
  })
})


it('keeps the indicator under the selected tab after scrolling and resizing', async () => {
  const { host } = mountTabs(Array.from({ length: 12 }, (_, i) => ({ value: i, label: '工作区 ' + (i + 1) })))
  host.style.width = '240px'
  await nextTick()
  await waitFor(() => host.querySelector('.bing-tabs')?.classList.contains('is-indicator-ready') ?? false)
  const root = host.querySelector<HTMLElement>('.bing-tabs')!
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  const indicator = root.querySelector<HTMLElement>('.bing-tabs__indicator')!
  const scrollbar = host.querySelector('.bing-tabs__scroll')!
  await expect.poll(() => scrollbar.classList.contains('has-horizontal-overflow')).toBe(true)
  expect(getComputedStyle(root).scrollbarWidth).toBe('none')
  const rail = scrollbar.querySelector<HTMLElement>('.bing-scrollbar__rail--horizontal')!
  expect(rail.getBoundingClientRect().top).toBeGreaterThanOrEqual(root.getBoundingClientRect().bottom)
  tabs[0].focus()
  tabs[0].dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
  await nextTick()
  await wait(50)
  expect(root.scrollLeft).toBeGreaterThan(0)
  expect(tabs[11].getAttribute('aria-selected')).toBe('true')
  expectRectsToMatch(indicator.getBoundingClientRect(), getSurface(tabs[11]).getBoundingClientRect())
  host.style.width = '320px'
  await wait(100)
  expectRectsToMatch(indicator.getBoundingClientRect(), getSurface(tabs[11]).getBoundingClientRect())
  tabs[11].dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
  await nextTick()
  await wait(50)
  expect(tabs[0].getAttribute('aria-selected')).toBe('true')
  expectRectsToMatch(indicator.getBoundingClientRect(), getSurface(tabs[0]).getBoundingClientRect())
})

it.each([0.75, 1.34, 2])('keeps the indicator under the selected tab inside a container scaled by %s', async (scale) => {
  const { host } = mountTabs(Array.from({ length: 4 }, (_, i) => ({ value: i, label: '工作区 ' + (i + 1) })))
  host.style.transform = 'scale(' + scale + ')'
  host.style.transformOrigin = '0 0'
  const root = host.querySelector<HTMLElement>('.bing-tabs')!
  const tabs = Array.from(root.querySelectorAll<HTMLButtonElement>('[role="tab"]'))
  const indicator = root.querySelector<HTMLElement>('.bing-tabs__indicator')!
  // 指示器宽高会被取整到整数布局像素，这部分误差随容器一起放大，容差按缩放比例换算。
  const tolerance = 0.55 * Math.max(1, scale)
  // 缩放发生在首次定位之后：点击切换时重新测量，必须落在缩放后的标签上。
  await waitFor(() => root.classList.contains('is-indicator-ready'))
  tabs[0].click()
  await nextTick()
  await wait(50)
  expect(tabs[0].getAttribute('aria-selected')).toBe('true')
  expect(host.getBoundingClientRect().width).toBeCloseTo(520 * scale, 1)
  expectRectsToMatch(indicator.getBoundingClientRect(), getSurface(tabs[0]).getBoundingClientRect(), tolerance)
  tabs[3].click()
  await nextTick()
  await wait(50)
  expectRectsToMatch(indicator.getBoundingClientRect(), getSurface(tabs[3]).getBoundingClientRect(), tolerance)
})
