import { enableAutoUnmount, mount } from '@vue/test-utils'
import { defineComponent, h, nextTick, ref } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { prefersReducedMotion, resolveReducedMotion, useReducedMotion } from '../../motion/reducedMotion'
import { useBingConfig, useConfigSize, useConfigZIndex } from '../../utils/config'
import BingButton from '../BingButton/BingButton.vue'
import BingDialog from '../BingDialog/BingDialog.vue'
import BingForm from '../BingForm/BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingTag from '../BingTag/BingTag.vue'
import BingConfigProvider from './BingConfigProvider.vue'

enableAutoUnmount(afterEach)

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  document.body.innerHTML = ''
})

function stubSystemReducedMotion(matches: boolean) {
  const listeners = new Set<() => void>()
  const media = {
    matches,
    addEventListener: vi.fn((_: string, listener: () => void) => listeners.add(listener)),
    removeEventListener: vi.fn((_: string, listener: () => void) => listeners.delete(listener)),
  }
  vi.spyOn(window, 'matchMedia').mockImplementation(() => media as unknown as MediaQueryList)
  return { media, listeners }
}

function captureConfig() {
  const captured: { value?: ReturnType<typeof useBingConfig> } = {}
  const Probe = defineComponent({
    setup() {
      captured.value = useBingConfig()
      return () => null
    },
  })
  return { Probe, captured }
}

describe('BingConfigProvider', () => {
  it('没有 Provider 时使用组件原有默认值', () => {
    const { Probe, captured } = captureConfig()
    mount(Probe)

    expect(captured.value?.size.value).toBeUndefined()
    expect(captured.value?.zIndex.value).toBe(2000)
    expect(captured.value?.reducedMotion.value).toBe('user')
  })

  it('嵌套 Provider 只覆盖显式设置的字段', () => {
    const { Probe, captured } = captureConfig()
    mount(BingConfigProvider, {
      props: { size: 'lg', zIndex: 5000, reducedMotion: 'always' },
      slots: { default: () => h(BingConfigProvider, { size: 'sm' }, () => h(Probe)) },
    })

    expect(captured.value?.size.value).toBe('sm')
    expect(captured.value?.zIndex.value).toBe(5000)
    expect(captured.value?.reducedMotion.value).toBe('always')
  })

  it('组件尺寸按 props、表单、全局配置、md 的顺序解析', async () => {
    const size = ref<'sm' | 'lg'>('lg')
    const wrapper = mount(defineComponent({
      setup: () => () => h(BingConfigProvider, { size: size.value }, () => [
        h(BingButton, { class: 'global' }, () => 'A'),
        h(BingButton, { class: 'explicit', size: 'sm' }, () => 'B'),
        h(BingTag, { label: 'tag' }),
        h(BingForm, { model: {}, size: 'sm' }, () =>
          h(BingFormItem, { label: 'Name' }, () => h(BingInput, { modelValue: '' }))),
      ]),
    }))

    expect(wrapper.find('.global').classes()).toContain('bing-button--lg')
    expect(wrapper.find('.explicit').classes()).toContain('bing-button--sm')
    expect(wrapper.find('.bing-tag').classes()).toContain('bing-tag--lg')
    expect(wrapper.find('.bing-form').classes()).toContain('bing-form--sm')
    expect(wrapper.find('.bing-input').classes()).toContain('bing-input--sm')

    size.value = 'sm'
    await nextTick()
    expect(wrapper.find('.global').classes()).toContain('bing-button--sm')
    expect(wrapper.find('.bing-tag').classes()).toContain('bing-tag--sm')
  })

  it('浮层层级以全局基准加固定偏移计算，显式 zIndex 优先', () => {
    const results: Record<string, number> = {}
    const Probe = defineComponent({
      setup() {
        results.dialog = useConfigZIndex('dialog').value
        results.popover = useConfigZIndex('popover').value
        results.tooltip = useConfigZIndex('tooltip').value
        results.explicit = useConfigZIndex('tooltip', () => 42).value
        return () => null
      },
    })

    mount(Probe)
    expect(results).toEqual({ dialog: 2000, popover: 3000, tooltip: 3200, explicit: 42 })

    mount(BingConfigProvider, { props: { zIndex: 10000 }, slots: { default: () => h(Probe) } })
    expect(results).toEqual({ dialog: 10000, popover: 11000, tooltip: 11200, explicit: 42 })
  })

  it('Dialog 使用全局层级基准', async () => {
    mount(BingConfigProvider, {
      props: { zIndex: 9000 },
      slots: { default: () => h(BingDialog, { modelValue: true, title: 'Config' }) },
      attachTo: document.body,
    })
    await nextTick()

    const root = document.body.querySelector<HTMLElement>('.bing-dialog-root')
    expect(Number(root?.style.zIndex)).toBeGreaterThanOrEqual(9000)
  })

  it('useConfigSize 在没有配置时回落到 md', () => {
    let resolved: string | undefined
    mount(defineComponent({
      setup() {
        resolved = useConfigSize<'sm' | 'md' | 'lg'>(() => undefined).value
        return () => null
      },
    }))
    expect(resolved).toBe('md')
  })
})

describe('reduced motion', () => {
  it('每次调用都实时读取系统设置', () => {
    const spy = vi.spyOn(window, 'matchMedia')
    spy.mockReturnValue({ matches: true } as MediaQueryList)
    expect(prefersReducedMotion()).toBe(true)
    spy.mockReturnValue({ matches: false } as MediaQueryList)
    expect(prefersReducedMotion()).toBe(false)
  })

  it('缺少 matchMedia 时视为未开启', () => {
    vi.stubGlobal('matchMedia', undefined)
    expect(prefersReducedMotion()).toBe(false)
    expect(prefersReducedMotion(null)).toBe(false)
  })

  it('always / never 覆盖系统设置', () => {
    stubSystemReducedMotion(true)
    expect(resolveReducedMotion('user')).toBe(true)
    expect(resolveReducedMotion('never')).toBe(false)
    stubSystemReducedMotion(false)
    expect(resolveReducedMotion('always')).toBe(true)
  })

  it('useReducedMotion 读取 Provider 配置，并在系统或配置变化时通知', async () => {
    const { listeners } = stubSystemReducedMotion(false)
    const mode = ref<'user' | 'always' | 'never'>('user')
    const onChange = vi.fn()
    let check: (() => boolean) | undefined
    const Probe = defineComponent({
      setup() {
        check = useReducedMotion({ onChange })
        return () => null
      },
    })

    const wrapper = mount(defineComponent({
      setup: () => () => h(BingConfigProvider, { reducedMotion: mode.value }, () => h(Probe)),
    }))
    expect(check?.()).toBe(false)
    expect(listeners.size).toBe(1)

    mode.value = 'always'
    await nextTick()
    expect(check?.()).toBe(true)
    expect(onChange).toHaveBeenCalledTimes(1)

    listeners.forEach(listener => listener())
    expect(onChange).toHaveBeenCalledTimes(2)

    wrapper.unmount()
    expect(listeners.size).toBe(0)
  })
})
