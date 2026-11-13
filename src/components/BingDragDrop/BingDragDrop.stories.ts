import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { reactive } from 'vue'
import BingToast from '../BingToast/BingToast.vue'
import { bingToast } from '../BingToast/BingToast.service'
import BingDragDrop from './BingDragDrop.vue'
import BingDraggable from './BingDraggable.vue'
import BingDropZone from './BingDropZone.vue'
import BingDragOverlay from './BingDragOverlay.vue'
import type {
  BingDragDropDropPayload,
  BingDragDropItem,
  BingDragDropProps,
} from './BingDragDrop.types'

type Status = 'queued' | 'doing' | 'testing' | 'done'

interface Task {
  id: string
  title: string
  status: Status
}

const columns: { id: Status; name: string; color: string }[] = [
  { id: 'queued', name: '待处理', color: '#2f6fed' },
  { id: 'doing', name: '进行中', color: '#c15d2b' },
  { id: 'testing', name: '测试中', color: '#0891b2' },
]

function createTasks(): Task[] {
  return [
    { id: 'REQ-12', title: '导出筛选结果为表格', status: 'queued' },
    { id: 'REQ-15', title: '评论支持提及成员', status: 'queued' },
    { id: 'BUG-7', title: '暗色主题下表头对比度不足', status: 'queued' },
    { id: 'REQ-9', title: '首页改为个人工作台', status: 'doing' },
    { id: 'BUG-4', title: '粘贴图片偶发丢失', status: 'doing' },
    { id: 'REQ-3', title: '版本对比支持表格', status: 'testing' },
  ]
}

type StoryArgs = BingDragDropProps & {
  onDrop: (payload: BingDragDropDropPayload<Task>) => void
}

const styles = `
  .dd-story { box-sizing: border-box; display: grid; gap: 16px; width: min(880px, calc(100vw - 48px)); color: var(--bing-text); font-size: 14px; line-height: 1.5; }
  .dd-story__columns { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .dd-story__column { display: grid; align-content: start; gap: 8px; min-height: 260px; padding: 12px; border: 1px dashed transparent; border-radius: 8px; background: var(--bing-surface); transition: background 160ms, border-color 160ms; }
  .dd-story__column.is-target { border-color: color-mix(in srgb, var(--status) 40%, transparent); }
  .dd-story__column.is-over { border-color: var(--status); background: color-mix(in srgb, var(--status) 8%, var(--bing-surface)); }
  .dd-story__head { display: flex; align-items: baseline; gap: 8px; margin: 0 0 4px; color: var(--bing-heading); font-size: 14px; font-weight: 600; }
  .dd-story__hint { margin-left: auto; color: var(--status); font-size: 12px; }
  .dd-story__card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 44px; padding: 8px 8px 8px 12px; border: 1px solid var(--bing-border); border-radius: 8px; background: var(--bing-surface-solid); }
  .dd-story__card.is-drag-source { opacity: 0.35; border-style: dashed; }
  .dd-story__card a { min-width: 0; color: inherit; text-decoration: none; }
  .dd-story__card small { display: block; color: var(--bing-muted); font-size: 12px; }
  .dd-story__card button { width: 32px; height: 32px; border: 0; border-radius: 6px; background: transparent; color: var(--bing-muted); cursor: pointer; }
  .dd-story__overlay { box-sizing: border-box; height: 100%; padding: 8px 12px; border: 1px solid var(--bing-border); border-radius: 8px; background: var(--bing-surface-solid); box-shadow: var(--bing-popover-shadow); }
  .dd-story__done { display: grid; place-items: center; min-height: 56px; border: 1px dashed var(--bing-border); border-radius: 8px; color: var(--bing-muted); }
  .dd-story__done.is-over { border-color: var(--bing-success); color: var(--bing-success-strong); background: color-mix(in srgb, var(--bing-success) 8%, transparent); }
  .dd-story__done.is-disabled { opacity: 0.45; }
`

const meta = {
  title: 'Components/BingDragDrop',
  component: BingDragDrop,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: {
    disabled: false,
    dragThreshold: 6,
    touchDelay: 300,
    touchTolerance: 8,
    autoScroll: true,
    dropOnSource: false,
    onDrop: fn(),
  },
  argTypes: {
    dragThreshold: { control: { type: 'number', min: 0, max: 24 } },
    touchDelay: { control: { type: 'number', min: 0, max: 1000, step: 50 } },
    touchTolerance: { control: { type: 'number', min: 0, max: 24 } },
    onDrop: { control: false, table: { category: '事件' } },
  },
  render: (args) => ({
    components: { BingDragDrop, BingDraggable, BingDropZone, BingDragOverlay, BingToast },
    setup() {
      const tasks = reactive(createTasks())
      const names: Record<Status, string> = { queued: '待处理', doing: '进行中', testing: '测试中', done: '已完成' }

      function move(id: string, status: Status) {
        const task = tasks.find(item => item.id === id)
        if (task) task.status = status
      }

      function handleDrop(payload: BingDragDropDropPayload<Task>) {
        args.onDrop(payload)
        const from = payload.from as Status
        const to = payload.to as Status
        move(String(payload.id), to)
        bingToast.success({
          id: 'drag-drop-story',
          message: `${payload.id} 已改为${names[to]}`,
          position: 'bottom',
          action: { label: '撤销', onClick: () => move(String(payload.id), from) },
        })
      }

      // 只有测试中的条目可以直接标记完成。
      const acceptDone = (item: BingDragDropItem) => item.zone === 'testing'

      return { args, tasks, columns, handleDrop, acceptDone, styles }
    },
    template: `
      <component is="style">{{ styles }}</component>
      <BingDragDrop
        :disabled="args.disabled"
        :drag-threshold="args.dragThreshold"
        :touch-delay="args.touchDelay"
        :touch-tolerance="args.touchTolerance"
        :auto-scroll="args.autoScroll"
        :drop-on-source="args.dropOnSource"
        @drop="handleDrop"
      >
        <div class="dd-story">
          <div class="dd-story__columns">
            <BingDropZone
              v-for="column in columns"
              :id="column.id"
              :key="column.id"
              v-slot="{ state }"
              tag="section"
              class="dd-story__column"
              :style="{ '--status': column.color }"
              :aria-label="column.name"
            >
              <h3 class="dd-story__head">
                {{ column.name }}
                <span v-if="state === 'over'" class="dd-story__hint">松手改为{{ column.name }}</span>
              </h3>
              <BingDraggable
                v-for="task in tasks.filter(item => item.status === column.id)"
                :id="task.id"
                :key="task.id"
                :zone="column.id"
                :data="task"
                class="dd-story__card"
              >
                <a href="#" @click.prevent>
                  <small>{{ task.id }}</small>
                  {{ task.title }}
                </a>
                <button type="button" :aria-label="task.id + ' 操作'">⋯</button>
              </BingDraggable>
            </BingDropZone>
          </div>

          <BingDropZone id="done" v-slot="{ state }" :accept="acceptDone" class="dd-story__done">
            {{ state === 'over' ? '松手标记为已完成' : state === 'disabled' ? '只有测试中的条目可以直接完成' : '拖到这里，标记为已完成' }}
          </BingDropZone>
        </div>

        <BingDragOverlay v-slot="{ data }">
          <div class="dd-story__overlay">
            <small style="display: block; color: var(--bing-muted); font-size: 12px;">{{ data.id }}</small>
            {{ data.title }}
          </div>
        </BingDragOverlay>
      </BingDragDrop>
      <BingToast />
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '跨区域拖动' }

export const Disabled: Story = {
  name: '禁用',
  args: { disabled: true },
}
