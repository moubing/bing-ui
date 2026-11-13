<script setup lang="ts">
import { useConfigZIndex } from '../../utils/config'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, shallowRef, useId, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { gsap } from 'gsap'
import { createSelectPanelEnter, createSelectPanelLeave } from '../../motion/selectPanelMotion'
import { getOptionDetailSnapshot, moveOptionDetailPanel, type DetailPanelSnapshot } from '../../motion/optionDetailMotion'
import { enterLiquidHover, leaveLiquidHover, setLiquidHoverOrigin } from '../../motion/liquidHover'
import BingInput from '../BingInput/BingInput.vue'
import BingButton from '../BingButton/BingButton.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingInputExpose } from '../BingInput/BingInput.types'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import { isolateFormControls, useFormControl } from '../BingForm/useFormControl'
import { useOverlay } from '../../utils/overlay'
import { useClientReady } from '../../utils/useClientReady'
import { useControlAttrs } from '../../utils/controlAttrs'
import type { BingAutocompleteEmits, BingAutocompleteExpose, BingAutocompleteOption, BingAutocompleteProps, BingAutocompleteSlots } from './BingAutocomplete.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const reducedMotion = useReducedMotion()

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<BingAutocompleteProps>(), {
  modelValue: '', options: () => [], filter: true, openOnEmpty: true, loading: false, error: '',
  disabled: undefined, clearable: true, emptyText: '没有匹配的候选',
  block: false, panelMaxHeight: 360, completeOnSelect: true, closeOnSelect: true,
})
const emit = defineEmits<BingAutocompleteEmits>()
const slots = defineSlots<BingAutocompleteSlots>()
const { rootAttrs, controlAttrs } = useControlAttrs()
const { formItem, resolvedId, resolvedSize, resolvedDisabled, resolvedStatus, resolvedAriaDescribedby } = useFormControl(props)
isolateFormControls()
const clientReady = useClientReady()
const listId = `bing-autocomplete-${useId()}`
const root = ref<HTMLElement | null>(null)
const panel = ref<HTMLElement | null>(null)
const detail = ref<HTMLElement | null>(null)
const detailContent = ref<HTMLElement | null>(null)
const detailOption = shallowRef<BingAutocompleteOption>()
const detailPlacement = ref<'left' | 'right'>('right')
const input = ref<BingInputExpose | null>(null)
const scrollbar = ref<BingScrollbarExpose | null>(null)
const detailScrollbar = ref<BingScrollbarExpose | null>(null)
const open = ref(false)
const composing = ref(false)
const activeIndex = ref(-1)
const position = ref({ left: 0, top: 0, width: 320, height: 360, detailHeight: 360, inline: true, placement: 'bottom' as 'top' | 'bottom' })
let frame = 0
let blurFrame = 0
let detailFrame = 0
let detailRequest = 0
let detailClosing = false
let detailHideTimer: ReturnType<typeof setTimeout> | undefined
let scrollEndTimer: ReturnType<typeof setTimeout> | undefined
let keyboardNavigating = false
let lastPointer: { x: number; y: number } | undefined
let disposed = false
let panelTimeline: gsap.core.Timeline | undefined
let completePanelLeave: (() => void) | undefined
let motionContext: gsap.Context | undefined
let observer: ResizeObserver | undefined
let restoringFocus = false

const options = computed(() => {
  if (!props.filter) return props.options
  const query = props.modelValue.trim().toLocaleLowerCase()
  return props.options.filter(option => option.label.toLocaleLowerCase().includes(query))
})
const selectable = computed(() => !props.loading && !props.error)
const hasOptionAction = computed(() => Boolean(props.optionActionLabel?.trim()))
const active = computed(() => selectable.value ? options.value[activeIndex.value] : undefined)
const detailMeta = computed(() => Object.entries(detailOption.value?.meta ?? {}).filter(([, value]) => value !== null && value !== undefined && value !== ''))
const inlineDetailBudget = computed(() => position.value.inline && detailOption.value ? Math.min(184, position.value.height / 2) : 0)
const overlayZIndex = useConfigZIndex('popover')
const overlay = useOverlay({
  open: () => open.value, elements: () => [root.value, panel.value, detail.value], zIndex: () => overlayZIndex.value,
  closeOnEscape: () => !composing.value,
  onEscape: () => {
    close(); restoringFocus = true
    input.value?.input?.focus({ preventScroll: true })
    restoringFocus = false
  },
})
const panelStyle = computed<CSSProperties>(() => ({
  position: 'fixed', left: `${position.value.left}px`, top: `${position.value.top}px`,
  width: `${position.value.width}px`, zIndex: overlay.zIndex.value,
}))
const detailStyle = computed<CSSProperties>(() => position.value.inline ? {} : ({
  zIndex: overlay.zIndex.value + 1,
}))

