<script lang="ts">
let dropdownInstanceSeed = 0
</script>

<script setup lang="ts">
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import { useClickFeedback } from '../../motion/useClickFeedback'
import { useOverlay } from '../../utils/overlay'
import type { FloatingRect } from '../../utils/floating'
import { computed, nextTick, onBeforeUnmount, onMounted, provide, ref, watch } from 'vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import BingDropDownHighlight from './BingDropDownHighlight.vue'
import { usePanelPlacement } from './usePanelPlacement'
import { getMenuItems, useMenuNavigation } from './useMenuNavigation'
import { useSubmenuIntent } from './useSubmenuIntent'
import { menuMotionItems } from './menuUtils'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import { gsap } from 'gsap'
import { useReducedMotion } from '../../motion/reducedMotion'
import { useConfigSize } from '../../utils/config'
import { createSelectPanelEnter, createSelectPanelLeave } from '../../motion/selectPanelMotion'
import {
  createGlassCssVariables,
  defaultGlassEffect,
} from '../../utils/glass'
import { bingDropDownContextKey } from './BingDropDown.context'
import type {
  BingDropDownEmits,
  BingDropDownExpose,
  BingDropDownPlacement,
  BingDropDownProps,
} from './BingDropDown.types'

const { playClickFeedback } = useClickFeedback()
const props = withDefaults(defineProps<BingDropDownProps>(), {
  open: null,
  trigger: 'click',
  placement: 'bottom-start',
  panelClass: undefined,
  block: false,
  closeOnOutside: true,
  closeOnEscape: true,
  autoFocus: false,
  loop: true,
  hoverOpenDelay: 80,
  hoverCloseDelay: 110,
  typeahead: true,
  highlightMotion: 'liquid',
  ariaLabel: '下拉菜单',
  glass: defaultGlassEffect.glass,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
})

const emit = defineEmits<BingDropDownEmits>()
const resolvedSize = useConfigSize(() => props.size)
const clientReady = useClientReady()

const floatingId = `bing-dropdown-${++dropdownInstanceSeed}`

const rootRef = ref<HTMLElement>()
const panelRef = ref<HTMLElement>()
const bodyScrollbar = ref<BingScrollbarExpose>()
let lastActiveItem: HTMLElement | null = null
let contentObserver: MutationObserver | undefined
let contentResize: ResizeObserver | undefined
const triggerElementRef = ref<HTMLElement>()
const renderPanel = ref(false)
const internalOpen = ref(false)
const activeContext = ref<unknown | null>(props.context ?? null)
const contextMenuPoint = ref<{ x: number; y: number } | null>(null)
const prefersReducedMotion = useReducedMotion()
const placementController = usePanelPlacement({
  panel: () => panelRef.value, viewport: () => bodyScrollbar.value?.viewport,
  body: () => panelRef.value?.querySelector<HTMLElement>('.bing-dropdown__body'),
  anchor: getAnchorRect, boundary: () => props.boundary?.getBoundingClientRect(),
  side: () => getPlacementParts(props.placement).side, align: () => getPlacementParts(props.placement).align,
  gap: () => props.trigger === 'contextmenu' ? 0 : 8, shift: () => props.trigger === 'contextmenu',
  estimatedHeight: () => getStaggerItemElements().length * (resolvedSize.value === 'sm' ? 28 : resolvedSize.value === 'lg' ? 36 : 32) + 8,
  afterUpdate: revealActiveItem,
})
const { bodyMaxHeight, boundaryWidth, position: panelPosition } = placementController
let selectedItem: HTMLElement | null = null
let openGeneration = 0
let restoringTriggerFocus = false
let hoverOpenTimer: ReturnType<typeof setTimeout> | undefined
let longPressTimer: ReturnType<typeof setTimeout> | undefined
let longPressPoint: { x: number; y: number } | undefined
let lastLongPress = 0
let pendingInitialFocus: 'first' | 'last' | undefined

let panelTimeline: gsap.core.Timeline | undefined
let contextTransitionTimeline: gsap.core.Timeline | undefined
let gsapContext: gsap.Context | undefined
let hoverCloseTimer: number | undefined
const contextMenuOffset = 6

type PanelTransitionSnapshot = {
  height: number
  left: number
  top: number
}

const isControlled = computed(() => props.open !== null)
const isOpen = computed(() => (isControlled.value ? Boolean(props.open) : internalOpen.value))

