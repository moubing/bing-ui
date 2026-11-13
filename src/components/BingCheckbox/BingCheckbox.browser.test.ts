import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingCheckboxGroup from '../BingCheckboxGroup/BingCheckboxGroup.vue'
import type { BingCheckboxGroupValue } from '../BingCheckboxGroup/BingCheckboxGroup.types'
import BingDialog from '../BingDialog/BingDialog.vue'
import BingCheckbox from './BingCheckbox.vue'
import BingConfigProvider from '../BingConfigProvider/BingConfigProvider.vue'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
})

async function settleLayout() {
  await nextTick()
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
  })
}

async function mountScrollableDialog(height: number, smoothScroll = true) {
  await page.viewport(1280, height)
  const selected = ref<BingCheckboxGroupValue[]>([])
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () => h(BingDialog, {
      modelValue: true,
      title: '新增用户',
      width: 610,
      overlayBlur: false,
      showPeek: false,
      smoothScroll,
    }, () => [
      h('div', { style: 'height: 720px;' }, '用户信息表单占位'),
      h('div', { style: 'display: grid; gap: 16px;' }, [
        h('button', { type: 'button', 'data-testid': 'before-roles' }, '配置项目角色'),
        h(BingCheckboxGroup, {
          modelValue: selected.value,
          'onUpdate:modelValue': (value: BingCheckboxGroupValue[]) => { selected.value = value },
          ariaLabel: '项目角色',
          style: 'max-width: 360px;',
          options: ['UI 设计', '开发', '运维', '产品经理', '项目管理员', '测试'].map((label) => ({
            label,
            value: label,
          })),
        }),
        h('p', { 'data-testid': 'role-hint' }, '为用户分配参与项目时可用的角色。'),
      ]),
    ]),
  })
  app.mount(host)
  await settleLayout()

  const dialog = document.querySelector<HTMLElement>('.bing-dialog')!
  await expect.poll(() => dialog.closest('.bing-dialog-root')!.classList.contains('is-active')).toBe(true)
  const outer = dialog.querySelector<HTMLElement>('.bing-dialog__body-scroll')!
  const viewport = outer.querySelector<HTMLElement>('.bing-scrollbar__viewport')!
  const footer = dialog.querySelector<HTMLElement>('.bing-dialog__footer')!
  const hint = dialog.querySelector<HTMLElement>('[data-testid="role-hint"]')!
  const beforeRoles = dialog.querySelector<HTMLButtonElement>('[data-testid="before-roles"]')!
  const inputs = Array.from(dialog.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'))
  const body = dialog.querySelector<HTMLElement>('.bing-dialog__body')!
  const bodyBottomPadding = parseFloat(getComputedStyle(body).paddingBottom)

  expect(inputs).toHaveLength(6)
  expect(viewport.scrollHeight - viewport.clientHeight).toBeGreaterThan(100)

  const readLayout = () => ({
    outerScrollTop: outer.scrollTop,
    innerScrollTop: viewport.scrollTop,
    footerTop: footer.getBoundingClientRect().top,
    footerGap: footer.getBoundingClientRect().top - hint.getBoundingClientRect().bottom,
    dialogHeight: dialog.getBoundingClientRect().height,
  })

  return { selected, outer, viewport, beforeRoles, inputs, bodyBottomPadding, readLayout }
}

type DialogFixture = Awaited<ReturnType<typeof mountScrollableDialog>>

type CheckboxState = 'none' | 'checked' | 'mixed'
async function mountCheckboxState(initial: CheckboxState = 'none') {
  const state = ref<CheckboxState>(initial)
  const reduced = ref<'always' | 'never'>('never')
  host = document.createElement('div')
  host.style.padding = '40px'
  document.body.appendChild(host)
  app = createApp({ render: () => h(BingConfigProvider, { reducedMotion: reduced.value }, () => h(BingCheckbox, {
    modelValue: state.value === 'checked', indeterminate: state.value === 'mixed', decorative: true,
  })) })
  app.mount(host)
  await settleLayout()
  const root = host.querySelector<HTMLElement>('.bing-checkbox')!
  const fill = root.querySelector<HTMLElement>('.bing-checkbox__fill')!
  const check = root.querySelector<SVGPathElement>('.bing-checkbox__check')!
  const mixed = root.querySelector<SVGPathElement>('.bing-checkbox__mixed')!
  return { state, reduced, root, fill, check, mixed }
}

