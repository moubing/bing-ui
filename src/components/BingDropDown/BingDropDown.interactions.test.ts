import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, nextTick, ref } from 'vue'
import type { VNode } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BingDropDown from './BingDropDown.vue'
import BingDropDownItem from './BingDropDownItem.vue'
import BingDropDownGroup from './BingDropDownGroup.vue'
import BingDropDownDivider from './BingDropDownDivider.vue'
import type { BingDropDownProps } from './BingDropDown.types'
import { shortcutKeys, keyShortcuts } from './menuUtils'
import { Check } from '../../icons'

const feedback = vi.hoisted(() => vi.fn())
vi.mock('../../motion/useClickFeedback', () => ({ useClickFeedback: () => ({ playClickFeedback: feedback }) }))
enableAutoUnmount(afterEach)
beforeEach(() => {
  feedback.mockClear()
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})
afterEach(async () => { await flushPromises(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); document.body.innerHTML = '' })

const key = (target: HTMLElement, value: string, options: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...options })
  target.dispatchEvent(event)
  return event
}
const items = (menu = document.querySelector('[role="menu"]')!) => Array.from(menu.querySelectorAll<HTMLElement>('[data-bing-dropdown-item]'))
async function menuFixture(props: Partial<BingDropDownProps> = {}, content: () => VNode | VNode[] = () => [h(BingDropDownItem, { title: 'Apple' }), h(BingDropDownItem, { title: 'Apricot' }), h(BingDropDownItem, { title: 'Banana' })]) {
  const wrapper = mount(BingDropDown, { props, attachTo: document.body, slots: {
    trigger: ({ triggerProps }) => h('button', { ...triggerProps, id: 'trigger' }, '操作'), default: content,
  } })
  const trigger = wrapper.get('#trigger').element as HTMLButtonElement
  if (!props.open) trigger.click()
  await flushPromises()
  return { wrapper, trigger, panel: document.querySelector<HTMLElement>('.bing-dropdown__panel')! }
}

