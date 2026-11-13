import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import BingButton from '../BingButton/BingButton.vue'
import BingSplitPane from './BingSplitPane.vue'
import type { BingSplitPaneCancelPayload, BingSplitPaneResizePayload } from './BingSplitPane.types'

const meta: Meta<typeof BingSplitPane> = {
  title: 'Components/BingSplitPane', component: BingSplitPane, tags: ['autodocs'], parameters: { layout: 'fullscreen' },
}
export default meta
type Story = StoryObj<typeof BingSplitPane>

export const DocumentLayout: Story = {
  name: '正文与属性栏',
  render: () => ({
    components: { BingButton, BingSplitPane },
    setup() {
      const size = ref(360)
      const narrow = ref(false)
      const log = ref('尚未调整')
      return { size, narrow, log,
        finish: (value: BingSplitPaneResizePayload) => { log.value = `提交偏好：${value.preferredSize}px` },
        cancel: (value: BingSplitPaneCancelPayload) => { log.value = `已取消：${value.reason}` },
      }
    },
    template: `
      <div style="display: grid; gap: 16px; margin: 24px; width: calc(100vw - 48px);">
        <div><BingButton size="sm" variant="secondary" :throttle="false" @click="narrow = !narrow">切换容器宽度</BingButton></div>
        <BingSplitPane v-model:side-size="size" :default-side-size="360" :min-side-size="320" :max-side-size="560" :min-main-size="600"
          :style="{ width: narrow ? '940px' : '100%', maxWidth: '100%', height: '360px', border: '1px solid var(--bing-border)' }"
          @resize-end="finish" @resize-cancel="cancel">
          <div style="padding: 24px;"><h2>正文区域</h2><p>拖动分隔条调整右侧属性栏。按 Esc 取消，双击或按 Enter 恢复 360px。</p></div>
          <template #side="{ size: actual }"><div style="padding: 24px;"><h3>文档属性</h3><p>实际宽度：{{ Math.round(actual) }}px</p></div></template>
        </BingSplitPane>
        <p role="status">偏好宽度：{{ size }}px；{{ log }}</p>
      </div>
    `,
  }),
}