const rootClasses = computed(() => [
  'bing-dropdown',
  `bing-dropdown--${resolvedSize.value}`,
  `bing-dropdown--${props.placement}`,
  `bing-dropdown--trigger-${props.trigger}`,
  {
    'is-open': isOpen.value,
    'is-block': props.block,
  },
])

const triggerProps = computed(() => getTriggerProps())

const panelClasses = computed(() => [
  'bing-dropdown__panel',
  props.panelClass,
  `is-placement-${panelPosition.value.placement}`,
  `is-align-${panelPosition.value.align}`,
  {
    'is-glass': props.glass,
  },
])

const glassStyle = computed(() => ({
  ...createGlassCssVariables('bing-dropdown', {
    glass: props.glass,
    glassBlur: props.glassBlur,
    glassOpacity: props.glassOpacity,
    glassSaturation: props.glassSaturation,
  }),
  '--bing-dropdown-z-index': String(overlay.zIndex.value),
  '--bing-dropdown-item-height': {
    sm: '28px',
    md: '32px',
    lg: '36px',
  }[resolvedSize.value],
}))

const panelAutoUpdate = placementController

const overlayZIndex = useConfigZIndex('popover')
const overlay = useOverlay({
  open: () => renderPanel.value,
  elements: () => [rootRef.value, panelRef.value, ...Array.from(document.querySelectorAll<HTMLElement>(`[data-bing-dropdown-floating="${floatingId}"]`))],
  zIndex: () => overlayZIndex.value,
  closeOnEscape: () => props.closeOnEscape,
  onEscape: () => close(true),
})

const panelStyles = computed<Record<string, string>>(() => {
  const styles: Record<string, string> = {
    ...glassStyle.value,
    zIndex: String(overlay.zIndex.value),
  }
  const width = toCssSize(props.width)
  const minWidth = toCssSize(props.minWidth)
  const maxWidth = toCssSize(props.maxWidth)

  if (width) {
    styles['--bing-dropdown-width'] = width
  }

  if (minWidth) {
    styles['--bing-dropdown-min-width'] = minWidth
  }

  if (maxWidth) {
    styles['--bing-dropdown-max-width'] = maxWidth
  }

  if (renderPanel.value) {
    styles.top = `${panelPosition.value.top}px`
    styles.left = `${panelPosition.value.left}px`
  }

  if (boundaryWidth.value !== undefined) {
    styles.maxWidth = `min(${maxWidth || '380px'}, ${boundaryWidth.value}px)`
    styles.minWidth = `min(${minWidth || '220px'}, ${boundaryWidth.value}px)`
  }

  return styles
})

const navigation = useMenuNavigation({
  panel: () => panelRef.value, contains: isInsideDropdownSurface, loop: () => props.loop,
  typeahead: () => props.typeahead, close, focusTrigger,
  canEscape: event => props.closeOnEscape && overlay.isTop(event),
  openSubmenu: item => submenuIntent.open(item), closeSubmenu: menu => submenuIntent.closePanel(menu),
  onHighlight: (item, source) => submenuIntent.activate(item, source),
})
const submenuIntent = useSubmenuIntent(item => {
  if (!isOwnFloatingElement(item)) return
  navigation.setHighlighted(item, 'pointer')
  submenuIntent.enter(item)
})

provide(bingDropDownContextKey, {
  close,
  floatingId,
  getGlassStyle: () => glassStyle.value,
  onMenuKeydown: handlePanelKeydown,
  navigation, intent: submenuIntent, getHighlightMotion: () => props.highlightMotion,
  select: item => { selectedItem = item; navigation.setHighlighted(item, 'external'); close() },
  getSelectedItem: () => selectedItem,
  onSurfaceEnter: clearHoverCloseTimer,
  onSurfaceLeave: event => { if (!isInsideDropdownSurface(event.relatedTarget)) scheduleHoverClose() },
})

watch(
  isOpen,
  async (open, previousOpen) => {
    if (open === previousOpen) {
      return
    }

    const generation = ++openGeneration
    clearHoverOpenTimer(); clearHoverCloseTimer(); cancelLongPress()
    syncDocumentListeners()

    if (open) {
      killPanelTimeline()
      killContextTransition()
      renderPanel.value = true
      panelAutoUpdate.start()
      emit('open')
      await nextTick()
      if (!isOpen.value || generation !== openGeneration) return
      updatePanelPosition()
      await nextTick()
      if (!isOpen.value || generation !== openGeneration) return
      navigation.refresh()
      observeContent()
      playOpenAnimation()
      return
    }

    submenuIntent.reset()
    navigation.clearTypeahead()
    panelAutoUpdate.dispose()
    disconnectContent()
    emit('close')
    playCloseAnimation()
  },
  { flush: 'post' },
)

