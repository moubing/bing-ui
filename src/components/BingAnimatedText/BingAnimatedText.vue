<script setup lang="ts">
import { computed, nextTick, onBeforeUpdate, onMounted, onUnmounted, onUpdated, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { gsap } from 'gsap'
import { SplitText } from 'gsap/SplitText'
import type {
  BingAnimatedTextExpose,
  BingAnimatedTextPlayOrigin,
  BingAnimatedTextProps,
  BingAnimatedTextShineDirection,
} from './BingAnimatedText.types'
import { getLayoutScale } from '../../motion/layoutScale'
import { useReducedMotion } from '../../motion/reducedMotion'
import { alignCharElements, canMeasureText, matchChars, measureCharElements, measureTextChars } from './textSwap'
import type { MeasuredChar, MeasureOrigin } from './textSwap'

const SHINE_PROGRESS = '--animated-text-shine-p'
const SWAP_OFFSET = '--animated-text-swap-offset'
/** 超过该字数的文案切换时直接替换，不做逐字动画。 */
const SWAP_CHAR_LIMIT = 160
const SWAP_DURATION = 0.5
const SWAP_HANDOFF_DURATION = 0.12
/** 保留的字和占位宽度先快后慢，尽早给入场的字腾出位置；二者同一缓动，裁切边缘始终对齐。 */
const SWAP_EASE = 'power3.out'

interface SwapSnapshot {
  text: string
  /** 切换前文字在行内实际占用的宽度。 */
  width: number
  /** 切换前的常态颜色，退场的字保持原来的样子，例如 shimmer 的减淡色。 */
  restColor: string
  chars: MeasuredChar[]
}

const prefersReducedMotion = useReducedMotion({ onChange: () => handleMotionPreference() })

let isSplitTextRegistered = false

const props = withDefaults(defineProps<BingAnimatedTextProps>(), {
  effect: 'none',
  trigger: 'always',
  disabled: false,
  hoverTarget: undefined,
  followPointer: true,
  swap: false,
  shineColor: undefined,
  shineBaseColor: undefined,
  shineSpeed: 1.6,
  shineDelay: 0,
  shineInterval: 2.4,
  shineDirection: 'left',
  shineAngle: 120,
  jumpY: -6,
  jumpStagger: 0.035,
  jumpDuration: 0.34,
  jumpEase: 'power2.out',
  jumpReturnEase: 'back.out(2.4)',
  jumpRepeatDelay: 1.2,
})

const rootRef = ref<HTMLElement | null>(null)
const contentRef = ref<HTMLElement | null>(null)
const jumpContentRef = ref<HTMLElement | null>(null)
const ghostRef = ref<HTMLElement | null>(null)
const isMotionReduced = ref(false)

let split: SplitText | undefined
let ctx: gsap.Context | undefined
let jumpTimeline: gsap.core.Timeline | undefined
let swapTimeline: gsap.core.Timeline | undefined
let shineTween: gsap.core.Tween | undefined
let shineDelayCall: gsap.core.Tween | undefined
let isJumpPlaying = false
let isShinePlaying = false
let jumpSetupQueued = false
let renderedMarkup = ''
let swapSnapshot: SwapSnapshot | undefined

let viewportObserver: IntersectionObserver | undefined
let isInView = true
let hasBeenSeen = true
let pendingShine = false
let pendingJump = false
let boundHoverTarget: HTMLElement | null = null

const shouldAnimate = computed(() => props.effect !== 'none' && !props.disabled)
const usesSweep = computed(() =>
  shouldAnimate.value && (props.effect === 'shine' || props.effect === 'shimmer'),
)
const usesJump = computed(() => shouldAnimate.value && props.effect === 'jump')

const classes = computed(() => [
  'bing-animated-text',
  `bing-animated-text--${props.effect}`,
  {
    'is-disabled': props.disabled,
    'is-shine-active': usesSweep.value,
    'is-motion-reduced': isMotionReduced.value,
    'bing-animated-text--swap': props.swap,
    [`bing-animated-text--shine-${props.trigger}`]: usesSweep.value,
    [`bing-animated-text--shine-direction-${props.shineDirection}`]: usesSweep.value,
    [`bing-animated-text--jump-${props.trigger}`]: usesJump.value,
  },
])

const textStyle = computed<CSSProperties>(() => {
  const style: CSSProperties = {}

  if (usesJump.value) {
    style['--animated-text-jump-room'] =
      `${Math.max(2, Math.abs(Math.min(0, props.jumpY)) + 2)}px`
  }

  if (!usesSweep.value) {
    return style
  }

  style['--animated-text-shine-angle'] = `${props.shineAngle}deg`

  if (props.shineColor) {
    style['--animated-text-shine-color'] = props.shineColor
  }

  if (props.shineBaseColor) {
    style['--animated-text-shine-base-color'] = props.shineBaseColor
  }

  return style
})

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function registerSplitText() {
  if (isSplitTextRegistered) {
    return
  }

  gsap.registerPlugin(SplitText)
  isSplitTextRegistered = true
}

/* ---------- 视口：once 进入视口才播放，常驻动画离开视口时暂停 ---------- */

function holdWhileHidden(animation: gsap.core.Animation | undefined) {
  if (animation && !isInView) animation.pause()
}

function setViewportState(visible: boolean) {
  if (visible === isInView) return
  isInView = visible
  ;[shineTween, shineDelayCall, jumpTimeline].forEach(animation => animation?.paused(!visible))
}

function playWhenSeen(kind: 'shine' | 'jump') {
  observeViewport()
  if (hasBeenSeen) {
    if (kind === 'shine') playShine()
    else playJump()
    return
  }

  if (kind === 'shine') pendingShine = true
  else pendingJump = true
}

/** 只在需要 once / always 时才创建，普通按钮的静态文字不占用观察者。 */
function observeViewport() {
  const root = rootRef.value
  if (viewportObserver || !root || typeof IntersectionObserver === 'undefined') return

  hasBeenSeen = false
  viewportObserver = new IntersectionObserver(entries => {
    const entry = entries[entries.length - 1]
    if (!entry) return
    setViewportState(entry.isIntersecting)

    const mostlyVisible = entry.intersectionRatio >= 0.5 ||
      (entry.rootBounds !== null && entry.intersectionRect.height >= entry.rootBounds.height * 0.5)
    if (hasBeenSeen || !entry.isIntersecting || !mostlyVisible) return

    hasBeenSeen = true
    if (pendingShine) {
      pendingShine = false
      playShine()
    }
    if (pendingJump) {
      pendingJump = false
      playJump()
    }
  }, { threshold: [0, 0.5] })
  viewportObserver.observe(root)
}

/* ---------- 拆字副本：Vue 持有原始文字，SplitText 只操作装饰副本 ---------- */

function splitLayer() {
  releaseLayer()

  const content = contentRef.value
  const layer = jumpContentRef.value
  const root = rootRef.value
  if (!content || !layer || !root) return false

  registerSplitText()
  // 副本不参与辅助技术与交互；移除重复 ID，避免状态切换或文案更新时丢字。
  layer.innerHTML = content.innerHTML
  layer.querySelectorAll('[id]').forEach(element => element.removeAttribute('id'))
  ctx = gsap.context(() => {
    split = SplitText.create(layer, {
      type: 'words, chars',
      tag: 'span',
      aria: 'hidden',
      wordsClass: 'bing-animated-text__word',
      charsClass: 'bing-animated-text__char',
    })

    // 连续中文、日文不能像英文单词一样整组禁止换行。
    split.words.forEach(word => {
      if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(word.textContent ?? '')) {
        word.classList.add('bing-animated-text__word--breakable')
      }
    })

    gsap.set(split.chars, {
      display: 'inline-block',
      transformOrigin: '50% 100%',
    })
  }, root)

  // 拆字后空格单独排版，宽度会多出零点几像素，可能让副本比原文多换一行；溢出时给副本少量余量。
  for (const slack of [1, 2, 4]) {
    if (layer.scrollHeight <= layer.clientHeight + 1) break
    layer.style.setProperty('inset-inline-end', `-${slack}px`)
  }

  return Boolean(split?.chars.length)
}

