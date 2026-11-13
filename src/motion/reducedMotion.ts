import { getCurrentInstance, onBeforeUnmount, onMounted, watch } from 'vue'
import { useBingConfig } from '../utils/config'
import type { BingReducedMotion } from '../utils/config'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'

type MediaQueryHost = Pick<Window, 'matchMedia'>

function defaultView(): MediaQueryHost | undefined {
  return typeof window === 'undefined' ? undefined : window
}

/** 读取系统的减少动效设置；SSR 环境返回 false。每次调用都实时查询，不做缓存。 */
export function prefersReducedMotion(view: MediaQueryHost | null | undefined = defaultView()) {
  return Boolean(view && typeof view.matchMedia === 'function' && view.matchMedia(reducedMotionQuery)?.matches)
}

/** 按全局策略解析是否减少动效；`view` 用于 iframe 等非当前窗口的文档。 */
export function resolveReducedMotion(mode: BingReducedMotion, view?: MediaQueryHost | null) {
  if (mode === 'always') return true
  if (mode === 'never') return false
  return prefersReducedMotion(view === undefined ? defaultView() : view)
}

export interface UseReducedMotionOptions {
  /** 系统设置或全局 `reducedMotion` 配置变化时调用，用于重建常驻动画。 */
  onChange?: () => void
}

/**
 * 结合 BingConfigProvider 的 `reducedMotion` 与系统设置，返回实时判断函数。
 * 必须在组件 setup 中调用。
 */
export function useReducedMotion(options: UseReducedMotionOptions = {}) {
  const config = useBingConfig()
  const check = (view?: MediaQueryHost | null) => resolveReducedMotion(config.reducedMotion.value, view)
  const { onChange } = options

  if (onChange && getCurrentInstance()) {
    let media: MediaQueryList | undefined

    watch(config.reducedMotion, () => onChange())
    onMounted(() => {
      const view = defaultView()
      media = typeof view?.matchMedia === 'function' ? view.matchMedia(reducedMotionQuery) : undefined
      media?.addEventListener?.('change', onChange)
    })
    onBeforeUnmount(() => {
      media?.removeEventListener?.('change', onChange)
      media = undefined
    })
  }

  return check
}
