import type { Meta, StoryObj } from '@storybook/vue3-vite'
import {
  Archive,
  Copy,
  Download,
  Eye,
  ExternalLink,
  FileText,
  FilePlus2,
  FolderOpen,
  History,
  Image,
  Link2,
  Lock,
  MoreHorizontal,
  Package,
  PenLine,
  Plus,
  Scissors,
  Settings2,
  Share2,
  ShieldAlert,
  Star,
  Tag,
  Trash2,
  Upload,
  Wand,
} from '@lucide/vue'
import { ref } from 'vue'
import { fn } from 'storybook/test'
import BingButton from '../BingButton/BingButton.vue'
import BingIcon from '../BingIcon/BingIcon.vue'
import BingDropDown from './BingDropDown.vue'
import BingDropDownItem from './BingDropDownItem.vue'
import BingDropDownGroup from './BingDropDownGroup.vue'
import BingDropDownDivider from './BingDropDownDivider.vue'
import type { BingDropDownProps } from './BingDropDown.types'

type StoryArgs = BingDropDownProps & {
  onOpen: () => void
  onClose: () => void
}

const meta = {
  title: 'Components/BingDropDown',
  component: BingDropDown,
  tags: ['autodocs'],
  argTypes: {
    open: {
      control: 'boolean',
    },
    placement: {
      control: 'inline-radio',
      options: [
        'bottom-start',
        'bottom-end',
        'top-start',
        'top-end',
        'left-start',
        'left-end',
        'right-start',
        'right-end',
      ],
    },
    trigger: {
      control: 'inline-radio',
      options: ['click', 'hover', 'contextmenu'],
    },
    size: {
      control: 'inline-radio',
      options: ['sm', 'md', 'lg'],
    },
    width: {
      control: 'text',
    },
    minWidth: {
      control: 'text',
    },
    block: {
      control: 'boolean',
    },
    glass: {
      control: 'boolean',
    },
    glassBlur: {
      description: '未指定时使用主题的模糊强度。',
      control: { type: 'number', min: 0, max: 32, step: 1 },
    },
    glassOpacity: {
      description: '未指定时使用主题的不透明度，随浅色和深色主题切换。',
      control: { type: 'number', min: 0, max: 1, step: 0.05 },
    },
    glassSaturation: {
      description: '未指定时使用主题的饱和度。',
      control: { type: 'number', min: 0, max: 2, step: 0.05 },
    },
    closeOnOutside: {
      control: 'boolean',
    },
    closeOnEscape: {
      control: 'boolean',
    },
    autoFocus: {
      control: 'boolean',
    },
    loop: {
      control: 'boolean',
    },
    hoverOpenDelay: { control: { type: 'number', min: 0, step: 10 } },
    hoverCloseDelay: { control: { type: 'number', min: 0, step: 10 } },
    typeahead: { control: 'boolean' },
    highlightMotion: { control: 'inline-radio', options: ['liquid', 'slide'] },
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
    open: false,
    trigger: 'click',
    placement: 'bottom-start',
    size: 'md',
    width: undefined,
    minWidth: undefined,
    block: false,
    glass: true,
    glassBlur: undefined,
    glassOpacity: undefined,
    glassSaturation: undefined,
    closeOnOutside: true,
    closeOnEscape: true,
    autoFocus: false,
    loop: true,
    hoverOpenDelay: 80,
    hoverCloseDelay: 110,
    typeahead: true,
    highlightMotion: 'liquid',
    ariaLabel: '项目操作',
    onOpen: fn(),
    onClose: fn(),
  },
  render: (args) => ({
    components: {
      BingButton,
      BingDropDown,
      BingDropDownItem,
      BingIcon,
    },
    setup() {
      const open = ref(args.open ?? false)

      return {
        args,
        open,
        Download,
        ExternalLink,
        FilePlus2,
        FolderOpen,
        MoreHorizontal,
        PenLine,
        Plus,
        Settings2,
        Trash2,
      }
    },
    template: `
      <div style="min-height: 360px; padding: 72px;">
        <BingDropDown
          v-model:open="open"
          :trigger="args.trigger"
          :placement="args.placement"
          :size="args.size"
          :width="args.width"
          :min-width="args.minWidth"
          :block="args.block"
          :glass="args.glass"
          :glass-blur="args.glassBlur"
          :glass-opacity="args.glassOpacity"
          :glass-saturation="args.glassSaturation"
          :close-on-outside="args.closeOnOutside"
          :close-on-escape="args.closeOnEscape"
          :auto-focus="args.autoFocus"
          :loop="args.loop"
          :hover-open-delay="args.hoverOpenDelay"
          :hover-close-delay="args.hoverCloseDelay"
          :typeahead="args.typeahead"
          :highlight-motion="args.highlightMotion"
          :aria-label="args.ariaLabel"
          @open="args.onOpen"
          @close="args.onClose"
        >
          <template #trigger="{ open: panelOpen, triggerProps }">
            <BingButton v-bind="triggerProps" variant="secondary" :throttle="false" :aria-label="panelOpen ? 'Close actions' : 'Open actions'">
              <template #prefix>
                <BingIcon :icon="MoreHorizontal" size="sm" />
              </template>
              操作
            </BingButton>
          </template>

          <BingDropDownItem title="新建项目" description="创建空白工作区" :icon="FilePlus2" shortcut="Ctrl+N" @click="open = false" />
          <BingDropDownItem title="打开文件夹" description="继续编辑本地文件" :icon="FolderOpen" shortcut="Ctrl+O" @click="open = false" />
          <BingDropDownItem title="重命名" :icon="PenLine" shortcut="Ctrl+R" @click="open = false" />
          <BingDropDownItem title="设置" :icon="Settings2" :close-on-click="false">
            <template #submenu>
              <BingDropDownItem title="个人设置" description="个人资料默认设置" :icon="Settings2" />
              <BingDropDownItem title="团队" description="共享权限" :icon="Plus" />
            </template>
          </BingDropDownItem>
          <BingDropDownItem title="文档" description="在新标签页打开" :icon="ExternalLink" href="https://example.com" target="_blank" />
          <BingDropDownItem title="删除工作区" tone="danger" :icon="Trash2" shortcut="Del" @click="open = false" />
        </BingDropDown>
      </div>
    `,
  }),
} satisfies Meta<StoryArgs>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = { name: '基础示例' }

