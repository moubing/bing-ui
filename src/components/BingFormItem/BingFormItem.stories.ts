import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { reactive, ref } from 'vue'
import { z } from 'zod'
import BingButton from '../BingButton/BingButton.vue'
import BingForm from '../BingForm/BingForm.vue'
import type { BingFormExpose } from '../BingForm/BingForm.types'
import BingInput from '../BingInput/BingInput.vue'
import BingTextarea from '../BingTextarea/BingTextarea.vue'
import BingCheckboxGroup from '../BingCheckboxGroup/BingCheckboxGroup.vue'
import BingFormItem from './BingFormItem.vue'
import type { BingFormItemProps } from './BingFormItem.types'

const meta = {
  title: 'Components/BingFormItem',
  component: BingFormItem,
  tags: ['autodocs'],
  argTypes: {
    labelPosition: { control: 'inline-radio', options: ['left', 'top'] },
  },
  args: {
    label: '图层名称',
    prop: 'name',
    required: true,
    help: '用于图层列表展示，可随时修改',
    labelPosition: 'left',
  },
  render: (args) => ({
    components: { BingForm, BingFormItem, BingInput },
    setup() {
      const model = reactive({ name: '' })
      const schema = z.object({
        name: z.string().min(1, '请输入图层名称'),
      })

      return { args, model, schema }
    },
    template: `
      <BingForm :model="model" :schema="schema" label-position="left" :label-width="80" style="width: min(460px, calc(100vw - 48px));">
        <BingFormItem v-bind="args">
          <BingInput v-model="model.name" placeholder="例如：城市道路" />
        </BingFormItem>
      </BingForm>
    `,
  }),
} satisfies Meta<BingFormItemProps>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const ErrorMessage: Story = {
  name: '错误提示动效',
  parameters: {
    docs: { description: { story: '点击“检查信息”显示必填错误；在邮箱中输入不完整的地址，错误文案会原位更新；补全正确地址后，错误淡出并恢复帮助文案。首次错误整句淡入约 160ms，修正后约 100ms 淡出。帮助与错误共用一行空间，长文案正常换行。开启减少动态效果时直接切换。' } },
  },
  render: () => ({
    components: { BingButton, BingForm, BingFormItem, BingInput },
    setup() {
      const formRef = ref<BingFormExpose | null>(null)
      const model = reactive({ email: '', name: '' })
      const schema = z.object({
        email: z.string().min(1, '请输入联系邮箱').email('请输入有效的邮箱地址'),
        name: z.string(),
      })
      return { formRef, model, schema }
    },
    template: `
      <section style="box-sizing: border-box; width: min(460px, calc(100vw - 48px)); padding: 24px; border: 1px solid var(--bing-border); border-radius: 12px; background: var(--bing-surface-solid); color: var(--bing-text);">
        <h2 style="margin: 0 0 24px; font-size: 20px; font-weight: 500; color: var(--bing-heading);">联系信息</h2>
        <BingForm ref="formRef" :model="model" :schema="schema" layout="stack" :gap="16" :scroll-to-error="false">
          <BingFormItem prop="email" label="联系邮箱" required help="用于接收邀请和项目通知">
            <BingInput v-model="model.email" type="email" autocomplete="email" placeholder="lin@example.com" />
          </BingFormItem>
          <BingFormItem prop="name" label="称呼（选填）">
            <BingInput v-model="model.name" autocomplete="name" placeholder="例如：林晗" />
          </BingFormItem>
          <BingButton size="sm" style="justify-self: start;" @click="formRef?.validate()">检查信息</BingButton>
        </BingForm>
      </section>
    `,
  }),
}

export const MultipleFields: Story = {
  name: '多个字段的标签与错误关联',
  render: () => ({
    components: { BingButton, BingForm, BingFormItem, BingInput },
    setup() {
      const formRef = ref<BingFormExpose | null>(null)
      const model = reactive({ name: '', password: '' })
      const schema = z.object({
        name: z.string().min(1, '请输入姓名'),
        password: z.string().min(8, '密码至少 8 位'),
      })
      return { formRef, model, schema }
    },
    template: `
      <div style="box-sizing: border-box; width: min(460px, calc(100vw - 48px));">
        <BingForm ref="formRef" :model="model" :schema="schema" layout="stack" :scroll-to-error="false">
          <BingFormItem prop="name" label="姓名" help="输入成员姓名" required>
            <BingInput v-model="model.name" placeholder="成员姓名" />
          </BingFormItem>
          <BingFormItem prop="password" label="密码" help="至少 8 位字符" required>
            <BingInput v-model="model.password" type="password" placeholder="登录密码" />
          </BingFormItem>
        </BingForm>
        <div style="display: flex; gap: 10px; margin-top: 16px;">
          <BingButton size="sm" @click="formRef?.validate()">校验字段</BingButton>
          <BingButton size="sm" variant="ghost" @click="formRef?.clearValidate()">清除错误</BingButton>
        </div>
      </div>
    `,
  }),
}

export const Sizes: Story = {
  name: '三档尺寸',
  render: () => ({
    components: { BingForm, BingFormItem, BingInput },
    setup() { return { sizes: ['sm', 'md', 'lg'], models: reactive([{ name: '' }, { name: '' }, { name: '' }]) } },
    template: `
      <div style="display: grid; gap: 24px; width: min(460px, calc(100vw - 48px));">
        <section v-for="(size, index) in sizes" :key="size" style="display: grid; gap: 8px;">
          <span style="font-size: 12px; color: var(--bing-muted);">{{ { xs: '超小', sm: '小', md: '中', lg: '大', xl: '超大' }[size] }}</span>
          <BingForm :model="models[index]" :size="size" label-position="left" :label-width="80">
            <BingFormItem prop="name" label="图层名称" help="用于图层列表展示" required>
              <BingInput v-model="models[index].name" placeholder="例如：城市道路" />
            </BingFormItem>
          </BingForm>
        </section>
      </div>
    `,
  }),
}

export const Disabled: Story = {
  name: '整表禁用',
  render: () => ({
    components: { BingForm, BingFormItem, BingInput, BingTextarea, BingCheckboxGroup },
    setup() {
      return { model: reactive({ name: '城市道路', description: '道路与公共交通设施数据', visible: ['map'] }), options: [{ label: '地图', value: 'map' }, { label: '数据表', value: 'table' }] }
    },
    template: `
      <BingForm :model="model" layout="stack" disabled style="width: min(460px, calc(100vw - 48px));">
        <BingFormItem prop="name" label="图层名称" help="当前图层已锁定" required>
          <BingInput v-model="model.name" />
        </BingFormItem>
        <BingFormItem prop="visible" label="显示位置">
          <BingCheckboxGroup v-model="model.visible" :options="options" />
        </BingFormItem>
        <BingFormItem prop="description" label="描述">
          <BingTextarea v-model="model.description" :rows="2" />
        </BingFormItem>
      </BingForm>
    `,
  }),
}
