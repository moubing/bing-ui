export interface BingCodeLanguage {
  value: string
  label: string
}

const languages: readonly BingCodeLanguage[] = [
  { value: 'javascript', label: 'JavaScript' }, { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' }, { value: 'tsx', label: 'TSX' }, { value: 'vue', label: 'Vue' },
  { value: 'html', label: 'HTML' }, { value: 'css', label: 'CSS' }, { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' }, { value: 'markdown', label: 'Markdown' },
  { value: 'shellscript', label: 'Shell' }, { value: 'yaml', label: 'YAML' },
]

const aliases: Record<string, string> = {
  js: 'javascript', cjs: 'javascript', mjs: 'javascript',
  ts: 'typescript', cts: 'typescript', mts: 'typescript', md: 'markdown',
  bash: 'shellscript', sh: 'shellscript', shell: 'shellscript', zsh: 'shellscript', yml: 'yaml',
  txt: 'text', plain: 'text', plaintext: 'text',
}

/** 仅返回元数据，不加载 Shiki；返回副本，调用方可自行添加纯文本选项。 */
export function getCodeLanguages(): BingCodeLanguage[] {
  return languages.map(language => ({ ...language }))
}

/** 规范化别名；未知标识保留为小写，不做自动语言识别。 */
export function normalizeCodeLanguage(language?: string | null): string {
  const value = language?.trim().toLowerCase() || 'text'
  return Object.hasOwn(aliases, value) ? aliases[value]! : value
}

/** 与 BingCodeBlock 的 auto 一致；SSR 默认亮色，可显式传入全局主题。 */
export function resolveCodeTheme(theme = 'auto', mode?: 'light' | 'dark' | 'system'): string {
  const configured = theme.trim()
  if (configured && configured !== 'auto') return configured
  const globalTheme = mode ?? (typeof document === 'undefined' ? 'light' : document.documentElement.dataset.bingTheme)
  const prefersDark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches === true
  return globalTheme === 'dark' || (globalTheme === 'system' && prefersDark) ? 'github-dark' : 'vitesse-light'
}
