import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import { gsap } from 'gsap'
import { Plus, Settings2 } from '@lucide/vue'
import BingDropDown from './BingDropDown.vue'
import BingDropDownItem from './BingDropDownItem.vue'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
function mountMenu(autoFocus = false, anchorSide: 'left' | 'right' = 'left') {
  const host = document.createElement('div')
  host.style.cssText = anchorSide === 'right'
    ? 'position: fixed; right: 24px; top: 60px; width: 260px;'
    : 'margin: 60px; width: 260px;'
  document.body.append(host)
  const open = ref(false)
  const app = createApp({ render: () => h(BingDropDown, {
    open: open.value, autoFocus, 'onUpdate:open': value => { open.value = value },
  }, {
    trigger: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => h('button', triggerProps, '操作'),
    default: () => [
      h(BingDropDownItem, { title: '打开' }),
      h(BingDropDownItem, { title: '重命名' }),
      h(BingDropDownItem, { title: '设置' }, { submenu: () => [
        h(BingDropDownItem, { title: '外观', icon: Settings2 }), h(BingDropDownItem, { title: '权限', icon: Plus }),
      ] }),
      h(BingDropDownItem, { title: '禁用项', disabled: true }),
    ],
  }) })
  app.mount(host)
  mounted.push({ app, host })
  return { open, host }
}

async function pauseAnimation(panel: HTMLElement) {
  let animation: gsap.core.Timeline | undefined
  await expect.poll(() => {
    animation = gsap.getTweensOf(panel).find(tween => tween.parent && tween.parent !== gsap.globalTimeline)?.parent ?? undefined
    return Boolean(animation)
  }).toBe(true)
  animation!.pause()
  return { animation: animation! }
}

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
  vi.restoreAllMocks()
})

