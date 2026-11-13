import type { VNode } from 'vue'
import type { SmoothScrollOptions, SmoothScrollValue } from '../../motion/smoothScroll'

export type BingScrollbarSmoothOptions = SmoothScrollOptions

export interface BingScrollbarProps {
  height?: string | number
  maxHeight?: string | number
  minThumbSize?: number
  overflowTolerance?: number
  vertical?: boolean
  horizontal?: boolean
  always?: boolean
  disabled?: boolean
  focusable?: boolean
  ariaLabel?: string
  smooth?: SmoothScrollValue
}

export interface BingScrollbarEmits {
  scroll: [event: Event]
}

export interface BingScrollbarViewportSlotProps {
  /** 将实际滚动的 DOM 元素交给滚动条；原生输入控件保留自身语义与焦点。 */
  viewportRef: (element: unknown) => void
  /** 绑定到同一元素，隐藏原生滚动条并同步滚动、滚轮和输入事件。 */
  viewportAttrs: {
    class: string
    onScroll: (event: Event) => void
    onWheel: (event: WheelEvent) => boolean
    onKeydown: (event: KeyboardEvent) => void
    onInput: () => void
  }
}

export interface BingScrollbarSlots {
  default?: () => VNode[]
  viewport?: (props: BingScrollbarViewportSlotProps) => VNode[]
}

export interface BingScrollbarExpose {
  handleWheel: (event: WheelEvent) => boolean
  scrollBy: (options: ScrollToOptions | number) => void
  scrollTo: (options: ScrollToOptions | number) => void
  stop: () => void
  update: () => void
  viewport: HTMLElement | null
  readonly hasVerticalOverflow: boolean
  readonly hasHorizontalOverflow: boolean
}
