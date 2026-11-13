import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App, Ref } from 'vue'
import BingDatePicker from './BingDatePicker.vue'
import '../../theme/index.css'
import type {
  BingDatePickerModelValue,
  BingDatePickerProps,
  BingDatePickerType,
} from './BingDatePicker.types'

interface MountedPicker {
  app: App<Element>
  host: HTMLElement
  modelValue: Ref<BingDatePickerModelValue>
  updates: BingDatePickerModelValue[]
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
      throw new Error('Timed out while waiting for the date picker layout to settle')
    }

    await wait(16)
  }
}

function mountPicker(props: Partial<BingDatePickerProps> = {}) {
  const host = document.createElement('div')
  const modelValue = ref<BingDatePickerModelValue>(props.modelValue ?? null)
  const updates: BingDatePickerModelValue[] = []

  host.style.width = '720px'
  host.style.margin = '48px'
  document.body.appendChild(host)

  const app = createApp({
    render: () =>
      h(BingDatePicker, {
        ...props,
        modelValue: modelValue.value,
        showShortcuts: props.showShortcuts ?? false,
        smoothScroll: props.smoothScroll ?? false,
        'onUpdate:modelValue': (value: BingDatePickerModelValue) => {
          modelValue.value = value
          updates.push(value)
        },
      }),
  })

  app.mount(host)
  mountedPickers.push({ app, host, modelValue, updates })

  return { host, modelValue, updates }
}

async function openPicker(host: HTMLElement, optionSelector: string) {
  host.querySelector<HTMLButtonElement>('.bing-date-picker__trigger')?.click()
  await nextTick()
  await waitFor(() => Boolean(document.body.querySelector(optionSelector)))
  await wait(360)
}

function getSurface(option: HTMLElement, selector: string) {
  const surface = option.querySelector<HTMLElement>(selector)

  if (!surface) {
    throw new Error(`Expected ${selector} inside the option hit track`)
  }

  return surface
}

function getHorizontalBoundaryTargets(
  first: HTMLElement,
  second: HTMLElement,
  surfaceSelector: string,
  expectedVisualGap: number,
) {
  const firstRect = first.getBoundingClientRect()
  const secondRect = second.getBoundingClientRect()
  const firstSurfaceRect = getSurface(first, surfaceSelector).getBoundingClientRect()
  const secondSurfaceRect = getSurface(second, surfaceSelector).getBoundingClientRect()
  const offset = expectedVisualGap / 2 - 0.1
  const y = firstSurfaceRect.top + firstSurfaceRect.height / 2
  const leftX = secondRect.left - offset
  const rightX = secondRect.left + offset
  const leftTarget = document.elementFromPoint(leftX, y) as HTMLElement | null
  const rightTarget = document.elementFromPoint(rightX, y) as HTMLElement | null

  expect(secondRect.left - firstRect.right).toBeCloseTo(0, 1)
  expect(secondSurfaceRect.left - firstSurfaceRect.right).toBeCloseTo(expectedVisualGap, 1)
  expect(leftX).toBeGreaterThan(firstSurfaceRect.right)
  expect(rightX).toBeLessThan(secondSurfaceRect.left)
  expect(leftTarget?.closest('button')).toBe(first)
  expect(rightTarget?.closest('button')).toBe(second)
  expect(getComputedStyle(leftTarget!).cursor).toBe('pointer')
  expect(getComputedStyle(rightTarget!).cursor).toBe('pointer')

  return { leftTarget: leftTarget!, leftX, rightTarget: rightTarget!, rightX, y }
}

function getVerticalBoundaryTargets(
  first: HTMLElement,
  second: HTMLElement,
  surfaceSelector: string,
  expectedVisualGap: number,
  strictSplit = true,
) {
  const firstRect = first.getBoundingClientRect()
  const secondRect = second.getBoundingClientRect()
  const firstSurfaceRect = getSurface(first, surfaceSelector).getBoundingClientRect()
  const secondSurfaceRect = getSurface(second, surfaceSelector).getBoundingClientRect()
  const offset = expectedVisualGap / 2 - 0.1
  const x = firstSurfaceRect.left + firstSurfaceRect.width / 2
  const upperY = secondRect.top - offset
  const lowerY = secondRect.top + offset
  const upperTarget = document.elementFromPoint(x, upperY) as HTMLElement | null
  const lowerTarget = document.elementFromPoint(x, lowerY) as HTMLElement | null

  expect(secondRect.top - firstRect.bottom).toBeCloseTo(0, 1)
  expect(secondSurfaceRect.top - firstSurfaceRect.bottom).toBeCloseTo(expectedVisualGap, 1)
  expect(upperY).toBeGreaterThan(firstSurfaceRect.bottom)
  expect(lowerY).toBeLessThan(secondSurfaceRect.top)
  const upperOption = upperTarget?.closest('button')
  const lowerOption = lowerTarget?.closest('button')

  if (strictSplit) {
    expect(upperOption).toBe(first)
    expect(lowerOption).toBe(second)
  } else {
    expect([first, second]).toContain(upperOption)
    expect([first, second]).toContain(lowerOption)
  }

  expect(getComputedStyle(upperTarget!).cursor).toBe('pointer')
  expect(getComputedStyle(lowerTarget!).cursor).toBe('pointer')

  return {
    lowerOption: lowerOption as HTMLButtonElement,
    lowerTarget: lowerTarget!,
    lowerY,
    upperOption: upperOption as HTMLButtonElement,
    upperTarget: upperTarget!,
    upperY,
    x,
  }
}

