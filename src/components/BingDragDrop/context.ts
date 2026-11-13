import { inject, type ComputedRef, type InjectionKey, type Ref } from 'vue'
import type { BingDragDropActive, BingDragDropKey } from './BingDragDrop.types'

/** 存进 dnd-kit 条目 data 的内部字段，业务 data 原样放在 `data` 上。 */
export interface BingDragDropSourceData {
  zone?: BingDragDropKey
  data?: unknown
  ignore?: string
}

export interface BingDragDropContext {
  active: Readonly<Ref<BingDragDropActive | null>>
  disabled: ComputedRef<boolean>
  cancel: () => void
  /**
   * 内部：浮层已经落到位的条目。dnd-kit 在归位动画结束时同步撤掉浮层定位，
   * 却把源条目恢复推迟到下一个任务；两者之间会画出一帧错位的浮层和空占位。
   * 浮层在这一刻记下 id，浮层内容与占位样式在同一帧内一起收起。
   */
  settled: Readonly<Ref<BingDragDropKey | null>>
  settle: (id: BingDragDropKey) => void
  /**
   * 内部：区域按 id 登记自己的元素。条目放下后不再显示时（移出列表、落到隐藏的列），
   * 浮层收进它落下的区域，而不是飞向空矩形所在的视口左上角。
   */
  registerZone: (id: BingDragDropKey, element: HTMLElement) => () => void
  zoneElement: (id: BingDragDropKey) => HTMLElement | undefined
}

export const bingDragDropKey: InjectionKey<BingDragDropContext> = Symbol('BingDragDrop')

/**
 * 在 BingDragDrop 内部读取当前拖动状态，例如根据被拖条目决定显示哪些额外的放置区域。
 * 在 BingDragDrop 外调用会抛错。
 */
export function useBingDragDrop<T = unknown>() {
  const context = inject(bingDragDropKey, null)

  if (!context) {
    throw new Error('useBingDragDrop() 必须在 <BingDragDrop> 内部使用')
  }

  return context as Omit<BingDragDropContext, 'active' | 'settled' | 'settle' | 'registerZone' | 'zoneElement'> & {
    active: Readonly<Ref<BingDragDropActive<T> | null>>
  }
}

export function useOptionalBingDragDrop() {
  return inject(bingDragDropKey, null)
}
