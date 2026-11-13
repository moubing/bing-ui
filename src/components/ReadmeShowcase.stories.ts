import type { Meta, StoryObj } from '@storybook/vue3-vite'
import ReadmeShowcase from '../../.storybook/ReadmeShowcase.vue'

const meta = {
  title: 'Design/组件总览',
  component: ReadmeShowcase,
  parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof ReadmeShowcase>

export default meta
type Story = StoryObj<typeof meta>

export const Overview: Story = { name: '组件与交互' }
