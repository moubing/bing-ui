// @vitest-environment node
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import BingDragDrop from './BingDragDrop.vue'
import BingDraggable from './BingDraggable.vue'
import BingDropZone from './BingDropZone.vue'
import BingDragOverlay from './BingDragOverlay.vue'

describe('BingDragDrop SSR', () => {
  it('renders zones and items on the server without an overlay', async () => {
    const html = await renderToString(createSSRApp({
      render: () => h(BingDragDrop, null, {
        default: () => [
          h(BingDropZone, { id: 'doing', tag: 'section', ariaLabel: '进行中' }, {
            default: ({ state }: { state: string }) => [
              h('h3', `进行中 ${state}`),
              h(BingDraggable, { id: 'REQ-1', zone: 'doing' }, { default: () => h('a', { href: '/r/1' }, 'REQ-1') }),
            ],
          }),
          h(BingDragOverlay, null, { default: () => h('div', { class: 'overlay' }, 'overlay') }),
        ],
      }),
    }))

    expect(html).toContain('进行中 idle')
    expect(html).toContain('data-bing-drop-state="idle"')
    expect(html).toContain('aria-label="进行中"')
    expect(html).toContain('href="/r/1"')
    expect(html).not.toContain('class="overlay"')
  })

  it('requires the provider', async () => {
    await expect(renderToString(createSSRApp({ render: () => h(BingDropZone, { id: 'x' }) }))).rejects.toThrow('BingDragDrop')
  })
})
