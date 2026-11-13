import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { h, nextTick, ref } from 'vue'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingCheckboxGroup from './BingCheckboxGroup.vue'

enableAutoUnmount(afterEach)

// happy-dom 不执行完整的 checkbox 激活默认动作，在同一原生事件轮内补上 change。
async function activate(input: HTMLInputElement, modifiers: MouseEventInit = {}) {
  const checked = !input.checked
  if (input.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, ...modifiers }))) {
    input.checked = checked
    input.dispatchEvent(new Event('change', { bubbles: true }))
  }
  await nextTick()
}

describe('BingCheckboxGroup', () => {
  it('treats an initial Shift click as a single selection and establishes the anchor', async () => {
    const wrapper = mount(BingCheckboxGroup, {
      props: { rangeSelect: true, options: [{ value: 'a', label: '选项 A' }] },
    })
    await activate(wrapper.get('input').element, { shiftKey: true })
    expect(wrapper.emitted('update:modelValue')).toEqual([[['a']]])
    expect(wrapper.emitted('change')).toHaveLength(1)
  })

  it('Shift selects a range in slot order, skips disabled options and commits once', async () => {
    const selected = ref<(string | number)[]>([])
    const wrapper = mount({ render: () => h(BingCheckboxGroup, {
      modelValue: selected.value,
      'onUpdate:modelValue': (value) => { selected.value = value },
      rangeSelect: true,
    }, () => [0, '1', 2, 3, 4].map(value => h(BingCheckbox, { value, disabled: value === 2, label: String(value) }))) })
    const group = wrapper.getComponent(BingCheckboxGroup)
    const inputs = wrapper.findAll('input')
    await activate(inputs[0]!.element)
    await activate(inputs[4]!.element, { shiftKey: true })
    expect(selected.value).toEqual([0, '1', 3, 4])
    expect(group.emitted('change')).toHaveLength(2)
    await activate(inputs[0]!.element, { shiftKey: true })
    expect(selected.value).toEqual([])
    expect(group.emitted('change')).toHaveLength(3)
  })

  it.each([false, true])('keyboard clicks keep native single-item behavior with rangeSelect=%s', async rangeSelect => {
    const selected = ref<(string | number)[]>([])
    const wrapper = mount({ render: () => h(BingCheckboxGroup, {
      modelValue: selected.value,
      'onUpdate:modelValue': value => { selected.value = value },
      rangeSelect,
      options: [0, 1, 2].map(value => ({ value, label: String(value) })),
    }) })
    const inputs = wrapper.findAll('input')
    await activate(inputs[0]!.element)
    await activate(inputs[2]!.element, { detail: 0, shiftKey: true })
    expect(selected.value).toEqual([0, 2])
  })

  it('组禁用时，插槽内显式 disabled=false 的选项也保持原生禁用', () => {
    const wrapper = mount(BingCheckboxGroup, {
      props: { disabled: true },
      slots: { default: () => h(BingCheckbox, { disabled: false, value: 'a', label: '选项 A' }) },
    })
    expect(wrapper.get('input').attributes()).toHaveProperty('disabled')
  })

  const options = [
    { label: 'Aurora', value: 'aurora' },
    { label: 'Orbit', value: 'orbit' },
    { label: 'Static', value: 'static', disabled: true },
  ]

  it('adds and removes option values', async () => {
    const wrapper = mount(BingCheckboxGroup, {
      props: {
        modelValue: ['aurora'],
        options,
      },
    })

    await wrapper.findAll('input')[1]?.setValue(true)
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['aurora', 'orbit'])

    await wrapper.setProps({ modelValue: ['aurora', 'orbit'] })
    await wrapper.findAll('input')[0]?.setValue(false)

    expect(wrapper.emitted('update:modelValue')?.[1]?.[0]).toEqual(['orbit'])
  })

  it('marks disabled options as native disabled', () => {
    const wrapper = mount(BingCheckboxGroup, {
      props: {
        options,
      },
    })

    expect(wrapper.findAll('input')[2]?.attributes()).toHaveProperty('disabled')
  })

  it('forwards semantic status to every generated checkbox', () => {
    const wrapper = mount(BingCheckboxGroup, {
      props: {
        options,
        status: 'success',
      },
    })

    const checkboxes = wrapper.findAll('.bing-checkbox')

    expect(checkboxes).toHaveLength(options.length)
    expect(
      checkboxes.every((checkbox) => checkbox.classes().includes('bing-checkbox--status-success')),
    ).toBe(true)
  })
})
