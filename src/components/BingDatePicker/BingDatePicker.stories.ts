import type { Meta, StoryObj } from '@storybook/vue3-vite'
import dayjs from 'dayjs'
import { reactive, ref, watch } from 'vue'
import { fn } from 'storybook/test'
import { z } from 'zod'
import BingButton from '../BingButton/BingButton.vue'
import BingForm from '../BingForm/BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import BingTextarea from '../BingTextarea/BingTextarea.vue'
import BingDatePicker from './BingDatePicker.vue'
import type {
  BingDatePickerChangePayload,
  BingDatePickerModelValue,
  BingDatePickerProps,
} from './BingDatePicker.types'

type StoryArgs = BingDatePickerProps & {
  onChange: (payload: BingDatePickerChangePayload) => void
  onClear: () => void
  onOpen: () => void
  onClose: () => void
  onConfirm: (payload: BingDatePickerChangePayload) => void
  onCancel: () => void
}

const modeOptions = [
  { label: '工作坊', value: 'workshop' },
  { label: '发布活动', value: 'launch' },
  { label: '维护窗口', value: 'maintenance' },
]

const meta = {
  title: 'Components/BingDatePicker',
  component: BingDatePicker,
  tags: ['autodocs'],
  argTypes: {
    modelValue: {
      control: false,
    },
    type: {
      control: 'inline-radio',
      options: ['date', 'datetime', 'month', 'year', 'time'],
    },
    range: {
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
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    block: {
      control: 'boolean',
    },
    smoothScroll: {
      control: 'boolean',
      description: '时间列表启用平滑滚动。',
    },
    firstDayOfWeek: {
      control: {
        type: 'number',
        min: 0,
        max: 6,
        step: 1,
      },
    },
    min: {
      control: 'text',
    },
    max: {
      control: 'text',
    },
    disabledDate: {
      control: false,
    },
    disabledTime: {
      control: false,
    },
  },
  args: {
    modelValue: null,
    type: 'date',
    range: false,
    placeholder: '选择日期',
    startPlaceholder: '开始',
    endPlaceholder: '结束',
    disabled: false,
    clearable: true,
    size: 'md',
    block: false,
    smoothScroll: true,
    firstDayOfWeek: 1,
    showShortcuts: true,
    panelMaxHeight: 420,
    onChange: fn(),
    onClear: fn(),
    onOpen: fn(),
    onClose: fn(),
    onConfirm: fn(),
    onCancel: fn(),
  },
  render: (args) => ({
    components: { BingDatePicker },
    setup() {
      const value = ref<BingDatePickerModelValue>(args.modelValue ?? null)

      watch(
        () => args.modelValue,
        (nextValue) => {
          value.value = nextValue ?? null
        },
      )

      return { args, value }
    },
    template: `
      <div style="width: min(280px, calc(100vw - 48px));">
        <BingDatePicker
          v-model="value"
          :type="args.type"
          :range="args.range"
          :placeholder="args.placeholder"
          :start-placeholder="args.startPlaceholder"
          :end-placeholder="args.endPlaceholder"
          :disabled="args.disabled"
          :clearable="args.clearable"
          :size="args.size"
          :min-width="args.minWidth"
          :glass="args.glass"
          :glass-blur="args.glassBlur"
          :glass-opacity="args.glassOpacity"
          :glass-saturation="args.glassSaturation"
          :block="args.block"
          :format="args.format"
          :value-format="args.valueFormat"
          :locale="args.locale"
          :first-day-of-week="args.firstDayOfWeek"
          :min="args.min"
          :max="args.max"
          :disabled-date="args.disabledDate"
          :disabled-time="args.disabledTime"
          :hour-step="args.hourStep"
          :minute-step="args.minuteStep"
          :second-step="args.secondStep"
          :smooth-scroll="args.smoothScroll"
          :show-shortcuts="args.showShortcuts"
          :panel-max-height="args.panelMaxHeight"
          :status="args.status"
          :aria-label="args.ariaLabel"
          :aria-describedby="args.ariaDescribedby"
          @change="args.onChange"
          @clear="args.onClear"
          @open="args.onOpen"
          @close="args.onClose"
          @confirm="args.onConfirm"
          @cancel="args.onCancel"
        />
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta

type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const PickerTypes: Story = {
  name: '日期与时间类型',
  render: () => ({
    components: { BingDatePicker },
    setup() {
      const date = ref('2026-06-20')
      const datetime = ref('2026-06-20 09:30:00')
      const month = ref('2026-06')
      const year = ref('2026')
      const time = ref('09:30:00')

      return { date, datetime, month, time, year }
    },
    template: `
      <div style="display: grid; width: min(360px, calc(100vw - 48px)); gap: 14px;">
        <BingDatePicker v-model="date" type="date" placeholder="选择日期" block />
        <BingDatePicker v-model="datetime" type="datetime" placeholder="选择日期与时间" block />
        <BingDatePicker v-model="month" type="month" placeholder="选择月份" block />
        <BingDatePicker v-model="year" type="year" placeholder="选择年份" block />
        <BingDatePicker v-model="time" type="time" placeholder="选择时间" block />
      </div>
    `,
  }),
}

export const RangePickers: Story = {
  name: '范围选择',
  render: () => ({
    components: { BingDatePicker },
    setup() {
      const dateRange = ref<BingDatePickerModelValue>(['2026-06-01', '2026-06-20'])
      const datetimeRange = ref<BingDatePickerModelValue>([
        '2026-06-01 09:00:00',
        '2026-06-20 18:00:00',
      ])
      const timeRange = ref<BingDatePickerModelValue>(['09:00:00', '18:00:00'])

      return { dateRange, datetimeRange, timeRange }
    },
    template: `
      <div style="display: grid; width: min(620px, calc(100vw - 48px)); gap: 14px;">
        <BingDatePicker v-model="dateRange" type="date" range block />
        <BingDatePicker v-model="datetimeRange" type="datetime" range block />
        <BingDatePicker v-model="timeRange" type="time" range block />
      </div>
    `,
  }),
}

export const ShortcutButtons: Story = {
  name: '快捷日期',
  render: () => ({
    components: { BingDatePicker },
    setup() {
      const choices = reactive<BingDatePickerModelValue[]>([null, null, null, null, null, null])
      const cases = [
        { label: '日期', type: 'date', range: false },
        { label: '日期与时间', type: 'datetime', range: false },
        { label: '日期范围', type: 'date', range: true },
        { label: '月份范围', type: 'month', range: true },
        { label: '年份范围', type: 'year', range: true },
        { label: '时间范围', type: 'time', range: true },
      ] as const
      return { choices, cases }
    },
    template: `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr)); width: min(720px, calc(100vw - 48px)); gap: 16px;">
        <label v-for="(item, index) in cases" :key="item.label" style="display: grid; min-width: 0; gap: 6px; font-size: 13px;">
          {{ item.label }}
          <BingDatePicker v-model="choices[index]" :type="item.type" :range="item.range" :placeholder="'选择' + item.label" start-placeholder="开始" end-placeholder="结束" block />
        </label>
      </div>
    `,
  }),
}

export const DisabledRules: Story = {
  name: '禁用规则',
  render: () => ({
    components: { BingDatePicker },
    setup() {
      const date = ref<string | null>(null)
      const time = ref<string | null>(null)
      const min = dayjs().subtract(3, 'day').format('YYYY-MM-DD')
      const max = dayjs().add(18, 'day').format('YYYY-MM-DD')
      const disabledDate = (value: dayjs.Dayjs) => value.day() === 0 || value.day() === 6
      const disabledTime = (_value: dayjs.Dayjs, context: { unit: string; value: number }) =>
        context.unit === 'hour' && (context.value < 9 || context.value > 18)

      return { date, disabledDate, disabledTime, max, min, time }
    },
    template: `
      <div style="display: grid; width: min(360px, calc(100vw - 48px)); gap: 14px;">
        <BingDatePicker
          v-model="date"
          type="date"
          :min="min"
          :max="max"
          :disabled-date="disabledDate"
          placeholder="仅可选择工作日"
          block
        />
        <BingDatePicker
          v-model="time"
          type="time"
          :disabled-time="disabledTime"
          :minute-step="15"
          :second-step="30"
          placeholder="营业时间"
          block
        />
      </div>
    `,
  }),
}

export const ZodForm: Story = {
  name: '表单校验',
  render: () => ({
    components: {
      BingButton,
      BingDatePicker,
      BingForm,
      BingFormItem,
      BingSelect,
      BingTextarea,
    },
    setup() {
      const form = reactive({
        eventName: '',
        mode: null as string | null,
        startDate: null as string | null,
        launchAt: null as string | null,
        bookingWindow: null as [string, string] | null,
        officeHours: null as [string, string] | null,
        notes: '',
      })
      const schema = z.object({
        eventName: z.string().min(1, '请输入活动名称'),
        mode: z.string({ message: '请选择活动类型' }),
        startDate: z.string({ message: '请选择开始日期' }),
        launchAt: z.string({ message: '请选择发布时间' }),
        bookingWindow: z
          .tuple([z.string(), z.string()])
          .nullable()
          .refine(Boolean, '请选择预约日期范围'),
        officeHours: z
          .tuple([z.string(), z.string()])
          .nullable()
          .refine(Boolean, '请选择办公时间'),
        notes: z.string().max(160, '备注最多 160 字'),
      })
      const disabledDate = (value: dayjs.Dayjs) => value.isBefore(dayjs().startOf('day'))

      return { disabledDate, form, modeOptions, schema }
    },
    template: `
      <div style="box-sizing: border-box; width: min(960px, calc(100vw - 48px));">
        <BingForm
          :model="form"
          :schema="schema"
          label-position="top"
          :label-width="80"
          :columns="{ base: 1, sm: 2, xl: 4 }"
          :gap="{ row: 12, column: 18 }"
        >
          <BingFormItem prop="eventName" label="活动名称" required>
            <BingTextarea v-model="form.eventName" :rows="1" placeholder="例如：秋季新品发布" />
          </BingFormItem>

          <BingFormItem prop="mode" label="活动类型" required>
            <BingSelect v-model="form.mode" :options="modeOptions" width="100%" :min-width="0" />
          </BingFormItem>

          <BingFormItem prop="startDate" label="开始日期" required>
            <BingDatePicker
              v-model="form.startDate"
              type="date"
              :disabled-date="disabledDate"
              placeholder="选择日期"
              block
            />
          </BingFormItem>

          <BingFormItem prop="launchAt" label="发布时间" required>
            <BingDatePicker
              v-model="form.launchAt"
              type="datetime"
              :disabled-date="disabledDate"
              placeholder="选择日期与时间"
              block
            />
          </BingFormItem>

          <BingFormItem prop="bookingWindow" label="预约日期" :span="{ sm: 2, xl: 2 }" required>
            <BingDatePicker
              v-model="form.bookingWindow"
              type="date"
              range
              :disabled-date="disabledDate"
              block
            />
          </BingFormItem>

          <BingFormItem prop="officeHours" label="办公时间" :span="{ sm: 2, xl: 2 }" required>
            <BingDatePicker
              v-model="form.officeHours"
              type="time"
              range
              :minute-step="15"
              block
            />
          </BingFormItem>

          <BingFormItem prop="notes" label="备注" :span="{ sm: 2, xl: 4 }" help="提交时包含完整的日期与时间范围。">
            <BingTextarea v-model="form.notes" autosize show-count :max-length="160" />
          </BingFormItem>

          <BingFormItem :span="{ sm: 2, xl: 4 }">
            <BingButton html-type="submit">提交安排</BingButton>
          </BingFormItem>
        </BingForm>
      </div>
    `,
  }),
}

export const Sizes: Story = {
  name: '三档尺寸',
  render: () => ({
    components: { BingDatePicker },
    template: `
      <div style="display: grid; width: min(280px, calc(100vw - 48px)); gap: 14px;">
        <BingDatePicker model-value="2026-06-20" size="sm" block />
        <BingDatePicker model-value="2026-06-20" size="md" block />
        <BingDatePicker model-value="2026-06-20" size="lg" block />
      </div>
    `,
  }),
}

export const States: Story = {
  name: '状态',
  render: () => ({
    components: { BingDatePicker },
    template: `
      <div style="display: grid; width: min(280px, calc(100vw - 48px)); gap: 14px;">
        <BingDatePicker placeholder="选择日期" block />
        <BingDatePicker status="error" placeholder="请选择必填日期" block />
        <BingDatePicker model-value="2026-06-20" status="success" block />
        <BingDatePicker model-value="2026-06-20" disabled block />
      </div>
    `,
  }),
}
