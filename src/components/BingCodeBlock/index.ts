export { default as BingCodeBlock } from './BingCodeBlock.vue'
export { highlightCode } from './BingCodeBlock.highlight'
export type { BingCodeBlockLine, BingCodeBlockToken } from './BingCodeBlock.highlight'
export { getCodeLanguages, normalizeCodeLanguage, resolveCodeTheme } from './BingCodeBlock.languages'
export type { BingCodeLanguage } from './BingCodeBlock.languages'
export type {
  BingCodeBlockCopyPayload,
  BingCodeBlockEmits,
  BingCodeBlockHighlightLine,
  BingCodeBlockProps,
  BingCodeBlockResizableOptions,
  BingCodeBlockTheme,
} from './BingCodeBlock.types'
