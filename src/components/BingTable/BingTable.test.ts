import { DOMWrapper, enableAutoUnmount, mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import BingSelect from '../BingSelect/BingSelect.vue'
import BingTable from './BingTable.vue'
import tableRootSource from './BingTable.vue?raw'
import tableCellsSource from './BingTable.cells.css?raw'
import tableBodySource from './BingTableBodyRow.vue?raw'
import tableEdgesSource from './BingTableFixedEdges.vue?raw'
import tablePagerSource from './BingTablePager.vue?raw'
import columnControlsSource from '../BingTableColumnControls/BingTableColumnControls.vue?raw'
import headerContentSource from './BingTableHeaderContent.vue?raw'
import type { BingTableColumn, BingTableRow } from './BingTable.types'

enableAutoUnmount(afterEach)

const tableSource = [tableRootSource, tableCellsSource, tableBodySource, tableEdgesSource, tablePagerSource].join('\n')

const columns: BingTableColumn[] = [
  {
    key: 'name',
    title: 'Name',
    width: 180,
    sortable: true,
  },
  {
    key: 'status',
    title: 'Status',
    width: 140,
  },
  {
    key: 'score',
    title: 'Score',
    width: 120,
    align: 'right',
  },
]

const rows: BingTableRow[] = [
  {
    id: 'one',
    name: 'Aurora',
    status: 'Ready',
    score: 88,
    children: [
      {
        id: 'one-a',
        name: 'Aurora child',
        status: 'Draft',
        score: 42,
      },
    ],
  },
  {
    id: 'two',
    name: 'Beacon',
    status: 'Paused',
    score: 63,
  },
  {
    id: 'three',
    name: 'Cascade',
    status: 'Ready',
    score: 91,
    disabled: true,
  },
]

async function openColumnPanel(wrapper: VueWrapper) {
  await wrapper.get('.bing-table__icon-button').trigger('click')
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

function getTeleportedColumnPanel() {
  const panels = document.body.querySelectorAll<HTMLElement>('.bing-table__column-panel')

  expect(panels).toHaveLength(1)

  return new DOMWrapper(panels[0])
}

function getTeleportedColumnDropdown() {
  const dropdowns = document.body.querySelectorAll<HTMLElement>('[data-bing-dropdown-floating]')

  expect(dropdowns).toHaveLength(1)

  return new DOMWrapper(dropdowns[0])
}

function getColumnOptionByText(text: string) {
  const option = Array.from(
    document.body.querySelectorAll<HTMLElement>('.bing-table__column-option'),
  ).find((item) => item.textContent?.includes(text))

  expect(option).toBeTruthy()

  return new DOMWrapper(option as HTMLElement)
}

async function waitForTeleportedContent(wrapper: VueWrapper) {
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

describe('BingTable', () => {
  it('enables smooth scrolling by default and allows opting out', () => {
    const enabledWrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })
    const disabledWrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
        smoothScroll: false,
      },
    })

    expect(enabledWrapper.findComponent(BingScrollbar).props('smooth')).toBe(true)
    expect(disabledWrapper.findComponent(BingScrollbar).props('smooth')).toBe(false)
  })

  it('renders headers, rows, and custom cell slots', () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
      slots: {
        'cell-status': '<strong class="status-slot">{{ value }}</strong>',
      },
    })

    expect(wrapper.text()).toContain('Name')
    expect(wrapper.text()).toContain('Aurora')
    expect(wrapper.get('.status-slot').text()).toBe('Ready')
  })

  describe('loading overlay', () => {
    afterEach(() => vi.useRealTimers())

    it('keeps mounted rows, height and total while remote data is cleared', async () => {
      vi.useFakeTimers()
      const wrapper = mount(BingTable, {
        props: { columns, data: rows, pagination: true, remotePagination: true, total: 3 },
      })
      const originalRow = wrapper.get('.bing-table__row').element
      const frame = wrapper.get('.bing-table__frame').element
      Object.defineProperty(frame, 'getBoundingClientRect', {
        value: () => ({ height: 230 }),
      })

      await wrapper.setProps({ loading: true, data: [], total: 0 })
      expect(wrapper.attributes('aria-busy')).toBe('true')
      expect(wrapper.get('.bing-table__frame').attributes('style')).toContain('height: 230px')
      expect(wrapper.get('.bing-table__row').element).toBe(originalRow)
      expect(wrapper.get('.bing-table__page-summary').text()).toBe('1-3 / 共 3 条')
      expect(wrapper.find('.bing-table__state-cell').exists()).toBe(false)
      expect(wrapper.getComponent(BingSelect).props('disabled')).toBe(true)
      expect(wrapper.find('[role="status"]').exists()).toBe(false)

      await vi.advanceTimersByTimeAsync(150)
      expect(wrapper.get('[role="status"]').text()).toBe('正在加载数据')
      expect(wrapper.get('.bing-table__row').element).toBe(originalRow)

      await wrapper.setProps({ loading: false, data: [{ id: 'new', name: 'Updated' }], total: 1 })
      await vi.advanceTimersByTimeAsync(249)
      expect(wrapper.get('.bing-table__row').element).toBe(originalRow)
      await vi.advanceTimersByTimeAsync(1)
      expect(wrapper.attributes('aria-busy')).toBe('false')
      expect(wrapper.get('.bing-table__row').text()).toContain('Updated')
      expect(wrapper.get('.bing-table__page-summary').text()).toBe('1-1 / 共 1 条')
      expect(wrapper.find('.bing-table__loading-overlay').exists()).toBe(false)
    })

    it('does not flash an indicator for a short request', async () => {
      vi.useFakeTimers()
      const wrapper = mount(BingTable, { props: { columns, data: rows } })
      const originalRow = wrapper.get('.bing-table__row').element

      await wrapper.setProps({ loading: true })
      await vi.advanceTimersByTimeAsync(80)
      await wrapper.setProps({ loading: false })
      await vi.advanceTimersByTimeAsync(200)

      expect(wrapper.find('[role="status"]').exists()).toBe(false)
      expect(wrapper.find('.bing-table__loading-overlay').exists()).toBe(false)
      expect(wrapper.get('.bing-table__row').element).toBe(originalRow)
      expect(wrapper.attributes('aria-busy')).toBe('false')
    })

    it('reserves the empty area on initial load without flashing the empty message', async () => {
      vi.useFakeTimers()
      const wrapper = mount(BingTable, {
        props: { columns, loading: true, data: [], emptyText: '没有数据' },
      })

      expect(wrapper.find('.bing-table__state-cell').exists()).toBe(true)
      expect(wrapper.text()).not.toContain('没有数据')
      await vi.advanceTimersByTimeAsync(200)
      expect(wrapper.find('[role="status"]').exists()).toBe(true)
      await wrapper.setProps({ loading: false })
      await vi.advanceTimersByTimeAsync(200)
      expect(wrapper.text()).toContain('没有数据')
      expect(wrapper.attributes('aria-busy')).toBe('false')
    })

    it('keeps the overlay visible if another request starts before the minimum duration ends', async () => {
      vi.useFakeTimers()
      const wrapper = mount(BingTable, { props: { columns, data: rows } })

      await wrapper.setProps({ loading: true })
      await vi.advanceTimersByTimeAsync(180)
      await wrapper.setProps({ loading: false })
      await vi.advanceTimersByTimeAsync(50)
      await wrapper.setProps({ loading: true })
      await vi.advanceTimersByTimeAsync(300)
      expect(wrapper.find('[role="status"]').exists()).toBe(true)
      expect(wrapper.attributes('aria-busy')).toBe('true')
      await wrapper.setProps({ loading: false })
      expect(wrapper.find('.bing-table__loading-overlay').exists()).toBe(false)
    })
  })

  it('opens a header description tooltip from the question trigger', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns: [
          {
            ...columns[0],
            description: 'Primary display name for the row.',
          },
          ...columns.slice(1),
        ],
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })

    await wrapper
      .get('[aria-label="查看列说明： Name"]')
      .trigger('click')
    await waitForTeleportedContent(wrapper)

    expect(document.body.querySelector('[role="tooltip"]')?.textContent).toContain(
      'Primary display name for the row.',
    )
    expect(wrapper.emitted('sort-change')).toBeUndefined()
  })

  it('emits row selection from the checkbox column', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        selectable: true,
        showColumnControls: false,
      },
    })

    await wrapper.findAll('input[type="checkbox"]')[1].setValue(true)

    expect(wrapper.emitted('update:selectedRowKeys')).toEqual([[['one']]])
    expect(wrapper.emitted('selection-change')?.[0]?.[0]).toMatchObject({
      keys: ['one'],
    })
  })

  it('slices local data with pagination and emits page changes', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        pagination: true,
        defaultPageSize: 1,
        showColumnControls: false,
      },
    })

    expect(wrapper.text()).toContain('Aurora')
    expect(wrapper.text()).not.toContain('Beacon')

    await wrapper.get('[aria-label="下一页"]').trigger('click')

    expect(wrapper.emitted('update:page')).toEqual([[2]])
    expect(wrapper.text()).toContain('Beacon')
  })

  it('keeps custom default page size as a stable select option', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        pagination: true,
        defaultPageSize: 6,
        pageSizeOptions: [10, 20],
        showColumnControls: false,
      },
    })

    const select = wrapper.getComponent(BingSelect)

    expect(select.props('options')).toEqual([
      { label: '6', value: 6 },
      { label: '10', value: 10 },
      { label: '20', value: 20 },
    ])

    await select.vm.$emit('update:model-value', 10)
    await wrapper.vm.$nextTick()

    expect(wrapper.getComponent(BingSelect).props('options')).toEqual([
      { label: '6', value: 6 },
      { label: '10', value: 10 },
      { label: '20', value: 20 },
    ])
  })

  it('keeps the page size selector constrained inside the pagination layout', () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        pagination: true,
        defaultPageSize: 1,
        showColumnControls: false,
      },
    })

    const select = wrapper.getComponent(BingSelect)

    expect(select.props('width')).toBe(88)
    expect(select.props('minWidth')).toBe(0)
  })

  it('emits one page-change when page size changes', async () => {
    const pagedRows = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index + 1}`,
      name: `Row ${index + 1}`,
      status: 'Ready',
      score: index,
    }))
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: pagedRows,
        rowKey: 'id',
        pagination: true,
        defaultPage: 2,
        defaultPageSize: 10,
        showColumnControls: false,
      },
    })
    const select = wrapper.getComponent(BingSelect)

    await select.vm.$emit('update:model-value', 20)
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:pageSize')).toEqual([[20]])
    expect(wrapper.emitted('update:page')).toEqual([[1]])
    expect(wrapper.emitted('page-change')).toEqual([[{ page: 1, pageSize: 20 }]])
  })

  it('floats pagination during controlled page size height transitions', async () => {
    const pagedRows = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index + 1}`,
      name: `Row ${index + 1}`,
      status: 'Ready',
      score: index,
    }))
    const requestAnimationFrameSpy = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(() => 1)
    const cancelAnimationFrameSpy = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => undefined)
    let frameHeight = 160
    let wrapper!: VueWrapper
    wrapper = mount(BingTable, {
      attachTo: document.body,
      props: {
        columns,
        data: pagedRows,
        rowKey: 'id',
        pagination: true,
        pageSize: 3,
        defaultPageSize: 3,
        pageSizeOptions: [3, 10],
        showColumnControls: false,
        'onUpdate:pageSize': (value: number) => {
          frameHeight = 280
          void wrapper.setProps({ pageSize: value })
        },
      },
    })
    const root = wrapper.element as HTMLElement
    const frame = wrapper.get('.bing-table__frame').element as HTMLElement
    const scroll = wrapper.get('.bing-table__scroll').element as HTMLElement
    const pagination = wrapper.get('.bing-table__pagination').element as HTMLElement

    root.getBoundingClientRect = () =>
      ({
        bottom: 420,
        height: 320,
        left: 40,
        right: 640,
        top: 100,
        width: 600,
        x: 40,
        y: 100,
        toJSON: () => ({}),
      }) as DOMRect
    frame.getBoundingClientRect = () =>
      ({
        bottom: 300,
        height: frameHeight,
        left: 40,
        right: 640,
        top: 300 - frameHeight,
        width: 600,
        x: 40,
        y: 300 - frameHeight,
        toJSON: () => ({}),
      }) as DOMRect
    scroll.getBoundingClientRect = () =>
      ({
        bottom: 420,
        height: 280,
        left: 40,
        right: 640,
        top: 140,
        width: 600,
        x: 40,
        y: 140,
        toJSON: () => ({}),
      }) as DOMRect
    pagination.getBoundingClientRect = () =>
      ({
        bottom: 350,
        height: 40,
        left: 40,
        right: 640,
        top: 310,
        width: 600,
        x: 40,
        y: 310,
        toJSON: () => ({}),
      }) as DOMRect

    await wrapper.getComponent(BingSelect).vm.$emit('update:modelValue', 10)
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-pagination-floating')
    expect(wrapper.attributes('style')).toContain('padding-bottom: 50px')
    expect(wrapper.get('.bing-table__frame').attributes('style')).toContain('height: 160px')
    expect(wrapper.get('.bing-table__pagination').classes()).toContain('is-layout-floating')
    expect(wrapper.get('.bing-table__pagination').attributes('style')).toContain(
      'position: absolute',
    )

    requestAnimationFrameSpy.mockRestore()
    cancelAnimationFrameSpy.mockRestore()
  })

  it('keeps shrinking page size rows mounted until the height transition ends', async () => {
    const pagedRows = Array.from({ length: 7 }, (_, index) => ({
      id: `row-${index + 1}`,
      name: `Row ${index + 1}`,
      status: 'Ready',
      score: index,
    }))
    const wrapper = mount(BingTable, {
      attachTo: document.body,
      props: {
        columns,
        data: pagedRows,
        rowKey: 'id',
        pagination: true,
        defaultPageSize: 10,
        pageSizeOptions: [3, 10],
        showColumnControls: false,
      },
    })
    const frame = wrapper.get('.bing-table__frame').element as HTMLElement

    frame.getBoundingClientRect = () =>
      ({
        bottom: 360,
        height: 360,
        left: 40,
        right: 640,
        top: 0,
        width: 600,
        x: 40,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    expect(wrapper.text()).toContain('Row 7')

    await wrapper.getComponent(BingSelect).vm.$emit('update:modelValue', 3)
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-page-size-transitioning')
    expect(wrapper.text()).toContain('Row 6')
    expect(wrapper.text()).toContain('Row 7')

    await wrapper.get('.bing-table__frame').trigger('transitionend', {
      propertyName: 'height',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.text()).not.toContain('Row 4')
    expect(wrapper.text()).not.toContain('Row 7')
    expect(wrapper.findAll('.bing-table__row')).toHaveLength(3)
  })

  it('preserves paginated table height with quiet filler rows by default', async () => {
    const pagedRows = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index + 1}`,
      name: `Row ${index + 1}`,
      status: 'Ready',
      score: index,
    }))
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: pagedRows,
        rowKey: 'id',
        pagination: true,
        defaultPageSize: 10,
        showColumnControls: false,
      },
    })

    await wrapper.get('[aria-label="下一页"]').trigger('click')

    expect(wrapper.findAll('.bing-table__row').filter((row) => !row.classes().includes('bing-table__row--filler'))).toHaveLength(2)
    expect(wrapper.findAll('.bing-table__row--filler')).toHaveLength(8)
  })

  it('can let paginated table height follow rendered rows', async () => {
    const pagedRows = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index + 1}`,
      name: `Row ${index + 1}`,
      status: 'Ready',
      score: index,
    }))
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: pagedRows,
        rowKey: 'id',
        pagination: true,
        preservePageHeight: false,
        defaultPageSize: 10,
        showColumnControls: false,
      },
    })

    await wrapper.get('[aria-label="下一页"]').trigger('click')

    expect(wrapper.findAll('.bing-table__row')).toHaveLength(2)
    expect(wrapper.findAll('.bing-table__row--filler')).toHaveLength(0)
  })

  it('expands tree rows and emits the expanded key list', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })

    expect(wrapper.text()).not.toContain('Aurora child')

    await wrapper.get('.bing-table__expander').trigger('click')

    expect(wrapper.text()).toContain('Aurora child')
    expect(wrapper.emitted('update:expandedRowKeys')).toEqual([[['one']]])
  })

  it('renders only a virtual window when virtual scrolling is enabled', () => {
    const manyRows = Array.from({ length: 100 }, (_, index) => ({
      id: `row-${index}`,
      name: `Row ${index}`,
      status: 'Ready',
      score: index,
    }))
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: manyRows,
        rowKey: 'id',
        virtual: true,
        virtualRowHeight: 40,
        maxHeight: 240,
        showColumnControls: false,
      },
    })

    expect(wrapper.findAll('.bing-table__row')).toHaveLength(17)
    expect(wrapper.text()).toContain('Row 0')
    expect(wrapper.text()).not.toContain('Row 99')
  })

  it('keeps striped rows based on the global row index in virtual scrolling', async () => {
    const manyRows = Array.from({ length: 100 }, (_, index) => ({
      id: `row-${index}`,
      name: `Row ${index}`,
      status: 'Ready',
      score: index,
    }))
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: manyRows,
        rowKey: 'id',
        virtual: true,
        virtualRowHeight: 40,
        maxHeight: 240,
        showColumnControls: false,
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element

    Object.defineProperty(viewport, 'scrollTop', {
      configurable: true,
      writable: true,
      value: 560,
    })

    await wrapper.get('.bing-scrollbar__viewport').trigger('scroll')
    await wrapper.vm.$nextTick()

    const firstRenderedRow = wrapper.findAll('.bing-table__row')[0]

    expect(firstRenderedRow.text()).toContain('Row 8')
    expect(firstRenderedRow.classes()).not.toContain('is-striped-row')
    expect(
      wrapper.findAll('.bing-table__row').find((row) => row.text().includes('Row 9'))?.classes(),
    ).toContain('is-striped-row')
  })

  it('does not sticky-pin the selection body cells for vertical-only virtual scrolling', () => {
    const manyRows = Array.from({ length: 100 }, (_, index) => ({
      id: `row-${index}`,
      name: `Row ${index}`,
      status: 'Ready',
      score: index,
    }))
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: manyRows,
        rowKey: 'id',
        selectable: true,
        virtual: true,
        virtualRowHeight: 40,
        maxHeight: 240,
        showColumnControls: false,
      },
    })

    expect(wrapper.get('.bing-table__body .bing-table__selection-cell').classes()).not.toContain(
      'is-fixed-left',
    )
  })

  it('renders a separated horizontal scrollbar dock for horizontal overflow', async () => {
    const wideColumns: BingTableColumn[] = [
      { key: 'name', title: 'Name', width: 240 },
      { key: 'status', title: 'Status', width: 240 },
      { key: 'score', title: 'Score', width: 240 },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: wideColumns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element as HTMLElement

    Object.defineProperties(viewport, {
      clientWidth: {
        configurable: true,
        value: 300,
      },
      scrollWidth: {
        configurable: true,
        value: 900,
      },
      scrollLeft: {
        configurable: true,
        writable: true,
        value: 0,
      },
    })

    await wrapper.get('.bing-scrollbar__viewport').trigger('scroll')
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('has-horizontal-scrollbar')
    expect(wrapper.find('.bing-table__horizontal-scrollbar').exists()).toBe(true)

    const rail = wrapper.get('.bing-table__horizontal-rail').element as HTMLElement

    Object.defineProperties(rail, {
      clientWidth: {
        configurable: true,
        value: 300,
      },
    })
    rail.getBoundingClientRect = () =>
      ({
        bottom: 0,
        height: 5,
        left: 0,
        right: 300,
        top: 0,
        width: 300,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      }) as DOMRect

    const scrollbarApi = (
      wrapper.findComponent(BingScrollbar).vm as unknown as {
        $: { exposed: BingScrollbarExpose }
      }
    ).$.exposed
    const stopSpy = vi.spyOn(scrollbarApi, 'stop')

    await wrapper.get('.bing-table__horizontal-rail').trigger('pointerdown', {
      clientX: 150,
      preventDefault: vi.fn(),
    })

    expect(stopSpy).toHaveBeenCalledOnce()
    expect(viewport.scrollLeft).toBeGreaterThan(0)
  })

  it('keeps the right fixed mask attached to the frame edge at the horizontal end', async () => {
    const wideColumns: BingTableColumn[] = [
      { key: 'name', title: 'Name', width: 240 },
      { key: 'status', title: 'Status', width: 240 },
      { key: 'score', title: 'Score', width: 120, fixed: 'right' },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: wideColumns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element as HTMLElement

    Object.defineProperties(viewport, {
      clientWidth: {
        configurable: true,
        value: 300,
      },
      scrollWidth: {
        configurable: true,
        value: 610,
      },
      scrollLeft: {
        configurable: true,
        writable: true,
        value: 310,
      },
    })

    await wrapper.get('.bing-scrollbar__viewport').trigger('scroll')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.bing-table__fixed-mask--right').attributes('style')).toContain(
      'right: 0px',
    )
  })

  it('keeps right fixed columns attached while the vertical scrollbar has a gutter', async () => {
    const fixedColumns: BingTableColumn[] = [
      { key: 'name', title: 'Name', width: 180 },
      { key: 'score', title: 'Score', width: 120, fixed: 'right' },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: fixedColumns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element as HTMLElement

    Object.defineProperties(viewport, {
      clientHeight: {
        configurable: true,
        value: 120,
      },
      scrollHeight: {
        configurable: true,
        value: 300,
      },
    })

    await wrapper.get('.bing-scrollbar__viewport').trigger('scroll')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.bing-table__header-cell.is-fixed-right').attributes('style')).toContain(
      'right: 26px',
    )
    expect(wrapper.get('.bing-table__fixed-mask--right').attributes('style')).toContain(
      'right: 26px',
    )
    expect(wrapper.find('.bing-table__scrollbar-spacer-cell--head').exists()).toBe(false)
    expect(wrapper.get('.bing-table__table').attributes('style')).toContain('min-width: 320px')
  })

  it('marks the column before the first right fixed column for clearance padding', () => {
    const fixedColumns: BingTableColumn[] = [
      { key: 'name', title: 'Name', width: 180 },
      { key: 'status', title: 'Status', width: 140 },
      { key: 'score', title: 'Score', width: 120, fixed: 'right' },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: fixedColumns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })
    const statusHeader = wrapper
      .findAll('.bing-table__header-cell')
      .find((header) => header.text().includes('Status'))
    const scoreHeader = wrapper
      .findAll('.bing-table__header-cell')
      .find((header) => header.text().includes('Score'))

    expect(statusHeader?.classes()).toContain('is-before-right-fixed')
    expect(scoreHeader?.classes()).not.toContain('is-before-right-fixed')
  })

  it('groups non-contiguous fixed columns when resolving controlled order', () => {
    const fixedColumns: BingTableColumn[] = [
      { key: 'owner', title: 'Owner', width: 150 },
      { key: 'project', title: 'Project', width: 180 },
      { key: 'status', title: 'Status', width: 140 },
      { key: 'progress', title: 'Progress', width: 140 },
      { key: 'budget', title: 'Budget', width: 140 },
      { key: 'risk', title: 'Risk', width: 120 },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: fixedColumns,
        data: rows,
        rowKey: 'id',
        columnOrder: ['owner', 'project', 'status', 'progress', 'budget', 'risk'],
        columnFixed: {
          owner: 'left',
          project: 'left',
          progress: 'left',
          budget: 'right',
          risk: 'right',
        },
        showColumnControls: false,
      },
    })
    const headerLabels = wrapper.findAll('.bing-table__header-label').map((header) => header.text())
    const headers = wrapper.findAll('.bing-table__header-cell')

    expect(headerLabels).toEqual(['Owner', 'Project', 'Progress', 'Status', 'Budget', 'Risk'])
    expect(headers[2].classes()).toContain('is-last-left-fixed')
    expect(headers[4].classes()).toContain('is-first-right-fixed')
  })

  it('keeps the right fixed shadow mounted while fading it out at the horizontal end', async () => {
    const wideColumns: BingTableColumn[] = [
      { key: 'name', title: 'Name', width: 240 },
      { key: 'status', title: 'Status', width: 240 },
      { key: 'score', title: 'Score', width: 120, fixed: 'right' },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: wideColumns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })
    const viewport = wrapper.get('.bing-scrollbar__viewport').element as HTMLElement

    Object.defineProperties(viewport, {
      clientWidth: {
        configurable: true,
        value: 300,
      },
      scrollWidth: {
        configurable: true,
        value: 600,
      },
      scrollLeft: {
        configurable: true,
        writable: true,
        value: 300,
      },
    })

    await wrapper.get('.bing-scrollbar__viewport').trigger('scroll')
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.bing-table__fixed-shadow--right').attributes('style')).toContain(
      'opacity: 0',
    )
  })

  it('resizes columns from the keyboard handle', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })

    await wrapper.get('.bing-table__resize-handle').trigger('keydown', {
      key: 'ArrowRight',
    })

    expect(wrapper.emitted('update:columnWidths')?.[0]?.[0]).toMatchObject({
      name: 192,
    })
    expect(wrapper.emitted('column-resize')?.[0]?.[0]).toMatchObject({
      key: 'name',
      width: 192,
    })
  })

  it('toggles column visibility from the column panel', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
      },
    })

    await openColumnPanel(wrapper)
    await getTeleportedColumnPanel()
      .findAll('input[type="checkbox"]')[0]
      .setValue(false)

    expect(wrapper.emitted('update:hiddenColumnKeys')).toEqual([[['name']]])
    expect(wrapper.find('.bing-table__head').text()).not.toContain('Name')
  })

  it('clips the column settings dropdown header to the panel radius', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
      },
    })

    await openColumnPanel(wrapper)

    const dropdown = getTeleportedColumnDropdown()
    const shellRule =
      columnControlsSource.match(
        /:global\(\.bing-dropdown__panel\.bing-table__column-panel-shell\)\s*{[\s\S]*?\n\}/,
      )?.[0] ?? ''
    const headerRule =
      columnControlsSource.match(
        /:global\(\.bing-table__column-panel-shell \.bing-dropdown__header\)\s*{[\s\S]*?\n\}/,
      )?.[0] ?? ''

    expect(dropdown.classes()).toContain('bing-table__column-panel-shell')
    expect(shellRule).toContain('overflow: hidden')
    expect(headerRule).toContain('overflow: hidden')
  })

  it('reorders columns from the column panel with sortable handles', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
      },
    })

    await openColumnPanel(wrapper)
    await getTeleportedColumnDropdown().get('.bing-table__column-grip').trigger('keydown', {
      key: 'ArrowDown',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:columnOrder')?.[0]?.[0]).toEqual([
      'status',
      'name',
      'score',
    ])
    expect(wrapper.emitted('column-reorder')?.[0]?.[0]).toMatchObject({
      key: 'name',
      from: 0,
      to: 1,
      order: ['status', 'name', 'score'],
    })
  })

  it('keeps a fixed column in its fixed edge group when it is reordered away', async () => {
    const fixedColumns: BingTableColumn[] = [
      ...columns,
      {
        key: 'risk',
        title: 'Risk',
        width: 120,
        fixed: 'right',
      },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: fixedColumns,
        data: rows.map((row) => ({
          ...row,
          risk: 'Low',
        })),
        rowKey: 'id',
        showColumnControls: true,
      },
    })
    await openColumnPanel(wrapper)
    await getColumnOptionByText('Risk').get('.bing-table__column-grip').trigger('keydown', {
      key: 'ArrowUp',
    })
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:columnOrder')?.[0]?.[0]).toEqual([
      'name',
      'status',
      'score',
      'risk',
    ])
    expect(wrapper.emitted('update:columnFixed')).toBeUndefined()
    expect(wrapper.emitted('column-reorder')?.[0]?.[0]).toMatchObject({
      key: 'risk',
      from: 3,
      to: 3,
      order: ['name', 'status', 'score', 'risk'],
    })
  })

  it('uses dnd-kit sortable headers without native drag attributes', () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        showColumnControls: false,
      },
    })
    const headers = wrapper.findAll('.bing-table__header-cell')

    expect(headers.map((header) => header.attributes('data-bing-table-sortable-key'))).toEqual([
      'name',
      'status',
      'score',
    ])
    expect(headers.every((header) => header.attributes('draggable') === undefined)).toBe(true)
    expect(wrapper.find('.bing-table__column-drag-overlay').exists()).toBe(true)
    expect(tableSource).toContain('DragDropProvider')
    expect(headerContentSource).toMatch(
      /\.bing-table__drag-mark\s*{[\s\S]*?position:\s*absolute;/,
    )
    const dragMarkCss = headerContentSource.match(/\.bing-table__drag-mark\s*{([^}]*)}/)?.[1]
    const dragCardCss = tableSource.match(
      /\.bing-table__header-cell\.bing-table__column-drag-card\s*{([^}]*)}/,
    )?.[1]

    expect(dragMarkCss).toContain('transition: opacity')
    expect(dragMarkCss).not.toContain('scale')
    expect(dragCardCss).not.toContain('transform:')
    expect(tableSource).not.toContain('.bing-table__column-drag-card::before')
  })

  it('uses semantic theme surfaces with public overrides', () => {
    expect(tableSource).toContain('--bing-table-row-bg: var(--bing-table-bg, var(--bing-surface-solid))')
    expect(tableSource).toContain('--bing-table-row-striped-bg: var(--bing-table-striped-bg, var(--bing-surface-muted))')
    expect(tableSource).toContain('--_table-header-bg: var(--bing-table-header-bg, var(--bing-surface-muted))')
    expect(tableSource).toContain('background: var(--bing-table-row-bg)')
    expect(tableSource).toContain('color: var(--bing-disabled-text)')
    expect(tableSource).not.toContain('--bing-table-fixed-header-bg')
    expect(tableSource).not.toContain('background: #fff')
  })

  it('does not reserve tree expander space for flat data', () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: [
          { id: 'flat-1', name: 'Flat row', status: 'Ready', score: 90 },
        ],
        rowKey: 'id',
        showColumnControls: false,
      },
    })

    expect(wrapper.find('.bing-table__expander-spacer').exists()).toBe(false)
    expect(wrapper.find('.bing-table__cell-content.is-tree-cell').exists()).toBe(false)
  })

  it('moves a newly left-fixed column into the left fixed group', async () => {
    const fixedColumns: BingTableColumn[] = [
      columns[0],
      columns[1],
      columns[2],
      {
        key: 'progress',
        title: 'Progress',
        width: 130,
      },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: fixedColumns,
        data: rows,
        rowKey: 'id',
        defaultColumnFixed: {
          name: 'left',
          status: 'left',
        },
      },
    })

    await openColumnPanel(wrapper)
    await getColumnOptionByText('Progress').get('.bing-table__pin-button--left').trigger('click')

    expect(wrapper.emitted('update:columnFixed')?.[0]?.[0]).toMatchObject({
      name: 'left',
      status: 'left',
      progress: 'left',
    })
    expect(wrapper.emitted('update:columnOrder')?.[0]?.[0]).toEqual([
      'name',
      'status',
      'progress',
      'score',
    ])
  })

  it('moves a newly right-fixed column into the right fixed group', async () => {
    const fixedColumns: BingTableColumn[] = [
      columns[0],
      columns[1],
      {
        key: 'progress',
        title: 'Progress',
        width: 130,
      },
      columns[2],
      {
        key: 'risk',
        title: 'Risk',
        width: 120,
      },
    ]
    const wrapper = mount(BingTable, {
      props: {
        columns: fixedColumns,
        data: rows,
        rowKey: 'id',
        defaultColumnFixed: {
          risk: 'right',
        },
      },
    })

    await openColumnPanel(wrapper)
    await getColumnOptionByText('Progress').get('.bing-table__pin-button--right').trigger('click')

    expect(wrapper.emitted('update:columnFixed')?.[0]?.[0]).toMatchObject({
      progress: 'right',
      risk: 'right',
    })
    expect(wrapper.emitted('update:columnOrder')?.[0]?.[0]).toEqual([
      'name',
      'status',
      'score',
      'progress',
      'risk',
    ])
  })

  it('emits controlled column state resets from the column panel', async () => {
    const wrapper = mount(BingTable, {
      props: {
        columns,
        data: rows,
        rowKey: 'id',
        columnWidths: {
          name: 220,
        },
        columnOrder: ['score', 'name', 'status'],
        hiddenColumnKeys: ['status'],
        columnFixed: {
          score: 'right',
        },
      },
    })

    await openColumnPanel(wrapper)
    await getTeleportedColumnDropdown().get('.bing-table__text-button').trigger('click')

    expect(wrapper.emitted('update:columnWidths')?.[0]?.[0]).toEqual({})
    expect(wrapper.emitted('update:columnOrder')?.[0]?.[0]).toEqual(['name', 'status', 'score'])
    expect(wrapper.emitted('update:hiddenColumnKeys')?.[0]?.[0]).toEqual([])
    expect(wrapper.emitted('update:columnFixed')?.[0]?.[0]).toEqual({})
  })
})
