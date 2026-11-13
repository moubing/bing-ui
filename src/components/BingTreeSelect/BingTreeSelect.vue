<script setup lang="ts">
import '../../theme/picker.css'
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import { useClickFeedback } from '../../motion/useClickFeedback'
import BingButton from '../BingButton/BingButton.vue'
import { useFormControl, isolateFormControls } from '../BingForm/useFormControl'
import { useOverlay } from '../../utils/overlay'
import {
  computeFloatingPosition,
  getAvailableSpace,
  isVerticalSide,
  resolveFloatingSide,
  useFloatingAutoUpdate,
} from '../../utils/floating'
import { getMatchRanges, getMetaEntries, normalizeSearchText, searchQueryMatches } from '../../utils/search'
import { useActiveItem } from '../../utils/useActiveItem'
import { useOverflowTags } from '../../utils/useOverflowTags'
import { useTypeahead } from '../../utils/useTypeahead'
import { useSelectTagMotion } from '../../motion/selectTagMotion'
import { useTreeExpansionMotion } from '../../motion/treeExpansionMotion'
import { useKeyboardScrollSync } from '../../utils/useKeyboardScrollSync'
import { useDeferredBlurValidation } from '../../utils/useDeferredBlurValidation'
import { useOutsidePointerDown } from '../../utils/useOutsidePointerDown'
import { useSearchShortcutFocus } from '../../utils/useSearchShortcutFocus'
import { useVirtualList } from '../../utils/useVirtualList'
import { useOptionDetailPanel } from '../../utils/useOptionDetailPanel'
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch, useId } from 'vue'
import type { CSSProperties } from 'vue'
import {
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Info,
  ListCollapse,
  ListTree,
  ListX,
  Search,
  X,
} from '../../icons'
import { gsap } from 'gsap'
import { createSelectPanelEnter, createSelectPanelLeave } from '../../motion/selectPanelMotion'
import { enterLiquidHover, leaveLiquidHover, resetLiquidHover, setLiquidHoverOrigin } from '../../motion/liquidHover'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import BingTag from '../BingTag/BingTag.vue'
import BingTooltip from '../BingTooltip/BingTooltip.vue'
import {
  createGlassCssVariables,
  defaultGlassEffect,
} from '../../utils/glass'
import {
  compactSmoothScrollOptions,
  resolveComponentSmoothScroll,
} from '../../motion/smoothScroll'
import type { BingInputExpose } from '../BingInput/BingInput.types'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import type {
  BingTreeSelectChangePayload,
  BingTreeSelectEmits,
  BingTreeSelectModelValue,
  BingTreeSelectNode,
  BingTreeSelectPanelAlign,
  BingTreeSelectPanelPlacement,
  BingTreeSelectProps,
  BingTreeSelectValue,
} from './BingTreeSelect.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

interface TreeEntry {
  branchValues: BingTreeSelectValue[]
  childBranchValues: BingTreeSelectValue[]
  children: TreeEntry[]
  depth: number
  disabled: boolean
  index: number
  label: string
  node: BingTreeSelectNode
  parent: TreeEntry | undefined
  parentValue: BingTreeSelectValue | undefined
  path: BingTreeSelectValue[]
  pathLabels: string[]
  searchText: string
  selectable: boolean
  value: BingTreeSelectValue
}

interface TreeData {
  expandableValues: BingTreeSelectValue[]
  flat: TreeEntry[]
  roots: TreeEntry[]
  valueMap: Map<BingTreeSelectValue, TreeEntry>
}

type ResolvedPanelPlacement = Exclude<BingTreeSelectPanelPlacement, 'auto'>

const minPanelWidth = 280

const { vClickFeedback, playClickFeedback } = useClickFeedback()
const props = withDefaults(defineProps<BingTreeSelectProps>(), {
  id: undefined,
  modelValue: null,
  options: () => [],
  multiple: false,
  checkStrictly: false,
  placeholder: '请选择节点',
  disabled: undefined,
  clearable: true,
  showSelectAll: true,
  selectAllText: '全选',
  clearAllText: '清空已选',
  showTreeActions: true,
  expandAllText: '全部展开',
  collapseAllText: '全部收起',
  emptyText: '暂无节点',
  searchable: 'auto',
  typeahead: true,
  highlightMatches: true,
  searchPlaceholder: '搜索节点（/）',
  noSearchResultsText: '未找到匹配节点',
  smoothScroll: true,
  defaultExpandedValues: () => [],
  defaultExpandAll: false,
  size: undefined,
  block: false,
  glass: defaultGlassEffect.glass,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
  panelMinHeight: 180,
  panelMaxHeight: 360,
  panelPlacement: 'auto',
  panelAlign: 'start',
  panelGap: 10,
  virtual: 'auto',
  virtualThreshold: 120,
  virtualItemHeight: undefined,
  virtualOverscan: 5,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
})

const emit = defineEmits<BingTreeSelectEmits>()
const clientReady = useClientReady()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby } = useFormControl(props)
isolateFormControls()

const slots = defineSlots<{
  value?: (props: { selectedNodes: BingTreeSelectNode[]; placeholder: string }) => unknown
  node?: (props: { node: BingTreeSelectNode; selected: boolean; indeterminate: boolean; depth: number; expanded: boolean; matchRanges: { start: number; end: number }[] }) => unknown
  'node-detail'?: (props: { node: BingTreeSelectNode; selected: boolean; indeterminate: boolean; depth: number; expanded: boolean }) => unknown
}>()

const resolvedSmoothScroll = computed(() =>
  resolveComponentSmoothScroll(props.smoothScroll, compactSmoothScrollOptions, {
    keyboard: false,
    smoothTouchpad: false,
    respectReducedMotion: true,
  }),
)

const treeSelectId = `bing-tree-select-${useId()}`
const listboxId = `${treeSelectId}-listbox`

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const searchInputRef = ref<BingInputExpose | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const toolbarRef = ref<HTMLElement | null>(null)
const actionRailRef = ref<HTMLElement | null>(null)
const panelScrollRef = ref<BingScrollbarExpose | null>(null)
const nodeDetailPanelRef = ref<HTMLElement | null>(null)
const nodeDetailContentRef = ref<HTMLElement | null>(null)
const isOpen = ref(false)
const shouldRenderPanel = ref(false)
const activeItem = useActiveItem({ isPointerBlocked: () => isKeyboardScrollSyncing.value })
const { isKeyboardNavigating } = activeItem
const activeValue = computed<BingTreeSelectValue | undefined>({
  get: () => treeData.value.flat[activeItem.activeIndex.value]?.value,
  set: value => { activeItem.activeIndex.value = value === undefined ? -1 : treeData.value.valueMap.get(value)?.index ?? -1 },
})
const searchQuery = ref('')
const expandedValues = ref<BingTreeSelectValue[]>([])
const searchExpandedValues = ref<BingTreeSelectValue[]>([])
let expansionBeforeSearch: BingTreeSelectValue[] | undefined
const panelScrollHeight = ref(0)
const inheritedGuideStyle = ref<CSSProperties>({})
const panelPosition = ref({
  align: 'start' as BingTreeSelectPanelAlign,
  left: 0,
  minHeight: 180,
  maxHeight: 360,
  placement: 'bottom' as ResolvedPanelPlacement,
  top: 0,
  width: minPanelWidth,
})

let panelTimeline: gsap.core.Timeline | undefined
let hasInitializedExpansion = false

const outsidePointer = useOutsidePointerDown(handleWindowPointerDown)
const searchFocus = useSearchShortcutFocus({
  input: searchInputRef,
  isOpen: () => isOpen.value,
  isSearchable: () => isSearchable.value,
  ownsTarget: isTreeSelectInteractionTarget,
})
const blurValidation = useDeferredBlurValidation({
  formItem,
  isOpen: () => isOpen.value,
  isInteractionTarget: isTreeSelectInteractionTarget,
})
const {
  isSyncing: isKeyboardScrollSyncing,
  start: startKeyboardScrollSync,
  scheduleEnd: scheduleKeyboardScrollSyncEnd,
  finish: finishKeyboardScrollSync,
} = useKeyboardScrollSync(isKeyboardNavigating)
const nodeDetail = useOptionDetailPanel({
  listPanel: panelRef,
  detailPanel: nodeDetailPanelRef,
  detailContent: nodeDetailContentRef,
  itemSelector: '.bing-tree-select__node',
  indexAttribute: 'nodeIndex',
  isOpen: () => isOpen.value,
  isKeyboardNavigating,
  getItemState: (index) => {
    const entry = treeData.value.flat[index]

    return entry ? { disabled: entry.disabled, hasDetail: nodeHasDetail(entry) } : undefined
  },
  getItemElement: getNodeElementByIndex,
  getItemSurface: getNodeSurfaceElement,
  getKeyboardIndex: () => {
    if (activeValue.value === undefined) {
      return -1
    }

    const entry = visibleTreeItems.value.find((item) =>
      valuesEqual(item.value, activeValue.value as BingTreeSelectValue),
    )

    return entry?.index ?? -1
  },
  onPointerRestore: (index) => {
    const entry = treeData.value.flat[index]

    if (entry?.selectable) {
      activeValue.value = entry.value
    }
  },
  // 树节点详情保持原尺寸出现，避免缩放让文字发虚。
  hiddenScale: 1,
  enterEase: 'power3.out',
  force3D: false,
})
const {
  index: nodeDetailIndex,
  shouldRender: shouldRenderNodeDetailPanel,
  placement: nodeDetailPlacement,
} = nodeDetail

const normalizedPanelMinHeight = computed(() =>
  typeof props.panelMinHeight === 'number' ? `${props.panelMinHeight}px` : props.panelMinHeight,
)

const normalizedPanelMaxHeight = computed(() =>
  typeof props.panelMaxHeight === 'number' ? `${props.panelMaxHeight}px` : props.panelMaxHeight,
)

const normalizedVirtualThreshold = computed(() =>
  Math.max(0, Math.floor(props.virtualThreshold)),
)

const nodeHeight = computed(() => ({ sm: 28, md: 32, lg: 36 })[resolvedSize.value])
const normalizedVirtualItemHeight = computed(() =>
  props.virtualItemHeight !== undefined && Number.isFinite(props.virtualItemHeight)
    ? Math.max(nodeHeight.value, Math.floor(props.virtualItemHeight))
    : nodeHeight.value,
)

const normalizedVirtualOverscan = computed(() =>
  Math.max(0, Math.floor(props.virtualOverscan)),
)

