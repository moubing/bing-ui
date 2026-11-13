import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BingCursor from './BingCursor.vue'
import BingCursorDemo from './BingCursorDemo.vue'

const meta = {
  title: 'Components/BingCursor',
  component: BingCursor,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: `
参考 macOS 光标的黑白轮廓，提供普通箭头、链接手形、禁用、文本、抓取与调整尺寸等 16 种本地 SVG 光标。

默认替换插槽区域内的光标，并自动读取元素的 CSS cursor。内置图形默认使用浏览器原生光标管线，移动无需 JavaScript 更新位置。使用 global 可覆盖当前文档，局部实例优先于全局实例。

- 用 data-bing-cursor="grab" 等属性声明状态，data-bing-cursor="native" 保留原生光标。
- 使用 color、outlineColor、size 和 hotspot 调整图形、尺寸和点击热点。
- 光标统一由浏览器原生绘制，图形按状态直接切换，移动时不更新 DOM 坐标。
- 全局实例按鼠标实际命中元素更新光标；富文本自动模式复用稳定根标记，由局部 CSS 切换文字、链接和控件光标，避免正文节点被编辑器重建。全部停用时跳过命中和样式扫描。
- 触摸、笔输入、强制颜色模式下保留系统光标行为。
- iframe、开放的 Shadow DOM 边界、原生 select、滚动条、浏览器顶层弹窗、原生 HTML 拖放和未内置的 cursor 值保留原生光标。封闭的 Shadow DOM 宿主请设置 data-bing-cursor="native"。局部作用域不自动包含 Teleport 到外部的弹层，可使用 global。
- 光标图片不影响点击、键盘焦点和无障碍树。卸载或禁用后恢复原有样式。
        `,
      },
    },
  },
  argTypes: {
    type: { control: 'select', options: ['auto', 'default', 'pointer', 'not-allowed', 'text', 'grab', 'grabbing', 'move', 'crosshair', 'col-resize', 'row-resize', 'ew-resize', 'ns-resize', 'nwse-resize', 'nesw-resize', 'zoom-in', 'zoom-out'], description: '自动识别或固定光标状态。' },
    size: { control: { type: 'range', min: 16, max: 64, step: 2 }, description: '光标画布尺寸，单位 px。' },
    disabled: { control: 'boolean', description: '停用自定义光标并恢复原生状态。' },
    global: { control: 'boolean', description: '作用于当前文档；默认仅作用于插槽内容。' },
    color: { control: 'color', description: '图形主色。' },
    outlineColor: { control: 'color', description: '描边与手形填充色。' },
    hotspot: { control: 'object', description: '点击热点 [x, y]，单位 px；取整并限制在光标画布内。' },
  },
  args: { type: 'auto', size: 28, global: false, disabled: false },
  render: (args) => ({
    components: { BingCursorDemo },
    setup: () => ({ args }),
    template: '<BingCursorDemo :cursor-props="args" />',
  }),
} satisfies Meta<typeof BingCursor>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: 'mac 风格光标' }

export const Global: Story = {
  name: '全局与局部',
  args: { global: true },
  render: (args) => ({
    components: { BingCursorDemo },
    setup: () => ({ args }),
    template: '<BingCursorDemo :cursor-props="args" variant="global" />',
  }),
}

export const LongEditor: Story = {
  name: '长编辑区滚动',
  render: () => ({
    components: { BingCursor },
    setup: () => ({ rows: Array.from({ length: 200 }, (_, i) => i + 1) }),
    template: `<BingCursor><div contenteditable="true" aria-label="长编辑区" style="height:420px;overflow:auto;margin:24px;padding:20px;border:1px solid #aaa">
      <template v-for="row in rows" :key="row"><p>第 {{ row }} 段：文字和链接保持正常选择与编辑。<a href="#editor">查看链接</a></p>
      <div v-if="row % 5 === 0" contenteditable="false"><button data-bing-cursor="zoom-in" aria-label="图片控件"><img width="240" height="100" alt="光标滚动样本" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='100'%3E%3Crect width='240' height='100' fill='%2392bed6'/%3E%3C/svg%3E" /></button></div></template>
      </div></BingCursor>`,
  }),
}
