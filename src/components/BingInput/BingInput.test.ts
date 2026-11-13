import { enableAutoUnmount, mount } from '@vue/test-utils'
import { Search } from '@lucide/vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import BingInput from './BingInput.vue'

enableAutoUnmount(afterEach)

describe('BingInput', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders an optional icon and emits immediate model updates', async () => {
    const wrapper = mount(BingInput, {
      props: {
        modelValue: '',
        icon: Search,
        placeholder: 'Search motions',
      },
    })

    expect(wrapper.find('.bing-input__icon').exists()).toBe(true)

    await wrapper.get('input').setValue('aurora')

    expect(wrapper.emitted('update:modelValue')).toEqual([['aurora']])
    expect(wrapper.emitted('input')?.[0]?.[0]).toBe('aurora')
  })

  it('emits debounced input after the configured delay', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BingInput, {
      props: {
        modelValue: '',
        debounceDelay: 120,
      },
    })

    await wrapper.get('input').setValue('a')
    await wrapper.get('input').setValue('au')

    expect(wrapper.emitted('debounced-input')).toBeUndefined()

    vi.advanceTimersByTime(119)
    expect(wrapper.emitted('debounced-input')).toBeUndefined()

    vi.advanceTimersByTime(1)
    expect(wrapper.emitted('debounced-input')).toEqual([['au']])
  })

  it('clears the value immediately and flushes the debounced value', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BingInput, {
      props: {
        modelValue: 'orbit',
        clearable: true,
        debounceDelay: 120,
      },
    })

    await wrapper.get('.bing-input__clear').trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([['']])
    expect(wrapper.emitted('clear')).toHaveLength(1)
    expect(wrapper.emitted('debounced-input')).toEqual([['']])

    vi.advanceTimersByTime(120)
    expect(wrapper.emitted('debounced-input')).toEqual([['']])
  })

  it('hides clear control when disabled', () => {
    const wrapper = mount(BingInput, {
      props: {
        modelValue: 'pulse',
        clearable: true,
        disabled: true,
      },
    })

    expect(wrapper.find('.bing-input__clear').exists()).toBe(false)
    expect(wrapper.classes()).toContain('is-disabled')
    expect(wrapper.get('input').attributes()).toHaveProperty('disabled')
  })

  it('中文组词保留原生文本，确认后只发布一次模型、输入和防抖事件', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BingInput, { props: { modelValue: '前缀', debounceDelay: 120 } })
    const field = wrapper.get('input')
    await field.trigger('compositionstart')
    field.element.value = '前缀zhong'
    await field.trigger('input', { isComposing: true })
    await wrapper.setProps({ status: 'warning', modelValue: '过期的外部值' })
    expect(field.element.value).toBe('前缀zhong')
    vi.advanceTimersByTime(200)
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.emitted('input')).toBeUndefined()
    expect(wrapper.emitted('debounced-input')).toBeUndefined()
    field.element.value = '前缀中文'
    await field.trigger('compositionend', { data: '中文' })
    field.element.value = '前缀中文'
    await field.trigger('input')
    expect(wrapper.emitted('update:modelValue')).toEqual([['前缀中文']])
    expect(wrapper.emitted('input')).toHaveLength(1)
    vi.advanceTimersByTime(120)
    expect(wrapper.emitted('debounced-input')).toEqual([['前缀中文']])
    await field.setValue('前缀中文A')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual(['前缀中文A'])
  })

  it('取消组词不发布拼音，恢复此前的防抖并能开始下一次输入', async () => {
    vi.useFakeTimers()
    const wrapper = mount(BingInput, { props: { debounceDelay: 120 } })
    const field = wrapper.get('input')
    await field.setValue('A')
    await field.trigger('compositionstart')
    field.element.value = 'Ani'
    await field.trigger('input', { isComposing: true })
    vi.advanceTimersByTime(200)
    expect(wrapper.emitted('debounced-input')).toBeUndefined()
    field.element.value = 'A'
    await field.trigger('compositionend', { data: '' })
    field.element.value = 'A'
    await field.trigger('input')
    expect(wrapper.emitted('update:modelValue')).toEqual([['A']])
    vi.advanceTimersByTime(120)
    expect(wrapper.emitted('debounced-input')).toEqual([['A']])
  })

  it('数字类型支持零、小数和约束，模型更新为数字，输入事件保留原始文本', async () => {
    const wrapper = mount(BingInput, { props: { type: 'number', modelValue: 0, clearable: true, min: -10, max: 10, step: 0.5, debounceDelay: 0 } })
    expect(wrapper.get('input').attributes()).toMatchObject({ type: 'number', min: '-10', max: '10', step: '0.5' })
    expect(wrapper.find('.bing-input__clear').exists()).toBe(true)
    await wrapper.get('input').setValue('-2.5')
    expect(wrapper.emitted('update:modelValue')).toEqual([[-2.5]])
    expect(wrapper.emitted('input')?.[0]?.[0]).toBe('-2.5')
    expect(wrapper.emitted('debounced-input')).toEqual([['-2.5']])
    await wrapper.get('input').setValue('')
    expect(wrapper.emitted('update:modelValue')?.at(-1)).toEqual([null])
  })

  it('数字清空不会变成零，普通文本保留前导零', async () => {
    const numeric = mount(BingInput, { props: { type: 'number', modelValue: 0, clearable: true } })
    await numeric.get('.bing-input__clear').trigger('click')
    expect(numeric.emitted('update:modelValue')).toEqual([[null]])
    const text = mount(BingInput)
    await text.get('input').setValue('007')
    expect(text.emitted('update:modelValue')).toEqual([['007']])
  })

  it('搜索框默认可清空，普通字段按需开启，并保留显式关闭', async () => {
    const wrapper = mount(BingInput, { props: { modelValue: '姓名' } })
    expect(wrapper.find('.bing-input__clear').exists()).toBe(false)
    await wrapper.setProps({ type: 'search' })
    expect(wrapper.find('.bing-input__clear').exists()).toBe(true)
    await wrapper.setProps({ clearable: false })
    expect(wrapper.find('.bing-input__clear').exists()).toBe(false)
    await wrapper.setProps({ type: 'text', clearable: true })
    expect(wrapper.find('.bing-input__clear').exists()).toBe(true)
    await wrapper.setProps({ clearable: undefined })
    expect(wrapper.find('.bing-input__clear').exists()).toBe(false)
  })

  it('默认关闭浏览器历史提示，保留显式设置和密码字段语义', async () => {
    const wrapper = mount(BingInput)
    expect(wrapper.get('input').attributes('autocomplete')).toBe('off')
    await wrapper.setProps({ type: 'search', autocomplete: 'on' })
    expect(wrapper.get('input').attributes('autocomplete')).toBe('on')
    await wrapper.setProps({ autocomplete: undefined })
    expect(wrapper.get('input').attributes('autocomplete')).toBe('off')
    for (const autocomplete of ['on', 'off']) {
      expect(mount(BingInput, { props: { autocomplete } }).get('input').attributes('autocomplete')).toBe(autocomplete)
    }
    const password = mount(BingInput, { props: { type: 'password', autocomplete: 'current-password' } })
    expect(password.get('input').attributes('autocomplete')).toBe('current-password')
    expect(password.get('input').attributes('role')).toBeUndefined()
  })

  it('保留接入方的原生关联列表和 ARIA 属性', () => {
    const attrs = { list: 'native-candidates', 'aria-controls': 'search-results', 'aria-autocomplete': 'both' }
    const wrapper = mount(BingInput, { attrs })
    expect(wrapper.get('input').attributes()).toMatchObject(attrs)
    expect(wrapper.get('input').attributes('role')).toBeUndefined()
  })

  it('清除按钮空值时保留槽位，但不进入可访问树和 Tab 顺序', async () => {
    const wrapper = mount(BingInput, { props: { type: 'search', modelValue: '' } })
    const clear = wrapper.get('.bing-input__clear')
    expect(clear.attributes('aria-hidden')).toBe('true')
    expect(clear.attributes('tabindex')).toBe('-1')
    await wrapper.setProps({ modelValue: '内容' })
    expect(clear.attributes('aria-hidden')).toBeUndefined()
    expect(clear.attributes('tabindex')).toBe('0')
    expect(clear.classes()).toContain('is-visible')
  })

  it('仅非组词的普通 Enter 提交，保留原始 keydown 事件', async () => {
    const wrapper = mount(BingInput, { props: { modelValue: '已确认' } })
    const input = wrapper.get('input')
    for (const extra of [{ shiftKey: true }, { ctrlKey: true }, { altKey: true }, { metaKey: true }, { isComposing: true }, { keyCode: 229 }]) {
      await input.trigger('keydown', { key: 'Enter', ...extra })
    }
    await input.trigger('compositionstart')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('enter')).toBeUndefined()
    await input.trigger('compositionend')
    await input.trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('enter')?.[0]?.[0]).toBe('已确认')
    expect(wrapper.emitted('enter')).toHaveLength(1)
    expect(wrapper.emitted('keydown')).toHaveLength(8)
  })

  it('外部 keydown 阻止默认行为时不提交 enter', async () => {
    const wrapper = mount(BingInput, { props: { onKeydown: event => event.preventDefault() } })
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('enter')).toBeUndefined()
  })

  it('数字 Enter 以 min 为网格原点规整，关闭规整可保留原值', async () => {
    const wrapper = mount(BingInput, { props: { type: 'number', modelValue: 0.46, min: 0.1, max: 0.8, step: 0.2 } })
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toEqual([[0.5]])
    expect(wrapper.emitted('enter')?.[0]?.[0]).toBe(0.5)
    // 父级拒绝本次规整时，原生字段与已接受值重新一致。
    expect(wrapper.get('input').element.value).toBe('0.46')
    await wrapper.setProps({ clampOnBlur: false })
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toHaveLength(1)
    expect(wrapper.emitted('enter')?.at(-1)?.[0]).toBe(0.46)
  })

  it('step=any 不对齐网格，按小数步长选择 inputmode 并允许覆盖', async () => {
    const wrapper = mount(BingInput, { props: { type: 'number', modelValue: 0.37, step: 'any', max: 1 } })
    await wrapper.get('input').trigger('keydown', { key: 'Enter' })
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    expect(wrapper.get('input').attributes('inputmode')).toBe('decimal')
    await wrapper.setProps({ step: 2 })
    expect(wrapper.get('input').attributes('inputmode')).toBe('numeric')
    await wrapper.setProps({ step: 0.1 })
    expect(wrapper.get('input').attributes('inputmode')).toBe('decimal')
    await wrapper.setProps({ inputmode: 'tel' } as never)
    expect(wrapper.get('input').attributes('inputmode')).toBe('tel')
  })

  it('密码按钮可关闭，类型或禁用变化时重新隐藏', async () => {
    const wrapper = mount(BingInput, { props: { type: 'password', modelValue: 'secret' } })
    const button = wrapper.get('.bing-input__password')
    expect(button.attributes('aria-label')).toBe('显示密码')
    await button.trigger('click')
    expect(wrapper.get('input').attributes('type')).toBe('text')
    expect(button.attributes('aria-pressed')).toBe('true')
    expect(button.attributes('aria-label')).toBe('隐藏密码')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.setProps({ disabled: true })
    expect(wrapper.get('input').attributes('type')).toBe('password')
    await wrapper.setProps({ disabled: false, passwordToggle: false })
    expect(wrapper.find('.bing-input__password').exists()).toBe(false)
  })

  it('计数使用 UTF-16，兼容动态 maxlength 属性且显式 prop 优先', async () => {
    const wrapper = mount(BingInput, { props: { modelValue: '😀中', showCount: true }, attrs: { maxlength: 4 } })
    expect(wrapper.get('.bing-input__count').text()).toBe('3/4')
    expect(wrapper.get('.bing-input__count').attributes('aria-live')).toBeUndefined()
    await wrapper.setProps({ modelValue: '😀中文' })
    expect(wrapper.get('.bing-input__count').classes()).toContain('is-danger')
    expect(wrapper.get('.bing-text-control__live').text()).toBe('已达到字数上限')
    await wrapper.setProps({ maxlength: 10 } as never)
    expect(wrapper.get('input').attributes('maxlength')).toBe('10')
    await wrapper.setProps({ maxLength: 8 })
    expect(wrapper.get('input').attributes('maxlength')).toBe('8')
    expect(wrapper.get('.bing-input__count').text()).toBe('4/8')
  })

  it('插槽覆盖前后缀文字，并合并单位及外部描述；loading 替换图标', async () => {
    const wrapper = mount(BingInput, {
      props: { prefix: '旧前缀', suffix: '旧后缀', icon: Search, loading: true, ariaDescribedby: 'help' },
      slots: { prefix: '金额', suffix: '元' },
    })
    expect(wrapper.get('.bing-input__prefix').text()).toBe('金额')
    expect(wrapper.get('.bing-input__suffix').text()).toBe('元')
    const descriptions = wrapper.get('input').attributes('aria-describedby')!.split(' ')
    expect(descriptions).toEqual(expect.arrayContaining(['help', wrapper.get('.bing-input__suffix').attributes('id')]))
    expect(wrapper.get('input').attributes('aria-busy')).toBe('true')
    expect(wrapper.findAll('.bing-text-control__spinner')).toHaveLength(1)
    expect(wrapper.find('.bing-input__icon .bing-text-control__spinner').exists()).toBe(true)
    await wrapper.setProps({ icon: undefined })
    expect(wrapper.find('.bing-input__actions .bing-text-control__spinner').exists()).toBe(true)
  })
})
