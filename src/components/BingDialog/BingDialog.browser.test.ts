import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingButton from '../BingButton/BingButton.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingDialog from './BingDialog.vue'
import type { BingDialogProps } from './BingDialog.types'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
})

function expectFocusRingVisible(control: HTMLElement, outset: number) {
  const bounds = control.getBoundingClientRect()
  expect(outset).toBeGreaterThan(0)
  for (let ancestor = control.parentElement; ancestor; ancestor = ancestor.parentElement) {
    const styles = getComputedStyle(ancestor)
    const clips = (value: string) => /^(hidden|clip|auto|scroll)$/.test(value)
    const clip = ancestor.getBoundingClientRect()
    if (clips(styles.overflowY)) {
      expect(bounds.top - outset, `${ancestor.className} 上边界`).toBeGreaterThanOrEqual(clip.top)
      expect(bounds.bottom + outset, `${ancestor.className} 下边界`).toBeLessThanOrEqual(clip.bottom)
    }
    if (clips(styles.overflowX)) {
      expect(bounds.left - outset, `${ancestor.className} 左边界`).toBeGreaterThanOrEqual(clip.left)
      expect(bounds.right + outset, `${ancestor.className} 右边界`).toBeLessThanOrEqual(clip.right)
    }
    if (ancestor.classList.contains('bing-dialog')) break
  }
}

describe('Dialog 内容区的焦点轮廓', () => {
  it.each([1280, 390])('在 %ipx 视口下保留首项输入框及滚动末尾按钮的完整轮廓', async width => {
    await page.viewport(width, 844)
    host = document.createElement('div')
    document.body.append(host)
    app = createApp({
      render: () => h(BingDialog, { modelValue: true, title: '高级设置', showPeek: false, width: 420 }, () => [
        h(BingInput, { placeholder: '扩展备注', block: true }),
        h('div', { style: 'height: 900px' }),
        h(BingButton, { id: 'last-dialog-action' }, () => '末尾操作'),
      ]),
    })
    app.mount(host)
    await nextTick()
    const dialog = document.querySelector<HTMLElement>('.bing-dialog')!
    await expect.poll(() => dialog.closest('.bing-dialog-root')!.classList.contains('is-active')).toBe(true)
    const outer = dialog.querySelector<HTMLElement>('.bing-dialog__body-scroll')!
    const viewport = outer.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    const input = dialog.querySelector<HTMLInputElement>('input')!
    const control = input.closest<HTMLElement>('.bing-input')!
    const button = dialog.querySelector<HTMLButtonElement>('#last-dialog-action')!
    const inputFocusOutset = () => {
      const lengths = getComputedStyle(control).boxShadow.match(/-?[\d.]+px/g) ?? []
      return Number.parseFloat(lengths[3] ?? '0')
    }
    const checkInput = () => {
      expectFocusRingVisible(control, inputFocusOutset())
      expect(outer.scrollTop).toBe(0)
    }

    input.focus()
    // 当前控件焦点框为 2px，等待完整展开，避免字符串命中过渡中的小数值。
    await expect.poll(inputFocusOutset).toBe(2)
    checkInput()
    await userEvent.keyboard('{Tab}')
    button.focus()
    await nextTick()
    expect(button.matches(':focus-visible')).toBe(true)
    const styles = getComputedStyle(button)
    expectFocusRingVisible(button, Number.parseFloat(styles.outlineWidth) + Number.parseFloat(styles.outlineOffset))
    expect(viewport.scrollTop).toBeGreaterThan(0)
    expect(outer.scrollTop).toBe(0)

    input.focus()
    await expect.poll(inputFocusOutset).toBe(2)
    checkInput()
  })
})

