import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { fn } from 'storybook/test'
import { computed, onBeforeUnmount, ref } from 'vue'
import BingButton from '../BingButton/BingButton.vue'
import BingTag from '../BingTag/BingTag.vue'
import type { BingTagTone } from '../BingTag/BingTag.types'
import BingTable from './BingTable.vue'
import type {
  BingTableColumn,
  BingTableColumnResizePayload,
  BingTableKey,
  BingTablePageChangePayload,
  BingTableProps,
  BingTableRow,
  BingTableSelectionPayload,
  BingTableSortPayload,
  BingTableSortOrder,
} from './BingTable.types'

const columns: BingTableColumn[] = [
  {
    key: 'project',
    title: '项目',
    width: 220,
    fixed: 'left',
    sortable: true,
    description: '展开项目可查看子任务。',
  },
  {
    key: 'owner',
    title: '负责人',
    width: 150,
    sortable: true,
  },
  {
    key: 'status',
    title: '状态',
    width: 140,
  },
  {
    key: 'progress',
    title: '进度',
    width: 140,
    align: 'right',
    sortable: true,
  },
  {
    key: 'budget',
    title: '预算',
    width: 150,
    align: 'right',
    sortable: true,
  },
  {
    key: 'risk',
    title: '风险',
    width: 130,
    fixed: 'right',
  },
]

const tableData: BingTableRow[] = [
  {
    id: 'a',
    project: '极光画布',
    owner: '林晓',
    status: '设计中',
    progress: 72,
    budget: '$128k',
    risk: '低',
    children: [
      {
        id: 'a-1',
        project: '动效规范',
        owner: '周宁',
        status: '评审中',
        progress: 82,
        budget: '$36k',
        risk: '低',
      },
      {
        id: 'a-2',
        project: '纹理系统',
        owner: '许言',
        status: '原型设计',
        progress: 54,
        budget: '$42k',
        risk: '中',
      },
    ],
  },
  {
    id: 'b',
    project: '玻璃数据表',
    owner: '沈川',
    status: '开发中',
    progress: 48,
    budget: '$92k',
    risk: '中',
  },
  {
    id: 'c',
    project: '监测面板',
    owner: '苏晴',
    status: '已发布',
    progress: 100,
    budget: '$64k',
    risk: '低',
  },
  {
    id: 'd',
    project: '归档改造',
    owner: '顾安',
    status: '受阻',
    progress: 31,
    budget: '$74k',
    risk: '高',
    disabled: true,
  },
  {
    id: 'e',
    project: '预览面板',
    owner: '陈涛',
    status: '规划中',
    progress: 18,
    budget: '$48k',
    risk: '中',
  },
]

const virtualRows = Array.from({ length: 320 }, (_, index) => ({
  id: `row-${index + 1}`,
  project: `生成数据行 ${index + 1}`,
  owner: ['林晓', '沈川', '苏晴', '许言'][index % 4],
  status: ['设计中', '开发中', '评审中', '已发布'][index % 4],
  progress: (index * 7) % 101,
  budget: `$${48 + (index % 19) * 4}k`,
  risk: ['低', '中', '高'][index % 3],
}))