function stopJump() {
  isJumpPlaying = false
  pendingJump = false
  rootRef.value?.removeAttribute('data-jump-playing')
  jumpTimeline?.kill()
  jumpTimeline = undefined
}

function stopSwap() {
  swapTimeline?.kill()
  swapTimeline = undefined
  ghostRef.value?.replaceChildren()
  ghostRef.value?.style.removeProperty('color')
  rootRef.value?.removeAttribute('data-swapping')
  rootRef.value?.style.removeProperty(SWAP_OFFSET)
  contentRef.value?.style.removeProperty('opacity')
  jumpContentRef.value?.style.removeProperty('opacity')
}

function releaseLayer() {
  stopJump()
  stopSwap()
  rootRef.value?.removeAttribute('data-jump-ready')

  split?.revert()
  split = undefined

  ctx?.revert()
  ctx = undefined
  jumpContentRef.value?.replaceChildren()
  jumpContentRef.value?.style.removeProperty('inset-inline-end')
}

/* ---------- jump ---------- */

function nearestCharIndex(chars: HTMLElement[], origin: BingAnimatedTextPlayOrigin) {
  const { clientX, clientY } = origin
  if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return 0

  let nearest = 0
  let nearestDistance = Infinity
  chars.forEach((char, index) => {
    const rect = char.getBoundingClientRect()
    const dx = clientX - (rect.left + rect.width / 2)
    // 加重纵向距离，多行文字时优先选中指针所在的那一行。
    const dy = (clientY - (rect.top + rect.height / 2)) * 3
    const distance = dx * dx + dy * dy
    if (distance < nearestDistance) {
      nearestDistance = distance
      nearest = index
    }
  })
  return nearest
}