export const ControlledPanel: Story = {
  name: '受控展开',
  render: () => ({
    components: { BingButton, BingDropDown, BingDropDownItem, BingIcon },
    setup() {
      const open = ref(true)

      return {
        open,
        Download,
        FilePlus2,
        MoreHorizontal,
        Trash2,
      }
    },
    template: `
      <div style="min-height: 340px; padding: 72px;">
        <BingDropDown v-model:open="open" min-width="280px" placement="bottom-start" auto-focus>
          <template #trigger="{ triggerProps }">
            <BingButton v-bind="triggerProps" variant="primary" :throttle="false">
              <template #prefix>
                <BingIcon :icon="MoreHorizontal" size="sm" />
              </template>
              切换菜单
            </BingButton>
          </template>

          <BingDropDownItem title="生成素材" description="开始导出任务" :icon="FilePlus2" shortcut="Ctrl+G" />
          <BingDropDownItem title="下载资源包" description="获取最新资源包" :icon="Download" shortcut="Ctrl+D" />
          <BingDropDownItem title="移除资源包" tone="danger" :icon="Trash2" shortcut="Del" />
        </BingDropDown>
      </div>
    `,
  }),
}

export const CompactList: Story = {
  name: '紧凑列表',
  args: {
    size: 'sm',
    minWidth: '230px',
  },
}

export const HoverTrigger: Story = {
  name: '悬停触发',
  args: {
    trigger: 'hover',
  },
}

