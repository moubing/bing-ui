import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import { fn } from 'storybook/test'
import BingTreeSelect from './BingTreeSelect.vue'
import type {
  BingTreeSelectChangePayload,
  BingTreeSelectModelValue,
  BingTreeSelectNode,
  BingTreeSelectProps,
} from './BingTreeSelect.types'

type StoryArgs = BingTreeSelectProps & {
  onChange: (payload: BingTreeSelectChangePayload) => void
  onClear: () => void
  onOpen: () => void
  onClose: () => void
}

const workspaceTree: BingTreeSelectNode[] = [
  {
    label: '组件库',
    value: 'creative',
    description: '表单输入与反馈组件',
    meta: {
      area: 'library',
      state: 'active',
    },
    children: [
      {
        label: '输入控件',
        value: 'inputs',
        description: '文本、平面选项与树形选择',
        children: [
          { label: 'BingInput', value: 'bing-input', description: '文本输入与数字步进' },
          { label: 'BingSelect', value: 'bing-select', description: '支持搜索与多选的平面选择器' },
          {
            label: 'BingTreeSelect',
            value: 'bing-tree-select',
            description: '支持级联与虚拟滚动的树形选择器',
            meta: {
              relation: 'cascade',
              virtual: true,
            },
          },
        ],
      },
      {
        label: '反馈组件',
        value: 'feedback',
        children: [
          { label: 'BingDialog', value: 'bing-dialog' },
          { label: 'BingTag', value: 'bing-tag' },
        ],
      },
    ],
  },
  {
    label: '动效预设',
    value: 'motion',
    description: '可复用的 GSAP 动画节奏',
    meta: {
      engine: 'GSAP',
      mode: 'tokens',
    },
    children: [
      {
        label: '环境动效',
        value: 'ambient',
        children: [
          { label: '极光流动', value: 'aurora-drift' },
          { label: '柔和聚焦', value: 'velvet-focus' },
        ],
      },
      {
        label: '交互动效',
        value: 'responsive',
        children: [
          { label: '点击脉冲', value: 'pulse-press' },
          { label: '环绕悬停', value: 'orbit-hover', disabled: true },
        ],
      },
    ],
  },
  {
    label: '使用文档',
    value: 'docs',
    selectable: false,
    description: '此分组支持展开，不参与选择',
    children: [
      { label: '使用说明', value: 'usage-notes' },
      { label: '键盘与无障碍检查', value: 'a11y-checklist' },
    ],
  },
]

const virtualTree: BingTreeSelectNode[] = Array.from({ length: 24 }, (_, groupIndex) => ({
  label: `工作区 ${groupIndex + 1}`,
  value: `workspace-${groupIndex + 1}`,
  description: groupIndex % 2 === 0 ? '设计工作区' : '交付工作区',
  children: Array.from({ length: 12 }, (_, itemIndex) => ({
    label: `节点 ${groupIndex + 1}.${itemIndex + 1}`,
    value: `workspace-${groupIndex + 1}-item-${itemIndex + 1}`,
    description: itemIndex % 3 === 0 ? '常用节点' : '支持独立选择的子节点',
    disabled: itemIndex === 10,
  })),
}))

