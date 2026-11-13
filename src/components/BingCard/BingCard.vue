<script setup lang="ts">
import { useClickFeedback } from '../../motion/useClickFeedback'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { gsap } from 'gsap'
import { createGlassCssVariables } from '../../utils/glass'
import type {
  BingCardEmits,
  BingCardFlipAxis,
  BingCardFlipTrigger,
  BingCardProps,
} from './BingCard.types'
import { useReducedMotion } from '../../motion/reducedMotion'

const prefersReducedMotion = useReducedMotion()

const { playClickFeedback } = useClickFeedback()
const props = withDefaults(defineProps<BingCardProps>(), {
  title: undefined,
  description: undefined,
  variant: 'soft',
  padding: 'md',
  rounded: 'md',
  glass: true,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
  interactive: true,
  tilt: true,
  tiltMax: 8,
  tiltScale: 1.015,
  glare: true,
  entrance: 'fade-up',
  entranceOnce: true,
  entranceDelay: 0,
  entranceDuration: 0.72,
  flipAxis: 'x',
  flipTurns: 2.5,
  flipEase: 'power4.out',
  flipTrigger: 'press',
  longPressDelay: 560,
  longPressRelease: 'restore',
  disabled: false,
})

const emit = defineEmits<BingCardEmits>()

const rootRef = ref<HTMLElement | null>(null)
const surfaceRef = ref<HTMLElement | null>(null)
const glareRef = ref<HTMLElement | null>(null)
const pressFeedbackRef = ref<HTMLElement | null>(null)
const pressAmbienceRef = ref<HTMLElement | null>(null)
const hasEntered = ref(false)
const isFlipped = ref(false)
const isPressing = ref(false)

let ctx: gsap.Context | undefined
let observer: IntersectionObserver | undefined
let longPressTween: gsap.core.Tween | undefined
let flipTween: gsap.core.Tween | undefined
let entranceTween: gsap.core.Tween | undefined
let isFlipAnimating = false
let isEntranceAnimating = false
let pressStartX = 0
let pressStartY = 0
let hasTriggeredLongPress = false

const longPressMoveTolerance = 10

const backFaceAxis = computed<Exclude<BingCardFlipAxis, 'z'>>(() =>
  props.flipAxis === 'z' ? 'y' : props.flipAxis,
)

const effectiveFlipTrigger = computed<BingCardFlipTrigger>(() => {
  if (props.disabled) {
    return 'none'
  }

  return props.flipTrigger
})

const classes = computed(() => [
  'bing-card',
  `bing-card--${props.variant}`,
  `bing-card--padding-${props.padding}`,
  `bing-card--rounded-${props.rounded}`,
  `bing-card--back-axis-${backFaceAxis.value}`,
  {
    'is-glass': props.glass,
    'is-interactive': props.interactive,
    'is-tilt': props.tilt,
    'is-glare': props.glare,
    'is-flipped': isFlipped.value,
    'is-pressing': isPressing.value,
    'is-long-press-enabled': effectiveFlipTrigger.value === 'press',
    'is-click-flip-enabled': effectiveFlipTrigger.value === 'click',
    'is-disabled': props.disabled,
    'has-entered': hasEntered.value,
  },
])

const cardStyle = computed<CSSProperties>(() => ({
  ...createGlassCssVariables('bing-card', {
    glass: props.glass,
    glassBlur: props.glassBlur,
    glassOpacity: props.glassOpacity,
    glassSaturation: props.glassSaturation,
  }),
  '--bing-card-tilt-max': `${props.tiltMax}deg`,
}))

const hasHeader = computed(() => Boolean(props.title || props.description))

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function getRotationProperty(axis: BingCardFlipAxis) {
  if (axis === 'x') {
    return 'rotationX'
  }

  if (axis === 'y') {
    return 'rotationY'
  }

  return 'rotation'
}

function getBackRotationVars(): gsap.TweenVars {
  const property = getRotationProperty(backFaceAxis.value)

  return {
    rotationX: 0,
    rotationY: 0,
    rotation: 0,
    [property]: isFlipped.value ? 180 : 0,
  }
}

