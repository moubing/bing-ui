import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive, ref } from 'vue'
import { z } from 'zod'
import BingButton from './BingButton/BingButton.vue'
import BingDialog from './BingDialog/BingDialog.vue'
import BingForm from './BingForm/BingForm.vue'
import type { BingFormExpose } from './BingForm/BingForm.types'
import BingFormItem from './BingFormItem/BingFormItem.vue'
import BingInput from './BingInput/BingInput.vue'
import BingSelect from './BingSelect/BingSelect.vue'
import BingTreeSelect from './BingTreeSelect/BingTreeSelect.vue'
import BingDatePicker from './BingDatePicker/BingDatePicker.vue'
import BingColorPicker from './BingColorPicker/BingColorPicker.vue'
import BingRadioGroup from './BingRadioGroup/BingRadioGroup.vue'
import BingDropDown from './BingDropDown/BingDropDown.vue'
import BingDropDownItem from './BingDropDown/BingDropDownItem.vue'
import BingTable from './BingTable/BingTable.vue'

const components = { BingButton, BingDialog, BingForm, BingFormItem, BingInput, BingSelect, BingTreeSelect, BingDatePicker, BingColorPicker, BingRadioGroup, BingDropDown, BingDropDownItem, BingTable }
const options = [{ value: 'design', label: '设计' }, { value: 'engineering', label: '开发' }, { value: 'qa', label: '测试' }]
const meta = { title: 'Composition/组件联动', parameters: { layout: 'fullscreen' }, tags: ['autodocs'] } satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const DialogForm: Story = {
  name: '弹窗与表单',
  render: () => ({
    components,
    setup() {
      const open = ref(false)
      const nested = ref(false)
      const form = ref<BingFormExpose>()
      const saving = ref(false)
      const result = ref('')
      const model = reactive({ name: '', role: null as string | null, team: 'design', reviewer: 'qa', date: null as string | null, color: '#ec4899' })
      const schema = z.object({ name: z.string().min(1, '请输入姓名'), role: z.string({ error: '请选择职责' }) })
      async function save() {
        saving.value = true
        try {
          if (await form.value?.validate()) { result.value = `已保存：${model.name}`; open.value = false }
        } finally { saving.value = false }
      }
      return { open, nested, model, form, schema, save, saving, result, options }
    },
    template: `
      <div style="padding: 32px; display: grid; gap: 16px; justify-items: start;">
        <BingButton @click="open = true">编辑成员</BingButton>
        <p role="status">{{ result || '弹窗中支持搜索选择、独立单选组、下拉菜单和嵌套弹窗。' }}</p>
        <BingDialog v-model="open" title="编辑成员" :width="760" :show-peek="false" :confirm-loading="saving" @confirm="save">
          <BingForm ref="form" :model="model" :schema="schema" :columns="{ base: 1, sm: 2 }">
            <BingFormItem prop="name" label="姓名" required><BingInput v-model="model.name" id="member-name" maxlength="40" /></BingFormItem>
            <BingFormItem prop="role" label="职责" required><BingSelect v-model="model.role" :options="options" searchable placeholder="搜索并选择职责" /></BingFormItem>
            <BingFormItem label="所属团队"><BingRadioGroup v-model="model.team" :options="options" /></BingFormItem>
            <BingFormItem label="审核团队"><BingRadioGroup v-model="model.reviewer" :options="options" /></BingFormItem>
            <BingFormItem label="加入日期"><BingDatePicker v-model="model.date" /></BingFormItem>
            <BingFormItem label="标记颜色"><BingColorPicker v-model="model.color" /></BingFormItem>
            <BingFormItem label="更多操作">
              <BingDropDown>
                <template #trigger="{ triggerProps }"><BingButton v-bind="triggerProps" variant="secondary">成员操作</BingButton></template>
                <BingDropDownItem title="查看高级设置" @click="nested = true" />
                <BingDropDownItem title="重置表单" @click="form?.resetFields()" />
              </BingDropDown>
            </BingFormItem>
          </BingForm>
          <BingDialog v-model="nested" title="高级设置" :width="420" :show-peek="false" :show-footer="false">
            <BingInput placeholder="扩展备注" />
          </BingDialog>
        </BingDialog>
      </div>
    `,
  }),
}

export const EditableTable: Story = {
  name: '表格中的操作控件',
  render: () => ({
    components,
    setup() {
      const selected = ref<Array<string | number>>([])
      const action = ref('')
      const rows = reactive(Array.from({ length: 500 }, (_, index) => ({ id: index + 1, name: `成员 ${index + 1}`, role: 'design' })))
      const columns = [{ key: 'name', title: '姓名', width: 200 }, { key: 'role', title: '职责', width: 320 }, { key: 'actions', title: '操作', width: 260 }]
      return { rows, columns, selected, action, options }
    },
    template: `
      <div style="padding: 32px; display: grid; gap: 16px;">
        <p>点击空白单元格选中行；编辑与下拉操作保留各自交互。共 500 行，自动启用虚拟滚动。</p>
        <BingTable :data="rows" :columns="columns" v-model:selected-row-keys="selected" selectable select-on-row-click :height="440" :pagination="false">
          <template #cell-role="{ row }"><BingSelect v-model="row.role" :options="options" placeholder="请选择职责" /></template>
          <template #cell-actions="{ row }"><BingButton @click="action = '编辑：' + row.name">编辑</BingButton></template>
        </BingTable>
        <p role="status">{{ action || '尚未执行操作' }} · 已选 {{ selected.length }} 行</p>
      </div>
    `,
  }),
}

export const FormStates: Story = {
  name: '统一尺寸与禁用状态',
  render: () => ({
    components,
    setup() {
      const size = ref<'sm' | 'md' | 'lg'>('sm')
      const disabled = ref(false)
      return { size, disabled, options }
    },
    template: `
      <div style="padding: 32px; display: grid; gap: 20px;">
        <div style="display: flex; gap: 12px; align-items: center;">
          <label>尺寸 <select v-model="size"><option>sm</option><option>md</option><option>lg</option></select></label>
          <label><input v-model="disabled" type="checkbox" /> 禁用表单</label>
        </div>
        <BingForm :size="size" :disabled="disabled" :columns="1" label-position="left" style="max-width: 720px;">
          <BingFormItem label="输入框"><BingInput /></BingFormItem>
          <BingFormItem label="选择器"><BingSelect :options="options" /></BingFormItem>
          <BingFormItem label="树形选择"><BingTreeSelect :options="options" /></BingFormItem>
          <BingFormItem label="日期"><BingDatePicker /></BingFormItem>
          <BingFormItem label="颜色"><BingColorPicker /></BingFormItem>
          <div style="display: flex; gap: 12px;"><BingButton html-type="submit">提交</BingButton><BingButton :disabled="false" variant="secondary">始终可用的取消操作</BingButton></div>
        </BingForm>
      </div>
    `,
  }),
}
