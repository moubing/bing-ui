import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, reactive, ref, watch } from 'vue'
import { fn } from 'storybook/test'
import BingButton from '../BingButton/BingButton.vue'
import BingCheckboxGroup from '../BingCheckboxGroup/BingCheckboxGroup.vue'
import type { BingCheckboxGroupValue } from '../BingCheckboxGroup/BingCheckboxGroup.types'
import BingDialog from '../BingDialog/BingDialog.vue'
import BingForm from '../BingForm/BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingCheckbox from './BingCheckbox.vue'
import type { BingCheckboxProps } from './BingCheckbox.types'

type StoryArgs = BingCheckboxProps & {
  onChange: (value: boolean, event: Event) => void
}

const meta = {
  title: 'Components/BingCheckbox',
  component: BingCheckbox,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: 'boolean',
    },
    indeterminate: {
      control: 'boolean',
    },
    disabled: {
      control: 'boolean',
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    shape: {
      control: 'inline-radio',
      options: ['rounded', 'circle'],
    },
    tone: {
      control: 'inline-radio',
      options: ['primary', 'secondary'],
    },
    decorative: {
      table: {
        disable: true,
      },
    },
    onChange: {
      control: false,
      table: {
        category: '事件',
      },
    },
  },
  args: {
    modelValue: false,
    indeterminate: false,
    disabled: false,
    size: 'md',
    shape: 'rounded',
    tone: 'primary',
    label: '显示图层',
    onChange: fn(),
  },
  render: (args) => ({
    components: { BingCheckbox },
    setup() {
      const checked = ref(args.modelValue)

      watch(
        () => args.modelValue,
        (value) => {
          checked.value = value
        },
      )

      return {
        args,
        checked,
      }
    },
    template: `
      <BingCheckbox
        v-model="checked"
        :indeterminate="args.indeterminate"
        :disabled="args.disabled"
        :size="args.size"
        :shape="args.shape"
        :tone="args.tone"
        :status="args.status"
        :label="args.label"
        @change="args.onChange"
      />
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const Checked: Story = {
  name: '选中状态',
  args: {
    modelValue: true,
  },
}

export const Indeterminate: Story = {
  name: '半选状态',
  args: {
    indeterminate: true,
    tone: 'secondary',
    label: '部分图层已选择',
  },
}

export const States: Story = {
  name: '状态',
  render: () => ({
    components: { BingCheckbox },
    setup() {
      const first = ref(false)
      const second = ref(true)

      return {
        first,
        second,
      }
    },
    template: `
      <div style="display: grid; gap: 8px; width: min(340px, calc(100vw - 48px));">
        <BingCheckbox v-model="first" label="显示图层" />
        <BingCheckbox v-model="second" label="启用地图标注" />
        <BingCheckbox indeterminate label="部分图层已选择" />
        <BingCheckbox :model-value="true" disabled label="已锁定的图层" />
        <BingCheckbox disabled label="暂不可用" />
        <BingCheckbox v-model="first" shape="circle" label="圆形勾选框" />
        <BingCheckbox v-model="second" tone="secondary" label="彩色变体" />
        <BingCheckbox v-model="first" status="error" label="请确认数据使用范围" />
      </div>
    `,
  }),
}

export const Sizes: Story = {
  name: '尺寸与形状',
  render: () => ({
    components: { BingCheckbox, BingInput },
    setup() { return { sizes: ['sm', 'md', 'lg'], selected: ref([true, true, true]) } },
    template: `
      <div style="display: grid; gap: 18px; width: min(420px, calc(100vw - 48px));">
        <div v-for="(size, index) in sizes" :key="size" style="display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 16px;">
          <BingCheckbox v-model="selected[index]" :size="size" :label="size.toUpperCase() + ' 图层可见'" />
          <BingInput :size="size" :clearable="false" placeholder="同档尺寸" block />
        </div>
        <BingCheckbox v-model="selected[0]" :size="26" label="自定义 26px" />
        <BingCheckbox v-model="selected[1]" :size="26" shape="circle" label="自定义圆形" />
        <BingCheckbox v-model="selected[2]" label="很长的图层名称会自动换行，保持文字完整可读，点击整段文字均可切换选择状态。" />
      </div>
    `,
  }),
}

export const InteractionDetails: Story = {
  name: '交互细节',
  render: () => ({
    components: { BingCheckbox, BingButton },
    setup() {
      const checked = ref(false)
      const state = ref('mixed')
      const error = ref(false)
      return { checked, state, error }
    },
    template: `
      <div style="display: grid; gap: 24px; width: min(440px, calc(100vw - 48px));">
        <section style="display: grid; gap: 8px;">
          <BingCheckbox v-model="checked" label="显示地图标注" />
          <p style="margin: 0; color: var(--bing-muted); font-size: 13px;">悬停预览，按住感受反馈。也可以用 Tab 和空格操作，或快速连续点击。</p>
        </section>
        <section style="display: grid; gap: 12px;">
          <BingCheckbox :model-value="state === 'checked'" :indeterminate="state === 'mixed'"
            label="选择全部图层" @change="state = $event ? 'checked' : 'none'" />
          <div style="display: flex; gap: 8px;">
            <BingButton v-for="item in [{ value: 'none', label: '清空' }, { value: 'mixed', label: '部分选择' }, { value: 'checked', label: '全部选择' }]"
              :key="item.value" variant="secondary" size="sm" @click="state = item.value">{{ item.label }}</BingButton>
          </div>
        </section>
        <section style="display: flex; align-items: center; gap: 16px;">
          <BingCheckbox v-model="checked" aria-label="无文字的复选框" />
          <span style="color: var(--bing-muted); font-size: 13px;">小控件也可以轻松点中</span>
        </section>
        <section style="display: grid; gap: 8px;">
          <BingCheckbox v-model="checked" :status="error ? 'error' : 'default'" label="确认数据使用范围" />
          <BingButton variant="secondary" size="sm" @click="error = !error">{{ error ? '清除提醒' : '显示校验提醒' }}</BingButton>
        </section>
      </div>
    `,
  }),
}

export const BatchSelection: Story = {
  name: '批量选择',
  render: () => ({
    components: { BingCheckbox, BingCheckboxGroup },
    setup() {
      const selected = ref<BingCheckboxGroupValue[]>([])
      const options = ['道路', '建筑', '水系', '地形', '影像', '边界', '兴趣点', '归档图层'].map((label, index) => ({
        label, value: index, disabled: index === 7,
      }))
      const all = computed(() => selected.value.length === 7)
      function toggleAll(checked: boolean) { selected.value = checked ? options.filter(item => !item.disabled).map(item => item.value) : [] }
      return { selected, options, all, toggleAll }
    },
    template: `
      <div style="display: grid; gap: 20px; width: min(440px, calc(100vw - 48px));">
        <BingCheckbox :model-value="all" :indeterminate="selected.length > 0 && !all" label="全选图层" @change="toggleAll" />
        <BingCheckboxGroup v-model="selected" :options="options" direction="column" drag-select range-select aria-label="批量选择图层" />
        <p style="margin: 0; color: var(--bing-muted); font-size: 13px;">按住鼠标划过多个图层可连续勾选；按住 Shift 点击可选择一个范围。归档图层不可选择。</p>
        <output aria-live="polite">已选择 {{ selected.length }} 个图层</output>
      </div>
    `,
  }),
}

export const ScrollableDialog: Story = {
  name: '可滚动弹窗中的复选框',
  parameters: {
    docs: {
      description: {
        story: '打开弹窗并滚动至项目角色，可用鼠标勾选，也可用 Tab 聚焦、空格切换。复选框获焦和反复切换时，内容与底部操作区的间距应保持稳定。',
      },
    },
  },
  render: () => ({
    components: { BingButton, BingCheckboxGroup, BingDialog, BingForm, BingFormItem, BingInput },
    setup() {
      const open = ref(false)
      const roles = ref<BingCheckboxGroupValue[]>([])
      const form = reactive<Record<string, string>>({
        name: '', username: '', email: '', password: '', team: '', title: '', note: '',
      })
      const fields = [
        { key: 'name', label: '姓名', placeholder: '请输入姓名' },
        { key: 'username', label: '用户名', placeholder: '请输入登录用户名' },
        { key: 'email', label: '邮箱', placeholder: '请输入邮箱' },
        { key: 'password', label: '初始密码', placeholder: '请设置初始密码' },
        { key: 'team', label: '所属团队', placeholder: '请输入团队名称' },
        { key: 'title', label: '职位', placeholder: '请输入职位' },
        { key: 'note', label: '备注', placeholder: '可补充用户说明' },
      ]
      const roleOptions = ['UI 设计', '开发', '运维', '产品经理', '项目管理员', '测试'].map((label) => ({
        label,
        value: label,
      }))
      return { open, roles, form, fields, roleOptions }
    },
    template: `
      <div style="display: grid; gap: 16px; max-width: 420px;">
        <p style="margin: 0; color: var(--bing-muted);">打开弹窗，滚动至底部的项目角色，再用鼠标或键盘选择角色。</p>
        <BingButton @click="open = true">新增用户</BingButton>
        <BingDialog v-model="open" title="新增用户" :width="610" confirm-text="完成" @confirm="open = false">
          <BingForm :model="form" @submit.prevent>
            <BingFormItem v-for="field in fields" :key="field.key" :prop="field.key" :label="field.label">
              <BingInput v-model="form[field.key]" :type="field.key === 'password' ? 'password' : 'text'" :placeholder="field.placeholder" />
            </BingFormItem>
            <div style="display: grid; gap: 12px;">
              <strong>项目角色</strong>
              <BingCheckboxGroup v-model="roles" :options="roleOptions" aria-label="项目角色" />
              <p style="color: var(--bing-muted); font-size: 13px;">可分配多个项目角色，已选择 {{ roles.length }} 项。</p>
            </div>
          </BingForm>
        </BingDialog>
      </div>
    `,
  }),
}
