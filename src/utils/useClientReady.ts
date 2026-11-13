import { onMounted, ref } from 'vue'

/** body 浮层不参与 SSR 水合，避免锚点误匹配页面正文或异步兄弟组件。 */
export function useClientReady() {
  const ready = ref(false)
  onMounted(() => { ready.value = true })
  return ready
}
