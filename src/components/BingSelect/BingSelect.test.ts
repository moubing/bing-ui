import { enableAutoUnmount, mount } from '@vue/test-utils'
import { h } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'
import BingSelect from './BingSelect.vue'
import type { BingSelectOption } from './BingSelect.types'

enableAutoUnmount(afterEach)

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

function getBodyOptions() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.bing-select__option'))
}

function getBodyPanel() {
  return document.body.querySelector<HTMLElement>('.bing-select__panel')
}

function getActionRailButton(action: string) {
  return document.body.querySelector<HTMLElement>(
    `.bing-select__action-rail [data-action="${action}"]`,
  )
}

async function setSearchValue(wrapper: ReturnType<typeof mount>, value: string) {
  const input = document.body.querySelector<HTMLInputElement>('.bing-select__search input')

  expect(input).not.toBeNull()

  input!.value = value
  input!.dispatchEvent(new Event('input', { bubbles: true }))
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()

  return input!
}

const options: BingSelectOption[] = [
  {
    label: 'Aurora',
    value: 'aurora',
    description: 'Soft pink motion',
  },
  {
    label: 'Orbit',
    value: 'orbit',
    description: 'Blue hover rhythm',
  },
  {
    label: 'Disabled',
    value: 'disabled',
    disabled: true,
  },
  {
    label: 'Pulse',
    value: 'pulse',
  },
]

function createLongOptions(count: number): BingSelectOption[] {
  return Array.from({ length: count }, (_, index) => ({
    label: `Option ${index + 1}`,
    value: `option-${index + 1}`,
    description: index % 2 === 0 ? 'Even option' : 'Odd option',
  }))
}

