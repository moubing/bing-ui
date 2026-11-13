import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import BingColorPicker from './BingColorPicker.vue'

enableAutoUnmount(afterEach)

const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  }
}

function setClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText,
    },
  })
}

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor)
    return
  }

  Reflect.deleteProperty(navigator, 'clipboard')
}

function getPanel() {
  return document.body.querySelector<HTMLElement>('.bing-color-picker__panel')
}

function getFormatInput() {
  return document.body.querySelector<HTMLInputElement>('.bing-color-picker__format-input')
}

async function openPicker(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('.bing-color-picker__trigger').trigger('click')
  await nextTick()
  await nextTick()
}

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
  restoreClipboard()
})

describe('BingColorPicker', () => {
  it('renders the selected color and follows explicit or theme glass settings', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#0EA5E9',
        width: '240px',
        minWidth: 200,
        glassBlur: 6,
        glassOpacity: 0.9,
        glassSaturation: 1.05,
      },
    })
    const style = wrapper.attributes('style') ?? ''

    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe('#0ea5e9ff')
    expect(style).toContain('--bing-color-picker-width: 240px')
    expect(style).toContain('--bing-color-picker-min-width: 200px')
    expect(style).toContain('--bing-color-picker-glass-blur: 6px')
    expect(style).toContain('--bing-color-picker-glass-opacity: 0.9')
    expect(style).toContain('--bing-color-picker-glass-saturation: 1.05')
    await wrapper.setProps({ glassBlur: undefined, glassOpacity: undefined, glassSaturation: undefined })
    expect(wrapper.attributes('style')).toContain('--bing-color-picker-glass-blur: var(--bing-glass-blur, 16px)')
    await wrapper.setProps({ glass: false })
    expect(wrapper.attributes('style')).toContain('--bing-color-picker-glass-blur: 0px')
    expect(wrapper.attributes('style')).toContain('--bing-color-picker-glass-opacity: 1')

  })

  it('opens a color panel with field, slider, two preset rows, and a format editor', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const panel = getPanel()

    expect(wrapper.classes()).toContain('is-open')
    expect(wrapper.get('.bing-color-picker__trigger').attributes('aria-expanded')).toBe('true')
    expect(panel).not.toBeNull()
    expect(panel?.querySelector('.bing-color-picker__field')).not.toBeNull()
    expect(panel?.querySelector<HTMLInputElement>('.bing-color-picker__range--hue')?.value).toBe(
      '330',
    )
    expect(panel?.querySelector<HTMLInputElement>('.bing-color-picker__range--alpha')?.value).toBe(
      '100',
    )
    expect(panel?.querySelectorAll('.bing-color-picker__preset')).toHaveLength(16)
    expect(panel?.querySelectorAll('.bing-color-picker__preset-surface')).toHaveLength(16)
    expect(panel?.querySelectorAll('.bing-color-picker__format-editor')).toHaveLength(1)
    expect(panel?.querySelector('.bing-color-picker__format-select')).not.toBeNull()
    expect(panel?.querySelector<HTMLInputElement>('.bing-color-picker__format-input')?.value).toBe(
      '#ec4899ff',
    )
    expect(panel?.textContent).toContain('HEX')
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('emits normalized hex values from the hue slider', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)
    vi.useFakeTimers()

    const range = document.body.querySelector<HTMLInputElement>('.bing-color-picker__range--hue')

    expect(range).not.toBeNull()

    range!.value = '120'
    range!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    expect(getFormatInput()?.value).toBe('#4aed4aff')
    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe('#ec4899ff')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    vi.advanceTimersByTime(181)
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['#4aed4a'])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      source: 'slider',
      value: '#4aed4a',
      hsl: 'hsl(120, 82%, 61%)',
      rgba: 'rgba(74, 237, 74, 1)',
    })
    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe('#4aed4aff')
  })

  it('updates rgba values from the alpha slider', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)
    vi.useFakeTimers()

    const range = document.body.querySelector<HTMLInputElement>('.bing-color-picker__range--alpha')

    expect(range).not.toBeNull()

    range!.value = '42'
    range!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    expect(getFormatInput()?.value).toBe('#ec48996b')
    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe('#ec4899ff')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    vi.advanceTimersByTime(181)
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['#ec4899'])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      source: 'alpha',
      value: '#ec4899',
      rgba: 'rgba(236, 72, 153, 0.42)',
      hsl: 'hsla(330, 81%, 60%, 0.42)',
    })
    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe('#ec48996b')
  })

  it('emits normalized hex values from the color field', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)
    vi.useFakeTimers()

    const field = document.body.querySelector<HTMLElement>('.bing-color-picker__field')

    expect(field).not.toBeNull()

    vi.spyOn(field!, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 200, 100))
    field!.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        clientX: 150,
        clientY: 25,
      }),
    )
    await nextTick()

    expect(getFormatInput()?.value).toBe('#bf3078ff')
    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe('#ec4899ff')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    vi.advanceTimersByTime(181)
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['#bf3078'])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      source: 'field',
      value: '#bf3078',
    })
    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe('#bf3078ff')
  })

  it('selects preset colors without closing the panel', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    document.body
      .querySelector<HTMLElement>('[title="天蓝"] .bing-color-picker__preset-surface')
      ?.click()
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['#0ea5e9'])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      source: 'preset',
      value: '#0ea5e9',
    })
    expect(getPanel()).not.toBeNull()
  })

  it('switches the visible color format with BingSelect', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec489980',
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const formatSelectTrigger = document.body.querySelector<HTMLButtonElement>(
      '.bing-color-picker__format-select .bing-select__trigger',
    )

    expect(formatSelectTrigger).not.toBeNull()

    formatSelectTrigger!.click()
    await nextTick()
    await nextTick()

    const formatSelectPanel = document.body.querySelector<HTMLElement>(
      '.bing-select__panel',
    )

    expect(formatSelectPanel?.classList.contains('is-placement-left')).toBe(
      true,
    )
    expect(formatSelectPanel?.classList.contains('is-align-middle')).toBe(true)

    const rgbaOption = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>('.bing-select__option'),
    ).find((option) => option.textContent?.includes('RGBA'))

    expect(rgbaOption).not.toBeUndefined()

    rgbaOption!.click()
    await nextTick()
    await nextTick()

    expect(getFormatInput()?.value).toBe('rgba(236, 72, 153, 0.5)')
    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe(
      'rgba(236, 72, 153, 0.5)',
    )
    expect(getPanel()).not.toBeNull()
  })

  it('accepts typed hex, rgba, and hsl color strings', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)
    vi.useFakeTimers()

    const input = getFormatInput()

    expect(input).not.toBeNull()

    input!.value = '#33669980'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    expect(input?.value).toBe('#33669980')
    expect(document.body.querySelector<HTMLInputElement>('.bing-color-picker__range--alpha')?.value).toBe(
      '50',
    )

    input!.value = 'rgba(10, 20, 30, 0.5)'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    expect(input?.value).toBe('#0a141e80')
    expect(document.body.querySelector<HTMLInputElement>('.bing-color-picker__range--alpha')?.value).toBe(
      '50',
    )

    input!.value = 'hsl(210, 50%, 40%)'
    input!.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    expect(input?.value).toBe('#336699ff')
    expect(document.body.querySelector<HTMLInputElement>('.bing-color-picker__range--alpha')?.value).toBe(
      '100',
    )

    vi.advanceTimersByTime(181)
    await nextTick()

    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['#336699'])
    expect(wrapper.emitted('change')?.at(-1)?.[0]).toMatchObject({
      source: 'input',
      value: '#336699',
      rgba: 'rgba(51, 102, 153, 1)',
      hsl: 'hsl(210, 50%, 40%)',
    })
  })

  it('retains alpha through v-model echoes while honoring later external colors', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
        'onUpdate:modelValue': (value: string) => { void wrapper.setProps({ modelValue: value }) },
      },
      attachTo: document.body,
    })
    await openPicker(wrapper)
    const input = getFormatInput()!
    input.value = 'rgba(10, 20, 30, 0.5)'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await flushPromises()
    expect(wrapper.props('modelValue')).toBe('#0a141e')
    expect(input.value).toBe('#0a141e80')
    expect(wrapper.get('.bing-color-picker__trigger-format').text()).toBe('#0a141e80')
    const hue = document.querySelector<HTMLInputElement>('.bing-color-picker__range--hue')!
    hue.value = '120'
    hue.dispatchEvent(new Event('input', { bubbles: true }))
    hue.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(input.value).toMatch(/80$/)
    await wrapper.setProps({ modelValue: '#abcdef' })
    expect(input.value).toBe('#abcdefff')
    await wrapper.setProps({ modelValue: '#11223340' })
    expect(input.value).toBe('#11223340')
  })

  it('copies format values and reports copied state', async () => {
    vi.useFakeTimers()
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard(writeText)
    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
        copyResetDelay: 900,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const copyHex = document.body.querySelector<HTMLButtonElement>('[aria-label="复制 HEX"]')

    expect(copyHex).not.toBeNull()

    copyHex!.click()
    await flushPromises()
    await nextTick()

    expect(writeText).toHaveBeenCalledWith('#ec4899ff')
    expect(wrapper.emitted('copy')?.[0]?.[0]).toMatchObject({
      format: 'hex',
      value: '#ec4899ff',
    })
    expect(copyHex?.getAttribute('aria-label')).toBe('已复制 HEX')

    vi.advanceTimersByTime(901)
    await nextTick()

    expect(copyHex?.getAttribute('aria-label')).toBe('复制 HEX')
  })

  it('does not open when disabled', async () => {
    const wrapper = mount(BingColorPicker, {
      props: {
        disabled: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-color-picker__trigger').trigger('click')
    await nextTick()

    expect(wrapper.classes()).not.toContain('is-open')
    expect(getPanel()).toBeNull()
  })

  it('places the panel above the trigger when there is no room below', async () => {
    const originalInnerHeight = window.innerHeight
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 560,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })

    const wrapper = mount(BingColorPicker, {
      props: {
        modelValue: '#ec4899',
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-color-picker').element

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(500, 240, 240, 44))

    await openPicker(wrapper)

    const panel = getPanel()

    expect(panel?.classList).toContain('is-placement-top')
    expect(Number.parseFloat(panel?.style.top ?? '0')).toBeLessThan(500)

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })
})
