import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, reactive } from 'vue'
import type { App, VNode } from 'vue'
import { gsap } from 'gsap'
import { captureClickBurst as burst } from '../../../tests/helpers/click-feedback'
import BingButton from './BingButton.vue'
import BingForm from '../BingForm/BingForm.vue'
import type { BingButtonTextEffect, BingButtonVariant } from './BingButton.types'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined

async function mountButton(render: () => VNode) {
  await page.viewport(900, 600)
  host = document.createElement('div')
  host.style.cssText = 'padding: 40px;'
  document.body.append(host)
  app = createApp({ render })
  app.mount(host)
  await nextTick()
  const button = host.querySelector<HTMLButtonElement>('.bing-button')!
  return { button, liquid: button.querySelector<HTMLElement>('.bing-button__liquid')! }
}

function pointer(button: HTMLElement, type: string, x = 0.5, pointerType = 'mouse') {
  const rect = button.getBoundingClientRect()
  button.dispatchEvent(new PointerEvent(type, {
    pointerType,
    clientX: rect.left + rect.width * x,
    clientY: rect.top + rect.height / 2,
  }))
}

function animation(liquid: HTMLElement) {
  const tween = gsap.getTweensOf(liquid).find(tween => tween.duration() > 0)
  expect(tween).toBeDefined()
  return tween!.pause()
}

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = undefined
  host = undefined
  vi.restoreAllMocks()
})

function clickAt(button: HTMLButtonElement, x: number, y: number) {
  button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1, clientX: x, clientY: y }))
}

