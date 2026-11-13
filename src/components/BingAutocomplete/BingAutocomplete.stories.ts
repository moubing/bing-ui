import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BingAutocomplete from './BingAutocomplete.vue'

const meta: Meta<typeof BingAutocomplete> = { title: 'Components/BingAutocomplete', component: BingAutocomplete, tags: ['autodocs'] }
export default meta
type Story = StoryObj<typeof meta>
export const OptionAction: Story = {
  name: '独立行尾操作',
  render: () => ({
    components: { BingAutocomplete },
    setup() {
      const query = ref('REQ'), result = ref('尚未操作')
      const options = [{ value: 1, label: 'REQ-1（搜索结果可在当前页或新标签页打开）' }, { value: 2, label: 'REQ-2（另一条文档）' }, { value: 3, label: 'REQ-3（不可访问）', disabled: true }]
      return { query, result, options }
    },
    template: `<div style="padding:24px;max-width:520px"><BingAutocomplete v-model="query" :options="options" :complete-on-select="false" :close-on-select="false" option-action-label="在新标签页打开" aria-label="文档搜索" @select="result = '当前页：' + $event.label" @option-action="result = '新标签页：' + $event.label"><template #option-action>↗</template></BingAutocomplete><p role="status">{{ result }}</p><p>输入框 Enter 选择；F2 进入当前行按钮，上下键切换按钮，左键返回输入，Esc 收起。</p></div>`,
  }),
}
export const Default: Story = {
  render: () => ({
    components: { BingAutocomplete },
    setup() {
      const query = ref('')
      const selected = ref('尚未选择')
      const options = Array.from({ length: 25 }, (_, i) => ({ value: i, label: `REQ-${i + 1}（${i ? '需求文档与交互优化' : '支持中文输入搜索'}）`,
        detail: i % 2 ? '统一候选面板和详情面板的交互。支持悬停、方向键和边缘避让，切换时保留连续过渡。' : '优化中文输入体验。',
        meta: { 状态: '进行中', 负责人: '设计同学', 优先级: '中' } }))
      return { query, selected, options }
    },
    template: `<div style="padding:24px;max-width:520px"><BingAutocomplete v-model="query" :options="options" placeholder="输入需求号或名称" aria-label="搜索需求" @select="selected = $event.label" /><p>已选择：{{ selected }}</p></div>`,
  }),
}

export const SearchOnInput: Story = {
  name: '输入后展开',
  render: () => ({
    components: { BingAutocomplete },
    setup() {
      const query = ref('')
      const options = [{ value: 1, label: 'REQ-1（需求搜索）' }, { value: 2, label: 'REQ-2（输入交互优化）' }]
      return { query, options }
    },
    template: `<div style="padding:24px;max-width:520px"><BingAutocomplete v-model="query" :options="options" :open-on-empty="false" placeholder="输入需求号或名称" aria-label="按需搜索" /><p>空输入或纯空白不展示候选，清空后自动收起。</p></div>`,
  }),
}
