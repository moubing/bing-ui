import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App, VNode } from 'vue'
import { gsap } from 'gsap'
import BingDropDown from './BingDropDown.vue'
import BingDropDownItem from './BingDropDownItem.vue'
import BingDropDownGroup from './BingDropDownGroup.vue'
import type { BingDropDownProps } from './BingDropDown.types'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
function mountMenu(props: BingDropDownProps = {}, content: () => VNode | VNode[] = () => Array.from({ length: 20 }, (_, i) => h(BingDropDownItem, { title: `项目 ${i + 1}` })), right = false) {
  const host = document.createElement('div')
  host.style.cssText = `position:fixed;top:60px;${right ? 'right' : 'left'}:60px;`
  document.body.append(host)
  const open = ref(false), selected = vi.fn()
  const app = createApp({ render: () => h('div', [
    h('button', { id: 'before' }, '之前'),
    h(BingDropDown, { ...props, open: open.value, 'onUpdate:open': (value: boolean) => { open.value = value } }, {
      trigger: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => h('button', { ...triggerProps, id: 'trigger' }, '菜单'),
      default: () => h('div', { onClick: selected }, content()),
      header: () => h('div', '项目操作'), footer: () => h('div', 'Esc 返回'),
    }), h('button', { id: 'after' }, '之后'),
  ]) })
  mounted.push({ app, host }); app.mount(host)
  return { host, open, selected, trigger: host.querySelector<HTMLElement>('#trigger')! }
}
const panel = () => document.querySelector<HTMLElement>('.bing-dropdown__panel')!
const rows = (menu = panel()) => Array.from(menu.querySelectorAll<HTMLElement>('[data-bing-dropdown-item]'))
const key = (el: HTMLElement, value: string) => el.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true }))
async function ready(menu = panel()) {
  await expect.poll(() => getComputedStyle(menu).opacity).toBe('1')
  await expect.poll(() => gsap.getTweensOf(menu).length).toBe(0)
}
function pointer(target: HTMLElement, type: string, x: number, y: number) {
  target.dispatchEvent(new PointerEvent(type, { bubbles: type === 'pointermove', pointerType: 'mouse', clientX: x, clientY: y }))
}
afterEach(() => { for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }; vi.restoreAllMocks() })

