<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { Check, Copy } from '../../icons'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingResizable from '../BingResizable/BingResizable.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import { highlightCode } from './BingCodeBlock.highlight'
import { resolveCodeTheme } from './BingCodeBlock.languages'
import { writeTextWithClipboardApi, writeTextWithTextareaFallback } from '../../utils/clipboard'
import type { BingCodeBlockLine, BingCodeBlockToken } from './BingCodeBlock.highlight'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import type { BingResizableDirection } from '../BingResizable/BingResizable.types'
import type {
  BingCodeBlockEmits,
  BingCodeBlockHighlightLine,
  BingCodeBlockProps,
} from './BingCodeBlock.types'

type HighlightStatus = 'idle' | 'loading' | 'ready' | 'error'

const FONT_STYLE_ITALIC = 1
const FONT_STYLE_BOLD = 2
const FONT_STYLE_UNDERLINE = 4
const defaultResizableDirections: BingResizableDirection[] = [
  'right',
  'bottom',
  'bottom-right',
]

const props = withDefaults(defineProps<BingCodeBlockProps>(), {
  language: 'text',
  theme: 'auto',
  title: undefined,
  languageLabel: undefined,
  copyable: true,
  copyLabel: '复制代码',
  copiedLabel: '已复制',
  copyResetDelay: 1600,
  lineNumbers: true,
  highlightLines: undefined,
  width: undefined,
  maxHeight: undefined,
  smoothScroll: true,
  resizable: false,
  resizableOptions: undefined,
  wrap: false,
  ariaLabel: '代码块',
})

const emit = defineEmits<BingCodeBlockEmits>()

const lines = ref<BingCodeBlockLine[]>(toPlainLines(props.code))
const highlightStatus = ref<HighlightStatus>('idle')
const isCopied = ref(false)
const scrollbarRef = ref<BingScrollbarExpose | null>(null)

let highlightRequestId = 0
let copyResetTimer: number | undefined
let themeObserver: MutationObserver | undefined
let colorSchemeQuery: MediaQueryList | undefined

const resolvedLanguage = computed(() => props.language.trim() || 'text')
const resolvedAutomaticTheme = ref(resolveAutomaticTheme())
const resolvedCodeTheme = computed(() => {
  const configuredTheme = typeof props.theme === 'string' ? props.theme.trim() : ''

  return configuredTheme && configuredTheme !== 'auto'
    ? configuredTheme
    : resolvedAutomaticTheme.value
})
const resolvedLanguageLabel = computed(
  () => props.languageLabel || (resolvedLanguage.value === 'text' ? '纯文本' : resolvedLanguage.value.toUpperCase()),
)

const rootClasses = computed(() => [
  'bing-code-block',
  {
    'is-loading': highlightStatus.value === 'loading',
    'is-error': highlightStatus.value === 'error',
    'is-ready': highlightStatus.value === 'ready',
    'is-wrapped': props.wrap,
    'has-line-numbers': props.lineNumbers,
  },
])

const codeViewportStyle = computed<CSSProperties>(() => ({
  maxHeight: normalizeCssSize(props.maxHeight),
}))

const rootStyle = computed<CSSProperties>(() => ({
  width: props.resizable ? '100%' : normalizeCssSize(props.width),
  height: props.resizable ? '100%' : undefined,
}))

const scrollbarHeight = computed(() => (props.resizable ? '100%' : undefined))

const resolvedResizableDefaultSize = computed(() => ({
  width: props.resizableOptions?.defaultSize?.width ?? props.width ?? 640,
  height: props.resizableOptions?.defaultSize?.height ?? 360,
}))

const resolvedResizableDirections = computed<BingResizableDirection[]>(
  () => props.resizableOptions?.directions ?? defaultResizableDirections,
)

const resolvedResizableAriaLabel = computed(
  () => props.resizableOptions?.ariaLabel ?? `${props.ariaLabel}尺寸调整`,
)

const highlightedLineNumbers = computed(() => normalizeHighlightLines(props.highlightLines))

