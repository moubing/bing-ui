import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h } from 'vue'
import BingRadio from '../BingRadio/BingRadio.vue'
import BingRadioGroup from './BingRadioGroup.vue'

enableAutoUnmount(afterEach)

describe('BingRadioGroup', () => {
  it('组禁用时，插槽内显式 disabled=false 的选项也保持原生禁用', () => {
    const wrapper = mount(BingRadioGroup, {
      props: { disabled: true },
      slots: { default: () => h(BingRadio, { disabled: false, value: 'a', label: '选项 A' }) },
    })
    expect(wrapper.get('input').attributes()).toHaveProperty('disabled')
  })

  const options = [
    { label: 'Aurora', value: 'aurora' },
    { label: 'Orbit', value: 'orbit' },
    { label: 'Static', value: 'static', disabled: true },
  ]

  it('emits model updates from option radios', async () => {
    const wrapper = mount(BingRadioGroup, {
      props: {
        modelValue: 'aurora',
        options,
      },
    })

    await wrapper.findAll('input')[1]?.setValue(true)

    expect(wrapper.emitted('update:modelValue')).toEqual([['orbit']])
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe('orbit')
  })

  it('moves selection with arrow keys and skips disabled options', async () => {
    const wrapper = mount(BingRadioGroup, {
      props: {
        modelValue: 'orbit',
        options,
      },
      attachTo: document.body,
    })
    const inputs = wrapper.findAll('input')

    await inputs[1]?.trigger('focus')
    await wrapper.trigger('keydown', { key: 'ArrowRight' })

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('aurora')
  })
})
