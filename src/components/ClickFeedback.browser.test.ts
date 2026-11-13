import { afterEach, describe, expect, it, vi } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, reactive } from 'vue'
import type { App, VNode } from 'vue'
import { captureClickBurst as latestBurst } from '../../tests/helpers/click-feedback'
import BingButton from './BingButton/BingButton.vue'
import BingInput from './BingInput/BingInput.vue'
import BingTextarea from './BingTextarea/BingTextarea.vue'
import BingTag from './BingTag/BingTag.vue'
import BingTabs from './BingTabs/BingTabs.vue'
import BingCheckbox from './BingCheckbox/BingCheckbox.vue'
import BingRadio from './BingRadio/BingRadio.vue'
import BingSelect from './BingSelect/BingSelect.vue'
import BingTooltip from './BingTooltip/BingTooltip.vue'
import BingDropDown from './BingDropDown/BingDropDown.vue'
import BingDropDownItem from './BingDropDown/BingDropDownItem.vue'
import '../theme/index.css'

const mounted: Array<{ app: App; host: HTMLElement }> = []
async function mount(render: () => VNode) {
  await page.viewport(1000, 800)
  const host = document.createElement('div')
  host.style.cssText = 'padding: 48px; width: 480px;'
  document.body.append(host)
  const app = createApp({ render })
  app.mount(host)
  mounted.push({ app, host })
  await nextTick()
  return host
}

async function clearBursts() {
  // 清理测试产生的反馈；滚动清理由下面真实改变滚动位置的用例独立验证。
  const count = document.querySelectorAll('.bing-click-particles').length
  for (let index = 0; index < count; index++) await latestBurst().finish()
  expect(document.querySelector('.bing-click-particles')).toBeNull()
}

