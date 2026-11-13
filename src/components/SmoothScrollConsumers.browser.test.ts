import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick } from 'vue'
import type { App } from 'vue'
import BingCarouselTransition from './BingCarouselTransition/BingCarouselTransition.vue'
import BingCodeBlock from './BingCodeBlock/BingCodeBlock.vue'
import BingDialog from './BingDialog/BingDialog.vue'
import BingFilePreview from './BingFilePreview/BingFilePreview.vue'
import BingSelect from './BingSelect/BingSelect.vue'
import BingTable from './BingTable/BingTable.vue'

interface MountedApp {
  app: App<Element>
  host: HTMLElement
}

const mountedApps: MountedApp[] = []

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

async function waitFor(condition: () => boolean, timeout = 1_500) {
  const startedAt = performance.now()

  while (!condition()) {
    if (performance.now() - startedAt > timeout) {
      throw new Error('Timed out while waiting for the browser layout to settle')
    }

    await wait(16)
  }
}

function mountInBrowser(render: () => ReturnType<typeof h>, width = 720) {
  const host = document.createElement('div')
  host.style.width = `${width}px`
  host.style.maxWidth = `${width}px`
  document.body.appendChild(host)

  const app = createApp({ render })
  app.mount(host)
  mountedApps.push({ app, host })

  return host
}

afterEach(() => {
  mountedApps.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
})

