import { getCurrentInstance, nextTick, onBeforeUnmount } from 'vue'
import type { Ref } from 'vue'

export interface UseSearchShortcutFocusOptions {
  input: Ref<{ focus: () => void } | null>
  isOpen: () => boolean
  isSearchable: () => boolean
  /** 目标是否属于组件自身（触发器、面板等）。焦点仍在组件内时，重试可以继续。 */
  ownsTarget: (target: EventTarget | null) => boolean
}

function isEditableTarget(target: EventTarget | null) {
  if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
    return false
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      resolve()
      return
    }

    window.requestAnimationFrame(() => resolve())
  })
}

function activeElement() {
  return typeof document === 'undefined' ? null : document.activeElement
}

/**
 * 浮层内搜索框的聚焦：打开动画期间连续尝试几帧，确保焦点最终落在输入框上；
 * 面板打开时在非输入区域按 `/` 也可以聚焦搜索框。
 * 重试期间若焦点被用户或业务移到组件外的元素，则停止重试，不把焦点抢回来。
 */
export function useSearchShortcutFocus({ input, isOpen, isSearchable, ownsTarget }: UseSearchShortcutFocusOptions) {
  let listening = false

  /** 尝试聚焦并返回此时的焦点，供下一帧判断焦点是否被外部移走。 */
  function focusNow() {
    if (isOpen() && isSearchable()) {
      input.value?.focus()
    }

    return activeElement()
  }

  function movedAway(previous: Element | null) {
    const current = activeElement()

    if (current === previous || !current || current === document.body || current === document.documentElement) {
      return false
    }

    return !ownsTarget(current)
  }

  async function focus() {
    if (!isSearchable()) {
      return
    }

    await nextTick()
    let settled = focusNow()

    for (let attempt = 0; attempt < 2; attempt++) {
      await waitForAnimationFrame()

      if (movedAway(settled)) {
        return
      }

      settled = focusNow()
    }
  }

  /** 处理 `/` 快捷键，返回是否已处理。 */
  function handleShortcut(event: KeyboardEvent) {
    if (
      event.key !== '/' ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      !isOpen() ||
      !isSearchable() ||
      isEditableTarget(event.target)
    ) {
      return false
    }

    event.preventDefault()
    void focus()

    return true
  }

  function handleWindowKeydown(event: KeyboardEvent) {
    handleShortcut(event)
  }

  /** 开始在窗口上监听快捷键。 */
  function start() {
    if (listening || typeof window === 'undefined') {
      return
    }

    window.addEventListener('keydown', handleWindowKeydown)
    listening = true
  }

  function stop() {
    if (!listening || typeof window === 'undefined') {
      return
    }

    window.removeEventListener('keydown', handleWindowKeydown)
    listening = false
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(stop)
  }

  return { focus, handleShortcut, start, stop }
}