export const ContextMenu: Story = {
  name: '右键菜单',
  render: () => ({
    components: { BingDropDown, BingDropDownItem, BingIcon },
    setup() {
      const menuContext = ref(null)
      const assets = [
        {
          id: 'brief',
          kind: 'file',
          name: 'brief.pdf',
          description: 'PDF 文档',
          deletable: true,
        },
        {
          id: 'images',
          kind: 'folder',
          name: '图片',
          description: '12 个文件',
          deletable: false,
        },
        {
          id: 'draft',
          kind: 'file',
          name: 'draft.fig',
          description: '设计草稿',
          deletable: true,
        },
      ]

      return {
        assets,
        menuContext,
        FilePlus2,
        FolderOpen,
        PenLine,
        Trash2,
      }
    },
    template: `
      <div style="min-height: 360px; padding: 72px;">
        <BingDropDown
          v-model:context="menuContext"
          trigger="contextmenu"
          min-width="240px"
          aria-label="素材右键菜单"
        >
          <template #trigger="{ getTriggerProps }">
            <div style="display: grid; width: min(360px, 100%); gap: 8px;">
              <button
                v-for="asset in assets"
                :key="asset.id"
                v-bind="getTriggerProps(asset)"
                type="button"
                style="display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid rgb(var(--bing-accent-rgb) / 0.2); border-radius: 10px; background: rgb(var(--bing-surface-rgb) / 0.18); color: var(--bing-heading); text-align: left; cursor: context-menu;"
              >
                <BingIcon :icon="asset.kind === 'folder' ? FolderOpen : FilePlus2" size="sm" />
                <span style="display: grid; gap: 2px; min-width: 0;">
                  <strong style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ asset.name }}</strong>
                  <span style="color: var(--bing-muted); font-size: 0.78rem;">{{ asset.description }}</span>
                </span>
              </button>
            </div>
          </template>

          <template #default="{ context, close }">
            <BingDropDownItem
              v-if="context?.kind === 'folder'"
              title="新建文件"
              description="在此文件夹内创建"
              :icon="FilePlus2"
              @click="close()"
            />
            <BingDropDownItem
              v-else
              title="打开文件"
              :description="context?.name"
              :icon="FilePlus2"
              @click="close()"
            />
            <BingDropDownItem title="重命名" :icon="PenLine" shortcut="F2" @click="close()" />
            <BingDropDownItem
              v-if="context?.deletable"
              title="删除"
              tone="danger"
              :icon="Trash2"
              shortcut="Del"
              @click="close()"
            />
          </template>
        </BingDropDown>
      </div>
    `,
  }),
}

