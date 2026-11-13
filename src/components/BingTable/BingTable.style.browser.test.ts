import { afterEach, describe, expect, it } from 'vitest'
import { userEvent, page } from 'vitest/browser'
import { createApp, h, nextTick, ref, type App, type VNodeChild } from 'vue'
import BingTable from './BingTable.vue'
import type { BingTableExpose, BingTableProps } from './BingTable.types'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
const frames = async () => { for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame) }
function mount(initial: BingTableProps = {}, slots: Record<string, () => VNodeChild> = {}) {
  const host = document.createElement('div')
  host.style.cssText = 'width: 620px; margin: 20px;'
  document.body.append(host)
  const api = ref<BingTableExpose>()
  const props = ref<BingTableProps>({
    columns: [{ key: 'name', title: '名称', width: 120, fixed: 'left', sortable: true },
      ...Array.from({ length: 11 }, (_, index) => ({ key: `c${index}`, title: `指标${index}`, width: 160 })),
      { key: 'action', title: '操作', width: 100, fixed: 'right' }],
    data: Array.from({ length: 100 }, (_, id) => ({ id, name: `项目${id}` })),
    height: 240, selectable: true, smoothScroll: false, showColumnControls: false, ...initial,
  })
  const app = createApp({ render: () => h(BingTable, { ...props.value, ref: api }, slots) })
  app.mount(host); mounted.push({ app, host })
  return { host, api, props, viewport: () => host.querySelector<HTMLElement>('.bing-scrollbar__viewport')! }
}
afterEach(() => { mounted.splice(0).forEach(({ app, host }) => { app.unmount(); host.remove() }); delete document.documentElement.dataset.bingTheme })