function getTiltRotationVars(rotateX: number, rotateY: number): gsap.TweenVars {
  if (!isFlipped.value) {
    return {
      rotationX: rotateX,
      rotationY: rotateY,
      rotation: 0,
    }
  }

  if (backFaceAxis.value === 'x') {
    return {
      rotationX: 180 + rotateX,
      rotationY: rotateY,
      rotation: 0,
    }
  }

  return {
    rotationX: rotateX,
    rotationY: 180 + rotateY,
    rotation: 0,
  }
}

function canAnimateInteraction() {
  return (
    props.interactive &&
    props.tilt &&
    !props.disabled &&
    !prefersReducedMotion() &&
    !isEntranceAnimating &&
    !isFlipAnimating &&
    surfaceRef.value
  )
}

function handlePointerMove(event: PointerEvent) {
  cancelLongPressIfMoved(event)

  if (!canAnimateInteraction()) {
    return
  }

  const root = rootRef.value
  const surface = surfaceRef.value

  if (!root || !surface) {
    return
  }

  const rect = root.getBoundingClientRect()

  if (rect.width === 0 || rect.height === 0) {
    return
  }

  const pointerX = clamp((event.clientX - rect.left) / rect.width, 0, 1)
  const pointerY = clamp((event.clientY - rect.top) / rect.height, 0, 1)
  const maxTilt = Math.max(0, props.tiltMax)
  const rotateY = (pointerX - 0.5) * maxTilt * 2
  const rotateX = (0.5 - pointerY) * maxTilt * 2

  gsap.to(surface, {
    ...getTiltRotationVars(rotateX, rotateY),
    scale: Math.max(1, props.tiltScale),
    transformPerspective: 900,
    transformOrigin: '50% 50%',
    duration: 0.34,
    ease: 'power3.out',
    overwrite: true,
    force3D: true,
  })

  if (props.glare && glareRef.value) {
    gsap.to(glareRef.value, {
      '--bing-card-glare-x': `${pointerX * 100}%`,
      '--bing-card-glare-y': `${pointerY * 100}%`,
      opacity: 1,
      duration: 0.24,
      ease: 'power2.out',
      overwrite: true,
    })
  }
}

function resetTilt() {
  if (isEntranceAnimating) {
    return
  }

  const surface = surfaceRef.value

  if (surface) {
    gsap.to(surface, {
      ...getBackRotationVars(),
      scale: 1,
      duration: 0.48,
      ease: 'elastic.out(1, 0.72)',
      overwrite: true,
      force3D: true,
    })
  }

  if (glareRef.value) {
    gsap.to(glareRef.value, {
      opacity: 0,
      duration: 0.26,
      ease: 'power2.out',
      overwrite: true,
    })
  }
}

function getRotateEntranceVars() {
  const rotationProperty = getRotationProperty(props.flipAxis)
  const rotationValue = -360 * Math.max(1, props.flipTurns)

  return {
    from: {
      autoAlpha: 0,
      y: 34,
      z: props.flipAxis === 'z' ? 0 : -120,
      [rotationProperty]: rotationValue,
      scale: 0.96,
      transformPerspective: 900,
      transformOrigin: '50% 50%',
    },
    to: {
      autoAlpha: 1,
      y: 0,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      rotation: 0,
      scale: 1,
      ease: props.flipEase,
    },
  }
}

