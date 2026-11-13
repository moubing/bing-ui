import { createApp, h, nextTick, ref } from 'vue'
import type { App, VNode } from 'vue'
import { gsap } from 'gsap'
import { afterEach, describe, expect, it } from 'vitest'
import BingAnimatedText from './BingAnimatedText.vue'
import '../../theme/index.css'

function mount(render: () => VNode) {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({ render })
  app.mount(host)
  return host
}

const chars = (root: ParentNode, selector = '.bing-animated-text__jump-layer .bing-animated-text__char') =>
  [...root.querySelectorAll<HTMLElement>(selector)]

let app: App | undefined
let host: HTMLElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
})

describe('BingAnimatedText wrapping in a browser', () => {
  it('wraps Chinese jump text within its original layout after the container is resized', async () => {
    const width = ref(240)
    host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp({
      render: () => h('div', {
        style: { width: `${width.value}px`, fontSize: '14px', lineHeight: '22px' },
      }, h(BingAnimatedText, { effect: 'jump', trigger: 'hover' }, () =>
        '鼠标经过时这段较长的中文会依次跳跃并且保持正文原本的自然换行',
      )),
    })
    app.mount(host)
    await expect.poll(() => host!.querySelector('[data-jump-ready]')).not.toBeNull()

    for (const size of [240, 180, 320]) {
      width.value = size
      await nextTick()
      const content = host.querySelector<HTMLElement>('.bing-animated-text__content')!
      const layer = host.querySelector<HTMLElement>('.bing-animated-text__jump-layer')!
      const bounds = content.getBoundingClientRect()
      expect(layer.scrollHeight).toBeLessThanOrEqual(content.clientHeight)
      const chars = [...layer.querySelectorAll<HTMLElement>('.bing-animated-text__char')]
      expect(new Set(chars.map(char => char.offsetTop)).size).toBeGreaterThan(1)
      chars.forEach(char => {
        const rect = char.getBoundingClientRect()
        expect(rect.left).toBeGreaterThanOrEqual(bounds.left - 1)
        expect(rect.right).toBeLessThanOrEqual(bounds.right + 1)
      })
    }
  })
})

