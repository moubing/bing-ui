import { getCurrentInstance, nextTick, onBeforeUnmount } from 'vue'

export interface UseDeferredBlurValidationOptions {
  /** 所在表单项；不在表单中时为空，此时不做任何事。 */
  formItem: { handleControlBlur: () => void } | null | undefined
  isOpen: () => boolean
  /** 焦点仍在组件自身（触发器、浮层、工具栏等）时不算失焦。 */
  isInteractionTarget: (target: EventTarget | null) => boolean
}

/**
 * 弹出类表单控件的失焦校验：焦点可能只是从触发器移到浮层里，
 * 所以等下一帧确认焦点确实离开组件且浮层已关闭后，再通知表单项校验。
 */
export function useDeferredBlurValidation({
  formItem,
  isOpen,
  isInteractionTarget,
}: UseDeferredBlurValidationOptions) {
  let request = 0
  let frame = 0

  function clearFrame() {
    if (!frame || typeof window === 'undefined') {
      return
    }

    window.cancelAnimationFrame(frame)
    frame = 0
  }

  /** 取消尚未执行的校验，例如值已经变化、会由变更校验接管时。 */
  function cancel() {
    request += 1
    clearFrame()
  }

  function schedule() {
    if (!formItem) {
      return
    }

    if (typeof window === 'undefined' || typeof document === 'undefined') {
      formItem.handleControlBlur()
      return
    }

    const current = ++request

    void nextTick(() => {
      if (current !== request) {
        return
      }

      clearFrame()
      frame = window.requestAnimationFrame(() => {
        frame = 0

        if (current !== request || isOpen() || isInteractionTarget(document.activeElement)) {
          return
        }

        formItem.handleControlBlur()
      })
    })
  }

  /** 触发器的 `blur` 处理函数。 */
  function handleBlur(event: FocusEvent) {
    if (!isInteractionTarget(event.relatedTarget)) {
      schedule()
    }
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(cancel)
  }

  return { schedule, cancel, handleBlur }
}
