import { gsap } from 'gsap'
import { onBeforeUnmount, ref, watch } from 'vue'
import type { Ref } from 'vue'
import { scheduleCheckboxMotion } from '../../motion/checkboxCascade'
import { useReducedMotion } from '../../motion/reducedMotion'
import { motion as motionTokens } from '../../motion'

type State = 'none' | 'checked' | 'mixed'
const stateOf = (checked: boolean, mixed: boolean): State => mixed ? 'mixed' : checked ? 'checked' : 'none'
const motion = {
  fillIn: motionTokens.duration.fast, fillOut: 0.14, fillOutDelay: 0.06,
  checkIn: 0.22, checkDelay: 0.04, markOut: 0.12,
  mixedIn: 0.2, morphIn: motionTokens.duration.fast, morphDelay: 0.06,
  errorStep: 0.06, errorDistance: 2,
} as const

export function useCheckboxMotion(
  elements: {
    root: Ref<HTMLElement | null>
    fill: Ref<HTMLElement | null>
    check: Ref<SVGPathElement | null>
    mixed: Ref<SVGPathElement | null>
  },
  options: { checked: () => boolean; mixed: () => boolean; status: () => string; decorative: () => boolean },
) {
  const isAnimating = ref(false)
  const isCheckExiting = ref(false)
  let timeline: gsap.core.Timeline | undefined
  let cancelQueued: (() => void) | undefined
  let nativeTransition: State | undefined
  let direct = false
  const prefersReducedMotion = useReducedMotion({ onChange: () => {
    reducedMotion.value = prefersReducedMotion()
    if (reducedMotion.value) settle()
  } })
  const reducedMotion = ref(prefersReducedMotion())

  function stop() {
    cancelQueued?.()
    cancelQueued = undefined
    timeline?.kill()
    timeline = undefined
  }

  function settle() {
    stop()
    isAnimating.value = false
    isCheckExiting.value = false
    if (elements.fill.value) gsap.set(elements.fill.value, { clearProps: 'transform,opacity' })
    // 标记只动画 CSS 数值，不让 GSAP 的 SVG transform 清理重写 fill-box 原点。
    for (const mark of [elements.check.value, elements.mixed.value]) {
      for (const property of ['opacity', 'stroke-dashoffset', 'transform-origin', '--checkbox-mixed-scale']) mark?.style.removeProperty(property)
    }
    elements.root.value?.style.removeProperty('--checkbox-shake-x')
  }

  function transition(from: State, to: State, immediate: boolean, shake = false) {
    const { root: { value: root }, fill: { value: fill }, check: { value: check }, mixed: { value: mixed } } = elements
    if (!root || !fill || !check || !mixed) return
    stop()
    if (prefersReducedMotion()) { settle(); return }

    // pre-flush 时读取旧 CSS / 被打断的动画值，在 Vue 更新状态类之前固定当前画面。
    const fillOpacity = Number(gsap.getProperty(fill, 'opacity'))
    const fillScale = Number(gsap.getProperty(fill, 'scaleX'))
    const checkOpacity = Number(gsap.getProperty(check, 'opacity'))
    const checkOffset = Number(gsap.getProperty(check, 'strokeDashoffset'))
    const mixedOpacity = Number(gsap.getProperty(mixed, 'opacity'))
    const mixedScale = Number(gsap.getProperty(mixed, '--checkbox-mixed-scale'))
    gsap.set(fill, { opacity: fillOpacity, scale: fillScale })
    gsap.set(check, {
      opacity: checkOpacity,
      // 已显示的幽灵勾直接变实；只有完全不可见的勾才从起笔处开始。
      strokeDashoffset: to === 'checked' && checkOpacity === 0 && fillOpacity === 0 ? 1 : checkOffset,
    })
    gsap.set(mixed, { opacity: mixedOpacity, '--checkbox-mixed-scale': mixedScale })
    // 用 CSS 的 fill-box 原点缩放，避免零高度 SVG path 的跨浏览器矩阵差异。
    // 正在缩放时保留原点，只有终态才换原点，打断不会发生位移。
    if (mixedScale === 0 || mixedScale === 1) mixed.style.transformOrigin =
      from === 'checked' || to === 'checked' ? 'left center' : 'center center'
    isAnimating.value = true
    isCheckExiting.value = to === 'none' && (from !== 'none' || fillOpacity > 0)

    const play = (delay: number) => {
      cancelQueued = undefined
      if (prefersReducedMotion()) { settle(); return }
      timeline = gsap.timeline({ delay, defaults: { ease: 'power2.out' }, onComplete: settle })
      timeline.to(fill, {
        scale: to === 'none' ? 0.6 : 1, opacity: to === 'none' ? 0 : 1,
        duration: to === 'none' ? motion.fillOut : motion.fillIn,
        ease: to === 'none' ? 'power2.in' : motionTokens.ease.smooth,
      }, to === 'none' ? motion.fillOutDelay : 0)
      timeline.to(check, {
        strokeDashoffset: to === 'checked' ? 0 : 1,
        opacity: to === 'checked' ? 1 : 0,
        duration: to === 'checked' ? motion.checkIn : motion.markOut,
        ease: to === 'checked' ? 'power2.out' : 'power2.in',
      }, to === 'checked' && from === 'none' ? motion.checkDelay : 0)
      timeline.to(mixed, {
        '--checkbox-mixed-scale': to === 'mixed' ? 1 : 0,
        opacity: to === 'mixed' ? 1 : 0,
        duration: to === 'mixed' ? (from === 'checked' ? motion.morphIn : motion.mixedIn) : motion.markOut,
        ease: to === 'mixed' ? 'back.out(1.6)' : 'power2.in',
      }, to === 'mixed' && from === 'checked' ? motion.morphDelay : 0)
      if (shake) {
        for (const [index, x] of [motion.errorDistance, -motion.errorDistance, motion.errorDistance, -motion.errorDistance, 0].entries()) {
          timeline.to(root, { '--checkbox-shake-x': `${x}px`, duration: motion.errorStep, ease: 'sine.inOut' }, index * motion.errorStep)
        }
      } else if (root.style.getPropertyValue('--checkbox-shake-x')) {
        timeline.to(root, { '--checkbox-shake-x': '0px', duration: motion.markOut }, 0)
      }
    }
    if (immediate) play(0)
    else cancelQueued = scheduleCheckboxMotion(root, { play, settle })
  }

  watch(() => [options.checked(), options.mixed(), options.status()] as const,
    ([checked, mixed, status], [wasChecked, wasMixed, wasStatus]) => {
      const next = stateOf(checked, mixed)
      const previous = stateOf(wasChecked, wasMixed)
      const shake = status === 'error' && wasStatus !== 'error' && !options.decorative()
      const alreadyPlayed = nativeTransition === next
      const immediate = direct || nativeTransition !== undefined
      nativeTransition = undefined
      direct = false
      if ((!alreadyPlayed && next !== previous) || shake) transition(previous, next, immediate, shake)
    },
  )

  onBeforeUnmount(stop)
  return {
    isAnimating, isCheckExiting, reducedMotion,
    markDirect: () => { direct = true },
    playNative: (checked: boolean, mixed: boolean) => {
      const from = stateOf(options.checked(), options.mixed())
      const to = stateOf(checked, mixed)
      nativeTransition = to
      if (from !== to) transition(from, to, true)
    },
  }
}
