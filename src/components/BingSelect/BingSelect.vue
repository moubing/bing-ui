<script setup lang="ts">
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
import '../../theme/picker.css'
import { useActiveItem } from '../../utils/useActiveItem'
import { useOverflowTags } from '../../utils/useOverflowTags'
import { useTypeahead } from '../../utils/useTypeahead'
import { useSelectTagMotion } from '../../motion/selectTagMotion'
import { useKeyboardScrollSync } from '../../utils/useKeyboardScrollSync'
import { useDeferredBlurValidation } from '../../utils/useDeferredBlurValidation'
import { useOutsidePointerDown } from '../../utils/useOutsidePointerDown'
import { useSearchShortcutFocus } from '../../utils/useSearchShortcutFocus'
import { useVirtualList } from '../../utils/useVirtualList'
import { useOptionDetailPanel } from '../../utils/useOptionDetailPanel'
import { computed, nextTick, onBeforeUnmount, ref, watch, useId } from 'vue'
import type { CSSProperties } from 'vue'
import { ChevronDown, Search, X } from '../../icons'
import { gsap } from 'gsap'
import { createSelectPanelEnter, createSelectPanelLeave } from '../../motion/selectPanelMotion'
import { enterLiquidHover, leaveLiquidHover } from '../../motion/liquidHover'
import BingCheckbox from '../BingCheckbox/BingCheckbox.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import BingTag from '../BingTag/BingTag.vue'
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
  BingSelectChangePayload,
  BingSelectEmits,
  BingSelectModelValue,
  BingSelectOption,
  BingSelectPanelAlign,
  BingSelectPanelPlacement,
  BingSelectProps,
  BingSelectValue,
} from './BingSelect.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

type ResolvedPanelPlacement = Exclude<BingSelectPanelPlacement, 'auto'>

const minPanelWidth = 240

const { vClickFeedback, playClickFeedback } = useClickFeedback()
const props = withDefaults(defineProps<BingSelectProps>(), {
  id: undefined,
  modelValue: null,
  options: () => [],
  multiple: false,
  placeholder: '请选择选项',
  disabled: undefined,
  clearable: true,
  showSelectAll: true,
  selectAllText: '全选',
  clearAllText: '清空已选',
  emptyText: '暂无选项',
  searchable: 'auto',
  typeahead: true,
  highlightMatches: true,
  searchPlaceholder: '搜索选项（/）',
  noSearchResultsText: '未找到匹配选项',
  smoothScroll: true,
  size: undefined,
  block: false,
  width: undefined,
  minWidth: 180,
  glass: defaultGlassEffect.glass,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
  panelMinHeight: 0,
  panelMaxHeight: 320,
  panelPlacement: 'auto',
  panelAlign: 'start',
  panelGap: 10,
  virtual: 'auto',
  virtualThreshold: 80,
  virtualItemHeight: undefined,
  virtualOverscan: 4,
  ariaLabel: undefined,
  ariaDescribedby: undefined,
  status: undefined,
})

const emit = defineEmits<BingSelectEmits>()
const clientReady = useClientReady()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby } = useFormControl(props)
isolateFormControls()

const slots = defineSlots<{
  value?: (props: { selectedOptions: BingSelectOption[]; placeholder: string }) => unknown
  option?: (props: { option: BingSelectOption; selected: boolean; matchRanges: { start: number; end: number }[] }) => unknown
  'option-detail'?: (props: { option: BingSelectOption; selected: boolean; index: number }) => unknown
}>()

const resolvedSmoothScroll = computed(() =>
  resolveComponentSmoothScroll(props.smoothScroll, compactSmoothScrollOptions, {
    keyboard: false,
    smoothTouchpad: false,
    respectReducedMotion: true,
  }),
)

const selectId = `bing-select-${useId()}`
const listboxId = `${selectId}-listbox`

const rootRef = ref<HTMLElement | null>(null)
const triggerRef = ref<HTMLButtonElement | null>(null)
const searchInputRef = ref<BingInputExpose | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const bulkActionsRef = ref<HTMLElement | null>(null)
const selectAllRef = ref<HTMLButtonElement | null>(null)
const panelScrollRef = ref<BingScrollbarExpose | null>(null)
const optionDetailPanelRef = ref<HTMLElement | null>(null)
const optionDetailContentRef = ref<HTMLElement | null>(null)
const optionRefs = ref<HTMLElement[]>([])
const isOpen = ref(false)
const shouldRenderPanel = ref(false)
const activeItem = useActiveItem({ isPointerBlocked: () => isKeyboardScrollSyncing.value })
const { activeIndex, isKeyboardNavigating } = activeItem
const pendingSingleValue = ref<BingSelectValue | undefined>(undefined)
const customOptionHeight = ref(0)
const customPanelRadius = ref('')
const tagMotion = useSelectTagMotion()
const searchQuery = ref('')
const panelScrollHeight = ref(0)
const panelPosition = ref({
  align: 'start' as BingSelectPanelAlign,
  left: 0,
  minHeight: 0,
  maxHeight: 320,
  placement: 'bottom' as ResolvedPanelPlacement,
  top: 0,
  width: 0,
})

let panelTimeline: gsap.core.Timeline | undefined

const outsidePointer = useOutsidePointerDown(handleWindowPointerDown)
const searchFocus = useSearchShortcutFocus({
  input: searchInputRef,
  isOpen: () => isOpen.value,
  isSearchable: () => isSearchable.value,
  ownsTarget: isSelectInteractionTarget,
})
const blurValidation = useDeferredBlurValidation({
  formItem,
  isOpen: () => isOpen.value,
  isInteractionTarget: isSelectInteractionTarget,
})
const {
  isSyncing: isKeyboardScrollSyncing,
  start: startKeyboardScrollSync,
  scheduleEnd: scheduleKeyboardScrollSyncEnd,
  finish: finishKeyboardScrollSync,
} = useKeyboardScrollSync(isKeyboardNavigating)
const optionDetail = useOptionDetailPanel({
  listPanel: panelRef,
  detailPanel: optionDetailPanelRef,
  detailContent: optionDetailContentRef,
  itemSelector: '.bing-select__option',
  indexAttribute: 'optionIndex',
  isOpen: () => isOpen.value,
  isKeyboardNavigating,
  getItemState: (index) => {
    const option = props.options[index]

    return option ? { disabled: option.disabled, hasDetail: optionHasDetail(option) } : undefined
  },
  getItemElement: getOptionElementByIndex,
  getItemSurface: getOptionSurfaceElement,
  getKeyboardIndex: () => activeIndex.value,
  onPointerRestore: (index) => {
    if (!isKeyboardNavigating.value && !isKeyboardScrollSyncing.value) activeIndex.value = index
  },
})
const {
  index: optionDetailIndex,
  shouldRender: shouldRenderOptionDetailPanel,
  placement: optionDetailPlacement,
} = optionDetail

const normalizedPanelMaxHeight = computed(() =>
  typeof props.panelMaxHeight === 'number' ? `${props.panelMaxHeight}px` : props.panelMaxHeight,
)

const normalizedPanelMinHeight = computed(() =>
  typeof props.panelMinHeight === 'number' ? `${props.panelMinHeight}px` : props.panelMinHeight,
)