describe('BingButton 点击碎屑', () => {
  it('Flex 输入旁保留操作宽度，显式限宽时在实际文字行显示省略号', async () => {
    const { button } = await mountButton(() => h('div', { style: 'display:flex; gap:8px; width:190px' }, [
      h('input', { style: 'width:100%; min-width:0' }),
      h(BingButton, { size: 'xs', textEffect: 'none' }, () => '清空'),
    ]))
    const width = button.getBoundingClientRect().width
    expect(getComputedStyle(button).flexShrink).toBe('0')
    button.parentElement!.style.width = '420px'
    await nextTick()
    expect(button.getBoundingClientRect().width).toBe(width)
    expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth)
    app!.unmount()
    app = createApp({ render: () => h(BingButton, { style: 'max-width:110px;', textEffect: 'none' }, () => '有限宽度内需要显示省略号的按钮文本') })
    app.mount(host!)
    await nextTick()
    const text = host!.querySelector<HTMLElement>('.bing-animated-text__content')!
    expect(getComputedStyle(text).textOverflow).toBe('ellipsis')
    expect(getComputedStyle(text).display).toBe('block')
    expect(text.scrollWidth).toBeGreaterThan(text.clientWidth)
    expect(host!.querySelector('button')!.getBoundingClientRect().width).toBeLessThanOrEqual(110)
  })

  it.each<BingButtonVariant>(['primary', 'secondary', 'tertiary', 'ghost', 'danger', 'success', 'warning'])('%s 从点击点散开，文字、按钮和页面尺寸保持稳定', async variant => {
    const { button } = await mountButton(() => h(BingButton, { variant, textEffect: 'none' }, () => '操作'))
    host!.style.overflow = 'hidden'
    const rect = button.getBoundingClientRect().toJSON()
    const label = button.querySelector<HTMLElement>('.bing-button__label')!
    const labelRect = label.getBoundingClientRect().toJSON()
    const pageWidth = document.documentElement.scrollWidth
    const x = rect.left + 4
    const y = rect.top + 4
    clickAt(button, x, y)
    const motion = burst()
    const { layer, shards } = motion
    expect(shards).toHaveLength(12)
    expect(layer.parentElement).toBe(document.body)
    expect(getComputedStyle(layer).pointerEvents).toBe('none')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(shards.every(shard => parseFloat(shard.style.left) === x && parseFloat(shard.style.top) === y)).toBe(true)

    motion.seek(180)
    expect(shards.some(shard => shard.getBoundingClientRect().left < rect.left - 10)).toBe(true)
    expect(shards.some(shard => shard.getBoundingClientRect().top < rect.top - 10)).toBe(true)
    for (const progress of [0.2, 0.65, 1]) {
      motion.seek(progress * 540)
      expect(getComputedStyle(button).transform).toBe('none')
      expect(button.getBoundingClientRect().toJSON()).toEqual(rect)
      expect(label.getBoundingClientRect().toJSON()).toEqual(labelRect)
      expect(document.documentElement.scrollWidth).toBe(pageWidth)
    }
    await motion.finish()
    expect(layer.isConnected).toBe(false)
    expect(shards.flatMap(shard => shard.getAnimations())).toHaveLength(0)
  })

  it('键盘从中心播放，不影响原生表单提交和焦点', async () => {
    let submits = 0
    const { button } = await mountButton(() => h('form', {
      onSubmit: (event: Event) => { event.preventDefault(); submits++ },
    }, h(BingButton, { htmlType: 'submit', throttle: false, textEffect: 'none', id: 'particle-submit' }, () => '提交')))
    button.focus()
    for (const key of ['{Enter}', ' ']) {
      await userEvent.keyboard(key)
      const motion = burst()
      const { shards } = motion
      const rect = button.getBoundingClientRect()
      expect(parseFloat(shards[0]!.style.left)).toBe(rect.left + rect.width / 2)
      expect(parseFloat(shards[0]!.style.top)).toBe(rect.top + rect.height / 2)
      expect(document.activeElement).toBe(button)
      expect(button.matches(':focus-visible')).toBe(true)
      expect(button.id).toBe('particle-submit')
      await motion.finish()
    }
    expect(submits).toBe(2)
  })

  it('节流、禁用和加载不触发新碎屑，已接受点击的反馈可以完整结束', async () => {
    const state = reactive({ disabled: false, loading: false })
    let clicks = 0
    let throttled = 0
    const { button } = await mountButton(() => h(BingButton, {
      ...state, throttle: true, textEffect: 'none', onClick: () => { clicks++ }, onThrottled: () => { throttled++ },
    }, () => '保存'))
    button.click()
    const motion = burst()
    const { layer } = motion
    button.click()
    expect(clicks).toBe(1)
    expect(throttled).toBe(1)
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(1)
    state.loading = true
    await nextTick()
    expect(layer.isConnected).toBe(true)
    await motion.finish()
    button.click()
    expect(document.querySelector('.bing-click-particles')).toBeNull()
    state.loading = false
    state.disabled = true
    await nextTick()
    button.click()
    expect(clicks).toBe(1)
    expect(document.querySelector('.bing-click-particles')).toBeNull()
  })

  it('快速连点限制粒子数量，滚动和应用卸载清理动画与装饰节点', async () => {
    const { button } = await mountButton(() => h(BingButton, { textEffect: 'none' }, () => '连续点击'))
    host!.style.cssText += 'height:100px;overflow:auto;'
    const spacer = document.createElement('div')
    spacer.style.height = '300px'
    host!.append(spacer)
    const pending: ReturnType<typeof burst>[] = []
    for (let index = 0; index < 8; index++) {
      button.click()
      pending.push(burst())
      expect(document.querySelectorAll('.bing-click-particles').length).toBeLessThanOrEqual(3)
    }
    expect(pending[0]!.layer.isConnected).toBe(false)
    expect(pending[0]!.animations.every(animation => animation.playState === 'idle')).toBe(true)
    host!.scrollTop = 20
    await expect.poll(() => document.querySelector('.bing-click-particles')).toBeNull()
    button.click()
    pending.push(burst())
    app!.unmount()
    app = undefined
    for (const { layer, shards, animations } of pending) {
      expect(layer.isConnected).toBe(false)
      expect(animations.every(animation => animation.playState === 'idle')).toBe(true)
      expect(shards.flatMap(shard => shard.getAnimations())).toHaveLength(0)
    }
  })

  it('减少动态效果时跳过碎屑但正常触发操作', async () => {
    const original = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => {
      const media = original(query)
      if (query === '(prefers-reduced-motion: reduce)') Object.defineProperty(media, 'matches', { value: true })
      return media
    })
    let clicks = 0
    const { button } = await mountButton(() => h(BingButton, {
      textEffect: 'none', onClick: () => { clicks++ },
    }, () => '确认'))
    button.click()
    expect(clicks).toBe(1)
    expect(document.querySelector('.bing-click-particles')).toBeNull()
  })
})

