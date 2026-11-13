<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, ref, useId, useSlots, watch } from 'vue'
import { gsap } from 'gsap'
import { useClientReady } from '../../utils/useClientReady'
import { useClickFeedback } from '../../motion/useClickFeedback'
import { ChevronRight, Check } from '../../icons'
import { useReducedMotion } from '../../motion/reducedMotion'
import { enterLiquidHover, leaveLiquidHover, resetLiquidHover, setLiquidHoverOrigin } from '../../motion/liquidHover'
import { createSelectPanelEnter, createSelectPanelLeave } from '../../motion/selectPanelMotion'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import BingDropDownHighlight from './BingDropDownHighlight.vue'
import { bingDropDownContextKey } from './BingDropDown.context'
import type { BingDropDownItemEmits, BingDropDownItemProps } from './BingDropDown.types'
import { usePanelPlacement } from './usePanelPlacement'
import { shortcutKeys as splitShortcut, keyShortcuts, menuMotionItems } from './menuUtils'

const props = withDefaults(defineProps<BingDropDownItemProps>(), {
  tone: 'default', disabled: false, active: false, type: 'item', checked: false,
  closeOnClick: undefined,
})
const emit = defineEmits<BingDropDownItemEmits>()
const slots = useSlots()
const dropdown = inject(bingDropDownContextKey, null)
const clientReady = useClientReady()
const reducedMotion = useReducedMotion()
const { playClickFeedback } = useClickFeedback()
const itemRef = ref<HTMLElement>()
const liquidRef = ref<HTMLElement>()
const submenuRef = ref<HTMLElement>()
const submenuBodyRef = ref<HTMLElement>()
const submenuScrollbar = ref<BingScrollbarExpose>()
const isSubmenuVisible = ref(false)
const submenuId = (dropdown?.floatingId ?? 'bing-dropdown') + '-submenu-' + useId()
const hasSubmenu = computed(() => Boolean(slots.submenu))
const hasIcon = computed(() => Boolean(props.icon || slots.prefix))
const checkable = computed(() => props.type !== 'item')
const hasPrefix = computed(() => hasIcon.value || checkable.value)
const hasDescription = computed(() => Boolean(props.description || slots.description))
const shortcutKeys = computed(() => splitShortcut(props.shortcut))
const shortcutAria = computed(() => keyShortcuts(shortcutKeys.value))
const hasSuffix = computed(() => Boolean(slots.suffix || shortcutKeys.value.length || hasSubmenu.value || (checkable.value && hasIcon.value)))
const shouldCloseOnClick = computed(() => props.closeOnClick ?? !hasSubmenu.value)
const isLink = computed(() => Boolean(props.href && !props.disabled))
const itemTag = computed(() => isLink.value ? 'a' : 'button')
const resolvedRel = computed(() => isLink.value ? props.rel ?? (props.target === '_blank' ? 'noreferrer noopener' : undefined) : undefined)
const highlightMotion = computed(() => dropdown?.getHighlightMotion() ?? 'liquid')
const highlighted = computed(() => !props.disabled && (isSubmenuVisible.value || dropdown?.navigation.isHighlighted(itemRef.value)))
const shellClasses = computed(() => ['bing-dropdown-item-shell', 'is-side-' + placement.position.value.placement, { 'has-submenu': hasSubmenu.value, 'is-submenu-visible': isSubmenuVisible.value }])
const itemClasses = computed(() => ['bing-dropdown-item', 'bing-dropdown-item--' + props.tone, {
  'is-active': props.active, 'is-highlighted': highlighted.value, 'is-disabled': props.disabled,
  'is-checkable': checkable.value, 'is-checked': checkable.value && props.checked,
  'has-prefix': hasPrefix.value, 'has-icon': hasIcon.value, 'has-description': hasDescription.value, 'has-suffix': hasSuffix.value,
}])
const placement = usePanelPlacement({
  panel: () => submenuRef.value, body: () => submenuBodyRef.value,
  viewport: () => submenuScrollbar.value?.viewport,
  anchor: () => {
    const rect = itemRef.value?.getBoundingClientRect()
    const menu = itemRef.value?.closest('[role="menu"]')?.getBoundingClientRect()
    return rect && menu ? { ...rect.toJSON(), top: rect.top, bottom: rect.bottom, height: rect.height,
      left: menu.left, right: menu.right, width: menu.width } : rect
  }, side: () => 'right', align: () => 'start', gap: () => 4,
  alignOffset: () => (parseFloat(getComputedStyle(submenuRef.value!).borderTopWidth) || 0)
    + (submenuBodyRef.value ? parseFloat(getComputedStyle(submenuBodyRef.value).paddingTop) || 0 : 0),
  estimatedHeight: () => (submenuRef.value?.querySelectorAll('[data-bing-dropdown-item]').length ?? 0) * 32 + 8,
})
const submenuClasses = computed(() => ['bing-dropdown-item__submenu', 'is-side-' + placement.position.value.placement, { 'is-visible': isSubmenuVisible.value }])
const submenuStyles = computed(() => ({ ...(dropdown?.getGlassStyle() ?? {}),
  left: placement.position.value.left + 'px', top: placement.position.value.top + 'px',
  maxWidth: placement.boundaryWidth.value === undefined ? undefined : placement.boundaryWidth.value + 'px',
  minWidth: placement.boundaryWidth.value === undefined ? undefined : 'min(200px, ' + placement.boundaryWidth.value + 'px)',
}))
let submenuTimeline: gsap.core.Timeline | undefined
let checkTween: gsap.core.Tween | undefined
let pendingFocus = false
let generation = 0
let isLiquidActive = false
let keyboardActivation = false
let observer: MutationObserver | undefined
let resize: ResizeObserver | undefined