const hasHeader = computed(
  () => Boolean(props.title || resolvedLanguageLabel.value || props.copyable),
)

const copyButtonLabel = computed(() => (isCopied.value ? props.copiedLabel : props.copyLabel))
const copyButtonIcon = computed(() => (isCopied.value ? Check : Copy))

watch(
  () => [props.code, resolvedLanguage.value, resolvedCodeTheme.value] as const,
  () => {
    void updateHighlightedLines()
  },
  { immediate: true },
)

onMounted(() => {
  syncAutomaticTheme()

  themeObserver = new MutationObserver(syncAutomaticTheme)
  themeObserver.observe(document.documentElement, {
    attributeFilter: ['data-bing-theme'],
    attributes: true,
  })

  colorSchemeQuery = window.matchMedia?.('(prefers-color-scheme: dark)')
  colorSchemeQuery?.addEventListener?.('change', syncAutomaticTheme)
})

onBeforeUnmount(() => {
  highlightRequestId += 1
  clearCopyResetTimer()
  themeObserver?.disconnect()
  colorSchemeQuery?.removeEventListener?.('change', syncAutomaticTheme)
  themeObserver = undefined
  colorSchemeQuery = undefined
})

function resolveAutomaticTheme() {
  return resolveCodeTheme()
}

function syncAutomaticTheme() {
  resolvedAutomaticTheme.value = resolveAutomaticTheme()
}

function normalizeCssSize(value: string | number | undefined) {
  if (typeof value === 'number') {
    return `${value}px`
  }

  return value
}

function toPlainLines(code: string): BingCodeBlockLine[] {
  const rawLines = code.split('\n')

  return rawLines.map((line, index) => ({
    number: index + 1,
    tokens: [
      {
        content: line,
      },
    ],
  }))
}

function normalizeHighlightLines(items: BingCodeBlockHighlightLine[] | undefined) {
  const nextLines = new Set<number>()

  for (const item of items ?? []) {
    if (typeof item === 'number') {
      if (Number.isInteger(item) && item > 0) {
        nextLines.add(item)
      }

      continue
    }

    const [start, end] = item

    if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start) {
      continue
    }

    for (let line = start; line <= end; line += 1) {
      nextLines.add(line)
    }
  }

  return nextLines
}

function getLineClasses(lineNumber: number) {
  return [
    'bing-code-block__line',
    {
      'is-highlighted': highlightedLineNumbers.value.has(lineNumber),
    },
  ]
}

function getTokenStyle(token: BingCodeBlockToken): CSSProperties {
  const style: CSSProperties = {}

  if (token.color) {
    style.color = token.color
  }

  if (token.fontStyle !== undefined) {
    if ((token.fontStyle & FONT_STYLE_ITALIC) === FONT_STYLE_ITALIC) {
      style.fontStyle = 'italic'
    }

    if ((token.fontStyle & FONT_STYLE_BOLD) === FONT_STYLE_BOLD) {
      style.fontWeight = '700'
    }

    if ((token.fontStyle & FONT_STYLE_UNDERLINE) === FONT_STYLE_UNDERLINE) {
      style.textDecoration = 'underline'
    }
  }

  return style
}

async function updateHighlightedLines() {
  const requestId = (highlightRequestId += 1)

  highlightStatus.value = 'loading'
  lines.value = toPlainLines(props.code)

  try {
    const nextLines = await highlightCode(
      props.code,
      resolvedLanguage.value,
      resolvedCodeTheme.value,
    )

    if (requestId !== highlightRequestId) {
      return
    }

    lines.value = nextLines
    highlightStatus.value = 'ready'
  } catch (error) {
    if (requestId !== highlightRequestId) {
      return
    }

    const nextError = error instanceof Error ? error : new Error(String(error))

    lines.value = toPlainLines(props.code)
    highlightStatus.value = 'error'
    emit('highlightError', nextError)
  }
}

