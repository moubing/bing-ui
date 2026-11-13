import { getCurrentInstance, nextTick, onBeforeUnmount, ref } from 'vue'
import type { Ref } from 'vue'
import { gsap } from 'gsap'
import {
  getOptionDetailSnapshot,
  moveOptionDetailPanel,
} from '../motion/optionDetailMotion'
import type { DetailPanelSnapshot } from '../motion/optionDetailMotion'
import { computeFloatingPosition, snapToDevicePixel } from './floating'
import { useReducedMotion } from '../motion/reducedMotion'

export interface OptionDetailItemState {
  disabled?: boolean
  hasDetail: boolean
}

export interface UseOptionDetailPanelOptions {
  /** 选项列表所在的浮层面板，详情贴在它的左右两侧。 */
  listPanel: Ref<HTMLElement | null>
  detailPanel: Ref<HTMLElement | null>
  detailContent: Ref<HTMLElement | null>
  /** 选项元素选择器，用于根据指针位置找回选项。 */
  itemSelector: string
  /** 选项元素上记录序号的 `data-*` 属性名（camelCase）。 */
  indexAttribute: string
  isOpen: () => boolean
  isKeyboardNavigating: Ref<boolean>
  /** 返回 `undefined` 表示该序号的选项已不存在。 */
  getItemState: (index: number) => OptionDetailItemState | undefined
  getItemElement: (index: number) => HTMLElement | null
  /** 详情纵向对齐的参考元素，默认就是选项元素本身。 */
  getItemSurface?: (element: HTMLElement) => HTMLElement
  /** 键盘导航时当前激活的序号，-1 表示没有。 */
  getKeyboardIndex: () => number
  /** 滚动结束后根据指针位置找回选项时调用，用于同步激活态。 */
  onPointerRestore?: (index: number) => void
  hiddenScale?: number
  enterEase?: string
  force3D?: boolean
}

const viewportPadding = 12
const detailGap = 12
const hideDelay = 120
const scrollRestoreDelay = 150

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

/**
 * Select 与 TreeSelect 的选项详情浮层：悬停或键盘激活时显示，跟随选项移动，
 * 滚动期间先隐藏、停止后按指针位置恢复。
 */
