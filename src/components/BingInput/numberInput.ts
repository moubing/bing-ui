export function finiteNumber(value: unknown): number | null {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function numberConstraints(min: unknown, max: unknown, step: unknown) {
  const lower = finiteNumber(min) ?? -Infinity
  const upper = Math.max(lower, finiteNumber(max) ?? Infinity)
  const increment = finiteNumber(step)
  return { min: lower, max: upper, step: increment !== null && increment > 0 ? increment : 1,
    any: String(step).toLowerCase() === 'any', base: Number.isFinite(lower) ? lower : 0 }
}
type Constraints = ReturnType<typeof numberConstraints>
const precise = (value: number) => Number(value.toPrecision(14))

export function normalizeNumber(value: number, limits: Constraints) {
  let next = Math.min(limits.max, Math.max(limits.min, value))
  if (!limits.any) {
    const first = Math.ceil(precise((limits.min - limits.base) / limits.step))
    const last = Math.floor(precise((limits.max - limits.base) / limits.step))
    const index = Math.min(last, Math.max(first, Math.round(precise((next - limits.base) / limits.step))))
    if (first <= last) next = limits.base + index * limits.step
  }
  return precise(Math.min(limits.max, Math.max(limits.min, next)))
}

/** 从非网格值向目标方向对齐，再执行剩余步数；any 保留当前小数部分。 */
export function stepNumber(value: number | null, steps: number, limits: Constraints) {
  const current = value ?? 0
  let next = current + steps * limits.step
  if (limits.any) next = current + steps
  else {
    const index = precise((current - limits.base) / limits.step)
    const target = (steps > 0 ? Math.floor(index) : Math.ceil(index)) + steps
    next = limits.base + target * limits.step
  }
  next = normalizeNumber(next, limits)
  if (!Number.isFinite(next) || (value !== null && (next - value) * steps <= 0)) return value
  return next
}
