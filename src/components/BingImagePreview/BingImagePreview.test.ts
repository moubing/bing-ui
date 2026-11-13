import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BingImagePreview from './BingImagePreview.vue'

const items = [
  {
    src: '/image-one.jpg',
    alt: 'First image',
    caption: 'First caption',
  },
  {
    src: '/image-two.jpg',
    alt: 'Second image',
    downloadName: 'second.jpg',
  },
]

describe('BingImagePreview', () => {
  beforeEach(() => {
    class MockPreloadImage {
      decoding = ''
      onload: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      set src(_value: string) {
        queueMicrotask(() => this.onload?.(new Event('load')))
      }
    }

    vi.stubGlobal('Image', MockPreloadImage)
  })

  afterEach(() => {
    document.body.innerHTML = ''
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('renders the active image in a teleported preview', async () => {
    mount(BingImagePreview, {
      props: {
        modelValue: true,
        items,
      },
      attachTo: document.body,
    })
    await nextTick()

    const root = document.body.querySelector('.bing-image-preview-root')
    const image = document.body.querySelector<HTMLImageElement>('.bing-image-preview__img')

    expect(root).not.toBeNull()
    expect(root?.getAttribute('role')).toBe('dialog')
    expect(image?.getAttribute('src')).toBe('/image-one.jpg')
    expect(image?.getAttribute('alt')).toBe('First image')
    expect(document.body.textContent).toContain('First caption')
  })

  it('emits close events when the close button is clicked', async () => {
    const wrapper = mount(BingImagePreview, {
      props: {
        modelValue: true,
        items,
      },
      attachTo: document.body,
    })
    await nextTick()

    const closeButton = document.body.querySelector<HTMLButtonElement>('[aria-label="关闭预览"]')
    closeButton?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['close'])
  })

  it('changes images from side navigation and emits the new index', async () => {
    const wrapper = mount(BingImagePreview, {
      props: {
        modelValue: true,
        items,
      },
      attachTo: document.body,
    })
    await nextTick()

    const nextButton = document.body.querySelector<HTMLButtonElement>('[aria-label="下一张图片"]')
    nextButton?.click()
    await Promise.resolve()
    await wrapper.vm.$nextTick()

    const images = Array.from(document.body.querySelectorAll<HTMLImageElement>('.bing-image-preview__img'))

    expect(images.some((image) => image.getAttribute('src') === '/image-two.jpg')).toBe(true)
    expect(wrapper.emitted('update:currentIndex')?.[0]).toEqual([1])
    expect(wrapper.emitted('change')?.[0]?.[0]).toBe(1)
    expect(document.body.querySelector('.bing-image-preview__counter')?.getAttribute('aria-label'))
      .toBe('第 2 张，共 2 张')
  })

  it('keeps the current image visible while the next image is preloading', async () => {
    vi.useFakeTimers()
    const preloaders: ManualPreloadImage[] = []

    class ManualPreloadImage {
      decoding = ''
      onload: ((event: Event) => void) | null = null
      onerror: ((event: Event) => void) | null = null

      constructor() {
        preloaders.push(this)
      }

      set src(_value: string) {}
    }

    vi.stubGlobal('Image', ManualPreloadImage)

    const wrapper = mount(BingImagePreview, {
      props: {
        modelValue: true,
        items,
      },
      attachTo: document.body,
    })
    await nextTick()

    document.body
      .querySelector<HTMLImageElement>('.bing-image-preview__img')
      ?.dispatchEvent(new Event('load'))
    await wrapper.vm.$nextTick()

    document.body
      .querySelectorAll<HTMLButtonElement>('[aria-label="下一张图片"]')[0]
      ?.click()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-image-preview__img')).toHaveLength(1)
    expect(
      document.body.querySelector<HTMLImageElement>('.bing-image-preview__img')?.getAttribute('src'),
    ).toBe('/image-one.jpg')

    await vi.advanceTimersByTimeAsync(180)
    expect(document.body.querySelector('.bing-image-preview__loading')).not.toBeNull()

    preloaders[0]?.onload?.(new Event('load'))
    await wrapper.vm.$nextTick()

    const sources = Array.from(
      document.body.querySelectorAll<HTMLImageElement>('.bing-image-preview__img'),
      (image) => image.getAttribute('src'),
    )
    expect(sources).toContain('/image-two.jpg')

    wrapper.unmount()
  })

  it('does not flash the loading indicator when the image loads quickly', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BingImagePreview, {
      props: {
        modelValue: true,
        items,
      },
      attachTo: document.body,
    })
    await nextTick()

    const image = document.body.querySelector<HTMLImageElement>('.bing-image-preview__img')

    expect(document.body.querySelector('.bing-image-preview__loading')).toBeNull()
    image?.dispatchEvent(new Event('load'))
    await wrapper.vm.$nextTick()
    await vi.advanceTimersByTimeAsync(400)

    expect(document.body.querySelector('.bing-image-preview__loading')).toBeNull()
  })

  it('shows a stable loading indicator in the toolbar for slower images', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BingImagePreview, {
      props: {
        modelValue: true,
        items,
      },
      attachTo: document.body,
    })
    await nextTick()

    await vi.advanceTimersByTimeAsync(180)
    await wrapper.vm.$nextTick()

    const loading = document.body.querySelector('.bing-image-preview__loading')
    const loadingSlot = document.body.querySelector('.bing-image-preview__loading-slot')

    expect(loading).not.toBeNull()
    expect(loadingSlot?.contains(loading)).toBe(true)

    document.body
      .querySelector<HTMLImageElement>('.bing-image-preview__img')
      ?.dispatchEvent(new Event('load'))
    await vi.advanceTimersByTimeAsync(219)
    expect(document.body.querySelector('.bing-image-preview__loading')).not.toBeNull()

    await vi.advanceTimersByTimeAsync(1)
    await wrapper.vm.$nextTick()
    expect(document.body.querySelector('.bing-image-preview__loading')).toBeNull()
  })

  it('closes with Escape when enabled', async () => {
    const wrapper = mount(BingImagePreview, {
      props: {
        modelValue: true,
        items,
      },
      attachTo: document.body,
    })
    await nextTick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['escape'])
  })

  it('emits download and creates a download link', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const wrapper = mount(BingImagePreview, {
      props: {
        modelValue: true,
        items,
        initialIndex: 1,
        downloadable: true,
      },
      attachTo: document.body,
    })
    await nextTick()

    const downloadButton = document.body.querySelector<HTMLButtonElement>('[aria-label="下载图片"]')
    downloadButton?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('download')?.[0]?.[0]).toMatchObject({
      index: 1,
      item: {
        src: '/image-two.jpg',
      },
    })
    expect(appendSpy).toHaveBeenCalled()
  })
})