function getEntranceVars() {
  switch (props.entrance) {
    case 'bubble':
      return {
        from: { autoAlpha: 0, y: 18, scale: 0.78 },
        to: { autoAlpha: 1, y: 0, scale: 1, ease: 'elastic.out(1, 0.64)' },
      }
    case 'rotate-up':
      return getRotateEntranceVars()
    case 'soft-pop':
      return {
        from: { autoAlpha: 0, y: 10, scale: 0.92, filter: 'blur(10px)' },
        to: { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', ease: 'power3.out' },
      }
    case 'fade-up':
    default:
      return {
        from: { autoAlpha: 0, y: 26, scale: 0.98 },
        to: { autoAlpha: 1, y: 0, scale: 1, ease: 'power3.out' },
      }
  }
}

function clearLongPressProgress() {
  longPressTween?.kill()
  longPressTween = undefined
  isPressing.value = false

  if (pressFeedbackRef.value) {
    gsap.killTweensOf(pressFeedbackRef.value)
    gsap.set(pressFeedbackRef.value, {
      '--bing-card-press-progress': 0,
      '--bing-card-press-ring-scale': 0.78,
      autoAlpha: 0,
    })
  }

  if (pressAmbienceRef.value) {
    gsap.killTweensOf(pressAmbienceRef.value)
    gsap.set(pressAmbienceRef.value, {
      autoAlpha: 0,
      scale: 0.98,
    })
  }
}

function releaseLongPressCharge() {
  isPressing.value = false

  if (pressFeedbackRef.value) {
    gsap.killTweensOf(pressFeedbackRef.value)
    gsap
      .timeline()
      .to(pressFeedbackRef.value, {
        '--bing-card-press-ring-scale': 0.96,
        autoAlpha: 0.82,
        duration: 0.1,
        ease: 'power2.out',
      })
      .to(
        pressFeedbackRef.value,
        {
          '--bing-card-press-ring-scale': 1.08,
          autoAlpha: 0,
          duration: 0.38,
          ease: 'power3.out',
        },
        0.06,
      )
  }

  if (pressAmbienceRef.value) {
    gsap.killTweensOf(pressAmbienceRef.value)
    gsap
      .timeline()
      .to(pressAmbienceRef.value, {
        autoAlpha: 0.18,
        scale: 1,
        duration: 0.1,
        ease: 'power2.out',
      })
      .to(
        pressAmbienceRef.value,
        {
          autoAlpha: 0,
          scale: 1.015,
          duration: 0.38,
          ease: 'power3.out',
        },
        0.06,
      )
  }
}

function flipCard(toBack = !isFlipped.value) {
  const surface = surfaceRef.value

  if (!surface || props.disabled || isEntranceAnimating) {
    return
  }

  if (isFlipped.value === toBack) {
    return
  }

  isFlipped.value = toBack

  const tween = gsap.to(surface, {
    ...getBackRotationVars(),
    scale: 1,
    transformPerspective: 900,
    transformOrigin: '50% 50%',
    duration: 0.68,
    ease: 'power3.inOut',
    overwrite: true,
    force3D: true,
    onComplete: () => {
      if (flipTween === tween) {
        isFlipAnimating = false
      }
    },
    onInterrupt: () => {
      if (flipTween === tween) {
        isFlipAnimating = false
      }
    },
  })
  flipTween = tween
  isFlipAnimating = true

  emit('flip', toBack ? 'back' : 'front')
}

function handlePointerDown(event: PointerEvent) {
  if (!isBrowser() || effectiveFlipTrigger.value !== 'press' || isEntranceAnimating) {
    return
  }

  if (event.button !== 0) {
    return
  }

  clearLongPressProgress()
  hasTriggeredLongPress = false
  pressStartX = event.clientX
  pressStartY = event.clientY
  isPressing.value = true

  const root = rootRef.value
  const rect = root?.getBoundingClientRect()
  const pressX =
    rect && rect.width > 0 ? `${clamp(((event.clientX - rect.left) / rect.width) * 100, 0, 100)}%` : '50%'
  const pressY =
    rect && rect.height > 0
      ? `${clamp(((event.clientY - rect.top) / rect.height) * 100, 0, 100)}%`
      : '50%'

  try {
    ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
  } catch {
    // Synthetic pointer events and some browsers may not allow capture here.
  }

  if (pressFeedbackRef.value) {
    gsap.set(pressFeedbackRef.value, {
      '--bing-card-press-progress': 0,
      '--bing-card-press-x': pressX,
      '--bing-card-press-y': pressY,
      '--bing-card-press-ring-scale': 0.78,
      autoAlpha: 1,
    })

    longPressTween = gsap.to(pressFeedbackRef.value, {
      '--bing-card-press-progress': 1,
      '--bing-card-press-ring-scale': 0.98,
      duration: Math.max(120, props.longPressDelay) / 1000,
      ease: 'none',
      overwrite: true,
      onComplete: () => {
        longPressTween = undefined
        hasTriggeredLongPress = true
        emit('long-press')
        releaseLongPressCharge()

        if (props.longPressRelease === 'restore') {
          flipCard(true)
          return
        }

        flipCard()
      },
    })
  }

  if (pressAmbienceRef.value) {
    gsap.fromTo(
      pressAmbienceRef.value,
      { autoAlpha: 0, scale: 0.98 },
      {
        autoAlpha: 1,
        scale: 1,
        duration: Math.min(0.24, Math.max(120, props.longPressDelay) / 2000),
        ease: 'power2.out',
        overwrite: true,
      },
    )
  }
}

function handleClick(event: MouseEvent) {
  if (event.defaultPrevented || props.disabled || effectiveFlipTrigger.value !== 'click' || isEntranceAnimating) {
    return
  }

  if (event.target instanceof Element && event.target.closest('button,a[href],input,label,select,textarea,[role="button"],[role="tab"],[contenteditable]:not([contenteditable="false"])')) return
  playClickFeedback(event)
  flipCard()
}

function cancelLongPressIfMoved(event: PointerEvent) {
  if (!longPressTween) {
    return
  }

  const moveX = event.clientX - pressStartX
  const moveY = event.clientY - pressStartY

  if (Math.hypot(moveX, moveY) > longPressMoveTolerance) {
    clearLongPressProgress()
  }
}

function handlePointerEnd() {
  clearLongPressProgress()

  if (hasTriggeredLongPress && props.longPressRelease === 'restore') {
    flipCard(false)
  }

  hasTriggeredLongPress = false
}

function handlePointerLeave() {
  if (!hasTriggeredLongPress) {
    clearLongPressProgress()
  }

  if (isFlipAnimating) {
    return
  }

  resetTilt()
}

function playEntrance() {
  const root = rootRef.value
  const surface = surfaceRef.value

  if (!root || !surface || props.disabled) {
    return
  }

  if (hasEntered.value && props.entranceOnce) {
    return
  }

  hasEntered.value = true
  root.classList.add('has-entered')
  emit('enter')

  entranceTween?.kill()
  entranceTween = undefined
  isEntranceAnimating = false
  ctx?.revert()
  ctx = undefined

  if (props.entrance === 'none' || prefersReducedMotion()) {
    gsap.set(surface, { autoAlpha: 1, clearProps: 'transform,filter' })
    return
  }

  const vars = getEntranceVars()

  ctx = gsap.context(() => {
    const tween = gsap.fromTo(
      surface,
      vars.from,
      {
        ...vars.to,
        duration: Math.max(0.1, props.entranceDuration),
        delay: Math.max(0, props.entranceDelay),
        clearProps: 'filter',
        onComplete: () => {
          if (entranceTween === tween) {
            entranceTween = undefined
            isEntranceAnimating = false
          }
        },
        onInterrupt: () => {
          if (entranceTween === tween) {
            entranceTween = undefined
            isEntranceAnimating = false
          }
        },
      },
    )
    entranceTween = tween
    isEntranceAnimating = true
  }, root)
}

function setupEntranceObserver() {
  observer?.disconnect()
  observer = undefined

  if (!isBrowser()) {
    playEntrance()
    return
  }

  if (props.entrance === 'none' || prefersReducedMotion()) {
    playEntrance()
    return
  }

  if (!('IntersectionObserver' in window)) {
    playEntrance()
    return
  }

  const root = rootRef.value

  if (!root) {
    return
  }

  observer = new IntersectionObserver(
    (entries) => {
      const isVisible = entries.some((entry) => entry.isIntersecting)

      if (!isVisible) {
        return
      }

      playEntrance()

      if (props.entranceOnce) {
        observer?.disconnect()
        observer = undefined
      }
    },
    {
      threshold: 0.18,
      rootMargin: '0px 0px -8% 0px',
    },
  )

  observer.observe(root)
}

watch(
  () => [
    props.entrance,
    props.entranceOnce,
    props.entranceDelay,
    props.entranceDuration,
    props.flipAxis,
    props.flipTurns,
    props.flipEase,
    props.flipTrigger,
    props.disabled,
  ],
  () => {
    clearLongPressProgress()
    hasEntered.value = false
    void nextTick(setupEntranceObserver)
  },
  { flush: 'post' },
)

onMounted(() => {
  void nextTick(setupEntranceObserver)
})

onBeforeUnmount(() => {
  clearLongPressProgress()
  entranceTween?.kill()
  entranceTween = undefined
  isEntranceAnimating = false
  flipTween?.kill()
  flipTween = undefined
  isFlipAnimating = false
  observer?.disconnect()
  observer = undefined
  ctx?.revert()
  ctx = undefined
  gsap.killTweensOf(
    [
      surfaceRef.value,
      glareRef.value,
      pressFeedbackRef.value,
      pressAmbienceRef.value,
    ].filter(Boolean),
  )
})
</script>

<template>
  <article
    ref="rootRef"
    :class="classes"
    :style="cardStyle"
    @pointerdown="handlePointerDown"
    @pointermove="handlePointerMove"
    @pointerup="handlePointerEnd"
    @pointerleave="handlePointerLeave"
    @pointercancel="handlePointerEnd"
    @lostpointercapture="handlePointerEnd"
    @click="handleClick"
  >
    <div ref="surfaceRef" class="bing-card__surface">
      <div class="bing-card__face bing-card__front">
        <span v-if="glare" ref="glareRef" class="bing-card__glare" aria-hidden="true"></span>
        <div v-if="$slots.media" class="bing-card__media">
          <slot name="media" />
        </div>
        <div class="bing-card__content">
          <header v-if="$slots.header || hasHeader" class="bing-card__header">
            <slot name="header">
              <div class="bing-card__heading">
                <h3 v-if="title" class="bing-card__title">{{ title }}</h3>
                <p v-if="description" class="bing-card__description">{{ description }}</p>
              </div>
            </slot>
          </header>
          <div v-if="$slots.default" class="bing-card__body">
            <slot />
          </div>
          <footer v-if="$slots.footer" class="bing-card__footer">
            <slot name="footer" />
          </footer>
        </div>
      </div>
      <div class="bing-card__face bing-card__back" aria-hidden="true">
        <slot name="back">
          <div class="bing-card__back-mark">Bing UI</div>
          <div class="bing-card__back-text">交互卡片</div>
        </slot>
      </div>
      <span
        v-if="effectiveFlipTrigger === 'press'"
        ref="pressAmbienceRef"
        class="bing-card__press-ambience"
        aria-hidden="true"
      ></span>
      <span
        v-if="effectiveFlipTrigger === 'press'"
        ref="pressFeedbackRef"
        class="bing-card__press-feedback"
        aria-hidden="true"
      ></span>
    </div>
  </article>
</template>

<style scoped>
.bing-card {
  --bing-card-glare-x: 50%;
  --bing-card-glare-y: 50%;
  --bing-card-radius: var(--bing-radius-card, 10px);
  display: block;
  min-width: 0;
  color: var(--bing-text);
  perspective: 980px;
  perspective-origin: 50% 50%;
}

.bing-card--rounded-none {
  --bing-card-radius: 0;
}

.bing-card--rounded-sm {
  --bing-card-radius: 6px;
}

.bing-card--rounded-md {
  --bing-card-radius: var(--bing-radius-card, 10px);
}

.bing-card--rounded-lg {
  --bing-card-radius: 12px;
}

.bing-card--rounded-xl {
  --bing-card-radius: 16px;
}

.bing-card--rounded-full {
  --bing-card-radius: 999px;
}

.bing-card__surface {
  position: relative;
  display: block;
  min-width: 0;
  min-height: 100%;
  border-radius: var(--bing-card-radius);
  transform-style: preserve-3d;
  transform-origin: 50% 50%;
  will-change: transform;
}

.bing-card__face {
  box-sizing: border-box;
  min-width: 0;
  min-height: 100%;
  overflow: hidden;
  border: 1px solid var(--bing-border);
  border-radius: inherit;
  background: var(--bing-surface-solid);
  box-shadow: var(--bing-shadow-md);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  transform-style: preserve-3d;
  transition:
    border-color 260ms var(--bing-ease-smooth),
    box-shadow 320ms var(--bing-ease-smooth);
}

.bing-card__front {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
}

.bing-card__back {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--bing-heading);
  text-align: center;
  background: var(--bing-surface-solid);
}

