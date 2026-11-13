// @vitest-environment node
import { createSSRApp, h } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { describe, expect, it } from 'vitest'
import BingSelect from './BingSelect/BingSelect.vue'
import BingDropDown from './BingDropDown/BingDropDown.vue'
import BingDialog from './BingDialog/BingDialog.vue'
import BingToast from './BingToast/BingToast.vue'
import BingDatePicker from './BingDatePicker/BingDatePicker.vue'
import BingColorPicker from './BingColorPicker/BingColorPicker.vue'
import BingTreeSelect from './BingTreeSelect/BingTreeSelect.vue'
import BingImagePreview from './BingImagePreview/BingImagePreview.vue'
import BingFilePreview from './BingFilePreview/BingFilePreview.vue'

describe('SSR overlays', () => {
  it('renders page controls without adding body teleport anchors that can hydrate into the app root', async () => {
    const context: { teleports?: Record<string, string> } = {}
    const html = await renderToString(createSSRApp({
      render: () => h('main', [
        h('h1', '需求列表'),
        h(BingDropDown, {}, { trigger: () => h('button', '用户菜单') }),
        h(BingSelect, { options: [{ label: '已启用', value: 'active' }], modelValue: 'active' }),
        h(BingDialog, { modelValue: false }),
        h(BingToast), h(BingDatePicker), h(BingColorPicker), h(BingTreeSelect),
        h(BingImagePreview), h(BingFilePreview, { type: 'text', content: '正文' }),
      ]),
    }), context)
    expect(html).toContain('需求列表')
    expect(html).toContain('已启用')
    expect(context.teleports?.body ?? '').toBe('')
  })

  it('keeps initially open overlays client-only as well', async () => {
    const context: { teleports?: Record<string, string> } = {}
    await renderToString(createSSRApp({
      render: () => h('main', [
        h(BingDialog, { modelValue: true, title: '初始弹窗' }),
        h(BingDropDown, { open: true }, { trigger: () => h('button', '菜单'), default: () => '菜单内容' }),
        h(BingImagePreview, { modelValue: true, items: [{ src: '/test.png' }] }),
        h(BingFilePreview, { modelValue: true, type: 'text', content: '初始文件' }),
      ]),
    }), context)
    expect(context.teleports?.body ?? '').toBe('')
  })
})
