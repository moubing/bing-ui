import { afterEach, describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, defineComponent, h, nextTick, ref, type App, type VNodeChild } from 'vue'
import BingTable from './BingTable.vue'
import type { BingTableExpose, BingTableProps } from './BingTable.types'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
function mountTable(initial: BingTableProps = {}, slots: Record<string, (scope: any) => VNodeChild> = {}) {
  const props = ref<BingTableProps>({
    columns: [{ key: 'name', title: '名称', width: 180, sortable: true }, { key: 'score', title: '分数', width: 160 }],
    data: [{ id: 'a', name: 'Alpha', score: 3 }, { id: 'b', name: 'Beta', score: 2 }, { id: 'c', name: 'Gamma', score: 1 }],
    smoothScroll: false, showColumnControls: false, ...initial,
  })
  const events = { activate: vi.fn(), selected: vi.fn(), resize: vi.fn(), retry: vi.fn() }
  const api = ref<BingTableExpose>()
  const host = document.createElement('div')
  host.style.cssText = 'width: 620px; margin: 24px;'
  document.body.appendChild(host)
  const app = createApp({ render: () => h(BingTable, {
    ...props.value, ref: api, onRowActivate: events.activate, onSelectionChange: events.selected,
    onColumnResize: events.resize, onRetry: events.retry,
  }, slots) })
  app.mount(host)
  mounted.push({ app, host })
  const cells = () => [...host.querySelectorAll<HTMLElement>('[data-bing-table-cell]')]
  const header = (key = 'name') => host.querySelector<HTMLElement>(`th[data-column-key="${key}"] [data-bing-table-cell]`)!
  const cell = (index: number, key = 'name') => host.querySelector<HTMLElement>(`tr[data-row-index="${index}"] td[data-column-key="${key}"]`)!
  const key = async (value: string, modifiers: Partial<KeyboardEventInit> = {}) => {
    document.activeElement?.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...modifiers }))
    await nextTick()
    await frames(2)
  }
  return { host, props, api, events, cells, header, cell, key }
}
async function frames(count = 4) {
  for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame)
}
afterEach(() => {
  mounted.splice(0).forEach(({ app, host }) => { app.unmount(); host.remove() })
  vi.restoreAllMocks()
})

