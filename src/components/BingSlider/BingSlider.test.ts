import { enableAutoUnmount, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import BingSlider from './BingSlider.vue'
import BingForm from '../BingForm/BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingConfigProvider from '../BingConfigProvider/BingConfigProvider.vue'

enableAutoUnmount(afterEach)
describe('BingSlider', () => {
  it('exposes vertical orientation and keeps Up/Down semantics in RTL', async () => {
    const wrapper = mount(BingSlider, { props: { orientation: 'vertical', defaultValue: 40 }, attrs: { dir: 'rtl' } })
    const input = wrapper.get('input')
    expect(wrapper.classes()).toContain('is-vertical')
    expect(input.attributes('aria-orientation')).toBe('vertical')
    await input.trigger('keydown', { key: 'ArrowUp', shiftKey: true })
    await input.trigger('keyup', { key: 'ArrowUp' })
    expect(input.element.value).toBe('50')
    await input.trigger('keydown', { key: 'ArrowDown' })
    await input.trigger('keyup', { key: 'ArrowDown' })
    expect(wrapper.emitted('change')).toEqual([[50], [49]])
    await wrapper.setProps({ orientation: 'horizontal' })
    expect(input.attributes('aria-orientation')).toBe('horizontal')
  })

  it('resets only from a thumb, normalizes the configured value and commits once', async () => {
    const wrapper = mount(BingSlider, { props: { defaultValue: 80, resetValue: 33, step: 5 } })
    await wrapper.trigger('dblclick')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.get('[data-slider-thumb]').trigger('dblclick')
    expect(wrapper.get('input').element.value).toBe('35')
    expect(wrapper.emitted('update:modelValue')).toEqual([[35]])
    expect(wrapper.emitted('change')).toEqual([[35]])
    await wrapper.get('[data-slider-thumb]').trigger('dblclick')
    expect(wrapper.emitted('change')).toHaveLength(1)
  })

  it('resets the whole range through the shared mark and distance constraints', async () => {
    const wrapper = mount(BingSlider, { props: {
      range: true, defaultValue: [0, 100], resetValue: [40, 42], minDistance: 30,
      marks: [0, 35, 60, 100], snapToMarks: true,
    } })
    await wrapper.get('[data-slider-thumb="1"]').trigger('dblclick')
    expect(wrapper.findAll('input').map(input => input.element.value)).toEqual(['35', '100'])
    expect(wrapper.emitted('update:modelValue')).toEqual([[[35, 100]]])
    expect(wrapper.emitted('change')).toEqual([[[35, 100]]])
  })

  it('ignores reset when unconfigured or disabled and reconciles a rejected reset', async () => {
    const wrapper = mount(BingSlider, { props: { modelValue: 80 } })
    const thumb = wrapper.get('[data-slider-thumb]')
    await thumb.trigger('dblclick')
    await wrapper.setProps({ resetValue: 40, disabled: true })
    await thumb.trigger('dblclick')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.setProps({ disabled: false })
    await thumb.trigger('dblclick')
    expect(wrapper.emitted('update:modelValue')).toEqual([[40]])
    expect(wrapper.get('input').element.value).toBe('80')
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('preserves the default scalar value of zero when the minimum is negative', () => {
    const wrapper = mount(BingSlider, { props: { min: -100, max: 100 } })
    expect(wrapper.get('input').element.value).toBe('0')
  })

  it('updates continuously and emits one commit after native change', async () => {
    const wrapper = mount(BingSlider, { props: { min: 640, max: 1800, step: 20, defaultValue: 880 } })
    const input = wrapper.get('input')
    for (const value of [900, 920, 1000]) {
      input.element.value = String(value)
      await input.trigger('input')
    }
    expect(wrapper.emitted('update:modelValue')).toEqual([[900], [920], [1000]])
    expect(wrapper.emitted('change')).toBeUndefined()
    await input.trigger('change')
    await input.trigger('blur')
    expect(wrapper.emitted('change')).toEqual([[1000]])
  })

  it('commits repeated keyboard updates on release and avoids duplicate native change', async () => {
    const wrapper = mount(BingSlider, { props: { defaultValue: 10 } })
    const input = wrapper.get('input')
    for (const value of [11, 12, 13]) {
      await input.trigger('keydown', { key: 'ArrowRight' })
      input.element.value = String(value)
      await input.trigger('input')
      await input.trigger('change')
    }
    expect(wrapper.emitted('change')).toBeUndefined()
    await input.trigger('keyup', { key: 'ArrowRight' })
    await input.trigger('change')
    expect(wrapper.emitted('change')).toEqual([[13]])
    expect(wrapper.emitted('update:modelValue')).toHaveLength(3)
  })

  it('normalizes decimals, limits and invalid values without rewriting the controlled model', async () => {
    const wrapper = mount(BingSlider, { props: {
      modelValue: 0.36, min: 0.1, max: 0.95, step: 0.1, formatValueText: value => `${value} 单位`,
    } })
    const input = wrapper.get('input')
    expect(input.element.value).toBe('0.4')
    expect(input.attributes('aria-valuetext')).toBe('0.4 单位')
    await wrapper.setProps({ modelValue: 2 })
    expect(input.element.value).toBe('0.9')
    await wrapper.setProps({ modelValue: NaN })
    expect(input.element.value).toBe('0.1')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
    await wrapper.setProps({ modelValue: 0.4 })
    input.element.value = '0.6'
    await input.trigger('input')
    expect(wrapper.emitted('update:modelValue')).toEqual([[0.6]])
    expect(input.element.value).toBe('0.4')
  })

  it('ignores input while disabled and cancels a pending keyboard commit if disabled', async () => {
    const wrapper = mount(BingSlider, { props: { defaultValue: 10 } })
    const input = wrapper.get('input')
    await input.trigger('keydown', { key: 'ArrowRight' })
    input.element.value = '11'
    await input.trigger('input')
    await wrapper.setProps({ disabled: true })
    await input.trigger('keyup', { key: 'ArrowRight' })
    await input.trigger('change')
    expect(wrapper.emitted('change')).toBeUndefined()
    input.element.value = '20'
    await input.trigger('input')
    expect(wrapper.emitted('update:modelValue')).toEqual([[11]])
    expect(input.element.disabled).toBe(true)
  })

  it('handles Shift, PageUp, Home and End with a single commit on key release', async () => {
    const wrapper = mount(BingSlider, { props: { defaultValue: 880, min: 640, max: 1800, step: 20 } })
    const input = wrapper.get('input')
    await input.trigger('keydown', { key: 'ArrowRight', shiftKey: true })
    expect(input.element.value).toBe('1080')
    await input.trigger('keydown', { key: 'PageUp' })
    expect(input.element.value).toBe('1200')
    expect(wrapper.emitted('change')).toBeUndefined()
    await input.trigger('keyup', { key: 'PageUp' })
    expect(wrapper.emitted('change')).toEqual([[1200]])
    await input.trigger('keydown', { key: 'Home' })
    expect(input.element.value).toBe('640')
    await input.trigger('blur')
    expect(wrapper.emitted('change')).toEqual([[1200], [640]])
    await input.trigger('keydown', { key: 'End' })
    expect(input.element.value).toBe('1800')
  })

  it('does not commit a controlled update that the parent rejects', async () => {
    const wrapper = mount(BingSlider, { props: { modelValue: 30 } })
    const input = wrapper.get('input')
    await input.trigger('keydown', { key: 'End' })
    await input.trigger('keyup', { key: 'End' })
    expect(wrapper.emitted('update:modelValue')).toEqual([[100]])
    expect(input.element.value).toBe('30')
    expect(wrapper.emitted('change')).toBeUndefined()
  })

  it('inherits form size, disabled and describedby, while supporting explicit overrides', async () => {
    const wrapper = mount({
      components: { BingSlider, BingForm, BingFormItem, BingConfigProvider },
      template: `<BingConfigProvider size="lg"><BingSlider aria-label="全局尺寸" />
        <BingForm size="sm" disabled><BingFormItem label="正文宽度" help="像素为单位">
          <BingSlider status="warning" />
        </BingFormItem><BingSlider :disabled="false" size="md" status="success" /></BingForm>
      </BingConfigProvider>`,
    })
    const sliders = wrapper.findAll('.bing-slider')
    expect(sliders[0]!.classes()).toContain('bing-slider--lg')
    expect(sliders[1]!.classes()).toEqual(expect.arrayContaining(['bing-slider--sm', 'bing-slider--warning', 'is-disabled']))
    expect(sliders[1]!.get('input').attributes('aria-describedby')).toBeTruthy()
    expect(sliders[2]!.classes()).toEqual(expect.arrayContaining(['bing-slider--md', 'bing-slider--success']))
    expect(sliders[2]!.get('input').element.disabled).toBe(false)
    expect(wrapper.get('label').attributes('for')).toBe(sliders[1]!.get('input').attributes('id'))
    expect(sliders[1]!.get('input').attributes('aria-valuenow')).toBeUndefined()
  })

  it('keeps range thumbs ordered with an aligned minimum distance and tuple commits', async () => {
    const wrapper = mount(BingSlider, { props: { range: true, defaultValue: [20, 70], step: 10, minDistance: 15, ariaLabel: '价格' } })
    const inputs = wrapper.findAll('input')
    expect(inputs.map(input => input.attributes('aria-label'))).toEqual(['价格 最小值', '价格 最大值'])
    await inputs[0]!.trigger('keydown', { key: 'End' })
    expect(inputs.map(input => input.element.value)).toEqual(['50', '70'])
    await inputs[0]!.trigger('keyup', { key: 'End' })
    await inputs[1]!.trigger('keydown', { key: 'Home' })
    await inputs[1]!.trigger('keyup', { key: 'Home' })
    expect(inputs.map(input => input.element.value)).toEqual(['50', '70'])
    expect(wrapper.emitted('change')).toEqual([[[50, 70]]])
    await wrapper.setProps({ thumbAriaLabels: ['最低价格', '最高价格'] })
    expect(inputs.map(input => input.attributes('aria-label'))).toEqual(['最低价格', '最高价格'])
  })

  it('combines the form label with a separate suffix for each range input', () => {
    const wrapper = mount({ components: { BingSlider, BingFormItem }, template: '<BingFormItem label="价格区间"><BingSlider range /></BingFormItem>' })
    const inputs = wrapper.findAll('input')
    const names = inputs.map(input => input.attributes('aria-labelledby')!.split(' ').map(id => wrapper.get('[id="' + id + '"]').text()).join(' '))
    expect(names).toEqual(['价格区间: 最小值', '价格区间: 最大值'])
  })

  it('snaps to nonuniform marks for keys, label clicks and native accessibility input', async () => {
    const wrapper = mount(BingSlider, { props: {
      defaultValue: 0, step: 10, snapToMarks: true,
      marks: [{ value: 0, label: '紧凑' }, { value: 35, label: '标准' }, { value: 100, label: '宽松' }],
    } })
    const input = wrapper.get('input')
    await input.trigger('keydown', { key: 'ArrowRight' })
    await input.trigger('keyup', { key: 'ArrowRight' })
    expect(input.element.value).toBe('35')
    const labels = wrapper.findAll('.bing-slider__mark-label')
    expect(labels.map(label => label.attributes('tabindex'))).toEqual(['-1', '-1', '-1'])
    await labels[2]!.trigger('click')
    expect(input.element.value).toBe('100')
    input.element.value = '99'
    await input.trigger('input')
    await input.trigger('change')
    expect(input.element.value).toBe('35')
    expect(wrapper.emitted('change')).toEqual([[35], [100], [35]])
  })

  it('forwards native form attributes and keeps tooltips separate from accessible value text', () => {
    const wrapper = mount(BingSlider, { props: {
      name: 'width', defaultValue: 20, tooltip: 'always', formatTooltip: value => value + 'px', formatValueText: value => '正文宽度 ' + value + ' 像素',
    }, attrs: { form: 'settings', tabindex: 2 } })
    expect(wrapper.get('input').attributes()).toMatchObject({ name: 'width', form: 'settings', tabindex: '2', 'aria-valuetext': '正文宽度 20 像素' })
    expect(wrapper.get('.bing-slider__tooltip-anchor').attributes('aria-hidden')).toBe('true')
    expect(wrapper.get('.bing-slider__tooltip-body').text()).toBe('20px')
    expect(wrapper.attributes('form')).toBeUndefined()
  })
})