const normalizedVirtualThreshold = computed(() =>
  Math.max(0, Math.floor(props.virtualThreshold)),
)

// 自定义内容预留双行空间；description 在详情浮层展示，不增加默认行高。
const defaultOptionHeight = computed(() => {
  const height = { sm: 28, md: 32, lg: 36 }[resolvedSize.value]
  return customOptionHeight.value || height + (slots.option ? 16 : 0)
})

const normalizedVirtualItemHeight = computed(() =>
  props.virtualItemHeight !== undefined && Number.isFinite(props.virtualItemHeight)
    ? Math.max(28, Math.floor(props.virtualItemHeight))
    : defaultOptionHeight.value,
)

const normalizedVirtualOverscan = computed(() =>
  Math.max(0, Math.floor(props.virtualOverscan)),
)

const virtualList = useVirtualList({
  count: () => filteredOptionItems.value.length,
  mode: () => props.virtual,
  threshold: () => normalizedVirtualThreshold.value,
  itemHeight: () => normalizedVirtualItemHeight.value,
  overscan: () => normalizedVirtualOverscan.value,
  scrollbar: panelScrollRef,
  fallbackViewportHeight: panelScrollHeight,
  itemHeightVar: '--bing-select-virtual-item-height',
})
const {
  enabled: usesVirtualOptions,
  viewportHeight: virtualViewportHeight,
  startIndex: virtualStartIndex,
  endIndex: virtualEndIndex,
  bodyStyle: panelBodyStyle,
  stackStyle: optionStackStyle,
  refresh: updateScrollbarMetrics,
  clampScroll: clampVirtualScrollTop,
} = virtualList

const normalizedSearchQuery = computed(() => normalizeSearchText(searchQuery.value))
const isSearchable = computed(() => {
  if (props.searchable === true) {
    return true
  }

  if (props.searchable === false) {
    return false
  }

  return props.options.length > 8
})
const searchInputPlaceholder = computed(() =>
  props.searchPlaceholder.includes('/') ? props.searchPlaceholder : `${props.searchPlaceholder} (/)`,
)

const filteredOptionItems = computed(() => {
  const items = props.options.map((option, index) => ({
    index,
    option,
    position: index + 1,
    matchRanges: props.highlightMatches ? getMatchRanges(option.label, isSearchable.value ? searchQuery.value : '') : [],
  }))
  const query = isSearchable.value ? normalizedSearchQuery.value : ''

  if (!query) {
    return items
  }

  return items.filter(({ option }) => optionMatchesSearch(option, query)).map((item, index) => ({ ...item, position: index + 1 }))
})

const filteredOptions = computed(() => filteredOptionItems.value.map((item) => item.option))
const hasSearchQuery = computed(
  () => isSearchable.value && normalizedSearchQuery.value.length > 0,
)

const rootStyle = computed(() => {
  const style: Record<string, string> = {
    '--bing-select-min-width': normalizeCssLength(props.minWidth),
    ...glassStyle.value,
  }

  if (props.width !== undefined) {
    style['--bing-select-width'] = normalizeCssLength(props.width)
  }

  return style
})
const glassStyle = computed(() =>
  createGlassCssVariables('bing-select', {
    glass: props.glass,
    glassBlur: props.glassBlur,
    glassOpacity: props.glassOpacity,
    glassSaturation: props.glassSaturation,
  }),
)
const rootClasses = computed(() => [
  'bing-select',
  'bing-picker',
  `bing-picker--${resolvedSize.value}`,
  `bing-picker--status-${resolvedStatus.value}`,
  `bing-select--${resolvedSize.value}`,
  `bing-select--status-${resolvedStatus.value}`,
  {
    'is-open': isOpen.value,
    'is-disabled': resolvedDisabled.value,
    'is-invalid': resolvedStatus.value === 'error',
    'is-block': props.block || Boolean(formItem),
    'has-value': hasSelection.value,
    'is-multiple': props.multiple,
  },
])

const panelClasses = computed(() => [
  'bing-select__panel',
  'bing-picker__panel',
  `is-placement-${panelPosition.value.placement}`,
  `is-align-${panelPosition.value.align}`,
  {
    'is-glass': props.glass,
    'is-multiple': props.multiple,
    'is-keyboard-navigating': isKeyboardNavigating.value,
    'is-keyboard-scrolling': isKeyboardScrollSyncing.value,
  },
])

const panelAutoUpdate = useFloatingAutoUpdate(() => {
  updatePanelPosition()
  updateScrollbarMetrics()
  optionDetail.updatePosition()
}, {
  enabled: () => isOpen.value,
})

const overlayZIndex = useConfigZIndex('popover')
const overlay = useOverlay({
  open: () => shouldRenderPanel.value,
  elements: () => [rootRef.value, panelRef.value, optionDetailPanelRef.value],
  zIndex: () => overlayZIndex.value,
  onEscape: () => closePanel(true),
})

const panelStyle = computed<CSSProperties>(() => ({
  position: 'fixed',
  top: `${panelPosition.value.top}px`,
  left: `${panelPosition.value.left}px`,
  width: `${panelPosition.value.width}px`,
  zIndex: overlay.zIndex.value,
  '--bing-select-panel-min-height': `${panelPosition.value.minHeight}px`,
  '--bing-select-panel-max-height': `${panelPosition.value.maxHeight}px`,
  '--bing-select-default-option-height': `${usesVirtualOptions.value ? normalizedVirtualItemHeight.value : defaultOptionHeight.value}px`,
  '--bing-select-panel-radius': customPanelRadius.value || undefined,
  '--bing-picker-option-height': 'var(--bing-select-option-height, var(--bing-select-default-option-height))',
  '--bing-picker-panel-radius': 'var(--bing-select-panel-radius, var(--bing-radius-popover, 8px))',
  '--bing-picker-panel-min-height': `${panelPosition.value.minHeight}px`,
  '--bing-picker-panel-max-height': `${panelPosition.value.maxHeight}px`,
  ...glassStyle.value,
}))

const renderedOptionItems = computed(() => {
  if (!usesVirtualOptions.value) {
    return filteredOptionItems.value
  }

  return filteredOptionItems.value
    .slice(virtualStartIndex.value, virtualEndIndex.value)
})


const virtualOptionStyle = computed<CSSProperties | undefined>(() => {
  if (!usesVirtualOptions.value) {
    return undefined
  }

  return {
    height: `${normalizedVirtualItemHeight.value}px`,
  }
})

const selectedValues = computed<BingSelectValue[]>(() => {
  const value = props.modelValue

  if (props.multiple) {
    return Array.isArray(value) ? value : value === null ? [] : [value]
  }

  if (Array.isArray(value)) {
    return value.length > 0 ? [value[0] as BingSelectValue] : []
  }

  return value === null ? [] : [value]
})

