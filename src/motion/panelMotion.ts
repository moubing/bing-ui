export const panelEnterMotion = {
  duration: 0.18,
  ease: 'power3.out',
} as const

export const panelLeaveMotion = {
  duration: 0.16,
  ease: 'power2.in',
} as const

export function getPanelHiddenTransform(placement: 'top' | 'bottom' | 'left' | 'right') {
  const horizontal = placement === 'left' || placement === 'right'

  return {
    x: horizontal ? (placement === 'left' ? 8 : -8) : 0,
    y: horizontal ? 0 : (placement === 'bottom' ? -8 : 8),
    scale: 0.985,
    transformOrigin: horizontal
      ? (placement === 'left' ? '100% 50%' : '0% 50%')
      : (placement === 'bottom' ? '50% 0%' : '50% 100%'),
  }
}
