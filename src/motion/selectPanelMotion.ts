import { gsap } from 'gsap'

type PanelPlacement = 'top' | 'bottom' | 'left' | 'right'
type PanelAlign = 'start' | 'middle' | 'end'

interface SelectPanelMotionOptions {
  panel: HTMLElement
  items: HTMLElement[]
  actionRail: HTMLElement | null
  actionButtons: HTMLElement[]
  placement: PanelPlacement
  align: PanelAlign
  /** 密集的文字面板可关闭缩放，仅使用平移和淡入淡出。 */
  scale?: boolean
  /** 菜单可限制错峰总时长及参与错峰的项数；选择器保留原节奏。 */
  staggerCap?: number
  maxStaggerItems?: number
  selectedItem?: HTMLElement | null
  onComplete: () => void
}

function getMotionOffset(placement: PanelPlacement, distance: number) {
  if (placement === 'top') return { x: 0, y: distance }
  if (placement === 'bottom') return { x: 0, y: -distance }
  if (placement === 'left') return { x: distance, y: 0 }
  return { x: -distance, y: 0 }
}

function getPanelScale(placement: PanelPlacement, scale: number) {
  return placement === 'left' || placement === 'right'
    ? { scaleX: scale }
    : { scaleY: scale }
}

function getTransformOrigin(placement: PanelPlacement, align: PanelAlign) {
  const crossAxis = align === 'middle' ? '50%' : align === 'end' ? '100%' : '0%'
  if (placement === 'top') return `${crossAxis} 100%`
  if (placement === 'bottom') return `${crossAxis} 0%`
  if (placement === 'left') return `100% ${crossAxis}`
  return `0% ${crossAxis}`
}

function getActionButtonOffset(panel: HTMLElement, actionRail: HTMLElement) {
  return actionRail.getBoundingClientRect().left < panel.getBoundingClientRect().left ? 8 : -8
}

// 选择器和菜单共用时间线；组件负责节点、减少动态效果与生命周期清理。
export function createSelectPanelEnter({
  panel, items, actionRail, actionButtons, placement, align, scale = true, staggerCap, maxStaggerItems = Infinity, onComplete,
}: SelectPanelMotionOptions) {
  // 横向展开时，行与面板同向移动，避免两者叠加后越过终点再折返。
  const itemOffset = placement === 'left' || placement === 'right' ? 6 : -6
  const contentTransform = scale ? {} : { force3D: false }
  const timeline = gsap.timeline({
    defaults: { duration: 0.22, ease: 'power3.out', overwrite: true },
    onComplete,
  })

  timeline
    .fromTo(
      panel,
      {
        autoAlpha: 0,
        ...getMotionOffset(placement, 8),
        ...getPanelScale(placement, scale ? 0.96 : 1),
        ...contentTransform,
        transformOrigin: getTransformOrigin(placement, align),
      },
      {
        autoAlpha: 1,
        x: 0,
        y: 0,
        ...getPanelScale(placement, 1),
        duration: 0.24,
        ease: 'power3.out',
      },
      0,
    )
  if (items.length) {
    timeline.fromTo(
      items,
      { autoAlpha: 0, ...getMotionOffset(placement, itemOffset), scale: scale ? 0.98 : 1, ...contentTransform },
      { autoAlpha: 1, x: 0, y: 0, scale: 1, duration: 0.22,
        stagger: staggerCap === undefined ? 0.022 : index => Math.min(index, maxStaggerItems - 1)
          * Math.min(0.022, staggerCap / Math.max(1, Math.min(items.length, maxStaggerItems) - 1)) },
      0.06,
    )
  }

  if (actionRail) {
    const actionButtonOffset = getActionButtonOffset(panel, actionRail)
    gsap.set(actionRail, { autoAlpha: 1 })
    timeline.fromTo(
      actionButtons,
      { autoAlpha: 0, x: actionButtonOffset, scale: 0.72, transformOrigin: '50% 50%' },
      { autoAlpha: 1, x: 0, scale: 1, duration: 0.26, ease: 'back.out(1.8)', stagger: 0.055 },
      0.08,
    )
  }

  return timeline
}

export function createSelectPanelLeave({
  panel, items, actionRail, actionButtons, placement, scale = true, staggerCap, maxStaggerItems = Infinity, selectedItem, onComplete,
}: SelectPanelMotionOptions) {
  const timeline = gsap.timeline({
    defaults: { duration: 0.16, ease: 'power2.in', overwrite: true },
    onComplete,
  })

  const leavingItems = items.filter(item => item !== selectedItem)
  if (leavingItems.length) {
    timeline.to(
      leavingItems,
      {
        autoAlpha: 0,
        ...getMotionOffset(placement, 4),
        duration: 0.1,
        stagger: staggerCap === undefined ? { each: 0.01, from: 'end' }
          : index => Math.min(leavingItems.length - 1 - index, maxStaggerItems - 1)
            * Math.min(0.01, Math.min(0.06, staggerCap) / Math.max(1, Math.min(leavingItems.length, maxStaggerItems) - 1)),
      },
      0,
    )
  }
  if (selectedItem) timeline.to(selectedItem, { autoAlpha: 0, ...getMotionOffset(placement, 4), duration: 0.1 }, 0.06)
  timeline.to(
    panel,
    {
      autoAlpha: 0,
      ...getMotionOffset(placement, 6),
      ...getPanelScale(placement, scale ? 0.97 : 1),
      duration: 0.16,
    },
    0,
  )

  if (actionRail) {
    timeline.to(
      actionButtons,
      {
        autoAlpha: 0,
        x: getActionButtonOffset(panel, actionRail),
        scale: 0.72,
        duration: 0.14,
        ease: 'power2.in',
        stagger: { each: 0.045, from: 'end' },
      },
      0,
    )
    timeline.set(actionRail, { autoAlpha: 0 }, '>')
  }

  return timeline
}