describe('DropDown 交互优化', () => {
  it('离开触发器会取消等待中的打开，关闭延迟可配置，聚焦立即打开', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BingDropDown, { props: { trigger: 'hover', hoverCloseDelay: 250 }, attachTo: document.body,
      slots: { trigger: ({ triggerProps }) => h('button', triggerProps, '操作'), default: () => h(BingDropDownItem, { title: '项目' }) } })
    const trigger = wrapper.get('button')
    await trigger.trigger('pointerenter', { pointerType: 'mouse' })
    await vi.advanceTimersByTimeAsync(79)
    expect(wrapper.classes()).not.toContain('is-open')
    await trigger.trigger('pointerleave', { pointerType: 'mouse' })
    await vi.advanceTimersByTimeAsync(100)
    expect(document.querySelector('[role="menu"]')).toBeNull()
    await trigger.trigger('pointerenter', { pointerType: 'mouse' })
    await vi.advanceTimersByTimeAsync(80)
    expect(wrapper.classes()).toContain('is-open')
    await trigger.trigger('pointerleave', { pointerType: 'mouse' })
    await vi.advanceTimersByTimeAsync(249)
    expect(wrapper.classes()).toContain('is-open')
    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.classes()).not.toContain('is-open')
    ;(trigger.element as HTMLElement).focus()
    await nextTick()
    expect(wrapper.classes()).toContain('is-open')
  })

  it('仅保留一个 Tab 入口，方向键跳过禁用项；Tab 关闭并同步恢复触发器', async () => {
    const { wrapper, trigger, panel } = await menuFixture({}, () => [h(BingDropDownItem, { title: 'First' }), h(BingDropDownItem, { title: 'Disabled', disabled: true }), h(BingDropDownItem, { title: 'Last' })])
    const rows = items(panel)
    expect(rows.map(item => item.tabIndex)).toEqual([0, -1, -1])
    rows[0]!.focus(); key(rows[0]!, 'ArrowDown'); await nextTick()
    expect(document.activeElement).toBe(rows[2])
    expect(rows.map(item => item.tabIndex)).toEqual([-1, -1, 0])
    const tab = key(rows[2]!, 'Tab', { shiftKey: true })
    expect(tab.defaultPrevented).toBe(false)
    expect(document.activeElement).toBe(trigger)
    await flushPromises()
    expect(wrapper.classes()).not.toContain('is-open')
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
    expect(trigger.getAttribute('aria-controls')).toBe(panel.id)
  })

  it('Esc 只关闭当前子菜单，第二次关闭根菜单', async () => {
    const { trigger, panel, wrapper } = await menuFixture({}, () => [h(BingDropDownItem, { title: 'Settings' }, { submenu: () => h(BingDropDownItem, { title: 'Personal' }) })])
    const parent = items(panel)[0]!
    parent.focus(); key(parent, 'ArrowRight'); await flushPromises()
    const child = document.querySelector<HTMLElement>('.bing-dropdown-item__submenu [data-bing-dropdown-item]')!
    expect(document.activeElement).toBe(child)
    key(child, 'Escape'); await flushPromises()
    expect(document.activeElement).toBe(parent)
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    expect(wrapper.classes()).toContain('is-open')
    key(parent, 'Escape'); await flushPromises()
    expect(document.activeElement).toBe(trigger)
    expect(wrapper.classes()).not.toContain('is-open')
  })

  it('子菜单等待 100ms；途经时离开会取消展开', async () => {
    vi.useFakeTimers()
    const { panel } = await menuFixture({}, () => [h(BingDropDownItem, { title: 'Settings' }, { submenu: () => h(BingDropDownItem, { title: 'Personal' }) })])
    const parent = items(panel)[0]!, shell = parent.parentElement!
    shell.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    await vi.advanceTimersByTimeAsync(99)
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    shell.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }))
    await vi.advanceTimersByTimeAsync(100)
    expect(parent.getAttribute('aria-expanded')).toBe('false')
    shell.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    await vi.advanceTimersByTimeAsync(100)
    expect(parent.getAttribute('aria-expanded')).toBe('true')
  })

  it('导航不播放粒子；真实点击和 Enter 激活才播放', async () => {
    const { trigger, panel } = await menuFixture({}, () => [h(BingDropDownItem, { title: 'Settings', closeOnClick: false }, { submenu: () => h(BingDropDownItem, { title: 'Child', closeOnClick: false }) })])
    key(trigger, 'ArrowDown'); await flushPromises()
    const parent = items(panel)[0]!
    key(parent, 'ArrowRight'); await flushPromises()
    expect(feedback).not.toHaveBeenCalled()
    const child = document.activeElement as HTMLElement
    child.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    expect(feedback).toHaveBeenCalledTimes(1)
    key(child, 'Enter'); child.click()
    expect(feedback).toHaveBeenCalledTimes(2)
  })

  it.each([['Ctrl+Shift+C', ['Ctrl', 'Shift', 'C'], 'Control+Shift+C'], ['Ctrl++', ['Ctrl', '+'], 'Control+Plus'], [['Cmd', 'K'], ['Cmd', 'K'], 'Meta+K']] as const)('快捷键 %s 拆分为键帽并输出无障碍快捷键', async (shortcut, expected, aria) => {
    const value = typeof shortcut === 'string' ? shortcut : [...shortcut]
    expect(shortcutKeys(value)).toEqual(expected)
    expect(keyShortcuts(shortcutKeys(value))).toBe(aria)
    const { panel } = await menuFixture({}, () => h(BingDropDownItem, { title: '复制', shortcut: value }))
    expect(items(panel)[0]!.getAttribute('aria-keyshortcuts')).toBe(aria)
    expect(Array.from(panel.querySelectorAll('kbd')).map(el => el.textContent)).toEqual(expected)
    expect(panel.querySelector('.bing-dropdown-item__shortcut')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('radio 与 checkbox 输出 checked，图标和勾选分别使用前后列', async () => {
    const checked = ref(false)
    const { panel } = await menuFixture({}, () => [h(BingDropDownItem, { title: '视图', type: 'radio', checked: true }), h(BingDropDownItem, { title: '收藏', type: 'checkbox', icon: Check, checked: checked.value })])
    const rows = items(panel)
    expect(rows[0]!.getAttribute('role')).toBe('menuitemradio')
    expect(rows[0]!.getAttribute('aria-checked')).toBe('true')
    expect(rows[0]!.querySelector('.bing-dropdown-item__prefix .bing-dropdown-item__check')).not.toBeNull()
    expect(rows[1]!.getAttribute('role')).toBe('menuitemcheckbox')
    expect(rows[1]!.getAttribute('aria-checked')).toBe('false')
    expect(rows[1]!.querySelector('.bing-dropdown-item__suffix .bing-dropdown-item__check')).not.toBeNull()
    checked.value = true; await flushPromises()
    expect(rows[1]!.getAttribute('aria-checked')).toBe('true')
    expect(rows[1]!.querySelector('.bing-dropdown-item__check path')?.getAttribute('pathLength')).toBe('1')
  })

  it('typeahead 支持重复字符循环、500ms 重置和中文别名，忽略输入法', async () => {
    vi.useFakeTimers()
    const { panel } = await menuFixture({}, () => [h(BingDropDownItem, { title: 'Apple' }), h(BingDropDownItem, { title: 'Apricot' }), h(BingDropDownItem, { title: '香蕉', textValue: 'banana' })])
    await vi.advanceTimersByTimeAsync(1)
    const rows = items(panel)
    rows[0]!.focus(); key(rows[0]!, 'a'); expect(document.activeElement).toBe(rows[1])
    key(rows[1]!, 'a'); expect(document.activeElement).toBe(rows[0])
    await vi.advanceTimersByTimeAsync(500)
    key(rows[0]!, 'b', { isComposing: true }); expect(document.activeElement).toBe(rows[0])
    key(rows[0]!, 'b'); expect(document.activeElement).toBe(rows[2])
    key(rows[2]!, 'a'); expect(document.activeElement).toBe(rows[2])
  })

  it('关闭 typeahead 后字符不改变焦点，分组标题和分隔线不参与导航', async () => {
    const { panel } = await menuFixture({ typeahead: false }, () => [h(BingDropDownGroup, { label: '打开' }, () => h(BingDropDownItem, { title: 'Apple' })), h(BingDropDownDivider), h(BingDropDownGroup, {}, { label: () => '编辑', default: () => h(BingDropDownItem, { title: 'Banana' }) })])
    const groups = Array.from(panel.querySelectorAll('[role="group"]'))
    expect(groups).toHaveLength(2)
    for (const group of groups) expect(document.getElementById(group.getAttribute('aria-labelledby')!)).not.toBeNull()
    expect(panel.querySelectorAll('[role="separator"]')).toHaveLength(1)
    const rows = items(panel); rows[0]!.focus(); key(rows[0]!, 'b')
    expect(document.activeElement).toBe(rows[0])
    key(rows[0]!, 'ArrowDown'); expect(document.activeElement).toBe(rows[1])
  })

  it('焦点在编辑器时只移动高亮，不抢焦点', async () => {
    const editor = document.createElement('textarea'); document.body.append(editor); editor.focus()
    const { panel } = await menuFixture({ open: true, autoFocus: false })
    const rows = items(panel)
    rows[1]!.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse' })); await nextTick()
    expect(document.activeElement).toBe(editor)
    expect(panel.querySelectorAll('[data-highlighted]')).toHaveLength(1)
    expect(rows[1]!.hasAttribute('data-highlighted')).toBe(true)
  })

  it('触屏长按 500ms 打开；移动超出 8px、取消及卸载都清理等待', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BingDropDown, { props: { trigger: 'contextmenu' }, attachTo: document.body,
      slots: { trigger: ({ triggerProps }) => h('button', triggerProps, '操作'), default: () => h(BingDropDownItem, { title: '打开' }) } })
    const trigger = wrapper.get('button').element
    const down = () => trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', isPrimary: true, clientX: 100, clientY: 100 }))
    down(); await vi.advanceTimersByTimeAsync(499)
    expect(wrapper.classes()).not.toContain('is-open')
    window.dispatchEvent(new PointerEvent('pointermove', { pointerType: 'touch', clientX: 109, clientY: 100 }))
    await vi.advanceTimersByTimeAsync(100)
    expect(wrapper.classes()).not.toContain('is-open')
    down(); await vi.advanceTimersByTimeAsync(500)
    expect(wrapper.classes()).toContain('is-open')
    expect(wrapper.emitted('context-open')).toHaveLength(1)
    wrapper.vm.close(); await nextTick()
    down(); window.dispatchEvent(new PointerEvent('pointercancel'))
    await vi.advanceTimersByTimeAsync(500)
    expect(wrapper.emitted('context-open')).toHaveLength(1)
    down(); wrapper.unmount(); await vi.advanceTimersByTimeAsync(500)
    expect(document.querySelector('[role="menu"]')).toBeNull()
  })
})
