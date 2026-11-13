import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import { gsap } from 'gsap'
import BingTextarea from './BingTextarea.vue'
import type { BingTextareaProps } from './BingTextarea.types'
import '../../theme/index.css'

const cleanups: Array<() => void> = []
function mountTextarea(props: BingTextareaProps & { wrap?: string } = {}) {
  const host = document.createElement('div')
  host.style.cssText = 'width: 300px; margin: 24px;'
  document.body.append(host)
  const model = ref(props.modelValue ?? '')
  const settings = ref(props)
  const app = createApp({ render: () => h(BingTextarea, {
    clearable: false, resize: 'none', rows: 4, ...settings.value, modelValue: model.value, block: true,
    style: { fontFamily: '"Courier New", monospace', '--bing-textarea-font-size': '20px', '--bing-textarea-line-height': '28px', '--bing-textarea-padding-x': '10px', '--bing-textarea-padding-y': '10px' },
    'onUpdate:modelValue': value => { model.value = value },
  }) })
  app.mount(host)
  const field = host.querySelector('textarea')!
  const caret = host.querySelector<HTMLElement>('.bing-textarea__caret')!
  const point = () => ({ x: Number(gsap.getProperty(caret, 'x')), y: Number(gsap.getProperty(caret, 'y')) })
  const width = (text: string) => {
    const context = document.createElement('canvas').getContext('2d')!
    context.font = '20px "Courier New", monospace'
    return context.measureText(text).width
  }
  const expected = (text: string, line: number) => ({ x: Math.max(0, Math.min(field.clientWidth - 2, 10 + width(text) - field.scrollLeft)), y: 12 + line * 28 - field.scrollTop })
  async function at(text: string, line: number) {
    await expect.poll(() => field.hasAttribute('data-smooth-caret')).toBe(true)
    await expect.poll(() => Math.abs(point().x - expected(text, line).x)).toBeLessThan(1)
    await expect.poll(() => Math.abs(point().y - expected(text, line).y)).toBeLessThan(1)
  }
  let unmounted = false
  const unmount = () => { if (!unmounted) { unmounted = true; app.unmount(); host.remove() } }
  cleanups.push(unmount)
  return { host, model, settings, field, caret, point, width, at, unmount }
}
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.restoreAllMocks() })