describe('BingTable 网格交互', () => {
  it('保持原生列头语义和单个网格 Tab 入口；排序描述、aria-sort 与播报同步', async () => {
    const { host, header, key } = mountTable()
    await frames()
    expect(host.querySelector('table')?.getAttribute('role')).toBe('grid')
    for (const th of host.querySelectorAll('th')) {
      expect(th.getAttribute('role')).toBeNull()
      expect(th.getAttribute('tabindex')).toBeNull()
      expect(th.getAttribute('aria-roledescription')).toBeNull()
    }
    expect(host.querySelectorAll('table [tabindex="0"]')).toHaveLength(1)
    header().focus()
    await userEvent.keyboard('{Enter}')
    await frames()
    expect(host.querySelector('th')?.getAttribute('aria-sort')).toBe('ascending')
    const sort = host.querySelector('.bing-table__sort-button')!
    expect(document.getElementById(sort.getAttribute('aria-describedby')!)?.textContent).toContain('当前升序')
    await expect.poll(() => host.querySelector('[aria-live="polite"]')?.textContent).toContain('升序排序')
    await key(' ')
    expect(host.querySelector('th')?.getAttribute('aria-sort')).toBe('descending')
    await key('Enter')
    expect(host.querySelector('th')?.getAttribute('aria-sort')).toBe('none')
  })

  it('方向键、首尾和翻屏保持单元格焦点，Enter 激活，Space/Shift Space 范围选择', async () => {
    const { host, cell, api, key, events } = mountTable({ selectable: true, rowDisabled: row => row.id === 'b' })
    await api.value!.focusCell('a', 'name')
    await key('Enter')
    expect(events.activate.mock.calls[0]?.[1]).toBe('a')
    expect(cell(0).parentElement?.getAttribute('aria-current')).toBe('true')
    await key(' ')
    await key('ArrowDown')
    await key('ArrowDown')
    await key(' ', { shiftKey: true })
    expect(events.selected.mock.calls.at(-1)?.[0].keys).toEqual(['a', 'c'])
    await key('Home')
    expect(document.activeElement?.classList.contains('bing-table__selection-cell')).toBe(true)
    await key('End')
    expect(document.activeElement).toBe(cell(2, 'score'))
    await key('Home', { ctrlKey: true })
    expect(document.activeElement?.classList.contains('bing-table__selection-heading')).toBe(true)
    await key('End', { ctrlKey: true })
    expect(document.activeElement).toBe(cell(2, 'score'))
    await key('PageUp')
    expect(document.activeElement).toBe(cell(0, 'score'))
    expect(host.querySelectorAll('table [tabindex="0"]')).toHaveLength(1)
    await key('a', { ctrlKey: true })
    expect(events.selected.mock.calls.at(-1)?.[0].keys).toEqual(['a', 'c'])
  })

  it('F2/Enter 进入动态插槽控件，Tab 循环，Esc 退出，关闭模式恢复作者 tabindex', async () => {
    const extra = ref(false)
    const Controls = defineComponent({ setup: () => () => h('div', [h('input', { 'aria-label': '输入' }), ...(extra.value ? [h('button', { tabindex: 3 }, '保存')] : [])]) })
    const { host, api, cell, key, props } = mountTable({}, { 'cell-score': () => h(Controls) })
    await api.value!.focusCell('a', 'score')
    expect(host.querySelector('input')?.tabIndex).toBe(-1)
    await key('F2')
    expect(document.activeElement?.tagName).toBe('INPUT')
    extra.value = true
    await frames()
    await key('Tab')
    expect(document.activeElement?.textContent).toBe('保存')
    await key('Tab')
    expect(document.activeElement?.tagName).toBe('INPUT')
    await key('Tab', { shiftKey: true })
    expect(document.activeElement?.textContent).toBe('保存')
    await key('Escape')
    expect(document.activeElement).toBe(cell(0, 'score'))
    expect(host.querySelector('input')?.tabIndex).toBe(-1)
    props.value = { ...props.value, keyboardNavigation: false }
    await frames()
    expect(host.querySelector('table')?.getAttribute('role')).toBeNull()
    expect(host.querySelector('input')?.getAttribute('tabindex')).toBeNull()
    expect(host.querySelector('td button')?.getAttribute('tabindex')).toBe('3')
    props.value = { ...props.value, keyboardNavigation: true }
    await frames()
    expect(host.querySelector<HTMLButtonElement>('td button')?.tabIndex).toBe(-1)
  })

  it('关闭键盘导航时恢复排序、拖动、列宽和插槽控件的自然焦点', async () => {
    const { host, props, header } = mountTable({ keyboardNavigation: false })
    await frames()
    expect(header().hasAttribute('tabindex')).toBe(false)
    expect(host.querySelector<HTMLButtonElement>('.bing-table__drag-mark')?.tabIndex).toBe(0)
    expect(host.querySelector<HTMLButtonElement>('.bing-table__sort-button')?.tabIndex).toBe(0)
    props.value = { ...props.value, keyboardNavigation: true }
    await frames()
    expect(host.querySelectorAll('table [tabindex="0"]')).toHaveLength(1)
  })

  it('树网格提供层级/同级数量，左右键展开、进入子项、返回父项并收起', async () => {
    const { host, api, key, cell } = mountTable({ data: [{ id: 'p', name: 'Parent', children: [{ id: 'c1', name: 'Child 1' }, { id: 'c2', name: 'Child 2' }] }], treeColumnKey: 'name' })
    await api.value!.focusCell('p', 'name')
    expect(host.querySelector('table')?.getAttribute('role')).toBe('treegrid')
    expect(cell(0).parentElement?.getAttribute('aria-expanded')).toBe('false')
    await key('ArrowRight')
    expect(cell(0).parentElement?.getAttribute('aria-expanded')).toBe('true')
    expect(cell(1).parentElement?.getAttribute('aria-level')).toBe('2')
    expect(cell(1).parentElement?.getAttribute('aria-setsize')).toBe('2')
    expect(cell(1).parentElement?.getAttribute('aria-posinset')).toBe('1')
    await key('ArrowRight')
    expect(document.activeElement).toBe(cell(1))
    await key('ArrowLeft')
    expect(document.activeElement).toBe(cell(0))
    await key('ArrowLeft')
    expect(host.querySelectorAll('.bing-table__row')).toHaveLength(1)
  })

  it('排序按 key 保留焦点，删除和翻页回退到相近行，错误时回到表头', async () => {
    const { api, cell, props, host } = mountTable()
    await api.value!.focusCell('b', 'score')
    props.value = { ...props.value, sortKey: 'name', sortOrder: 'desc' }
    await frames()
    expect(document.activeElement).toBe(cell(1, 'score'))
    props.value = { ...props.value, data: [{ id: 'a', name: 'Alpha' }, { id: 'c', name: 'Gamma' }] }
    await frames()
    expect(document.activeElement).toBe(cell(1, 'score'))
    props.value = { ...props.value, pagination: true, pageSize: 1, page: 2 }
    await frames()
    expect(document.activeElement).toBe(cell(0, 'score'))
    props.value = { ...props.value, error: '加载失败' }
    await frames()
    expect(host.querySelector('thead')?.contains(document.activeElement)).toBe(true)
  })

  it('可聚焦滚动容器内的全文提示文字可激活和选择行，嵌套按钮仍隔离', async () => {
    const { host, events } = mountTable({ selectable: true, selectOnRowClick: true,
      data: [{ id: 'a', name: '需要全文提示的长标题，点击文字也应该激活并选择该行', score: 3 }],
    }, {
      'cell-score': () => h('button', '操作'),
    })
    host.tabIndex = 0
    await frames()
    const text = host.querySelector<HTMLElement>('tbody .bing-table__cell-text')!
    expect(text.closest('.bing-table__cell-value')?.hasAttribute('tabindex')).toBe(true)
    text.click()
    await frames()
    expect(events.activate.mock.calls.at(-1)?.[1]).toBe('a')
    expect(events.selected.mock.calls.at(-1)?.[0].keys).toEqual(['a'])
    host.querySelector<HTMLButtonElement>('td button')!.click()
    await frames()
    expect(events.activate).toHaveBeenCalledTimes(1)
    expect(events.selected).toHaveBeenCalledTimes(1)
  })

  it('活动行受控时只发送提议，嵌套控件和取消事件不激活行', async () => {
    const { api, cell, props, key, events, host } = mountTable({ activeRowKey: 'a' }, { 'cell-score': () => h('button', '操作') })
    await api.value!.focusCell('b', 'name')
    await key('Enter')
    expect(events.activate.mock.calls.at(-1)?.[1]).toBe('b')
    expect(cell(0).parentElement?.getAttribute('aria-current')).toBe('true')
    ;(host.querySelector('td button') as HTMLButtonElement).click()
    expect(events.activate).toHaveBeenCalledTimes(1)
    props.value = { ...props.value, activeRowKey: 'b' }
    await frames()
    expect(cell(1).parentElement?.getAttribute('aria-current')).toBe('true')
  })

  it('Ctrl/Command Shift 箭头只在固定分组内移动，Alt 箭头调整列宽', async () => {
    const { header, host, key, events } = mountTable({ columns: [{ key: 'name', width: 180 }, { key: 'score', width: 160 }, { key: 'fixed', fixed: 'right', width: 120 }] })
    await frames()
    header().focus()
    await key('ArrowRight', { ctrlKey: true, shiftKey: true })
    expect([...host.querySelectorAll('th')].map(th => (th as HTMLElement).dataset.columnKey)).toEqual(['score', 'name', 'fixed'])
    expect(document.activeElement).toBe(header())
    await key('ArrowRight', { metaKey: true, shiftKey: true })
    expect([...host.querySelectorAll('th')].map(th => (th as HTMLElement).dataset.columnKey)).toEqual(['score', 'name', 'fixed'])
    await key('ArrowRight', { altKey: true })
    expect(events.resize.mock.calls.at(-1)?.[0].width).toBe(192)
    await key('ArrowLeft', { altKey: true, shiftKey: true })
    expect(events.resize.mock.calls.at(-1)?.[0].width).toBe(144)
  })

  it('列宽分隔条公开数值并支持 Shift/Home/End，双击按当前内容自动适配', async () => {
    const { host, key, events, api } = mountTable({ columns: [{ key: 'name', title: '名称', width: 180, minWidth: 96, maxWidth: 420 }], data: [{ id: 'a', name: '一条需要更宽空间才能完整展示的项目名称' }] })
    await frames()
    const handle = host.querySelector<HTMLElement>('[role="separator"]')!
    handle.focus()
    await key('ArrowRight', { shiftKey: true })
    expect(handle.getAttribute('aria-valuenow')).toBe('228')
    await key('Home')
    expect(handle.getAttribute('aria-valuenow')).toBe('96')
    await key('End')
    expect(handle.getAttribute('aria-valuenow')).toBe('420')
    handle.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
    await frames()
    const width = events.resize.mock.calls.at(-1)?.[0].width
    expect(width).toBeGreaterThan(250)
    expect(width).toBeLessThanOrEqual(420)
    api.value!.autoFitColumns()
    await frames()
    expect(host.querySelectorAll('[inert][aria-hidden="true"]')).toHaveLength(0)
  })

  it('Shift 点击复选框覆盖可见范围，级联父项显示 mixed', async () => {
    const { host, events } = mountTable({ selectable: true })
    await frames()
    const boxes = [...host.querySelectorAll<HTMLInputElement>('tbody input[type="checkbox"]')]
    boxes[0]!.click()
    boxes[2]!.dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }))
    await frames()
    expect(events.selected.mock.calls.at(-1)?.[0].keys).toEqual(['a', 'b', 'c'])
    const tree = mountTable({ selectable: true, selectionStrategy: 'cascade', defaultExpandAll: true, data: [{ id: 'p', children: [{ id: 'one' }, { id: 'two' }] }] })
    await frames()
    tree.api.value!.toggleRowSelection('one', true)
    await frames()
    expect(tree.host.querySelector<HTMLInputElement>('tbody input')?.indeterminate).toBe(true)
  })
})

