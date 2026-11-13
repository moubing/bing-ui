import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App, Ref } from 'vue'
import BingTreeSelect from './BingTreeSelect.vue'
import '../../theme/index.css'
import type {
  BingTreeSelectModelValue,
  BingTreeSelectNode,
  BingTreeSelectProps,
} from './BingTreeSelect.types'

interface MountedTreeSelect {
  app: App<Element>
  changes: BingTreeSelectModelValue[]
  host: HTMLElement
  modelValue: Ref<BingTreeSelectModelValue>
}

const mountedTreeSelects: MountedTreeSelect[] = []

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

async function waitFor(condition: () => boolean, timeout = 1_500) {
  const startedAt = performance.now()

  while (!condition()) {
    if (performance.now() - startedAt > timeout) {
      throw new Error('Timed out while waiting for the tree select layout to settle')
    }

    await wait(16)
  }
}

function mountTreeSelect(
  options: BingTreeSelectNode[],
  props: Partial<BingTreeSelectProps> = {},
) {
  const host = document.createElement('div')
  const initialValue = props.modelValue ?? (props.multiple ? [] : null)
  const modelValue = ref<BingTreeSelectModelValue>(initialValue)
  const changes: BingTreeSelectModelValue[] = []
  const liveProps = ref(props)

  host.style.width = '400px'
  host.style.margin = '80px'
  document.body.appendChild(host)

  const app = createApp({
    render: () =>
      h(BingTreeSelect, {
        ...liveProps.value,
        modelValue: modelValue.value,
        options,
        searchable: liveProps.value.searchable ?? false,
        showTreeActions: liveProps.value.showTreeActions ?? false,
        smoothScroll: liveProps.value.smoothScroll ?? false,
        'onUpdate:modelValue': (value: BingTreeSelectModelValue) => {
          modelValue.value = value
          changes.push(value)
        },
      }),
  })

  app.mount(host)
  mountedTreeSelects.push({ app, changes, host, modelValue })

  return { changes, host, modelValue, liveProps }
}

async function openTreeSelect(host: HTMLElement) {
  host.querySelector<HTMLButtonElement>('.bing-tree-select__trigger')?.click()
  await nextTick()
  await waitFor(() => document.body.querySelectorAll('.bing-tree-select__node').length >= 2)
  await wait(360)
}

function getRenderedNodes() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.bing-tree-select__node'))
}

function getVisibleNodes(viewport: HTMLElement) {
  const viewportRect = viewport.getBoundingClientRect()

  return getRenderedNodes().filter((node) => {
    const rect = node.getBoundingClientRect()

    return rect.top >= viewportRect.top && rect.bottom <= viewportRect.bottom
  })
}

function getSurface(node: HTMLElement) {
  const surface = node.querySelector<HTMLElement>('.bing-tree-select__node-surface')

  if (!surface) {
    throw new Error('Expected the tree node visual surface to be rendered')
  }

  return surface
}

function getBoundaryTargets(
  first: HTMLElement,
  second: HTMLElement,
  expectedVisualGap: number,
) {
  const firstRect = first.getBoundingClientRect()
  const secondRect = second.getBoundingClientRect()
  const firstSurfaceRect = getSurface(first).getBoundingClientRect()
  const secondSurfaceRect = getSurface(second).getBoundingClientRect()
  const x = firstSurfaceRect.left + firstSurfaceRect.width / 2
  const upperY = secondRect.top - 1
  const lowerY = secondRect.top + 1
  const upperTarget = document.elementFromPoint(x, upperY) as HTMLElement | null
  const lowerTarget = document.elementFromPoint(x, lowerY) as HTMLElement | null

  expect(upperTarget).not.toBeNull()
  expect(lowerTarget).not.toBeNull()
  expect(secondRect.top - firstRect.bottom).toBeCloseTo(0, 1)
  expect(secondSurfaceRect.top - firstSurfaceRect.bottom).toBeCloseTo(expectedVisualGap, 1)
  expect(firstRect.height).toBeGreaterThanOrEqual(firstSurfaceRect.height + expectedVisualGap)
  expect(upperY).toBeGreaterThan(firstSurfaceRect.bottom)
  expect(lowerY).toBeLessThan(secondSurfaceRect.top)
  expect(upperTarget?.closest('.bing-tree-select__node')).toBe(first)
  expect(lowerTarget?.closest('.bing-tree-select__node')).toBe(second)
  expect(getComputedStyle(upperTarget!).cursor).toBe('pointer')
  expect(getComputedStyle(lowerTarget!).cursor).toBe('pointer')

  return { lowerTarget: lowerTarget!, lowerY, upperTarget: upperTarget!, upperY, x }
}

