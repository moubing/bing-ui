<script setup lang="ts">
import { useConfigZIndex } from '../../utils/config'
import { useClientReady } from '../../utils/useClientReady'
import { createScrollLock } from '../../utils/scrollLock'
import { useOverlay } from '../../utils/overlay'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import {
  Download,
  ExternalLink,
  File,
  FileBraces,
  FileImage,
  FileQuestionMark,
  FileSpreadsheet,
  FileText,
  FileType,
  LoaderCircle,
  Presentation,
  X,
} from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingImagePreview from '../BingImagePreview/BingImagePreview.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import {
  createGlassCssVariables,
  defaultGlassEffect,
} from '../../utils/glass'
import type { BingImagePreviewItem } from '../BingImagePreview/BingImagePreview.types'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import type {
  BingFilePreviewCloseReason,
  BingFilePreviewEmits,
  BingFilePreviewFile,
  BingFilePreviewProps,
  BingFilePreviewResolvedKind,
} from './BingFilePreview.types'

const FILE_PREVIEW_EXIT_DURATION = 180

const props = withDefaults(defineProps<BingFilePreviewProps>(), {
  modelValue: false,
  file: undefined,
  src: undefined,
  name: undefined,
  type: 'auto',
  mimeType: undefined,
  previewSrc: undefined,
  content: undefined,
  downloadUrl: undefined,
  size: undefined,
  width: 'min(1120px, calc(100vw - 36px))',
  height: 'min(760px, calc(100vh - 36px))',
  smoothScroll: true,
  lockScroll: true,
  closeOnEsc: true,
  closeOnOverlay: true,
  downloadable: true,
  openable: true,
  jsonHighlight: true,
  jsonHighlightMaxLength: 3_500_000,
  textMaxLength: 240_000,
  csvMaxRows: 80,
  csvMaxColumns: 24,
  teleportTo: 'body',
  ariaLabel: '文件预览',
  glass: defaultGlassEffect.glass,
  glassBlur: undefined,
  glassOpacity: undefined,
  glassSaturation: undefined,
})

const emit = defineEmits<BingFilePreviewEmits>()
const resolvedZIndex = useConfigZIndex('filePreview', () => props.zIndex)
const clientReady = useClientReady()

const rootRef = ref<HTMLElement | null>(null)
const contentScrollRef = ref<BingScrollbarExpose | null>(null)
const shouldRender = ref(props.modelValue)
const isActive = ref(false)
const textStatus = ref<'idle' | 'loading' | 'loaded' | 'error'>('idle')
const textContent = ref('')
const textError = ref('')

let animationFrame = 0
let unmountTimer: number | undefined
let activeRequestId = 0

const resolvedFile = computed<BingFilePreviewFile | undefined>(() => {
  if (props.file) {
    return {
      ...props.file,
      type: props.file.type ?? props.type,
      mimeType: props.file.mimeType ?? props.mimeType,
      previewSrc: props.file.previewSrc ?? props.previewSrc,
      content: props.file.content ?? props.content,
      downloadUrl: props.file.downloadUrl ?? props.downloadUrl,
      size: props.file.size ?? props.size,
    }
  }

  if (!props.src && !props.content) {
    return undefined
  }

  return {
    src: props.src ?? '',
    name: props.name,
    type: props.type,
    mimeType: props.mimeType,
    previewSrc: props.previewSrc,
    content: props.content,
    downloadUrl: props.downloadUrl,
    size: props.size,
  }
})

const fileName = computed(() => resolvedFile.value?.name || getNameFromUrl(resolvedFile.value?.src) || '未命名文件')
const resolvedKind = computed<BingFilePreviewResolvedKind>(() => resolveKind(resolvedFile.value))
const renderSrc = computed(() => resolvedFile.value?.previewSrc || resolvedFile.value?.src || '')
const downloadHref = computed(() => resolvedFile.value?.downloadUrl || resolvedFile.value?.src || renderSrc.value)
const hasFile = computed(() => Boolean(resolvedFile.value))
const isTextLike = computed(() => ['text', 'json', 'csv'].includes(resolvedKind.value))
const hasEmbeddedPreview = computed(() => ['pdf'].includes(resolvedKind.value) || hasOfficePreview.value)
const hasOfficePreview = computed(
  () => ['docx', 'xlsx', 'pptx', 'office'].includes(resolvedKind.value) && Boolean(resolvedFile.value?.previewSrc),
)
const isOfficeLike = computed(() => ['docx', 'xlsx', 'pptx', 'office'].includes(resolvedKind.value))
const shouldShowTextLoader = computed(() => isTextLike.value && textStatus.value === 'loading')
const shouldShowTextError = computed(() => isTextLike.value && textStatus.value === 'error')
const previewTitle = computed(() => `${fileName.value} 预览`)

