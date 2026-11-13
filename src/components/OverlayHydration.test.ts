import { createSSRApp, defineComponent, h, nextTick, ref, Suspense } from 'vue'
import { renderToString } from 'vue/server-renderer'
import { flushPromises } from '@vue/test-utils'
import { expect, it, vi } from 'vitest'
import BingDropDown from './BingDropDown/BingDropDown.vue'
import BingSelect from './BingSelect/BingSelect.vue'
import BingDialog from './BingDialog/BingDialog.vue'
import BingToast from './BingToast/BingToast.vue'

it('hydrates async page controls beside global overlays without replacing the page', async () => {
  const open = ref(false)
  const selected = ref('a')
  const Page = defineComponent({ async setup() {
    await Promise.resolve()
    return () => h('main', [
      h('h1', '需求列表'),
      h(BingSelect, { modelValue: selected.value, 'onUpdate:modelValue': value => { selected.value = String(value) },
        options: [{ label: '第一项', value: 'a' }, { label: '第二项', value: 'b' }] }),
      h(BingDialog, { modelValue: open.value, title: '新建需求' }),
    ])
  } })
  const Root = defineComponent({ render: () => h('div', [
    h(BingDropDown, {}, { trigger: () => h('button', '用户菜单') }),
    h(Suspense, {}, { default: () => h(Page) }),
    h(BingToast),
  ]) })
  const context: { teleports?: Record<string, string> } = {}
  const html = await renderToString(createSSRApp(Root), context)
  document.body.innerHTML = `<aside id="before">周围内容</aside><div id="app">${html}</div>${context.teleports?.body ?? ''}<footer id="after">页尾</footer>`
  const originalHeading = document.querySelector('h1')
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  const app = createSSRApp(Root)
  try {
    app.mount('#app')
    await flushPromises()
    await nextTick()
    expect(document.querySelector('h1')).toBe(originalHeading)
    expect(document.querySelector('#before')?.textContent).toBe('周围内容')
    expect(document.querySelector('#after')?.textContent).toBe('页尾')
    document.querySelector<HTMLButtonElement>('.bing-select__trigger')!.click()
    await nextTick()
    const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find(el => el.textContent?.includes('第二项'))
    expect(option).toBeDefined()
    option!.click()
    await nextTick()
    expect(selected.value).toBe('b')
    open.value = true
    await nextTick()
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain('新建需求')
    expect(document.querySelector('h1')).toBe(originalHeading)
    expect([...warn.mock.calls, ...error.mock.calls].filter(args => /hydration/i.test(String(args[0])))).toEqual([])
  } finally {
    app.unmount()
    warn.mockRestore()
    error.mockRestore()
    document.body.innerHTML = ''
  }
})
