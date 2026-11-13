import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { ref } from 'vue'
import BingResizable from './BingResizable.vue'
import type {
  BingResizablePayload,
  BingResizablePosition,
  BingResizableProps,
  BingResizableResolvedSize,
} from './BingResizable.types'

const demoStage = {
  width: 820,
  height: 420,
} as const

function toNumberSize(value: string | number | undefined, fallback: number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  return fallback
}

function getStageWidth() {
  return typeof window === 'undefined' ? demoStage.width : Math.min(demoStage.width, Math.max(160, window.innerWidth - 72))
}

function getDemoSize(size: BingResizableProps['defaultSize']): BingResizableResolvedSize {
  const width = toNumberSize(size?.width, 360)
  const availableWidth = Math.min(width, getStageWidth())
  return { width: availableWidth, height: toNumberSize(size?.height, 220) * availableWidth / width }
}

function getCenteredPosition(size: BingResizableProps['defaultSize']): BingResizablePosition {
  const { width, height } = getDemoSize(size)

  return {
    x: Math.max(0, (getStageWidth() - width) / 2),
    y: Math.max(0, (demoStage.height - height) / 2),
  }
}

function getDemoPosition(args: BingResizableProps): BingResizablePosition {
  if (args.defaultPosition) {
    return {
      x: toNumberSize(args.defaultPosition.x, 0),
      y: toNumberSize(args.defaultPosition.y, 0),
    }
  }

  return getCenteredPosition(args.defaultSize)
}

type StoryArgs = BingResizableProps & {
  onResizeStart: (payload: BingResizablePayload) => void
  onResize: (payload: BingResizablePayload) => void
  onResizeEnd: (payload: BingResizablePayload) => void
  onUpdateSize: (size: BingResizableResolvedSize) => void
  onUpdatePosition: (position: BingResizablePosition) => void
}

