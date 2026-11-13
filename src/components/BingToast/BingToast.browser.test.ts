import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick } from 'vue'
import type { App } from 'vue'
import { gsap } from 'gsap'
import BingToast from './BingToast.vue'
import { bingToast } from './BingToast.service'
import type { BingToastRenderPosition } from './BingToast.types'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined

function toast(message: string) {
  return Array.from(document.querySelectorAll<HTMLElement>('.bing-toast'))
    .find(element => element.querySelector('.bing-toast__message')?.textContent === message)!
}

function card(element: HTMLElement) {
  return element.querySelector<HTMLElement>('.bing-toast__card')!
}

async function settle() {
  await nextTick()
  gsap.getTweensOf(document.querySelectorAll('.bing-toast, .bing-toast__card'))
    .forEach(tween => tween.progress(1))
  await nextTick()
}

async function mountStack(position: BingToastRenderPosition = 'top-right') {
  host = document.createElement('div')
  document.body.append(host)
  app = createApp({ render: () => h(BingToast) })
  app.mount(host)
  bingToast.info({ id: 'first', message: '第一条', duration: 0, position })
  bingToast.success({ id: 'middle', title: '不同高度的消息', message: '中间一条', duration: 0, position })
  bingToast.warning({ id: 'last', message: '最后一条', duration: 0, position })
  await settle()
}

async function finishExit(element: HTMLElement) {
  await nextTick()
  const exit = gsap.getTweensOf(card(element)).find(tween => tween.duration() > 0)
  expect(exit).toBeDefined()
  exit!.progress(1)
  await nextTick()
  expect(element.isConnected).toBe(false)
}

function moveTween(element: HTMLElement) {
  const tween = gsap.getTweensOf(element).find(tween => tween.duration() > 0)
  expect(tween).toBeDefined()
  return tween!.pause()
}

afterEach(async () => {
  app?.unmount()
  app = undefined
  host?.remove()
  host = undefined
  bingToast.clear()
  vi.restoreAllMocks()
  await nextTick()
})

