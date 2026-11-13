import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import { z } from 'zod'
import BingForm from '../BingForm/BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingInput from './BingInput.vue'
import type { BingInputProps } from './BingInput.types'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
const originalTheme = document.documentElement.getAttribute('data-bing-theme')
function mountInput(props: BingInputProps = {}, accept = true) {
  const host = document.createElement('div')
  host.style.cssText = 'margin: 40px; width: 280px;'
  document.body.append(host)
  const model = ref<string | number | null>(props.modelValue ?? '')
  const liveProps = ref(props)
  const updates = vi.fn(value => { if (accept) model.value = value })
  const changes = vi.fn()
  const enters = vi.fn()
  const field = () => h(BingInput, {
    ...liveProps.value, modelValue: model.value,
    'onUpdate:modelValue': updates, onChange: changes, onEnter: enters,
  })
  const app = createApp({ render: field })
  app.mount(host)
  mounted.push({ app, host })
  const input = document.querySelector<HTMLInputElement>('.bing-input__field')!
  return { model, input, liveProps, app, host, updates, changes, enters }
}

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
  vi.useRealTimers()
  if (originalTheme === null) document.documentElement.removeAttribute('data-bing-theme')
  else document.documentElement.setAttribute('data-bing-theme', originalTheme)
})

describe('BingInput 字段焦点', () => {
  it.each(['light', 'dark'])('%s 清除按钮独立显示焦点，离开整个控件才进行 blur 校验', async theme => {
    document.documentElement.dataset.bingTheme = theme
    const host = document.createElement('div')
    host.style.cssText = 'margin: 40px; width: 280px;'
    document.body.append(host)
    const model = ref({ name: '333' })
    const validateName = vi.fn((value: string) => value.trim().length > 0)
    const onBlur = vi.fn()
    const schema = z.object({ name: z.string().refine(validateName, '请输入名称') })
    const app = createApp({
      render: () => h('div', [
        h(BingForm, { model: model.value, schema, validateTrigger: 'blur' }, () =>
          h(BingFormItem, { prop: 'name', label: '名称' }, () =>
            h(BingInput, {
              modelValue: model.value.name,
              clearable: true,
              'onUpdate:modelValue': value => { model.value.name = String(value ?? '') },
              onBlur,
            }),
          ),
        ),
        h('button', { type: 'button', class: 'outside-control' }, '下一个控件'),
      ]),
    })
    app.mount(host)
    mounted.push({ app, host })
    const input = host.querySelector<HTMLInputElement>('.bing-input__field')!
    const root = host.querySelector<HTMLElement>('.bing-input')!
    const clear = host.querySelector<HTMLButtonElement>('.bing-input__clear')!
    const outside = host.querySelector<HTMLButtonElement>('.outside-control')!
    const idleShadow = getComputedStyle(root).boxShadow

    input.focus()
    await expect.poll(() => getComputedStyle(root).boxShadow).not.toBe(idleShadow)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(clear)
    await expect.poll(() => getComputedStyle(root).boxShadow).toBe(idleShadow)
    expect(getComputedStyle(clear).outlineWidth).toBe('2px')
    expect(getComputedStyle(clear).outlineStyle).toBe('solid')
    expect(onBlur).toHaveBeenCalledTimes(1)
    expect(validateName).not.toHaveBeenCalled()

    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(outside)
    await expect.poll(() => validateName.mock.calls.length).toBe(1)
    validateName.mockClear()

    input.focus()
    outside.focus()
    input.focus()
    await nextTick()
    expect(validateName).not.toHaveBeenCalled()

    await userEvent.keyboard('{Tab}')
    await userEvent.keyboard('{Enter}')
    expect(model.value.name).toBe('')
    expect(document.activeElement).toBe(input)
    await nextTick()
    expect(validateName).not.toHaveBeenCalled()

    outside.focus()
    await expect.poll(() => validateName.mock.calls.length).toBe(1)
    await expect.poll(() => host.textContent).toContain('请输入名称')
  })
})

