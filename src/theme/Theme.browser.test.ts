import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import BingCodeBlock from '../components/BingCodeBlock/BingCodeBlock.vue'
import BingColorPicker from '../components/BingColorPicker/BingColorPicker.vue'
import BingFilePreview from '../components/BingFilePreview/BingFilePreview.vue'
import BingSelect from '../components/BingSelect/BingSelect.vue'
import './index.css'

function waitForFrame() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
  })
}

async function waitUntil(assertion: () => boolean, timeout = 5000) {
  const startedAt = performance.now()

  while (!assertion()) {
    if (performance.now() - startedAt > timeout) {
      throw new Error(`Timed out after ${timeout}ms while waiting for browser theme state.`)
    }

    await waitForFrame()
  }
}

afterEach(() => {
  delete document.documentElement.dataset.bingTheme
  document.body.innerHTML = ''
})

describe('theme switching in a browser', () => {
  it('switches root tokens without remounting the page', async () => {
    document.documentElement.dataset.bingTheme = 'light'
    await waitForFrame()

    const lightStyle = getComputedStyle(document.documentElement)
    expect(lightStyle.colorScheme).toBe('light')
    expect(lightStyle.getPropertyValue('--bing-heading').trim()).toBe('#18181b')
    expect(lightStyle.getPropertyValue('--bing-accent-rgb').trim()).toBe('63 63 70')
    const lightPopoverBackground = lightStyle.getPropertyValue('--bing-popover-bg').trim()

    document.documentElement.dataset.bingTheme = 'dark'
    await waitForFrame()

    const darkStyle = getComputedStyle(document.documentElement)
    expect(darkStyle.colorScheme).toBe('dark')
    expect(darkStyle.getPropertyValue('--bing-heading').trim()).toBe('#f4f4f5')
    expect(darkStyle.getPropertyValue('--bing-accent-rgb').trim()).toBe('212 212 216')
    expect(darkStyle.getPropertyValue('--bing-popover-bg').trim()).not.toBe(lightPopoverBackground)
  })

  it('keeps a teleported select panel on the document theme', async () => {
    document.documentElement.dataset.bingTheme = 'dark'

    const host = document.createElement('div')
    const probe = document.createElement('div')
    probe.style.background = 'rgb(var(--bing-surface-rgb) / 0.63)'
    document.body.append(host, probe)

    const app = createApp({
      render: () =>
        h(BingSelect, {
          glassOpacity: 0.63,
          options: [
            { label: 'Aurora', value: 'aurora' },
            { label: 'Orbit', value: 'orbit' },
          ],
        }),
    })

    app.mount(host)
    await nextTick()
    host.querySelector<HTMLButtonElement>('.bing-select__trigger')?.click()
    await nextTick()
    await nextTick()
    await waitForFrame()

    const panel = document.body.querySelector<HTMLElement>('.bing-select__panel')
    expect(panel).not.toBeNull()
    expect(getComputedStyle(panel!).backgroundColor).toBe(getComputedStyle(probe).backgroundColor)

    const darkPanelBackground = getComputedStyle(panel!).backgroundColor
    document.documentElement.dataset.bingTheme = 'light'
    await waitForFrame()

    expect(getComputedStyle(panel!).backgroundColor).toBe(getComputedStyle(probe).backgroundColor)
    expect(getComputedStyle(panel!).backgroundColor).not.toBe(darkPanelBackground)

    app.unmount()
    host.remove()
    probe.remove()
  })

  it('themes the teleported color picker chrome while preserving its color controls', async () => {
    document.documentElement.dataset.bingTheme = 'dark'

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () => h(BingColorPicker, { modelValue: '#ec4899' }),
    })

    app.mount(host)
    await nextTick()
    host.querySelector<HTMLButtonElement>('.bing-color-picker__trigger')?.click()
    await nextTick()
    await waitUntil(() => Boolean(document.body.querySelector('.bing-color-picker__panel')))

    const panel = document.body.querySelector<HTMLElement>('.bing-color-picker__panel')!
    const field = panel.querySelector<HTMLElement>('.bing-color-picker__field')!
    const darkPanelBackground = getComputedStyle(panel).backgroundColor
    const functionalFieldBackground = getComputedStyle(field).backgroundImage

    document.documentElement.dataset.bingTheme = 'light'
    await waitForFrame()

    expect(getComputedStyle(panel).backgroundColor).not.toBe(darkPanelBackground)
    expect(getComputedStyle(field).backgroundImage).toBe(functionalFieldBackground)

    app.unmount()
    host.remove()
  })

  it('themes the teleported file preview shell while preserving its paper canvas', async () => {
    document.documentElement.dataset.bingTheme = 'dark'

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () =>
        h(BingFilePreview, {
          modelValue: true,
          name: 'theme.json',
          type: 'json',
          content: JSON.stringify(
            {
              mode: 'paper',
              items: Array.from({ length: 80 }, (_, index) => ({ index, active: index % 2 === 0 })),
            },
            null,
            2,
          ),
          glassOpacity: 0.72,
        }),
    })

    app.mount(host)
    await nextTick()
    await waitUntil(() => Boolean(document.body.querySelector('.bing-file-preview')))

    const root = document.body.querySelector<HTMLElement>('.bing-file-preview-root')!
    const panel = root.querySelector<HTMLElement>('.bing-file-preview')!
    const paper = root.querySelector<HTMLElement>('.bing-file-preview__text-wrap')!
    const text = root.querySelector<HTMLElement>('.bing-file-preview__text')!
    await waitUntil(() => Boolean(root.querySelector('.bing-scrollbar__rail--vertical')))
    const rail = root.querySelector<HTMLElement>('.bing-scrollbar__rail--vertical')!
    const thumb = rail.querySelector<HTMLElement>('.bing-scrollbar__thumb')!
    const darkPanelBackground = getComputedStyle(panel).backgroundColor
    const paperBackground = getComputedStyle(paper).backgroundColor
    const paperTextColor = getComputedStyle(text).color
    const paperRailBackground = getComputedStyle(rail).backgroundColor
    const paperThumbBackground = getComputedStyle(thumb).backgroundColor

    expect(root.style.getPropertyValue('--bing-file-preview-glass-opacity')).toBe('0.72')
    expect(paperBackground).toBe('rgb(255, 255, 255)')
    expect(getComputedStyle(paper).colorScheme).toBe('light')

    document.documentElement.dataset.bingTheme = 'light'
    await waitForFrame()

    expect(getComputedStyle(panel).backgroundColor).not.toBe(darkPanelBackground)
    expect(getComputedStyle(paper).backgroundColor).toBe(paperBackground)
    expect(getComputedStyle(text).color).toBe(paperTextColor)
    expect(getComputedStyle(rail).backgroundColor).toBe(paperRailBackground)
    expect(getComputedStyle(thumb).backgroundColor).toBe(paperThumbBackground)

    app.unmount()
    host.remove()
  })

  it('rehighlights automatic code tokens when the document theme changes', async () => {
    document.documentElement.dataset.bingTheme = 'dark'

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp({
      render: () =>
        h(BingCodeBlock, {
          code: 'const count: number = 1',
          language: 'typescript',
        }),
    })

    app.mount(host)
    await waitUntil(() => host.querySelector('.bing-code-block.is-ready') !== null)

    const readTokenColors = () =>
      Array.from(host.querySelectorAll<HTMLElement>('.bing-code-block__token')).map(
        (token) => getComputedStyle(token).color,
      )
    const darkTokenColors = readTokenColors()

    document.documentElement.dataset.bingTheme = 'light'
    await waitUntil(() => {
      const lightTokenColors = readTokenColors()
      return lightTokenColors.length > 0 && lightTokenColors.some((color, index) => color !== darkTokenColors[index])
    })

    expect(readTokenColors()).not.toEqual(darkTokenColors)

    app.unmount()
    host.remove()
  }, 10000)
})
