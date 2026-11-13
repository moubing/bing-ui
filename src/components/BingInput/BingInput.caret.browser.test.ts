import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import { gsap } from 'gsap'
import BingInput from './BingInput.vue'
import type { BingInputProps } from './BingInput.types'
import '../../theme/index.css'

const cleanups: Array<() => void> = []

function mountInput(props: BingInputProps = {}) {
  const host = document.createElement('div')
  host.style.cssText = 'width: 360px; margin: 30px;'
  document.body.append(host)
  const model = ref<string | number | null>(props.modelValue ?? '')
  const liveProps = ref(props)
  const app = createApp({ render: () => h(BingInput, {
    ...liveProps.value, modelValue: model.value, block: true,
    'onUpdate:modelValue': value => { model.value = value },
  }) })
  app.mount(host)
  const input = host.querySelector('input')!
  // 固定字体，避免系统对泛型 monospace 的 DOM 与 Canvas 回退不同。
  input.style.fontFamily = '"Courier New", monospace'
  input.style.fontSize = '20px'
  const caret = host.querySelector<HTMLElement>('.bing-input__caret')!
  const layer = host.querySelector<HTMLElement>('.bing-input__caret-layer')!
  let unmounted = false
  const unmount = () => {
    if (unmounted) return
    unmounted = true
    app.unmount()
    host.remove()
  }
  cleanups.push(unmount)
  const x = () => caret.getBoundingClientRect().left - input.getBoundingClientRect().left
  const expectedX = () => {
    const context = document.createElement('canvas').getContext('2d')!
    const style = getComputedStyle(input)
    context.font = `${style.fontSize} ${style.fontFamily}`
    const width = context.measureText(input.value.slice(0, input.selectionStart ?? 0)).width
    return Math.max(0, Math.min(input.clientWidth - 2, width - input.scrollLeft))
  }
  return { host, input, caret, layer, model, liveProps, x, expectedX, unmount }
}

afterEach(() => {
  cleanups.splice(0).forEach(cleanup => cleanup())
  vi.restoreAllMocks()
})

