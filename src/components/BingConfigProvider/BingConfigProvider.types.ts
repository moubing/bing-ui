import type { BingConfig } from '../../utils/config'

export type { BingConfig, BingConfigSize, BingReducedMotion } from '../../utils/config'

/** 未设置的字段继承外层 BingConfigProvider，最外层回落到组件自身默认值。 */
export interface BingConfigProviderProps extends BingConfig {}
