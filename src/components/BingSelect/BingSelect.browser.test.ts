import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App, Ref } from 'vue'
import { gsap } from 'gsap'
import BingSelect from './BingSelect.vue'
import BingTreeSelect from '../BingTreeSelect/BingTreeSelect.vue'
import type {
  BingSelectModelValue,
  BingSelectOption,
  BingSelectProps,
} from './BingSelect.types'
import '../../theme/index.css'

interface MountedSelect {
  app: App<Element>
  changes: BingSelectModelValue[]
  host: HTMLElement
  modelValue: Ref<BingSelectModelValue>
}

const mountedSelects: MountedSelect[] = []

function wait(duration: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, duration)
  })
}

async function waitFor(condition: () => boolean, timeout = 1_500) {
  const startedAt = performance.now()

  while (!condition()) {
    if (performance.now() - startedAt > timeout) {
      throw new Error('Timed out while waiting for the select layout to settle')
    }

    await wait(16)
  }
}

function mountSelect(
  options: BingSelectOption[],
  props: Partial<BingSelectProps> = {},
) {
  const host = document.createElement('div')
  const modelValue = ref<BingSelectModelValue>(props.modelValue ?? null)
  const changes: BingSelectModelValue[] = []
  const liveProps = ref(props)

  host.style.width = '360px'
  host.style.margin = '80px'
  document.body.appendChild(host)

  const app = createApp({
    render: () =>
      h(BingSelect, {
        ...liveProps.value,
        modelValue: modelValue.value,
        options,
        searchable: props.searchable ?? false,
        showSelectAll: props.showSelectAll ?? false,
        smoothScroll: props.smoothScroll ?? false,
        'onUpdate:modelValue': (value: BingSelectModelValue) => {
          modelValue.value = value
          changes.push(value)
        },
      }),
  })

  app.mount(host)
  mountedSelects.push({ app, changes, host, modelValue })

  return { changes, host, modelValue, liveProps }
}

async function openSelect(host: HTMLElement) {
  // 不复用上一个用例的静止指针，避免详情浮层遮住待测命中区域。
  await page.elementLocator(host.querySelector<HTMLButtonElement>('.bing-select__trigger')!).hover()
  host.querySelector<HTMLButtonElement>('.bing-select__trigger')?.click()
  await nextTick()
  await waitFor(() => document.body.querySelectorAll('.bing-select__option').length >= 2)
  await wait(360)
}

function getRenderedOptions() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.bing-select__option'))
}

function getVisibleOptions(viewport: HTMLElement) {
  const viewportRect = viewport.getBoundingClientRect()

  return getRenderedOptions().filter((option) => {
    const rect = option.getBoundingClientRect()

    return rect.top >= viewportRect.top && rect.bottom <= viewportRect.bottom
  })
}

function getSurface(option: HTMLElement) {
  const surface = option.querySelector<HTMLElement>('.bing-select__option-surface')

  if (!surface) {
    throw new Error('Expected the option visual surface to be rendered')
  }

  return surface
}

function readPanelMotion(panel: HTMLElement) {
  const style = getComputedStyle(panel)
  const transform = new DOMMatrixReadOnly(style.transform)

  return {
    opacity: Number(style.opacity),
    x: transform.m41,
    y: transform.m42,
    scaleX: transform.m11,
    scaleY: transform.m22,
  }
}