const horizontalColumns: BingTableColumn[] = [
  {
    key: 'project',
    title: '项目',
    width: 240,
    fixed: 'left',
    sortable: true,
  },
  {
    key: 'owner',
    title: '负责人',
    width: 150,
    sortable: true,
  },
  {
    key: 'stage',
    title: '阶段',
    width: 150,
  },
  {
    key: 'region',
    title: '地区',
    width: 150,
  },
  {
    key: 'channel',
    title: '渠道',
    width: 160,
  },
  {
    key: 'launch',
    title: '上线',
    width: 150,
    align: 'right',
  },
  {
    key: 'north',
    title: '北部',
    width: 145,
    align: 'right',
  },
  {
    key: 'south',
    title: '南部',
    width: 145,
    align: 'right',
  },
  {
    key: 'east',
    title: '东部',
    width: 145,
    align: 'right',
  },
  {
    key: 'west',
    title: '西部',
    width: 145,
    align: 'right',
  },
  {
    key: 'conversion',
    title: '转化率',
    width: 155,
    align: 'right',
  },
  {
    key: 'retention',
    title: '留存率',
    width: 150,
    align: 'right',
  },
  {
    key: 'satisfaction',
    title: '满意度',
    width: 165,
    align: 'right',
  },
  {
    key: 'margin',
    title: '利润率',
    width: 140,
    align: 'right',
  },
  {
    key: 'forecast',
    title: '预测',
    width: 160,
    align: 'right',
  },
  {
    key: 'velocity',
    title: '推进速度',
    width: 150,
    align: 'right',
  },
  {
    key: 'confidence',
    title: '置信度',
    width: 165,
    align: 'right',
  },
  {
    key: 'risk',
    title: '风险',
    width: 130,
    fixed: 'right',
  },
]

const horizontalRows: BingTableRow[] = Array.from({ length: 18 }, (_, index) => {
  const progress = (index * 13) % 101

  return {
    id: `wide-${index + 1}`,
    project: [
      '极光分析',
      '画布商城',
      '动态收件箱',
      '纹理规划',
      '玻璃报表',
      '监测运营',
    ][index % 6],
    owner: ['林晓', '周宁', '许言', '沈川', '苏晴', '陈涛'][index % 6],
    stage: ['调研', '设计', '开发', '评审中', '上线'][index % 5],
    region: ['北美', '欧洲', '亚太', '拉美'][index % 4],
    channel: ['直销', '合作伙伴', '应用市场', '工作室'][index % 4],
    launch: `2026-Q${(index % 4) + 1}`,
    north: `$${82 + index * 3}k`,
    south: `$${64 + index * 4}k`,
    east: `$${72 + index * 5}k`,
    west: `$${58 + index * 3}k`,
    conversion: `${18 + (index % 9) * 3}%`,
    retention: `${62 + (index % 7) * 4}%`,
    satisfaction: `${82 + (index % 6) * 2}%`,
    margin: `${24 + (index % 8) * 2}%`,
    forecast: `$${180 + index * 12}k`,
    velocity: `${progress}%`,
    confidence: ['低', '中', '高'][index % 3],
    risk: ['低', '中', '高'][index % 3],
  }
})

type StoryArgs = BingTableProps & {
  onSelectionChange: (payload: BingTableSelectionPayload) => void
  onColumnResize: (payload: BingTableColumnResizePayload) => void
  onPageChange: (payload: BingTablePageChangePayload) => void
}

function getStatusTagTone(value: unknown): BingTagTone {
  if (value === '已发布') {
    return 'success'
  }

  if (value === '受阻') {
    return 'danger'
  }

  return 'secondary'
}

function getStatusTagLabel(value: unknown) {
  return String(value ?? '')
}