const rootClasses = computed(() => [
  'bing-file-preview-root',
  `bing-file-preview-root--${resolvedKind.value}`,
  {
    'is-active': isActive.value,
  },
])

const overlay = useOverlay({
  open: () => clientReady.value && shouldRender.value && resolvedKind.value !== 'image',
  elements: () => [rootRef.value],
  zIndex: () => resolvedZIndex.value,
  modal: true,
  closeOnEscape: () => props.modelValue && props.closeOnEsc,
  onEscape: () => closePreview('escape'),
})

const rootStyle = computed(() => ({
  ...createGlassCssVariables('bing-file-preview', {
    glass: props.glass,
    glassBlur: props.glassBlur,
    glassOpacity: props.glassOpacity,
    glassSaturation: props.glassSaturation,
  }),
  zIndex: overlay.zIndex.value,
}))

const panelStyle = computed(() => ({
  width: normalizeCssSize(props.width),
  height: normalizeCssSize(props.height),
}))

const imageItems = computed<BingImagePreviewItem[]>(() => {
  const file = resolvedFile.value

  if (!file) {
    return []
  }

  const src = file.src || file.previewSrc

  if (!src) {
    return []
  }

  return [
    {
      src,
      previewSrc: file.previewSrc || src,
      alt: file.name || '',
      downloadUrl: file.downloadUrl || src,
      downloadName: file.name,
      caption: file.name,
    },
  ]
})

const fileIcon = computed(() => {
  switch (resolvedKind.value) {
    case 'image':
      return FileImage
    case 'pdf':
      return FileType
    case 'text':
      return FileText
    case 'json':
      return FileBraces
    case 'csv':
    case 'xlsx':
      return FileSpreadsheet
    case 'pptx':
      return Presentation
    case 'docx':
      return FileText
    default:
      return resolvedKind.value === 'unknown' ? FileQuestionMark : File
  }
})

const iconBadge = computed(() => {
  switch (resolvedKind.value) {
    case 'image':
      return 'IMG'
    case 'pdf':
      return 'PDF'
    case 'text':
      return 'TXT'
    case 'json':
      return 'JSON'
    case 'csv':
      return 'CSV'
    case 'docx':
      return 'DOC'
    case 'xlsx':
      return 'XLS'
    case 'pptx':
      return 'PPT'
    case 'office':
      return '文档'
    default:
      return '文件'
  }
})

const kindLabel = computed(() => {
  switch (resolvedKind.value) {
    case 'image':
      return '图片'
    case 'pdf':
      return 'PDF'
    case 'text':
      return '文本'
    case 'json':
      return 'JSON'
    case 'csv':
      return 'CSV'
    case 'docx':
      return 'Word 文档'
    case 'xlsx':
      return '电子表格'
    case 'pptx':
      return '演示文稿'
    case 'office':
      return 'Office 文档'
    default:
      return '文件'
  }
})

const formattedSize = computed(() => {
  const size = resolvedFile.value?.size

  if (!size || size <= 0) {
    return undefined
  }

  const units = ['B', 'KB', 'MB', 'GB']
  let value = size
  let index = 0

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }

  return `${value.toFixed(index === 0 ? 0 : 1)} ${units[index]}`
})

const textPreview = computed(() => {
  if (resolvedKind.value !== 'json') {
    return textContent.value
  }

  try {
    return JSON.stringify(JSON.parse(textContent.value), null, 2)
  } catch {
    return textContent.value
  }
})

const highlightedJsonPreview = computed(() => {
  if (
    resolvedKind.value !== 'json' ||
    !props.jsonHighlight ||
    textPreview.value.length > props.jsonHighlightMaxLength
  ) {
    return escapeHtml(textPreview.value)
  }

  return highlightJson(textPreview.value)
})

const csvRows = computed(() => {
  if (resolvedKind.value !== 'csv') {
    return []
  }

  return parseCsv(textContent.value)
    .slice(0, props.csvMaxRows)
    .map((row) => row.slice(0, props.csvMaxColumns))
})

