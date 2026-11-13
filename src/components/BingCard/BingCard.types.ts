import type { BingGlassEffectProps } from '../../utils/glass'

export type BingCardVariant = 'plain' | 'soft' | 'accent' | 'sky'
export type BingCardPadding = 'none' | 'sm' | 'md' | 'lg'
export type BingCardRounded = 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full'
export type BingCardEntrance = 'none' | 'fade-up' | 'bubble' | 'rotate-up' | 'soft-pop'
export type BingCardFlipAxis = 'x' | 'y' | 'z'
export type BingCardFlipSide = 'front' | 'back'
export type BingCardFlipTrigger = 'none' | 'click' | 'press'
export type BingCardLongPressRelease = 'restore' | 'stay'

export interface BingCardProps extends BingGlassEffectProps {
  title?: string
  description?: string
  variant?: BingCardVariant
  padding?: BingCardPadding
  rounded?: BingCardRounded
  glass?: boolean
  interactive?: boolean
  tilt?: boolean
  tiltMax?: number
  tiltScale?: number
  glare?: boolean
  entrance?: BingCardEntrance
  entranceOnce?: boolean
  entranceDelay?: number
  entranceDuration?: number
  flipAxis?: BingCardFlipAxis
  flipTurns?: number
  flipEase?: string
  flipTrigger?: BingCardFlipTrigger
  longPressDelay?: number
  longPressRelease?: BingCardLongPressRelease
  disabled?: boolean
}

export interface BingCardEmits {
  enter: []
  'long-press': []
  flip: [side: BingCardFlipSide]
}
