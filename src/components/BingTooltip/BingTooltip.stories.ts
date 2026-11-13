import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import { Bold, Italic, Link, Info, Sparkles } from '@lucide/vue'
import { fn } from 'storybook/test'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingTag from '../BingTag/BingTag.vue'
import BingTooltip from './BingTooltip.vue'
import type {
  BingTooltipCloseReason,
  BingTooltipOpenReason,
  BingTooltipProps,
} from './BingTooltip.types'

type StoryArgs = BingTooltipProps & {
  onOpen: (reason: BingTooltipOpenReason) => void
  onClose: (reason: BingTooltipCloseReason) => void
}

const meta = {
  title: 'Components/BingTooltip',
  component: BingTooltip,
  tags: ['autodocs'],
  parameters: { docs: { description: { component: 'Tooltip 用于简短标签与补充说明。表单、链接列表等富交互内容建议使用 Popover；长内容滚动仅作为尺寸受限时的降级。悬停提示在点击后关闭，键盘焦点和触屏长按均可访问。' } } },
  argTypes: {
    modelValue: {
      control: false,
    },
    content: {
      control: 'text',
    },
    trigger: {
      control: 'inline-radio',
      options: ['hover', 'click', 'manual'],
    },
    placement: {
      control: 'inline-radio',
      options: ['top', 'right', 'bottom', 'left'],
    },
    align: {
      control: 'inline-radio',
      options: ['start', 'center', 'end'],
    },
    disabled: {
      control: 'boolean',
    },
    interactive: {
      control: 'boolean',
    },
    skipDelay: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
    suppressWhenExpanded: { control: 'boolean' },
    scrollable: { control: 'boolean' },
    shortcut: { control: 'text' },
    tone: { control: 'inline-radio', options: ['surface', 'inverse'] },
    glass: {
      control: 'boolean',
    },
    glassBlur: {
      control: { type: 'number', min: 0, max: 32, step: 1 },
    },
    glassOpacity: {
      control: { type: 'number', min: 0, max: 1, step: 0.05 },
    },
    glassSaturation: {
      control: { type: 'number', min: 0, max: 2, step: 0.05 },
    },
    openDelay: {
      control: {
        type: 'number',
        min: 0,
        max: 800,
        step: 20,
      },
    },
    closeDelay: {
      control: {
        type: 'number',
        min: 0,
        max: 800,
        step: 20,
      },
    },
    offset: {
      control: {
        type: 'number',
        min: 4,
        max: 28,
        step: 1,
      },
    },
    viewportPadding: {
      control: {
        type: 'number',
        min: 0,
        max: 40,
        step: 1,
      },
    },
    maxWidth: {
      control: 'text',
    },
    zIndex: {
      control: false,
    },
    closeOnOutside: {
      control: 'boolean',
    },
    closeOnEsc: {
      control: 'boolean',
    },
    id: {
      control: false,
    },
    ariaLabel: {
      control: 'text',
    },
    onOpen: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onClose: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    content: '查看补充说明，了解这个选项的作用。',
    trigger: 'hover',
    placement: 'top',
    align: 'center',
    disabled: false,
    interactive: true,
    skipDelay: 300,
    suppressWhenExpanded: true,
    scrollable: false,
    tone: 'surface',
    shortcut: undefined,
    glass: true,
    glassBlur: undefined,
    glassOpacity: undefined,
    glassSaturation: undefined,
    openDelay: 180,
    closeDelay: 90,
    offset: 10,
    viewportPadding: 12,
    maxWidth: '280px',
    zIndex: 3200,
    closeOnOutside: true,
    closeOnEsc: true,
    ariaLabel: undefined,
    onOpen: fn(),
    onClose: fn(),
  },
  render: (args) => ({
    components: { BingButton, BingIcon, BingTooltip, Info },
    setup() {
      return {
        args,
        Info,
      }
    },
    template: `
      <div style="display: grid; place-items: center; min-height: 320px; padding: 24px; box-sizing: border-box; max-width: calc(100vw - 32px);">
        <BingTooltip
          :content="args.content"
          :trigger="args.trigger"
          :placement="args.placement"
          :align="args.align"
          :disabled="args.disabled"
          :interactive="args.interactive"
          :skip-delay="args.skipDelay"
          :suppress-when-expanded="args.suppressWhenExpanded"
          :scrollable="args.scrollable"
          :shortcut="args.shortcut"
          :tone="args.tone"
          :glass="args.glass"
          :glass-blur="args.glassBlur"
          :glass-opacity="args.glassOpacity"
          :glass-saturation="args.glassSaturation"
          :open-delay="args.openDelay"
          :close-delay="args.closeDelay"
          :offset="args.offset"
          :viewport-padding="args.viewportPadding"
          :max-width="args.maxWidth"
          :z-index="args.zIndex"
          :close-on-outside="args.closeOnOutside"
          :close-on-esc="args.closeOnEsc"
          :aria-label="args.ariaLabel"
          @open="args.onOpen"
          @close="args.onClose"
        >
          <BingButton variant="tertiary">
            查看提示
            <template #suffix>
              <BingIcon :icon="Info" size="sm" />
            </template>
          </BingButton>
        </BingTooltip>
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Hover: Story = { name: '悬停提示' }

export const Click: Story = {
  name: '点击提示',
  args: {
    content: '再次点击、点击外部或按 Escape 可关闭提示。',
    trigger: 'click',
    placement: 'bottom',
  },
}

export const RichContent: Story = {
  name: '丰富内容',
  args: {
    trigger: 'hover',
    placement: 'right',
    maxWidth: '320px',
  },
  render: (args) => ({
    components: { BingButton, BingIcon, BingTag, BingTooltip, Sparkles },
    setup() {
      return {
        args,
        Sparkles,
      }
    },
    template: `
      <div style="display: grid; place-items: center; min-height: 360px; padding: 24px; box-sizing: border-box; max-width: calc(100vw - 32px);">
        <BingTooltip
          :trigger="args.trigger"
          :placement="args.placement"
          :align="args.align"
          :interactive="args.interactive"
          :open-delay="args.openDelay"
          :close-delay="args.closeDelay"
          :offset="args.offset"
          :viewport-padding="args.viewportPadding"
          :max-width="args.maxWidth"
          @open="args.onOpen"
          @close="args.onClose"
        >
          <BingButton variant="secondary">
            动效说明
            <template #prefix>
              <BingIcon :icon="Sparkles" size="sm" />
            </template>
          </BingButton>
          <template #content>
            <div style="display: grid; gap: 8px; min-width: 220px;">
              <strong class="bing-tooltip__title">交互反馈</strong>
              <span class="bing-tooltip__muted">
                保留清晰的操作反馈，支持标题、说明与标签。
              </span>
              <div style="display: flex; gap: 6px; flex-wrap: wrap;">
                <BingTag size="sm" variant="soft">悬停</BingTag>
                <BingTag size="sm" variant="soft">说明</BingTag>
              </div>
            </div>
          </template>
        </BingTooltip>
      </div>
    `,
  }),
}

export const SharedPanel: Story = {
  name: '共享面板移动',
  render: () => ({
    components: { BingButton, BingIcon, BingTooltip, Info, Sparkles },
    setup() {
      return {
        Info,
        Sparkles,
      }
    },
    template: `
      <div style="display: flex; min-height: 360px; align-items: center; justify-content: center; gap: 14px; padding: 24px; box-sizing: border-box; max-width: calc(100vw - 32px); flex-wrap: wrap;">
        <BingTooltip trigger="hover" placement="top" :open-delay="0" :close-delay="140" max-width="280px">
          <BingButton variant="tertiary">
            动效
            <template #prefix>
              <BingIcon :icon="Sparkles" size="sm" />
            </template>
          </BingButton>
          <template #content>
            <div style="display: grid; gap: 6px; min-width: 190px;">
              <strong class="bing-tooltip__title">动效提示</strong>
              <span class="bing-tooltip__muted">连续移动鼠标时，提示面板会平滑移动到下一个控件。</span>
            </div>
          </template>
        </BingTooltip>

        <BingTooltip trigger="hover" placement="top" :open-delay="0" :close-delay="140" max-width="300px">
          <BingButton variant="secondary">
            详情
            <template #suffix>
              <BingIcon :icon="Info" size="sm" />
            </template>
          </BingButton>
          <template #content>
            <div style="display: grid; gap: 7px; min-width: 220px;">
              <strong class="bing-tooltip__title">详细说明</strong>
              <span class="bing-tooltip__muted">切换目标后，面板会适应新的内容宽度，保持阅读连贯。</span>
            </div>
          </template>
        </BingTooltip>

        <BingTooltip content="这是一个简短的提示。" trigger="hover" placement="top" :open-delay="0" :close-delay="140">
          <BingButton variant="ghost">简短提示</BingButton>
        </BingTooltip>
      </div>
    `,
  }),
}

export const Manual: Story = {
  name: '手动控制',
  args: {
    trigger: 'manual',
    placement: 'top',
    content: '点击旁边的按钮可以显示或隐藏这段提示。',
    maxWidth: '300px',
  },
  render: (args) => ({
    components: { BingButton, BingIcon, BingTooltip },
    setup() {
      const tooltipRef = ref<InstanceType<typeof BingTooltip> | null>(null)

      function toggleTooltip() {
        tooltipRef.value?.toggle()
      }

      return {
        args,
        toggleTooltip,
        tooltipRef,
      }
    },
    template: `
      <div style="display: flex; min-height: 340px; align-items: center; justify-content: center; gap: 16px; padding: 24px; box-sizing: border-box; max-width: calc(100vw - 32px); flex-wrap: wrap;">
        <BingTooltip
          ref="tooltipRef"
          :content="args.content"
          :trigger="args.trigger"
          :placement="args.placement"
          :align="args.align"
          :interactive="args.interactive"
          :offset="args.offset"
          :viewport-padding="args.viewportPadding"
          :max-width="args.maxWidth"
          @open="args.onOpen"
          @close="args.onClose"
        >
          <span style="display: inline-flex; min-height: 36px; align-items: center; padding: 0 12px; border: 1px solid var(--bing-control-border); border-radius: 6px; background: var(--bing-control-bg); color: var(--bing-text); font-size: 14px; font-weight: 400;">提示目标</span>
        </BingTooltip>
        <BingButton variant="secondary" @click="toggleTooltip">切换提示</BingButton>
      </div>
    `,
  }),
}

export const Placements: Story = {
  name: '箭头与方向',
  render: () => ({
    components: { BingButton, BingTooltip },
    setup: () => ({ placements: [
      { value: 'top', label: '上方' },
      { value: 'right', label: '右侧' },
      { value: 'bottom', label: '下方' },
      { value: 'left', label: '左侧' },
    ] as const }),
    template: `
      <div style="display: grid; grid-template-columns: repeat(2, max-content); place-content: center; gap: 40px; min-height: 320px; padding: 24px;">
        <BingTooltip
          v-for="placement in placements"
          :key="placement.value"
          :placement="placement.value"
          :content="'提示出现在' + placement.label + '，箭头指向目标。'"
          :open-delay="0"
        >
          <BingButton variant="tertiary">{{ placement.label }}</BingButton>
        </BingTooltip>
      </div>
    `,
  }),
}

export const EdgeAware: Story = {
  name: '边界避让',
  args: {
    content: '提示会根据可用空间调整方向，并保持在窗口边界内。',
    placement: 'top',
    align: 'end',
    maxWidth: '260px',
  },
  render: (args) => ({
    components: { BingButton, BingTooltip },
    setup() {
      return {
        args,
      }
    },
    template: `
      <div style="box-sizing: border-box; display: grid; width: min(960px, calc(100vw - 24px)); min-height: min(420px, calc(100vh - 48px)); padding: 12px; place-items: start end;">
        <BingTooltip
          :content="args.content"
          :trigger="args.trigger"
          :placement="args.placement"
          :align="args.align"
          :open-delay="args.openDelay"
          :close-delay="args.closeDelay"
          :offset="args.offset"
          :viewport-padding="args.viewportPadding"
          :max-width="args.maxWidth"
          @open="args.onOpen"
          @close="args.onClose"
        >
          <BingButton variant="tertiary" size="sm">靠近边缘</BingButton>
        </BingTooltip>
      </div>
    `,
  }),
}

export const Disabled: Story = {
  name: '禁用提示',
  args: { disabled: true },
}

export const Overflow: Story = {
  name: '长内容降级滚动',
  parameters: { docs: { description: { story: '优先将长说明放入 Popover 或独立页面。这里刻意展示溢出降级：只在有溢出时启用滚动，并按触发器所在方向限制高度。' } } },
  render: () => ({
    components: { BingButton, BingTooltip },
    setup: () => ({ lines: Array.from({ length: 40 }, (_, i) => `第 ${i + 1} 项：检查图层设置与使用说明。`) }),
    template: `<BingTooltip trigger="click" :max-width="300">
      <BingButton variant="secondary">查看完整说明</BingButton>
      <template #content><div style="display: grid; gap: 8px;"><p v-for="line in lines" :key="line">{{ line }}</p></div></template>
    </BingTooltip>`,
  }),
}

export const ToolbarBrowsing: Story = {
  name: '工具栏连续浏览',
  render: () => ({
    components: { BingButton, BingIcon, BingTooltip },
    setup: () => ({ items: [
      { label: '加粗', shortcut: ['Ctrl', 'B'], icon: Bold },
      { label: '斜体', shortcut: ['Ctrl', 'I'], icon: Italic },
      { label: '插入链接', shortcut: ['Ctrl', 'K'], icon: Link },
    ] }),
    template: `<div style="display:grid;place-content:center;gap:48px;min-height:340px">
      <div style="display:flex;gap:8px" role="toolbar" aria-label="文字格式">
        <BingTooltip v-for="item in items" :key="item.label" :content="item.label" :shortcut="item.shortcut" placement="bottom">
          <BingButton variant="ghost" icon-only :aria-label="item.label"><BingIcon :icon="item.icon" :size="18" /></BingButton>
        </BingTooltip>
      </div><p style="font-size:13px;color:var(--bing-muted)">连续悬停浏览；点击执行后提示收起。也可用 Tab 或触屏长按。</p>
    </div>`,
  }),
}

export const DisabledButton: Story = {
  name: '禁用按钮说明',
  render: () => ({
    components: { BingButton, BingTooltip },
    template: `<div style="display:grid;place-items:center;min-height:300px">
      <BingTooltip content="完成必填项后即可发布">
        <span tabindex="0" aria-label="发布" style="display:inline-flex;cursor:not-allowed">
          <BingButton disabled style="pointer-events:none">发布</BingButton>
        </span>
      </BingTooltip>
    </div>`,
  }),
}

export const Inverse: Story = {
  name: '反色与快捷键',
  args: { content: '打开命令面板', tone: 'inverse', shortcut: 'Ctrl+Shift+P' },
}

export const ContentChanges: Story = {
  name: '内容与尺寸变化',
  render: () => ({
    components: { BingButton, BingTooltip },
    setup: () => ({ detailed: ref(false) }),
    template: `<div style="display:grid;place-items:center;min-height:300px">
      <BingTooltip trigger="manual" :content="detailed ? '已复制，可以粘贴链接分享给其他人。' : '复制链接'" v-slot="{ show }">
        <BingButton @click="detailed = !detailed; show()">切换提示文案</BingButton>
      </BingTooltip>
    </div>`,
  }),
}

export const SharedMovement: Story = {
  name: '近距离与远距离切换',
  render: () => ({
    components: { BingButton, BingTooltip },
    template: `<div style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:36px;min-height:360px;padding:24px">
      <div style="display:flex;gap:12px">
        <BingTooltip content="上一个位置" :open-delay="0"><BingButton variant="tertiary">邻近一</BingButton></BingTooltip>
        <BingTooltip content="新内容单独淡入，背景适应宽度" :open-delay="0"><BingButton variant="tertiary">邻近二</BingButton></BingTooltip>
      </div>
      <BingTooltip content="远距离切换先淡出，再在目标处出现" :open-delay="0"><BingButton variant="secondary">远处</BingButton></BingTooltip>
      <BingTooltip content="更换方向时也采用淡出淡入" placement="bottom" :open-delay="0"><BingButton variant="ghost">换边</BingButton></BingTooltip>
    </div>`,
  }),
}