export function useOptionDetailPanel(options: UseOptionDetailPanelOptions) {
  const prefersReducedMotion = useReducedMotion()
  const {
    listPanel,
    detailPanel,
    detailContent,
    isKeyboardNavigating,
    getItemState,
    getItemElement,
    getItemSurface = (element) => element,
    hiddenScale = 0.96,
  } = options
  const index = ref(-1)
  const shouldRender = ref(false)
  const placement = ref<'left' | 'right'>('right')

  let moveFrame = 0
  let hideTimer: number | undefined
  let scrollEndTimer: number | undefined
  let keyboardRequest = 0
  let lastPointerX: number | undefined
  let lastPointerY: number | undefined

  function clearMoveFrame() {
    if (!isBrowser() || !moveFrame) {
      return
    }

    window.cancelAnimationFrame(moveFrame)
    moveFrame = 0
  }

  function cancelHide() {
    if (!isBrowser() || hideTimer === undefined) {
      return
    }

    window.clearTimeout(hideTimer)
    hideTimer = undefined
  }

  function clearScrollEndTimer() {
    if (!isBrowser() || scrollEndTimer === undefined) {
      return
    }

    window.clearTimeout(scrollEndTimer)
    scrollEndTimer = undefined
  }

  function getTarget(itemElement: HTMLElement) {
    const panel = listPanel.value
    const detail = detailPanel.value

    if (!panel || !detail || !isBrowser()) {
      return null
    }

    const panelRect = panel.getBoundingClientRect()
    const itemRect = getItemSurface(itemElement).getBoundingClientRect()
    const detailRect = detail.getBoundingClientRect()
    const position = computeFloatingPosition({
      anchor: {
        left: panelRect.left,
        right: panelRect.right,
        width: panelRect.width,
        top: itemRect.top,
        bottom: itemRect.bottom,
        height: itemRect.height,
      },
      floating: { width: detailRect.width || 236, height: detailRect.height || 132 },
      side: 'right',
      align: 'center',
      gap: detailGap,
      padding: viewportPadding,
    })

    return {
      placement: position.side as 'left' | 'right',
      x: snapToDevicePixel(position.left),
      y: snapToDevicePixel(position.top),
    }
  }

  function move(itemElement: HTMLElement, animateContent = false, previousSnapshot?: DetailPanelSnapshot) {
    if (!isBrowser()) {
      return
    }

    const target = moveOptionDetailPanel({
      panel: detailPanel.value,
      content: detailContent.value,
      getTarget: () => getTarget(itemElement),
      animateContent,
      previousSnapshot,
      reducedMotion: prefersReducedMotion(),
      hiddenScale,
      enterEase: options.enterEase,
      force3D: options.force3D,
    })

    if (target) {
      placement.value = target.placement
    }
  }

  function scheduleMove(
    itemElement: HTMLElement | null,
    animateContent = false,
    previousSnapshot?: DetailPanelSnapshot,
  ) {
    if (!itemElement || !isBrowser()) {
      return
    }

    clearMoveFrame()
    moveFrame = window.requestAnimationFrame(() => {
      moveFrame = 0
      move(itemElement, animateContent, previousSnapshot)
    })
  }

  function show(itemElement: HTMLElement, itemIndex: number) {
    if (!getItemState(itemIndex)?.hasDetail) {
      return
    }

    const previousIndex = index.value
    const previousSnapshot =
      previousIndex !== itemIndex ? getOptionDetailSnapshot(detailPanel.value) : undefined

    cancelHide()
    index.value = itemIndex
    shouldRender.value = true

    void nextTick(() => {
      scheduleMove(itemElement, previousIndex !== itemIndex, previousSnapshot)
    })
  }

  function finishHide() {
    shouldRender.value = false
    index.value = -1
  }

  function hide(immediate = false) {
    cancelHide()
    clearMoveFrame()

    const detail = detailPanel.value

    if (!detail) {
      finishHide()
      return
    }

    gsap.killTweensOf([detail, detailContent.value].filter(Boolean))

    if (immediate || prefersReducedMotion()) {
      gsap.set(detail, {
        autoAlpha: 0,
        scale: hiddenScale,
        clearProps: 'width,height,overflow',
        willChange: 'auto',
      })
      finishHide()
      return
    }

    gsap.to(detail, {
      autoAlpha: 0,
      scale: hiddenScale,
      x: `+=${placement.value === 'right' ? -6 : 6}`,
      duration: 0.14,
      ease: 'power2.out',
      overwrite: true,
      onComplete: finishHide,
    })
  }

  function scheduleHide(itemIndex = index.value) {
    if (!isBrowser() || itemIndex < 0 || itemIndex !== index.value) {
      return
    }

    cancelHide()
    hideTimer = window.setTimeout(() => {
      hideTimer = undefined
      hide()
    }, hideDelay)
  }

  /** 选项不可用或没有详情时立即隐藏，否则显示。 */
  function showIfAvailable(itemElement: HTMLElement | null, itemIndex: number) {
    const state = getItemState(itemIndex)

    if (!itemElement || !state || state.disabled || !state.hasDetail) {
      hide(true)
      return
    }

    show(itemElement, itemIndex)
  }

  function rememberPointer(event: MouseEvent | PointerEvent | WheelEvent) {
    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      return
    }

    lastPointerX = event.clientX
    lastPointerY = event.clientY
  }

  function getItemElementUnderPointer() {
    if (!isBrowser() || lastPointerX === undefined || lastPointerY === undefined) {
      return null
    }

    const target = document.elementFromPoint(lastPointerX, lastPointerY)
    const itemElement = target?.closest?.(options.itemSelector) as HTMLElement | null

    if (!itemElement || !listPanel.value?.contains(itemElement)) {
      return null
    }

    return itemElement
  }

  function restoreFromPointer() {
    if (isKeyboardNavigating.value) {
      return
    }

    const itemElement = getItemElementUnderPointer()
    const rawIndex = itemElement?.dataset[options.indexAttribute]
    const itemIndex = rawIndex === undefined ? Number.NaN : Number(rawIndex)

    if (!itemElement || !Number.isInteger(itemIndex) || !getItemState(itemIndex)) {
      return
    }

    isKeyboardNavigating.value = false
    options.onPointerRestore?.(itemIndex)
    showIfAvailable(itemElement, itemIndex)
  }

  /** 列表滚动时调用：先立即隐藏，滚动停止后按指针位置恢复。 */
  function handleListScroll() {
    hide(true)

    if (!isBrowser() || isKeyboardNavigating.value) {
      return
    }

    clearScrollEndTimer()
    scrollEndTimer = window.setTimeout(() => {
      scrollEndTimer = undefined

      if (isKeyboardNavigating.value) {
        return
      }

      void nextTick(restoreFromPointer)
    }, scrollRestoreDelay)
  }

  function showForKeyboard() {
    const itemIndex = options.isOpen() ? options.getKeyboardIndex() : -1

    showIfAvailable(itemIndex < 0 ? null : getItemElement(itemIndex), itemIndex)
  }

  /** 键盘移动激活项后，等列表渲染并完成滚动定位再显示详情。 */
  function scheduleKeyboardShow() {
    if (!isBrowser() || !options.isOpen()) {
      return
    }

    keyboardRequest += 1
    const request = keyboardRequest

    cancelHide()
    clearScrollEndTimer()

    void nextTick(() => {
      if (!isBrowser() || request !== keyboardRequest) {
        return
      }

      window.requestAnimationFrame(() => {
        if (request === keyboardRequest) {
          showForKeyboard()
        }
      })
    })
  }

  /** 浮层位置变化后让详情跟随当前选项。 */
  function updatePosition() {
    if (!shouldRender.value || !getItemState(index.value)?.hasDetail) {
      return
    }

    const itemElement = getItemElement(index.value)

    if (!itemElement) {
      hide(true)
      return
    }

    scheduleMove(itemElement)
  }

  function dispose() {
    clearMoveFrame()
    cancelHide()
    clearScrollEndTimer()
    keyboardRequest += 1
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(dispose)
  }

  return {
    index,
    shouldRender,
    placement,
    show,
    showIfAvailable,
    hide,
    scheduleHide,
    cancelHide,
    rememberPointer,
    handleListScroll,
    showForKeyboard,
    scheduleKeyboardShow,
    updatePosition,
    dispose,
  }
}

export type OptionDetailPanel = ReturnType<typeof useOptionDetailPanel>