const meta = {
  title: 'Components/BingTreeSelect',
  component: BingTreeSelect,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: false,
    },
    options: {
      control: false,
    },
    multiple: {
      control: 'boolean',
    },
    checkStrictly: {
      control: 'boolean',
    },
    placeholder: {
      control: 'text',
    },
    disabled: {
      control: 'boolean',
    },
    clearable: {
      control: 'boolean',
    },
    showSelectAll: {
      control: 'boolean',
    },
    selectAllText: {
      control: 'text',
    },
    clearAllText: {
      control: 'text',
    },
    showTreeActions: {
      control: 'boolean',
    },
    searchable: {
      control: 'inline-radio',
      options: ['auto', true, false],
    },
    typeahead: { control: 'boolean', description: '无搜索框时连续字符定位可见节点' },
    highlightMatches: { control: 'boolean', description: '默认节点标签高亮匹配片段' },
    smoothScroll: {
      control: 'boolean',
      description: '树节点滚轮平滑滚动',
    },
    defaultExpandAll: {
      control: 'boolean',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    block: {
      control: 'boolean',
    },
    panelPlacement: {
      control: 'inline-radio',
      options: ['auto', 'top', 'bottom', 'left', 'right'],
    },
    panelAlign: {
      control: 'inline-radio',
      options: ['start', 'middle', 'end'],
    },
    panelGap: {
      control: {
        type: 'number',
        min: 0,
        max: 48,
        step: 2,
      },
    },
    virtual: {
      control: 'inline-radio',
      options: ['auto', true, false],
    },
    virtualThreshold: {
      control: {
        type: 'number',
        min: 0,
        max: 300,
        step: 10,
      },
    },
    virtualItemHeight: {
      description: '默认随尺寸为 28 / 32 / 36px，也可指定固定行高。',
      control: {
        type: 'number',
        min: 28,
        max: 72,
        step: 2,
      },
    },
  },
  args: {
    options: workspaceTree,
    placeholder: '选择组件或分组',
    multiple: false,
    checkStrictly: false,
    disabled: false,
    clearable: true,
    showSelectAll: true,
    selectAllText: '全选节点',
    clearAllText: '清空选择',
    showTreeActions: true,
    expandAllText: '展开全部',
    collapseAllText: '收起全部',
    searchPlaceholder: '搜索节点',
    noSearchResultsText: '没有匹配的节点',
    emptyText: '暂无节点',
    searchable: 'auto',
    smoothScroll: true,
    defaultExpandedValues: ['creative', 'inputs'],
    defaultExpandAll: false,
    size: 'md',
    block: false,
    panelMinHeight: 180,
    panelMaxHeight: 360,
    panelPlacement: 'auto',
    panelAlign: 'start',
    panelGap: 10,
    virtual: 'auto',
    virtualThreshold: 120,
    virtualItemHeight: undefined,
    virtualOverscan: 5,
    onChange: fn(),
    onClear: fn(),
    onOpen: fn(),
    onClose: fn(),
  },
  render: (args) => ({
    components: { BingTreeSelect },
    setup() {
      const value = ref<BingTreeSelectModelValue>(
        args.modelValue ?? (args.multiple ? [] : null),
      )

      watch(
        () => [args.modelValue, args.multiple] as const,
        ([nextValue, multiple]) => {
          value.value = nextValue ?? (multiple ? [] : null)
        },
      )

      return { args, value }
    },
    template: `
      <BingTreeSelect
        v-model="value"
        :options="args.options"
        :multiple="args.multiple"
        :check-strictly="args.checkStrictly"
        :placeholder="args.placeholder"
        :disabled="args.disabled"
        :clearable="args.clearable"
        :status="args.status"
        :glass="args.glass"
        :glass-blur="args.glassBlur"
        :glass-opacity="args.glassOpacity"
        :glass-saturation="args.glassSaturation"
        :show-select-all="args.showSelectAll"
        :select-all-text="args.selectAllText"
        :clear-all-text="args.clearAllText"
        :show-tree-actions="args.showTreeActions"
        :expand-all-text="args.expandAllText"
        :collapse-all-text="args.collapseAllText"
        :empty-text="args.emptyText"
        :searchable="args.searchable"
        :typeahead="args.typeahead"
        :highlight-matches="args.highlightMatches"
        :search-placeholder="args.searchPlaceholder"
        :no-search-results-text="args.noSearchResultsText"
        :smooth-scroll="args.smoothScroll"
        :default-expanded-values="args.defaultExpandedValues"
        :default-expand-all="args.defaultExpandAll"
        :size="args.size"
        :block="args.block"
        :panel-min-height="args.panelMinHeight"
        :panel-max-height="args.panelMaxHeight"
        :panel-placement="args.panelPlacement"
        :panel-align="args.panelAlign"
        :panel-gap="args.panelGap"
        :virtual="args.virtual"
        :virtual-threshold="args.virtualThreshold"
        :virtual-item-height="args.virtualItemHeight"
        :virtual-overscan="args.virtualOverscan"
        :aria-label="args.ariaLabel"
        @change="args.onChange"
        @clear="args.onClear"
        @open="args.onOpen"
        @close="args.onClose"
      />
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const KeyboardNavigation: Story = {
  name: '键盘导航',
  render: () => ({
    components: { BingTreeSelect },
    setup() {
      return { workspaceTree, searchValue: ref([]), typeaheadValue: ref(null) }
    },
    template: `
      <div style="display:grid;gap:24px;width:min(480px,calc(100vw - 48px));">
        <div style="display:grid;gap:8px;">
          <p style="margin:0;color:var(--bing-muted);font-size:13px;">搜索框：光标边界使用 ← / →；Alt + ← / → 随时操作树；空查询按 * 展开同级，空格切换选择。</p>
          <BingTreeSelect v-model="searchValue" :options="workspaceTree" searchable multiple block :panel-min-height="100" aria-label="搜索键盘导航" />
        </div>
        <div style="display:grid;gap:8px;">
          <p style="margin:0;color:var(--bing-muted);font-size:13px;">无搜索框：打开后输入 bing 定位 Bing 前缀的节点，或输入中文拼音首字母；连续输入在 500ms 内累积。</p>
          <BingTreeSelect v-model="typeaheadValue" :options="workspaceTree" :searchable="false" default-expand-all block aria-label="连续字符定位" />
        </div>
      </div>
    `,
  }),
}

export const DeepGuides: Story = {
  name: '深层级引导线',
  args: {
    options: [{ label: '工作空间', value: 'workspace', children: [
      { label: '设计系统', value: 'design-system', children: [
        { label: '基础组件', value: 'foundations', children: [
          { label: '表单控件', value: 'forms', children: [
            { label: '选择器', value: 'pickers', children: [
              { label: 'BingSelect', value: 'select', description: '平面选项选择' },
              { label: 'BingTreeSelect', value: 'tree-select', description: '树形节点选择' },
            ] },
          ] },
        ] },
      ] },
      { label: '归档目录', value: 'archive', disabled: true, children: [{ label: '旧版组件', value: 'legacy' }] },
    ] }],
    multiple: true,
    modelValue: ['tree-select'],
    defaultExpandAll: true,
    searchable: true,
    panelMinHeight: 100,
    panelMaxHeight: 400,
  },
}

export const CascadingMultiple: Story = {
  name: '级联多选',
  args: {
    multiple: true,
    modelValue: ['bing-input'],
    placeholder: '选择组件节点',
  },
}

export const CheckStrictly: Story = {
  name: '独立多选',
  args: {
    multiple: true,
    checkStrictly: true,
    modelValue: ['creative'],
    placeholder: '父子节点独立选择',
  },
}

export const SearchAndCollapse: Story = {
  name: '搜索与展开',
  args: {
    smoothScroll: true,
    searchable: true,
    defaultExpandAll: true,
    panelMaxHeight: 320,
  },
}

export const VirtualizedTree: Story = {
  name: '虚拟树',
  args: {
    smoothScroll: true,
    options: virtualTree,
    multiple: true,
    defaultExpandAll: true,
    virtual: true,
    virtualThreshold: 20,
    panelMaxHeight: 380,
    placeholder: '搜索并选择节点',
  },
}

export const Sizes: Story = {
  name: '三档尺寸',
  render: (args) => ({
    components: { BingTreeSelect },
    setup() {
      const small = ref<BingTreeSelectModelValue>('bing-select')
      const medium = ref<BingTreeSelectModelValue>('motion')
      const large = ref<BingTreeSelectModelValue>('usage-notes')

      return { args, small, medium, large, workspaceTree }
    },
    template: `
      <div style="display: grid; gap: 14px; width: min(280px, calc(100vw - 48px));">
        <BingTreeSelect v-model="small" :options="workspaceTree" size="sm" :default-expanded-values="['creative', 'inputs']" />
        <BingTreeSelect v-model="medium" :options="workspaceTree" size="md" :default-expanded-values="['motion']" />
        <BingTreeSelect v-model="large" :options="workspaceTree" size="lg" :default-expanded-values="['docs']" />
      </div>
    `,
  }),
}

export const Widths: Story = {
  name: '容器宽度',
  render: () => ({
    components: { BingTreeSelect },
    setup() {
      const compact = ref<BingTreeSelectModelValue>('bing-input')
      const narrow = ref<BingTreeSelectModelValue>(['bing-input', 'bing-select'])
      const regular = ref<BingTreeSelectModelValue>('motion')
      const wide = ref<BingTreeSelectModelValue>([
        'workspace-1-item-1',
        'workspace-2-item-4',
        'workspace-4-item-9',
      ])

      return {
        compact,
        narrow,
        regular,
        virtualTree,
        wide,
        workspaceTree,
      }
    },
    template: `
      <div style="display: grid; grid-template-columns: minmax(0, 1fr); width: 540px; max-width: calc(100vw - 32px); gap: 16px; align-items: start;">
        <div style="width: 180px; max-width: 100%;">
          <BingTreeSelect
            v-model="compact"
            :options="workspaceTree"
            placeholder="紧凑树形选择"
            :default-expanded-values="['creative', 'inputs']"
            :panel-max-height="280"
            block
          />
        </div>
        <div style="width: 240px; max-width: 100%;">
          <BingTreeSelect
            v-model="narrow"
            :options="workspaceTree"
            multiple
            check-strictly
            placeholder="窄容器多选"
            :default-expanded-values="['creative', 'inputs']"
            :panel-max-height="300"
            block
          />
        </div>
        <div style="width: 360px; max-width: 100%;">
          <BingTreeSelect
            v-model="regular"
            :options="workspaceTree"
            placeholder="常规树形选择"
            :default-expanded-values="['motion']"
            block
          />
        </div>
        <div style="width: 100%;">
          <BingTreeSelect
            v-model="wide"
            :options="virtualTree"
            multiple
            searchable
            default-expand-all
            virtual
            placeholder="随容器宽度展开"
            select-all-text="全选节点"
            clear-all-text="清空节点"
            :panel-max-height="360"
            block
          />
        </div>
      </div>
    `,
  }),
}

export const PanelPlacement: Story = {
  name: '面板位置',
  render: () => ({
    components: { BingTreeSelect },
    setup() {
      const value = ref<BingTreeSelectModelValue>('bing-tree-select')

      return {
        value,
        workspaceTree,
      }
    },
    template: `
      <div style="box-sizing: border-box; width: min(860px, calc(100vw - 48px)); min-height: 460px; padding-top: 190px;">
        <BingTreeSelect
          v-model="value"
          :options="workspaceTree"
          :default-expanded-values="['creative', 'inputs']"
          panel-placement="right"
          panel-align="end"
          :panel-gap="24"
          :panel-max-height="260"
          placeholder="右侧对齐的面板"
        />
      </div>
    `,
  }),
}

export const States: Story = {
  name: '状态',
  render: () => ({
    components: { BingTreeSelect },
    setup: () => ({ workspaceTree }),
    template: `
      <div style="display: grid; gap: 14px; width: min(280px, calc(100vw - 48px));">
        <BingTreeSelect :options="workspaceTree" placeholder="请选择一个节点" />
        <BingTreeSelect :options="workspaceTree" status="error" placeholder="请选择必填节点" />
        <BingTreeSelect :options="workspaceTree" model-value="bing-select" disabled />
        <BingTreeSelect :options="workspaceTree" :model-value="['bing-input', 'bing-select']" multiple disabled />
      </div>
    `,
  }),
}
