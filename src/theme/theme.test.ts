import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const readThemeFile = (name: string) => readFileSync(new URL(name, import.meta.url), 'utf8')

const darkCss = readThemeFile('./dark.css')
const indexCss = readThemeFile('./index.css')
const lightCss = readThemeFile('./light.css')
const tokensCss = readThemeFile('./tokens.css')

const legacyTokens = [
  '--bing-pink-50',
  '--bing-pink-100',
  '--bing-pink-200',
  '--bing-pink-300',
  '--bing-pink-400',
  '--bing-pink-500',
  '--bing-pink-600',
  '--bing-pink-700',
  '--bing-sky-50',
  '--bing-sky-100',
  '--bing-sky-200',
  '--bing-sky-300',
  '--bing-sky-400',
  '--bing-sky-500',
  '--bing-sky-600',
  '--bing-sky-700',
  '--bing-emerald-50',
  '--bing-emerald-500',
  '--bing-emerald-700',
  '--bing-red-50',
  '--bing-red-500',
  '--bing-red-700',
  '--bing-amber-50',
  '--bing-amber-400',
  '--bing-amber-700',
  '--bing-heading',
  '--bing-text',
  '--bing-muted',
  '--bing-surface',
  '--bing-surface-strong',
  '--bing-border',
  '--bing-border-strong',
  '--bing-accent',
  '--bing-accent-strong',
  '--bing-accent-soft',
  '--bing-accent-contrast',
  '--bing-secondary',
  '--bing-secondary-strong',
  '--bing-secondary-soft',
  '--bing-danger',
  '--bing-danger-strong',
  '--bing-danger-soft',
  '--bing-success',
  '--bing-success-strong',
  '--bing-success-soft',
  '--bing-warning',
  '--bing-warning-strong',
  '--bing-warning-soft',
  '--bing-focus',
  '--bing-shadow-color',
  '--bing-shadow',
  '--bing-canvas',
  '--bing-radius-sm',
  '--bing-radius-md',
  '--bing-radius-lg',
  '--bing-control-height-sm',
  '--bing-control-height-md',
  '--bing-control-height-lg',
  '--bing-duration-fast',
  '--bing-duration-normal',
  '--bing-ease-smooth',
] as const

const semanticTokens = [
  '--bing-placeholder',
  '--bing-disabled-text',
  '--bing-surface-solid',
  '--bing-surface-soft',
  '--bing-surface-muted',
  '--bing-surface-hover',
  '--bing-surface-active',
  '--bing-overlay',
  '--bing-accent-solid',
  '--bing-control-bg',
  '--bing-control-border',
  '--bing-control-shadow',
  '--bing-control-hover-bg',
  '--bing-control-hover-border',
  '--bing-control-focus-shadow',
  '--bing-control-disabled-bg',
  '--bing-control-disabled-border',
  '--bing-popover-bg',
  '--bing-popover-border',
  '--bing-popover-shadow',
  '--bing-inset-highlight',
  '--bing-shadow-sm',
  '--bing-shadow-md',
  '--bing-shadow-lg',
  '--bing-shadow-floating',
] as const

const rgbChannelTokens = [
  '--bing-surface-rgb',
  '--bing-highlight-rgb',
  '--bing-heading-rgb',
  '--bing-shadow-rgb',
  '--bing-accent-rgb',
  '--bing-accent-strong-rgb',
  '--bing-accent-solid-rgb',
  '--bing-secondary-rgb',
  '--bing-secondary-strong-rgb',
  '--bing-danger-rgb',
  '--bing-danger-strong-rgb',
  '--bing-success-rgb',
  '--bing-success-strong-rgb',
  '--bing-warning-rgb',
  '--bing-warning-strong-rgb',
] as const

function expectTokens(css: string, names: readonly string[]) {
  for (const name of names) {
    expect(css, `${name} should be defined`).toContain(`${name}:`)
  }
}

function getSelectorTokens(css: string, selector: string) {
  const selectorStart = css.indexOf(`${selector} {`)

  if (selectorStart < 0) {
    throw new Error(`Missing selector: ${selector}`)
  }

  const blockStart = css.indexOf('{', selectorStart) + 1
  let depth = 1
  let blockEnd = blockStart

  while (depth > 0 && blockEnd < css.length) {
    if (css[blockEnd] === '{') depth += 1
    if (css[blockEnd] === '}') depth -= 1
    blockEnd += 1
  }

  const declarations = css.slice(blockStart, blockEnd - 1)
  const tokens = new Map<string, string>()

  for (const match of declarations.matchAll(/(--bing-[\w-]+):\s*([^;]+);/g)) {
    tokens.set(match[1], match[2].replace(/\s+/g, ' ').trim())
  }

  return Object.fromEntries([...tokens].sort(([left], [right]) => left.localeCompare(right)))
}

describe('theme CSS contract', () => {
  it('keeps the public token contract after splitting the theme files', () => {
    expect(indexCss).toContain("@import './tokens.css';")
    expect(indexCss).toContain("@import './light.css';")
    expect(indexCss).toContain("@import './dark.css';")
    expectTokens(`${tokensCss}\n${lightCss}`, legacyTokens)
  })

  it('defines the semantic contract for both color schemes', () => {
    expectTokens(lightCss, [...semanticTokens, ...rgbChannelTokens])
    expectTokens(darkCss, [...semanticTokens, ...rgbChannelTokens])
  })

  it('defaults to light and only follows the OS when system is selected', () => {
    expect(lightCss).toContain(':root,')
    expect(lightCss).toContain("html[data-bing-theme='light']")
    expect(lightCss).toContain("html[data-bing-theme='system']")
    expect(lightCss).toContain('color-scheme: light;')
    expect(darkCss).toContain("html[data-bing-theme='dark']")
    expect(darkCss).toContain('@media (prefers-color-scheme: dark)')
    expect(darkCss).toContain('color-scheme: dark;')
  })

  it('uses space-separated RGB channels for alpha composition', () => {
    for (const name of rgbChannelTokens) {
      const pattern = new RegExp(`${name}:\\s*(\\d+ \\d+ \\d+);`, 'g')

      expect([...lightCss.matchAll(pattern)]).toHaveLength(1)
      expect([...darkCss.matchAll(pattern)]).toHaveLength(2)
    }
  })

  it('uses neutral interaction accents while preserving explicit brand palettes', () => {
    expect(lightCss).toContain('--bing-accent-rgb: 63 63 70;')
    expect(tokensCss).toContain('--bing-pink-400: #f472b6;')
    expect(tokensCss).toContain('--bing-purple-200: #e9d5ff;')
    expect(tokensCss).toContain('--bing-purple-300: #d8b4fe;')
    expect(tokensCss).toContain('--bing-purple-400: #c084fc;')
    expect(darkCss.match(/--bing-accent-rgb:\s*212 212 216;/g)).toHaveLength(2)
    expect(darkCss.match(/--bing-accent:\s*#d4d4d8;/g)).toHaveLength(2)
    expect(darkCss.match(/--bing-focus:\s*rgb\(var\(--bing-accent-rgb\) \/ 0\.4\);/g)).toHaveLength(2)
    expect(darkCss).not.toContain('--bing-accent: var(--bing-pink-400);')
  })

  it('keeps explicit dark and system-resolved dark token bundles identical', () => {
    const explicitDark = getSelectorTokens(darkCss, "html[data-bing-theme='dark']")
    const systemDark = getSelectorTokens(darkCss, "html[data-bing-theme='system']")

    expect(Object.keys(explicitDark).length).toBeGreaterThan(60)
    expect(systemDark).toEqual(explicitDark)
  })
})