function withMotion(callback: () => void) {
  if (motionContext) motionContext.add(callback)
  else callback()
}
function optionElement(index = activeIndex.value) { return document.getElementById(`${listId}-${index}`) }
function clearDetailHide() { clearTimeout(detailHideTimer); detailHideTimer = undefined }
function detailTarget() {
  const item = optionElement()
  const element = detail.value
  if (!open.value || !item || !element || position.value.inline) return null
  const bounds = item.getBoundingClientRect()
  const viewport = window.visualViewport
  const leftEdge = (viewport?.offsetLeft ?? 0) + 12
  const topEdge = (viewport?.offsetTop ?? 0) + 12
  const rightEdge = leftEdge + (viewport?.width ?? innerWidth) - 24
  const bottomEdge = topEdge + (viewport?.height ?? innerHeight) - 24
  const width = element.offsetWidth
  const height = element.offsetHeight
  const right = position.value.left + position.value.width + 12
  const left = position.value.left - width - 12
  const placement = right + width <= rightEdge ? 'right' : 'left'
  return {
    x: Math.max(leftEdge, Math.min(placement === 'right' ? right : left, rightEdge - width)),
    y: Math.max(topEdge, Math.min(bounds.top + bounds.height / 2 - height / 2, bottomEdge - height)),
    placement,
  } as const
}
function positionDetail(animateContent = false, previousSnapshot?: DetailPanelSnapshot) {
  cancelAnimationFrame(detailFrame)
  if (!open.value || !detailOption.value) return
  detailFrame = requestAnimationFrame(() => {
    detailFrame = 0
    if (disposed || !open.value || !detail.value || position.value.inline) return
    withMotion(() => {
      const target = moveOptionDetailPanel({ panel: detail.value, content: detailContent.value,
        getTarget: detailTarget, animateContent, previousSnapshot, reducedMotion: reducedMotion(),
        // 内容位移也会暂时增加 scrollHeight；动画结束后重新计算轨道，避免残留滚动条。
        onComplete: () => detailScrollbar.value?.update() })
      if (target) detailPlacement.value = target.placement
    })
  })
}
function showDetail() {
  detailClosing = false
  clearDetailHide()
  clearTimeout(scrollEndTimer)
  const option = active.value
  if (!open.value || !option || option.disabled || !(slots['option-detail'] || option.detail?.trim() || option.description?.trim() ||
    Object.values(option.meta ?? {}).some(value => value !== null && value !== undefined && value !== ''))) {
    hideDetail(true)
    return
  }
  const changed = detailOption.value !== option
  const previousSnapshot = changed ? getOptionDetailSnapshot(detail.value) : undefined
  if (detail.value) gsap.killTweensOf(detail.value)
  detailOption.value = option
  const request = ++detailRequest
  void nextTick(() => {
    if (disposed || request !== detailRequest || !open.value) return
    positionDetail(changed, previousSnapshot)
  })
}
function hideDetail(immediate = false) {
  detailClosing = true
  clearDetailHide()
  cancelAnimationFrame(detailFrame)
  detailFrame = 0
  const request = ++detailRequest
  const element = detail.value
  gsap.killTweensOf([element, detailContent.value].filter(Boolean))
  const finish = () => { if (request === detailRequest) { detailOption.value = undefined; detailClosing = false } }
  if (!element || immediate || position.value.inline || reducedMotion()) { finish(); return }
  withMotion(() => {
    gsap.to(element, { autoAlpha: 0, scale: .96, x: `+=${detailPlacement.value === 'right' ? -6 : 6}`,
      duration: .14, ease: 'power2.out', overwrite: true, onComplete: finish })
  })
}
function scheduleDetailHide() {
  clearDetailHide()
  detailHideTimer = setTimeout(() => hideDetail(), 120)
}
function hoverOption(event: MouseEvent, index: number) {
  const moved = !lastPointer || event.clientX !== lastPointer.x || event.clientY !== lastPointer.y
  lastPointer = { x: event.clientX, y: event.clientY }
  // 滚动或入场动画可能让选项经过静止的鼠标，不能覆盖键盘高亮。
  if (keyboardNavigating && (event.type !== 'mousemove' || !moved)) return
  keyboardNavigating = false
  clearDetailHide()
  if (options.value[index]?.disabled) { hideDetail(true); return }
  const changed = activeIndex.value !== index
  activeIndex.value = index
  if (changed || !detailOption.value || detailClosing) showDetail()
  const surface = event.currentTarget as HTMLElement
  const liquid = surface.querySelector<HTMLElement>('.bing-autocomplete__option-liquid')
  if (!liquid || reducedMotion()) return
  setLiquidHoverOrigin(surface, liquid, event)
  if (!surface.classList.contains('is-liquid-active')) {
    surface.classList.add('is-liquid-active')
    withMotion(() => { enterLiquidHover(liquid) })
  }
}
function leaveOption(event: MouseEvent) {
  const surface = event.currentTarget as HTMLElement
  surface.classList.remove('is-liquid-active')
  const liquid = surface.querySelector<HTMLElement>('.bing-autocomplete__option-liquid')
  if (liquid && !reducedMotion()) withMotion(() => { leaveLiquidHover(liquid) })
}
function panelScroll() {
  if (keyboardNavigating) { positionDetail(); return }
  hideDetail(true)
  clearTimeout(scrollEndTimer)
  scrollEndTimer = setTimeout(() => {
    if (!open.value || keyboardNavigating || !lastPointer) return
    const item = document.elementFromPoint(lastPointer.x, lastPointer.y)?.closest<HTMLElement>('[data-autocomplete-index]')
    if (!item || !panel.value?.contains(item)) return
    activeIndex.value = Number(item.dataset.autocompleteIndex)
    showDetail()
  }, 150)
}
function panelMotion(element: Element, done: () => void, entering: boolean) {
  if (disposed) { done(); return }
  panelTimeline?.kill()
  completePanelLeave = entering ? undefined : done
  const target = element as HTMLElement
  const items = Array.from(target.querySelectorAll<HTMLElement>('.bing-autocomplete__option'))
  const liquids = target.querySelectorAll('.bing-autocomplete__option-liquid')
  gsap.killTweensOf([target, ...items, ...liquids])
  target.inert = !entering
  if (entering) { measure(); observer?.observe(target) }
  else observer?.unobserve(target)
  if (reducedMotion()) {
    gsap.set([target, ...items], { autoAlpha: entering ? 1 : 0, clearProps: 'transform' })
    completePanelLeave = undefined
    done(); return
  }
  withMotion(() => {
    const animate = entering ? createSelectPanelEnter : createSelectPanelLeave
    const bounds = target.getBoundingClientRect()
    const visibleItems = items.filter(item => {
      const rect = item.getBoundingClientRect()
      return rect.top < bounds.bottom && rect.bottom > bounds.top
    })
    // 仅提升参与动画的候选；保留到浮层移除，避免动画收尾切换文字绘制层。
    visibleItems.forEach(item => { item.style.willChange = 'transform, opacity' })
    panelTimeline = animate({ panel: target, items: visibleItems,
      actionRail: null, actionButtons: [], placement: position.value.placement, align: 'start',
      onComplete: () => { panelTimeline = undefined; completePanelLeave = undefined; done(); if (entering) positionDetail() } })
  })
}
function cancelPanelMotion() { panelTimeline?.kill(); panelTimeline = undefined }