describe('BingButton 悬停波纹', () => {
  it('禁用未悬停按钮不读取波纹布局，恢复后仍能再次悬停', async () => {
    const state = reactive({ disabled: false })
    const { button, liquid } = await mountButton(() => h(BingButton, {
      ...state, variant: 'tertiary', textEffect: 'none',
    }, () => '切换'))
    const computedStyle = vi.spyOn(window, 'getComputedStyle')
    state.disabled = true
    await nextTick()
    expect(computedStyle.mock.calls.filter(([element]) => element === liquid)).toEqual([])
    state.disabled = false
    await nextTick()
    pointer(button, 'pointerenter')
    animation(liquid).progress(0.5)
    state.disabled = true
    await nextTick()
    expect(liquid.style.transform).toBe('')
    expect(gsap.getTweensOf(liquid)).toHaveLength(0)
    state.disabled = false
    await nextTick()
    pointer(button, 'pointerenter')
    animation(liquid).progress(1)
    expect(getComputedStyle(liquid).opacity).toBe('1')
  })
  it('波纹随指针铺开，文字和按钮的布局保持稳定，装饰层不拦截点击', async () => {
    let clicks = 0
    const { button, liquid } = await mountButton(() => h(BingButton, {
      variant: 'tertiary', textEffect: 'none', onClick: () => { clicks++ },
    }, () => '保存草稿'))
    const label = button.querySelector<HTMLElement>('.bing-button__label')!
    const buttonRect = button.getBoundingClientRect().toJSON()
    const labelRect = label.getBoundingClientRect().toJSON()

    pointer(button, 'pointerenter', 0.15)
    const tween = animation(liquid)
    const firstOrigin = parseFloat(liquid.style.getPropertyValue('--button-liquid-x'))
    pointer(button, 'pointermove', 0.85)
    expect(parseFloat(liquid.style.getPropertyValue('--button-liquid-x'))).toBeGreaterThan(firstOrigin)
    expect(animation(liquid)).toBe(tween)

    for (const progress of [0.1, 0.5, 1]) {
      tween.progress(progress)
      expect(button.getBoundingClientRect().toJSON()).toEqual(buttonRect)
      expect(label.getBoundingClientRect().toJSON()).toEqual(labelRect)
    }
    expect(getComputedStyle(liquid).opacity).toBe('1')
    expect(getComputedStyle(liquid).pointerEvents).toBe('none')
    expect(liquid.getAttribute('aria-hidden')).toBe('true')
    await userEvent.click(button)
    expect(clicks).toBe(1)

    pointer(button, 'pointerleave')
    animation(liquid).progress(1)
    expect(getComputedStyle(liquid).opacity).toBe('0')
    expect(getComputedStyle(liquid).willChange).toBe('auto')
  })

  it('快速进出不叠加波纹，取消指针、切换为 Primary 和卸载会清理未完成的动画', async () => {
    const state = reactive<{ variant: 'secondary' | 'primary' }>({ variant: 'secondary' })
    const { button, liquid } = await mountButton(() => h(BingButton, { variant: state.variant, textEffect: 'none' }, () => '操作'))
    for (let index = 0; index < 6; index++) {
      pointer(button, 'pointerenter', index % 2 ? 0.1 : 0.9)
      animation(liquid).progress(0.3)
      expect(gsap.getTweensOf(liquid).filter(tween => tween.duration() > 0)).toHaveLength(1)
      pointer(button, 'pointerleave')
      animation(liquid).progress(0.3)
    }
    pointer(button, 'pointerenter')
    pointer(button, 'pointercancel')
    expect(gsap.getTweensOf(liquid)).toHaveLength(0)
    expect(getComputedStyle(liquid).opacity).toBe('0')

    pointer(button, 'pointerenter')
    const switching = animation(liquid)
    state.variant = 'primary'
    await nextTick()
    expect(switching.parent).toBeNull()
    expect(gsap.getTweensOf(liquid)).toHaveLength(0)
    expect(button.querySelector('.bing-button__liquid')).toBeNull()

    state.variant = 'secondary'
    await nextTick()
    const restoredLiquid = button.querySelector<HTMLElement>('.bing-button__liquid')!
    pointer(button, 'pointerenter')
    const pending = animation(restoredLiquid)
    app!.unmount()
    app = undefined
    expect(pending.parent).toBeNull()
    expect(gsap.getTweensOf(restoredLiquid)).toHaveLength(0)
  })

  it.each(['disabled', 'loading', 'formDisabled'] as const)('%s 状态中断波纹并阻止重播和点击', async (stateKey) => {
    const state = reactive({ disabled: false, loading: false, formDisabled: false })
    let clicks = 0
    const { button, liquid } = await mountButton(() => h(BingForm, { disabled: state.formDisabled }, () => h(BingButton, {
      variant: 'secondary',
      disabled: stateKey === 'formDisabled' ? undefined : state.disabled,
      loading: state.loading,
      textEffect: 'none',
      onClick: () => { clicks++ },
    }, () => '提交')))
    pointer(button, 'pointerenter')
    animation(liquid).progress(0.5)
    state[stateKey] = true
    await nextTick()

    expect(button.disabled).toBe(true)
    expect(getComputedStyle(liquid).opacity).toBe('0')
    pointer(button, 'pointerenter')
    pointer(button, 'pointermove')
    button.click()
    expect(gsap.getTweensOf(liquid)).toHaveLength(0)
    expect(clicks).toBe(0)

    state[stateKey] = false
    await nextTick()
    pointer(button, 'pointermove')
    expect(animation(liquid)).toBeDefined()
    button.click()
    expect(clicks).toBe(1)
  })

  it('触摸和键盘操作不触发悬停波纹，键盘焦点和提交仍然可用', async () => {
    let clicks = 0
    const { button, liquid } = await mountButton(() => h(BingButton, {
      variant: 'secondary', textEffect: 'none', onClick: () => { clicks++ },
    }, () => '确认'))
    // 上一个用例的鼠标可能停在新挂载按钮上，先移出，单独验证触摸和键盘路径。
    await userEvent.unhover(button)
    await expect.poll(() => getComputedStyle(liquid).opacity).toBe('0')
    await expect.poll(() => gsap.getTweensOf(liquid).length).toBe(0)
    pointer(button, 'pointerenter', 0.5, 'touch')
    pointer(button, 'pointermove', 0.5, 'touch')
    expect(gsap.getTweensOf(liquid)).toHaveLength(0)
    expect(getComputedStyle(liquid).opacity).toBe('0')

    button.focus()
    await userEvent.keyboard('{Enter}')
    expect(clicks).toBe(1)
    expect(document.activeElement).toBe(button)
    expect(button.matches(':focus-visible')).toBe(true)
    expect(getComputedStyle(button).outlineWidth).toBe('3px')
    expect(getComputedStyle(liquid).opacity).toBe('0')
  })
})

