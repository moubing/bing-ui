import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { h, nextTick } from 'vue'
import { gsap } from 'gsap'
import BingTooltip from './BingTooltip.vue'
import type { BingTooltipExpose, BingTooltipProps } from './BingTooltip.types'

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

function getBodyTooltip() {
  return document.body.querySelector<HTMLElement>('.bing-tooltip__content')
}

function getBodyTooltips() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.bing-tooltip__content'))
}

async function waitForTooltipRender(wrapper: ReturnType<typeof mount>) {
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
}

describe('BingTooltip', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('renders string content from hover trigger', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Quick hint',
        openDelay: 0,
        closeDelay: 0,
        glassBlur: 6,
        glassOpacity: 0.9,
        glassSaturation: 1.05,
      },
      slots: {
        default: '<button type="button">Hover me</button>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip').trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()?.textContent).toContain('Quick hint')
    expect(wrapper.emitted('open')?.[0]).toEqual(['hover'])
    expect(wrapper.get('button').attributes('aria-describedby')).toBe(getBodyTooltip()?.id)
    expect(wrapper.attributes('aria-describedby')).toBeUndefined()
    expect(getBodyTooltip()?.getAttribute('style')).toContain('--bing-tooltip-glass-blur: 6px')
    expect(getBodyTooltip()?.getAttribute('style')).toContain('--bing-tooltip-glass-opacity: 0.9')
    expect(getBodyTooltip()?.getAttribute('style')).toContain(
      '--bing-tooltip-glass-saturation: 1.05',
    )

    await wrapper.get('.bing-tooltip').trigger('pointerleave')
    await waitForTooltipRender(wrapper)

    expect(wrapper.emitted('close')?.[0]).toEqual(['hover'])
  })

  it('inherits the shared theme glass settings by default', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Glass hint',
        openDelay: 0,
      },
      slots: {
        default: '<button type="button">Hover me</button>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip').trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    const tooltip = getBodyTooltip()
    expect(tooltip?.style.getPropertyValue('--bing-tooltip-glass-blur')).toBe('var(--bing-glass-blur, 16px)')
    expect(tooltip?.style.getPropertyValue('--bing-tooltip-glass-opacity')).toBe('var(--bing-glass-opacity, 0.85)')
    expect(tooltip?.style.getPropertyValue('--bing-tooltip-glass-saturation')).toBe('var(--bing-glass-saturation, 1.05)')

  })

  it('uses the shared near-opaque surface settings when glass is disabled', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Solid hint',
        glass: false,
        openDelay: 0,
      },
      slots: {
        default: '<button type="button">Hover me</button>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip').trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    const style = getBodyTooltip()?.getAttribute('style') ?? ''

    expect(style).toContain('--bing-tooltip-glass-blur: 0px')
    expect(style).toContain('--bing-tooltip-glass-opacity: 1')
    expect(style).toContain('--bing-tooltip-glass-saturation: 1')
  })

  it('renders complex content slot and toggles from click trigger', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        trigger: 'click',
      },
      slots: {
        default: '<button type="button">Details</button>',
        content: '<div class="tooltip-card"><strong>Glass panel</strong><button type="button">Action</button></div>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip__anchor').trigger('click')
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()?.querySelector('.tooltip-card')).not.toBeNull()
    expect(getBodyTooltip()?.textContent).toContain('Glass panel')

    await wrapper.get('.bing-tooltip__anchor').trigger('click')
    await waitForTooltipRender(wrapper)

    expect(wrapper.emitted('close')?.[0]).toEqual(['click'])
  })

  it('can be opened and closed from exposed methods', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Manual hint',
        trigger: 'manual',
      },
      slots: {
        default: '<span>Anchor</span>',
      },
      attachTo: document.body,
    })
    const tooltip = wrapper.vm as unknown as BingTooltipExpose

    tooltip.show()
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()?.textContent).toContain('Manual hint')
    expect(wrapper.emitted('open')?.[0]).toEqual(['manual'])

    tooltip.hide()
    await waitForTooltipRender(wrapper)

    expect(wrapper.emitted('close')?.[0]).toEqual(['manual'])
  })

  it('flips placement and clamps to the viewport edge', async () => {
    const originalInnerHeight = window.innerHeight
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 180,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 800,
    })

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(
      this: HTMLElement,
    ) {
      if (this.classList.contains('bing-tooltip')) {
        return rect(6, 740, 40, 28)
      }

      if (this.classList.contains('bing-tooltip__content')) {
        return rect(0, 0, 220, 60)
      }

      return rect(0, 0, 0, 0)
    })

    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Pinned to viewport',
        openDelay: 0,
        placement: 'top',
      },
      slots: {
        default: '<button type="button">Near edge</button>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip').trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    const tooltip = getBodyTooltip()

    expect(tooltip?.classList).toContain('is-placement-bottom')
    expect(tooltip?.style.position).toBe('fixed')
    expect(Number.parseFloat(tooltip?.style.left ?? '0')).toBe(568)
    expect(Number.parseFloat(tooltip?.style.top ?? '0')).toBe(44)

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('closes click-triggered content from outside pointerdown', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Click content',
        trigger: 'click',
      },
      slots: {
        default: '<button type="button">打开</button>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip__anchor').trigger('click')
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()).not.toBeNull()

    document.body.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await waitForTooltipRender(wrapper)

    expect(wrapper.emitted('close')?.[0]).toEqual(['outside'])
  })

  it('keeps the tooltip open when pointerdown lands inside the panel', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Selectable tooltip content',
        openDelay: 0,
      },
      slots: {
        default: '<button type="button">Hover target</button>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip').trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    getBodyTooltip()?.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await waitForTooltipRender(wrapper)

    expect(wrapper.emitted('close')).toBeUndefined()
    expect(getBodyTooltip()?.textContent).toContain('Selectable tooltip content')
  })

  it('closes hover content with click reason when pointerdown lands on its anchor', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Anchor click should close',
        openDelay: 0,
      },
      slots: {
        default: '<button type="button">Hover target</button>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip').trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    wrapper.get('.bing-tooltip__anchor').element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    await waitForTooltipRender(wrapper)

    expect(wrapper.emitted('close')?.[0]).toEqual(['click'])
  })

  it('keeps click-triggered content through pointerdown and toggles it once on click', async () => {
    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Click content',
        trigger: 'click',
      },
      slots: {
        default: '<button type="button">打开</button>',
      },
      attachTo: document.body,
    })
    const anchor = wrapper.get('.bing-tooltip__anchor')

    await anchor.trigger('click')
    await waitForTooltipRender(wrapper)

    anchor.element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }))
    expect(wrapper.emitted('close')).toBeUndefined()
    await anchor.trigger('click')
    await waitForTooltipRender(wrapper)

    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(wrapper.emitted('close')?.[0]).toEqual(['click'])
  })

  it('waits for the hover open delay before showing the tooltip', async () => {
    vi.useFakeTimers()

    const wrapper = mount(BingTooltip, {
      props: {
        content: 'Delayed hint',
        openDelay: 160,
        closeDelay: 0,
      },
      slots: {
        default: '<button type="button">Hover target</button>',
      },
      attachTo: document.body,
    })

    await wrapper.get('.bing-tooltip').trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()).toBeNull()

    vi.advanceTimersByTime(159)
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()).toBeNull()

    vi.advanceTimersByTime(1)
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()?.textContent).toContain('Delayed hint')
  })

  it('skips the hover open delay when another tooltip is already active', async () => {
    vi.useFakeTimers()

    const wrapper = mount(
      {
        components: { BingTooltip },
        template: `
          <div>
            <BingTooltip content="First panel" :open-delay="160" :close-delay="160">
              <button type="button">First</button>
            </BingTooltip>
            <BingTooltip content="Second panel" :open-delay="160" :close-delay="160">
              <button type="button">Second</button>
            </BingTooltip>
          </div>
        `,
      },
      {
        attachTo: document.body,
      },
    )

    const [first, second] = wrapper.findAll('.bing-tooltip')

    await first.trigger('pointerenter')
    vi.advanceTimersByTime(160)
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()?.textContent).toContain('First panel')

    await first.trigger('pointerleave')
    await second.trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()?.textContent).toContain('Second panel')
  })

  it('reuses one shared panel when moving between tooltip owners', async () => {
    vi.useFakeTimers()

    const wrapper = mount(
      {
        components: { BingTooltip },
        template: `
          <div>
            <BingTooltip content="First panel" :open-delay="0" :close-delay="120">
              <button type="button">First</button>
            </BingTooltip>
            <BingTooltip content="Second panel" :open-delay="0" :close-delay="120">
              <button type="button">Second</button>
            </BingTooltip>
          </div>
        `,
      },
      {
        attachTo: document.body,
      },
    )

    const [first, second] = wrapper.findAll('.bing-tooltip')

    await first.trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    const firstPanel = getBodyTooltip()

    expect(firstPanel?.textContent).toContain('First panel')
    expect(getBodyTooltips()).toHaveLength(1)

    await first.trigger('pointerleave')
    await second.trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    const secondPanel = getBodyTooltip()

    expect(secondPanel).toBe(firstPanel)
    expect(secondPanel?.textContent).toContain('Second panel')
    expect(getBodyTooltips()).toHaveLength(1)

    vi.advanceTimersByTime(130)
    await waitForTooltipRender(wrapper)

    expect(getBodyTooltip()).toBe(firstPanel)
    expect(getBodyTooltip()?.textContent).toContain('Second panel')
    expect(getBodyTooltips()).toHaveLength(1)
  })

  it('does not lock the panel width while moving between tooltip owners', async () => {
    vi.useFakeTimers()

    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function getRect(
      this: HTMLElement,
    ) {
      if (this.classList.contains('bing-tooltip')) {
        return this.textContent?.includes('Second')
          ? rect(160, 420, 96, 36)
          : rect(160, 240, 88, 36)
      }

      if (this.classList.contains('bing-tooltip__content')) {
        return this.textContent?.includes('Second panel')
          ? rect(0, 0, 260, 96)
          : rect(0, 0, 148, 42)
      }

      return rect(0, 0, 0, 0)
    })

    const wrapper = mount(
      {
        components: { BingTooltip },
        template: `
          <div>
            <BingTooltip content="First panel" :open-delay="0" :close-delay="120">
              <button type="button">First</button>
            </BingTooltip>
            <BingTooltip :open-delay="0" :close-delay="120">
              <button type="button">Second</button>
              <template #content>
                <div>
                  <strong>Second panel</strong>
                  <p>More detail makes this tooltip wider and taller.</p>
                </div>
              </template>
            </BingTooltip>
          </div>
        `,
      },
      {
        attachTo: document.body,
      },
    )

    const [first, second] = wrapper.findAll('.bing-tooltip')

    await first.trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    await first.trigger('pointerleave')
    await second.trigger('pointerenter')
    await waitForTooltipRender(wrapper)

    const panel = getBodyTooltip()

    gsap.getTweensOf(panel!).forEach(tween => tween.parent?.totalProgress(1))
    await waitForTooltipRender(wrapper)
    expect(panel?.textContent).toContain('Second panel')
    expect(panel?.style.overflow).toBe('')
    expect(panel?.style.width).toBe('')
    expect(panel?.style.height).toBe('')
  })
})

