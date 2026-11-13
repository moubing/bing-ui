import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingForm from './BingForm.vue'
import type { BingFormLayout } from './BingForm.types'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingInput from '../BingInput/BingInput.vue'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined

afterEach(() => {
  app?.unmount()
  host?.remove()
})

describe('BingForm 布局', () => {
  it('纵向布局忽略字段跨列，切回网格后恢复响应式跨列', async () => {
    const layout = ref<BingFormLayout>('grid')
    host = document.createElement('div')
    host.style.width = '720px'
    document.body.appendChild(host)
    app = createApp({
      render: () => h(BingForm, { layout: layout.value, columns: { base: 1, sm: 2 } }, () => [
        ...['名称', '样式'].map(label => h(BingFormItem, { label, showMessage: false }, () => h(BingInput))),
        h(BingFormItem, { label: '描述', span: { sm: 2 }, showMessage: false }, () => h(BingInput)),
      ]),
    })
    app.mount(host)
    await nextTick()
    const fields = Array.from(host.querySelectorAll<HTMLElement>('.bing-form-item'))
    const bounds = () => fields.map(field => field.getBoundingClientRect())

    await expect.poll(() => bounds()[0]!.width < 360).toBe(true)
    expect(bounds()[0]!.top).toBe(bounds()[1]!.top)
    expect(bounds()[2]!.width).toBe(720)

    layout.value = 'stack'
    await expect.poll(() => bounds().every(rect => rect.width === 720)).toBe(true)
    expect(bounds()[0]!.bottom).toBeLessThan(bounds()[1]!.top)
    expect(bounds()[1]!.bottom).toBeLessThan(bounds()[2]!.top)

    layout.value = 'grid'
    await expect.poll(() => bounds()[0]!.top === bounds()[1]!.top).toBe(true)
    expect(bounds()[2]!.width).toBe(720)
    host.style.width = '300px'
    await expect.poll(() => bounds().every(rect => rect.width === 300)).toBe(true)
    expect(bounds()[0]!.bottom).toBeLessThan(bounds()[1]!.top)
  })
})
