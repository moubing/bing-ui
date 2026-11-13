import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App, VNode } from 'vue'
import BingForm from './BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import BingRadioGroup from '../BingRadioGroup/BingRadioGroup.vue'
import BingCheckboxGroup from '../BingCheckboxGroup/BingCheckboxGroup.vue'
import BingDialog from '../BingDialog/BingDialog.vue'
import { z } from 'zod'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
const options = [{ label: '甲', value: 'a' }, { label: '乙', value: 'b' }]
const item = (name: string, child: VNode = h(BingInput), extra = {}) =>
  h(BingFormItem, { label: name, 'data-field': name, ...extra }, () => child)
const submit = () => h('button', { type: 'submit', id: 'next-hint-submit' }, '提交')
const control = <T extends HTMLElement = HTMLInputElement>(host: ParentNode, field: string, selector = 'input') =>
  host.querySelector<T>(`[data-field="${field}"] ${selector}`)!
const hint = (host: ParentNode) => {
  const node = host.querySelector<HTMLElement>('.bing-form__next-hint')
  return node && getComputedStyle(node).visibility === 'visible' ? node : null
}
async function pointsTo(host: ParentNode, target: HTMLElement) {
  await expect.poll(() => hint(host)?.dataset.target).toBe(target.id)
}
async function mount(render: () => VNode) {
  const host = document.createElement('div')
  host.style.cssText = 'width: min(540px, calc(100vw - 48px)); margin: 24px;'
  document.body.append(host)
  const app = createApp({ render })
  app.mount(host)
  mounted.push({ app, host })
  await nextTick()
  return host
}

afterEach(async () => {
  await userEvent.keyboard('{/Shift}')
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
  vi.restoreAllMocks()
})

