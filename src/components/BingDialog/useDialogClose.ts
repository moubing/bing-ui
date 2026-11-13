import { onBeforeUnmount, ref, watch } from 'vue'
import type { BingDialogCloseReason, BingDialogProps } from './BingDialog.types'

export function useDialogClose(options: {
  open: () => boolean
  allowed: (reason: BingDialogCloseReason) => boolean
  beforeClose: () => BingDialogProps['beforeClose']
  accept: (reason: BingDialogCloseReason) => void
  reject: (reason: BingDialogCloseReason) => void
  waiting: () => void
}) {
  const pending = ref(false)
  let generation = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  function cancel() {
    generation++
    if (timer) clearTimeout(timer)
    timer = undefined
    pending.value = false
  }
  function close(reason: BingDialogCloseReason) {
    if (!options.open()) return
    if (pending.value || !options.allowed(reason)) { options.reject(reason); return }
    const guard = options.beforeClose()
    if (!guard) { options.accept(reason); return }
    let result: boolean | Promise<boolean>
    try { result = guard(reason) } catch { options.reject(reason); return }
    if (typeof result === 'boolean') {
      if (result && options.allowed(reason)) options.accept(reason)
      else options.reject(reason)
      return
    }
    const current = ++generation
    pending.value = true
    options.waiting()
    const finish = (allowed: boolean) => {
      if (current !== generation) return
      cancel()
      if (!options.open()) return
      if (allowed && options.allowed(reason)) options.accept(reason)
      else options.reject(reason)
    }
    timer = setTimeout(() => finish(false), 30_000)
    Promise.resolve(result).then(value => finish(value !== false), () => finish(false))
  }
  watch(options.open, cancel, { flush: 'sync' })
  onBeforeUnmount(cancel)
  return { pending, close }
}
