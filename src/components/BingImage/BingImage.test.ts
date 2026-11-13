import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it } from 'vitest'
import BingImage from './BingImage.vue'
import imageSource from './BingImage.vue?raw'

describe('BingImage', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('renders an image with lazy loading defaults', () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/photo.jpg',
        alt: 'A bright product photo',
        width: 320,
        height: 180,
      },
    })

    const image = wrapper.get('img')

    expect(wrapper.classes()).toContain('bing-image')
    expect(wrapper.classes()).toContain('bing-image--rounded-md')
    expect(wrapper.classes()).toContain('is-loading')
    expect(wrapper.attributes('aria-busy')).toBe('true')
    expect(image.attributes()).toMatchObject({
      src: '/photo.jpg',
      alt: 'A bright product photo',
      width: '320',
      height: '180',
      loading: 'lazy',
      decoding: 'async',
      fetchpriority: 'auto',
    })
  })

  it('themes loading and error chrome without changing placeholder image treatment', () => {
    const placeholderImageRule =
      imageSource.match(/\.bing-image__placeholder-img\s*{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(imageSource).toContain('var(--bing-surface-solid)')
    expect(imageSource).toContain('var(--bing-surface-solid) 82%')
    expect(imageSource).toContain('rgb(var(--bing-highlight-rgb))')
    expect(imageSource).not.toContain('#fff7fb')
    expect(imageSource).not.toContain('#f0f9ff')
    expect(placeholderImageRule).toContain('opacity: 0.7')
    expect(placeholderImageRule).toContain('filter: blur(18px) saturate(1.08)')
  })

  it('applies sizing, fit, position, radius, and block classes', () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/wide.jpg',
        width: '100%',
        aspectRatio: '16 / 9',
        fit: 'contain',
        position: 'top right',
        radius: 'xl',
        block: true,
      },
    })

    expect(wrapper.classes()).toContain('bing-image--rounded-xl')
    expect(wrapper.classes()).toContain('is-block')
    expect(wrapper.attributes('style')).toContain('width: 100%')
    expect(wrapper.attributes('style')).toContain('aspect-ratio: 16 / 9')
    expect(wrapper.attributes('style')).toContain('--bing-image-fit: contain')
    expect(wrapper.attributes('style')).toContain('--bing-image-position: top right')
  })

  it('shows loading UI until the image loads', async () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/photo.jpg',
      },
    })

    expect(wrapper.find('.bing-image__placeholder').exists()).toBe(true)
    expect(wrapper.find('.bing-image__spinner').exists()).toBe(true)

    const image = wrapper.get('img')
    Object.defineProperty(image.element, 'naturalWidth', { value: 640, configurable: true })
    Object.defineProperty(image.element, 'naturalHeight', { value: 360, configurable: true })
    await image.trigger('load')

    expect(wrapper.classes()).toContain('is-loaded')
    expect(wrapper.find('.bing-image__spinner').exists()).toBe(false)
    expect(wrapper.emitted('load')?.[0]?.[0]).toMatchObject({
      src: '/photo.jpg',
      naturalWidth: 640,
      naturalHeight: 360,
    })
  })

  it('uses fallbackSrc after the first image errors', async () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/broken.jpg',
        fallbackSrc: '/fallback.jpg',
      },
    })

    await wrapper.get('img').trigger('error')
    await nextTick()

    expect(wrapper.get('img').attributes('src')).toBe('/fallback.jpg')
    expect(wrapper.classes()).toContain('is-loading')
    expect(wrapper.emitted('error')?.[0]?.[0]).toMatchObject({
      src: '/broken.jpg',
      isFallback: false,
    })
  })

  it('does not keep the original srcset when fallbackSrc is used', async () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/broken.jpg',
        srcset: '/valid-small.jpg 320w, /valid-large.jpg 960w',
        sizes: '320px',
        fallbackSrc: '/fallback.jpg',
      },
    })

    await wrapper.get('img').trigger('error')
    await nextTick()

    const image = wrapper.get('img')

    expect(image.attributes('src')).toBe('/fallback.jpg')
    expect(image.attributes('srcset')).toBeUndefined()
    expect(image.attributes('sizes')).toBeUndefined()
  })

  it('shows the error state when the final image errors', async () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/broken.jpg',
        errorText: 'Could not load',
      },
    })

    await wrapper.get('img').trigger('error')

    expect(wrapper.classes()).toContain('is-error')
    expect(wrapper.find('.bing-image__error').exists()).toBe(true)
    expect(wrapper.text()).toContain('Could not load')
    expect(wrapper.emitted('statusChange')?.at(-1)?.[0]).toMatchObject({
      status: 'error',
      src: '/broken.jpg',
    })
  })

  it('resets to loading when src changes', async () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/first.jpg',
      },
    })

    await wrapper.get('img').trigger('error')
    expect(wrapper.classes()).toContain('is-error')

    await wrapper.setProps({
      src: '/second.jpg',
    })

    expect(wrapper.classes()).toContain('is-loading')
    expect(wrapper.get('img').attributes('src')).toBe('/second.jpg')
  })

  it('supports custom loading and error slots', async () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/broken.jpg',
      },
      slots: {
        loading: '<span data-test="loading">Loading slot</span>',
        error: '<span data-test="error">Error slot</span>',
      },
    })

    expect(wrapper.find('[data-test="loading"]').exists()).toBe(true)

    await wrapper.get('img').trigger('error')

    expect(wrapper.find('[data-test="error"]').exists()).toBe(true)
  })

  it('opens the preview after the image has loaded', async () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/photo.jpg',
        alt: 'Previewable image',
        preview: true,
        previewDownloadable: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('img').trigger('load')
    await wrapper.get('figure').trigger('click')
    await nextTick()

    const previewImage = document.body.querySelector<HTMLImageElement>('.bing-image-preview__img')

    expect(wrapper.get('figure').attributes('role')).toBe('button')
    expect(previewImage?.getAttribute('src')).toBe('/photo.jpg')
    expect(wrapper.emitted('previewOpen')?.[0]?.[0]).toMatchObject({
      src: '/photo.jpg',
    })
  })

  it('supports keyboard preview opening', async () => {
    const wrapper = mount(BingImage, {
      props: {
        src: '/photo.jpg',
        preview: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('img').trigger('load')
    await wrapper.get('figure').trigger('keydown', { key: 'Enter' })
    await nextTick()

    expect(document.body.querySelector('.bing-image-preview-root')).not.toBeNull()
  })
})