function clearCopyResetTimer() {
  if (copyResetTimer === undefined || typeof window === 'undefined') {
    copyResetTimer = undefined
    return
  }

  window.clearTimeout(copyResetTimer)
  copyResetTimer = undefined
}

function scheduleCopyReset() {
  clearCopyResetTimer()

  if (typeof window === 'undefined') {
    return
  }

  copyResetTimer = window.setTimeout(() => {
    copyResetTimer = undefined
    isCopied.value = false
  }, Math.max(0, props.copyResetDelay))
}

function getWheelDelta(event: WheelEvent, viewport: HTMLElement) {
  const rawDelta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY

  if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
    return rawDelta * 16
  }

  if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
    return rawDelta * viewport.clientWidth
  }

  return rawDelta
}

function scrollCodeViewportImmediately(event: WheelEvent, viewport: HTMLElement) {
  if (event.defaultPrevented || event.ctrlKey) {
    return false
  }

  const maximum = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
  const nextScrollLeft = Math.min(
    maximum,
    Math.max(0, viewport.scrollLeft + getWheelDelta(event, viewport)),
  )

  if (nextScrollLeft === viewport.scrollLeft) {
    return false
  }

  event.preventDefault()
  viewport.scrollLeft = nextScrollLeft
  viewport.dispatchEvent(new Event('scroll'))
  return true
}

function handleCodeBlockWheel(event: WheelEvent) {
  if (!event.shiftKey || event.defaultPrevented) {
    return
  }

  const viewport = scrollbarRef.value?.viewport
  const target = event.target

  if (!viewport || (target instanceof Node && viewport.contains(target))) {
    return
  }

  if (props.smoothScroll === false) {
    scrollCodeViewportImmediately(event, viewport)
    return
  }

  const consumed = scrollbarRef.value?.handleWheel(event) ?? false

  if (!consumed) {
    scrollCodeViewportImmediately(event, viewport)
  }
}

async function handleCopy() {
  try {
    const copiedWithClipboard = await writeTextWithClipboardApi(props.code)
    const copied = copiedWithClipboard || writeTextWithTextareaFallback(props.code)

    if (!copied) {
      throw new Error('复制功能暂不可用。')
    }

    isCopied.value = true
    emit('copy', {
      code: props.code,
      language: resolvedLanguage.value,
    })

    await nextTick()
    scheduleCopyReset()
  } catch (error) {
    const nextError = error instanceof Error ? error : new Error(String(error))

    emit('copyError', nextError)
  }
}
</script>