const virtualList = useVirtualList({
  count: () => visibleTreeItems.value.length,
  mode: () => props.virtual,
  threshold: () => normalizedVirtualThreshold.value,
  itemHeight: () => normalizedVirtualItemHeight.value,
  overscan: () => normalizedVirtualOverscan.value,
  scrollbar: panelScrollRef,
  fallbackViewportHeight: panelScrollHeight,
  itemHeightVar: '--bing-tree-select-virtual-item-height',
})
const {
  enabled: usesVirtualOptions,
  scrollTop: virtualScrollTop,
  viewportHeight: virtualViewportHeight,
  startIndex: virtualStartIndex,
  endIndex: virtualEndIndex,
  bodyStyle: panelBodyStyle,
  stackStyle: nodeStackStyle,
  refresh: updateScrollbarMetrics,
  clampScroll: clampVirtualScrollTop,
} = virtualList

const treeData = computed(() => buildTreeData(props.options))
const expandedValueSet = computed(() => new Set(hasSearchQuery.value ? searchExpandedValues.value : expandedValues.value))
const normalizedSearchQuery = computed(() => normalizeSearchText(searchQuery.value))
const hasSearchQuery = computed(
  () => isSearchable.value && normalizedSearchQuery.value.length > 0,
)

const isSearchable = computed(() => {
  if (props.searchable === true) {
    return true
  }

  if (props.searchable === false) {
    return false
  }

  return treeData.value.flat.length > 8
})
const searchInputPlaceholder = computed(() =>
  props.searchPlaceholder.includes('/') ? props.searchPlaceholder : `${props.searchPlaceholder} (/)`,
)

const searchIncludedValues = computed(() => {
  const included = new Set<BingTreeSelectValue>()
  if (hasSearchQuery.value) {
    for (const entry of treeData.value.flat) {
      if (entryMatchesSearch(entry, normalizedSearchQuery.value)) entry.path.forEach(value => included.add(value))
    }
  }
  return included
})
const visibleTreeItems = computed(() => getExpandedVisibleItems(treeData.value.roots))
const siblingPositions = computed(() => {
  const positions = new Map<number, { size: number; position: number }>()
  function visit(siblings: TreeEntry[]) {
    const included = siblings.filter(entry => !hasSearchQuery.value || searchIncludedValues.value.has(entry.value))
    included.forEach((entry, index) => {
      positions.set(entry.index, { size: included.length, position: index + 1 })
      visit(entry.children)
    })
  }
  visit(treeData.value.roots)
  return positions
})
const nodeMatchRanges = computed(() => new Map(treeData.value.flat.map(entry => [
  entry.index,
  props.highlightMatches && hasSearchQuery.value ? getMatchRanges(entry.label, normalizedSearchQuery.value) : [],
])))
const activePath = computed(() => new Set(getActiveEntry()?.path ?? []))

const typeahead = useTypeahead({
  enabled: () => props.typeahead && !isSearchable.value && isOpen.value,
  items: () => visibleTreeItems.value.map(entry => ({ label: entry.label, disabled: !isNodeNavigable(entry) })),
  activeIndex: () => visibleTreeItems.value.findIndex(entry => entry.value === activeValue.value),
  onMatch: index => {
    const entry = visibleTreeItems.value[index]
    if (entry) activateEntry(entry)
  },
})


const renderedTreeItems = computed(() => {
  if (!usesVirtualOptions.value) {
    return visibleTreeItems.value
  }

  return visibleTreeItems.value.slice(virtualStartIndex.value, virtualEndIndex.value)
})
// 保留离场项的 Transition 外壳，避免 TransitionGroup 隐含的逐行布局测量。
const retainedTreeItems = shallowRef<TreeEntry[]>([])
const renderedNodeIndices = computed(() => new Set(renderedTreeItems.value.map(entry => entry.index)))
const motionTreeItems = computed(() => [...renderedTreeItems.value, ...retainedTreeItems.value]
  .sort((left, right) => left.index - right.index))


const virtualNodeStyle = computed<CSSProperties | undefined>(() => {
  if (!usesVirtualOptions.value) {
    return undefined
  }

  const visualGap = Math.min(6, Math.max(4, normalizedVirtualItemHeight.value - 28))

  return {
    height: `${normalizedVirtualItemHeight.value}px`,
    '--bing-tree-select-node-visual-gap': `${visualGap}px`,
  } as CSSProperties
})

const rawSelectedValues = computed<BingTreeSelectValue[]>(() => {
  const value = props.modelValue

  if (props.multiple) {
    return Array.isArray(value) ? value : value === null ? [] : [value]
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? [value[0] as BingTreeSelectValue] : []
  }

  return value === null ? [] : [value]
})

const selectedValues = computed<BingTreeSelectValue[]>(() => {
  if (props.multiple && !props.checkStrictly) {
    return hydrateCascadeValues(rawSelectedValues.value)
  }

  return orderKnownValues(rawSelectedValues.value)
})

const selectedValueSet = computed(() => new Set(selectedValues.value))
const selectedNodes = computed(() => getNodesForValue(selectedValues.value))
const usesDefaultTags = computed(() => props.multiple && !slots.value)
const hasSelection = computed(() => selectedNodes.value.length > 0)
const canClear = computed(() => props.clearable && !resolvedDisabled.value && hasSelection.value)
const tagMotion = useSelectTagMotion()
const {
  tagsViewportRef, tagMeasureRef,
  visibleItems: visibleSelectedNodes, hiddenTagCount: hiddenSelectedCount,
  measurementItems: measuredSelectedNodes, overflowCounts: measuredOverflowCounts,
} = useOverflowTags({
  items: () => selectedNodes.value,
  enabled: () => usesDefaultTags.value,
  paused: () => tagMotion.isAnimating.value,
  layoutKey: () => `${resolvedSize.value}:${canClear.value}`,
})

const selectTagSize = computed<'sm' | 'md'>(() => (resolvedSize.value === 'lg' ? 'md' : 'sm'))
const hasExpandableNodes = computed(() => treeData.value.expandableValues.length > 0)
const canUseTreeActions = computed(() => props.showTreeActions && hasExpandableNodes.value)
const canSelectAll = computed(() => props.multiple && props.showSelectAll)
const bulkSelectableEntries = computed(() => {
  const entries = hasSearchQuery.value
    ? treeData.value.flat.filter((entry) =>
        entryMatchesSearch(entry, normalizedSearchQuery.value),
      )
    : treeData.value.flat

  return entries.filter(isNodeActionable)
})
const bulkSelectableValues = computed(() =>
  uniqueValues(
    bulkSelectableEntries.value.flatMap((entry) =>
      props.checkStrictly ? [entry.value] : entry.branchValues,
    ),
  ),
)
const hasBulkSelectableNodes = computed(() => bulkSelectableValues.value.length > 0)
const selectedBulkNodeCount = computed(
  () => bulkSelectableEntries.value.filter((entry) => isNodeSelected(entry)).length,
)
const allBulkNodesSelected = computed(
  () =>
    hasBulkSelectableNodes.value &&
    bulkSelectableValues.value.every((value) => selectedValueSet.value.has(value)),
)
const someBulkNodesSelected = computed(
  () =>
    bulkSelectableValues.value.some((value) => selectedValueSet.value.has(value)) &&
    !allBulkNodesSelected.value,
)
const canUseActionRail = computed(() => canSelectAll.value || canUseTreeActions.value)
const expandedKnownCount = computed(
  () =>
    treeData.value.expandableValues.filter((value) =>
      expandedValueSet.value.has(value),
    ).length,
)
const allNodesExpanded = computed(
  () =>
    hasExpandableNodes.value &&
    expandedKnownCount.value === treeData.value.expandableValues.length,
)
const activeNodeId = computed(() => {
  if (!isOpen.value || activeValue.value === undefined) {
    return undefined
  }

  const entry = treeData.value.valueMap.get(activeValue.value)

  return entry ? getNodeId(entry) : undefined
})

const nodeDetailEntry = computed(() => treeData.value.flat[nodeDetailIndex.value])
const nodeDetailNode = computed(() => nodeDetailEntry.value?.node)
const nodeDetailSelected = computed(() =>
  nodeDetailEntry.value ? isNodeSelected(nodeDetailEntry.value) : false,
)
const nodeDetailIndeterminate = computed(() =>
  nodeDetailEntry.value ? isNodeIndeterminate(nodeDetailEntry.value) : false,
)
const nodeDetailText = computed(() => nodeDetailNode.value?.description)
const nodeDetailMetaEntries = computed(() => getNodeMetaEntries(nodeDetailNode.value))

const displayText = computed(() => {
  if (!hasSelection.value) {
    return props.placeholder
  }

  const labels = selectedNodes.value.map((node) => node.label)

  if (props.multiple && labels.length > 2) {
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
  }

  return labels.join(props.multiple ? ', ' : '')
})

const rootClasses = computed(() => [
  'bing-tree-select',
  'bing-picker',
  `bing-picker--${resolvedSize.value}`,
  `bing-picker--status-${resolvedStatus.value}`,
  `bing-tree-select--${resolvedSize.value}`,
  `bing-tree-select--status-${resolvedStatus.value}`,
  {
    'is-open': isOpen.value,
    'is-disabled': resolvedDisabled.value,
    'is-invalid': resolvedStatus.value === 'error',
    'is-block': props.block || Boolean(formItem),
    'has-value': hasSelection.value,
    'is-multiple': props.multiple,
    'is-cascade': props.multiple && !props.checkStrictly,
  },
])

const glassStyle = computed(() =>
  createGlassCssVariables('bing-tree-select', {
    glass: props.glass,
    glassBlur: props.glassBlur,
    glassOpacity: props.glassOpacity,
    glassSaturation: props.glassSaturation,
  }),
)

const rootStyle = computed<CSSProperties>(() => ({
  ...glassStyle.value,
}))

const panelClasses = computed(() => [
  'bing-tree-select__panel',
  'bing-picker__panel',
  `is-placement-${panelPosition.value.placement}`,
  `is-align-${panelPosition.value.align}`,
  {
    'is-glass': props.glass,
    'is-searching': hasSearchQuery.value,
    'is-multiple': props.multiple,
    'is-keyboard-navigating': isKeyboardNavigating.value,
    'is-keyboard-scrolling': isKeyboardScrollSyncing.value,
  },
])

const panelAutoUpdate = useFloatingAutoUpdate(() => {
  updatePanelPosition()
  updateScrollbarMetrics()
  nodeDetail.updatePosition()
}, {
  enabled: () => isOpen.value,
})

const overlayZIndex = useConfigZIndex('popover')
const overlay = useOverlay({
  open: () => shouldRenderPanel.value,
  elements: () => [rootRef.value, panelRef.value, actionRailRef.value, nodeDetailPanelRef.value],
  zIndex: () => overlayZIndex.value,
  onEscape: () => closePanel(true),
})

