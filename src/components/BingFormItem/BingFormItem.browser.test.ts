import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp, h, nextTick, reactive, ref } from 'vue'
import type { App } from 'vue'
import { gsap } from 'gsap'
import { z } from 'zod'
import BingForm from '../BingForm/BingForm.vue'
import type { BingFormExpose } from '../BingForm/BingForm.types'
import BingInput from '../BingInput/BingInput.vue'
import BingFormItem from './BingFormItem.vue'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined

afterEach(() => {
  app?.unmount()
  app = undefined
  host?.remove()
  vi.restoreAllMocks()
})

function mountEmailForm() {
  const form = ref<BingFormExpose | null>(null)
  const model = reactive({ email: '', name: '' })
  const showMessage = ref(true)
  const help = ref<string | undefined>('用于接收项目通知')
  const schema = z.object({ email: z.string().min(1, '请输入邮箱').email('请输入有效的邮箱地址') })
  host = document.createElement('div')
  host.style.cssText = 'width: 420px; margin: 24px;'
  document.body.appendChild(host)
  app = createApp({
    render: () => h(BingForm, { ref: form, model, schema, scrollToError: false, validateTrigger: 'submit' }, () => [
      h(BingFormItem, { prop: 'email', label: '邮箱', help: help.value, showMessage: showMessage.value }, () => h(BingInput, { modelValue: model.email })),
      h(BingFormItem, { prop: 'name', label: '姓名' }, () => h(BingInput, { modelValue: model.name })),
    ]),
  })
  app.mount(host)
  return { form, model, showMessage, help }
}

