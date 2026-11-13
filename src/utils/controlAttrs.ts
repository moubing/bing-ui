import { useAttrs } from 'vue'

const nativeAttributes = new Set([
  'role', 'readonly', 'required', 'form', 'maxlength', 'minlength', 'pattern', 'inputmode',
  'autofocus', 'enterkeyhint', 'tabindex', 'list', 'autocapitalize', 'autocorrect', 'dirname', 'wrap', 'cols',
  'onChange', 'onBeforeinput', 'onCompositionstart', 'onCompositionupdate', 'onCompositionend',
  'onSelect', 'onInvalid',
])

export function useControlAttrs() {
  const attrs = useAttrs()
  const isNative = (key: string) => nativeAttributes.has(key) || key.startsWith('aria-')
  // attrs 会在每次渲染前更新，但不适合作为 computed 的响应式依赖。
  return {
    rootAttrs: () => Object.fromEntries(Object.entries(attrs).filter(([key]) => !isNative(key))),
    controlAttrs: () => Object.fromEntries(Object.entries(attrs).filter(([key]) => isNative(key))),
  }
}
