<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { registerCursor } from './BingCursor.controller'
import { createNativeCursor } from './BingCursor.native'
import type { BingCursorEmits, BingCursorProps, BingCursorSlots, BingCursorType } from './BingCursor.types'

const props = withDefaults(defineProps<BingCursorProps>(), {
  type: 'auto',
  global: false,
  disabled: false,
  size: 28,
})
const emit = defineEmits<BingCursorEmits>()
defineSlots<BingCursorSlots>()
const rootRef = ref<HTMLElement | null>(null)
const paletteRef = ref<HTMLElement | null>(null)
const mounted = ref(false)
const paletteStyle = computed<CSSProperties>(() => ({
  '--bing-cursor-color': props.color,
  '--bing-cursor-outline': props.outlineColor,
  color: 'var(--bing-cursor-color, #171717)',
  backgroundColor: 'var(--bing-cursor-outline, #ffffff)',
}))
let controller: ReturnType<typeof registerCursor> | undefined
let visible = false
let currentType: BingCursorType = 'default'

onMounted(() => {
  mounted.value = true
  controller = registerCursor({
    root: rootRef.value!,
    options: () => props,
    nativeCursor(type) {
      if (!paletteRef.value) return undefined
      // 仅在状态刷新时解析主题色；相同外观复用图片，坐标由浏览器更新。
      const colors = paletteRef.value.ownerDocument.defaultView!.getComputedStyle(paletteRef.value)
      return createNativeCursor(type, props.size, colors.color, colors.backgroundColor, props.hotspot)
    },
    show(type) {
      if (type !== currentType) {
        currentType = type
        emit('change', type)
      }
      if (!visible) {
        visible = true
        emit('visibility-change', true)
      }
    },
    hide() {
      if (visible) {
        visible = false
        emit('visibility-change', false)
      }
    },
  })
})

watch(paletteRef, () => controller?.refresh(), { flush: 'post' })
watch(() => [props.disabled, props.global, props.type, props.size, props.hotspot, props.color, props.outlineColor], () => controller?.refresh(), { deep: true, flush: 'post' })
onBeforeUnmount(() => controller?.destroy())
</script>

<template>
  <div ref="rootRef" class="bing-cursor">
    <slot />
    <span v-if="mounted" ref="paletteRef" hidden aria-hidden="true" data-bing-cursor-palette :style="paletteStyle" />
  </div>
</template>

<style scoped>
.bing-cursor {
  display: contents;
}
</style>