describe('BingCheckbox motion and hit target', () => {
  it('keeps label text stationary while the control signals a new validation error', async () => {
    const status = ref<'default' | 'error'>('default')
    host = document.createElement('div')
    host.style.padding = '40px'
    document.body.appendChild(host)
    app = createApp({ render: () => h(BingCheckbox, { status: status.value, label: '同意数据使用范围' }) })
    app.mount(host)
    await settleLayout()
    const control = host.querySelector<HTMLElement>('.bing-checkbox__control')!
    const label = host.querySelector<HTMLElement>('.bing-checkbox__label')!
    const before = { control: control.getBoundingClientRect().left, label: label.getBoundingClientRect().left }
    status.value = 'error'
    await expect.poll(() => Math.abs(control.getBoundingClientRect().left - before.control), { interval: 10 }).toBeGreaterThan(0.1)
    expect(label.getBoundingClientRect().left).toBe(before.label)
    await expect.poll(() => host!.querySelector('.is-animating')).toBeNull()
    expect(control.getBoundingClientRect().left).toBe(before.control)
  })
  it('updates batch state immediately while limiting visible cascade animations', async () => {
    const selected = ref(false)
    host = document.createElement('div')
    host.style.cssText = 'display: grid; grid-template-columns: repeat(10, 24px); gap: 4px; padding: 20px;'
    document.body.appendChild(host)
    app = createApp({ render: () => Array.from({ length: 66 }, (_, index) => h(BingCheckbox, {
      modelValue: selected.value, decorative: true,
      style: index === 65 ? 'position: fixed; top: -100px;' : undefined,
    })) })
    app.mount(host)
    selected.value = true
    await nextTick()
    expect(host.querySelectorAll('.is-checked')).toHaveLength(66)
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
    const roots = [...host.querySelectorAll<HTMLElement>('.bing-checkbox')]
    await nextTick()
    expect(roots.filter(root => root.classList.contains('is-animating'))).toHaveLength(60)
    for (const root of roots.slice(60)) expect(getComputedStyle(root.querySelector('.bing-checkbox__fill')!).opacity).toBe('1')
    await new Promise(resolve => setTimeout(resolve, 110))
    const opacity = (index: number) => Number(getComputedStyle(roots[index]!.querySelector('.bing-checkbox__fill')!).opacity)
    expect(opacity(0)).toBeGreaterThan(opacity(15))
    await expect.poll(() => host!.querySelectorAll('.is-animating').length).toBe(0)
  })
  it.each<[CheckboxState, CheckboxState]>([
    ['none', 'checked'], ['checked', 'none'], ['none', 'mixed'],
    ['mixed', 'checked'], ['checked', 'mixed'], ['mixed', 'none'],
  ])('settles %s → %s to CSS state without inline animation residue', async (from, to) => {
    const fixture = await mountCheckboxState(from)
    fixture.state.value = to
    await nextTick()
    await expect.poll(() => fixture.root.classList.contains('is-animating')).toBe(false)
    expect(getComputedStyle(fixture.fill).opacity).toBe(to === 'none' ? '0' : '1')
    expect(getComputedStyle(fixture.check).opacity).toBe(to === 'checked' ? '1' : '0')
    expect(getComputedStyle(fixture.mixed).opacity).toBe(to === 'mixed' ? '1' : '0')
    expect(getComputedStyle(fixture.check).strokeDashoffset).toBe('0px')
    for (const element of [fixture.fill, fixture.check, fixture.mixed]) expect(element.style.cssText).toBe('')
    expect(fixture.mixed.getAttribute('transform')).toBeNull()
  })

  it('reverses from the rendered fill rather than restarting on rapid changes', async () => {
    const fixture = await mountCheckboxState()
    for (const state of ['checked', 'none', 'mixed', 'checked', 'none', 'checked'] as const) {
      const before = Number(getComputedStyle(fixture.fill).opacity)
      fixture.state.value = state
      await nextTick()
      expect(Math.abs(Number(getComputedStyle(fixture.fill).opacity) - before)).toBeLessThan(0.02)
      await new Promise(resolve => setTimeout(resolve, 45))
    }
    await expect.poll(() => fixture.fill.style.cssText).toBe('')
    expect(getComputedStyle(fixture.fill).opacity).toBe('1')
    expect(getComputedStyle(fixture.check).opacity).toBe('1')
  })

  it('settles queued or running motion when reduced motion is enabled', async () => {
    const fixture = await mountCheckboxState()
    fixture.state.value = 'mixed'
    await settleLayout()
    fixture.reduced.value = 'always'
    await nextTick()
    expect(fixture.root.classList.contains('is-animating')).toBe(false)
    expect(fixture.fill.style.cssText).toBe('')
    expect(fixture.mixed.style.cssText).toBe('')
    expect(getComputedStyle(fixture.mixed).opacity).toBe('1')
    fixture.state.value = 'checked'
    await nextTick()
    expect(fixture.root.classList.contains('is-animating')).toBe(false)
    expect(getComputedStyle(fixture.check).opacity).toBe('1')
  })

  it('accepts clicks 6px outside a bare checkbox without covering its neighbor', async () => {
    const selected = ref(false)
    let neighborClicks = 0
    host = document.createElement('div')
    host.style.cssText = 'display: flex; align-items: center; gap: 16px; padding: 40px;'
    document.body.appendChild(host)
    app = createApp({ render: () => [h(BingCheckbox, {
      modelValue: selected.value, 'onUpdate:modelValue': value => { selected.value = value }, ariaLabel: '选择行',
    }), h('button', { onClick: () => { neighborClicks++ } }, '相邻操作')] })
    app.mount(host)
    await settleLayout()
    const root = host.querySelector<HTMLElement>('.bing-checkbox')!
    const { width, height } = root.getBoundingClientRect()
    await userEvent.click(root, { position: { x: width + 6, y: height / 2 } })
    expect(selected.value).toBe(true)
    await userEvent.click(host.querySelector('button')!)
    expect(neighborClicks).toBe(1)
    expect(selected.value).toBe(true)
    expect(root.getBoundingClientRect().width).toBe(width)
  })
})