const csvHeader = computed(() => csvRows.value[0] ?? [])
const csvBody = computed(() => csvRows.value.slice(1))

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined'
}

function normalizeCssSize(value: number | string) {
  return typeof value === 'number' ? `${value}px` : value
}

function getNameFromUrl(src: string | undefined) {
  if (!src) {
    return undefined
  }

  try {
    const url = new URL(src, isBrowser() ? window.location.href : 'http://localhost')
    const segment = url.pathname.split('/').filter(Boolean).pop()
    return segment ? decodeURIComponent(segment) : undefined
  } catch {
    return src.split('/').filter(Boolean).pop()
  }
}

function getExtension(nameOrSrc: string | undefined) {
  const value = nameOrSrc?.split(/[?#]/)[0]
  const match = value?.match(/\.([a-zA-Z0-9]+)$/)
  return match?.[1]?.toLowerCase()
}

function resolveKind(file: BingFilePreviewFile | undefined): BingFilePreviewResolvedKind {
  if (!file) {
    return 'unknown'
  }

  if (file.type && file.type !== 'auto') {
    return file.type === 'office' ? 'office' : file.type
  }

  const mime = file.mimeType?.toLowerCase() ?? ''
  const extension = getExtension(file.name) || getExtension(file.src)

  if (mime.startsWith('image/')) {
    return 'image'
  }

  if (mime === 'application/pdf' || extension === 'pdf') {
    return 'pdf'
  }

  if (mime.includes('json') || extension === 'json') {
    return 'json'
  }

  if (mime.includes('csv') || extension === 'csv') {
    return 'csv'
  }

  if (mime.startsWith('text/') || ['txt', 'md', 'log', 'xml', 'html', 'css', 'js', 'ts'].includes(extension ?? '')) {
    return 'text'
  }

  if (extension === 'docx' || mime.includes('wordprocessingml')) {
    return 'docx'
  }

  if (extension === 'xlsx' || mime.includes('spreadsheetml')) {
    return 'xlsx'
  }

  if (extension === 'pptx' || mime.includes('presentationml')) {
    return 'pptx'
  }

  return 'unknown'
}

const { lock: lockBodyScroll, unlock: unlockBodyScroll } = createScrollLock()

function closePreview(reason: BingFilePreviewCloseReason) {
  contentScrollRef.value?.stop()
  emit('update:modelValue', false)
  emit('close', reason)
}

function handleOverlayClick() {
  if (props.closeOnOverlay) {
    closePreview('overlay')
  }
}

function handleImagePreviewClose(reason: BingFilePreviewCloseReason) {
  closePreview(reason)
}

function handleDownload() {
  const file = resolvedFile.value

  if (!file) {
    return
  }

  emit('download', {
    file,
    kind: resolvedKind.value,
  })

  if (!isBrowser() || !downloadHref.value) {
    return
  }

  const link = document.createElement('a')
  link.href = downloadHref.value
  link.download = file.name || ''
  link.rel = 'noopener'
  document.body.appendChild(link)
  link.click()
  link.remove()
}

function handleOpenExternal() {
  const file = resolvedFile.value

  if (!file || !isBrowser()) {
    return
  }

  emit('openExternal', {
    file,
    kind: resolvedKind.value,
  })

  window.open(renderSrc.value || file.src, '_blank', 'noopener,noreferrer')
}

function clearRenderTimers() {
  if (!isBrowser()) {
    return
  }

  if (animationFrame) {
    window.cancelAnimationFrame(animationFrame)
    animationFrame = 0
  }

  if (unmountTimer) {
    window.clearTimeout(unmountTimer)
    unmountTimer = undefined
  }
}

async function syncRenderedState(open: boolean) {
  if (resolvedKind.value === 'image') {
    shouldRender.value = open
    isActive.value = open
    return
  }

  if (!isBrowser()) {
    shouldRender.value = open
    isActive.value = open
    return
  }

  clearRenderTimers()

  if (open) {

    if (props.lockScroll) {
      lockBodyScroll()
    }

    shouldRender.value = true
    isActive.value = false
    await nextTick()
    if (overlay.isTop()) rootRef.value?.focus()
    animationFrame = window.requestAnimationFrame(() => {
      animationFrame = 0
      isActive.value = true
    })
    return
  }

  isActive.value = false
  unmountTimer = window.setTimeout(() => {
    unmountTimer = undefined
    shouldRender.value = false
    unlockBodyScroll()
  }, FILE_PREVIEW_EXIT_DURATION)
}

async function loadTextContent() {
  const requestId = ++activeRequestId
  const file = resolvedFile.value

  if (!props.modelValue || !file || !isTextLike.value) {
    textStatus.value = 'idle'
    textContent.value = ''
    textError.value = ''
    return
  }

  if (file.content !== undefined) {
    textContent.value = truncateText(file.content)
    textStatus.value = 'loaded'
    textError.value = ''
    return
  }

  if (!file.src) {
    textStatus.value = 'error'
    textError.value = '未提供文件地址'
    return
  }

  textStatus.value = 'loading'
  textError.value = ''

  try {
    const response = await fetch(file.src)

    if (!response.ok) {
      throw new Error(`文件请求失败（${response.status}）`)
    }

    const text = await response.text()

    if (requestId !== activeRequestId) {
      return
    }

    textContent.value = truncateText(text)
    textStatus.value = 'loaded'
  } catch (error) {
    if (requestId !== activeRequestId) {
      return
    }

    const normalizedError = error instanceof Error ? error : new Error('文件加载失败')
    textStatus.value = 'error'
    textError.value = '文件加载失败，请重试或下载后查看。'
    emit('error', normalizedError)
  }
}

function truncateText(value: string) {
  if (value.length <= props.textMaxLength) {
    return value
  }

  return `${value.slice(0, props.textMaxLength)}\n\n…内容已截断`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function highlightJson(value: string) {
  const tokenPattern =
    /("(?:\\.|[^"\\])*"(?=\s*:))|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g
  let cursor = 0
  let html = ''

  for (const match of value.matchAll(tokenPattern)) {
    const index = match.index ?? 0
    const token = match[0]

    html += escapeHtml(value.slice(cursor, index))
    html += `<span class="${getJsonTokenClass(match)}">${escapeHtml(token)}</span>`
    cursor = index + token.length
  }

  html += escapeHtml(value.slice(cursor))

  return html
}

function getJsonTokenClass(match: RegExpMatchArray) {
  if (match[1]) {
    return 'bing-file-preview__json-token bing-file-preview__json-token--key'
  }

  if (match[2]) {
    return 'bing-file-preview__json-token bing-file-preview__json-token--string'
  }

  if (match[3]) {
    return `bing-file-preview__json-token bing-file-preview__json-token--${match[3]}`
  }

  return 'bing-file-preview__json-token bing-file-preview__json-token--number'
}

function parseCsv(value: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const nextChar = value[index + 1]

    if (char === '"' && quoted && nextChar === '"') {
      cell += '"'
      index += 1
      continue
    }

    if (char === '"') {
      quoted = !quoted
      continue
    }

    if (char === ',' && !quoted) {
      row.push(cell)
      cell = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && nextChar === '\n') {
        index += 1
      }

      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
      continue
    }

    cell += char
  }

  row.push(cell)
  rows.push(row)

  return rows.filter((csvRow) => csvRow.some((csvCell) => csvCell.length > 0))
}

