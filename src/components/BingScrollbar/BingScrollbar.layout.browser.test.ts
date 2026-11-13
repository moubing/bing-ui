import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import type { App, VNode } from 'vue'
import BingScrollbar from './BingScrollbar.vue'
import type { BingScrollbarExpose } from './BingScrollbar.types'
import BingTable from '../BingTable/BingTable.vue'
import BingTabs from '../BingTabs/BingTabs.vue'
import BingTextarea from '../BingTextarea/BingTextarea.vue'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []

function mount(render: () => VNode, width = 600) {
  const host = document.createElement('div')
  host.style.cssText = `width: ${width}px; margin: 20px;`
  document.body.append(host)
  const app = createApp({ render })
  app.mount(host)
  mounted.push({ app, host })
  return host
}

async function settle() {
  await nextTick()
  for (let i = 0; i < 5; i++) await new Promise(requestAnimationFrame)
}

function rect(element: Element) {
  const { x, y, width, height } = element.getBoundingClientRect()
  return { x, y, width, height }
}

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
})

describe('滚动轨道稳定占位', () => {
  it.each([false, true])('纵向溢出出现和消失均不挤动内容（对称占位：%s）', async (symmetric) => {
    const long = ref(false)
    const host = mount(() => h(BingScrollbar, {
      height: 160, smooth: false,
      style: symmetric ? '--bing-scrollbar-gutter-left: var(--bing-scrollbar-gutter)' : undefined,
    }, () => [
      h('div', { class: 'anchor', style: 'width: 200px; height: 24px; margin: auto;' }, '居中正文'),
      h('div', { style: `height: ${long.value ? 500 : 40}px` }),
    ]))
    const root = host.querySelector('.bing-scrollbar')!
    const anchor = host.querySelector('.anchor')!
    // 第一次同步布局就必须保留空间，不能等 mounted/ResizeObserver 后再补。
    const initial = rect(anchor)
    for (const value of [false, true, false, true, false]) {
      long.value = value
      await settle()
      expect(root.classList.contains('has-vertical-overflow')).toBe(value)
      expect(root.classList.contains('has-horizontal-overflow')).toBe(false)
      expect(rect(anchor)).toEqual(initial)
    }
    if (symmetric) {
      const bounds = root.getBoundingClientRect()
      expect(initial.x + initial.width / 2).toBe(bounds.x + bounds.width / 2)
    }
  })

  it('横向轨道不改变自动高度容器及下方内容的位置', async () => {
    const wide = ref(false)
    const scrollbar = ref<BingScrollbarExpose>()
    const host = mount(() => h('div', [
      h(BingScrollbar, { ref: scrollbar, horizontal: true, vertical: false, smooth: false }, () =>
        h('div', { style: `width: ${wide.value ? 900 : 80}px; height: 32px` }, wide.value ? '展开横向内容' : '横向内容')),
      h('div', { class: 'after' }, '后续内容'),
    ]))
    const initial = rect(host.querySelector('.after')!)
    for (const value of [false, true, false]) {
      wide.value = value
      await nextTick()
      scrollbar.value?.update()
      await settle()
      expect(host.querySelector('.bing-scrollbar')!.classList.contains('has-horizontal-overflow')).toBe(value)
      expect(rect(host.querySelector('.after')!)).toEqual(initial)
    }
  })

  it('外层占位与状态不污染内层关闭的滚动方向', async () => {
    const long = ref(false)
    const host = mount(() => h(BingScrollbar, {
      height: 160, horizontal: true, always: true,
      style: '--bing-scrollbar-gutter-left: var(--bing-scrollbar-gutter)',
    }, () => [
      h(BingScrollbar, { vertical: false, horizontal: false, class: 'inner' }, () =>
        h('div', { class: 'anchor', style: 'height: 20px' }, '内层内容')),
      h('div', { style: `height: ${long.value ? 500 : 20}px` }),
    ]))
    const anchor = host.querySelector('.anchor')!
    const initial = rect(anchor)
    for (const value of [false, true, false]) {
      long.value = value
      await settle()
      expect(rect(anchor)).toEqual(initial)
      const content = host.querySelector('.inner > .bing-scrollbar__viewport > .bing-scrollbar__content')!
      const style = getComputedStyle(content)
      expect([style.paddingLeft, style.paddingRight, style.paddingBottom]).toEqual(['0px', '0px', '0px'])
      expect(getComputedStyle(host.querySelector('.inner > .bing-scrollbar__rail')!).opacity).toBe('0')
    }
  })

  it('表格 stable 留白下纵向溢出不改变列宽、表头及右固定列文字的位置', async () => {
    const count = ref(1)
    const host = mount(() => h(BingTable, {
      columns: [
        { key: 'name', title: '名称', width: 200 },
        { key: 'state', title: '状态', width: 140, fixed: 'right', align: 'right' },
      ],
      data: Array.from({ length: count.value }, (_, i) => ({ id: i, name: '相同内容', state: '待整理' })),
      height: 180, pagination: false, smoothScroll: false, scrollbarGutter: 'stable',
    }))
    await settle()
    const geometry = () => [...host.querySelectorAll('th, tbody tr:first-child td .bing-table__cell-content')].map(rect)
    const initial = geometry()
    for (const value of [20, 1, 20]) {
      count.value = value
      await settle()
      expect(host.querySelector('.bing-table__scroll')!.classList.contains('has-vertical-overflow')).toBe(value > 1)
      expect(geometry()).toEqual(initial)
    }
  })

  it('表格 stable 留白下横向轨道显隐不改变表格高度或下方内容的位置', async () => {
    const host = mount(() => h('div', [
      h(BingTable, {
        columns: [{ key: 'name', title: '名称', width: 200 }, { key: 'state', title: '状态', width: 200 }],
        data: [{ id: 1, name: '名称', state: '待整理' }],
        pagination: false, smoothScroll: false, scrollbarGutter: 'stable',
      }),
      h('div', { class: 'after' }, '后续内容'),
    ]))
    await settle()
    const top = host.querySelector('.after')!.getBoundingClientRect().top
    for (const width of [280, 600, 280]) {
      host.style.width = `${width}px`
      await settle()
      expect(host.querySelector('.bing-table')!.classList.contains('has-horizontal-scrollbar')).toBe(width < 400)
      await expect.poll(() => host.querySelector('.after')!.getBoundingClientRect().top).toBe(top)
    }
  })

  it('表格中的嵌套滚动条保留自己的占位和可见轨道', async () => {
    const host = mount(() => h(BingTable, {
      columns: [{ key: 'name', title: '内容', width: 200 }],
      data: [{ id: 1 }], pagination: false,
    }, {
      'cell-name': () => h(BingScrollbar, { class: 'inner', vertical: false, horizontal: true, always: true, style: 'width: 100px' }, () =>
        h('div', { style: 'width: 400px; height: 30px' }, '宽内容')),
    }))
    await settle()
    const content = host.querySelector('.inner > .bing-scrollbar__viewport > .bing-scrollbar__content')!
    expect(getComputedStyle(content).paddingRight).toBe('0px')
    expect(getComputedStyle(content).paddingBottom).toBe('13px')
    expect(getComputedStyle(host.querySelector('.inner > .bing-scrollbar__rail--horizontal')!).display).not.toBe('none')
  })

  it('标签栏出现横向滚动时保持相同高度', async () => {
    const host = mount(() => h(BingTabs, {
      items: Array.from({ length: 4 }, (_, i) => ({ value: i, label: `标签 ${i}` })),
      modelValue: 0, animated: false,
    }))
    await settle()
    const root = host.querySelector('.bing-tabs__scroll')!
    const height = root.getBoundingClientRect().height
    for (const width of [160, 600, 160]) {
      host.style.width = `${width}px`
      await settle()
      expect(root.classList.contains('has-horizontal-overflow')).toBe(width < 200)
      expect(root.getBoundingClientRect().height).toBe(height)
    }
  })

  it('多行输入横纵溢出不改变文本留白、清空按钮位置和输入框高度', async () => {
    const text = ref('简短内容')
    const host = mount(() => h(BingTextarea, { modelValue: text.value, rows: 3, wrap: 'off', clearable: true }))
    await settle()
    const field = host.querySelector('textarea')!
    const geometry = () => {
      const style = getComputedStyle(field)
      return { field: rect(field), clear: rect(host.querySelector('.bing-textarea__clear')!), right: style.paddingRight, bottom: style.paddingBottom }
    }
    const initial = geometry()
    for (const value of [('宽内容'.repeat(60) + '\n').repeat(20), '简短内容']) {
      text.value = value
      await settle()
      expect(host.querySelector('.bing-scrollbar')!.classList.contains('has-overflow')).toBe(value.length > 100)
      expect(geometry()).toEqual(initial)
    }
  })
})
