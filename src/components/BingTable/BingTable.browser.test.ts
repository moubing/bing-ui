import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { useDragDropManager } from '@dnd-kit/vue'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import type { App, VNodeChild } from 'vue'
import BingTable from './BingTable.vue'
import BingCursor from '../BingCursor/BingCursor.vue'
import type { BingTableColumnResizePayload, BingTableProps } from './BingTable.types'
import '../../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
const fullRoles = 'UI 设计、开发、运维、产品经理、项目管理员、测试'

function mountTable(
  initial: BingTableProps = {},
  slots: Record<string, () => VNodeChild> = {},
  events: { onColumnResize?: (payload: BingTableColumnResizePayload) => void } = {},
) {
  const props = ref<BingTableProps>({
    columns: [
      { key: 'name', title: '成员', width: 200 },
      { key: 'roles', title: '角色', width: 180 },
    ],
    data: [{ id: 1, name: '林晓', roles: fullRoles }, { id: 2, name: '周宁', roles: '开发' }],
    smoothScroll: false,
    // 原有 tooltip 的自然 Tab 契约；默认网格导航由交互专用用例覆盖。
    keyboardNavigation: false,
    ...initial,
  })
  const host = document.createElement('div')
  host.style.cssText = 'width: 380px; margin: 60px;'
  document.body.appendChild(host)
  const app = createApp({ render: () => h(BingTable, { ...props.value, ...events }, slots) })
  app.mount(host)
  mounted.push({ app, host })
  return { host, props }
}