const selectedValueSet = computed(() => new Set(selectedValues.value))
const selectedOptions = computed(() => props.options.filter(option =>
  option.value === option.value && selectedValueSet.value.has(option.value),
))
const usesDefaultTags = computed(() => props.multiple && !slots.value)
const overflowTags = useOverflowTags({
  items: () => selectedOptions.value,
  enabled: () => usesDefaultTags.value,
  paused: () => tagMotion.isAnimating.value,
  layoutKey: () => [resolvedSize.value, props.clearable],
})
const tagsViewportRef = overflowTags.tagsViewportRef
const tagMeasureRef = overflowTags.tagMeasureRef
const hiddenSelectedCount = overflowTags.hiddenTagCount
const visibleSelectedOptions = overflowTags.visibleItems
const measuredSelectedOptions = overflowTags.measurementItems
const measuredOverflowCounts = overflowTags.overflowCounts
const typeahead = useTypeahead({
  items: () => filteredOptions.value,
  activeIndex: () => filteredOptionItems.value.findIndex(item => item.index === activeIndex.value),
  enabled: () => props.typeahead && isOpen.value && !resolvedDisabled.value,
  onMatch: position => {
    activeItem.fromKeyboard(filteredOptionItems.value[position]!.index)
    scrollActiveOptionIntoView()
    optionDetail.scheduleKeyboardShow()
  },
})
const selectTagSize = computed<'sm' | 'md'>(() => (resolvedSize.value === 'lg' ? 'md' : 'sm'))
const enabledOptions = computed(() => filteredOptions.value.filter((option) => !option.disabled))
const enabledValues = computed(() => enabledOptions.value.map((option) => option.value))
const selectedEnabledOptionCount = computed(
  () => enabledOptions.value.filter((option) => isOptionSelected(option)).length,
)
const hasSelection = computed(() => selectedOptions.value.length > 0)
const canClear = computed(() => props.clearable && !resolvedDisabled.value && hasSelection.value)
const canSelectAll = computed(() => props.multiple && props.showSelectAll)
const hasEnabledOptions = computed(() => enabledOptions.value.length > 0)
const allEnabledSelected = computed(
  () =>
    hasEnabledOptions.value &&
    selectedEnabledOptionCount.value === enabledOptions.value.length,
)
const someEnabledSelected = computed(
  () =>
    selectedEnabledOptionCount.value > 0 &&
    !allEnabledSelected.value,
)

const activeOptionId = computed(() =>
  isOpen.value && activeIndex.value >= 0 ? getOptionId(activeIndex.value) : undefined,
)

const optionDetailOption = computed(() => {
  const option = props.options[optionDetailIndex.value]

  return optionHasDetail(option) ? option : undefined
})

const optionDetailSelected = computed(() =>
  optionDetailOption.value ? isOptionSelected(optionDetailOption.value) : false,
)

const optionDetailText = computed(() =>
  optionDetailOption.value ? getOptionDetailText(optionDetailOption.value) : undefined,
)

const optionDetailMetaEntries = computed(() =>
  getOptionMetaEntries(optionDetailOption.value),
)

const displayText = computed(() => {
  if (!hasSelection.value) {
    return props.placeholder
  }

  const labels = selectedOptions.value.map((option) => option.label)

  if (props.multiple && labels.length > 2) {
    return `${labels.slice(0, 2).join(', ')} +${labels.length - 2}`
  }

  return labels.join(props.multiple ? ', ' : '')
})

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function normalizeCssLength(value: string | number) {
  if (typeof value === 'number') {
    return `${value}px`
  }

  const trimmedValue = value.trim()

  return /^-?\d+(\.\d+)?$/.test(trimmedValue) ? `${trimmedValue}px` : value
}

function valuesEqual(left: BingSelectValue, right: BingSelectValue) {
  return left === right
}

function uniqueValues(values: BingSelectValue[]) {
  // 保持严格相等语义（NaN 不匹配），批量全选去重不再反复扫描数组。
  return [...new Set(values.filter(value => value === value))]
}

function getOptionSearchText(option: BingSelectOption) {
  return normalizeSearchText(
    [
      option.label,
      option.value,
      option.description,
      option.detail,
      ...getOptionMetaEntries(option).flatMap((entry) => [entry.key, entry.value]),
    ].join(' '),
  )
}

function optionMatchesSearch(option: BingSelectOption, query: string) {
  return searchQueryMatches(getOptionSearchText(option), query, true)
}

function getOptionsForValue(value: BingSelectModelValue | BingSelectValue[]) {
  const values = Array.isArray(value) ? value : value === null ? [] : [value]
  const selected = new Set(values)
  return props.options.filter((option) => option.value === option.value && selected.has(option.value))
}

function getOptionId(index: number) {
  return `${selectId}-option-${index}`
}

function isOptionSelected(option: BingSelectOption) {
  if (!props.multiple && pendingSingleValue.value !== undefined) return pendingSingleValue.value === option.value
  return option.value === option.value && selectedValueSet.value.has(option.value)
}

function getOptionDetailText(option: BingSelectOption) {
  if (typeof option.detail === 'string' && option.detail.trim()) {
    return option.detail
  }

  return option.description
}

function getOptionMetaEntries(option: BingSelectOption | undefined) {
  return getMetaEntries(option?.meta)
}

function optionHasDetail(option: BingSelectOption | undefined): option is BingSelectOption {
  if (!option) {
    return false
  }

  return Boolean(
    slots['option-detail'] ||
      getOptionDetailText(option) ||
      getOptionMetaEntries(option).length > 0,
  )
}

function emitValue(
  value: BingSelectModelValue,
  option?: BingSelectOption,
) {
  blurValidation.cancel()

  const payload: BingSelectChangePayload = {
    value,
    option,
    options: getOptionsForValue(value),
  }

  emit('update:modelValue', value)
  emit('change', payload)
  formItem?.handleControlChange()
}

function getFirstEnabledIndex() {
  return filteredOptionItems.value.find((item) => !item.option.disabled)?.index ?? -1
}

function syncActiveIndex() {
  const selectedIndex =
    filteredOptionItems.value.find(
      (item) => !item.option.disabled && isOptionSelected(item.option),
    )?.index ?? -1

  activeIndex.value = selectedIndex >= 0 ? selectedIndex : getFirstEnabledIndex()
}

function getNumericPanelMaxHeight() {
  if (typeof props.panelMaxHeight === 'number') {
    return Math.max(0, props.panelMaxHeight)
  }

  const parsed = Number.parseFloat(props.panelMaxHeight)

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 320
}