function getBoundaryTargets(first: HTMLElement, second: HTMLElement) {
  const firstRect = first.getBoundingClientRect()
  const secondRect = second.getBoundingClientRect()
  const firstSurfaceRect = getSurface(first).getBoundingClientRect()
  const secondSurfaceRect = getSurface(second).getBoundingClientRect()
  const x = firstSurfaceRect.left + firstSurfaceRect.width / 2
  const upperY = secondRect.top - 1
  const lowerY = secondRect.top + 1
  const upperTarget = document.elementFromPoint(x, upperY) as HTMLElement | null
  const lowerTarget = document.elementFromPoint(x, lowerY) as HTMLElement | null

  expect(secondRect.top - firstRect.bottom).toBeCloseTo(0, 1)
  expect(secondSurfaceRect.top - firstSurfaceRect.bottom).toBeCloseTo(4, 1)
  expect(firstRect.height).toBeGreaterThanOrEqual(firstSurfaceRect.height + 4)
  expect(upperY).toBeGreaterThan(firstSurfaceRect.bottom)
  expect(lowerY).toBeLessThan(secondSurfaceRect.top)
  expect(upperTarget?.closest('.bing-select__option')).toBe(first)
  expect(lowerTarget?.closest('.bing-select__option')).toBe(second)
  expect(getComputedStyle(upperTarget!).cursor).toBe('pointer')
  expect(getComputedStyle(lowerTarget!).cursor).toBe('pointer')

  return { lowerTarget: lowerTarget!, lowerY, upperTarget: upperTarget!, upperY, x }
}

afterEach(() => {
  mountedSelects.splice(0).forEach(({ app, host }) => {
    app.unmount()
    host.remove()
  })
})

