import { afterEach, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { createApp, defineComponent, h, KeepAlive, nextTick, ref, vShow, withDirectives } from 'vue'
import type { App } from 'vue'
import BingSplitPane from './BingSplitPane.vue'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined
afterEach(() => {
  app?.unmount()
  host?.remove()
  app = host = undefined
})

const frame = () => new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
const sideWidth = () => Math.round(host!.querySelector<HTMLElement>('.bing-split-pane__side')?.getBoundingClientRect().width ?? -1)

/** 记录重新显示后的若干帧侧栏宽度；任何一帧为 0 都意味着侧栏闪烁。 */
async function widthsAfter(show: () => void, frames = 6) {
  show()
  const widths: number[] = []
  await nextTick()
  widths.push(sideWidth())
  for (let i = 0; i < frames; i++) {
    await frame()
    widths.push(sideWidth())
  }
  return widths
}

async function mount(render: () => ReturnType<typeof h>) {
  await page.viewport(1200, 600)
  host = document.createElement('div')
  host.style.cssText = 'width: 1200px; height: 400px;'
  document.body.append(host)
  app = createApp({ render })
  app.mount(host)
  await nextTick()
  // 等待 ResizeObserver 首次测量。
  await frame(); await frame()
}

const Pane = defineComponent({
  name: 'CachedPane',
  setup: () => () => h(BingSplitPane, { sideSize: 360, minSideSize: 320, maxSideSize: 560, minMainSize: 600, style: 'height: 300px' },
    { default: () => h('p', '正文'), side: () => h('p', '文档属性') }),
})
const Other = defineComponent({ name: 'OtherPage', setup: () => () => h('p', '其他页面') })

describe('BingSplitPane（浏览器）', () => {
  it('KeepAlive 切走再返回时侧栏保持原宽度，不先以 0 宽渲染', async () => {
    const current = ref<'pane' | 'other'>('pane')
    await mount(() => h(KeepAlive, null, [current.value === 'pane' ? h(Pane, { key: 'pane' }) : h(Other, { key: 'other' })]))
    expect(sideWidth()).toBe(360)
    current.value = 'other'
    await nextTick()
    // 缓存期间 ResizeObserver 报告 0，组件不得据此压缩侧栏。
    await frame(); await frame(); await frame()
    const widths = await widthsAfter(() => { current.value = 'pane' })
    expect(widths.every(width => width === 360), `返回后的逐帧侧栏宽度：${widths.join(', ')}`).toBe(true)
  })

  it('v-show 隐藏再显示时侧栏保持原宽度', async () => {
    const visible = ref(true)
    await mount(() => withDirectives(h('div', [h(Pane)]), [[vShow, visible.value]]))
    expect(sideWidth()).toBe(360)
    visible.value = false
    await nextTick()
    await frame(); await frame(); await frame()
    const widths = await widthsAfter(() => { visible.value = true })
    expect(widths.every(width => width === 360), `重新显示后的逐帧侧栏宽度：${widths.join(', ')}`).toBe(true)
  })

  it('显示状态下容器真实变窄时仍按可用宽度压缩', async () => {
    await mount(() => h(Pane))
    host!.style.width = '900px'
    await frame(); await frame()
    expect(sideWidth()).toBe(300)
    host!.style.width = '1200px'
    await frame(); await frame()
    expect(sideWidth()).toBe(360)
  })
})