afterEach(async () => {
  mountedTreeSelects.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
  await page.viewport(1280, 900)
})

describe('BingTreeSelect node hit areas in a browser', () => {
  it('展开面板高度平滑变化并清理内联高度，收起先移动活动节点再淡出后代', async () => {
    const options = [
      { label: '目录', value: 'dir', children: Array.from({ length: 5 }, (_, i) => ({ label: `资源 ${i}`, value: `r${i}` })) },
      { label: '其他', value: 'other' },
    ]
    const { host } = mountTreeSelect(options, { panelMinHeight: 80, panelMaxHeight: 360, virtual: false })
    await openTreeSelect(host)
    const panel = document.querySelector<HTMLElement>('.bing-tree-select__panel')!
    const trigger = host.querySelector<HTMLButtonElement>('.bing-tree-select__trigger')!
    const initialHeight = panel.offsetHeight
    // 全量回归时轮询可能错过整个 160ms 动画；记录样式变化仍验证动画发生及最终清理。
    let sawHeightTransition = false
    const heightObserver = new MutationObserver(records => {
      sawHeightTransition ||= panel.style.height !== '' || records.some(record => /(?:^|;)\s*height:/.test(record.oldValue ?? ''))
    })
    heightObserver.observe(panel, { attributes: true, attributeFilter: ['style'], attributeOldValue: true })
    try {
      getRenderedNodes()[0].querySelector<HTMLButtonElement>('.bing-tree-select__expand')!.click()
      await waitFor(() => sawHeightTransition && panel.style.height === '')
    } finally {
      heightObserver.disconnect()
    }
    expect(getRenderedNodes()).toHaveLength(7)
    expect(panel.offsetHeight).toBeGreaterThan(initialHeight)
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
    await nextTick()
    expect(document.querySelector('.bing-tree-select__node.is-active')?.textContent).toContain('资源 0')
    getRenderedNodes()[0].querySelector<HTMLButtonElement>('.bing-tree-select__expand')!.click()
    await nextTick()
    expect(document.querySelector<HTMLElement>('.bing-tree-select__node.is-active')?.dataset.nodeIndex).toBe('0')
    expect(getRenderedNodes().filter(node => node.getAttribute('aria-hidden') === 'true')).toHaveLength(5)
    await waitFor(() => getRenderedNodes().length === 2 && panel.style.height === '')
    expect(panel.offsetHeight).toBe(initialHeight)
    expect(getRenderedNodes().every(node => getComputedStyle(node).opacity === '1' && !node.inert)).toBe(true)
  })

  it('快速重复展开收起只保留最终节点，且不会对每行读取几何位置', async () => {
    const { host } = mountTreeSelect([
      { label: '目录', value: 'dir', children: Array.from({ length: 6 }, (_, i) => ({ label: `资源 ${i}`, value: i })) },
      { label: '其他', value: 'other' },
    ], { panelMinHeight: 80, virtual: false })
    await openTreeSelect(host)
    let rowReads = 0
    const first = getRenderedNodes()[0]
    const originalRect = first.getBoundingClientRect.bind(first)
    first.getBoundingClientRect = () => { rowReads++; return originalRect() }
    const button = first.querySelector<HTMLButtonElement>('.bing-tree-select__expand')!
    for (let i = 0; i < 5; i++) { button.click(); await wait(25) }
    await waitFor(() => getRenderedNodes().length === 8 && getRenderedNodes().every(node => getComputedStyle(node).opacity === '1'))
    expect(rowReads).toBe(0)
    expect(new Set(getRenderedNodes().map(node => node.id)).size).toBe(8)
    button.click()
    await waitFor(() => getRenderedNodes().length === 2)
    await wait(200)
    expect(document.querySelector<HTMLElement>('.bing-tree-select__panel')!.style.height).toBe('')
  })

  it('虚拟树展开立即更新滚动高度且只渲染视口节点，不做面板高度补间', async () => {
    const { host } = mountTreeSelect([
      { label: '目录', value: 'dir', children: Array.from({ length: 200 }, (_, i) => ({ label: `资源 ${i}`, value: i })) },
      { label: '其他', value: 'other' },
    ], { virtual: true, panelMinHeight: 80, panelMaxHeight: 260 })
    await openTreeSelect(host)
    getRenderedNodes()[0].querySelector<HTMLButtonElement>('.bing-tree-select__expand')!.click()
    await nextTick()
    const body = document.querySelector<HTMLElement>('.bing-tree-select__panel-body')!
    expect(body.style.height).toBe(`${202 * 32 + 18}px`)
    expect(getRenderedNodes().length).toBeLessThan(25)
    for (let i = 0; i < 12; i++) {
      expect(document.querySelector<HTMLElement>('.bing-tree-select__panel')!.style.height).toBe('')
      await wait(16)
    }
    const child = getRenderedNodes().find(node => node.dataset.depth === '1')!
    expect(child.getAttribute('aria-setsize')).toBe('200')
    expect(child.getAttribute('aria-posinset')).toBe('1')
  })

  it('多选标签按三档宽度折叠，清空过程中没有占位文字与退场标签重叠', async () => {
    const options = Array.from({ length: 60 }, (_, i) => ({ label: `节点 ${i + 1}`, value: i }))
    const { host, modelValue } = mountTreeSelect(options, { multiple: true, checkStrictly: true, block: true })
    modelValue.value = options.map(node => node.value)
    const counts: number[] = []
    for (const width of [180, 320, 520]) {
      host.style.width = `${width}px`
      await nextTick()
      await wait(420)
      const viewport = host.querySelector<HTMLElement>('.bing-tree-select__tags-value')!
      const tags = [...viewport.querySelectorAll<HTMLElement>('.bing-tree-select__value-tag')]
      const hidden = Number(viewport.querySelector('.bing-picker__counter')?.getAttribute('aria-label')?.slice(1))
      expect(tags.length + hidden).toBe(60)
      expect(viewport.scrollWidth).toBeLessThanOrEqual(viewport.clientWidth)
      counts.push(tags.length)
    }
    expect(counts[0]).toBeLessThan(counts[1])
    expect(counts[1]).toBeLessThan(counts[2])
    expect(host.querySelectorAll('[data-picker-measure-tag]').length).toBeLessThan(12)
    const measureCounts = new Set<number>()
    for (let i = 0; i < 10; i++) {
      await wait(16)
      measureCounts.add(host.querySelectorAll('[data-picker-measure-tag]').length)
    }
    expect(measureCounts.size).toBe(1)
    host.querySelector<HTMLButtonElement>('.bing-tree-select__clear')!.click()
    for (let i = 0; i < 18; i++) {
      await wait(16)
      const viewport = host.querySelector('.bing-tree-select__tags-value')!
      expect(Boolean(viewport.querySelector('.bing-tree-select__tags-placeholder')) && viewport.querySelectorAll('.bing-tree-select__value-tag').length > 0).toBe(false)
    }
    expect(modelValue.value).toEqual([])
    expect(host.querySelector('.bing-tree-select__tags-placeholder')).not.toBeNull()
  })

  it('默认虚拟行高随尺寸更新，滚动后的节点没有重叠且保持正确点击值', async () => {
    const options: BingTreeSelectNode[] = Array.from({ length: 120 }, (_, index) => ({
      label: `节点 ${index + 1}`, value: `node-${index + 1}`,
    }))
    const { host, liveProps, modelValue } = mountTreeSelect(options, { multiple: true, virtual: true, panelMaxHeight: 220 })
    await openTreeSelect(host)
    const viewport = document.querySelector<HTMLElement>('.bing-tree-select__panel-scroll .bing-scrollbar__viewport')!
    for (const [size, height] of [['sm', 28], ['md', 32], ['lg', 36]] as const) {
      liveProps.value = { ...liveProps.value, size }
      await nextTick()
      await waitFor(() => getRenderedNodes()[0]?.getBoundingClientRect().height === height)
      viewport.scrollTop = height * 40
      viewport.dispatchEvent(new Event('scroll'))
      await nextTick()
      await waitFor(() => Number(getRenderedNodes()[0]?.dataset.nodeIndex) >= 35)
      const [first, second] = getVisibleNodes(viewport)
      expect(second.getBoundingClientRect().top - first.getBoundingClientRect().top).toBe(height)
      expect(first.getBoundingClientRect().height).toBe(height)
      expect(first.querySelector('.bing-checkbox')!.getBoundingClientRect().height).toBeLessThanOrEqual(getSurface(first).getBoundingClientRect().height)
    }
    const target = getVisibleNodes(viewport)[1]
    target.click()
    await nextTick()
    expect(modelValue.value).toEqual([options[Number(target.dataset.nodeIndex)].value])
  })

  it('320px 视口中工具栏与面板分开，搜索和树节点不被覆盖', async () => {
    await page.viewport(320, 740)
    const { host } = mountTreeSelect([
      { label: '组件库', value: 'library', children: [{ label: '输入框', value: 'input' }] },
      { label: '文档', value: 'docs' },
    ], { multiple: true, searchable: true, showTreeActions: true })
    host.style.cssText = 'width:280px;margin:80px auto;'
    await openTreeSelect(host)
    const panel = document.querySelector('.bing-tree-select__panel')!.getBoundingClientRect()
    const rail = document.querySelector('.bing-tree-select__action-rail')!.getBoundingClientRect()
    expect(panel.left).toBeGreaterThanOrEqual(8)
    expect(panel.right).toBeLessThanOrEqual(312)
    expect(rail.left).toBeGreaterThanOrEqual(8)
    expect(rail.right).toBeLessThanOrEqual(312)
    expect(rail.right <= panel.left - 8 || rail.left >= panel.right + 8).toBe(true)
    const body = document.querySelector<HTMLElement>('.bing-tree-select__panel-body')!
    expect(body.scrollWidth).toBeLessThanOrEqual(panel.width)
  })

  it('keeps visual spacing while assigning both halves of the gap to adjacent treeitems', async () => {
    const options: BingTreeSelectNode[] = [
      { label: 'Motion branch 11', value: 'branch-11', description: 'First detail' },
      { label: 'Motion branch 12', value: 'branch-12', description: 'Second detail' },
      { label: 'Motion branch 13', value: 'branch-13', description: 'Third detail' },
    ]
    const { changes, host, modelValue } = mountTreeSelect(options, {
      multiple: true,
      virtual: false,
    })

    await openTreeSelect(host)

    const [first, second] = getRenderedNodes()
    const { lowerTarget, lowerY, upperTarget, upperY, x } = getBoundaryTargets(first, second, 4)

    upperTarget.dispatchEvent(
      new MouseEvent('mouseenter', { clientX: x, clientY: upperY }),
    )
    await nextTick()
    await waitFor(() => Boolean(document.body.querySelector('.bing-tree-select__node-detail-panel')))

    const detailPanel = document.body.querySelector<HTMLElement>(
      '.bing-tree-select__node-detail-panel',
    )

    expect(detailPanel?.textContent).toContain('Motion branch 11')

    lowerTarget.dispatchEvent(
      new MouseEvent('mouseenter', { clientX: x, clientY: lowerY }),
    )
    await nextTick()
    await waitFor(() => detailPanel?.textContent?.includes('Motion branch 12') ?? false)

    expect(document.body.querySelector('.bing-tree-select__node-detail-panel')).toBe(detailPanel)

    upperTarget.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: upperY }),
    )
    await nextTick()
    lowerTarget.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: lowerY }),
    )
    await nextTick()

    expect(changes).toEqual([['branch-11'], ['branch-11', 'branch-12']])
    expect(modelValue.value).toEqual(['branch-11', 'branch-12'])
  })

  it('uses the full virtual item height as a continuous treeitem pitch after scrolling', async () => {
    const options: BingTreeSelectNode[] = Array.from({ length: 120 }, (_, index) => ({
      label: `Virtual branch ${index + 1}`,
      value: `virtual-${index + 1}`,
    }))
    const { changes, host } = mountTreeSelect(options, {
      multiple: true,
      panelMaxHeight: 220,
      virtual: true,
      virtualItemHeight: 46,
      virtualOverscan: 3,
    })

    await openTreeSelect(host)

    const viewport = document.body.querySelector<HTMLElement>(
      '.bing-tree-select__panel-scroll .bing-scrollbar__viewport',
    )
    const panelBody = document.body.querySelector<HTMLElement>(
      '.bing-tree-select__panel-body.is-virtual',
    )

    expect(viewport).not.toBeNull()
    expect(panelBody?.style.height).toBe(`${120 * 46 + 18}px`)

    let [first, second] = getVisibleNodes(viewport!)

    expect(first.getBoundingClientRect().height).toBeCloseTo(46, 1)
    expect(getSurface(first).getBoundingClientRect().height).toBeCloseTo(40, 1)
    getBoundaryTargets(first, second, 6)

    viewport!.scrollTop = 46 * 40
    viewport!.dispatchEvent(new Event('scroll', { bubbles: true }))
    await nextTick()
    await waitFor(() => Number(getRenderedNodes()[0]?.dataset.nodeIndex) >= 35)

    const visibleNodes = getVisibleNodes(viewport!)
    first = visibleNodes[0]
    second = visibleNodes[1]

    const firstIndex = Number(first.dataset.nodeIndex)
    const secondIndex = Number(second.dataset.nodeIndex)
    const { lowerTarget, lowerY, x } = getBoundaryTargets(first, second, 6)

    expect(first.getBoundingClientRect().height).toBeCloseTo(46, 1)
    expect(second.getBoundingClientRect().top - first.getBoundingClientRect().top).toBeCloseTo(46, 1)
    expect(secondIndex).toBe(firstIndex + 1)

    lowerTarget.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: lowerY }),
    )
    await nextTick()

    expect(changes).toEqual([[options[secondIndex].value]])
  })
})

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

