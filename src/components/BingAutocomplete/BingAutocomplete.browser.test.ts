import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { gsap } from 'gsap'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref, type App } from 'vue'
import BingAutocomplete from './BingAutocomplete.vue'
import '../../theme/index.css'

const mounted: { app: App; host: HTMLElement }[] = []
beforeEach(async () => { await page.viewport(1280, 900) })
afterEach(() => { for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() } })
function setup(width = 320, openOnEmpty = true) {
  const host = document.createElement('div')
  host.style.cssText = `width:${width}px;max-width:calc(100vw - 32px);margin:16px;`
  document.body.append(host)
  const query = ref('')
  const selected = ref('')
  const app = createApp({ render: () => h('div', [h(BingAutocomplete, {
    modelValue: query.value, 'onUpdate:modelValue': value => { query.value = value },
    onSelect: option => { selected.value = String(option.value) }, ariaLabel: '查找需求', block: true, openOnEmpty,
    options: Array.from({ length: 30 }, (_, i) => ({ label: `REQ-${i}（需求文档）`, value: String(i), meta: { 状态: '进行中', 负责人: '测试成员' } })),
  }), h('button', { id: 'outside' }, '外部')]) })
  app.mount(host); mounted.push({ app, host })
  return { host, query, selected, input: host.querySelector('input')! }
}
describe('Autocomplete 浏览器', () => {
  it('行尾按钮支持真实点击、键盘切换、禁用项跳过、Esc 与焦点恢复', async () => {
    const host = document.createElement('div'); document.body.append(host)
    const chosen = ref(''), action = ref(''), loading = ref(false)
    const app = createApp({ render: () => h(BingAutocomplete, {
      ariaLabel: '独立操作搜索', optionActionLabel: '另开', modelValue: 'REQ', filter: false,
      completeOnSelect: false, closeOnSelect: false, loading: loading.value,
      options: [{ value: 'a', label: 'REQ-1' }, { value: 'b', label: 'REQ-2', disabled: true }, { value: 'c', label: 'REQ-3' }],
      onSelect: option => { chosen.value = String(option.value) },
      'onOption-action': option => { action.value = String(option.value) },
    }) })
    app.mount(host); mounted.push({ app, host })
    const input = host.querySelector('input')!
    await userEvent.click(input)
    const first = page.getByRole('button', { name: '另开：REQ-1', exact: true })
    await first.click()
    expect(action.value).toBe('a')
    expect(chosen.value).toBe('')
    expect(input.getAttribute('aria-expanded')).toBe('true')
    expect(document.activeElement?.textContent).toBe('另开')
    await userEvent.keyboard('{ArrowDown}{Enter}')
    expect(action.value).toBe('c')
    expect(chosen.value).toBe('')
    await userEvent.keyboard('{ArrowLeft}{Enter}')
    expect(document.activeElement).toBe(input)
    expect(chosen.value).toBe('c')
    await userEvent.keyboard('{F2}')
    await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('另开：REQ-3')
    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    await userEvent.click(input)
    await expect.poll(() => document.querySelector('.bing-autocomplete__panel')?.hasAttribute('inert')).toBe(false)
    await userEvent.keyboard('{ArrowDown}{ArrowRight}')
    await expect.poll(() => document.activeElement?.getAttribute('aria-label')).toBe('另开：REQ-3')
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    expect(document.activeElement).toBe(input)
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(input)
    await userEvent.keyboard('{ArrowUp}{Shift>}{ArrowRight}{/Shift}')
    expect(document.activeElement).toBe(input)
    await userEvent.keyboard('{F2}')
    expect(document.activeElement?.tagName).toBe('BUTTON')
    await userEvent.keyboard('{Tab}')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(document.activeElement?.closest('[role=grid]')).toBeFalsy()
    await userEvent.click(input)
    await userEvent.keyboard('{F2}')
    await expect.poll(() => document.activeElement?.tagName).toBe('BUTTON')
    loading.value = true
    await expect.poll(() => document.activeElement).toBe(input)
    expect(document.querySelectorAll('[role=row]')).toHaveLength(0)
  })

  it('按需搜索在空输入及组词时保持关闭，首字确认展开，清空后保留焦点', async () => {
    const { input, query, host } = setup(320, false)
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowDown}  ')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(document.querySelector('[role=listbox]')).toBeNull()
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    input.value = 'wen'
    input.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true }))
    await nextTick()
    expect(input.getAttribute('aria-expanded')).toBe('false')
    input.value = '文'
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '文', bubbles: true }))
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await expect.poll(() => document.querySelectorAll('[role=option]').length).toBe(30)
    expect(query.value).toBe('文')
    await userEvent.click(host.querySelector<HTMLButtonElement>('.bing-input__clear')!)
    expect(query.value).toBe('')
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    await expect.poll(() => document.querySelector('[role=listbox]')).toBeNull()
    await userEvent.click(input)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    await userEvent.keyboard('1')
    await expect.poll(() => input.getAttribute('aria-expanded')).toBe('true')
  })

  it('重试按钮消失后保留候选并把焦点还给输入框', async () => {
    const host = document.createElement('div'); document.body.append(host)
    const failed = ref(true)
    const app = createApp({ render: () => h(BingAutocomplete, {
      error: failed.value ? '加载失败' : '', options: [{ value: 'a', label: '重试后的结果' }],
    }, { error: () => h('button', { id: 'retry', onClick: () => { failed.value = false } }, '重试') }) })
    app.mount(host); mounted.push({ app, host })
    const input = host.querySelector('input')!
    input.focus(); await nextTick()
    await userEvent.click(document.getElementById('retry')!)
    await expect.poll(() => document.querySelectorAll('[role=option]').length).toBe(1)
    await expect.poll(() => document.activeElement).toBe(input)
  })
  it('输入、键盘滚动、选择、Escape、外部点击与卸载', async () => {
    const { input, selected, host } = setup()
    input.focus()
    await expect.poll(() => document.querySelectorAll('[role=option]').length).toBe(30)
    for (let i = 0; i < 20; i++) await userEvent.keyboard('{ArrowDown}')
    expect(document.querySelector('.bing-autocomplete__panel .bing-scrollbar__viewport')!.scrollTop).toBeGreaterThan(0)
    await userEvent.keyboard('{Enter}')
    expect(selected.value).toBe('20')
    expect(input.value).toBe('REQ-20（需求文档）')
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => input.getAttribute('aria-expanded')).toBe('true')
    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(input)
    expect(input.getAttribute('aria-expanded')).toBe('false')
    await userEvent.keyboard('{ArrowDown}')
    host.querySelector<HTMLButtonElement>('#outside')!.focus()
    await expect.poll(() => input.getAttribute('aria-expanded')).toBe('false')
  })
  it.each(['light', 'dark'])('%s 候选浮层不挤动输入框，详情不挡候选', async theme => {
    document.documentElement.dataset.bingTheme = theme
    const { input } = setup()
    const before = input.getBoundingClientRect().toJSON()
    input.focus(); await nextTick()
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => document.querySelector('.bing-autocomplete__detail')?.textContent).toContain('测试成员')
    await expect.poll(() => gsap.isTweening(document.querySelector('.bing-autocomplete__detail'))).toBe(false)
    const panel = document.querySelector('.bing-autocomplete__panel')!.getBoundingClientRect()
    const detail = document.querySelector('.bing-autocomplete__detail')!.getBoundingClientRect()
    expect(input.getBoundingClientRect().toJSON()).toEqual(before)
    expect(panel.left).toBeGreaterThanOrEqual(0)
    expect(panel.right).toBeLessThanOrEqual(innerWidth)
    expect(detail.right).toBeLessThanOrEqual(innerWidth)
    const inline = document.querySelector('.bing-autocomplete__detail')!.classList.contains('is-inline')
    expect(inline || detail.left >= panel.right || detail.right <= panel.left).toBe(true)
    delete document.documentElement.dataset.bingTheme
  })

  it('详情跟随候选平滑移动，跨越空隙和进入详情后保留，离开后隐藏', async () => {
    const { input } = setup()
    input.focus()
    await new Promise(resolve => setTimeout(resolve, 550))
    const options = Array.from(document.querySelectorAll<HTMLElement>('[role=option]'))
    const hover = (item: HTMLElement) => {
      const bounds = item.getBoundingClientRect()
      item.dispatchEvent(new MouseEvent('mouseenter', { clientX: bounds.left + 20, clientY: bounds.top + 18 }))
    }
    hover(options[0]!)
    await expect.poll(() => document.querySelector<HTMLElement>('.bing-autocomplete__detail')?.style.visibility).toBe('inherit')
    const detail = document.querySelector<HTMLElement>('.bing-autocomplete__detail')!
    await expect.poll(() => gsap.isTweening(detail)).toBe(false)
    const before = detail.getBoundingClientRect().top
    hover(options[6]!)
    await expect.poll(() => detail.textContent).toContain('REQ-6')
    await expect.poll(() => detail.getBoundingClientRect().top).toBeGreaterThan(before + 60)
    await expect.poll(() => gsap.isTweening(detail)).toBe(false)
    expect(document.querySelector('.bing-autocomplete__detail')).toBe(detail)
    expect(detail.getBoundingClientRect().top).toBeGreaterThan(before + 60)
    const list = document.querySelector('[role=listbox]')!
    list.dispatchEvent(new MouseEvent('mouseleave'))
    await new Promise(resolve => setTimeout(resolve, 60))
    detail.dispatchEvent(new MouseEvent('mouseenter'))
    await new Promise(resolve => setTimeout(resolve, 180))
    expect(detail.isConnected).toBe(true)
    expect(document.activeElement).toBe(input)
    detail.dispatchEvent(new MouseEvent('mouseleave'))
    await expect.poll(() => detail.isConnected).toBe(false)
    expect(input.getAttribute('aria-expanded')).toBe('true')
  })

  it('中文组词不反复刷新候选，输入法确认后才筛选并保留平滑光标', async () => {
    const { input, query, selected } = setup()
    input.focus()
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    input.value = 'wen'
    input.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true }))
    await nextTick()
    await userEvent.keyboard('{ArrowDown}{Enter}{Escape}')
    expect(selected.value).toBe('')
    expect(query.value).toBe('')
    expect(document.querySelectorAll('[role=option]').length).toBe(30)
    expect(input.hasAttribute('data-smooth-caret')).toBe(true)
    input.value = '文'
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '文', bubbles: true }))
    input.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await nextTick()
    expect(query.value).toBe('文')
    expect(input.getAttribute('aria-expanded')).toBe('true')
  })

  it('靠右时详情向左展开，窄屏详情与当前候选同时可见', async () => {
    const { input, host } = setup()
    host.style.marginLeft = 'auto'
    input.focus()
    await userEvent.keyboard('{ArrowDown}')
    const detail = () => document.querySelector<HTMLElement>('.bing-autocomplete__detail')!
    await expect.poll(() => detail()?.getBoundingClientRect().right).toBeLessThan(input.getBoundingClientRect().left)
    await page.viewport(390, 740)
    for (let i = 0; i < 7; i++) await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => detail()?.classList.contains('is-inline')).toBe(true)
    await expect.poll(() => detail().getBoundingClientRect().bottom).toBeLessThanOrEqual(innerHeight)
    const item = document.getElementById(input.getAttribute('aria-activedescendant')!)!
    const viewport = document.querySelector('.bing-autocomplete__panel .bing-scrollbar__viewport')!
    await expect.poll(() => item.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1)
    expect(detail().getBoundingClientRect().top).toBeGreaterThanOrEqual(viewport.getBoundingClientRect().bottom)
  })

  it('离场动画中卸载会立即移除浮层并停止动效', async () => {
    const { input } = setup()
    input.focus()
    await userEvent.keyboard('{ArrowDown}')
    await expect.poll(() => document.querySelector('.bing-autocomplete__detail')).toBeTruthy()
    const panels = Array.from(document.querySelectorAll<HTMLElement>('.bing-autocomplete__panel, .bing-autocomplete__detail'))
    await userEvent.keyboard('{Escape}')
    const item = mounted.pop()!
    item.app.unmount(); item.host.remove()
    expect(document.querySelector('.bing-autocomplete__panel')).toBeNull()
    expect(document.querySelector('.bing-autocomplete__detail')).toBeNull()
    expect(gsap.getTweensOf(panels)).toHaveLength(0)
    await new Promise(requestAnimationFrame)
    expect(document.querySelector('.bing-autocomplete__detail')).toBeNull()
  })

  it('长详情恢复自然高度，加载或错误状态不残留旧候选详情', async () => {
    const host = document.createElement('div'); document.body.append(host)
    const loading = ref(false)
    const error = ref('')
    const app = createApp({ render: () => h(BingAutocomplete, {
      loading: loading.value, error: error.value,
      options: [
        { value: 'a', label: '短需求', meta: { 状态: '进行中' } },
        { value: 'b', label: '这是一条需要换行展示全部名称和属性的较长需求', meta: { 状态: '进行中', 负责人: '测试成员', 优先级: '高', 更新时间: '2026/09/25 12:00:00' } },
      ],
    }) })
    app.mount(host); mounted.push({ app, host })
    const input = host.querySelector('input')!
    input.focus()
    await new Promise(resolve => setTimeout(resolve, 550))
    const options = Array.from(document.querySelectorAll<HTMLElement>('[role=option]'))
    await userEvent.hover(options[0]!)
    const detail = () => document.querySelector<HTMLElement>('.bing-autocomplete__detail')
    await expect.poll(() => detail()?.style.visibility).toBe('inherit')
    await expect.poll(() => gsap.isTweening(detail())).toBe(false)
    const shortHeight = detail()!.getBoundingClientRect().height
    await userEvent.hover(options[1]!)
    await expect.poll(() => detail()?.getBoundingClientRect().height).toBeGreaterThan(shortHeight + 50)
    await expect.poll(() => detail()?.style.height).toBe('')
    expect(detail()!.scrollHeight).toBeLessThanOrEqual(detail()!.clientHeight + 1)
    await expect.poll(() => detail()!.querySelector('.bing-scrollbar')!.classList.contains('has-overflow')).toBe(false)
    await userEvent.keyboard('{ArrowUp}')
    loading.value = true
    await expect.poll(() => detail()).toBeNull()
    loading.value = false
    await expect.poll(() => detail()?.textContent).toContain('短需求')
    error.value = '加载失败'
    await expect.poll(() => detail()).toBeNull()
  })
})