describe('下一项提示遵循真实 Tab 落点', () => {
  it('默认关闭，开启后跟随 Tab / Shift+Tab / 点击；不跳过已填与只读项，Tab 到提交按钮不会提交', async () => {
    const enabled = ref<boolean | undefined>()
    const onSubmit = vi.fn(() => { enabled.value = false })
    const host = await mount(() => h(BingForm, { nextStepHint: enabled.value, layout: 'stack', onSubmit }, () => [
      item('姓名'), item('已填邮箱', h(BingInput, { modelValue: 'a@example.com', readonly: true })), item('选填备注'), submit(),
    ]))
    const a = control(host, '姓名')
    const b = control(host, '已填邮箱')
    const c = control(host, '选填备注')
    a.focus()
    await nextTick()
    expect(hint(host)).toBeNull()
    enabled.value = true
    await pointsTo(host, b)
    const rect = b.getBoundingClientRect().toJSON()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(b)
    await pointsTo(host, c)
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    expect(document.activeElement).toBe(a)
    await pointsTo(host, b)
    expect(b.getBoundingClientRect().toJSON()).toEqual(rect)
    await userEvent.click(c)
    const button = host.querySelector<HTMLButtonElement>('[type="submit"]')!
    await pointsTo(host, button)
    expect(hint(host)?.textContent).toContain('前往提交')
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(button)
    expect(onSubmit).not.toHaveBeenCalled()
    await expect.poll(() => hint(host)).toBeNull()
    await userEvent.keyboard('{Enter}')
    await expect.poll(() => onSubmit.mock.calls.length).toBe(1)
    a.focus()
    await nextTick()
    expect(hint(host)).toBeNull()
  })

  it('保留清除按钮和复选框内部 Tab 入口，只有真正离开该字段时才提示下一项', async () => {
    const host = await mount(() => h(BingForm, { nextStepHint: true, layout: 'stack' }, () => [
      item('搜索', h(BingInput, { modelValue: '关键词', clearable: true })),
      item('渠道', h(BingCheckboxGroup, { options })), item('备注'),
    ]))
    control(host, '搜索').focus()
    await expect.poll(() => hint(host)).toBeNull()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(host.querySelector('.bing-input__clear'))
    const checks = host.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')
    await pointsTo(host, checks[0]!)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(checks[0])
    await expect.poll(() => hint(host)).toBeNull()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(checks[1])
    await pointsTo(host, control(host, '备注'))
  })

  it('下拉展开暂停、关闭恢复，Tab 进入选中单选项且不改变选值', async () => {
    const change = vi.fn()
    const host = await mount(() => h(BingForm, { nextStepHint: true, layout: 'stack' }, () => [
      item('团队', h(BingSelect, { options, clearable: false })),
      item('通知', h(BingRadioGroup, { options, modelValue: 'b', 'onUpdate:modelValue': change })), item('备注'),
    ]))
    const trigger = control<HTMLButtonElement>(host, '团队', '.bing-select__trigger')
    const checked = control(host, '通知', 'input:checked')
    trigger.focus()
    await pointsTo(host, checked)
    await userEvent.click(trigger)
    await expect.poll(() => hint(host)).toBeNull()
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => trigger.getAttribute('aria-expanded')).toBe('false')
    trigger.focus()
    await pointsTo(host, checked)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(checked)
    expect(change).not.toHaveBeenCalled()
    await pointsTo(host, control(host, '备注'))
  })

  it('未选的单选组按原生 Tab 进入首项，方向键仍负责切换选项', async () => {
    const selected = ref<string>()
    const host = await mount(() => h(BingForm, { nextStepHint: true, layout: 'stack' }, () => [
      item('姓名'), item('通知', h(BingRadioGroup, { options, modelValue: selected.value, 'onUpdate:modelValue': value => { selected.value = String(value) } })), item('备注'),
    ]))
    const radios = host.querySelectorAll<HTMLInputElement>('input[type="radio"]')
    control(host, '姓名').focus()
    await pointsTo(host, radios[0]!)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(radios[0])
    await userEvent.keyboard('{ArrowRight}')
    expect(document.activeElement).toBe(radios[1])
    expect(selected.value).toBe('b')
    await pointsTo(host, control(host, '备注'))
  })

  it('焦点不动时也随字段插入、移除、隐藏与禁用更新；不按注册顺序猜测', async () => {
    const order = ref(['b', 'c'])
    const hidden = ref(false)
    const disabled = ref(false)
    const host = await mount(() => h(BingForm, { nextStepHint: true, layout: 'stack' }, () => [
      item('a'), ...order.value.map(key => item(key, h(BingInput, { disabled: key === 'b' && disabled.value }), { key, style: key === 'b' && hidden.value ? 'display: none' : '' })),
    ]))
    control(host, 'a').focus()
    await pointsTo(host, control(host, 'b'))
    order.value = ['c', 'b']
    await nextTick()
    await pointsTo(host, control(host, 'c'))
    order.value = ['b', 'c']
    hidden.value = true
    await nextTick()
    await pointsTo(host, control(host, 'c'))
    hidden.value = false
    disabled.value = true
    await nextTick()
    await pointsTo(host, control(host, 'c'))
    disabled.value = false
    await nextTick()
    await pointsTo(host, control(host, 'b'))
    order.value = ['c']
    await nextTick()
    await pointsTo(host, control(host, 'c'))
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(control(host, 'c'))
  })

  it('中间的普通按钮、正 tabindex 和自定义元素阻断预测，不偷偷绕过它们', async () => {
    const barrier = ref('button')
    const host = await mount(() => h(BingForm, { nextStepHint: true, layout: 'stack' }, () => [
      item('a'), h(barrier.value, { style: 'display: block; height: 20px;', tabindex: barrier.value === 'div' ? 1 : undefined }, '辅助操作'), item('b'),
    ]))
    control(host, 'a').focus()
    await expect.poll(() => hint(host)).toBeNull()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement?.textContent).toBe('辅助操作')
    for (const kind of ['div', 'test-custom-input']) {
      barrier.value = kind
      await nextTick()
      control(host, 'a').focus()
      await expect.poll(() => hint(host)).toBeNull()
    }
  })

  it('原生日期内部入口不猜测，紧凑表单的提交提示不能覆盖输入框', async () => {
    const date = ref(true)
    const host = await mount(() => h(BingForm, { nextStepHint: true, layout: 'stack', gap: 0 }, () => [
      item('a', h(BingInput), { showMessage: false }),
      ...(date.value ? [item('日期', h('input', { type: 'date' }), { showMessage: false })] : []), submit(),
    ]))
    control(host, 'a').focus()
    await expect.poll(() => hint(host)).toBeNull()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(control(host, '日期'))
    await expect.poll(() => hint(host)).toBeNull()
    date.value = false
    await nextTick()
    control(host, 'a').focus()
    await expect.poll(() => hint(host)).toBeNull()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(host.querySelector('[type="submit"]'))
  })

  it('目标在滚动容器之外时改在当前项旁提示名称，不提前滚动；Tab 后恢复跟随', async () => {
    const host = await mount(() => h('div', { style: 'height: 230px; overflow: auto;', 'data-scroll': '' }, [
      h(BingForm, { nextStepHint: true, layout: 'stack' }, () => [item('姓名'), h('div', { style: 'height: 340px' }), item('联系邮箱'), item('备注')]),
    ]))
    const scroller = host.querySelector<HTMLElement>('[data-scroll]')!
    const b = control(host, '联系邮箱')
    control(host, '姓名').focus()
    await pointsTo(host, b)
    expect(hint(host)?.textContent).toContain('下一项：联系邮箱')
    expect(hint(host)?.dataset.offscreen).toBe('true')
    expect(scroller.scrollTop).toBe(0)
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(b)
    expect(scroller.scrollTop).toBeGreaterThan(0)
    await pointsTo(host, control(host, '备注'))
  })

  it('离开表单、打开弹窗或切换到另一个表单时，只保留当前作用域的提示', async () => {
    const open = ref(false)
    const host = await mount(() => h('div', [
      h(BingForm, { nextStepHint: true, layout: 'stack', id: 'form-one' }, () => [item('a'), item('b')]),
      h(BingForm, { nextStepHint: true, layout: 'stack', id: 'form-two' }, () => [item('c'), item('d')]),
      h(BingDialog, { modelValue: open.value, 'onUpdate:modelValue': value => { open.value = value }, overlayOrbsAnimated: false }, () => h('input', { 'aria-label': '弹窗输入' })),
    ]))
    const first = host.querySelector('#form-one')!
    const second = host.querySelector('#form-two')!
    control(host, 'a').focus()
    await pointsTo(first, control(host, 'b'))
    control(host, 'c').focus()
    await expect.poll(() => hint(first)).toBeNull()
    await pointsTo(second, control(host, 'd'))
    open.value = true
    await expect.poll(() => hint(second)).toBeNull()
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => open.value).toBe(false)
    await pointsTo(second, control(host, 'd'))
    control(host, 'a').focus()
    await pointsTo(first, control(host, 'b'))
  })

  it('错误不拦截 Tab；校验失败定位当前错误后，提示继续指向下一个实际落点', async () => {
    const host = await mount(() => h(BingForm, {
      nextStepHint: true, layout: 'stack', model: { a: '', b: '' }, scrollToError: false,
      schema: z.object({ a: z.string().min(1, '必填'), b: z.string() }),
    }, () => [item('a', h(BingInput), { prop: 'a' }), item('b', h(BingInput), { prop: 'b' }), submit()]))
    control(host, 'a').focus()
    await pointsTo(host, control(host, 'b'))
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(control(host, 'b'))
    await expect.poll(() => control(host, 'a').getAttribute('aria-invalid')).toBe('true')
    await userEvent.click(host.querySelector<HTMLButtonElement>('button[type="submit"]')!)
    await expect.poll(() => document.activeElement).toBe(control(host, 'a'))
    await pointsTo(host, control(host, 'b'))
  })

  it('禁用和卸载后清理监听，重新开启可以恢复', async () => {
    const disabled = ref(false)
    const enabled = ref(true)
    const host = await mount(() => h(BingForm, { nextStepHint: enabled.value, disabled: disabled.value, layout: 'stack' }, () => [item('a'), item('b')]))
    control(host, 'a').focus()
    await pointsTo(host, control(host, 'b'))
    disabled.value = true
    await expect.poll(() => hint(host)).toBeNull()
    disabled.value = false
    await nextTick()
    control(host, 'a').focus()
    await pointsTo(host, control(host, 'b'))
    enabled.value = false
    await expect.poll(() => hint(host)).toBeNull()
    enabled.value = true
    await pointsTo(host, control(host, 'b'))
    mounted.at(-1)!.app.unmount()
    window.dispatchEvent(new Event('resize'))
    await nextTick()
    expect(hint(host)).toBeNull()
    mounted.pop()!.host.remove()
  })
})
