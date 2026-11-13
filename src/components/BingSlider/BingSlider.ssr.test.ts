// @vitest-environment node
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import BingSlider from './BingSlider.vue'

describe('BingSlider SSR', () => {
  it.each(['horizontal', 'vertical'] as const)('renders %s geometry and both native values without browser measurements', async orientation => {
    const html = await renderToString(createSSRApp({ render: () => h(BingSlider<boolean>, {
      range: true, modelValue: [20, 70], minDistance: 10, name: 'price', ariaLabel: '价格', tooltip: 'always', orientation,
    }) }))
    expect(html).toContain('--bing-slider-p0:0.2')
    expect(html).toContain('--bing-slider-p1:0.7')
    expect(html.match(/type="range"/g)).toHaveLength(2)
    expect(html.match(new RegExp(`aria-orientation="${orientation}"`, 'g'))).toHaveLength(2)
    expect(html).toContain('aria-label="价格 最小值"')
    expect(html).toContain('aria-label="价格 最大值"')
    expect(html).toContain('value="20"')
    expect(html).toContain('value="70"')
    expect(html).not.toContain('aria-valuenow')
  })
})