async function scrollToRoles(fixture: DialogFixture) {
  fixture.viewport.scrollTop = fixture.viewport.scrollHeight
  await settleLayout()
  const initial = fixture.readLayout()
  expect(initial.outerScrollTop).toBe(0)
  // 内容滚到底部后应保留正文内边距，不绑定某一版视觉样式的固定数值。
  expect(initial.footerGap).toBeGreaterThan(0)
  expect(Math.abs(initial.footerGap - fixture.bodyBottomPadding)).toBeLessThan(1)
  return initial
}

function expectStableLayout(fixture: DialogFixture, initial: ReturnType<DialogFixture['readLayout']>) {
  const current = fixture.readLayout()
  expect(current.outerScrollTop).toBe(0)
  expect(current.innerScrollTop).toBe(initial.innerScrollTop)
  expect(Math.abs(current.footerTop - initial.footerTop)).toBeLessThan(1)
  expect(Math.abs(current.footerGap - initial.footerGap)).toBeLessThan(1)
  expect(Math.abs(current.dialogHeight - initial.dialogHeight)).toBeLessThan(1)
}

describe('BingCheckbox focus inside a scrollable Dialog', () => {
  it.each([930, 800, 640])('keeps the layout stable on native focus at 1280 × %i', async (height) => {
    const fixture = await mountScrollableDialog(height)
    const initial = await scrollToRoles(fixture)

    for (const input of fixture.inputs) {
      input.focus()
      await settleLayout()
      expect(document.activeElement).toBe(input)
      expect(input.checked).toBe(false)
      expectStableLayout(fixture, initial)
    }
    expect(fixture.selected.value).toEqual([])
  })

  it.each([930, 800, 640])('keeps the layout stable on repeated mouse clicks at 1280 × %i', async (height) => {
    const fixture = await mountScrollableDialog(height)
    const initial = await scrollToRoles(fixture)
    const productManager = fixture.inputs[3]

    for (let index = 0; index < 4; index += 1) {
      await userEvent.click(productManager.closest('label')!)
      await settleLayout()
      expect(document.activeElement).toBe(productManager)
      expect(productManager.checked).toBe(index % 2 === 0)
      expect(fixture.selected.value).toEqual(index % 2 === 0 ? ['产品经理'] : [])
      expectStableLayout(fixture, initial)
    }
  })

  it.each([930, 800, 640])('keeps the layout stable on Tab and Space at 1280 × %i', async (height) => {
    const fixture = await mountScrollableDialog(height)
    const initial = await scrollToRoles(fixture)
    fixture.beforeRoles.focus()

    for (const input of fixture.inputs) {
      await userEvent.keyboard('{Tab}')
      await settleLayout()
      expect(document.activeElement).toBe(input)
      expect(input.matches(':focus-visible')).toBe(true)
      expectStableLayout(fixture, initial)

      for (const checked of [true, false]) {
        await userEvent.keyboard('[Space]')
        await settleLayout()
        expect(input.checked).toBe(checked)
        expectStableLayout(fixture, initial)
      }
    }
    expect(fixture.selected.value).toEqual([])
  })

  it.each([true, false])('scrolls an offscreen checkbox into the viewport with smoothScroll=%s', async (smoothScroll) => {
    const fixture = await mountScrollableDialog(640, smoothScroll)
    const productManager = fixture.inputs[3]
    expect(fixture.viewport.scrollTop).toBe(0)

    productManager.focus()
    await settleLayout()

    const control = productManager.closest('label')!.querySelector('.bing-checkbox__control')!
    const controlRect = control.getBoundingClientRect()
    const viewportRect = fixture.viewport.getBoundingClientRect()
    expect(document.activeElement).toBe(productManager)
    expect(productManager.checked).toBe(false)
    expect(fixture.viewport.scrollTop).toBeGreaterThan(0)
    expect(fixture.outer.scrollTop).toBe(0)
    expect(controlRect.top).toBeGreaterThanOrEqual(viewportRect.top)
    expect(controlRect.bottom).toBeLessThanOrEqual(viewportRect.bottom)
  })
})