function playJump(origin?: BingAnimatedTextPlayOrigin) {
  const chars = split?.chars as HTMLElement[] | undefined

  if (
    isJumpPlaying ||
    swapTimeline ||
    !chars?.length ||
    !usesJump.value ||
    prefersReducedMotion()
  ) {
    return
  }

  const duration = Math.max(0.1, props.jumpDuration)
  const rise = duration * 0.45
  const fall = duration * 0.55
  const stagger = Math.max(0, props.jumpStagger)
  const originIndex = origin ? nearestCharIndex(chars, origin) : 0

  isJumpPlaying = true
  rootRef.value?.setAttribute('data-jump-playing', 'true')

  const timeline = gsap.timeline({
    repeat: props.trigger === 'always' ? -1 : 0,
    repeatDelay: Math.max(0, props.jumpRepeatDelay),
    onComplete: () => {
      isJumpPlaying = false
      jumpTimeline = undefined
      rootRef.value?.removeAttribute('data-jump-playing')
    },
  })

  chars.forEach((char, index) => {
    const distance = Math.abs(index - originIndex)
    // 指针触发时像手指点了一下水面：越远起跳越晚、越低。
    const height = origin
      ? props.jumpY * (1 - 0.42 * Math.min(1, distance / 6))
      : props.jumpY
    const at = distance * stagger

    timeline
      .fromTo(char, { y: 0 }, { y: height, duration: rise, ease: props.jumpEase }, at)
      .to(char, { y: 0, duration: fall, ease: props.jumpReturnEase }, at + rise)
  })

  jumpTimeline = timeline
  holdWhileHidden(timeline)
}

function setupJump() {
  // 切换动画结束后会按最新配置重新建立 jump。
  if (swapTimeline) return

  releaseLayer()

  const root = rootRef.value
  if (!usesJump.value || !root || prefersReducedMotion() || !splitLayer()) {
    releaseLayer()
    return
  }

  root.setAttribute('data-jump-ready', 'true')

  if (props.trigger === 'always') {
    observeViewport()
    playJump()
  } else if (props.trigger === 'once') {
    playWhenSeen('jump')
  }
}

