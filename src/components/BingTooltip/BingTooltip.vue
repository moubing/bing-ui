<script setup lang="ts">
import { computed, defineComponent, getCurrentInstance, nextTick, onBeforeUnmount, onBeforeUpdate, ref, useSlots, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import { useOverlay } from '../../utils/overlay'
import { createGlassCssVariables, defaultGlassEffect } from '../../utils/glass'
import { useReducedMotion } from '../../motion/reducedMotion'
import { useClickFeedback } from '../../motion/useClickFeedback'
import { shortcutKeys, keyShortcuts } from '../../utils/shortcut'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import { useTooltipTrigger } from './useTooltipTrigger'
import { useTooltipPanel } from './useTooltipPanel'
import { createTooltipOwnerId, registerTooltipOwner, unregisterTooltipOwner, sharedTooltipActiveOwner,
  sharedTooltipHostId, sharedTooltipPanelElement, sharedTooltipShouldRender, sharedTooltipRefresh,
  sharedTooltipUpdatePosition,
  lastTooltipClosedAt, markTooltipClosed, tooltipFocusVisible } from './BingTooltip.shared'
import type { BingTooltipSharedOwner } from './BingTooltip.shared'
import type { BingTooltipCloseReason, BingTooltipEmits, BingTooltipExpose, BingTooltipOpenReason, BingTooltipProps, BingTooltipTriggerProps } from './BingTooltip.types'

const props = withDefaults(defineProps<BingTooltipProps>(), {
  content: undefined, trigger: 'hover', placement: 'top', align: 'center', disabled: false,
  interactive: true, openDelay: 180, closeDelay: 90, skipDelay: 300, scrollable: false,
  suppressWhenExpanded: true, shortcut: undefined, tone: 'surface', offset: 10, viewportPadding: 12,
  maxWidth: 280, closeOnOutside: true, closeOnEsc: true, id: undefined, ariaLabel: undefined,
  glass: defaultGlassEffect.glass, glassBlur: undefined, glassOpacity: undefined, glassSaturation: undefined,
})
const emit = defineEmits<BingTooltipEmits>()
defineSlots<{
  default(props: { open: boolean; show: BingTooltipExpose['show']; hide: BingTooltipExpose['hide']; toggle: BingTooltipExpose['toggle']; triggerProps: BingTooltipTriggerProps }): unknown
  content(): unknown
}>()
const slots = useSlots()
const instance = getCurrentInstance()
const clientReady = useClientReady()
const reducedMotion = useReducedMotion({ onChange: () => {
  if (sharedTooltipActiveOwner.value?.id === ownerId || sharedTooltipPanelElement.value?.id === tooltipId.value) {
    sharedTooltipRefresh.value?.(true)
  }
} })
const resolvedZIndex = useConfigZIndex('tooltip', () => props.zIndex)
const { playClickFeedback } = useClickFeedback()
const ownerId = createTooltipOwnerId()
const tooltipId = computed(() => props.id ?? `bing-tooltip-${ownerId}`)
const rootRef = ref<HTMLElement | null>(null)
const internalOpen = ref(false)
// 即使受控父级未及时回写，也不能保留已经被替换或关闭的提示状态。
const dismissed = ref(false)
const isControlled = Boolean(instance?.vnode.props && ('modelValue' in instance.vnode.props || 'model-value' in instance.vnode.props))
const isOpen = computed(() => !props.disabled && !dismissed.value && (isControlled ? Boolean(props.modelValue) : internalOpen.value))
const isActiveTooltip = computed(() => isOpen.value && sharedTooltipActiveOwner.value?.id === ownerId)
const isSharedHost = computed(() => sharedTooltipHostId.value === ownerId)
const { panelRef, surfaceRef, bodyRef, owner: panelOwner, scrollable: panelScrollable, position, updatePosition } = useTooltipPanel(isSharedHost)
const setPanelRef = (element: unknown) => { panelRef.value = element as HTMLElement | null }
const setSurfaceRef = (element: unknown) => { surfaceRef.value = element as HTMLElement | null }
const setBodyRef = (element: unknown) => { bodyRef.value = element as HTMLElement | null }
const triggers = computed(() => Array.isArray(props.trigger) ? props.trigger : [props.trigger])
const hasHover = computed(() => triggers.value.includes('hover'))
const hasClick = computed(() => triggers.value.includes('click'))
const expandable = computed(() => hasClick.value || triggers.value.includes('manual') || !triggers.value.length)
const keys = computed(() => shortcutKeys(props.shortcut))
const glassStyle = computed(() => createGlassCssVariables('bing-tooltip', props))
const rootClasses = computed(() => ['bing-tooltip', { 'is-open': isActiveTooltip.value, 'is-disabled': props.disabled, 'is-touch-held': touchHeld.value }])
const contentClasses = computed(() => ['bing-tooltip__content', `is-placement-${position.value.placement}`,
  `is-align-${panelOwner.value?.getAlign()}`, `is-tone-${panelOwner.value?.getTone()}`,
  { 'is-interactive': panelOwner.value?.getInteractive(), 'has-content': panelOwner.value?.getHasContent(), 'is-scrollable': panelScrollable.value }])
const contentStyle = computed<CSSProperties>(() => {
  const owner = panelOwner.value
  const maxWidth = owner?.getMaxWidth() ?? '280px'
  const padding = owner?.getViewportPadding() ?? 12
  return { ...owner?.getGlassStyle(), position: 'fixed', left: `${position.value.left}px`, top: `${position.value.top}px`,
    zIndex: owner?.getZIndex(), '--bing-tooltip-max-width': maxWidth,
    '--bing-tooltip-origin-x': `${position.value.originX}px`, '--bing-tooltip-origin-y': `${position.value.originY}px`,
    '--bing-tooltip-viewport-padding': `${padding}px` } as CSSProperties
})
const panelContentComponent = computed(() => panelOwner.value?.contentComponent)
const contentRenderer = defineComponent({
  name: 'BingTooltipContentRenderer',
  setup() {
    onBeforeUpdate(() => { if (isActiveTooltip.value) sharedTooltipRefresh.value?.() })
    return () => slots.content?.() ?? props.content ?? ''
  },
})
const trigger = useTooltipTrigger({ root: rootRef, ownerId, id: () => tooltipId.value,
  open: () => isActiveTooltip.value, expandable: () => expandable.value,
  shortcut: () => keyShortcuts(keys.value), description: () => props.ariaLabel ?? props.content
    ?? (isActiveTooltip.value ? sharedTooltipPanelElement.value?.querySelector('.bing-tooltip__body-content')?.textContent ?? '' : ''),
})
const triggerProps = trigger.triggerProps
const overlay = useOverlay({ open: () => isActiveTooltip.value,
  elements: () => [rootRef.value, sharedTooltipPanelElement.value], zIndex: () => resolvedZIndex.value,
  closeOnEscape: () => props.closeOnEsc, onEscape: () => hide('escape') })
let openTimer: ReturnType<typeof setTimeout> | undefined
let closeTimer: ReturnType<typeof setTimeout> | undefined
let longPressTimer: ReturnType<typeof setTimeout> | undefined
let touchCloseTimer: ReturnType<typeof setTimeout> | undefined
let suppressUntilPointerLeave = false
let suppressTouchClick = false
const touchHeld = ref(false)
let touchOrigin: { id: number; x: number; y: number } | undefined
let touchOpen = false
let openReason: BingTooltipOpenReason = 'manual'
let pendingReason: BingTooltipOpenReason | BingTooltipCloseReason = 'manual'

function contains(element: HTMLElement | null | undefined, target: EventTarget | null) {
  return target instanceof Node && !!element?.contains(target)
}
function clearOpenTimer() { clearTimeout(openTimer); openTimer = undefined }
function clearCloseTimer() { clearTimeout(closeTimer); closeTimer = undefined }
function stopTouchTracking() {
  clearTimeout(longPressTimer)
  longPressTimer = undefined
  touchOrigin = undefined
  touchHeld.value = false
  if (typeof window === 'undefined') return
  window.removeEventListener('pointermove', handleTouchMove, true)
  window.removeEventListener('pointerup', handleTouchEnd, true)
  window.removeEventListener('pointercancel', handleTouchCancel, true)
  window.removeEventListener('pointerdown', handleNextTouch, true)
}
function clearTimers() {
  clearOpenTimer()
  clearCloseTimer()
  stopTouchTracking()
  clearTimeout(touchCloseTimer)
  touchCloseTimer = undefined
}
function canOpen(reason: BingTooltipOpenReason) {
  if (props.disabled || (props.suppressWhenExpanded && trigger.expanded.value)) return false
  if ((reason === 'hover' || reason === 'focus') && suppressUntilPointerLeave) return false
  const active = sharedTooltipActiveOwner.value
  return !((reason === 'hover' || reason === 'focus') && active && active.id !== ownerId && active.getPinned())
}
function activate() {
  const previous = sharedTooltipActiveOwner.value
  if (previous?.id !== ownerId) previous?.hide('replaced')
  sharedTooltipActiveOwner.value = ownerRecord
}
function show(reason: BingTooltipOpenReason = 'manual') {
  if (!canOpen(reason)) return
  clearOpenTimer()
  clearCloseTimer()
  if (isOpen.value && ownerRecord.getPinned() && (reason === 'hover' || reason === 'focus')) return
  pendingReason = reason
  openReason = reason
  if (isOpen.value) { activate(); return }
  emit('update:modelValue', true)
  dismissed.value = false
  internalOpen.value = true
}
function hide(reason: BingTooltipCloseReason = 'manual') {
  clearTimers()
  touchOpen = false
  pendingReason = reason
  const wasOpen = isOpen.value
  if (wasOpen) emit('update:modelValue', false)
  internalOpen.value = false
  dismissed.value = true
}
function toggle(reason: BingTooltipOpenReason | BingTooltipCloseReason = 'manual') {
  if (isActiveTooltip.value) hide(reason as BingTooltipCloseReason)
  else show(reason as BingTooltipOpenReason)
}
function scheduleOpen(reason: BingTooltipOpenReason) {
  if (!canOpen(reason)) return
  clearCloseTimer()
  clearOpenTimer()
  const warm = performance.now() - lastTooltipClosedAt <= Math.max(0, props.skipDelay)
  if (props.openDelay <= 0 || sharedTooltipActiveOwner.value || warm) show(reason)
  else openTimer = setTimeout(() => show(reason), Math.max(0, props.openDelay))
}
function scheduleClose(reason: BingTooltipCloseReason) {
  clearOpenTimer()
  clearCloseTimer()
  if (props.closeDelay <= 0) hide(reason)
  else closeTimer = setTimeout(() => hide(reason), Math.max(0, props.closeDelay))
}
function handleRootPointerEnter(event: PointerEvent) {
  if (hasHover.value && event.pointerType !== 'touch') scheduleOpen('hover')
}
function handleRootPointerLeave(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  suppressUntilPointerLeave = false
  if (hasHover.value && !ownerRecord.getPinned()) scheduleClose('hover')
}
function handleRootPointerDown(event: PointerEvent) {
  suppressTouchClick = false
  if (event.pointerType === 'touch') {
    if (!hasHover.value || props.disabled || !canOpen('hover')) return
    clearTimers()
    touchOrigin = { id: event.pointerId, x: event.clientX, y: event.clientY }
    touchHeld.value = true
    window.addEventListener('pointermove', handleTouchMove, true)
    window.addEventListener('pointerup', handleTouchEnd, true)
    window.addEventListener('pointercancel', handleTouchCancel, true)
    window.addEventListener('pointerdown', handleNextTouch, true)
    longPressTimer = setTimeout(() => {
      longPressTimer = undefined
      if (!touchOrigin || !canOpen('hover')) return
      touchOpen = true
      suppressTouchClick = true
      show('hover')
    }, 500)
    return
  }
  if (hasHover.value && !hasClick.value) {
    suppressUntilPointerLeave = true
    hide('click')
  }
}
function handleTouchMove(event: PointerEvent) {
  if (touchOrigin?.id !== event.pointerId) return
  if (Math.hypot(event.clientX - touchOrigin.x, event.clientY - touchOrigin.y) > 8) {
    if (touchOpen) hide('hover')
    else stopTouchTracking()
  }
}
function handleTouchEnd(event: PointerEvent) {
  if (touchOrigin?.id !== event.pointerId) return
  stopTouchTracking()
  if (touchOpen) touchCloseTimer = setTimeout(() => hide('hover'), 1500)
}
function handleTouchCancel() {
  if (touchOpen) hide('hover')
  else stopTouchTracking()
}
function handleNextTouch() { handleTouchCancel() }
function handleContextMenu(event: Event) {
  if (touchHeld.value || touchOpen) event.preventDefault()
}
function handleRootFocusIn(event: FocusEvent) {
  if (hasHover.value && event.target instanceof HTMLElement && tooltipFocusVisible(event.target)) scheduleOpen('focus')
}
function handleRootFocusOut(event: FocusEvent) {
  if (hasHover.value && !ownerRecord.getPinned() && !overlay.contains(event.relatedTarget as Node | null)) scheduleClose('focus')
}
function handleRootClick(event: MouseEvent) {
  if (!hasClick.value || props.disabled || event.defaultPrevented || suppressTouchClick) return
  playClickFeedback(event, rootRef.value)
  toggle('click')
}
function handleContentEnter() {
  const owner = sharedTooltipActiveOwner.value
  if (owner?.getInteractive()) owner.clearCloseTimer()
}
function handleContentLeave(event: PointerEvent | FocusEvent) {
  const owner = sharedTooltipActiveOwner.value
  if (!owner?.getHasHoverTrigger() || owner.getPinned() || owner.getTouchOpen()) return
  if (contains(owner.rootRef.value, event.relatedTarget)) return
  owner.scheduleClose(event.type === 'focusout' ? 'focus' : 'hover')
}
function handleWindowPointerDown(event: PointerEvent) {
  const owner = sharedTooltipActiveOwner.value
  if (!owner) return
  if (owner.getTouchOpen()) { owner.hide('outside'); return }
  if (contains(owner.rootRef.value, event.target) || contains(sharedTooltipPanelElement.value, event.target)) return
  if (owner.getCloseOnOutside()) owner.hide('outside')
}
const ownerRecord: BingTooltipSharedOwner = {
  id: ownerId, rootRef, contentComponent: contentRenderer, clearCloseTimer,
  getAlign: () => props.align, getAriaLabel: () => props.ariaLabel,
  getCloseOnEsc: () => props.closeOnEsc, getCloseOnOutside: () => props.closeOnOutside,
  getHasContent: () => Boolean(props.content || slots.content), getHasHoverTrigger: () => hasHover.value,
  getInteractive: () => props.interactive, getGlassStyle: () => glassStyle.value,
  getPinned: () => isOpen.value && (openReason === 'click' || openReason === 'manual'),
  getTouchOpen: () => touchOpen, getScrollable: () => props.scrollable,
  getShortcut: () => keys.value, getTone: () => props.tone,
  getMaxWidth: () => typeof props.maxWidth === 'number' ? `${Math.max(1, props.maxWidth)}px` : props.maxWidth,
  getOffset: () => Math.max(0, props.offset), getPlacement: () => props.placement,
  getReducedMotion: () => reducedMotion(), getTooltipId: () => tooltipId.value,
  getViewportPadding: () => Math.max(0, props.viewportPadding), getZIndex: () => overlay.zIndex.value,
  isTopLayer: event => overlay.isTop(event), hide, scheduleClose,
}
registerTooltipOwner(ownerRecord)
watch(() => props.modelValue, value => {
  if (value) openReason = pendingReason as BingTooltipOpenReason
  dismissed.value = false
}, { flush: 'sync' })
watch(isOpen, (open, previous) => {
  if (open) {
    if (!canOpen(openReason)) { dismissed.value = true; emit('update:modelValue', false); return }
    activate()
  } else {
    clearTimers()
    touchOpen = false
    if (sharedTooltipActiveOwner.value?.id === ownerId) {
      markTooltipClosed(props.disabled ? 'disabled' : pendingReason as BingTooltipCloseReason)
      sharedTooltipActiveOwner.value = undefined
    }
  }
  if (previous !== undefined) {
    if (open) emit('open', pendingReason as BingTooltipOpenReason)
    else emit('close', props.disabled ? 'disabled' : pendingReason as BingTooltipCloseReason)
  }
  pendingReason = 'manual'
}, { immediate: true, flush: 'sync' })
watch(() => props.disabled, disabled => { if (disabled) hide('disabled') }, { flush: 'sync' })
watch(() => props.suppressWhenExpanded && trigger.expanded.value, expanded => { if (expanded) hide('manual') })
watch(() => [isSharedHost.value, !!sharedTooltipActiveOwner.value], ([host, active]) => {
  if (typeof window === 'undefined') return
  window.removeEventListener('pointerdown', handleWindowPointerDown, true)
  if (host && active) window.addEventListener('pointerdown', handleWindowPointerDown, true)
}, { immediate: true })
watch(() => [props.align, props.offset, props.placement, props.viewportPadding, props.maxWidth, props.scrollable, props.shortcut, props.tone], () => {
  if (isActiveTooltip.value) { sharedTooltipRefresh.value?.(); void nextTick(updatePosition) }
})
defineExpose<BingTooltipExpose>({ show, hide, toggle, updatePosition: () => { if (isActiveTooltip.value) sharedTooltipUpdatePosition.value?.() } })
onBeforeUnmount(() => {
  clearTimers()
  if (typeof window !== 'undefined') window.removeEventListener('pointerdown', handleWindowPointerDown, true)
  unregisterTooltipOwner(ownerRecord)
})
</script>

<template>
  <span ref="rootRef" :class="rootClasses" @pointerenter="handleRootPointerEnter" @pointerleave="handleRootPointerLeave"
    @pointerdown="handleRootPointerDown" @contextmenu="handleContextMenu" @selectstart="handleContextMenu"
    @focusin="handleRootFocusIn" @focusout="handleRootFocusOut" @click="handleRootClick">
    <span class="bing-tooltip__anchor">
      <slot :open="isActiveTooltip" :show="show" :hide="hide" :toggle="toggle" :trigger-props="triggerProps" />
    </span>
    <Teleport v-if="clientReady && isSharedHost" to="body">
      <div v-if="sharedTooltipShouldRender && panelOwner" :id="panelOwner.getTooltipId()" :ref="setPanelRef"
        :class="contentClasses" :style="contentStyle" role="tooltip" :aria-label="panelOwner.getAriaLabel()"
        :aria-hidden="!sharedTooltipActiveOwner" @pointerenter="handleContentEnter" @pointerleave="handleContentLeave"
        @focusin="handleContentEnter" @focusout="handleContentLeave">
        <span :ref="setSurfaceRef" class="bing-tooltip__surface" aria-hidden="true"><span class="bing-tooltip__arrow" aria-hidden="true" /></span>
        <div :ref="setBodyRef" class="bing-tooltip__body">
          <BingScrollbar v-if="panelScrollable" class="bing-tooltip__scroll" :focusable="false" horizontal>
            <div class="bing-tooltip__body-content"><component :is="panelContentComponent" :key="panelOwner.id" /></div>
          </BingScrollbar>
          <div v-else class="bing-tooltip__body-content"><component :is="panelContentComponent" :key="panelOwner.id" /></div>
          <span v-if="panelOwner.getShortcut().length" class="bing-tooltip__shortcut" aria-hidden="true">
            <kbd v-for="(key, index) in panelOwner.getShortcut()" :key="index" class="bing-kbd">{{ key }}</kbd>
          </span>
        </div>
      </div>
    </Teleport>
  </span>
</template>
<style scoped>
.bing-tooltip {
  position: relative;
  display: inline-flex;
  max-width: 100%;
  vertical-align: middle;
}

.bing-tooltip__anchor {
  display: inline-flex;
  max-width: 100%;
}

.bing-tooltip__content {
  box-sizing: border-box;
  width: max-content;
  min-width: 0;
  border: 1px solid transparent;
  max-width: min(var(--bing-tooltip-max-width, 280px), var(--bing-tooltip-available-width, calc(100vw - var(--bing-tooltip-viewport-padding) * 2)));
  border-radius: var(--bing-tooltip-radius, 6px);
  color: var(--bing-text);
  opacity: 0;
  pointer-events: none;
  transform-origin: var(--bing-tooltip-origin-x) var(--bing-tooltip-origin-y);
  visibility: hidden;
}

.bing-tooltip__surface {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: rgb(
    var(--bing-surface-rgb) / var(--bing-tooltip-glass-opacity, 0.86)
  );
  background-clip: padding-box;
  backdrop-filter: blur(var(--bing-tooltip-glass-blur, 16px))
    saturate(var(--bing-tooltip-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-tooltip-glass-blur, 16px))
    saturate(var(--bing-tooltip-glass-saturation, 1.05));
  box-shadow: var(--bing-tooltip-shadow, 0 4px 14px rgb(0 0 0 / 0.08), 0 1px 3px rgb(0 0 0 / 0.06));
  pointer-events: none;
}

.bing-tooltip__content.is-interactive {
  pointer-events: auto;
}

/* 单独绘制边框，在箭头根部留出开口，避免半透明表面叠出一条接缝。 */
.bing-tooltip__surface::before {
  position: absolute;
  inset: -1px;
  border: 1px solid var(--bing-popover-border);
  border-radius: inherit;
  mask:
    var(--bing-tooltip-border-gap) var(--bing-tooltip-border-edge) /
      var(--bing-tooltip-border-strip) no-repeat,
    linear-gradient(#000 0 0) var(--bing-tooltip-border-rest-edge) /
      var(--bing-tooltip-border-rest) no-repeat;
  content: '';
  pointer-events: none;
}

.bing-tooltip__content.is-placement-top,
.bing-tooltip__content.is-placement-bottom {
  --bing-tooltip-border-gap: linear-gradient(
    to right,
    #000 calc(var(--bing-tooltip-origin-x) - 6px),
    transparent 0,
    transparent calc(var(--bing-tooltip-origin-x) + 6px),
    #000 0
  );
  --bing-tooltip-border-strip: 100% 1px;
  --bing-tooltip-border-rest: 100% calc(100% - 1px);
}

.bing-tooltip__content.is-placement-left,
.bing-tooltip__content.is-placement-right {
  --bing-tooltip-border-gap: linear-gradient(
    to bottom,
    #000 calc(var(--bing-tooltip-origin-y) - 6px),
    transparent 0,
    transparent calc(var(--bing-tooltip-origin-y) + 6px),
    #000 0
  );
  --bing-tooltip-border-strip: 1px 100%;
  --bing-tooltip-border-rest: calc(100% - 1px) 100%;
}

.bing-tooltip__content.is-placement-top {
  --bing-tooltip-border-edge: bottom;
  --bing-tooltip-border-rest-edge: top;
}

.bing-tooltip__content.is-placement-bottom {
  --bing-tooltip-border-edge: top;
  --bing-tooltip-border-rest-edge: bottom;
}

.bing-tooltip__content.is-placement-left {
  --bing-tooltip-border-edge: right;
  --bing-tooltip-border-rest-edge: left;
}

.bing-tooltip__content.is-placement-right {
  --bing-tooltip-border-edge: left;
  --bing-tooltip-border-rest-edge: right;
}

.bing-tooltip__arrow {
  position: absolute;
  box-sizing: border-box;
  width: 10px;
  height: 10px;
  border: 1px solid var(--bing-popover-border);
  background: inherit;
  background-clip: padding-box;
  backdrop-filter: inherit;
  -webkit-backdrop-filter: inherit;
  clip-path: polygon(100% 0, 100% 100%, 0 100%);
  pointer-events: none;
}

.is-placement-top .bing-tooltip__arrow {
  top: 100%;
  left: calc(var(--bing-tooltip-origin-x) - 1px);
  transform: translate(-50%, -50%) rotate(45deg);
}

.is-placement-bottom .bing-tooltip__arrow {
  top: 0;
  left: calc(var(--bing-tooltip-origin-x) - 1px);
  transform: translate(-50%, -50%) rotate(225deg);
}

.is-placement-left .bing-tooltip__arrow {
  top: calc(var(--bing-tooltip-origin-y) - 1px);
  left: 100%;
  transform: translate(-50%, -50%) rotate(-45deg);
}

.is-placement-right .bing-tooltip__arrow {
  top: calc(var(--bing-tooltip-origin-y) - 1px);
  left: 0;
  transform: translate(-50%, -50%) rotate(135deg);
}

.bing-tooltip__body {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  max-width: 100%;
  max-height: var(--bing-tooltip-available-height, calc(100vh - var(--bing-tooltip-viewport-padding) * 2 - 2px));
  min-width: 0;
  overflow-wrap: break-word;
  overflow: hidden;
  color: inherit;
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
}

.bing-tooltip__scroll {
  /* 轨道复用提示框原有内边距，避免短文案叠加一整条滚动槽的留白。 */
  --bing-scrollbar-gutter: 6px;
  --bing-scrollbar-horizontal-bottom: 2px;
  max-height: inherit;
  max-width: 100%;
  min-width: 0;
}

.bing-tooltip__body-content {
  box-sizing: border-box;
  min-width: 0;
  padding: var(--bing-tooltip-padding, 6px 8px);
}

.bing-tooltip__scroll .bing-tooltip__body-content {
  /* 右侧与底部各有 6px 由 BingScrollbar 提供，总间距仍为上下 6px、左右 8px。 */
  padding: 6px 2px 0 8px;
}

.bing-tooltip__shortcut {
  display: inline-flex;
  flex-shrink: 0;
  gap: 3px;
  padding: 6px 8px 6px 0;
  color: var(--bing-muted);
  white-space: nowrap;
}

.bing-tooltip__content.is-tone-inverse {
  color: var(--bing-surface);
  --bing-popover-border: transparent;
  --bing-kbd-border: currentColor;
}

.is-tone-inverse .bing-tooltip__surface {
  background: var(--bing-heading);
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.is-tone-inverse .bing-tooltip__shortcut,
.is-tone-inverse .bing-tooltip__body :deep(strong),
.is-tone-inverse .bing-tooltip__body :deep(.bing-tooltip__title),
.is-tone-inverse .bing-tooltip__body :deep(.bing-tooltip__muted) {
  color: inherit;
}

.bing-tooltip.is-touch-held {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.bing-tooltip__body :deep(p) {
  margin: 0;
}

.bing-tooltip__body :deep(strong),
.bing-tooltip__body :deep(.bing-tooltip__title) {
  color: var(--bing-heading);
  font-weight: 500;
}

.bing-tooltip__body :deep(.bing-tooltip__muted) {
  color: var(--bing-muted);
}

@media (prefers-reduced-motion: reduce) {
  .bing-tooltip__content {
    transform: none !important;
    transition: none !important;
  }
}
</style>