describe('BingSelect option hit areas in a browser', () => {
  it('悬停后键盘导航只保留一个高亮，静止指针不抢占，移动后恢复', async () => {
    const { host } = mountSelect(Array.from({ length: 24 }, (_, value) => ({ label: `选项 ${value}`, value })))
    await openSelect(host)
    const hovered = getRenderedOptions()[2]!
    await page.elementLocator(hovered).hover()
    const rect = hovered.getBoundingClientRect()
    const trigger = host.querySelector<HTMLButtonElement>('.bing-select__trigger')!
    for (let index = 0; index < 2; index++) trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
    await nextTick()
    hovered.dispatchEvent(new MouseEvent('mouseenter', { clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2 }))
    await wait(300)
    const active = document.querySelector<HTMLElement>('.bing-select__option.is-active')!
    expect(document.querySelectorAll('.bing-select__option.is-active')).toHaveLength(1)
    expect(active.dataset.optionIndex).toBe('4')
    expect(getComputedStyle(getSurface(hovered)).backgroundColor).toBe('rgba(0, 0, 0, 0)')
    expect(trigger.getAttribute('aria-activedescendant')).toBe(active.id)
    expect(getRenderedOptions().every(option => option.tabIndex === -1)).toBe(true)
    hovered.dispatchEvent(new MouseEvent('mousemove', { clientX: rect.x + rect.width / 2 + 4, clientY: rect.y + rect.height / 2 }))
    await nextTick()
    expect(document.querySelector('.bing-select__option.is-active')).toBe(hovered)
  })

  it('typeahead 将虚拟列表末尾的中文选项滚入视口，保留完整集合位置', async () => {
    const options = Array.from({ length: 160 }, (_, value) => ({ label: `项目 ${value}`, value }))
    options[159]!.label = '重庆'
    const { host, changes } = mountSelect(options, { virtual: true })
    await openSelect(host)
    const trigger = host.querySelector<HTMLButtonElement>('.bing-select__trigger')!
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'c', bubbles: true }))
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'q', bubbles: true }))
    await waitFor(() => Boolean(document.querySelector('.bing-select__option[data-option-index="159"]')))
    const active = document.querySelector<HTMLElement>('.bing-select__option.is-active')!
    expect(active.textContent).toContain('重庆')
    expect(active.getAttribute('aria-posinset')).toBe('160')
    expect(active.getAttribute('aria-setsize')).toBe('160')
    const viewport = document.querySelector<HTMLElement>('.bing-select__panel .bing-scrollbar__viewport')!
    expect(active.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1)
    expect(changes).toEqual([])
  })

  it('标签按最终宽度折叠，快速增删后的 +N 稳定，离场节点不参与计数', async () => {
    const { host, modelValue } = mountSelect(Array.from({ length: 10 }, (_, value) => ({ label: `动效预设 ${value}`, value })), { multiple: true })
    modelValue.value = [0]
    await nextTick()
    await waitFor(() => Boolean(host.querySelector('.bing-select__tags-value .bing-select__value-tag')))
    const firstTag = host.querySelector<HTMLElement>('.bing-select__tags-value .bing-select__value-tag')!
    expect(Number(getComputedStyle(firstTag).opacity)).toBeLessThan(1)
    expect(getComputedStyle(firstTag).willChange).toBe('transform, opacity')
    for (let count = 2; count <= 8; count++) {
      modelValue.value = Array.from({ length: count }, (_, value) => value)
      await nextTick()
      await wait(24)
    }
    await wait(600)
    const tags = () => [...host.querySelectorAll<HTMLElement>('.bing-select__tags-value .bing-select__value-tag:not(.is-leaving)')]
    const hidden = () => host.querySelector('.bing-picker__counter-value:not(.is-leaving)')?.textContent
    expect(tags().length).toBeLessThan(8)
    expect(hidden()).toBe(`+${8 - tags().length}`)
    const removed = tags()[0]!
    modelValue.value = [1, 2, 3, 4, 5, 6, 7]
    await nextTick()
    await waitFor(() => removed.classList.contains('is-leaving'))
    expect(removed.isConnected).toBe(true)
    expect(removed.classList.contains('is-leaving')).toBe(true)
    expect(removed.inert).toBe(true)
    await wait(400)
    expect(removed.isConnected).toBe(false)
    expect(hidden()).toBe(`+${7 - tags().length}`)
    const viewport = host.querySelector<HTMLElement>('.bing-select__tags-value')!
    const overflow = viewport.querySelector<HTMLElement>('.bing-select__overflow-tag')!
    expect(overflow.getBoundingClientRect().right).toBeLessThanOrEqual(viewport.getBoundingClientRect().right)
    expect(viewport.querySelectorAll('.is-leaving')).toHaveLength(0)
    modelValue.value = []
    await wait(350)
    expect(viewport.querySelectorAll('.bing-select__value-tag')).toHaveLength(0)
    expect(host.textContent).toContain('请选择选项')
  })

  it('虚拟列表清空后全选只挂载可容纳的标签和少量测量节点，计数一次到位', async () => {
    const options = Array.from({ length: 240 }, (_, value) => ({ label: `虚拟动效 ${value + 1}`, value, disabled: value % 16 === 0 }))
    const { host, modelValue } = mountSelect(options, { multiple: true, virtual: true, showSelectAll: true })
    await openSelect(host)
    const all = document.querySelector<HTMLButtonElement>('.bing-picker__select-all')!
    let peakTags = 0
    let peakProbes = 0
    const counterValues = new Set<string>()
    const observer = new MutationObserver(() => {
      peakTags = Math.max(peakTags, host.querySelectorAll('.bing-select__tags-value .bing-select__value-tag').length)
      peakProbes = Math.max(peakProbes, host.querySelectorAll('.bing-select__tag-measure .bing-tag').length)
      const counter = host.querySelector('.bing-picker__counter-value:not(.is-leaving)')?.textContent
      if (counter) counterValues.add(counter)
    })
    observer.observe(host, { childList: true, subtree: true })
    try {
      for (let round = 0; round < 2; round++) {
        all.click()
        await nextTick()
        expect(modelValue.value).toHaveLength(225)
        await wait(450)
        const tags = host.querySelectorAll<HTMLElement>('.bing-select__tags-value .bing-select__value-tag')
        expect(tags.length).toBeGreaterThan(0)
        expect(tags.length).toBeLessThan(4)
        expect(host.querySelector('.bing-picker__counter-value')?.textContent).toBe(`+${225 - tags.length}`)
        expect([...tags].every(tag => getComputedStyle(tag).willChange === 'transform, opacity')).toBe(true)
        expect(counterValues.size).toBe(1)
        expect(peakTags).toBeLessThanOrEqual(4)
        expect(peakProbes).toBeLessThanOrEqual(9)
        all.click()
        await wait(300)
        expect(modelValue.value).toEqual([])
      }
    } finally {
      observer.disconnect()
    }
  })

  it('宽容器按需扩展测量前缀，缩窄后收回测量节点，数字跨位数后仍精确折叠', async () => {
    const { host, modelValue } = mountSelect(Array.from({ length: 12 }, (_, value) => ({ label: `${value}`, value })), {
      multiple: true, block: true, modelValue: Array.from({ length: 12 }, (_, value) => value),
    })
    host.style.width = '1000px'
    await waitFor(() => host.querySelectorAll('.bing-select__tags-value .bing-select__value-tag:not(.is-leaving)').length === 12)
    await wait(250)
    expect(host.querySelector('.bing-select__tags-value .bing-select__overflow-tag')).toBeNull()
    host.style.width = '180px'
    await wait(400)
    expect(host.querySelectorAll('.bing-select__tag-measure .bing-tag').length).toBeLessThanOrEqual(9)
    modelValue.value = [0, 1, 2]
    await wait(400)
    const viewport = host.querySelector<HTMLElement>('.bing-select__tags-value')!
    const tags = viewport.querySelectorAll('.bing-select__value-tag')
    expect(viewport.querySelector('.bing-picker__counter-value')?.textContent).toBe(`+${3 - tags.length}`)
    expect(viewport.lastElementChild!.getBoundingClientRect().right).toBeLessThanOrEqual(viewport.getBoundingClientRect().right)
  })

  it('取消全选逐帧保持标签原位，退场后才显示占位文字，并且不喷出点击碎屑', async () => {
    const options = Array.from({ length: 240 }, (_, value) => ({ label: `虚拟动效 ${value + 1}`, value }))
    const { host, modelValue } = mountSelect(options, {
      multiple: true, virtual: true, showSelectAll: true, modelValue: options.map(option => option.value),
    })
    await openSelect(host)
    await wait(250)
    const viewport = host.querySelector<HTMLElement>('.bing-select__tags-value')!
    const tags = [...viewport.querySelectorAll<HTMLElement>('.bing-select__value-tag')]
    expect(tags.length).toBeGreaterThan(1)
    const positions = new Map(tags.map(tag => [tag, { left: tag.offsetLeft, top: tag.offsetTop, width: tag.offsetWidth }]))
    const all = document.querySelector<HTMLButtonElement>('.bing-picker__select-all')!
    const rect = all.getBoundingClientRect()
    all.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 1, clientX: rect.left + 20, clientY: rect.top + rect.height / 2 }))
    await nextTick()
    expect(modelValue.value).toEqual([])
    let sawLeaving = false
    // 高刷新率下 18 帧可能不足 120ms；既逐帧检查，也覆盖完整退场时长。
    for (let frame = 0, started = performance.now(); frame < 18 || performance.now() - started < 250; frame++) {
      await nextFrame()
      const leaving = [...viewport.querySelectorAll<HTMLElement>('.bing-select__value-tag')]
      const placeholder = viewport.querySelector('.bing-select__tags-placeholder')
      expect(Boolean(placeholder) && leaving.length > 0).toBe(false)
      for (const tag of leaving) {
        sawLeaving = true
        expect(tag.classList.contains('is-leaving')).toBe(true)
        expect({ left: tag.offsetLeft, top: tag.offsetTop, width: tag.offsetWidth }).toEqual(positions.get(tag))
      }
      expect(document.querySelector('.bing-click-particles')).toBeNull()
    }
    expect(sawLeaving).toBe(true)
    expect(viewport.querySelectorAll('.bing-select__value-tag')).toHaveLength(0)
    expect(viewport.querySelector('.bing-select__tags-placeholder')?.textContent).toContain('请选择选项')
  })

  it('快速全选、清空、再全选不重叠占位文字，最终清空仍能恢复占位文字', async () => {
    const options = Array.from({ length: 80 }, (_, value) => ({ label: `动效预设 ${value}`, value }))
    const { host, modelValue } = mountSelect(options, { multiple: true, virtual: true, showSelectAll: true })
    await openSelect(host)
    const viewport = host.querySelector<HTMLElement>('.bing-select__tags-value')!
    const all = document.querySelector<HTMLButtonElement>('.bing-picker__select-all')!
    all.click()
    await wait(50)
    const entering = [...viewport.querySelectorAll<HTMLElement>('.bing-select__value-tag')]
    expect(entering.length).toBeGreaterThan(1)
    const enteringPositions = entering.map(tag => ({ left: tag.offsetLeft, top: tag.offsetTop, width: tag.offsetWidth }))
    all.click()
    await nextFrame()
    expect(entering.map(tag => ({ left: tag.offsetLeft, top: tag.offsetTop, width: tag.offsetWidth }))).toEqual(enteringPositions)
    await wait(25)
    all.click()
    await wait(400)
    expect(modelValue.value).toHaveLength(80)
    expect(viewport.querySelector('.bing-select__tags-placeholder')).toBeNull()
    expect(viewport.querySelector('.is-leaving')).toBeNull()
    modelValue.value = []
    for (let frame = 0, started = performance.now(); frame < 18 || performance.now() - started < 250; frame++) {
      await nextFrame()
      expect(Boolean(viewport.querySelector('.bing-select__tags-placeholder')) && Boolean(viewport.querySelector('.bing-select__value-tag'))).toBe(false)
    }
    expect(viewport.querySelector('.bing-select__tags-placeholder')?.textContent).toContain('请选择选项')
  })

  it('宽度变化重新测量标签，行高与圆角 token 同步传入 Teleport 面板', async () => {
    const { host } = mountSelect(Array.from({ length: 8 }, (_, value) => ({ label: `动效 ${value}`, value })), { multiple: true, modelValue: [0, 1, 2, 3, 4, 5], block: true })
    const root = host.querySelector<HTMLElement>('.bing-select')!
    root.style.setProperty('--bing-select-option-height', '40px')
    root.style.setProperty('--bing-select-panel-radius', '14px')
    await openSelect(host)
    await wait(400)
    expect(getComputedStyle(document.querySelector('.bing-select__panel')!).borderRadius).toBe('14px')
    expect(getRenderedOptions()[0]!.getBoundingClientRect().height).toBe(40)
    const before = host.querySelectorAll('.bing-select__tags-value .bing-select__value-tag').length
    host.style.width = '220px'
    await wait(500)
    const after = host.querySelectorAll('.bing-select__tags-value .bing-select__value-tag').length
    expect(after).toBeLessThan(before)
    expect(host.querySelector('.bing-picker__counter-value:not(.is-leaving)')?.textContent).toBe(`+${6 - after}`)
  })

  it.each([false, true])('缩小尺寸后行高与选中范围同步，虚拟列表=%s', async virtual => {
    const { host, liveProps, modelValue } = mountSelect(
      Array.from({ length: 120 }, (_, index) => ({ label: `图层 ${index}`, value: index })),
      { virtual, size: 'md', panelMaxHeight: 220 },
    )
    await openSelect(host)

    for (const [size, height] of [['sm', 28], ['lg', 36], ['md', 32]] as const) {
      liveProps.value = { ...liveProps.value, size }
      await nextTick()
      await waitFor(() => Math.abs(getRenderedOptions()[0]!.getBoundingClientRect().height - height) < 0.1)
      const [first, second] = getRenderedOptions()
      expect(second!.getBoundingClientRect().top - first!.getBoundingClientRect().top).toBeCloseTo(height, 1)
      if (virtual) {
        const body = document.body.querySelector<HTMLElement>('.bing-select__panel-body')!
        expect(body.style.height).toBe(`${120 * height + 18}px`)
      }
    }

    const trigger = host.querySelector<HTMLButtonElement>('.bing-select__trigger')!
    // 浏览器复用鼠标位置；键盘用例从触发器开始，避免上一用例留下的悬停选中滚动中的选项。
    await page.elementLocator(trigger).hover()
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    await waitFor(() => Boolean(document.body.querySelector('.bing-select__option[id$="-option-119"]')))
    await wait(120)
    const last = document.body.querySelector<HTMLElement>('.bing-select__option[id$="-option-119"]')!
    const viewport = document.body.querySelector<HTMLElement>('.bing-select__panel .bing-scrollbar__viewport')!
    expect(last.getBoundingClientRect().bottom).toBeLessThanOrEqual(viewport.getBoundingClientRect().bottom + 1)
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    await nextTick()
    expect(modelValue.value).toBe(119)
  })

  it.each([false, true])('面板、选项与操作按钮复用 TreeSelect 动效，关闭中重开=%s', async interrupted => {
    const options = [
      { label: '设计', value: 'design' },
      { label: '开发', value: 'engineering' },
      { label: '测试', value: 'qa' },
    ]
    const props = { virtual: false, multiple: true, showSelectAll: true, searchable: false, smoothScroll: false }
    const { host } = mountSelect(options, props)
    const referenceHost = document.createElement('div')
    referenceHost.style.cssText = 'position: fixed; top: 80px; left: 80px; width: 360px;'
    document.body.appendChild(referenceHost)
    const referenceApp = createApp({
      render: () => h(BingTreeSelect, { ...props, options, showTreeActions: false }),
    })
    referenceApp.mount(referenceHost)
    let referenceMounted = true

    const getPanelAnimation = async (prefix: string, previous?: gsap.core.Timeline) => {
      let animation: gsap.core.Timeline | undefined
      await waitFor(() => {
        const panel = document.body.querySelector<HTMLElement>(`.${prefix}__panel`)
        animation = panel
          ? gsap.getTweensOf(panel).find(tween => (
            tween.duration() > 0 && tween.parent !== gsap.globalTimeline && tween.parent !== previous
          ))?.parent ?? undefined
          : undefined
        return Boolean(animation)
      })
      animation!.pause()
      // 时间线本身可被 await，使用对象包装以免等待暂停中的动画结束。
      return { animation: animation! }
    }
    const readFrame = (prefix: string, itemClass: string) => {
      const selectors = [`.${prefix}__panel`, `.${prefix}__${itemClass}`]
      return selectors.flatMap(selector => Array.from(
        document.body.querySelectorAll<HTMLElement>(selector), readPanelMotion,
      ))
    }
    const openAnimation = async (root: HTMLElement, prefix: string) => {
      const trigger = root.querySelector<HTMLButtonElement>(`.${prefix}__trigger`)!
      trigger.click()
      await nextTick()
      let { animation } = await getPanelAnimation(prefix)
      if (interrupted) {
        animation.progress(0.35)
        trigger.click()
        await nextTick()
        animation = (await getPanelAnimation(prefix, animation)).animation
        animation.progress(0.3)
        trigger.click()
        await nextTick()
        animation = (await getPanelAnimation(prefix, animation)).animation
      }
      return { animation, trigger }
    }
    try {
      const reference = await openAnimation(referenceHost, 'bing-tree-select')
      const referenceFrames: ReturnType<typeof readFrame>[] = []
      for (let step = 0; step <= 60; step += 1) {
        reference.animation.progress(step / 60)
        referenceFrames.push(readFrame('bing-tree-select', 'node'))
      }
      const referenceDuration = reference.animation.duration()
      expect(referenceFrames.some(frame => frame[0]!.opacity > 0 && frame[0]!.opacity < 1)).toBe(true)
      expect(referenceFrames.some(frame => frame[1]!.opacity > frame[2]!.opacity)).toBe(true)

      reference.trigger.click()
      await nextTick()
      const referenceLeave = (await getPanelAnimation('bing-tree-select', reference.animation)).animation
      const referenceLeaveFrames: ReturnType<typeof readFrame>[] = []
      for (let step = 0; step < 30; step += 1) {
        referenceLeave.progress(step / 30)
        referenceLeaveFrames.push(readFrame('bing-tree-select', 'node'))
      }
      const referenceLeaveDuration = referenceLeave.duration()
      referenceApp.unmount()
      referenceMounted = false
      referenceHost.remove()

      const { animation, trigger } = await openAnimation(host, 'bing-select')
      expect(animation.duration()).toBeLessThanOrEqual(referenceDuration)
      const expectSameFrame = (expected: ReturnType<typeof readFrame>) => {
        const actual = readFrame('bing-select', 'option')
        expect(actual.length).toBe(expected.length)
        for (let index = 0; index < actual.length; index += 1) {
          for (const property of ['opacity', 'x', 'y', 'scaleX', 'scaleY'] as const) {
            expect(actual[index]![property], `节点 ${index} 的 ${property}`).toBeCloseTo(expected[index]![property], 4)
          }
        }
      }
      // 比较真实组件渲染状态，同时检查变换是否改变短列表的滚动范围。
      for (let step = 0; step <= 60; step += 1) {
        animation.time(referenceDuration * step / 60)
        expectSameFrame(referenceFrames[step]!)
        const viewport = document.body.querySelector<HTMLElement>('.bing-select__panel-scroll .bing-scrollbar__viewport')!
        expect(viewport.scrollHeight - viewport.clientHeight, '短列表不应出现额外滚动范围').toBeLessThanOrEqual(1)
        expect(viewport.scrollLeft).toBe(0)
      }
      await nextTick()
      await wait(80)
      expectSameFrame(referenceFrames[60]!)
      expect(document.body.querySelector('.bing-select__panel-scroll.has-overflow')).toBeNull()

      trigger.click()
      await nextTick()
      const leave = (await getPanelAnimation('bing-select', animation)).animation
      expect(leave.duration()).toBe(referenceLeaveDuration)
      for (let step = 0; step < 30; step += 1) {
        leave.progress(step / 30)
        expectSameFrame(referenceLeaveFrames[step]!)
      }
      leave.progress(1)
      await nextTick()
      expect(document.body.querySelector('.bing-select__panel')).toBeNull()
    } finally {
      if (referenceMounted) referenceApp.unmount()
      referenceHost.remove()
    }
  })

  it('keeps visual spacing while assigning both halves of the gap to adjacent options', async () => {
    const options: BingSelectOption[] = [
      { label: 'Motion preset 11', value: 'preset-11', detail: 'First detail' },
      { label: 'Motion preset 12', value: 'preset-12', detail: 'Second detail' },
      { label: 'Motion preset 13', value: 'preset-13', detail: 'Third detail' },
    ]
    const { changes, host, modelValue } = mountSelect(options, {
      multiple: true,
      virtual: false,
    })

    await openSelect(host)

    const [first, second] = getRenderedOptions()
    const { lowerTarget, lowerY, upperTarget, upperY, x } = getBoundaryTargets(first, second)

    upperTarget.dispatchEvent(
      new MouseEvent('mouseenter', { clientX: x, clientY: upperY }),
    )
    await nextTick()
    await waitFor(() => Boolean(document.body.querySelector('.bing-select__option-detail-panel')))

    const detailPanel = document.body.querySelector<HTMLElement>(
      '.bing-select__option-detail-panel',
    )

    expect(detailPanel?.textContent).toContain('Motion preset 11')

    upperTarget.dispatchEvent(new MouseEvent('mouseleave', { clientX: x, clientY: upperY }))
    lowerTarget.dispatchEvent(
      new MouseEvent('mouseenter', { clientX: x, clientY: lowerY }),
    )
    await nextTick()
    await waitFor(() => detailPanel?.textContent?.includes('Motion preset 12') ?? false)

    expect(document.body.querySelector('.bing-select__option-detail-panel')).toBe(detailPanel)

    upperTarget.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: upperY }),
    )
    await nextTick()
    lowerTarget.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: lowerY }),
    )
    await nextTick()

    expect(changes).toEqual([['preset-11'], ['preset-11', 'preset-12']])
    expect(modelValue.value).toEqual(['preset-11', 'preset-12'])
  })

  it('uses the full virtual item height as a continuous option pitch after scrolling', async () => {
    const options = Array.from({ length: 120 }, (_, index) => ({
      label: `Virtual motion ${index + 1}`,
      value: `virtual-${index + 1}`,
    }))
    const { changes, host } = mountSelect(options, {
      multiple: true,
      panelMaxHeight: 220,
      virtual: true,
      virtualItemHeight: 44,
      virtualOverscan: 3,
    })

    await openSelect(host)

    const viewport = document.body.querySelector<HTMLElement>(
      '.bing-select__panel-scroll .bing-scrollbar__viewport',
    )

    expect(viewport).not.toBeNull()

    let [first, second] = getVisibleOptions(viewport!)

    expect(first.getBoundingClientRect().height).toBeCloseTo(44, 1)
    getBoundaryTargets(first, second)

    viewport!.scrollTop = 44 * 40
    viewport!.dispatchEvent(new Event('scroll', { bubbles: true }))
    await nextTick()
    await waitFor(() => Number(getRenderedOptions()[0]?.dataset.optionIndex) >= 35)

    const visibleOptions = getVisibleOptions(viewport!)
    first = visibleOptions[0]
    second = visibleOptions[1]

    const firstIndex = Number(first.dataset.optionIndex)
    const secondIndex = Number(second.dataset.optionIndex)
    const { lowerTarget, lowerY, x } = getBoundaryTargets(first, second)

    expect(first.getBoundingClientRect().height).toBeCloseTo(44, 1)
    expect(second.getBoundingClientRect().top - first.getBoundingClientRect().top).toBeCloseTo(44, 1)
    expect(secondIndex).toBe(firstIndex + 1)

    lowerTarget.dispatchEvent(
      new MouseEvent('click', { bubbles: true, clientX: x, clientY: lowerY }),
    )
    await nextTick()

    expect(changes).toEqual([[options[secondIndex].value]])
  })
})