<template>
  <BingResizable
    v-if="resizable"
    class="bing-code-block__resizable"
    :default-size="resolvedResizableDefaultSize"
    :min-width="resizableOptions?.minWidth ?? 380"
    :min-height="resizableOptions?.minHeight ?? 240"
    :max-width="resizableOptions?.maxWidth"
    :max-height="resizableOptions?.maxHeight"
    :mode="resizableOptions?.mode ?? 'fixed'"
    :snap-mode="resizableOptions?.snapMode ?? 'live'"
    :directions="resolvedResizableDirections"
    :step="resizableOptions?.step ?? 1"
    :disabled="resizableOptions?.disabled ?? false"
    :lock-aspect-ratio="resizableOptions?.lockAspectRatio ?? false"
    :contain="resizableOptions?.contain ?? false"
    :show-size="resizableOptions?.showSize ?? true"
    :handle-size="resizableOptions?.handleSize ?? 12"
    :aria-label="resolvedResizableAriaLabel"
  >
    <section
      :class="rootClasses"
      :style="rootStyle"
      :aria-label="ariaLabel"
      @wheel="handleCodeBlockWheel"
    >
      <header v-if="hasHeader" class="bing-code-block__header">
        <div class="bing-code-block__meta">
          <span v-if="title" class="bing-code-block__title">{{ title }}</span>
          <span v-if="resolvedLanguageLabel" class="bing-code-block__language">
            {{ resolvedLanguageLabel }}
          </span>
        </div>

        <BingButton
          v-if="copyable"
          class="bing-code-block__copy"
          variant="ghost"
          size="sm"
          html-type="button"
          text-effect="none"
          :throttle="false"
          :aria-label="copyButtonLabel"
          @click="handleCopy"
        >
          <template #prefix>
            <BingIcon :icon="copyButtonIcon" size="sm" />
          </template>
          <span class="bing-code-block__copy-label">{{ copyButtonLabel }}</span>
        </BingButton>
      </header>

      <BingScrollbar
        ref="scrollbarRef"
        class="bing-code-block__scroll"
        :height="scrollbarHeight"
        :max-height="maxHeight"
        :smooth="smoothScroll"
        horizontal
        always
        :aria-label="ariaLabel"
      >
        <pre class="bing-code-block__pre" :style="codeViewportStyle"><code class="bing-code-block__code"><span
          v-for="line in lines"
          :key="line.number"
          :class="getLineClasses(line.number)"
        ><span v-if="lineNumbers" class="bing-code-block__line-number" aria-hidden="true">{{ line.number }}</span><span class="bing-code-block__line-content"><span
          v-for="(token, tokenIndex) in line.tokens"
          :key="`${line.number}-${tokenIndex}`"
          class="bing-code-block__token"
          :style="getTokenStyle(token)"
        >{{ token.content || '\u200b' }}</span></span></span></code></pre>
      </BingScrollbar>
    </section>
  </BingResizable>

  <section
    v-else
    :class="rootClasses"
    :style="rootStyle"
    :aria-label="ariaLabel"
    @wheel="handleCodeBlockWheel"
  >
    <header v-if="hasHeader" class="bing-code-block__header">
      <div class="bing-code-block__meta">
        <span v-if="title" class="bing-code-block__title">{{ title }}</span>
        <span v-if="resolvedLanguageLabel" class="bing-code-block__language">
          {{ resolvedLanguageLabel }}
        </span>
      </div>

      <BingButton
        v-if="copyable"
        class="bing-code-block__copy"
        variant="ghost"
        size="sm"
        html-type="button"
        text-effect="none"
        :throttle="false"
        :aria-label="copyButtonLabel"
        @click="handleCopy"
      >
        <template #prefix>
          <BingIcon :icon="copyButtonIcon" size="sm" />
        </template>
        <span class="bing-code-block__copy-label">{{ copyButtonLabel }}</span>
      </BingButton>
    </header>

    <BingScrollbar
      ref="scrollbarRef"
      class="bing-code-block__scroll"
      :height="scrollbarHeight"
      :max-height="maxHeight"
      :smooth="smoothScroll"
      horizontal
      always
      :aria-label="ariaLabel"
    >
      <pre class="bing-code-block__pre" :style="codeViewportStyle"><code class="bing-code-block__code"><span
        v-for="line in lines"
        :key="line.number"
        :class="getLineClasses(line.number)"
      ><span v-if="lineNumbers" class="bing-code-block__line-number" aria-hidden="true">{{ line.number }}</span><span class="bing-code-block__line-content"><span
        v-for="(token, tokenIndex) in line.tokens"
        :key="`${line.number}-${tokenIndex}`"
        class="bing-code-block__token"
        :style="getTokenStyle(token)"
      >{{ token.content || '\u200b' }}</span></span></span></code></pre>
    </BingScrollbar>
  </section>
</template>

<style scoped>
.bing-code-block {
  --bing-code-bg: var(--bing-surface-solid);
  --bing-code-header-bg: var(--bing-surface-soft);
  --bing-code-border: var(--bing-border);
  --bing-code-text: var(--bing-text);
  --bing-code-muted: var(--bing-muted);
  --bing-code-highlight: rgb(var(--bing-heading-rgb) / 0.06);
  --bing-code-highlight-border: rgb(var(--bing-heading-rgb) / 0.4);

  position: relative;
  display: grid;
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid var(--bing-code-border);
  border-radius: var(--bing-radius-popover);
  background: var(--bing-code-bg);
  color: var(--bing-code-text);
  box-shadow: var(--bing-shadow-xs);
  font-size: 13px;
  font-weight: 400;
}

