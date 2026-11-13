import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref, watch } from 'vue'
import { fn } from 'storybook/test'
import BingSelect from './BingSelect.vue'
import type {
  BingSelectChangePayload,
  BingSelectModelValue,
  BingSelectOption,
  BingSelectProps,
} from './BingSelect.types'

type StoryArgs = BingSelectProps & {
  onChange: (payload: BingSelectChangePayload) => void
  onClear: () => void
  onOpen: () => void
  onClose: () => void
}

const moodOptions: BingSelectOption[] = [
  {
    label: '极光',
    value: 'aurora',
    description: '柔和粉色动效',
    detail: '适合氛围面板与轻量反馈的柔和入场效果。',
    meta: {
      节奏: '平静',
      交互: '悬停',
    },
  },
  {
    label: '轨道',
    value: 'orbit',
    description: '蓝色悬停节奏',
    detail: '适合紧凑选项的循环动效节奏。',
    meta: {
      节奏: '平稳',
      交互: '聚焦',
    },
  },
  {
    label: '脉冲',
    value: 'pulse',
    description: '快速反馈动效',
    detail: '适合密集选择操作的快速确认反馈。',
    meta: {
      节奏: '快速',
      交互: '点击',
    },
  },
  {
    label: '丝绒',
    value: 'velvet',
    description: '柔和玻璃表面',
    detail: '降低对比度、减弱动效的安静风格。',
    meta: {
      节奏: '缓慢',
      交互: '表面',
    },
  },
  {
    label: '静态',
    value: 'static',
    description: '禁用选项',
    disabled: true,
  },
]

const longMoodOptions: BingSelectOption[] = Array.from({ length: 18 }, (_, index) => ({
  label: `动效预设 ${index + 1}`,
  value: `preset-${index + 1}`,
  description: index % 2 === 0 ? '柔和交互节奏' : '灵敏动效层',
  detail:
    index % 2 === 0
      ? '使用较慢的节奏，适合安静界面和轻松选择。'
      : '保持条目紧凑，同时快速响应指针操作。',
  meta: {
    分组: index % 2 === 0 ? '氛围' : '响应',
    强度: index % 3 === 0 ? '适中' : '轻量',
  },
}))

const virtualMoodOptions: BingSelectOption[] = Array.from({ length: 240 }, (_, index) => ({
  label: `虚拟动效 ${index + 1}`,
  value: `virtual-${index + 1}`,
  description:
    index % 5 === 0
      ? '此条目在密集列表中已禁用'
      : index % 2 === 0
        ? '快速虚拟列表悬停层'
        : '轻量渲染选项',
  detail:
    index % 2 === 0
      ? '仅渲染可见选项，并使用共享面板显示悬停详情。'
      : '保持条目紧凑，按需显示补充信息。',
  meta: {
    序号: index + 1,
    模式: index % 2 === 0 ? '快速' : '轻量',
  },
  disabled: index % 17 === 0,
}))