function getNumericPanelMinHeight() {
  if (typeof props.panelMinHeight === 'number') {
    return Math.max(0, props.panelMinHeight)
  }

  const parsed = Number.parseFloat(props.panelMinHeight)

  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function updatePanelPosition() {
  if (!isBrowser() || !rootRef.value || !panelRef.value) {
    return
  }

  const rootStyle = getComputedStyle(rootRef.value)
  customOptionHeight.value = Number.parseFloat(rootStyle.getPropertyValue('--bing-select-option-height')) || 0
  customPanelRadius.value = rootStyle.getPropertyValue('--bing-select-panel-radius').trim()
  const viewportPadding = 12
  const panelGap = Number.isFinite(props.panelGap)
    ? Math.max(0, props.panelGap)
    : 10
  const anchorRect = rootRef.value.getBoundingClientRect()
  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight
  const desiredMaxHeight = getNumericPanelMaxHeight()
  const desiredMinHeight = Math.min(getNumericPanelMinHeight(), desiredMaxHeight)
  const panelBody = panelRef.value.querySelector<HTMLElement>('.bing-select__panel-body')
  const bulkActionsHeight = bulkActionsRef.value?.getBoundingClientRect().height ?? 0
  const panelChromeHeight = 2
  const measuredContentHeight = virtualList.getContentHeight() ?? panelBody?.scrollHeight ?? 0
  const estimatedOptionHeight = usesVirtualOptions.value
    ? normalizedVirtualItemHeight.value
    : defaultOptionHeight.value
  const estimatedContentHeight = Math.max(
    estimatedOptionHeight,
    filteredOptionItems.value.length * estimatedOptionHeight,
  )
  const contentHeight = measuredContentHeight || estimatedContentHeight
  const naturalPanelHeight = bulkActionsHeight + contentHeight + panelChromeHeight
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
  const maxHeight = Math.max(0, Math.min(desiredMaxHeight, availableHeight))
  const minHeight = Math.min(desiredMinHeight, maxHeight)
  const panelHeight = clamp(naturalPanelHeight, minHeight, maxHeight)
  const scrollHeight = Math.max(
    0,
    panelHeight - bulkActionsHeight - panelChromeHeight,
  )
  const maxWidth = Math.max(0, viewportWidth - viewportPadding * 2)
  const width = Math.min(Math.max(anchorRect.width, minPanelWidth), maxWidth)
  const position = computeFloatingPosition({
    anchor: anchorRect,
    floating: { width, height: panelHeight },
    side: placement,
    flip: 'none',
    align: align === 'middle' ? 'center' : align,
    ...layout,
  })
  const left = position.left
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

function getOptionElementByIndex(index: number) {
  if (index < 0 || !isBrowser()) {
    return null
  }

  return document.getElementById(getOptionId(index)) as HTMLElement | null
}

function handlePanelScroll(event: Event) {
  const viewport = event.target as HTMLElement | null

  if (!viewport) {
    return
  }

  virtualList.readViewport(viewport)

  if (isKeyboardNavigating.value) {
    optionDetail.scheduleKeyboardShow()
    scheduleKeyboardScrollSyncEnd()
    return
  }

  optionDetail.handleListScroll()
}

function handlePanelWheel(event: WheelEvent) {
  optionDetail.rememberPointer(event)
}

function handlePanelPointerMove(event: PointerEvent) {
  activeItem.rememberPointer(event)
  optionDetail.rememberPointer(event)
}

function getOptionElements() {
  const panel = panelRef.value

  if (!panel) {
    return []
  }

  return Array.from(panel.querySelectorAll<HTMLElement>('.bing-select__option'))
}

function getOptionLiquidElements() {
  const panel = panelRef.value

  if (!panel) {
    return []
  }

  return Array.from(panel.querySelectorAll<HTMLElement>('.bing-select__option-liquid'))
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

  const options = getOptionElements()
  const targets = [panel, ...options]
  killPanelTimeline()
  gsap.killTweensOf([...targets, ...getOptionLiquidElements()])

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
    items: options,
    actionRail: null,
    actionButtons: [],
    placement: panelPosition.value.placement,
    align: panelPosition.value.align,
    onComplete: () => {
      panelTimeline = undefined
    },
  })
}

function finishClose(restoreFocus: boolean) {
  shouldRenderPanel.value = false
  activeItem.reset()
  pendingSingleValue.value = undefined
  finishKeyboardScrollSync()
  optionDetail.hide(true)
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

  const options = getOptionElements()
  killPanelTimeline()
  gsap.killTweensOf(
    [panel, ...options, ...getOptionLiquidElements()].filter(Boolean),
  )
  options.forEach((option) => option.classList.remove('is-liquid-active'))

  if (prefersReducedMotion()) {
    finishClose(restoreFocus)
    return
  }

  panelTimeline = createSelectPanelLeave({
    panel,
    items: options,
    actionRail: null,
    actionButtons: [],
    placement: panelPosition.value.placement,
    align: panelPosition.value.align,
    onComplete: () => {
      panelTimeline = undefined
      finishClose(restoreFocus)
    },
  })
}

function isSelectInteractionTarget(target: EventTarget | null): target is Node {
  if (!(target instanceof Node)) {
    return false
  }

  return Boolean(
    rootRef.value?.contains(target) ||
      panelRef.value?.contains(target) ||
      optionDetailPanelRef.value?.contains(target),
  )
}

async function openPanel() {
  if (resolvedDisabled.value || isOpen.value) {
    return
  }

  pendingSingleValue.value = undefined
  typeahead.reset()
  shouldRenderPanel.value = true
  isOpen.value = true
  syncActiveIndex()
  outsidePointer.start()
  searchFocus.start()
  panelAutoUpdate.start()
  emit('open')

  await nextTick()
  updatePanelPosition()
  updateScrollbarMetrics()
  playOpenAnimation()
  scrollActiveOptionIntoView()

  await searchFocus.focus()

  if (isKeyboardNavigating.value) {
    optionDetail.scheduleKeyboardShow()
  }
}

function closePanel(restoreFocus = false) {
  if (!isOpen.value) {
    return
  }

  panelScrollRef.value?.stop()
  isOpen.value = false
  typeahead.reset()
  finishKeyboardScrollSync()
  outsidePointer.stop()
  searchFocus.stop()
  panelAutoUpdate.dispose()
  optionDetail.hide()
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
  const optionDetailPanel = optionDetailPanelRef.value

  if (!root || !(event.target instanceof Node) || overlay.contains(event.target)) {
    return
  }

  if (
    !root.contains(event.target) &&
    !panel?.contains(event.target) &&
    !optionDetailPanel?.contains(event.target)
  ) {
    closePanel()
  }
}

function handleChevronClick(event: MouseEvent) {
  event.stopPropagation()
  triggerRef.value?.focus()
  togglePanel()
}

function getOptionLiquidElement(option: HTMLElement) {
  return option.querySelector<HTMLElement>('.bing-select__option-liquid')
}

function getOptionSurfaceElement(option: HTMLElement) {
  return option.querySelector<HTMLElement>('.bing-select__option-surface') ?? option
}

function setOptionLiquidOrigin(
  option: HTMLElement,
  liquid: HTMLElement,
  event: MouseEvent | PointerEvent,
) {
  const rect = getOptionSurfaceElement(option).getBoundingClientRect()
  const x = clamp(event.clientX - rect.left, 0, rect.width)
  const y = clamp(event.clientY - rect.top, 0, rect.height)
  const origin = `${x}px ${y}px`

  liquid.style.setProperty('--bing-select-liquid-x', `${x}px`)
  liquid.style.setProperty('--bing-select-liquid-y', `${y}px`)
  liquid.style.transformOrigin = origin
}

function handleOptionMouseEnter(
  event: MouseEvent | PointerEvent,
  option: BingSelectOption,
  index: number,
) {
  optionDetail.rememberPointer(event)
  if (!activeItem.fromPointer(option.disabled ? activeIndex.value : index, event)) return
  const optionElement = event.currentTarget as HTMLElement

  if (option.disabled) {
    optionDetail.hide(true)
    return
  }

  if (optionHasDetail(option)) {
    optionDetail.show(optionElement, index)
  } else {
    optionDetail.hide(true)
  }

  if (prefersReducedMotion()) {
    return
  }

  const liquid = getOptionLiquidElement(optionElement)

  if (!liquid) {
    return
  }

  optionElement.classList.add('is-liquid-active')
  setOptionLiquidOrigin(optionElement, liquid, event)
  enterLiquidHover(liquid)
}