describe('DropDown 完整交互', () => {
  it.each(['bottom-end', 'top-end', 'left-end', 'right-end'] as const)('真实元素的 %s 菜单贴合锚点，窗口变化后继续对齐', async placement => {
    await page.viewport(1000, 800)
    const { trigger, host } = mountMenu({ placement, width: 168, minWidth: 168 }, () => h(BingDropDownItem, { title: '打开文档' }))
    host.style.cssText = 'position:fixed;right:320px;top:320px;'
    await userEvent.click(trigger)
    await expect.poll(panel).toBeTruthy(); await ready()
    const gap = () => {
      const anchor = trigger.closest('.bing-dropdown')!.getBoundingClientRect(), menu = panel().getBoundingClientRect()
      if (placement === 'bottom-end') return [menu.right - anchor.right, menu.top - anchor.bottom - 8]
      if (placement === 'top-end') return [menu.right - anchor.right, anchor.top - menu.bottom - 8]
      if (placement === 'left-end') return [menu.bottom - anchor.bottom, anchor.left - menu.right - 8]
      return [menu.bottom - anchor.bottom, menu.left - anchor.right - 8]
    }
    await expect.poll(() => gap().every(value => Math.abs(value) < 1)).toBe(true)
    await page.viewport(920, 760)
    await expect.poll(() => gap().every(value => Math.abs(value) < 1)).toBe(true)
    await userEvent.click(rows()[0]!)
    await expect.poll(panel).toBeFalsy()
  })

  it.each(['click', 'contextmenu'] as const)('420px 高视口的 %s 长菜单包含滚动区，末项可见且可点击', async triggerMode => {
    await page.viewport(900, 420)
    const { trigger, selected } = mountMenu({ trigger: triggerMode })
    if (triggerMode === 'contextmenu') trigger.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 120, clientY: 390 }))
    else await userEvent.click(trigger)
    await expect.poll(panel).toBeTruthy(); await ready()
    const rect = panel().getBoundingClientRect()
    expect(rect.top).toBeGreaterThanOrEqual(12)
    expect(rect.bottom).toBeLessThanOrEqual(408)
    const viewport = panel().querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    viewport.scrollTop = viewport.scrollHeight
    await userEvent.click(rows().at(-1)!)
    expect(selected).toHaveBeenCalledTimes(1)
    await expect.poll(panel).toBeFalsy()
  })

  it('键盘和指针共用唯一高亮，父项在子菜单中保持高亮', async () => {
    await page.viewport(1000, 700)
    const { trigger } = mountMenu({}, () => [h(BingDropDownItem, { title: '打开' }), h(BingDropDownItem, { title: '设置' }, { submenu: () => h(BingDropDownItem, { title: '个人' }) })])
    await userEvent.click(trigger); await ready()
    rows()[0]!.focus(); await userEvent.hover(rows()[1]!); await nextTick()
    expect(panel().querySelectorAll('[data-highlighted]')).toHaveLength(1)
    expect(document.activeElement).toBe(rows()[1])
    await expect.poll(() => rows()[1]!.getAttribute('aria-expanded')).toBe('true')
    const submenu = document.querySelector<HTMLElement>('.bing-dropdown-item__submenu')!
    await ready(submenu)
    await userEvent.hover(rows(submenu)[0]!)
    expect(rows()[1]!.hasAttribute('data-highlighted')).toBe(true)
    expect(panel().querySelectorAll('[data-highlighted]')).toHaveLength(1)
    expect(submenu.getBoundingClientRect().left - panel().getBoundingClientRect().right).toBe(4)
    expect(rows(submenu)[0]!.getBoundingClientRect().top).toBe(rows()[1]!.getBoundingClientRect().top)
  })

  it.each([false, true])('安全三角保护斜向跨过相邻项，左向=%s', async left => {
    await page.viewport(1000, 700)
    const { trigger } = mountMenu({}, () => [h(BingDropDownItem, { title: '设置' }, { submenu: () => Array.from({ length: 5 }, (_, i) => h(BingDropDownItem, { title: `子项 ${i}` })) }), h(BingDropDownItem, { title: '相邻项' })], left)
    await userEvent.click(trigger); await ready()
    const [parent, sibling] = rows()
    parent!.focus(); key(parent!, 'ArrowRight')
    const submenu = document.querySelector<HTMLElement>('.bing-dropdown-item__submenu')!
    await ready(submenu)
    const p = parent!.getBoundingClientRect(), s = submenu.getBoundingClientRect(), direction = left ? -1 : 1
    const exit = { x: p.left + p.width / 2, y: p.bottom }
    pointer(parent!.parentElement!, 'pointerleave', exit.x, exit.y)
    const x = exit.x + direction * 28, y = exit.y + 8
    pointer(sibling!, 'pointermove', x, y)
    await new Promise(resolve => setTimeout(resolve, 140))
    expect(parent!.getAttribute('aria-expanded')).toBe('true')
    expect(parent!.hasAttribute('data-highlighted')).toBe(true)
    expect(sibling!.hasAttribute('data-highlighted')).toBe(false)
    pointer(rows(submenu)[1]!, 'pointermove', left ? s.right - 15 : s.left + 15, rows(submenu)[1]!.getBoundingClientRect().top + 10)
    await new Promise(resolve => setTimeout(resolve, 180))
    expect(parent!.getAttribute('aria-expanded')).toBe('true')
    key(document.activeElement as HTMLElement, 'Escape'); await nextTick()
    expect(document.activeElement).toBe(parent)
    expect(panel()).toBeTruthy()
  })

  it.each([false, true])('Tab 从触发器继续原生顺序，反向=%s', async reverse => {
    const { trigger, host } = mountMenu()
    trigger.focus(); await userEvent.keyboard('{ArrowDown}'); await ready()
    await expect.poll(() => document.activeElement).toBe(rows()[0])
    await userEvent.tab({ shift: reverse })
    expect(document.activeElement).toBe(host.querySelector(reverse ? '#before' : '#after'))
    await expect.poll(panel).toBeFalsy()
  })

  it('hover 根菜单进入子菜单后持续展开，长子菜单内部可滚动', async () => {
    await page.viewport(900, 420)
    const { trigger } = mountMenu({ trigger: 'hover' }, () => h(BingDropDownItem, { title: '设置' }, { submenu: () => Array.from({ length: 24 }, (_, i) => h(BingDropDownItem, { title: `选项 ${i}` })) }))
    await userEvent.hover(trigger); await expect.poll(panel).toBeTruthy(); await ready()
    await userEvent.hover(rows()[0]!)
    const submenu = document.querySelector<HTMLElement>('.bing-dropdown-item__submenu')!
    await expect.poll(() => submenu.classList.contains('is-visible')).toBe(true); await ready(submenu)
    await userEvent.hover(rows(submenu)[1]!)
    await new Promise(resolve => setTimeout(resolve, 350))
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    expect(submenu.getBoundingClientRect().bottom).toBeLessThanOrEqual(408)
    const viewport = submenu.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    viewport.scrollTop = viewport.scrollHeight
    await userEvent.click(rows(submenu).at(-1)!)
    await expect.poll(panel).toBeFalsy()
  })

  it('编辑器外部焦点不被指针抢走，虚拟高亮在局部边界内滚动', async () => {
    await page.viewport(900, 600)
    const active = ref(0), host = document.createElement('div'); document.body.append(host)
    const app = createApp({ render: () => h('div', [h('textarea', { id: 'editor' }), h(BingDropDown, {
      open: true, autoFocus: false, closeOnEscape: false, width: 300,
      anchor: { getBoundingClientRect: () => new DOMRect(80, 60, 1, 20) }, boundary: { getBoundingClientRect: () => new DOMRect(40, 20, 360, 300) },
    }, { default: () => h('div', { onMousedown: (event: MouseEvent) => event.preventDefault() }, Array.from({ length: 20 }, (_, i) => h(BingDropDownItem, { title: `命令 ${i}`, active: active.value === i, closeOnClick: false }))) })]) })
    mounted.push({ app, host }); app.mount(host)
    const editor = host.querySelector<HTMLTextAreaElement>('textarea')!; editor.focus()
    await expect.poll(panel).toBeTruthy(); await ready()
    await userEvent.hover(rows()[1]!); expect(document.activeElement).toBe(editor)
    active.value = 19
    await expect.poll(() => rows()[19]!.getBoundingClientRect().bottom).toBeLessThanOrEqual(308)
    expect(panel().getBoundingClientRect().bottom).toBeLessThanOrEqual(308)
    await userEvent.click(rows()[19]!)
    expect(document.activeElement).toBe(editor)
    await userEvent.keyboard('abc')
    expect(editor.value).toBe('abc')
  })

  it('编辑区鼠标右键保留焦点，键盘打开菜单仍聚焦首项', async () => {
    const host = document.createElement('div'); document.body.append(host)
    const app = createApp({ render: () => h(BingDropDown, { trigger: 'contextmenu' }, {
      trigger: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => h('div', triggerProps, [h('textarea', { id: 'context-editor' })]),
      default: () => h(BingDropDownItem, { title: '编辑命令' }),
    }) })
    mounted.push({ app, host }); app.mount(host)
    const editor = host.querySelector<HTMLTextAreaElement>('textarea')!
    await userEvent.click(editor, { button: 'right' }); await ready()
    expect(document.activeElement).toBe(editor)
    await userEvent.keyboard('继续输入')
    expect(editor.value).toBe('继续输入')
    rows()[0]!.focus(); await userEvent.keyboard('{Escape}')
    await expect.poll(panel).toBeFalsy()
    editor.focus(); key(editor, 'ContextMenu')
    await expect.poll(panel).toBeTruthy(); await ready()
    await expect.poll(() => document.activeElement).toBe(rows()[0])
  })

  it('菜单内的自定义表单保留输入和原生 Tab 顺序', async () => {
    const { trigger } = mountMenu({}, () => h('form', [h('input', { 'aria-label': '文字' }), h('input', { 'aria-label': '网址' })]))
    await userEvent.click(trigger); await ready()
    const inputs = panel().querySelectorAll('input')
    inputs[0]!.focus(); await userEvent.keyboard('文档'); await userEvent.tab()
    expect(inputs[0]!.value).toBe('文档')
    expect(document.activeElement).toBe(inputs[1])
    await userEvent.keyboard('https://example.com')
    expect(inputs[1]!.value).toBe('https://example.com')
    expect(panel()).toBeTruthy()
  })

  it('可见项错峰封顶，视口外项目直接显示；选中项延后 60ms 离场', async () => {
    await page.viewport(900, 700)
    const { trigger } = mountMenu()
    await userEvent.click(trigger)
    let timeline: gsap.core.Timeline | undefined
    await expect.poll(() => { timeline = gsap.getTweensOf(panel())[0]?.parent ?? undefined; return !!timeline }).toBe(true)
    timeline!.pause().time(0.19)
    const all = rows()
    expect(gsap.getProperty(all[7]!, 'opacity')).toBe(gsap.getProperty(all[8]!, 'opacity'))
    expect(gsap.getProperty(all.at(-1)!, 'opacity')).toBe(1)
    expect(timeline!.duration()).toBeLessThanOrEqual(0.4)
    timeline!.progress(1)
    await userEvent.click(all[0]!)
    await nextTick()
    timeline = gsap.getTweensOf(panel())[0]!.parent!
    timeline.pause().time(0.05)
    expect(all[0]!.hasAttribute('data-highlighted')).toBe(true)
    expect(Number(gsap.getProperty(all[0]!, 'opacity'))).toBe(1)
    expect(Number(gsap.getProperty(all[5]!, 'opacity'))).toBeLessThanOrEqual(1)
    timeline.progress(1)
  })

  it('勾选描线可反向打断，滑动高亮每层只有一个且尺寸不影响文字', async () => {
    await page.viewport(900, 600)
    const checked = ref(false)
    const { trigger } = mountMenu({ highlightMotion: 'slide', width: 320 }, () => h(BingDropDownGroup, { label: '显示' }, () => [
      h(BingDropDownItem, { title: '收藏', type: 'checkbox', checked: checked.value, closeOnClick: false, onClick: () => { checked.value = !checked.value } }),
      h(BingDropDownItem, { title: '详情', description: '显示额外说明' }),
    ]))
    await userEvent.click(trigger); await ready()
    const [first, second] = rows(), height = second!.getBoundingClientRect().height
    expect(first!.getBoundingClientRect().width).toBeGreaterThan(280)
    expect(first!.querySelector('.bing-dropdown-item__title')!.getBoundingClientRect().left)
      .toBe(second!.querySelector('.bing-dropdown-item__title')!.getBoundingClientRect().left)
    await userEvent.click(first!)
    const path = first!.querySelector<SVGPathElement>('path')!
    await expect.poll(() => gsap.getTweensOf(path).length).toBeGreaterThan(0)
    const tween = gsap.getTweensOf(path)[0]!.pause().progress(0.45)
    const halfway = Number(gsap.getProperty(path, 'strokeDashoffset'))
    checked.value = false; await nextTick(); await nextTick()
    expect(Number(gsap.getProperty(path, 'strokeDashoffset'))).toBeCloseTo(halfway, 1)
    tween.kill()
    await expect.poll(() => getComputedStyle(path).strokeDashoffset).toBe('1px')
    await userEvent.hover(second!)
    const layer = panel().querySelector<HTMLElement>('.bing-dropdown__highlight')!
    await expect.poll(() => Math.abs(layer.getBoundingClientRect().height - height)).toBeLessThan(0.1)
    expect(panel().querySelectorAll('.bing-dropdown__highlight')).toHaveLength(1)
    expect(getComputedStyle(second!).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(second!.getBoundingClientRect().height).toBe(height)
  })

  it('减少动态效果时根菜单、子菜单与滑动高亮无位移动画', async () => {
    const original = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => { const media = original(query); if (query.includes('prefers-reduced-motion')) Object.defineProperty(media, 'matches', { value: true }); return media })
    const { trigger } = mountMenu({ highlightMotion: 'slide' }, () => h(BingDropDownItem, { title: '设置' }, { submenu: () => h(BingDropDownItem, { title: '个人' }) }))
    trigger.focus(); await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => document.activeElement).toBe(rows()[0])
    expect(panel().style.transform).toBe('')
    expect(getComputedStyle(panel()).transform).toBe('none')
    key(rows()[0]!, 'ArrowRight')
    const submenu = document.querySelector<HTMLElement>('.bing-dropdown-item__submenu')!
    await expect.poll(() => document.activeElement).toBe(rows(submenu)[0])
    expect(submenu.style.transform).toBe('')
    expect(getComputedStyle(submenu).transform).toBe('none')
    expect(gsap.getTweensOf([panel(), submenu, ...rows(), ...rows(submenu)])).toHaveLength(0)
    key(rows(submenu)[0]!, 'Escape'); await nextTick()
    key(rows()[0]!, 'Escape'); await expect.poll(panel).toBeFalsy()
  })
})
