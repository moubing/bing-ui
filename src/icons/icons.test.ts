import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import BingIcon from '../components/BingIcon/BingIcon.vue'
import * as icons from './icons'
import { ChevronDown, X } from './icons'

function collectSourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return collectSourceFiles(path)
    return /\.(vue|ts)$/.test(name) && !/\.(stories|test)\.ts$/.test(name) ? [path] : []
  })
}

describe('local SVG icons', () => {
  it('renders the shared stroke icon attributes', () => {
    const svg = mount(X).get('svg')

    expect(svg.attributes()).toMatchObject({
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: 'currentColor',
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      'aria-hidden': 'true',
    })
    expect(svg.classes()).toEqual(['bing-svg-icon', 'bing-svg-icon--x'])
    expect(svg.findAll('path')).toHaveLength(2)
  })

  it('every icon renders at least one shape', () => {
    const { checkboxMarkPaths: _markPaths, ...iconComponents } = icons
    for (const [name, icon] of Object.entries(iconComponents)) {
      const svg = mount(icon).get('svg')

      expect(svg.element.children.length, name).toBeGreaterThan(0)
    }
  })

  it('works through BingIcon for decorative and labelled usage', () => {
    const decorative = mount(BingIcon, { props: { icon: ChevronDown, size: 'sm', strokeWidth: 2.25 } })
    const decorativeSvg = decorative.get('svg')

    expect(decorativeSvg.classes()).toEqual(
      expect.arrayContaining(['bing-icon', 'bing-svg-icon', 'bing-svg-icon--chevron-down']),
    )
    expect(decorativeSvg.attributes('aria-hidden')).toBe('true')
    expect(decorativeSvg.attributes('style')).toContain('width: 16px')
    expect(decorativeSvg.attributes('style')).toContain('stroke-width: 2.25')

    const labelled = mount(BingIcon, { props: { icon: X, decorative: false, label: '关闭' } }).get('svg')

    expect(labelled.attributes('aria-hidden')).toBeUndefined()
    expect(labelled.attributes('role')).toBe('img')
    expect(labelled.attributes('aria-label')).toBe('关闭')
  })

  it('library source does not import third-party icon packages', () => {
    const root = join(__dirname, '..')
    const offenders = collectSourceFiles(root)
      .filter((file) => /from ['"](lucide-vue-next|@lucide\/[^'"]+)['"]/.test(readFileSync(file, 'utf8')))
      .map((file) => relative(root, file))

    expect(offenders).toEqual([])
  })
})