describe('BingSelect', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('renders placeholder and selected value text', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        placeholder: 'Pick a mood',
      },
    })

    expect(wrapper.get('.bing-select__value').text()).toBe('Pick a mood')
    expect(wrapper.classes()).not.toContain('has-value')

    await wrapper.setProps({ modelValue: 'orbit' })

    expect(wrapper.get('.bing-select__value').text()).toBe('Orbit')
    expect(wrapper.classes()).toContain('has-value')
  })

  it('supports stable fluid width and minimum width styles', () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        width: '60%',
        minWidth: 180,
        glassBlur: 6,
        glassOpacity: 0.9,
        glassSaturation: 1.05,
      },
    })

    const style = wrapper.attributes('style') ?? ''

    expect(style).toContain('--bing-select-width: 60%')
    expect(style).toContain('--bing-select-min-width: 180px')
    expect(style).toContain('--bing-select-glass-blur: 6px')
    expect(style).toContain('--bing-select-glass-opacity: 0.9')
    expect(style).toContain('--bing-select-glass-saturation: 1.05')
  })

  it('uses a visibly translucent glass panel by default', () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
      },
    })

    const style = wrapper.attributes('style') ?? ''
    expect(style).toContain('--bing-select-glass-blur: var(--bing-glass-blur, 16px)')
    expect(style).toContain('--bing-select-glass-opacity: var(--bing-glass-opacity, 0.85)')
    expect(style).toContain('--bing-select-glass-saturation: var(--bing-glass-saturation, 1.05)')
  })

  it('opens the option panel from the trigger', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-open')
    expect(wrapper.get('.bing-select__trigger').attributes('aria-expanded')).toBe('true')
    expect(wrapper.find('.bing-select__panel').exists()).toBe(false)
    expect(getBodyPanel()).not.toBeNull()
    expect(document.body.querySelector('.bing-scrollbar')).not.toBeNull()
    expect(document.body.querySelector('.bing-scrollbar__viewport')).not.toBeNull()
    expect(getBodyOptions()).toHaveLength(4)
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('opens the option panel from the chevron control', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__chevron').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-open')
    expect(getBodyPanel()).not.toBeNull()
    expect(wrapper.emitted('open')).toHaveLength(1)
  })

  it('emits a single selected value and closes the panel', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    getBodyOptions()[1]?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['orbit'])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      value: 'orbit',
      option: options[1],
      options: [options[1]],
    })
    expect(wrapper.classes()).not.toContain('is-open')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('toggles multiple selections with modelValue updates', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        multiple: true,
        modelValue: [],
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    const firstOption = getBodyOptions()[0]

    expect(firstOption?.querySelector('.bing-checkbox')).not.toBeNull()
    expect(firstOption?.querySelector('.bing-select__option-mark')).toBeNull()

    firstOption?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['aurora']])

    await wrapper.setProps({ modelValue: ['aurora'] })
    getBodyOptions()[3]?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([['aurora', 'pulse']])

    await wrapper.setProps({ modelValue: ['aurora', 'pulse'] })

    expect(
      wrapper.findAll('.bing-select__tags-value .bing-select__value-tag').map((tag) => tag.text()),
    ).toEqual(['Aurora', 'Pulse'])
    expect(wrapper.get('.bing-select__trigger').attributes('aria-label')).toBe('Aurora, Pulse')
  })

  it('removes one selected value from its tag without toggling the panel', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        multiple: true,
        modelValue: ['aurora', 'orbit'],
      },
      attachTo: document.body,
    })

    const removeAurora = wrapper.get(
      '.bing-select__tags-value [aria-label="移除 Aurora"]',
    )

    await removeAurora.trigger('click')

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['orbit']])
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      value: ['orbit'],
      option: options[0],
      options: [options[1]],
    })
    expect(wrapper.classes()).not.toContain('is-open')
  })

  it('collapses overflowing selected tags into a non-closable count tag', async () => {
    let notifyResize: (() => void) | undefined

    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = () => callback([], this as unknown as ResizeObserver)
      }

      observe() {}

      disconnect() {}
    }

    vi.stubGlobal('ResizeObserver', ResizeObserverMock)

    const wrapper = mount(BingSelect, {
      props: {
        options,
        multiple: true,
        modelValue: ['aurora', 'orbit', 'disabled', 'pulse'],
      },
    })

    await wrapper.vm.$nextTick()

    const viewport = wrapper.get('.bing-select__tags-value').element
    const measuredTags = wrapper.findAll('.bing-select__measure-tag')
    const measuredOverflowTags = wrapper.findAll('.bing-select__measure-overflow')

    Object.defineProperty(viewport, 'clientWidth', {
      configurable: true,
      value: 125,
    })

    measuredTags.forEach((tag) => {
      vi.spyOn(tag.element, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 60, 24))
    })
    measuredOverflowTags.forEach((tag) => {
      vi.spyOn(tag.element, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 30, 24))
    })

    notifyResize?.()
    await new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()))
    await wrapper.vm.$nextTick()

    expect(wrapper.findAll('.bing-select__tags-value .bing-select__value-tag')).toHaveLength(1)
    expect(wrapper.get('.bing-select__tags-value .bing-select__overflow-tag').text()).toBe('+3')
    expect(
      wrapper.find('.bing-select__tags-value .bing-select__overflow-tag button').exists(),
    ).toBe(false)
  })

  it('selects all enabled options in multiple mode', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        multiple: true,
        modelValue: ['aurora'],
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    const panel = getBodyPanel()
    const selectAllToggle = getActionRailButton('toggle-select-all')

    expect(panel?.querySelector('.bing-picker__select-all')).not.toBeNull()
    expect(document.body.querySelector('.bing-select__action-rail')).not.toBeNull()
    expect(selectAllToggle).not.toBeNull()
    expect(selectAllToggle?.closest('.bing-select__panel')).toBe(panel)
    expect(selectAllToggle?.getAttribute('aria-checked')).toBe('mixed')
    expect(selectAllToggle?.textContent).toContain('1 / 3')
    expect(selectAllToggle?.getAttribute('title')).toBeNull()

    selectAllToggle?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([
      ['aurora', 'orbit', 'pulse'],
    ])

    await wrapper.setProps({ modelValue: ['aurora', 'orbit', 'pulse'] })
    selectAllToggle?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[1]).toEqual([[]])
  })

  it('filters options with acronym search and supports keyboard selection from the search input', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        searchable: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const input = await setSearchValue(wrapper, 'bhr')
    const filteredOptions = getBodyOptions()

    expect(filteredOptions).toHaveLength(1)
    expect(filteredOptions[0]?.textContent).toContain('Orbit')

    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['orbit'])
  })

  it('does not match arbitrary scattered search characters', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        searchable: true,
        noSearchResultsText: 'No scattered matches',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await setSearchValue(wrapper, 'dfkd')

    expect(getBodyOptions()).toHaveLength(0)
    expect(document.body.querySelector('.bing-select__empty')?.textContent?.trim()).toBe(
      'No scattered matches',
    )
  })

  it('focuses the search input when opening with search enabled', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        searchable: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const input = document.body.querySelector<HTMLInputElement>('.bing-select__search input')

    expect(input).not.toBeNull()
    expect(input?.placeholder).toBe('搜索选项（/）')
    expect(document.activeElement).toBe(input)
  })

  it('focuses the search input with slash when the panel is open', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        searchable: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const input = document.body.querySelector<HTMLInputElement>('.bing-select__search input')

    expect(input).not.toBeNull()

    input!.blur()
    ;(wrapper.get('.bing-select__trigger').element as HTMLElement).focus()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: '/' }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(input)
  })

  it('shows a search empty state when no option matches', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        searchable: true,
        noSearchResultsText: 'No matching moods',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await setSearchValue(wrapper, 'zzzzzz')

    expect(getBodyOptions()).toHaveLength(0)
    expect(document.body.querySelector('.bing-select__empty')?.textContent?.trim()).toBe(
      'No matching moods',
    )
  })

  it('keeps numeric search tokens precise while matching text tokens', async () => {
    const numberedOptions: BingSelectOption[] = [
      { label: 'Virtual motion 102', value: 'virtual-102' },
      { label: 'Virtual motion 120', value: 'virtual-120' },
      { label: 'Virtual motion 201', value: 'virtual-201' },
      { label: 'Virtual motion 210', value: 'virtual-210' },
    ]
    const wrapper = mount(BingSelect, {
      props: {
        options: numberedOptions,
        searchable: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await setSearchValue(wrapper, 'motion 120')

    expect(getBodyOptions()).toHaveLength(1)
    expect(getBodyOptions()[0]?.textContent).toContain('Virtual motion 120')
  })

  it('selects all only within the current search results', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
        multiple: true,
        modelValue: ['aurora'],
        searchable: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    await setSearchValue(wrapper, 'blue')

    const panel = getBodyPanel()
    const selectAllToggle = getActionRailButton('toggle-select-all')

    expect(getBodyOptions()).toHaveLength(1)
    expect(getBodyOptions()[0]?.textContent).toContain('Orbit')
    expect(panel?.querySelector('.bing-picker__select-all')).not.toBeNull()
    expect(selectAllToggle?.getAttribute('aria-label')).toBe(
      '全选结果：已选 0 项，共 1 项',
    )

    selectAllToggle?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual([['aurora', 'orbit']])
  })

  it('clears single and multiple selection values', async () => {
    const single = mount(BingSelect, {
      props: {
        options,
        modelValue: 'aurora',
      },
    })

    await single.get('.bing-select__clear').trigger('click')

    expect(single.emitted('clear')).toHaveLength(1)
    expect(single.emitted('update:modelValue')?.[0]).toEqual([null])

    const multiple = mount(BingSelect, {
      props: {
        options,
        multiple: true,
        modelValue: ['aurora', 'orbit'],
      },
    })

    await multiple.get('.bing-select__clear').trigger('click')

    expect(multiple.emitted('clear')).toHaveLength(1)
    expect(multiple.emitted('update:modelValue')?.[0]).toEqual([[]])
  })

  it('supports keyboard open, navigation, selection, and escape close', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
      },
      attachTo: document.body,
    })

    const trigger = wrapper.get('.bing-select__trigger')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-open')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await trigger.trigger('keydown', { key: 'Enter' })

    expect(wrapper.emitted('update:modelValue')?.[0]).toEqual(['orbit'])
    expect(wrapper.classes()).not.toContain('is-open')

    await trigger.trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await trigger.trigger('keydown', { key: 'Escape' })

    expect(wrapper.classes()).not.toContain('is-open')
  })

  it('does not emit when a disabled option is clicked', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    getBodyOptions()[2]?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('runs liquid hover setup only for enabled options', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const firstOption = getBodyOptions()[0]
    const disabledOption = getBodyOptions()[2]
    const firstSurface = firstOption?.querySelector<HTMLElement>('.bing-select__option-surface')
    const firstLiquid = firstOption?.querySelector<HTMLElement>('.bing-select__option-liquid')

    expect(disabledOption?.classList).toContain('is-disabled')
    expect(firstSurface).not.toBeNull()

    vi.spyOn(firstSurface!, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 120, 48))
    firstOption?.dispatchEvent(
      new MouseEvent('mouseenter', {
        clientX: 32,
        clientY: 18,
      }) as PointerEvent,
    )

    expect(firstOption?.classList).toContain('is-liquid-active')
    expect(firstLiquid?.style.getPropertyValue('--bing-select-liquid-x')).toBe('32px')
    expect(firstLiquid?.style.getPropertyValue('--bing-select-liquid-y')).toBe('18px')

    disabledOption?.dispatchEvent(
      new MouseEvent('mouseenter', {
        clientX: 12,
        clientY: 12,
      }) as PointerEvent,
    )

    expect(disabledOption?.classList).not.toContain('is-liquid-active')
  })

  it('renders compact option rows and reuses one hover detail slot panel', async () => {
    const detailOptions: BingSelectOption[] = [
      {
        label: 'Aurora',
        value: 'aurora',
        description: 'Soft pink motion',
        detail: 'Layered hover timing with soft entry.',
      },
      {
        label: 'Orbit',
        value: 'orbit',
        description: 'Blue hover rhythm',
        detail: 'Compact row with detail shown out of band.',
      },
    ]
    const wrapper = mount(BingSelect, {
      props: {
        options: detailOptions,
      },
      slots: {
        'option-detail': ({ option }: { option: BingSelectOption }) =>
          h('div', { class: 'detail-slot' }, [
            h('strong', option.label),
            h('span', option.detail),
          ]),
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const [firstOption, secondOption] = getBodyOptions()

    expect(firstOption?.textContent).toContain('Aurora')
    expect(firstOption?.textContent).not.toContain('Soft pink motion')

    firstOption?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const firstDetailPanels = document.body.querySelectorAll('.bing-select__option-detail-panel')

    expect(firstDetailPanels).toHaveLength(1)
    expect(firstDetailPanels[0]?.textContent).toContain('Aurora')
    expect(firstDetailPanels[0]?.textContent).toContain('Layered hover timing')

    firstOption?.dispatchEvent(new MouseEvent('mouseleave', { clientX: 24, clientY: 44 }))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(1)

    secondOption?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const secondDetailPanels = document.body.querySelectorAll('.bing-select__option-detail-panel')

    expect(secondDetailPanels).toHaveLength(1)
    expect(secondDetailPanels[0]?.textContent).toContain('Orbit')
    expect(secondDetailPanels[0]?.textContent).toContain('Compact row')
  })

  it('hides the hover detail panel when hovering an option without details', async () => {
    const detailOptions: BingSelectOption[] = [
      {
        label: 'Aurora',
        value: 'aurora',
        detail: 'Layered hover timing with soft entry.',
      },
      {
        label: 'Plain',
        value: 'plain',
      },
    ]
    const wrapper = mount(BingSelect, {
      props: {
        options: detailOptions,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const [detailOption, plainOption] = getBodyOptions()

    detailOption?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(1)

    plainOption?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 58 }))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(0)
  })

  it('keeps the detail panel in sync with keyboard navigation', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })

    const detailOptions: BingSelectOption[] = [
      {
        label: 'Motion',
        value: 'motion',
        detail: 'Motion detail',
      },
      {
        label: 'Feedback',
        value: 'feedback',
        detail: 'Feedback detail',
      },
      {
        label: 'Plain',
        value: 'plain',
      },
    ]
    const wrapper = mount(BingSelect, {
      props: {
        options: detailOptions,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    getBodyOptions()[0]?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.bing-select__option-detail-panel')?.textContent).toContain(
      'Motion detail',
    )

    await wrapper.get('.bing-select__trigger').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const feedbackDetail = document.body.querySelector('.bing-select__option-detail-panel')

    expect(feedbackDetail?.textContent).toContain('Feedback detail')
    expect(feedbackDetail?.textContent).not.toContain('Motion detail')

    await wrapper.get('.bing-select__trigger').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(0)
  })

  it('keeps the detail panel mounted when keyboard navigation scrolls the panel', async () => {
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0)
      return 1
    })

    const detailOptions: BingSelectOption[] = [
      {
        label: 'Motion',
        value: 'motion',
        detail: 'Motion detail',
      },
      {
        label: 'Feedback',
        value: 'feedback',
        detail: 'Feedback detail',
      },
    ]
    const wrapper = mount(BingSelect, {
      props: {
        options: detailOptions,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    getBodyOptions()[0]?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(1)

    await wrapper.get('.bing-select__trigger').trigger('keydown', { key: 'ArrowDown' })

    const viewport = document.body.querySelector<HTMLElement>('.bing-scrollbar__viewport')

    expect(viewport).not.toBeNull()

    viewport!.scrollTop = 44
    viewport!.dispatchEvent(new Event('scroll', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(1)
    expect(document.body.querySelector('.bing-select__option-detail-panel')?.textContent).toContain(
      'Feedback detail',
    )
  })

  it('hides the hover detail panel when the option list scrolls', async () => {
    const detailOptions: BingSelectOption[] = createLongOptions(12).map((option) => ({
      ...option,
      detail: `Detail for ${option.label}`,
    }))
    const wrapper = mount(BingSelect, {
      props: {
        options: detailOptions,
        panelMaxHeight: 220,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    getBodyOptions()[0]?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(1)

    const viewport = document.body.querySelector<HTMLElement>('.bing-scrollbar__viewport')

    expect(viewport).not.toBeNull()

    viewport!.scrollTop = 48
    viewport!.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(0)
  })

  it('restores the hover detail panel after scrolling stops when the pointer is over an option', async () => {
    vi.useFakeTimers()

    const detailOptions: BingSelectOption[] = createLongOptions(12).map((option) => ({
      ...option,
      detail: `Detail for ${option.label}`,
    }))
    const wrapper = mount(BingSelect, {
      props: {
        options: detailOptions,
        panelMaxHeight: 220,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const [firstOption, secondOption] = getBodyOptions()

    firstOption?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(1)

    vi.spyOn(document, 'elementFromPoint').mockReturnValue(secondOption ?? null)

    const viewport = document.body.querySelector<HTMLElement>('.bing-scrollbar__viewport')

    expect(viewport).not.toBeNull()

    viewport!.scrollTop = 48
    viewport!.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(document.body.querySelectorAll('.bing-select__option-detail-panel')).toHaveLength(0)

    vi.advanceTimersByTime(151)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const detailPanels = document.body.querySelectorAll('.bing-select__option-detail-panel')

    expect(detailPanels).toHaveLength(1)
    expect(detailPanels[0]?.textContent).toContain('Option 2')
    expect(detailPanels[0]?.textContent).toContain('Detail for Option 2')
  })

  it('keeps the select open when interacting with the hover detail panel', async () => {
    const detailOptions: BingSelectOption[] = [
      {
        label: 'Aurora',
        value: 'aurora',
        detail: 'Layered hover timing with soft entry.',
      },
    ]
    const wrapper = mount(BingSelect, {
      props: {
        options: detailOptions,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    getBodyOptions()[0]?.dispatchEvent(new MouseEvent('mouseenter', { clientX: 24, clientY: 18 }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const detailPanel = document.body.querySelector<HTMLElement>('.bing-select__option-detail-panel')

    expect(detailPanel).not.toBeNull()

    detailPanel!.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    detailPanel!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-open')
    expect(getBodyPanel()).not.toBeNull()
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('lets short panels follow the option content height by default', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options: [options[0]],
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()
    const scroll = panel?.querySelector<HTMLElement>('.bing-select__panel-scroll')

    expect(panel?.style.getPropertyValue('--bing-select-panel-min-height')).toBe('0px')
    expect(scroll?.style.height).toBe('32px')
  })

  it('constrains short and long panels between the configured heights', async () => {
    const shortList = mount(BingSelect, {
      props: {
        options: [options[0]],
        panelMinHeight: 200,
        panelMaxHeight: 260,
      },
      attachTo: document.body,
    })

    await shortList.get('.bing-select__trigger').trigger('click')
    await shortList.vm.$nextTick()
    await shortList.vm.$nextTick()

    const shortPanel = getBodyPanel()
    const shortScroll = shortPanel?.querySelector<HTMLElement>('.bing-select__panel-scroll')

    expect(shortPanel?.style.getPropertyValue('--bing-select-panel-min-height')).toBe('200px')
    expect(shortPanel?.style.getPropertyValue('--bing-select-panel-max-height')).toBe('260px')
    expect(shortScroll?.style.height).toBe('198px')

    shortList.unmount()
    document.body.innerHTML = ''

    const longList = mount(BingSelect, {
      props: {
        options: Array.from({ length: 12 }, (_, index) => ({
          label: `Option ${index + 1}`,
          value: index + 1,
        })),
        panelMinHeight: 120,
        panelMaxHeight: 180,
      },
      attachTo: document.body,
    })

    await longList.get('.bing-select__trigger').trigger('click')
    await longList.vm.$nextTick()
    await longList.vm.$nextTick()

    const longPanel = getBodyPanel()
    const longScroll = longPanel?.querySelector<HTMLElement>('.bing-select__panel-scroll')

    expect(longPanel?.style.getPropertyValue('--bing-select-panel-min-height')).toBe('120px')
    expect(longPanel?.style.getPropertyValue('--bing-select-panel-max-height')).toBe('180px')
    expect(longScroll?.style.height).toBe('178px')
  })

  it('virtualizes long option lists and moves the rendered window on scroll', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options: createLongOptions(120),
        panelMaxHeight: 240,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()
    const viewport = document.body.querySelector<HTMLElement>('.bing-scrollbar__viewport')
    const panelBody = panel?.querySelector<HTMLElement>('.bing-select__panel-body')
    const firstWindowOptions = getBodyOptions()

    expect(panelBody?.classList).toContain('is-virtual')
    expect(panelBody?.style.height).toBe(`${120 * 32 + 18}px`)
    expect(firstWindowOptions.length).toBeGreaterThan(0)
    expect(firstWindowOptions.length).toBeLessThan(120)
    expect(firstWindowOptions[0]?.id).toContain('-option-0')
    expect(firstWindowOptions[0]?.style.height).toBe('32px')

    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 220,
    })

    if (viewport) {
      viewport.scrollTop = 1800
      viewport.dispatchEvent(new Event('scroll'))
    }

    await wrapper.vm.$nextTick()

    const scrolledWindowOptions = getBodyOptions()

    expect(scrolledWindowOptions.length).toBeLessThan(120)
    expect(scrolledWindowOptions[0]?.id).toContain('-option-52')
  })

  it('resets the virtual window to the top when search narrows results', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options: createLongOptions(120),
        panelMaxHeight: 240,
        searchable: true,
        virtual: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const viewport = document.body.querySelector<HTMLElement>('.bing-scrollbar__viewport')

    expect(viewport).not.toBeNull()

    Object.defineProperty(viewport, 'clientHeight', {
      configurable: true,
      value: 220,
    })

    viewport!.scrollTop = 1800
    viewport!.dispatchEvent(new Event('scroll'))
    await wrapper.vm.$nextTick()

    expect(getBodyOptions()[0]?.id).toContain('-option-52')

    await setSearchValue(wrapper, 'option 12')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const searchedOptions = getBodyOptions()

    expect(viewport!.scrollTop).toBe(0)
    expect(searchedOptions[0]?.textContent).toContain('Option 12')
    expect(searchedOptions[0]?.id).toContain('-option-11')
  })

  it('can disable virtualization for long option lists', async () => {
    const longOptions = createLongOptions(96)
    const wrapper = mount(BingSelect, {
      props: {
        options: longOptions,
        virtual: false,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(document.body.querySelector('.bing-select__panel-body.is-virtual')).toBeNull()
    expect(getBodyOptions()).toHaveLength(longOptions.length)
  })

  it('places the panel above the trigger when the viewport has no room below', async () => {
    const originalInnerHeight = window.innerHeight
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })

    const wrapper = mount(BingSelect, {
      props: {
        options,
        panelMaxHeight: 320,
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-select').element

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(520, 240, 280, 44))

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()

    expect(panel?.classList).toContain('is-placement-top')
    expect(Number.parseFloat(panel?.style.top ?? '0')).toBeLessThan(520)
    expect(panel?.style.position).toBe('fixed')

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('supports explicit side placement and panel alignment', async () => {
    const originalInnerHeight = window.innerHeight
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 720,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000,
    })

    const wrapper = mount(BingSelect, {
      props: {
        options,
        panelPlacement: 'left',
        panelAlign: 'middle',
        panelGap: 24,
        panelMaxHeight: 220,
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-select').element

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(240, 560, 220, 44))

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()

    expect(panel?.classList).toContain('is-placement-left')
    expect(panel?.classList).toContain('is-align-middle')
    expect(Number.parseFloat(panel?.style.left ?? '0')).toBe(296)
    expect(Number.parseFloat(panel?.style.left ?? '0')).toBeLessThan(560)
    expect(panel?.style.position).toBe('fixed')

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('forwards the compact smooth preset without adding keyboard or tab handling', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options: createLongOptions(20),
        smoothScroll: {
          duration: 160,
          keyboard: true,
          smoothTouchpad: true,
          respectReducedMotion: false,
        },
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const scrollbar = wrapper.findComponent(BingScrollbar)

    expect(scrollbar.exists()).toBe(true)
    expect(scrollbar.props('focusable')).toBe(false)
    expect(scrollbar.props('smooth')).toMatchObject({
      duration: 160,
      stepSize: 72,
      accelerationMax: 2,
      keyboard: false,
      smoothTouchpad: false,
      respectReducedMotion: true,
    })
    expect(
      document.body.querySelector('.bing-select__panel-scroll .bing-scrollbar__viewport')
        ?.hasAttribute('tabindex'),
    ).toBe(false)
  })

  it('can disable smooth scrolling and cancels motion before search resets or close', async () => {
    const wrapper = mount(BingSelect, {
      props: {
        options: createLongOptions(120),
        searchable: true,
        smoothScroll: false,
        virtual: true,
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-select__trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const scrollbar = wrapper.findComponent(BingScrollbar)
    const scrollbarApi = (
      scrollbar.vm as unknown as { $: { exposed: BingScrollbarExpose } }
    ).$.exposed
    const stopSpy = vi.spyOn(scrollbarApi, 'stop')

    expect(scrollbar.props('smooth')).toBe(false)

    if (scrollbarApi.viewport) {
      scrollbarApi.viewport.scrollTop = 320
    }

    await setSearchValue(wrapper, 'option 12')

    expect(stopSpy).toHaveBeenCalled()
    expect(scrollbarApi.viewport?.scrollTop).toBe(0)

    stopSpy.mockClear()
    await wrapper.setProps({ options: createLongOptions(80) })

    expect(stopSpy).toHaveBeenCalled()

    stopSpy.mockClear()
    await wrapper.get('.bing-select__trigger').trigger('keydown', { key: 'Escape' })

    expect(stopSpy).toHaveBeenCalled()
  })
})