watch([clientReady, () => props.modelValue], ([ready, open]) => {
  if (ready) void syncRenderedState(open)
}, { immediate: true })
watch(() => props.modelValue, (open) => {
  if (!open) {
    contentScrollRef.value?.stop()
  }
})
watch(
  () => [clientReady.value, props.modelValue, resolvedKind.value, resolvedFile.value?.src, resolvedFile.value?.content],
  () => { if (clientReady.value) void loadTextContent() },
  { immediate: true },
)

onBeforeUnmount(() => {
  contentScrollRef.value?.stop()
  clearRenderTimers()
  unlockBodyScroll()
})
</script>

<template>
  <BingImagePreview
    v-if="resolvedKind === 'image'"
    :model-value="modelValue"
    :items="imageItems"
    :downloadable="downloadable"
    :z-index="resolvedZIndex"
    :lock-scroll="lockScroll"
    :close-on-esc="closeOnEsc"
    :close-on-overlay="closeOnOverlay"
    :glass="glass"
    :glass-blur="glassBlur"
    :glass-opacity="glassOpacity"
    :glass-saturation="glassSaturation"
    @update:model-value="emit('update:modelValue', $event)"
    @close="handleImagePreviewClose"
  />

  <Teleport v-else-if="clientReady" :to="teleportTo">
    <div
      v-if="shouldRender"
      ref="rootRef"
      :class="rootClasses"
      :style="rootStyle"
      tabindex="-1"
      role="dialog"
      aria-modal="true"
      :aria-label="ariaLabel"
    >
      <div class="bing-file-preview__backdrop" aria-hidden="true" @click="handleOverlayClick"></div>

      <section class="bing-file-preview" :style="panelStyle">
        <header class="bing-file-preview__header">
          <div class="bing-file-preview__identity">
            <span class="bing-file-preview__icon" aria-hidden="true">
              <BingIcon :icon="fileIcon" size="md" />
              <span class="bing-file-preview__icon-badge">{{ iconBadge }}</span>
            </span>
            <div class="bing-file-preview__heading">
              <h2 class="bing-file-preview__title">{{ fileName }}</h2>
              <div class="bing-file-preview__meta">
                <span>{{ kindLabel }}</span>
                <span v-if="formattedSize">{{ formattedSize }}</span>
              </div>
            </div>
          </div>

          <div class="bing-file-preview__actions">
            <BingButton :throttle="false"
              v-if="openable && renderSrc"
              variant="ghost"
              size="sm"
              aria-label="在新标签页打开文件"
              @click="handleOpenExternal"
            >
              <template #prefix>
                <BingIcon :icon="ExternalLink" size="sm" />
              </template>
            </BingButton>
            <BingButton :throttle="false"
              v-if="downloadable && downloadHref"
              variant="ghost"
              size="sm"
              aria-label="下载文件"
              @click="handleDownload"
            >
              <template #prefix>
                <BingIcon :icon="Download" size="sm" />
              </template>
            </BingButton>
            <BingButton :throttle="false"
              variant="ghost"
              size="sm"
              aria-label="关闭文件预览"
              @click="closePreview('close')"
            >
              <template #prefix>
                <BingIcon :icon="X" size="sm" />
              </template>
            </BingButton>
          </div>
        </header>

        <div class="bing-file-preview__body">
          <div v-if="!hasFile" class="bing-file-preview__fallback">
            <span class="bing-file-preview__fallback-icon" aria-hidden="true">
              <BingIcon :icon="File" size="xl" />
            </span>
            <h3>未选择文件</h3>
          </div>

          <iframe
            v-else-if="resolvedKind === 'pdf' || hasEmbeddedPreview"
            class="bing-file-preview__frame"
            :src="renderSrc"
            :title="previewTitle"
          ></iframe>

          <div v-else-if="resolvedKind === 'csv'" class="bing-file-preview__table-wrap">
            <div v-if="shouldShowTextLoader" class="bing-file-preview__loader">
              <BingIcon :icon="LoaderCircle" size="md" />
              <span>正在加载文件</span>
            </div>
            <div v-else-if="shouldShowTextError" class="bing-file-preview__fallback">
              <h3>CSV 文件加载失败</h3>
              <p>{{ textError }}</p>
            </div>
            <BingScrollbar
              v-else
              ref="contentScrollRef"
              class="bing-file-preview__scroll"
              height="100%"
              :smooth="smoothScroll"
              horizontal
              always
              aria-label="CSV 预览内容"
            >
              <div class="bing-file-preview__table-scroll">
                <table class="bing-file-preview__table">
                  <thead>
                    <tr>
                      <th v-for="(cell, index) in csvHeader" :key="`head-${index}`">
                        {{ cell || `第 ${index + 1} 列` }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, rowIndex) in csvBody" :key="`row-${rowIndex}`">
                      <td v-for="(cell, cellIndex) in row" :key="`cell-${rowIndex}-${cellIndex}`">
                        {{ cell }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </BingScrollbar>
          </div>

          <div v-else-if="resolvedKind === 'text' || resolvedKind === 'json'" class="bing-file-preview__text-wrap">
            <div v-if="shouldShowTextLoader" class="bing-file-preview__loader">
              <BingIcon :icon="LoaderCircle" size="md" />
              <span>正在加载文件</span>
            </div>
            <div v-else-if="shouldShowTextError" class="bing-file-preview__fallback">
              <h3>文本加载失败</h3>
              <p>{{ textError }}</p>
            </div>
            <BingScrollbar
              v-else
              ref="contentScrollRef"
              class="bing-file-preview__scroll"
              height="100%"
              :smooth="smoothScroll"
              always
              aria-label="文本预览内容"
            >
              <pre
                v-if="resolvedKind === 'json'"
                class="bing-file-preview__text bing-file-preview__text--json"
                v-html="highlightedJsonPreview"
              ></pre>
              <pre v-else class="bing-file-preview__text">{{ textPreview }}</pre>
            </BingScrollbar>
          </div>

          <div v-else-if="isOfficeLike" class="bing-file-preview__fallback">
            <span class="bing-file-preview__fallback-icon" aria-hidden="true">
              <BingIcon :icon="fileIcon" size="xl" />
              <span class="bing-file-preview__icon-badge">{{ iconBadge }}</span>
            </span>
            <h3>暂不支持直接预览此文档</h3>
            <p>
              此文档暂时无法在线预览，可在新标签页打开或下载后查看。
            </p>
            <div class="bing-file-preview__fallback-actions">
              <BingButton :throttle="false" v-if="openable && renderSrc" variant="secondary" @click="handleOpenExternal">
                <template #prefix>
                  <BingIcon :icon="ExternalLink" size="sm" />
                </template>
                打开
              </BingButton>
              <BingButton :throttle="false" v-if="downloadable && downloadHref" variant="primary" @click="handleDownload">
                <template #prefix>
                  <BingIcon :icon="Download" size="sm" />
                </template>
                下载
              </BingButton>
            </div>
          </div>

          <div v-else class="bing-file-preview__fallback">
            <span class="bing-file-preview__fallback-icon" aria-hidden="true">
              <BingIcon :icon="File" size="xl" />
            </span>
            <h3>暂不支持此文件预览</h3>
            <p>请下载文件后查看。</p>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<style scoped>
.bing-file-preview-root {
  --bing-file-preview-paper-canvas: #ffffff;
  --bing-file-preview-paper-surface: #f8fafc;
  --bing-file-preview-paper-text: #111827;
  --bing-file-preview-paper-muted: #334155;
  --bing-file-preview-paper-border: rgb(17 24 39 / 0.1);
  --bing-file-preview-paper-syntax-key: #7c3aed;
  --bing-file-preview-paper-syntax-string: #047857;
  --bing-file-preview-paper-syntax-number: #2563eb;
  --bing-file-preview-paper-syntax-boolean: #c2410c;
  --bing-file-preview-paper-syntax-null: #64748b;
  --bing-file-preview-paper-scrollbar-rail: rgb(17 24 39 / 0.075);
  --bing-file-preview-paper-scrollbar-thumb: rgb(17 24 39 / 0.3);
  --bing-file-preview-paper-scrollbar-thumb-hover: rgb(17 24 39 / 0.45);
  --bing-file-preview-paper-scrollbar-shadow: none;
  --bing-file-preview-paper-scrollbar-hover-shadow: none;

  position: fixed;
  inset: 0;
  box-sizing: border-box;
  font-size: 13px;
  font-weight: 400;
  line-height: 1.5;
  display: grid;
  place-items: center;
  padding: 18px;
  color: var(--bing-text);
  opacity: 0;
  outline: none;
  pointer-events: none;
  transition: opacity 180ms var(--bing-ease-smooth);
}

.bing-file-preview-root.is-active {
  opacity: 1;
  pointer-events: auto;
}

.bing-file-preview-root--image {
  --bing-file-preview-icon-color: var(--bing-secondary-strong);
  --bing-file-preview-icon-bg: var(--bing-secondary-soft);
  --bing-file-preview-icon-border: rgb(var(--bing-secondary-rgb) / 0.24);
}

.bing-file-preview-root--pdf {
  --bing-file-preview-icon-color: var(--bing-danger-strong);
  --bing-file-preview-icon-bg: var(--bing-danger-soft);
  --bing-file-preview-icon-border: rgb(var(--bing-danger-rgb) / 0.24);
}

.bing-file-preview-root--text,
.bing-file-preview-root--docx {
  --bing-file-preview-icon-color: var(--bing-secondary-strong);
  --bing-file-preview-icon-bg: var(--bing-secondary-soft);
  --bing-file-preview-icon-border: rgb(var(--bing-secondary-rgb) / 0.24);
}

.bing-file-preview-root--json {
  --bing-file-preview-icon-color: color-mix(in srgb, rgb(124 58 237) 72%, var(--bing-heading));
  --bing-file-preview-icon-bg: rgb(124 58 237 / 0.14);
  --bing-file-preview-icon-border: rgb(124 58 237 / 0.24);
}

.bing-file-preview-root--csv,
.bing-file-preview-root--xlsx {
  --bing-file-preview-icon-color: var(--bing-success-strong);
  --bing-file-preview-icon-bg: var(--bing-success-soft);
  --bing-file-preview-icon-border: rgb(var(--bing-success-rgb) / 0.22);
}

.bing-file-preview-root--pptx {
  --bing-file-preview-icon-color: var(--bing-warning-strong);
  --bing-file-preview-icon-bg: var(--bing-warning-soft);
  --bing-file-preview-icon-border: rgb(var(--bing-warning-rgb) / 0.26);
}

.bing-file-preview__backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgb(var(--bing-shadow-rgb) / var(--bing-file-preview-glass-opacity, 0.82));
  backdrop-filter: blur(var(--bing-file-preview-glass-blur, 16px))
    saturate(var(--bing-file-preview-glass-saturation, 1.05));
  -webkit-backdrop-filter: blur(var(--bing-file-preview-glass-blur, 16px))
    saturate(var(--bing-file-preview-glass-saturation, 1.05));
}