describe('BingInput 平滑光标', () => {
  it('聚焦首帧直接使用自定义光标，普通鼠标按下不短暂切回原生', async () => {
    const { input, caret, x, expectedX } = mountInput({ modelValue: 'focus' })
    const focusStates: boolean[] = []
    input.addEventListener('focusin', () => { focusStates.push(input.hasAttribute('data-smooth-caret')) })
    await userEvent.click(input)
    expect(focusStates).toEqual([true])
    input.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }))
    expect(input.hasAttribute('data-smooth-caret')).toBe(true)
    expect(getComputedStyle(input).caretColor).toBe('rgba(0, 0, 0, 0)')
    input.setSelectionRange(2, 2)
    document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true }))
    expect(input.hasAttribute('data-smooth-caret')).toBe(true)
    expect(Math.abs(x() - expectedX())).toBeLessThan(1)
    expect(getComputedStyle(caret).visibility).toBe('visible')
    input.blur()
    input.focus()
    expect(focusStates).toEqual([true, true])
    expect(input.hasAttribute('data-smooth-caret')).toBe(true)
  })

  it('真正拖出选区时交回原生，折叠选区并松手时立即恢复自定义光标', async () => {
    const { input, x, expectedX } = mountInput({ modelValue: 'selection' })
    input.focus()
    input.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'mouse', bubbles: true }))
    input.setSelectionRange(1, 5)
    input.dispatchEvent(new Event('select'))
    await new Promise(requestAnimationFrame)
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true }))
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    expect(input.selectionStart).toBe(1)
    expect(input.selectionEnd).toBe(5)
    input.setSelectionRange(3, 3)
    document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'mouse', bubbles: true }))
    expect(input.hasAttribute('data-smooth-caret')).toBe(true)
    expect(Math.abs(x() - expectedX())).toBeLessThan(1)
  })

  it('真实输入立即更新文字，光标平滑跟随并准确停在末尾', async () => {
    const { input, caret, model, x, expectedX } = mountInput()
    input.focus()
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    // 等首次布局与焦点定位结束，再采样输入触发的位移。
    await new Promise(requestAnimationFrame)
    await new Promise(requestAnimationFrame)
    const positions: number[] = []
    let sampling = true
    const sample = () => {
      if (!sampling) return
      positions.push(x())
      requestAnimationFrame(sample)
    }
    requestAnimationFrame(sample)
    try {
      await userEvent.keyboard('monkey')
      expect(model.value).toBe('monkey')
      expect(input.value).toBe('monkey')
      await expect.poll(() => Math.abs(x() - expectedX())).toBeLessThan(1)
      expect(positions.some(position => position > 0 && position < expectedX() - 1)).toBe(true)
      expect(getComputedStyle(input).caretColor).toBe('rgba(0, 0, 0, 0)')
      expect(getComputedStyle(caret).visibility).toBe('visible')
      expect(document.activeElement).toBe(input)
    } finally { sampling = false }
  })

  it('方向键、退格和中间插入保留原生编辑位置，选区交还原生显示', async () => {
    const { input, model, x, expectedX } = mountInput({ modelValue: 'orbit' })
    input.focus()
    input.setSelectionRange(5, 5)
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    await userEvent.keyboard('{ArrowLeft}{ArrowLeft}X{Backspace}')
    expect(model.value).toBe('orbit')
    expect(input.selectionStart).toBe(3)
    await expect.poll(() => Math.abs(x() - expectedX())).toBeLessThan(1)
    await userEvent.keyboard('{Shift>}{ArrowLeft}{/Shift}')
    expect(input.selectionEnd! - input.selectionStart!).toBe(1)
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(false)
    expect(getComputedStyle(input).caretColor).not.toBe('rgba(0, 0, 0, 0)')
    await userEvent.keyboard('A')
    expect(model.value).toBe('orAit')
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    await expect.poll(() => Math.abs(x() - expectedX())).toBeLessThan(1)
  })

  it('长文本滚动、清空、动态尺寸及重新聚焦后不会留下过期位置', async () => {
    const { host, input, caret, liveProps, x, expectedX } = mountInput({ type: 'search' })
    await userEvent.click(input)
    await userEvent.keyboard('a-very-long-search-query-that-scrolls-beyond-the-input-width')
    expect(input.scrollLeft).toBeGreaterThan(0)
    await expect.poll(() => Math.abs(x() - expectedX())).toBeLessThan(1)
    const bounds = input.getBoundingClientRect()
    expect(caret.getBoundingClientRect().right).toBeLessThanOrEqual(bounds.right + 1)
    host.style.width = '220px'
    // 缩窄后原生插入点可能暂时落在视口外；不能在边缘伪造一个插入点。
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(false)
    expect(getComputedStyle(caret).visibility).toBe('hidden')
    await userEvent.keyboard('{Home}')
    await expect.poll(() => Math.abs(x() - expectedX())).toBeLessThan(1)
    await userEvent.click(host.querySelector<HTMLButtonElement>('.bing-input__clear')!)
    expect(input.value).toBe('')
    await expect.poll(x).toBeLessThan(1)
    input.blur()
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    expect(getComputedStyle(caret).visibility).toBe('hidden')
    liveProps.value = { type: 'search', size: 'lg' }
    await nextTick()
    input.focus()
    await userEvent.keyboard('next')
    await expect.poll(() => Math.abs(x() - expectedX())).toBeLessThan(1)
  })

  it('输入法组字期间保留同一条平滑光标，确认中英文和 emoji 后不跳变', async () => {
    const { input, caret, model, x, expectedX } = mountInput()
    input.focus()
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    expect(input.hasAttribute('data-smooth-caret')).toBe(true)
    input.value = 'ni'
    input.dispatchEvent(new InputEvent('input', { data: 'ni', isComposing: true, bubbles: true }))
    await nextTick()
    expect(model.value).toBe('')
    expect(input.value).toBe('ni')
    await expect.poll(() => Math.abs(x() - expectedX())).toBeLessThan(1)
    expect(input.hasAttribute('data-smooth-caret')).toBe(true)
    expect(getComputedStyle(caret).width).toBe('2px')
    expect(getComputedStyle(input).caretColor).toBe('rgba(0, 0, 0, 0)')
    input.value = '你好🙂'
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '你好🙂', bubbles: true }))
    input.dispatchEvent(new InputEvent('input', { data: '你好🙂', bubbles: true }))
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    expect(model.value).toBe('你好🙂')
    await expect.poll(() => Math.abs(x() - expectedX())).toBeLessThan(1)
    expect(document.activeElement).toBe(input)
  })

  it('组词转换选区跟随焦点端，取消、失焦后仍使用真实输入和选区', async () => {
    const { input, model, x } = mountInput({ modelValue: 'before' })
    input.focus()
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    input.value = 'beforezhongwen'
    input.setSelectionRange(6, 13, 'forward')
    input.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true }))
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    await new Promise(resolve => setTimeout(resolve, 150))
    const forward = x()
    expect(input.selectionStart).toBe(6)
    expect(input.selectionEnd).toBe(13)
    expect(model.value).toBe('before')
    input.setSelectionRange(6, 13, 'backward')
    input.dispatchEvent(new CompositionEvent('compositionupdate', { data: 'zhongwen', bubbles: true }))
    await expect.poll(() => x()).toBeLessThan(forward - 30)
    expect(input.selectionDirection).toBe('backward')
    input.value = 'before'
    input.dispatchEvent(new CompositionEvent('compositionend', { data: '', bubbles: true }))
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    expect(model.value).toBe('before')
    input.blur()
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
  })

  it.each(['email', 'number', 'password'] as const)('%s 保留原生类型和光标，不创建文本镜像', async type => {
    const { input, caret, layer } = mountInput({ type, modelValue: '123' })
    input.focus()
    await new Promise(requestAnimationFrame)
    expect(input.type).toBe(type)
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    expect(getComputedStyle(caret).visibility).toBe('hidden')
    expect(layer.childElementCount).toBe(1)
    expect(layer.textContent).toBe('')
  })

  it('显式关闭、只读、RTL 和触屏操作保留原生光标', async () => {
    const { input, liveProps, model } = mountInput({ smoothCaret: false })
    input.focus()
    await new Promise(requestAnimationFrame)
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    liveProps.value = { smoothCaret: true }
    await nextTick()
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    liveProps.value = { readonly: true }
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(false)
    liveProps.value = {}
    model.value = 'مرحبا'
    await nextTick()
    await new Promise(requestAnimationFrame)
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    model.value = 'hello'
    await expect.poll(() => input.hasAttribute('data-smooth-caret')).toBe(true)
    input.dispatchEvent(new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }))
    document.dispatchEvent(new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }))
    await new Promise(requestAnimationFrame)
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
  })

  it('减少动态效果时保留原生光标', async () => {
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => {
      const media = matchMedia(query)
      if (query.includes('prefers-reduced-motion')) Object.defineProperty(media, 'matches', { value: true })
      return media
    })
    const { input, layer } = mountInput()
    input.focus()
    await new Promise(requestAnimationFrame)
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    expect(layer.childElementCount).toBe(1)
  })

  it('失焦和卸载时停止位移动效并移除测量节点', async () => {
    const { input, caret, layer, unmount } = mountInput()
    input.focus()
    await userEvent.keyboard('animation')
    await expect.poll(() => layer.childElementCount).toBe(2)
    input.blur()
    expect(gsap.getTweensOf(caret)).toHaveLength(0)
    expect(layer.childElementCount).toBe(1)
    input.focus()
    await userEvent.keyboard('more')
    unmount()
    expect(gsap.getTweensOf(caret)).toHaveLength(0)
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    await new Promise(requestAnimationFrame)
    expect(caret.hasAttribute('data-active')).toBe(false)
  })
})