function scheduleJumpSetup() {
  if (!isBrowser() || jumpSetupQueued) {
    return
  }

  jumpSetupQueued = true
  void nextTick(() => {
    jumpSetupQueued = false
    if (rootRef.value) setupJump()
  })
}

/* ---------- shine / shimmer ---------- */

function cleanupShine() {
  isShinePlaying = false
  pendingShine = false
  rootRef.value?.removeAttribute('data-shine-playing')
  shineTween?.kill()
  shineTween = undefined
  shineDelayCall?.kill()
  shineDelayCall = undefined
  contentRef.value?.style.removeProperty(SHINE_PROGRESS)
}

function scheduleNextShine() {
  if (props.trigger !== 'always' || !usesSweep.value || prefersReducedMotion()) {
    return
  }

  shineDelayCall?.kill()
  shineDelayCall = gsap.delayedCall(Math.max(0, props.shineInterval), () => {
    shineDelayCall = undefined
    playShine(0)
  })
  holdWhileHidden(shineDelayCall)
}

function playShine(
  delay = props.shineDelay,
  direction: BingAnimatedTextShineDirection = props.shineDirection,
) {
  const content = contentRef.value

  if (
    isShinePlaying ||
    shineDelayCall ||
    !content ||
    !usesSweep.value ||
    prefersReducedMotion()
  ) {
    return
  }

  // 0 和 1 时光带刚好在文字外侧。
  const [from, to] = direction === 'left' ? [0, 1] : [1, 0]
  // hover 需要立刻看到回应，光带快速切入后放缓；常驻循环则匀称进出。
  const ease = props.trigger === 'hover' ? 'power1.out' : 'power1.inOut'

  isShinePlaying = true
  rootRef.value?.setAttribute('data-shine-playing', 'true')
  gsap.set(content, { [SHINE_PROGRESS]: from })

  shineTween = gsap.to(content, {
    [SHINE_PROGRESS]: to,
    duration: Math.max(0.1, props.shineSpeed),
    delay: Math.max(0, delay),
    ease,
    // 扫光只接管进度变量，不打断同一文字层的 swap 透明度交接。
    overwrite: 'auto',
    onComplete: () => {
      content.style.removeProperty(SHINE_PROGRESS)
      isShinePlaying = false
      shineTween = undefined
      rootRef.value?.removeAttribute('data-shine-playing')
      scheduleNextShine()
    },
  })
  holdWhileHidden(shineTween)
}

function setupShine() {
  cleanupShine()

  if (!usesSweep.value || !contentRef.value || prefersReducedMotion()) {
    return
  }

  if (props.trigger === 'always') {
    observeViewport()
    playShine()
  } else if (props.trigger === 'once') {
    playWhenSeen('shine')
  }
}

function scheduleShineSetup() {
  if (!isBrowser()) {
    return
  }

  void nextTick(() => {
    setupShine()
  })
}

/* ---------- swap：文字内容变化时逐字过渡 ---------- */

function currentSwapOffset(root: HTMLElement) {
  return Number.parseFloat(root.style.getPropertyValue(SWAP_OFFSET)) || 0
}

/** 根元素的测量基准；宽度换算回布局像素，放在缩放的容器里时位移和占位宽度才不会被重复缩放。 */
function measureRoot(root: HTMLElement): MeasureOrigin & { width: number } {
  const rect = root.getBoundingClientRect()
  const scale = getLayoutScale(root, rect)
  return { left: rect.left, top: rect.top, scaleX: scale.x, scaleY: scale.y, width: rect.width / scale.x }
}

function canSwap() {
  return props.swap && !props.disabled && !prefersReducedMotion()
}

