import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import BingFilePreview from './BingFilePreview.vue'
import filePreviewSource from './BingFilePreview.vue?raw'

const pdfDataUrl = 'data:application/pdf;base64,JVBERi0xLjQK'
const htmlDataUrl = 'data:text/html,%3Cmain%3EConverted%20preview%3C/main%3E'

describe('BingFilePreview', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('keeps theme chrome separate from the intentional paper canvas', () => {
    const rootRule =
      filePreviewSource.match(/\.bing-file-preview-root\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const panelRule =
      filePreviewSource.match(/\.bing-file-preview\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const backdropRule =
      filePreviewSource.match(/\.bing-file-preview__backdrop\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const frameRule =
      filePreviewSource.match(/\.bing-file-preview__frame\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(rootRule).toContain('--bing-file-preview-paper-canvas: #ffffff')
    expect(rootRule).toContain('--bing-file-preview-paper-text: #111827')
    expect(rootRule).toContain('--bing-file-preview-paper-border: rgb(17 24 39 / 0.1)')
    expect(rootRule).toContain('--bing-file-preview-paper-scrollbar-rail: rgb(17 24 39 / 0.075)')
    expect(panelRule).toContain('border: 1px solid var(--bing-popover-border)')
    expect(panelRule).toContain('background: var(--bing-surface-solid)')
    expect(panelRule).toContain('box-shadow: var(--bing-popover-shadow)')
    expect(backdropRule).toContain('rgb(var(--bing-shadow-rgb) / var(--bing-file-preview-glass-opacity, 0.82))')
    expect(frameRule).toContain('background: var(--bing-file-preview-paper-canvas)')
    expect(frameRule).toContain('color-scheme: light')
    expect(filePreviewSource).toContain('color: var(--bing-file-preview-paper-syntax-key)')
    expect(filePreviewSource).toContain('background: var(--bing-file-preview-paper-surface)')
    expect(filePreviewSource).toContain(
      'background: var(--bing-file-preview-paper-scrollbar-thumb)',
    )
  })

  it('forwards glass variables to the teleported dialog root', async () => {
    const wrapper = mount(BingFilePreview, {
      props: {
        modelValue: true,
        name: 'notes.txt',
        type: 'text',
        content: 'Theme probe',
        glassBlur: 7,
        glassOpacity: 0.72,
        glassSaturation: 1.08,
      },
      attachTo: document.body,
    })
    await nextTick()
    const root = document.body.querySelector<HTMLElement>('.bing-file-preview-root')
    const rootStyle = root?.getAttribute('style') ?? ''

    expect(rootStyle).toContain('--bing-file-preview-glass-blur: 7px')
    expect(rootStyle).toContain('--bing-file-preview-glass-opacity: 0.72')
    expect(rootStyle).toContain('--bing-file-preview-glass-saturation: 1.08')

    await wrapper.setProps({ glass: false })

    const solidRootStyle = root?.getAttribute('style') ?? ''

    expect(solidRootStyle).toContain('--bing-file-preview-glass-blur: 0px')
    expect(solidRootStyle).toContain('--bing-file-preview-glass-opacity: 1')
    expect(solidRootStyle).toContain('--bing-file-preview-glass-saturation: 1')
  })

  it('enables smooth content scrolling by default and allows opting out', async () => {
    const wrapper = mount(BingFilePreview, {
      props: {
        modelValue: true,
        name: 'notes.txt',
        type: 'text',
        content: 'Hello file preview',
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.querySelector('.bing-scrollbar')?.classList).toContain('is-smooth')

    await wrapper.setProps({ smoothScroll: false })

    expect(document.body.querySelector('.bing-scrollbar')?.classList).not.toContain('is-smooth')
  })

  it('renders inline text content', async () => {
    mount(BingFilePreview, {
      props: {
        modelValue: true,
        name: 'notes.txt',
        type: 'text',
        content: 'Hello file preview',
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.querySelector('.bing-file-preview-root')).not.toBeNull()
    expect(document.body.textContent).toContain('notes.txt')
    expect(document.body.textContent).toContain('Hello file preview')
  })

  it('renders CSV content as a table', async () => {
    const wrapper = mount(BingFilePreview, {
      props: {
        modelValue: true,
        name: 'report.csv',
        content: 'Name,Count\nAlpha,12\nBeta,8',
      },
      attachTo: document.body,
    })
    await nextTick()

    const table = document.body.querySelector('.bing-file-preview__table')

    expect(table).not.toBeNull()
    expect(wrapper.findComponent(BingScrollbar).props('horizontal')).toBe(true)
    expect(document.body.textContent).toContain('Alpha')
    expect(document.body.textContent).toContain('12')
  })

  it('highlights JSON tokens in the text renderer', async () => {
    mount(BingFilePreview, {
      props: {
        modelValue: true,
        name: 'sample.json',
        type: 'json',
        content: '{"name":"Ada","enabled":true,"count":3,"empty":null}',
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.querySelector('.bing-scrollbar')).not.toBeNull()
    expect(document.body.querySelector('.bing-file-preview__json-token--key')?.textContent).toBe('"name"')
    expect(document.body.querySelector('.bing-file-preview__json-token--string')?.textContent).toBe('"Ada"')
    expect(document.body.querySelector('.bing-file-preview__json-token--true')?.textContent).toBe('true')
    expect(document.body.querySelector('.bing-file-preview__json-token--number')?.textContent).toBe('3')
    expect(document.body.querySelector('.bing-file-preview__json-token--null')?.textContent).toBe('null')
  })

  it('renders PDF in an iframe', async () => {
    mount(BingFilePreview, {
      props: {
        modelValue: true,
        src: pdfDataUrl,
        name: 'sample.pdf',
      },
      attachTo: document.body,
    })
    await nextTick()

    const iframe = document.body.querySelector<HTMLIFrameElement>('.bing-file-preview__frame')

    expect(iframe?.getAttribute('src')).toBe(pdfDataUrl)
    expect(iframe?.getAttribute('title')).toBe('sample.pdf 预览')
    expect(document.body.querySelector('.bing-file-preview__icon-badge')?.textContent).toBe('PDF')
  })

  it('uses previewSrc for Office documents when provided', async () => {
    mount(BingFilePreview, {
      props: {
        modelValue: true,
        file: {
          src: '/proposal.docx',
          name: 'proposal.docx',
          previewSrc: htmlDataUrl,
        },
      },
      attachTo: document.body,
    })
    await nextTick()

    const iframe = document.body.querySelector<HTMLIFrameElement>('.bing-file-preview__frame')

    expect(iframe?.getAttribute('src')).toBe(htmlDataUrl)
  })

  it('shows a safe Office fallback when no previewSrc is provided', async () => {
    mount(BingFilePreview, {
      props: {
        modelValue: true,
        src: '/deck.pptx',
        name: 'deck.pptx',
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.textContent).toContain('暂不支持直接预览此文档')
    expect(document.body.textContent).toContain('可在新标签页打开或下载后查看')
    expect(document.body.querySelector('.bing-file-preview__icon-badge')?.textContent).toBe('PPT')
  })

  it('renders distinct Office badges by file type', async () => {
    mount(BingFilePreview, {
      props: {
        modelValue: true,
        src: '/proposal.docx',
        name: 'proposal.docx',
      },
      attachTo: document.body,
    })
    await nextTick()

    expect(document.body.querySelector('.bing-file-preview__icon-badge')?.textContent).toBe('DOC')
  })

  it('emits close on Escape', async () => {
    const wrapper = mount(BingFilePreview, {
      props: {
        modelValue: true,
        name: 'notes.txt',
        type: 'text',
        content: 'Hello',
      },
      attachTo: document.body,
    })
    await nextTick()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([false])
    expect(wrapper.emitted('close')?.[0]).toEqual(['escape'])
  })

  it('emits download and creates a link', async () => {
    const appendSpy = vi.spyOn(document.body, 'appendChild')
    const wrapper = mount(BingFilePreview, {
      props: {
        modelValue: true,
        src: 'data:text/plain,Download%20me',
        name: 'sample.txt',
        type: 'text',
        content: 'Download me',
      },
      attachTo: document.body,
    })
    await nextTick()

    const downloadButton = document.body.querySelector<HTMLButtonElement>('[aria-label="下载文件"]')
    downloadButton?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('download')?.[0]?.[0]).toMatchObject({
      kind: 'text',
      file: {
        src: 'data:text/plain,Download%20me',
        content: 'Download me',
      },
    })
    expect(appendSpy).toHaveBeenCalled()
  })
})
