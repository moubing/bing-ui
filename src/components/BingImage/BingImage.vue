<script setup lang="ts">
import { useClickFeedback } from '../../motion/useClickFeedback'
import { computed, nextTick, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import type { BingImageEmits, BingImageProps, BingImageStatus } from './BingImage.types'
import BingImagePreview from '../BingImagePreview/BingImagePreview.vue'

const { playClickFeedback } = useClickFeedback()
const props = withDefaults(defineProps<BingImageProps>(), {
  src: undefined,
  alt: '',
  srcset: undefined,
  sizes: undefined,
  width: undefined,
  height: undefined,
  aspectRatio: undefined,
  fit: 'cover',
  position: 'center',
  radius: 'md',
  block: false,
  loading: 'lazy',
  decoding: 'async',
  fetchPriority: 'auto',
  fallbackSrc: undefined,
  placeholderSrc: undefined,
  showLoading: true,
  showError: true,
  errorText: '图片加载失败',
  crossorigin: undefined,
  referrerPolicy: undefined,
  preview: false,
  previewSrc: undefined,
  previewItems: undefined,
  previewInitialIndex: 0,
  previewDownloadable: false,
  previewDownloadUrl: undefined,
  previewDownloadName: undefined,
  previewAriaLabel: '预览图片',
})

const emit = defineEmits<BingImageEmits>()

const imageRef = ref<HTMLImageElement | null>(null)
const status = ref<BingImageStatus>('idle')
const currentSrc = ref<string | undefined>(undefined)
const failedSrc = ref<string | undefined>(undefined)
const imageKey = ref(0)
const fallbackTried = ref(false)
const previewOpen = ref(false)

const hasImage = computed(() => Boolean(currentSrc.value))
const isLoading = computed(() => status.value === 'loading')
const isLoaded = computed(() => status.value === 'loaded')
const isError = computed(() => status.value === 'error')
const hasPlaceholder = computed(() => isLoading.value || (!isLoaded.value && Boolean(props.placeholderSrc)))
const isPreviewable = computed(() => props.preview && isLoaded.value && hasImage.value && !isError.value)

const imageClasses = computed(() => [
  'bing-image',
  `bing-image--rounded-${props.radius}`,
  {
    'is-block': props.block,
    'is-loading': isLoading.value,
    'is-loaded': isLoaded.value,
    'is-error': isError.value,
    'is-previewable': isPreviewable.value,
    'has-placeholder-image': props.placeholderSrc,
  },
])

const imageStyle = computed<CSSProperties>(() => {
  const style: CSSProperties & Record<string, string | undefined> = {
    '--bing-image-fit': props.fit,
    '--bing-image-position': props.position,
  }

  const width = normalizeSize(props.width)
  const height = normalizeSize(props.height)
  const aspectRatio = normalizeAspectRatio(props.aspectRatio)

  if (width) {
    style.width = width
  }

  if (height) {
    style.height = height
  }

  if (aspectRatio) {
    style.aspectRatio = aspectRatio
  }

  return style
})

const widthAttr = computed(() => normalizeNumericAttribute(props.width))
const heightAttr = computed(() => normalizeNumericAttribute(props.height))
const effectiveSrcset = computed(() => (currentSrc.value === props.src ? props.srcset : undefined))
const effectiveSizes = computed(() => (currentSrc.value === props.src ? props.sizes : undefined))
const errorLabel = computed(() => props.alt || props.errorText)
const previewLabel = computed(() => props.previewAriaLabel || (props.alt ? `预览 ${props.alt}` : '预览图片'))
const previewItems = computed(() => {
  if (props.previewItems?.length) {
    return props.previewItems
  }

  const src = currentSrc.value

  if (!src) {
    return []
  }

  const previewSrc = props.previewSrc || src

  return [
    {
      src,
      previewSrc,
      alt: props.alt,
      downloadUrl: props.previewDownloadUrl || previewSrc,
      downloadName: props.previewDownloadName,
    },
  ]
})

function normalizeSize(value: number | string | undefined) {
  if (value === undefined || value === '') {
    return undefined
  }

  if (typeof value === 'number') {
    return `${value}px`
  }

  return value
}

function normalizeAspectRatio(value: number | string | undefined) {
  if (value === undefined || value === '') {
    return undefined
  }

  return String(value)
}

function normalizeNumericAttribute(value: number | string | undefined) {
  if (typeof value === 'number') {
    return value
  }

  if (typeof value === 'string' && /^\d+$/.test(value)) {
    return value
  }

  return undefined
}

function setStatus(nextStatus: BingImageStatus) {
  if (status.value === nextStatus) {
    return
  }

  status.value = nextStatus
  emit('statusChange', {
    status: nextStatus,
    src: currentSrc.value,
  })
}

function setSource(src: string | undefined) {
  currentSrc.value = src
  imageKey.value += 1
  setStatus(src ? 'loading' : 'idle')
}

function syncLoadedImage() {
  const image = imageRef.value

  if (!image || !currentSrc.value) {
    return
  }

  if (image.complete && image.naturalWidth > 0) {
    failedSrc.value = undefined
    setStatus('loaded')
  }
}

function resetForSource(src: string | undefined) {
  fallbackTried.value = false
  failedSrc.value = undefined
  setSource(src)
  void nextTick(syncLoadedImage)
}

function retry() {
  resetForSource(props.src)
}

function openPreview() {
  if (!isPreviewable.value) {
    return
  }

  previewOpen.value = true
  emit('previewOpen', {
    src: props.previewSrc || currentSrc.value || '',
  })
}

function handleRootClick(event: MouseEvent) {
  if (event.defaultPrevented || !isPreviewable.value) return
  playClickFeedback(event)
  openPreview()
}

function handleRootKeydown(event: KeyboardEvent) {
  if (!isPreviewable.value) {
    return
  }

  if (event.key !== 'Enter' && event.key !== ' ') {
    return
  }

  event.preventDefault()
  playClickFeedback(event)
  openPreview()
}

function handlePreviewClose(reason: 'close' | 'overlay' | 'escape') {
  emit('previewClose', {
    reason,
  })
}

function handleLoad(event: Event) {
  const image = event.currentTarget as HTMLImageElement
  const loadedSrc = currentSrc.value

  if (!loadedSrc) {
    return
  }

  failedSrc.value = undefined
  setStatus('loaded')
  emit('load', {
    event,
    src: loadedSrc,
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
  })
}

function handleError(event: Event) {
  const brokenSrc = currentSrc.value || ''
  const shouldUseFallback =
    Boolean(props.fallbackSrc) && props.fallbackSrc !== brokenSrc && !fallbackTried.value

  emit('error', {
    event,
    src: brokenSrc,
    isFallback: fallbackTried.value,
  })

  if (shouldUseFallback) {
    fallbackTried.value = true
    setSource(props.fallbackSrc)
    return
  }

  failedSrc.value = brokenSrc
  setStatus('error')
}

watch(
  () => props.src,
  (src) => {
    resetForSource(src)
  },
  { immediate: true },
)
</script>

<template>
  <figure
    :class="imageClasses"
    :style="imageStyle"
    :aria-busy="isLoading || undefined"
    :role="isPreviewable ? 'button' : undefined"
    :tabindex="isPreviewable ? 0 : undefined"
    :aria-label="isPreviewable ? previewLabel : undefined"
    @click="handleRootClick"
    @keydown="handleRootKeydown"
  >
    <img
      v-if="hasImage"
      :key="imageKey"
      ref="imageRef"
      class="bing-image__img"
      :src="currentSrc"
      :alt="alt"
      :srcset="effectiveSrcset"
      :sizes="effectiveSizes"
      :width="widthAttr"
      :height="heightAttr"
      :loading="loading"
      :decoding="decoding"
      :fetchpriority="fetchPriority"
      :crossorigin="crossorigin"
      :referrerpolicy="referrerPolicy"
      @load="handleLoad"
      @error="handleError"
    />

    <div v-if="hasPlaceholder" class="bing-image__placeholder" aria-hidden="true">
      <slot name="placeholder">
        <img
          v-if="placeholderSrc"
          class="bing-image__placeholder-img"
          :src="placeholderSrc"
          alt=""
          loading="eager"
          decoding="async"
        />
        <span class="bing-image__skeleton"></span>
      </slot>
    </div>

    <div v-if="showLoading && isLoading" class="bing-image__loading" aria-hidden="true">
      <slot name="loading">
        <span class="bing-image__spinner"></span>
      </slot>
    </div>

    <div v-if="showError && isError" class="bing-image__error" role="img" :aria-label="errorLabel">
      <slot name="error" :src="failedSrc" :retry="retry">
        <span class="bing-image__error-mark">!</span>
        <span class="bing-image__error-text">{{ errorText }}</span>
      </slot>
    </div>

    <BingImagePreview
      v-if="preview"
      v-model="previewOpen"
      :items="previewItems"
      :initial-index="previewInitialIndex"
      :downloadable="previewDownloadable"
      @close="handlePreviewClose"
    />
  </figure>
</template>

<style scoped>
.bing-image {
  --bing-image-fit: cover;
  --bing-image-position: center;
  --bing-image-radius: var(--bing-radius-md);

  position: relative;
  display: inline-grid;
  margin: 0;
  max-width: 100%;
  min-width: 0;
  overflow: hidden;
  border-radius: var(--bing-image-radius);
  color: var(--bing-text);
  vertical-align: middle;
  background: var(--bing-surface-muted);
  isolation: isolate;
}

.bing-image:focus-visible {
  outline: 2px solid var(--bing-focus);
  outline-offset: 3px;
}

.bing-image.is-block {
  display: grid;
  width: 100%;
}

.bing-image.is-previewable {
  cursor: zoom-in;
}

.bing-image--rounded-none {
  --bing-image-radius: 0;
}

.bing-image--rounded-sm {
  --bing-image-radius: var(--bing-radius-sm);
}

.bing-image--rounded-md {
  --bing-image-radius: var(--bing-radius-md);
}

.bing-image--rounded-lg {
  --bing-image-radius: var(--bing-radius-lg);
}

.bing-image--rounded-xl {
  --bing-image-radius: 16px;
}

.bing-image--rounded-full {
  --bing-image-radius: 999px;
}

.bing-image__img,
.bing-image__placeholder,
.bing-image__loading,
.bing-image__error {
  grid-area: 1 / 1;
}

.bing-image__img {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: 100%;
  min-width: 0;
  object-fit: var(--bing-image-fit);
  object-position: var(--bing-image-position);
  opacity: 0;
  transition:
    opacity var(--bing-duration-normal) var(--bing-ease-smooth),
    filter var(--bing-duration-normal) var(--bing-ease-smooth);
}

.bing-image.is-loaded .bing-image__img {
  opacity: 1;
}

.bing-image__placeholder {
  position: relative;
  z-index: 0;
  display: grid;
  place-items: center;
  min-width: 100%;
  min-height: 100%;
  overflow: hidden;
  background: var(--bing-surface-muted);
  opacity: 1;
  transition: opacity var(--bing-duration-normal) var(--bing-ease-smooth);
}

.bing-image.is-loaded .bing-image__placeholder {
  opacity: 0;
  pointer-events: none;
}

.bing-image__placeholder-img {
  position: absolute;
  inset: 0;
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--bing-image-fit);
  object-position: var(--bing-image-position);
  opacity: 0.7;
  filter: blur(18px) saturate(1.08);
  transform: scale(1.04);
}

