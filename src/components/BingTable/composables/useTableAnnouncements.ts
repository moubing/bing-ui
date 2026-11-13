import { onBeforeUnmount, ref } from 'vue'

/** 同一帧只播报最后一条操作结果；重复消息也会产生新的 live region 更新。 */
export function useTableAnnouncements() {
  const announcement = ref('')
  let pending = ''
  let frame: number | undefined
  let disposed = false
  function announce(message: string) {
    pending = message
    if (frame !== undefined || disposed || typeof requestAnimationFrame === 'undefined') return
    announcement.value = ''
    frame = requestAnimationFrame(() => { frame = undefined; if (!disposed) announcement.value = pending })
  }
  onBeforeUnmount(() => {
    disposed = true
    if (frame !== undefined) cancelAnimationFrame(frame)
  })
  return { announcement, announce }
}