watch(
  () => props.context,
  (context) => {
    activeContext.value = context ?? null
  },
)

watch(
  () => [props.placement, props.width, props.minWidth, props.maxWidth, props.anchor, props.boundary],
  () => {
    if (isOpen.value) {
      panelAutoUpdate.schedule()
    }
  },
)

function revealActiveItem() {
  const item = panelRef.value?.querySelector<HTMLElement>('[data-bing-dropdown-item][data-highlighted]')
    ?? panelRef.value?.querySelector<HTMLElement>('[data-bing-dropdown-item][aria-current="true"]') ?? null
  const viewport = bodyScrollbar.value?.viewport
  if (item && viewport && item !== lastActiveItem) {
    const rect = item.getBoundingClientRect()
    const bounds = viewport.getBoundingClientRect()
    if (rect.bottom > bounds.bottom) viewport.scrollTop += rect.bottom - bounds.bottom
    else if (rect.top < bounds.top) viewport.scrollTop -= bounds.top - rect.top
  }
  lastActiveItem = item
}

function disconnectContent() {
  contentObserver?.disconnect(); contentObserver = undefined
  contentResize?.disconnect(); contentResize = undefined
  lastActiveItem = null
}

function observeContent() {
  disconnectContent()
  if (!panelRef.value) return
  contentObserver = new MutationObserver(() => { navigation.refresh(); panelAutoUpdate.schedule() })
  contentObserver.observe(panelRef.value, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'data-highlighted', 'aria-disabled'] })
  contentResize = new ResizeObserver(() => panelAutoUpdate.schedule())
  const body = panelRef.value.querySelector('.bing-dropdown__body')
  if (body) contentResize.observe(body)
}

onMounted(async () => {
  const generation = openGeneration
  if (rootRef.value) {
    gsapContext = gsap.context(() => undefined, rootRef.value)
  }

  if (isOpen.value) {
    renderPanel.value = true
    syncDocumentListeners()
    panelAutoUpdate.start()
    await nextTick()
    if (!isOpen.value || generation !== openGeneration) return
    updatePanelPosition()
    await nextTick()
    if (!isOpen.value || generation !== openGeneration) return
    navigation.refresh()
    observeContent()
    playOpenAnimation()
  }
})

onBeforeUnmount(() => {
  openGeneration++
  clearHoverOpenTimer(); cancelLongPress()
  disconnectContent()
  removeDocumentListeners()
  panelAutoUpdate.dispose()
  clearHoverCloseTimer()
  killPanelTimeline()
  killContextTransition()
  gsap.killTweensOf([panelRef.value, ...getStaggerItemElements()].filter(Boolean))
  gsapContext?.revert()
  gsapContext = undefined
})

function toCssSize(value: string | number | undefined) {
  if (typeof value === 'number') {
    return `${value}px`
  }

  return value
}

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function getPlacementParts(placement: BingDropDownPlacement) {
  const [side, align] = placement.split('-') as [
    'bottom' | 'top' | 'left' | 'right',
    'start' | 'end',
  ]

  return { align, side }
}

function getAnchorRect(): FloatingRect | undefined {
  if (props.anchor) return props.anchor.getBoundingClientRect()
  if (props.trigger === 'contextmenu' && contextMenuPoint.value) {
    const { x, y } = contextMenuPoint.value

    return { bottom: y, height: 0, left: x, right: x, top: y, width: 0 }
  }

  return rootRef.value?.getBoundingClientRect()
}

function getContextMenuAnchorPoint(x: number, y: number) {
  return {
    x: x + contextMenuOffset,
    y: y + contextMenuOffset,
  }
}

function setOpen(nextOpen: boolean) {
  if (nextOpen === isOpen.value) {
    return
  }

  if (!isControlled.value) {
    internalOpen.value = nextOpen
  }

  emit('update:open', nextOpen)
}

function setContext(nextContext: unknown | null) {
  activeContext.value = nextContext
  emit('update:context', nextContext)
}

function clearContextMenuState() {
  contextMenuPoint.value = null

  if (activeContext.value !== null) {
    setContext(null)
  }
}