.bing-code-block__resizable :deep(.bing-resizable__surface) {
  border: 0;
  border-radius: var(--bing-radius-popover);
  background: transparent;
  box-shadow: none;
}

.bing-code-block__resizable :deep(.bing-resizable__content) {
  min-height: 0;
}

.bing-code-block__resizable .bing-code-block {
  grid-template-rows: auto minmax(0, 1fr);
}

.bing-code-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-width: 0;
  gap: 12px;
  min-height: 44px;
  box-sizing: border-box;
  padding: 6px 8px 6px 12px;
  border-bottom: 1px solid var(--bing-border);
  background: var(--bing-code-header-bg);
}

.bing-code-block__meta {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 8px;
}

.bing-code-block__title {
  min-width: 0;
  overflow: hidden;
  color: var(--bing-heading);
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-code-block__language {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 12rem;
  overflow: hidden;
  color: var(--bing-code-muted);
  font-size: 12px;
  font-weight: 400;
  line-height: 18px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-code-block__copy {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 400;
}

.bing-code-block__copy-label {
  display: inline-flex;
  align-items: center;
  min-height: 1.32em;
  overflow: visible;
  line-height: 1.32;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bing-code-block__scroll {
  --bing-scrollbar-horizontal-bottom: 5px;
  --bing-scrollbar-horizontal-left: 8px;
  --bing-scrollbar-horizontal-right: 8px;

  min-height: 0;
}

.bing-code-block__pre {
  box-sizing: border-box;
  min-width: max-content;
  max-height: inherit;
  margin: 0;
  padding: 11px 0;
  color: var(--bing-code-text);
  font-family:
    ui-monospace,
    SFMono-Regular,
    Menlo,
    Monaco,
    Consolas,
    'Liberation Mono',
    'Courier New',
    monospace;
  font-size: 13px;
  line-height: 1.62;
  tab-size: 2;
}

.bing-code-block.is-wrapped .bing-code-block__pre {
  min-width: 0;
  width: 100%;
  white-space: pre-wrap;
}

.bing-code-block__code {
  display: grid;
  min-width: 100%;
}

.bing-code-block__line {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  min-width: 100%;
  box-sizing: border-box;
  padding: 0 12px;
}

.bing-code-block.has-line-numbers .bing-code-block__line {
  grid-template-columns: 3.25rem minmax(0, 1fr);
  padding-left: 0;
}

.bing-code-block__line::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 3px;
  background: transparent;
  content: '';
}

.bing-code-block__line.is-highlighted {
  background: var(--bing-code-highlight);
}

.bing-code-block__line.is-highlighted::before {
  background: var(--bing-code-highlight-border);
}

.bing-code-block__line-number {
  position: sticky;
  left: 0;
  z-index: 1;
  box-sizing: border-box;
  padding: 0 12px 0 14px;
  background: linear-gradient(
    90deg,
    var(--bing-code-bg) 82%,
    rgb(var(--bing-surface-rgb) / 0)
  );
  color: var(--bing-code-muted);
  font-variant-numeric: tabular-nums;
  text-align: right;
  user-select: none;
}

.bing-code-block__line.is-highlighted .bing-code-block__line-number {
  color: var(--bing-heading);
}

.bing-code-block__line-content {
  min-width: 0;
  padding-right: 16px;
  white-space: pre;
}

.bing-code-block.is-wrapped .bing-code-block__line-content {
  white-space: pre-wrap;
  word-break: break-word;
}

.bing-code-block__token {
  color: inherit;
}

@media (max-width: 520px) {
  .bing-code-block__header {
    flex-wrap: wrap;
    gap: 8px;
  }

  .bing-code-block__copy {
    margin-left: auto;
  }

  .bing-code-block.has-line-numbers .bing-code-block__line {
    grid-template-columns: 2.75rem minmax(0, 1fr);
  }

  .bing-code-block__line-number {
    padding-right: 10px;
  }
}
</style>