function captureSwapSnapshot(): SwapSnapshot | undefined {
  const root = rootRef.value
  const content = contentRef.value
  if (!root || !content || !canSwap() || !canMeasureText(root.ownerDocument)) return undefined

  const origin = measureRoot(root)
  const visibleChars = swapTimeline || root.hasAttribute('data-jump-ready') ? split?.chars : undefined
  // 副本可见时从副本测量，切换可以从跳动中途或上一次切换中途自然接上。
  const chars = visibleChars?.length
    ? (visibleChars.length > SWAP_CHAR_LIMIT
        ? undefined
        : measureCharElements(visibleChars, origin, root))
    : measureTextChars(content, origin, SWAP_CHAR_LIMIT)
  if (!chars) return undefined

  return {
    text: content.textContent ?? '',
    width: origin.width + currentSwapOffset(root),
    restColor: getComputedStyle(root).getPropertyValue('--animated-text-rest').trim(),
    chars,
  }
}

function placeGhosts(host: HTMLElement, chars: MeasuredChar[], origin: MeasureOrigin, restColor: string) {
  host.replaceChildren()
  if (!chars.length) return []

  if (restColor) host.style.color = restColor

  const ghosts = chars.map(char => {
    const ghost = host.ownerDocument.createElement('span')
    ghost.className = 'bing-animated-text__ghost'
    ghost.textContent = char.text
    if (char.style) Object.assign(ghost.style, char.style)
    host.append(ghost)
    return ghost
  })

  // 先统一写入再统一读取：放在原点时的文字区域偏移，用来把字形对齐到原位置。
  const placed = measureCharElements(ghosts, origin)
  ghosts.forEach((ghost, index) => {
    ghost.style.left = `${chars[index].x - placed[index].x}px`
    ghost.style.top = `${chars[index].y - placed[index].y}px`
  })

  return ghosts
}

function finishSwap() {
  swapTimeline = undefined
  releaseLayer()
  setupJump()
}

function runSwap(snapshot: SwapSnapshot) {
  const root = rootRef.value
  const content = contentRef.value
  const layer = jumpContentRef.value
  const ghostHost = ghostRef.value
  if (!root || !content || !layer || !ghostHost || !canSwap()) return false
  if (!splitLayer()) return false

  const chars = split!.chars as HTMLElement[]
  if (chars.length > SWAP_CHAR_LIMIT) {
    releaseLayer()
    return false
  }

  root.setAttribute('data-swapping', 'true')

  const origin = measureRoot(root)
  const next = alignCharElements(content, chars, origin)
  const fontSize = Number.parseFloat(getComputedStyle(root).fontSize) || 16
  const travel = fontSize * 0.6
  const widthOffset = snapshot.width - origin.width
  // 保留的字只在就近移动时滑动；要穿过一串进出场的字时画面会杂乱，改为原地翻出再翻入。
  const pairs = matchChars(snapshot.chars.map(char => char.text), next.map(char => char.text))
    .filter(([previous, current]) =>
      Math.abs(snapshot.chars[previous].x - next[current].x) <= fontSize * 1.6 &&
      Math.abs(snapshot.chars[previous].y - next[current].y) <= fontSize * 0.5,
    )
  const keptPrevious = new Set(pairs.map(([previous]) => previous))
  const keptNext = new Set(pairs.map(([, current]) => current))

  const ghosts = placeGhosts(
    ghostHost,
    snapshot.chars.filter((_, index) => !keptPrevious.has(index)),
    origin,
    snapshot.restColor,
  )
  const entering = chars.filter((_, index) => !keptNext.has(index))

  const timeline = gsap.timeline({ onComplete: finishSwap })
  // 先让退场的字离开一点，保留的字再滑进它们的位置。
  const moveAt = ghosts.length ? 0.04 : 0

  // 宽度用外边距补偿：文字本身立即按新内容排版，占位宽度再平滑过渡，按钮会跟着伸缩。
  if (Math.abs(widthOffset) > 0.5) {
    timeline.fromTo(
      root,
      { [SWAP_OFFSET]: `${widthOffset}px` },
      { [SWAP_OFFSET]: '0px', duration: SWAP_DURATION, ease: SWAP_EASE },
      moveAt,
    )
  }

  pairs.forEach(([previous, current]) => {
    const dx = snapshot.chars[previous].x - next[current].x
    const dy = snapshot.chars[previous].y - next[current].y
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return

    timeline.fromTo(
      chars[current],
      { x: dx, y: dy },
      { x: 0, y: 0, duration: SWAP_DURATION, ease: SWAP_EASE },
      moveAt,
    )
  })

  if (ghosts.length) {
    // 上移逐渐加速，透明度却要立刻下降，避免和滑过来的字叠在一起。
    timeline
      .to(ghosts, { y: -travel, duration: 0.24, ease: 'power2.in', stagger: 0.014 }, 0)
      .to(ghosts, { opacity: 0, duration: 0.18, ease: 'power1.out', stagger: 0.014 }, 0)
  }

  if (entering.length) {
    timeline.fromTo(entering, { y: travel, opacity: 0 }, {
      y: 0,
      opacity: 1,
      duration: 0.42,
      ease: 'power3.out',
      stagger: 0.03,
    }, ghosts.length ? 0.12 : 0.08)
  }

  if (usesSweep.value) {
    // 渐变裁字与普通字形的抗锯齿不同；字落稳后再交接，避免亮度和笔画突然跳变。
    const handoffAt = timeline.duration()
    timeline
      .fromTo(content, { opacity: 0 }, {
        opacity: 1, duration: SWAP_HANDOFF_DURATION, ease: 'power1.inOut',
      }, handoffAt)
      .fromTo(layer, { opacity: 1 }, {
        opacity: 0, duration: SWAP_HANDOFF_DURATION, ease: 'power1.inOut',
      }, handoffAt)
  }

  swapTimeline = timeline
  return true
}

