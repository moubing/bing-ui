import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { computed, reactive, ref, watch } from 'vue'
import { z } from 'zod'
import BingButton from '../BingButton/BingButton.vue'
import BingCheckboxGroup from '../BingCheckboxGroup/BingCheckboxGroup.vue'
import BingForm from './BingForm.vue'
import BingFormItem from '../BingFormItem/BingFormItem.vue'
import BingInput from '../BingInput/BingInput.vue'
import BingRadioGroup from '../BingRadioGroup/BingRadioGroup.vue'
import BingSelect from '../BingSelect/BingSelect.vue'
import BingTextarea from '../BingTextarea/BingTextarea.vue'
import BingTreeSelect from '../BingTreeSelect/BingTreeSelect.vue'
import type { BingFormExpose, BingFormProps } from './BingForm.types'

const moodOptions = [
  { label: '柔和', value: 'aurora' },
  { label: '清晰', value: 'orbit' },
  { label: '强调', value: 'pulse' },
]

const channelOptions = [
  { label: '悬停', value: 'hover' },
  { label: '聚焦', value: 'focus' },
  { label: '点击', value: 'press' },
]

const educationTree = [
  {
    label: '基础教育',
    value: 'basic',
    selectable: false,
    children: [
      { label: '小学', value: 'primary' },
      { label: '初中', value: 'middle' },
      { label: '高中', value: 'high' },
    ],
  },
  {
    label: '高等教育',
    value: 'higher',
    selectable: false,
    children: [
      { label: '专科', value: 'college' },
      { label: '本科', value: 'university' },
      { label: '研究生', value: 'graduate' },
    ],
  },
]

const majorTree = [
  {
    label: '工程技术',
    value: 'engineering',
    selectable: false,
    children: [
      { label: '计算机科学', value: 'computer-science' },
      { label: '机器人技术', value: 'robotics' },
      { label: '工业设计', value: 'industrial-design' },
    ],
  },
  {
    label: '创意艺术',
    value: 'creative-arts',
    selectable: false,
    children: [
      { label: '视觉传达', value: 'visual-communication' },
      { label: '影视制作', value: 'film-production' },
      { label: '交互媒体', value: 'interactive-media' },
    ],
  },
  {
    label: '商业管理',
    value: 'business',
    selectable: false,
    children: [
      { label: '市场营销', value: 'marketing' },
      { label: '金融学', value: 'finance' },
      { label: '运营管理', value: 'operations' },
    ],
  },
]

const campusTree = [
  {
    label: '亚太地区',
    value: 'asia-pacific',
    children: [
      { label: '上海校区', value: 'shanghai' },
      { label: '新加坡校区', value: 'singapore' },
    ],
  },
  {
    label: '欧洲',
    value: 'europe',
    children: [
      { label: '柏林校区', value: 'berlin' },
      { label: '阿姆斯特丹校区', value: 'amsterdam' },
    ],
  },
]

const schoolDistrictTree = [
  {
    label: '北部学区',
    value: 'north',
    children: [
      { label: '北区一片', value: 'north-a' },
      { label: '北区二片', value: 'north-b' },
    ],
  },
  {
    label: '南部学区',
    value: 'south',
    children: [
      { label: '南区一片', value: 'south-a' },
      { label: '南区二片', value: 'south-b' },
    ],
  },
]

const gradeOptions = [
  { label: '一至三年级', value: 'lower' },
  { label: '四至六年级', value: 'upper' },
  { label: '七至九年级', value: 'junior' },
  { label: '高一至高三', value: 'senior' },
]

const higherEducationValues = ['college', 'university', 'graduate']
const schoolEducationValues = ['primary', 'middle', 'high']
const artsMajorValues = ['visual-communication', 'film-production', 'interactive-media']

function isHigherEducation(value: string | null) {
  return value !== null && higherEducationValues.includes(value)
}

function isSchoolEducation(value: string | null) {
  return value !== null && schoolEducationValues.includes(value)
}

function isArtsMajor(value: string | null) {
  return value !== null && artsMajorValues.includes(value)
}

