import { h } from 'vue'
import type { FunctionalComponent, SVGAttributes } from 'vue'

export type BingSvgIconNode = ReadonlyArray<readonly [tag: string, attrs: Record<string, string>]>

export type BingSvgIconComponent = FunctionalComponent<SVGAttributes>

const defaultAttributes = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  'stroke-width': 2,
  'stroke-linecap': 'round',
  'stroke-linejoin': 'round',
} as const

const a11yAttributes = ['aria-label', 'aria-labelledby', 'title', 'role']

/**
 * 把固化的 SVG 节点数据包装成 Vue 函数式组件。
 * 属性全部透传到 `<svg>`；未提供无障碍属性时默认 `aria-hidden`。
 */
export function createBingSvgIcon(name: string, nodes: BingSvgIconNode): BingSvgIconComponent {
  const icon: BingSvgIconComponent = (attrs) => {
    const hasA11yAttribute = a11yAttributes.some((key) => attrs[key as keyof SVGAttributes] != null)

    return h(
      'svg',
      {
        ...defaultAttributes,
        ...(hasA11yAttribute ? {} : { 'aria-hidden': 'true' }),
        ...attrs,
        class: ['bing-svg-icon', `bing-svg-icon--${name}`, attrs.class],
      },
      nodes.map(([tag, nodeAttrs]) => h(tag, nodeAttrs)),
    )
  }

  icon.displayName = `BingSvgIcon(${name})`
  icon.inheritAttrs = false

  return icon
}
