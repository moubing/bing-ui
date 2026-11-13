import { getCurrentInstance, onBeforeUnmount, ref } from 'vue'
import type { Ref } from 'vue'

const settleDelay = 120

/**
 * 键盘导航触发列表滚动期间的标记。滚动事件持续到来时不断顺延，
 * 停止 120ms 后自动结束，组件可据此在滚动中暂停悬停效果。
 */
export function useKeyboardScrollSync(isKeyboardNavigating: Ref<boolean>) {
  const isSyncing = ref(false)
  let timer: number | undefined

  function clearTimer() {
    if (timer === undefined || typeof window === 'undefined') {
      return
    }

    window.clearTimeout(timer)
    timer = undefined
  }

  function finish() {
    isSyncing.value = false
    clearTimer()
  }

  /** 收到一次滚动事件，顺延结束时间。 */
  function scheduleEnd() {
    if (typeof window === 'undefined' || !isSyncing.value) {
      return
    }

    clearTimer()
    timer = window.setTimeout(() => {
      timer = undefined
      isSyncing.value = false
    }, settleDelay)
  }

  /** 键盘导航即将滚动列表时调用。 */
  function start() {
    if (typeof window === 'undefined' || !isKeyboardNavigating.value) {
      return
    }

    isSyncing.value = true
    scheduleEnd()
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(finish)
  }

  return { isSyncing, start, scheduleEnd, finish }
}