.bing-file-preview {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr);
  box-sizing: border-box;
  max-width: 100%;
  max-height: 100%;
  overflow: hidden;
  border: 1px solid var(--bing-popover-border);
  border-radius: var(--bing-radius-popover);
  background: var(--bing-surface-solid);
  box-shadow: var(--bing-popover-shadow);
  transform: translateY(10px) scale(0.985);
  transition: transform 180ms var(--bing-ease-smooth);
}

.bing-file-preview-root.is-active .bing-file-preview {
  transform: translateY(0) scale(1);
}

.bing-file-preview__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid var(--bing-border);
  background: var(--bing-surface-soft);
}

.bing-file-preview__identity {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
}

.bing-file-preview__icon,
.bing-file-preview__fallback-icon {
  position: relative;
  display: inline-grid;
  place-items: center;
  border: 1px solid var(--bing-file-preview-icon-border, rgb(var(--bing-accent-rgb) / 0.2));
  box-sizing: border-box;
  border-radius: var(--bing-radius-md);
  background: var(--bing-file-preview-icon-bg, var(--bing-surface-soft));
  color: var(--bing-file-preview-icon-color, var(--bing-accent-strong));
}

.bing-file-preview__icon {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
}

.bing-file-preview__icon-badge {
  position: absolute;
  right: -5px;
  bottom: -4px;
  min-width: 18px;
  max-width: 36px;
  padding: 1px 3px;
  overflow: hidden;
  border: 1px solid rgb(var(--bing-highlight-rgb) / 0.58);
  border-radius: 3px;
  background: var(--bing-file-preview-icon-color, var(--bing-accent-strong));
  color: var(--bing-accent-contrast);
  font-size: 0.5rem;
  font-weight: 500;
  line-height: 1;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-file-preview__heading {
  min-width: 0;
}

.bing-file-preview__title {
  max-width: min(52vw, 620px);
  margin: 0;
  overflow: hidden;
  color: var(--bing-heading);
  font-size: 14px;
  font-weight: 500;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-file-preview__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 3px;
  color: var(--bing-muted);
  font-size: 12px;
  font-weight: 400;
}

.bing-file-preview__actions,
.bing-file-preview__fallback-actions {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}

.bing-file-preview__body {
  position: relative;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  background: var(--bing-surface-solid);
}

.bing-file-preview__frame {
  display: block;
  width: 100%;
  height: 100%;
  border: 0;
  background: var(--bing-file-preview-paper-canvas);
  color-scheme: light;
}

.bing-file-preview__text-wrap,
.bing-file-preview__table-wrap {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--bing-file-preview-paper-canvas);
  color-scheme: light;
}