function openPanel() {
  clearHoverOpenTimer()
  clearHoverCloseTimer()
  setOpen(true)
}

function close(restoreFocus = false) {
  clearHoverOpenTimer(); cancelLongPress()
  clearHoverCloseTimer()
  setOpen(false)

  if (restoreFocus) {
    focusTrigger()
  }
}

function toggle() {
  clearHoverOpenTimer()
  clearHoverCloseTimer()
  setOpen(!isOpen.value)
}

function isTouchPointer(event: PointerEvent) {
  return event.pointerType === 'touch'
}

function clearHoverCloseTimer() {
  if (!isBrowser() || hoverCloseTimer === undefined) {
    return
  }

  window.clearTimeout(hoverCloseTimer)
  hoverCloseTimer = undefined
}

function scheduleHoverClose() {
  if (!isBrowser() || props.trigger !== 'hover') {
    return
  }

  clearHoverCloseTimer()
  hoverCloseTimer = window.setTimeout(() => {
    hoverCloseTimer = undefined
    setOpen(false)
  }, Math.max(0, props.hoverCloseDelay))
}

function getTriggerProps(context: unknown | null = null) {
  const baseProps = {
    'aria-expanded': (isOpen.value ? 'true' : 'false') as 'true' | 'false',
    'aria-haspopup': 'menu' as const,
    'aria-controls': floatingId + '-panel',
    'data-bing-dropdown-trigger': '',
  }

  if (props.trigger === 'contextmenu') {
    return {
      ...baseProps,
      onPointerdown: (event: PointerEvent) => startLongPress(event, context),
      onContextmenu: (event: MouseEvent) => {
        void handleContextMenu(event, context)
      },
      onKeydown: (event: KeyboardEvent) => {
        void handleContextTriggerKeydown(event, context)
      },
    }
  }

  return {
    ...baseProps,
    onClick: handleTriggerClick,
    onFocus: handleTriggerFocus,
    onKeydown: handleTriggerKeydown,
    onPointerenter: handleTriggerPointerEnter,
    onPointerleave: handleTriggerPointerLeave,
  }
}

function rememberTriggerElement(event: Event) {
  if (event.currentTarget instanceof HTMLElement) {
    triggerElementRef.value = event.currentTarget
  }
}

function focusTrigger() {
  restoringTriggerFocus = true
  triggerElementRef.value?.focus({ preventScroll: true })
  restoringTriggerFocus = false
}

function clearHoverOpenTimer() { clearTimeout(hoverOpenTimer); hoverOpenTimer = undefined }
function handleTriggerFocus(event: FocusEvent) {
  rememberTriggerElement(event)
  if (props.trigger === 'hover' && !restoringTriggerFocus) openPanel()
}
function cancelLongPress() {
  clearTimeout(longPressTimer); longPressTimer = undefined; longPressPoint = undefined
  if (!isBrowser()) return
  window.removeEventListener('pointermove', moveLongPress, true)
  window.removeEventListener('pointerup', cancelLongPress, true)
  window.removeEventListener('pointercancel', cancelLongPress, true)
}
function moveLongPress(event: PointerEvent) {
  if (longPressPoint && Math.hypot(event.clientX - longPressPoint.x, event.clientY - longPressPoint.y) > 8) cancelLongPress()
}
function startLongPress(event: PointerEvent, context: unknown | null) {
  if (event.pointerType !== 'touch' || event.isPrimary === false) return
  cancelLongPress(); rememberTriggerElement(event)
  longPressPoint = { x: event.clientX, y: event.clientY }
  window.addEventListener('pointermove', moveLongPress, true)
  window.addEventListener('pointerup', cancelLongPress, true)
  window.addEventListener('pointercancel', cancelLongPress, true)
  longPressTimer = setTimeout(() => {
    const point = longPressPoint
    cancelLongPress()
    if (!point) return
    lastLongPress = Date.now()
    void openContextMenuAt(event, context, point.x, point.y)
  }, 500)
}

async function openAndFocusBoundaryItem(position: 'first' | 'last') {
  clearHoverOpenTimer(); clearHoverCloseTimer()
  pendingInitialFocus = position
  if (!isOpen.value) {
    setOpen(true)
  } else if (panelRef.value && !panelTimeline) {
    pendingInitialFocus = undefined
    focusBoundaryItem(position)
  }
}