/* ---------- 触发 ---------- */

function sweepDirectionFrom(origin?: BingAnimatedTextPlayOrigin): BingAnimatedTextShineDirection {
  const root = rootRef.value
  if (!origin || !root || !Number.isFinite(origin.clientX)) return props.shineDirection

  const rect = root.getBoundingClientRect()
  return origin.clientX <= rect.left + rect.width / 2 ? 'left' : 'right'
}

function play(origin?: BingAnimatedTextPlayOrigin) {
  if (!shouldAnimate.value || prefersReducedMotion()) return

  const pointer = props.followPointer ? origin : undefined
  if (usesSweep.value) playShine(props.shineDelay, sweepDirectionFrom(pointer))
  if (usesJump.value) playJump(pointer)
}

function handlePointerEnter(event: PointerEvent) {
  if (props.trigger === 'hover') play(event)
}

function handleFocusIn(event: FocusEvent) {
  if (props.trigger !== 'hover') return

  const target = event.target as Element | null
  try {
    if (target && !target.matches(':focus-visible')) return
  } catch {
    // 不支持 :focus-visible 的环境按键盘聚焦处理。
  }
  play()
}

function resolveHoverTarget() {
  const root = rootRef.value
  const target = props.hoverTarget
  if (!root || !target) return root
  if (typeof target === 'string') return root.closest<HTMLElement>(target) ?? root
  return target
}

function bindHoverTarget() {
  const next = resolveHoverTarget()
  if (next === boundHoverTarget) return

  unbindHoverTarget()
  boundHoverTarget = next
  next?.addEventListener('pointerenter', handlePointerEnter)
  next?.addEventListener('focusin', handleFocusIn)
}

function unbindHoverTarget() {
  boundHoverTarget?.removeEventListener('pointerenter', handlePointerEnter)
  boundHoverTarget?.removeEventListener('focusin', handleFocusIn)
  boundHoverTarget = null
}

watch(
  () => [
    props.effect,
    props.trigger,
    props.disabled,
    props.shineSpeed,
    props.shineDelay,
    props.shineInterval,
    props.shineDirection,
    props.shineAngle,
    props.shineColor,
    props.shineBaseColor,
  ],
  scheduleShineSetup,
  { flush: 'post' },
)