describe('BingInput 数字输入', () => {
  it('真实输入的负号、小数点和指数中间态不泄漏 null，重渲染不打断编辑', async () => {
    const { input, model, updates, liveProps } = mountInput({ type: 'number', modelValue: 5, step: 0.1, min: -10, max: 10 })
    input.focus()
    await userEvent.keyboard('{Control>}a{/Control}-')
    expect(input.validity.badInput).toBe(true)
    expect(model.value).toBe(5)
    expect(updates).not.toHaveBeenCalled()
    await userEvent.keyboard('2')
    expect(model.value).toBe(-2)
    const beforeDot = updates.mock.calls.length
    await userEvent.keyboard('.')
    expect(updates).toHaveBeenCalledTimes(beforeDot)
    liveProps.value = { ...liveProps.value, status: 'warning' }
    await nextTick()
    await userEvent.keyboard('5')
    expect(model.value).toBe(-2.5)
    await userEvent.keyboard('{Control>}a{/Control}1e')
    expect(model.value).toBe(1)
    expect(input.validity.badInput).toBe(true)
    input.blur()
    await nextTick(); await nextTick()
    expect(input.value).toBe('1')
    expect(updates.mock.calls.some(([value]) => value === null)).toBe(false)
  })

  it('失焦和 Enter 规整小数与范围，只在值变化时更新，Shift 步进十倍', async () => {
    const { input, model, updates, enters } = mountInput({ type: 'number', modelValue: 0.3, min: 0.1, max: 3.8, step: 0.2 })
    input.focus()
    await userEvent.keyboard('{Shift>}{ArrowUp}{/Shift}')
    expect(model.value).toBe(2.3)
    await userEvent.keyboard('{Control>}a{/Control}3.8{Enter}')
    expect(model.value).toBe(3.7)
    expect(input.value).toBe('3.7')
    expect(enters.mock.calls.at(-1)?.[0]).toBe(3.7)
    const count = updates.mock.calls.length
    await userEvent.keyboard('{Enter}')
    input.blur()
    await nextTick(); await nextTick()
    expect(updates).toHaveBeenCalledTimes(count)
    input.focus()
    await userEvent.keyboard('{Control>}a{/Control}9')
    input.blur()
    await nextTick(); await nextTick()
    expect(model.value).toBe(3.7)
  })

  it('父级拒绝或修正后，失焦、Enter 和步进同步回已接受的模型', async () => {
    const { input, model, updates } = mountInput({ type: 'number', modelValue: 4, min: 0, max: 10 }, false)
    input.focus()
    await userEvent.keyboard('{Control>}a{/Control}99{Enter}')
    expect(updates.mock.calls.at(-1)?.[0]).toBe(10)
    expect(input.value).toBe('4')
    await userEvent.keyboard('{ArrowUp}')
    expect(input.value).toBe('4')
    await userEvent.keyboard('{Control>}a{/Control}7')
    model.value = 6
    await nextTick()
    expect(input.value).toBe('6')
  })

  it.each(['light', 'dark'])('%s 数字步进使用透明底箭头，点击与键盘保持相同的小数和边界行为', async theme => {
    document.documentElement.dataset.bingTheme = theme
    const { input, model } = mountInput({ type: 'number', modelValue: 1.5, clearable: true, min: 0.5, max: 2, step: 0.5 })
    const root = input.closest<HTMLElement>('.bing-input')!
    const [up, down] = root.querySelectorAll<HTMLButtonElement>('.bing-input__step')
    expect(getComputedStyle(input).appearance).toBe('textfield')
    for (const step of [up, down]) {
      expect(getComputedStyle(step).backgroundColor).toBe('rgba(0, 0, 0, 0)')
      expect(step.querySelector('svg')).not.toBeNull()
    }
    expect(root.getBoundingClientRect().height).toBe(36)
    await userEvent.click(up)
    expect(model.value).toBe(2)
    expect(document.activeElement).toBe(input)
    expect(up.disabled).toBe(true)
    up.click()
    expect(model.value).toBe(2)
    await userEvent.click(down)
    expect(model.value).toBe(1.5)
    await userEvent.keyboard('{ArrowDown}')
    expect(model.value).toBe(1)
    await userEvent.click(root.querySelector<HTMLButtonElement>('.bing-input__clear')!)
    expect(model.value).toBeNull()
    await userEvent.click(up)
    expect(typeof model.value).toBe('number')
    expect(input.validity.valid).toBe(true)
  })

  it('step=any 的箭头从当前小数加减 1，保留原生键盘及范围约束', async () => {
    const { input, model } = mountInput({ type: 'number', modelValue: 1.25, step: 'any', min: -2, max: 3 })
    const [up, down] = input.closest('.bing-input')!.querySelectorAll<HTMLButtonElement>('.bing-input__step')
    await userEvent.click(up)
    expect(model.value).toBe(2.25)
    await userEvent.keyboard('{ArrowDown}')
    expect(model.value).toBe(1.25)
    await userEvent.click(down)
    expect(model.value).toBe(0.25)
    await userEvent.click(up)
    await userEvent.click(up)
    await userEvent.click(up)
    expect(model.value).toBe(3)
    expect(input.step).toBe('any')
  })

  it.each(['disabled', 'readonly'] as const)('%s 数字输入不允许箭头步进', async state => {
    const { input, model } = mountInput({ type: 'number', modelValue: 2, [state]: true })
    const buttons = input.closest('.bing-input')!.querySelectorAll<HTMLButtonElement>('.bing-input__step')
    for (const button of buttons) { expect(button.disabled).toBe(true); button.click() }
    expect(model.value).toBe(2)
  })

  it('长按重复步进，松开、取消、只读和卸载均停止定时器', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval'] })
    const { input, model, liveProps } = mountInput({ type: 'number', modelValue: 0, debounceDelay: 0 })
    const up = input.closest('.bing-input')!.querySelector<HTMLButtonElement>('.bing-input__step')!
    const press = () => up.dispatchEvent(new PointerEvent('pointerdown', { button: 0, pointerType: 'mouse', bubbles: true, cancelable: true }))
    press()
    expect(model.value).toBe(1)
    await vi.advanceTimersByTimeAsync(560)
    expect(model.value).toBe(3)
    window.dispatchEvent(new PointerEvent('pointerup'))
    await vi.advanceTimersByTimeAsync(400)
    expect(model.value).toBe(3)
    press()
    window.dispatchEvent(new PointerEvent('pointercancel'))
    await vi.advanceTimersByTimeAsync(500)
    expect(model.value).toBe(4)
    press()
    liveProps.value = { ...liveProps.value, readonly: true }
    await nextTick()
    await vi.advanceTimersByTimeAsync(500)
    expect(model.value).toBe(5)
    liveProps.value = { ...liveProps.value, readonly: false }
    await nextTick()
    press()
    const { app, host } = mounted.pop()!
    app.unmount(); host.remove()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('真实数字输入支持小数步进、边界校验和空值', async () => {
    const { input, model } = mountInput({ type: 'number', modelValue: 0, min: -10, max: 10, step: 0.5 })
    await userEvent.clear(input)
    await userEvent.type(input, '-2.5')
    expect(model.value).toBe(-2.5)
    await userEvent.keyboard('{ArrowUp}')
    expect(model.value).toBe(-2)
    input.value = '12'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(input.validity.rangeOverflow).toBe(true)
    await userEvent.clear(input)
    expect(model.value).toBeNull()
    expect(input.value).toBe('')
  })
})

describe('BingInput 操作与反馈', () => {
  it('密码显隐保持焦点与选区，清空和重新输入时眼睛固定在末端且 Tab 顺序一致', async () => {
    const { input, host } = mountInput({ type: 'password', modelValue: 'abcdef', clearable: true })
    const toggle = host.querySelector<HTMLButtonElement>('.bing-input__password')!
    const clear = host.querySelector<HTMLButtonElement>('.bing-input__clear')!
    const togglePosition = toggle.getBoundingClientRect().x
    const inputWidth = input.getBoundingClientRect().width
    expect(clear.getBoundingClientRect().right).toBeLessThan(togglePosition)
    input.focus()
    input.setSelectionRange(1, 4, 'backward')
    expect(input.value).toBe('abcdef')
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4])
    await userEvent.click(toggle)
    expect(input.type).toBe('text')
    expect(document.activeElement).toBe(input)
    expect([input.selectionStart, input.selectionEnd, input.selectionDirection]).toEqual([1, 4, 'backward'])
    expect(input.hasAttribute('data-smooth-caret')).toBe(false)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(clear)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(toggle)
    await userEvent.keyboard('{Enter}')
    expect(input.type).toBe('password')
    expect(document.activeElement).toBe(input)
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4])
    await userEvent.click(clear)
    expect(input.value).toBe('')
    expect(clear.getAttribute('aria-hidden')).toBe('true')
    expect(toggle.getBoundingClientRect().x).toBe(togglePosition)
    expect(input.getBoundingClientRect().width).toBe(inputWidth)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(toggle)
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    expect(document.activeElement).toBe(input)
    await userEvent.type(input, '重新输入')
    expect(toggle.getBoundingClientRect().x).toBe(togglePosition)
    expect(input.getBoundingClientRect().width).toBe(inputWidth)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(clear)
  })

  it.each(['light', 'dark'])('%s 语义状态聚焦保持配色，清除按钮不挤动文本区域', async theme => {
    document.documentElement.dataset.bingTheme = theme
    const { input, host, liveProps, model } = mountInput({ type: 'search', status: 'error' })
    const root = host.querySelector<HTMLElement>('.bing-input')!
    const before = input.getBoundingClientRect().width
    const idleBorder = getComputedStyle(root).borderColor
    input.focus()
    await userEvent.type(input, '内容')
    await expect.poll(() => getComputedStyle(root).borderColor).toBe(idleBorder)
    await expect.poll(() => getComputedStyle(root).boxShadow).toContain('2px')
    expect(input.getBoundingClientRect().width).toBe(before)
    model.value = ''
    await nextTick()
    expect(input.getBoundingClientRect().width).toBe(before)
    const clear = host.querySelector<HTMLButtonElement>('.bing-input__clear')!
    expect(clear.tabIndex).toBe(-1)
    await expect.poll(() => getComputedStyle(clear).visibility).toBe('hidden')
    liveProps.value = { status: 'error', readonly: true }
    await nextTick()
    expect(getComputedStyle(input).cursor).toBe('default')
    liveProps.value = { status: 'error', disabled: true }
    await expect.poll(() => getComputedStyle(root).boxShadow).toBe('none')
  })

  it('达到上限阻止继续输入时反馈，替换选区允许输入且不抖动，播报只在跨阈值时变化', async () => {
    const { input, host } = mountInput({ modelValue: '12345678', maxLength: 10, showCount: true })
    const live = host.querySelector('.bing-text-control__live')!
    const count = host.querySelector('.bing-input__count')!
    input.focus()
    input.setSelectionRange(8, 8)
    await userEvent.keyboard('9')
    expect(live.textContent).toBe('还可输入 1 个字')
    await userEvent.keyboard('0')
    expect(live.textContent).toBe('已达到字数上限')
    await userEvent.keyboard('x')
    expect(input.value).toBe('1234567890')
    await expect.poll(() => count.classList.contains('is-limit')).toBe(true)
    await expect.poll(() => count.classList.contains('is-limit')).toBe(false)
    input.setSelectionRange(0, 2)
    await userEvent.keyboard('ab')
    expect(input.value).toBe('ab34567890')
    expect(count.classList.contains('is-limit')).toBe(false)
  })
})

