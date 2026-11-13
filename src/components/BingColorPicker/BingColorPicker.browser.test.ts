import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingColorPicker from './BingColorPicker.vue'
import '../../theme/index.css'
import type {
  BingColorPickerModelValue,
  BingColorPickerPresetInput,
} from './BingColorPicker.types'

interface MountedPicker {
  app: App<Element>
  changes: BingColorPickerModelValue[]
  host: HTMLElement
}

const mountedPickers: MountedPicker[] = []

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

async function waitFor(condition: () => boolean, timeout = 1_500) {
  const startedAt = performance.now()

  while (!condition()) {
    if (performance.now() - startedAt > timeout) {
      throw new Error('Timed out while waiting for the color picker layout to settle')
    }

    await wait(16)
  }
}

function mountPicker(presets: BingColorPickerPresetInput[]) {
  const host = document.createElement('div')
  const modelValue = ref<BingColorPickerModelValue>('#010101')
  const changes: BingColorPickerModelValue[] = []

  host.style.width = '320px'
  host.style.margin = '64px'
  document.body.appendChild(host)

  const app = createApp({
    render: () =>
      h(BingColorPicker, {
        modelValue: modelValue.value,
        panelWidth: 320,
        presets,
        'onUpdate:modelValue': (value: BingColorPickerModelValue) => {
          modelValue.value = value
          changes.push(value)
        },
      }),
  })

  app.mount(host)
  mountedPickers.push({ app, changes, host })

  return { changes, host }
}

async function openPicker(host: HTMLElement, presetCount: number) {
  host.querySelector<HTMLButtonElement>('.bing-color-picker__trigger')?.click()
  await nextTick()
  await waitFor(
    () => document.body.querySelectorAll('.bing-color-picker__preset').length === presetCount,
  )
  await wait(420)
}

function getPresets() {
  return Array.from(
    document.body.querySelectorAll<HTMLButtonElement>('.bing-color-picker__preset'),
  )
}

function getSurface(preset: HTMLElement) {
  const surface = preset.querySelector<HTMLElement>('.bing-color-picker__preset-surface')

  if (!surface) {
    throw new Error('Expected the preset visual surface to be rendered')
  }

  return surface
}

afterEach(async () => {
  mountedPickers.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
  await page.viewport(1280, 900)
})

describe('BingColorPicker preset hit areas in a browser', () => {
  it('keeps a long color panel within a small viewport and scrolls to the editor', async () => {
    await page.viewport(320, 300)
    const { host, changes } = mountPicker(Array.from({ length: 40 }, (_, i) => `#${(i + 1).toString(16).padStart(6, '0')}`))
    host.style.width = '272px'
    host.style.margin = '24px auto'
    await openPicker(host, 40)
    const panel = document.querySelector<HTMLElement>('.bing-color-picker__panel')!
    const viewport = panel.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    const bounds = panel.getBoundingClientRect()
    expect(bounds.left).toBeGreaterThanOrEqual(12)
    expect(bounds.right).toBeLessThanOrEqual(308)
    expect(bounds.top).toBeGreaterThanOrEqual(12)
    expect(bounds.bottom).toBeLessThanOrEqual(288)
    expect(viewport.scrollWidth).toBe(viewport.clientWidth)
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    expect(getComputedStyle(viewport).scrollbarWidth).toBe('none')
    expect(panel.querySelector('.bing-scrollbar')?.classList.contains('has-vertical-overflow')).toBe(true)

    viewport.scrollTop = viewport.scrollHeight
    await wait(60)
    const input = panel.querySelector<HTMLInputElement>('.bing-color-picker__format-input')!
    await page.elementLocator(input).fill('#112233')
    await userEvent.keyboard('{Enter}')
    expect(changes.at(-1)).toBe('#112233')
    const inputBounds = input.getBoundingClientRect()
    expect(inputBounds.top).toBeGreaterThan(bounds.top)
    expect(inputBounds.bottom).toBeLessThan(bounds.bottom)

    await page.viewport(1280, 900)
    await wait(100)
    expect(viewport.scrollHeight).toBe(viewport.clientHeight)
    expect(document.querySelectorAll('.bing-color-picker__panel')).toHaveLength(1)
  })

  it('keeps six-pixel visual gutters while assigning every grid track to a preset', async () => {
    const presets = Array.from({ length: 16 }, (_, index) => ({
      label: `Preset ${index + 1}`,
      value: `#${String(index + 1).padStart(6, '0')}`,
    }))
    const { changes, host } = mountPicker(presets)

    await openPicker(host, presets.length)

    const renderedPresets = getPresets()
    const first = renderedPresets[0]
    const second = renderedPresets[1]
    const ninth = renderedPresets[8]
    const firstRect = first.getBoundingClientRect()
    const secondRect = second.getBoundingClientRect()
    const ninthRect = ninth.getBoundingClientRect()
    const firstSurfaceRect = getSurface(first).getBoundingClientRect()
    const secondSurfaceRect = getSurface(second).getBoundingClientRect()
    const ninthSurfaceRect = getSurface(ninth).getBoundingClientRect()
    const horizontalY = firstSurfaceRect.top + firstSurfaceRect.height / 2
    const verticalX = firstSurfaceRect.left + firstSurfaceRect.width / 2
    const beforeSecond = document.elementFromPoint(
      secondRect.left - 1,
      horizontalY,
    ) as HTMLElement | null
    const afterFirst = document.elementFromPoint(
      firstRect.right + 1,
      horizontalY,
    ) as HTMLElement | null
    const aboveNinth = document.elementFromPoint(
      verticalX,
      ninthRect.top - 1,
    ) as HTMLElement | null
    const belowFirst = document.elementFromPoint(
      verticalX,
      firstRect.bottom + 1,
    ) as HTMLElement | null

    expect(secondRect.left - firstRect.right).toBeCloseTo(0, 1)
    expect(ninthRect.top - firstRect.bottom).toBeCloseTo(0, 1)
    expect(secondSurfaceRect.left - firstSurfaceRect.right).toBeCloseTo(6, 1)
    expect(ninthSurfaceRect.top - firstSurfaceRect.bottom).toBeCloseTo(6, 1)
    expect(beforeSecond?.closest('.bing-color-picker__preset')).toBe(first)
    expect(afterFirst?.closest('.bing-color-picker__preset')).toBe(second)
    expect(aboveNinth?.closest('.bing-color-picker__preset')).toBe(first)
    expect(belowFirst?.closest('.bing-color-picker__preset')).toBe(ninth)
    expect(getComputedStyle(beforeSecond!).cursor).toBe('pointer')
    expect(getComputedStyle(afterFirst!).cursor).toBe('pointer')
    expect(getComputedStyle(aboveNinth!).cursor).toBe('pointer')
    expect(getComputedStyle(belowFirst!).cursor).toBe('pointer')

    afterFirst!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: firstRect.right + 1,
        clientY: horizontalY,
      }),
    )
    await nextTick()
    aboveNinth!.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        clientX: verticalX,
        clientY: ninthRect.top - 1,
      }),
    )
    await nextTick()

    expect(changes).toEqual([presets[1].value, presets[0].value])
    expect(document.body.querySelector('.bing-color-picker__panel')).not.toBeNull()
  })
})