async function openContextMenuAt(
  event: MouseEvent | KeyboardEvent,
  context: unknown | null,
  x: number,
  y: number,
) {
  rememberTriggerElement(event)
  clearHoverCloseTimer()
  // 编辑器的鼠标右键只定位选区；入场结束时不能再抢走正文焦点。
  // 键盘打开仍进入菜单，autoFocus=true 也可显式要求转移焦点。
  const activeElement = document.activeElement
  const preserveEditorFocus = event instanceof MouseEvent && !props.autoFocus
    && activeElement instanceof HTMLElement
    && Boolean(activeElement.closest('input,textarea,[contenteditable="true"]'))
    && Boolean(triggerElementRef.value?.contains(activeElement))
  const anchorPoint = getContextMenuAnchorPoint(x, y)
  const shouldAnimateContextTransition =
    props.trigger === 'contextmenu' &&
    isOpen.value &&
    renderPanel.value &&
    Boolean(panelRef.value)
  const transitionSnapshot = shouldAnimateContextTransition
    ? capturePanelTransitionSnapshot()
    : undefined

  contextMenuPoint.value = anchorPoint
  panelPosition.value = {
    ...panelPosition.value,
    left: anchorPoint.x,
    top: anchorPoint.y,
  }
  setContext(context)
  emit('context-open', {
    event,
    context,
    x,
    y,
  })

  if (!isOpen.value) {
    pendingInitialFocus = preserveEditorFocus ? undefined : 'first'
    setOpen(true)
    await nextTick()
    await nextTick()
    updatePanelPosition()
    return
  }

  await nextTick()
  updatePanelPosition()
  await nextTick()

  if (transitionSnapshot) {
    playContextTransition(transitionSnapshot)
  }

  if (!preserveEditorFocus) focusFirstItem()
}

async function handleContextMenu(event: MouseEvent, context: unknown | null = null) {
  if (props.trigger !== 'contextmenu') {
    return
  }

  event.preventDefault()
  if (event instanceof PointerEvent && event.pointerType === 'touch' && Date.now() - lastLongPress < 750) return
  await openContextMenuAt(event, context, event.clientX, event.clientY)
}

async function handleContextTriggerKeydown(event: KeyboardEvent, context: unknown | null = null) {
  if (props.trigger !== 'contextmenu') {
    return
  }

  const opensContextMenu = event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')

  if (!opensContextMenu) {
    return
  }

  event.preventDefault()

  const target = event.currentTarget instanceof HTMLElement ? event.currentTarget : rootRef.value
  const rect = target?.getBoundingClientRect()
  const x = rect?.left ?? 0
  const y = rect?.bottom ?? 0

  await openContextMenuAt(event, context, x, y)
}

function handleTriggerClick(event: MouseEvent) {
  if (event.defaultPrevented) return
  if (event.detail > 0) playClickFeedback(event)
  rememberTriggerElement(event)
  clearHoverCloseTimer()

  if (props.trigger === 'hover') {
    if (!isOpen.value) {
      openPanel()
    }
    return
  }

  toggle()
}

function handleTriggerKeydown(event: KeyboardEvent) {
  rememberTriggerElement(event)
  if ((event.key === 'Enter' || event.key === ' ') && !event.repeat) playClickFeedback(event)

  if (event.key === 'ArrowDown') {
    event.preventDefault()
    void openAndFocusBoundaryItem('first')
    return
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    void openAndFocusBoundaryItem('last')
    return
  }

  if (overlay.isTop(event) && event.key === 'Escape' && isOpen.value && props.closeOnEscape) {
    event.preventDefault()
    event.stopPropagation()
    close(true)
  }
}

function handleTriggerPointerEnter(event: PointerEvent) {
  if (props.trigger !== 'hover' || isTouchPointer(event)) {
    return
  }

  rememberTriggerElement(event)
  clearHoverCloseTimer(); clearHoverOpenTimer()
  hoverOpenTimer = setTimeout(() => { hoverOpenTimer = undefined; openPanel() }, Math.max(0, props.hoverOpenDelay))
}

function handleTriggerPointerLeave(event: PointerEvent) {
  if (props.trigger !== 'hover' || isTouchPointer(event)) {
    return
  }

  clearHoverOpenTimer()
  scheduleHoverClose()
}

function handlePanelPointerEnter(event: PointerEvent) {
  if (props.trigger !== 'hover' || isTouchPointer(event)) {
    return
  }

  clearHoverCloseTimer()
}

