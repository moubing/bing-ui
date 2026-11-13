import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BingCursor from './BingCursor.vue'
import { resolveCursorType } from './BingCursor.presets'
import { createCursorStyleSource } from './BingCursor.styleSource'

const wrappers: VueWrapper[] = []
const frame = async () => {
  await nextTick()
  await new Promise(requestAnimationFrame)
  await nextTick()
}

beforeEach(() => {
  // happy-dom 不做布局；浏览器的滚动条边界判断使用真实视口。
  vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1024)
  vi.spyOn(document.documentElement, 'clientHeight', 'get').mockReturnValue(768)
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => Object.assign(new EventTarget(), {
    media: query,
    matches: query === '(any-pointer: fine)' || query === '(any-hover: hover)',
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
  }))
})

afterEach(() => {
  wrappers.forEach(wrapper => wrapper.unmount())
  wrappers.length = 0
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('BingCursor 的状态识别', () => {
  it.each([
    ['default', 'default'], ['pointer', 'pointer'], ['text', 'text'], ['not-allowed', 'not-allowed'],
    ['grab', 'grab'], ['grabbing', 'grabbing'], ['col-resize', 'col-resize'], ['row-resize', 'row-resize'],
    ['n-resize', 'ns-resize'], ['e-resize', 'ew-resize'], ['ne-resize', 'nesw-resize'], ['se-resize', 'nwse-resize'],
    ['all-scroll', 'move'], ['no-drop', 'not-allowed'],
  ])('将 %s 识别为 %s', (cursor, expected) => {
    expect(resolveCursorType(document.createElement('div'), cursor)).toBe(expected)
  })

  it('从嵌套元素识别链接、输入与显式状态', () => {
    const link = document.createElement('a')
    link.href = '#target'
    const span = document.createElement('span')
    link.append(span)
    expect(resolveCursorType(span, 'auto')).toBe('pointer')
    expect(resolveCursorType(document.createElement('input'), 'auto')).toBe('text')
    link.dataset.bingCursor = 'grab'
    expect(resolveCursorType(span, 'pointer', 'default', true)).toBe('grabbing')
  })

  it('禁用状态优先于装饰性指定，原生逃生属性优先于禁用', () => {
    const button = document.createElement('button')
    button.disabled = true
    button.dataset.bingCursor = 'pointer'
    const span = document.createElement('span')
    button.append(span)
    expect(resolveCursorType(span, 'pointer', 'grab')).toBe('not-allowed')
    button.dataset.bingCursor = 'native'
    expect(resolveCursorType(span, 'pointer')).toBeNull()
  })

  it.each(['wait', 'progress', 'help', 'none', 'url("cursor.svg"), pointer'])('为 %s 保留原生光标', cursor => {
    expect(resolveCursorType(document.createElement('div'), cursor)).toBeNull()
  })

  it('保留原生控件和顶层弹窗的光标', () => {
    expect(resolveCursorType(document.createElement('select'), 'pointer')).toBeNull()
    expect(resolveCursorType(document.createElement('iframe'), 'auto')).toBeNull()
    const dialog = document.createElement('dialog')
    dialog.open = true
    const button = document.createElement('button')
    dialog.append(button)
    expect(resolveCursorType(button, 'pointer')).toBeNull()
  })

  it('不把 contenteditable=false 的区域识别为可编辑文本', () => {
    const parent = document.createElement('div')
    parent.contentEditable = 'true'
    const child = document.createElement('div')
    child.contentEditable = 'false'
    parent.append(child)
    expect(resolveCursorType(parent, 'auto')).toBe('text')
    expect(resolveCursorType(child, 'auto')).toBe('default')
  })

  it('保留加载按钮的 progress，避免把忙碌状态变成普通禁用', () => {
    const button = document.createElement('button')
    button.disabled = true
    expect(resolveCursorType(button, 'progress')).toBeNull()
  })
})

async function setup(props = {}) {
  const wrapper = mount(BingCursor, {
    attachTo: document.body,
    props,
    slots: { default: () => h('button', { style: 'cursor: grab', 'data-testid': 'target' }, '拖动') },
  })
  wrappers.push(wrapper)
  await frame()
  return wrapper
}

async function point(element: Element, options: PointerEventInit = {}) {
  vi.spyOn(document, 'elementFromPoint').mockReturnValue(element)
  element.dispatchEvent(new PointerEvent('pointermove', {
    bubbles: true, pointerType: 'mouse', clientX: 160, clientY: 100, ...options,
  }))
  await frame()
}

describe('BingCursor 的作用域和清理', () => {
  it('同一目标内的高频移动不调度位置帧，也不重复发出状态事件', async () => {
    const wrapper = await setup()
    const button = wrapper.get('button').element
    await point(button)
    await frame()
    vi.spyOn(performance, 'now').mockReturnValue(performance.now())
    const frames = vi.spyOn(window, 'requestAnimationFrame')
    const events = wrapper.emitted('change')?.length
    for (let index = 0; index < 150; index++) {
      button.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, pointerType: 'mouse', clientX: 160 + index, clientY: 100,
      }))
    }
    expect(frames).not.toHaveBeenCalled()
    expect(wrapper.emitted('change')?.length).toBe(events)
    expect(document.querySelector('[data-bing-cursor-layer]')).toBeNull()
  })

  it('普通移动复用事件目标，滚动和指针捕获时重新命中', async () => {
    const wrapper = await setup({ global: true })
    const button = wrapper.get('button').element
    await point(button)
    await frame()
    const hit = vi.spyOn(document, 'elementFromPoint').mockReturnValue(button)
    hit.mockClear()
    for (let step = 0; step < 12; step++) {
      button.dispatchEvent(new PointerEvent('pointermove', {
        bubbles: true, pointerType: 'mouse', clientX: 160 + step, clientY: 100,
      }))
      await frame()
    }
    expect(hit).not.toHaveBeenCalled()
    document.dispatchEvent(new Event('scroll'))
    await frame()
    expect(hit).toHaveBeenCalled()
    hit.mockClear()
    Object.defineProperty(button, 'hasPointerCapture', { configurable: true, value: () => true })
    button.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, pointerType: 'mouse', buttons: 1, pointerId: 1, clientX: 170, clientY: 100,
    }))
    await frame()
    expect(hit).toHaveBeenCalled()
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['grabbing'])
  })

  it('指针捕获期间每帧重新命中，跨区域仍保持抓取状态并恢复已有属性', async () => {
    const wrapper = await setup()
    const button = wrapper.get('button').element
    const outside = document.createElement('div')
    outside.setAttribute('data-bing-cursor-native', 'original')
    document.body.append(outside)
    await point(button)
    Object.defineProperty(button, 'hasPointerCapture', { configurable: true, value: () => true })
    vi.spyOn(document, 'elementFromPoint').mockReturnValue(outside)
    vi.spyOn(performance, 'now').mockReturnValue(performance.now())
    button.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, pointerType: 'mouse', buttons: 1, pointerId: 1, clientX: 250, clientY: 100,
    }))
    await frame()
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['grabbing'])
    expect(button.getAttribute('data-bing-cursor-native')).toBe(outside.getAttribute('data-bing-cursor-native'))
    const hit = vi.spyOn(document, 'elementFromPoint').mockReturnValue(document.body)
    hit.mockClear()
    button.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, pointerType: 'mouse', buttons: 1, pointerId: 1, clientX: 300, clientY: 100,
    }))
    await frame()
    expect(hit).toHaveBeenCalled()
    expect(outside.getAttribute('data-bing-cursor-native')).toBe('original')
    document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }))
    expect(button.hasAttribute('data-bing-cursor-native')).toBe(false)
    expect(document.body.hasAttribute('data-bing-cursor-native')).toBe(false)
  })

  it('同帧 DOM 变化会作废指针事件的旧命中结果', async () => {
    const wrapper = await setup({ global: true })
    const button = wrapper.get('button').element
    await point(button)
    const overlay = document.createElement('div')
    overlay.style.cursor = 'crosshair'
    const hit = vi.spyOn(document, 'elementFromPoint').mockReturnValue(overlay)
    hit.mockClear()
    button.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true, pointerType: 'mouse', clientX: 160, clientY: 100,
    }))
    document.body.append(overlay)
    await frame()
    expect(hit).toHaveBeenCalled()
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['crosshair'])
  })

  it('未发生鼠标输入时保留系统光标和插槽内容', async () => {
    const wrapper = await setup()
    expect(wrapper.find('button').exists()).toBe(true)
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    expect(document.querySelector('[data-bing-cursor-palette]')?.getAttribute('aria-hidden')).toBe('true')
    expect(document.querySelector('[data-bing-cursor-palette]')?.hasAttribute('hidden')).toBe(true)
  })

  it('按下抓取区域时切换状态，离开作用域后恢复原生光标', async () => {
    const wrapper = await setup()
    const button = wrapper.get('button').element
    await point(button, { buttons: 1 })
    expect(wrapper.emitted('change')?.at(-1)).toEqual(['grabbing'])
    expect(button.style.cursor).toBe('grab')
    await point(document.body)
    expect(wrapper.emitted('visibility-change')?.at(-1)).toEqual([false])
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
  })

  it('触摸、取消和键盘导航会恢复系统光标', async () => {
    const wrapper = await setup()
    const button = wrapper.get('button').element
    await point(button)
    await point(button, { pointerType: 'touch' })
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    await point(button)
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    await point(button)
    document.dispatchEvent(new PointerEvent('pointercancel', { bubbles: true }))
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
  })

  it('最后一个实例卸载时移除共享样式和作用域标记', async () => {
    const wrapper = await setup()
    await point(wrapper.get('button').element)
    wrapper.unmount()
    wrappers.splice(wrappers.indexOf(wrapper), 1)
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    expect(document.querySelector('[data-bing-cursor-style]')).toBeNull()
    expect(document.querySelector('[data-bing-cursor-layer]')).toBeNull()
  })

  it('响应 disabled 的变化并立即恢复原生光标', async () => {
    const wrapper = await setup()
    await point(wrapper.get('button').element)
    await wrapper.setProps({ disabled: true })
    await frame()
    expect(document.querySelector('[data-bing-cursor-native]')).toBeNull()
    expect(wrapper.emitted('visibility-change')?.at(-1)).toEqual([false])
  })
})

describe('BingCursor 的样式扫描', () => {
  it('跳过无 cursor 的规则，并保留 CSSOM 动态增删 cursor 和优先级的能力', () => {
    const sheet = document.createElement('style')
    sheet.textContent = '.cursor-source-test { color: red; }'
    document.head.append(sheet)
    const rule = sheet.sheet!.cssRules[0] as CSSStyleRule
    const priority = vi.spyOn(rule.style, 'getPropertyPriority')
    const source = createCursorStyleSource(document)
    try {
      source.read(document.body)
      expect(priority).not.toHaveBeenCalled()
      rule.style.setProperty('cursor', 'crosshair', 'important')
      source.read(document.body)
      expect(rule.style.getPropertyValue('--bing-cursor-source')).toBe('crosshair')
      expect(rule.style.getPropertyPriority('--bing-cursor-source')).toBe('important')
      rule.style.removeProperty('cursor')
      source.read(document.body)
      expect(rule.style.getPropertyValue('--bing-cursor-source')).toBe('')
    } finally {
      source.destroy()
      sheet.remove()
    }
  })
})
