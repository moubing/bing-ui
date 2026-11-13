import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { Bell, CheckCircle, CircleAlert, FolderOpen, Search, Sparkles, Star } from '@lucide/vue'
import { computed, ref } from 'vue'
import BingButton from '../BingButton/BingButton.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingIcon from './BingIcon.vue'
import type { BingIconProps } from './BingIcon.types'

type StoryArgs = BingIconProps & {
  iconName: 'star' | 'sparkles' | 'bell' | 'alert' | 'check'
}

const icons = {
  star: Star,
  sparkles: Sparkles,
  bell: Bell,
  alert: CircleAlert,
  check: CheckCircle,
} as const

const meta = {
  title: 'Components/BingIcon',
  component: BingIcon,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `
BingIcon 是 bing-ui 的图标规范层。它不负责提供图标全集，也不把组件库绑定到某个固定图标库。

当前推荐：

- 组件库内部图标已固化为本地 SVG 组件（\`src/icons\`，图形来自 Lucide，ISC 许可），不依赖第三方图标库。
- 业务侧可以传入任意 Vue/SVG 图标组件，例如本示例使用的 \`@lucide/vue\`。
- \`BingIcon\` 通过 \`icon\` prop 接收具体 Vue/SVG 图标组件。
- \`BingIcon\` 统一 size、tone、strokeWidth 和可访问性。
- 默认描边为 1.75，与紧凑控件保持一致；按钮、输入框及菜单内优先使用 14 / 16px 图标。展示用图标保留较大尺寸。
- AI 生成图标只能作为设计素材，最终要固化成本地 SVG/Vue 组件后再进入组件库。

可访问性：

- 装饰性图标保持 \`decorative=true\`，组件会设置 \`aria-hidden\`。
- 有语义的图标设置 \`decorative=false\`，并提供 \`label\`。
        `,
      },
    },
  },
  argTypes: {
    icon: {
      description: '具体图标组件。可以是本地固化的 SVG/Vue 图标，或 @lucide/vue 等第三方图标组件。',
      control: false,
      table: {
        disable: true,
      },
    },
    iconName: {
      description: 'Storybook 演示用图标选择，不属于 BingIcon 真实 API。',
      control: 'inline-radio',
      options: ['star', 'sparkles', 'bell', 'alert', 'check'],
    },
    size: {
      description: '图标尺寸 token，也支持 number 或 px 字符串。',
      control: 'inline-radio',
      options: ['xs', 'sm', 'md', 'lg', 'xl'],
    },
    tone: {
      description: '图标语义颜色。',
      control: 'inline-radio',
      options: ['inherit', 'muted', 'primary', 'secondary', 'danger', 'success', 'warning'],
    },
    strokeWidth: {
      description: '线性图标描边粗细，默认 1.75；可按具体图形覆盖。',
      control: {
        type: 'number',
        min: 1,
        max: 3,
        step: 0.25,
      },
    },
    decorative: {
      description: '是否为装饰性图标。装饰性图标会被屏幕阅读器忽略。',
      control: 'boolean',
    },
    label: {
      description: '非装饰性图标的可访问名称。',
      control: 'text',
    },
  },
  args: {
    icon: Sparkles,
    iconName: 'sparkles',
    size: 'md',
    tone: 'primary',
    strokeWidth: 1.75,
    decorative: true,
    label: undefined,
  },
  render: (args) => ({
    components: { BingIcon },
    setup() {
      return {
        args,
        icon: computed(() => icons[args.iconName]),
      }
    },
    template: `
      <BingIcon
        :icon="icon"
        :size="args.size"
        :tone="args.tone"
        :stroke-width="args.strokeWidth"
        :decorative="args.decorative"
        :label="args.label"
      />
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Playground: Story = { name: '交互演示' }

export const Sizes: Story = {
  name: '尺寸',
  args: {
    icon: Star,
    iconName: 'star',
  },
  render: () => ({
    components: { BingIcon },
    setup() {
      return { Star }
    },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <BingIcon :icon="Star" size="xs" tone="primary" />
        <BingIcon :icon="Star" size="sm" tone="primary" />
        <BingIcon :icon="Star" size="md" tone="primary" />
        <BingIcon :icon="Star" size="lg" tone="primary" />
        <BingIcon :icon="Star" size="xl" tone="primary" />
      </div>
    `,
  }),
}

export const Tones: Story = {
  name: '语义颜色',
  args: {
    icon: Star,
    iconName: 'star',
  },
  render: () => ({
    components: { BingIcon },
    setup() {
      return { Star }
    },
    template: `
      <div style="display: flex; align-items: center; gap: 16px;">
        <BingIcon :icon="Star" tone="inherit" />
        <BingIcon :icon="Star" tone="muted" />
        <BingIcon :icon="Star" tone="primary" />
        <BingIcon :icon="Star" tone="secondary" />
        <BingIcon :icon="Star" tone="danger" />
        <BingIcon :icon="Star" tone="success" />
        <BingIcon :icon="Star" tone="warning" />
      </div>
    `,
  }),
}

export const WithControls: Story = {
  name: '搭配控件',
  render: () => ({
    components: { BingIcon, BingButton, BingInput },
    setup() { return { FolderOpen, Search, sizes: ['sm', 'md', 'lg'], values: ref(['', '', '']) } },
    template: `
      <div style="display: grid; gap: 20px; width: min(460px, calc(100vw - 48px));">
        <div v-for="(size, index) in sizes" :key="size" style="display: grid; gap: 8px; min-width: 0;">
          <span style="font-size: 12px; color: var(--bing-muted);">{{ { xs: '超小', sm: '小', md: '中', lg: '大', xl: '超大' }[size] }}</span>
          <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
            <BingButton :size="size" variant="outline">
              <template #prefix><BingIcon :icon="FolderOpen" :size="size === 'lg' ? 18 : 16" /></template>
              打开
            </BingButton>
            <BingInput v-model="values[index]" :size="size" :icon="Search" placeholder="搜索图层" style="flex: 1; min-width: 0;" />
          </div>
        </div>
      </div>
    `,
  }),
}

export const Strokes: Story = {
  name: '描边与语义',
  render: () => ({
    components: { BingIcon },
    setup() { return { Bell, widths: [1.25, 1.75, 2.25] } },
    template: `
      <div style="display: flex; flex-wrap: wrap; gap: 24px; width: min(320px, calc(100vw - 48px));">
        <div v-for="width in widths" :key="width" style="display: grid; justify-items: center; gap: 8px;">
          <BingIcon :icon="Bell" :stroke-width="width" :decorative="false" :label="width + ' 通知'" />
          <span style="font-size: 12px; color: var(--bing-muted);">{{ width }}</span>
        </div>
      </div>
    `,
  }),
}
