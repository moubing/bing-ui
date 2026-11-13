import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import { gsap } from 'gsap'
import BingTextarea from './BingTextarea.vue'
import BingConfigProvider from '../BingConfigProvider/BingConfigProvider.vue'
import type { BingTextareaProps } from './BingTextarea.types'
import '../../theme/index.css'

const cleanups: Array<() => void> = []
const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
const measureFrame = async () => { await nextTick(); await nextTick(); await frame() }
function mountTextarea(props: BingTextareaProps, options: { accept?: boolean; reduced?: boolean } = {}) {
  const host = document.createElement('div')
  host.style.cssText = 'width: 380px; margin: 20px;'
  document.body.append(host)
  const model = ref(props.modelValue ?? '')
  const settings = ref(props)
  const events = { update: vi.fn(), input: vi.fn(), clear: vi.fn(), submit: vi.fn(), resize: vi.fn() }
  const app = createApp({ render: () => h(BingConfigProvider, { reducedMotion: options.reduced ? 'always' : 'never' }, () =>
    h(BingTextarea, {
      ...settings.value, modelValue: model.value, block: true, resize: 'none',
      'onUpdate:modelValue': value => { events.update(value); if (options.accept !== false) model.value = value },
      onInput: events.input, onClear: events.clear, onSubmit: events.submit, onResize: events.resize,
    })),
  })
  app.mount(host)
  let unmounted = false
  const unmount = () => { if (!unmounted) { unmounted = true; app.unmount(); host.remove() } }
  cleanups.push(unmount)
  return { host, model, settings, events, unmount, field: host.querySelector('textarea')! }
}
function undo(field: HTMLElement, meta = false) {
  const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: !meta, metaKey: meta, bubbles: true, cancelable: true })
  field.dispatchEvent(event)
  return event
}
function rowsHeight(field: HTMLTextAreaElement, rows: number) {
  const style = getComputedStyle(field)
  return rows * parseFloat(style.lineHeight) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
}
afterEach(() => { cleanups.splice(0).forEach(cleanup => cleanup()); vi.restoreAllMocks() })