const meta = {
  title: 'Components/BingForm',
  component: BingForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
  },
  args: {
    layout: 'grid',
    labelPosition: 'left',
    labelWidth: 80,
    size: 'md',
    disabled: false,
    scrollToError: true,
  },
  argTypes: {
    layout: {
      control: 'inline-radio',
      options: ['grid', 'stack', 'inline'],
    },
    labelPosition: {
      control: 'inline-radio',
      options: ['top', 'left'],
    },
    labelWidth: {
      control: {
        type: 'number',
        min: 80,
        max: 180,
        step: 4,
      },
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },
    scrollToError: {
      control: 'boolean',
    },
    focusOnError: {
      control: 'boolean',
      description: '默认 true。提交失败后按页面顺序聚焦第一个可用错误字段；异步等待期间继续输入、移动焦点或打开浮层时不抢焦点。',
    },
    validateTrigger: {
      control: 'select', options: ['auto', 'change', 'blur', 'submit', 'manual'],
      description: '默认 auto：离开字段或提交时校验，已有错误的字段修改时重新检查。可显式指定原有触发方式或数组。',
    },
    nextStepHint: {
      control: 'boolean',
      description: '实验性，默认关闭。为顶部标签的 FormItem 标出下一个原生 Tab 落点，不拦截按键。清除按钮、组内操作、打开的浮层或不确定的顺序会隐藏提示；不根据是否非空跳过字段。业务提交成功后可设为 false。',
    },
  },
  render: (args) => ({
    components: {
      BingButton,
      BingCheckboxGroup,
      BingForm,
      BingFormItem,
      BingInput,
      BingRadioGroup,
      BingSelect,
      BingTextarea,
      BingTreeSelect,
    },
    setup() {
      const form = reactive({
        name: '',
        mood: null,
        channels: ['hover'],
        density: 'calm',
        description: '',
      })
      const schema = z.object({
        name: z.string().min(1, '请输入图层名称'),
        mood: z.string({ message: '请选择展示样式' }),
        channels: z.array(z.string()).min(1, '请至少选择一种交互'),
        density: z.string(),
        description: z.string().max(120, '描述不能超过 120 字'),
      })

      return {
        args,
        channelOptions,
        form,
        moodOptions,
        schema,
        result: ref(''),
      }
    },
    template: `
      <div style="box-sizing: border-box; width: 100%; max-width: 960px; padding: 16px;">
        <BingForm
          :model="form"
          :schema="schema"
          :layout="args.layout"
          :label-position="args.labelPosition"
          :label-width="args.labelWidth"
          :size="args.size"
          :disabled="args.disabled"
          :scroll-to-error="args.scrollToError"
          :focus-on-error="args.focusOnError"
          :validate-trigger="args.validateTrigger"
          :next-step-hint="args.nextStepHint"
          :columns="args.columns ?? { base: 1, sm: 2 }"
          :gap="args.gap"
          @submit="result = $event.valid ? '设置已保存' : '请检查必填项'"
        >
          <BingFormItem prop="name" label="图层名称" required>
            <BingInput v-model="form.name" placeholder="例如：城市道路" />
          </BingFormItem>

          <BingFormItem prop="mood" label="展示样式" required>
            <BingSelect
              v-model="form.mood"
              :options="moodOptions"
              width="100%"
              :min-width="0"
              placeholder="选择样式"
            />
          </BingFormItem>

          <BingFormItem prop="channels" label="交互方式" required>
            <BingCheckboxGroup v-model="form.channels" :options="channelOptions" />
          </BingFormItem>

          <BingFormItem prop="density" label="信息密度">
            <BingRadioGroup
              v-model="form.density"
              :options="[
                { label: '简约', value: 'calm' },
                { label: '详细', value: 'bright' },
              ]"
            />
          </BingFormItem>

          <BingFormItem prop="description" label="描述" :span="{ sm: 2 }" help="最多 120 字">
            <BingTextarea v-model="form.description" autosize show-count :max-length="120" />
          </BingFormItem>

          <BingFormItem :span="{ sm: 2 }" :show-message="false">
            <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px;">
              <BingButton html-type="submit" :disabled="args.disabled">保存设置</BingButton>
              <output aria-live="polite" style="color: var(--bing-muted); font-size: 12px;">{{ result }}</output>
            </div>
          </BingFormItem>
        </BingForm>
      </div>
    `,
  }),
} satisfies Meta<BingFormProps>

export default meta
type Story = StoryObj<typeof meta>

export const ZodSchema: Story = { name: '表单校验' }

