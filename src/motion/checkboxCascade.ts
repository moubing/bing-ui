interface CheckboxMotionRequest {
  play: (delay: number) => void
  settle: () => void
}

interface CheckboxMotionQueue {
  frame: number
  requests: Map<HTMLElement, CheckboxMotionRequest>
}

const queues = new WeakMap<Document, CheckboxMotionQueue>()
const stagger = 0.014
const maxDelay = 0.22
const maxAnimated = 60

/** 只排队视觉过渡，数据更新和事件不等待动画；每个 document 只保留当前帧的请求。 */
export function scheduleCheckboxMotion(element: HTMLElement, request: CheckboxMotionRequest) {
  const doc = element.ownerDocument
  const view = doc.defaultView
  if (!view) {
    request.settle()
    return () => {}
  }
  let queue = queues.get(doc)
  if (!queue) {
    queue = { frame: 0, requests: new Map() }
    queues.set(doc, queue)
    const current = queue
    current.frame = view.requestAnimationFrame(() => {
      queues.delete(doc)
      const entries = [...current.requests].sort(([a], [b]) =>
        a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
      )
      // 在开始动画前一次性测量，避免读写交错。
      const visible = entries.map(([node]) => {
        const rect = node.getBoundingClientRect()
        return node.isConnected && rect.width > 0 && rect.height > 0 &&
          rect.bottom > 0 && rect.right > 0 && rect.top < view.innerHeight && rect.left < view.innerWidth
      })
      current.requests.clear()
      let index = 0
      entries.forEach(([, animation], entryIndex) => {
        if (visible[entryIndex] && index < maxAnimated) animation.play(Math.min(index++ * stagger, maxDelay))
        else animation.settle()
      })
    })
  }
  queue.requests.set(element, request)
  const current = queue
  return () => {
    if (current.requests.get(element) !== request) return
    current.requests.delete(element)
    if (current.requests.size === 0) {
      view.cancelAnimationFrame(current.frame)
      if (queues.get(doc) === current) queues.delete(doc)
    }
  }
}