function measure() {
  frame = 0
  if (!open.value || !root.value) return
  const rect = root.value.getBoundingClientRect()
  const viewport = window.visualViewport
  const leftEdge = (viewport?.offsetLeft ?? 0) + 8
  const topEdge = (viewport?.offsetTop ?? 0) + 8
  const rightEdge = leftEdge + (viewport?.width ?? window.innerWidth) - 16
  const bottomEdge = topEdge + (viewport?.height ?? window.innerHeight) - 16
  const width = Math.min(Math.max(rect.width, props.panelWidth ?? 320), rightEdge - leftEdge)
  const left = Math.max(leftEdge, Math.min(rect.left, rightEdge - width))
  const below = bottomEdge - rect.bottom - 10
  const above = rect.top - topEdge - 10
  const bottom = below >= Math.min(props.panelMaxHeight, 200) || below >= above
  const height = Math.max(0, Math.min(props.panelMaxHeight, (bottom ? below : above) - 10))
  const actual = Math.min(panel.value?.offsetHeight ?? height + 10, height + 10)
  const top = bottom ? Math.min(bottomEdge, rect.bottom + 10) : Math.max(topEdge, rect.top - 10 - actual)
  const inline = rightEdge - left - width < 260 && left - leftEdge < 260
  const changedLayout = position.value.inline !== inline
  if (changedLayout) gsap.killTweensOf([detail.value, detailContent.value].filter(Boolean))
  const nextPosition = { left, top, width, height, inline, detailHeight: Math.max(0, bottomEdge - topEdge - 32), placement: bottom ? 'bottom' as const : 'top' as const }
  const geometryChanged = (Object.keys(nextPosition) as Array<keyof typeof nextPosition>).some(key => nextPosition[key] !== position.value[key])
  if (geometryChanged) {
    position.value = nextPosition
    void nextTick(() => positionDetail())
  }
}
function scheduleMeasure() {
  if (open.value && !frame) frame = requestAnimationFrame(measure)
}
function canOpen(value = props.modelValue) { return props.openOnEmpty || Boolean(value.trim()) }
function show(value = props.modelValue) {
  if (resolvedDisabled.value || open.value || restoringFocus || !canOpen(value)) return
  open.value = true
  keyboardNavigating = false
  activeIndex.value = options.value.findIndex(option => !option.disabled)
  measure()
  emit('open')
  void nextTick(() => { if (open.value) measure() })
}
function close() {
  if (!open.value) return
  open.value = false
  keyboardNavigating = false
  clearTimeout(scrollEndTimer)
  hideDetail()
  if (panel.value) observer?.unobserve(panel.value)
  emit('close')
}
function focus() { input.value?.focus(); show() }
function update(value: string | number | null) {
  keyboardNavigating = false
  const text = String(value ?? '')
  emit('update:modelValue', text)
  formItem?.handleControlChange()
  if (canOpen(text)) show(text)
  else close()
}
function choose(option: BingAutocompleteOption) {
  if (!selectable.value || option.disabled || resolvedDisabled.value || composing.value) return
  if (props.completeOnSelect) update(option.label)
  emit('select', option)
  if (props.closeOnSelect) close()
}
function runOptionAction(option: BingAutocompleteOption, event: MouseEvent) {
  if (!selectable.value || option.disabled || resolvedDisabled.value || composing.value) return
  // 保持原生事件内同步派发，支持 window.open 等需要用户激活的操作。
  emit('option-action', option, event)
}
function focusOptionAction() {
  if (!open.value || !hasOptionAction.value || !active.value || active.value.disabled) return false
  const button = optionElement()?.querySelector<HTMLButtonElement>('.bing-autocomplete__option-action button')
  if (!button || button.disabled) return false
  // 逐项入场时按钮可能仍 visibility:hidden；键盘操作立即完成入场后再交接焦点。
  panelTimeline?.progress(1)
  button.focus({ preventScroll: true })
  revealActive()
  return document.activeElement === button
}
function focusInput() { input.value?.input?.focus({ preventScroll: true }) }
function actionKeydown(event: KeyboardEvent, index: number) {
  if (event.isComposing || composing.value || event.keyCode === 229) return
  activeIndex.value = index
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    keydown(event)
    void nextTick(focusOptionAction)
  } else if (event.key === 'ArrowLeft' || event.key === 'F2' || (event.key === 'Tab' && event.shiftKey)) {
    event.preventDefault(); focusInput()
  } else if (event.key === 'Tab') {
    // 回到输入框后让浏览器继续正常 Tab 顺序，避免 Teleport 把焦点带到页面末尾。
    focusInput(); close()
  }
}
function revealActive() {
  void nextTick(() => {
    const viewport = scrollbar.value?.viewport
    const item = document.getElementById(`${listId}-${activeIndex.value}`)
    if (!open.value || !viewport || !item) return
    scrollbar.value?.stop()
    const bounds = viewport.getBoundingClientRect()
    const rect = item.getBoundingClientRect()
    if (rect.top < bounds.top) viewport.scrollTop += rect.top - bounds.top
    else if (rect.bottom > bounds.bottom) viewport.scrollTop += rect.bottom - bounds.bottom
    showDetail()
  })
}
function keydown(event: KeyboardEvent) {
  if (event.isComposing || composing.value || event.keyCode === 229 || resolvedDisabled.value) return
  if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) {
    keyboardNavigating = false
    return
  }
  if (event.key === 'Escape' && open.value) {
    event.preventDefault(); event.stopPropagation(); close()
  } else if (open.value && (event.key === 'F2' || (event.key === 'ArrowRight' && keyboardNavigating))) {
    if (focusOptionAction()) event.preventDefault()
  } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    if (!open.value) { show(); keyboardNavigating = true; revealActive(); return }
    if (!selectable.value) return
    keyboardNavigating = true
    const direction = event.key === 'ArrowDown' ? 1 : -1
    for (let step = 1; step <= options.value.length; step++) {
      const index = (activeIndex.value + direction * step + options.value.length) % options.value.length
      if (!options.value[index]?.disabled) { activeIndex.value = index; revealActive(); break }
    }
  } else if (event.key === 'Enter' && open.value && active.value) {
    event.preventDefault(); choose(active.value)
  } else if (event.key === 'ArrowLeft' || event.key === 'Home' || event.key === 'End') {
    keyboardNavigating = false
  }
}
function contains(target: Node | null) {
  return Boolean(target && ([root.value, panel.value, detail.value].some(element => element?.contains(target)) || overlay.contains(target)))
}
function outside(event: Event) {
  if (open.value && event.target instanceof Node && !contains(event.target)) close()
}
function focusout(event: FocusEvent) {
  const nextTargetWasInside = event.relatedTarget instanceof Node && contains(event.relatedTarget)
  cancelAnimationFrame(blurFrame)
  // focusout 阶段 activeElement 可能仍是 body，等浏览器完成整次焦点迁移。
  blurFrame = requestAnimationFrame(() => {
    blurFrame = 0
    const removedControl = (!event.relatedTarget && event.target instanceof Node && !event.target.isConnected)
      || (nextTargetWasInside && event.relatedTarget instanceof Node && !event.relatedTarget.isConnected)
    if (open.value && removedControl && document.activeElement === document.body) {
      input.value?.input?.focus({ preventScroll: true })
      return
    }
    if (!contains(document.activeElement)) { close(); formItem?.handleControlBlur() }
  })
}
watch([options, selectable], () => {
  const focused = typeof document === 'undefined' ? null : document.activeElement
  const hadFocus = contains(focused)
  activeIndex.value = options.value.findIndex(option => !option.disabled)
  if (open.value) {
    scheduleMeasure()
    if (keyboardNavigating && active.value) revealActive()
    else hideDetail(true)
  }
  void nextTick(() => {
    if (open.value && hadFocus && focused && !focused.isConnected && document.activeElement === document.body) {
      input.value?.input?.focus({ preventScroll: true })
    }
  })
})
watch(resolvedDisabled, value => { if (value) close() })
watch([() => props.modelValue, () => props.openOnEmpty], () => { if (!canOpen()) close() })
watch([() => props.panelWidth, () => props.panelMaxHeight], scheduleMeasure)
watch(inlineDetailBudget, () => { if (keyboardNavigating) revealActive() })
watch(detailContent, (value, previous) => {
  if (previous) observer?.unobserve(previous)
  if (value) observer?.observe(value)
})
onMounted(() => {
  motionContext = gsap.context(() => {}, root.value!)
  observer = new ResizeObserver(entries => {
    if (entries.some(entry => entry.target !== detailContent.value)) scheduleMeasure()
    if (entries.some(entry => entry.target === detailContent.value) && !detailFrame && detail.value && !gsap.isTweening(detail.value)) positionDetail()
  })
  if (root.value) observer.observe(root.value)
  window.addEventListener('resize', scheduleMeasure)
  window.addEventListener('scroll', scheduleMeasure, true)
  window.visualViewport?.addEventListener('resize', scheduleMeasure)
  window.visualViewport?.addEventListener('scroll', scheduleMeasure)
  document.addEventListener('pointerdown', outside, true)
  document.addEventListener('focusin', outside)
})
onBeforeUnmount(() => {
  disposed = true
  detailRequest++
  clearDetailHide(); clearTimeout(scrollEndTimer); cancelAnimationFrame(detailFrame)
  cancelPanelMotion(); completePanelLeave?.(); completePanelLeave = undefined; motionContext?.revert()
  cancelAnimationFrame(frame); cancelAnimationFrame(blurFrame); observer?.disconnect()
  window.removeEventListener('resize', scheduleMeasure)
  window.removeEventListener('scroll', scheduleMeasure, true)
  window.visualViewport?.removeEventListener('resize', scheduleMeasure)
  window.visualViewport?.removeEventListener('scroll', scheduleMeasure)
  document.removeEventListener('pointerdown', outside, true)
  document.removeEventListener('focusin', outside)
})
defineExpose<BingAutocompleteExpose>({ focus, close, get input() { return input.value?.input ?? null } })
</script>