function handleOptionMouseMove(
  event: MouseEvent | PointerEvent,
  option: BingSelectOption,
  index: number,
) {
  optionDetail.rememberPointer(event)
  if (!activeItem.fromPointer(option.disabled ? activeIndex.value : index, event, true)) return
  const optionElement = event.currentTarget as HTMLElement

  if (option.disabled) {
    optionDetail.hide(true)
    return
  }

  if (optionHasDetail(option)) {
    optionDetail.cancelHide()

    if (optionDetailIndex.value !== index || !shouldRenderOptionDetailPanel.value) {
      optionDetail.show(optionElement, index)
    }
  } else {
    optionDetail.hide(true)
  }

  if (prefersReducedMotion()) {
    return
  }

  const liquid = getOptionLiquidElement(optionElement)

  if (!liquid) {
    return
  }

  setOptionLiquidOrigin(optionElement, liquid, event)

  if (!optionElement.classList.contains('is-liquid-active')) {
    optionElement.classList.add('is-liquid-active')
    enterLiquidHover(liquid)
  }
}

function handleOptionMouseLeave(
  event: MouseEvent | PointerEvent,
  option: BingSelectOption,
) {
  if (option.disabled || prefersReducedMotion()) {
    return
  }

  const optionElement = event.currentTarget as HTMLElement
  const liquid = getOptionLiquidElement(optionElement)

  optionElement.classList.remove('is-liquid-active')

  if (!liquid) {
    return
  }

  leaveLiquidHover(liquid)
}

function selectOption(option: BingSelectOption) {
  if (resolvedDisabled.value || option.disabled) {
    return
  }

  const wasSelected = isOptionSelected(option)

  if (props.multiple) {
    const nextValues = wasSelected
      ? selectedValues.value.filter((value) => !valuesEqual(value, option.value))
      : uniqueValues([...selectedValues.value, option.value])

    emitValue(nextValues, option)
    return
  }

  pendingSingleValue.value = option.value
  activeIndex.value = props.options.indexOf(option)
  emitValue(option.value, option)
  closePanel(true)
}

function selectAllEnabledOptions() {
  if (!props.multiple || resolvedDisabled.value || !hasEnabledOptions.value || allEnabledSelected.value) {
    return
  }

  emitValue(uniqueValues([...selectedValues.value, ...enabledValues.value]))
}

function clearEnabledOptions() {
  if (!props.multiple || resolvedDisabled.value || selectedEnabledOptionCount.value === 0) {
    return
  }

  const valuesToClear = new Set(enabledValues.value)
  emitValue(selectedValues.value.filter((value) => value !== value || !valuesToClear.has(value)))
}

function toggleEnabledOptionsSelection() {
  if (allEnabledSelected.value) {
    clearEnabledOptions()
    return
  }

  selectAllEnabledOptions()
}

function clearSelection() {
  if (!canClear.value) {
    return
  }

  const nextValue: BingSelectModelValue = props.multiple ? [] : null

  emit('clear')
  emitValue(nextValue)
}

function clearSearchQuery() {
  searchQuery.value = ''
}

function removeSelectedOption(option: BingSelectOption) {
  if (resolvedDisabled.value) {
    return
  }

  const nextValues = selectedValues.value.filter(
    (value) => !valuesEqual(value, option.value),
  )

  emitValue(nextValues, option)
  void nextTick(() => triggerRef.value?.focus())
}

function handleClearClick(event: MouseEvent) {
  event.stopPropagation()
  clearSelection()
}

function stopOptionDetailEvent(event: Event) {
  event.stopPropagation()
}

function handleSearchInputKeydown(event: KeyboardEvent) {
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
    selectActiveOption(event)
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
    if (focusSelectAll(event)) return
    triggerRef.value?.focus({ preventScroll: true })
    closePanel()
  }
}

function focusSelectAll(event: KeyboardEvent) {
  if (!event.shiftKey && isOpen.value && selectAllRef.value && !selectAllRef.value.disabled) {
    event.preventDefault()
    selectAllRef.value.focus({ preventScroll: true })
    return true
  }
  return false
}

function handleSelectAllKeydown(event: KeyboardEvent) {
  if (event.key === 'Tab') {
    if (event.shiftKey) {
      event.preventDefault()
      if (isSearchable.value) void searchFocus.focus()
      else triggerRef.value?.focus({ preventScroll: true })
    } else {
      triggerRef.value?.focus({ preventScroll: true })
      closePanel()
    }
  } else if (event.key === 'Escape') {
    event.preventDefault()
    closePanel(true)
  } else if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    toggleEnabledOptionsSelection()
  } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
    handleKeydown(event)
    triggerRef.value?.focus({ preventScroll: true })
  } else if (typeahead.handleKeydown(event)) {
    triggerRef.value?.focus({ preventScroll: true })
  }
}

function scrollActiveOptionIntoView() {
  if (activeIndex.value < 0) {
    return
  }

  void nextTick(() => {
    if (usesVirtualOptions.value) {
      virtualList.scrollToIndex(
        filteredOptionItems.value.findIndex((item) => item.index === activeIndex.value),
        { beforeScroll: startKeyboardScrollSync },
      )
      return
    }

    panelScrollRef.value?.stop()
    startKeyboardScrollSync()
    getOptionElementByIndex(activeIndex.value)?.scrollIntoView?.({
      block: 'nearest',
    })
    scheduleKeyboardScrollSyncEnd()
  })
}

function moveActive(delta: number) {
  const items = filteredOptionItems.value

  if (items.length === 0) {
    return
  }

  let nextPosition = items.findIndex((item) => item.index === activeIndex.value)

  if (nextPosition < 0) {
    nextPosition = delta > 0 ? -1 : 0
  }

  for (let step = 0; step < items.length; step += 1) {
    nextPosition = (nextPosition + delta + items.length) % items.length
    const nextItem = items[nextPosition]

    if (nextItem && !nextItem.option.disabled) {
      activeItem.fromKeyboard(nextItem.index)
      scrollActiveOptionIntoView()
      optionDetail.scheduleKeyboardShow()
      return
    }
  }
}

function moveToEdge(edge: 'first' | 'last') {
  const items =
    edge === 'first' ? filteredOptionItems.value : [...filteredOptionItems.value].reverse()
  const item = items.find((entry) => !entry.option.disabled)

  if (!item) {
    return
  }

  activeItem.fromKeyboard(item.index)
  scrollActiveOptionIntoView()
  optionDetail.scheduleKeyboardShow()
}

function selectActiveOption(event: KeyboardEvent) {
  const option = props.options[activeIndex.value]

  if (!option || resolvedDisabled.value || option.disabled) {
    return
  }

  playClickFeedback(event, document.getElementById(getOptionId(activeIndex.value)))
  selectOption(option)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && (event.defaultPrevented || !overlay.isTop(event))) return
  if (resolvedDisabled.value) {
    return
  }

  if (searchFocus.handleShortcut(event)) {
    return
  }

  if (event.key === 'Tab') {
    if (focusSelectAll(event)) return
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

  if (isOpen.value && typeahead.handleKeydown(event)) return

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    isKeyboardNavigating.value = true

    if (!isOpen.value) {
      playClickFeedback(event, triggerRef.value)
      void openPanel()
      return
    }

    selectActiveOption(event)
  }
}

