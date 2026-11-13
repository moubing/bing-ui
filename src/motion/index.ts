export const motion = {
  duration: {
    fast: 0.18,
    normal: 0.32,
    slow: 0.62,
  },
  ease: {
    smooth: 'power3.out',
    press: 'back.out(2.2)',
    glide: 'expo.out',
  },
} as const

export { prefersReducedMotion, useReducedMotion } from './reducedMotion'
export * from './smoothScroll'