.bing-file-preview__scroll {
  width: 100%;
  height: 100%;
  background: var(--bing-file-preview-paper-canvas);
  color-scheme: light;
}

.bing-file-preview__scroll :deep(.bing-scrollbar__rail) {
  background: var(--bing-file-preview-paper-scrollbar-rail);
}

.bing-file-preview__scroll :deep(.bing-scrollbar__thumb) {
  background: var(--bing-file-preview-paper-scrollbar-thumb);
  box-shadow: var(--bing-file-preview-paper-scrollbar-shadow);
}

.bing-file-preview__scroll :deep(.bing-scrollbar__thumb:hover),
.bing-file-preview__scroll.is-dragging :deep(.bing-scrollbar__thumb) {
  background: var(--bing-file-preview-paper-scrollbar-thumb-hover);
  box-shadow: var(--bing-file-preview-paper-scrollbar-hover-shadow);
}

.bing-file-preview__text {
  min-width: 100%;
  min-height: 100%;
  box-sizing: border-box;
  margin: 0;
  padding: 16px;
  color: var(--bing-file-preview-paper-text);
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    monospace;
  font-size: 13px;
  line-height: 1.65;
  white-space: pre-wrap;
}

.bing-file-preview__text--json {
  color: var(--bing-file-preview-paper-muted);
}