describe('BingDropDown 的波纹与逐项入场', () => {
  it('虚拟锚点在局部边界内翻转、限制宽高并揭示当前项', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const anchor = ref({ getBoundingClientRect: () => new DOMRect(270, 220, 1, 20) })
    const active = ref(0)
    const app = createApp({ render: () => h(BingDropDown, { open: true, anchor: anchor.value,
      boundary: { getBoundingClientRect: () => new DOMRect(40, 20, 260, 280) }, width: 320, minWidth: 320 }, {
      default: () => Array.from({ length: 16 }, (_, i) => h(BingDropDownItem, { title: `命令 ${i}`, active: active.value === i })),
    }) })
    mounted.push({ app, host }); app.mount(host)
    await expect.poll(() => document.querySelector('.bing-dropdown__panel')?.className).toContain('is-placement-top')
    const panel = document.querySelector<HTMLElement>('.bing-dropdown__panel')!
    await expect.poll(() => panel.getBoundingClientRect().width).toBe(236)
    await expect.poll(() => panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(213)
    expect(panel.getBoundingClientRect().left).toBeGreaterThanOrEqual(52)
    expect(panel.getBoundingClientRect().top).toBeGreaterThanOrEqual(32)
    active.value = 15
    await nextTick()
    await expect.poll(() => panel.querySelector('[aria-current="true"]')!.getBoundingClientRect().bottom).toBeLessThanOrEqual(213)
    anchor.value = { getBoundingClientRect: () => new DOMRect(60, 40, 1, 20) }
    await expect.poll(() => panel.className).toContain('is-placement-bottom')
    await expect.poll(() => panel.getBoundingClientRect().top).toBe(68)
  })
  it.each([false, true])('选项同时具有位移、缩放和错峰淡入，关闭中重开=%s', async interrupted => {
    const { open, host } = mountMenu()
    await userEvent.click(host.querySelector('button')!)
    const panel = document.querySelector<HTMLElement>('.bing-dropdown__panel')!
    let { animation } = await pauseAnimation(panel)
    if (interrupted) {
      animation.progress(1)
      open.value = false
      await nextTick()
      animation = (await pauseAnimation(panel)).animation
      animation.progress(0.3)
      open.value = true
      await nextTick()
      animation = (await pauseAnimation(panel)).animation
    }
    const [first, second] = panel.querySelectorAll<HTMLElement>('[role="menuitem"]')
    animation.time(0.12)
    expect(Number(gsap.getProperty(first!, 'opacity'))).toBeGreaterThan(Number(gsap.getProperty(second!, 'opacity')))
    expect(Number(gsap.getProperty(first!, 'y'))).toBeLessThan(Number(gsap.getProperty(second!, 'y')))
    expect(Number(gsap.getProperty(second!, 'scaleX'))).toBeLessThan(1)
    animation.progress(1)
    expect(first!.getBoundingClientRect().height).toBe(32)
    expect(Number(gsap.getProperty(second!, 'opacity'))).toBe(1)
  })

  it('指针原点驱动微光，禁用项不触发；子菜单也逐项入场并支持键盘返回', async () => {
    const { host } = mountMenu()
    await userEvent.click(host.querySelector('button')!)
    const panel = document.querySelector<HTMLElement>('.bing-dropdown__panel')!
    ;(await pauseAnimation(panel)).animation.progress(1)
    const items = panel.querySelectorAll<HTMLElement>('[role="menuitem"]')
    const first = items[0]!
    const liquid = first.querySelector<HTMLElement>('.bing-dropdown-item__liquid')!
    const rect = first.getBoundingClientRect()
    first.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse', clientX: rect.left + 12, clientY: rect.top + 10 }))
    expect(Number.parseFloat(liquid.style.getPropertyValue('--bing-liquid-x'))).toBeCloseTo(11, 0)
    expect(getComputedStyle(liquid).backgroundImage).toContain('96, 96, 96')
    expect(gsap.getTweensOf(liquid).length).toBeGreaterThan(0)
    const disabled = items[3]!
    disabled.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    expect(gsap.getTweensOf(disabled.querySelector('.bing-dropdown-item__liquid'))).toHaveLength(0)

    const settings = items[2]!
    settings.focus()
    settings.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    await nextTick()
    const submenu = document.querySelector<HTMLElement>('.bing-dropdown-item__submenu')!
    const { animation } = await pauseAnimation(submenu)
    const children = submenu.querySelectorAll<HTMLElement>('[role="menuitem"]')
    animation.time(0.12)
    expect(Number(gsap.getProperty(children[0]!, 'opacity'))).toBeGreaterThan(Number(gsap.getProperty(children[1]!, 'opacity')))
    animation.progress(1)
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(children[0])
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(settings)
    const { app, host: container } = mounted.pop()!
    app.unmount(); container.remove()
    expect(gsap.getTweensOf([liquid, panel, submenu, ...children])).toHaveLength(0)
  })

  it.each(['left', 'right'] as const)('向 %s 展开的子菜单保持字形尺寸并单向入场，无反向晃动', async side => {
    await page.viewport(1000, 700)
    const { host } = mountMenu(false, side === 'left' ? 'right' : 'left')
    await userEvent.click(host.querySelector('button')!)
    const panel = document.querySelector<HTMLElement>('.bing-dropdown__panel')!
    ;(await pauseAnimation(panel)).animation.progress(1)
    panel.querySelectorAll<HTMLElement>('[role="menuitem"]')[2]!.focus()
    document.activeElement!.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    await nextTick()
    const submenu = document.querySelector<HTMLElement>('.bing-dropdown-item__submenu')!
    const { animation } = await pauseAnimation(submenu)
    await nextTick()
    expect(submenu.classList.contains(`is-side-${side}`)).toBe(true)
    const children = Array.from(submenu.querySelectorAll<HTMLElement>('[role="menuitem"]'))
    const frames = [0, 0.06, 0.08, 0.1, 0.12, 0.16, 0.2, 0.24, animation.duration()].map(time => {
      animation.time(time)
      if (time === 0.12) {
        expect(Number(gsap.getProperty(children[0]!, 'opacity'))).toBeGreaterThan(Number(gsap.getProperty(children[1]!, 'opacity')))
      }
      return children.map(item => {
        const range = document.createRange()
        range.selectNodeContents(item.querySelector('.bing-dropdown-item__title')!)
        return { text: range.getBoundingClientRect(), icon: item.querySelector('svg')!.getBoundingClientRect() }
      })
    })
    const final = frames.at(-1)!
    frames.forEach((frame, index) => frame.forEach((item, row) => {
      expect(item.icon.width).toBeCloseTo(16, 3)
      expect(item.icon.height).toBeCloseTo(16, 3)
      expect(item.text.width).toBeCloseTo(final[row]!.text.width, 3)
      expect(item.text.height).toBeCloseTo(final[row]!.text.height, 3)
      if (!index) return
      const previous = frames[index - 1]![row]!
      const direction = side === 'right' ? 1 : -1
      expect((item.text.x - previous.text.x) * direction).toBeGreaterThanOrEqual(-0.001)
      expect((item.icon.x - previous.icon.x) * direction).toBeGreaterThanOrEqual(-0.001)
    }))
    expect(submenu.getAnimations().filter(item => item instanceof CSSTransition)).toHaveLength(0)
  })

  it('子菜单尚在入场时按右方向键，显示后转移焦点且左方向键可返回', async () => {
    const { host } = mountMenu()
    await userEvent.click(host.querySelector('button')!)
    const panel = document.querySelector<HTMLElement>('.bing-dropdown__panel')!
    ;(await pauseAnimation(panel)).animation.progress(1)
    const settings = panel.querySelectorAll<HTMLElement>('[role="menuitem"]')[2]!
    settings.focus()
    settings.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }))
    await expect.poll(() => document.activeElement?.textContent).toBe('外观')
    await userEvent.keyboard('{ArrowLeft}')
    expect(document.activeElement).toBe(settings)
  })

  it('减少动态效果时直接显示，自动聚焦仍可用', async () => {
    const original = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => {
      const media = original(query)
      if (query === '(prefers-reduced-motion: reduce)') Object.defineProperty(media, 'matches', { value: true })
      return media
    })
    const { host } = mountMenu(true)
    await userEvent.click(host.querySelector('button')!)
    const first = document.querySelector<HTMLElement>('.bing-dropdown__panel [role="menuitem"]')!
    await expect.poll(() => document.activeElement).toBe(first)
    expect(gsap.getTweensOf(first)).toHaveLength(0)
    expect(Number(gsap.getProperty(first, 'opacity'))).toBe(1)
  })
})
