import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import type { BingScrollbarExpose } from '../components/BingScrollbar/BingScrollbar.types'
import { VIRTUAL_LIST_PADDING_Y, useVirtualList } from './useVirtualList'

function createScrollbar(viewport: { scrollTop: number; clientHeight: number }) {
  return {
    viewport,
    scrollTo: vi.fn((top: number) => {
      viewport.scrollTop = top
    }),
    stop: vi.fn(),
    update: vi.fn(),
  } as unknown as BingScrollbarExpose
}

function setup(overrides: { count?: number; mode?: boolean | 'auto'; threshold?: number } = {}) {
  const count = ref(overrides.count ?? 100)
  const viewport = { scrollTop: 0, clientHeight: 200 }
  const scrollbar = ref<BingScrollbarExpose | null>(createScrollbar(viewport))
  const list = useVirtualList({
    count: () => count.value,
    mode: () => overrides.mode ?? 'auto',
    threshold: () => overrides.threshold ?? 50,
    itemHeight: () => 40,
    overscan: () => 2,
    scrollbar,
    fallbackViewportHeight: ref(200),
    itemHeightVar: '--test-item-height',
  })

  return { count, viewport, scrollbar, list }
}

describe('useVirtualList', () => {
  it('enables by mode and threshold', () => {
    expect(setup({ count: 50 }).list.enabled.value).toBe(false)
    expect(setup({ count: 51 }).list.enabled.value).toBe(true)
    expect(setup({ count: 1, mode: true }).list.enabled.value).toBe(true)
    expect(setup({ count: 0, mode: true }).list.enabled.value).toBe(false)
    expect(setup({ count: 500, mode: false }).list.enabled.value).toBe(false)
  })

  it('renders every item when disabled', () => {
    const { list } = setup({ count: 10 })

    expect(list.startIndex.value).toBe(0)
    expect(list.endIndex.value).toBe(10)
    expect(list.bodyStyle.value).toBeUndefined()
    expect(list.getContentHeight()).toBeUndefined()
  })

  it('computes the window with overscan from the scroll position', () => {
    const { list, viewport } = setup()

    viewport.scrollTop = 400
    list.sync()

    expect(list.startIndex.value).toBe(8)
    expect(list.endIndex.value).toBe(17)
    expect(list.bodyStyle.value).toMatchObject({
      height: `${4000 + VIRTUAL_LIST_PADDING_Y}px`,
      '--test-item-height': '40px',
    })
    expect(list.stackStyle.value).toEqual({ transform: `translate3d(0, ${320 + VIRTUAL_LIST_PADDING_Y / 2}px, 0)` })
  })

  it('clamps the scroll position when the list shrinks', () => {
    const { list, viewport, count, scrollbar } = setup()

    viewport.scrollTop = 3000
    list.sync()
    count.value = 60
    list.clampScroll()

    expect(scrollbar.value?.scrollTo).toHaveBeenCalledWith(2200)
    expect(list.scrollTop.value).toBe(2200)
  })

  it('scrolls an index into view only when needed', () => {
    const { list, viewport, scrollbar } = setup()
    const beforeScroll = vi.fn()

    expect(list.scrollToIndex(2, { beforeScroll })).toBe(true)
    expect(beforeScroll).not.toHaveBeenCalled()

    list.scrollToIndex(20, { beforeScroll })
    expect(beforeScroll).toHaveBeenCalledTimes(1)
    expect(scrollbar.value?.scrollTo).toHaveBeenLastCalledWith(20 * 40 + VIRTUAL_LIST_PADDING_Y / 2 + 40 - 200)
    expect(list.scrollTop.value).toBe(viewport.scrollTop)

    list.scrollToIndex(0, { offsetTop: 0 })
    expect(scrollbar.value?.scrollTo).toHaveBeenLastCalledWith(0)
    expect(list.scrollToIndex(-1)).toBe(false)
  })
})