function nextFrame() {
  return new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
}

/** 搜索框首次获得焦点后立刻把焦点移到外部输入框，模拟打开动画期间用户或业务移走焦点。 */
async function openThenMoveFocusOut(host: HTMLElement) {
  const outside = document.createElement('input')
  outside.setAttribute('aria-label', '外部输入框')
  document.body.append(outside)
  let moved = false
  const onFocusIn = (event: FocusEvent) => {
    if (!moved && (event.target as Element).closest('.bing-select__search') !== null) {
      moved = true
      queueMicrotask(() => outside.focus())
    }
  }
  document.addEventListener('focusin', onFocusIn)
  try {
    host.querySelector<HTMLButtonElement>('.bing-select__trigger')!.click()
    await waitFor(() => moved)
    for (let frame = 0; frame < 6; frame++) await nextFrame()
  } finally {
    document.removeEventListener('focusin', onFocusIn)
  }
  return outside
}

describe('BingSelect search focus in a browser', () => {
  it('打开后把焦点落到搜索框', async () => {
    const { host } = mountSelect([{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }], { searchable: true })
    host.querySelector<HTMLButtonElement>('.bing-select__trigger')!.click()
    await waitFor(() => document.activeElement?.closest('.bing-select__search') != null)
    for (let frame = 0; frame < 6; frame++) await nextFrame()
    expect(document.activeElement?.closest('.bing-select__search')).not.toBeNull()
  })

  it('打开动画期间焦点被移到组件外时，不再把焦点抢回搜索框', async () => {
    const { host } = mountSelect([{ label: 'Alpha', value: 'a' }, { label: 'Beta', value: 'b' }], { searchable: true })
    const outside = await openThenMoveFocusOut(host)
    try {
      expect(document.activeElement).toBe(outside)
    } finally {
      outside.remove()
    }
  })
})
