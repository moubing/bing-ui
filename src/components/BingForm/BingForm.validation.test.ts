import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { reactive } from 'vue'
import { z } from 'zod'
import BingForm from './BingForm.vue'
import type { BingFormExpose } from './BingForm.types'

enableAutoUnmount(afterEach)

function fixture(a = '', b = '') {
  const model = reactive({ a, b })
  const gates: Array<() => void> = []
  const schema = z.object({ a: z.string().min(1, 'A 必填'), b: z.string().min(1, 'B 必填') })
    .superRefine(() => new Promise<void>(resolve => gates.push(resolve)))
  const wrapper = mount(BingForm, { props: { model, schema, scrollToError: false } })
  const form = wrapper.vm as unknown as BingFormExpose
  return { model, gates, wrapper, form }
}

describe('表单异步校验的组合行为', () => {
  it('不同字段并行校验，保留各自的错误', async () => {
    const { form, gates } = fixture()
    const a = form.validateField('a')
    const b = form.validateField('b')
    gates[1]!()
    gates[0]!()
    expect(await Promise.all([a, b])).toEqual([false, false])
    expect(form.getErrors()).toEqual({ a: ['A 必填'], b: ['B 必填'] })
  })

  it('字段校验不能让正在提交的无效表单报告成功', async () => {
    const { form, gates, wrapper } = fixture('', '有效')
    await wrapper.get('form').trigger('submit')
    const field = form.validateField('b')
    gates[0]!()
    gates[1]!()
    await field
    await flushPromises()
    expect(wrapper.emitted('submit')?.[0]?.[0]).toMatchObject({ valid: false, errors: { a: ['A 必填'] } })
  })

  it('同一字段旧请求晚完成时不覆盖新结果，也不假报成功', async () => {
    const { form, gates, model } = fixture('', '有效')
    const old = form.validateField('a')
    model.a = '有效'
    const current = form.validateField('a')
    gates[1]!()
    expect(await current).toBe(true)
    gates[0]!()
    expect(await old).toBe(false)
    expect(form.getErrors()).toEqual({})
  })

  it('整表校验期间继续编辑时重新校验最新快照', async () => {
    const { form, gates, model } = fixture('有效', '有效')
    const pending = form.validate()
    model.a = ''
    gates[0]!()
    await flushPromises()
    expect(gates).toHaveLength(2)
    gates[1]!()
    expect(await pending).toBe(false)
    expect(form.getErrors()).toEqual({ a: ['A 必填'] })
  })

  it.each(['resetFields', 'clearValidate'] as const)('%s 后不回写在途错误', async action => {
    const { form, gates } = fixture()
    const pending = form.validate()
    form[action]()
    gates[0]!()
    expect(await pending).toBe(false)
    expect(form.getErrors()).toEqual({})
  })

  it('清除一个字段不会取消另一个字段的校验', async () => {
    const { form, gates } = fixture()
    const a = form.validateField('a')
    const b = form.validateField('b')
    form.clearValidate('a')
    gates.forEach(release => release())
    await Promise.all([a, b])
    expect(form.getErrors()).toEqual({ b: ['B 必填'] })
  })

  it('重置或卸载后取消正在等待的提交事件', async () => {
    const { form, gates, wrapper } = fixture('有效', '有效')
    await wrapper.get('form').trigger('submit')
    form.resetFields()
    gates[0]!()
    await flushPromises()
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper.get('form').trigger('submit')
    wrapper.unmount()
    gates[1]!()
    await flushPromises()
    expect(wrapper.emitted('submit')).toBeUndefined()
  })
})
