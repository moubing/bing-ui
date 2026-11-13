import { afterEach, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { createApp, h, nextTick, reactive, ref } from 'vue'
import type { App, Component, VNodeChild } from 'vue'
import { z } from 'zod'
import BingButton from './BingButton/BingButton.vue'
import BingDialog from './BingDialog/BingDialog.vue'
import BingForm from './BingForm/BingForm.vue'
import type { BingFormExpose } from './BingForm/BingForm.types'
import BingFormItem from './BingFormItem/BingFormItem.vue'
import BingInput from './BingInput/BingInput.vue'
import BingTextarea from './BingTextarea/BingTextarea.vue'
import BingSelect from './BingSelect/BingSelect.vue'
import BingTreeSelect from './BingTreeSelect/BingTreeSelect.vue'
import BingDatePicker from './BingDatePicker/BingDatePicker.vue'
import BingColorPicker from './BingColorPicker/BingColorPicker.vue'
import BingRadioGroup from './BingRadioGroup/BingRadioGroup.vue'
import BingCheckboxGroup from './BingCheckboxGroup/BingCheckboxGroup.vue'
import BingDropDown from './BingDropDown/BingDropDown.vue'
import BingDropDownItem from './BingDropDown/BingDropDownItem.vue'
import BingTable from './BingTable/BingTable.vue'
import BingImagePreview from './BingImagePreview/BingImagePreview.vue'
import '../theme/index.css'

const options = [{ value: 'a', label: '选项 A' }, { value: 'b', label: '选项 B' }]
let app: App | undefined
let host: HTMLElement | undefined
const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!
async function mountScene(render: () => VNodeChild) {
  await page.viewport(1280, 900)
  host = document.createElement('div')
  host.style.cssText = 'width: 900px; margin: 30px;'
  document.body.append(host)
  app = createApp({ render: () => h('div', [render()]) })
  app.mount(host)
  await nextTick()
}
afterEach(() => { app?.unmount(); host?.remove(); app = undefined; host = undefined })

describe('组件组合的浏览器回归', () => {
  it('Dialog → ColorPicker → Select 的 Escape 逐层关闭', async () => {
    const open = ref(true)
    await mountScene(() => h(BingDialog, { modelValue: open.value, 'onUpdate:modelValue': value => { open.value = value }, showPeek: false }, () => h(BingColorPicker)))
    await userEvent.click($('.bing-color-picker__trigger'))
    await expect.poll(() => $('.bing-color-picker__panel')).not.toBeNull()
    await userEvent.click($('.bing-color-picker__format-select .bing-select__trigger'))
    await expect.poll(() => $('.bing-select__panel')).not.toBeNull()
    $('.bing-color-picker__format-select .bing-select__trigger').focus()
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => $('.bing-select__panel')).toBeNull()
    expect($('.bing-color-picker__panel')).not.toBeNull()
    expect($('.bing-color-picker__trigger').getAttribute('aria-expanded')).toBe('true')
    expect(open.value).toBe(true)
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => $('.bing-color-picker__panel')).toBeNull()
    expect(open.value).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(open.value).toBe(false)
  })

  it('DropDown 内 Select 的 Teleport 选项可点击且不会提前关闭父菜单', async () => {
    const value = ref<string | number | null>(null)
    await mountScene(() => h(BingDropDown, {}, {
      trigger: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => h(BingButton, { ...triggerProps, id: 'nested-menu-trigger' }, () => '菜单'),
      default: () => h(BingSelect, { options, searchable: false, modelValue: value.value, 'onUpdate:modelValue': selected => { value.value = selected as string | number | null } }),
    }))
    await userEvent.click($('#nested-menu-trigger'))
    await userEvent.click($('.bing-dropdown__panel .bing-select__trigger'))
    await expect.poll(() => $('.bing-select__panel')).not.toBeNull()
    await userEvent.click($('[role="option"]'))
    expect(value.value).toBe('a')
    await expect.poll(() => $('.bing-select__panel')).toBeNull()
    expect($('.bing-dropdown__panel')).not.toBeNull()
    expect($('#nested-menu-trigger').getAttribute('aria-expanded')).toBe('true')
    await userEvent.click($('.bing-select__trigger'))
    $('.bing-select__trigger').focus()
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => $('.bing-select__panel')).toBeNull()
    expect($('.bing-dropdown__panel')).not.toBeNull()
    expect($('#nested-menu-trigger').getAttribute('aria-expanded')).toBe('true')
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => $('.bing-dropdown__panel')).toBeNull()
  })

  it('弹窗内菜单位于正确层级，Escape 只关闭选择器，Tab 与返回焦点正确', async () => {
    const state = reactive({ open: false, actions: 0 })
    await mountScene(() => [
      h('button', { id: 'open-dialog', onClick: () => { state.open = true } }, '打开'),
      h('button', { id: 'background-action' }, '背景按钮'),
      h(BingDialog, { modelValue: state.open, 'onUpdate:modelValue': value => { state.open = value }, showPeek: false, title: '编辑记录' }, () => [
        h(BingSelect, { options, searchable: false }),
        h(BingDropDown, {}, {
          trigger: ({ triggerProps }: { triggerProps: Record<string, unknown> }) => h(BingButton, { ...triggerProps, id: 'menu-trigger' }, () => '菜单'),
          default: () => h(BingDropDownItem, { title: '编辑', onClick: () => { state.actions++ } }),
        }),
      ]),
    ])
    await userEvent.click($('#open-dialog'))
    await expect.poll(() => !!document.activeElement?.closest('[role="dialog"]')).toBe(true)
    await userEvent.click($('#menu-trigger'))
    await expect.poll(() => {
      const panel = $('.bing-dropdown__panel')
      if (!panel) return false
      const rect = panel.getBoundingClientRect()
      return panel.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2))
    }).toBe(true)
    await userEvent.click($('.bing-dropdown-item'))
    expect(state.actions).toBe(1)
    await expect.poll(() => $('.bing-dropdown__panel')).toBeNull()
    await userEvent.click($('.bing-select__trigger'))
    await expect.poll(() => $('.bing-select__panel')).not.toBeNull()
    await userEvent.keyboard('{Escape}')
    await expect.poll(() => $('.bing-select__panel')).toBeNull()
    expect(state.open).toBe(true)
    const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('.bing-dialog button'))
    buttons.at(-1)!.focus()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement?.closest('[role="dialog"]')).not.toBeNull()
    await userEvent.click($('.bing-dialog__close'))
    await expect.poll(() => $('[role="dialog"]')).toBeNull()
    expect(document.activeElement).toBe($('#open-dialog'))
  })

  it('两个弹窗乱序关闭不会提前解锁或残留锁，一次 Escape 只关闭最上层', async () => {
    const state = reactive({ first: false, second: false, zIndex: 2000 })
    const previousBody = document.body.style.overflow
    const previousHtml = document.documentElement.style.overflow
    await mountScene(() => [
      h(BingDialog, { modelValue: state.first, 'onUpdate:modelValue': value => { state.first = value }, zIndex: state.zIndex, title: '第一个' }),
      h(BingDialog, { modelValue: state.second, 'onUpdate:modelValue': value => { state.second = value }, title: '第二个' }),
    ])
    state.first = true
    await nextTick()
    state.second = true
    await nextTick()
    state.zIndex = 9000
    await nextTick()
    await expect.poll(() => {
      const layers = [...document.querySelectorAll('.bing-dialog-root')].map(element => Number(getComputedStyle(element).zIndex))
      return layers.length === 2 && layers[1]! > layers[0]! && layers[0]! >= 9000
    }).toBe(true)
    await userEvent.keyboard('{Escape}')
    expect(state.second).toBe(false)
    expect(state.first).toBe(true)
    await expect.poll(() => document.querySelectorAll('[role="dialog"]').length).toBe(1)
    state.second = true
    await nextTick()
    state.first = false
    await expect.poll(() => document.querySelectorAll('[role="dialog"]').length).toBe(1)
    expect(document.body.style.overflow).toBe('hidden')
    state.second = false
    await expect.poll(() => document.querySelectorAll('[role="dialog"]').length).toBe(0)
    expect(document.body.style.overflow).toBe(previousBody)
    expect(document.documentElement.style.overflow).toBe(previousHtml)
  })

  it('图片预览和 Dialog 共用滚动锁与 Escape 归属', async () => {
    const state = reactive({ dialog: true, preview: false })
    await mountScene(() => [
      h(BingDialog, { modelValue: state.dialog, 'onUpdate:modelValue': value => { state.dialog = value } }),
      h(BingImagePreview, { modelValue: state.preview, 'onUpdate:modelValue': value => { state.preview = value }, items: [] }),
    ])
    state.preview = true
    await nextTick()
    await userEvent.keyboard('{Escape}')
    expect(state.preview).toBe(false)
    expect(state.dialog).toBe(true)
    await expect.poll(() => $('.bing-image-preview')).toBeNull()
    expect(document.body.style.overflow).toBe('hidden')
  })

  it('多个单选组独立，组与选项的 ID 唯一且通过标签命名', async () => {
    const state = reactive({ first: 'a', second: 'b' })
    await mountScene(() => h(BingForm, { columns: 1 }, () => [
      h(BingFormItem, { label: '第一组' }, () => h(BingRadioGroup, { modelValue: state.first, options, 'onUpdate:modelValue': value => { state.first = String(value) } })),
      h(BingFormItem, { label: '第二组' }, () => h(BingRadioGroup, { modelValue: state.second, options, 'onUpdate:modelValue': value => { state.second = String(value) } })),
      h(BingFormItem, { label: '多选组' }, () => h(BingCheckboxGroup, { options })),
    ]))
    const inputs = Array.from(host!.querySelectorAll<HTMLInputElement>('input[type="radio"]'))
    expect(inputs.map(input => input.checked)).toEqual([true, false, false, true])
    expect(inputs[0]!.name).not.toBe(inputs[2]!.name)
    await userEvent.click(inputs[1]!.closest('label')!)
    expect(inputs.map(input => input.checked)).toEqual([false, true, false, true])
    expect(state).toEqual({ first: 'b', second: 'b' })
    const ids = Array.from(host!.querySelectorAll('[id]')).map(element => element.id)
    expect(new Set(ids).size).toBe(ids.length)
    host!.querySelectorAll('[role="group"],[role="radiogroup"]').forEach(group => {
      expect(document.getElementById(group.getAttribute('aria-labelledby')!)?.className).toBe('bing-form-item__label')
    })
  })

  it.each([BingSelect, BingTreeSelect])('可搜索选择器的内部输入不触发外部字段校验', async Component => {
    const form = ref<BingFormExpose>()
    const model = reactive({ value: '' })
    const schema = z.object({ value: z.string().min(1, '请选择') })
    await mountScene(() => h(BingForm, { ref: form, model, schema, columns: 1 }, () => h(BingFormItem, { prop: 'value', label: '选择' }, () => h(Component as Component, { modelValue: model.value, options, searchable: true }))))
    await userEvent.click($('.bing-select__trigger,.bing-tree-select__trigger'))
    await expect.poll(() => $('input[type="search"]')).not.toBeNull()
    await userEvent.type($('input[type="search"]'), 'A')
    await nextTick()
    expect(form.value!.getErrors()).toEqual({})
    expect($('input[type="search"]').id).not.toBe($('.bing-select__trigger,.bing-tree-select__trigger').id)
  })

  it('控件和按钮继承尺寸与禁用状态，标签对齐并支持显式覆盖', async () => {
    const state = reactive<{ size: 'sm' | 'md' | 'lg'; disabled: boolean }>({ size: 'sm', disabled: false })
    await mountScene(() => h(BingForm, { ...state, columns: 1, labelPosition: 'left' }, () => [
      ...[BingInput, BingSelect, BingTreeSelect, BingDatePicker, BingColorPicker].map((Component, index) => h(BingFormItem, { label: `字段 ${index}` }, () => h(Component))),
      h(BingButton, { id: 'submit', htmlType: 'submit' }, () => '提交'),
      h(BingButton, { id: 'cancel', disabled: false }, () => '取消'),
    ]))
    for (const [size, height] of [['sm', 32], ['md', 36], ['lg', 40]] as const) {
      state.size = size
      await nextTick()
      host!.querySelectorAll('.bing-form-item').forEach(item => {
        const label = item.querySelector('label')!.getBoundingClientRect()
        const control = item.querySelector('.bing-form-item__control')!.firstElementChild!.getBoundingClientRect()
        expect(control.height).toBe(height)
        expect(label.y + label.height / 2).toBe(control.y + control.height / 2)
      })
      expect($('#submit').getBoundingClientRect().height).toBe(height)
    }
    state.disabled = true
    await nextTick()
    expect($<HTMLButtonElement>('#submit').disabled).toBe(true)
    expect($<HTMLInputElement>('.bing-input input').disabled).toBe(true)
    expect($<HTMLButtonElement>('#cancel').disabled).toBe(false)
  })

  it('显式 ID 的标签关联与原生输入属性正确，readonly 隐藏清空按钮', async () => {
    await mountScene(() => h(BingForm, { columns: 1 }, () => [
      h(BingFormItem, { label: '名称' }, () => h(BingInput, { id: 'custom-name', modelValue: 'abcdef', readonly: true, maxlength: 3, required: true, form: 'native-form', class: 'custom-root' })),
      h(BingFormItem, { label: '说明' }, () => h(BingTextarea, { readonly: true, modelValue: '只读', maxLength: 3 })),
    ]))
    const input = $<HTMLInputElement>('#custom-name')
    expect(host!.querySelector<HTMLLabelElement>('label')!.control).toBe(input)
    expect(input.readOnly).toBe(true)
    expect(input.maxLength).toBe(3)
    expect(input.required).toBe(true)
    expect(input.getAttribute('form')).toBe('native-form')
    expect($('.custom-root').hasAttribute('maxlength')).toBe(false)
    expect($('.bing-input__clear')).toBeNull()
    expect($<HTMLTextAreaElement>('textarea').readOnly).toBe(true)
    expect($<HTMLTextAreaElement>('textarea').maxLength).toBe(3)
  })

  it('表格控件的焦点框完整、操作不会误选行，实际行高与虚拟偏移相同', async () => {
    const expectFocusRingVisible = (control: HTMLElement, outset: number) => {
      const bounds = control.getBoundingClientRect()
      expect(outset).toBeGreaterThan(0)
      for (let ancestor = control.parentElement; ancestor; ancestor = ancestor.parentElement) {
        const styles = getComputedStyle(ancestor)
        const clips = (value: string) => /^(hidden|clip|auto|scroll)$/.test(value)
        const clip = ancestor.getBoundingClientRect()
        if (clips(styles.overflowX)) {
          expect(bounds.left - outset, `${ancestor.className} 左边界`).toBeGreaterThanOrEqual(clip.left)
          expect(bounds.right + outset, `${ancestor.className} 右边界`).toBeLessThanOrEqual(clip.right)
        }
        if (clips(styles.overflowY)) {
          expect(bounds.top - outset, `${ancestor.className} 上边界`).toBeGreaterThanOrEqual(clip.top)
          expect(bounds.bottom + outset, `${ancestor.className} 下边界`).toBeLessThanOrEqual(clip.bottom)
        }
        if (ancestor.classList.contains('bing-table')) break
      }
    }
    const selected = ref<Array<string | number>>([])
    const data = Array.from({ length: 500 }, (_, id) => ({ id, name: `记录 ${id}` }))
    const columns = [{ key: 'name', title: '名称' }, { key: 'actions', title: '操作' }, { key: 'select', title: '选项' }]
    await mountScene(() => h(BingTable, { data, columns, height: 400, pagination: false, smoothScroll: false, selectable: true, selectOnRowClick: true, selectedRowKeys: selected.value, 'onUpdate:selectedRowKeys': value => { selected.value = value } }, {
      'cell-actions': ({ row }: { row: { id: number } }) => h(BingButton, { 'data-row-id': row.id }, () => '编辑'),
      'cell-select': () => h(BingSelect, { options }),
    }))
    await userEvent.keyboard('{Tab}')
    const button = $('[data-row-id="0"]')
    button.focus()
    expect(button.matches(':focus-visible')).toBe(true)
    const buttonStyles = getComputedStyle(button)
    expectFocusRingVisible(button, Number.parseFloat(buttonStyles.outlineWidth) + Number.parseFloat(buttonStyles.outlineOffset))
    await userEvent.click(button)
    expect(selected.value).toEqual([])
    await userEvent.click($('.bing-select__trigger'))
    expect(selected.value).toEqual([])
    const selectControl = $('.bing-select__control')
    await expect.poll(() => {
      const lengths = getComputedStyle(selectControl).boxShadow.match(/-?[\d.]+px/g) ?? []
      return Number.parseFloat(lengths[3] ?? '0')
    }).toBe(2)
    const shadowLengths = getComputedStyle(selectControl).boxShadow.match(/-?[\d.]+px/g) ?? []
    expectFocusRingVisible(selectControl, Number.parseFloat(shadowLengths[3] ?? '0'))
    await userEvent.keyboard('{Escape}')
    const viewport = $('.bing-table .bing-scrollbar__viewport')
    await expect.poll(() => {
      const row = $('.bing-table__row')
      // 组合控件可以增高自己的行，默认行高仅是最小值。
      return row.getBoundingClientRect().height >= Number.parseFloat(getComputedStyle(row).getPropertyValue('--_table-row-height'))
    }).toBe(true)
    const height = $('.bing-table__row').getBoundingClientRect().height
    viewport.scrollTop = height * 10
    viewport.dispatchEvent(new Event('scroll'))
    await nextTick()
    for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame)
    const before = $('[data-row-id="15"]').getBoundingClientRect().top
    viewport.scrollTop += height
    viewport.dispatchEvent(new Event('scroll'))
    await nextTick()
    for (let i = 0; i < 6; i++) await new Promise(requestAnimationFrame)
    const after = $('[data-row-id="15"]').getBoundingClientRect().top
    expect(Math.abs(before - after - height)).toBeLessThan(1)
  })
})
