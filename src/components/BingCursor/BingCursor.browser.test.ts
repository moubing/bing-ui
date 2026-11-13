import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingCursor from './BingCursor.vue'
import { cursorHotspots } from './BingCursor.presets'
import { createNativeCursor } from './BingCursor.native'
import type { BingCursorProps, BingCursorType } from './BingCursor.types'

let app: App | undefined
let host: HTMLDivElement | undefined
const temporary: Element[] = []
const tick = async () => {
  await nextTick()
  await new Promise(requestAnimationFrame)
  await nextTick()
}
const target = () => host!.querySelector<HTMLElement>('[data-testid="plain"]')!
const cursor = () => getComputedStyle(target()).cursor
const cursorSvg = (value = cursor()) => {
  const url = value.match(/url\("([^"]+)"\)/)![1]!
  return new DOMParser().parseFromString(decodeURIComponent(url.slice(url.indexOf(',') + 1)), 'image/svg+xml')
}

async function mountNative(props: BingCursorProps = {}) {
  const options = ref(props)
  host = document.createElement('div')
  document.body.append(host)
  app = createApp({
    render: () => h('main', { style: 'padding:30px;display:grid;gap:20px' }, [
      h(BingCursor, options.value, () => h('section', { style: 'display:grid;gap:20px' }, [
        h('div', { class: 'cursor-native-plain', 'data-testid': 'plain', style: 'padding:30px' }, '普通内容'),
        h('button', { 'data-testid': 'button', style: 'padding:20px;cursor:pointer' }, '按钮'),
        h('input', { 'aria-label': '输入', style: 'padding:20px' }),
        h('div', { 'data-testid': 'escape', 'data-bing-cursor': 'native', style: 'padding:20px;cursor:help' }, '原生区域'),
      ])),
      h('div', { 'data-testid': 'outside', style: 'padding:20px;cursor:crosshair' }, '外部区域'),
    ]),
  })
  app.mount(host)
  await tick()
  return options
}

afterEach(() => {
  app?.unmount()
  app = undefined
  host?.remove()
  host = undefined
  temporary.splice(0).forEach(element => element.remove())
  vi.restoreAllMocks()
})