export const ComplexContextMenu: Story = {
  name: '复杂右键菜单',
  render: () => ({
    components: { BingDropDown, BingDropDownItem, BingIcon },
    setup() {
      const menuContext = ref(null)
      const assets = [
        {
          id: 'hero',
          kind: 'image',
          name: 'hero-cover@2x.png',
          description: '3840 × 2160 像素图片',
          locked: false,
          starred: true,
          deletable: true,
          status: '就绪',
        },
        {
          id: 'brand-kit',
          kind: 'folder',
          name: '品牌素材包',
          description: '32 个源文件',
          locked: true,
          starred: false,
          deletable: false,
          status: '已锁定',
        },
        {
          id: 'release',
          kind: 'package',
          name: 'release-candidate.zip',
          description: '128 MB 资源包',
          locked: false,
          starred: false,
          deletable: true,
          status: '待评审',
        },
        {
          id: 'notes',
          kind: 'doc',
          name: 'handoff-notes.md',
          description: '协作文档',
          locked: false,
          starred: true,
          deletable: true,
          status: '已共享',
        },
      ]

      function assetIcon(asset: { kind: string }) {
        if (asset.kind === 'folder') {
          return FolderOpen
        }

        if (asset.kind === 'image') {
          return Image
        }

        if (asset.kind === 'package') {
          return Package
        }

        return FileText
      }

      return {
        assets,
        assetIcon,
        menuContext,
        Archive,
        Copy,
        Download,
        Eye,
        FilePlus2,
        FolderOpen,
        History,
        Link2,
        Lock,
        PenLine,
        Scissors,
        Settings2,
        Share2,
        ShieldAlert,
        Star,
        Tag,
        Trash2,
        Upload,
        Wand,
      }
    },
    template: `
      <div style="min-height: 560px; padding: 64px; display: grid; align-content: start; gap: 18px;">
        <div style="display: grid; gap: 6px;">
          <strong style="color: var(--bing-heading); font-size: 1rem;">素材看板</strong>
          <span style="color: var(--bing-muted); font-size: 0.82rem;">右键点击不同条目，体验随内容变化的菜单。</span>
        </div>

        <BingDropDown
          v-model:context="menuContext"
          trigger="contextmenu"
          min-width="292px"
          aria-label="复杂素材右键菜单"
        >
          <template #trigger="{ getTriggerProps }">
            <div style="display: grid; width: min(560px, 100%); grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px;">
              <button
                v-for="asset in assets"
                :key="asset.id"
                v-bind="getTriggerProps(asset)"
                type="button"
                style="display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 78px; padding: 12px; border: 1px solid rgb(var(--bing-accent-rgb) / 0.22); border-radius: 12px; background: rgb(var(--bing-surface-rgb) / 0.18); color: var(--bing-heading); text-align: left; cursor: context-menu;"
              >
                <BingIcon :icon="assetIcon(asset)" size="sm" />
                <span style="display: grid; gap: 3px; min-width: 0;">
                  <strong style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ asset.name }}</strong>
                  <span style="overflow: hidden; color: var(--bing-muted); font-size: 0.78rem; text-overflow: ellipsis; white-space: nowrap;">{{ asset.description }}</span>
                </span>
                <span style="border: 1px solid rgb(var(--bing-accent-rgb) / 0.18); border-radius: 999px; padding: 3px 7px; color: var(--bing-muted); font-size: 0.7rem; font-weight: 700;">{{ asset.status }}</span>
              </button>
            </div>
          </template>

          <template #default="{ context, close }">
            <BingDropDownItem
              v-if="context?.kind === 'folder'"
              title="打开文件夹"
              :description="context?.name"
              :icon="FolderOpen"
              @click="close()"
            />
            <BingDropDownItem
              v-else-if="context?.kind === 'package'"
              title="查看资源包"
              :description="context?.description"
              :icon="Package"
              @click="close()"
            />
            <BingDropDownItem
              v-else
              title="预览"
              :description="context?.name"
              :icon="Eye"
              shortcut="Space"
              @click="close()"
            />

            <BingDropDownItem title="重命名" :icon="PenLine" shortcut="F2" :disabled="context?.locked" @click="close()" />
            <BingDropDownItem title="创建副本" description="在当前位置创建副本" :icon="Copy" shortcut="Ctrl+D" @click="close()" />
            <BingDropDownItem title="共享" :icon="Share2" :close-on-click="false">
              <template #submenu>
                <BingDropDownItem title="复制链接" description="对工作区成员开放" :icon="Link2" @click="close()" />
                <BingDropDownItem title="邀请评审者" description="仅允许评论" :icon="Share2" @click="close()" />
                <BingDropDownItem title="设为私有" :icon="Lock" :disabled="context?.locked" @click="close()" />
              </template>
            </BingDropDownItem>

            <div role="separator" style="height: 1px; margin: 6px 8px; background: var(--bing-border);"></div>

            <BingDropDownItem
              v-if="context?.kind === 'image'"
              title="优化图片"
              description="生成压缩版本"
              :icon="Wand"
              tone="secondary"
              @click="close()"
            />
            <BingDropDownItem
              v-if="context?.kind === 'package'"
              title="发布资源包"
              description="发送到发布渠道"
              :icon="Upload"
              tone="success"
              @click="close()"
            />
            <BingDropDownItem title="添加标签" :icon="Tag" :close-on-click="false">
              <template #submenu>
                <BingDropDownItem title="就绪" :icon="Star" @click="close()" />
                <BingDropDownItem title="待评审" :icon="ShieldAlert" tone="warning" @click="close()" />
                <BingDropDownItem title="已归档" :icon="Archive" @click="close()" />
              </template>
            </BingDropDownItem>
            <BingDropDownItem title="版本记录" description="对比历史变更" :icon="History" @click="close()" />
            <BingDropDownItem title="移动到…" :icon="Scissors" :disabled="context?.locked" @click="close()" />

            <div role="separator" style="height: 1px; margin: 6px 8px; background: var(--bing-border);"></div>

            <BingDropDownItem
              title="删除"
              tone="danger"
              :icon="Trash2"
              shortcut="Del"
              :disabled="!context?.deletable"
              @click="close()"
            />
          </template>
        </BingDropDown>
      </div>
    `,
  }),
}

