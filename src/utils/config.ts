import { computed, inject, provide } from 'vue'
import type { ComputedRef, InjectionKey } from 'vue'

export type BingConfigSize = 'sm' | 'md' | 'lg'

/**
 * - `user`：跟随系统的 `prefers-reduced-motion` 设置（默认）。
 * - `always`：始终减少动效，适合应用内提供“关闭动画”开关。
 * - `never`：忽略系统设置，始终播放完整动效。
 */
export type BingReducedMotion = 'user' | 'always' | 'never'

export interface BingConfig {
  /** 支持尺寸的组件在未显式传入 `size` 时使用的默认尺寸。 */
  size?: BingConfigSize
  /** 浮层层级基准，默认 2000；各类浮层在此基础上保持固定的相对顺序。 */
  zIndex?: number
  /** JS 驱动动效的减弱策略。 */
  reducedMotion?: BingReducedMotion
}

export interface BingConfigContext {
  size: ComputedRef<BingConfigSize | undefined>
  zIndex: ComputedRef<number>
  reducedMotion: ComputedRef<BingReducedMotion>
}

export const defaultBingZIndex = 2000

/** 各浮层相对 `zIndex` 基准的偏移，与引入全局配置前的默认层级一致。 */
export const bingZIndexOffset = {
  dialog: 0,
  toast: 100,
  filePreview: 300,
  imagePreview: 400,
  colorPicker: 900,
  popover: 1000,
  datePicker: 1100,
  tooltip: 1200,
} as const

export type BingZIndexLayer = keyof typeof bingZIndexOffset

export const bingConfigKey: InjectionKey<BingConfigContext> = Symbol('BingConfig')

const rootConfig: BingConfigContext = {
  size: computed(() => undefined),
  zIndex: computed(() => defaultBingZIndex),
  reducedMotion: computed(() => 'user'),
}

/** 在当前组件下提供全局配置；未设置的字段继承上层配置。 */
export function provideBingConfig(config: () => BingConfig) {
  const parent = inject(bingConfigKey, rootConfig)
  const context: BingConfigContext = {
    size: computed(() => config().size ?? parent.size.value),
    zIndex: computed(() => config().zIndex ?? parent.zIndex.value),
    reducedMotion: computed(() => config().reducedMotion ?? parent.reducedMotion.value),
  }

  provide(bingConfigKey, context)
  return context
}

export function useBingConfig() {
  return inject(bingConfigKey, rootConfig)
}

/** 组件 `size` 优先，其次全局配置，最后回落到 `md`。 */
export function useConfigSize<Size extends string>(getSize: () => Size | undefined) {
  const config = useBingConfig()

  return computed(() => getSize() ?? config.size.value ?? 'md') as ComputedRef<Size | BingConfigSize>
}

/** 组件显式传入的 `zIndex` 优先，否则使用全局基准加上该类浮层的偏移。 */
export function useConfigZIndex(layer: BingZIndexLayer, getZIndex: () => number | undefined = () => undefined) {
  const config = useBingConfig()

  return computed(() => getZIndex() ?? config.zIndex.value + bingZIndexOffset[layer])
}