.bing-card__back-mark {
  color: var(--bing-accent-strong);
  font-size: 1.05rem;
  font-weight: 600;
  line-height: 1;
}

.bing-card__back-text {
  color: var(--bing-muted);
  font-size: 0.82rem;
  font-weight: 400;
  letter-spacing: 0;
  line-height: 1.3;
}

.bing-card.is-interactive .bing-card__surface {
  cursor: default;
}

.bing-card.is-long-press-enabled {
  -webkit-user-select: none;
  user-select: none;
}

.bing-card--back-axis-x .bing-card__back {
  transform: rotateX(180deg);
}

.bing-card--back-axis-y .bing-card__back {
  transform: rotateY(180deg);
}

.bing-card--plain .bing-card__face {
  background: var(--bing-surface-solid);
}

.bing-card--soft .bing-card__front {
  background: var(--bing-surface-solid);
}

.bing-card--accent .bing-card__front {
  border-color: rgb(var(--bing-accent-rgb) / 0.24);
  background: color-mix(in srgb, var(--bing-surface-solid) 94%, var(--bing-accent));
  box-shadow: var(--bing-shadow-md);
}

.bing-card--sky .bing-card__front {
  border-color: rgb(var(--bing-secondary-rgb) / 0.2);
  background: color-mix(in srgb, var(--bing-surface-solid) 94%, var(--bing-secondary));
  box-shadow: var(--bing-shadow-md);
}

