import { mount, enableAutoUnmount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import BingSelect from './BingSelect.vue'

enableAutoUnmount(afterEach)
const options = [
  { label: '极光', value: 'aurora' },
  { label: '重庆', value: 'chongqing' },
  { label: 'Pulse', value: 'pulse', disabled: true },
  { label: 'Paper', value: 'paper' },
]
function optionElements() { return [...document.querySelectorAll<HTMLElement>('.bing-select__option')] }
async function open(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('.bing-select__trigger').trigger('click')
  await nextTick()
  await nextTick()
}
async function search(value: string) {
  const input = document.querySelector<HTMLInputElement>('.bing-select__search input')!
  input.value = value
  input.dispatchEvent(new Event('input', { bubbles: true }))
  await nextTick()
  await nextTick()
}

describe('BingSelect P0 交互', () => {
  it('关闭时输入不改值，打开后定位拼音与前缀，禁用 typeahead 后不接管输入', async () => {
    const wrapper = mount(BingSelect, { props: { options, searchable: false }, attachTo: document.body })
    const trigger = wrapper.get('.bing-select__trigger')
    await trigger.trigger('keydown', { key: 'p' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await open(wrapper)
    await trigger.trigger('keydown', { key: 'c' })
    expect(optionElements().filter(el => el.classList.contains('is-active')).map(el => el.textContent?.trim())).toEqual(['重庆'])
    await wrapper.setProps({ typeahead: false })
    await trigger.trigger('keydown', { key: 'p' })
    expect(trigger.attributes('aria-activedescendant')).toBe(optionElements()[1]!.id)
    await trigger.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['chongqing'])
  })

  it('搜索标记拼音命中，自定义插槽得到区间，关闭 highlightMatches 后移除标记', async () => {
    const wrapper = mount(BingSelect, { props: { options, searchable: true }, attachTo: document.body })
    await open(wrapper)
    await search('cq')
    expect(optionElements()).toHaveLength(1)
    expect(document.querySelector('mark')?.textContent).toBe('重庆')
    await wrapper.setProps({ highlightMatches: false })
    expect(document.querySelector('mark')).toBeNull()
    wrapper.unmount()
    const custom = mount(BingSelect, {
      props: { options, searchable: true }, attachTo: document.body,
      slots: { option: '<template #option="{ option, matchRanges }"><b>{{ option.label }} {{ JSON.stringify(matchRanges) }}</b></template>' },
    })
    await open(custom)
    await search('cq')
    expect(optionElements()[0]?.textContent).toContain('[{"start":0,"end":2}]')
    expect(document.querySelector('mark')).toBeNull()
  })

  it('全选行三态与计数基于可用结果，清除结果保留范围外、禁用和未知值', async () => {
    const wrapper = mount(BingSelect, { props: { options, multiple: true, searchable: true, modelValue: ['aurora', 'pulse', 'unknown'] }, attachTo: document.body })
    await open(wrapper)
    const all = document.querySelector<HTMLButtonElement>('.bing-picker__select-all')!
    expect(all.getAttribute('aria-checked')).toBe('mixed')
    expect(all.textContent).toContain('1 / 3')
    await search('paper')
    expect(all.getAttribute('aria-checked')).toBe('false')
    expect(all.textContent).toContain('全选结果')
    expect(all.textContent).toContain('0 / 1')
    all.click()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['aurora', 'pulse', 'unknown', 'paper']])
    await wrapper.setProps({ modelValue: ['aurora', 'pulse', 'unknown', 'paper'] })
    expect(all.getAttribute('aria-checked')).toBe('true')
    all.click()
    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([['aurora', 'pulse', 'unknown']])
    await search('no result')
    expect(all.disabled).toBe(true)
    expect(all.textContent).toContain('0 / 0')
  })

  it('单选立即 emit，受控值尚未回传时离场节点仍保持新选中态', async () => {
    const wrapper = mount(BingSelect, { props: { options, modelValue: 'aurora' }, attachTo: document.body })
    await open(wrapper)
    optionElements()[1]!.click()
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['chongqing'])
    await nextTick()
    expect(optionElements()[1]!.getAttribute('aria-selected')).toBe('true')
    expect(optionElements()[0]!.getAttribute('aria-selected')).toBe('false')
  })

  it('Tab 到全选行后可用空格切换，Shift+Tab 返回触发器且不陷住焦点', async () => {
    const wrapper = mount(BingSelect, { props: { options, multiple: true, searchable: false }, attachTo: document.body })
    await open(wrapper)
    const trigger = wrapper.get('.bing-select__trigger')
    await trigger.trigger('keydown', { key: 'Tab' })
    const all = document.querySelector<HTMLButtonElement>('.bing-picker__select-all')!
    expect(document.activeElement).toBe(all)
    all.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }))
    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['aurora', 'chongqing', 'paper']])
    all.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(trigger.element)
    all.focus()
    all.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', bubbles: true, cancelable: true }))
    expect(document.activeElement).toBe(trigger.element)
    await nextTick()
    expect(optionElements().find(el => el.classList.contains('is-active'))?.textContent).toBe('Paper')
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    all.focus()
    all.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }))
    await nextTick()
    expect(trigger.attributes('aria-expanded')).toBe('false')
  })

  it('虚拟选项不进入 Tab 顺序，位置来自完整的当前结果集', async () => {
    const wrapper = mount(BingSelect, {
      props: { options: Array.from({ length: 120 }, (_, value) => ({ label: `图层 ${value}`, value: `row-${value}` })), virtual: true, searchable: true },
      attachTo: document.body,
    })
    await open(wrapper)
    expect(optionElements()[0]!.tabIndex).toBe(-1)
    expect(optionElements()[0]!.getAttribute('aria-setsize')).toBe('120')
    await search('11')
    expect(optionElements()[0]!.getAttribute('aria-setsize')).toBe('11')
    expect(optionElements().map(el => el.getAttribute('aria-posinset'))).toEqual(optionElements().map((_, index) => String(index + 1)))
    const input = document.querySelector('.bing-select__search input')!
    expect(input.getAttribute('role')).toBe('combobox')
    expect(input.getAttribute('aria-activedescendant')).toBe(optionElements()[0]!.id)
  })
})