<template>
  <div v-bind="rootAttrs()" ref="root" class="bing-autocomplete" :class="{ 'is-block': block }" @focusout="focusout">
    <BingInput v-bind="controlAttrs()" :id="resolvedId" ref="input" :model-value="modelValue" :disabled="resolvedDisabled"
      :size="resolvedSize" :status="resolvedStatus" :placeholder="placeholder" :clearable="clearable" :icon="icon" block
      :aria-label="ariaLabel" :aria-describedby="resolvedAriaDescribedby" role="combobox" aria-autocomplete="list"
      :aria-expanded="open" :aria-controls="open ? listId : undefined"
      :aria-haspopup="hasOptionAction ? 'grid' : 'listbox'"
      :aria-activedescendant="open && active ? `${listId}-${activeIndex}${hasOptionAction ? '-main' : ''}` : undefined"
      :spellcheck="false" @update:model-value="update" @focus="show()" @click="keyboardNavigating = false; show()" @keydown="keydown"
      @compositionstart="composing = true" @compositionend="composing = false" @clear="emit('clear')">
      <template v-if="slots.icon" #icon><slot name="icon" /></template>
    </BingInput>
    <Teleport v-if="clientReady" to="body">
      <Transition :css="false" @enter="(element, done) => panelMotion(element, done, true)"
        @leave="(element, done) => panelMotion(element, done, false)"
        @enter-cancelled="cancelPanelMotion" @leave-cancelled="cancelPanelMotion">
      <div v-if="open" ref="panel" class="bing-autocomplete__panel" :style="panelStyle" @focusout="focusout">
        <BingScrollbar ref="scrollbar" :max-height="position.height - inlineDetailBudget" :focusable="false" @scroll="panelScroll">
          <div v-if="slots.header" class="bing-autocomplete__header"><slot name="header" /></div>
          <div :id="listId" :role="hasOptionAction ? 'grid' : 'listbox'" :aria-label="ariaLabel || '搜索候选'" :aria-busy="loading"
            @mouseenter="clearDetailHide" @mouseleave="scheduleDetailHide">
            <template v-if="selectable">
              <div v-for="(option, index) in options" :id="`${listId}-${index}`" :key="option.value" :role="hasOptionAction ? 'row' : 'option'"
                class="bing-autocomplete__option" :class="{ 'is-active': activeIndex === index, 'is-disabled': option.disabled }"
                :aria-selected="activeIndex === index" :aria-disabled="option.disabled || undefined" :aria-label="option.label"
                :data-autocomplete-index="index" @mousedown.prevent @mouseenter="hoverOption($event, index)"
                @mousemove="hoverOption($event, index)" @mouseleave="leaveOption" @click="choose(option)">
                <span class="bing-autocomplete__option-liquid" aria-hidden="true" />
                <span :id="hasOptionAction ? `${listId}-${index}-main` : undefined" class="bing-autocomplete__option-main"
                  :role="hasOptionAction ? 'gridcell' : undefined" :aria-label="hasOptionAction ? option.label : undefined">
                  <slot name="option" :option="option" :active="activeIndex === index"><span>{{ option.label }}</span></slot>
                </span>
                <span v-if="hasOptionAction" class="bing-autocomplete__option-action" role="gridcell"
                  @mousedown.stop @click.stop @keydown="actionKeydown($event, index)" @focusin="activeIndex = index; showDetail()">
                  <BingButton variant="ghost" size="sm" :throttle="false" :tabindex="-1" :disabled="option.disabled || resolvedDisabled"
                    :aria-label="`${optionActionLabel}：${option.label}`" :title="optionActionLabel"
                    @click="runOptionAction(option, $event)">
                    <slot name="option-action" :option="option" :active="activeIndex === index">{{ optionActionLabel }}</slot>
                  </BingButton>
                </span>
              </div>
            </template>
          </div>
          <div v-if="loading" class="bing-autocomplete__state" role="status"><slot name="loading">正在加载…</slot></div>
          <div v-else-if="error" class="bing-autocomplete__state" role="alert"><slot name="error" :error="error">{{ error }}</slot></div>
          <div v-else-if="!options.length" class="bing-autocomplete__state" role="status"><slot name="empty">{{ emptyText }}</slot></div>
          <div v-if="slots.footer" class="bing-autocomplete__footer"><slot name="footer" /></div>
        </BingScrollbar>
          <div v-if="position.inline && detailOption" class="bing-autocomplete__detail is-inline" aria-hidden="true"
            @mouseenter="clearDetailHide" @mouseleave="scheduleDetailHide" @mousedown.prevent>
            <BingScrollbar :max-height="Math.max(0, inlineDetailBudget - 28)" :focusable="false">
            <slot name="option-detail" :option="detailOption">
              <strong>{{ detailOption.label }}</strong><p v-if="detailOption.detail || detailOption.description">{{ detailOption.detail || detailOption.description }}</p>
              <dl v-if="detailMeta.length"><div v-for="[key, value] in detailMeta" :key="key"><dt>{{ key }}</dt><dd>{{ value }}</dd></div></dl>
            </slot>
            </BingScrollbar>
          </div>
      </div>
      </Transition>
      <div v-if="!position.inline && detailOption" ref="detail" class="bing-autocomplete__detail" :style="detailStyle"
        aria-hidden="true" @mouseenter="clearDetailHide" @mouseleave="scheduleDetailHide" @mousedown.prevent @pointerdown.stop @click.stop>
        <BingScrollbar ref="detailScrollbar" :max-height="position.detailHeight" :focusable="false">
          <div ref="detailContent" class="bing-autocomplete__detail-content">
            <slot name="option-detail" :option="detailOption">
              <strong>{{ detailOption.label }}</strong><p v-if="detailOption.detail || detailOption.description">{{ detailOption.detail || detailOption.description }}</p>
              <dl v-if="detailMeta.length"><div v-for="[key, value] in detailMeta" :key="key"><dt>{{ key }}</dt><dd>{{ value }}</dd></div></dl>
            </slot>
          </div>
        </BingScrollbar>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