watch(
  () => resolvedDisabled.value,
  (disabled) => {
    if (disabled) {
      closePanel()
    }
  },
)

watch(
  () => normalizedSearchQuery.value,
  () => {
    optionDetail.hide(true)
    syncActiveIndex()
    virtualList.reset()

    if (isOpen.value) {
      void nextTick(() => {
        updatePanelPosition()
        virtualList.reset()

        void nextTick(() => {
          virtualList.reset()
          updateScrollbarMetrics()
        })
      })
    }
  },
)

watch(
  () => [props.options, props.modelValue, props.multiple],
  () => {
    if (isOpen.value) {
      panelScrollRef.value?.stop()
      if (!filteredOptionItems.value.some(item => item.index === activeIndex.value && !item.option.disabled)) syncActiveIndex()
      void nextTick(() => {
        clampVirtualScrollTop()
        updatePanelPosition()
        updateScrollbarMetrics()
        optionDetail.updatePosition()
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
        optionDetail.updatePosition()
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
      optionDetailPanelRef.value,
      optionDetailContentRef.value,
      ...optionRefs.value,
      ...getOptionLiquidElements(),
    ].filter(Boolean),
  )
})
watch(isKeyboardNavigating, keyboard => {
  if (!keyboard) return
  getOptionElements().forEach(option => option.classList.remove('is-liquid-active'))
  gsap.killTweensOf(getOptionLiquidElements())
  gsap.set(getOptionLiquidElements(), { opacity: 0, scale: 0.08 })
})

function getLabelParts(label: string, ranges: { start: number; end: number }[]) {
  const parts: { text: string; match: boolean }[] = []
  let offset = 0
  for (const range of ranges) {
    if (range.start > offset) parts.push({ text: label.slice(offset, range.start), match: false })
    parts.push({ text: label.slice(range.start, range.end), match: true })
    offset = range.end
  }
  if (offset < label.length) parts.push({ text: label.slice(offset), match: false })
  return parts
}
</script>

<template>
  <div ref="rootRef" :class="rootClasses" :style="rootStyle" @keydown="handleKeydown" @pointermove="activeItem.rememberPointer">
    <div class="bing-select__control bing-picker__control">
      <button v-click-feedback
        ref="triggerRef"
        class="bing-select__trigger bing-picker__trigger"
        :class="{ 'is-tag-trigger': usesDefaultTags }"
        type="button"
        role="combobox"
        :id="resolvedId"
        :disabled="resolvedDisabled"
        :aria-label="ariaLabel || displayText"
        :aria-describedby="resolvedAriaDescribedby"
        :aria-invalid="resolvedStatus === 'error' || undefined"
        :aria-haspopup="'listbox'"
        :aria-expanded="isOpen"
        :aria-controls="listboxId"
        :aria-activedescendant="activeOptionId"
        @click="togglePanel"
        @blur="blurValidation.handleBlur"
      >
        <span
          v-if="!usesDefaultTags"
          class="bing-select__value bing-picker__value"
          :class="{ 'is-placeholder': !hasSelection }"
        >
          <slot name="value" :selected-options="selectedOptions" :placeholder="placeholder">
            {{ displayText }}
          </slot>
        </span>
      </button>

      <div
        v-if="usesDefaultTags"
        :ref="element => tagsViewportRef = element as HTMLElement | null"
        class="bing-select__tags-value bing-picker__tags-value"
      >
        <template v-if="!hasSelection && visibleSelectedOptions.length === 0 && !tagMotion.isAnimating.value">
          <span class="bing-select__tags-placeholder bing-picker__tags-placeholder">
            {{ placeholder }}
          </span>
        </template>

        <TransitionGroup :css="false" v-bind="tagMotion.tagHooks">
          <BingTag
            v-for="option in visibleSelectedOptions"
            :key="option.value"
            class="bing-select__value-tag bing-picker__value-tag"
            :label="option.label"
            :size="selectTagSize"
            closable
            :disabled="resolvedDisabled"
            :close-aria-label="`移除 ${option.label}`"
            @close="removeSelectedOption(option)"
          />
        </TransitionGroup>

        <BingTag
          v-if="hiddenSelectedCount > 0"
          class="bing-select__overflow-tag bing-picker__overflow-tag"
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
        class="bing-select__clear bing-picker__clear"
        aria-label="清空选择"
        @click="handleClearClick"
        @keydown.stop
      >
        <template #prefix>
          <BingIcon :icon="X" :size="16" :stroke-width="1.75" />
        </template>
      </BingButton>

      <BingButton variant="ghost" size="xs" rounded="sm" :throttle="false"
        class="bing-select__chevron bing-picker__chevron"
        tabindex="-1"
        aria-hidden="true"
        :disabled="resolvedDisabled"
        @click="handleChevronClick"
      >
        <template #prefix>
          <BingIcon :icon="ChevronDown" :size="16" :stroke-width="1.75" />
        </template>
      </BingButton>
    </div>

    <div
      v-if="usesDefaultTags && hasSelection"
      :ref="element => tagMeasureRef = element as HTMLElement | null"
      class="bing-select__tag-measure bing-picker__tag-measure"
      aria-hidden="true"
    >
      <BingTag
        v-for="option in measuredSelectedOptions"
        :key="`measure-${option.value}`"
        class="bing-select__value-tag bing-select__measure-tag bing-picker__value-tag"
        data-picker-measure-tag
        :label="option.label"
        :size="selectTagSize"
        closable
      />
      <BingTag
        v-for="count in measuredOverflowCounts"
        :key="`overflow-${count}`"
        class="bing-select__overflow-tag bing-select__measure-overflow bing-picker__overflow-tag"
        :data-overflow-count="count"
        :label="`+${count}`"
        :size="selectTagSize"
        tone="neutral"
      />
    </div>

    <Teleport v-if="clientReady" to="body">
      <div
        v-if="shouldRenderPanel"
        ref="panelRef"
        :class="panelClasses"
        :style="panelStyle"
        @keydown="handleKeydown"
        @pointermove="handlePanelPointerMove"
        @wheel.passive="handlePanelWheel"
      >
        <div
          v-if="isSearchable || canSelectAll"
          ref="bulkActionsRef"
          class="bing-select__bulk-actions bing-picker__bulk-actions"
        >
          <div v-if="isSearchable" class="bing-picker__search-area">
            <BingInput
              ref="searchInputRef"
              v-model="searchQuery"
              class="bing-select__search bing-picker__search"
              type="search"
              role="combobox"
              :aria-expanded="isOpen"
              :aria-controls="listboxId"
              :aria-activedescendant="activeOptionId"
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
          <div v-if="canSelectAll" class="bing-select__action-rail bing-picker__actions">
            <button
              v-click-feedback="!allEnabledSelected"
              ref="selectAllRef"
              class="bing-select__action-button bing-picker__select-all"
              data-action="toggle-select-all"
              type="button"
              role="checkbox"
              tabindex="0"
              :disabled="!hasEnabledOptions"
              :aria-checked="someEnabledSelected ? 'mixed' : allEnabledSelected"
              :aria-label="`${allEnabledSelected ? clearAllText : hasSearchQuery ? '全选结果' : selectAllText}：已选 ${selectedEnabledOptionCount} 项，共 ${enabledOptions.length} 项`"
              @mousedown.prevent
              @click.stop="toggleEnabledOptionsSelection"
              @keydown.stop="handleSelectAllKeydown"
            >
              <BingCheckbox decorative :model-value="allEnabledSelected" :indeterminate="someEnabledSelected" :size="16" />
              <span class="bing-picker__select-all-label">{{ hasSearchQuery ? '全选结果' : selectAllText }}</span>
              <span class="bing-picker__select-all-count">{{ selectedEnabledOptionCount }} / {{ enabledOptions.length }}</span>
            </button>
          </div>
        </div>

        <BingScrollbar
          ref="panelScrollRef"
          class="bing-select__panel-scroll bing-picker__panel-scroll"
          :height="panelScrollHeight"
          :smooth="resolvedSmoothScroll"
          :focusable="false"
          always
          aria-label="选项列表"
          @scroll="handlePanelScroll"
        >
          <div
            :id="listboxId"
            role="listbox"
            :aria-label="ariaLabel || placeholder"
            :aria-multiselectable="multiple || undefined"
            class="bing-select__panel-body"
            :class="{ 'is-virtual': usesVirtualOptions }"
            :style="panelBodyStyle"
          >
            <div
              class="bing-select__option-stack"
              :class="{ 'is-virtual': usesVirtualOptions }"
              :style="optionStackStyle"
              @mouseenter="optionDetail.cancelHide"
              @mouseleave="optionDetail.scheduleHide()"
            >
              <button v-click-feedback
                v-for="item in renderedOptionItems"
                :id="getOptionId(item.index)"
                :key="item.option.value"
                ref="optionRefs"
                class="bing-select__option"
                type="button"
                role="option"
                tabindex="-1"
                :aria-setsize="usesVirtualOptions ? filteredOptionItems.length : undefined"
                :aria-posinset="usesVirtualOptions ? item.position : undefined"
                :data-option-index="item.index"
                :style="virtualOptionStyle"
                :disabled="item.option.disabled"
                :aria-selected="isOptionSelected(item.option)"
                :class="{
                  'is-selected': isOptionSelected(item.option),
                  'is-active': activeIndex === item.index,
                  'is-disabled': item.option.disabled,
                }"
                @mousedown.prevent
                @click="selectOption(item.option)"
                @mouseenter="handleOptionMouseEnter($event, item.option, item.index)"
                @mousemove="handleOptionMouseMove($event, item.option, item.index)"
                @mouseleave="handleOptionMouseLeave($event, item.option)"
              >
                <span class="bing-select__option-surface">
                  <span class="bing-select__option-liquid" aria-hidden="true"></span>
                  <BingCheckbox
                    decorative
                    :model-value="isOptionSelected(item.option)"
                    :size="16"
                    :shape="multiple ? 'rounded' : 'circle'"
                  />
                  <span class="bing-select__option-main">
                    <slot
                      name="option"
                      :option="item.option"
                      :selected="isOptionSelected(item.option)"
                      :match-ranges="item.matchRanges"
                    >
                      <span class="bing-select__option-label"><template v-for="(part, index) in getLabelParts(item.option.label, item.matchRanges)" :key="index"><mark v-if="part.match" class="bing-picker__match">{{ part.text }}</mark><template v-else>{{ part.text }}</template></template></span>
                    </slot>
                  </span>
                </span>
              </button>
            </div>

            <div v-if="filteredOptions.length === 0" class="bing-select__empty">
              {{ hasSearchQuery ? noSearchResultsText : emptyText }}
            </div>
          </div>
        </BingScrollbar>
      </div>

      <div
        v-if="shouldRenderOptionDetailPanel && optionDetailOption"
        ref="optionDetailPanelRef"
        class="bing-select__option-detail-panel"
        :class="`is-placement-${optionDetailPlacement}`"
        :style="glassStyle"
        aria-hidden="true"
        @pointerdown="stopOptionDetailEvent"
        @click="stopOptionDetailEvent"
        @mouseenter="optionDetail.cancelHide"
        @mouseleave="optionDetail.scheduleHide()"
      >
        <div ref="optionDetailContentRef" class="bing-select__option-detail-content">
          <slot
            name="option-detail"
            :option="optionDetailOption"
            :selected="optionDetailSelected"
            :index="optionDetailIndex"
          >
            <span class="bing-select__option-detail-title">
              {{ optionDetailOption.label }}
            </span>
            <span v-if="optionDetailText" class="bing-select__option-detail-text">
              {{ optionDetailText }}
            </span>
            <span
              v-for="entry in optionDetailMetaEntries"
              :key="entry.key"
              class="bing-select__option-detail-meta"
            >
              <span class="bing-select__option-detail-meta-key">{{ entry.key }}</span>
              <span class="bing-select__option-detail-meta-value">{{ entry.value }}</span>
            </span>
          </slot>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bing-select, .bing-select__panel {
  --bing-picker-height: var(--bing-select-height, var(--bing-control-height-md, 36px));
  --bing-picker-padding-x: var(--bing-select-padding-x, 10px);
  --bing-picker-radius: var(--bing-select-radius, var(--bing-radius-md, 6px));
  --bing-picker-min-width: var(--bing-select-min-width, 180px);
  --bing-picker-width: var(--bing-select-width, 320px);
  --bing-picker-glass-opacity: var(--bing-select-glass-opacity, 0.85);
  --bing-picker-glass-blur: var(--bing-select-glass-blur, 10px);
  --bing-picker-glass-saturation: var(--bing-select-glass-saturation, 1.28);
}
.bing-select.is-block { --bing-picker-width: var(--bing-select-width, 100%); }
.bing-select--sm { --bing-picker-height: var(--bing-select-height, var(--bing-control-height-sm, 32px)); --bing-picker-padding-x: var(--bing-select-padding-x, 8px); }
.bing-select--lg { --bing-picker-height: var(--bing-select-height, var(--bing-control-height-lg, 40px)); --bing-picker-padding-x: var(--bing-select-padding-x, 12px); }
.bing-select__option.is-selected .bing-select__option-label { color: var(--bing-heading); font-weight: 500; }
.bing-select__option:disabled { cursor: not-allowed; }
.bing-select__option:not(.is-active) .bing-select__option-liquid { visibility: hidden; }

