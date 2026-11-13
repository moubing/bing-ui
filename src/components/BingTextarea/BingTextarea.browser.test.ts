import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingTextarea from './BingTextarea.vue'
import BingForm from '../BingForm/BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import { z } from 'zod'
import type { BingTextareaProps } from './BingTextarea.types'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
function mountTextarea(props: BingTextareaProps & { wrap?: string }) {
  const host = document.createElement('div')
  host.style.cssText = 'width: 380px; max-width: calc(100vw - 40px); margin: 20px;'
  document.body.append(host)
  const model = ref(props.modelValue ?? '')
  const settings = ref(props)
  const app = createApp({ render: () => h(BingTextarea, {
    ...settings.value, modelValue: model.value, block: true,
    'onUpdate:modelValue': value => { model.value = value },
  }) })
  app.mount(host)
  mounted.push({ app, host })
  return { host, model, settings, field: host.querySelector('textarea')! }
}

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
})

function rowsHeight(field: HTMLTextAreaElement, rows: number) {
  const style = getComputedStyle(field)
  return rows * parseFloat(style.lineHeight) + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom)
}

describe('BingTextarea 布局与自动增高', () => {
  it('文本域与清除按钮之间移动焦点不校验，真正离开才校验一次', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const model = ref({ note: '说明' })
    const validate = vi.fn(() => true)
    const schema = z.object({ note: z.string().refine(validate) })
    const app = createApp({ render: () => h('div', [
      h(BingForm, { model: model.value, schema, validateTrigger: 'blur' }, () =>
        h(BingFormItem, { prop: 'note', label: '说明' }, () =>
          h(BingTextarea, { clearable: true, modelValue: model.value.note, 'onUpdate:modelValue': value => { model.value.note = value } }))),
      h('button', { class: 'outside' }, '外部'),
    ]) })
    app.mount(host)
    mounted.push({ app, host })
    const field = host.querySelector('textarea')!
    const clear = host.querySelector<HTMLButtonElement>('.bing-textarea__clear')!
    field.focus()
    clear.focus()
    await nextTick(); await nextTick()
    expect(validate).not.toHaveBeenCalled()
    await userEvent.keyboard('{Enter}')
    expect(document.activeElement).toBe(field)
    expect(validate).not.toHaveBeenCalled()
    host.querySelector<HTMLButtonElement>('.outside')!.focus()
    await expect.poll(() => validate.mock.calls.length).toBe(1)
  })
  it('滑块拖动直接滚动文本，保留输入焦点和选区，轨道避开清空与计数', async () => {
    const { host, field } = mountTextarea({ modelValue: Array.from({ length: 20 }, (_, i) => `说明第 ${i + 1} 行`).join('\n'), rows: 4, showCount: true, clearable: true })
    const scrollbar = host.querySelector('.bing-textarea__scroll')!
    const thumb = host.querySelector<HTMLElement>('.bing-scrollbar__thumb--vertical')!
    const rail = host.querySelector<HTMLElement>('.bing-scrollbar__rail--vertical')!
    await expect.poll(() => scrollbar.classList.contains('has-vertical-overflow')).toBe(true)
    await expect.poll(() => thumb.getBoundingClientRect().height).toBeGreaterThan(0)
    expect(getComputedStyle(field).scrollbarWidth).toBe('none')
    expect(host.querySelector('.bing-scrollbar__viewport')).toBeNull()
    field.focus()
    field.setSelectionRange(1, 4)
    field.scrollTop = 0
    const bounds = thumb.getBoundingClientRect()
    thumb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 1, clientX: bounds.x + 2, clientY: bounds.y + 3 }))
    window.dispatchEvent(new PointerEvent('pointermove', { cancelable: true, pointerId: 1, clientY: bounds.y + 43 }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
    await expect.poll(() => field.scrollTop).toBeGreaterThan(0)
    expect([field.selectionStart, field.selectionEnd]).toEqual([1, 4])
    expect(document.activeElement).toBe(field)
    const clearBounds = host.querySelector('.bing-textarea__clear')!.getBoundingClientRect()
    expect(rail.getBoundingClientRect().left).toBeGreaterThan(clearBounds.right)
    expect(rail.getBoundingClientRect().bottom).toBeLessThan(host.querySelector('.bing-textarea__count')!.getBoundingClientRect().top)
    await userEvent.keyboard('{Control>}{End}{/Control}')
    expect(field.selectionEnd).toBe(field.value.length)
    // 浏览器只需将末行光标带入视口，不必滚到底部留白的尽头。
    await expect.poll(() => field.scrollHeight - field.clientHeight - field.scrollTop).toBeLessThan(parseFloat(getComputedStyle(field).lineHeight))
    await userEvent.keyboard('{Control>}{Home}{/Control}')
    expect(field.selectionStart).toBe(0)
    await expect.poll(() => field.scrollTop).toBeLessThan(parseFloat(getComputedStyle(field).lineHeight))
  })

  it('程序更新内容与手动改变高度后重新计算滑块，短文本隐藏轨道', async () => {
    const { host, field, model } = mountTextarea({ rows: 3, modelValue: '说明\n'.repeat(18) })
    const scrollbar = host.querySelector('.bing-textarea__scroll')!
    await expect.poll(() => scrollbar.classList.contains('has-vertical-overflow')).toBe(true)
    field.style.height = '500px'
    await expect.poll(() => scrollbar.classList.contains('has-vertical-overflow')).toBe(false)
    field.style.height = '80px'
    await expect.poll(() => scrollbar.classList.contains('has-vertical-overflow')).toBe(true)
    model.value = '简短说明'
    await expect.poll(() => scrollbar.classList.contains('has-vertical-overflow')).toBe(false)
    expect(field.style.height).toBe('80px')
  })

  it('不换行的只读内容支持横纵滚动，并保持原生只读语义', async () => {
    const { host, field } = mountTextarea({ modelValue: ('道路与行政边界'.repeat(30) + '\n').repeat(12), rows: 3, readonly: true, resize: 'none', wrap: 'off' })
    const scrollbar = host.querySelector('.bing-textarea__scroll')!
    await expect.poll(() => scrollbar.classList.contains('has-horizontal-overflow') && scrollbar.classList.contains('has-vertical-overflow')).toBe(true)
    expect(field.wrap).toBe('off')
    expect(field.readOnly).toBe(true)
    expect(getComputedStyle(field).scrollbarWidth).toBe('none')
    expect(host.querySelector('.bing-textarea__clear')).toBeNull()
    const thumb = host.querySelector<HTMLElement>('.bing-scrollbar__thumb--horizontal')!
    await expect.poll(() => thumb.getBoundingClientRect().width).toBeGreaterThan(0)
    const bounds = thumb.getBoundingClientRect()
    thumb.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, button: 0, pointerId: 2, clientX: bounds.x + 2 }))
    window.dispatchEvent(new PointerEvent('pointermove', { cancelable: true, pointerId: 2, clientX: bounds.x + 82 }))
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 2 }))
    expect(field.scrollLeft).toBeGreaterThan(0)
  })

  it('自动增高遵守行数上下限，计数不覆盖滚动内容，清空恢复初始高度与焦点', async () => {
    const { host, field, model } = mountTextarea({ autosize: { minRows: 2, maxRows: 4 }, showCount: true, maxLength: 120, clearable: true })
    await expect.poll(() => field.getBoundingClientRect().height).toBe(rowsHeight(field, 2))
    await userEvent.type(field, '第一行\n第二行\n第三行\n第四行\n第五行\n第六行')
    await expect.poll(() => field.getBoundingClientRect().height).toBe(rowsHeight(field, 4))
    expect(field.scrollHeight).toBeGreaterThan(field.clientHeight)
    const counter = host.querySelector('.bing-textarea__count')!
    expect(counter.getBoundingClientRect().top).toBeGreaterThanOrEqual(field.getBoundingClientRect().bottom)
    expect(counter.textContent?.trim()).toBe(`${model.value.length}/120`)
    await userEvent.click(host.querySelector<HTMLButtonElement>('.bing-textarea__clear')!)
    expect(model.value).toBe('')
    expect(document.activeElement).toBe(field)
    await expect.poll(() => field.getBoundingClientRect().height).toBe(rowsHeight(field, 2))
  })

  it('切换尺寸重新计算行高，单行上限不被旧的固定最小高度撑开', async () => {
    const { field, settings } = mountTextarea({ size: 'sm', autosize: { minRows: 1, maxRows: 1 } })
    for (const size of ['sm', 'md', 'lg'] as const) {
      settings.value = { ...settings.value, size }
      await nextTick()
      await expect.poll(() => field.getBoundingClientRect().height).toBe(rowsHeight(field, 1))
    }
  })

  it('容器收窄后重新换行增高，恢复宽度后缩回', async () => {
    const { host, field } = mountTextarea({ modelValue: '道路与行政边界用于地图标注和图层分析。'.repeat(4), autosize: { minRows: 1, maxRows: 20 } })
    await expect.poll(() => field.style.height).not.toBe('')
    const wideHeight = field.getBoundingClientRect().height
    host.style.width = '200px'
    await expect.poll(() => field.getBoundingClientRect().height).toBeGreaterThan(wideHeight)
    host.style.width = '380px'
    await expect.poll(() => field.getBoundingClientRect().height).toBe(wideHeight)
  })

  it('关闭自动增高恢复原生行数，手动调整高度后输入不会重置高度', async () => {
    const { field, settings } = mountTextarea({ rows: 3, autosize: { minRows: 1, maxRows: 1 } })
    settings.value = { ...settings.value, autosize: false }
    await nextTick()
    await expect.poll(() => field.style.height).toBe('')
    expect(field.getBoundingClientRect().height).toBe(rowsHeight(field, 3))
    field.style.height = '220px'
    await userEvent.type(field, '手动拉高后继续输入')
    expect(field.getBoundingClientRect().height).toBe(220)
  })
})