.bing-autocomplete { display: inline-block; width: 280px; max-width: 100%; min-width: 0; }
.bing-autocomplete.is-block { display: block; width: 100%; }
.bing-autocomplete__panel, .bing-autocomplete__detail {
  box-sizing: border-box; border: 1px solid var(--bing-popover-border); border-radius: 10px;
  background: rgb(var(--bing-surface-rgb) / var(--bing-glass-opacity, .85)); background-clip: padding-box;
  backdrop-filter: blur(var(--bing-glass-blur, 16px)) saturate(var(--bing-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-glass-blur, 16px)) saturate(var(--bing-glass-saturation, 1.05));
  box-shadow: var(--bing-popover-shadow); color: var(--bing-text); font-size: .8125rem;
}
.bing-autocomplete__panel { padding: 4px; overflow: hidden; border-radius: var(--bing-radius-popover, 8px); will-change: transform, opacity; }
.bing-autocomplete__option { position: relative; isolation: isolate; display: flex; align-items: center; gap: 8px; min-height: 36px; padding: 6px 10px; border-radius: 6px; cursor: pointer; box-sizing: border-box; overflow: hidden; transition: background 260ms var(--bing-ease-smooth), color var(--bing-duration-fast) var(--bing-ease-smooth); }
.bing-autocomplete__option-main { position: relative; z-index: 1; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bing-autocomplete__option-action { position: relative; z-index: 1; display: inline-flex; flex: none; }
.bing-autocomplete__option-liquid {
  position: absolute; inset: -1px; z-index: 0; border-radius: inherit; opacity: 0; pointer-events: none; transform: scale(.08);
  background: radial-gradient(circle at var(--bing-liquid-x, 50%) var(--bing-liquid-y, 50%),
    rgb(var(--bing-liquid-rgb) / var(--bing-liquid-strength)) 0%, rgb(var(--bing-liquid-rgb) / var(--bing-liquid-strength)) 64%,
    rgb(var(--bing-liquid-rgb) / calc(var(--bing-liquid-strength) * .72)) 82%, rgb(var(--bing-liquid-rgb) / calc(var(--bing-liquid-strength) * .35)) 100%);
}
.bing-autocomplete__option.is-active { background: var(--bing-surface-hover); color: var(--bing-heading); }
.bing-autocomplete__option.is-disabled { color: var(--bing-disabled-text); cursor: not-allowed; }
.bing-autocomplete__header, .bing-autocomplete__footer { padding: 8px 10px; color: var(--bing-muted); }
.bing-autocomplete__footer { border-top: 1px solid var(--bing-border); }
.bing-autocomplete__state { padding: 18px 10px; color: var(--bing-muted); }
.bing-autocomplete__detail { position: fixed; left: 0; top: 0; width: min(248px, calc(100vw - 24px)); padding: 12px 13px; overflow-wrap: anywhere; opacity: 0; visibility: hidden; }
.bing-autocomplete__detail.is-inline { position: static; width: auto; opacity: 1; visibility: visible; border: 0; border-top: 1px solid var(--bing-border); border-radius: 0; box-shadow: none; margin-top: 4px; background: transparent; backdrop-filter: none; }
.bing-autocomplete__detail strong { display: block; color: var(--bing-heading); font-size: .82rem; font-weight: 500; line-height: 1.3; }
.bing-autocomplete__detail p { color: var(--bing-muted); font-size: .76rem; line-height: 1.35; margin: 6px 0 0; }
.bing-autocomplete__detail dl { margin: 6px 0 0; }
.bing-autocomplete__detail dl div { display: flex; align-items: center; justify-content: space-between; gap: 8px; border-top: 1px solid var(--bing-border); padding-top: 5px; margin-top: 6px; font-size: .72rem; line-height: 1.2; }
.bing-autocomplete__detail dt { color: var(--bing-muted); }
.bing-autocomplete__detail dd { color: var(--bing-heading); margin: 0; text-align: right; }
@media (prefers-reduced-motion: reduce) {
  .bing-autocomplete__option { transition: none; }
  .bing-autocomplete__panel, .bing-autocomplete__option { will-change: auto !important; }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .bing-autocomplete__panel, .bing-autocomplete__detail { background: var(--bing-surface-solid); }
}
</style>
