import { describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import BingImagePreview from './BingImagePreview.vue'

const portraitImage = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="520" height="720" viewBox="0 0 520 720">
    <rect width="520" height="720" fill="#ede9fe" />
  </svg>
`)}`

function waitForImage(image: HTMLImageElement) {
  if (image.complete && image.naturalWidth > 0) {
    return Promise.resolve()
  }

  return new Promise<void>((resolve, reject) => {
    image.addEventListener('load', () => resolve(), { once: true })
    image.addEventListener('error', () => reject(new Error('Portrait test image failed to load')), { once: true })
  })
}

describe('BingImagePreview browser layout', () => {
  it('contains a portrait image within the available preview media area', async () => {
    const host = document.createElement('div')
    document.body.appendChild(host)

    const app = createApp({
      render: () =>
        h(BingImagePreview, {
          modelValue: true,
          items: [{ src: portraitImage, alt: 'Portrait preview' }],
        }),
    })
    app.mount(host)

    await nextTick()

    const media = document.body.querySelector<HTMLElement>('.bing-image-preview__media')
    const image = document.body.querySelector<HTMLImageElement>('.bing-image-preview__img')

    expect(media).not.toBeNull()
    expect(image).not.toBeNull()

    await waitForImage(image!)

    const mediaRect = media!.getBoundingClientRect()
    const imageRect = image!.getBoundingClientRect()
    const rootRect = document.body
      .querySelector<HTMLElement>('.bing-image-preview-root')!
      .getBoundingClientRect()
    const stageRect = document.body
      .querySelector<HTMLElement>('.bing-image-preview__stage')!
      .getBoundingClientRect()
    const tolerance = 1

    expect(mediaRect.width).toBeGreaterThan(0)
    expect(mediaRect.height).toBeGreaterThan(0)
    expect(stageRect.left).toBeGreaterThanOrEqual(rootRect.left - tolerance)
    expect(stageRect.right).toBeLessThanOrEqual(rootRect.right + tolerance)
    expect(stageRect.top).toBeGreaterThanOrEqual(rootRect.top - tolerance)
    expect(stageRect.bottom).toBeLessThanOrEqual(rootRect.bottom + tolerance)
    expect(mediaRect.left).toBeGreaterThanOrEqual(stageRect.left - tolerance)
    expect(mediaRect.right).toBeLessThanOrEqual(stageRect.right + tolerance)
    expect(mediaRect.top).toBeGreaterThanOrEqual(stageRect.top - tolerance)
    expect(mediaRect.bottom).toBeLessThanOrEqual(stageRect.bottom + tolerance)
    expect(imageRect.left).toBeGreaterThanOrEqual(mediaRect.left - tolerance)
    expect(imageRect.right).toBeLessThanOrEqual(mediaRect.right + tolerance)
    expect(imageRect.top).toBeGreaterThanOrEqual(mediaRect.top - tolerance)
    expect(imageRect.bottom).toBeLessThanOrEqual(mediaRect.bottom + tolerance)

    app.unmount()
    host.remove()
  })
})