.bing-file-preview__text--json :deep(.bing-file-preview__json-token--key) {
  color: var(--bing-file-preview-paper-syntax-key);
  font-weight: 500;
}

.bing-file-preview__text--json :deep(.bing-file-preview__json-token--string) {
  color: var(--bing-file-preview-paper-syntax-string);
}

.bing-file-preview__text--json :deep(.bing-file-preview__json-token--number) {
  color: var(--bing-file-preview-paper-syntax-number);
}

.bing-file-preview__text--json :deep(.bing-file-preview__json-token--true),
.bing-file-preview__text--json :deep(.bing-file-preview__json-token--false) {
  color: var(--bing-file-preview-paper-syntax-boolean);
  font-weight: 500;
}

.bing-file-preview__text--json :deep(.bing-file-preview__json-token--null) {
  color: var(--bing-file-preview-paper-syntax-null);
  font-style: italic;
}

.bing-file-preview__table-scroll {
  min-width: 100%;
}

.bing-file-preview__table {
  width: 100%;
  min-width: 640px;
  border-collapse: collapse;
  background: var(--bing-file-preview-paper-canvas);
  color: var(--bing-file-preview-paper-text);
  font-size: 13px;
}

.bing-file-preview__table th,
.bing-file-preview__table td {
  max-width: 280px;
  padding: 8px 10px;
  border: 1px solid var(--bing-file-preview-paper-border);
  overflow: hidden;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-file-preview__table th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--bing-file-preview-paper-surface);
  color: var(--bing-file-preview-paper-text);
  font-weight: 500;
}