.bing-select__panel-scroll {
  flex: 0 0 auto;
  min-height: 0;
}

.bing-select__panel-body {
  box-sizing: border-box;
  position: relative;
  display: grid;
  min-width: 0;
  padding: 6px 4px;
}

.bing-select__panel-body.is-virtual {
  display: block;
  min-width: 0;
  padding: 0;
}

.bing-select__option-stack {
  --bing-select-option-visual-gap: 4px;

  display: grid;
  min-width: 0;
  gap: 0;
  /* 普通列表与虚拟列表使用相同的合成容器，保持选项入场前后的绘制上下文。 */
  transform: translateZ(0);
  will-change: transform;
}

.bing-select__option-stack.is-virtual {
  position: absolute;
  top: 0;
  left: 4px;
  width: calc(100% - 8px);
  min-width: 0;
  contain: layout paint style;
}

.bing-select__option {
  box-sizing: border-box;
  position: relative;
  display: block;
  width: 100%;
  min-height: var(--bing-select-option-height, var(--bing-select-default-option-height, 32px));
  padding: calc(var(--bing-select-option-visual-gap) / 2) 0;
  border: 0;
  background: transparent;
  color: var(--bing-text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.bing-select__option-surface {
  box-sizing: border-box;
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: calc(var(--bing-select-option-height, var(--bing-select-default-option-height, 32px)) - var(--bing-select-option-visual-gap));
  gap: 8px;
  padding: 2px 8px;
  overflow: hidden;
  border: 1px solid transparent;
  border-radius: var(--bing-radius-sm, 4px);
  background: transparent;
  color: inherit;
  transition:
    border-color 260ms var(--bing-ease-smooth),
    background 260ms var(--bing-ease-smooth),
    box-shadow 260ms var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth),
    filter var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-select__panel-body.is-virtual .bing-select__option {
  min-height: var(--bing-select-virtual-item-height, 32px);
}

.bing-select__option-liquid {
  --bing-select-liquid-x: 50%;
  --bing-select-liquid-y: 50%;

  position: absolute;
  inset: -1px;
  z-index: 0;
  border-radius: inherit;
  background:
    radial-gradient(
      circle at var(--bing-select-liquid-x) var(--bing-select-liquid-y),
      rgb(var(--bing-liquid-rgb) / var(--bing-liquid-strength)) 0%,
      rgb(var(--bing-liquid-rgb) / var(--bing-liquid-strength)) 64%,
      rgb(var(--bing-liquid-rgb) / calc(var(--bing-liquid-strength) * 0.72)) 82%,
      rgb(var(--bing-liquid-rgb) / calc(var(--bing-liquid-strength) * 0.35)) 100%
    );
  opacity: 0;
  pointer-events: none;
  transform: scale(0.08);
  will-change: transform, opacity;
}

.bing-select__option-surface :deep(.bing-checkbox),
.bing-select__option-main {
  position: relative;
  z-index: 2;
}

.bing-select__option-surface::after {
  position: absolute;
  inset: 0;
  z-index: 1;
  border-radius: inherit;
  content: '';
  pointer-events: none;
  opacity: 0;
  transition: opacity 220ms var(--bing-ease-smooth);
}

.bing-select__option.is-active:not(:disabled) > .bing-select__option-surface {
  border-color: transparent;
  background: var(--bing-surface-hover);
  box-shadow: none;
}

.bing-select__option.is-active:not(:disabled) > .bing-select__option-surface::after {
  background: transparent;
  opacity: 1;
}

.bing-select__panel.is-keyboard-scrolling .bing-select__option-surface,
.bing-select__panel.is-keyboard-scrolling .bing-select__option-surface::after {
  transition: none;
}

.bing-select__option.is-selected > .bing-select__option-surface {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--bing-heading);
  font-weight: 500;
}

.bing-select__option.is-selected > .bing-select__option-surface::after {
  background: transparent;
  opacity: 1;
}

.bing-select__option.is-selected.is-active:not(:disabled) > .bing-select__option-surface {
  background: var(--bing-surface-hover);
}

.bing-select__option.is-disabled > .bing-select__option-surface {
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--bing-disabled-text);
  filter: none;
}