export const LongContextMenu: Story = {
  name: '长右键菜单',
  render: () => ({
    components: { BingDropDown, BingDropDownItem, BingDropDownGroup, BingDropDownDivider, BingIcon },
    setup() {
      const menuContext = ref(null)
      const rows = [
        { id: 'north', name: '北美报表', description: '24 个文件' },
        { id: 'design', name: '设计导出', description: '86 个文件' },
        { id: 'legal', name: '法务归档', description: '只读' },
      ]

      return {
        rows,
        menuContext,
        Archive,
        Copy,
        Download,
        ExternalLink,
        FilePlus2,
        FolderOpen,
        History,
        Lock,
        PenLine,
        Share2,
        Star,
        Tag,
        Trash2,
        Upload,
      }
    },
    template: `
      <div style="min-height: 560px; padding: 72px;">
        <BingDropDown
          v-model:context="menuContext"
          trigger="contextmenu"
          min-width="286px"
          aria-label="长右键菜单"
        >
          <template #trigger="{ getTriggerProps }">
            <div style="display: grid; width: min(420px, 100%); gap: 8px;">
              <button
                v-for="row in rows"
                :key="row.id"
                v-bind="getTriggerProps(row)"
                type="button"
                style="display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 10px; padding: 11px 12px; border: 1px solid rgb(var(--bing-accent-rgb) / 0.2); border-radius: 10px; background: rgb(var(--bing-surface-rgb) / 0.18); color: var(--bing-heading); text-align: left; cursor: context-menu;"
              >
                <BingIcon :icon="FolderOpen" size="sm" />
                <span style="display: grid; gap: 2px; min-width: 0;">
                  <strong style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">{{ row.name }}</strong>
                  <span style="color: var(--bing-muted); font-size: 0.78rem;">{{ row.description }}</span>
                </span>
              </button>
            </div>
          </template>

          <template #default="{ context, close }">
            <BingDropDownGroup label="打开">
            <BingDropDownItem title="打开" :description="context?.name" :icon="FolderOpen" @click="close()" />
            <BingDropDownItem title="在新标签页打开" :icon="ExternalLink" shortcut="Ctrl+Enter" @click="close()" />
            </BingDropDownGroup>
            <BingDropDownDivider />
            <BingDropDownGroup label="编辑">
            <BingDropDownItem title="在此新建文件" :icon="FilePlus2" shortcut="Ctrl+N" @click="close()" />
            <BingDropDownItem title="重命名文件夹" :icon="PenLine" shortcut="F2" :disabled="context?.id === 'legal'" @click="close()" />
            <BingDropDownItem title="复制路径" :icon="Copy" shortcut="Ctrl+Shift+C" @click="close()" />
            <BingDropDownItem title="下载归档" :icon="Download" @click="close()" />
            <BingDropDownItem title="上传文件" :icon="Upload" tone="success" :disabled="context?.id === 'legal'" @click="close()" />
            <BingDropDownItem title="添加收藏" :icon="Star" @click="close()" />
            <BingDropDownItem title="设置标签" :icon="Tag" @click="close()" />
            </BingDropDownGroup>
            <BingDropDownDivider />
            <BingDropDownGroup label="共享">
            <BingDropDownItem title="共享文件夹" :icon="Share2" @click="close()" />
            <BingDropDownItem title="历史记录" :icon="History" @click="close()" />
            <BingDropDownItem title="归档" :icon="Archive" @click="close()" />
            <BingDropDownItem title="权限已锁定" :icon="Lock" :disabled="context?.id !== 'legal'" @click="close()" />
            </BingDropDownGroup>
            <BingDropDownDivider />
            <BingDropDownGroup label="危险操作">
            <BingDropDownItem title="删除文件夹" tone="danger" :icon="Trash2" shortcut="Del" :disabled="context?.id === 'legal'" @click="close()" />
            </BingDropDownGroup>
          </template>
        </BingDropDown>
      </div>
    `,
  }),
}