afterEach(() => {
  for (const { app, host } of mounted.splice(0)) { app.unmount(); host.remove() }
  expect(document.querySelector('.bing-click-particles')).toBeNull()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('共享点击反馈', () => {
  it.each(['input', 'textarea'] as const)('%s 清空键保持 24px，隐藏后碎屑继续播放，连续清空不受节流影响', async kind => {
    const state = reactive({ value: '2322' })
    const host = await mount(() => kind === 'input'
      ? h(BingInput, { clearable: true, modelValue: state.value, 'onUpdate:modelValue': value => { state.value = String(value) } })
      : h(BingTextarea, { clearable: true, modelValue: state.value, 'onUpdate:modelValue': value => { state.value = value } }))
    const field = host.querySelector<HTMLInputElement | HTMLTextAreaElement>(kind)!
    for (let index = 0; index < 2; index++) {
      const button = host.querySelector<HTMLButtonElement>(`.bing-${kind}__clear`)!
      expect(button.classList.contains('bing-button')).toBe(true)
      expect(button.getBoundingClientRect().width).toBe(24)
      expect(button.getBoundingClientRect().height).toBe(24)
      button.click()
      const motion = latestBurst()
      const { layer, shards } = motion
      await nextTick()
      expect(state.value).toBe('')
      expect(button.isConnected).toBe(true)
      expect(button.getAttribute('aria-hidden')).toBe('true')
      expect(button.tabIndex).toBe(-1)
      expect(button.classList.contains('is-visible')).toBe(false)
      expect(layer.isConnected).toBe(true)
      expect(document.activeElement).toBe(field)
      await motion.finish()
      expect(layer.isConnected).toBe(false)
      expect(shards.flatMap(shard => shard.getAnimations())).toHaveLength(0)
      state.value = '下一次清空'
      await nextTick()
    }
  })

  it('移除整个 Tag 仍能播完，应用卸载立即清理装饰层和时间线', async () => {
    const state = reactive({ visible: true })
    const host = await mount(() => h('div', state.visible
      ? h(BingTag, { label: '可移除', closable: true, onClose: () => { state.visible = false } }) : []))
    host.querySelector<HTMLButtonElement>('.bing-tag__close')!.click()
    const first = latestBurst()
    await nextTick()
    expect(host.querySelector('.bing-tag')).toBeNull()
    expect(first.layer.isConnected).toBe(true)
    const { app, host: root } = mounted.pop()!
    app.unmount()
    root.remove()
    expect(first.layer.isConnected).toBe(false)
    expect(first.animations.every(animation => animation.playState === 'idle')).toBe(true)
  })

  it('Tabs 键盘切换在目标标签中心反馈，禁用项被跳过，连续切换保持响应', async () => {
    const state = reactive({ value: 'a' })
    const host = await mount(() => h(BingTabs, {
      items: [{ label: '概览', value: 'a' }, { label: '禁用', value: 'b', disabled: true }, { label: '详情', value: 'c' }],
      modelValue: state.value, 'onUpdate:modelValue': value => { state.value = String(value) },
    }))
    const tabs = host.querySelectorAll<HTMLButtonElement>('[role=tab]')
    tabs[0]!.focus()
    await userEvent.keyboard('{ArrowRight}')
    const motion = latestBurst()
    const { shards } = motion
    expect(state.value).toBe('c')
    expect(document.activeElement).toBe(tabs[2])
    const rect = tabs[2]!.getBoundingClientRect()
    expect(parseFloat(shards[0]!.style.left)).toBeCloseTo(rect.left + rect.width / 2)
    await motion.finish()
    tabs[1]!.click()
    expect(document.querySelector('.bing-click-particles')).toBeNull()
    tabs[0]!.click()
    await nextTick()
    tabs[2]!.click()
    await nextTick()
    expect(state.value).toBe('c')
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(2)
  })

  it.each(['checkbox', 'radio'] as const)('%s 点击 label、键盘和禁用状态不会重复反馈', async kind => {
    const state = reactive({ disabled: false, selected: false })
    const host = await mount(() => h(BingTooltip, { content: '点击提示', trigger: 'click', openDelay: 0 }, () => kind === 'checkbox'
      ? h(BingCheckbox, {
        label: '选择项目', disabled: state.disabled, modelValue: state.selected,
        'onUpdate:modelValue': value => { state.selected = value },
      })
      : h(BingRadio, {
        label: '选择项目', disabled: state.disabled, modelValue: state.selected,
        'onUpdate:modelValue': value => { state.selected = Boolean(value) },
      })))
    await userEvent.click(host.querySelector('label')!)
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(1)
    await clearBursts()
    state.selected = false
    await nextTick()
    const input = host.querySelector<HTMLInputElement>('input')!
    input.focus()
    await userEvent.keyboard(' ')
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(1)
    await clearBursts()
    if (kind === 'checkbox') {
      await userEvent.keyboard(' ')
      expect(state.selected).toBe(false)
      expect(document.querySelector('.bing-click-particles')).toBeNull()
    }
    state.disabled = true
    await nextTick()
    input.click()
    expect(document.querySelector('.bing-click-particles')).toBeNull()
  })

  it('Select 的装饰复选框不重复播放，选项关闭面板后反馈仍然存在', async () => {
    const host = await mount(() => h(BingSelect, {
      options: [{ label: '第一项', value: 1 }, { label: '禁用项', value: 2, disabled: true }],
      modelValue: null, searchable: false, showSelectAll: false,
    }))
    host.querySelector<HTMLButtonElement>('.bing-select__trigger')!.click()
    await expect.poll(() => document.querySelector('.bing-select__option')).not.toBeNull()
    await clearBursts()
    const options = document.querySelectorAll<HTMLButtonElement>('.bing-select__option')
    options[1]!.click()
    expect(document.querySelector('.bing-click-particles')).toBeNull()
    options[0]!.click()
    const motion = latestBurst()
    const { layer } = motion
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(1)
    await nextTick()
    expect(layer.isConnected).toBe(true)
    await motion.finish()
  })

  it('BingButton 作为 Dropdown 触发器只反馈一次，菜单项也有反馈', async () => {
    const host = await mount(() => h(BingDropDown, {}, {
      trigger: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => h(BingButton, { ...triggerProps, throttle: false }, () => '菜单'),
      default: () => h(BingDropDownItem, {}, () => '执行'),
    }))
    await userEvent.click(host.querySelector<HTMLButtonElement>('.bing-button')!)
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(1)
    await expect.poll(() => document.querySelector('[role=menuitem]')).not.toBeNull()
    await clearBursts()
    await userEvent.click(document.querySelector<HTMLButtonElement>('[role=menuitem]')!)
    const { layer } = latestBurst()
    await nextTick()
    expect(layer.isConnected).toBe(true)
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(1)
  })

  it.each(['scrollTop', 'scrollLeft'] as const)('%s 的旧事件与无关区域滚动保留反馈，来源祖先的新位移清理反馈', async axis => {
    const host = await mount(() => h('div', [
      h('div', { class: 'source-scroll', style: 'width:200px;height:100px;overflow:auto;' }, [
        h('div', { style: 'width:600px;height:600px;' }, [h(BingButton, { textEffect: 'none' }, () => '操作')]),
      ]),
      h('div', { class: 'unrelated-scroll', style: 'width:200px;height:100px;overflow:auto;' }, [
        h('div', { style: 'width:600px;height:600px;' }, '其他区域'),
      ]),
    ]))
    const source = host.querySelector<HTMLElement>('.source-scroll')!
    const unrelated = host.querySelector<HTMLElement>('.unrelated-scroll')!
    let sourceEvents = 0
    let unrelatedEvents = 0
    source.addEventListener('scroll', () => { sourceEvents++ })
    unrelated.addEventListener('scroll', () => { unrelatedEvents++ })
    // 点击前位移已恢复，但浏览器的 scroll 通知仍排在队列中。
    source[axis] = 20
    source[axis] = 0
    host.querySelector<HTMLButtonElement>('.bing-button')!.click()
    const { layer, shards, animations } = latestBurst()
    await expect.poll(() => sourceEvents).toBeGreaterThan(0)
    expect(layer.isConnected).toBe(true)
    unrelated[axis] = 20
    await expect.poll(() => unrelatedEvents).toBeGreaterThan(0)
    expect(layer.isConnected).toBe(true)
    source[axis] = 20
    await expect.poll(() => layer.isConnected).toBe(false)
    expect(animations.every(animation => animation.playState === 'idle')).toBe(true)
    expect(shards.flatMap(shard => shard.getAnimations())).toHaveLength(0)
  })

  it('页面滚动位置未变的通知保留反馈，页面实际滚动时清理', async () => {
    const host = await mount(() => h('div', { style: 'height:1600px;' }, [h(BingButton, { textEffect: 'none' }, () => '操作')]))
    window.scrollTo(0, 0)
    host.querySelector<HTMLButtonElement>('.bing-button')!.click()
    const { layer, animations } = latestBurst()
    document.dispatchEvent(new Event('scroll'))
    expect(layer.isConnected).toBe(true)
    try {
      window.scrollTo(0, 50)
      await expect.poll(() => layer.isConnected).toBe(false)
      expect(animations.every(animation => animation.playState === 'idle')).toBe(true)
    } finally {
      window.scrollTo(0, 0)
    }
  })

  it('数值长按只在首次有效步进反馈，自动连发与松手 click 不重复生成碎屑', async () => {
    const state = reactive({ value: 0 })
    const host = await mount(() => h(BingInput, {
      type: 'number', modelValue: state.value,
      'onUpdate:modelValue': value => { state.value = Number(value) },
    }))
    const step = host.querySelector<HTMLButtonElement>('.bing-input__step')!
    vi.useFakeTimers({ toFake: ['setTimeout', 'setInterval', 'clearTimeout', 'clearInterval'] })
    step.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true, pointerType: 'mouse', button: 0 }))
    const motion = latestBurst()
    expect(state.value).toBe(1)
    await vi.advanceTimersByTimeAsync(650)
    expect(state.value).toBeGreaterThan(2)
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(1)
    window.dispatchEvent(new PointerEvent('pointerup'))
    step.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1 }))
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(1)
    await motion.finish()
  })

  it('不同应用的反馈分别清理，currentColor 取控件颜色，页面退出清理剩余动画', async () => {
    const firstHost = await mount(() => h(BingButton, { throttle: false }, () => '第一应用'))
    const secondHost = await mount(() => h(BingButton, {
      throttle: false, style: { '--bing-click-particle-color': 'currentColor', color: 'rgb(210, 220, 230)' },
    }, () => '第二应用'))
    firstHost.querySelector('button')!.click()
    const first = latestBurst()
    secondHost.querySelector('button')!.click()
    const second = latestBurst()
    expect(second.layer.style.color).toBe('rgb(210, 220, 230)')
    const { app, host } = mounted.shift()!
    app.unmount()
    host.remove()
    expect(first.animations.every(animation => animation.playState === 'idle')).toBe(true)
    expect(first.layer.isConnected).toBe(false)
    expect(second.layer.isConnected).toBe(true)
    window.dispatchEvent(new Event('pagehide'))
    expect(second.animations.every(animation => animation.playState === 'idle')).toBe(true)
    expect(second.layer.isConnected).toBe(false)
    expect(second.shards.flatMap(shard => shard.getAnimations())).toHaveLength(0)
  })

  it('跨控件连点共享数量上限；减少动态效果与取消点击均不生成碎屑', async () => {
    let clicks = 0
    const host = await mount(() => h('div', [0, 1, 2, 3].map(value => h(BingButton, {
      throttle: false, onClick: () => { clicks++ },
    }, () => String(value)))))
    for (const button of host.querySelectorAll<HTMLButtonElement>('button')) button.click()
    expect(clicks).toBe(4)
    expect(document.querySelectorAll('.bing-click-particles')).toHaveLength(3)
    await clearBursts()
    const button = host.querySelector('button')!
    const canceled = new MouseEvent('click', { bubbles: true, cancelable: true })
    canceled.preventDefault()
    button.dispatchEvent(canceled)
    expect(clicks).toBe(4)
    const original = window.matchMedia.bind(window)
    vi.spyOn(window, 'matchMedia').mockImplementation(query => {
      const media = original(query)
      if (query === '(prefers-reduced-motion: reduce)') Object.defineProperty(media, 'matches', { value: true })
      return media
    })
    button.click()
    expect(clicks).toBe(5)
    expect(document.querySelector('.bing-click-particles')).toBeNull()
  })
})