describe('Toast 列表补位', () => {
  it.each<BingToastRenderPosition>(['top-right', 'bottom-right', 'right'])('%s 少量消息连续关闭后没有残留滚动条', async position => {
    await page.viewport(1100, 850)
    await mountStack(position)
    const viewport = document.querySelector<HTMLElement>(`.bing-toast-region--${position} .bing-scrollbar__viewport`)!
    const rail = document.querySelector<HTMLElement>(`.bing-toast-region--${position} .bing-scrollbar__rail--vertical`)!
    await expect.poll(() => viewport.scrollHeight - viewport.clientHeight).toBeLessThanOrEqual(1)

    for (const [message, remaining] of [['最后一条', 2], ['中间一条', 1]] as const) {
      await userEvent.click(toast(message).querySelector<HTMLButtonElement>('.bing-toast__close')!)
      await expect.poll(() => document.querySelectorAll('.bing-toast').length).toBe(remaining)
      // 播放完整的真实补位过程，直接把 tween 跳到终点无法覆盖浏览器的溢出缓存。
      await expect.poll(() => Array.from(document.querySelectorAll<HTMLElement>('.bing-toast')).every(element => !element.style.transform)).toBe(true)
      await expect.poll(() => viewport.scrollHeight - viewport.clientHeight).toBeLessThanOrEqual(1)
      await expect.poll(() => getComputedStyle(rail).display).toBe('none')
      expect(viewport.hasAttribute('tabindex')).toBe(false)
      expect(viewport.scrollTop).toBe(0)
    }
  })

  it('真正溢出时可用键盘滚动，减少到放得下后移除滚动条并归零', async () => {
    await page.viewport(390, 480)
    await mountStack()
    for (let index = 0; index < 12; index++) {
      bingToast.info({ id: `extra-${index}`, message: `更多消息 ${index}`, duration: 0 })
    }
    await settle()
    const viewport = document.querySelector<HTMLElement>('.bing-toast-region--top-right .bing-scrollbar__viewport')!
    const rail = document.querySelector<HTMLElement>('.bing-toast-region--top-right .bing-scrollbar__rail--vertical')!
    await expect.poll(() => getComputedStyle(rail).display).not.toBe('none')
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    expect(viewport.getAttribute('tabindex')).toBe('0')
    viewport.focus()
    await userEvent.keyboard('{End}')
    await expect.poll(() => viewport.scrollTop).toBeGreaterThan(0)

    for (let index = 0; index < 12; index++) bingToast.close(`extra-${index}`)
    bingToast.close('middle')
    await expect.poll(() => document.querySelectorAll('.bing-toast').length).toBe(2)
    await expect.poll(() => viewport.scrollHeight - viewport.clientHeight).toBeLessThanOrEqual(1)
    await expect.poll(() => getComputedStyle(rail).display).toBe('none')
    expect(viewport.scrollTop).toBe(0)
    expect(viewport.scrollWidth).toBe(viewport.clientWidth)
  })

  it.each<BingToastRenderPosition>(['top-right', 'bottom-right', 'right'])('%s 关闭中间消息后经过中间位置平滑补位', async position => {
    await page.viewport(1100, 850)
    await mountStack(position)
    const follower = toast('第一条')
    const removed = toast('中间一条')
    const before = follower.getBoundingClientRect()
    const distance = removed.getBoundingClientRect().height + 10
    removed.querySelector<HTMLButtonElement>('.bing-toast__close')!.click()
    await finishExit(removed)

    const move = moveTween(follower)
    expect(follower.getBoundingClientRect().top).toBeCloseTo(before.top, 0)
    move.progress(0.35)
    const halfway = follower.getBoundingClientRect()
    move.progress(1)
    const after = follower.getBoundingClientRect()
    const expected = position === 'bottom-right' ? distance : position === 'right' ? -distance / 2 : -distance
    expect(after.top - before.top).toBeCloseTo(expected, 0)
    expect(halfway.top).toBeGreaterThan(Math.min(before.top, after.top))
    expect(halfway.top).toBeLessThan(Math.max(before.top, after.top))
    expect(after.width).toBeCloseTo(before.width, 1)
    expect(follower.style.transform).toBe('')
  })

  it('连续关闭时从正在移动的位置接续，新消息的入场也不打断补位', async () => {
    await page.viewport(1100, 850)
    await mountStack()
    const follower = toast('第一条')
    const newest = toast('最后一条')
    bingToast.close('last')
    await finishExit(newest)
    moveTween(follower).progress(0.2)
    const movingTop = follower.getBoundingClientRect().top
    const middle = toast('中间一条')
    bingToast.close('middle')
    await nextTick()
    moveTween(follower).pause()
    expect(follower.getBoundingClientRect().top).toBeCloseTo(movingTop, 0)
    await finishExit(middle)
    const continued = moveTween(follower)
    expect(follower.getBoundingClientRect().top).toBeCloseTo(movingTop, 0)
    continued.progress(0.3)
    const beforeInsert = follower.getBoundingClientRect().top
    bingToast.info({ id: 'new', message: '新消息', duration: 0 })
    await nextTick()
    moveTween(follower).pause()
    expect(follower.getBoundingClientRect().top).toBeCloseTo(beforeInsert, 0)
    expect(gsap.getTweensOf(card(toast('新消息'))).length).toBeGreaterThan(0)
    await settle()
    expect(toast('新消息').getBoundingClientRect().bottom + 10).toBeCloseTo(follower.getBoundingClientRect().top, 0)
  })

  it('减少动态效果时直接补位，不创建位移动画', async () => {
    await page.viewport(1100, 850)
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query =>
      matchMedia(query.includes('prefers-reduced-motion') ? '(min-width: 0px)' : query),
    )
    await mountStack()
    const removed = toast('中间一条')
    const follower = toast('第一条')
    const before = follower.getBoundingClientRect().top
    bingToast.close('middle')
    await nextTick()
    await nextTick()
    expect(removed.isConnected).toBe(false)
    expect(follower.getBoundingClientRect().top).toBeLessThan(before)
    expect(gsap.getTweensOf(follower)).toHaveLength(0)
    expect(follower.style.transform).toBe('')
  })

  it('窄屏溢出列表在底部关闭消息后保持滚动边界和卡片宽度', async () => {
    await page.viewport(390, 480)
    await mountStack()
    for (let index = 0; index < 12; index++) {
      bingToast.info({ id: `overflow-${index}`, message: `溢出消息 ${index}`, duration: 0 })
    }
    await settle()
    const viewport = document.querySelector<HTMLElement>('.bing-toast-region--top-right .bing-scrollbar__viewport')!
    viewport.scrollTop = viewport.scrollHeight
    const beforeWidth = toast('第一条').getBoundingClientRect().width
    const removed = toast('中间一条')
    bingToast.close('middle')
    await finishExit(removed)
    await settle()
    expect(viewport.scrollTop).toBeLessThanOrEqual(viewport.scrollHeight - viewport.clientHeight)
    expect(viewport.scrollWidth).toBe(viewport.clientWidth)
    expect(toast('第一条').getBoundingClientRect().width).toBeCloseTo(beforeWidth, 1)
    const bottom = toast('第一条').getBoundingClientRect().bottom
    expect(bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1)
  })

  it('清空和卸载时清理进出场及补位动画', async () => {
    await page.viewport(1100, 850)
    await mountStack()
    const newest = toast('最后一条')
    bingToast.close('last')
    await finishExit(newest)
    const elements = Array.from(document.querySelectorAll('.bing-toast, .bing-toast__card'))
    expect(gsap.getTweensOf(elements).length).toBeGreaterThan(0)
    bingToast.clear()
    await nextTick()
    app!.unmount()
    app = undefined
    await nextTick()
    expect(gsap.getTweensOf(elements)).toHaveLength(0)
    expect(document.querySelector('.bing-toast-root')).toBeNull()
  })
})