afterEach(() => {
  mounted.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

async function frames(count = 4) {
  for (let i = 0; i < count; i++) await new Promise(requestAnimationFrame)
}

describe('BingTable in a browser', () => {
  it('keeps headers and sorting usable with BingCursor when column dragging is off or toggled', async () => {
    const { host, props } = mountTable({
      reorderableColumns: false,
      resizableColumns: false,
      showColumnControls: false,
      pagination: false,
      data: [{ id: 1, name: 'Beta', roles: '开发' }, { id: 2, name: 'Alpha', roles: '设计' }],
      columns: [
        { key: 'name', title: '成员', width: 200, sortable: true },
        { key: 'roles', title: '角色', width: 180 },
      ],
    }, {
      'header-name': () => h('span', { 'data-testid': 'sort-header' }, '成员'),
      'header-roles': () => h('span', { 'data-testid': 'plain-header' }, '角色'),
    })
    const cursorHost = document.createElement('div')
    document.body.appendChild(cursorHost)
    const cursorApp = createApp(BingCursor, { global: true })
    cursorApp.mount(cursorHost)
    mounted.push({ app: cursorApp, host: cursorHost })

    for (const reorderableColumns of [false, true, false]) {
      props.value = { ...props.value, reorderableColumns }
      await nextTick()
      await frames()
      const headers = Array.from(host.querySelectorAll<HTMLElement>('thead th'))
      if (!reorderableColumns) {
        for (const header of headers) {
          expect(header.getAttribute('scope')).toBe('col')
          expect(header.getAttribute('role')).toBeNull()
          expect(header.getAttribute('aria-disabled')).toBeNull()
          expect(header.getAttribute('tabindex')).toBeNull()
        }
      }
      await userEvent.hover(page.getByTestId('plain-header'))
      await expect.poll(() => getComputedStyle(host.querySelector('[data-testid="plain-header"]')!).cursor)
        .toMatch(reorderableColumns ? /, grab$/ : /, default$/)
      await userEvent.hover(page.getByTestId('sort-header'))
      // Cursor 按实际命中的文字元素接管，不依赖排序按钮祖先的计算样式。
      await expect.poll(() => getComputedStyle(host.querySelector('[data-testid="sort-header"]')!).cursor)
        .toMatch(/, pointer$/)
    }

    await page.getByRole('button', { name: '成员', exact: true }).click()
    await expect.poll(() => host.querySelector('.bing-table__row')?.textContent).toContain('Alpha')
    await page.getByRole('button', { name: '成员', exact: true }).click()
    await expect.poll(() => host.querySelector('.bing-table__row')?.textContent).toContain('Beta')
  })

  it.each([
    { size: 'md', headerAlign: 'left', customHeader: false, fixed: false },
    { size: 'sm', headerAlign: 'center', customHeader: true, fixed: false },
    { size: 'lg', headerAlign: 'right', customHeader: true, fixed: false },
    { size: 'md', headerAlign: 'left', customHeader: true, fixed: true },
  ] as const)('hands the overlay back to a matching $size / $headerAlign header without flashing (fixed: $fixed)', async ({ size, headerAlign, customHeader, fixed }) => {
    await page.viewport(960, 600)
    let manager: ReturnType<typeof useDragDropManager> | undefined
    const DragManagerProbe = defineComponent({
      setup() {
        manager = useDragDropManager()
        return () => null
      },
    })
    const { host } = mountTable(
      {
        reorderableColumns: true,
        size,
        bordered: size === 'lg',
        defaultSortKey: 'name',
        defaultSortOrder: 'asc',
        columns: [
          { key: 'name', title: '成员', width: 200, headerAlign, sortable: true, description: '成员姓名', fixed: fixed ? 'left' : undefined },
          { key: 'roles', title: '角色', width: 180 },
        ],
      },
      {
        'cell-name': () => h(DragManagerProbe),
        ...(customHeader ? { 'header-name': () => h('strong', { style: 'letter-spacing: 1px' }, '自定义成员') } : {}),
      },
    )
    host.style.width = '640px'
    await nextTick()
    const source = host.querySelector<HTMLElement>('[data-bing-table-sortable-key="name"]')!
    const overlay = host.querySelector<HTMLElement>('.bing-table__column-drag-overlay')!
    const label = source.querySelector<HTMLElement>('.bing-table__header-label')!
    const labelStyle = getComputedStyle(label)
    const expectedLabel = label.textContent?.trim()
    const expectedStyle = { font: labelStyle.font, color: labelStyle.color }
    const labelRect = label.getBoundingClientRect()
    const sourceRect = source.getBoundingClientRect()
    const frames: Array<{ label: string | null; distance: number; opacity: number; targetOpacity: number }> = []
    let released = false
    let frame = 0
    const sample = () => {
      if (released && overlay.getAnimations().some(animation => animation.playState === 'running')) {
        const card = overlay.querySelector<HTMLElement>('.bing-table__column-drag-card')
        const previewLabel = card?.querySelector<HTMLElement>('.bing-table__header-label')
        const rect = previewLabel?.getBoundingClientRect()
        const destination = label.getBoundingClientRect()
        frames.push({
          label: previewLabel?.textContent?.trim() ?? null,
          distance: rect ? Math.hypot(rect.x - destination.x, rect.y - destination.y) : Infinity,
          opacity: card ? Number(getComputedStyle(card).opacity) : 0,
          targetOpacity: Number(getComputedStyle(source).opacity),
        })
      }
      frame = requestAnimationFrame(sample)
    }
    sample()
    try {
      const rect = source.getBoundingClientRect()
      const dragManager = manager!.value
      // 使用真实的拖拽管理器和浏览器动画，直接驱动开始、移动、结束三个阶段。
      dragManager.actions.start({
        source: 'name',
        coordinates: { x: rect.x + 24, y: rect.y + 20 },
      })
      await expect.poll(() => host.querySelector('.is-reordering-columns')).not.toBeNull()
      const card = overlay.querySelector<HTMLElement>('.bing-table__column-drag-card')!
      const previewLabel = card.querySelector<HTMLElement>('.bing-table__header-label')!
      const previewStyle = getComputedStyle(previewLabel)
      expect({ font: previewStyle.font, color: previewStyle.color }).toEqual(expectedStyle)
      expect(card.querySelector('.bing-table__drag-mark')).toBeNull()
      expect(source.querySelector('.bing-table__drag-mark')).not.toBeNull()
      expect(card.querySelector('.bing-table__sort-button .bing-icon')).not.toBeNull()
      expect(card.querySelector('.bing-table__header-help .bing-icon')).not.toBeNull()
      const previewRect = previewLabel.getBoundingClientRect()
      const cardRect = card.getBoundingClientRect()
      expect(Math.abs((previewRect.x - cardRect.x) - (labelRect.x - sourceRect.x))).toBeLessThan(0.1)
      expect(Math.abs((previewRect.y - cardRect.y) - (labelRect.y - sourceRect.y))).toBeLessThan(0.1)
      expect(card.inert).toBe(true)
      expect(card.querySelector('button')).toBeNull()
      dragManager.actions.move({ by: { x: 120, y: 90 } })
      await expect.poll(() => overlay.getBoundingClientRect().y).toBeGreaterThan(rect.y + 50)
      released = true
      dragManager.actions.stop()
      await expect.poll(() => frames.length).toBeGreaterThan(1)
      await expect.poll(() => overlay.querySelector('.bing-table__column-drag-card')).toBeNull()
      expect(frames.every(sample => sample.label === expectedLabel)).toBe(true)
      expect(frames[0]!.distance).toBeGreaterThan(10)
      expect(frames.at(-1)!.distance).toBeLessThan(3)
      const fading = frames.filter(sample => sample.opacity < 0.99)
      expect(fading.length).toBeGreaterThan(1)
      expect(fading.every(sample => sample.distance < 3 && sample.targetOpacity === 1)).toBe(true)
      expect(fading.at(-1)!.opacity).toBeLessThan(0.1)
      expect(host.querySelector('.is-reordering-columns')).toBeNull()
    } finally {
      cancelAnimationFrame(frame)
      manager?.value.actions.stop({ canceled: true })
    }
  })

  it('keeps row nodes and pagination position while loading over cleared remote data', async () => {
    const { host, props } = mountTable({ pagination: true, remotePagination: true, total: 2 })
    await nextTick()
    const frame = host.querySelector<HTMLElement>('.bing-table__frame')!
    const footer = host.querySelector<HTMLElement>('.bing-table__pagination')!
    const row = host.querySelector('.bing-table__row')
    const height = frame.getBoundingClientRect().height
    const footerTop = footer.getBoundingClientRect().top
    const previousData = props.value.data

    props.value = { ...props.value, loading: true, data: [], total: 0 }
    await expect.poll(() => host.querySelector('[role="status"]')).not.toBeNull()
    expect(host.querySelector('.bing-table__row')).toBe(row)
    expect(Math.abs(frame.getBoundingClientRect().height - height)).toBeLessThan(1)
    expect(Math.abs(footer.getBoundingClientRect().top - footerTop)).toBeLessThan(1)
    expect(host.querySelector('.bing-scrollbar')?.hasAttribute('inert')).toBe(true)

    props.value = { ...props.value, loading: false, data: previousData, total: 2 }
    await expect.poll(() => host.querySelector('.bing-table__loading-overlay')).toBeNull()
    expect(Math.abs(frame.getBoundingClientRect().height - height)).toBeLessThan(1)
    expect(Math.abs(footer.getBoundingClientRect().top - footerTop)).toBeLessThan(1)
  })

  it('shows full text on focus only for clipped cells and closes on Escape', async () => {
    const { host } = mountTable()
    await expect.poll(() => host.querySelectorAll('.bing-table__cell-value[tabindex="0"]').length).toBe(1)
    const clipped = host.querySelector<HTMLElement>('.bing-table__cell-value[tabindex="0"]')!
    await userEvent.keyboard('{Tab}')
    clipped.focus()
    await expect.poll(() => document.querySelector('[role="tooltip"]')?.textContent).toBe(fullRoles)
    // 焦点目标的完整文本已经包含提示内容，不再重复关联同一段描述。
    expect(clipped.getAttribute('aria-describedby')).toBeNull()
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await expect.poll(() => document.querySelector('[role="tooltip"]')).toBeNull()
    expect(host.querySelector('.bing-table__cell-value')?.getAttribute('tabindex')).toBeNull()
  })

  it('reads slot text and removes the tooltip when the column becomes wide enough', async () => {
    const { host, props } = mountTable(
      { data: [{ id: 1, name: '林晓' }] },
      { 'cell-roles': () => h('span', fullRoles) },
    )
    await expect.poll(() => host.querySelector('.bing-table__cell-value[tabindex="0"]')).not.toBeNull()
    const clipped = host.querySelector<HTMLElement>('.bing-table__cell-value[tabindex="0"]')!
    clipped.dispatchEvent(new PointerEvent('pointerenter'))
    await expect.poll(() => document.querySelector('[role="tooltip"]')?.textContent).toBe(fullRoles)

    host.style.width = '950px'
    props.value = { ...props.value, columnWidths: { roles: 650 } }
    await expect.poll(() => clipped.hasAttribute('tabindex')).toBe(false)
    await expect.poll(() => document.querySelector('[role="tooltip"]')).toBeNull()
  })

  it('updates overflow after slot data changes and respects ellipsis false', async () => {
    const text = ref('开发')
    const { host, props } = mountTable({}, { 'cell-roles': () => h('span', text.value) })
    await nextTick()
    expect(host.querySelector('.bing-table__cell-value[tabindex="0"]')).toBeNull()
    text.value = fullRoles
    await expect.poll(() => host.querySelector('.bing-table__cell-value[tabindex="0"]')).not.toBeNull()
    props.value = {
      ...props.value,
      columns: props.value.columns!.map((column) => ({ ...column, ellipsis: false })),
    }
    await expect.poll(() => host.querySelector('.bing-table__cell-value[tabindex="0"]')).toBeNull()
    expect(host.querySelector('.bing-table__cell-text.is-ellipsis')).toBeNull()
  })

  it('leaves action controls interactive without creating duplicate text tooltips', async () => {
    let clicks = 0
    const { host } = mountTable({}, {
      'cell-roles': () => h('button', { onClick: () => clicks++ }, fullRoles),
    })
    await nextTick()
    host.querySelector<HTMLButtonElement>('.bing-table__cell button')!.click()
    expect(clicks).toBe(1)
    expect(host.querySelector('.bing-table__cell-value[tabindex="0"]')).toBeNull()
  })

  it('keeps smooth scrolling without repeatedly measuring unchanged cells', async () => {
    const { host } = mountTable({
      columns: Array.from({ length: 8 }, (_, i) => ({ key: `value${i}`, width: 100 })),
      data: Array.from({ length: 40 }, (_, i) => ({ id: i, value0: `项目 ${i}` })),
      virtual: false,
      maxHeight: 240,
      smoothScroll: { duration: 400, accelerationMax: 1, smoothTouchpad: true, respectReducedMotion: false },
    })
    await document.fonts.ready
    await frames(6)
    let cellReads = 0
    const querySelector = Element.prototype.querySelector
    vi.spyOn(Element.prototype, 'querySelector').mockImplementation(function (this: Element, selector: string) {
      if (this.classList.contains('bing-table__cell-text') && selector.startsWith('button, a[href]')) cellReads++
      return querySelector.call(this, selector)
    })
    const viewport = host.querySelector<HTMLElement>('.bing-table__scroll .bing-scrollbar__viewport')!
    const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 120 })
    viewport.dispatchEvent(wheel)
    expect(wheel.defaultPrevented).toBe(true)
    expect(viewport.scrollTop).toBe(0)
    await expect.poll(() => viewport.scrollTop).toBeGreaterThan(0)
    expect(viewport.scrollTop).toBeLessThan(100)
    await expect.poll(() => viewport.scrollTop).toBeCloseTo(100, 0)
    for (let position = 120; position <= 320; position += 10) {
      viewport.scrollTop = position
      await frames(1)
    }
    await frames()
    expect(cellReads).toBe(0)
  })

  it('shares size observers when more cells are mounted and releases all targets on unmount', async () => {
    const NativeResizeObserver = window.ResizeObserver
    const observers: Array<{ targets: Set<Element> }> = []
    vi.stubGlobal('ResizeObserver', class extends NativeResizeObserver {
      targets = new Set<Element>()
      constructor(callback: ResizeObserverCallback) { super(callback); observers.push(this) }
      observe(target: Element, options?: ResizeObserverOptions) { this.targets.add(target); super.observe(target, options) }
      unobserve(target: Element) { this.targets.delete(target); super.unobserve(target) }
      disconnect() { this.targets.clear(); super.disconnect() }
    })
    const { host, props } = mountTable({
      data: Array.from({ length: 10 }, (_, i) => ({ id: i, name: `项目 ${i}` })),
      virtual: false, maxHeight: 240,
    })
    await frames(6)
    const initialCount = observers.length
    props.value = { ...props.value, data: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `项目 ${i}` })) }
    await frames(6)
    expect(host.querySelectorAll('.bing-table__cell-text').length).toBe(200)
    expect(observers.length).toBe(initialCount)
    expect(observers.filter(observer => [...observer.targets].some(target => target.classList.contains('bing-table__cell-text')))).toHaveLength(1)
    const entry = mounted.pop()!
    entry.app.unmount()
    entry.host.remove()
    expect(observers.every(observer => observer.targets.size === 0)).toBe(true)
  })

  it('updates tooltips for child-owned slot changes and preserves newly inserted controls', async () => {
    const text = ref('开发')
    const interactive = ref(false)
    const SlotContent = defineComponent({ setup: () => () => interactive.value ? h('button', text.value) : h('span', text.value) })
    const { host } = mountTable({}, { 'cell-roles': () => h(SlotContent) })
    await frames()
    expect(host.querySelector('.bing-table__cell-value[tabindex="0"]')).toBeNull()
    text.value = fullRoles
    await expect.poll(() => host.querySelector('.bing-table__cell-value[tabindex="0"]')).not.toBeNull()
    const clipped = host.querySelector<HTMLElement>('.bing-table__cell-value[tabindex="0"]')!
    await userEvent.keyboard('{Tab}')
    clipped.focus()
    await expect.poll(() => document.querySelector('[role="tooltip"]')?.textContent).toBe(fullRoles)
    interactive.value = true
    await expect.poll(() => host.querySelector('.bing-table__cell-text.has-controls button')).not.toBeNull()
    await expect.poll(() => document.querySelector('[role="tooltip"]')).toBeNull()
    expect(host.querySelector('.bing-table__cell-value[tabindex="0"]')).toBeNull()
    const button = host.querySelector<HTMLButtonElement>('.bing-table__cell button')!
    button.focus()
    expect(document.activeElement).toBe(button)
  })

  it('previews column widths once per frame and commits the final move before releasing', async () => {
    const widths: number[] = []
    const { host } = mountTable({}, {}, { onColumnResize: payload => widths.push(payload.width) })
    await frames()
    const handle = host.querySelector<HTMLElement>('.bing-table__resize-handle')!
    const pointer = (type: string, clientX: number) => new PointerEvent(type, { bubbles: true, cancelable: true, button: 0, clientX })
    handle.dispatchEvent(pointer('pointerdown', 200))
    for (let x = 201; x <= 240; x++) window.dispatchEvent(pointer('pointermove', x))
    expect(widths).toEqual([])
    await expect.poll(() => widths.length).toBe(1)
    expect(widths).toEqual([240])
    expect(host.querySelector<HTMLElement>('.bing-table__header-cell')!.style.width).toBe('240px')
    expect(host.querySelector('.is-resizing-column')).not.toBeNull()
    for (let x = 241; x <= 261; x++) window.dispatchEvent(pointer('pointermove', x))
    window.dispatchEvent(pointer('pointerup', 261))
    expect(widths).toEqual([240, 261])
    await frames()
    expect(widths).toEqual([240, 261])
    expect(host.querySelector<HTMLElement>('.bing-table__header-cell')!.style.width).toBe('261px')
    expect(host.querySelector('.is-resizing-column')).toBeNull()
  })
})


