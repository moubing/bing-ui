import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { ref } from 'vue'
import { GripVertical, Sparkles } from '@lucide/vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingTag from '../BingTag/BingTag.vue'
import BingSortableList from './BingSortableList.vue'
import type {
  BingSortableListKey,
  BingSortableListPayload,
  BingSortableListProps,
} from './BingSortableList.types'

interface DemoItem {
  id: string
  title: string
  meta: string
  tone: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
}

const demoItems: DemoItem[] = [
  {
    id: 'project',
    title: '项目',
    meta: '项目及子任务',
    tone: 'primary',
  },
  {
    id: 'owner',
    title: '负责人',
    meta: '协作成员',
    tone: 'secondary',
  },
  {
    id: 'status',
    title: '状态',
    meta: '工作流程',
    tone: 'success',
  },
  {
    id: 'progress',
    title: '进度',
    meta: '完成比例',
    tone: 'warning',
  },
  {
    id: 'risk',
    title: '风险',
    meta: '风险等级',
    tone: 'danger',
  },
]

type StoryArgs = BingSortableListProps<DemoItem> & {
  onReorder: (payload: BingSortableListPayload<DemoItem>) => void
}

const meta = {
  title: 'Components/BingSortableList',
  component: BingSortableList,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    items: demoItems,
    order: undefined,
    itemKey: 'id',
    axis: 'vertical',
    disabled: false,
    keyboard: true,
    flip: true,
    reorderMode: 'drop',
    duration: 0.26,
    settleDuration: 0.16,
    dragThreshold: 4,
    ariaLabel: '列顺序',
    handleAriaLabel: '调整列顺序',
    onReorder: fn(),
  },
  argTypes: {
    items: {
      control: 'object',
    },
    order: {
      control: 'object',
    },
    itemKey: {
      control: 'text',
    },
    itemDisabled: {
      control: false,
    },
    disabledKeys: {
      control: 'object',
    },
    axis: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
    },
    disabled: {
      control: 'boolean',
    },
    keyboard: {
      control: 'boolean',
    },
    flip: {
      control: 'boolean',
    },
    reorderMode: {
      control: 'inline-radio',
      options: ['drop', 'live'],
    },
    duration: {
      control: {
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
      },
    },
    settleDuration: {
      control: {
        type: 'number',
        min: 0,
        max: 1,
        step: 0.01,
      },
    },
    dragThreshold: {
      control: {
        type: 'number',
        min: 0,
        max: 16,
        step: 1,
      },
    },
    ariaLabel: {
      control: 'text',
    },
    handleAriaLabel: {
      control: 'text',
    },
    onReorder: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  render: (args) => ({
    components: { BingIcon, BingSortableList, BingTag },
    setup() {
      const order = ref<BingSortableListKey[]>(args.order ?? demoItems.map((item) => item.id))

      return {
        args,
        order,
        GripVertical,
        Sparkles,
      }
    },
    template: `
      <div style="box-sizing: border-box; width: min(360px, calc(100vw - 48px));">
        <BingSortableList
          v-model:order="order"
          :items="args.items"
          :item-key="args.itemKey"
          :axis="args.axis"
          :disabled="args.disabled"
          :disabled-keys="args.disabledKeys"
          :item-disabled="args.itemDisabled"
          :keyboard="args.keyboard"
          :flip="args.flip"
          :reorder-mode="args.reorderMode"
          :duration="args.duration"
          :settle-duration="args.settleDuration"
          :drag-threshold="args.dragThreshold"
          :aria-label="args.ariaLabel"
          :handle-aria-label="args.handleAriaLabel"
          @reorder="args.onReorder"
        >
          <template #default="{ item, handleProps, dragging }">
            <div
              class="sortable-story-item"
              :class="{ 'is-dragging': dragging }"
              style="display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--bing-border); border-radius: 6px; background: var(--bing-surface-solid); box-shadow: var(--bing-shadow-sm);"
            >
              <span v-bind="handleProps" style="display: grid; width: 22px; height: 28px; place-items: center; border-radius: 4px; color: var(--bing-muted);">
                <BingIcon :icon="GripVertical" size="xs" :stroke-width="1.75" />
              </span>
              <span style="min-width: 0;">
                <strong style="display: block; color: var(--bing-heading); font-size: 14px; font-weight: 400; line-height: 20px;">{{ item.title }}</strong>
                <span style="display: block; margin-top: 2px; color: var(--bing-muted); font-size: 12px; font-weight: 400;">{{ item.meta }}</span>
              </span>
              <BingTag size="sm" variant="soft" :tone="item.tone" :icon="Sparkles">{{ item.title }}</BingTag>
            </div>
          </template>
        </BingSortableList>
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const LockedItem: Story = {
  name: '锁定条目',
  args: {
    disabledKeys: ['status'],
  },
}

export const WholeCardDrag: Story = {
  name: '整卡拖拽',
  render: (args) => ({
    components: { BingSortableList, BingTag },
    setup() {
      const order = ref<BingSortableListKey[]>(args.order ?? demoItems.map((item) => item.id))

      return {
        args,
        order,
      }
    },
    template: `
      <div style="box-sizing: border-box; width: min(360px, calc(100vw - 48px));">
        <BingSortableList
          v-model:order="order"
          :items="args.items"
          :item-key="args.itemKey"
          :axis="args.axis"
          :disabled="args.disabled"
          :disabled-keys="args.disabledKeys"
          :item-disabled="args.itemDisabled"
          :keyboard="args.keyboard"
          :flip="args.flip"
          :reorder-mode="args.reorderMode"
          :duration="args.duration"
          :settle-duration="args.settleDuration"
          :drag-threshold="args.dragThreshold"
          :aria-label="args.ariaLabel"
          :handle-aria-label="args.handleAriaLabel"
          @reorder="args.onReorder"
        >
          <template #default="{ item, handleProps, dragging }">
            <div
              v-bind="handleProps"
              class="sortable-story-item"
              :class="{ 'is-dragging': dragging }"
              style="display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 8px 12px; border: 1px solid var(--bing-border); border-radius: 6px; background: var(--bing-surface-solid); box-shadow: var(--bing-shadow-sm);"
            >
              <span style="min-width: 0;">
                <strong style="display: block; color: var(--bing-heading); font-size: 14px; font-weight: 400; line-height: 20px;">{{ item.title }}</strong>
                <span style="display: block; margin-top: 2px; color: var(--bing-muted); font-size: 12px; font-weight: 400;">{{ item.meta }}</span>
              </span>
              <BingTag size="sm" variant="soft" :tone="item.tone">{{ item.title }}</BingTag>
            </div>
          </template>
        </BingSortableList>
      </div>
    `,
  }),
}

export const Horizontal: Story = {
  name: '横向排列',
  args: {
    axis: 'horizontal',
  },
  render: (args) => ({
    components: { BingIcon, BingSortableList, BingTag },
    setup() {
      const order = ref<BingSortableListKey[]>(args.order ?? demoItems.map((item) => item.id))

      return {
        args,
        order,
        GripVertical,
      }
    },
    template: `
      <BingSortableList
        v-model:order="order"
        style="width: min(620px, calc(100vw - 48px)); --bing-sortable-gap: 8px;"
        :items="args.items"
        :item-key="args.itemKey"
        :axis="args.axis"
        :disabled="args.disabled"
          :disabled-keys="args.disabledKeys"
          :item-disabled="args.itemDisabled"
        :keyboard="args.keyboard"
        :flip="args.flip"
        :reorder-mode="args.reorderMode"
        :duration="args.duration"
        :settle-duration="args.settleDuration"
        :drag-threshold="args.dragThreshold"
        :aria-label="args.ariaLabel"
        :handle-aria-label="args.handleAriaLabel"
        @reorder="args.onReorder"
      >
        <template #default="{ item, handleProps }">
          <div style="display: inline-grid; grid-template-columns: auto minmax(0, 1fr); align-items: center; gap: 8px; min-width: 136px; padding: 6px 10px; border: 1px solid var(--bing-border); border-radius: 6px; background: var(--bing-surface-solid); box-shadow: var(--bing-shadow-sm);">
            <span v-bind="handleProps" style="display: grid; place-items: center; width: 22px; height: 22px; border-radius: 6px; color: var(--bing-muted);">
              <BingIcon :icon="GripVertical" size="xs" :stroke-width="1.75" />
            </span>
            <span style="overflow: hidden; color: var(--bing-heading); font-size: 13px; font-weight: 400; text-overflow: ellipsis; white-space: nowrap;">{{ item.title }}</span>
          </div>
        </template>
      </BingSortableList>
    `,
  }),
}

export const Disabled: Story = { name: '整组禁用', args: { disabled: true } }
