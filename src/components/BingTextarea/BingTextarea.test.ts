import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingTextarea from './BingTextarea.vue'

enableAutoUnmount(afterEach)

describe('BingTextarea', () => {
  it('默认保留原生换行且不显示清除按钮，计数格式可定制', async () => {
    const formatter = vi.fn((count: number, max?: number) => `已写 ${count} / ${max}`)
    const wrapper = mount(BingTextarea, { props: { modelValue: '🙂', showCount: true, maxLength: 10, countFormatter: formatter } })
    expect(wrapper.find('.bing-textarea__clear').exists()).toBe(false)
    expect(wrapper.get('textarea').attributes('aria-keyshortcuts')).toBeUndefined()
    expect(wrapper.get('.bing-textarea__count').text()).toBe('已写 2 / 10')
    expect(formatter).toHaveBeenLastCalledWith(2, 10)
    await wrapper.get('textarea').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('submit')).toBeUndefined()
    await wrapper.setProps({ maxLength: undefined, countFormatter: (count, max) => `${count}${max === undefined ? ' 字' : ''}` })
    expect(wrapper.get('.bing-textarea__count').text()).toBe('2 字')
  })

  it.each([
    ['enter', {}, true], ['enter', { shiftKey: true }, false], ['enter', { ctrlKey: true }, false],
    ['enter', { metaKey: true }, false], ['enter', { altKey: true }, false],
    ['mod-enter', {}, false], ['mod-enter', { ctrlKey: true }, true], ['mod-enter', { metaKey: true }, true],
    ['mod-enter', { ctrlKey: true, shiftKey: true }, false], ['mod-enter', { metaKey: true, altKey: true }, false],
    ['none', { ctrlKey: true }, false],
  ] as const)('%s 提交遵守修饰键 %j', async (submitOn, keys, submits) => {
    const wrapper = mount(BingTextarea, { props: { modelValue: '说明', submitOn } })
    const event = new KeyboardEvent('keydown', { key: 'Enter', ...keys, bubbles: true, cancelable: true })
    wrapper.get('textarea').element.dispatchEvent(event)
    expect(wrapper.emitted('keydown')).toEqual([[event]])
    expect(wrapper.emitted('submit')).toEqual(submits ? [['说明', event]] : undefined)
    expect(event.defaultPrevented).toBe(submits)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('textarea').attributes('aria-keyshortcuts')).toBe(
      submitOn === 'enter' ? 'Enter' : submitOn === 'mod-enter' ? 'Control+Enter Meta+Enter' : undefined,
    )
  })

  it('组词、229、只读、禁用和接入方 preventDefault 均不会提交', async () => {
    const wrapper = mount(BingTextarea, { props: { submitOn: 'enter' } })
    const field = wrapper.get('textarea')
    await field.trigger('compositionstart')
    await field.trigger('keydown', { key: 'Enter' })
    await field.trigger('compositionend')
    await field.trigger('keydown', { key: 'Enter', isComposing: true })
    await field.trigger('keydown', { key: 'Enter', keyCode: 229 })
    await wrapper.setProps({ readonly: true })
    await field.trigger('keydown', { key: 'Enter' })
    await wrapper.setProps({ readonly: false, disabled: true })
    await field.trigger('keydown', { key: 'Enter' })
    await wrapper.setProps({ disabled: false, onKeydown: (event: KeyboardEvent) => event.preventDefault() })
    await field.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('submit')).toBeUndefined()
  })

  it('计数文案不逐键播报，仅跨越阈值时更新独立提示', async () => {
    const wrapper = mount(BingTextarea, { props: { modelValue: '', showCount: true, maxLength: 10 } })
    const count = wrapper.get('.bing-textarea__count')
    const live = wrapper.get('.bing-text-control__live')
    expect(count.attributes('aria-live')).toBeUndefined()
    expect(live.attributes('aria-live')).toBe('polite')
    await wrapper.setProps({ modelValue: '123456789' })
    expect(count.classes()).toContain('is-warning')
    expect(live.text()).toBe('还可输入 1 个字')
    const warning = live.text()
    await wrapper.setProps({ modelValue: 'abcdefghi' })
    expect(live.text()).toBe(warning)
    await wrapper.setProps({ modelValue: 'abcdefghij' })
    expect(count.classes()).toContain('is-danger')
    expect(live.text()).not.toBe(warning)
  })

  it('emits model updates and shows character count', async () => {
    const wrapper = mount(BingTextarea, {
      props: {
        modelValue: '',
        showCount: true,
        maxLength: 12,
      },
    })

    await wrapper.get('textarea').setValue('Aurora')

    expect(wrapper.emitted('update:modelValue')).toEqual([['Aurora']])
    expect(wrapper.text()).toContain('0/12')
  })

  it('clears the value and preserves disabled state', async () => {
    const wrapper = mount(BingTextarea, {
      props: {
        modelValue: 'Motion note',
        clearable: true,
      },
    })

    await wrapper.get('.bing-textarea__clear').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
    expect(wrapper.emitted('clear')).toHaveLength(1)

    await wrapper.setProps({ disabled: true, modelValue: 'Locked' })

    expect(wrapper.classes()).toContain('is-disabled')
    expect(wrapper.get('textarea').attributes()).toHaveProperty('disabled')
    expect(wrapper.find('.bing-textarea__clear').exists()).toBe(false)
  })

  it('组词期间保留草稿，确认后只发布一次并保留原生组合事件', async () => {
    const calls: string[] = []
    const wrapper = mount(BingTextarea, { props: { modelValue: '', showCount: true, maxLength: 10 },
      attrs: { onCompositionstart: () => calls.push('start'), onCompositionend: () => calls.push('end') } })
    const input = wrapper.get('textarea')
    await input.trigger('compositionstart')
    input.element.value = '中文'
    await input.trigger('input', { isComposing: true })
    await wrapper.setProps({ modelValue: '父级', status: 'error' })
    expect(input.element.value).toBe('中文')
    expect(wrapper.get('.bing-textarea__count').text()).toBe('2/10')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await input.trigger('compositionend')
    input.element.value = '中文'
    await input.trigger('input')
    expect(wrapper.emitted('update:modelValue')).toEqual([['中文']])
    expect(wrapper.emitted('input')).toHaveLength(1)
    expect(calls).toEqual(['start', 'end'])
  })
})