describe('BingFormItem in a browser', () => {
  it('整句错误保持单行和原位，使用普通文字呈现', async () => {
    const form = ref<BingFormExpose | null>(null)
    host = document.createElement('div')
    host.style.cssText = 'width: 460px; margin: 40px; font-family: Arial, sans-serif;'
    document.body.appendChild(host)
    app = createApp({
      render: () => h(BingForm, {
        ref: form,
        model: { password: '' },
        schema: z.object({ password: z.string().min(8, '密码至少 8 位') }),
        scrollToError: false,
      }, () => h(BingFormItem, { prop: 'password', label: '密码', help: '至少 8 位字符' }, () => h(BingInput))),
    })
    app.mount(host)
    await nextTick()
    await form.value!.validate()

    await expect.poll(() => host!.querySelector('.bing-form-item__message-text')?.textContent?.trim()).toBe('密码至少 8 位')
    const message = host.querySelector<HTMLElement>('.bing-form-item__message')!
    const text = host.querySelector<HTMLElement>('.bing-form-item__message-text')!
    expect(message.clientHeight).toBe(16)
    expect(text.children).toHaveLength(0)
    expect(getComputedStyle(text).transform).toBe('none')
  })

  it('错误文案原位更新，修正后恢复帮助文案且不移动焦点和相邻字段', async () => {
    const { form, model } = mountEmailForm()
    await nextTick()
    const [input, nextInput] = host!.querySelectorAll('input')
    const nextTop = nextInput.getBoundingClientRect().top
    const describedby = input.getAttribute('aria-describedby')
    input.focus()
    await form.value!.validateField('email')
    await expect.poll(() => host!.querySelector('.bing-form-item__message-text')?.textContent?.trim()).toBe('请输入邮箱')
    const text = host!.querySelector<HTMLElement>('.bing-form-item__message-text')!
    await expect.poll(() => getComputedStyle(text).opacity).toBe('1')
    const top = text.getBoundingClientRect().top

    model.email = 'lin'
    await form.value!.validateField('email')
    await nextTick()
    expect(host!.querySelector('.bing-form-item__message-text')).toBe(text)
    expect(text.textContent?.trim()).toBe('请输入有效的邮箱地址')
    expect(getComputedStyle(text).opacity).toBe('1')
    expect(text.getBoundingClientRect().top).toBe(top)
    await expect.element(input).toHaveAccessibleDescription('请输入有效的邮箱地址')

    model.email = 'lin@example.com'
    await form.value!.validateField('email')
    await nextTick()
    expect(text.getAttribute('aria-hidden')).toBe('true')
    await expect.poll(() => host!.querySelector('.bing-form-item__message-text')?.textContent?.trim()).toBe('用于接收项目通知')
    await expect.element(input).toHaveAccessibleDescription('用于接收项目通知')
    expect(input.getAttribute('aria-describedby')).toBe(describedby)
    expect(document.activeElement).toBe(input)
    expect(nextInput.getBoundingClientRect().top).toBe(nextTop)
  })

  it('连续修正和再次报错只保留最新文案，没有隐藏或重复的错误节点', async () => {
    const { form, model, help } = mountEmailForm()
    await form.value!.validateField('email')
    await expect.poll(() => host!.querySelector('.bing-form-item__message-text')?.textContent?.trim()).toBe('请输入邮箱')
    for (let index = 0; index < 3; index++) {
      model.email = 'lin@example.com'
      await form.value!.validateField('email')
      await nextTick()
      model.email = 'lin'
      await form.value!.validateField('email')
      await nextTick()
    }
    await expect.element(host!.querySelector('input')!).toHaveAccessibleDescription('请输入有效的邮箱地址')
    await expect.poll(() => host!.querySelectorAll('.bing-form-item__message-text[aria-hidden="true"]').length).toBe(0)
    expect(host!.querySelectorAll('.bing-form-item__message-text')).toHaveLength(1)

    help.value = undefined
    model.email = 'lin@example.com'
    await form.value!.validateField('email')
    await expect.poll(() => host!.querySelectorAll('.bing-form-item__message-text').length).toBe(0)
    expect(host!.querySelector('input')!.hasAttribute('aria-describedby')).toBe(false)
  })

  it('减少动态效果时直接切换，长文案自然换行而不撑开表单', async () => {
    const matchMedia = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => query === '(prefers-reduced-motion: reduce)'
      ? { ...matchMedia(query), matches: true }
      : matchMedia(query))
    const { form, model, help } = mountEmailForm()
    host!.style.width = '150px'
    await form.value!.validateField('email')
    await nextTick()
    await nextTick()
    const error = host!.querySelector<HTMLElement>('.bing-form-item__message-text')!
    expect(error.textContent?.trim()).toBe('请输入邮箱')
    expect(getComputedStyle(error).opacity).toBe('1')
    expect(gsap.getTweensOf(error)).toHaveLength(0)

    help.value = '这里是一段较长的帮助文案，应该完整换行显示，不裁切或撑开表单。'
    model.email = 'lin@example.com'
    await form.value!.validateField('email')
    await nextTick()
    await nextTick()
    const text = host!.querySelector<HTMLElement>('.bing-form-item__message-text')!
    expect(text.textContent?.trim()).toBe(help.value)
    expect(text.clientHeight).toBeGreaterThan(16)
    expect(host!.scrollWidth).toBe(host!.clientWidth)
    expect(getComputedStyle(text).transform).toBe('none')
  })

  it('隐藏提示和卸载表单时清理正在运行的动效', async () => {
    const { form, showMessage } = mountEmailForm()
    await form.value!.validateField('email')
    await nextTick()
    await nextTick()
    const first = host!.querySelector('.bing-form-item__message-text')!
    showMessage.value = false
    await nextTick()
    expect(gsap.getTweensOf(first)).toHaveLength(0)
    expect(host!.querySelector('input')!.hasAttribute('aria-describedby')).toBe(false)

    showMessage.value = true
    await nextTick()
    const second = host!.querySelector('.bing-form-item__message-text')!
    form.value!.clearValidate()
    await nextTick()
    app!.unmount()
    app = undefined
    await nextTick()
    expect(gsap.getTweensOf(second)).toHaveLength(0)
    expect(host!.childElementCount).toBe(0)
  })

  it('focuses the matching input for each label and keeps validation descriptions separate', async () => {
    const form = ref<BingFormExpose | null>(null)
    const model = reactive({ name: '', password: '' })
    const schema = z.object({
      name: z.string().min(1, '请输入姓名'),
      password: z.string().min(8, '密码至少 8 位'),
    })
    host = document.createElement('div')
    host.style.cssText = 'width: 420px; margin: 40px;'
    document.body.appendChild(host)
    app = createApp({
      render: () => h(BingForm, { ref: form, model, schema, scrollToError: false, validateTrigger: 'submit' }, () => [
        h(BingFormItem, { prop: 'name', label: '姓名' }, () => h(BingInput, { modelValue: model.name })),
        h(BingFormItem, { prop: 'password', label: '密码' }, () => h(BingInput, { modelValue: model.password, type: 'password' })),
      ]),
    })
    app.mount(host)
    await nextTick()

    const inputs = Array.from(host.querySelectorAll('input'))
    const labels = Array.from(host.querySelectorAll('label'))
    expect(inputs[0].id).not.toBe(inputs[1].id)
    labels.forEach((label, index) => {
      expect(label.control).toBe(inputs[index])
      label.click()
      expect(document.activeElement).toBe(inputs[index])
    })

    await form.value!.validate()
    await nextTick()
    for (const [index, input] of inputs.entries()) {
      const messageId = input.getAttribute('aria-describedby')!
      const message = document.getElementById(messageId)!
      expect(message.closest('.bing-form-item')).toBe(input.closest('.bing-form-item'))
      // 核对读屏描述，避免把 aria-hidden 的动画副本计入文案。
      await expect.element(input).toHaveAccessibleDescription(index === 0 ? '请输入姓名' : '密码至少 8 位')
    }
  })
})
