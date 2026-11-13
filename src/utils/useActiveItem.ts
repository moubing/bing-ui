import { computed, ref } from 'vue'

type PointerPosition = Pick<MouseEvent, 'clientX' | 'clientY'>

/** 列表只维护一个 active；键盘滚动或静止指针产生的 enter 不得接管高亮。 */
export function useActiveItem(options: { isPointerBlocked?: () => boolean } = {}) {
  const activeIndex = ref(-1)
  const inputMethod = ref<'pointer' | 'keyboard'>('pointer')
  let pointer: PointerPosition | undefined
  let keyboardPointer: PointerPosition | undefined

  const isKeyboardNavigating = computed({
    get: () => inputMethod.value === 'keyboard',
    set: (value: boolean) => {
      if (value) keyboardPointer = pointer && { ...pointer }
      inputMethod.value = value ? 'keyboard' : 'pointer'
    },
  })

  function rememberPointer(event: PointerPosition) {
    pointer = { clientX: event.clientX, clientY: event.clientY }
  }

  function fromPointer(index: number, event: PointerPosition, moving = false) {
    rememberPointer(event)
    if (options.isPointerBlocked?.()) return false
    if (isKeyboardNavigating.value) {
      if (!keyboardPointer) keyboardPointer = { ...pointer! }
      if (!moving || Math.hypot(event.clientX - keyboardPointer.clientX, event.clientY - keyboardPointer.clientY) <= 2) {
        return false
      }
    }
    isKeyboardNavigating.value = false
    activeIndex.value = index
    return true
  }

  function fromKeyboard(index: number) {
    isKeyboardNavigating.value = true
    activeIndex.value = index
  }

  function reset(index = -1) {
    activeIndex.value = index
    inputMethod.value = 'pointer'
    keyboardPointer = undefined
  }

  return { activeIndex, inputMethod, isKeyboardNavigating, fromPointer, fromKeyboard, rememberPointer, reset }
}