it('keeps compact virtual row spacing consistent while changing size and scrolling', async () => {
  const { host, props } = mountTable({
    columns: [{ key: 'name', title: '项目', width: 200 }],
    data: Array.from({ length: 100 }, (_, i) => ({ id: i, name: '项目 ' + i })),
    size: 'sm', virtual: true, maxHeight: 240,
  })
  await nextTick()
  const viewport = host.querySelector<HTMLElement>('.bing-table__scroll .bing-scrollbar__viewport')!
  for (const [size, height] of [['sm', 36], ['md', 40], ['lg', 44]] as const) {
    props.value = { ...props.value, size }
    await nextTick()
    await expect.poll(() => host.querySelector('.bing-table__row')!.getBoundingClientRect().height).toBe(height)
    viewport.scrollTop = viewport.scrollHeight
    viewport.dispatchEvent(new Event('scroll'))
    await expect.poll(() => host.textContent).toContain('项目 99')
    const rows = Array.from(host.querySelectorAll<HTMLElement>('.bing-table__row'))
    expect(rows.at(-1)!.getBoundingClientRect().top - rows.at(-2)!.getBoundingClientRect().top).toBe(height)
    viewport.scrollTop = 0
    viewport.dispatchEvent(new Event('scroll'))
    await expect.poll(() => host.textContent).toContain('项目 0')
  }
  props.value = { ...props.value, virtualRowHeight: 60 }
  await nextTick()
  // virtualRowHeight 仅估计未测量行；不会拉高已经测量的 lg 行。
  await expect.poll(() => host.querySelector('.bing-table__row')!.getBoundingClientRect().height).toBe(44)
})