.bing-image__skeleton {
  position: absolute;
  inset: 0;
  display: block;
  background:
    linear-gradient(
      110deg,
      transparent 0%,
      transparent 34%,
      color-mix(in srgb, var(--bing-surface-solid) 82%, rgb(var(--bing-highlight-rgb))) 44%,
      transparent 56%,
      transparent 100%
    );
  animation: bing-image-sheen 1.25s linear infinite;
}

.bing-image__loading {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  min-width: 100%;
  min-height: 100%;
  pointer-events: none;
}

.bing-image__spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--bing-border);
  border-top-color: var(--bing-accent-strong);
  border-radius: 999px;
  box-shadow: none;
  animation: bing-image-spin 820ms linear infinite;
}

.bing-image__error {
  position: relative;
  z-index: 3;
  display: grid;
  place-items: center;
  align-content: center;
  gap: 6px;
  min-width: 100%;
  min-height: 100%;
  padding: 16px;
  color: var(--bing-danger-strong);
  text-align: center;
  background: var(--bing-surface-muted);
}

.bing-image__error-mark {
  display: grid;
  width: 24px;
  height: 24px;
  place-items: center;
  border: 1px solid rgb(var(--bing-danger-rgb) / 0.24);
  border-radius: 999px;
  background: transparent;
  font-size: 14px;
  font-weight: 500;
  line-height: 1;
}

.bing-image__error-text {
  max-width: 18rem;
  overflow-wrap: anywhere;
  color: var(--bing-danger-strong);
  font-size: 13px;
  font-weight: 400;
  line-height: 20px;
}

@keyframes bing-image-spin {
  to {
    transform: rotate(1turn);
  }
}

@keyframes bing-image-sheen {
  from {
    transform: translateX(-100%);
  }

  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-image__img,
  .bing-image__placeholder,
  .bing-image__skeleton,
  .bing-image__spinner {
    animation: none;
    transition: none;
  }
}
</style>