function resetLiquid() { isLiquidActive = false; if (liquidRef.value) resetLiquidHover(liquidRef.value) }
function handlePointerHover(event: PointerEvent) {
  const item = itemRef.value
  if (!item || props.disabled || event.pointerType === 'touch' || dropdown?.intent.protects(item, event)) return
  dropdown?.navigation.setHighlighted(item, 'pointer')
  dropdown?.intent.enter(item)
  if (!liquidRef.value || reducedMotion() || highlightMotion.value === 'slide') { resetLiquid(); return }
  setLiquidHoverOrigin(item, liquidRef.value, event)
  if (!isLiquidActive) { isLiquidActive = true; enterLiquidHover(liquidRef.value) }
}
function handlePointerLeave() {
  if (!liquidRef.value || !isLiquidActive) return
  isLiquidActive = false
  if (reducedMotion()) resetLiquid()
  else leaveLiquidHover(liquidRef.value)
}
function handleShellPointerLeave(event: PointerEvent) {
  if (itemRef.value && event.pointerType !== 'touch') dropdown?.intent.leave(itemRef.value, event)
}
function handleFocus() {
  if (itemRef.value && !props.disabled && !dropdown?.navigation.isHighlighted(itemRef.value)) dropdown?.navigation.setHighlighted(itemRef.value, 'keyboard')
}
function handleItemKeydown(event: KeyboardEvent) {
  if (event.defaultPrevented || props.disabled || event.isComposing) return
  if (event.key === 'Enter' || event.key === ' ') keyboardActivation = true
}
function handleClick(event: MouseEvent) {
  const keyboard = keyboardActivation
  keyboardActivation = false
  if (props.disabled) { event.preventDefault(); return }
  emit('click', event)
  if (event.defaultPrevented) return
  if (event.detail > 0 || keyboard) playClickFeedback(event)
  if (hasSubmenu.value) {
    if (itemRef.value) dropdown?.intent.open(itemRef.value, keyboard)
    else showSubmenu(keyboard)
    return
  }
  if (shouldCloseOnClick.value && itemRef.value) dropdown?.select(itemRef.value)
}
function focusSubmenuWhenReady() {
  if (!pendingFocus || !isSubmenuVisible.value || props.disabled) return
  pendingFocus = false
  if (document.activeElement === itemRef.value) dropdown?.navigation.focusBoundary('first', submenuRef.value)
}
function animateSubmenu(enter: boolean) {
  submenuTimeline?.kill(); submenuTimeline = undefined
  const panel = submenuRef.value
  if (!panel) return
  const { all, visible, hidden } = menuMotionItems(panel, submenuScrollbar.value?.viewport)
  gsap.killTweensOf([panel, ...all])
  if (reducedMotion()) {
    gsap.set([panel, ...all], { clearProps: 'transform,opacity,visibility' })
    if (enter) focusSubmenuWhenReady()
    return
  }
  if (hidden.length) gsap.set(hidden, { autoAlpha: 1, clearProps: 'transform' })
  submenuTimeline = (enter ? createSelectPanelEnter : createSelectPanelLeave)({
    panel, items: visible, actionRail: null, actionButtons: [], placement: placement.position.value.placement,
    align: 'start', scale: false, staggerCap: 0.12, maxStaggerItems: 8,
    selectedItem: dropdown?.getSelectedItem()?.closest('[role="menu"]') === panel ? dropdown.getSelectedItem() : null,
    onComplete: () => {
      submenuTimeline = undefined
      gsap.set([panel, ...all], { clearProps: isSubmenuVisible.value ? 'transform' : 'transform,opacity,visibility' })
      if (enter) focusSubmenuWhenReady()
    },
  })
}
function disconnect() { observer?.disconnect(); resize?.disconnect(); observer = undefined; resize = undefined }
function hideSubmenu() {
  generation++; pendingFocus = false
  if (!isSubmenuVisible.value) return
  isSubmenuVisible.value = false
  placement.dispose(); disconnect(); animateSubmenu(false)
}
async function showSubmenu(focus = false) {
  if (!hasSubmenu.value || props.disabled) return
  pendingFocus ||= focus
  if (isSubmenuVisible.value) { if (!submenuTimeline) focusSubmenuWhenReady(); return }
  const current = ++generation
  isSubmenuVisible.value = true
  await nextTick()
  if (!isSubmenuVisible.value || generation !== current) return
  placement.update()
  await nextTick()
  if (!isSubmenuVisible.value || generation !== current) return
  placement.start(); animateSubmenu(true)
  disconnect()
  observer = new MutationObserver(() => { dropdown?.navigation.refresh(); placement.schedule() })
  if (submenuBodyRef.value) observer.observe(submenuBodyRef.value, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-current', 'data-highlighted', 'aria-disabled'] })
  resize = new ResizeObserver(placement.schedule)
  if (submenuBodyRef.value) resize.observe(submenuBodyRef.value)
}
function enterSubmenu() { dropdown?.onSurfaceEnter(); if (itemRef.value) dropdown?.intent.enterPanel(itemRef.value) }
function leaveSubmenu(event: PointerEvent) {
  const item = itemRef.value
  const target = event.relatedTarget
  if (!item || (target instanceof Node && item.contains(target))) return
  const highlightedItem = submenuRef.value && dropdown?.navigation.highlighted.value.get(submenuRef.value)
  if (highlightedItem?.getAttribute('aria-expanded') !== 'true' && !dropdown?.getSelectedItem()) dropdown?.navigation.clear(submenuRef.value)
  dropdown?.intent.scheduleClose(item)
  dropdown?.onSurfaceLeave(event)
}
watch(itemRef, (item, _previous, cleanup) => {
  if (!item) return
  dropdown?.navigation.refresh()
  const unregister = hasSubmenu.value ? dropdown?.intent.register(item, {
    panel: () => submenuRef.value, visible: () => isSubmenuVisible.value, open: showSubmenu, close: hideSubmenu,
  }) : undefined
  if (props.active) dropdown?.navigation.setHighlighted(item, 'external')
  cleanup(() => {
    unregister?.()
    if (dropdown?.navigation.isHighlighted(item)) dropdown.navigation.clear(item.closest<HTMLElement>('[role="menu"]') ?? undefined)
    dropdown?.navigation.refresh()
  })
}, { flush: 'post' })
watch(() => props.active, active => {
  if (!itemRef.value) return
  if (active) dropdown?.navigation.setHighlighted(itemRef.value, 'external')
  else if (dropdown?.navigation.isHighlighted(itemRef.value)) dropdown.navigation.clear(itemRef.value.closest<HTMLElement>('[role="menu"]') ?? undefined)
}, { flush: 'post' })
watch(() => props.disabled, disabled => {
  if (disabled) {
    resetLiquid(); hideSubmenu()
    if (dropdown?.navigation.isHighlighted(itemRef.value)) dropdown.navigation.clear(itemRef.value?.closest<HTMLElement>('[role="menu"]') ?? undefined)
  }
  dropdown?.navigation.refresh()
})
watch(highlighted, value => { if (!value) resetLiquid() })
watch(() => [props.checked, itemRef.value, props.type], async (_value, previous) => {
  const oldPath = itemRef.value?.querySelector<SVGPathElement>('.bing-dropdown-item__check path')
  const start = oldPath ? { strokeDashoffset: getComputedStyle(oldPath).strokeDashoffset, opacity: getComputedStyle(oldPath).opacity } : undefined
  await nextTick()
  const paths = Array.from(itemRef.value?.querySelectorAll<SVGPathElement>('.bing-dropdown-item__check path') ?? [])
  for (const path of paths) path.setAttribute('pathLength', '1')
  checkTween?.kill()
  if (!previous?.[1] || reducedMotion() || !paths.length) return
  checkTween = gsap.fromTo(paths, start ?? { strokeDashoffset: props.checked ? 1 : 0, opacity: props.checked ? 0 : 1 }, { strokeDashoffset: props.checked ? 0 : 1, opacity: props.checked ? 1 : 0,
    duration: 0.18, ease: 'power2.out', onComplete: () => { gsap.set(paths, { clearProps: 'strokeDashoffset,opacity' }); checkTween = undefined } })
}, { flush: 'pre' })
onBeforeUnmount(() => {
  generation++; resetLiquid(); disconnect(); submenuTimeline?.kill(); checkTween?.kill()
  if (submenuRef.value) gsap.killTweensOf([submenuRef.value, ...menuMotionItems(submenuRef.value, submenuScrollbar.value?.viewport).all])
})
</script>

<template>
  <div :class="shellClasses" @pointerenter="handlePointerHover" @pointerleave="handleShellPointerLeave">
    <component :is="itemTag" ref="itemRef" :class="itemClasses" data-bing-dropdown-item
      :data-highlighted="highlighted ? '' : undefined" :data-highlight-motion="highlightMotion" :data-text-value="textValue"
      :role="type === 'radio' ? 'menuitemradio' : type === 'checkbox' ? 'menuitemcheckbox' : 'menuitem'"
      :type="itemTag === 'button' ? 'button' : undefined" :href="isLink ? href : undefined" :target="isLink ? target : undefined" :rel="resolvedRel"
      :disabled="itemTag === 'button' ? disabled : undefined" :tabindex="disabled ? -1 : dropdown?.navigation.tabIndex(itemRef) ?? 0"
      :aria-disabled="disabled || undefined" :aria-current="active ? 'true' : undefined" :aria-checked="checkable ? checked : undefined"
      :aria-label="ariaLabel" :aria-keyshortcuts="shortcutAria" :aria-haspopup="hasSubmenu ? 'menu' : undefined"
      :aria-expanded="hasSubmenu ? String(isSubmenuVisible) : undefined" :aria-controls="hasSubmenu ? submenuId : undefined"
      @click="handleClick" @focus="handleFocus" @keydown="handleItemKeydown"
      @pointerenter="handlePointerHover" @pointermove="handlePointerHover" @pointerleave="handlePointerLeave">
      <span ref="liquidRef" class="bing-dropdown-item__liquid" aria-hidden="true"></span>
      <span class="bing-dropdown-item__prefix" aria-hidden="true">
        <slot name="prefix"><BingIcon v-if="icon" :icon="icon" :size="16" :stroke-width="1.75" /></slot>
        <BingIcon v-if="checkable && !hasIcon" class="bing-dropdown-item__check" :icon="Check" :size="16" :stroke-width="2" />
      </span>
      <span class="bing-dropdown-item__content">
        <span class="bing-dropdown-item__title"><slot>{{ title }}</slot></span>
        <span v-if="hasDescription" class="bing-dropdown-item__description"><slot name="description">{{ description }}</slot></span>
      </span>
      <span v-if="hasSuffix" class="bing-dropdown-item__suffix">
        <slot v-if="$slots.suffix" name="suffix" />
        <span v-else-if="shortcutKeys.length" class="bing-dropdown-item__shortcut" aria-hidden="true">
          <kbd v-for="(key, index) in shortcutKeys" :key="index" class="bing-kbd bing-dropdown-item__key">{{ key }}</kbd>
        </span>
        <BingIcon v-if="checkable && hasIcon" class="bing-dropdown-item__check" :icon="Check" :size="16" :stroke-width="2" aria-hidden="true" />
        <BingIcon v-if="hasSubmenu" class="bing-dropdown-item__submenu-icon" :icon="ChevronRight" size="xs" :stroke-width="1.75" />
      </span>
    </component>
    <Teleport v-if="clientReady && hasSubmenu" to="body">
      <div :id="submenuId" ref="submenuRef" :class="submenuClasses" :style="submenuStyles" :data-bing-dropdown-floating="dropdown?.floatingId"
        role="menu" :aria-label="ariaLabel || title" :inert="!isSubmenuVisible" @keydown="dropdown?.onMenuKeydown($event)"
        @pointerenter="enterSubmenu" @pointerleave="leaveSubmenu" @focusin="enterSubmenu">
        <BingScrollbar ref="submenuScrollbar" :max-height="placement.bodyMaxHeight.value" :focusable="false" :smooth="false">
          <div ref="submenuBodyRef" class="bing-dropdown-item__submenu-body">
            <BingDropDownHighlight v-if="highlightMotion === 'slide'" />
            <slot name="submenu" />
          </div>
        </BingScrollbar>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bing-dropdown-item-shell {
  position: relative;
}

.bing-dropdown-item-shell.has-submenu.is-submenu-visible::after {
  position: absolute;
  top: -6px;
  bottom: -6px;
  left: 100%;
  z-index: 1;
  width: 8px;
  content: '';
}

.bing-dropdown-item-shell.is-side-left::after { left: auto; right: 100%; }

.bing-dropdown-item {
  --bing-dropdown-item-color: var(--bing-heading);
  --bing-dropdown-item-muted: var(--bing-muted);
  --bing-dropdown-item-accent: var(--bing-muted);
  --bing-dropdown-item-border: transparent;

  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: center;
  box-sizing: border-box;
  width: 100%;
  min-height: var(--bing-dropdown-item-height, 32px);
  gap: 9px;
  padding: 4px 8px;
  overflow: hidden;
  border: 1px solid var(--bing-dropdown-item-border);
  border-radius: var(--bing-radius-sm, 4px);
  background: transparent;
  color: var(--bing-dropdown-item-color);
  cursor: pointer;
  font: inherit;
  text-align: left;
  text-decoration: none;
  transition:
    background var(--bing-duration-fast) var(--bing-ease-smooth),
    border-color var(--bing-duration-fast) var(--bing-ease-smooth),
    color var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-dropdown-item.has-prefix {
  grid-template-columns: 16px minmax(0, 1fr);
}

.bing-dropdown-item.has-suffix {
  grid-template-columns: minmax(0, 1fr) auto;
}

.bing-dropdown-item.has-prefix.has-suffix {
  grid-template-columns: 16px minmax(0, 1fr) auto;
}

.bing-dropdown-item__liquid {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: inherit;
  background: radial-gradient(
    circle at var(--bing-liquid-x, 50%) var(--bing-liquid-y, 50%),
    rgb(var(--bing-liquid-rgb) / var(--bing-liquid-strength)) 0%,
    rgb(var(--bing-liquid-rgb) / var(--bing-liquid-strength)) 64%,
    rgb(var(--bing-liquid-rgb) / calc(var(--bing-liquid-strength) * 0.72)) 82%,
    rgb(var(--bing-liquid-rgb) / calc(var(--bing-liquid-strength) * 0.35)) 100%
  );
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transform: scale(0.08);
}

.bing-dropdown-item--primary {
  --bing-dropdown-item-accent: var(--bing-accent-strong);
}

.bing-dropdown-item--secondary {
  --bing-dropdown-item-accent: var(--bing-secondary-strong);
}

.bing-dropdown-item--danger {
  --bing-dropdown-item-color: var(--bing-danger-strong);
  --bing-dropdown-item-accent: var(--bing-danger-strong);
}

.bing-dropdown-item--success {
  --bing-dropdown-item-accent: var(--bing-success-strong);
}

.bing-dropdown-item--warning {
  --bing-dropdown-item-accent: var(--bing-warning-strong);
}

.bing-dropdown-item.is-highlighted:not(.is-disabled),
.bing-dropdown-item.is-active:not(.is-disabled) {
  background: var(--bing-surface-hover);
  outline: none;
}
.bing-dropdown-item--danger.is-highlighted:not(.is-disabled),
.bing-dropdown-item--danger.is-active:not(.is-disabled) {
  background: color-mix(in srgb, var(--bing-danger-strong) 10%, transparent);
}
.bing-dropdown-item:focus-visible { outline: none; box-shadow: var(--bing-control-focus-shadow); }
.bing-dropdown-item[data-highlight-motion='slide'].is-highlighted,
.bing-dropdown-item[data-highlight-motion='slide'].is-active { background: transparent; }
.bing-dropdown-item[data-highlight-motion='slide'] > .bing-dropdown-item__liquid { display: none; }

.bing-dropdown-item__prefix,
.bing-dropdown-item__suffix,
.bing-dropdown-item__content,
.bing-dropdown-item__title,
.bing-dropdown-item__description {
  position: relative;
  z-index: 1;
  font-size: 0.75rem;
  font-weight: 400;
}

.bing-dropdown-item__prefix {
  display: none;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: var(--bing-dropdown-item-accent);
}

.bing-dropdown-item__content {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.bing-dropdown-item__title {
  min-width: 0;
  overflow: hidden;
  color: inherit;
  font-size: var(--bing-font-size-md, 0.875rem);
  font-weight: 400;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-dropdown-item__description {
  min-width: 0;
  overflow: hidden;
  color: var(--bing-dropdown-item-muted);
  font-size: 0.74rem;
  font-weight: 400;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-dropdown-item__suffix {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 0;
  gap: 6px;
  color: var(--bing-dropdown-item-muted);
}

.bing-dropdown-item.has-prefix > .bing-dropdown-item__prefix { display: inline-flex; }
:global([role='menu']:has(.bing-dropdown-item.is-checkable) .bing-dropdown-item:not(.has-prefix)) {
  grid-template-columns: 16px minmax(0, 1fr);
}
:global([role='menu']:has(.bing-dropdown-item.is-checkable) .bing-dropdown-item.has-suffix) {
  grid-template-columns: 16px minmax(0, 1fr) auto;
}
:global([role='menu']:has(.bing-dropdown-item.is-checkable) .bing-dropdown-item__prefix) { display: inline-flex; }
.bing-dropdown-item__shortcut { display: inline-flex; align-items: center; gap: 3px; color: var(--bing-muted); white-space: nowrap; }
.bing-dropdown-item.is-highlighted .bing-dropdown-item__shortcut { color: inherit; }
.bing-dropdown-item.is-highlighted .bing-dropdown-item__key { border-color: currentColor; }
.bing-dropdown-item__check { color: var(--bing-heading); }
.bing-dropdown-item__check :deep(path) { stroke-dasharray: 1; stroke-dashoffset: 1; opacity: 0; }
.bing-dropdown-item.is-checked .bing-dropdown-item__check :deep(path) { stroke-dashoffset: 0; opacity: 1; }

.bing-dropdown-item__submenu-icon {
  transition: transform var(--bing-duration-fast) var(--bing-ease-smooth);
}

.bing-dropdown-item-shell.has-submenu.is-submenu-visible .bing-dropdown-item__submenu-icon {
  transform: translateX(2px);
}

.bing-dropdown-item__submenu {
  position: fixed;
  top: 0;
  left: 0;
  z-index: calc(var(--bing-dropdown-z-index, 3000) + 1);
  display: grid;
  box-sizing: border-box;
  min-width: 200px;
  gap: 0;
  padding: 0;
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
  pointer-events: none;
  /* 淡入淡出由 GSAP 时间线统一控制，避免 CSS 再次缓动每帧的透明度。 */
}

.bing-dropdown-item__submenu-body { position: relative; padding: 4px; }

.bing-dropdown-item__submenu::before {
  position: absolute;
  top: -6px;
  bottom: -6px;
  width: 8px;
  content: '';
}

.bing-dropdown-item__submenu.is-side-right::before {
  right: 100%;
}

.bing-dropdown-item__submenu.is-side-left::before {
  left: 100%;
}

.bing-dropdown-item__submenu.is-visible {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.bing-dropdown-item.is-disabled {
  color: var(--bing-disabled-text);
  cursor: not-allowed;
}

.bing-dropdown-item.is-disabled .bing-dropdown-item__prefix,
.bing-dropdown-item.is-disabled .bing-dropdown-item__suffix { opacity: 0.5; }

@media (prefers-reduced-motion: reduce) {
  .bing-dropdown-item,
  .bing-dropdown-item__submenu,
  .bing-dropdown-item__submenu-icon {
    transition: none;
  }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .bing-dropdown-item__submenu { background: var(--bing-surface-solid); }
}
</style>