describe('BingCursor 默认的浏览器原生绘制', () => {
  it('全部 disabled 时滚动和鼠标移动不执行命中、样式或 CSSOM 查询，重新启用仍可接管', async () => {
    const options = await mountNative({ global: true, disabled: true })
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    const hit = vi.spyOn(document, 'elementFromPoint'), computed = vi.spyOn(window, 'getComputedStyle')
    const rules = vi.spyOn(CSSStyleSheet.prototype, 'cssRules', 'get')
    for (let i = 0; i < 20; i++) {
      document.dispatchEvent(new Event('scroll'))
      target().dispatchEvent(new PointerEvent('pointermove', { bubbles: true, pointerType: 'mouse', clientX: 60 + i, clientY: 60 }))
    }
    await tick()
    expect(hit).not.toHaveBeenCalled(); expect(computed).not.toHaveBeenCalled(); expect(rules).not.toHaveBeenCalled()
    options.value = { global: true, disabled: false }
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    expect(cursor()).toMatch(/^url\(/)
  })

  it('长编辑区的文字、CSS 图片控件与链接共用稳定根标记，滚动不写正文属性', async () => {
    await mountNative({ global: true })
    const sheet = document.createElement('style')
    sheet.textContent = '.cursor-long-picture {cursor:zoom-in}.cursor-long-size {cursor:ew-resize}'
    document.head.append(sheet); temporary.push(sheet)
    const editor = document.createElement('div')
    editor.contentEditable = 'true'
    editor.innerHTML = '<p data-testid="long-text">正文</p><a data-testid="long-link" href="#long">链接</a><div contenteditable="false"><button class="cursor-long-picture" data-testid="long-image">图片</button><button class="cursor-long-size" data-testid="long-resize">缩放</button><button disabled data-testid="long-disabled">禁用</button></div>'
      + '<p>用于重现继承样式失效的长正文</p>'.repeat(1000)
    host!.append(editor)
    await userEvent.hover(page.getByTestId('long-text')); await tick()
    const token = editor.getAttribute('data-bing-cursor-native')
    expect(token).toMatch(/-editable$/)
    const changes: MutationRecord[] = []
    const observer = new MutationObserver(records => changes.push(...records))
    observer.observe(editor, { subtree: true, attributes: true, childList: true, characterData: true })
    try {
      for (let i = 0; i < 3; i++) for (const [id, type] of [['long-text', 'text'], ['long-link', 'pointer'], ['long-image', 'zoom-in'], ['long-resize', 'ew-resize'], ['long-disabled', 'not-allowed']]) {
        await userEvent.hover(page.getByTestId(id!)); await tick()
        document.dispatchEvent(new Event('scroll')); await tick()
        expect(getComputedStyle(editor.querySelector(`[data-testid="${id}"]`)!).cursor).toMatch(new RegExp(`, ${type}$`))
        expect(editor.getAttribute('data-bing-cursor-native')).toBe(token)
      }
      expect(changes).toHaveLength(0)
    } finally { observer.disconnect() }
    host!.style.cursor = 'crosshair'
    await userEvent.hover(page.getByTestId('long-text')); await tick()
    expect(getComputedStyle(editor.querySelector('p')!).cursor).toMatch(/, crosshair$/)
    expect(editor.querySelector('[data-bing-cursor-native]')).toBeNull()
    host!.style.removeProperty('cursor')
    await userEvent.hover(page.getByTestId('long-link')); await tick()
    expect(editor.getAttribute('data-bing-cursor-native')).toBe(token)
    editor.contentEditable = 'false'
    await userEvent.hover(page.getByTestId('long-text')); await tick()
    changes.length = 0
    observer.observe(editor, { subtree: true, attributes: true, childList: true, characterData: true })
    try {
      for (const [id, type] of [['long-text', 'default'], ['long-link', 'pointer'], ['long-image', 'zoom-in']]) {
        await userEvent.hover(page.getByTestId(id!)); await tick()
        expect(getComputedStyle(editor.querySelector(`[data-testid="${id}"]`)!).cursor).toMatch(new RegExp(`, ${type}$`))
        expect(editor.getAttribute('data-bing-cursor-native')).toBe(token)
      }
      expect(changes).toHaveLength(0)
    } finally { observer.disconnect() }
  })

  it('默认直接使用 SVG 图片和准确热点，没有随鼠标移动的 DOM 层', async () => {
    await mountNative()
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    expect(cursor()).toMatch(/^url\("data:image\/svg\+xml,/)
    expect(cursor()).toMatch(/ 4 3, default$/)
    expect(cursorSvg().documentElement.getAttribute('width')).toBe('28')
    expect(document.querySelector('[data-bing-cursor-layer]')).toBeNull()
    expect(document.querySelector('[data-bing-cursor-hidden]')).toBeNull()
    expect(document.querySelectorAll('[data-bing-cursor-native]')).toHaveLength(1)

    await userEvent.hover(page.getByTestId('button'))
    await tick()
    expect(getComputedStyle(host!.querySelector('button')!).cursor).toMatch(/, pointer$/)
    await page.getByRole('textbox', { name: '输入' }).fill('正常编辑')
    await userEvent.hover(page.getByRole('textbox', { name: '输入' }))
    await tick()
    expect(getComputedStyle(host!.querySelector('input')!).cursor).toMatch(/, text$/)
    expect(host!.querySelector('input')!.value).toBe('正常编辑')
  })

  it('16 种预设均能被浏览器解码为有可见像素的图像', async () => {
    await mountNative({ size: 32, color: '#123456', outlineColor: '#fedcba' })
    await userEvent.hover(page.getByTestId('plain'))
    for (const type of Object.keys(cursorHotspots) as BingCursorType[]) {
      target().dataset.bingCursor = type
      await tick()
      await tick()
      const value = cursor()
      const [x, y] = cursorHotspots[type]
      expect(value).toContain(` ${x} ${y}, ${type}`)
      const image = new Image()
      image.src = value.match(/url\("([^"]+)"\)/)![1]!
      await image.decode()
      expect([image.naturalWidth, image.naturalHeight]).toEqual([32, 32])
      const canvas = document.createElement('canvas')
      canvas.width = canvas.height = 32
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const pixels = context.getImageData(0, 0, 32, 32).data
      expect(pixels.some((value, index) => index % 4 === 3 && value > 0)).toBe(true)
      expect(cursorSvg(value).querySelector('parsererror')).toBeNull()
    }
  })

  it('全局状态切换只标记命中元素，复用静态规则并保留其他区域的原始光标', async () => {
    await mountNative({ global: true })
    const outside = host!.querySelector<HTMLElement>('[data-testid="outside"]')!
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    const sheet = document.querySelector<HTMLStyleElement>('[data-bing-cursor-style]')!.sheet!
    const initialRules = [...sheet.cssRules]
    const initialText = initialRules.map(rule => rule.cssText)
    for (const type of Object.keys(cursorHotspots) as BingCursorType[]) {
      target().dataset.bingCursor = type
      await tick()
      await tick()
      expect(cursor()).toMatch(new RegExp(`, ${type}$`))
      expect(getComputedStyle(target(), '::before').cursor).toBe(cursor())
      expect(getComputedStyle(outside).cursor).toBe('crosshair')
      expect(document.querySelector('[data-bing-cursor-native]')).toBe(target())
      expect([...sheet.cssRules]).toEqual(initialRules)
      expect([...sheet.cssRules].map(rule => rule.cssText)).toEqual(initialText)
    }
    await userEvent.hover(page.getByTestId('button'))
    await tick()
    expect(document.querySelector('[data-bing-cursor-native]')).toBe(host!.querySelector('button'))
    expect(target().hasAttribute('data-bing-cursor-native')).toBe(false)
    expect(document.documentElement.hasAttribute('data-bing-cursor-native')).toBe(false)
    expect([...sheet.cssRules]).toEqual(initialRules)
  })

  it('编辑区的光标标记留在编辑根节点，切换文字、链接和嵌入控件不触发正文重建', async () => {
    await mountNative({ global: true })
    const editor = document.createElement('div')
    editor.contentEditable = 'true'
    editor.style.cssText = 'padding:20px'
    editor.innerHTML = '<p data-testid="editable-text" style="padding:20px">可编辑文字</p><a data-testid="editable-link" href="#editor" style="display:block;padding:20px">链接</a><div contenteditable="false" data-bing-cursor="zoom-in"><span data-testid="editable-widget" style="display:block;padding:20px">嵌入控件</span></div><div data-testid="editable-native" data-bing-cursor="native" style="padding:20px;cursor:help">原生区域</div>'
    host!.append(editor)
    const originalContent = editor.innerHTML
    const mutations: MutationRecord[] = []
    const observer = new MutationObserver(records => mutations.push(...records.filter(record => record.target !== editor)))
    observer.observe(editor, { attributes: true, childList: true, characterData: true, subtree: true })
    try {
      for (const [id, type] of [['editable-text', 'text'], ['editable-link', 'pointer'], ['editable-widget', 'zoom-in']] as const) {
        await userEvent.hover(page.getByTestId(id))
        await tick()
        const element = editor.querySelector(`[data-testid="${id}"]`)!
        expect(getComputedStyle(element).cursor).toMatch(new RegExp(`, ${type}$`))
        expect(getComputedStyle(element, '::before').cursor).toBe(getComputedStyle(element).cursor)
        expect(document.querySelector('[data-bing-cursor-native]')).toBe(editor)
        expect(editor.querySelector('[data-bing-cursor-native]')).toBeNull()
      }
      await new Promise(resolve => setTimeout(resolve, 200))
      expect(editor.innerHTML).toBe(originalContent)
      expect(mutations).toHaveLength(0)
      await userEvent.hover(page.getByTestId('editable-native'))
      await tick()
      expect(getComputedStyle(editor.querySelector('[data-testid="editable-native"]')!).cursor).toBe('help')
      expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    } finally {
      observer.disconnect()
    }
  })

  it('同一目标连续移动复用状态，不逐帧读取样式、扫描 CSSOM 或写位置', async () => {
    const sheet = document.createElement('style')
    sheet.textContent = Array.from({ length: 3000 }, (_, i) => `.unrelated-${i}{color:red}`).join('')
    document.head.append(sheet)
    temporary.push(sheet)
    await mountNative({ type: 'default' })
    await userEvent.hover(page.getByTestId('plain'), { position: { x: 10, y: 10 } })
    await tick()
    await tick()
    // 固定校验时钟，隔离移动快路径；下面另有 CSSOM 低频更新测试。
    vi.spyOn(performance, 'now').mockReturnValue(performance.now())
    const computed = vi.spyOn(window, 'getComputedStyle')
    const rules = vi.spyOn(CSSStyleSheet.prototype, 'cssRules', 'get')
    const hit = vi.spyOn(document, 'elementFromPoint')
    const frame = vi.spyOn(window, 'requestAnimationFrame')
    for (let i = 0; i < 16; i++) {
      await userEvent.hover(page.getByTestId('plain'), { position: { x: 10 + i, y: 10 } })
    }
    expect(computed).not.toHaveBeenCalled()
    expect(rules).not.toHaveBeenCalled()
    expect(hit).not.toHaveBeenCalled()
    expect(frame).not.toHaveBeenCalled()
    expect(document.querySelector('[data-bing-cursor-layer]')).toBeNull()
  })

  it('响应局部主题变量、颜色 props、尺寸和热点变化', async () => {
    const options = await mountNative()
    host!.style.setProperty('--bing-cursor-color', '#123456')
    host!.style.setProperty('--bing-cursor-outline', '#fedcba')
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    expect(cursorSvg().querySelector('path')!.getAttribute('fill')).toBe('rgb(18, 52, 86)')
    expect(cursorSvg().querySelector('path')!.getAttribute('stroke')).toBe('rgb(254, 220, 186)')
    host!.style.setProperty('--theme-accent', '#ab1234')
    options.value = { size: 40, hotspot: [7, 9], color: 'var(--theme-accent)', outlineColor: '#ffffff' }
    await tick()
    await tick()
    expect(cursorSvg().querySelector('path')!.getAttribute('fill')).toBe('rgb(171, 18, 52)')
    expect(cursorSvg().documentElement.getAttribute('width')).toBe('40')
    expect(cursor()).toMatch(/ 7 9, default$/)
    host!.style.setProperty('--theme-accent', '#345678')
    await tick()
    await tick()
    expect(cursorSvg().querySelector('path')!.getAttribute('fill')).toBe('rgb(52, 86, 120)')
  })

  it('鼠标静止时响应禁用、DOM 样式变化和新样式表，并保留原生逃生区域', async () => {
    await mountNative()
    const button = host!.querySelector('button')!
    await userEvent.hover(page.getByTestId('button'))
    await tick()
    button.disabled = true
    await tick()
    await tick()
    expect(getComputedStyle(button).cursor).toMatch(/, not-allowed$/)
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    const sheet = document.createElement('style')
    sheet.textContent = '.cursor-native-plain { cursor: progress; }'
    document.head.append(sheet)
    temporary.push(sheet)
    await tick()
    await tick()
    expect(cursor()).toBe('progress')
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    sheet.textContent = '.cursor-native-plain { cursor: grab; }'
    await tick()
    await tick()
    expect(cursor()).toMatch(/, grab$/)
    await userEvent.hover(page.getByTestId('escape'))
    await tick()
    expect(getComputedStyle(host!.querySelector('[data-testid="escape"]')!).cursor).toBe('help')
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    await userEvent.hover(page.getByTestId('plain'))
    await userEvent.hover(page.getByTestId('outside'))
    await tick()
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
  })

  it('移动时低频发现 CSSOM 的直接增删改，停止移动后不轮询', async () => {
    const sheet = document.createElement('style')
    sheet.textContent = '.cursor-native-plain { color: red; }'
    document.head.append(sheet)
    temporary.push(sheet)
    await mountNative()
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    const rule = sheet.sheet!.cssRules[0] as CSSStyleRule
    let now = performance.now()
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    rule.style.setProperty('cursor', 'crosshair', 'important')
    now += 150
    await userEvent.hover(page.getByTestId('plain'), { position: { x: 10, y: 10 } })
    await tick()
    expect(cursor()).toMatch(/, crosshair$/)
    sheet.sheet!.deleteRule(0)
    now += 150
    await userEvent.hover(page.getByTestId('plain'), { position: { x: 15, y: 10 } })
    await tick()
    expect(cursor()).toMatch(/, default$/)
    await tick()
    const scans = vi.spyOn(CSSStyleSheet.prototype, 'cssRules', 'get')
    await new Promise(resolve => setTimeout(resolve, 200))
    expect(scans).not.toHaveBeenCalled()
  })

  it('持续使用图片时响应 CSS 悬停、继承和变量，卸载后恢复样式表', async () => {
    const sheet = document.createElement('style')
    sheet.textContent = `@layer cursor-test {
      .cursor-test-parent { cursor: crosshair; }
      .cursor-test-parent:hover { cursor: var(--cursor-kind) !important; }
    }`
    document.head.append(sheet)
    temporary.push(sheet)
    const initialRules = [...sheet.sheet!.cssRules].map(rule => rule.cssText)
    const kind = ref('zoom-in')
    host = document.createElement('div')
    document.body.append(host)
    app = createApp({
      render: () => h(BingCursor, {}, () => h('div', {
        class: 'cursor-test-parent', style: { margin: '40px', padding: '30px', '--cursor-kind': kind.value },
      }, h('span', { 'data-testid': 'plain', style: 'display:block;padding:30px' }, '继承光标'))),
    })
    app.mount(host)
    await tick()
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    expect(cursor()).toMatch(/, zoom-in$/)
    kind.value = 'ns-resize'
    await tick()
    await tick()
    expect(cursor()).toMatch(/, ns-resize$/)
    kind.value = 'progress'
    await tick()
    await tick()
    expect(cursor()).toBe('progress')
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    kind.value = 'grab'
    await tick()
    await tick()
    expect(cursor()).toMatch(/, grab$/)
    app.unmount()
    app = undefined
    expect([...sheet.sheet!.cssRules].map(rule => rule.cssText)).toEqual(initialRules)
  })

  it('输入框与按钮切换焦点时保持图片光标，窗口失焦时恢复系统光标', async () => {
    await mountNative()
    await page.getByRole('textbox', { name: '输入' }).click()
    await userEvent.hover(page.getByTestId('button'))
    await tick()
    const button = host!.querySelector('button')!
    button.focus()
    await tick()
    expect(document.activeElement).toBe(button)
    expect(getComputedStyle(button).cursor).toMatch(/, pointer$/)
    window.dispatchEvent(new Event('blur'))
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
  })

  it('禁用和卸载时正确恢复样式与节点', async () => {
    const options = await mountNative()
    const element = target()
    const original = element.getAttribute('style')
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    expect(cursor()).toMatch(/, default$/)
    options.value.disabled = true
    await tick()
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    options.value.disabled = false
    await tick()
    expect(cursor()).toMatch(/, default$/)
    app!.unmount()
    app = undefined
    expect(element.getAttribute('style')).toBe(original)
    expect(document.querySelector('[data-bing-cursor-native], [data-bing-cursor-style], [data-bing-cursor-source], [data-bing-cursor-palette]')).toBeNull()
  })

  it('全局与局部实例共享控制器，按作用域切换图形、颜色和尺寸', async () => {
    host = document.createElement('div')
    document.body.append(host)
    app = createApp({
      render: () => h('main', { style: 'padding:40px;display:grid;gap:30px' }, [
        h(BingCursor, { global: true }),
        h('div', { 'data-testid': 'global', style: 'padding:30px' }, '全局'),
        h(BingCursor, { type: 'crosshair', size: 40, color: '#2563eb' }, () => h('div', { 'data-testid': 'local', style: 'padding:30px' }, '局部')),
      ]),
    })
    app.mount(host)
    await tick()
    await userEvent.hover(page.getByTestId('global'))
    await tick()
    expect(document.querySelector('[data-bing-cursor-native]')).toBe(host.querySelector('[data-testid="global"]'))
    await userEvent.hover(page.getByTestId('local'))
    await tick()
    const localCursor = getComputedStyle(host.querySelector('[data-testid="local"]')!).cursor
    expect(localCursor).toMatch(/, crosshair$/)
    expect(cursorSvg(localCursor).documentElement.getAttribute('width')).toBe('40')
    expect(cursorSvg(localCursor).querySelector('path')!.getAttribute('fill')).toBe('rgb(37, 99, 235)')
    expect(document.querySelectorAll('[data-bing-cursor-native]')).toHaveLength(1)
    expect(document.documentElement.hasAttribute('data-bing-cursor-native')).toBe(false)
    await userEvent.hover(page.getByTestId('global'))
    await tick()
    const globalCursor = getComputedStyle(host.querySelector('[data-testid="global"]')!).cursor
    expect(globalCursor).toMatch(/, default$/)
    expect(cursorSvg(globalCursor).documentElement.getAttribute('width')).toBe('28')
    expect(document.querySelector('[data-bing-cursor-native]')).toBe(host.querySelector('[data-testid="global"]'))
    expect(document.querySelectorAll('[data-bing-cursor-style]')).toHaveLength(1)
    expect(document.querySelector('[data-bing-cursor-layer]')).toBeNull()
  })

  it('按下、触摸和键盘导航立即改变或释放原生图片光标', async () => {
    await mountNative()
    target().dataset.bingCursor = 'grab'
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    const bounds = target().getBoundingClientRect()
    target().dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, pointerType: 'mouse', buttons: 1, clientX: bounds.x + 10, clientY: bounds.y + 10,
    }))
    await tick()
    expect(cursor()).toMatch(/, grabbing$/)
    target().dispatchEvent(new PointerEvent('pointerup', {
      bubbles: true, pointerType: 'mouse', clientX: bounds.x + 10, clientY: bounds.y + 10,
    }))
    await tick()
    expect(cursor()).toMatch(/, grab$/)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    document.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
  })

  it('强制颜色模式使用系统光标', async () => {
    const original = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => {
      const result = original(query)
      if (query === '(forced-colors: active)') Object.defineProperty(result, 'matches', { value: true })
      return result
    })
    await mountNative()
    await userEvent.hover(page.getByTestId('plain'))
    await tick()
    expect(document.querySelector('[data-bing-cursor-native], [data-bing-cursor-layer]')).toBeNull()
  })

  it('图片采用有限尺寸、合法热点和系统回退值，颜色不能注入 SVG 内容', () => {
    const value = createNativeCursor('default', 999, 'red"/><script>bad()</script>', '#fff', [-10, Infinity])
    const svg = cursorSvg(value)
    expect(svg.documentElement.getAttribute('width')).toBe('128')
    expect(svg.querySelector('script')).toBeNull()
    expect(value).toMatch(/ 0 0, default$/)
    expect(createNativeCursor('default', NaN, '#000', '#fff')).toContain(' 4 3, default')
  })
})
