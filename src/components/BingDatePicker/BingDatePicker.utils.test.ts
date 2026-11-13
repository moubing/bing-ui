import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import {
  compareTypedValue,
  createShortcuts,
  createStepOptions,
  getCalendarCells,
  getWeekdayLabels,
  getYearBlockStart,
  getYearCells,
  normalizeFirstDayOfWeek,
  parseDateValue,
} from './BingDatePicker.utils'

describe('BingDatePicker utils', () => {
  it('parses strictly by value format', () => {
    expect(parseDateValue('2026-02-03', 'date', 'YYYY-MM-DD')?.format('YYYY-MM-DD HH:mm')).toBe('2026-02-03 00:00')
    expect(parseDateValue('2026-2-3', 'date', 'YYYY-MM-DD')).toBeNull()
    expect(parseDateValue('', 'date', 'YYYY-MM-DD')).toBeNull()
    expect(parseDateValue('08:30:15', 'time', 'HH:mm:ss')?.format('YYYY-MM-DD HH:mm:ss')).toBe('2000-01-01 08:30:15')
    expect(parseDateValue('2026-05', 'month', 'YYYY-MM')?.format('YYYY-MM-DD')).toBe('2026-05-01')
  })

  it('compares with the precision of the picker type', () => {
    const morning = dayjs('2026-02-03 08:00:00')
    const evening = dayjs('2026-02-03 20:00:00')

    expect(compareTypedValue(morning, evening, 'date')).toBe(0)
    expect(compareTypedValue(morning, evening, 'datetime')).toBeLessThan(0)
    expect(compareTypedValue(dayjs('2026-02-01'), dayjs('2026-02-28'), 'month')).toBe(0)
    expect(compareTypedValue(dayjs('2001-05-05 09:00:00'), dayjs('1999-01-01 08:00:00'), 'time')).toBeGreaterThan(0)
  })

  it('builds step options and normalizes the first weekday', () => {
    expect(createStepOptions(60, 15)).toEqual([0, 15, 30, 45])
    expect(createStepOptions(3, 0)).toEqual([0, 1, 2])
    expect(normalizeFirstDayOfWeek(-1)).toBe(6)
    expect(normalizeFirstDayOfWeek(8)).toBe(1)
  })

  it('lays out a six-week grid starting on the first weekday', () => {
    // 2026-10-01 是周四
    const cells = getCalendarCells(dayjs('2026-10-15'), 1)

    expect(cells).toHaveLength(42)
    expect(cells[0].format('YYYY-MM-DD')).toBe('2026-09-28')
    expect(cells[0].day()).toBe(1)
    expect(getCalendarCells(dayjs('2026-10-15'), 0)[0].format('YYYY-MM-DD')).toBe('2026-09-27')
    expect(getWeekdayLabels('en-US', 1)[0]).toBe('Mon')
  })

  it('pages years in blocks of twelve', () => {
    expect(getYearBlockStart(2026)).toBe(2016)
    expect(getYearCells(2026).map((year) => year.year())).toEqual(
      Array.from({ length: 12 }, (_, index) => 2016 + index),
    )
  })

  it('creates shortcuts for each type', () => {
    const now = dayjs('2026-10-26 14:30:00')

    expect(createShortcuts('date', false, now).map((item) => item.label)).toEqual(['今天', '昨天'])
    expect(createShortcuts('time', false, now)[0].label).toBe('此刻')

    const [lastWeek] = createShortcuts('date', true, now)
    const [start, end] = lastWeek.value as [dayjs.Dayjs, dayjs.Dayjs]

    expect(lastWeek.label).toBe('近7天')
    expect(start.format('YYYY-MM-DD')).toBe('2026-10-20')
    expect(end.format('YYYY-MM-DD')).toBe('2026-10-26')

    const decade = createShortcuts('year', true, now)[1].value as [dayjs.Dayjs, dayjs.Dayjs]

    expect(decade.map((year) => year.year())).toEqual([2020, 2029])
  })
})
