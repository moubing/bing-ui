import dayjs from 'dayjs'
import type { Dayjs } from 'dayjs'
// dayjs 没有 exports 映射，外置后由使用方的 Node / SSR 解析，必须写全扩展名。
import customParseFormat from 'dayjs/plugin/customParseFormat.js'
import type { BingDatePickerType } from './BingDatePicker.types'

dayjs.extend(customParseFormat)

export type DatePeriodUnit = 'day' | 'month' | 'year'

export interface DatePickerShortcut {
  label: string
  text: string
  value: Dayjs | [Dayjs, Dayjs]
}

export const defaultValueFormats: Record<BingDatePickerType, string> = {
  date: 'YYYY-MM-DD',
  datetime: 'YYYY-MM-DD HH:mm:ss',
  month: 'YYYY-MM',
  year: 'YYYY',
  time: 'HH:mm:ss',
}

const typeUnits: Record<Exclude<BingDatePickerType, 'time'>, DatePeriodUnit | 'second'> = {
  date: 'day',
  datetime: 'second',
  month: 'month',
  year: 'year',
}

export function normalizeFirstDayOfWeek(value: number) {
  return ((Math.floor(value) % 7) + 7) % 7
}

/** 从 0 开始、按步长递增且小于 `max` 的整数。 */
export function createStepOptions(max: number, step: number) {
  const normalizedStep = Math.max(1, Math.floor(step))
  const values: number[] = []

  for (let value = 0; value < max; value += normalizedStep) {
    values.push(value)
  }

  return values
}

/** 抹掉当前类型用不到的精度；`time` 统一落在 2000-01-01。 */
export function normalizeForType(value: Dayjs, type: BingDatePickerType) {
  const next = value.millisecond(0)

  if (type === 'date') {
    return next.startOf('day')
  }

  if (type === 'month') {
    return next.startOf('month')
  }

  if (type === 'year') {
    return next.startOf('year')
  }

  if (type === 'time') {
    return next.year(2000).month(0).date(1)
  }

  return next
}

/** 按值格式严格解析，无效时返回 `null`。 */
export function parseDateValue(value: string | null | undefined, type: BingDatePickerType, format: string) {
  if (!value) {
    return null
  }

  const parsed =
    type === 'time'
      ? dayjs(`2000-01-01 ${value}`, `YYYY-MM-DD ${format}`, true)
      : dayjs(value, format, true)

  return parsed.isValid() ? normalizeForType(parsed, type) : null
}

function secondsOfDay(value: Dayjs) {
  return value.hour() * 3600 + value.minute() * 60 + value.second()
}

/** 按类型精度比较两个值，返回值的正负表示先后。 */
export function compareTypedValue(
  value: Dayjs,
  target: Dayjs,
  type: BingDatePickerType,
  mode: 'start' | 'end' = 'start',
) {
  if (type === 'time') {
    return secondsOfDay(value) - secondsOfDay(target)
  }

  if (type === 'datetime') {
    return value.valueOf() - target.valueOf()
  }

  const unit = typeUnits[type]
  const left = mode === 'end' ? value.endOf(unit).valueOf() : value.startOf(unit).valueOf()
  const right = mode === 'end' ? target.endOf(unit).valueOf() : target.startOf(unit).valueOf()

  return left - right
}

export function getWeekdayLabels(locale: string, firstDayOfWeek: number) {
  const formatter = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const baseSunday = dayjs('2024-01-07')
  const firstDay = normalizeFirstDayOfWeek(firstDayOfWeek)

  return Array.from({ length: 7 }, (_, index) =>
    formatter.format(baseSunday.add((firstDay + index) % 7, 'day').toDate()),
  )
}

/** 月视图固定 6 行 × 7 列，从包含月初的那一周开始。 */
export function getCalendarCells(month: Dayjs, firstDayOfWeek: number) {
  const firstDay = normalizeFirstDayOfWeek(firstDayOfWeek)
  const monthStart = month.startOf('month')
  const offset = (monthStart.day() - firstDay + 7) % 7
  const gridStart = monthStart.subtract(offset, 'day')

  return Array.from({ length: 42 }, (_, index) => gridStart.add(index, 'day'))
}

export function getMonthCells(year: number) {
  return Array.from({ length: 12 }, (_, index) => dayjs().year(year).month(index).startOf('month'))
}

/** 年份面板每页 12 年，起始年份为 12 的整数倍。 */
export function getYearBlockStart(year: number) {
  return Math.floor(year / 12) * 12
}

export function getYearCells(year: number) {
  const start = getYearBlockStart(year)

  return Array.from({ length: 12 }, (_, index) => dayjs().year(start + index).startOf('year'))
}

export function createShortcuts(type: BingDatePickerType, range: boolean, now = dayjs()): DatePickerShortcut[] {
  const current = normalizeForType(now, type)

  if (!range) {
    if (type === 'date') {
      return [
        { label: '今天', text: '今天', value: current },
        { label: '昨天', text: '昨天', value: current.subtract(1, 'day').startOf('day') },
      ]
    }

    const label = type === 'datetime' || type === 'time' ? '此刻' : type === 'month' ? '本月' : '今年'

    return [{ label, text: label, value: current }]
  }

  if (type === 'month') {
    return [
      { label: '近6个月', text: '近6个月', value: [current.subtract(5, 'month').startOf('month'), current.startOf('month')] },
      { label: '今年', text: '今年', value: [current.startOf('year'), current.endOf('year').startOf('month')] },
    ]
  }

  if (type === 'year') {
    const decade = Math.floor(current.year() / 10) * 10

    return [
      { label: '近5年', text: '近5年', value: [current.subtract(4, 'year').startOf('year'), current.startOf('year')] },
      { label: '当前十年', text: '当前十年', value: [dayjs().year(decade).startOf('year'), dayjs().year(decade + 9).startOf('year')] },
    ]
  }

  if (type === 'time') {
    const at = (time: string) => normalizeForType(dayjs(`2000-01-01 ${time}`), type)

    return [
      { label: '上午', text: '上午', value: [at('09:00:00'), at('12:00:00')] },
      { label: '工作时段', text: '工作时段', value: [at('09:00:00'), at('18:00:00')] },
    ]
  }

  return [
    { label: '近7天', text: '近7天', value: [current.subtract(6, 'day').startOf('day'), current.endOf('day')] },
    { label: '近30天', text: '近30天', value: [current.subtract(29, 'day').startOf('day'), current.endOf('day')] },
    { label: '本月', text: '本月', value: [current.startOf('month'), current.endOf('month')] },
    { label: '今年', text: '今年', value: [current.startOf('year'), current.endOf('year')] },
  ]
}