const panelStyle = computed<CSSProperties>(() => ({
  ...inheritedGuideStyle.value,
  position: 'fixed',
  top: `${panelPosition.value.top}px`,
  left: `${panelPosition.value.left}px`,
  width: `${panelPosition.value.width}px`,
  zIndex: overlay.zIndex.value,
  '--bing-tree-select-panel-min-height': `${panelPosition.value.minHeight}px`,
  '--bing-tree-select-panel-max-height': `${panelPosition.value.maxHeight}px`,
  '--bing-picker-panel-min-height': `${panelPosition.value.minHeight}px`,
  '--bing-picker-panel-max-height': `${panelPosition.value.maxHeight}px`,
  '--bing-tree-select-node-height': `${nodeHeight.value}px`,
  '--bing-tree-select-node-font-size': resolvedSize.value === 'sm' ? '13px' : '14px',
  '--bing-tree-select-node-line-height': resolvedSize.value === 'sm' ? '18px' : '20px',
  ...glassStyle.value,
}))

const actionRailStyle = computed<CSSProperties>(() => {
  const railWidth = 32
  const railGap = 8
  const viewportPadding = 8
  const preferredLeft = panelPosition.value.left - railWidth - railGap
  const fallbackLeft = panelPosition.value.left + panelPosition.value.width + railGap
  const left =
    preferredLeft >= viewportPadding || !isBrowser()
      ? preferredLeft
      : clamp(
          fallbackLeft,
          viewportPadding,
          Math.max(viewportPadding, window.innerWidth - railWidth - viewportPadding),
        )

  return {
    position: 'fixed',
    top: `${panelPosition.value.top}px`,
    left: `${left}px`,
    zIndex: overlay.zIndex.value + 1,
    ...glassStyle.value,
  }
})

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function valuesEqual(left: BingTreeSelectValue, right: BingTreeSelectValue) {
  return left === right
}

function uniqueValues(values: BingTreeSelectValue[]) {
  return [...new Set(values.filter(value => value === value))]
}

function getNodeMetaEntries(node: BingTreeSelectNode | undefined) {
  return getMetaEntries(node?.meta)
}

function getNodeSearchText(node: BingTreeSelectNode) {
  return normalizeSearchText(
    [
      node.label,
      node.value,
      node.description,
      ...getNodeMetaEntries(node).flatMap((entry) => [entry.key, entry.value]),
    ].join(' '),
  )
}

function entryMatchesSearch(entry: TreeEntry, query: string) {
  return searchQueryMatches(entry.searchText, query, true)
}

function buildTreeData(nodes: BingTreeSelectNode[]): TreeData {
  const flat: TreeEntry[] = []
  const valueMap = new Map<BingTreeSelectValue, TreeEntry>()
  let index = 0

  function visit(
    list: BingTreeSelectNode[],
    depth: number,
    parent: TreeEntry | undefined,
    parentPath: BingTreeSelectValue[],
    parentLabels: string[],
  ) {
    return list.map((node) => {
      const path = [...parentPath, node.value]
      const pathLabels = [...parentLabels, node.label]
      const entry: TreeEntry = {
        branchValues: [],
        childBranchValues: [],
        children: [],
        depth,
        disabled: Boolean(node.disabled),
        index,
        label: node.label,
        node,
        parent,
        parentValue: parent?.value,
        path,
        pathLabels,
        searchText: getNodeSearchText(node),
        selectable: node.selectable !== false && !node.disabled,
        value: node.value,
      }

      index += 1
      flat.push(entry)
      valueMap.set(entry.value, entry)
      entry.children = visit(
        Array.isArray(node.children) ? node.children : [],
        depth + 1,
        entry,
        path,
        pathLabels,
      )
      entry.childBranchValues = uniqueValues(
        entry.children.flatMap((child) => child.branchValues),
      )
      entry.branchValues = uniqueValues([
        ...(entry.selectable ? [entry.value] : []),
        ...entry.childBranchValues,
      ])

      return entry
    })
  }

  const roots = visit(nodes, 0, undefined, [], [])
  const expandableValues = flat
    .filter((entry) => entry.children.length > 0)
    .map((entry) => entry.value)

  return {
    expandableValues,
    flat,
    roots,
    valueMap,
  }
}

function getExpandedVisibleItems(entries: TreeEntry[]) {
  const items: TreeEntry[] = []

  function append(entry: TreeEntry) {
    if (hasSearchQuery.value && !searchIncludedValues.value.has(entry.value)) return
    items.push(entry)

    if (entry.children.length > 0 && expandedValueSet.value.has(entry.value)) {
      entry.children.forEach(append)
    }
  }

  entries.forEach(append)

  return items
}

function orderKnownValues(values: BingTreeSelectValue[]) {
  const selectedSet = new Set(values)

  return treeData.value.flat
    .filter((entry) => selectedSet.has(entry.value))
    .map((entry) => entry.value)
}

function normalizeCascadeSet(values: Set<BingTreeSelectValue>) {
  const nextValues = new Set(values)

  function visit(entry: TreeEntry) {
    entry.children.forEach(visit)

    if (!entry.selectable || entry.children.length === 0) {
      return
    }

    if (
      entry.childBranchValues.length > 0 &&
      entry.childBranchValues.every((value) => nextValues.has(value))
    ) {
      nextValues.add(entry.value)
      return
    }

    nextValues.delete(entry.value)
  }

  treeData.value.roots.forEach(visit)

  return orderKnownValues([...nextValues])
}

function hydrateCascadeValues(values: BingTreeSelectValue[]) {
  const nextValues = new Set<BingTreeSelectValue>()

  values.forEach((value) => {
    const entry = treeData.value.valueMap.get(value)

    if (!entry) {
      return
    }

    entry.branchValues.forEach((branchValue) => nextValues.add(branchValue))
  })

  return normalizeCascadeSet(nextValues)
}

function getNodesForValue(value: BingTreeSelectModelValue | BingTreeSelectValue[]) {
  const values = Array.isArray(value) ? value : value === null ? [] : [value]
  const selectedSet = new Set(values)

  return treeData.value.flat
    .filter((entry) => selectedSet.has(entry.value))
    .map((entry) => entry.node)
}

function getNodeId(entry: TreeEntry) {
  return `${treeSelectId}-node-${entry.index}`
}

function isNodeExpanded(entry: TreeEntry) {
  if (entry.children.length === 0) {
    return false
  }

  return expandedValueSet.value.has(entry.value)
}

function isNodeSelected(entry: TreeEntry) {
  if (props.multiple && !props.checkStrictly) {
    return (
      entry.branchValues.length > 0 &&
      entry.branchValues.every((value) => selectedValueSet.value.has(value))
    )
  }

  return selectedValueSet.value.has(entry.value)
}

function isNodeIndeterminate(entry: TreeEntry) {
  if (!props.multiple || props.checkStrictly || entry.branchValues.length === 0) {
    return false
  }

  const selectedCount = entry.branchValues.filter((value) =>
    selectedValueSet.value.has(value),
  ).length

  return selectedCount > 0 && selectedCount < entry.branchValues.length
}

function isNodeActionable(entry: TreeEntry) {
  return entry.selectable && !entry.disabled
}

function isNodeNavigable(entry: TreeEntry) {
  return !entry.disabled && (entry.selectable || entry.children.length > 0)
}

function getNodeStyle(entry: TreeEntry): CSSProperties {
  const guides = entry.path.slice(0, -1).map((value, depth) => {
    const color = activePath.value.has(value) ? 'var(--bing-border-strong, var(--bing-control-hover-border))' : 'var(--bing-tree-select-guide-color, var(--bing-border))'
    return `linear-gradient(${color}, ${color}) calc(${depth} * var(--bing-tree-select-indent, 16px) + 17px) 0 / 1px 100% no-repeat`
  })
  return { ...virtualNodeStyle.value, '--bing-tree-depth': entry.depth, '--bing-tree-guides': guides.join(',') || 'none' } as CSSProperties
}

function getLabelParts(entry: TreeEntry) {
  const parts: { text: string; match: boolean }[] = []
  let offset = 0
  for (const range of nodeMatchRanges.value.get(entry.index) ?? []) {
    if (range.start > offset) parts.push({ text: entry.label.slice(offset, range.start), match: false })
    parts.push({ text: entry.label.slice(range.start, range.end), match: true })
    offset = range.end
  }
  if (offset < entry.label.length) parts.push({ text: entry.label.slice(offset), match: false })
  return parts
}

function emitValue(value: BingTreeSelectModelValue, node?: BingTreeSelectNode) {
  blurValidation.cancel()

  const payload: BingTreeSelectChangePayload = {
    value,
    node,
    nodes: getNodesForValue(value),
  }

  emit('update:modelValue', value)
  emit('change', payload)
  formItem?.handleControlChange()
}

function getMultipleModelValue(values: BingTreeSelectValue[]) {
  if (props.checkStrictly) {
    return orderKnownValues(values)
  }

  return normalizeCascadeSet(new Set(values))
}

function getNumericPanelMinHeight() {
  if (typeof props.panelMinHeight === 'number') {
    return Math.max(0, props.panelMinHeight)
  }

  const parsed = Number.parseFloat(props.panelMinHeight)

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 180
}

