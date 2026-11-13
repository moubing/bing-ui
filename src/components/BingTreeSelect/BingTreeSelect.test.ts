import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import BingTreeSelect from './BingTreeSelect.vue'
import type { BingTreeSelectNode } from './BingTreeSelect.types'

enableAutoUnmount(afterEach)

function searchKey(input: HTMLInputElement, key: string, extra: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...extra })
  input.dispatchEvent(event)
  return event
}

function activeLabel() {
  return document.querySelector('.bing-tree-select__node.is-active .bing-tree-select__node-label')?.textContent
}

function getBodyPanel() {
  return document.body.querySelector<HTMLElement>('.bing-tree-select__panel')
}

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  }
}

function getActionRailButton(action: string) {
  return document.body.querySelector<HTMLElement>(
    `.bing-tree-select__action-rail [data-action="${action}"]`,
  )
}

function getBodyNodes() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.bing-tree-select__node'))
}

function getBodyNodeLabels() {
  return getBodyNodes().map((node) =>
    node.querySelector('.bing-tree-select__node-label')?.textContent?.trim(),
  )
}

async function openTreeSelect(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('.bing-tree-select__trigger').trigger('click')
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

async function setSearchValue(wrapper: ReturnType<typeof mount>, value: string) {
  const input = document.body.querySelector<HTMLInputElement>(
    '.bing-tree-select__search input',
  )

  expect(input).not.toBeNull()

  input!.value = value
  input!.dispatchEvent(new Event('input', { bubbles: true }))
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()

  return input!
}

const treeOptions: BingTreeSelectNode[] = [
  {
    label: 'Design',
    value: 'design',
    children: [
      { label: 'Tokens', value: 'tokens' },
      {
        label: 'Components',
        value: 'components',
        children: [
          { label: 'Button', value: 'button' },
          { label: 'Select', value: 'select' },
        ],
      },
    ],
  },
  {
    label: 'Docs',
    value: 'docs',
    children: [{ label: 'Guide', value: 'guide' }],
  },
  {
    label: 'Disabled',
    value: 'disabled',
    disabled: true,
  },
]

function createLargeTree(groupCount: number, childCount: number): BingTreeSelectNode[] {
  return Array.from({ length: groupCount }, (_, groupIndex) => ({
    label: `Group ${groupIndex + 1}`,
    value: `group-${groupIndex + 1}`,
    children: Array.from({ length: childCount }, (_, childIndex) => ({
      label: `Item ${groupIndex + 1}.${childIndex + 1}`,
      value: `group-${groupIndex + 1}-item-${childIndex + 1}`,
    })),
  }))
}

describe('BingTreeSelect', () => {
  it('搜索框只在折叠光标的对应边界使用左右键，Alt 和 IME 按约定处理', async () => {
    const wrapper = mount(BingTreeSelect, { props: { options: treeOptions, searchable: true }, attachTo: document.body })
    await openTreeSelect(wrapper)
    const input = await setSearchValue(wrapper, 'button')
    input.setSelectionRange(2, 2)
    expect(searchKey(input, 'ArrowRight').defaultPrevented).toBe(false)
    input.setSelectionRange(0, 6)
    expect(searchKey(input, 'ArrowRight').defaultPrevented).toBe(false)
    input.setSelectionRange(6, 6)
    expect(searchKey(input, 'ArrowLeft').defaultPrevented).toBe(false)
    expect(searchKey(input, 'ArrowRight', { isComposing: true }).defaultPrevented).toBe(false)
    expect(searchKey(input, 'ArrowRight').defaultPrevented).toBe(true)
    await wrapper.vm.$nextTick()
    expect(activeLabel()).toBe('Components')
    input.setSelectionRange(0, 0)
    expect(searchKey(input, 'ArrowLeft').defaultPrevented).toBe(true)
    await wrapper.vm.$nextTick()
    expect(getBodyNodeLabels()).toEqual(['Design', 'Components'])
    input.setSelectionRange(1, 4)
    expect(searchKey(input, 'ArrowRight', { altKey: true }).defaultPrevented).toBe(true)
    await wrapper.vm.$nextTick()
    expect(getBodyNodeLabels()).toContain('Button')
    expect(activeLabel()).toBe('Components')
    searchKey(input, 'ArrowRight', { altKey: true })
    await wrapper.vm.$nextTick()
    expect(activeLabel()).toBe('Button')
    searchKey(input, 'ArrowLeft', { altKey: true })
    await wrapper.vm.$nextTick()
    expect(activeLabel()).toBe('Components')
  })

  it('空查询的星号展开同级分支，空格切换选择；查询中的空格保留输入', async () => {
    const wrapper = mount(BingTreeSelect, { props: { options: treeOptions, multiple: true, searchable: true }, attachTo: document.body })
    await openTreeSelect(wrapper)
    const input = await setSearchValue(wrapper, '')
    expect(searchKey(input, '*').defaultPrevented).toBe(true)
    await wrapper.vm.$nextTick()
    expect(getBodyNodeLabels()).toEqual(['Design', 'Tokens', 'Components', 'Docs', 'Guide', 'Disabled'])
    expect(searchKey(input, ' ').defaultPrevented).toBe(true)
    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toEqual(['design', 'tokens', 'components', 'button', 'select'])
    await setSearchValue(wrapper, 'button')
    expect(searchKey(input, ' ').defaultPrevented).toBe(false)
    expect(searchKey(input, '*').defaultPrevented).toBe(false)
    expect(searchKey(input, 'ArrowDown', { isComposing: true }).defaultPrevented).toBe(false)
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
  })

  it('搜索展开可手动收起，结束搜索恢复快照；活动后代收起前移到父级', async () => {
    const wrapper = mount(BingTreeSelect, { props: { options: treeOptions, searchable: true, defaultExpandedValues: ['docs'] }, attachTo: document.body })
    await openTreeSelect(wrapper)
    const input = await setSearchValue(wrapper, 'button')
    searchKey(input, 'End')
    await wrapper.vm.$nextTick()
    expect(activeLabel()).toBe('Button')
    getBodyNodes()[0]?.querySelector<HTMLButtonElement>('.bing-tree-select__expand')?.click()
    await wrapper.vm.$nextTick()
    expect(activeLabel()).toBe('Design')
    expect(getBodyNodeLabels()).toEqual(['Design'])
    await setSearchValue(wrapper, '')
    expect(getBodyNodeLabels()).toEqual(['Design', 'Docs', 'Guide', 'Disabled'])
  })

  it('清空查询额外保留活动节点的祖先路径，随后重新搜索仍能展开匹配路径', async () => {
    const wrapper = mount(BingTreeSelect, { props: { options: treeOptions, searchable: true, defaultExpandedValues: ['docs'] }, attachTo: document.body })
    await openTreeSelect(wrapper)
    const input = await setSearchValue(wrapper, 'button')
    searchKey(input, 'End')
    await wrapper.vm.$nextTick()
    await setSearchValue(wrapper, '')
    expect(activeLabel()).toBe('Button')
    expect(getBodyNodeLabels()).toContain('Guide')
    expect(getBodyNodeLabels()).toContain('Select')
    await setSearchValue(wrapper, 'select')
    expect(getBodyNodeLabels()).toEqual(['Design', 'Components', 'Select'])
  })

  it('普通和虚拟多选树按兄弟组提供序号、半选状态与单一活动后代', async () => {
    const wrapper = mount(BingTreeSelect, { props: { options: treeOptions, multiple: true, modelValue: ['button'], defaultExpandAll: true, virtual: true }, attachTo: document.body })
    await openTreeSelect(wrapper)
    const design = getBodyNodes()[0]!
    expect(design.getAttribute('aria-checked')).toBe('mixed')
    expect(design.hasAttribute('aria-selected')).toBe(false)
    expect(design.getAttribute('aria-setsize')).toBe('3')
    const button = getBodyNodes().find(node => node.textContent?.includes('Button'))!
    expect(button.getAttribute('aria-checked')).toBe('true')
    expect(button.getAttribute('aria-level')).toBe('3')
    expect(button.getAttribute('aria-posinset')).toBe('1')
    expect(button.getAttribute('aria-setsize')).toBe('2')
    const expand = design.querySelector('button')!
    expect(expand.getAttribute('tabindex')).toBe('-1')
    expect(expand.getAttribute('aria-hidden')).toBe('true')
    await wrapper.setProps({ virtual: false, multiple: false, modelValue: 'button' })
    const single = getBodyNodes().find(node => node.textContent?.includes('Button'))!
    expect(single.getAttribute('aria-selected')).toBe('true')
    expect(single.hasAttribute('aria-checked')).toBe(false)
  })

  it('不可选目录仍能用键盘展开，typeahead 定位可见节点且可关闭', async () => {
    const wrapper = mount(BingTreeSelect, { props: { searchable: false, options: [
      { label: '目录', value: 'dir', selectable: false, children: [{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }] },
      { label: 'Gamma', value: 'g' },
    ] }, attachTo: document.body })
    await openTreeSelect(wrapper)
    const trigger = wrapper.get('.bing-tree-select__trigger')
    await trigger.trigger('keydown', { key: 'ArrowRight' })
    await trigger.trigger('keydown', { key: 'b' })
    expect(activeLabel()).toBe('Beta')
    await trigger.trigger('keydown', { key: 'ArrowLeft' })
    expect(activeLabel()).toBe('目录')
    await wrapper.setProps({ typeahead: false })
    await trigger.trigger('keydown', { key: 'g' })
    expect(activeLabel()).toBe('目录')
    await trigger.trigger('keydown', { key: '*' })
    expect(getBodyNodeLabels()).toContain('Alpha')
  })

  it('共享搜索高亮支持中文首字母，关闭高亮不改变筛选结果，插槽获得范围', async () => {
    const ranges: unknown[] = []
    const wrapper = mount(BingTreeSelect, { props: { searchable: true, options: [{ label: '北京工作区', value: 'beijing' }] }, attachTo: document.body })
    await openTreeSelect(wrapper)
    await setSearchValue(wrapper, 'bj')
    expect(document.querySelector('.bing-picker__match')?.textContent).toBe('北京')
    await wrapper.setProps({ highlightMatches: false })
    expect(document.querySelector('.bing-picker__match')).toBeNull()
    expect(getBodyNodeLabels()).toEqual(['北京工作区'])
    wrapper.unmount()
    const custom = mount(BingTreeSelect, {
      props: { searchable: true, options: [{ label: '北京工作区', value: 'beijing' }] },
      slots: { node: props => { ranges.push(props.matchRanges); return props.node.label } }, attachTo: document.body,
    })
    await openTreeSelect(custom)
    await setSearchValue(custom, 'bj')
    expect(ranges.at(-1)).toEqual([{ start: 0, end: 2 }])
  })

  it('键盘活动节点不会被静止指针的入场事件抢走', async () => {
    const wrapper = mount(BingTreeSelect, { props: { options: treeOptions, searchable: false }, attachTo: document.body })
    await openTreeSelect(wrapper)
    const first = getBodyNodes()[0]!
    first.dispatchEvent(new MouseEvent('mousemove', { clientX: 20, clientY: 20 }))
    await wrapper.get('.bing-tree-select__trigger').trigger('keydown', { key: 'ArrowDown' })
    first.dispatchEvent(new MouseEvent('mouseenter', { clientX: 20, clientY: 20 }))
    await wrapper.vm.$nextTick()
    expect(activeLabel()).toBe('Docs')
    first.dispatchEvent(new MouseEvent('mousemove', { clientX: 30, clientY: 20 }))
    await wrapper.vm.$nextTick()
    expect(activeLabel()).toBe('Design')
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders placeholder and selected node text', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        placeholder: 'Pick a node',
      },
    })

    expect(wrapper.get('.bing-tree-select__value').text()).toBe('Pick a node')
    expect(wrapper.classes()).not.toContain('has-value')

    await wrapper.setProps({ modelValue: 'select' })

    expect(wrapper.get('.bing-tree-select__value').text()).toBe('Select')
    expect(wrapper.classes()).toContain('has-value')
  })

  it('passes glass effect variables to the root and floating panel', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        glassBlur: 6,
        glassOpacity: 0.9,
        glassSaturation: 1.05,
      },
      attachTo: document.body,
    })

    const rootStyle = wrapper.element.getAttribute('style') ?? ''

    expect(rootStyle).toContain('--bing-tree-select-glass-blur: 6px')
    expect(rootStyle).toContain('--bing-tree-select-glass-opacity: 0.9')
    expect(rootStyle).toContain('--bing-tree-select-glass-saturation: 1.05')

    await openTreeSelect(wrapper)

    const panelStyle = getBodyPanel()?.getAttribute('style') ?? ''

    expect(panelStyle).toContain('--bing-tree-select-glass-blur: 6px')
    expect(panelStyle).toContain('--bing-tree-select-glass-opacity: 0.9')
    expect(panelStyle).toContain('--bing-tree-select-glass-saturation: 1.05')
  })

  it('默认使用主题磨砂参数，关闭磨砂后恢复实色浮层', async () => {
    const wrapper = mount(BingTreeSelect, { props: { options: treeOptions } })
    expect(wrapper.attributes('style')).toContain('--bing-tree-select-glass-blur: var(--bing-glass-blur, 16px)')
    expect(wrapper.attributes('style')).toContain('--bing-tree-select-glass-opacity: var(--bing-glass-opacity, 0.85)')
    expect(wrapper.attributes('style')).toContain('--bing-tree-select-glass-saturation: var(--bing-glass-saturation, 1.05)')
    await wrapper.setProps({ glass: false })
    expect(wrapper.attributes('style')).toContain('--bing-tree-select-glass-blur: 0px')
    expect(wrapper.attributes('style')).toContain('--bing-tree-select-glass-opacity: 1')
    expect(wrapper.attributes('style')).toContain('--bing-tree-select-glass-saturation: 1')
  })

  it('opens a teleported tree panel with expanded defaults', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        defaultExpandedValues: ['design', 'components'],
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    expect(wrapper.classes()).toContain('is-open')
    expect(wrapper.get('.bing-tree-select__trigger').attributes('aria-expanded')).toBe('true')
    expect(getBodyPanel()).not.toBeNull()
    expect(document.body.querySelector('.bing-scrollbar')).not.toBeNull()
    expect(getBodyNodeLabels()).toEqual([
      'Design',
      'Tokens',
      'Components',
      'Button',
      'Select',
      'Docs',
      'Disabled',
    ])
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('marks disabled and non-selectable nodes as unavailable', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: [
          { label: 'Disabled node', value: 'disabled-node', disabled: true },
          { label: 'Group only', value: 'group-only', selectable: false },
        ],
        multiple: true,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    const [disabledNode, groupOnlyNode] = getBodyNodes()

    expect(disabledNode?.classList).toContain('is-disabled')
    expect(disabledNode?.getAttribute('aria-disabled')).toBe('true')
    expect(disabledNode?.querySelector('.bing-checkbox')?.classList).toContain('is-disabled')
    expect(groupOnlyNode?.classList).toContain('is-not-selectable')
    expect(groupOnlyNode?.getAttribute('aria-disabled')).toBe('true')
    expect(groupOnlyNode?.querySelector('.bing-checkbox')?.classList).toContain('is-disabled')

    disabledNode?.click()
    groupOnlyNode?.click()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('cascades parent selection to enabled descendants by default', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        multiple: true,
        modelValue: [],
        defaultExpandedValues: ['design', 'components'],
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)
    getBodyNodes()[0]?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      ['design', 'tokens', 'components', 'button', 'select'],
    ])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      value: ['design', 'tokens', 'components', 'button', 'select'],
      node: treeOptions[0],
    })
  })

  it('keeps branch expansion isolated from the contiguous treeitem hitbox', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        multiple: true,
        modelValue: [],
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    const firstNode = getBodyNodes()[0]
    const firstSurface = firstNode?.querySelector('.bing-tree-select__node-surface')
    const expandButton = firstNode?.querySelector<HTMLButtonElement>('.bing-tree-select__expand')

    expect(firstSurface).not.toBeNull()
    expect(expandButton).not.toBeNull()

    expandButton?.click()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('expand')).toHaveLength(1)
    expect(getBodyNodeLabels()).toContain('Tokens')

    firstNode?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      ['design', 'tokens', 'components', 'button', 'select'],
    ])
  })

  it('keeps parent and child values independent when checkStrictly is true', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        multiple: true,
        checkStrictly: true,
        modelValue: [],
        defaultExpandedValues: ['design'],
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)
    getBodyNodes()[0]?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['design']])
  })

  it('expands and collapses all branches from the action rail', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    expect(getBodyNodeLabels()).toEqual(['Design', 'Docs', 'Disabled'])

    const expandToggle = getActionRailButton('toggle-expand-all')

    expect(expandToggle?.closest('.bing-tooltip')).not.toBeNull()
    expect(expandToggle?.getAttribute('title')).toBeNull()

    expandToggle?.click()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(getBodyNodeLabels()).toContain('Button')
    expect(getBodyNodeLabels()).toContain('Guide')

    getActionRailButton('toggle-expand-all')?.click()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(getBodyNodeLabels()).toEqual(['Design', 'Docs', 'Disabled'])
  })

  it('selects and clears all tree nodes from the action rail', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        multiple: true,
        modelValue: [],
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    const selectAllToggle = getActionRailButton('toggle-select-all')

    expect(selectAllToggle).not.toBeNull()
    expect(selectAllToggle?.closest('.bing-tooltip')).not.toBeNull()
    expect(selectAllToggle?.getAttribute('title')).toBeNull()
    expect(selectAllToggle?.getAttribute('aria-label')).toBe('全选：已选 0 项，共 7 项')

    selectAllToggle?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      ['design', 'tokens', 'components', 'button', 'select', 'docs', 'guide'],
    ])

    await wrapper.setProps({
      modelValue: ['design', 'tokens', 'components', 'button', 'select', 'docs', 'guide'],
    })
    selectAllToggle?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([[]])
  })

  it('searches descendants while preserving their ancestor context', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        searchable: true,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)
    await setSearchValue(wrapper, 'button')

    expect(getBodyNodeLabels()).toEqual(['Design', 'Components', 'Button'])
  })

  it('keeps search results to matching nodes and their ancestors', async () => {
    const componentTree: BingTreeSelectNode[] = [
      {
        label: 'Creative systems',
        value: 'creative',
        children: [
          {
            label: 'Inputs',
            value: 'inputs',
            children: [
              { label: 'BingInput', value: 'bing-input' },
              { label: 'BingSelect', value: 'bing-select' },
              { label: 'BingTreeSelect', value: 'bing-tree-select' },
            ],
          },
        ],
      },
    ]
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: componentTree,
        searchable: true,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)
    await setSearchValue(wrapper, 'input')

    const labels = getBodyNodeLabels()

    expect(labels).toHaveLength(3)
    expect(labels).toContain('Creative systems')
    expect(labels).toContain('Inputs')
    expect(labels).toContain('BingInput')
    expect(labels).not.toContain('BingSelect')
    expect(labels).not.toContain('BingTreeSelect')
  })

  it('does not match arbitrary scattered search characters', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        searchable: true,
        noSearchResultsText: 'No scattered nodes',
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)
    await setSearchValue(wrapper, 'dfkd')

    expect(getBodyNodes()).toHaveLength(0)
    expect(
      document.body.querySelector('.bing-tree-select__empty')?.textContent?.trim(),
    ).toBe('No scattered nodes')
  })

  it('focuses the search input when opening with search enabled', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        searchable: true,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)
    await wrapper.vm.$nextTick()

    const input = document.body.querySelector<HTMLInputElement>(
      '.bing-tree-select__search input',
    )

    expect(input).not.toBeNull()
    expect(input?.placeholder).toBe('搜索节点（/）')
    expect(document.activeElement).toBe(input)
  })

  it('focuses the search input with slash when the panel is open', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        searchable: true,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)
    await wrapper.vm.$nextTick()

    const input = document.body.querySelector<HTMLInputElement>(
      '.bing-tree-select__search input',
    )

    expect(input).not.toBeNull()

    input!.blur()
    ;(wrapper.get('.bing-tree-select__trigger').element as HTMLElement).focus()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(input)
  })

  it('uses a virtual window for large expanded trees', async () => {
    const largeTree = createLargeTree(20, 10)
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: largeTree,
        defaultExpandAll: true,
        virtual: true,
        virtualThreshold: 0,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    const firstNode = getBodyNodes()[0]

    expect(document.body.querySelector('.bing-tree-select__panel-body.is-virtual')).not.toBeNull()
    expect(getBodyNodes().length).toBeLessThan(largeTree.length * 11)
    expect(firstNode?.querySelector('.bing-tree-select__node-surface')).not.toBeNull()
    expect(firstNode?.style.height).toBe('32px')
    expect(firstNode?.style.getPropertyValue('--bing-tree-select-node-visual-gap')).toBe('4px')
  })

  it('shows one hover detail panel for nodes with details', async () => {
    const detailTree: BingTreeSelectNode[] = [
      {
        label: 'Design',
        value: 'design',
        description: 'Design system root',
        meta: {
          area: 'system',
        },
        children: [{ label: 'Tokens', value: 'tokens' }],
      },
      {
        label: 'Plain',
        value: 'plain',
      },
    ]
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: detailTree,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    expect(document.body.querySelector('.bing-tree-select__node-description')).toBeNull()
    expect(document.body.querySelectorAll('.bing-tree-select__node-detail-indicator')).toHaveLength(1)

    getBodyNodes()[0]?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const detailPanel = document.body.querySelector('.bing-tree-select__node-detail-panel')

    expect(detailPanel).not.toBeNull()
    expect(detailPanel?.textContent).toContain('Design system root')
    expect(detailPanel?.textContent).toContain('system')

    getBodyNodes()[1]?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 58 }))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-tree-select__node-detail-panel')).toHaveLength(0)
  })

  it('keeps the detail panel in sync with keyboard navigation', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })

    const detailTree: BingTreeSelectNode[] = [
      {
        label: 'Motion',
        value: 'motion',
        description: 'Motion detail',
      },
      {
        label: 'Feedback',
        value: 'feedback',
        description: 'Feedback detail',
      },
      {
        label: 'Plain',
        value: 'plain',
      },
    ]
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: detailTree,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    getBodyNodes()[0]?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.bing-tree-select__node-detail-panel')?.textContent).toContain(
      'Motion detail',
    )

    await wrapper.get('.bing-tree-select__trigger').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const feedbackDetail = document.body.querySelector('.bing-tree-select__node-detail-panel')

    expect(feedbackDetail?.textContent).toContain('Feedback detail')
    expect(feedbackDetail?.textContent).not.toContain('Motion detail')

    await wrapper.get('.bing-tree-select__trigger').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-tree-select__node-detail-panel')).toHaveLength(0)
  })

  it('keeps the detail panel mounted when keyboard navigation scrolls the panel', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })

    const detailTree: BingTreeSelectNode[] = [
      {
        label: 'Motion',
        value: 'motion',
        description: 'Motion detail',
      },
      {
        label: 'Feedback',
        value: 'feedback',
        description: 'Feedback detail',
      },
    ]
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: detailTree,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    getBodyNodes()[0]?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-tree-select__node-detail-panel')).toHaveLength(1)

    await wrapper.get('.bing-tree-select__trigger').trigger('keydown', { key: 'ArrowDown' })

    const viewport = document.body.querySelector<HTMLElement>('.bing-scrollbar__viewport')

    expect(viewport).not.toBeNull()

    viewport!.scrollTop = 46
    viewport!.dispatchEvent(new Event('scroll', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-tree-select__node-detail-panel')).toHaveLength(1)
    expect(document.body.querySelector('.bing-tree-select__node-detail-panel')?.textContent).toContain(
      'Feedback detail',
    )
  })

  it('supports keyboard open, navigation, selection, and escape close', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        defaultExpandedValues: ['design', 'components'],
      },
      attachTo: document.body,
    })

    const trigger = wrapper.get('.bing-tree-select__trigger')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-open')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['tokens'])
    expect(wrapper.classes()).not.toContain('is-open')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await trigger.trigger('keydown', { key: 'Escape' })

    expect(wrapper.classes()).not.toContain('is-open')
  })

  it('supports explicit side placement and panel alignment', async () => {
    const originalInnerHeight = window.innerHeight
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 720,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1100,
    })

    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        defaultExpandedValues: ['design', 'components'],
        panelPlacement: 'right',
        panelAlign: 'end',
        panelGap: 28,
        panelMaxHeight: 240,
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-tree-select').element

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(260, 140, 260, 46))

    await openTreeSelect(wrapper)

    const panel = getBodyPanel()

    expect(panel?.classList).toContain('is-placement-right')
    expect(panel?.classList).toContain('is-align-end')
    expect(Number.parseFloat(panel?.style.left ?? '0')).toBe(428)
    expect(Number.parseFloat(panel?.style.left ?? '0')).toBeGreaterThan(390)
    expect(panel?.style.position).toBe('fixed')

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('clears single and multiple selection values', async () => {
    const single = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        modelValue: 'button',
      },
    })

    await single.get('.bing-tree-select__clear').trigger('click')

    expect(single.emitted('clear')).toHaveLength(1)
    expect(single.emitted('update:modelValue')?.[0]).toEqual([null])

    const multiple = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        multiple: true,
        modelValue: ['tokens', 'button'],
      },
    })

    await multiple.get('.bing-tree-select__clear').trigger('click')

    expect(multiple.emitted('clear')).toHaveLength(1)
    expect(multiple.emitted('update:modelValue')?.[0]).toEqual([[]])
  })

  it('forwards the compact smooth preset without adding keyboard or tab handling', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        defaultExpandedValues: ['design', 'components'],
        smoothScroll: {
          duration: 180,
          keyboard: true,
          smoothTouchpad: true,
          respectReducedMotion: false,
        },
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    const scrollbar = wrapper.findComponent(BingScrollbar)

    expect(scrollbar.exists()).toBe(true)
    expect(scrollbar.props('focusable')).toBe(false)
    expect(scrollbar.props('smooth')).toMatchObject({
      duration: 180,
      stepSize: 72,
      accelerationMax: 2,
      keyboard: false,
      smoothTouchpad: false,
      respectReducedMotion: true,
    })
    expect(
      document.body.querySelector('.bing-tree-select__panel-scroll .bing-scrollbar__viewport')
        ?.hasAttribute('tabindex'),
    ).toBe(false)
  })

  it('can disable smooth scrolling and cancels motion around tree height changes and close', async () => {
    const wrapper = mount(BingTreeSelect, {
      props: {
        options: treeOptions,
        defaultExpandedValues: ['design', 'components'],
        smoothScroll: false,
      },
      attachTo: document.body,
    })

    await openTreeSelect(wrapper)

    const scrollbar = wrapper.findComponent(BingScrollbar)
    const scrollbarApi = (
      scrollbar.vm as unknown as { $: { exposed: BingScrollbarExpose } }
    ).$.exposed
    const stopSpy = vi.spyOn(scrollbarApi, 'stop')
    const updateSpy = vi.spyOn(scrollbarApi, 'update')
    const designToggle = document.body.querySelector<HTMLButtonElement>(
      '.bing-tree-select__expand',
    )

    expect(scrollbar.props('smooth')).toBe(false)
    expect(designToggle).not.toBeNull()

    designToggle!.click()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(stopSpy).toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalled()
    expect(getBodyNodeLabels()).not.toContain('Tokens')

    stopSpy.mockClear()
    await wrapper.setProps({ options: [...treeOptions] })

    expect(stopSpy).toHaveBeenCalled()

    stopSpy.mockClear()
    await wrapper.get('.bing-tree-select__trigger').trigger('keydown', { key: 'Escape' })

    expect(stopSpy).toHaveBeenCalledTimes(1)
  })
})