describe('Dialog 固定框架', () => {
  it.each([
    [1280, 900, 900, 600],
    [1280, 900, 480, 480],
    [390, 620, 900, 600],
    [900, 420, 900, 600],
  ])('视口 %i×%i 下限制 %i×%i 弹窗，并固定头部分类与底部', async (vw, vh, width, height) => {
    await page.viewport(vw!, vh!)
    const props = ref<BingDialogProps>({ modelValue: true, title: '项目设置', width, maxWidth: width,
      height, showPeek: false, smoothScroll: false })
    host = document.createElement('div')
    document.body.append(host)
    app = createApp({ render: () => h(BingDialog, props.value, {
      'header-addon': () => h('button', { id: 'category' }, '项目成员'),
      default: () => h('div', { style: 'height: 1200px' }, '长内容'),
    }) })
    app.mount(host)
    await nextTick()
    const dialog = document.querySelector<HTMLElement>('.bing-dialog')!
    await expect.poll(() => dialog.closest('.bing-dialog-root')!.classList.contains('is-active')).toBe(true)
    const gutter = vw! <= 560 ? 0 : 24
    const bounds = dialog.getBoundingClientRect()
    expect(bounds.width).toBeCloseTo(Math.min(width!, vw! - gutter * 2), 0)
    expect(bounds.height).toBeCloseTo(Math.min(height!, vh! - gutter * 2), 0)
    expect(bounds.top).toBeGreaterThanOrEqual(gutter - 1)
    expect(bounds.bottom).toBeLessThanOrEqual(vh! - gutter + 1)
    const header = dialog.querySelector<HTMLElement>('.bing-dialog__header')!
    const footer = dialog.querySelector<HTMLElement>('.bing-dialog__footer')!
    const viewport = dialog.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    const headerTop = header.getBoundingClientRect().top
    const footerTop = footer.getBoundingClientRect().top
    expect(viewport.clientHeight).toBeGreaterThan(0)
    expect(viewport.contains(dialog.querySelector('#category'))).toBe(false)
    viewport.scrollTop = 300
    await nextTick()
    expect(viewport.scrollTop).toBe(300)
    expect(header.getBoundingClientRect().top).toBeCloseTo(headerTop)
    expect(footer.getBoundingClientRect().top).toBeCloseTo(footerTop)
    props.value = { ...props.value, maxHeight: '300px' }
    await nextTick()
    expect(dialog.getBoundingClientRect().height).toBeCloseTo(300)
    props.value = { ...props.value, showFooter: false }
    await nextTick()
    expect(dialog.getBoundingClientRect().height).toBeCloseTo(300)
    expect(dialog.querySelector('.bing-dialog__footer')).toBeNull()
    expect(viewport.clientHeight).toBeGreaterThan(0)
  })
})

async function mountDialog(props: Partial<BingDialogProps> = {}, content = () => h('input', { id: 'initial-input' })) {
  const open = ref(props.modelValue ?? true)
  const closes: string[] = [], prevented: string[] = []
  host = document.createElement('div')
  document.body.append(host)
  app = createApp({ render: () => h(BingDialog, { title: '交互验证', ...props, modelValue: open.value,
    'onUpdate:modelValue': value => { open.value = value }, onClose: reason => closes.push(reason),
    'onClose-prevented': reason => prevented.push(reason) }, content) })
  app.mount(host)
  await nextTick()
  await expect.poll(() => document.querySelector('.bing-dialog-root')?.classList.contains('is-active')).toBe(true)
  return { open, closes, prevented, panel: document.querySelector<HTMLElement>('.bing-dialog')! }
}