describe('BingInput 前缀拖动', () => {
  function pointer(target: EventTarget, type: string, x = 0, shiftKey = false, pointerId = 55) {
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId, pointerType: 'mouse', isPrimary: true, button: 0, clientX: x, shiftKey }))
  }
  it('每四像素一个步长，Shift 十倍，释放只提交一次原生 change', async () => {
    const { host, input, model, changes } = mountInput({ type: 'number', modelValue: 2, min: 0, max: 20, step: 0.5, prefix: '宽', scrub: true })
    const prefix = host.querySelector<HTMLElement>('.bing-input__prefix')!
    // 合成 PointerEvent 没有浏览器活跃指针；捕获由后续 Playwright 真指针验证。
    prefix.setPointerCapture = () => {}
    pointer(prefix, 'pointerdown')
    pointer(window, 'pointermove', 3)
    expect(model.value).toBe(2)
    pointer(window, 'pointermove', 8)
    expect(model.value).toBe(3)
    pointer(window, 'pointermove', 12, true)
    expect(model.value).toBe(8)
    expect(changes).not.toHaveBeenCalled()
    pointer(window, 'pointerup', 12)
    await nextTick(); await nextTick()
    expect(changes).toHaveBeenCalledTimes(1)
    expect(changes.mock.calls[0]?.[0]).toBeInstanceOf(Event)
    expect(input.value).toBe('8')
    expect(document.documentElement.style.cursor).not.toBe('ew-resize')
  })
  it('受控拒绝时拖动预览保持稳定，释放统一回到父级值且不提交 change', async () => {
    const { host, input, model, changes } = mountInput({ type: 'number', modelValue: 2, prefix: '宽', scrub: true }, false)
    const prefix = host.querySelector<HTMLElement>('.bing-input__prefix')!
    prefix.setPointerCapture = () => {}
    pointer(prefix, 'pointerdown')
    for (const x of [4, 8, 12]) {
      pointer(window, 'pointermove', x)
      await nextTick()
      expect(input.value).toBe(String(2 + x / 4))
      expect(model.value).toBe(2)
    }
    pointer(window, 'pointerup', 12)
    await nextTick(); await nextTick()
    expect(input.value).toBe('2')
    expect(changes).not.toHaveBeenCalled()
  })
  it('释放事件的最后一步不重复发布，保留原有文档样式优先级', async () => {
    const { host, updates, changes } = mountInput({ type: 'number', modelValue: 2, prefix: '宽', scrub: true })
    const prefix = host.querySelector<HTMLElement>('.bing-input__prefix')!
    prefix.setPointerCapture = () => {}
    const style = document.documentElement.style
    const previous = style.cssText
    try {
      style.setProperty('cursor', 'crosshair', 'important')
      style.setProperty('user-select', 'text', 'important')
      pointer(prefix, 'pointerdown')
      pointer(window, 'pointerup', 4)
      await nextTick(); await nextTick()
      expect(updates).toHaveBeenCalledTimes(1)
      expect(updates).toHaveBeenCalledWith(3)
      expect(changes).toHaveBeenCalledTimes(1)
      expect(style.cursor).toBe('crosshair')
      expect(style.userSelect).toBe('text')
      expect(style.getPropertyPriority('cursor')).toBe('important')
      expect(style.getPropertyPriority('user-select')).toBe('important')
    } finally { style.cssText = previous }
  })
  it('Esc / pointercancel / 失去窗口焦点撤销，禁用和卸载都释放拖动资源', async () => {
    const { host, input, model, changes, liveProps } = mountInput({ type: 'number', modelValue: 2, prefix: '宽', scrub: true })
    const prefix = host.querySelector<HTMLElement>('.bing-input__prefix')!
    prefix.setPointerCapture = () => {}
    for (const cancel of ['escape', 'pointercancel', 'blur']) {
      pointer(prefix, 'pointerdown')
      pointer(window, 'pointermove', 12)
      await nextTick()
      expect(model.value).toBe(5)
      if (cancel === 'escape') window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', cancelable: true }))
      else if (cancel === 'pointercancel') pointer(window, cancel)
      else window.dispatchEvent(new Event('blur'))
      await nextTick()
      expect(model.value).toBe(2)
      expect(document.documentElement.style.cursor).not.toBe('ew-resize')
    }
    expect(changes).not.toHaveBeenCalled()
    pointer(prefix, 'pointerdown')
    liveProps.value = { ...liveProps.value, disabled: true }
    await nextTick()
    pointer(window, 'pointermove', 12)
    expect(input.value).toBe('2')
    expect(document.documentElement.style.userSelect).not.toBe('none')
    liveProps.value = { ...liveProps.value, disabled: false }
    await nextTick()
    pointer(prefix, 'pointerdown')
    const mountedInput = mounted.pop()!
    mountedInput.app.unmount(); mountedInput.host.remove()
    expect(document.documentElement.style.cursor).not.toBe('ew-resize')
  })
})