describe('BingTable 视觉交互契约', () => {
  it.each(['light', 'dark'])('%s 默认焦点与状态标记达到 3:1，正文达到 4.5:1', async theme => {
    document.documentElement.dataset.bingTheme = theme
    const { host } = mount({ data: [{ id: 0 }, { id: 1 }], defaultSelectedRowKeys: [0], activeRowKey: 1 })
    await frames()
    const style = getComputedStyle(host.querySelector('.bing-table')!)
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    const luminance = (color: string) => {
      context.clearRect(0, 0, 1, 1); context.fillStyle = color; context.fillRect(0, 0, 1, 1)
      const rgb = [...context.getImageData(0, 0, 1, 1).data].slice(0, 3).map(value => {
        const channel = value / 255
        return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
      })
      return rgb[0]! * .2126 + rgb[1]! * .7152 + rgb[2]! * .0722
    }
    const ratio = (a: string, b: string) => {
      const values = [luminance(a), luminance(b)].sort((x, y) => x - y)
      return (values[1]! + .05) / (values[0]! + .05)
    }
    const value = (name: string) => style.getPropertyValue(name)
    const backgrounds = ['--bing-table-row-bg', '--bing-table-row-striped-bg', '--_table-header-bg', '--_table-row-hover-bg', '--_table-row-selected-bg', '--_table-row-active-bg']
    for (const background of backgrounds) {
      expect(ratio(value('--_table-focus-ring'), value(background))).toBeGreaterThanOrEqual(3)
      expect(ratio(style.color, value(background))).toBeGreaterThanOrEqual(4.5)
    }
    expect(ratio(value('--_table-row-active-accent'), value('--_table-row-active-bg'))).toBeGreaterThanOrEqual(3)
    const mark = host.querySelector('.is-selected .bing-checkbox__fill')!
    expect(getComputedStyle(mark).opacity).toBe('1')
    expect(ratio(getComputedStyle(mark).backgroundColor, value('--_table-row-selected-bg'))).toBeGreaterThanOrEqual(3)
  })

  it.each([false, true])('固定列和表头不会盖住导航目标，virtual=%s', async virtual => {
    const { host, api, viewport } = mount({ virtual })
    await frames()
    for (let index = 0; index < 11; index++) {
      await api.value!.focusCell(0, `c${index}`); await frames()
      const cell = document.activeElement!.getBoundingClientRect()
      const view = viewport().getBoundingClientRect()
      expect(cell.left).toBeGreaterThanOrEqual(view.left + 54 + 120 - 1)
      expect(cell.right).toBeLessThanOrEqual(view.right - 100 - 26 + 1)
    }
    const scrollLeft = viewport().scrollLeft
    await api.value!.focusCell(0, 'action'); await frames()
    expect(viewport().scrollLeft).toBe(scrollLeft)
    const fixed = document.activeElement!.getBoundingClientRect()
    expect(fixed.right).toBeLessThanOrEqual(viewport().getBoundingClientRect().right - 26 + 1)
    api.value!.scrollToRow(55); await frames(); await frames()
    const row = host.querySelector<HTMLElement>('tr[data-row-index="55"]')!
    const head = host.querySelector('thead')!.getBoundingClientRect()
    expect(row.getBoundingClientRect().top).toBeGreaterThanOrEqual(head.bottom - 1)
    expect(row.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport().getBoundingClientRect().bottom + 1)
    await api.value!.focusCell(54, 'c3'); await frames()
    expect(document.activeElement!.getBoundingClientRect().top).toBeGreaterThanOrEqual(head.bottom - 1)
  })

  it('超宽单元格按阅读起点对齐，F2 与 Escape 继续使用相同安全区', async () => {
    const { api, viewport } = mount({ columns: [{ key: 'name', fixed: 'left', width: 120 }, { key: 'wide', width: 700 }, { key: 'action', fixed: 'right', width: 100 }] }, { 'cell-wide': () => h('button', '操作') })
    await frames(); await api.value!.focusCell(0, 'wide'); await frames()
    const cell = document.activeElement as HTMLElement
    expect(Math.abs(cell.getBoundingClientRect().left - viewport().getBoundingClientRect().left - 174)).toBeLessThan(1)
    await userEvent.keyboard('{F2}')
    expect(document.activeElement?.tagName).toBe('BUTTON')
    await userEvent.keyboard('{Escape}')
    expect(document.activeElement).toBe(cell)
  })

  it('列设置 auto 按工具栏、表头、分页分配，显式 footer 保留旧布局', async () => {
    const { host, props } = mount({ showColumnControls: true })
    await frames()
    expect(host.querySelector('footer')).toBeNull()
    expect(host.querySelector('.bing-table__header-controls button')).not.toBeNull()
    props.value.columnControlsPlacement = 'toolbar'; await nextTick()
    expect(host.querySelector('.bing-table__toolbar .bing-table__column-controls')).not.toBeNull()
    props.value.columnControlsPlacement = 'footer'; await nextTick()
    expect(host.querySelector('footer .bing-table__column-controls')).not.toBeNull()
    props.value.columnControlsPlacement = 'auto'; props.value.pagination = true; await nextTick()
    expect(host.querySelector('footer .bing-table__column-controls')).not.toBeNull()
    const toolbar = mount({ showColumnControls: true }, { toolbar: () => h('span', '操作栏') })
    await frames()
    expect(toolbar.host.querySelector('.bing-table__toolbar .bing-table__column-controls')).not.toBeNull()
    expect(toolbar.host.querySelector('footer')).toBeNull()
  })

  it('祖先主题变量可覆盖；active 优先于 selected 和 hover，固定表头与普通表头一致', async () => {
    const { host } = mount({ data: [{ id: 0 }, { id: 1 }, { id: 2 }], defaultSelectedRowKeys: [0, 1], activeRowKey: 1 })
    host.style.cssText += '--bing-table-header-bg: rgb(230, 240, 250); --bing-table-row-selected-bg: rgb(240, 240, 250); --bing-table-row-active-bg: rgb(220, 230, 240); --bing-table-row-height: 56px;'
    await frames()
    const rows = host.querySelectorAll<HTMLTableRowElement>('.bing-table__row')
    await expect.poll(() => getComputedStyle(rows[0]!.cells[1]!).backgroundColor).toBe('rgb(240, 240, 250)')
    await userEvent.hover(rows[1]!)
    await expect.poll(() => getComputedStyle(rows[1]!.cells[1]!).backgroundColor).toBe('rgb(220, 230, 240)')
    expect(rows[0]!.getBoundingClientRect().height).toBe(56)
    const headers = [...host.querySelectorAll('th')].map(el => getComputedStyle(el).backgroundColor)
    expect(new Set(headers)).toEqual(new Set(['rgb(230, 240, 250)']))
  })

  it('窄分页隐藏首末页；骨架初载不显示零条记录', async () => {
    await page.viewport(900, 600)
    const { host } = mount({ loading: true, loadingVariant: 'skeleton', data: [], pagination: true })
    host.style.width = '390px'; await frames()
    expect(host.querySelector('.bing-table__page-summary')?.textContent).toBe('')
    expect(getComputedStyle(host.querySelector('[aria-label="首页"]')!).display).toBe('none')
    expect(getComputedStyle(host.querySelector('[aria-label="上一页"]')!).display).not.toBe('none')
    const bars = [...host.querySelectorAll<HTMLElement>('.bing-table__skeleton')]
    expect(bars[0]!.getBoundingClientRect().width).toBe(16)
    expect(new Set(bars.slice(1, 5).map(el => el.style.width)).size).toBeGreaterThan(1)
  })
})
