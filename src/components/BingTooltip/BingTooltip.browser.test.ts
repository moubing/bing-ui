import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import { gsap } from 'gsap'
import BingConfigProvider from '../BingConfigProvider/BingConfigProvider.vue'
import BingTooltip from './BingTooltip.vue'
import BingDropDown from '../BingDropDown/BingDropDown.vue'
import BingDropDownItem from '../BingDropDown/BingDropDownItem.vue'
import type { BingTooltipExpose, BingTooltipPlacement } from './BingTooltip.types'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

afterEach(async () => {
  app?.unmount()
  host?.remove()
  gsap.ticker.wake()
  await page.viewport(1280, 900)
})

describe('Tooltip 交互与分段动效', () => {
  async function mountDemo(render: () => ReturnType<typeof h> | ReturnType<typeof h>[], style = 'position:fixed;left:300px;top:220px;display:flex;gap:24px') {
    host = document.createElement('div')
    host.style.cssText = style
    document.body.append(host)
    app = createApp({ render })
    app.mount(host)
    await nextTick()
  }
  const panel = () => document.querySelector<HTMLElement>('.bing-tooltip__content')!
  const finish = (element = panel()) => gsap.getTweensOf(element).forEach(tween => tween.parent?.totalProgress(1))
  const flush = async () => { await nextTick(); await nextTick(); await nextTick() }

  it('点击 hover 触发器后逐帧只退出，不因浏览器焦点再次入场', async () => {
    await mountDemo(() => h(BingTooltip, { content: '编辑说明', openDelay: 0, closeDelay: 0 }, () => h('button', '编辑')))
    const button = page.getByRole('button', { name: '编辑', exact: true })
    await button.hover()
    await wait(220)
    await button.click()
    const samples: number[] = []
    const deadline = performance.now() + 360
    while (performance.now() < deadline) {
      await new Promise(requestAnimationFrame)
      samples.push(panel() ? Number(getComputedStyle(panel()).opacity) : 0)
    }
    expect(samples.every((opacity, index) => index === 0 || opacity <= samples[index - 1]! + 0.02)).toBe(true)
    expect(panel()).toBeNull()
    expect(host!.querySelector('button')!.hasAttribute('aria-describedby')).toBe(false)
  })

  it('鼠标焦点不打开，Tab 键盘焦点打开并关联到真实按钮', async () => {
    await mountDemo(() => [h('button', '前一个'), h(BingTooltip, { content: '键盘补充说明', openDelay: 0 }, () => h('button', '目标'))])
    await page.getByRole('button', { name: '目标', exact: true }).click()
    await wait(220)
    expect(panel()).toBeNull()
    await page.getByRole('button', { name: '前一个' }).click()
    await page.getByRole('button', { name: '前一个' }).unhover()
    // 原生键盘行为通过 Playwright 发送，验证浏览器的 :focus-visible。
    await userEvent.keyboard('{Tab}')
    await wait(220)
    expect(panel()?.textContent).toBe('键盘补充说明')
    expect(host!.querySelectorAll('button')[1]!.getAttribute('aria-describedby')).toBe(panel().id)
  })

  it('触摸等待、移动阈值、松手自动关闭及新的指针按下', async () => {
    await mountDemo(() => h(BingTooltip, { content: '长按说明', openDelay: 0 }, () => h('button', '长按')))
    const button = host!.querySelector('button')!
    const send = (type: string, x = 10) => button.dispatchEvent(new PointerEvent(type,
      { bubbles: true, pointerType: 'touch', pointerId: 7, clientX: x, clientY: 10 }))
    send('pointerenter')
    send('pointerdown')
    await wait(300)
    expect(panel()).toBeNull()
    send('pointermove', 19)
    await wait(250)
    expect(panel()).toBeNull()
    send('pointerdown')
    await wait(550)
    expect(panel()?.textContent).toBe('长按说明')
    const context = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    button.dispatchEvent(context)
    expect(context.defaultPrevented).toBe(true)
    send('pointerup')
    await wait(1350)
    expect(panel()).not.toBeNull()
    await wait(350)
    expect(panel()).toBeNull()
    send('pointerdown')
    await wait(550)
    send('pointerup')
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', pointerId: 8 }))
    await wait(160)
    expect(panel()).toBeNull()
  })

  it.each(['near', 'far', 'side'] as const)('%s 切换只让近距离同方向面板平移', async kind => {
    const first = ref<BingTooltipExpose | null>(null)
    const second = ref<BingTooltipExpose | null>(null)
    await mountDemo(() => [
      h(BingTooltip, { ref: first, trigger: 'manual', content: '原提示', placement: 'top' }, () => h('button', '第一个')),
      h(BingTooltip, { ref: second, trigger: 'manual', content: '新的说明内容', placement: kind === 'side' ? 'bottom' : 'top' }, () => h('button', '第二个')),
    ], `position:fixed;left:200px;top:220px;display:flex;gap:${kind === 'far' ? 400 : 24}px`)
    first.value!.show()
    await wait(220)
    const shared = panel()
    const previous = shared.getBoundingClientRect()
    second.value!.show()
    await flush()
    gsap.ticker.sleep()
    expect(panel()).toBe(shared)
    if (kind === 'near') {
      expect(shared.textContent).toBe('新的说明内容')
      expect(Number(gsap.getProperty(shared, 'x'))).not.toBe(0)
      const body = shared.querySelector<HTMLElement>('.bing-tooltip__body')!
      expect(getComputedStyle(body).opacity).toBe('0')
      expect(getComputedStyle(body).transform).toBe('none')
      finish(shared)
    } else {
      expect(shared.textContent).toBe('原提示')
      expect(shared.getBoundingClientRect().left).toBe(previous.left)
      const fadeOut = gsap.getTweensOf(shared)[0]!
      expect(fadeOut.duration()).toBe(0.08)
      fadeOut.parent!.totalProgress(0.5)
      expect(shared.getBoundingClientRect().left).toBe(previous.left)
      finish(shared)
      await flush()
      expect(shared.textContent).toBe('新的说明内容')
      expect(getComputedStyle(shared).opacity).toBe('0')
      expect(Number(gsap.getProperty(shared, 'x'))).toBe(0)
      finish(shared)
    }
    expect(getComputedStyle(shared).opacity).toBe('1')
    expect(document.querySelectorAll('.bing-tooltip__content')).toHaveLength(1)
  })

  it('文案变化只缩放表面，文字保持原字号且最终恢复清晰终态', async () => {
    const text = ref('复制')
    const tip = ref<BingTooltipExpose | null>(null)
    await mountDemo(() => h(BingTooltip, { ref: tip, trigger: 'manual', content: text.value }, () => h('button', '复制入口')))
    tip.value!.show()
    await wait(220)
    const shared = panel()
    text.value = '已复制，可以分享给其他人'
    await flush()
    gsap.ticker.sleep()
    expect(Number(gsap.getProperty(shared.querySelector('.bing-tooltip__surface')!, 'scaleX'))).toBeLessThan(1)
    expect(getComputedStyle(shared.querySelector('.bing-tooltip__body')!).transform).toBe('none')
    finish(shared)
    expect(getComputedStyle(shared.querySelector('.bing-tooltip__body')!).opacity).toBe('1')
    expect(shared.style.width).toBe('')
    expect(shared.style.height).toBe('')
    expect(shared.querySelector<HTMLElement>('.bing-tooltip__surface')!.style.transform).toBe('')
  })

  it('长内容根据触发方向压缩滚动区，四周不遮住触发器', async () => {
    await page.viewport(390, 700)
    await mountDemo(() => h(BingTooltip, { trigger: 'click', content: '较长的降级说明。'.repeat(250), maxWidth: 280 }, () => h('button', '长内容')),
      'position:fixed;left:150px;top:320px')
    await page.getByRole('button', { name: '长内容', exact: true }).click()
    await wait(250)
    const bounds = panel().getBoundingClientRect()
    const anchor = host!.getBoundingClientRect()
    expect(bounds.bottom <= anchor.top - 10 || bounds.top >= anchor.bottom + 10
      || bounds.right <= anchor.left - 10 || bounds.left >= anchor.right + 10).toBe(true)
    expect(bounds.top).toBeGreaterThanOrEqual(12)
    expect(bounds.bottom).toBeLessThanOrEqual(688)
    expect(panel().querySelector('.bing-scrollbar')).not.toBeNull()
  })

  it('真实 DropDown 展开抑制提示，嵌套提示的面板点击按浮层归属处理', async () => {
    let actionClicks = 0
    await mountDemo(() => h(BingDropDown, {}, {
      trigger: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => h(BingTooltip, { content: '菜单说明', openDelay: 0 },
        () => h('button', { ...triggerProps }, '菜单入口')),
      default: () => [h(BingDropDownItem, { title: '普通项' }), h(BingTooltip, { trigger: 'click', content: '内部说明' }, {
        default: () => h('button', '内部提示'), content: () => h('button', { onClick: () => actionClicks++ }, '提示动作'),
      })],
    }))
    await page.getByRole('button', { name: '菜单入口' }).hover()
    await wait(200)
    expect(panel()?.textContent).toBe('菜单说明')
    await page.getByRole('button', { name: '菜单入口' }).click()
    await wait(200)
    expect(panel()).toBeNull()
    expect(host!.querySelector('button')!.getAttribute('aria-expanded')).toBe('true')
    await page.getByRole('button', { name: '内部提示' }).click()
    await wait(220)
    await page.getByRole('button', { name: '提示动作' }).click()
    expect(actionClicks).toBe(1)
    expect(document.querySelector('[role="menu"]')).not.toBeNull()
    expect(panel()?.textContent).toBe('提示动作')
  })

  it('非宿主实例的 updatePosition 仍更新共享面板', async () => {
    const target = ref<BingTooltipExpose | null>(null)
    await mountDemo(() => [h(BingTooltip, { content: '宿主', trigger: 'manual' }, () => h('button', '宿主')),
      h(BingTooltip, { ref: target, content: '跟随目标', trigger: 'manual' }, () => h('button', '目标'))])
    target.value!.show()
    await wait(220)
    const previous = panel().getBoundingClientRect().left
    host!.style.left = '400px'
    target.value!.updatePosition()
    await new Promise(requestAnimationFrame)
    await flush()
    expect(panel().getBoundingClientRect().left - previous).toBe(100)
  })
})