describe('Tooltip 触发与无障碍', () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    document.body.innerHTML = ''
  })
  function mountHint(props: Partial<BingTooltipProps> = {}, html = '<button>目标</button>') {
    return mount(BingTooltip, { props: { content: '补充说明', openDelay: 0, closeDelay: 0, ...props },
      slots: { default: html }, attachTo: document.body })
  }
  const tooltip = (wrapper: ReturnType<typeof mount>) => wrapper.vm as unknown as BingTooltipExpose

  it('点击后的 focus 和重复进入不闪回，离开后恢复 hover', async () => {
    vi.useFakeTimers()
    const wrapper = mountHint()
    const button = wrapper.get('button')
    vi.spyOn(button.element, 'matches').mockReturnValue(true)
    await wrapper.trigger('pointerenter')
    await button.trigger('pointerdown', { pointerType: 'mouse' })
    await button.trigger('focusin')
    await wrapper.trigger('pointerenter')
    await vi.advanceTimersByTimeAsync(500)
    expect(wrapper.emitted('open')).toHaveLength(1)
    expect(wrapper.emitted('close')).toEqual([['click']])
    await wrapper.trigger('pointerleave')
    await wrapper.trigger('pointerenter')
    expect(wrapper.emitted('open')).toHaveLength(2)
  })

  it('只接受 focus-visible 焦点', async () => {
    const wrapper = mountHint()
    const button = wrapper.get('button')
    const matches = vi.spyOn(button.element, 'matches').mockReturnValue(false)
    await button.trigger('focusin')
    expect(wrapper.emitted('open')).toBeUndefined()
    matches.mockReturnValue(true)
    await button.trigger('focusin')
    expect(wrapper.emitted('open')).toEqual([['focus']])
  })

  it.each([100, 301])('关闭后 %s ms 的悬停遵循共享 300 ms 窗口', async elapsed => {
    vi.useFakeTimers()
    const now = vi.spyOn(performance, 'now').mockReturnValue(1000)
    const first = mountHint({ openDelay: 180 })
    const second = mountHint({ openDelay: 180 })
    await first.trigger('pointerenter')
    await vi.advanceTimersByTimeAsync(180)
    await first.trigger('pointerleave')
    now.mockReturnValue(1000 + elapsed)
    await second.trigger('pointerenter')
    expect(second.emitted('open')?.length ?? 0).toBe(elapsed <= 300 ? 1 : 0)
    await vi.advanceTimersByTimeAsync(180)
    expect(second.emitted('open')).toHaveLength(1)
  })

  it.each([false, true])('共享面板接管会清理旧实例（受控=%s）', async controlled => {
    const first = mountHint({ trigger: 'manual', ...(controlled ? { modelValue: true } : {}) })
    if (!controlled) tooltip(first).show()
    const second = mountHint({ trigger: 'manual' })
    tooltip(second).show()
    await nextTick()
    expect(first.classes()).not.toContain('is-open')
    expect(first.emitted('update:modelValue')?.at(-1)).toEqual([false])
    expect(first.emitted('close')).toEqual([['replaced']])
    expect(second.classes()).toContain('is-open')
    if (controlled) {
      await first.setProps({ modelValue: false })
      await first.setProps({ modelValue: true })
      expect(first.classes()).toContain('is-open')
      expect(second.emitted('close')).toEqual([['replaced']])
    }
  })

  it('点击或手动固定的提示不会被 hover/focus 抢走，显式点击可以替换', async () => {
    const first = mountHint({ trigger: 'click' })
    const second = mountHint({ trigger: ['hover', 'click'] })
    await first.get('button').trigger('click')
    await second.trigger('pointerenter')
    expect(second.emitted('open')).toBeUndefined()
    await second.get('button').trigger('click')
    expect(first.emitted('close')).toEqual([['replaced']])
    expect(second.emitted('open')).toEqual([['click']])
  })

  it('合并实际按钮的描述，关闭与卸载只移除自己的 id', async () => {
    const wrapper = mountHint({ id: 'hint-a' }, '<button aria-describedby="help validation">目标</button>')
    await wrapper.trigger('pointerenter')
    const element = wrapper.get('button').element
    expect(element.getAttribute('aria-describedby')).toBe('help validation hint-a')
    tooltip(wrapper).hide()
    await nextTick()
    expect(element.getAttribute('aria-describedby')).toBe('help validation')
    tooltip(wrapper).show()
    await nextTick()
    wrapper.unmount()
    expect(element.getAttribute('aria-describedby')).toBe('help validation')
  })

  it('提示与按钮可访问名称相同时不重复朗读', async () => {
    const wrapper = mountHint({ content: '保存文档' }, '<button aria-label="保存文档">图标</button>')
    await wrapper.trigger('pointerenter')
    expect(wrapper.get('button').attributes('aria-describedby')).toBeUndefined()
    expect(getBodyTooltip()?.textContent).toBe('保存文档')
  })

  it('不删除业务原先拥有的同名描述 token，更新事件先于 open / close', async () => {
    const events: string[] = []
    const wrapper = mount(BingTooltip, { props: { id: 'existing-hint', content: '说明', trigger: 'manual',
      'onUpdate:modelValue': value => events.push(`model:${value}`),
      onOpen: () => events.push('open'), onClose: () => events.push('close') },
      slots: { default: '<button aria-describedby="existing-hint extra">目标</button>' }, attachTo: document.body })
    tooltip(wrapper).show()
    await nextTick()
    tooltip(wrapper).hide()
    await nextTick()
    expect(events).toEqual(['model:true', 'open', 'model:false', 'close'])
    expect(wrapper.get('button').attributes('aria-describedby')).toBe('existing-hint extra')
  })

  it('triggerProps 明确指定目标时不会关联到第一个按钮', async () => {
    const wrapper = mount(BingTooltip, { props: { content: '操作说明', trigger: 'manual' },
      slots: { default: ({ triggerProps }) => [h('button', '第一个'), h('button', { ...triggerProps, id: 'actual-trigger' }, '第二个')] },
      attachTo: document.body })
    tooltip(wrapper).show()
    await waitForTooltipRender(wrapper)
    expect(wrapper.get('#actual-trigger').attributes('aria-describedby')).toBe(getBodyTooltip()?.id)
    expect(wrapper.get('button').attributes('aria-describedby')).toBeUndefined()
    expect(wrapper.get('#actual-trigger').attributes('aria-expanded')).toBe('true')
  })

  it('替换触发器后清理旧目标，关联到新目标', async () => {
    const wrapper = mountHint()
    await wrapper.trigger('pointerenter')
    const previous = wrapper.get('button').element
    const next = document.createElement('button')
    next.textContent = '新目标'
    previous.replaceWith(next)
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(previous.hasAttribute('aria-describedby')).toBe(false)
    expect(next.getAttribute('aria-describedby')).toBe(getBodyTooltip()?.id)
  })

  it('菜单展开自动关闭并阻止再开；不会把自己的 expanded 当成菜单状态', async () => {
    const wrapper = mountHint({}, '<button aria-expanded="false">菜单</button>')
    await wrapper.trigger('pointerenter')
    wrapper.get('button').element.setAttribute('aria-expanded', 'true')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(wrapper.emitted('close')).toEqual([['manual']])
    await wrapper.trigger('pointerenter')
    expect(wrapper.emitted('open')).toHaveLength(1)
    await wrapper.setProps({ suppressWhenExpanded: false })
    await wrapper.trigger('pointerenter')
    expect(wrapper.emitted('open')).toHaveLength(2)
    const click = mountHint({ trigger: 'click' })
    await click.get('button').trigger('click')
    await new Promise(resolve => setTimeout(resolve, 0))
    expect(click.classes()).toContain('is-open')
  })

  it('快捷键渲染独立键帽并关联到触发器', async () => {
    const wrapper = mountHint({ shortcut: 'Ctrl+Shift+C', tone: 'inverse' })
    await wrapper.trigger('pointerenter')
    expect(wrapper.get('button').attributes('aria-keyshortcuts')).toBe('Control+Shift+C')
    expect([...getBodyTooltip()!.querySelectorAll('kbd')].map(el => el.textContent)).toEqual(['Ctrl', 'Shift', 'C'])
    expect(getBodyTooltip()?.classList.contains('is-tone-inverse')).toBe(true)
  })

  it('触摸不触发 hover；长按 500 ms 打开，松开 1500 ms 后关闭', async () => {
    vi.useFakeTimers()
    const wrapper = mountHint()
    await wrapper.trigger('pointerenter', { pointerType: 'touch' })
    expect(wrapper.emitted('open')).toBeUndefined()
    await wrapper.trigger('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 10, clientY: 10 })
    await vi.advanceTimersByTimeAsync(499)
    expect(wrapper.emitted('open')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.emitted('open')).toEqual([['hover']])
    window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1 }))
    await vi.advanceTimersByTimeAsync(1499)
    expect(wrapper.emitted('close')).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(wrapper.emitted('close')).toEqual([['hover']])
  })

  it.each(['move', 'cancel', 'disable', 'unmount'])('触摸等待被 %s 取消后不打开', async action => {
    vi.useFakeTimers()
    const wrapper = mountHint()
    await wrapper.trigger('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 10, clientY: 10 })
    if (action === 'move') window.dispatchEvent(new PointerEvent('pointermove', { pointerId: 1, clientX: 19, clientY: 10 }))
    if (action === 'cancel') window.dispatchEvent(new PointerEvent('pointercancel', { pointerId: 1 }))
    if (action === 'disable') await wrapper.setProps({ disabled: true })
    if (action === 'unmount') wrapper.unmount()
    await vi.advanceTimersByTimeAsync(600)
    expect(wrapper.emitted('open')).toBeUndefined()
  })
})
