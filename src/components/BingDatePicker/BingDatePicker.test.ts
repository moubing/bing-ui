import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import dayjs from 'dayjs'
import { defineComponent, nextTick, reactive } from 'vue'
import { z } from 'zod'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingDatePicker from './BingDatePicker.vue'
import type { BingDatePickerExpose } from './BingDatePicker.types'
import BingForm from '../BingForm/BingForm.vue'
import type { BingFormExpose } from '../BingForm/BingForm.types'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import type { BingScrollbarExpose } from '../BingScrollbar/BingScrollbar.types'

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

afterEach(() => {
  document.body.innerHTML = ''
  vi.restoreAllMocks()
  vi.useRealTimers()
})

function getPanel() {
  return document.body.querySelector<HTMLElement>('.bing-date-picker__panel')
}

function getDateCells() {
  return Array.from(
    document.body.querySelectorAll<HTMLButtonElement>(
      '.bing-date-picker__date-grid .bing-date-picker__cell',
    ),
  )
}

function getEnabledCurrentMonthDateCells() {
  return getDateCells().filter(
    (cell) => !cell.disabled && !cell.classList.contains('is-muted'),
  )
}

function getFooterButton(text: string) {
  return Array.from(
    document.body.querySelectorAll<HTMLButtonElement>('.bing-date-picker__footer button'),
  ).find((button) => button.textContent?.trim().includes(text))
}

async function openPicker(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('.bing-date-picker__trigger').trigger('click')
  await nextTick()
  await nextTick()
}

async function clickAndSettle(element: HTMLElement) {
  element.click()
  await flushPromises()
  await nextTick()
}

async function waitForPanelClose() {
  await new Promise((resolve) => window.setTimeout(resolve, 220))
  await flushPromises()
  await nextTick()
}

function getFormExpose(wrapper: ReturnType<typeof mount>) {
  return wrapper.getComponent(BingForm).vm as unknown as BingFormExpose
}

function getScrollbarExpose(scrollbar: { vm: unknown }) {
  const instance = scrollbar.vm as { $?: { exposed?: unknown } }
  return instance.$?.exposed as BingScrollbarExpose
}