watch(
  () => [
    props.effect,
    props.trigger,
    props.disabled,
    props.jumpY,
    props.jumpStagger,
    props.jumpDuration,
    props.jumpEase,
    props.jumpReturnEase,
    props.jumpRepeatDelay,
  ],
  scheduleJumpSetup,
  { flush: 'post' },
)

watch(() => props.hoverTarget, bindHoverTarget, { flush: 'post' })

onMounted(() => {
  isMotionReduced.value = prefersReducedMotion()
  renderedMarkup = contentRef.value?.innerHTML ?? ''
  bindHoverTarget()
  scheduleShineSetup()
  scheduleJumpSetup()
})

onBeforeUpdate(() => {
  swapSnapshot = captureSwapSnapshot()
})

onUpdated(() => {
  const snapshot = swapSnapshot
  swapSnapshot = undefined

  const content = contentRef.value
  if (!content || content.innerHTML === renderedMarkup) return
  renderedMarkup = content.innerHTML

  if (snapshot && snapshot.text !== content.textContent && runSwap(snapshot)) return

  if (swapTimeline) releaseLayer()
  scheduleJumpSetup()
})

onUnmounted(() => {
  viewportObserver?.disconnect()
  viewportObserver = undefined
  unbindHoverTarget()
  cleanupShine()
  releaseLayer()
})

function handleMotionPreference() {
  isMotionReduced.value = prefersReducedMotion()
  scheduleShineSetup()
  scheduleJumpSetup()
}

defineExpose({ play } satisfies BingAnimatedTextExpose)
</script>

<template>
  <span ref="rootRef" :class="classes" :style="textStyle">
    <span ref="contentRef" class="bing-animated-text__content">
      <slot />
    </span>
    <span ref="jumpContentRef" class="bing-animated-text__jump-layer" aria-hidden="true" inert></span>
    <span ref="ghostRef" class="bing-animated-text__ghosts" aria-hidden="true"></span>
  </span>
</template>

<style scoped>
.bing-animated-text {
  /* 拆字副本和退场字使用的常态颜色，与各效果静止时的文字颜色一致。 */
  --animated-text-rest: currentColor;

  position: relative;
  display: inline-block;
  max-width: 100%;
  min-width: 0;
  color: inherit;
  line-height: inherit;
  vertical-align: baseline;
}

.bing-animated-text__content {
  display: inline-block;
  max-width: 100%;
  min-width: 0;
  color: inherit;
  line-height: inherit;
  white-space: inherit;
}

/* 静态原文与动画副本保持相同的合成方式，避免切换前后笔画粗细跳变。 */
.bing-animated-text--swap {
  isolation: isolate;
}

.bing-animated-text--swap:not(.is-disabled):not(.is-motion-reduced) {
  will-change: transform;
}

/* 拆字前后使用同样的字距与连字，避免副本比原文更宽而多换一行。 */
.bing-animated-text--jump .bing-animated-text__content,
.bing-animated-text--swap .bing-animated-text__content {
  font-kerning: none;
  font-variant-ligatures: none;
  text-rendering: optimizeSpeed;
}

.bing-animated-text__jump-layer {
  position: absolute;
  inset: 0;
  display: block;
  visibility: hidden;
  color: var(--animated-text-rest);
  white-space: inherit;
  font-kerning: none;
  font-variant-ligatures: none;
  text-rendering: optimizeSpeed;
  pointer-events: none;
}

.bing-animated-text--jump > .bing-animated-text__jump-layer {
  inset: var(--animated-text-jump-room, 8px) 0;
}

.bing-animated-text[data-jump-ready] > .bing-animated-text__content,
.bing-animated-text[data-swapping] > .bing-animated-text__content {
  opacity: 0;
}

.bing-animated-text[data-jump-ready] > .bing-animated-text__jump-layer,
.bing-animated-text[data-swapping] > .bing-animated-text__jump-layer {
  visibility: visible;
}

.bing-animated-text[data-swapping] {
  margin-inline-end: var(--animated-text-swap-offset, 0px);
}

