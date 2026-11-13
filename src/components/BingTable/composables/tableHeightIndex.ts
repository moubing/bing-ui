/** 行高前缀和：均高时直接计算，变高时使用树状数组更新和定位。 */
export class TableHeightIndex {
  private readonly tree: Float64Array
  private readonly counts = new Map<number, number>()
  readonly heights: number[]

  constructor(heights: number[]) {
    this.heights = [...heights]
    this.tree = new Float64Array(heights.length + 1)
    heights.forEach((height, index) => {
      this.counts.set(height, (this.counts.get(height) ?? 0) + 1)
      const i = index + 1
      this.tree[i]! += height
      const parent = i + (i & -i)
      if (parent < this.tree.length) this.tree[parent]! += this.tree[i]!
    })
  }
  get uniformHeight(): number | undefined {
    return this.counts.size === 1 ? this.counts.keys().next().value : undefined
  }
  offset(index: number) {
    const end = Math.max(0, Math.min(index, this.heights.length))
    const uniform = this.uniformHeight
    if (uniform !== undefined) return end * uniform
    let total = 0
    for (let i = end; i > 0; i -= i & -i) total += this.tree[i]!
    return total
  }
  update(index: number, height: number) {
    const previous = this.heights[index]
    if (previous === undefined || previous === height) return false
    const count = this.counts.get(previous)! - 1
    if (count) this.counts.set(previous, count); else this.counts.delete(previous)
    this.counts.set(height, (this.counts.get(height) ?? 0) + 1)
    this.heights[index] = height
    for (let i = index + 1; i < this.tree.length; i += i & -i) this.tree[i]! += height - previous
    return true
  }
  indexAt(offset: number) {
    const uniform = this.uniformHeight
    if (uniform !== undefined) return Math.max(0, Math.min(this.heights.length - 1, Math.floor(offset / uniform)))
    let index = 0
    let sum = 0
    let bit = 1
    while (bit * 2 < this.tree.length) bit *= 2
    for (; bit; bit >>= 1) {
      const next = index + bit
      if (next < this.tree.length && sum + this.tree[next]! <= offset) {
        index = next
        sum += this.tree[next]!
      }
    }
    return Math.max(0, Math.min(this.heights.length - 1, index))
  }
}