function getNumericPanelMaxHeight() {
  if (typeof props.panelMaxHeight === 'number') {
    return Math.max(0, props.panelMaxHeight)
  }

  const parsed = Number.parseFloat(props.panelMaxHeight)

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 360
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function nodeHasDetail(entry: TreeEntry | undefined) {
  if (!entry) {
    return false
  }

  return Boolean(
    slots['node-detail'] ||
      entry.node.description ||
      getNodeMetaEntries(entry.node).length > 0,
  )
}

function getNodeElementByIndex(index: number) {
  if (index < 0 || !isBrowser()) {
    return null
  }

  const entry = treeData.value.flat[index]

  return entry ? (document.getElementById(getNodeId(entry)) as HTMLElement | null) : null
}

function getNodeSurfaceElement(nodeElement: HTMLElement) {
  return nodeElement.querySelector<HTMLElement>('.bing-tree-select__node-surface') ?? nodeElement
}

function updatePanelPosition() {
  if (!isBrowser() || !rootRef.value || !panelRef.value) {
    return
  }

  const viewportPadding = 12
  const panelGap = Number.isFinite(props.panelGap)
    ? Math.max(0, props.panelGap)
    : 10
  const anchorRect = rootRef.value.getBoundingClientRect()
  const rootCss = getComputedStyle(rootRef.value)
  inheritedGuideStyle.value = {
    '--bing-tree-select-indent': rootCss.getPropertyValue('--bing-tree-select-indent').trim() || undefined,
    '--bing-tree-select-guide-color': rootCss.getPropertyValue('--bing-tree-select-guide-color').trim() || undefined,
  } as CSSProperties
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const desiredMaxHeight = getNumericPanelMaxHeight()
  const desiredMinHeight = Math.min(getNumericPanelMinHeight(), desiredMaxHeight)
  const panelBody = panelRef.value.querySelector<HTMLElement>('.bing-tree-select__panel-body')
  const toolbarHeight = toolbarRef.value?.getBoundingClientRect().height ?? 0
  const panelChromeHeight = 2
  const measuredContentHeight = virtualList.getContentHeight() ?? panelBody?.scrollHeight ?? 0
  const estimatedContentHeight = Math.max(
    normalizedVirtualItemHeight.value,
    visibleTreeItems.value.length * normalizedVirtualItemHeight.value,
  )
  const contentHeight = measuredContentHeight || estimatedContentHeight
  const naturalPanelHeight = toolbarHeight + contentHeight + panelChromeHeight
  const desiredPanelHeight = clamp(
    naturalPanelHeight,
    desiredMinHeight,
    desiredMaxHeight,
  )
  const layout = {
    gap: panelGap,
    padding: viewportPadding,
    viewport: { width: viewportWidth, height: viewportHeight },
  }
  const placement: ResolvedPanelPlacement =
    props.panelPlacement === 'auto'
      ? resolveFloatingSide({
          anchor: anchorRect,
          floating: { width: 0, height: desiredPanelHeight },
          side: 'bottom',
          ...layout,
        })
      : props.panelPlacement
  const align = props.panelAlign
  const availableHeight = isVerticalSide(placement)
    ? getAvailableSpace(anchorRect, placement, layout)
    : viewportHeight - viewportPadding * 2
  const maxHeight = Math.max(0, Math.min(desiredMaxHeight, availableHeight || desiredMaxHeight))
  const minHeight = Math.min(desiredMinHeight, maxHeight)
  const panelHeight = clamp(naturalPanelHeight, minHeight, maxHeight)
  const scrollHeight = Math.max(0, panelHeight - toolbarHeight - panelChromeHeight)
  const anchorWidth = anchorRect.width || rootRef.value.offsetWidth || minPanelWidth
  // 窄屏也为外侧工具按钮保留空间，避免按钮压住搜索框和树节点。
  const actionRailSpace = canUseActionRail.value ? 40 : 0
  const maxWidth = Math.max(0, viewportWidth - viewportPadding * 2 - actionRailSpace)
  const width = Math.min(Math.max(anchorWidth, minPanelWidth), maxWidth)
  const position = computeFloatingPosition({
    anchor: anchorRect,
    floating: { width, height: panelHeight },
    side: placement,
    flip: 'none',
    align: align === 'middle' ? 'center' : align,
    ...layout,
  })
  let left = position.left
  if (canUseActionRail.value && left - actionRailSpace < 8 && left + width + actionRailSpace > viewportWidth - 8) {
    left = Math.max(viewportPadding, viewportWidth - viewportPadding - actionRailSpace - width)
  }
  const top = position.top

  panelScrollHeight.value = scrollHeight
  virtualViewportHeight.value = scrollHeight
  panelPosition.value = {
    align,
    left,
    minHeight,
    maxHeight,
    placement,
    top,
    width,
  }
}

function handlePanelWheel(event: WheelEvent) {
  nodeDetail.rememberPointer(event)
}

function handlePanelScroll(event: Event) {
  const viewport = event.target as HTMLElement | null

  if (!viewport) {
    return
  }

  virtualList.readViewport(viewport)

  if (isKeyboardNavigating.value) {
    nodeDetail.scheduleKeyboardShow()
    scheduleKeyboardScrollSyncEnd()
    return
  }

  nodeDetail.handleListScroll()
}

function getNodeElements() {
  const panel = panelRef.value

  if (!panel) {
    return []
  }

  return Array.from(panel.querySelectorAll<HTMLElement>('.bing-tree-select__node'))
}

function getActionButtonElements() {
  const actionRail = actionRailRef.value

  if (!actionRail) {
    return []
  }

  return Array.from(actionRail.querySelectorAll<HTMLElement>('.bing-tree-select__action-button'))
}

function killPanelTimeline() {
  panelTimeline?.kill()
  panelTimeline = undefined
}

function playOpenAnimation() {
  const panel = panelRef.value

  if (!panel) {
    return
  }

  const nodes = getNodeElements()
  const actionRail = actionRailRef.value
  const actionButtons = getActionButtonElements()
  const targets = [panel, actionRail, ...actionButtons, ...nodes].filter(Boolean)
  killPanelTimeline()
  gsap.killTweensOf(targets)

  if (prefersReducedMotion()) {
    gsap.set(targets, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      scale: 1,
      scaleX: 1,
      scaleY: 1,
      clearProps: 'transform',
    })
    return
  }

  panelTimeline = createSelectPanelEnter({
    panel,
    items: nodes,
    actionRail,
    actionButtons,
    placement: panelPosition.value.placement,
    align: panelPosition.value.align,
    onComplete: () => {
      panelTimeline = undefined
    },
  })
}

function finishClose(restoreFocus: boolean) {
  resetNodeLiquids()
  shouldRenderPanel.value = false
  activeValue.value = undefined
  isKeyboardNavigating.value = false
  nodeDetail.hide(true)
  clearSearchQuery()

  if (restoreFocus) {
    triggerRef.value?.focus()
  }
}

function playCloseAnimation(restoreFocus = false) {
  const panel = panelRef.value

  if (!panel) {
    finishClose(restoreFocus)
    return
  }

  const nodes = getNodeElements()
  const actionRail = actionRailRef.value
  const actionButtons = getActionButtonElements()
  killPanelTimeline()
  gsap.killTweensOf(
    [panel, actionRail, ...actionButtons, ...nodes].filter(Boolean),
  )

  if (prefersReducedMotion()) {
    finishClose(restoreFocus)
    return
  }

  panelTimeline = createSelectPanelLeave({
    panel,
    items: nodes,
    actionRail,
    actionButtons,
    placement: panelPosition.value.placement,
    align: panelPosition.value.align,
    onComplete: () => {
      panelTimeline = undefined
      finishClose(restoreFocus)
    },
  })
}

function isTreeSelectInteractionTarget(target: EventTarget | null): target is Node {
  if (!(target instanceof Node)) {
    return false
  }

  return Boolean(
    rootRef.value?.contains(target) ||
      panelRef.value?.contains(target) ||
      actionRailRef.value?.contains(target) ||
      nodeDetailPanelRef.value?.contains(target),
  )
}

async function openPanel() {
  if (resolvedDisabled.value || isOpen.value) {
    return
  }

  shouldRenderPanel.value = true
  isOpen.value = true
  syncActiveValue()
  outsidePointer.start()
  searchFocus.start()
  panelAutoUpdate.start()
  emit('open')

  await nextTick()
  updatePanelPosition()
  updateScrollbarMetrics()
  playOpenAnimation()
  scrollActiveNodeIntoView()

  await searchFocus.focus()

  if (isKeyboardNavigating.value) {
    nodeDetail.scheduleKeyboardShow()
  }
}

function closePanel(restoreFocus = false) {
  if (!isOpen.value) {
    return
  }

  panelScrollRef.value?.stop()
  treeMotion.stop()
  typeahead.reset()
  isOpen.value = false
  finishKeyboardScrollSync()
  outsidePointer.stop()
  searchFocus.stop()
  panelAutoUpdate.dispose()
  nodeDetail.hide()
  emit('close')
  playCloseAnimation(restoreFocus)
}

function togglePanel() {
  if (resolvedDisabled.value) {
    return
  }

  if (isOpen.value) {
    closePanel()
    return
  }

  void openPanel()
}

function handleWindowPointerDown(event: PointerEvent) {
  const root = rootRef.value
  const panel = panelRef.value
  const actionRail = actionRailRef.value
  const nodeDetailPanel = nodeDetailPanelRef.value

  if (!root || !(event.target instanceof Node) || overlay.contains(event.target)) {
    return
  }

  if (
    !root.contains(event.target) &&
    !panel?.contains(event.target) &&
    !actionRail?.contains(event.target) &&
    !nodeDetailPanel?.contains(event.target)
  ) {
    closePanel()
  }
}

function handleChevronClick(event: MouseEvent) {
  event.stopPropagation()
  triggerRef.value?.focus()
  togglePanel()
}

const treeMotion = useTreeExpansionMotion({
  panel: panelRef,
  virtual: () => usesVirtualOptions.value,
  open: () => isOpen.value,
  clearRetained: () => { retainedTreeItems.value = [] },
  afterLeave: index => { retainedTreeItems.value = retainedTreeItems.value.filter(entry => entry.index !== index) },
  updateLayout: () => {
    updatePanelPosition()
    clampVirtualScrollTop()
    updateScrollbarMetrics()
    nodeDetail.updatePosition()
  },
})

function changeExpansion(values: BingTreeSelectValue[]) {
  panelScrollRef.value?.stop()
  if (panelTimeline) {
    killPanelTimeline()
    gsap.set([panelRef.value, actionRailRef.value, ...getNodeElements(), ...getActionButtonElements()].filter(Boolean), {
      autoAlpha: 1, clearProps: 'transform',
    })
  }
  treeMotion.prepare()
  const before = renderedTreeItems.value
  if (hasSearchQuery.value) searchExpandedValues.value = values
  else expandedValues.value = values
  retainedTreeItems.value = before.filter(entry => !renderedNodeIndices.value.has(entry.index))
  // 视口高度将在定位后更新；新窗口中的行也可入场，但只给实际挂载的行建 tween。
  treeMotion.mark(before.map(entry => entry.index), visibleTreeItems.value.map(entry => entry.index))
  void treeMotion.settleLayout()
}

function getExpansionPayload(entry: TreeEntry) {
  return {
    value: entry.value,
    node: entry.node,
    expandedValues: [...expandedValueSet.value],
  }
}

function setNodeExpanded(entry: TreeEntry, expanded: boolean) {
  if (entry.children.length === 0) {
    return
  }

  const isExpanded = expandedValueSet.value.has(entry.value)

  if (expanded === isExpanded) {
    return
  }

  if (!expanded && getActiveEntry()?.path.slice(0, -1).includes(entry.value)) {
    activeValue.value = entry.value
    nodeDetail.hide(true)
  }
  changeExpansion(expanded
    ? [...expandedValueSet.value, entry.value]
    : [...expandedValueSet.value].filter((value) => !valuesEqual(value, entry.value)))

  if (expanded) {
    emit('expand', getExpansionPayload(entry))
  } else {
    emit('collapse', getExpansionPayload(entry))
  }

}