function clickAt(target: HTMLElement, clientX: number, clientY: number) {
  target.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    }),
  )
}

afterEach(async () => {
  mountedPickers.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
  await page.viewport(1280, 900)
})

describe('BingDatePicker option hit areas in a browser', () => {
  it('keeps the calendar, shortcuts and confirmation reachable on narrow screens and resize', async () => {
    await page.viewport(320, 740)
    const { host, modelValue, updates } = mountPicker({
      type: 'datetime',
      modelValue: '2026-06-20 09:30:00',
      showShortcuts: true,
    })
    host.style.width = '280px'
    host.style.margin = '280px auto 0'
    await openPicker(host, '.bing-date-picker__time-option')

    const panel = document.querySelector<HTMLElement>('.bing-date-picker__panel')!
    const rail = document.querySelector<HTMLElement>('.bing-date-picker__shortcut-rail')!
    const main = panel.querySelector<HTMLElement>('.bing-date-picker__main')!
    const viewport = panel.querySelector<HTMLElement>('.bing-date-picker__main-scroll > .bing-scrollbar__viewport')!
    const calendar = panel.querySelector<HTMLElement>('.bing-date-picker__calendar-shell')!
    const footer = panel.querySelector<HTMLElement>('.bing-date-picker__footer')!
    const expectContained = () => {
      const panelRect = panel.getBoundingClientRect()
      const calendarRect = calendar.getBoundingClientRect()
      const footerRect = footer.getBoundingClientRect()
      expect(panelRect.left).toBeGreaterThanOrEqual(12)
      expect(panelRect.right).toBeLessThanOrEqual(window.innerWidth - 12)
      expect(panelRect.bottom).toBeLessThanOrEqual(window.innerHeight - 11)
      expect(calendarRect.left).toBeGreaterThan(panelRect.left)
      expect(calendarRect.right).toBeLessThan(panelRect.right)
      expect(footerRect.bottom).toBeLessThan(panelRect.bottom)
      expect(panel.contains(rail)).toBe(true)
      expect(rail.getBoundingClientRect().bottom).toBeLessThanOrEqual(main.getBoundingClientRect().top)
    }
    expectContained()
    expect(viewport.scrollHeight).toBeGreaterThan(viewport.clientHeight)
    expect(getComputedStyle(viewport).scrollbarWidth).toBe('none')
    expect(panel.querySelector('.bing-date-picker__main-scroll')?.classList.contains('has-vertical-overflow')).toBe(true)

    await page.viewport(1280, 900)
    await expect.poll(() => panel.contains(rail)).toBe(false)
    const railRect = rail.getBoundingClientRect()
    const panelRect = panel.getBoundingClientRect()
    expect(railRect.right <= panelRect.left || railRect.left >= panelRect.right).toBe(true)

    await page.viewport(320, 740)
    await expect.poll(() => panel.contains(rail)).toBe(true)
    expectContained()
    expect(document.querySelectorAll('.bing-date-picker__shortcut-rail')).toHaveLength(1)

    viewport.scrollTop = viewport.scrollHeight
    const hourColumn = panel.querySelector<HTMLElement>('.bing-date-picker__time-column')!
    const hourViewport = hourColumn.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    hourViewport.scrollTop = 32 * 11
    await wait(80)
    const hour = Array.from(hourColumn.querySelectorAll<HTMLButtonElement>('button')).find(button => button.textContent?.trim() === '14')!
    await page.elementLocator(hour).click()
    expect(updates).toEqual([])
    await page.elementLocator(footer).getByRole('button', { name: '确定', exact: true }).click()
    await waitFor(() => updates.length > 0)
    expect(modelValue.value).toBe('2026-06-20 14:30:00')
    await waitFor(() => !document.querySelector('.bing-date-picker__panel'))
    expect(document.querySelector('.bing-date-picker__shortcut-rail')).toBeNull()
  })

  it('assigns both axes of the date-grid spacing to adjacent day buttons', async () => {
    const { host, updates } = mountPicker({
      type: 'date',
      range: true,
    })

    await openPicker(host, '.bing-date-picker__date-grid .bing-date-picker__cell')

    const cells = Array.from(
      document.body.querySelectorAll<HTMLButtonElement>(
        '.bing-date-picker__date-grid .bing-date-picker__cell',
      ),
    )
    const horizontal = getHorizontalBoundaryTargets(
      cells[0],
      cells[1],
      '.bing-date-picker__cell-surface',
      6,
    )

    clickAt(horizontal.leftTarget, horizontal.leftX, horizontal.y)
    await nextTick()
    clickAt(horizontal.rightTarget, horizontal.rightX, horizontal.y)
    await nextTick()

    expect(cells[0].classList).toContain('is-selected')
    expect(cells[1].classList).toContain('is-selected')

    const vertical = getVerticalBoundaryTargets(
      cells[0],
      cells[7],
      '.bing-date-picker__cell-surface',
      6,
    )

    clickAt(vertical.upperTarget, vertical.x, vertical.upperY)
    await nextTick()
    clickAt(vertical.lowerTarget, vertical.x, vertical.lowerY)
    await nextTick()

    expect(cells[0].classList).toContain('is-selected')
    expect(cells[7].classList).toContain('is-selected')
    expect(updates).toEqual([])
  })

  it.each([
    ['month', '.bing-date-picker__month-grid'],
    ['year', '.bing-date-picker__year-grid'],
  ] as const)(
    'keeps the %s grid visually spaced while its horizontal tracks touch',
    async (type, gridSelector) => {
      const { host, updates } = mountPicker({ type, range: true })

      await openPicker(host, `${gridSelector} .bing-date-picker__cell`)

      const cells = Array.from(
        document.body.querySelectorAll<HTMLButtonElement>(
          `${gridSelector} .bing-date-picker__cell`,
        ),
      )
      const boundary = getHorizontalBoundaryTargets(
        cells[0],
        cells[1],
        '.bing-date-picker__cell-surface',
        8,
      )

      clickAt(boundary.leftTarget, boundary.leftX, boundary.y)
      await nextTick()
      clickAt(boundary.rightTarget, boundary.rightX, boundary.y)
      await nextTick()

      expect(cells[0].classList).toContain('is-selected')
      expect(cells[1].classList).toContain('is-selected')

      const vertical = getVerticalBoundaryTargets(
        cells[0],
        cells[3],
        '.bing-date-picker__cell-surface',
        8,
      )

      clickAt(vertical.upperTarget, vertical.x, vertical.upperY)
      await nextTick()
      clickAt(vertical.lowerTarget, vertical.x, vertical.lowerY)
      await nextTick()

      expect(cells[0].classList).toContain('is-selected')
      expect(cells[3].classList).toContain('is-selected')
      expect(updates).toEqual([])
    },
  )

  it.each([
    ['time', '09:30:40', 4],
    ['datetime', '2026-06-20 09:30:40', 2],
  ] as const)(
    'uses continuous %s rows while preserving the compact visual gap',
    async (type: BingDatePickerType, modelValue, expectedVisualGap) => {
      const { host, updates } = mountPicker({ type, modelValue })

      await openPicker(host, '.bing-date-picker__time-option')

      const hourColumn = document.body.querySelector<HTMLElement>(
        '.bing-date-picker__time-column',
      )!
      const viewport = hourColumn.querySelector<HTMLElement>(
        '.bing-scrollbar__viewport',
      )!
      const viewportRect = viewport.getBoundingClientRect()
      const visibleOptions = Array.from(
        hourColumn.querySelectorAll<HTMLButtonElement>('.bing-date-picker__time-option'),
      ).filter((option) => {
        const rect = option.getBoundingClientRect()
        return rect.top >= viewportRect.top && rect.bottom <= viewportRect.bottom
      })
      const [first, second] = visibleOptions
      const boundary = getVerticalBoundaryTargets(
        first,
        second,
        '.bing-date-picker__time-option-surface',
        expectedVisualGap,
        // A 2px gap can rasterize to one physical boundary pixel. Chromium
        // deterministically gives that pixel to one of the adjacent rows.
        expectedVisualGap > 2,
      )

      clickAt(boundary.upperTarget, boundary.x, boundary.upperY)
      await nextTick()
      expect(boundary.upperOption.classList).toContain('is-selected')
      expect(
        [first, second].filter((option) => option.classList.contains('is-selected')),
      ).toEqual([boundary.upperOption])

      clickAt(boundary.lowerTarget, boundary.x, boundary.lowerY)
      await nextTick()
      expect(boundary.lowerOption.classList).toContain('is-selected')
      expect(
        [first, second].filter((option) => option.classList.contains('is-selected')),
      ).toEqual([boundary.lowerOption])
      expect(updates).toEqual([])
    },
  )
})
