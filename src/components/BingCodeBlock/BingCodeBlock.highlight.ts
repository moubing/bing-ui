import type { HighlighterCore, LanguageInput, ThemeInput } from 'shiki/core'
import { normalizeCodeLanguage, resolveCodeTheme } from './BingCodeBlock.languages'

export interface BingCodeBlockToken {
  content: string
  color?: string
  fontStyle?: number
}

export interface BingCodeBlockLine {
  number: number
  tokens: BingCodeBlockToken[]
}

/**
 * 语言与主题均按需动态加载：未使用 BingCodeBlock 时不会触及 shiki，
 * 使用时也只拉取实际用到的语法和主题。
 */
const languageLoaders: Record<string, LanguageInput> = {
  javascript: () => import('shiki/langs/javascript.mjs'),
  typescript: () => import('shiki/langs/typescript.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  vue: () => import('shiki/langs/vue.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  scss: () => import('shiki/langs/scss.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
}

const themeLoaders: Record<string, ThemeInput> = {
  'github-dark': () => import('shiki/themes/github-dark.mjs'),
  'github-light': () => import('shiki/themes/github-light.mjs'),
  'dark-plus': () => import('shiki/themes/dark-plus.mjs'),
  'light-plus': () => import('shiki/themes/light-plus.mjs'),
  'vitesse-dark': () => import('shiki/themes/vitesse-dark.mjs'),
  'vitesse-light': () => import('shiki/themes/vitesse-light.mjs'),
}

let highlighterPromise: Promise<HighlighterCore> | undefined
const languageLoads = new Map<string, Promise<void>>()
const themeLoads = new Map<string, Promise<void>>()

function getHighlighter() {
  highlighterPromise ??= Promise.all([
    import('shiki/core'),
    import('shiki/engine/javascript'),
  ])
    .then(([{ createHighlighterCore }, { createJavaScriptRegexEngine }]) =>
      createHighlighterCore({
        langs: [],
        themes: [],
        engine: createJavaScriptRegexEngine(),
      }),
    )
    .catch((error: unknown) => {
      highlighterPromise = undefined
      throw error
    })

  return highlighterPromise
}

function loadOnce(cache: Map<string, Promise<void>>, key: string, load: () => Promise<void>) {
  let pending = cache.get(key)

  if (!pending) {
    pending = load().catch((error: unknown) => {
      cache.delete(key)
      throw error
    })
    cache.set(key, pending)
  }

  return pending
}

function ensureLanguage(highlighter: HighlighterCore, language: string): Promise<unknown> {
  const id = normalizeCodeLanguage(language)

  // Markdown 围栏代码块依赖其他语法，保持与全量加载时一致的嵌入高亮。
  if (id === 'markdown') {
    return Promise.all(
      Object.keys(languageLoaders).map((name) => loadLanguageById(highlighter, name)),
    )
  }

  return loadLanguageById(highlighter, id)
}

function loadLanguageById(highlighter: HighlighterCore, id: string) {
  const loader = languageLoaders[id]

  // 防御内部调用；公开入口在加载核心之前已处理未知语言。
  if (!loader) {
    return Promise.resolve()
  }

  return loadOnce(languageLoads, id, () => highlighter.loadLanguage(loader))
}

function ensureTheme(highlighter: HighlighterCore, theme: string) {
  const loader = themeLoaders[theme]

  if (!loader) {
    return Promise.resolve()
  }

  return loadOnce(themeLoads, theme, () => highlighter.loadTheme(loader))
}

/** 按需加载并返回逐行 token；纯文本不加载 Shiki，未知语言或加载失败由调用方处理。 */
export async function highlightCode(code: string, language = 'text', theme = 'auto'): Promise<BingCodeBlockLine[]> {
  language = normalizeCodeLanguage(language)
  if (language === 'text') {
    return code.split('\n').map((content, index) => ({ number: index + 1, tokens: [{ content }] }))
  }
  if (!Object.hasOwn(languageLoaders, language)) throw new Error(`Unsupported code language: ${language}`)
  theme = resolveCodeTheme(theme)
  const highlighter = await getHighlighter()

  await Promise.all([ensureLanguage(highlighter, language), ensureTheme(highlighter, theme)])

  const result = highlighter.codeToTokens(code, {
    lang: language,
    theme,
  })

  return result.tokens.map<BingCodeBlockLine>((tokens, index) => ({
    number: index + 1,
    tokens: tokens.map((token) => ({
      content: token.content,
      color: token.color,
      fontStyle: token.fontStyle,
    })),
  }))
}