.bing-card.is-glass .bing-card__face {
  border-color: var(--bing-border-strong);
  background: rgb(var(--bing-surface-rgb) / var(--bing-card-glass-opacity, 0.85));
  box-shadow: var(--bing-shadow-md);
  backdrop-filter: blur(var(--bing-card-glass-blur, 8px))
    saturate(var(--bing-card-glass-saturation, 1.18));
  -webkit-backdrop-filter: blur(var(--bing-card-glass-blur, 8px))
    saturate(var(--bing-card-glass-saturation, 1.18));
}

.bing-card.is-glass.bing-card--accent .bing-card__front {
  background: color-mix(in srgb, rgb(var(--bing-surface-rgb) / var(--bing-card-glass-opacity, 0.85)) 94%, rgb(var(--bing-accent-rgb) / var(--bing-card-glass-opacity, 0.85)));
}

.bing-card.is-glass.bing-card--sky .bing-card__front {
  background: color-mix(in srgb, rgb(var(--bing-surface-rgb) / var(--bing-card-glass-opacity, 0.85)) 94%, rgb(var(--bing-secondary-rgb) / var(--bing-card-glass-opacity, 0.85)));
}

.bing-card.is-glass .bing-card__back {
  background: rgb(var(--bing-surface-rgb) / var(--bing-card-glass-opacity, 0.85));
}