describe('BingTextarea 提交、计数与清除撤销', () => {
  it('Enter 提交不插入换行，Shift+Enter 换行；修饰键模式保留普通换行', async () => {
    const { field, model, settings, events } = mountTextarea({ modelValue: '说明', submitOn: 'enter' })
    field.focus(); field.setSelectionRange(2, 2)
    await userEvent.keyboard('{Enter}')
    expect(events.submit).toHaveBeenCalledTimes(1)
    expect(events.submit.mock.calls[0]![0]).toBe('说明')
    expect(model.value).toBe('说明')
    await userEvent.keyboard('{Shift>}{Enter}{/Shift}')
    expect(model.value).toBe('说明\n')
    settings.value = { submitOn: 'mod-enter' }
    await nextTick()
    await userEvent.keyboard('{Enter}{Control>}{Enter}{/Control}{Meta>}{Enter}{/Meta}')
    expect(model.value).toBe('说明\n\n')
    expect(events.submit).toHaveBeenCalledTimes(3)
    expect(field.getAttribute('aria-keyshortcuts')).toBe('Control+Enter Meta+Enter')
  })

  it.each([false, true])('清除后 %s 修饰键撤销只发布一次，恢复计数、高度和末尾光标', async meta => {
    const original = '第一行\n第二行\n第三行'
    const { host, field, model, events } = mountTextarea({ modelValue: original, clearable: true, showCount: true, autosize: { minRows: 1, maxRows: 5 } })
    const padding = getComputedStyle(field).paddingRight
    await userEvent.click(host.querySelector<HTMLButtonElement>('.bing-textarea__clear')!)
    expect(events.update.mock.calls).toEqual([['']])
    expect(events.clear).toHaveBeenCalledTimes(1)
    expect(document.activeElement).toBe(field)
    expect(host.querySelector('.bing-textarea__clear')!.getAttribute('tabindex')).toBe('-1')
    expect(getComputedStyle(field).paddingRight).toBe(padding)
    await expect.poll(() => field.clientHeight).toBe(rowsHeight(field, 1))
    expect(undo(field, meta).defaultPrevented).toBe(true)
    await nextTick()
    expect(events.update.mock.calls).toEqual([[''], [original]])
    expect(events.input).not.toHaveBeenCalled()
    expect(model.value).toBe(original)
    expect([field.selectionStart, field.selectionEnd]).toEqual([original.length, original.length])
    expect(host.querySelector('.bing-textarea__count')!.textContent!.trim()).toBe(String(original.length))
    await expect.poll(() => field.clientHeight).toBe(rowsHeight(field, 3))
    expect(undo(field).defaultPrevented).toBe(false)
  })

  it.each(['input', 'composition', 'blur', 'timeout', 'readonly', 'disabled', 'external'] as const)('%s 后不截获原生撤销', async reason => {
    const { host, field, model, settings, events } = mountTextarea({ modelValue: '原文', clearable: true })
    await userEvent.click(host.querySelector<HTMLButtonElement>('.bing-textarea__clear')!)
    if (reason === 'input') await userEvent.keyboard('新')
    if (reason === 'composition') {
      field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    }
    if (reason === 'blur') { field.blur(); await nextTick(); await nextTick(); field.focus() }
    if (reason === 'timeout') { const now = Date.now(); vi.spyOn(Date, 'now').mockReturnValue(now + 5001) }
    if (reason === 'readonly' || reason === 'disabled') {
      settings.value = { ...settings.value, [reason]: true }; await nextTick()
      settings.value = { ...settings.value, [reason]: false }; await nextTick(); field.focus()
    }
    if (reason === 'external') { model.value = '外部更新'; await nextTick() }
    const updates = events.update.mock.calls.length
    expect(undo(field).defaultPrevented).toBe(false)
    expect(events.update).toHaveBeenCalledTimes(updates)
  })

  it('清除被受控父级拒绝时不留无效撤销，卸载时清理快照', async () => {
    const { host, field, events, unmount } = mountTextarea({ modelValue: '保留', clearable: true }, { accept: false })
    await userEvent.click(host.querySelector<HTMLButtonElement>('.bing-textarea__clear')!)
    expect(field.value).toBe('保留')
    expect(undo(field).defaultPrevented).toBe(false)
    expect(events.update.mock.calls).toEqual([['']])
    unmount()
    expect(undo(field).defaultPrevented).toBe(false)
    expect(events.update).toHaveBeenCalledTimes(1)
  })

  it('上限时拒绝继续输入并反馈，选区替换仍可用，数字采用等宽排版', async () => {
    const { host, field, model } = mountTextarea({ maxLength: 10, showCount: true, clearable: true })
    const count = host.querySelector<HTMLElement>('.bing-textarea__count')!
    const emptyWidth = field.clientWidth
    const emptyPadding = getComputedStyle(field).paddingRight
    expect(host.querySelector('.bing-textarea__clear')!.getAttribute('aria-hidden')).toBe('true')
    await userEvent.type(field, '123456789')
    expect(field.clientWidth).toBe(emptyWidth)
    expect(getComputedStyle(field).paddingRight).toBe(emptyPadding)
    expect(count.classList.contains('is-warning')).toBe(true)
    await userEvent.keyboard('0x')
    expect(model.value).toBe('1234567890')
    expect(count.classList.contains('is-danger')).toBe(true)
    expect(count.classList.contains('is-limit')).toBe(true)
    expect(getComputedStyle(count).fontVariantNumeric).toBe('tabular-nums')
    expect(getComputedStyle(count).animationDuration).toBe('0.24s')
    field.setSelectionRange(0, 2)
    await userEvent.keyboard('a')
    expect(model.value).toBe('a34567890')
    expect(count.classList.contains('is-warning')).toBe(true)
  })

  it('减少动效时上限只变色，不晃动', async () => {
    const { host, field } = mountTextarea({ modelValue: '满', maxLength: 1, showCount: true }, { reduced: true })
    field.focus(); field.setSelectionRange(1, 1)
    await userEvent.keyboard('x')
    const count = host.querySelector<HTMLElement>('.bing-textarea__count')!
    expect(count.classList.contains('is-reduced')).toBe(true)
    expect(getComputedStyle(count).animationName).toBe('none')
  })
})