describe('BingTable 虚拟窗口与状态', () => {
  it('虚拟窗口额外保留焦点行，跳至末行仍保持正确全局行号和焦点', async () => {
    const { host, api, key, cell } = mountTable({ virtual: true, maxHeight: 240, data: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `行 ${i}` })) })
    await frames()
    await api.value!.focusCell(0, 'name')
    const focused = cell(0)
    const viewport = host.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    viewport.scrollTop = 10000
    await frames(8)
    expect(document.activeElement).toBe(focused)
    expect(focused.isConnected).toBe(true)
    expect(host.querySelectorAll('.bing-table__row').length).toBeLessThan(30)
    await key('End', { ctrlKey: true })
    expect(document.activeElement?.closest('tr')?.getAttribute('aria-rowindex')).toBe('1001')
    expect(host.querySelector('table')?.getAttribute('aria-rowcount')).toBe('1001')
    expect(host.querySelectorAll('table [tabindex="0"]')).toHaveLength(1)
  })

  it('可变行高保持各行实际高度，scrollToRow 到底后无空白或重叠', async () => {
    const { host, api } = mountTable({ virtual: true, virtualRowHeight: 90, maxHeight: 250, data: Array.from({ length: 500 }, (_, i) => ({ id: i, name: `行 ${i}`, height: i % 2 ? 90 : 20 })) }, {
      'cell-name': ({ row }) => h('div', { style: { height: `${row.height}px` } }, row.name),
    })
    await frames(8)
    let rows = [...host.querySelectorAll<HTMLElement>('.bing-table__row')]
    expect(rows[0]!.getBoundingClientRect().height).toBe(40)
    expect(rows[1]!.getBoundingClientRect().height).toBeGreaterThan(rows[0]!.getBoundingClientRect().height + 40)
    await api.value!.focusCell(0, 'name')
    api.value!.scrollToRow(499)
    await frames(12)
    rows = [...host.querySelectorAll<HTMLElement>('.bing-table__row')]
    expect(rows.at(-1)?.dataset.rowIndex).toBe('499')
    const viewport = host.querySelector('.bing-scrollbar__viewport')!
    expect(rows.at(-1)!.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1)
    expect(rows[0]?.dataset.rowIndex).toBe('0')
    for (let i = 1; i < rows.length; i++) {
      if (Number(rows[i]!.dataset.rowIndex) === Number(rows[i - 1]!.dataset.rowIndex) + 1) {
        expect(rows[i]!.getBoundingClientRect().top).toBeCloseTo(rows[i - 1]!.getBoundingClientRect().bottom, 0)
      }
    }
    expect(rows.length).toBeLessThan(30)
  })

  it('auto 留白仅在溢出时出现，stable 保留双向位置，空/错误状态禁用排序和全选', async () => {
    const { host, props, events } = mountTable({ selectable: true, data: [] }, { empty: () => h('span', '自定义空状态') })
    await frames(12)
    const root = host.querySelector<HTMLElement>('.bing-table')!
    const horizontal = host.querySelector<HTMLElement>('.bing-table__horizontal-scrollbar')!
    expect(root.style.getPropertyValue('--bing-table-vertical-scrollbar-gutter')).toBe('0px')
    expect(horizontal.getBoundingClientRect().height).toBe(0)
    const table = host.querySelector('table')!
    const frame = host.querySelector('.bing-table__frame')!
    const content = host.querySelector('.bing-scrollbar__content')!
    expect(table.getBoundingClientRect().right).toBeCloseTo(frame.getBoundingClientRect().right, 0)
    expect(getComputedStyle(content).paddingBottom).toBe('0px')
    expect(host.textContent).toContain('自定义空状态')
    expect(host.querySelector<HTMLButtonElement>('.bing-table__sort-button')?.disabled).toBe(true)
    expect(host.querySelector<HTMLInputElement>('thead input')?.disabled).toBe(true)
    props.value = { ...props.value, scrollbarGutter: 'stable' }
    await frames(16)
    expect(root.style.getPropertyValue('--bing-table-vertical-scrollbar-gutter')).toBe('26px')
    expect(getComputedStyle(content).paddingRight).toBe('26px')
    expect(horizontal.getBoundingClientRect().height).toBeGreaterThan(0)
    props.value = { ...props.value, error: '网络连接中断' }
    await frames()
    expect(host.textContent).toContain('网络连接中断')
    ;(host.querySelector('.bing-table__error button') as HTMLButtonElement).click()
    expect(events.retry).toHaveBeenCalledOnce()
  })

  it('首次骨架加载不露出空状态，加载期间保持忙碌语义', async () => {
    const { host } = mountTable({ loading: true, data: [], loadingVariant: 'skeleton' })
    await frames()
    expect(host.querySelectorAll('.bing-table__skeleton-row')).toHaveLength(5)
    expect(host.textContent).not.toContain('暂无数据')
    expect(host.querySelector('.bing-table')?.getAttribute('aria-busy')).toBe('true')
    expect(host.querySelector('.bing-table__loading-overlay')).toBeNull()
  })
})
