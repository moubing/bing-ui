import { enableAutoUnmount, mount } from '@vue/test-utils'
import { createSSRApp, h, nextTick } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { afterEach, describe, expect, it } from 'vitest'
import BingAutocomplete from './BingAutocomplete.vue'

enableAutoUnmount(afterEach)
const options = [{ value: 'one', label: 'REQ-1（中文需求）', meta: { 状态: '进行中' } }, { value: 'two', label: 'REQ-2（文档）' }]
const tick = async () => { await nextTick(); await nextTick() }

describe('BingAutocomplete', () => {
  it('可禁止空输入展开，首字立即打开，清空和外部重置会关闭', async () => {
    const wrapper = mount(BingAutocomplete, { props: { options, openOnEmpty: false } })
    const field = wrapper.get('input')
    await field.trigger('focus')
    await field.trigger('click')
    await field.trigger('keydown', { key: 'ArrowDown' })
    wrapper.vm.focus()
    await tick()
    expect(field.attributes('aria-expanded')).toBe('false')
    expect(wrapper.emitted('open')).toBeUndefined()
    await field.setValue('   ')
    await wrapper.setProps({ modelValue: '   ' })
    expect(field.attributes('aria-expanded')).toBe('false')
    await field.setValue('中')
    expect(field.attributes('aria-expanded')).toBe('true')
    await wrapper.setProps({ modelValue: '中' })
    expect(document.querySelectorAll('[role=option]')).toHaveLength(1)
    await field.setValue('')
    expect(field.attributes('aria-expanded')).toBe('false')
    await wrapper.setProps({ modelValue: '文' })
    await field.trigger('focus')
    expect(field.attributes('aria-expanded')).toBe('true')
    await wrapper.setProps({ modelValue: '' })
    expect(field.attributes('aria-expanded')).toBe('false')
    await wrapper.setProps({ openOnEmpty: true })
    await field.trigger('focus')
    expect(field.attributes('aria-expanded')).toBe('true')
    await wrapper.setProps({ openOnEmpty: false })
    expect(field.attributes('aria-expanded')).toBe('false')
  })

  it('原位搜索只匹配 label，选择发出独立事件，支持关闭内置筛选', async () => {
    const wrapper = mount(BingAutocomplete, { props: { options, modelValue: '中文' } })
    await wrapper.get('input').trigger('focus'); await tick()
    expect(document.querySelectorAll('[role=option]')).toHaveLength(1)
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')?.[0]).toEqual([options[0]])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([options[0]!.label])
    await wrapper.setProps({ modelValue: '进行中' })
    await wrapper.get('input').trigger('focus'); await tick()
    expect(document.querySelectorAll('[role=option]')).toHaveLength(0)
    await wrapper.setProps({ filter: false })
    expect(document.querySelectorAll('[role=option]')).toHaveLength(2)
  })

  it('IME 不误选或关闭；业务选择可保留输入和面板', async () => {
    const wrapper = mount(BingAutocomplete, { props: { options, completeOnSelect: false, closeOnSelect: false } })
    const field = wrapper.get('input')
    await field.trigger('focus'); await tick()
    await field.trigger('compositionstart')
    for (const key of ['ArrowDown', 'Enter', 'Escape']) await field.trigger('keydown', { key })
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(field.attributes('aria-expanded')).toBe('true')
    await field.trigger('compositionend')
    await field.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')?.[0]).toEqual([options[0]])
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(field.attributes('aria-expanded')).toBe('true')
  })

  it('跳过禁用项，加载和失败时不能选择旧结果', async () => {
    const wrapper = mount(BingAutocomplete, { props: { options: [{ ...options[0]!, disabled: true }, options[1]!] } })
    const field = wrapper.get('input')
    await field.trigger('focus'); await tick()
    expect(document.querySelector('[aria-selected=true]')?.textContent).toContain('REQ-2')
    await wrapper.setProps({ loading: true })
    await field.trigger('keydown', { key: 'Enter' })
    await wrapper.setProps({ loading: false, error: '加载失败' })
    await field.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(document.querySelector('[role=alert]')?.textContent).toContain('加载失败')
    await wrapper.setProps({ disabled: true })
    expect(field.attributes('aria-expanded')).toBe('false')
  })

  it('SSR 不输出 body 浮层，输入框拥有 combobox 语义', async () => {
    const html = await renderToString(createSSRApp({ render: () => h(BingAutocomplete, { options, ariaLabel: '查找需求' }) }))
    expect(html).toMatch(/<input[^>]*role="combobox"/)
    expect(html).toContain('aria-expanded="false"')
    expect(html).not.toContain('role="listbox"')
  })

  it('行尾操作同步派发原始事件，不选择、不补全、不关闭；禁用项不能操作', async () => {
    const wrapper = mount(BingAutocomplete, { props: {
      options: [options[0]!, { ...options[1]!, disabled: true }], modelValue: 'REQ', optionActionLabel: '另开',
    }, slots: { 'option-action': () => h('span', '↗') } })
    await wrapper.get('input').trigger('focus'); await tick()
    expect(wrapper.get('input').attributes('aria-haspopup')).toBe('grid')
    const grid = document.querySelector('[role=grid]')!
    expect(grid.querySelectorAll('[role=row]')).toHaveLength(2)
    expect(grid.querySelectorAll('[role=gridcell]')).toHaveLength(4)
    const buttons = grid.querySelectorAll('button')
    expect(buttons[0]!.getAttribute('aria-label')).toBe('另开：REQ-1（中文需求）')
    const event = new MouseEvent('click', { bubbles: true })
    buttons[0]!.dispatchEvent(event)
    expect(wrapper.emitted('option-action')?.[0]).toEqual([options[0], event])
    expect(wrapper.emitted('select')).toBeUndefined()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('input').attributes('aria-expanded')).toBe('true')
    expect(buttons[1]!.disabled).toBe(true)
    buttons[1]!.click()
    expect(wrapper.emitted('option-action')).toHaveLength(1)
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('select')?.[0]).toEqual([options[0]])
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([options[0]!.label])
  })
})
