import { afterEach, describe, expect, it } from 'vitest'
import { getCodeLanguages, highlightCode, normalizeCodeLanguage, resolveCodeTheme } from './index'

afterEach(() => { delete document.documentElement.dataset.bingTheme })

describe('公开代码高亮 API', () => {
  it('列出已支持语言并隔离调用方修改，规范化别名', () => {
    const languages = getCodeLanguages()
    expect(languages).toHaveLength(12)
    expect(languages.find(item => item.value === 'typescript')?.label).toBe('TypeScript')
    languages[0]!.label = 'modified'
    expect(getCodeLanguages()[0]!.label).toBe('JavaScript')
    expect(normalizeCodeLanguage(' TS ')).toBe('typescript')
    expect(normalizeCodeLanguage('bash')).toBe('shellscript')
    expect(normalizeCodeLanguage('')).toBe('text')
    expect(normalizeCodeLanguage('Unknown')).toBe('unknown')
  })
  it('纯文本保留空白、空行及尾部换行', async () => {
    const code = '  <tag>\t\r\n\n'
    for (const language of ['text', 'plaintext']) {
      const lines = await highlightCode(code, language)
      expect(lines.map(line => line.tokens.map(token => token.content).join('')).join('\n')).toBe(code)
      expect(lines.flatMap(line => line.tokens).every(token => !token.color)).toBe(true)
    }
  })
  it('未知语言与主题保留可捕获的失败语义', async () => {
    await expect(highlightCode('x', 'not-a-language', 'github-dark')).rejects.toThrow()
    await expect(highlightCode('x', '__proto__')).rejects.toThrow()
    await expect(highlightCode('x', 'typescript', 'not-a-theme')).rejects.toThrow()
  })
  it('支持别名、显式主题及 Markdown 围栏嵌入语法', async () => {
    const [ts, shell, markdown] = await Promise.all([
      highlightCode('const a: number = 1', 'ts', 'vitesse-dark'),
      highlightCode('echo "hi"', 'bash', 'github-dark'),
      highlightCode('```ts\nconst a = 1\n```', 'markdown', 'github-dark'),
    ])
    expect(ts[0]!.tokens.length).toBeGreaterThan(1)
    expect(shell[0]!.tokens.length).toBeGreaterThan(1)
    expect(new Set(markdown[1]!.tokens.map(token => token.color)).size).toBeGreaterThan(1)
  })
  it('与组件共享亮暗 auto 主题，显式主题优先', () => {
    document.documentElement.dataset.bingTheme = 'dark'
    expect(resolveCodeTheme()).toBe('github-dark')
    expect(resolveCodeTheme('auto', 'light')).toBe('vitesse-light')
    expect(resolveCodeTheme('light-plus')).toBe('light-plus')
  })
  it('真实按需语法返回有颜色的 token，保留 UTF-16 文本和尾部空行', async () => {
    const code = '// 中文😀\nconst answer: number = 42\n'
    const [light, dark] = await Promise.all([highlightCode(code, 'ts', 'vitesse-light'), highlightCode(code, 'typescript', 'github-dark')])
    expect(light.map(line => line.tokens.map(token => token.content).join('')).join('\n')).toBe(code)
    expect(light.flatMap(line => line.tokens).some(token => Boolean(token.color))).toBe(true)
    expect(light).not.toEqual(dark)
  })
})
