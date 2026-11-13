import { ref, toRaw } from 'vue'
import { normalizeBingToastPosition } from './BingToast.types'
import type {
  BingToastInput,
  BingToastItem,
  BingToastOptions,
  BingToastPosition,
  BingToastRenderPosition,
  BingToastService,
  BingToastType,
} from './BingToast.types'

const DEFAULT_POSITION: BingToastRenderPosition = 'top-right'
const AUTO_DISMISS_STAGGER = 120
const ACTION_MIN_DURATION = 6000
const toastDurations: Record<BingToastType, number> = {
  default: 3200,
  success: 2600,
  error: 4200,
  loading: 0,
  warning: 3600,
  info: 3200,
}

let toastSeed = 0
let toastOrder = 0
let toastViewportSeed = 0
let areToastTimersPaused = false

export const bingToastItems = ref<BingToastItem[]>([])
export const activeBingToastViewportId = ref<string>()
const toastViewportIds: string[] = []
const pausedToastIds = new Set<string>()
const timerStates = new Map<
  string,
  {
    dueAt: number
    remaining: number
    timer?: number
    paused: boolean
  }
>()

function isBrowser() {
  return typeof window !== 'undefined'
}

function resolvePosition(position: BingToastPosition | undefined) {
  return normalizeBingToastPosition(position, DEFAULT_POSITION)
}

function resolveDuration(duration: number | undefined, type: BingToastType, hasAction: boolean) {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return Math.max(0, duration)
  }

  const fallback = toastDurations[type]

  // 留出看清并点击操作的时间；不自动关闭的类型保持不变。
  return hasAction && fallback > 0 ? Math.max(fallback, ACTION_MIN_DURATION) : fallback
}

function resolveOptions(input: BingToastInput, presetType?: BingToastType): BingToastOptions {
  if (typeof input === 'string') {
    return {
      message: input,
      type: presetType,
    }
  }

  return {
    ...input,
    type: presetType ?? input.type,
  }
}

function clearToastTimer(id: string) {
  const state = timerStates.get(id)

  if (state?.timer !== undefined && isBrowser()) {
    window.clearTimeout(state.timer)
  }

  timerStates.delete(id)
  pausedToastIds.delete(id)
}

function scheduleToastTimeout(id: string, duration: number) {
  const delay = Math.max(0, duration)
  const dueAt = Date.now() + delay
  const state = {
    dueAt,
    remaining: delay,
    paused: false,
    timer: window.setTimeout(() => {
      closeToast(id)
    }, delay),
  }

  timerStates.set(id, state)
}

function pauseToastTimer(toast: BingToastItem, reset = false) {
  if (toast.duration <= 0) {
    return
  }

  const state = timerStates.get(toast.id)

  pausedToastIds.add(toast.id)

  if (state?.timer !== undefined && isBrowser()) {
    window.clearTimeout(state.timer)
  }

  timerStates.set(toast.id, {
    dueAt: Date.now() + toast.duration,
    remaining: reset || !state ? toast.duration : Math.max(0, state.dueAt - Date.now()),
    paused: true,
  })
}

function restartToastTimer(toast: BingToastItem, staggerDelay = 0) {
  // 操作处理中的提示不能被悬停离开或新提示重新开始计时。
  if (toast.actionPending) {
    pauseToastTimer(toast, true)
    return
  }

  const state = timerStates.get(toast.id)

  pausedToastIds.delete(toast.id)

  if (state?.timer !== undefined && isBrowser()) {
    window.clearTimeout(state.timer)
  }

  timerStates.delete(toast.id)

  if (!isBrowser() || toast.duration <= 0) {
    return
  }

  scheduleToastTimeout(toast.id, toast.duration + staggerDelay)
}

function getAutoDismissStaggerDelay(toast: BingToastItem) {
  const stackIndex = bingToastItems.value
    .filter((item) => item.position === toast.position)
    .sort((first, second) => first.order - second.order)
    .findIndex((item) => item.id === toast.id)

  return Math.max(0, stackIndex) * AUTO_DISMISS_STAGGER
}

function resetAllToastTimers() {
  bingToastItems.value.forEach((toast) => {
    if (areToastTimersPaused || toast.actionPending) {
      pauseToastTimer(toast, true)
      return
    }

    restartToastTimer(toast, getAutoDismissStaggerDelay(toast))
  })
}

function createToast(input: BingToastInput, presetType?: BingToastType) {
  const options = resolveOptions(input, presetType)
  const type = options.type ?? 'default'
  const id = String(options.id ?? `bing-toast-${++toastSeed}`)
  const existing = bingToastItems.value.find((toast) => toast.id === id)
  const explicitMessage = typeof options.message === 'string' ? options.message : undefined
  const hasExplicitMessage = Boolean(explicitMessage && explicitMessage.length > 0)
  const message = explicitMessage && explicitMessage.length > 0 ? explicitMessage : (options.title ?? '')
  const title = hasExplicitMessage ? options.title : undefined
  const toast: BingToastItem = {
    id,
    type,
    title,
    message,
    duration: resolveDuration(options.duration, type, Boolean(options.action)),
    closable: options.closable ?? true,
    position: resolvePosition(options.position),
    createdAt: existing?.createdAt ?? Date.now(),
    order: existing?.order ?? ++toastOrder,
    ariaLabel: options.ariaLabel,
    closeAriaLabel: options.closeAriaLabel ?? '关闭消息',
    action: options.action,
    // 同一操作仍在处理时更新文字，不打断处理中状态。
    actionPending: Boolean(existing?.actionPending && toRaw(existing.action) === toRaw(options.action)),
  }

  if (existing) {
    bingToastItems.value = bingToastItems.value.map((item) => (item.id === id ? toast : item))
  } else {
    bingToastItems.value = [...bingToastItems.value, toast]
  }

  resetAllToastTimers()

  return id
}