describe('BingTreeSelect search focus in a browser', () => {
  const nodes: BingTreeSelectNode[] = [
    { label: '设计', value: 'design', children: [{ label: '视觉', value: 'visual' }] },
    { label: '研发', value: 'dev' },
  ]

  it('打开后把焦点落到搜索框', async () => {
    const { host } = mountTreeSelect(nodes, { searchable: true })
    host.querySelector<HTMLButtonElement>('.bing-tree-select__trigger')!.click()
    await waitFor(() => document.activeElement?.closest('.bing-tree-select__search') != null)
    for (let frame = 0; frame < 6; frame++) await nextFrame()
    expect(document.activeElement?.closest('.bing-tree-select__search')).not.toBeNull()
  })

  it('打开动画期间焦点被移到组件外时，不再把焦点抢回搜索框', async () => {
    const { host } = mountTreeSelect(nodes, { searchable: true })
    const outside = document.createElement('input')
    outside.setAttribute('aria-label', '外部输入框')
    document.body.append(outside)
    let moved = false
    // 搜索框首次获得焦点后立刻移走焦点，正好落在下一帧重试之前。
    const onFocusIn = (event: FocusEvent) => {
      if (!moved && (event.target as Element).closest('.bing-tree-select__search') !== null) {
        moved = true
        queueMicrotask(() => outside.focus())
      }
    }
    document.addEventListener('focusin', onFocusIn)
    try {
      host.querySelector<HTMLButtonElement>('.bing-tree-select__trigger')!.click()
      await waitFor(() => moved)
      for (let frame = 0; frame < 6; frame++) await nextFrame()
      expect(document.activeElement).toBe(outside)
    } finally {
      document.removeEventListener('focusin', onFocusIn)
      outside.remove()
    }
  })
})