function handlePanelPointerLeave(event: PointerEvent) {
  const highlighted = panelRef.value && navigation.highlighted.value.get(panelRef.value)
  if (highlighted?.getAttribute('aria-expanded') !== 'true' && !selectedItem) navigation.clear(panelRef.value)
  if (props.trigger !== 'hover' || isTouchPointer(event)) {
    return
  }

  if (!isInsideDropdownSurface(event.relatedTarget)) scheduleHoverClose()
}

function syncDocumentListeners() {
  if (typeof document === 'undefined') {
    return
  }

  removeDocumentListeners()

  if (!isOpen.value) {
    return
  }

  document.addEventListener('pointerdown', handleDocumentPointerDown)
  document.addEventListener('keydown', handleDocumentKeydown)
}

function removeDocumentListeners() {
  if (typeof document === 'undefined') {
    return
  }

  document.removeEventListener('pointerdown', handleDocumentPointerDown)
  document.removeEventListener('keydown', handleDocumentKeydown)
}

function getElementFromTarget(target: EventTarget | Node | null) {
  if (target instanceof Element) {
    return target
  }

  return target instanceof Node ? target.parentElement : null
}

function isOwnFloatingElement(target: EventTarget | Node | null) {
  const element = getElementFromTarget(target)
  const floatingElement = element?.closest<HTMLElement>('[data-bing-dropdown-floating]')

  return floatingElement?.dataset.bingDropdownFloating === floatingId
}

function isInsideDropdownSurface(target: EventTarget | Node | null) {
  if (!(target instanceof Node)) {
    return false
  }

  return Boolean(panelRef.value?.contains(target) || isOwnFloatingElement(target) || (overlay.contains(target) && !rootRef.value?.contains(target)))
}

function handleDocumentPointerDown(event: PointerEvent) {
  if (!props.closeOnOutside) {
    return
  }

  const target = event.target

  if (
    !(target instanceof Node) ||
    isInsideDropdownSurface(target)
  ) {
    return
  }

  const isContextMenuTriggerRightClick =
    props.trigger === 'contextmenu' &&
    rootRef.value?.contains(target) &&
    (event.button === 2 || event.buttons === 2)

  if (isContextMenuTriggerRightClick) {
    return
  }

  if (props.trigger !== 'contextmenu' && rootRef.value?.contains(target)) {
    return
  }

  close()
}

function handleDocumentKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && !event.defaultPrevented && overlay.isTop(event) && props.closeOnEscape) {
    event.preventDefault()
    close(true)
  }
}

function killPanelTimeline() {
  panelTimeline?.kill()
  panelTimeline = undefined
}

function killContextTransition(options: { resetTransform?: boolean } = {}) {
  contextTransitionTimeline?.kill()
  contextTransitionTimeline = undefined

  const panel = panelRef.value

  if (panel) {
    if (options.resetTransform) {
      gsap.set(panel, {
        x: 0,
        y: 0,
        clearProps: 'height,overflow',
      })
      return
    }

    gsap.set(panel, {
      clearProps: 'height,overflow',
    })
  }
}

function runInAnimationContext(callback: () => void) {
  if (gsapContext && !gsapContext.isReverted) {
    gsapContext.add(callback)
    return
  }

  callback()
}
function getStaggerItemElements() {
  return Array.from(
    panelRef.value?.querySelectorAll<HTMLElement>(
      '[data-bing-dropdown-item], [data-bing-dropdown-stagger]',
    ) ?? [],
  )
}

function getMenuItemElements(menu = panelRef.value) { return getMenuItems(menu, false) }

function capturePanelTransitionSnapshot(): PanelTransitionSnapshot | undefined {
  const panel = panelRef.value

  if (!panel) {
    return undefined
  }
  const rect = panel.getBoundingClientRect()

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
  }
}

