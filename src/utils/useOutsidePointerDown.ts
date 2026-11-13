import { getCurrentInstance, onBeforeUnmount } from 'vue'

/**
 * 在捕获阶段监听窗口的 `pointerdown`，用于浮层打开期间检测外部点击。
 * 只在 `start` 和 `stop` 之间生效。
 */
export function useOutsidePointerDown(handler: (event: PointerEvent) => void) {
  let listening = false

  function start() {
    if (listening || typeof window === 'undefined') {
      return
    }

    window.addEventListener('pointerdown', handler, true)
    listening = true
  }

  function stop() {
    if (!listening || typeof window === 'undefined') {
      return
    }

    window.removeEventListener('pointerdown', handler, true)
    listening = false
  }

  if (getCurrentInstance()) {
    onBeforeUnmount(stop)
  }

  return { start, stop }
}