it('remeasures growing slot content in a virtual window while keeping the scroll anchor', async () => {
  const contentHeight = ref(20)
  const GrowingCell = defineComponent({
    setup: () => () => h('div', { style: { height: `${contentHeight.value}px` } }, '异步内容'),
  })
  const { host } = mountTable({
    data: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `项目 ${i}` })),
    columns: [{ key: 'name', width: 200 }],
    virtual: true, maxHeight: 240,
  }, { 'cell-name': () => h(GrowingCell) })
  await frames(6)
  const viewport = host.querySelector<HTMLElement>('.bing-table__scroll .bing-scrollbar__viewport')!
  const initialHeight = host.querySelector('.bing-table__row')!.getBoundingClientRect().height
  viewport.scrollTop = initialHeight * 10
  await frames(6)
  const anchorTop = host.querySelector('[data-row-index="10"]')!.getBoundingClientRect().top
  contentHeight.value = 64
  await expect.poll(() => host.querySelector('.bing-table__row')!.getBoundingClientRect().height).toBeGreaterThan(initialHeight)
  await frames(6)
  const rows = [...host.querySelectorAll<HTMLElement>('.bing-table__row')]
  const nextHeight = rows[0]!.getBoundingClientRect().height
  expect(nextHeight).toBeGreaterThanOrEqual(64)
  expect(rows[1]!.getBoundingClientRect().top - rows[0]!.getBoundingClientRect().top).toBeCloseTo(nextHeight, 0)
  expect(host.querySelector('[data-row-index="10"]')!.getBoundingClientRect().top).toBeCloseTo(anchorTop, 0)
  expect(rows.length).toBeLessThan(25)
})