describe('Tooltip 的局部动效配置', () => {
  async function mountOwners(hostMode: 'always' | 'never', targetMode: 'always' | 'never') {
    const owners = {
      host: ref<BingTooltipExpose | null>(null),
      target: ref<BingTooltipExpose | null>(null),
    }
    let active: keyof typeof owners | null = null
    host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:200px;top:200px;display:flex;gap:30px;'
    document.body.append(host)
    app = createApp({ render: () => [
      h(BingConfigProvider, { reducedMotion: hostMode }, () =>
        h(BingTooltip, { ref: owners.host, content: '宿主提示', trigger: 'manual' }, () => h('button', '宿主'))),
      h(BingConfigProvider, { reducedMotion: targetMode }, () =>
        h(BingTooltip, { ref: owners.target, content: '目标提示', trigger: 'manual' }, () => h('button', '目标'))),
    ] })
    app.mount(host)
    await nextTick()

    return async (owner: keyof typeof owners | null) => {
      if (owner) owners[owner].value?.show()
      else if (active) owners[active].value?.hide()
      active = owner
      await nextTick()
      await nextTick()
      // 在当前任务内检查动画起点，手动完成时间线以避开逐帧采样的时序波动。
      gsap.ticker.sleep()
    }
  }

  function getPanel() {
    return document.querySelector<HTMLElement>('.bing-tooltip__content')
  }

  function finishAnimation(panel: HTMLElement) {
    gsap.getTweensOf(panel).forEach(tween => tween.parent?.totalProgress(1))
  }

  function expectMotion(panel: HTMLElement, reduced: boolean) {
    expect(gsap.getTweensOf(panel).length > 0).toBe(!reduced)
    if (reduced) {
      expect(getComputedStyle(panel).opacity).toBe('1')
      expect(Number(gsap.getProperty(panel, 'x'))).toBe(0)
      expect(Number(gsap.getProperty(panel, 'y'))).toBe(0)
    }
  }

  it.each(['always', 'never'] as const)('打开和关闭时遵循目标的 %s 配置', async (targetMode) => {
    const setActive = await mountOwners(targetMode === 'always' ? 'never' : 'always', targetMode)
    await setActive('target')
    const panel = getPanel()!
    expect(panel.textContent).toBe('目标提示')
    expectMotion(panel, targetMode === 'always')
    finishAnimation(panel)

    await setActive(null)
    if (targetMode === 'always') {
      expect(getPanel()).toBeNull()
    } else {
      expect(getPanel()).toBe(panel)
      expect(gsap.getTweensOf(panel).length).toBeGreaterThan(0)
      finishAnimation(panel)
      await nextTick()
      expect(getPanel()).toBeNull()
    }
  })

  it.each(['always', 'never'] as const)('复用面板切换到 %s 目标时使用新目标的配置', async (targetMode) => {
    const hostMode = targetMode === 'always' ? 'never' : 'always'
    const setActive = await mountOwners(hostMode, targetMode)
    await setActive('host')
    const panel = getPanel()!
    finishAnimation(panel)

    await setActive('target')
    expect(getPanel()).toBe(panel)
    expect(panel.textContent).toBe('目标提示')
    expectMotion(panel, targetMode === 'always')
    finishAnimation(panel)

    await setActive('host')
    expect(getPanel()).toBe(panel)
    expect(panel.textContent).toBe('宿主提示')
    expectMotion(panel, hostMode === 'always')
  })
})