.bing-select__option.is-disabled > .bing-select__option-surface::after {
  background: none;
  opacity: 0;
}

.bing-select__option.is-disabled .bing-select__option-liquid {
  display: none;
}

.bing-select__option.is-disabled :deep(.bing-checkbox) {
  opacity: 0.58;
  filter: grayscale(1);
}

.bing-select__option.is-disabled .bing-select__option-label,
.bing-select__option.is-disabled .bing-select__option-main :deep(.bing-select__option-label) {
  color: var(--bing-disabled-text);
}

.bing-select__option-main {
  display: grid;
  min-width: 0;
}

.bing-select__option-label,
.bing-select__option-main :deep(.bing-select__option-label) {
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-select__option-detail-panel {
  box-sizing: border-box;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 3001;
  width: min(248px, calc(100vw - 24px));
  padding: 12px 13px;
  border: 1px solid var(--bing-popover-border);
  border-radius: 10px;
  background: rgb(var(--bing-surface-rgb) / var(--bing-select-glass-opacity, 0.85));
  background-clip: padding-box;
  backdrop-filter: blur(var(--bing-select-glass-blur, 10px)) saturate(var(--bing-select-glass-saturation, 1.28));
  -webkit-backdrop-filter: blur(var(--bing-select-glass-blur, 10px)) saturate(var(--bing-select-glass-saturation, 1.28));
  box-shadow: var(--bing-popover-shadow);
  opacity: 0;
  pointer-events: auto;
  transform: none;
  visibility: hidden;
}

.bing-select__option-detail-content {
  position: relative;
  display: grid;
  min-width: 0;
  gap: 6px;
}

.bing-select__option-detail-title,
.bing-select__option-detail-content :deep(.bing-select__option-detail-title) {
  min-width: 0;
  overflow: hidden;
  color: var(--bing-heading);
  font-size: 0.82rem;
  font-weight: 500;
  line-height: 1.16;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-select__option-detail-text,
.bing-select__option-detail-content :deep(.bing-select__option-detail-text) {
  color: var(--bing-muted);
  font-size: 0.76rem;
  font-weight: 400;
  line-height: 1.35;
}

.bing-select__option-detail-meta,
.bing-select__option-detail-content :deep(.bing-select__option-detail-meta) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 8px;
  padding-top: 5px;
  border-top: 1px solid var(--bing-border);
  color: var(--bing-muted);
  font-size: 0.72rem;
  font-weight: 500;
  line-height: 1.2;
}

.bing-select__option-detail-meta-key,
.bing-select__option-detail-meta-value,
.bing-select__option-detail-content :deep(.bing-select__option-detail-meta-key),
.bing-select__option-detail-content :deep(.bing-select__option-detail-meta-value) {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-select__option-detail-meta-value,
.bing-select__option-detail-content :deep(.bing-select__option-detail-meta-value) {
  color: var(--bing-heading);
}

.bing-select__empty {
  padding: 18px 12px;
  color: var(--bing-muted);
  font-size: 0.88rem;
  font-weight: 500;
  text-align: center;
}

@media (prefers-reduced-motion: reduce) {
  .bing-select__control,
  .bing-select__clear,
  .bing-select__chevron,
  .bing-select__tags-value,
  .bing-select__action-button,
  .bing-select__option,
  .bing-select__option-surface {
    transition: none;
  }

  .bing-select__panel,
  .bing-select__action-rail,
  .bing-select__action-button,
  .bing-select__option-detail-panel,
  .bing-select__option {
    transform: none !important;
  }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .bing-select__panel, .bing-select__action-button, .bing-select__option-detail-panel { background: var(--bing-surface-solid); }
}

/* 内部操作按钮沿用原有尺寸，交互反馈由 BingButton 提供。 */
.bing-select__clear.bing-button {
  --button-height: 24px;
  --button-icon-size: 16px;
  min-height: 24px;
  width: var(--button-height);
  padding: 0;
}

.bing-select__chevron.bing-button {
  --button-height: 24px;
  --button-icon-size: 16px;
  min-height: 24px;
  width: var(--button-height);
  padding: 0;
}

</style>