function jumpAnimation(button: HTMLElement) {
  const chars = Array.from(button.querySelectorAll<HTMLElement>('.bing-animated-text__char'))
  const timeline = gsap.globalTimeline.getChildren().find(animation =>
    animation instanceof gsap.core.Timeline && animation.repeat() === -1 &&
    animation.getChildren().some(child => child instanceof gsap.core.Tween && child.targets().includes(chars[0])),
  ) as gsap.core.Timeline | undefined
  expect(timeline).toBeDefined()
  return { chars, timeline: timeline!.pause() }
}

describe('BingButton loading 文字', () => {
  it.each<BingButtonTextEffect>(['none', 'shine', 'jump'])('loading 自动循环 jump，结束后恢复 %s，文字和图标始终可见', async effect => {
    const state = reactive({ loading: false })
    let clicks = 0
    const { button } = await mountButton(() => h(BingButton, {
      loading: state.loading, textEffect: effect, textEffectTrigger: 'hover', onClick: () => { clicks++ },
    }, {
      default: () => 'AVATAR office 保存设置',
      prefix: () => h('svg', { viewBox: '0 0 16 16', 'aria-hidden': true }, h('path', { d: 'M2 8h12' })),
    }))
    const content = button.querySelector<HTMLElement>('.bing-animated-text__content')!
    const rect = button.getBoundingClientRect().toJSON()
    const icon = button.querySelector('svg')!.getBoundingClientRect().toJSON()
    state.loading = true
    await nextTick()
    await expect.poll(() => button.querySelector('.bing-animated-text')?.getAttribute('data-jump-playing')).toBe('true')
    const { chars, timeline } = jumpAnimation(button)
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.querySelector('.bing-button__spinner')).toBeNull()
    expect(button.querySelector('.bing-animated-text__content')).toBe(content)
    expect(content.textContent).toBe('AVATAR office 保存设置')
    expect(getComputedStyle(button.querySelector('.bing-button__resting-content')!).opacity).toBe('1')
    const layer = button.querySelector<HTMLElement>('.bing-animated-text__jump-layer')!
    expect(getComputedStyle(layer).visibility).toBe('visible')
    expect(layer.getAttribute('aria-hidden')).toBe('true')
    expect(layer.inert).toBe(true)
    for (const time of [0.12, timeline.duration() + timeline.repeatDelay() + 0.12]) {
      timeline.totalTime(time)
      expect(chars.some(char => Number(gsap.getProperty(char, 'y')) < -1)).toBe(true)
      expect(button.getBoundingClientRect().toJSON()).toEqual(rect)
      expect(button.querySelector('svg')!.getBoundingClientRect().toJSON()).toEqual(icon)
    }
    button.click()
    expect(clicks).toBe(0)
    state.loading = false
    await nextTick()
    await expect.poll(() => button.querySelector('.bing-animated-text')?.hasAttribute('data-jump-playing')).toBe(false)
    expect(timeline.parent).toBeNull()
    expect(button.querySelector(`.bing-animated-text--${effect}`)).not.toBeNull()
    expect(button.getBoundingClientRect().toJSON()).toEqual(rect)
    expect(content.textContent).toBe('AVATAR office 保存设置')
    expect(button.disabled).toBe(false)
    expect(button.hasAttribute('aria-busy')).toBe(false)
    button.click()
    expect(clicks).toBe(1)
  })

  it('加载中更新文案、快速结束及再次加载不会留下旧文字或动画', async () => {
    const state = reactive({ loading: true, label: '保存中' })
    const { button } = await mountButton(() => h(BingButton, {
      loading: state.loading, textEffect: 'none',
    }, () => h('span', { id: 'loading-copy' }, state.label)))
    const originalLabel = button.querySelector('#loading-copy')
    await expect.poll(() => button.querySelector('.bing-animated-text')?.getAttribute('data-jump-playing')).toBe('true')
    const first = jumpAnimation(button)
    first.timeline.totalTime(0.12)
    state.label = '即将完成'
    await nextTick()
    await expect.poll(() => button.querySelector('.bing-animated-text__jump-layer')?.textContent).toBe('即将完成')
    expect(first.timeline.parent).toBeNull()
    expect(button.querySelector('.bing-animated-text__content')?.textContent).toBe('即将完成')
    expect(button.querySelector('#loading-copy')).toBe(originalLabel)
    expect(document.querySelectorAll('#loading-copy')).toHaveLength(1)
    for (let index = 0; index < 3; index++) {
      const active = jumpAnimation(button)
      active.timeline.totalTime(0.05)
      state.loading = false
      await nextTick()
      await expect.poll(() => button.querySelectorAll('.bing-animated-text__char').length).toBe(0)
      expect(button.querySelector('.bing-animated-text__content')?.textContent).toBe('即将完成')
      expect(active.timeline.parent).toBeNull()
      state.loading = true
      await nextTick()
      await expect.poll(() => button.querySelector('.bing-animated-text')?.getAttribute('data-jump-playing')).toBe('true')
    }
    const pending = jumpAnimation(button)
    app!.unmount()
    app = undefined
    expect(pending.timeline.parent).toBeNull()
    expect(gsap.getTweensOf(pending.chars)).toHaveLength(0)
  })

  it('loading 期间表单禁用会停止 jump，恢复后继续', async () => {
    const state = reactive({ disabled: false })
    const { button } = await mountButton(() => h(BingForm, { disabled: state.disabled }, () => h(BingButton, {
      loading: true, textEffect: 'none',
    }, () => '处理中')))
    await expect.poll(() => button.querySelector('.bing-animated-text')?.getAttribute('data-jump-playing')).toBe('true')
    const first = jumpAnimation(button)
    state.disabled = true
    await nextTick()
    await expect.poll(() => button.querySelectorAll('.bing-animated-text__char').length).toBe(0)
    expect(first.timeline.parent).toBeNull()
    expect(getComputedStyle(button.querySelector('.bing-animated-text__content')!).opacity).toBe('1')
    state.disabled = false
    await nextTick()
    await expect.poll(() => button.querySelector('.bing-animated-text')?.getAttribute('data-jump-playing')).toBe('true')
  })

  it('减少动态效果时 loading 仍保留可读文案和忙碌状态', async () => {
    const original = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => {
      const media = original(query)
      if (query === '(prefers-reduced-motion: reduce)') Object.defineProperty(media, 'matches', { value: true })
      return media
    })
    const { button } = await mountButton(() => h(BingButton, { loading: true }, () => '处理中'))
    await nextTick()
    expect(button.getAttribute('aria-busy')).toBe('true')
    expect(button.disabled).toBe(true)
    expect(button.querySelector('.bing-animated-text__content')?.textContent).toBe('处理中')
    expect(getComputedStyle(button.querySelector('.bing-animated-text__content')!).opacity).toBe('1')
    expect(button.querySelector('.bing-animated-text__char')).toBeNull()
    expect(button.querySelector('.bing-button__spinner')).toBeNull()
  })
})