describe('BingAnimatedText swap in a browser', () => {
  it.each([
    ['12 条未读消息', '13 条未读消息'],
    ['正在校验文件', '3 个文件已上传'],
  ])('混排文案 %s 切换为 %s 后，字形坐标在交接前后保持一致', async (previous, next) => {
    const label = ref(previous)
    const root = mount(() => h('div', { style: { fontSize: '14px', lineHeight: '22px' } },
      h(BingAnimatedText, { swap: true }, () => label.value)))
    label.value = next
    await nextTick()

    const text = root.querySelector<HTMLElement>('.bing-animated-text')!
    const list = chars(root)
    const timeline = gsap.getTweensOf([text, ...list]).find(tween => tween.duration() > 0)!.parent as gsap.core.Timeline
    timeline.pause().time(timeline.duration() - 0.0001)
    const range = document.createRange()
    const before = list.map(char => {
      range.selectNodeContents(char)
      return range.getBoundingClientRect()
    })

    timeline.time(timeline.duration())

    const content = root.querySelector('.bing-animated-text__content')!
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT)
    let node = walker.nextNode()
    while (node && !node.textContent) node = walker.nextNode()
    expect(node?.textContent).toBe(next)
    let charIndex = 0
    Array.from(next).forEach((char, index) => {
      if (!char.trim()) return
      range.setStart(node!, index)
      range.setEnd(node!, index + char.length)
      const after = range.getBoundingClientRect()
      expect(after.x).toBeCloseTo(before[charIndex].x, 3)
      expect(after.y).toBeCloseTo(before[charIndex].y, 3)
      charIndex++
    })
  })

  it('上传文案平滑交接到 shimmer，连续更新会清理上一次交接的透明度', async () => {
    const label = ref('等待上传')
    const effect = ref<'none' | 'shimmer'>('none')
    const root = mount(() => h(BingAnimatedText, { swap: true, effect: effect.value }, () => label.value))
    effect.value = 'shimmer'
    label.value = '正在上传 3 个文件'
    await nextTick()
    await nextTick()

    const text = root.querySelector<HTMLElement>('.bing-animated-text')!
    const content = root.querySelector<HTMLElement>('.bing-animated-text__content')!
    const layer = root.querySelector<HTMLElement>('.bing-animated-text__jump-layer')!
    const timeline = gsap.getTweensOf([text, ...chars(root)]).find(tween => tween.duration() > 0)!.parent as gsap.core.Timeline
    timeline.pause().time(timeline.duration() - 0.06)
    const originalOpacity = Number(getComputedStyle(content).opacity)
    const copyOpacity = Number(getComputedStyle(layer).opacity)
    expect(originalOpacity).toBeGreaterThan(0.1)
    expect(originalOpacity).toBeLessThan(0.9)
    expect(copyOpacity).toBeGreaterThan(0.1)
    expect(copyOpacity).toBeLessThan(0.9)
    expect(originalOpacity + copyOpacity).toBeCloseTo(1, 3)

    label.value = '3 个文件已上传'
    effect.value = 'none'
    await nextTick()
    await nextTick()
    expect(timeline.parent).toBeNull()
    expect(content.style.opacity).toBe('')
    expect(layer.style.opacity).toBe('')
    await expect.poll(() => text.hasAttribute('data-swapping'), { timeout: 2000 }).toBe(false)
    expect(getComputedStyle(content).opacity).toBe('1')
    expect(content.textContent).toBe('3 个文件已上传')
  })

  it('保留共同的字并滑到新位置，删除的字退场，占位宽度平滑收缩', async () => {
    const label = ref('复制链接')
    const root = mount(() => h('div', { style: { fontSize: '14px', lineHeight: '22px' } },
      h(BingAnimatedText, { swap: true }, () => label.value)))
    const text = root.querySelector<HTMLElement>('.bing-animated-text')!
    const before = text.getBoundingClientRect().width

    label.value = '已复制'
    await nextTick()

    expect(text.getAttribute('data-swapping')).toBe('true')
    expect(root.querySelector('.bing-animated-text__content')!.textContent!.trim()).toBe('已复制')
    // 切换开始时仍占据旧宽度，周围布局不会突然跳动。
    const occupied = text.getBoundingClientRect().width +
      Number.parseFloat(getComputedStyle(text).marginInlineEnd)
    expect(occupied).toBeCloseTo(before, 0)

    const ghosts = [...root.querySelectorAll<HTMLElement>('.bing-animated-text__ghost')]
    expect(ghosts.map(ghost => ghost.textContent)).toEqual(['链', '接'])
    const [entering, ...kept] = chars(root)
    expect(entering.textContent).toBe('已')
    expect(Number(gsap.getProperty(entering, 'opacity'))).toBeLessThan(0.5)
    kept.forEach(char => expect(Number(gsap.getProperty(char, 'x'))).toBeLessThan(-4))

    await expect.poll(() => text.hasAttribute('data-swapping'), { timeout: 2000 }).toBe(false)
    expect(root.querySelectorAll('.bing-animated-text__char')).toHaveLength(0)
    expect(root.querySelectorAll('.bing-animated-text__ghost')).toHaveLength(0)
    expect(getComputedStyle(root.querySelector('.bing-animated-text__content')!).opacity).toBe('1')
    expect(getComputedStyle(text).marginInlineEnd).toBe('0px')
  })

  it('拆字副本与原文保持同一行，不会因空格宽度误差多换一行', async () => {
    const count = ref(12)
    const root = mount(() => h('div', { style: { display: 'flex', fontSize: '14px', lineHeight: '22px' } },
      h(BingAnimatedText, { swap: true }, () => `${count.value} 条未读消息`)))

    for (const next of [13, 9, 10, 100]) {
      count.value = next
      await nextTick()
      const tops = new Set(chars(root).map(char => char.offsetTop))
      expect(tops.size).toBe(1)
    }
  })

  it('连续快速切换时从当前画面接续，最终只留下最新文案', async () => {
    const label = ref('保存')
    const root = mount(() => h(BingAnimatedText, { swap: true, effect: 'jump', trigger: 'hover' }, () => label.value))
    await expect.poll(() => root.querySelector('[data-jump-ready]')).not.toBeNull()

    for (const next of ['保存中', '已保存', '保存失败']) {
      label.value = next
      await nextTick()
      expect(root.querySelector('[data-swapping]')).not.toBeNull()
    }

    await expect.poll(() => root.querySelector('[data-swapping]'), { timeout: 2000 }).toBeNull()
    // jump 效果在切换结束后重新建立，副本内容与最新文案一致。
    expect(root.querySelector('[data-jump-ready]')).not.toBeNull()
    expect(chars(root).map(char => char.textContent).join('')).toBe('保存失败')
    expect(root.querySelectorAll('.bing-animated-text__ghost')).toHaveLength(0)
  })

  it('未开启 swap 时文案直接替换', async () => {
    const label = ref('保存')
    const root = mount(() => h(BingAnimatedText, null, () => label.value))
    label.value = '已保存'
    await nextTick()

    expect(root.querySelector('[data-swapping]')).toBeNull()
    expect(root.querySelectorAll('.bing-animated-text__char')).toHaveLength(0)
  })
})

describe('BingAnimatedText pointer origin in a browser', () => {
  it('hover jump 从指针最近的字开始，越远起跳越晚', async () => {
    const root = mount(() => h('p', { style: { fontSize: '16px', lineHeight: '24px', whiteSpace: 'nowrap' } },
      h(BingAnimatedText, { effect: 'jump', trigger: 'hover' }, () => '从右侧移入时波纹向左传递')))
    await expect.poll(() => root.querySelector('[data-jump-ready]')).not.toBeNull()
    const text = root.querySelector<HTMLElement>('.bing-animated-text')!
    const list = chars(root)
    const last = list[list.length - 1].getBoundingClientRect()

    text.dispatchEvent(new PointerEvent('pointerenter', {
      clientX: last.right - 1,
      clientY: last.top + last.height / 2,
    }))
    const timeline = gsap.getTweensOf(list[0])[0]?.parent as gsap.core.Timeline
    timeline.pause().time(0.1)

    expect(Number(gsap.getProperty(list[list.length - 1], 'y'))).toBeLessThan(-3)
    expect(Number(gsap.getProperty(list[0], 'y'))).toBe(0)
    timeline.time(timeline.duration())
  })
})