function toggleNodeExpanded(entry: TreeEntry) {
  setNodeExpanded(entry, !expandedValueSet.value.has(entry.value))
}

function expandAll() {
  if (!hasExpandableNodes.value) {
    return
  }

  changeExpansion([...treeData.value.expandableValues])
}

function collapseAll() {
  if (!hasExpandableNodes.value) {
    return
  }

  activeValue.value = getActiveEntry()?.path[0]
  nodeDetail.hide(true)
  changeExpansion([])
}

function toggleTreeExpansion() {
  if (allNodesExpanded.value) {
    collapseAll()
    return
  }

  expandAll()
}

function selectAllTreeNodes() {
  if (
    !canSelectAll.value ||
    resolvedDisabled.value ||
    !hasBulkSelectableNodes.value ||
    allBulkNodesSelected.value
  ) {
    return
  }

  emitValue(
    getMultipleModelValue(uniqueValues([...selectedValues.value, ...bulkSelectableValues.value])),
  )
}

function clearAllTreeNodes() {
  if (!canSelectAll.value || resolvedDisabled.value || selectedBulkNodeCount.value === 0) {
    return
  }

  const bulkValueSet = new Set(bulkSelectableValues.value)
  const nextValues = selectedValues.value.filter((value) => !bulkValueSet.has(value))

  emitValue(getMultipleModelValue(nextValues))
}

function toggleTreeBulkSelection() {
  if (allBulkNodesSelected.value) {
    clearAllTreeNodes()
    return
  }

  selectAllTreeNodes()
}

function clearSearchQuery() {
  searchQuery.value = ''
}

function selectNode(entry: TreeEntry, event?: Event) {
  if (resolvedDisabled.value || entry.disabled) {
    return
  }

  if (!entry.selectable) {
    if (event && entry.children.length && !hasSearchQuery.value) {
      const element = getNodeElementByValue(entry.value)
      if (element) playClickFeedback(event, getNodeSurfaceElement(element))
    }
    toggleNodeExpanded(entry)
    return
  }

  if (event) playClickFeedback(event, getNodeElementByValue(entry.value))
  if (props.multiple) {
    if (props.checkStrictly) {
      const nextValues = selectedValueSet.value.has(entry.value)
        ? selectedValues.value.filter((value) => !valuesEqual(value, entry.value))
        : uniqueValues([...selectedValues.value, entry.value])

      emitValue(getMultipleModelValue(nextValues), entry.node)
      return
    }

    const nextSet = new Set(selectedValues.value)

    if (isNodeSelected(entry)) {
      entry.branchValues.forEach((value) => nextSet.delete(value))
    } else {
      entry.branchValues.forEach((value) => nextSet.add(value))
    }

    emitValue(getMultipleModelValue([...nextSet]), entry.node)
    return
  }

  emitValue(entry.value, entry.node)
  closePanel(true)
}

function clearSelection() {
  if (!canClear.value) {
    return
  }

  const nextValue: BingTreeSelectModelValue = props.multiple ? [] : null

  emit('clear')
  emitValue(nextValue)
}

function removeSelectedNode(node: BingTreeSelectNode) {
  if (resolvedDisabled.value) {
    return
  }

  const entry = treeData.value.valueMap.get(node.value)

  if (props.multiple && !props.checkStrictly && entry) {
    const nextSet = new Set(selectedValues.value)
    entry.branchValues.forEach((value) => nextSet.delete(value))
    emitValue(getMultipleModelValue([...nextSet]), node)
    void nextTick(() => triggerRef.value?.focus())
    return
  }

  const nextValues = selectedValues.value.filter(
    (value) => !valuesEqual(value, node.value),
  )

  emitValue(props.multiple ? getMultipleModelValue(nextValues) : null, node)
  void nextTick(() => triggerRef.value?.focus())
}

function handleClearClick(event: MouseEvent) {
  event.stopPropagation()
  clearSelection()
}

function stopNodeDetailEvent(event: Event) {
  event.stopPropagation()
}

const nodeLiquids = new Set<HTMLElement>()

function resetNodeLiquids() {
  nodeLiquids.forEach(resetLiquidHover)
  nodeLiquids.clear()
}

function handleNodeMouseLeave(event: MouseEvent) {
  const liquid = (event.currentTarget as HTMLElement).querySelector<HTMLElement>('.bing-tree-select__node-liquid')
  if (liquid && nodeLiquids.has(liquid)) leaveLiquidHover(liquid)
}

function handleNodeMouseEnter(event: MouseEvent | PointerEvent, entry: TreeEntry) {
  nodeDetail.rememberPointer(event)
  if (!isNodeNavigable(entry) || !activeItem.fromPointer(entry.index, event)) return
  finishKeyboardScrollSync()

  if (isNodeNavigable(entry)) {
    activeValue.value = entry.value
    if (!prefersReducedMotion()) {
      const surface = getNodeSurfaceElement(event.currentTarget as HTMLElement)
      const liquid = surface.querySelector<HTMLElement>('.bing-tree-select__node-liquid')
      if (liquid) {
        nodeLiquids.add(liquid)
        setLiquidHoverOrigin(surface, liquid, event)
        enterLiquidHover(liquid)
      }
    }
  }

  if (entry.disabled || !nodeHasDetail(entry)) {
    nodeDetail.hide(true)
    return
  }

  nodeDetail.show(event.currentTarget as HTMLElement, entry.index)
}

function handleNodeMouseMove(event: MouseEvent | PointerEvent, entry: TreeEntry) {
  nodeDetail.rememberPointer(event)
  if (!isNodeNavigable(entry) || !activeItem.fromPointer(entry.index, event, true)) return
  finishKeyboardScrollSync()

  if (entry.selectable && !entry.disabled) {
    activeValue.value = entry.value
  }

  if (entry.disabled || !nodeHasDetail(entry)) {
    nodeDetail.hide(true)
    return
  }

  nodeDetail.cancelHide()

  if (nodeDetailIndex.value !== entry.index || !shouldRenderNodeDetailPanel.value) {
    nodeDetail.show(event.currentTarget as HTMLElement, entry.index)
  }
}

watch(renderedTreeItems, resetNodeLiquids, { flush: 'pre' })
watch(virtualScrollTop, () => treeMotion.stop())
watch(isKeyboardNavigating, (value) => { if (value) resetNodeLiquids() })
onBeforeUnmount(resetNodeLiquids)

function getActionableItems() {
  return visibleTreeItems.value.filter(isNodeNavigable)
}

function activateEntry(entry: TreeEntry) {
  activeItem.fromKeyboard(entry.index)
  scrollActiveNodeIntoView()
  nodeDetail.scheduleKeyboardShow()
}

function syncActiveValue() {
  const selectedVisible = visibleTreeItems.value.find(
    (entry) => isNodeActionable(entry) && isNodeSelected(entry),
  )
  const firstActionable = getActionableItems()[0]

  activeValue.value = selectedVisible?.value ?? firstActionable?.value
}

function getNodeElementByValue(value: BingTreeSelectValue | undefined) {
  if (value === undefined) {
    return null
  }

  const entry = treeData.value.valueMap.get(value)

  if (!entry || !isBrowser()) {
    return null
  }

  return document.getElementById(getNodeId(entry)) as HTMLElement | null
}

function scrollActiveNodeIntoView() {
  if (activeValue.value === undefined) {
    return
  }

  void nextTick(() => {
    if (usesVirtualOptions.value) {
      virtualList.scrollToIndex(
        visibleTreeItems.value.findIndex((entry) =>
          valuesEqual(entry.value, activeValue.value as BingTreeSelectValue),
        ),
        // 保持原有行为：树节点的滚动计算不含列表顶部内边距。
        { offsetTop: 0, beforeScroll: startKeyboardScrollSync },
      )
      return
    }

    panelScrollRef.value?.stop()
    getNodeElementByValue(activeValue.value)?.scrollIntoView?.({
      block: 'nearest',
    })
  })
}

function moveActive(delta: number) {
  const items = getActionableItems()

  if (items.length === 0) {
    return
  }

  isKeyboardNavigating.value = true

  let nextPosition = items.findIndex((entry) =>
    activeValue.value === undefined ? false : valuesEqual(entry.value, activeValue.value),
  )

  if (nextPosition < 0) {
    nextPosition = delta > 0 ? -1 : 0
  }

  nextPosition = (nextPosition + delta + items.length) % items.length
  activeValue.value = items[nextPosition]?.value
  scrollActiveNodeIntoView()
  nodeDetail.scheduleKeyboardShow()
}

function moveToEdge(edge: 'first' | 'last') {
  const items = getActionableItems()
  const entry = edge === 'first' ? items[0] : items[items.length - 1]

  if (!entry) {
    return
  }

  isKeyboardNavigating.value = true
  activeValue.value = entry.value
  scrollActiveNodeIntoView()
  nodeDetail.scheduleKeyboardShow()
}

function getActiveEntry() {
  if (activeValue.value === undefined) {
    return undefined
  }

  return treeData.value.valueMap.get(activeValue.value)
}

function selectActiveNode(event: KeyboardEvent) {
  const entry = getActiveEntry()

  if (!entry) {
    return
  }

  selectNode(entry, event)
}

function moveToParent(entry: TreeEntry) {
  if (!entry.parent) {
    return
  }

  isKeyboardNavigating.value = true
  activeValue.value = entry.parent.value
  scrollActiveNodeIntoView()
  nodeDetail.scheduleKeyboardShow()
}

function handleTreeKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'Escape' && (event.defaultPrevented || !overlay.isTop(event))) return
  if (resolvedDisabled.value) {
    return
  }

  if (searchFocus.handleShortcut(event)) {
    return
  }

  if (event.key === '*' && isOpen.value && !searchQuery.value) {
    event.preventDefault()
    const entry = getActiveEntry()
    const siblings = entry?.parent?.children ?? treeData.value.roots
    changeExpansion(uniqueValues([...expandedValueSet.value, ...siblings.filter(item => item.children.length).map(item => item.value)]))
    return
  }

  if (typeahead.handleKeydown(event)) return

  if (event.key === 'Tab') {
    closePanel()
    return
  }

  if (event.key === 'Escape') {
    if (isOpen.value) {
      event.preventDefault()
      closePanel(true)
    }
    return
  }

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    isKeyboardNavigating.value = true

    if (!isOpen.value) {
      playClickFeedback(event, triggerRef.value)
      void openPanel()
      return
    }

    moveActive(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    isKeyboardNavigating.value = true

    if (!isOpen.value) {
      playClickFeedback(event, triggerRef.value)
      void openPanel()
      return
    }

    moveActive(-1)
    return
  }

  if (event.key === 'Home' && isOpen.value) {
    event.preventDefault()
    moveToEdge('first')
    return
  }

  if (event.key === 'End' && isOpen.value) {
    event.preventDefault()
    moveToEdge('last')
    return
  }

  if (event.key === 'ArrowRight' && isOpen.value) {
    isKeyboardNavigating.value = true
    const entry = getActiveEntry()

    if (entry?.children.length && !isNodeExpanded(entry)) {
      event.preventDefault()
      const element = getNodeElementByValue(entry.value)
      if (element) playClickFeedback(event, getNodeSurfaceElement(element))
      setNodeExpanded(entry, true)
    } else if (entry?.children.length) {
      const child = entry.children.find(item => isNodeNavigable(item) && (!hasSearchQuery.value || searchIncludedValues.value.has(item.value)))
      if (child) { event.preventDefault(); activateEntry(child) }
    }
    return
  }

  if (event.key === 'ArrowLeft' && isOpen.value) {
    isKeyboardNavigating.value = true
    const entry = getActiveEntry()

    if (entry?.children.length && isNodeExpanded(entry)) {
      event.preventDefault()
      const element = getNodeElementByValue(entry.value)
      if (element) playClickFeedback(event, getNodeSurfaceElement(element))
      setNodeExpanded(entry, false)
      return
    }

    if (entry?.parent) {
      event.preventDefault()
      moveToParent(entry)
    }
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    isKeyboardNavigating.value = true

    if (!isOpen.value) {
      playClickFeedback(event, triggerRef.value)
      void openPanel()
      return
    }

    selectActiveNode(event)
  }
}

function handleSearchInputKeydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
    const input = event.target as HTMLInputElement
    const caret = input.selectionStart
    const collapsed = caret !== null && caret === input.selectionEnd
    const atBoundary = collapsed && (event.key === 'ArrowLeft' ? caret === 0 : caret === input.value.length)
    if (event.altKey || atBoundary) handleTreeKeydown(event)
    return
  }
  if ((event.key === '*' || event.key === ' ') && !searchQuery.value) {
    handleTreeKeydown(event)
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveActive(1)
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveActive(-1)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    moveToEdge('first')
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    moveToEdge('last')
    return
  }

  if (event.key === 'Enter') {
    event.preventDefault()
    selectActiveNode(event)
    return
  }

  if (event.key === 'Escape' && searchQuery.value) {
    clearSearchQuery()
    return
  }

  if (event.key === 'Escape') {
    closePanel(true)
    return
  }

  if (event.key === 'Tab') {
    closePanel()
  }
}

watch(
  () => [
    treeData.value.expandableValues,
    props.defaultExpandedValues,
    props.defaultExpandAll,
  ] as const,
  () => {
    panelScrollRef.value?.stop()
    const validExpandedValues = new Set(treeData.value.expandableValues)

    if (!hasInitializedExpansion) {
      expandedValues.value = props.defaultExpandAll
        ? [...treeData.value.expandableValues]
        : props.defaultExpandedValues.filter((value) => validExpandedValues.has(value))
      hasInitializedExpansion = true
      return
    }

    if (props.defaultExpandAll) {
      expandedValues.value = [...treeData.value.expandableValues]
      return
    }

    expandedValues.value = expandedValues.value.filter((value) =>
      validExpandedValues.has(value),
    )
  },
  { deep: true, immediate: true },
)

watch(
  () => resolvedDisabled.value,
  (disabled) => {
    if (disabled) {
      closePanel()
    }
  },
)

watch(
  () => [normalizedSearchQuery.value, isSearchable.value, treeData.value] as const,
  () => {
    treeMotion.stop()
    if (hasSearchQuery.value) {
      expansionBeforeSearch ??= [...expandedValues.value]
      const ancestors = new Set<BingTreeSelectValue>()
      for (const entry of treeData.value.flat) {
        if (entryMatchesSearch(entry, normalizedSearchQuery.value)) entry.path.slice(0, -1).forEach(value => ancestors.add(value))
      }
      searchExpandedValues.value = [...ancestors]
    } else if (expansionBeforeSearch) {
      const ancestors = getActiveEntry()?.path.slice(0, -1) ?? []
      const valid = new Set(treeData.value.expandableValues)
      expandedValues.value = uniqueValues([...expansionBeforeSearch, ...ancestors]).filter(value => valid.has(value))
      expansionBeforeSearch = undefined
      searchExpandedValues.value = []
    }
    nodeDetail.hide(true)
    virtualScrollTop.value = 0
    if (!visibleTreeItems.value.some(entry => entry.value === activeValue.value && isNodeNavigable(entry))) syncActiveValue()

    if (isOpen.value) {
      panelScrollRef.value?.scrollTo(0)
      void nextTick(() => {
        clampVirtualScrollTop()
        updatePanelPosition()
        updateScrollbarMetrics()
        nodeDetail.updatePosition()
      })
    }
  },
)

watch(
  () => [props.options, props.modelValue, props.multiple, props.checkStrictly],
  () => {
    if (isOpen.value) {
      panelScrollRef.value?.stop()
      syncActiveValue()
      void nextTick(() => {
        clampVirtualScrollTop()
        updatePanelPosition()
        updateScrollbarMetrics()
        nodeDetail.updatePosition()
      })
    }
  },
  { deep: true },
)

watch(
  () => [
    normalizedPanelMinHeight.value,
    normalizedPanelMaxHeight.value,
    props.panelPlacement,
    props.panelAlign,
    props.panelGap,
    usesVirtualOptions.value,
    normalizedVirtualItemHeight.value,
    normalizedVirtualOverscan.value,
  ],
  () => {
    if (isOpen.value) {
      panelScrollRef.value?.stop()
      void nextTick(() => {
        clampVirtualScrollTop()
        updatePanelPosition()
        updateScrollbarMetrics()
        nodeDetail.updatePosition()
      })
    }
  },
)

onBeforeUnmount(() => {
  panelScrollRef.value?.stop()
  panelAutoUpdate.dispose()
  killPanelTimeline()

  gsap.killTweensOf(
    [
      panelRef.value,
      actionRailRef.value,
      ...getActionButtonElements(),
      nodeDetailPanelRef.value,
      nodeDetailContentRef.value,
      ...getNodeElements(),
    ].filter(Boolean),
  )
})
</script>

