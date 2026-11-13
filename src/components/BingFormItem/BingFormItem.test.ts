import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createSSRApp, defineComponent, h, nextTick, reactive } from 'vue'
import type { App } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import BingForm from '../BingForm/BingForm.vue'
import type { BingFormExpose } from '../BingForm/BingForm.types'
import BingInput from '../BingInput/BingInput.vue'
import BingRadioGroup from '../BingRadioGroup/BingRadioGroup.vue'
import BingFormItem from './BingFormItem.vue'

enableAutoUnmount(afterEach)
const hydratedApps: Array<{ app: App; host: HTMLElement }> = []

afterEach(() => {
  hydratedApps.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
  vi.restoreAllMocks()
})

const TwoFields = defineComponent({
  setup() {
    const model = reactive({ name: '', password: '' })
    const schema = z.object({
      name: z.string().min(1, '请输入姓名'),
      password: z.string().min(8, '密码至少 8 位'),
    })

    return () => h(BingForm, { model, schema, scrollToError: false }, () => [
      h(BingFormItem, { prop: 'name', label: '姓名', help: '输入成员姓名' }, () => h(BingInput, {
        modelValue: model.name,
        'onUpdate:modelValue': value => { model.name = String(value) },
      })),
      h(BingFormItem, { prop: 'password', label: '密码', help: '至少 8 位字符' }, () => h(BingInput, {
        modelValue: model.password,
        type: 'password',
        'onUpdate:modelValue': value => { model.password = String(value) },
      })),
    ])
  },
})

function getAssociations(root: ParentNode) {
  return Array.from(root.querySelectorAll('.bing-form-item')).map((item) => {
    const input = item.querySelector('input')!
    return {
      control: input.id,
      label: item.querySelector('label')!.htmlFor,
      describedby: input.getAttribute('aria-describedby'),
      message: item.querySelector('.bing-form-item__message')!.id,
    }
  })
}

function expectAssociations(root: ParentNode, count: number) {
  const associations = getAssociations(root)
  expect(associations).toHaveLength(count)
  expect(new Set(associations.flatMap(({ control, message }) => [control, message])).size).toBe(count * 2)
  associations.forEach(({ control, label, describedby, message }) => {
    expect(label).toBe(control)
    expect(describedby).toBe(message)
  })
}

function messageText(element: Element) {
  // 动画副本对辅助技术隐藏，只核对实际提供给读屏的错误文案。
  const copy = element.cloneNode(true) as Element
  copy.querySelectorAll('[aria-hidden="true"]').forEach(node => node.remove())
  return copy.textContent?.trim()
}

describe('BingFormItem accessible IDs', () => {
  it('在 SSR 和 hydration 中关联显式控件 ID，并为组使用 aria-labelledby', async () => {
    const scene = defineComponent({
      render: () => h('div', [
        h(BingFormItem, { label: '名称' }, () => h(BingInput, { id: 'custom-name' })),
        h(BingFormItem, { label: '职责' }, () => h(BingRadioGroup, { options: [{ label: '开发', value: 'dev' }, { label: '设计', value: 'design' }] })),
      ]),
    })
    const host = document.createElement('div')
    host.innerHTML = await renderToString(createSSRApp(scene))
    document.body.appendChild(host)
    const app = createSSRApp(scene)
    const warnings: string[] = []
    app.config.warnHandler = message => warnings.push(message)
    const check = () => {
      const labels = host.querySelectorAll('label.bing-form-item__label')
      expect(labels[0]!.getAttribute('for')).toBe('custom-name')
      expect(labels[1]!.hasAttribute('for')).toBe(false)
      expect(host.querySelector('[role="radiogroup"]')!.getAttribute('aria-labelledby')).toBe(labels[1]!.id)
      const ids = [...host.querySelectorAll('[id]')].map(element => element.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
    try {
      check()
      app.mount(host)
      hydratedApps.push({ app, host })
      await nextTick()
      check()
      expect(warnings).toEqual([])
    } finally {
      if (!hydratedApps.some(item => item.host === host)) host.remove()
    }
  })

  it('keeps controls and help messages unique across multiple forms in one app', () => {
    const wrapper = mount(defineComponent({ render: () => h('div', [h(TwoFields), h(TwoFields)]) }))
    expectAssociations(wrapper.element, 4)
  })

  it('associates each validation error only with its own field and preserves IDs when errors clear', async () => {
    const wrapper = mount(TwoFields)
    const initial = getAssociations(wrapper.element)
    const form = wrapper.getComponent(BingForm).vm as unknown as BingFormExpose
    await expect(form.validate()).resolves.toBe(false)
    await nextTick()

    expectAssociations(wrapper.element, 2)
    expect(getAssociations(wrapper.element)).toEqual(initial)
    expect(wrapper.findAll('[role="alert"]').map((message) => messageText(message.element))).toEqual(['请输入姓名', '密码至少 8 位'])
    expect(wrapper.findAll('input').map((input) => input.attributes('aria-invalid'))).toEqual(['true', 'true'])

    form.clearValidate('password')
    await nextTick()
    expectAssociations(wrapper.element, 2)
    expect(wrapper.findAll('.bing-form-item__message').map((message) => messageText(message.element))).toEqual(['请输入姓名', '至少 8 位字符'])
    expect(wrapper.findAll('input')[1].attributes('aria-invalid')).toBeUndefined()
  })

  it('generates the same IDs for independent SSR requests and hydrates without changing any association', async () => {
    const createApp = () => {
      const app = createSSRApp(TwoFields)
      app.config.idPrefix = 'account'
      return app
    }
    const [firstHtml, secondHtml] = await Promise.all([
      renderToString(createApp()),
      renderToString(createApp()),
    ])
    const host = document.createElement('div')
    host.innerHTML = secondHtml
    document.body.appendChild(host)
    expectAssociations(host, 2)
    const serverAssociations = getAssociations(host)
    expect(serverAssociations[0].control).toContain('account')
    const firstRoot = document.createElement('div')
    firstRoot.innerHTML = firstHtml
    expect(getAssociations(firstRoot)).toEqual(serverAssociations)
    const serverInputs = Array.from(host.querySelectorAll('input'))
    const warnings: string[] = []
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const app = createApp()
    app.config.warnHandler = (message) => warnings.push(message)
    app.mount(host)
    hydratedApps.push({ app, host })
    await nextTick()

    expect(getAssociations(host)).toEqual(serverAssociations)
    Array.from(host.querySelectorAll('input')).forEach((input, index) => {
      expect(input).toBe(serverInputs[index])
    })
    expect(warnings).toEqual([])
    expect(errorSpy).not.toHaveBeenCalled()
  })
})
