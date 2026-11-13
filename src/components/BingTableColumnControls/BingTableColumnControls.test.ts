import { DOMWrapper, enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import BingTable from '../BingTable/BingTable.vue'
import type { BingTableFixed } from '../BingTable/BingTable.types'
import BingTableColumnControls from './BingTableColumnControls.vue'

enableAutoUnmount(afterEach)
const columns = [
  { key: 'title', title: '标题', width: 180 },
  { key: 'owner', title: '负责人', width: 120 },
  { key: 'priority', title: '优先级', width: 100 },
]
function panel() {
  return new DOMWrapper(document.body.querySelector('.bing-table__column-panel-shell') as HTMLElement)
}
function option(index: number) { return panel().findAll('.bing-table__column-option')[index]! }

describe('BingTableColumnControls', () => {
  it('shares visibility, fixed position, order and reset across groups even when the first table is absent', async () => {
    const Host = defineComponent({
      components: { BingTable, BingTableColumnControls },
      setup() {
        return { columns, first: ref(false), hidden: ref<string[]>([]), order: ref<string[]>([]),
          fixed: ref<Record<string, BingTableFixed | null>>({}), widths: ref<Record<string, number>>({}),
          rows: [{ id: 1, title: '文档', owner: '成员', priority: '中' }] }
      },
      template: `<div>
        <BingTableColumnControls :columns="columns" default-open :smooth-scroll="false"
          v-model:hidden-column-keys="hidden" v-model:column-order="order"
          v-model:column-fixed="fixed" v-model:column-widths="widths" />
        <BingTable v-if="first" :columns="columns" :data="rows" :show-column-controls="false"
          :hidden-column-keys="hidden" :column-order="order" :column-fixed="fixed" :column-widths="widths" />
        <BingTable :columns="columns" :data="rows" :show-column-controls="false"
          :hidden-column-keys="hidden" :column-order="order" :column-fixed="fixed" :column-widths="widths" />
      </div>`,
    })
    const wrapper = mount(Host)
    await wrapper.vm.$nextTick()
    await option(1).get('input').setValue(false)
    expect(wrapper.get('.bing-table__head').text()).not.toContain('负责人')
    await option(2).get('[aria-label="固定到左侧"]').trigger('click')
    expect(wrapper.get('.bing-table__header-cell').text()).toContain('优先级')
    expect(wrapper.get('.bing-table__header-cell').classes()).toContain('is-fixed-left')
    wrapper.vm.first = true
    await wrapper.vm.$nextTick()
    expect(wrapper.findAll('.bing-table')).toHaveLength(2)
    for (const table of wrapper.findAll('.bing-table')) {
      expect(table.get('.bing-table__header-cell').text()).toContain('优先级')
      expect(table.get('.bing-table__head').text()).not.toContain('负责人')
    }
    await panel().get('.bing-table__text-button').trigger('click')
    expect(wrapper.vm.hidden).toEqual([])
    expect(wrapper.vm.fixed).toEqual({})
    for (const table of wrapper.findAll('.bing-table')) {
      expect(table.findAll('.bing-table__header-label').map(item => item.text())).toEqual(['标题', '负责人', '优先级'])
    }
    await option(0).get('.bing-table__column-grip').trigger('keydown', { key: 'ArrowDown' })
    expect(wrapper.vm.order).toEqual(['owner', 'title', 'priority'])
    expect(wrapper.findAllComponents(BingTableColumnControls)).toHaveLength(1)
  })

  it('does not mutate controlled models and prevents hiding the last visible column', async () => {
    const hidden = ['owner', 'priority']
    const wrapper = mount(BingTableColumnControls, { props: {
      columns, defaultOpen: true, hiddenColumnKeys: hidden, columnOrder: ['title', 'owner', 'priority'],
    } })
    await wrapper.vm.$nextTick()
    expect(option(0).get('input').attributes('disabled')).toBeDefined()
    await option(1).get('input').setValue(true)
    expect(wrapper.emitted('update:hiddenColumnKeys')).toEqual([[['priority']]])
    expect(hidden).toEqual(['owner', 'priority'])
    expect(option(1).classes()).toContain('is-hidden')
    expect(option(1).get('.bing-checkbox').classes()).not.toContain('is-checked')
    await wrapper.setProps({ hiddenColumnKeys: ['priority'], columns: [...columns, { key: 'new', title: '新增' }] })
    expect(panel().findAll('.bing-table__column-name').map(item => item.text())).toEqual(['标题', '负责人', '优先级', '新增'])
  })

  it('disables its trigger and closes an open panel when disabled', async () => {
    const wrapper = mount(BingTableColumnControls, { props: { columns, defaultOpen: true } })
    await wrapper.vm.$nextTick()
    await wrapper.setProps({ disabled: true })
    expect(wrapper.get('button').attributes('disabled')).toBeDefined()
    expect(wrapper.emitted('update:open')).toEqual([[false]])
    expect(wrapper.get('button').attributes('aria-expanded')).toBe('false')
  })
})
