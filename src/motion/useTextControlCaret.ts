import { onBeforeUnmount, onMounted, onUpdated } from 'vue'
import type { Ref } from 'vue'
import { gsap } from 'gsap'

const nativeCaretQuery = '(prefers-reduced-motion: reduce), (forced-colors: active), (pointer: coarse)'
const supportedTypes = new Set(['text', 'search', 'tel', 'url'])
const bidiText = /[\u0590-\u08ff\u200e\u200f\u202a-\u202e\u2066-\u2069\ufb1d-\ufdff\ufe70-\ufeff]/u
const textStyles = ['fontFamily', 'fontSize', 'fontWeight', 'fontStyle', 'fontStretch', 'fontVariant',
  'fontKerning', 'fontFeatureSettings', 'fontVariationSettings', 'letterSpacing', 'wordSpacing', 'textTransform'] as const

/** 原生控件负责编辑和选区，装饰光标只跟随可准确测量的插入点。 */
export function useTextControlCaret(
  inputRef: Ref<HTMLInputElement | HTMLTextAreaElement | null>,
  layerRef: Ref<HTMLElement | null>,
  caretRef: Ref<HTMLElement | null>,
  enabled: () => boolean,
) {
  let refresh = () => {}
  let dispose = () => {}
  onUpdated(() => refresh())
  onBeforeUnmount(() => dispose())

  onMounted(() => {
    const input = inputRef.value
    const layer = layerRef.value
    const caret = caretRef.value
    if (!input || !layer || !caret) return
    const multiline = input.tagName === 'TEXTAREA'
    const supported = () => multiline || supportedTypes.has(input!.type)
    const doc = input.ownerDocument
    const win = doc.defaultView!
    const media = win.matchMedia(nativeCaretQuery)
    let focused = false
    let composing = false
    let touch = false
    let disposed = false
    let active = false
    let frame = 0
    let snapPending = false
    let activityPending = false
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    let mirror: HTMLSpanElement | undefined
    let mirrorText: Text | undefined
    let fontKey = ''
    let previousX = NaN
    let previousY = NaN
    let previousScroll = 0
    let previousScrollTop = 0
    let previousWidth = 0
    let context: gsap.Context | undefined
    let moveX: ReturnType<typeof gsap.quickTo> | undefined
    let moveY: ReturnType<typeof gsap.quickTo> | undefined
    const range = doc.createRange()

    function hide() {
      if (active) {
        input!.removeAttribute('data-smooth-caret')
        caret!.removeAttribute('data-active')
      }
      active = false
      if (caret!.classList.contains('is-idle')) caret!.classList.remove('is-idle')
      clearTimeout(idleTimer)
      moveX?.tween.pause()
      moveY?.tween.pause()
    }

    function restartBlink() {
      clearTimeout(idleTimer)
      caret!.classList.remove('is-idle')
      idleTimer = setTimeout(() => {
        if (active && !disposed) caret!.classList.add('is-idle')
      }, 600)
    }

    function update() {
      frame = 0
      const snap = snapPending
      const activity = activityPending
      snapPending = activityPending = false
      if (disposed) return
      // 组词可能选中正在转换的文字；只读取焦点端，不移动真实选区或候选窗口。
      const start = composing && input!.selectionDirection !== 'backward'
        ? input!.selectionEnd : input!.selectionStart
      if (!focused || !enabled() || input!.disabled || input!.readOnly || touch ||
        media.matches || doc.hidden || !doc.hasFocus() || doc.activeElement !== input ||
        !supported() || start === null ||
        (!composing && start !== input!.selectionEnd) || bidiText.test(input!.value)) {
        hide()
        // 密码等类型不创建文本镜像，切换类型时也清掉旧内容。
        if (mirrorText && !supported()) mirrorText.data = ''
        return
      }

      const style = win.getComputedStyle(input!)
      if (style.direction !== 'ltr' || style.writingMode !== 'horizontal-tb' ||
        !['start', 'left'].includes(style.textAlign) || parseFloat(style.textIndent) !== 0 || !input!.clientWidth) {
        hide()
        return
      }

      if (!mirror) {
        mirror = doc.createElement('span')
        mirror.setAttribute('aria-hidden', 'true')
        mirror.style.cssText = 'position:absolute;left:0;top:0;visibility:hidden;white-space:pre;width:max-content;pointer-events:none;'
        if (multiline) {
          // 放在变换容器外测量，避免弹窗缩放/晃动污染多行的 x/y 坐标。
          mirror.style.cssText = 'position:fixed;left:0;top:0;display:block;visibility:hidden;pointer-events:none;box-sizing:content-box;margin:0;padding:0;border:0;direction:ltr;'
          mirror.dataset.bingTextareaMeasure = ''
        }
        mirrorText = doc.createTextNode('')
        mirror.append(mirrorText)
        ;(multiline ? doc.body : layer!).append(mirror)
      }
      const nextFontKey = textStyles.map(key => style[key]).join('|')
      if (fontKey !== nextFontKey) {
        textStyles.forEach(key => { mirror!.style[key] = style[key] })
        fontKey = nextFontKey
      }
      if (multiline) {
        const width = input!.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight)
        if (width <= 0) { hide(); return }
        for (const key of ['lineHeight', 'whiteSpace', 'overflowWrap', 'wordBreak', 'tabSize'] as const) {
          if (mirror.style[key] !== style[key]) mirror.style[key] = style[key]
        }
        if (mirror.style.width !== `${width}px`) mirror.style.width = `${width}px`
      }
      // 尾部零宽字符给空值和最后一个换行提供可测量的真实末行。
      const value = multiline ? input!.value + '\u200b' : input!.value || '\u200b'
      if (mirrorText!.data !== value) mirrorText!.data = value
      range.setStart(mirrorText!, start)
      range.collapse(true)
      const rects = range.getClientRects()
      if (!rects.length) { hide(); return }

      // 镜像保留完整文本的字距、连字与组合字符，不能用“字符数 × 字宽”估算。
      const mirrorRect = mirror.getBoundingClientRect()
      const scaleX = multiline ? 1 : layer!.getBoundingClientRect().width / layer!.clientWidth || 1
      const padding = parseFloat(style.paddingLeft) || 0
      const rect = rects[0]!
      const rawX = input!.offsetLeft + padding + (rect.left - mirrorRect.left) / scaleX - input!.scrollLeft
      const height = Math.min(input!.clientHeight, parseFloat(style.fontSize) * 1.2)
      const lineHeight = parseFloat(style.lineHeight) || rect.height
      const line = Math.max(0, Math.round((rect.top - mirrorRect.top) / lineHeight))
      const y = multiline
        ? input!.offsetTop + parseFloat(style.paddingTop) + line * lineHeight + (lineHeight - height) / 2 - input!.scrollTop
        : input!.offsetTop + (input!.clientHeight - height) / 2
      if (rawX < input!.offsetLeft - 1 || rawX > input!.offsetLeft + input!.clientWidth + 1 ||
        y + height <= input!.offsetTop || y >= input!.offsetTop + input!.clientHeight) {
        hide()
        return
      }
      const x = Math.max(input!.offsetLeft, Math.min(input!.offsetLeft + input!.clientWidth - 2, rawX))
      const moved = !active || Math.abs(previousX - x) > 0.1 || Math.abs(previousY - y) > 0.1
      const geometryChanged = previousScroll !== input!.scrollLeft || previousScrollTop !== input!.scrollTop || previousWidth !== input!.clientWidth

      if (!moveX) {
        context = gsap.context(() => {
          moveX = gsap.quickTo(caret!, 'x', { duration: 0.09, ease: 'power2.out' })
          if (multiline) moveY = gsap.quickTo(caret!, 'y', { duration: 0.09, ease: 'power2.out' })
        }, layer!)
      }
      if (!active || snap || geometryChanged) {
        moveX!(x, x)
        moveX!.tween.progress(1).pause()
        if (moveY) { moveY(y, y); moveY.tween.progress(1).pause() }
      } else if (moved) {
        moveX!(x)
        moveY?.(y)
      }
      // 只写变化的样式，避免表单提示的观察器与组件更新互相触发。
      if (caret!.style.height !== `${height}px`) caret!.style.height = `${height}px`
      const top = multiline ? '0px' : `${y}px`
      if (caret!.style.top !== top) caret!.style.top = top
      if (caret!.style.color !== style.color) caret!.style.color = style.color
      if (!active) {
        caret!.setAttribute('data-active', '')
        input!.setAttribute('data-smooth-caret', '')
      }
      active = true
      previousX = x
      previousY = y
      previousScroll = input!.scrollLeft
      previousScrollTop = input!.scrollTop
      previousWidth = input!.clientWidth
      if (moved || activity) restartBlink()
    }

    function schedule(snap = false, activity = false) {
      if (disposed || !focused) return
      snapPending ||= snap
      activityPending ||= activity
      if (!frame) frame = win.requestAnimationFrame(update)
    }

    function sync() {
      if (disposed || !focused) return
      win.cancelAnimationFrame(frame)
      snapPending = activityPending = true
      update()
    }

    const onSelection = () => schedule()
    const onGeometry = () => schedule(true)
    const onActivity = () => schedule(false, true)
    const onWindowBlur = () => hide()
    const onVisibility = () => doc.hidden ? hide() : schedule(true)
    const onPointerUp = () => sync()
    // 自动增高不打断换行位移；宽度或滚动变化仍由几何检查立即校准。
    const resize = new ResizeObserver(() => schedule())

    function onFocus() {
      if (focused) return
      focused = true
      doc.addEventListener('selectionchange', onSelection)
      doc.addEventListener('pointerup', onPointerUp)
      doc.addEventListener('pointercancel', onPointerUp)
      doc.addEventListener('visibilitychange', onVisibility)
      win.addEventListener('blur', onWindowBlur)
      win.addEventListener('focus', onGeometry)
      win.addEventListener('resize', onGeometry)
      media.addEventListener('change', onGeometry)
      doc.fonts?.addEventListener('loadingdone', onGeometry)
      resize.observe(input!)
      // 首次绘制前接管光标；下一帧再校准鼠标默认行为落定后的插入点。
      sync()
      schedule(true, true)
    }

    function onBlur() {
      focused = composing = touch = false
      hide()
      win.cancelAnimationFrame(frame)
      frame = 0
      snapPending = activityPending = false
      doc.removeEventListener('selectionchange', onSelection)
      doc.removeEventListener('pointerup', onPointerUp)
      doc.removeEventListener('pointercancel', onPointerUp)
      doc.removeEventListener('visibilitychange', onVisibility)
      win.removeEventListener('blur', onWindowBlur)
      win.removeEventListener('focus', onGeometry)
      win.removeEventListener('resize', onGeometry)
      media.removeEventListener('change', onGeometry)
      doc.fonts?.removeEventListener('loadingdone', onGeometry)
      resize.disconnect()
      context?.revert()
      context = moveX = moveY = undefined
      mirror?.remove()
      mirror = mirrorText = undefined
      fontKey = ''
    }

    const onPointerDown = (event: PointerEvent) => {
      touch ||= event.pointerType === 'touch'
      // 普通按下不等于拖选。真正出现选区时由 update 交回原生绘制。
      if (touch) hide()
      else schedule(true, true)
    }
    const onCompositionStart = () => { composing = true; schedule(false, true) }
    const onCompositionEnd = () => { composing = false; schedule(false, true) }
    const events = {
      focus: onFocus, blur: onBlur, input: onActivity, keydown: onActivity, keyup: onSelection,
      select: onSelection, scroll: onGeometry, pointerdown: onPointerDown,
      compositionstart: onCompositionStart, compositionupdate: onActivity, compositionend: onCompositionEnd,
    }
    for (const [event, listener] of Object.entries(events)) input.addEventListener(event, listener as EventListener)
    refresh = () => schedule()
    dispose = () => {
      disposed = true
      onBlur()
      for (const [event, listener] of Object.entries(events)) input.removeEventListener(event, listener as EventListener)
      refresh = () => {}
    }
    if (doc.activeElement === input) onFocus()
  })
}