const meta = {
  title: 'Components/BingResizable',
  component: BingResizable,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    defaultSize: {
      width: 360,
      height: 220,
    },
    defaultPosition: undefined,
    minWidth: 160,
    minHeight: 110,
    maxWidth: undefined,
    maxHeight: undefined,
    mode: 'fixed',
    snapMode: 'live',
    directions: undefined,
    step: 1,
    disabled: false,
    lockAspectRatio: false,
    contain: false,
    showSize: true,
    handleSize: 12,
    ariaLabel: '可调整尺寸的面板',
    onResizeStart: fn(),
    onResize: fn(),
    onResizeEnd: fn(),
    onUpdateSize: fn(),
    onUpdatePosition: fn(),
  },
  argTypes: {
    size: {
      control: 'object',
    },
    defaultSize: {
      control: 'object',
    },
    position: {
      control: 'object',
    },
    defaultPosition: {
      control: 'object',
    },
    minWidth: {
      control: 'text',
    },
    minHeight: {
      control: 'text',
    },
    maxWidth: {
      control: 'text',
    },
    maxHeight: {
      control: 'text',
    },
    mode: {
      control: 'inline-radio',
      options: ['fixed', 'mirror'],
    },
    snapMode: {
      control: 'inline-radio',
      options: ['live', 'end'],
    },
    directions: {
      control: 'object',
    },
    step: {
      control: 'object',
    },
    disabled: {
      control: 'boolean',
    },
    lockAspectRatio: {
      control: 'boolean',
    },
    contain: {
      control: 'boolean',
    },
    showSize: {
      control: 'boolean',
    },
    handleSize: {
      control: {
        type: 'number',
        min: 6,
        max: 24,
        step: 1,
      },
    },
    ariaLabel: {
      control: 'text',
    },
    onResizeStart: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onResize: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onResizeEnd: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onUpdateSize: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onUpdatePosition: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  render: (args) => ({
    components: { BingResizable },
    setup() {
      return {
        args,
        demoStage,
        getDemoPosition,
        getDemoSize,
      }
    },
    template: `
      <div style="box-sizing: border-box; min-height: 420px; padding: 36px; overflow: visible; background: transparent;">
        <div
          :style="{
            position: 'relative',
            width: demoStage.width + 'px',
            maxWidth: '100%',
            height: demoStage.height + 'px',
            margin: '0 auto'
          }"
        >
        <BingResizable
          :size="args.size"
          :default-size="getDemoSize(args.defaultSize)"
          :position="args.position"
          :default-position="getDemoPosition(args)"
          :min-width="args.minWidth"
          :min-height="args.minHeight"
          :max-width="args.maxWidth"
          :max-height="args.maxHeight"
          :mode="args.mode"
          :snap-mode="args.snapMode"
          :directions="args.directions"
          :step="args.step"
          :disabled="args.disabled"
          :lock-aspect-ratio="args.lockAspectRatio"
          :contain="args.contain"
          :show-size="args.showSize"
          :handle-size="args.handleSize"
          :aria-label="args.ariaLabel"
          @resize-start="args.onResizeStart"
          @resize-end="args.onResizeEnd"
        >
          <div style="box-sizing: border-box; display: grid; height: 100%; min-height: 0; place-items: center; padding: 20px; text-align: center;">
            <div>
              <strong style="display: block; color: var(--bing-heading); font-size: 14px; font-weight: 500;">调整面板尺寸</strong>
              <span style="display: block; margin-top: 8px; color: var(--bing-muted); font-size: 13px; line-height: 1.55;">
                拖动边缘或角落调整尺寸，也可以聚焦手柄后使用方向键。
              </span>
            </div>
          </div>
        </BingResizable>
        </div>
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

const allDirections = [
  'top',
  'right',
  'bottom',
  'left',
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const

export const AllHandlesFixed: Story = {
  name: '全部调整手柄',
  args: {
    directions: [...allDirections],
    mode: 'fixed',
    defaultSize: {
      width: 360,
      height: 220,
    },
  },
}

export const Mirror: Story = {
  name: '镜像调整',
  args: {
    mode: 'mirror',
    directions: [...allDirections],
    defaultSize: {
      width: 360,
      height: 220,
    },
  },
}

export const LockedRatio: Story = {
  name: '固定比例',
  args: {
    lockAspectRatio: true,
    directions: ['bottom-right'],
    step: 8,
    snapMode: 'end',
    defaultSize: {
      width: 360,
      height: 202,
    },
  },
}

export const Contained: Story = {
  name: '限制在容器内',
  args: {
    contain: true,
    defaultPosition: {
      x: 0,
      y: 0,
    },
    defaultSize: {
      width: 300,
      height: 160,
    },
    maxWidth: 620,
    maxHeight: 360,
  },
  render: (args) => ({
    components: { BingResizable },
    setup() {
      return {
        args,
        getDemoSize,
      }
    },
    template: `
      <div style="box-sizing: border-box; position: relative; width: 520px; max-width: 100%; height: 300px; padding: 28px; overflow: hidden; border: 1px dashed rgb(var(--bing-accent-rgb) / 0.34); border-radius: 8px; background: var(--bing-canvas);">
        <BingResizable
          :default-size="getDemoSize(args.defaultSize)"
          :default-position="args.defaultPosition"
          :min-width="args.minWidth"
          :min-height="args.minHeight"
          :max-width="args.maxWidth"
          :max-height="args.maxHeight"
          :mode="args.mode"
          :snap-mode="args.snapMode"
          :step="args.step"
          :contain="args.contain"
          :show-size="args.showSize"
          @resize-start="args.onResizeStart"
          @resize-end="args.onResizeEnd"
        >
          <div style="box-sizing: border-box; display: grid; height: 100%; place-items: center; padding: 18px; text-align: center;">
            <div>
              <span style="display: block; color: var(--bing-heading); font-weight: 500;">限制在容器内</span>
              <span style="display: block; margin-top: 8px; color: var(--bing-muted); font-size: 12px; font-weight: 400;">
                调整尺寸时保持在容器边界内
              </span>
            </div>
          </div>
        </BingResizable>
      </div>
    `,
  }),
}

export const Controlled: Story = {
  name: '受控模式',
  render: () => ({
    components: { BingResizable },
    setup() {
      const size = ref<BingResizableResolvedSize>(getDemoSize({ width: 330, height: 200 }))
      const position = ref<BingResizablePosition>(getCenteredPosition(size.value))

      return {
        demoStage,
        size,
        position,
      }
    },
    template: `
      <div style="box-sizing: border-box; display: grid; align-content: center; justify-items: center; gap: 14px; min-height: 420px; padding: 36px; overflow: visible; background: transparent;">
        <div
          :style="{
            position: 'relative',
            width: demoStage.width + 'px',
            maxWidth: '100%',
            height: demoStage.height + 'px'
          }"
        >
        <BingResizable
          :size="size"
          :position="position"
          :min-width="180"
          :min-height="120"
          :step="10"
          show-size
          @update:size="size = $event"
          @update:position="position = $event"
        >
          <div style="box-sizing: border-box; display: grid; height: 100%; place-items: center; padding: 18px; text-align: center;">
            <span style="color: var(--bing-heading); font-weight: 500;">尺寸与位置同步更新</span>
          </div>
        </BingResizable>
        </div>
        <div style="color: var(--bing-muted); font-size: 12px; font-weight: 400;">
          {{ Math.round(size.width) }} x {{ Math.round(size.height) }} / x {{ Math.round(position.x) }}, y {{ Math.round(position.y) }}
        </div>
      </div>
    `,
  }),
}

export const Disabled: Story = { name: '禁用调整', args: { disabled: true } }