function closeToast(id: string | number) {
  const normalizedId = String(id)

  clearToastTimer(normalizedId)
  bingToastItems.value = bingToastItems.value.filter((toast) => toast.id !== normalizedId)
}

function clearToasts(position?: BingToastPosition) {
  const normalizedPosition = position ? resolvePosition(position) : undefined
  const removedToasts = position
    ? bingToastItems.value.filter((toast) => toast.position === normalizedPosition)
    : bingToastItems.value

  removedToasts.forEach((toast) => {
    clearToastTimer(toast.id)
  })

  bingToastItems.value = position
    ? bingToastItems.value.filter((toast) => toast.position !== normalizedPosition)
    : []
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return Boolean(value) && typeof (value as PromiseLike<unknown>).then === 'function'
}

function patchToast(id: string, patch: Partial<BingToastItem>) {
  bingToastItems.value = bingToastItems.value.map((item) => (item.id === id ? { ...item, ...patch } : item))
  return bingToastItems.value.find((item) => item.id === id)
}

/** 由组件在点击操作按钮时调用；处理中忽略重复点击。 */
export async function runBingToastAction(id: string | number) {
  const normalizedId = String(id)
  const toast = bingToastItems.value.find((item) => item.id === normalizedId)
  const action = toast?.action

  if (!toast || !action || toast.actionPending) {
    return
  }

  const currentActionToast = () => {
    const current = bingToastItems.value.find((item) => item.id === normalizedId)
    // 同 id 更新文字延续当前操作；换 action 或关闭后重建则属于另一条操作。
    return current?.order === toast.order && toRaw(current.action) === toRaw(action) ? current : undefined
  }
  const shouldClose = () => Boolean(currentActionToast() && action.closeOnClick !== false)

  // 同步抛错视为调用方缺陷，保留提示并继续抛给应用的 errorHandler。
  const result = action.onClick(toast)

  if (!isPromiseLike(result)) {
    if (shouldClose()) closeToast(normalizedId)
    return
  }

  // 回调在返回 Promise 前也可能同步替换提示，不能给替换后的新操作设置 loading。
  if (currentActionToast()) {
    const pending = patchToast(normalizedId, { actionPending: true })
    if (pending) pauseToastTimer(pending, true)
  }

  try {
    await result
  } catch {
    // 拒绝表示操作未成功：保留提示、恢复按钮供重试，失败原因由调用方自行提示。
    const current = currentActionToast()

    if (current?.actionPending) {
      const restored = patchToast(normalizedId, { actionPending: false })
      if (restored && !areToastTimersPaused) restartToastTimer(restored)
    }

    return
  }

  if (shouldClose()) {
    closeToast(normalizedId)
    return
  }

  const current = currentActionToast()

  if (current?.actionPending) {
    const restored = patchToast(normalizedId, { actionPending: false })
    if (restored && !areToastTimersPaused) restartToastTimer(restored)
  }
}

export function pauseBingToastTimer(id: string | number) {
  const normalizedId = String(id)
  const toast = bingToastItems.value.find((item) => item.id === normalizedId)

  if (!toast) {
    return
  }

  pauseToastTimer(toast)
}

export function resumeBingToastTimer(id: string | number) {
  const normalizedId = String(id)
  const toast = bingToastItems.value.find((item) => item.id === normalizedId)

  if (!toast) {
    return
  }

  restartToastTimer(toast)
}

export function pauseAllBingToastTimers() {
  areToastTimersPaused = true

  bingToastItems.value.forEach((toast) => {
    pauseToastTimer(toast, true)
  })
}

export function restartAllBingToastTimers() {
  areToastTimersPaused = false

  resetAllToastTimers()
}

export function createBingToastViewportId() {
  toastViewportSeed += 1
  return `bing-toast-viewport-${toastViewportSeed}`
}

export function registerBingToastViewport(id: string) {
  if (!toastViewportIds.includes(id)) {
    toastViewportIds.push(id)
  }

  activeBingToastViewportId.value ??= id
}

export function unregisterBingToastViewport(id: string) {
  const index = toastViewportIds.indexOf(id)

  if (index >= 0) {
    toastViewportIds.splice(index, 1)
  }

  if (activeBingToastViewportId.value === id) {
    activeBingToastViewportId.value = toastViewportIds[0]
  }
}

export const bingToast: BingToastService = {
  show: (input) => createToast(input),
  success: (input) => createToast(input, 'success'),
  error: (input) => createToast(input, 'error'),
  fail: (input) => createToast(input, 'error'),
  failed: (input) => createToast(input, 'error'),
  loading: (input) => createToast(input, 'loading'),
  warning: (input) => createToast(input, 'warning'),
  info: (input) => createToast(input, 'info'),
  close: closeToast,
  clear: clearToasts,
  getToasts: () => [...bingToastItems.value],
}

export function useBingToast() {
  return bingToast
}