describe('BingDatePicker', () => {
  it('inherits theme glass settings and supports disabling or overriding them', async () => {
    const wrapper = mount(BingDatePicker, {
      props: { modelValue: null, showShortcuts: false },
      attachTo: document.body,
    })
    await openPicker(wrapper)

    expect(getPanel()?.style.getPropertyValue('--bing-date-picker-glass-blur')).toBe('var(--bing-glass-blur, 16px)')
    expect(getPanel()?.style.getPropertyValue('--bing-date-picker-glass-opacity')).toBe('var(--bing-glass-opacity, 0.85)')
    await wrapper.setProps({ glass: false })
    expect(getPanel()?.style.getPropertyValue('--bing-date-picker-glass-blur')).toBe('0px')
    expect(getPanel()?.style.getPropertyValue('--bing-date-picker-glass-opacity')).toBe('1')
    await wrapper.setProps({ glass: true, glassBlur: 20, glassOpacity: 0.7, glassSaturation: 1.1 })
    expect(getPanel()?.style.getPropertyValue('--bing-date-picker-glass-blur')).toBe('20px')
    expect(getPanel()?.style.getPropertyValue('--bing-date-picker-glass-opacity')).toBe('0.7')
    expect(getPanel()?.style.getPropertyValue('--bing-date-picker-glass-saturation')).toBe('1.1')
  })

  it.each(['error', 'success', 'warning'] as const)('exposes the %s status and marks only errors invalid', (status) => {
    const wrapper = mount(BingDatePicker, { props: { modelValue: null, status } })
    expect(wrapper.classes()).toContain('bing-date-picker--status-' + status)
    expect(wrapper.get('.bing-date-picker__trigger').attributes('aria-invalid')).toBe(status === 'error' ? 'true' : undefined)
  })

  it('uses Select-aligned clear and chevron action buttons', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: '2026-07-12',
        type: 'date',
        showShortcuts: false,
      },
      attachTo: document.body,
    })
    const clearButton = wrapper.get<HTMLButtonElement>('.bing-date-picker__clear')
    const chevronButton = wrapper.get<HTMLButtonElement>('.bing-date-picker__chevron')
    expect(wrapper.classes()).toContain('has-clear-action')
    expect(clearButton.element.tagName).toBe('BUTTON')
    expect(chevronButton.element.tagName).toBe('BUTTON')
    expect(chevronButton.attributes('tabindex')).toBe('-1')

    await chevronButton.trigger('click')
    await nextTick()
    await nextTick()

    expect(wrapper.classes()).toContain('is-open')
    expect(getPanel()).not.toBeNull()

    await clearButton.trigger('click')
    expect(wrapper.emitted('update:modelValue')?.at(-1)?.[0]).toBeNull()
  })

  it('selects a single date immediately and emits formatted strings', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'date',
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    expect(getPanel()).not.toBeNull()

    await clickAndSettle(getEnabledCurrentMonthDateCells()[0]!)

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    )
    expect(wrapper.emitted('change')?.[0]?.[0]).toMatchObject({
      type: 'date',
      range: false,
    })
    await waitForPanelClose()

    expect(getPanel()).toBeNull()
  })

  it('keeps semantic option buttons as hit tracks around their visual surfaces', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'date',
        range: true,
        disabledDate: (value) => value.date() === 15,
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const enabledCell = getEnabledCurrentMonthDateCells().find(
      (cell) => cell.textContent?.trim() !== '15',
    )!
    const enabledSurface = enabledCell.querySelector<HTMLElement>(
      ':scope > .bing-date-picker__cell-surface',
    )
    const disabledCell = getDateCells().find(
      (cell) => !cell.classList.contains('is-muted') && cell.textContent?.trim() === '15',
    )!

    expect(enabledCell.tagName).toBe('BUTTON')
    expect(enabledCell.type).toBe('button')
    expect(enabledSurface?.parentElement).toBe(enabledCell)
    expect(disabledCell.disabled).toBe(true)
    expect(
      disabledCell.querySelector(':scope > .bing-date-picker__cell-surface'),
    ).not.toBeNull()

    enabledSurface?.click()
    await nextTick()

    expect(enabledCell.classList).toContain('is-selected')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('renders shortcuts as readable action buttons', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'date',
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const shortcut = document.body.querySelector<HTMLButtonElement>(
      '.bing-date-picker__shortcut-rail .bing-date-picker__shortcut',
    )

    expect(shortcut).not.toBeNull()
    expect(shortcut?.querySelector('.bing-date-picker__shortcut-text')?.textContent).toBe('今天')
    expect(shortcut?.getAttribute('aria-label')).toBe('应用快捷选项： 今天')
    expect(shortcut?.closest('.bing-tooltip')).toBeNull()
    expect(getPanel()?.querySelector('.bing-date-picker__shortcut-rail')).toBeNull()

    const singleShortcutLabels = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '.bing-date-picker__shortcut-rail .bing-date-picker__shortcut',
      ),
    ).map((button) => button.querySelector('.bing-date-picker__shortcut-text')?.textContent)

    expect(singleShortcutLabels).toEqual(['今天', '昨天'])

    wrapper.unmount()
    document.body.innerHTML = ''

    const range = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'date',
        range: true,
      },
      attachTo: document.body,
    })

    await openPicker(range)

    const shortcutLabels = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '.bing-date-picker__shortcut-rail .bing-date-picker__shortcut',
      ),
    ).map((button) => button.querySelector('.bing-date-picker__shortcut-text')?.textContent)

    expect(shortcutLabels).toEqual(['近7天', '近30天', '本月', '今年'])
  })

  it('uses Chinese calendar labels by default and reacts to an explicit locale', async () => {
    const wrapper = mount(BingDatePicker, {
      props: { modelValue: '2027-07-16', type: 'date', showShortcuts: false },
      attachTo: document.body,
    })
    await openPicker(wrapper)
    const heading = () => document.body.querySelector('.bing-date-picker__nav-label')?.textContent
    const weekdays = () => document.body.querySelector('.bing-date-picker__weekdays')?.textContent
    expect(heading()).toContain('2027年7月')
    expect(weekdays()).toContain('周一')

    await wrapper.setProps({ locale: 'en-US' })
    expect(heading()).toContain('July 2027')
    expect(weekdays()).toContain('Mon')

    await wrapper.setProps({ type: 'month' })
    expect(document.body.querySelector('.bing-date-picker__month-grid')?.textContent).toContain('Jul')
    await wrapper.setProps({ locale: 'zh-CN' })
    expect(document.body.querySelector('.bing-date-picker__month-grid')?.textContent).toContain('7月')
  })

  it('jumps between years and opens a year panel from the nav label', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: '2027-07-16',
        type: 'date',
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    expect(document.body.querySelector('.bing-date-picker__nav-label')?.textContent).toContain(
      '2027年7月',
    )

    document.body.querySelector<HTMLButtonElement>('[aria-label="上一年"]')?.click()
    await nextTick()

    expect(document.body.querySelector('.bing-date-picker__nav-label')?.textContent).toContain(
      '2026年7月',
    )

    document.body.querySelector<HTMLButtonElement>('[aria-label="下一年"]')?.click()
    await nextTick()

    expect(document.body.querySelector('.bing-date-picker__nav-label')?.textContent).toContain(
      '2027年7月',
    )

    document.body.querySelector<HTMLButtonElement>('.bing-date-picker__nav-label')?.click()
    await nextTick()

    expect(document.body.querySelector('.bing-date-picker__year-grid')).not.toBeNull()
    expect(document.body.querySelector('.bing-date-picker__date-grid')).toBeNull()

    const targetYear = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '.bing-date-picker__year-grid .bing-date-picker__cell',
      ),
    ).find((cell) => cell.textContent?.trim() === '2025')

    expect(targetYear).toBeDefined()

    targetYear?.click()
    await nextTick()

    expect(document.body.querySelector('.bing-date-picker__date-grid')).not.toBeNull()
    expect(document.body.querySelector('.bing-date-picker__nav-label')?.textContent).toContain(
      '2025年7月',
    )
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('keeps datetime changes pending until OK is pressed', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: '2026-06-20 09:30:00',
        type: 'datetime',
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    expect(getPanel()?.style.width).toBe('536px')
    expect(
      Array.from(
        document.body.querySelectorAll<HTMLElement>(
          '.bing-date-picker__time-list.bing-scrollbar',
        ),
      ).map((list) => list.style.height),
    ).toEqual(['244px', '244px', '244px'])

    const dayEighteen = getEnabledCurrentMonthDateCells().find(
      (cell) => cell.textContent?.trim() === '18',
    )!

    await clickAndSettle(dayEighteen)

    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(dayEighteen.classList).toContain('is-selected')

    await clickAndSettle(getFooterButton('确定')!)

    expect(wrapper.emitted('update:modelValue')?.[0]?.[0]).toBe('2026-06-18 09:30:00')
    expect(wrapper.emitted('confirm')?.[0]?.[0]).toMatchObject({
      type: 'datetime',
      range: false,
    })
  })

  it('forwards smooth scrolling to three independent time columns', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: '09:30:40',
        type: 'time',
        showShortcuts: false,
        smoothScroll: {
          duration: 360,
          keyboard: true,
          smoothTouchpad: true,
        },
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const scrollbars = wrapper.findAllComponents(BingScrollbar).filter(scrollbar => scrollbar.classes().includes('bing-date-picker__time-list'))

    expect(scrollbars).toHaveLength(3)
    expect(new Set(scrollbars.map((scrollbar) => scrollbar.vm)).size).toBe(3)

    scrollbars.forEach((scrollbar) => {
      expect(scrollbar.props('smooth')).toMatchObject({
        duration: 360,
        keyboard: false,
        smoothTouchpad: false,
        respectReducedMotion: true,
      })
      expect(scrollbar.props('focusable')).toBe(false)
    })
  })

  it('keeps smooth scrolling disabled when requested and stops every time column on close', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: '09:30:40',
        type: 'time',
        showShortcuts: false,
        smoothScroll: false,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const scrollbars = wrapper.findAllComponents(BingScrollbar)
    const stopSpies = scrollbars.map((scrollbar) =>
      vi.spyOn(getScrollbarExpose(scrollbar), 'stop'),
    )

    scrollbars.forEach((scrollbar) => {
      expect(scrollbar.props('smooth')).toBe(false)
    })

    ;(wrapper.vm as unknown as BingDatePickerExpose).closePanel()

    stopSpies.forEach((stop) => {
      expect(stop).toHaveBeenCalledOnce()
    })
  })

  it('stops each time column and reveals the new range target immediately', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: ['01:02:03', '20:30:40'],
        type: 'time',
        range: true,
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const scrollbars = wrapper.findAllComponents(BingScrollbar).filter(scrollbar => scrollbar.classes().includes('bing-date-picker__time-list'))
    const targetValues = [20, 30, 40]
    const stopSpies = scrollbars.map((scrollbar) =>
      vi.spyOn(getScrollbarExpose(scrollbar), 'stop'),
    )
    const scrollToSpies = scrollbars.map((scrollbar, index) => {
      const exposed = getScrollbarExpose(scrollbar)
      const viewport = exposed.viewport!
      const option = viewport.querySelector<HTMLElement>(
        `[data-time-value="${targetValues[index]}"]`,
      )!

      vi.spyOn(viewport, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 100))
      vi.spyOn(option, 'getBoundingClientRect').mockReturnValue(rect(150, 0, 100, 30))

      return vi.spyOn(exposed, 'scrollTo')
    })

    const rangeTabs = document.body.querySelectorAll<HTMLButtonElement>(
      '.bing-date-picker__range-tab',
    )
    rangeTabs[1]?.click()
    await nextTick()
    await nextTick()

    stopSpies.forEach((stop) => {
      expect(stop).toHaveBeenCalled()
    })
    scrollToSpies.forEach((scrollTo) => {
      expect(scrollTo).toHaveBeenCalledWith(80)
    })
  })

  it('supports month, year, and time selection models', async () => {
    const month = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'month',
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(month)
    const monthCell = document.body.querySelector<HTMLButtonElement>(
      '.bing-date-picker__month-grid .bing-date-picker__cell',
    )!

    expect(monthCell.querySelector(':scope > .bing-date-picker__cell-surface')).not.toBeNull()
    await clickAndSettle(monthCell.querySelector<HTMLElement>('.bing-date-picker__cell-surface')!)

    expect(month.emitted('update:modelValue')?.[0]?.[0]).toMatch(/^\d{4}-\d{2}$/)

    month.unmount()
    document.body.innerHTML = ''

    const year = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'year',
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(year)
    const yearCell = document.body.querySelector<HTMLButtonElement>(
      '.bing-date-picker__year-grid .bing-date-picker__cell',
    )!

    expect(yearCell.querySelector(':scope > .bing-date-picker__cell-surface')).not.toBeNull()
    await clickAndSettle(yearCell.querySelector<HTMLElement>('.bing-date-picker__cell-surface')!)

    expect(year.emitted('update:modelValue')?.[0]?.[0]).toMatch(/^\d{4}$/)

    year.unmount()
    document.body.innerHTML = ''

    const time = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'time',
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(time)

    expect(getPanel()?.style.width).toBe('260px')
    expect(
      document.body.querySelectorAll(
        '.bing-date-picker__time-list.bing-scrollbar',
      ),
    ).toHaveLength(3)

    const hourColumn = document.body.querySelector<HTMLElement>(
      '.bing-date-picker__time-column',
    )
    const hourNine = Array.from(
      hourColumn!.querySelectorAll<HTMLButtonElement>('.bing-date-picker__time-option'),
    ).find((button) => button.textContent?.trim() === '09')!

    const hourNineSurface = hourNine.querySelector<HTMLElement>(
      ':scope > .bing-date-picker__time-option-surface',
    )!

    expect(hourNine.dataset.timeUnit).toBe('hour')
    expect(hourNineSurface).not.toBeNull()
    await clickAndSettle(hourNineSurface)

    expect(time.emitted('update:modelValue')).toBeUndefined()

    await clickAndSettle(getFooterButton('确定')!)

    expect(time.emitted('update:modelValue')?.[0]?.[0]).toMatch(
      /^\d{2}:\d{2}:\d{2}$/,
    )
    expect(getPanel()).not.toBeNull()
    expect(getPanel()?.classList).toContain('is-closing')

    await waitForPanelClose()

    expect(getPanel()).toBeNull()

    time.unmount()
    document.body.innerHTML = ''

    const timeRange = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'time',
        range: true,
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(timeRange)

    expect(getPanel()?.style.width).toBe('260px')
    expect(document.body.querySelectorAll('.bing-date-picker__range-tab')).toHaveLength(2)
    expect(document.body.querySelectorAll('.bing-date-picker__time-column')).toHaveLength(3)
  })

  it('places the panel above the trigger when the viewport has no room below', async () => {
    const originalInnerHeight = window.innerHeight
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 520,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })

    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'time',
        showShortcuts: false,
      },
      attachTo: document.body,
    })
    const trigger = wrapper.get('.bing-date-picker__trigger').element

    vi.spyOn(trigger, 'getBoundingClientRect').mockReturnValue(rect(470, 640, 360, 46))

    await openPicker(wrapper)

    const panel = getPanel()

    expect(panel?.classList).toContain('is-placement-top')
    expect(Number.parseFloat(panel?.style.top ?? '0')).toBeLessThan(470)
    expect(panel?.style.width).toBe('260px')

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('commits complete ranges only and sorts reverse date selections', async () => {
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'date',
        range: true,
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const [first, second] = getEnabledCurrentMonthDateCells()

    await clickAndSettle(second!)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()

    await clickAndSettle(first!)
    await clickAndSettle(getFooterButton('确定')!)

    const value = wrapper.emitted('update:modelValue')?.[0]?.[0]

    expect(Array.isArray(value)).toBe(true)
    expect(value).toHaveLength(2)
    expect((value as [string, string])[0] <= (value as [string, string])[1]).toBe(true)
  })

  it('applies min, max, disabledDate, and disabledTime rules', async () => {
    const today = dayjs()
    const wrapper = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'date',
        min: today.date(10).format('YYYY-MM-DD'),
        max: today.date(20).format('YYYY-MM-DD'),
        disabledDate: (value) => value.date() === 15,
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(wrapper)

    const activeCells = getDateCells().filter((cell) => !cell.classList.contains('is-muted'))
    const dayNine = activeCells.find((cell) => cell.textContent?.trim() === '9')!
    const dayTen = activeCells.find((cell) => cell.textContent?.trim() === '10')!
    const dayFifteen = activeCells.find((cell) => cell.textContent?.trim() === '15')!

    expect(dayNine.disabled).toBe(true)
    expect(dayTen.disabled).toBe(false)
    expect(dayFifteen.disabled).toBe(true)

    wrapper.unmount()
    document.body.innerHTML = ''

    const time = mount(BingDatePicker, {
      props: {
        modelValue: null,
        type: 'time',
        disabledTime: (_value, context) =>
          context.unit === 'hour' && context.value === 13,
        showShortcuts: false,
      },
      attachTo: document.body,
    })

    await openPicker(time)

    const hourColumn = document.body.querySelector<HTMLElement>(
      '.bing-date-picker__time-column',
    )
    const hourThirteen = Array.from(
      hourColumn!.querySelectorAll<HTMLButtonElement>('.bing-date-picker__time-option'),
    ).find((button) => button.textContent?.trim() === '13')!

    expect(hourThirteen.disabled).toBe(true)
  })

  it('integrates with BingFormItem and clears Zod errors after a valid selection', async () => {
    const wrapper = mount(
      defineComponent({
        components: { BingDatePicker, BingForm, BingFormItem },
        setup() {
          const model = reactive({
            startDate: null as string | null,
          })
          const schema = z.object({
            startDate: z.string({ message: 'Choose a start date' }),
          })

          return { model, schema }
        },
        template: `
          <BingForm :model="model" :schema="schema">
            <BingFormItem prop="startDate" label="Start date" required>
              <BingDatePicker v-model="model.startDate" :show-shortcuts="false" />
            </BingFormItem>
          </BingForm>
        `,
      }),
      {
        attachTo: document.body,
      },
    )

    await expect(getFormExpose(wrapper).validate()).resolves.toBe(false)
    await nextTick()

    expect(wrapper.text()).toContain('Choose a start date')
    expect(wrapper.get('.bing-date-picker__trigger').attributes('aria-invalid')).toBe('true')

    await openPicker(wrapper)
    await clickAndSettle(getEnabledCurrentMonthDateCells()[0]!)
    await flushPromises()
    await nextTick()

    expect(wrapper.text()).not.toContain('Choose a start date')
    expect(wrapper.get('.bing-date-picker__trigger').attributes('aria-invalid')).toBeUndefined()
  })
})