describe('smooth-scroll consumer integration in a browser', () => {
  it('smooths the main BingTable viewport by default and exposes an intermediate frame', async () => {
    const columns = [
      { key: 'name', title: 'Name', width: 220 },
      { key: 'status', title: 'Status', width: 180 },
      { key: 'owner', title: 'Owner', width: 220 },
    ]
    const data = Array.from({ length: 36 }, (_, index) => ({
      id: index + 1,
      name: `Browser row ${index + 1}`,
      status: index % 2 === 0 ? 'Ready' : 'Review',
      owner: `Owner ${index + 1}`,
    }))
    const host = mountInBrowser(() =>
      h(BingTable, {
        columns,
        data,
        rowKey: 'id',
        height: 180,
        virtual: false,
        showColumnControls: false,
        smoothScroll: {
          duration: 600,
          accelerationMax: 1,
          respectReducedMotion: false,
          smoothTouchpad: true,
        },
      }),
    )

    await nextTick()

    const scrollbar = host.querySelector<HTMLElement>('.bing-table__scroll')
    const viewport = scrollbar?.querySelector<HTMLElement>('.bing-scrollbar__viewport')

    expect(scrollbar).not.toBeNull()
    expect(viewport).not.toBeNull()
    await waitFor(() => viewport!.scrollHeight > viewport!.clientHeight)
    expect(scrollbar!.classList.contains('is-smooth')).toBe(true)

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewport!.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(true)
    expect(viewport!.scrollTop).toBe(0)

    await waitFor(() => viewport!.scrollTop > 0)
    expect(viewport!.scrollTop).toBeGreaterThan(0)
    expect(viewport!.scrollTop).toBeLessThan(100)
  })

  it('lets overflowing BingTabs consume horizontal wheel input before its parent gesture', async () => {
    const items = Array.from({ length: 18 }, (_, index) => ({
      value: index,
      label: `Long browser tab ${index + 1}`,
    }))
    let parentUpdates = 0
    const host = mountInBrowser(
      () =>
        h(BingCarouselTransition, {
          items,
          modelValue: 0,
          respectReducedMotion: false,
          'onUpdate:modelValue': () => {
            parentUpdates += 1
          },
        }),
      760,
    )

    await nextTick()

    const tabs = host.querySelector<HTMLElement>('.bing-tabs')
    expect(tabs).not.toBeNull()
    await waitFor(() => tabs!.scrollWidth > tabs!.clientWidth)

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 120,
    })
    tabs!.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(true)

    await waitFor(() => tabs!.scrollLeft > 0)
    expect(tabs!.scrollLeft).toBeGreaterThan(0)
    expect(tabs!.scrollLeft).toBeLessThanOrEqual(72)

    await wait(80)
    expect(parentUpdates).toBe(0)
    expect(host.querySelector('.bing-carousel-transition__panel.is-active')?.textContent).toContain(
      items[0].label,
    )
  })

  it('keeps touchpad-sized BingTabs wheel input native without reaching its parent gesture', async () => {
    const items = Array.from({ length: 18 }, (_, index) => ({
      value: index,
      label: `Long touchpad tab ${index + 1}`,
    }))
    let parentUpdates = 0
    let parentWheelEvents = 0
    const host = mountInBrowser(
      () =>
        h(BingCarouselTransition, {
          items,
          modelValue: 0,
          respectReducedMotion: false,
          'onUpdate:modelValue': () => {
            parentUpdates += 1
          },
        }),
      760,
    )

    await nextTick()

    const carousel = host.querySelector<HTMLElement>('.bing-carousel-transition')
    const tabs = host.querySelector<HTMLElement>('.bing-tabs')

    expect(carousel).not.toBeNull()
    expect(tabs).not.toBeNull()
    await waitFor(() => tabs!.scrollWidth > tabs!.clientWidth)
    expect(tabs!.scrollLeft).toBeLessThan(tabs!.scrollWidth - tabs!.clientWidth)

    carousel!.addEventListener('wheel', () => {
      parentWheelEvents += 1
    })

    const touchpadWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 3,
    })
    tabs!.dispatchEvent(touchpadWheel)

    expect(touchpadWheel.defaultPrevented).toBe(false)
    expect(parentWheelEvents).toBe(0)

    await wait(100)
    expect(parentUpdates).toBe(0)
  })

  it('keeps the CSV preview on one scrollable host for both axes', async () => {
    const header = Array.from({ length: 12 }, (_, index) => `Column ${index + 1}`)
    const rows = Array.from({ length: 40 }, (_, rowIndex) =>
      header.map((_, columnIndex) => `Row ${rowIndex + 1} column ${columnIndex + 1} content`),
    )
    const csv = [header, ...rows].map((row) => row.join(',')).join('\n')
    mountInBrowser(
      () =>
        h(BingFilePreview, {
          modelValue: true,
          file: {
            name: 'browser-grid.csv',
            type: 'csv',
            content: csv,
          },
          width: 440,
          height: 320,
          lockScroll: false,
          teleportTo: document.body,
        }),
      520,
    )

    await nextTick()
    await waitFor(() => Boolean(document.body.querySelector('.bing-file-preview__table')))

    const tableWrap = document.body.querySelector<HTMLElement>('.bing-file-preview__table-wrap')
    const scrollbar = tableWrap?.querySelector<HTMLElement>('.bing-file-preview__scroll')
    const viewport = tableWrap?.querySelector<HTMLElement>('.bing-scrollbar__viewport')

    expect(tableWrap).not.toBeNull()
    expect(scrollbar).not.toBeNull()
    expect(viewport).not.toBeNull()
    await waitFor(
      () =>
        viewport!.scrollWidth > viewport!.clientWidth &&
        viewport!.scrollHeight > viewport!.clientHeight,
    )

    const actualScrollHosts = Array.from(
      tableWrap!.querySelectorAll<HTMLElement>('*'),
    ).filter((element) => {
      const style = window.getComputedStyle(element)
      const scrollsX =
        /^(auto|scroll|overlay)$/.test(style.overflowX) &&
        element.scrollWidth > element.clientWidth
      const scrollsY =
        /^(auto|scroll|overlay)$/.test(style.overflowY) &&
        element.scrollHeight > element.clientHeight

      return scrollsX || scrollsY
    })

    expect(actualScrollHosts).toEqual([viewport])
    expect(
      window.getComputedStyle(tableWrap!.querySelector('.bing-file-preview__table-scroll')!)
        .overflowX,
    ).not.toBe('auto')
    await waitFor(() => scrollbar!.classList.contains('has-horizontal-overflow'))

    const horizontalWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
      shiftKey: true,
    })
    viewport!.dispatchEvent(horizontalWheel)

    expect(horizontalWheel.defaultPrevented).toBe(true)
    expect(viewport!.scrollLeft).toBe(0)

    await waitFor(() => viewport!.scrollLeft > 0)
    expect(viewport!.scrollLeft).toBeGreaterThan(0)
    expect(viewport!.scrollLeft).toBeLessThanOrEqual(100)
  })

  it('forwards header Shift+wheel input to the default smooth CodeBlock viewport', async () => {
    const code = `const veryLongValue = '${'smooth-scroll-content-'.repeat(32)}'`
    const host = mountInBrowser(
      () =>
        h(BingCodeBlock, {
          code,
          language: 'text',
          title: 'Header wheel forwarding',
          width: 320,
          copyable: false,
        }),
      360,
    )

    await nextTick()

    const header = host.querySelector<HTMLElement>('.bing-code-block__header')
    const scrollbar = host.querySelector<HTMLElement>('.bing-code-block__scroll')
    const viewport = scrollbar?.querySelector<HTMLElement>('.bing-scrollbar__viewport')

    expect(header).not.toBeNull()
    expect(scrollbar).not.toBeNull()
    expect(viewport).not.toBeNull()
    await waitFor(() => viewport!.scrollWidth > viewport!.clientWidth)
    expect(scrollbar!.classList.contains('is-smooth')).toBe(true)

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
      shiftKey: true,
    })
    header!.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(true)
    expect(viewport!.scrollLeft).toBe(0)

    await waitFor(() => viewport!.scrollLeft > 0)
    expect(viewport!.scrollLeft).toBeGreaterThan(0)
    expect(viewport!.scrollLeft).toBeLessThanOrEqual(100)
  })

  it('keeps touchpad-sized CodeBlock header input on the immediate fallback path', async () => {
    const code = `const veryLongValue = '${'touchpad-fallback-content-'.repeat(32)}'`
    const host = mountInBrowser(
      () =>
        h(BingCodeBlock, {
          code,
          language: 'text',
          title: 'Touchpad fallback forwarding',
          width: 320,
          copyable: false,
        }),
      360,
    )

    await nextTick()

    const header = host.querySelector<HTMLElement>('.bing-code-block__header')
    const viewport = host.querySelector<HTMLElement>(
      '.bing-code-block__scroll .bing-scrollbar__viewport',
    )

    expect(header).not.toBeNull()
    expect(viewport).not.toBeNull()
    await waitFor(() => viewport!.scrollWidth > viewport!.clientWidth)

    const horizontalTouchpadWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaX: 3,
      shiftKey: true,
    })
    header!.dispatchEvent(horizontalTouchpadWheel)

    expect(horizontalTouchpadWheel.defaultPrevented).toBe(true)
    const firstImmediatePosition = viewport!.scrollLeft
    expect(firstImmediatePosition).toBeGreaterThan(2.5)
    expect(firstImmediatePosition).toBeLessThan(3.5)

    const shiftedTouchpadWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 4,
      shiftKey: true,
    })
    header!.dispatchEvent(shiftedTouchpadWheel)

    expect(shiftedTouchpadWheel.defaultPrevented).toBe(true)
    const secondImmediatePosition = viewport!.scrollLeft
    expect(secondImmediatePosition - firstImmediatePosition).toBeGreaterThan(3.5)
    expect(secondImmediatePosition - firstImmediatePosition).toBeLessThan(4.5)

    await wait(64)
    expect(viewport!.scrollLeft).toBeCloseTo(secondImmediatePosition, 1)
  })

  it('smooths a virtualized long BingSelect panel without making the listbox focusable', async () => {
    const options = Array.from({ length: 160 }, (_, index) => ({
      label: `Virtual browser option ${index + 1}`,
      value: index + 1,
    }))
    const host = mountInBrowser(
      () =>
        h(BingSelect, {
          options,
          virtual: true,
          searchable: false,
          panelMaxHeight: 180,
          width: 300,
        }),
      340,
    )

    await nextTick()
    host.querySelector<HTMLButtonElement>('.bing-select__trigger')?.click()
    await waitFor(() => Boolean(document.body.querySelector('.bing-select__panel')))

    const scrollbar = document.body.querySelector<HTMLElement>('.bing-select__panel-scroll')
    const viewport = scrollbar?.querySelector<HTMLElement>('.bing-scrollbar__viewport')
    const virtualBody = document.body.querySelector<HTMLElement>(
      '.bing-select__panel-body.is-virtual',
    )
    const renderedOptions = document.body.querySelectorAll('.bing-select__option')

    expect(scrollbar).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(virtualBody).not.toBeNull()
    expect(renderedOptions.length).toBeGreaterThan(0)
    expect(renderedOptions.length).toBeLessThan(options.length)
    await waitFor(() => viewport!.scrollHeight > viewport!.clientHeight)
    expect(scrollbar!.classList.contains('is-smooth')).toBe(true)
    expect(viewport!.hasAttribute('tabindex')).toBe(false)

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    viewport!.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(true)
    expect(viewport!.scrollTop).toBe(0)

    await waitFor(() => viewport!.scrollTop > 0)
    expect(viewport!.scrollTop).toBeGreaterThan(0)
    expect(viewport!.scrollTop).toBeLessThanOrEqual(72)
  })

  it('lets the Dialog body scroll smoothly and locks the wheel at its lower boundary', async () => {
    mountInBrowser(() =>
      h(
        BingDialog,
        {
          modelValue: true,
          title: 'Scrollable browser dialog',
          width: 420,
          lockScroll: false,
          showFooter: false,
          showPeek: false,
        },
        {
          default: () =>
            h(
              'div',
              {
                class: 'dialog-browser-tall-content',
                style: 'height: 900px;',
              },
              'Tall dialog content',
            ),
        },
      ),
    )

    await nextTick()
    await waitFor(() => Boolean(document.body.querySelector('.bing-dialog')))

    const scrollbar = document.body.querySelector<HTMLElement>('.bing-dialog__body-scroll')
    const viewport = scrollbar?.querySelector<HTMLElement>('.bing-scrollbar__viewport')
    const target = document.body.querySelector<HTMLElement>('.dialog-browser-tall-content')
    const dialog = document.body.querySelector<HTMLElement>('.bing-dialog')

    expect(scrollbar).not.toBeNull()
    expect(viewport).not.toBeNull()
    expect(target).not.toBeNull()
    expect(dialog).not.toBeNull()
    try {
      await waitFor(
        () => viewport!.clientHeight > 0 && viewport!.scrollHeight > viewport!.clientHeight,
      )
    } catch {
      throw new Error(
        `Dialog body did not become scrollable (clientHeight=${viewport!.clientHeight}, scrollHeight=${viewport!.scrollHeight}, dialogHeight=${document.body.querySelector<HTMLElement>('.bing-dialog')?.clientHeight ?? 0})`,
      )
    }
    expect(viewport!.clientHeight).toBeGreaterThan(0)
    expect(viewport!.clientHeight).toBeLessThan(viewport!.scrollHeight)
    const computedDialogMaxHeight = Number.parseFloat(
      window.getComputedStyle(dialog!).maxHeight,
    )
    const maximumDialogHeight = computedDialogMaxHeight + 2
    const renderedDialogHeight = dialog!.getBoundingClientRect().height
    if (renderedDialogHeight > maximumDialogHeight) {
      throw new Error(
        `Dialog exceeded its computed max height (rendered=${renderedDialogHeight}, allowed=${maximumDialogHeight}, clientHeight=${dialog!.clientHeight}, computedMaxHeight=${window.getComputedStyle(dialog!).maxHeight}, viewportClientHeight=${viewport!.clientHeight}, viewportScrollHeight=${viewport!.scrollHeight})`,
      )
    }
    expect(scrollbar!.classList.contains('is-smooth')).toBe(true)

    const wheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    target!.dispatchEvent(wheel)

    expect(wheel.defaultPrevented).toBe(true)
    await waitFor(() => viewport!.scrollTop > 0)
    expect(viewport!.scrollTop).toBeGreaterThan(0)
    expect(viewport!.scrollTop).toBeLessThanOrEqual(100)

    await wait(420)
    const maximum = viewport!.scrollHeight - viewport!.clientHeight
    viewport!.scrollTop = maximum

    const boundaryWheel = new WheelEvent('wheel', {
      bubbles: true,
      cancelable: true,
      deltaY: 120,
    })
    target!.dispatchEvent(boundaryWheel)

    expect(boundaryWheel.defaultPrevented).toBe(true)
    expect(Math.abs(viewport!.scrollTop - maximum)).toBeLessThan(0.6)
  })

  it('keeps a short Dialog body naturally sized and non-collapsed', async () => {
    mountInBrowser(() =>
      h(
        BingDialog,
        {
          modelValue: true,
          title: 'Short browser dialog',
          width: 420,
          lockScroll: false,
          showFooter: false,
          showPeek: false,
        },
        {
          default: () => h('div', { style: 'height: 48px;' }, 'Short dialog content'),
        },
      ),
    )

    await nextTick()
    await waitFor(() => Boolean(document.body.querySelector('.bing-dialog')))

    const dialog = document.body.querySelector<HTMLElement>('.bing-dialog')
    const viewport = document.body.querySelector<HTMLElement>(
      '.bing-dialog__body-scroll .bing-scrollbar__viewport',
    )

    expect(dialog).not.toBeNull()
    expect(viewport).not.toBeNull()
    await waitFor(() => viewport!.clientHeight > 0)
    expect(viewport!.clientHeight).toBeGreaterThan(0)
    expect(viewport!.scrollHeight).toBeLessThanOrEqual(viewport!.clientHeight + 1)
    expect(dialog!.getBoundingClientRect().height).toBeLessThan(
      Math.min(window.innerHeight * 0.82, 760),
    )
  })
})