.bing-file-preview__loader,
.bing-file-preview__fallback {
  display: grid;
  min-height: 100%;
  place-items: center;
  align-content: center;
  gap: 12px;
  padding: 24px;
  box-sizing: border-box;
  background: var(--bing-surface-solid);
  color: var(--bing-muted);
  text-align: center;
}

.bing-file-preview__loader :deep(svg) {
  animation: bing-file-preview-spin 760ms linear infinite;
}

.bing-file-preview__fallback-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--bing-radius-md);
}

.bing-file-preview__fallback h3 {
  margin: 0;
  color: var(--bing-heading);
  font-size: 16px;
  font-weight: 500;
  line-height: 1.3;
}

.bing-file-preview__fallback p {
  max-width: 560px;
  margin: 0;
  color: var(--bing-muted);
  font-size: 14px;
  line-height: 1.6;
}

.bing-file-preview__fallback-actions {
  margin-top: 4px;
  flex-wrap: wrap;
  justify-content: center;
}

@keyframes bing-file-preview-spin {
  to {
    transform: rotate(1turn);
  }
}

@media (max-width: 680px) {
  .bing-file-preview-root {
    padding: 10px;
  }

  .bing-file-preview {
    width: 100% !important;
    height: calc(100vh - 20px) !important;
    border-radius: var(--bing-radius-popover);
  }

  .bing-file-preview__header {
    align-items: flex-start;
    flex-direction: column;
  }

  .bing-file-preview__actions {
    width: 100%;
    justify-content: flex-end;
  }

  .bing-file-preview__title {
    max-width: calc(100vw - 112px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .bing-file-preview-root,
  .bing-file-preview,
  .bing-file-preview__loader :deep(svg) {
    animation: none;
    transition: none;
  }
}
</style>
