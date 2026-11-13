<script setup lang="ts">
import { provideBingConfig } from '../../utils/config'
import type { BingConfigProviderProps } from './BingConfigProvider.types'

defineOptions({ name: 'BingConfigProvider' })

const props = withDefaults(defineProps<BingConfigProviderProps>(), {
  size: undefined,
  zIndex: undefined,
  reducedMotion: undefined,
})

provideBingConfig(() => props)
</script>

<template>
  <slot />
</template>