describe('Dialog 新交互', () => {
  it('keeps rejection and closing scale continuous from the CSS resting state', async () => {
    await page.viewport(1280, 900)
    const fixture = await mountDialog({ closeOnEsc: false })
    const startWidth = fixture.panel.getBoundingClientRect().width
    await userEvent.keyboard('{Escape}')
    const rejectionWidths: number[] = []
    for (let index = 0; index < 24; index++) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      rejectionWidths.push(fixture.panel.getBoundingClientRect().width / startWidth)
    }
    expect(Math.min(...rejectionWidths)).toBeGreaterThan(0.995)
    expect(Math.max(...rejectionWidths)).toBeLessThanOrEqual(1.016)
    fixture.open.value = false
    await nextTick()
    const closingWidths: number[] = []
    while (fixture.panel.isConnected) {
      closingWidths.push(fixture.panel.getBoundingClientRect().width / startWidth)
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    }
    expect(Math.min(...closingWidths)).toBeGreaterThanOrEqual(0.959)
    expect(Math.max(...closingWidths)).toBeLessThanOrEqual(1.001)
  })

  it('raises the mobile footer into the visual viewport and restores it when the keyboard closes', async () => {
    await page.viewport(390, 844)
    const original = Object.getOwnPropertyDescriptor(window, 'visualViewport')!
    const viewport = Object.assign(new EventTarget(), { height: 500, offsetTop: 20, scale: 1 })
    Object.defineProperty(window, 'visualViewport', { configurable: true, value: viewport })
    try {
      const fixture = await mountDialog({ height: 600 })
      expect(fixture.panel.getBoundingClientRect().bottom).toBeCloseTo(520, 0)
      expect(fixture.panel.getBoundingClientRect().height).toBeLessThanOrEqual(500)
      viewport.height = 844; viewport.offsetTop = 0
      viewport.dispatchEvent(new Event('resize'))
      await nextTick()
      expect(fixture.panel.getBoundingClientRect().bottom).toBeCloseTo(844, 0)
    } finally {
      app?.unmount(); app = undefined
      Object.defineProperty(window, 'visualViewport', original)
    }
  })

  it.each(['auto', false, '#chosen'] as const)('resolves initialFocus=%s and keeps keyboard focus inside the dialog', async initialFocus => {
    await page.viewport(1280, 900)
    const fixture = await mountDialog({ initialFocus }, () => h('div', [h('input', { id: 'initial-input' }), h('input', { id: 'chosen' })]))
    expect(document.activeElement).toBe(document.querySelector(initialFocus === false ? '.bing-dialog__peek' : initialFocus === 'auto' ? '#initial-input' : '#chosen'))
    await userEvent.keyboard('{Shift>}{Tab}{/Shift}')
    expect(fixture.panel.contains(document.activeElement)).toBe(true)
  })

  it('shows scroll separators only where needed without moving the shell or footer', async () => {
    await page.viewport(1280, 900)
    const height = ref(20)
    const fixture = await mountDialog({ maxHeight: 360, smoothScroll: false }, () => h('div', { style: { height: `${height.value}px` } }, '可变内容'))
    const root = fixture.panel.parentElement!
    expect(root.classList.contains('is-scrolled')).toBe(false)
    expect(root.classList.contains('has-more-below')).toBe(false)
    height.value = 900
    await expect.poll(() => root.classList.contains('has-more-below')).toBe(true)
    const viewport = root.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    const footer = root.querySelector<HTMLElement>('.bing-dialog__footer')!
    const bounds = fixture.panel.getBoundingClientRect(), footerTop = footer.getBoundingClientRect().top
    viewport.scrollTop = 80
    await expect.poll(() => root.classList.contains('is-scrolled')).toBe(true)
    expect(fixture.panel.getBoundingClientRect().height).toBe(bounds.height)
    expect(footer.getBoundingClientRect().top).toBe(footerTop)
    viewport.scrollTop = viewport.scrollHeight
    await expect.poll(() => root.classList.contains('has-more-below')).toBe(false)
    expect(footer.getBoundingClientRect().top).toBe(footerTop)
    height.value = 20
    await expect.poll(() => root.classList.contains('is-scrolled')).toBe(false)
  })

  it('starts toward a bottom-right trigger and returns focus after cancellation', async () => {
    await page.viewport(1280, 900)
    const open = ref(false)
    host = document.createElement('div'); document.body.append(host)
    app = createApp({ render: () => h('div', [
      h('button', { id: 'origin-trigger', style: 'position: fixed; right: 30px; bottom: 30px', onClick: () => { open.value = true } }, '打开'),
      h(BingDialog, { modelValue: open.value, 'onUpdate:modelValue': value => { open.value = value } }, () => '内容'),
    ]) })
    app.mount(host)
    const trigger = host.querySelector<HTMLButtonElement>('#origin-trigger')!
    trigger.focus(); trigger.click()
    await nextTick(); await nextTick()
    const panel = document.querySelector<HTMLElement>('.bing-dialog')!
    expect(Number.parseFloat(panel.style.getPropertyValue('--dialog-motion-x'))).toBeGreaterThan(0)
    expect(Number.parseFloat(panel.style.getPropertyValue('--dialog-motion-y'))).toBeGreaterThan(0)
    expect(Number.parseFloat(panel.style.getPropertyValue('--dialog-motion-scale'))).toBeLessThan(1)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => document.querySelector('.bing-dialog')).toBeNull()
    await expect.poll(() => document.activeElement).toBe(trigger)
  })

  it('covers only the lower dialog, removes duplicate blur and restores the underlying focus', async () => {
    await page.viewport(1280, 900)
    const inner = ref(false)
    host = document.createElement('div'); document.body.append(host)
    app = createApp({ render: () => h(BingDialog, { modelValue: true, title: '下层' }, () => [
      h('button', { id: 'nested-trigger', onClick: () => { inner.value = true } }, '打开确认'),
      h(BingDialog, { modelValue: inner.value, title: '上层', 'onUpdate:modelValue': value => { inner.value = value } }, () => '确认内容'),
    ]) })
    app.mount(host)
    await expect.poll(() => document.querySelector('.bing-dialog-root')?.classList.contains('is-active')).toBe(true)
    const trigger = document.querySelector<HTMLButtonElement>('#nested-trigger')!
    await userEvent.click(trigger)
    await expect.poll(() => document.querySelectorAll('.bing-dialog-root.is-active').length).toBe(2)
    const [lower, upper] = Array.from(document.querySelectorAll<HTMLElement>('.bing-dialog'))
    expect(lower!.inert).toBe(true)
    expect(upper!.inert).toBe(false)
    expect(getComputedStyle(upper!.parentElement!.querySelector('.bing-dialog__overlay-blur')!).backdropFilter).toBe('none')
    expect(document.activeElement).toBe(upper)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => document.querySelectorAll('.bing-dialog').length).toBe(1)
    await expect.poll(() => lower!.inert).toBe(false)
    await expect.poll(() => document.activeElement).toBe(trigger)
  })

  function swipe(header: HTMLElement, distance: number) {
    for (const [type, y, time] of [['pointerdown', 40, 0], ['pointermove', 40 + distance, 600], ['pointerup', 40 + distance, 800]] as const) {
      const event = new PointerEvent(type, { bubbles: true, cancelable: true, isPrimary: true, pointerId: 7, pointerType: 'touch', clientY: y, button: 0 })
      Object.defineProperty(event, 'timeStamp', { value: time })
      header.dispatchEvent(event)
    }
  }

  it('uses an edge-to-edge sheet, rebounds short drags and closes long drags with swipe', async () => {
    await page.viewport(390, 844)
    const fixture = await mountDialog({ showPeek: false }, () => h('div', { style: 'height: 300px' }, '内容'))
    const bounds = fixture.panel.getBoundingClientRect()
    expect(bounds.left).toBe(0)
    expect(bounds.right).toBe(390)
    expect(bounds.bottom).toBe(844)
    const header = fixture.panel.querySelector<HTMLElement>('.bing-dialog__header')!
    swipe(header, 20)
    await expect.poll(() => fixture.panel.style.getPropertyValue('--dialog-motion-y')).toBe('')
    expect(fixture.open.value).toBe(true)
    swipe(header, bounds.height * 0.4)
    await expect.poll(() => document.querySelector('.bing-dialog')).toBeNull()
    expect(fixture.closes).toEqual(['swipe'])
  })

  it('prevents disallowed sheet gestures and leaves body scrolling alone', async () => {
    await page.viewport(390, 844)
    const fixture = await mountDialog({ closeOnOverlay: false })
    swipe(fixture.panel.querySelector<HTMLElement>('.bing-dialog__body')!, 200)
    expect(fixture.prevented).toEqual([])
    swipe(fixture.panel.querySelector<HTMLElement>('.bing-dialog__header')!, 200)
    await expect.poll(() => fixture.panel.style.getPropertyValue('--dialog-motion-y')).toBe('')
    expect(fixture.open.value).toBe(true)
    expect(fixture.prevented).toEqual(['swipe'])
  })
})
