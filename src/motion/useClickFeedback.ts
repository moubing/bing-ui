import { getCurrentInstance } from 'vue'
import type { App, ObjectDirective } from 'vue'
import { createClickParticles } from './clickParticles'
import { useReducedMotion } from './reducedMotion'

type ParticleController = ReturnType<typeof createClickParticles>
const hosts = new WeakMap<App, Map<Document, ParticleController>>()
const handledEvents = new WeakSet<Event>()

/** 碎屑属于应用的短时反馈层，清空键或菜单项卸载不会截断已经接受的点击。 */
export function useClickFeedback() {
  const app = getCurrentInstance()!.appContext.app
  const prefersReducedMotion = useReducedMotion()
  let controllers = hosts.get(app)
  if (!controllers) {
    controllers = new Map()
    hosts.set(app, controllers)
    const ownedControllers = controllers
    app.onUnmount(() => {
      for (const controller of ownedControllers.values()) controller.clear()
      ownedControllers.clear()
      hosts.delete(app)
    })
  }

  // 由调用方在操作被接受后调用；键盘控件可能已 preventDefault 来接管原生行为。
  function playClickFeedback(event: Event, surface = event.currentTarget as HTMLElement | null) {
    if (!surface?.isConnected || handledEvents.has(event)) return
    if (surface.matches(':disabled, [aria-disabled="true"]') || surface.closest('[inert]')) return
    // label 会向 input 转发新的 click；真实单选/复选控件负责这次反馈，装饰态由选项负责。
    if (event.target instanceof Element && event.target.closest('.bing-checkbox:not(.is-decorative), .bing-radio') &&
      !surface.matches('.bing-checkbox__control, .bing-radio__control')) return
    handledEvents.add(event)
    const doc = surface.ownerDocument
    let controller = controllers!.get(doc)
    if (!controller) {
      controller = createClickParticles()
      controllers!.set(doc, controller)
    }
    controller.play(surface, event, prefersReducedMotion(doc.defaultView))
  }

  const listeners = new WeakMap<HTMLElement, { enabled: boolean; click: (event: MouseEvent) => void }>()
  const vClickFeedback: ObjectDirective<HTMLElement, boolean | undefined> = {
    mounted(element, binding) {
      const state = {
        enabled: binding.value !== false,
        click(event: MouseEvent) {
          if (state.enabled && !event.defaultPrevented && event.button === 0) playClickFeedback(event, element)
        },
      }
      listeners.set(element, state)
      element.addEventListener('click', state.click)
    },
    updated(element, binding) {
      const state = listeners.get(element)
      if (state) state.enabled = binding.value !== false
    },
    beforeUnmount(element) {
      const state = listeners.get(element)
      if (state) element.removeEventListener('click', state.click)
      listeners.delete(element)
    },
  }

  return { playClickFeedback, vClickFeedback }
}