.bing-card__glare {
  position: absolute;
  inset: 0;
  z-index: 1;
  opacity: 0;
  pointer-events: none;
  background:
    radial-gradient(
      circle at var(--bing-card-glare-x) var(--bing-card-glare-y),
      rgb(var(--bing-highlight-rgb) / 0.78),
      rgb(var(--bing-highlight-rgb) / 0.26) 18%,
      transparent 46%
    );
  mix-blend-mode: screen;
  will-change: opacity;
}

.bing-card__press-ambience,
.bing-card__press-feedback {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-radius: inherit;
  pointer-events: none;
}

.bing-card__press-ambience {
  inset: -6px;
  z-index: 0;
  border: 1px solid rgb(var(--bing-secondary-rgb) / 0.08);
  box-shadow:
    var(--bing-shadow-sm),
    0 0 14px rgb(var(--bing-secondary-rgb) / 0.035);
  opacity: 0;
  filter: blur(2px);
  transform: scale(0.98);
  will-change: opacity, transform;
}

.bing-card__press-feedback {
  --bing-card-press-progress: 0;
  --bing-card-press-ring-scale: 0.78;
  --bing-card-press-x: 50%;
  --bing-card-press-y: 50%;
  z-index: 4;
  overflow: hidden;
  background: rgb(var(--bing-highlight-rgb) / 0.025);
  opacity: 0;
  will-change: opacity;
}