export const CheckedMenu: Story = {
  name: '勾选菜单',
  render: () => ({
    components: { BingButton, BingDropDown, BingDropDownItem, BingDropDownGroup, BingDropDownDivider },
    setup() {
      return { view: ref('列表'), star: ref(true), details: ref(false), Star, Eye }
    },
    template: `
      <div style="padding: 64px; min-height: 420px;">
        <BingDropDown aria-label="视图选项" :width="260">
          <template #trigger="{ triggerProps }"><BingButton v-bind="triggerProps" :throttle="false" variant="secondary">视图选项</BingButton></template>
          <BingDropDownGroup label="布局">
            <BingDropDownItem v-for="name in ['列表', '网格', '看板']" :key="name" :title="name" type="radio" :checked="view === name" :close-on-click="false" @click="view = name" />
          </BingDropDownGroup>
          <BingDropDownDivider />
          <BingDropDownGroup label="显示">
            <BingDropDownItem title="收藏置顶" :icon="Star" type="checkbox" :checked="star" :close-on-click="false" @click="star = !star" />
            <BingDropDownItem title="显示详情" :icon="Eye" type="checkbox" :checked="details" shortcut="Ctrl++" :close-on-click="false" @click="details = !details" />
            <BingDropDownItem title="隐藏归档" type="checkbox" disabled :checked="true" />
          </BingDropDownGroup>
        </BingDropDown>
        <p style="color: var(--bing-muted); font-size: 13px;">当前布局：{{ view }} · 收藏置顶：{{ star ? '开' : '关' }} · 详情：{{ details ? '开' : '关' }}</p>
      </div>`,
  }),
}

export const SlideHighlight: Story = {
  name: '滑动高亮',
  args: { highlightMotion: 'slide' },
}

export const EditorCommands: Story = {
  name: '编辑器命令菜单',
  render: () => ({
    components: { BingDropDown, BingDropDownItem, BingDropDownGroup, BingDropDownDivider },
    setup() {
      const editor = ref<HTMLTextAreaElement>(), boundary = ref<HTMLElement>()
      const open = ref(false), active = ref(0), result = ref('')
      const anchor = { getBoundingClientRect: () => {
        const rect = editor.value?.getBoundingClientRect()
        return new DOMRect((rect?.left ?? 0) + 16, (rect?.top ?? 0) + 16, 1, 22)
      } }
      const commands = ['普通正文', '一级标题', '二级标题', '三级标题', '项目列表', '编号列表', '任务清单', '引用', '分隔线', '代码块', '表格', '提示块', '图片', '附件', '链接', '日期']
      function select(index: number) { result.value = commands[index] ?? ''; open.value = false; editor.value?.focus() }
      function keydown(event: KeyboardEvent) {
        if (event.key === '/') { open.value = true; active.value = 0 }
        if (!open.value || event.isComposing) return
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault(); active.value = (active.value + (event.key === 'ArrowDown' ? 1 : -1) + commands.length) % commands.length
        } else if (event.key === 'Enter') { event.preventDefault(); select(active.value) }
        else if (event.key === 'Escape' || event.key === 'Tab') open.value = false
      }
      return { editor, boundary, open, active, result, anchor, commands, select, keydown }
    },
    template: `
      <div style="padding: 32px; max-width: 720px;">
        <p>输入 / 打开命令，上下键选择，Enter 插入；焦点始终留在编辑器。</p>
        <div ref="boundary" style="position: relative; height: 330px; border: 1px solid var(--bing-border); border-radius: 8px; padding: 18px;">
          <textarea ref="editor" aria-label="编辑正文" @keydown="keydown" placeholder="在这里输入 /" style="box-sizing: border-box; width: 100%; height: 100%; resize: none; border: none; outline: none; background: transparent; color: var(--bing-heading); font: inherit;"></textarea>
          <BingDropDown v-model:open="open" block :anchor="anchor" :boundary="boundary" :auto-focus="false" :close-on-escape="false" :width="280" :min-width="0" aria-label="插入正文块">
            <div @mousedown.prevent>
              <BingDropDownGroup label="正文块">
                <BingDropDownItem v-for="(name, index) in commands" :key="name" :title="name" :active="active === index" :close-on-click="false" @pointermove="active = index" @click="select(index)" />
              </BingDropDownGroup>
            </div>
          </BingDropDown>
        </div>
        <p role="status" style="color: var(--bing-muted);">{{ result ? '已插入：' + result : '等待选择命令' }}</p>
      </div>`,
  }),
}
