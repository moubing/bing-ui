import type { Meta, StoryObj } from '@storybook/vue3-vite'
import BingScrollbar from './BingScrollbar.vue'
import BingButton from '../BingButton/BingButton.vue'
import { ref } from 'vue'

const meta = {
  title: 'Components/BingScrollbar',
  component: BingScrollbar,
  tags: ['autodocs'],
  args: {
    height: 300,
    minThumbSize: 28,
    vertical: true,
    horizontal: false,
    always: true,
    disabled: false,
    focusable: true,
    ariaLabel: '组件示例',
    smooth: true,
  },
  argTypes: {
    height: {
      control: 'text',
    },
    maxHeight: {
      control: 'text',
    },
    minThumbSize: {
      control: {
        type: 'number',
        min: 12,
        max: 80,
        step: 2,
      },
    },
    always: {
      control: 'boolean',
    },
    vertical: {
      control: 'boolean',
    },
    horizontal: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    focusable: {
      control: 'boolean',
      description: '内容溢出时，滚动区域可以通过 Tab 聚焦。',
    },
    smooth: {
      control: 'boolean',
      description: '鼠标滚轮与键盘使用平滑滚动。',
    },
    ariaLabel: {
      control: 'text',
    },
  },
  render: (args) => ({
    components: { BingScrollbar },
    setup() {
      const items = Array.from({ length: 18 }, (_, index) => ({
        id: index + 1,
        title: `内容分组 ${index + 1}`,
        description: index % 2 === 0 ? '交互与即时反馈' : '布局与内容组织',
      }))

      return {
        args,
        items,
      }
    },
    template: `
      <div style="width: min(340px, calc(100vw - 48px)); font-size: 14px; line-height: 20px;">
        <BingScrollbar
          :height="args.height"
          :max-height="args.maxHeight"
          :min-thumb-size="args.minThumbSize"
          :vertical="args.vertical"
          :horizontal="args.horizontal"
          :always="args.always"
          :disabled="args.disabled"
          :focusable="args.focusable"
          :aria-label="args.ariaLabel"
          :smooth="args.smooth"
        >
          <div style="display: grid; gap: 8px; padding: 10px;">
            <div
              v-for="item in items"
              :key="item.id"
              style="padding: 8px 12px; border: 1px solid var(--bing-border); border-radius: 6px; background: var(--bing-surface-solid);"
            >
              <strong style="display: block; color: var(--bing-heading); font-weight: 400;">{{ item.title }}</strong>
              <span style="color: var(--bing-muted); font-size: 12px;">{{ item.description }}</span>
            </div>
          </div>
        </BingScrollbar>
      </div>
    `,
  }),
} satisfies Meta<typeof BingScrollbar>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const StableGutter: Story = {
  name: '稳定占位',
  render: () => ({
    components: { BingScrollbar, BingButton },
    setup: () => ({ expanded: ref(false) }),
    template: `
      <div style="width: min(720px, calc(100vw - 48px)); display: grid; gap: 16px;">
        <BingButton :throttle="false" @click="expanded = !expanded">{{ expanded ? '收起内容' : '增加内容' }}</BingButton>
        <BingScrollbar :height="240" :smooth="false" aria-label="稳定占位示例"
          style="--bing-scrollbar-gutter-left: var(--bing-scrollbar-gutter); border: 1px solid var(--bing-border); border-radius: 8px; background: var(--bing-surface-solid);">
          <div style="width: min(100%, 440px); margin: auto; padding-block: 16px; display: grid; gap: 12px;">
            <strong data-testid="stable-anchor" style="color: var(--bing-heading);">正文始终居中，滚动条出现时保持原位</strong>
            <div v-for="index in (expanded ? 12 : 2)" :key="index"
              style="padding: 12px; border: 1px solid var(--bing-border); border-radius: 6px; color: var(--bing-text);">
              内容 {{ index }}
            </div>
          </div>
        </BingScrollbar>
      </div>
    `,
  }),
}

export const OnInteraction: Story = {
  name: '交互时显示',
  args: {
    always: false,
  },
}

export const SmoothScrolling: Story = {
  name: '平滑滚动',
  args: {
    smooth: {
      duration: 400,
      stepSize: 100,
      pulseScale: 4,
      accelerationDelta: 50,
      accelerationMax: 3,
      smoothTouchpad: true,
      respectReducedMotion: true,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          '自定义滑块与内容区域共享同一滚动控制器，避免滚轮效果重复叠加。',
      },
    },
  },
}

export const NativeScrolling: Story = {
  name: '关闭平滑滚动',
  args: {
    smooth: false,
  },
  parameters: {
    docs: {
      description: {
        story: '设置 smooth 为 false，使用浏览器原生滚轮行为。',
      },
    },
  },
}

export const Horizontal: Story = {
  name: '横向排列',
  args: {
    height: 180,
    horizontal: true,
  },
  render: (args) => ({
    components: { BingScrollbar },
    setup() {
      const columns = Array.from({ length: 10 }, (_, index) => `列 ${index + 1}`)

      return {
        args,
        columns,
      }
    },
    template: `
      <div style="width: min(520px, calc(100vw - 48px)); font-size: 14px; line-height: 20px;">
        <BingScrollbar
          :height="args.height"
          :min-thumb-size="args.minThumbSize"
          :vertical="args.vertical"
          :horizontal="args.horizontal"
          :always="args.always"
          :disabled="args.disabled"
          :focusable="args.focusable"
          :aria-label="args.ariaLabel"
          :smooth="args.smooth"
        >
          <div style="display: grid; grid-template-columns: repeat(10, 160px); gap: 8px; padding: 10px;">
            <div
              v-for="column in columns"
              :key="column"
              style="height: 130px; padding: 12px; border: 1px solid var(--bing-border); border-radius: 6px; background: var(--bing-surface-solid);"
            >
              <strong style="display: block; color: var(--bing-heading); font-weight: 400;">{{ column }}</strong>
              <span style="color: var(--bing-muted); font-size: 12px;">横向滚动内容</span>
            </div>
          </div>
        </BingScrollbar>
      </div>
    `,
  }),
}

export const Disabled: Story = { name: '禁用滚动', args: { disabled: true } }

// 自定义视口用于接管 textarea 等元素自身的滚动，不额外嵌套滚动容器。
export const CustomViewport: StoryObj<typeof meta> = {
  name: '自定义滚动视口',
  render: () => ({
    components: { BingScrollbar },
    setup: () => ({ value: ref(Array.from({ length: 20 }, (_, i) => `第 ${i + 1} 行：原生文本编辑配合组件滚动条。`).join('\n')) }),
    template: `<BingScrollbar :smooth="false" always style="width: min(420px, calc(100vw - 48px)); border: 1px solid var(--bing-border); border-radius: 6px; background: var(--bing-surface-solid);">
      <template #viewport="{ viewportRef, viewportAttrs }">
        <textarea :ref="viewportRef" v-bind="viewportAttrs" v-model="value" aria-label="自定义滚动视口示例"
          style="display: block; box-sizing: border-box; width: 100%; height: 160px; padding: 12px 20px 12px 12px; border: 0; background: transparent; color: var(--bing-text); font: inherit; font-size: 14px; line-height: 20px; resize: vertical;" />
      </template>
    </BingScrollbar>`,
  }),
}