function playContextTransition(snapshot: PanelTransitionSnapshot) {
  const panel = panelRef.value

  if (!panel || !isOpen.value || props.trigger !== 'contextmenu') {
    return
  }

  killPanelTimeline()
  killContextTransition({
    resetTransform: true,
  })
  gsap.killTweensOf([panel, ...getStaggerItemElements()])

  const items = getMenuItemElements(panel)
  const nextRect = panel.getBoundingClientRect()
  const nextHeight = nextRect.height
  const movementX = snapshot.left - nextRect.left
  const movementY = snapshot.top - nextRect.top
  const hasPositionChange =
    Math.abs(movementX) > 0.5 || Math.abs(movementY) > 0.5
  const hasHeightChange =
    snapshot.height > 0 && nextHeight > 0 && Math.abs(snapshot.height - nextHeight) > 0.5

  if (prefersReducedMotion()) {
    runInAnimationContext(() => {
      gsap.set(panel, {
        autoAlpha: 1,
        x: 0,
        y: 0,
        clearProps: 'height,overflow',
      })
      gsap.set(items, {
        autoAlpha: 1,
      })
    })
    return
  }

  runInAnimationContext(() => {
    contextTransitionTimeline = gsap.timeline({
      defaults: {
        ease: 'power3.out',
        overwrite: 'auto',
      },
      onComplete: () => {
        contextTransitionTimeline = undefined
        gsap.set(panel, {
          clearProps: 'height,overflow',
        })
      },
    })

    if (hasPositionChange || hasHeightChange) {
      contextTransitionTimeline?.fromTo(
        panel,
        {
          ...(hasPositionChange
            ? {
                x: movementX,
                y: movementY,
              }
            : {
                x: 0,
                y: 0,
              }),
          ...(hasHeightChange
            ? {
                height: snapshot.height,
                overflow: 'hidden',
              }
            : {}),
          autoAlpha: 1,
          force3D: true,
        },
        {
          ...(hasPositionChange
            ? {
                x: 0,
                y: 0,
              }
            : {}),
          ...(hasHeightChange
            ? {
                height: nextHeight,
              }
            : {}),
          autoAlpha: 1,
          duration: hasPositionChange ? 0.32 : 0.18,
          force3D: true,
          immediateRender: true,
        },
        0,
      )
    } else {
      gsap.set(panel, {
        autoAlpha: 1,
        x: 0,
        y: 0,
      })
    }

    if (items.length > 0) {
      contextTransitionTimeline?.fromTo(
        items,
        {
          autoAlpha: 0,
        },
        {
          autoAlpha: 1,
          duration: 0.14,
          stagger: 0.014,
        },
        hasHeightChange || hasPositionChange ? 0.035 : 0,
      )
    }
  })
}

function updatePanelPosition() { placementController.update() }

function playOpenAnimation() {
  const panel = panelRef.value
  if (!panel) return
  selectedItem = null
  killPanelTimeline()
  killContextTransition()
  // 先恢复布局尺寸再筛选可视项，关闭中的位移不能参与下一次入场测量。
  const allItems = menuMotionItems(panel, bodyScrollbar.value?.viewport).all
  gsap.killTweensOf([panel, ...allItems])
  gsap.set([panel, ...allItems], { clearProps: 'transform' })
  const { all, visible: items, hidden } = menuMotionItems(panel, bodyScrollbar.value?.viewport)
  gsap.killTweensOf([panel, ...all])
  if (hidden.length) gsap.set(hidden, { autoAlpha: 1, clearProps: 'transform' })

  if (prefersReducedMotion()) {
    runInAnimationContext(() => {
      gsap.set([panel, ...all], { autoAlpha: 1, clearProps: 'transform' })
    })
    applyInitialFocus()
    emit('after-enter')
    return
  }

  runInAnimationContext(() => {
    panelTimeline = createSelectPanelEnter({
      staggerCap: 0.12, maxStaggerItems: 8,
      panel, items, actionRail: null, actionButtons: [],
      placement: panelPosition.value.placement,
      align: panelPosition.value.align,
      onComplete: () => {
        panelTimeline = undefined
        applyInitialFocus()
        emit('after-enter')
      },
    })
  })
}

function playCloseAnimation() {
  const panel = panelRef.value
  if (!panel || prefersReducedMotion()) {
    killPanelTimeline(); killContextTransition()
    finishClose()
    return
  }
  const items = getStaggerItemElements()
  killPanelTimeline()
  killContextTransition()
  gsap.killTweensOf([panel, ...items])
  runInAnimationContext(() => {
    panelTimeline = createSelectPanelLeave({
      staggerCap: 0.12, maxStaggerItems: 8,
      selectedItem: selectedItem?.closest('[role="menu"]') === panel ? selectedItem : selectedItem ? navigation.highlighted.value.get(panel) : null,
      panel, items, actionRail: null, actionButtons: [],
      placement: panelPosition.value.placement,
      align: panelPosition.value.align,
      onComplete: () => {
        panelTimeline = undefined
        finishClose()
      },
    })
  })
}