.bing-card__press-feedback::before,
.bing-card__press-feedback::after {
  position: absolute;
  content: '';
  pointer-events: none;
}

.bing-card__press-feedback::before {
  inset: 0;
  padding: 1px;
  border-radius: inherit;
  background: conic-gradient(
    from -90deg,
    rgb(var(--bing-secondary-rgb) / 0.62) 0turn,
    rgb(var(--bing-accent-rgb) / 0.56) calc(var(--bing-card-press-progress) * 1turn),
    transparent calc(var(--bing-card-press-progress) * 1turn)
  );
  opacity: calc(0.28 + var(--bing-card-press-progress) * 0.64);
  -webkit-mask:
    linear-gradient(#000 0 0) content-box,
    linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
}

.bing-card__press-feedback::after {
  left: var(--bing-card-press-x);
  top: var(--bing-card-press-y);
  width: 36px;
  aspect-ratio: 1;
  border: 1px solid rgb(var(--bing-secondary-rgb) / 0.2);
  border-radius: 999px;
  background:
    radial-gradient(
      circle,
      rgb(var(--bing-highlight-rgb) / 0.34),
      rgb(var(--bing-highlight-rgb) / 0.1) 42%,
      transparent 68%
    ),
    rgb(var(--bing-secondary-rgb) / 0.035);
  box-shadow:
    0 0 0 4px rgb(var(--bing-secondary-rgb) / 0.035),
    var(--bing-shadow-sm),
    var(--bing-inset-highlight);
  opacity: calc(0.46 + var(--bing-card-press-progress) * 0.2);
  transform: translate(-50%, -50%) scale(var(--bing-card-press-ring-scale));
  will-change: transform;
}

.bing-card.is-pressing .bing-card__front {
  border-color: rgb(var(--bing-secondary-rgb) / 0.24);
  box-shadow:
    var(--bing-shadow-sm),
    0 0 0 1px rgb(var(--bing-secondary-rgb) / 0.08),
    inset 0 -12px 26px rgb(var(--bing-secondary-rgb) / 0.03),
    var(--bing-inset-highlight);
}

.bing-card__media,
.bing-card__content {
  position: relative;
  z-index: 2;
}

.bing-card__media {
  overflow: hidden;
  border-bottom: 1px solid var(--bing-border);
}

.bing-card__media :deep(img),
.bing-card__media :deep(video) {
  display: block;
  width: 100%;
  height: auto;
}

.bing-card__content {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.bing-card--padding-none .bing-card__content {
  padding: 0;
}

.bing-card--padding-sm .bing-card__content {
  padding: 12px;
}

.bing-card--padding-md .bing-card__content {
  padding: 16px;
}

.bing-card--padding-lg .bing-card__content {
  padding: 24px;
}

.bing-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  min-width: 0;
}

.bing-card__heading {
  min-width: 0;
}

.bing-card__title {
  margin: 0;
  color: var(--bing-heading);
  font-size: 0.9375rem;
  font-weight: var(--bing-font-weight-heading, 600);
  line-height: 1.4;
}

.bing-card__description {
  margin: 4px 0 0;
  color: var(--bing-muted);
  font-size: 0.8125rem;
  line-height: 1.55;
}

.bing-card__body {
  min-width: 0;
  color: var(--bing-text);
  font-size: var(--bing-font-size-md, 0.875rem);
  line-height: 1.6;
}

.bing-card__body :deep(p) {
  margin: 0;
}

.bing-card__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 4px;
}

.bing-card.is-disabled {
  cursor: not-allowed;
  opacity: 0.62;
}

.bing-card.is-disabled .bing-card__surface {
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .bing-card,
  .bing-card__surface,
  .bing-card__face,
  .bing-card__glare,
  .bing-card__press-ambience,
  .bing-card__press-feedback {
    transform: none !important;
    transition: none !important;
  }
}
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
  .bing-card.is-glass .bing-card__face,
  .bing-card.is-glass.bing-card--accent .bing-card__front,
  .bing-card.is-glass.bing-card--sky .bing-card__front {
    background: var(--bing-surface-solid);
  }
}
</style>