export const FillingFlow: Story = {
  name: '填写与纠错',
  parameters: {
    docs: {
      description: {
        story: '体验三个过程：①首次输入不立刻报格式错误，离开字段后检查；②回到错误字段修改，正确后及时消除错误；③提交失败后定位第一个可用错误字段，全部有效后显示提交结果。普通文本输入默认不显示清除按钮，搜索框默认保留。\n\n已开启实验性 nextStepHint：聚焦姓名后，邮箱标签旁出现“下一项 · Tab”；只提示实际的下一落点。单选组用方向键选择，Tab 离开；下拉框展开时暂停提示。最后一项提示“前往提交”，Tab 只聚焦按钮，Enter / 空格才激活。提交成功后由示例关闭提示，修改或重新填写时恢复。\n\n第一版使用顶部标签，标签旁空间不足时隐藏；目标不在视口内时，改在当前项旁提示目标名称。隐藏、禁用字段遵循原生 Tab 顺序；已填项、选填项仍会经过。正 tabindex、自定义元素、Shadow DOM 或其他无法可靠预测的内部入口不显示提示。',
      },
    },
  },
  render: () => ({
    components: { BingButton, BingForm, BingFormItem, BingInput, BingSelect, BingRadioGroup },
    setup() {
      const formRef = ref<BingFormExpose | null>(null)
      const model = reactive({ name: '', email: '', team: null as string | null, notifications: 'email' })
      const result = ref('')
      const submitted = ref(false)
      watch(model, () => { submitted.value = false; result.value = '' })
      const schema = z.object({
        name: z.string().trim().min(1, '请输入姓名'),
        email: z.string().email('请输入有效的邮箱地址'),
        team: z.string({ message: '请选择所属团队' }).min(1, '请选择所属团队'),
        notifications: z.string(),
      })
      const teams = [{ label: '产品与设计', value: 'design' }, { label: '工程研发', value: 'engineering' }, { label: '市场运营', value: 'marketing' }]
      const notifications = [{ label: '邮件通知', value: 'email' }, { label: '仅站内消息', value: 'inbox' }]
      return { formRef, model, schema, teams, notifications, result, submitted }
    },
    template: `
      <section style="box-sizing: border-box; width: 100%; max-width: 640px; margin: 24px auto; padding: clamp(20px, 4vw, 36px); border: 1px solid var(--bing-border); border-radius: 14px; background: var(--bing-surface-solid); color: var(--bing-text);">
        <h2 style="margin: 0 0 8px; color: var(--bing-heading); font-size: 22px;">添加团队成员</h2>
        <p style="margin: 0 0 28px; color: var(--bing-muted); font-size: 13px; line-height: 1.8;">带 * 的项目为必填项。填写时，可按 Tab 前往标记的下一项，Shift + Tab 返回。</p>
        <BingForm ref="formRef" :model="model" :schema="schema" :next-step-hint="!submitted" layout="stack" :gap="16" @submit="submitted = $event.valid; result = $event.valid ? '成员资料已提交（演示）' : '请修正标出的内容，再次提交'">
          <BingFormItem prop="name" label="成员姓名" required help="填写便于同事识别的姓名">
            <BingInput v-model="model.name" name="name" autocomplete="name" placeholder="例如：林晗" />
          </BingFormItem>
          <BingFormItem prop="email" label="联系邮箱" required help="用于接收邀请和项目通知">
            <BingInput v-model="model.email" type="email" name="email" autocomplete="email" placeholder="name@example.com" />
          </BingFormItem>
          <BingFormItem prop="team" label="所属团队" required>
            <BingSelect v-model="model.team" :options="teams" :clearable="false" width="100%" :min-width="0" placeholder="选择团队" />
          </BingFormItem>
          <BingFormItem prop="notifications" label="通知方式">
            <BingRadioGroup v-model="model.notifications" :options="notifications" />
          </BingFormItem>
          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; padding-top: 4px;">
            <BingButton html-type="submit" size="sm">提交资料</BingButton>
            <BingButton variant="ghost" size="sm" @click="formRef?.resetFields(); result = ''; submitted = false">重新填写</BingButton>
          </div>
        </BingForm>
        <p role="status" style="min-height: 20px; margin: 16px 0 0; color: var(--bing-muted); font-size: 13px;">{{ result }}</p>
      </section>
    `,
  }),
}

export const NextStepHint: Story = {
  ...FillingFlow,
  name: '下一项提示',
}

export const TopLabels: Story = {
  name: '顶部标签',
  args: {
    labelPosition: 'top',
  },
}