describe('BingTextarea 自动增高过渡与 resize', () => {
  it.each([true, { minRows: 1, maxRows: 8 }] as const)('自动增高 %j 的补间中不显示临时纵向滚动条', async autosize => {
    const { host, field, model } = mountTextarea({ modelValue: '第一行', rows: 1, autosize })
    await frame()
    field.focus()
    model.value = '第一行\n第二行'
    await measureFrame()
    const tween = gsap.getTweensOf(field)[0]!
    tween.pause().progress(0.25)
    // 内容已超出过渡中的可见高度，等待滚动条自身的 ResizeObserver 同步。
    expect(field.scrollHeight).toBeGreaterThan(field.clientHeight)
    await frame(); await frame(); await nextTick()
    const rail = host.querySelector<HTMLElement>('.bing-scrollbar__rail--vertical')!
    expect(getComputedStyle(rail).display).toBe('none')
    tween.progress(1).kill()
    await frame(); await nextTick()
    expect(getComputedStyle(rail).display).toBe('none')
    expect(field.scrollHeight).toBe(field.clientHeight)
  })

  it('达到上限后持续显示纵向滚动条，输入与增删行不短暂隐藏', async () => {
    const { host, field, model } = mountTextarea({ modelValue: '一\n二\n三\n四\n五', autosize: { minRows: 1, maxRows: 3 } })
    const rail = host.querySelector<HTMLElement>('.bing-scrollbar__rail--vertical')!
    await expect.poll(() => getComputedStyle(rail).display).not.toBe('none')
    field.focus(); field.setSelectionRange(field.value.length, field.value.length)
    const samples: string[] = []
    let sampling = true
    const sample = () => { if (sampling) { samples.push(getComputedStyle(rail).display); requestAnimationFrame(sample) } }
    requestAnimationFrame(sample)
    try {
      await userEvent.keyboard('补充{Enter}{Enter}{Backspace}')
      await measureFrame(); await frame(); await frame()
      expect(samples.length).toBeGreaterThan(0)
      expect(samples.every(display => display !== 'none')).toBe(true)
      expect(field.clientHeight).toBe(rowsHeight(field, 3))
      expect(field.scrollTop).toBeGreaterThan(0)
    } finally { sampling = false }
    model.value = '短说明'
    await expect.poll(() => field.clientHeight).toBe(rowsHeight(field, 1))
    await expect.poll(() => getComputedStyle(rail).display).toBe('none')
  })

  it('手动缩小自动增高字段后仍可滚动，关闭 autosize 恢复正常溢出判断', async () => {
    const { host, field, settings } = mountTextarea({ modelValue: '一\n二\n三\n四', rows: 1, autosize: true })
    const rail = host.querySelector<HTMLElement>('.bing-scrollbar__rail--vertical')!
    await frame(); await frame()
    expect(getComputedStyle(rail).display).toBe('none')
    field.style.height = `${rowsHeight(field, 2)}px`
    await expect.poll(() => getComputedStyle(rail).display).not.toBe('none')
    settings.value = { ...settings.value, autosize: false }
    await expect.poll(() => field.clientHeight).toBe(rowsHeight(field, 1))
    await expect.poll(() => getComputedStyle(rail).display).not.toBe('none')
  })

  it('父级随输入重建等价 autosize 对象时，仍保留高度过渡', async () => {
    const { field, model, settings, events } = mountTextarea({ autosize: { minRows: 1, maxRows: 8 } })
    await frame(); events.resize.mockClear()
    model.value = '一\n二'
    settings.value = { ...settings.value, autosize: { minRows: 1, maxRows: 8 } }
    await measureFrame()
    const tween = gsap.getTweensOf(field)[0]!
    expect(tween).toBeDefined()
    expect(events.resize).not.toHaveBeenCalled()
    tween.progress(1).kill()
    expect(events.resize.mock.calls).toEqual([[rowsHeight(field, 2)]])
  })

  it('小幅行数变化经过中间帧，稳定后只通知一次；同高度输入不重复通知', async () => {
    const { field, model, events } = mountTextarea({ modelValue: '第一行', autosize: { minRows: 1, maxRows: 8 } })
    await frame()
    expect(events.resize.mock.calls).toEqual([[rowsHeight(field, 1)]])
    events.resize.mockClear()
    model.value = '第一行\n第二行'
    await measureFrame()
    const tween = gsap.getTweensOf(field)[0]!
    expect(tween).toBeDefined()
    expect(tween.duration()).toBe(0.12)
    // 用补间进度稳定验证中间态，避免慢机器错过 120ms 动画。
    tween.pause().progress(0.5)
    expect(field.clientHeight).toBeGreaterThan(rowsHeight(field, 1))
    expect(field.clientHeight).toBeLessThan(rowsHeight(field, 2))
    expect(events.resize).not.toHaveBeenCalled()
    tween.progress(1).kill()
    expect(events.resize.mock.calls).toEqual([[rowsHeight(field, 2)]])
    model.value += '补充'
    await measureFrame()
    expect(gsap.getTweensOf(field)).toHaveLength(0)
    expect(events.resize).toHaveBeenCalledTimes(1)
  })

  it('连续输入从当前高度接续，单帧合并测量，卸载后不再通知', async () => {
    const { field, model, events, unmount } = mountTextarea({ autosize: { minRows: 1, maxRows: 8 } })
    await frame(); events.resize.mockClear()
    model.value = '一\n二'
    await measureFrame()
    const previous = gsap.getTweensOf(field)[0]!
    previous.pause().progress(0.4)
    const current = parseFloat(field.style.height)
    model.value = '一\n二\n三'
    await nextTick()
    model.value = '一\n二\n三\n四'
    await measureFrame()
    const tween = gsap.getTweensOf(field)[0]!
    expect(tween).not.toBe(previous)
    expect(parseFloat(field.style.height)).toBeCloseTo(current, 1)
    expect(gsap.getTweensOf(field)).toHaveLength(1)
    tween.pause().progress(1).kill()
    expect(events.resize.mock.calls).toEqual([[rowsHeight(field, 4)]])
    model.value += '\n五'
    await measureFrame()
    expect(gsap.getTweensOf(field)).toHaveLength(1)
    unmount()
    expect(gsap.getTweensOf(field)).toHaveLength(0)
    await frame()
    expect(events.resize).toHaveBeenCalledTimes(1)
  })

  it.each(['large', 'max', 'disabled', 'reduced'] as const)('%s 情况直接设定高度，不做补间', async scenario => {
    const { field, model, events } = mountTextarea({
      autosize: { minRows: 1, maxRows: scenario === 'max' ? 2 : 10 }, autosizeTransition: scenario !== 'disabled',
    }, { reduced: scenario === 'reduced' })
    await frame(); events.resize.mockClear()
    const rows = scenario === 'large' ? 5 : 2
    model.value = Array.from({ length: rows }, () => '一行').join('\n')
    await measureFrame()
    expect(gsap.getTweensOf(field)).toHaveLength(0)
    expect(field.clientHeight).toBe(rowsHeight(field, rows))
    expect(events.resize.mock.calls).toEqual([[rowsHeight(field, rows)]])
  })

  it('宽度改变直接重新排版；组词草稿同步增高和计数，但不提前发布模型', async () => {
    const { host, field, model, events } = mountTextarea({ autosize: { minRows: 1, maxRows: 20 }, showCount: true, maxLength: 100 })
    await frame()
    field.focus()
    field.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
    field.value = '道路与行政边界用于地图标注和图层分析。'.repeat(3)
    field.dispatchEvent(new InputEvent('input', { isComposing: true, bubbles: true }))
    await expect.poll(() => field.clientHeight).toBeGreaterThan(rowsHeight(field, 1))
    await expect.poll(() => gsap.getTweensOf(field).length).toBe(0)
    const wide = field.clientHeight
    expect(model.value).toBe('')
    expect(events.update).not.toHaveBeenCalled()
    expect(events.input).not.toHaveBeenCalled()
    expect(host.querySelector('.bing-textarea__count')!.textContent).toContain(`${field.value.length}/100`)
    host.style.width = '200px'
    await expect.poll(() => field.clientHeight).toBeGreaterThan(wide)
    expect(gsap.getTweensOf(field)).toHaveLength(0)
    field.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    field.dispatchEvent(new InputEvent('input', { bubbles: true }))
    expect(events.update).toHaveBeenCalledTimes(1)
    expect(events.input).toHaveBeenCalledTimes(1)
  })
})