const meta = {
  title: 'Components/BingTable',
  component: BingTable,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
  },
  args: {
    data: tableData,
    columns,
    rowKey: 'id',
    selectable: true,
    selectOnRowClick: false,
    defaultExpandedRowKeys: ['a'],
    rowDisabled: 'disabled',
    bordered: false,
    striped: true,
    pagination: true,
    defaultPageSize: 3,
    maxHeight: 420,
    smoothScroll: true,
    virtual: 'auto',
    showColumnControls: true,
    ariaLabel: '项目表格',
    onSelectionChange: fn(),
    onColumnResize: fn(),
    onPageChange: fn(),
  },
  argTypes: {
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    bordered: {
      control: 'boolean',
    },
    striped: {
      control: 'boolean',
    },
    selectable: {
      control: 'boolean',
    },
    pagination: {
      control: 'boolean',
    },
    virtual: {
      control: 'inline-radio',
      options: ['auto', true, false],
    },
    smoothScroll: {
      control: 'boolean',
    },
    onSelectionChange: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onColumnResize: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onPageChange: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  render: (args) => ({
    components: { BingTable, BingTag },
    setup() {
      const selectedRowKeys = ref<BingTableKey[]>([])
      const expandedRowKeys = ref<BingTableKey[]>(args.defaultExpandedRowKeys ?? [])
      const page = ref(1)
      const pageSize = ref(args.defaultPageSize ?? 10)
      const columnWidths = ref<Record<string, number>>({})
      const columnOrder = ref<string[]>([])
      const hiddenColumnKeys = ref<string[]>([])
      const columnFixed = ref({})

      return {
        args,
        selectedRowKeys,
        expandedRowKeys,
        page,
        pageSize,
        columnWidths,
        columnOrder,
        hiddenColumnKeys,
        columnFixed,
        getStatusTagLabel,
        getStatusTagTone,
      }
    },
    template: `
      <div style="box-sizing: border-box; padding: 16px; background: var(--bing-canvas);">
        <BingTable
          v-model:selected-row-keys="selectedRowKeys"
          v-model:expanded-row-keys="expandedRowKeys"
          v-model:page="page"
          v-model:page-size="pageSize"
          v-model:column-widths="columnWidths"
          v-model:column-order="columnOrder"
          v-model:hidden-column-keys="hiddenColumnKeys"
          v-model:column-fixed="columnFixed"
          :data="args.data"
          :columns="args.columns"
          :row-key="args.rowKey"
          :children-key="args.childrenKey"
          :selectable="args.selectable"
          :selection-mode="args.selectionMode"
          :select-on-row-click="args.selectOnRowClick"
          :row-disabled="args.rowDisabled"
          :bordered="args.bordered"
          :striped="args.striped"
          :size="args.size"
          :loading="args.loading"
          :loading-variant="args.loadingVariant"
          :error="args.error"
          :keyboard-navigation="args.keyboardNavigation"
          :selection-strategy="args.selectionStrategy"
          :scrollbar-gutter="args.scrollbarGutter"
          :active-row-key="args.activeRowKey"
          :loading-text="args.loadingText"
          :empty-text="args.emptyText"
          :pagination="args.pagination"
          :default-page="args.defaultPage"
          :default-page-size="args.defaultPageSize"
          :page-size-options="args.pageSizeOptions"
          :height="args.height"
          :max-height="args.maxHeight"
          :smooth-scroll="args.smoothScroll"
          :virtual="args.virtual"
          :show-column-controls="args.showColumnControls"
          :aria-label="args.ariaLabel"
          @selection-change="args.onSelectionChange"
          @column-resize="args.onColumnResize"
          @page-change="args.onPageChange"
        >
          <template #toolbar="{ selectedRowKeys: keys }">
            <div style="display: flex; align-items: center; gap: 10px; color: var(--bing-muted); font-size: .86rem; font-weight: 400;">
              <span style="color: var(--bing-heading); font-weight: 500;">项目列表</span>
              <span>已选 {{ keys.length }} 项</span>
            </div>
          </template>
          <template #cell-status="{ value }">
            <BingTag
              :label="getStatusTagLabel(value)"
              :tone="getStatusTagTone(value)"
              size="sm"
              variant="soft"
            />
          </template>
          <template #cell-progress="{ value }">
            {{ value }}%
          </template>
        </BingTable>
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const VirtualRows: Story = {
  name: '虚拟行',
  args: {
    data: virtualRows,
    pagination: false,
    defaultPageSize: 20,
    maxHeight: 520,
    virtual: true,
  },
}

export const HorizontalScroll: Story = {
  name: '横向滚动',
  args: {
    data: horizontalRows.slice(0, 6),
    columns: horizontalColumns,
    pagination: false,
    defaultExpandedRowKeys: [],
    height: undefined,
    maxHeight: undefined,
    virtual: false,
    ariaLabel: '宽列项目指标表',
  },
}

export const BothAxisScroll: Story = {
  name: '双向滚动',
  args: {
    data: horizontalRows,
    columns: horizontalColumns,
    pagination: false,
    defaultExpandedRowKeys: [],
    height: undefined,
    maxHeight: 420,
    virtual: false,
    ariaLabel: '支持双向滚动的项目指标表',
  },
}

export const Compact: Story = {
  name: '紧凑密度',
  args: {
    size: 'sm',
    data: virtualRows.slice(0, 12),
    pagination: true,
    defaultPageSize: 6,
    bordered: true,
  },
}

export const Empty: Story = {
  name: '空状态',
  args: {
    data: [],
    pagination: false,
    emptyText: '当前视图暂无数据',
  },
}

export const Loading: Story = {
  name: '加载遮罩',
  args: {
    loading: true,
    loadingText: '正在加载数据',
  },
}

export const AccountInvitations: Story = {
  name: '业务表格 · 邀请记录',
  parameters: {
    docs: {
      description: {
        story: '演示嵌入业务卡片的表格、加载时保留原有行和高度，以及自定义插槽文字被截断时的全文提示。请求短于 150ms 时不显示加载遮罩；已显示的提示至少停留 250ms，避免闪烁。',
      },
    },
  },
  render: () => ({
    components: { BingTable, BingButton, BingTag },
    setup() {
      const invitationColumns: BingTableColumn[] = [
        { key: 'identity', title: '受邀成员', minWidth: 220 },
        { key: 'roles', title: '项目角色', minWidth: 200 },
        { key: 'status', title: '状态', width: 110 },
        { key: 'expiresAt', title: '有效期至', width: 180 },
        { key: 'actions', title: '操作', minWidth: 160 },
      ]
      const invitations = [
        { id: 1, name: '林晓', email: 'lin.xiao@example.com', roles: ['UI 设计', '开发', '运维', '产品经理', '项目管理员', '测试'], status: '等待接受', expiresAt: '2026/9/12 13:25:44' },
        { id: 2, name: '周宁', email: 'zhou.ning@example.com', roles: ['开发'], status: '已接受', expiresAt: '2026/9/13 09:30:00' },
        { id: 3, name: '许言', email: 'xu.yan@example.com', roles: ['产品经理', '项目管理员', '需求评审', '发布管理'], status: '等待接受', expiresAt: '2026/9/14 16:00:00' },
      ]
      const data = ref(invitations)
      const total = ref(invitations.length)
      const loading = ref(false)
      const page = ref(1)
      const pageSize = ref(20)
      let timer: ReturnType<typeof setTimeout> | undefined

      function refresh(duration: number, clearData = false) {
        if (loading.value) return
        loading.value = true
        if (clearData) {
          data.value = []
          total.value = 0
        }
        timer = setTimeout(() => {
          data.value = [...invitations]
          total.value = invitations.length
          loading.value = false
        }, duration)
      }

      onBeforeUnmount(() => clearTimeout(timer))
      return { invitationColumns, data, total, loading, page, pageSize, refresh }
    },
    template: `
      <div style="box-sizing: border-box; padding: 16px; min-height: 520px; background: var(--bing-surface-muted);">
        <div style="max-width: 1100px; margin: 0 auto;">
          <h2 style="margin: 0 0 8px; color: var(--bing-heading);">邀请记录</h2>
          <p style="margin: 0 0 24px; color: var(--bing-muted);">邀请有效期为 7 天。复制链接发给同事，由同事设置自己的密码。</p>
          <div style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 18px;">
            <BingButton size="sm" variant="secondary" :disabled="loading" @click="refresh(900)">刷新表格</BingButton>
            <BingButton size="sm" variant="ghost" :disabled="loading" @click="refresh(80)">快速刷新</BingButton>
            <BingButton size="sm" variant="ghost" :disabled="loading" @click="refresh(900, true)">请求时清空数据</BingButton>
          </div>
          <div style="border: 1px solid var(--bing-border); border-radius: 12px; overflow: hidden; background: var(--bing-surface-solid);">
            <BingTable
              v-model:page="page" v-model:page-size="pageSize"
              :data="data" :columns="invitationColumns" :loading="loading" :total="total"
              pagination remote-pagination loading-text="正在加载邀请记录" empty-text="暂无邀请"
              aria-label="邀请记录"
            >
              <template #cell-identity="{ row }">
                <div style="display: flex; flex-direction: column; gap: 4px;">
                  <strong>{{ row.name }}</strong>
                  <small style="color: var(--bing-muted);">{{ row.email }}</small>
                </div>
              </template>
              <template #cell-roles="{ row }">{{ row.roles.join('、') }}</template>
              <template #cell-status="{ value }"><BingTag size="sm" variant="soft" :tone="value === '已接受' ? 'success' : 'neutral'">{{ value }}</BingTag></template>
              <template #cell-expiresAt="{ value }"><small style="color: var(--bing-muted);">{{ value }}</small></template>
              <template #cell-actions="{ row }">
                <div v-if="row.status !== '已接受'" style="display: flex; gap: 4px;">
                  <BingButton size="sm" variant="ghost">重新邀请</BingButton>
                  <BingButton size="sm" variant="ghost">撤销</BingButton>
                </div>
                <span v-else style="color: var(--bing-muted);">已加入项目</span>
              </template>
            </BingTable>
          </div>
        </div>
      </div>
    `,
  }),
}

export const Spacious: Story = { name: '宽松密度', args: { size: 'lg' } }

export const RemoteSort: Story = {
  name: '服务端排序与真实分页',
  render: () => ({
    components: { BingTable },
    setup() {
      const source = [
        { id: 2, title: 'REQ-2', owner: '林晓' },
        { id: 1, title: 'REQ-1', owner: '周宁' },
        { id: 20, title: 'REQ-20', owner: '林晓' },
        { id: 10, title: 'REQ-10', owner: '周宁' },
        { id: 3, title: 'REQ-3', owner: '林晓' },
      ]
      const data = ref(source.slice(0, 2))
      const page = ref(1)
      const pageSize = ref(2)
      const sortKey = ref<string | null>(null)
      const sortOrder = ref<BingTableSortOrder>(null)
      const loading = ref(false)
      const requests = ref(0)
      let timer: ReturnType<typeof setTimeout> | undefined
      function query() {
        clearTimeout(timer)
        requests.value++
        loading.value = true
        timer = setTimeout(() => {
          // 模拟服务端按字符串排序；REQ-10 排在 REQ-2 前面。
          const ordered = sortOrder.value ? [...source].sort((a, b) => {
            const result = a.title < b.title ? -1 : a.title > b.title ? 1 : 0
            return sortOrder.value === 'asc' ? result : -result
          }) : source
          data.value = ordered.slice((page.value - 1) * pageSize.value, page.value * pageSize.value)
          loading.value = false
        }, 320)
      }
      function onPageChange(next: BingTablePageChangePayload) {
        page.value = next.page
        pageSize.value = next.pageSize
        query()
      }
      function onSortChange(next: BingTableSortPayload) {
        sortKey.value = next.key
        sortOrder.value = next.order
        page.value = 1
        query()
      }
      onBeforeUnmount(() => clearTimeout(timer))
      return { data, page, pageSize, sortKey, sortOrder, loading, requests, onPageChange, onSortChange,
        columns: [{ key: 'title', title: '文档编号', sortable: true, width: 380, ellipsis: false },
          { key: 'owner', title: '负责人', width: 280 }], total: source.length }
    },
    template: `
      <div style="width: min(900px, calc(100vw - 40px)); display: grid; gap: 16px;">
        <p>服务端按字符串排序，REQ-10 在 REQ-2 前；每次操作只触发一次请求。</p>
        <BingTable :data="data" :columns="columns" :loading="loading" pagination remote-pagination remote-sort
          :page="page" :page-size="pageSize" :total="total" :page-size-options="[2, 3, 10]"
          :default-page-size="2" :sort-key="sortKey" :sort-order="sortOrder"
          :preserve-page-height="false" :virtual="false" :show-column-controls="false"
          @page-change="onPageChange" @sort-change="onSortChange" aria-label="服务端文档列表" />
        <p role="status">模拟请求：{{ requests }}；当前排序：{{ sortOrder ?? '默认' }}</p>
      </div>
    `,
  }),
}

export const KeyboardNavigation: Story = {
  name: '键盘导航与单元格编辑',
  render: () => ({
    components: { BingTable, BingButton },
    setup() {
      const table = ref<InstanceType<typeof BingTable> | null>(null)
      const data = ref([{ id: 'one', name: '极光画布', note: '等待评审' }, { id: 'two', name: '监测面板', note: '准备发布' }, { id: 'three', name: '纹理系统', note: '持续观察' }])
      return { table, data, columns: [
        { key: 'name', title: '项目', width: 240, sortable: true, sortDirections: ['asc', 'desc'], maxWidth: 480 },
        { key: 'note', title: '备注', width: 320 },
      ] }
    },
    template: `
      <div style="padding: 16px; display: grid; gap: 16px; color: var(--bing-text);">
        <p>Tab 进入表格，方向键移动；空格选择，Shift + 空格范围选择，Enter 激活行。备注列按 F2 或 Enter 编辑，Tab 切换控件，Esc 返回单元格。</p>
        <BingTable ref="table" :data="data" :columns="columns" selectable aria-label="键盘操作示例">
          <template #toolbar>
            <BingButton size="sm" variant="ghost" @click="table?.autoFitColumns()">适配当前内容列宽</BingButton>
          </template>
          <template #cell-note="{ row }">
            <div style="display: flex; gap: 8px; align-items: center;">
              <input v-model="row.note" :aria-label="row.name + '备注'" style="min-width: 0; width: 100%; color: var(--bing-text); background: var(--bing-surface-solid); border: 1px solid var(--bing-border); border-radius: 4px; padding: 6px;" />
              <BingButton size="xs" variant="ghost" @click="row.note = ''">清空</BingButton>
            </div>
          </template>
        </BingTable>
        <p>表头按 Ctrl / ⌘ + Shift + 左右键移动列；Alt + 左右键调宽，Shift 加速。双击分隔条适配内容；本例项目列在升序、降序间循环。</p>
      </div>
    `,
  }),
}

export const CascadeSelection: Story = {
  name: '树形级联选择',
  args: { selectionStrategy: 'cascade', pagination: false, selectOnRowClick: true },
  parameters: { docs: { description: { story: '父项聚合可选叶子的全选 / 半选状态；折叠子树参与级联，禁用项不变。Shift 点击或 Shift + Space 按当前可见顺序选择范围。' } } },
}

export const RemotePageSelection: Story = {
  name: '远程分页选择',
  render: () => ({
    components: { BingTable, BingButton },
    setup() {
      const page = ref(1)
      const pageSize = ref(5)
      const keys = ref<BingTableKey[]>([])
      const allPages = ref(false)
      const excluded = ref<BingTableKey[]>([])
      const data = computed(() => Array.from({ length: Math.min(pageSize.value, 42 - (page.value - 1) * pageSize.value) }, (_, index) => {
        const id = (page.value - 1) * pageSize.value + index + 1
        return { id, name: `需求 ${id}`, owner: ['林晓', '周宁', '许言'][id % 3] }
      }))
      return { page, pageSize, keys, allPages, excluded, data, columns: [{ key: 'name', title: '需求', width: 300 }, { key: 'owner', title: '负责人', width: 200 }] }
    },
    template: `
      <div style="padding: 16px; display: grid; gap: 16px; color: var(--bing-text);">
        <p>先全选当前页，再选择全部 42 条。翻页保留选择；全选后取消单行，会加入排除列表。</p>
        <BingTable :data="data" :columns="columns" :total="42" selectable pagination remote-pagination
          v-model:page="page" v-model:page-size="pageSize" :page-size-options="[5, 10, 20]"
          v-model:selected-row-keys="keys" v-model:all-pages-selected="allPages" v-model:excluded-row-keys="excluded"
          aria-label="远程分页需求列表">
          <template #toolbar="{ selectionCount, allVisibleRowsSelected, selectAllPages, clearSelection }">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px;">
              <span>已选 {{ selectionCount }} 条</span>
              <BingButton v-if="allVisibleRowsSelected && !allPages" size="sm" variant="ghost" @click="selectAllPages">选择全部 42 条</BingButton>
              <BingButton v-if="selectionCount" size="sm" variant="ghost" @click="clearSelection">清除选择</BingButton>
            </div>
          </template>
        </BingTable>
      </div>
    `,
  }),
}

export const ActiveRows: Story = {
  name: '活动行与版本切换',
  render: () => ({
    components: { BingTable },
    setup() {
      const active = ref<BingTableKey | null>('v2')
      return { active, data: [{ id: 'v3', title: '第三版', note: '补齐验证记录' }, { id: 'v2', title: '第二版', note: '整理交互细节' }, { id: 'v1', title: '第一版', note: '初稿' }], columns: [{ key: 'title', title: '版本', width: 180 }, { key: 'note', title: '说明', width: 400 }] }
    },
    template: `
      <div style="padding: 16px; display: grid; gap: 16px; color: var(--bing-text);">
        <p>点击行或聚焦单元格后按 Enter 切换版本。当前版本：{{ active }}</p>
        <BingTable :data="data" :columns="columns" v-model:active-row-key="active" aria-label="历史版本" />
      </div>
    `,
  }),
}

export const VariableHeightVirtualRows: Story = {
  name: '变高虚拟行',
  render: () => ({
    components: { BingTable, BingButton },
    setup() {
      const table = ref<InstanceType<typeof BingTable> | null>(null)
      const data = ref(Array.from({ length: 1000 }, (_, index) => ({ id: index, name: `项目 ${index + 1}`, expanded: index % 3 === 1 })))
      return { table, data, columns: [{ key: 'name', title: '项目', width: 200, fixed: 'left' }, { key: 'detail', title: '说明', width: 430, ellipsis: false }] }
    },
    template: `
      <div style="padding: 16px; display: grid; gap: 16px; color: var(--bing-text);">
        <p>1,000 行交替高度，展开说明后保持当前滚动锚点。方向键可以跨虚拟窗口移动。</p>
        <BingTable ref="table" :data="data" :columns="columns" virtual :max-height="400" aria-label="变高项目列表">
          <template #toolbar><BingButton size="sm" variant="ghost" @click="table?.scrollToRow(999)">跳到最后一行</BingButton></template>
          <template #cell-detail="{ row }">
            <div style="display: grid; gap: 8px; padding: 4px 0;">
              <span>{{ row.name }}的当前记录</span>
              <span v-if="row.expanded" style="line-height: 1.7;">记录设计评审与开发安排。<br />补充异步内容后，只有这行的高度发生变化。<br />其他行保持各自高度。</span>
              <BingButton size="xs" variant="ghost" @click="row.expanded = !row.expanded">{{ row.expanded ? '收起说明' : '展开说明' }}</BingButton>
            </div>
          </template>
        </BingTable>
      </div>
    `,
  }),
}

export const ErrorState: Story = {
  name: '错误状态与重试',
  render: () => ({
    components: { BingTable, BingButton },
    setup() {
      const error = ref<string | boolean>('暂时无法加载凭证')
      const loading = ref(false)
      const data = ref<BingTableRow[]>([])
      let timer: ReturnType<typeof setTimeout> | undefined
      function retry() {
        error.value = false
        loading.value = true
        timer = setTimeout(() => { data.value = [{ id: 'one', name: '项目访问凭证', status: '可用' }]; loading.value = false }, 700)
      }
      onBeforeUnmount(() => clearTimeout(timer))
      return { error, loading, data, retry, columns: [{ key: 'name', title: '凭证', width: 320, sortable: true }, { key: 'status', title: '状态', width: 200 }] }
    },
    template: `
      <div style="padding: 16px;">
        <BingTable :data="data" :columns="columns" :error="error" :loading="loading" loading-variant="skeleton" selectable @retry="retry" aria-label="凭证列表">
          <template #empty><span>暂无访问凭证，可创建新凭证。</span></template>
        </BingTable>
      </div>
    `,
  }),
}

export const LoadingSkeleton: Story = {
  name: '首次加载骨架',
  args: { data: [], loading: true, loadingVariant: 'skeleton' },
}

export const FocusVisibility: Story = {
  name: '焦点可见性与固定列',
  render: () => ({
    components: { BingTable, BingButton },
    setup() {
      const table = ref<InstanceType<typeof BingTable> | null>(null)
      const columns: BingTableColumn[] = [
        { key: 'name', title: '项目', width: 220, fixed: 'left', sortable: true, description: '按 F2 进入排序、说明与列宽操作。' },
        ...Array.from({ length: 11 }, (_, index) => ({ key: `metric${index}`, title: `指标 ${index + 1}`, width: 160, sortable: true })),
        { key: 'action', title: '操作', width: 130, fixed: 'right' },
      ]
      const data = Array.from({ length: 24 }, (_, index) => ({ id: index, name: `项目 ${index + 1}`, ...Object.fromEntries(Array.from({ length: 11 }, (_, metric) => [`metric${metric}`, `${72 + index + metric}%`])) }))
      return { table, columns, data }
    },
    template: `
      <div style="padding: 16px; display: grid; gap: 16px; color: var(--bing-text);">
        <p>方向键穿过 13 列；固定列、表头和滚动条会为焦点留出完整区域。F2 进入控件，Tab 切换，Esc 返回。</p>
        <BingTable ref="table" :data="data" :columns="columns" selectable :height="360" :smooth-scroll="false" :default-selected-row-keys="[1]" :active-row-key="2" aria-label="焦点可见性验证">
          <template #toolbar><BingButton size="sm" variant="ghost" @click="table?.focusCell(0, 'name')">从第一行开始</BingButton></template>
          <template #cell-action><BingButton size="xs" variant="ghost">查看</BingButton></template>
        </BingTable>
      </div>
    `,
  }),
}

export const ThemeTokens: Story = {
  name: '主题变量与树形引导线',
  render: () => ({
    components: { BingTable },
    setup: () => ({ columns, tableData }),
    template: `
      <div style="padding: 16px; display: grid; gap: 16px; color: var(--bing-text); --bing-table-radius: 12px; --bing-table-row-height: 48px; --bing-table-head-height: 44px; --bing-table-cell-padding-x: 16px; --bing-table-header-bg: color-mix(in srgb, var(--bing-accent) 10%, var(--bing-surface-solid)); --bing-table-line: color-mix(in srgb, var(--bing-accent) 18%, var(--bing-surface-solid));">
        <p>在祖先容器覆盖表格变量；固定表头使用同一底色，树形引导线按需开启。</p>
        <BingTable :columns="columns" :data="tableData" selectable tree-guides default-expand-all :default-selected-row-keys="['a-1']" active-row-key="b" aria-label="主题变量示例" />
      </div>
    `,
  }),
}