describe('BingButton 文字动效感应区', () => {
  it('从按钮内边距移入也会触发 hover 文字动效，并从最近的字起跳', async () => {
    const { button } = await mountButton(() => h(BingButton, {
      textEffect: 'jump', textEffectTrigger: 'hover',
    }, () => '逐字跳动'))
    const text = button.querySelector<HTMLElement>('.bing-animated-text')!
    await expect.poll(() => text.hasAttribute('data-jump-ready')).toBe(true)
    const label = text.getBoundingClientRect()
    const rect = button.getBoundingClientRect()
    expect(label.left - rect.left).toBeGreaterThan(4)

    // 停在左侧内边距，指针并没有碰到文字。
    pointer(button, 'pointerenter', (label.left - rect.left) / 2 / rect.width)

    expect(text.getAttribute('data-jump-playing')).toBe('true')
    const chars = Array.from(text.querySelectorAll<HTMLElement>('.bing-animated-text__char'))
    const timeline = gsap.getTweensOf(chars[0]!)[0]!.parent as gsap.core.Timeline
    timeline.pause().time(0.05)
    expect(Number(gsap.getProperty(chars[0]!, 'y'))).toBeLessThan(-1)
    expect(Number(gsap.getProperty(chars[chars.length - 1]!, 'y'))).toBe(0)
  })

  it('键盘聚焦按钮时播放 hover 文字动效', async () => {
    const { button } = await mountButton(() => h('div', [
      h('input', { 'aria-label': '前一个输入框' }),
      h(BingButton, { variant: 'secondary', textShine: 'hover' }, () => '悬停扫光'),
    ]))
    const text = button.querySelector<HTMLElement>('.bing-animated-text')!
    host!.querySelector('input')!.focus()

    await userEvent.keyboard('{Tab}')

    expect(document.activeElement).toBe(button)
    expect(text.getAttribute('data-shine-playing')).toBe('true')
  })

  it('textSwap 让按钮宽度随文案平滑变化', async () => {
    const state = reactive({ label: '复制' })
    const { button } = await mountButton(() => h(BingButton, { textSwap: true }, () => state.label))
    const before = button.getBoundingClientRect().width

    state.label = '已复制链接'
    await nextTick()

    expect(button.querySelector('[data-swapping]')).not.toBeNull()
    expect(button.getBoundingClientRect().width).toBeCloseTo(before, 0)
    await expect.poll(() => button.querySelector('[data-swapping]'), { timeout: 2000 }).toBeNull()
    expect(button.getBoundingClientRect().width).toBeGreaterThan(before + 20)
  })
})