/* 两层透明度互补相加，交接时保持墨色浓度，避免普通叠加造成闪暗或变淡。 */
.bing-animated-text--swap > .bing-animated-text__content,
.bing-animated-text--swap > .bing-animated-text__jump-layer {
  mix-blend-mode: plus-lighter;
  will-change: opacity;
}

.bing-animated-text__ghosts {
  position: absolute;
  inset: 0;
  color: var(--animated-text-rest);
  pointer-events: none;
}

.bing-animated-text__ghosts :deep(.bing-animated-text__ghost) {
  position: absolute;
  top: 0;
  left: 0;
  white-space: pre;
  font-kerning: none;
}

.bing-animated-text--jump {
  padding-block: var(--animated-text-jump-room, 8px);
  margin-block: calc(var(--animated-text-jump-room, 8px) * -1);
}

/*
 * shine：常态保持原色，光带处墨色变薄，在浅色和深色背景上都可见，不会把字「擦掉」。
 * shimmer：常态减淡，光带处恢复原色。
 */
.bing-animated-text.is-shine-active {
  --animated-text-shine-base: var(--animated-text-shine-base-color, currentColor);
  --animated-text-shine-highlight: var(
    --animated-text-shine-color,
    color-mix(in oklab, currentColor 40%, transparent)
  );
  --animated-text-rest: var(--animated-text-shine-base);
}

.bing-animated-text--shimmer.is-shine-active {
  --animated-text-shine-base: var(
    --animated-text-shine-base-color,
    color-mix(in oklab, currentColor 38%, transparent)
  );
  --animated-text-shine-highlight: var(--animated-text-shine-color, currentColor);
}

/* 减少动态效果时 shimmer 不再减淡，保证文字可读。 */
.bing-animated-text--shimmer.is-shine-active.is-motion-reduced {
  --animated-text-shine-base: var(--animated-text-shine-highlight);
}

.bing-animated-text.is-shine-active .bing-animated-text__content {
  --animated-text-shine-band-width: var(--animated-text-shine-band, min(1.5em, 30%));
  /* 光带外缘接近常态色，起止只留半个光带宽度，扫光时间几乎都花在文字上。 */
  --animated-text-shine-center: calc(
    var(--animated-text-shine-p, 0) * (100% + var(--animated-text-shine-band-width)) -
      var(--animated-text-shine-band-width) * 0.5
  );
  /* 肩部压低、峰值集中，读起来像一道反光而不是一片阴影。 */
  --animated-text-shine-soft: color-mix(
    in oklab,
    var(--animated-text-shine-base) 72%,
    var(--animated-text-shine-highlight)
  );

  background-image: linear-gradient(
    var(--animated-text-shine-angle, 120deg),
    var(--animated-text-shine-base)
      calc(var(--animated-text-shine-center) - var(--animated-text-shine-band-width)),
    var(--animated-text-shine-soft)
      calc(var(--animated-text-shine-center) - var(--animated-text-shine-band-width) * 0.42),
    var(--animated-text-shine-highlight) var(--animated-text-shine-center),
    var(--animated-text-shine-soft)
      calc(var(--animated-text-shine-center) + var(--animated-text-shine-band-width) * 0.42),
    var(--animated-text-shine-base)
      calc(var(--animated-text-shine-center) + var(--animated-text-shine-band-width))
  );
  background-repeat: no-repeat;
  background-size: 100% 100%;
  color: inherit;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.bing-animated-text :deep(.bing-animated-text__word) {
  display: inline-block;
  white-space: nowrap;
}

.bing-animated-text :deep(.bing-animated-text__word--breakable) {
  display: inline;
  white-space: inherit;
}

.bing-animated-text :deep(.bing-animated-text__char) {
  display: inline-block;
}

@media (prefers-reduced-motion: reduce) {
  .bing-animated-text[data-jump-ready] > .bing-animated-text__content { opacity: 1; }
  .bing-animated-text[data-jump-ready] > .bing-animated-text__jump-layer { visibility: hidden; }
}
</style>
