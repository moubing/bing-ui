import { gsap } from 'gsap'

export interface DetailPanelSnapshot {
  height: number
  left: number
  top: number
  width: number
}

export interface DetailPanelTarget {
  x: number
  y: number
  placement: 'left' | 'right'
}

function snapToDevicePixel(value: number) {
  const ratio = window.devicePixelRatio || 1
  return Math.round(value * ratio) / ratio
}

// Select、TreeSelect 与 Autocomplete 共用详情的位移、尺寸变化和内容过渡；组件负责生命周期清理。
export function getOptionDetailSnapshot(detailPanel: HTMLElement | null): DetailPanelSnapshot | undefined {
  if (!detailPanel) {
    return undefined
  }

  const currentAlpha = Number(gsap.getProperty(detailPanel, 'autoAlpha')) || 0

  if (currentAlpha <= 0.01) {
    return undefined
  }

  const rect = detailPanel.getBoundingClientRect()

  if (rect.width <= 0 || rect.height <= 0) {
    return undefined
  }

  return {
    height: rect.height,
    left: rect.left,
    top: rect.top,
    width: rect.width,
  }
}

export function moveOptionDetailPanel({
  panel: detailPanel,
  content,
  getTarget,
  animateContent = false,
  previousSnapshot,
  reducedMotion = false,
  hiddenScale = 0.96,
  enterEase = 'back.out(1.5)',
  force3D,
  onComplete,
}: {
  panel: HTMLElement | null
  content: HTMLElement | null
  getTarget: () => DetailPanelTarget | null
  animateContent?: boolean
  previousSnapshot?: DetailPanelSnapshot
  reducedMotion?: boolean
  /** 面板从隐藏状态出现时的起始缩放。 */
  hiddenScale?: number
  /** 面板从隐藏状态出现时的缓动。 */
  enterEase?: string
  /** 传入 `false` 可避免合成层导致的文字发虚。 */
  force3D?: boolean
  onComplete?: () => void
}) {
  if (!detailPanel) {
    return
  }

  // 滚动或 ResizeObserver 可能在尺寸动画中重新定位，先保留当前尺寸，再测量自然高度。
  // 否则新位移动画会取消原来的清理回调，让旧 height 永久留在面板上。
  const interruptedResize = Boolean(detailPanel.style.height)
  if (interruptedResize && !previousSnapshot) {
    previousSnapshot = getOptionDetailSnapshot(detailPanel)
  }
  if (previousSnapshot || interruptedResize) {
    gsap.killTweensOf(detailPanel)
    gsap.set(detailPanel, {
      clearProps: 'width,height,overflow',
    })
  }

  const target = getTarget()

  if (!target) {
    return
  }

  const currentAlpha = Number(gsap.getProperty(detailPanel, 'autoAlpha')) || 0
  const wasVisible = currentAlpha > 0.01 || Boolean(previousSnapshot)
  const targetRect = detailPanel.getBoundingClientRect()
  const currentRect = previousSnapshot ?? targetRect
  const targetSize = {
    height: targetRect.height,
    width: targetRect.width,
  }
  const shouldAnimateSize =
    Boolean(previousSnapshot) &&
    wasVisible &&
    (animateContent || interruptedResize) &&
    targetSize.width > 0 &&
    targetSize.height > 0 &&
    (Math.abs((previousSnapshot?.width ?? 0) - targetSize.width) > 0.5 ||
      Math.abs((previousSnapshot?.height ?? 0) - targetSize.height) > 0.5)
  const startX = wasVisible
    ? snapToDevicePixel(currentRect.left - target.x)
    : target.placement === 'right'
      ? -8
      : 8
  const startY = wasVisible ? snapToDevicePixel(currentRect.top - target.y) : 0
  const detailMoveDuration = shouldAnimateSize ? 0.32 : wasVisible ? 0.26 : 0.22
  const detailMoveEase = shouldAnimateSize ? 'power2.out' : wasVisible ? 'power3.out' : enterEase

  gsap.killTweensOf(detailPanel)
  detailPanel.style.left = `${target.x}px`
  detailPanel.style.top = `${target.y}px`

  if (reducedMotion) {
    gsap.set(detailPanel, {
      autoAlpha: 1,
      clearProps: 'transform,width,height,overflow',
      willChange: 'auto',
    })
    if (content) {
      gsap.killTweensOf(content)
      gsap.set(content, { clearProps: 'transform,opacity,visibility' })
    }
    onComplete?.()
    return target
  }

  gsap.set(detailPanel, {
    autoAlpha: wasVisible ? currentAlpha : 0,
    scale: wasVisible ? 1 : hiddenScale,
    ...(force3D === undefined ? {} : { force3D }),
    x: startX,
    y: startY,
    ...(shouldAnimateSize && previousSnapshot
      ? {
          height: previousSnapshot.height,
          overflow: 'hidden',
          width: previousSnapshot.width,
        }
      : {}),
    willChange: shouldAnimateSize ? 'opacity, transform, width, height' : 'opacity, transform',
  })

  gsap.to(detailPanel, {
    autoAlpha: 1,
    scale: 1,
    x: 0,
    y: 0,
    ...(shouldAnimateSize
      ? {
          height: targetSize.height,
          width: targetSize.width,
        }
      : {}),
    duration: detailMoveDuration,
    ease: detailMoveEase,
    overwrite: true,
    onComplete: () => {
      gsap.set(detailPanel, {
        clearProps: 'transform,width,height,overflow',
        willChange: 'auto',
      })
      onComplete?.()
    },
  })

  if (animateContent && content) {
    gsap.killTweensOf(content)
    gsap.fromTo(
      content,
      {
        autoAlpha: 0.72,
        y: 3,
      },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.18,
        ease: 'power2.out',
        overwrite: true,
        clearProps: 'transform,opacity,visibility',
      },
    )
  }
  return target
}