const meta = {
  title: 'Components/BingSelect',
  component: BingSelect,
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
    emptyText: {
      control: 'text',
    },
    searchable: {
      control: 'inline-radio',
      options: ['auto', true, false],
    },
    typeahead: { control: 'boolean', description: '打开面板后输入标签前缀或拼音首字母定位' },
    highlightMatches: { control: 'boolean', description: '高亮默认选项标签中的搜索命中' },
    searchPlaceholder: {
      control: 'text',
    },
    noSearchResultsText: {
      control: 'text',
    },
    smoothScroll: {
      control: 'boolean',
      description: '选项视口启用滚轮平滑滚动',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    block: {
      control: 'boolean',
    },
    width: {
      control: 'text',
    },
    minWidth: {
      control: 'text',
    },
    panelMinHeight: {
      control: {
        type: 'number',
        min: 80,
        max: 320,
        step: 20,
      },
    },
    panelMaxHeight: {
      control: {
        type: 'number',
        min: 120,
        max: 420,
        step: 20,
      },
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
      description: '默认随尺寸变化；自定义选项内容可显式设置固定行高。',
      control: {
        type: 'number',
        min: 28,
        max: 84,
        step: 2,
      },
    },
    virtualOverscan: {
      control: {
        type: 'number',
        min: 0,
        max: 12,
        step: 1,
      },
    },
    ariaLabel: {
      control: 'text',
    },
    onChange: {
      control: false,
      table: {
        category: '事件',
      },
    },
    onClear: {
      control: false,
      table: {
        category: '事件',
      },
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
    modelValue: null,
    options: moodOptions,
    multiple: false,
    placeholder: '请选择动效风格',
    disabled: false,
    clearable: true,
    showSelectAll: true,
    selectAllText: '全选 moods',
    clearAllText: '清空已选 moods',
    emptyText: '暂无风格',
    searchable: 'auto',
    typeahead: true,
    highlightMatches: true,
    searchPlaceholder: '搜索动效（/）',
    noSearchResultsText: '未找到匹配动效',
    smoothScroll: true,
    size: 'md',
    block: false,
    width: undefined,
    minWidth: 180,
    panelMinHeight: 0,
    panelMaxHeight: 320,
    panelPlacement: 'auto',
    panelAlign: 'start',
    panelGap: 10,
    virtual: 'auto',
    virtualThreshold: 80,
    virtualItemHeight: undefined,
    virtualOverscan: 4,
    ariaLabel: undefined,
    onChange: fn(),
    onClear: fn(),
    onOpen: fn(),
    onClose: fn(),
  },
  render: (args) => ({
    components: { BingSelect },
    setup() {
      const value = ref<BingSelectModelValue>(args.modelValue ?? null)

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue ?? null
        },
      )

      return {
        args,
        value,
      }
    },
    template: `
      <BingSelect
        v-model="value"
        :options="args.options"
        :multiple="args.multiple"
        :placeholder="args.placeholder"
        :disabled="args.disabled"
        :clearable="args.clearable"
        :show-select-all="args.showSelectAll"
        :select-all-text="args.selectAllText"
        :clear-all-text="args.clearAllText"
        :empty-text="args.emptyText"
        :searchable="args.searchable"
        :typeahead="args.typeahead"
        :highlight-matches="args.highlightMatches"
        :search-placeholder="args.searchPlaceholder"
        :no-search-results-text="args.noSearchResultsText"
        :smooth-scroll="args.smoothScroll"
        :size="args.size"
        :block="args.block"
        :width="args.width"
        :min-width="args.minWidth"
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
      >
        <template #option-detail="{ option, selected }">
          <span class="bing-select__option-detail-title">
            {{ option.label }}<span v-if="selected"> 已选</span>
          </span>
          <span class="bing-select__option-detail-text">
            {{ option.detail || option.description || '暂无补充说明' }}
          </span>
          <span
            v-for="(value, key) in option.meta || {}"
            :key="key"
            class="bing-select__option-detail-meta"
          >
            <span class="bing-select__option-detail-meta-key">{{ key }}</span>
            <span class="bing-select__option-detail-meta-value">{{ value }}</span>
          </span>
        </template>
      </BingSelect>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Single: Story = { name: '单选' }

export const Typeahead: Story = {
  name: 'Typeahead 快速定位',
  args: {
    size: 'sm', block: true, searchable: false, ariaLabel: '状态',
    options: [
      { label: '待处理', value: 'queued' }, { label: '进行中', value: 'doing' },
      { label: '测试中', value: 'testing' }, { label: '已完成', value: 'done' },
      { label: '已关闭', value: 'closed', disabled: true },
      { label: 'Pending', value: 'pending' }, { label: 'Published', value: 'published' },
    ],
  },
  parameters: { docs: { description: { story: '打开后输入 jxz 定位“进行中”；连续按 p 在两个英文选项间循环。关闭时输入不改值。' } } },
}

export const SearchHighlights: Story = {
  name: '搜索高亮',
  args: {
    searchable: true,
    options: [
      { label: '重庆动效', value: 'chongqing' }, { label: '上海动效', value: 'shanghai' },
      { label: 'Blue Sky', value: 'blue' }, { label: 'Café Motion', value: 'cafe' },
      { label: '动效预设 12', value: 'preset-12' },
    ],
    searchPlaceholder: '试试 cq、bs、cafe 或 12',
  },
}

export const SelectAllCount: Story = {
  name: '全选计数',
  args: {
    multiple: true, searchable: true, options: longMoodOptions,
    modelValue: ['preset-2', 'preset-7'], selectAllText: '全选', width: 300,
  },
  parameters: { docs: { description: { story: '全选行显示当前可用结果的已选数与总数；搜索后仅操作匹配结果，保留范围外的选择。' } } },
}

export const Multiple: Story = {
  name: '多选',
  args: {
    multiple: true,
    modelValue: ['aurora', 'pulse'],
    placeholder: '请选择风格',
  },
}

export const ShortList: Story = {
  name: '短列表',
  args: {
    options: [moodOptions[0]],
    placeholder: '请选择可用风格',
    panelMaxHeight: 280,
  },
}

export const LongList: Story = {
  name: '长列表',
  args: {
    smoothScroll: true,
    multiple: true,
    modelValue: ['preset-2', 'preset-7'],
    options: longMoodOptions,
    placeholder: '请选择动效预设',
    selectAllText: '全选 presets',
    panelMaxHeight: 320,
  },
}

export const VirtualList: Story = {
  name: '虚拟列表',
  args: {
    smoothScroll: true,
    multiple: true,
    modelValue: ['virtual-2', 'virtual-74'],
    options: virtualMoodOptions,
    placeholder: '请选择虚拟列表中的动效',
    selectAllText: '虚拟动效列表',
    panelMinHeight: 220,
    panelMaxHeight: 340,
    virtual: true,
    virtualItemHeight: 44,
    virtualOverscan: 5,
  },
}

export const TagOverflow: Story = {
  name: '标签溢出',
  args: {
    multiple: true,
    modelValue: [
      'preset-1',
      'preset-2',
      'preset-3',
      'preset-4',
      'preset-5',
      'preset-6',
    ],
    options: longMoodOptions,
    placeholder: '请选择动效预设',
    selectAllText: '全选 presets',
  },
}

export const Sizes: Story = {
  name: '尺寸',
  render: () => ({
    components: { BingSelect },
    setup() {
      const small = ref<BingSelectModelValue>('aurora')
      const medium = ref<BingSelectModelValue>('orbit')
      const large = ref<BingSelectModelValue>('pulse')

      return {
        large,
        medium,
        moodOptions,
        small,
      }
    },
    template: `
      <div style="display: grid; max-width: 380px; gap: 14px;">
        <BingSelect v-model="small" :options="moodOptions" size="sm" />
        <BingSelect v-model="medium" :options="moodOptions" size="md" />
        <BingSelect v-model="large" :options="moodOptions" size="lg" />
      </div>
    `,
  }),
}

export const Widths: Story = {
  name: '宽度',
  render: () => ({
    components: { BingSelect },
    setup() {
      const compact = ref<BingSelectModelValue>('aurora')
      const narrow = ref<BingSelectModelValue>(['aurora', 'pulse'])
      const regular = ref<BingSelectModelValue>('orbit')
      const wide = ref<BingSelectModelValue>(['preset-2', 'preset-7', 'preset-11'])

      return {
        compact,
        longMoodOptions,
        moodOptions,
        narrow,
        regular,
        wide,
      }
    },
    template: `
      <div style="display: grid; gap: 16px; align-items: start;">
        <div style="width: 180px;">
          <BingSelect
            v-model="compact"
            :options="moodOptions"
            placeholder="紧凑宽度"
            :panel-max-height="260"
            block
          />
        </div>
        <div style="width: 240px;">
          <BingSelect
            v-model="narrow"
            :options="moodOptions"
            multiple
            placeholder="窄幅多选"
            :panel-max-height="280"
            block
          />
        </div>
        <div style="width: 360px;">
          <BingSelect
            v-model="regular"
            :options="moodOptions"
            placeholder="常规宽度"
            block
          />
        </div>
        <div style="width: min(100%, 540px);">
          <BingSelect
            v-model="wide"
            :options="longMoodOptions"
            multiple
            searchable
            width="100%"
            :min-width="180"
            placeholder="自适应宽幅多选"
            select-all-text="全选预设"
            clear-all-text="清空预设"
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
    components: { BingSelect },
    setup() {
      const value = ref<BingSelectModelValue>('orbit')

      return {
        longMoodOptions,
        value,
      }
    },
    template: `
      <div style="min-height: 420px; padding: 150px 0 0 min(46vw, 520px);">
        <BingSelect
          v-model="value"
          :options="longMoodOptions"
          panel-placement="left"
          panel-align="middle"
          :panel-gap="24"
          :panel-max-height="240"
          placeholder="左侧居中面板"
        />
      </div>
    `,
  }),
}