<template>
  <div ref="rootRef" :class="rootClasses" :style="rootStyle" @keydown="handleTreeKeydown" @pointermove="activeItem.rememberPointer">
    <div class="bing-tree-select__control bing-picker__control">
      <button v-click-feedback
        ref="triggerRef"
        class="bing-tree-select__trigger bing-picker__trigger"
        :class="{ 'is-tag-trigger': usesDefaultTags }"
        type="button"
        role="combobox"
        :id="resolvedId"
        :disabled="resolvedDisabled"
        :aria-label="ariaLabel || displayText"
        :aria-describedby="resolvedAriaDescribedby"
        :aria-invalid="resolvedStatus === 'error' || undefined"
        aria-haspopup="tree"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="activeNodeId"
        @click="togglePanel"
        @blur="blurValidation.handleBlur"
      >
        <span
          v-if="!usesDefaultTags"
          class="bing-tree-select__value bing-picker__value"
          :class="{ 'is-placeholder': !hasSelection }"
        >
          <slot name="value" :selected-nodes="selectedNodes" :placeholder="placeholder">
            {{ displayText }}
          </slot>
        </span>
      </button>

      <div
        v-if="usesDefaultTags"
        :ref="element => tagsViewportRef = element as HTMLElement | null"
        class="bing-tree-select__tags-value bing-picker__tags-value"
      >
        <template v-if="!hasSelection && visibleSelectedNodes.length === 0 && !tagMotion.isAnimating.value">
          <span class="bing-tree-select__tags-placeholder bing-picker__tags-placeholder">
            {{ placeholder }}
          </span>
        </template>

        <TransitionGroup :css="false" v-bind="tagMotion.tagHooks">
          <BingTag
            v-for="node in visibleSelectedNodes"
            :key="node.value"
            class="bing-tree-select__value-tag bing-picker__value-tag"
            :label="node.label"
            :size="selectTagSize"
            closable
            :disabled="resolvedDisabled"
            :close-aria-label="`移除 ${node.label}`"
            @close="removeSelectedNode(node)"
          />
        </TransitionGroup>

        <BingTag
          v-if="hiddenSelectedCount > 0"
          class="bing-tree-select__overflow-tag bing-picker__overflow-tag"
          :size="selectTagSize"
          tone="neutral"
        >
          <span class="bing-picker__counter" :aria-label="`+${hiddenSelectedCount}`">
            <Transition :css="false" v-bind="tagMotion.counterHooks">
              <span :key="hiddenSelectedCount" class="bing-picker__counter-value" aria-hidden="true">+{{ hiddenSelectedCount }}</span>
            </Transition>
          </span>
        </BingTag>
      </div>

      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        v-if="canClear"
        class="bing-tree-select__clear bing-picker__clear"
        aria-label="清空选择"
        @click="handleClearClick"
        @keydown.stop
      >
        <template #prefix>
          <BingIcon :icon="X" size="sm" :stroke-width="1.75" />
        </template>
      </BingButton>

      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        class="bing-tree-select__chevron bing-picker__chevron"
        tabindex="-1"
        aria-hidden="true"
        :disabled="resolvedDisabled"
        @click="handleChevronClick"
      >
        <template #prefix>
          <BingIcon :icon="ChevronDown" size="sm" :stroke-width="1.75" />
        </template>
      </BingButton>
    </div>

    <div
      v-if="usesDefaultTags && hasSelection"
      :ref="element => tagMeasureRef = element as HTMLElement | null"
      class="bing-tree-select__tag-measure bing-picker__tag-measure"
      aria-hidden="true"
    >
      <BingTag
        v-for="node in measuredSelectedNodes"
        :key="`measure-${node.value}`"
        class="bing-tree-select__value-tag bing-tree-select__measure-tag bing-picker__value-tag"
        data-picker-measure-tag
        :label="node.label"
        :size="selectTagSize"
        closable
      />
      <BingTag
        v-for="count in measuredOverflowCounts"
        :key="`overflow-${count}`"
        class="bing-tree-select__overflow-tag bing-tree-select__measure-overflow bing-picker__overflow-tag"
        :data-overflow-count="count"
        :label="`+${count}`"
        :size="selectTagSize"
        tone="neutral"
      />
    </div>

    <Teleport v-if="clientReady" to="body">
      <div
        v-if="shouldRenderPanel && canUseActionRail"
        ref="actionRailRef"
        class="bing-tree-select__action-rail bing-picker__action-rail"
        :style="actionRailStyle"
        aria-label="树形选择操作"
        @pointerdown.stop
        @click.stop
      >
        <BingTooltip
          v-if="canSelectAll"
          :content="`${allBulkNodesSelected ? clearAllText : selectAllText}: ${selectedBulkNodeCount} / ${bulkSelectableEntries.length}`"
          placement="left"
          align="center"
          :open-delay="120"
        >
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            class="bing-tree-select__action-button bing-picker__action-button"
            :class="{ 'is-active': allBulkNodesSelected || someBulkNodesSelected }"
            data-action="toggle-select-all"
            :disabled="!hasBulkSelectableNodes"
            :aria-pressed="allBulkNodesSelected"
            :aria-label="`${allBulkNodesSelected ? clearAllText : selectAllText}：已选 ${selectedBulkNodeCount} 项，共 ${bulkSelectableEntries.length} 项`"
            @click="toggleTreeBulkSelection"
          >
            <template #prefix>
              <BingIcon
                :icon="allBulkNodesSelected ? ListX : CheckCheck"
                size="sm"
                :stroke-width="1.75"
              />
            </template>
          </BingButton>
        </BingTooltip>

        <BingTooltip
          v-if="canUseTreeActions"
          :content="`${allNodesExpanded ? collapseAllText : expandAllText}: ${expandedKnownCount} / ${treeData.expandableValues.length}`"
          placement="left"
          align="center"
          :open-delay="120"
        >
          <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
            class="bing-tree-select__action-button bing-picker__action-button"
            :class="{ 'is-active': expandedKnownCount > 0 }"
            data-action="toggle-expand-all"
            :disabled="!hasExpandableNodes"
            :aria-pressed="allNodesExpanded"
            :aria-label="`${allNodesExpanded ? collapseAllText : expandAllText}：已展开 ${expandedKnownCount} 项，共 ${treeData.expandableValues.length} 项`"
            @click="toggleTreeExpansion"
          >
            <template #prefix>
              <BingIcon
                :icon="allNodesExpanded ? ListCollapse : ListTree"
                size="sm"
                :stroke-width="1.75"
              />
            </template>
          </BingButton>
        </BingTooltip>
      </div>

      <div
        v-if="shouldRenderPanel"
        ref="panelRef"
        :class="panelClasses"
        :style="panelStyle"
        @keydown="handleTreeKeydown"
        @pointermove="event => { activeItem.rememberPointer(event); nodeDetail.rememberPointer(event) }"
        @wheel.passive="handlePanelWheel"
      >
        <div
          v-if="isSearchable"
          ref="toolbarRef"
          class="bing-tree-select__toolbar bing-picker__bulk-actions bing-picker__search-area"
        >
          <BingInput
            v-if="isSearchable"
            ref="searchInputRef"
            v-model="searchQuery"
            class="bing-tree-select__search bing-picker__search"
            type="search"
            role="combobox"
            aria-haspopup="tree"
            :aria-expanded="isOpen"
            :aria-controls="listboxId"
            :aria-activedescendant="activeNodeId"
            :aria-label="searchInputPlaceholder"
            :icon="Search"
            size="sm"
            block
            :placeholder="searchInputPlaceholder"
            autocomplete="off"
            :spellcheck="false"
            clear-aria-label="清空搜索"
            @clear="clearSearchQuery"
            @keydown.stop="handleSearchInputKeydown"
          />
        </div>

        <BingScrollbar
          ref="panelScrollRef"
          class="bing-tree-select__panel-scroll"
          :height="panelScrollHeight"
          :smooth="resolvedSmoothScroll"
          :focusable="false"
          always
          aria-label="树形节点列表"
          @scroll="handlePanelScroll"
        >
          <div
            :id="listboxId"
            class="bing-tree-select__panel-body"
            role="tree"
            :aria-label="ariaLabel || '树形节点列表'"
            :aria-multiselectable="multiple || undefined"
            :class="{ 'is-virtual': usesVirtualOptions }"
            :style="panelBodyStyle"
          >
            <div
              class="bing-tree-select__node-stack"
              :class="{ 'is-virtual': usesVirtualOptions }"
              :style="nodeStackStyle"
              @mouseenter="nodeDetail.cancelHide"
              @mouseleave="nodeDetail.scheduleHide()"
            >
              <Transition
                v-for="entry in motionTreeItems"
                :key="entry.value"
                :css="false"
                v-bind="treeMotion.hooks"
              >
              <div
                v-if="renderedNodeIndices.has(entry.index)"
                :id="getNodeId(entry)"
                :key="`${entry.path.join('__')}__${entry.index}`"
                class="bing-tree-select__node"
                role="treeitem"
                tabindex="-1"
                :style="getNodeStyle(entry)"
                :aria-level="entry.depth + 1"
                :aria-setsize="siblingPositions.get(entry.index)?.size"
                :aria-posinset="siblingPositions.get(entry.index)?.position"
                :aria-expanded="entry.children.length ? isNodeExpanded(entry) : undefined"
                :aria-selected="multiple ? undefined : isNodeSelected(entry)"
                :aria-checked="multiple ? (isNodeIndeterminate(entry) ? 'mixed' : isNodeSelected(entry)) : undefined"
                :aria-disabled="entry.disabled || !entry.selectable || undefined"
                :class="{
                  'is-selected': isNodeSelected(entry),
                  'is-indeterminate': isNodeIndeterminate(entry),
                  'is-active': activeValue === entry.value,
                  'is-disabled': entry.disabled,
                  'is-branch': entry.children.length > 0,
                  'has-detail': nodeHasDetail(entry),
                  'is-leaf': entry.children.length === 0,
                  'is-not-selectable': !entry.selectable,
                }"
                :data-depth="entry.depth"
                :data-node-index="entry.index"
                :data-window-index="renderedTreeItems.indexOf(entry)"
                @mousedown.prevent
                @click="selectNode(entry, $event)"
                @mouseenter="handleNodeMouseEnter($event, entry)"
                @mousemove="handleNodeMouseMove($event, entry)"
                @mouseleave="handleNodeMouseLeave"
              >
                <div class="bing-tree-select__node-surface">
                  <span class="bing-tree-select__node-liquid" aria-hidden="true"></span>
                  <span
                    class="bing-tree-select__node-indent"
                    aria-hidden="true"
                  ></span>

                  <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
                    v-if="entry.children.length > 0"
                    class="bing-tree-select__expand"
                    tabindex="-1"
                    aria-hidden="true"
                    :aria-label="isNodeExpanded(entry) ? `收起 ${entry.label}` : `展开 ${entry.label}`"
                    @click.stop="toggleNodeExpanded(entry)"
                    @keydown.stop
                  >
                    <template #prefix>
                      <BingIcon
                        :icon="ChevronRight"
                        class="bing-tree-select__expand-icon"
                        :class="{ 'is-expanded': isNodeExpanded(entry) }"
                        size="xs"
                        :stroke-width="1.75"
                      />
                    </template>
                  </BingButton>
                  <span v-else class="bing-tree-select__leaf-spacer" aria-hidden="true"></span>

                  <BingCheckbox
                    decorative
                    :model-value="isNodeSelected(entry)"
                    :indeterminate="isNodeIndeterminate(entry)"
                    :disabled="entry.disabled || !entry.selectable"
                    :size="resolvedSize === 'lg' ? 'md' : 'sm'"
                    :shape="multiple ? 'rounded' : 'circle'"
                  />

                  <span class="bing-tree-select__node-main">
                    <slot
                      name="node"
                      :node="entry.node"
                      :selected="isNodeSelected(entry)"
                      :indeterminate="isNodeIndeterminate(entry)"
                      :depth="entry.depth"
                      :expanded="isNodeExpanded(entry)"
                      :match-ranges="nodeMatchRanges.get(entry.index) ?? []"
                    >
                      <span class="bing-tree-select__node-label"><template v-for="(part, index) in getLabelParts(entry)" :key="index"><mark v-if="part.match" class="bing-picker__match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
                    </slot>
                  </span>

                  <span
                    v-if="entry.children.length > 0 && !entry.disabled"
                    class="bing-tree-select__child-count"
                    :title="`${entry.children.length} 个子节点`"
                    :aria-label="`${entry.children.length} 个子节点`"
                  >
                    {{ entry.children.length }}
                  </span>

                  <span
                    v-if="nodeHasDetail(entry)"
                    class="bing-tree-select__node-detail-indicator"
                    :title="`Details available for ${entry.label}`"
                    aria-hidden="true"
                  >
                    <BingIcon :icon="Info" :size="12" :stroke-width="1.75" />
                  </span>
                </div>
              </div>
              </Transition>
            </div>

            <div v-if="visibleTreeItems.length === 0" class="bing-tree-select__empty">
              {{ hasSearchQuery ? noSearchResultsText : emptyText }}
            </div>
          </div>
        </BingScrollbar>
      </div>

      <div
        v-if="shouldRenderNodeDetailPanel && nodeDetailEntry && nodeDetailNode"
        ref="nodeDetailPanelRef"
        class="bing-tree-select__node-detail-panel"
        :class="`is-placement-${nodeDetailPlacement}`"
        :style="glassStyle"
        aria-hidden="true"
        @pointerdown="stopNodeDetailEvent"
        @click="stopNodeDetailEvent"
        @mouseenter="nodeDetail.cancelHide"
        @mouseleave="nodeDetail.scheduleHide()"
      >
        <div ref="nodeDetailContentRef" class="bing-tree-select__node-detail-content">
          <slot
            name="node-detail"
            :node="nodeDetailNode"
            :selected="nodeDetailSelected"
            :indeterminate="nodeDetailIndeterminate"
            :depth="nodeDetailEntry.depth"
            :expanded="isNodeExpanded(nodeDetailEntry)"
          >
            <span class="bing-tree-select__node-detail-title">
              {{ nodeDetailNode.label }}
            </span>
            <span v-if="nodeDetailText" class="bing-tree-select__node-detail-text">
              {{ nodeDetailText }}
            </span>
            <span
              v-for="entry in nodeDetailMetaEntries"
              :key="entry.key"
              class="bing-tree-select__node-detail-meta"
            >
              <span class="bing-tree-select__node-detail-meta-key">{{ entry.key }}</span>
              <span class="bing-tree-select__node-detail-meta-value">{{ entry.value }}</span>
            </span>
          </slot>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bing-tree-select, .bing-tree-select__panel, .bing-tree-select__action-rail {
  --bing-picker-height: var(--bing-tree-select-height, var(--bing-control-height-md, 36px));
  --bing-picker-padding-x: var(--bing-tree-select-padding-x, 10px);
  --bing-picker-radius: var(--bing-radius-md, 6px);
  --bing-picker-width: 280px;
  --bing-picker-min-width: 0px;
  --bing-picker-glass-opacity: var(--bing-tree-select-glass-opacity, 0.86);
  --bing-picker-glass-blur: var(--bing-tree-select-glass-blur, 16px);
  --bing-picker-glass-saturation: var(--bing-tree-select-glass-saturation, 1.05);
}
.bing-tree-select.is-block { --bing-picker-width: 100%; }
.bing-tree-select--sm { --bing-picker-height: var(--bing-tree-select-height, var(--bing-control-height-sm, 32px)); --bing-picker-padding-x: var(--bing-tree-select-padding-x, 8px); }
.bing-tree-select--lg { --bing-picker-height: var(--bing-tree-select-height, var(--bing-control-height-lg, 40px)); --bing-picker-padding-x: var(--bing-tree-select-padding-x, 12px); }

