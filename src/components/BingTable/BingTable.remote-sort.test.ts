import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingTable from './BingTable.vue'

enableAutoUnmount(afterEach)

const data = [
  { id: 2, title: 'Beta' },
  { id: 3, title: 'Gamma' },
  { id: 1, title: 'Alpha' },
]
const columns = [{ key: 'title', title: '标题', sortable: true }]

describe('BingTable remote sort', () => {
  it('emits the complete sort cycle without reordering data or calling the local sorter', async () => {
    const sorter = vi.fn(() => -1)
    const wrapper = mount(BingTable, {
      props: { data, columns: [{ ...columns[0]!, sorter }], remoteSort: true, showColumnControls: false },
    })
    for (const order of ['asc', 'desc', null]) {
      await wrapper.get('.bing-table__sort-button').trigger('click')
      expect(wrapper.findAll('.bing-table__cell').map(cell => cell.text())).toEqual(['Beta', 'Gamma', 'Alpha'])
      expect(wrapper.emitted('sort-change')?.at(-1)?.[0]).toMatchObject({
        key: order ? 'title' : null, order,
      })
    }
    expect(wrapper.emitted('update:sortOrder')).toEqual([['asc'], ['desc'], [null]])
    expect(sorter).not.toHaveBeenCalled()
  })

  it('treats controlled null as a cleared sort even with conflicting defaults or previous local state', async () => {
    const wrapper = mount(BingTable, {
      props: { data, columns, defaultSortKey: 'title', defaultSortOrder: 'desc', showColumnControls: false },
    })
    expect(wrapper.findAll('.bing-table__cell')[0]?.text()).toBe('Gamma')
    await wrapper.setProps({ sortKey: null, sortOrder: null })
    expect(wrapper.findAll('.bing-table__cell').map(cell => cell.text())).toEqual(['Beta', 'Gamma', 'Alpha'])
    expect(wrapper.find('.bing-table__header-cell.is-sorting').exists()).toBe(false)
    await wrapper.get('.bing-table__sort-button').trigger('click')
    expect(wrapper.emitted('sort-change')?.at(-1)?.[0]).toMatchObject({ key: 'title', order: 'asc' })
    // 受控方未接收更新，表格应继续保持清空后的状态。
    expect(wrapper.find('.bing-table__header-cell.is-sorting').exists()).toBe(false)
    await wrapper.setProps({ sortKey: 'title', sortOrder: 'asc' })
    expect(wrapper.findAll('.bing-table__cell')[0]?.text()).toBe('Alpha')
    await wrapper.setProps({ sortOrder: null })
    expect(wrapper.findAll('.bing-table__cell')[0]?.text()).toBe('Beta')
  })

  it('keeps local pagination available with remote sorting and leaves remotePagination sorting unchanged by default', async () => {
    const wrapper = mount(BingTable, {
      props: { data, columns, pagination: true, defaultPageSize: 2, remoteSort: true,
        defaultSortKey: 'title', defaultSortOrder: 'asc', preservePageHeight: false, showColumnControls: false },
    })
    expect(wrapper.findAll('.bing-table__cell').map(cell => cell.text())).toEqual(['Beta', 'Gamma'])
    await wrapper.get('[aria-label="下一页"]').trigger('click')
    expect(wrapper.findAll('.bing-table__cell').map(cell => cell.text())).toEqual(['Alpha'])
    expect(wrapper.emitted('page-change')).toEqual([[{ page: 2, pageSize: 2 }]])
    await wrapper.setProps({ remotePagination: true, remoteSort: false, total: 8 })
    expect(wrapper.findAll('.bing-table__cell').map(cell => cell.text())).toEqual(['Alpha', 'Beta', 'Gamma'])
    await wrapper.setProps({ remoteSort: true })
    expect(wrapper.findAll('.bing-table__cell').map(cell => cell.text())).toEqual(['Beta', 'Gamma', 'Alpha'])
    await wrapper.setProps({ data: [] })
    expect(wrapper.text()).toContain('暂无数据')
    expect(wrapper.findAll('.bing-table__row--filler')).toHaveLength(0)
  })
})
