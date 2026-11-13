import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BingButton from '../BingButton/BingButton.vue'
import BingTable from '../BingTable/BingTable.vue'
import type { BingTableFixed } from '../BingTable/BingTable.types'
import BingTableColumnControls from './BingTableColumnControls.vue'

const meta: Meta<typeof BingTableColumnControls> = {
  title: 'Components/BingTableColumnControls',
  component: BingTableColumnControls,
  tags: ['autodocs'],
}
export default meta
type Story = StoryObj<typeof BingTableColumnControls>

export const SharedGroups: Story = {
  name: '多个分组共享列设置',
  render: () => ({
    components: { BingButton, BingTable, BingTableColumnControls },
    setup() {
      return {
        firstOpen: ref(true), secondOpen: ref(true),
        hidden: ref<string[]>([]), order: ref<string[]>([]),
        widths: ref<Record<string, number>>({}), fixed: ref<Record<string, BingTableFixed | null>>({}),
        columns: [
          { key: 'title', title: '文档标题', width: 420, ellipsis: false },
          { key: 'owner', title: '负责人', width: 180 },
          { key: 'priority', title: '优先级', width: 140 },
        ],
        groups: [
          [{ id: 1, title: '工作台布局调整', owner: '林晓', priority: '高' }],
          [{ id: 2, title: '将文档标题保存与正文正式版本分开，标题换行后完整显示', owner: '周宁', priority: '中' }],
        ],
      }
    },
    template: `
      <div style="display: grid; gap: 20px; width: min(960px, calc(100vw - 40px));">
        <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
          <strong>按状态分组</strong>
          <BingTableColumnControls :columns="columns" aria-label="所有分组的列设置"
            v-model:column-widths="widths" v-model:column-order="order"
            v-model:hidden-column-keys="hidden" v-model:column-fixed="fixed" />
          <BingButton size="sm" variant="ghost" :throttle="false" @click="firstOpen = !firstOpen">{{ firstOpen ? '收起' : '展开' }}待处理</BingButton>
          <BingButton size="sm" variant="ghost" :throttle="false" @click="secondOpen = !secondOpen">{{ secondOpen ? '收起' : '展开' }}进行中</BingButton>
        </div>
        <section v-if="firstOpen">
          <h3>待处理</h3>
          <BingTable :columns="columns" :data="groups[0]" :show-column-controls="false" :virtual="false"
            v-model:column-widths="widths" v-model:column-order="order"
            v-model:hidden-column-keys="hidden" v-model:column-fixed="fixed" aria-label="待处理文档" />
        </section>
        <section v-if="secondOpen">
          <h3>进行中</h3>
          <BingTable :columns="columns" :data="groups[1]" :show-column-controls="false" :virtual="false"
            v-model:column-widths="widths" v-model:column-order="order"
            v-model:hidden-column-keys="hidden" v-model:column-fixed="fixed" aria-label="进行中文档" />
        </section>
        <p style="color: var(--bing-muted)">分组全部收起时，仍可调整列设置；再次展开会使用同一组列偏好。</p>
      </div>
    `,
  }),
}
