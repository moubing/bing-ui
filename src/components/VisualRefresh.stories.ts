import type { Meta, StoryObj } from '@storybook/vue3-vite'
import VisualRefresh from '../../.storybook/VisualRefresh.vue'

const meta = {
  title: 'Design/外观试做',
  component: VisualRefresh,
  parameters: { layout: 'fullscreen' },
  argTypes: {
    size: { control: 'inline-radio', options: ['sm', 'md', 'lg'], description: '控件尺寸' },
    glass: { control: 'boolean', description: '卡片和菜单的磨砂表面' },
    background: { control: 'inline-radio', options: ['content', 'plain'], description: '观察磨砂在不同背景上的表现' },
  },
  args: { size: 'md', glass: true, background: 'content' },
} satisfies Meta<typeof VisualRefresh>

export default meta
type Story = StoryObj<typeof meta>

export const Workspace: Story = { name: '图层工作区' }
export const Solid: Story = { name: '实色表面', args: { glass: false, background: 'plain' } }
export const Compact: Story = { name: '紧凑尺寸', args: { size: 'sm' } }