describe('BingTextarea 平滑光标', () => {
  it('首帧接管空值光标，真实输入不延迟模型，水平移动经过中间帧', async () => {
    const { field, model, caret, point, at } = mountTextarea()
    field.focus()
    expect(field.hasAttribute('data-smooth-caret')).toBe(true)
    await at('', 0)
    // 聚焦还会安排一次原生插入点校准；完成后再测量输入动画，避免采样校准帧。
    await new Promise(requestAnimationFrame)
    const positions: number[] = []
    let sampling = true
    const sample = () => { if (sampling) { positions.push(point().x); requestAnimationFrame(sample) } }
    requestAnimationFrame(sample)
    try {
      await userEvent.keyboard('smooth')
      expect(model.value).toBe('smooth')
      await at('smooth', 0)
      expect(positions.some(x => x > 11 && x < point().x - 1)).toBe(true)
      expect(getComputedStyle(field).caretColor).toBe('rgba(0, 0, 0, 0)')
      expect(getComputedStyle(caret).width).toBe('2px')
    } finally { sampling = false }
  })

  it('换行与末尾空行准确定位，纵向位移平滑，方向键和退格仍编辑原生文本', async () => {
    const { field, model, point, at } = mountTextarea({ modelValue: 'first', autosize: { minRows: 1, maxRows: 4 } })
    field.focus(); field.setSelectionRange(5, 5)
    await at('first', 0)
    await new Promise(requestAnimationFrame)
    const ys: number[] = []
    let sampling = true
    const sample = () => { if (sampling) { ys.push(point().y); requestAnimationFrame(sample) } }
    requestAnimationFrame(sample)
    try {
      await userEvent.keyboard('{Enter}')
      expect(model.value).toBe('first\n')
      // 自动增高新增 120ms 过渡；先等高度稳定，避免只采样到滚动校准的第一帧。
      await expect.poll(() => field.clientHeight).toBe(84)
      await at('', 1)
      expect(ys.some(y => y > 13 && y < 39)).toBe(true)
    } finally { sampling = false }
    await userEvent.keyboard('second{ArrowLeft}{Backspace}')
    expect(model.value).toBe('first\nsecod')
    await at('seco', 1)
    await userEvent.keyboard('{Home}{Enter}')
    expect(model.value).toBe('first\n\nsecod')
    await at('', 2)
  })

  it('自动折行、改变宽度及外层旋转后重新对齐，不改变内容、选区或高度策略', async () => {
    const { host, field, model, at, width } = mountTextarea({ autosize: { minRows: 1, maxRows: 8 }, modelValue: 'a'.repeat(35) })
    field.focus(); field.setSelectionRange(35, 35)
    const columns = () => Math.floor((field.clientWidth - 20) / width('a'))
    await at('a'.repeat(35 % columns()), Math.floor(35 / columns()))
    const originalHeight = field.clientHeight
    host.style.width = '190px'
    await expect.poll(() => field.clientHeight).toBeGreaterThan(originalHeight)
    await at('a'.repeat(35 % columns()), Math.floor(35 / columns()))
    expect(model.value).toBe('a'.repeat(35))
    expect([field.selectionStart, field.selectionEnd]).toEqual([35, 35])
    host.style.transform = 'rotate(2deg)'
    field.dispatchEvent(new Event('input', { bubbles: true }))
    await at('a'.repeat(35 % columns()), Math.floor(35 / columns()))
  })

  it('内部纵向和横向滚动立即校准，插入点在视口外时回退，不在边缘伪造光标', async () => {
    const value = Array.from({ length: 12 }, () => 'line').join('\n')
    const { field, settings, model, at } = mountTextarea({ modelValue: value, rows: 3 })
    field.focus()
    await userEvent.keyboard('{Control>}{End}{/Control}')
    await expect.poll(() => field.scrollTop).toBeGreaterThan(0)
    await at('line', 11)
    field.scrollTop = 0
    await expect.poll(() => field.hasAttribute('data-smooth-caret')).toBe(false)
    await userEvent.keyboard('{Control>}{Home}{/Control}')
    await at('', 0)
    settings.value = { wrap: 'off', rows: 3 }
    model.value = 'a'.repeat(60)
    await nextTick()
    field.setSelectionRange(0, 0)
    expect(field.wrap).toBe('off')
    await userEvent.keyboard('{Control>}{End}{/Control}')
    await expect.poll(() => field.scrollLeft).toBeGreaterThan(0)
    await at('a'.repeat(60), 0)
  })

  it('中文组词跨行跟随选区焦点端，确认/取消不修改真实选区', async () => {
    const { field, model, at } = mountTextarea({ modelValue: 'first\n' })
    field.focus(); field.setSelectionRange(6, 6)
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    field.value = 'first\nzhongwen'
    field.setSelectionRange(6, 14, 'forward')
    field.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true }))
    await at('zhongwen', 1)
    expect([field.selectionStart, field.selectionEnd]).toEqual([6, 14])
    field.setSelectionRange(6, 14, 'backward')
    field.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'zhongwen', bubbles: true }))
    await at('', 1)
    field.value = 'first\n中文🙂'
    field.setSelectionRange(field.value.length, field.value.length)
    field.dispatchEvent(new CompositionEvent('compositionend', { data: '中文🙂', bubbles: true }))
    field.dispatchEvent(new InputEvent('input', { bubbles: true }))
    await at('中文🙂', 1)
    expect(model.value).toBe('first\n中文🙂')
    expect(document.activeElement).toBe(field)
  })

  it('选择文本、关闭开关、只读、禁用和触屏回到原生光标，清空后仍能定位', async () => {
    const { host, field, settings, at } = mountTextarea({ modelValue: 'hello', clearable: true })
    field.focus(); field.setSelectionRange(1, 4)
    await expect.poll(() => field.hasAttribute('data-smooth-caret')).toBe(false)
    expect([field.selectionStart, field.selectionEnd]).toEqual([1, 4])
    await userEvent.click(host.querySelector<HTMLButtonElement>('.bing-textarea__clear')!)
    await at('', 0)
    for (const prop of [{ smoothCaret: false }, { readonly: true }, { disabled: true }]) {
      settings.value = prop
      await expect.poll(() => field.hasAttribute('data-smooth-caret')).toBe(false)
      settings.value = {}; await nextTick(); field.focus()
      await at('', 0)
    }
    field.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
    await expect.poll(() => field.hasAttribute('data-smooth-caret')).toBe(false)
  })

  it('减少动态效果不创建测量节点，双向文本不显示不可靠的装饰光标', async () => {
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => {
      const media = matchMedia(query)
      if (query.includes('prefers-reduced-motion')) Object.defineProperty(media, 'matches', { value: true })
      return media
    })
    const { field, unmount } = mountTextarea()
    field.focus(); await new Promise(requestAnimationFrame)
    expect(field.hasAttribute('data-smooth-caret')).toBe(false)
    expect(document.querySelector('[data-bing-textarea-measure]')).toBeNull()
    unmount(); vi.restoreAllMocks()
    const bidi = mountTextarea({ modelValue: 'hello مرحبا' })
    bidi.field.focus(); await new Promise(requestAnimationFrame)
    expect(bidi.field.hasAttribute('data-smooth-caret')).toBe(false)
  })

  it('失焦与卸载移除测量节点、监听和动画，可重新聚焦恢复', async () => {
    const { field, caret, unmount, at } = mountTextarea()
    field.focus(); await at('', 0)
    expect(document.querySelectorAll('[data-bing-textarea-measure]')).toHaveLength(1)
    await userEvent.keyboard('test')
    field.blur()
    expect(gsap.getTweensOf(caret)).toHaveLength(0)
    expect(document.querySelector('[data-bing-textarea-measure]')).toBeNull()
    field.focus(); await at('test', 0)
    unmount()
    expect(gsap.getTweensOf(caret)).toHaveLength(0)
    expect(document.querySelector('[data-bing-textarea-measure]')).toBeNull()
    expect(field.hasAttribute('data-smooth-caret')).toBe(false)
  })
})