function finishClose() {
  pendingInitialFocus = undefined
  navigation.reset(); selectedItem = null
  renderPanel.value = false
  clearContextMenuState()
  emit('after-leave')
}

function applyInitialFocus() {
  if (!isOpen.value) return
  if (pendingInitialFocus) { focusBoundaryItem(pendingInitialFocus); pendingInitialFocus = undefined }
  else if (props.autoFocus) focusFirstItem()
}

function focusFirstItem() { navigation.focusBoundary('first') }
function focusBoundaryItem(position: 'first' | 'last') { navigation.focusBoundary(position) }
function handlePanelKeydown(event: KeyboardEvent) { navigation.onKeydown(event) }

defineExpose<BingDropDownExpose>({
  openPanel,
  close,
  toggle,
  focusFirstItem,
})
</script>

<template>
  <div ref="rootRef" :class="rootClasses">
    <slot
      name="trigger"
      :open="isOpen"
      :context="activeContext"
      :open-panel="openPanel"
      :trigger-props="triggerProps"
      :get-trigger-props="getTriggerProps"
      :close="close"
      :toggle="toggle"
    ></slot>

    <Teleport v-if="clientReady && renderPanel" to="body">
      <div
        ref="panelRef"
        :id="floatingId + '-panel'"
        :class="panelClasses"
        :style="panelStyles"
        :data-bing-dropdown-floating="floatingId"
        role="menu"
        :aria-label="ariaLabel"
        @keydown="handlePanelKeydown"
        @pointerenter="handlePanelPointerEnter"
        @pointerleave="handlePanelPointerLeave"
      >
        <div v-if="$slots.header" class="bing-dropdown__header">
          <slot name="header"></slot>
        </div>

        <BingScrollbar ref="bodyScrollbar" :max-height="bodyMaxHeight" :focusable="false" :smooth="false" aria-label="菜单选项">
          <div class="bing-dropdown__body">
            <BingDropDownHighlight v-if="highlightMotion === 'slide'" />
            <slot :context="activeContext" :close="close"></slot>
          </div>
        </BingScrollbar>

        <div v-if="$slots.footer" class="bing-dropdown__footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bing-dropdown {
  --bing-dropdown-item-height: 32px;

  position: relative;
  display: inline-block;
  color: var(--bing-text);
  vertical-align: middle;
}

.bing-dropdown--trigger-contextmenu { -webkit-touch-callout: none; }

.bing-dropdown.is-block {
  display: block;
}

.bing-dropdown--sm {
  --bing-dropdown-item-height: 28px;
}

.bing-dropdown--lg {
  --bing-dropdown-item-height: 36px;
}

.bing-dropdown__panel {
  position: fixed;
  box-sizing: border-box;
  width: var(--bing-dropdown-width, max-content);
  min-width: var(--bing-dropdown-min-width, 220px);
  max-width: min(var(--bing-dropdown-max-width, 380px), calc(100vw - 24px));
  overflow: visible;
  border: 1px solid var(--bing-popover-border);
  border-radius: var(--bing-radius-popover, 8px);
  background: rgb(
    var(--bing-surface-rgb) / var(--bing-dropdown-glass-opacity, 0.85)
  );
  background-clip: padding-box;
  color: var(--bing-text);
  box-shadow: var(--bing-popover-shadow);
  backdrop-filter: blur(var(--bing-dropdown-glass-blur, 10px))
    saturate(var(--bing-dropdown-glass-saturation, 1.28));
  -webkit-backdrop-filter: blur(var(--bing-dropdown-glass-blur, 10px))
    saturate(var(--bing-dropdown-glass-saturation, 1.28));
  opacity: 0;
  visibility: hidden;
  will-change: opacity, transform;
}

.bing-dropdown__header,
.bing-dropdown__footer,
.bing-dropdown__body {
  position: relative;
  z-index: 1;
}

.bing-dropdown__header {
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--bing-border);
  background: transparent;
  color: var(--bing-muted);
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0;
}

.bing-dropdown__footer {
  padding: 8px 12px;
  border-top: 1px solid var(--bing-border);
  background: transparent;
}

.bing-dropdown__body {
  box-sizing: border-box;
  display: grid;
  min-width: 0;
  gap: 0;
  padding: 4px;
  overflow: visible;
}

@media (prefers-reduced-motion: reduce) {
  .bing-dropdown__panel {
    transition: none;
    will-change: auto;
  }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .bing-dropdown__panel { background: var(--bing-surface-solid); }
}
</style>