describe('Tooltip 的窄屏与共享面板', () => {
  it('两字提示只占一行和对称内边距，不额外预留隐藏轨道的空间', async () => {
    host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:200px;top:100px;'
    document.body.append(host)
    app = createApp({
      render: () => h(BingTooltip, { content: '斜体', placement: 'bottom', trigger: 'click' }, () => h('button', '斜体')),
    })
    app.mount(host)
    await page.getByRole('button', { name: '斜体', exact: true }).click()
    await wait(350)
    const panel = document.querySelector<HTMLElement>('.bing-tooltip__content')!
    const content = panel.querySelector<HTMLElement>('.bing-tooltip__body-content')!
    const range = document.createRange()
    range.selectNodeContents(content)
    const text = range.getBoundingClientRect()
    const bounds = panel.getBoundingClientRect()

    expect(bounds.height).toBe(32)
    expect(Math.abs(bounds.width - text.width - 18)).toBeLessThan(1)
    expect(Math.abs((text.left - bounds.left) - (bounds.right - text.right))).toBeLessThan(1)
    expect(panel.querySelector('.bing-scrollbar')).toBeNull()
  })

  it('单行宽内容仍能横向滚动，轨道不覆盖文字所在行', async () => {
    host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:100px;top:100px;'
    document.body.append(host)
    app = createApp({
      render: () => h(BingTooltip, { maxWidth: 180, placement: 'bottom', trigger: 'click' }, {
        default: () => h('button', '宽内容'),
        content: () => h('div', { class: 'wide-tooltip-line', style: 'white-space:nowrap' }, 'Tooltip content '.repeat(20)),
      }),
    })
    app.mount(host)
    await page.getByRole('button', { name: '宽内容', exact: true }).click()
    const panel = document.querySelector<HTMLElement>('.bing-tooltip__content')!
    const scrollbar = panel.querySelector('.bing-scrollbar')!
    const viewport = scrollbar.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    await expect.poll(() => scrollbar.classList.contains('has-horizontal-overflow')).toBe(true)
    await wait(350)
    const line = panel.querySelector<HTMLElement>('.wide-tooltip-line')!.getBoundingClientRect()
    const rail = panel.querySelector<HTMLElement>('.bing-scrollbar__rail--horizontal')!.getBoundingClientRect()
    expect(rail.top).toBeGreaterThanOrEqual(line.bottom)
    expect(panel.getBoundingClientRect().height).toBe(32)
    viewport.scrollLeft = viewport.scrollWidth
    expect(viewport.scrollLeft).toBeGreaterThan(0)
  })

  it.each<BingTooltipPlacement>(['top', 'right', 'bottom', 'left'])('在 %s 方向显示指向目标的箭头', async (placement) => {
    await page.viewport(1280, 900)
    host = document.createElement('div')
    host.style.cssText = 'position:fixed;left:500px;top:400px;'
    document.body.append(host)
    app = createApp({
      render: () => h(BingTooltip, { content: '带箭头的提示', placement, trigger: 'click' }, () => h('button', '提示目标')),
    })
    app.mount(host)
    await page.getByRole('button', { name: '提示目标' }).click()
    await wait(350)
    const panel = document.querySelector<HTMLElement>('.bing-tooltip__content')!
    const arrow = panel.querySelector<HTMLElement>('.bing-tooltip__arrow')!
    const panelRect = panel.getBoundingClientRect()
    const anchorRect = host.querySelector('button')!.getBoundingClientRect()
    const arrowRect = arrow.getBoundingClientRect()
    expect(panel.classList.contains(`is-placement-${placement}`)).toBe(true)
    expect(arrow.getAttribute('aria-hidden')).toBe('true')
    expect(getComputedStyle(arrow).backgroundColor).toBe(getComputedStyle(panel.querySelector('.bing-tooltip__surface')!).backgroundColor)

    if (placement === 'top' || placement === 'bottom') {
      expect(Math.abs(arrowRect.left + arrowRect.width / 2 - (anchorRect.left + anchorRect.width / 2))).toBeLessThanOrEqual(1)
      if (placement === 'top') {
        expect(arrowRect.bottom).toBeGreaterThan(panelRect.bottom)
        expect(arrowRect.bottom).toBeLessThan(anchorRect.top)
      } else {
        expect(arrowRect.top).toBeLessThan(panelRect.top)
        expect(arrowRect.top).toBeGreaterThan(anchorRect.bottom)
      }
    } else {
      expect(Math.abs(arrowRect.top + arrowRect.height / 2 - (anchorRect.top + anchorRect.height / 2))).toBeLessThanOrEqual(1)
      if (placement === 'left') {
        expect(arrowRect.right).toBeGreaterThan(panelRect.right)
        expect(arrowRect.right).toBeLessThan(anchorRect.left)
      } else {
        expect(arrowRect.left).toBeLessThan(panelRect.left)
        expect(arrowRect.left).toBeGreaterThan(anchorRect.right)
      }
    }
  })

  it('靠近视口角落时翻转方向，并将箭头限制在圆角内侧', async () => {
    await page.viewport(320, 740)
    host = document.createElement('div')
    host.style.cssText = 'position:fixed;right:0;top:0;'
    document.body.append(host)
    app = createApp({
      render: () => h(BingTooltip, { content: '靠近窗口边缘时，箭头跟随实际方向并避开面板圆角。', trigger: 'click' }, () => h('button', '边')),
    })
    app.mount(host)
    await page.getByRole('button', { name: '边', exact: true }).click()
    await wait(350)
    const panel = document.querySelector<HTMLElement>('.bing-tooltip__content')!
    const bounds = panel.getBoundingClientRect()
    const arrow = panel.querySelector<HTMLElement>('.bing-tooltip__arrow')!.getBoundingClientRect()
    expect(panel.classList.contains('is-placement-bottom')).toBe(true)
    expect(bounds.left).toBeGreaterThanOrEqual(12)
    expect(bounds.right).toBeLessThanOrEqual(308)
    expect(arrow.top).toBeLessThan(bounds.top)
    expect(arrow.right).toBeLessThanOrEqual(bounds.right - 6)
    expect(arrow.left).toBeGreaterThan(bounds.left + bounds.width / 2)
  })

  it('约束长文本与内容宽度，并在切换触发器时继续复用面板', async () => {
    await page.viewport(320, 740)
    host = document.createElement('div')
    host.style.cssText = 'display:flex;gap:16px;margin:200px 20px;width:260px;'
    document.body.append(host)
    app = createApp({
      render: () => [
        h(BingTooltip, { content: 'LongTextWithoutAnyBreak'.repeat(30), maxWidth: 500, trigger: 'click' }, () => h('button', '长提示')),
        h(BingTooltip, { content: '简短提示', trigger: 'click' }, () => h('button', '短提示')),
      ],
    })
    app.mount(host)
    await page.getByRole('button', { name: '长提示' }).click()
    await wait(500)
    const panel = document.querySelector<HTMLElement>('.bing-tooltip__content')!
    const body = panel.querySelector<HTMLElement>('.bing-tooltip__body')!
    const arrow = panel.querySelector<HTMLElement>('.bing-tooltip__arrow')!
    const bounds = panel.getBoundingClientRect()
    expect(bounds.left).toBeGreaterThanOrEqual(12)
    expect(bounds.right).toBeLessThanOrEqual(308)
    expect(body.getBoundingClientRect().right).toBeLessThan(bounds.right)
    expect(body.scrollWidth).toBe(body.clientWidth)
    const anchor = host.querySelector('button')!.getBoundingClientRect()
    const arrowBounds = arrow.getBoundingClientRect()
    expect(Math.abs(arrowBounds.left + arrowBounds.width / 2 - (anchor.left + anchor.width / 2))).toBeLessThanOrEqual(1)

    await page.getByRole('button', { name: '短提示' }).click()
    await wait(500)
    expect(document.querySelector('.bing-tooltip__content')).toBe(panel)
    expect(panel.querySelector('.bing-tooltip__arrow')).toBe(arrow)
    expect(panel.textContent).toBe('简短提示')
    expect(panel.getBoundingClientRect().width).toBeLessThan(120)
    expect(document.querySelectorAll('.bing-tooltip__content')).toHaveLength(1)
    const shortAnchor = host.querySelectorAll('button')[1]!.getBoundingClientRect()
    const shortArrowBounds = arrow.getBoundingClientRect()
    expect(Math.abs(shortArrowBounds.left + shortArrowBounds.width / 2 - (shortAnchor.left + shortAnchor.width / 2))).toBeLessThanOrEqual(1)
  })

  it('长内容通过组件轨道滚动，切换为短提示后隐藏轨道且箭头保留', async () => {
    await page.viewport(360, 400)
    host = document.createElement('div')
    host.style.cssText = 'display:flex;flex-direction:column;align-items:flex-start;gap:16px;margin:20px;'
    document.body.append(host)
    app = createApp({ render: () => [
      h(BingTooltip, { content: '说明内容。'.repeat(300), trigger: 'click', maxWidth: 220 }, () => h('button', '完整说明')),
      h(BingTooltip, { content: '简短说明', trigger: 'click' }, () => h('button', '简短说明')),
    ] })
    app.mount(host)
    await page.getByRole('button', { name: '完整说明' }).click()
    const panel = document.querySelector<HTMLElement>('.bing-tooltip__content')!
    const scrollbar = panel.querySelector('.bing-scrollbar')!
    const viewport = scrollbar.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
    await expect.poll(() => scrollbar.classList.contains('has-vertical-overflow')).toBe(true)
    expect(getComputedStyle(viewport).scrollbarWidth).toBe('none')
    viewport.scrollTop = viewport.scrollHeight
    await expect.poll(() => viewport.scrollTop).toBeGreaterThan(0)
    await wait(300)
    expect(panel.querySelector('.bing-tooltip__arrow')).not.toBeNull()
    expect(panel.getBoundingClientRect().bottom).toBeLessThanOrEqual(388)
    await page.getByRole('button', { name: '简短说明' }).click()
    await expect.poll(() => panel.querySelector('.bing-scrollbar')).toBeNull()
    await expect.poll(() => panel.getBoundingClientRect().height).toBe(32)
  })
})