.bing-tree-select__panel-scroll { flex: 0 0 auto; min-height: 0; }
.bing-tree-select__panel-body {
  box-sizing: border-box;
  position: relative;
  display: grid;
  min-width: 0;
  padding: 6px 8px;
}
.bing-tree-select__panel-body.is-virtual { display: block; padding: 0; }
.bing-tree-select__node-stack {
  --bing-tree-select-node-visual-gap: 4px;
  display: grid;
  min-width: 0;
  gap: 0;
  position: relative;
  transform: translateZ(0);
  will-change: transform;
}
.bing-tree-select__node-stack.is-virtual {
  position: absolute;
  top: 0;
  left: 8px;
  width: calc(100% - 16px);
  contain: layout paint style;
}
.bing-tree-select__node {
  box-sizing: border-box;
  position: relative;
  display: block;
  width: 100%;
  min-height: var(--bing-tree-select-node-height, 32px);
  padding: calc(var(--bing-tree-select-node-visual-gap) / 2) 0;
  color: var(--bing-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}
.bing-tree-select__node::before {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--bing-tree-guides, none);
  pointer-events: none;
}
.bing-tree-select__node-surface {
  box-sizing: border-box;
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: calc(var(--bing-tree-select-node-height, 32px) - var(--bing-tree-select-node-visual-gap));
  gap: 6px;
  padding: 2px 8px;
  padding-inline-start: calc(8px + var(--bing-tree-depth, 0) * var(--bing-tree-select-indent, 16px));
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth);
}
.bing-tree-select__node-surface > :not(.bing-tree-select__node-liquid) {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}
.bing-tree-select__node-liquid {
  position: absolute;
  inset: -1px;
  z-index: 0;
  border-radius: inherit;
  background: radial-gradient(circle at var(--bing-liquid-x, 50%) var(--bing-liquid-y, 50%),
    rgb(var(--bing-liquid-rgb) / var(--bing-liquid-strength)) 0%,
    rgb(var(--bing-liquid-rgb) / var(--bing-liquid-strength)) 64%,
    rgb(var(--bing-liquid-rgb) / calc(var(--bing-liquid-strength) * 0.72)) 82%,
    rgb(var(--bing-liquid-rgb) / calc(var(--bing-liquid-strength) * 0.35)) 100%);
  opacity: 0;
  pointer-events: none;
  transform: scale(0.08);
}
.bing-tree-select__panel-body.is-virtual .bing-tree-select__node {
  min-height: var(--bing-tree-select-virtual-item-height, 32px);
}
.bing-tree-select__panel-body.is-virtual .bing-tree-select__node-surface { min-height: 24px; }
.bing-tree-select__panel.is-keyboard-navigating .bing-tree-select__node.is-active > .bing-tree-select__node-surface {
  background: var(--bing-surface-hover);
  outline: 1px solid var(--bing-control-hover-border);
  outline-offset: -1px;
}
.bing-tree-select__panel.is-keyboard-scrolling .bing-tree-select__node-surface { transition: none; }
.bing-tree-select__node.is-selected > .bing-tree-select__node-surface {
  color: var(--bing-heading);
}
.bing-tree-select__node.is-selected .bing-tree-select__node-label {
  font-weight: 500;
}
.bing-tree-select__node:not(.is-active) .bing-tree-select__node-liquid { visibility: hidden; }
.bing-tree-select__node.is-disabled { cursor: not-allowed; }
.bing-tree-select__node.is-not-selectable { cursor: default; }
.bing-tree-select__node.is-disabled > .bing-tree-select__node-surface,
.bing-tree-select__node.is-disabled .bing-tree-select__node-label,
.bing-tree-select__node.is-disabled .bing-tree-select__node-main :deep(.bing-tree-select__node-label),
.bing-tree-select__node.is-disabled .bing-tree-select__child-count,
.bing-tree-select__node.is-disabled .bing-tree-select__node-detail-indicator {
  color: var(--bing-disabled-text);
}
.bing-tree-select__node.is-not-selectable .bing-tree-select__node-label { color: var(--bing-muted); }
.bing-tree-select__node-indent { display: none; }
.bing-tree-select__expand-icon { transition: transform 0.18s var(--bing-ease-smooth); }
.bing-tree-select__expand-icon.is-expanded { transform: rotate(90deg); }
.bing-tree-select__expand,
.bing-tree-select__leaf-spacer {
  display: inline-grid;
  width: 18px;
  height: 18px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--bing-muted);
}
.bing-tree-select__expand {
  cursor: pointer;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth);
}
.bing-tree-select__expand:hover:not(:disabled) {
  background: var(--bing-surface-hover);
  color: var(--bing-heading);
}
.bing-tree-select__expand:disabled { color: var(--bing-disabled-text); cursor: default; }
.bing-tree-select__node-surface > .bing-tree-select__node-main {
  display: grid;
  flex: 1 1 auto;
  min-width: 0;
  gap: 2px;
}
.bing-tree-select__node-label,
.bing-tree-select__node-main :deep(.bing-tree-select__node-label) {
  min-width: 0;
  overflow: hidden;
  color: var(--bing-heading);
  font-size: var(--bing-tree-select-node-font-size, 14px);
  font-weight: 400;
  line-height: var(--bing-tree-select-node-line-height, 20px);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bing-tree-select__node-description,
.bing-tree-select__node-main :deep(.bing-tree-select__node-description) {
  min-width: 0;
  overflow: hidden;
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bing-tree-select__node-detail-indicator {
  display: inline-grid;
  width: 16px;
  height: 16px;
  place-items: center;
  color: var(--bing-muted);
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--bing-duration-fast) var(--bing-ease-smooth);
}
.bing-tree-select__node:is(:hover, :focus-within, .is-active) .bing-tree-select__node-detail-indicator { opacity: 1; }
@media (hover: none) {
  .bing-tree-select__node-detail-indicator { opacity: 1; }
}
.bing-tree-select__child-count {
  min-width: 1.15em;
  color: var(--bing-muted);
  cursor: help;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  font-weight: 400;
  line-height: 16px;
  text-align: center;
}
.bing-tree-select__node-detail-panel {
  position: fixed;
  z-index: 3002;
  width: min(260px, calc(100vw - 24px));
  box-sizing: border-box;
  border: 1px solid var(--bing-popover-border);
  border-radius: 8px;
  background: rgb(var(--bing-surface-rgb) / var(--bing-tree-select-glass-opacity, 0.86));
  background-clip: padding-box;
  backdrop-filter: blur(var(--bing-tree-select-glass-blur, 16px)) saturate(var(--bing-tree-select-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-tree-select-glass-blur, 16px)) saturate(var(--bing-tree-select-glass-saturation, 1.05));
  box-shadow: var(--bing-popover-shadow);
  color: var(--bing-text);
  opacity: 0;
  transform-origin: 0 50%;
  visibility: hidden;
}
.bing-tree-select__node-detail-panel.is-placement-left { transform-origin: 100% 50%; }
.bing-tree-select__node-detail-content {
  display: grid;
  min-width: 0;
  gap: 6px;
  padding: 12px;
}
.bing-tree-select__node-detail-title,
.bing-tree-select__node-detail-content :deep(.bing-tree-select__node-detail-title) {
  min-width: 0;
  overflow: hidden;
  color: var(--bing-heading);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bing-tree-select__node-detail-text,
.bing-tree-select__node-detail-content :deep(.bing-tree-select__node-detail-text) {
  color: var(--bing-muted);
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
  overflow-wrap: anywhere;
}
.bing-tree-select__node-detail-meta,
.bing-tree-select__node-detail-content :deep(.bing-tree-select__node-detail-meta) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 8px;
  padding-top: 5px;
  border-top: 1px solid var(--bing-border);
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 16px;
}
.bing-tree-select__node-detail-meta-key,
.bing-tree-select__node-detail-meta-value,
.bing-tree-select__node-detail-content :deep(.bing-tree-select__node-detail-meta-key),
.bing-tree-select__node-detail-content :deep(.bing-tree-select__node-detail-meta-value) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.bing-tree-select__node-detail-meta-value,
.bing-tree-select__node-detail-content :deep(.bing-tree-select__node-detail-meta-value) { color: var(--bing-heading); }
.bing-tree-select__empty {
  display: grid;
  min-height: 84px;
  place-items: center;
  padding: 20px;
  color: var(--bing-muted);
  font-size: 13px;
  font-weight: 400;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .bing-tree-select__expand-icon,
  .bing-tree-select__node-detail-indicator { transition: none; }
  .bing-tree-select__node-stack { will-change: auto; }
  .bing-tree-select__control,
  .bing-tree-select__clear,
  .bing-tree-select__chevron,
  .bing-tree-select__action-button,
  .bing-tree-select__expand,
  .bing-tree-select__node,
  .bing-tree-select__node-surface { transition: none; }
  .bing-tree-select__panel,
  .bing-tree-select__action-rail,
  .bing-tree-select__action-button,
  .bing-tree-select__node-detail-panel,
  .bing-tree-select__node { transform: none !important; }
  .bing-tree-select__node-liquid { display: none; }
  .bing-tree-select__node:hover:not(.is-disabled) > .bing-tree-select__node-surface { background: var(--bing-surface-hover); }
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-tree-select__action-button.bing-button {
  --button-height: 32px;
  --button-icon-size: 16px;
  min-height: 32px;
  width: var(--button-height);
  padding: 0;
}

.bing-tree-select__expand.bing-button {
  --button-height: 18px;
  --button-icon-size: 14px;
  min-height: 18px;
  width: var(--button-height);
  padding: 0;
}
</style>