export const CustomOption: Story = {
  name: '自定义选项',
  args: {
    multiple: true,
    modelValue: ['aurora'],
  },
  render: (args) => ({
    components: { BingSelect },
    setup() {
      const value = ref<BingSelectModelValue>(args.modelValue ?? [])

      return {
        args,
        value,
      }
    },
    template: `
      <BingSelect
        v-model="value"
        :options="args.options"
        multiple
        placeholder="组合预设"
        select-all-text="选择全部预设"
      >
        <template #option="{ option, selected }">
          <span class="bing-select__option-label">
            {{ option.label }}<span v-if="selected"> 已选</span>
          </span>
        </template>
        <template #option-detail="{ option, selected }">
          <span class="bing-select__option-detail-title">
            {{ option.label }}<span v-if="selected"> 已选</span>
          </span>
          <span class="bing-select__option-detail-text">
            {{ option.detail || option.description || '可以开始体验交互' }}
          </span>
          <span
            v-for="(value, key) in option.meta || {}"
            :key="key"
            class="bing-select__option-detail-meta"
          >
            <span class="bing-select__option-detail-meta-key">{{ key }}</span>
            <span class="bing-select__option-detail-meta-value">{{ value }}</span>
          </span>
        </template>
      </BingSelect>
    `,
  }),
}
