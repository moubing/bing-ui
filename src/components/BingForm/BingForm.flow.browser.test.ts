import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, reactive, ref } from 'vue'
import type { App, VNode } from 'vue'
import { z } from 'zod'
import BingForm from './BingForm.vue'
import type { BingFormExpose } from './BingForm.types'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import BingRadioGroup from '../BingRadioGroup/BingRadioGroup.vue'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
async function mount(render: () => VNode) {
  const host = document.createElement('div')
  host.style.cssText = 'width: 540px; margin: 24px;'
  document.body.appendChild(host)
  const app = createApp({ render })
  app.mount(host)
  mounted.push({ app, host })
  await nextTick()
  return host
}
const item = (prop: string, child: VNode, extra = {}) => h(BingFormItem, { prop, label: prop, ...extra }, () => child)
const submitButton = () => h('button', { type: 'submit' }, '提交')

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
  vi.restoreAllMocks()
})

describe('通用表单的填写与纠错', () => {
  it('普通输入的 Tab 直接前往下一字段，首次输入不报错，离开后校验，修正后立即清除', async () => {
    const model = reactive({ email: '', name: '' })
    const onSubmit = vi.fn()
    const schema = z.object({ email: z.string().email('邮箱格式不正确'), name: z.string().min(1, '请输入姓名') })
    const host = await mount(() => h(BingForm, { model, schema, layout: 'stack', onSubmit }, () => [
      item('email', h(BingInput, { modelValue: model.email, 'onUpdate:modelValue': value => { model.email = String(value) } })),
      item('name', h(BingInput, { modelValue: model.name, 'onUpdate:modelValue': value => { model.name = String(value) } })), submitButton(),
    ]))
    const [email, name] = host.querySelectorAll<HTMLInputElement>('input')
    email!.focus()
    await userEvent.keyboard('lin')
    expect(host.querySelector('.bing-input__clear')).toBeNull()
    expect(email!.getAttribute('aria-invalid')).toBeNull()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(name)
    await expect.poll(() => email!.getAttribute('aria-invalid')).toBe('true')
    expect(name!.getAttribute('aria-invalid')).toBeNull()
    await userEvent.keyboard('Lin')
    email!.focus()
    email!.select()
    await userEvent.keyboard('lin@example.com')
    await expect.poll(() => email!.getAttribute('aria-invalid')).toBeNull()
    await userEvent.click(host.querySelector<HTMLButtonElement>('button[type="submit"]')!)
    await expect.poll(() => onSubmit.mock.calls[0]?.[0]?.valid).toBe(true)
    expect(model).toEqual({ name: 'Lin', email: 'lin@example.com' })
  })

  it.each(['change', 'blur', 'submit', 'manual'] as const)('显式 %s 策略保留原有校验时机', async validateTrigger => {
    const model = reactive({ name: '' })
    const host = await mount(() => h(BingForm, { model, validateTrigger, schema: z.object({ name: z.string().min(3, '至少三个字符') }), scrollToError: false }, () => [
      item('name', h(BingInput, { modelValue: model.name, 'onUpdate:modelValue': value => { model.name = String(value) } })), submitButton(),
    ]))
    const input = host.querySelector('input')!
    input.focus()
    await userEvent.keyboard('a')
    if (validateTrigger === 'change') await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true')
    else expect(input.getAttribute('aria-invalid')).toBeNull()
    await userEvent.keyboard('{Tab}')
    if (validateTrigger === 'blur') await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true')
    if (validateTrigger === 'submit' || validateTrigger === 'manual') expect(input.getAttribute('aria-invalid')).toBeNull()
    await userEvent.keyboard('{Enter}')
    if (validateTrigger !== 'manual') await expect.poll(() => input.getAttribute('aria-invalid')).toBe('true')
    else expect(input.getAttribute('aria-invalid')).toBeNull()
  })

  it('提交按最新 DOM 顺序定位错误，跳过隐藏与禁用字段，并支持插槽内的原生输入', async () => {
    const order = ref(['a', 'b'])
    const model = { hidden: '', disabled: '', a: '', b: '' }
    const schema = z.object(Object.fromEntries(Object.keys(model).map(key => [key, z.string().min(1, '必填')])))
    const host = await mount(() => h(BingForm, { model, schema, validateTrigger: 'submit', scrollToError: false }, () => [
      item('hidden', h(BingInput), { style: 'display: none' }),
      item('disabled', h(BingInput, { disabled: true })),
      ...order.value.map(key => item(key, h('input', { 'data-field': key }), { key })), submitButton(),
    ]))
    order.value = ['b', 'a']
    await nextTick()
    await userEvent.click(host.querySelector<HTMLButtonElement>('button[type="submit"]')!)
    await expect.poll(() => document.activeElement).toBe(host.querySelector('[data-field="b"]'))
  })

  it('错误定位到 Select 和单选组的主入口，保留选值并允许关闭自动聚焦', async () => {
    const focusOnError = ref(true)
    const model = reactive({ select: null as string | null, radio: 'b' })
    const onRadioChange = vi.fn()
    const options = [{ label: '甲', value: 'a' }, { label: '乙', value: 'b' }]
    const schema = z.object({ select: z.string(), radio: z.literal('a') })
    const host = await mount(() => h(BingForm, { model, schema, focusOnError: focusOnError.value, validateTrigger: 'submit', scrollToError: false }, () => [
      item('select', h(BingSelect, { modelValue: model.select, options })),
      item('radio', h(BingRadioGroup, { modelValue: model.radio, options, 'onUpdate:modelValue': onRadioChange })), submitButton(),
    ]))
    const submit = host.querySelector<HTMLButtonElement>('button[type="submit"]')!
    const select = host.querySelector<HTMLButtonElement>('.bing-select__trigger')!
    await userEvent.click(submit)
    await expect.poll(() => document.activeElement).toBe(select)
    expect(select.getAttribute('aria-expanded')).toBe('false')
    model.select = 'a'
    await userEvent.click(submit)
    await expect.poll(() => document.activeElement).toBe(host.querySelector('input[type="radio"]:checked'))
    expect(onRadioChange).not.toHaveBeenCalled()
    focusOnError.value = false
    await nextTick()
    await userEvent.click(submit)
    await nextTick()
    expect(document.activeElement).toBe(submit)
  })

  it.each(['focus', 'edit'] as const)('异步提交校验期间继续 %s，不把焦点拉回首个错误', async action => {
    const model = reactive({ first: '', second: '原值' })
    const gates: Array<() => void> = []
    const onInvalid = vi.fn()
    const schema = z.object({ first: z.string().min(1), second: z.string() })
      .superRefine(() => new Promise<void>(resolve => gates.push(resolve)))
    const host = await mount(() => h(BingForm, { model, schema, validateTrigger: 'submit', scrollToError: false, onInvalid }, () => [
      item('first', h(BingInput)),
      item('second', h(BingInput, { modelValue: model.second, 'onUpdate:modelValue': value => { model.second = String(value) } })), submitButton(),
    ]))
    const second = host.querySelectorAll<HTMLInputElement>('input')[1]!
    const form = host.querySelector('form')!
    if (action === 'edit') {
      second.focus()
      form.requestSubmit()
      await userEvent.keyboard('x')
    } else {
      await userEvent.click(host.querySelector<HTMLButtonElement>('button[type="submit"]')!)
      second.focus()
    }
    gates[0]!()
    if (action === 'edit') {
      await expect.poll(() => gates.length).toBe(2)
      gates[1]!()
    }
    await expect.poll(() => onInvalid.mock.calls.length).toBe(1)
    await nextTick()
    expect(document.activeElement).toBe(second)
    expect(model.second).toContain('原值')
  })

  it('手动校验只更新错误，重置后恢复首次填写的校验时机', async () => {
    const formRef = ref<BingFormExpose | null>(null)
    const model = reactive({ email: '' })
    const host = await mount(() => h(BingForm, { ref: formRef, model, schema: z.object({ email: z.string().email('邮箱无效') }), scrollToError: false }, () => [
      item('email', h(BingInput, { modelValue: model.email, 'onUpdate:modelValue': value => { model.email = String(value) } })), submitButton(),
    ]))
    const submit = host.querySelector<HTMLButtonElement>('button[type="submit"]')!
    submit.focus()
    await formRef.value!.validate()
    expect(document.activeElement).toBe(submit)
    formRef.value!.resetFields()
    const input = host.querySelector('input')!
    input.focus()
    await userEvent.keyboard('a')
    expect(input.getAttribute('aria-invalid')).toBeNull()
  })
})