export const Stack: Story = {
  name: '纵向布局',
  args: { layout: 'stack', labelPosition: 'top' },
}

export const Inline: Story = {
  name: '行内筛选',
  render: () => ({
    components: { BingForm, BingFormItem, BingInput, BingSelect, BingButton },
    setup() { return { model: reactive({ query: '', style: null }), moodOptions, submitted: ref(false) } },
    template: `
      <div style="width: 100%; max-width: 720px;">
        <BingForm :model="model" layout="inline" @submit="submitted = true">
          <BingFormItem prop="query" label="图层名称" :show-message="false" style="flex: 1 1 180px;">
            <BingInput v-model="model.query" placeholder="搜索图层" />
          </BingFormItem>
          <BingFormItem prop="style" label="展示样式" :show-message="false" style="flex: 1 1 160px;">
            <BingSelect v-model="model.style" :options="moodOptions" :min-width="0" width="100%" placeholder="全部样式" />
          </BingFormItem>
          <BingButton html-type="submit" style="align-self: flex-end;">筛选</BingButton>
        </BingForm>
        <p v-if="submitted" role="status" style="font-size: 12px; color: var(--bing-muted);">筛选条件已应用</p>
      </div>
    `,
  }),
}

export const DynamicFields: Story = {
  name: '动态字段',
  args: {
    labelPosition: 'left',
    labelWidth: 124,
  },
  render: (args) => ({
    components: {
      BingButton,
      BingForm,
      BingFormItem,
      BingInput,
      BingSelect,
      BingTextarea,
      BingTreeSelect,
    },
    setup() {
      const dynamicFormRef = ref<BingFormExpose>()
      const form = reactive({
        student: '',
        education: null as string | null,
        major: null as string | null,
        campus: null as string | null,
        grade: null as string | null,
        schoolDistrict: null as string | null,
        portfolio: '',
        advisor: '',
        notes: '',
      })
      const showHigherEducation = computed(() => isHigherEducation(form.education))
      const showSchoolEducation = computed(() => isSchoolEducation(form.education))
      const showPortfolio = computed(() => isArtsMajor(form.major))
      const showAdvisor = computed(() => form.education === 'graduate')
      const schema = z
        .object({
          student: z.string().min(1, '请输入学生姓名'),
          education: z.string({ message: '请选择教育阶段' }),
          major: z.string().nullable(),
          campus: z.string().nullable(),
          grade: z.string().nullable(),
          schoolDistrict: z.string().nullable(),
          portfolio: z.string().max(120, '作品集链接过长'),
          advisor: z.string().max(80, '导师姓名过长'),
          notes: z.string().max(180, '备注不能超过 180 个字符'),
        })
        .superRefine((value, context) => {
          if (isHigherEducation(value.education)) {
            if (!value.major) {
              context.addIssue({
                code: 'custom',
                path: ['major'],
                message: '请选择专业',
              })
            }

            if (!value.campus) {
              context.addIssue({
                code: 'custom',
                path: ['campus'],
                message: '请选择意向校区',
              })
            }
          }

          if (isSchoolEducation(value.education)) {
            if (!value.grade) {
              context.addIssue({
                code: 'custom',
                path: ['grade'],
                message: '请选择年级',
              })
            }

            if (!value.schoolDistrict) {
              context.addIssue({
                code: 'custom',
                path: ['schoolDistrict'],
                message: '请选择学区',
              })
            }
          }

          if (isArtsMajor(value.major) && !value.portfolio.trim()) {
            context.addIssue({
              code: 'custom',
              path: ['portfolio'],
              message: '艺术类专业请填写作品集链接',
            })
          }

          if (value.education === 'graduate' && !value.advisor.trim()) {
            context.addIssue({
              code: 'custom',
              path: ['advisor'],
              message: '请填写意向导师',
            })
          }
        })

      function clearDynamic(paths: string[]) {
        const resetValues: Record<string, string | null> = {
          major: null,
          campus: null,
          grade: null,
          schoolDistrict: null,
          portfolio: '',
          advisor: '',
        }
        const model = form as Record<string, string | null>

        paths.forEach((path) => {
          model[path] = resetValues[path]
          dynamicFormRef.value?.clearValidate(path)
        })
      }

      watch(
        () => form.education,
        () => {
          if (!showHigherEducation.value) {
            clearDynamic(['major', 'campus', 'portfolio', 'advisor'])
          }

          if (!showSchoolEducation.value) {
            clearDynamic(['grade', 'schoolDistrict'])
          }
        },
      )

      watch(
        () => form.major,
        () => {
          if (!showPortfolio.value) {
            clearDynamic(['portfolio'])
          }
        },
      )

      return {
        args,
        campusTree,
        dynamicFormRef,
        educationTree,
        form,
        gradeOptions,
        majorTree,
        schoolDistrictTree,
        schema,
        showAdvisor,
        showHigherEducation,
        showPortfolio,
        showSchoolEducation,
      }
    },
    template: `
      <div style="box-sizing: border-box; width: 100%; max-width: 1080px; padding: 18px;">
        <BingForm
          ref="dynamicFormRef"
          :model="form"
          :schema="schema"
          :layout="args.layout"
          :label-position="args.labelPosition"
          :label-width="args.labelWidth"
          :size="args.size"
          :disabled="args.disabled"
          :scroll-to-error="args.scrollToError"
          :columns="{ base: 1, sm: 2, xl: 4 }"
          :gap="{ row: 12, column: 18 }"
        >
          <BingFormItem key="student" prop="student" label="学生姓名" required>
            <BingInput v-model="form.student" placeholder="例如：陈琳" />
          </BingFormItem>

          <BingFormItem key="education" prop="education" label="教育阶段" :span="{ sm: 2, xl: 2 }" required>
            <BingTreeSelect
              v-model="form.education"
              :options="educationTree"
              :default-expanded-values="['basic', 'higher']"
              placeholder="请选择教育阶段"
              :searchable="false"
              block
            />
          </BingFormItem>

          <TransitionGroup name="bing-form-field" appear>
            <BingFormItem
              v-if="showHigherEducation"
              key="major"
              prop="major"
              label="专业"
              :span="{ sm: 2, xl: 2 }"
              required
            >
              <BingTreeSelect
                v-model="form.major"
                :options="majorTree"
                :default-expanded-values="['engineering', 'creative-arts', 'business']"
                placeholder="请选择专业"
                searchable
                block
              />
            </BingFormItem>

            <BingFormItem
              v-if="showHigherEducation"
              key="campus"
              prop="campus"
              label="校区"
              :span="{ sm: 2, xl: 2 }"
              required
            >
              <BingTreeSelect
                v-model="form.campus"
                :options="campusTree"
                :default-expanded-values="['asia-pacific', 'europe']"
                placeholder="请选择校区"
                block
              />
            </BingFormItem>

            <BingFormItem
              v-if="showSchoolEducation"
              key="grade"
              prop="grade"
              label="年级"
              required
            >
              <BingSelect v-model="form.grade" :options="gradeOptions" placeholder="请选择年级" />
            </BingFormItem>

            <BingFormItem
              v-if="showSchoolEducation"
              key="schoolDistrict"
              prop="schoolDistrict"
              label="学区"
              :span="{ sm: 2, xl: 2 }"
              required
            >
              <BingTreeSelect
                v-model="form.schoolDistrict"
                :options="schoolDistrictTree"
                :default-expanded-values="['north', 'south']"
                placeholder="请选择学区"
                block
              />
            </BingFormItem>

            <BingFormItem
              v-if="showPortfolio"
              key="portfolio"
              prop="portfolio"
              label="作品集"
              :span="{ sm: 2, xl: 2 }"
              required
            >
              <BingInput v-model="form.portfolio" placeholder="https://portfolio.example" />
            </BingFormItem>

            <BingFormItem
              v-if="showAdvisor"
              key="advisor"
              prop="advisor"
              label="导师"
              :span="{ sm: 2, xl: 2 }"
              required
            >
              <BingInput v-model="form.advisor" placeholder="意向导师" />
            </BingFormItem>

            <BingFormItem
              key="notes"
              prop="notes"
              label="备注"
              :span="{ sm: 2, xl: 4 }"
              help="条件字段隐藏时会自动清空其内容。"
            >
              <BingTextarea v-model="form.notes" autosize show-count :max-length="180" />
            </BingFormItem>

            <BingFormItem key="submit" :span="{ sm: 2, xl: 4 }">
              <BingButton html-type="submit">提交动态表单</BingButton>
            </BingFormItem>
          </TransitionGroup>
        </BingForm>
      </div>
    `,
  }),
}
