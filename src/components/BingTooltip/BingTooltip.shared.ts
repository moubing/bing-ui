import { shallowRef } from 'vue'
import type { Component, Ref } from 'vue'
import type {
  BingTooltipAlign,
  BingTooltipCloseReason,
  BingTooltipPlacement,
  BingTooltipTone,
} from './BingTooltip.types'

export interface BingTooltipSharedOwner {
  id: string
  rootRef: Ref<HTMLElement | null>
  contentComponent: Component
  clearCloseTimer: () => void
  getAlign: () => BingTooltipAlign
  getAriaLabel: () => string | undefined
  getCloseOnEsc: () => boolean
  getCloseOnOutside: () => boolean
  getHasContent: () => boolean
  getHasHoverTrigger: () => boolean
  getInteractive: () => boolean
  getPinned: () => boolean
  getTouchOpen: () => boolean
  getScrollable: () => boolean
  getShortcut: () => string[]
  getTone: () => BingTooltipTone
  getGlassStyle: () => Record<string, string>
  getMaxWidth: () => string
  getOffset: () => number
  getPlacement: () => BingTooltipPlacement
  getReducedMotion: () => boolean
  getTooltipId: () => string
  getViewportPadding: () => number
  getZIndex: () => number
  isTopLayer: (event: KeyboardEvent) => boolean
  hide: (reason?: BingTooltipCloseReason) => void
  scheduleClose: (reason: BingTooltipCloseReason) => void
}

let tooltipOwnerSeed = 0

const tooltipOwners = new Map<string, BingTooltipSharedOwner>()

export const sharedTooltipActiveOwner = shallowRef<BingTooltipSharedOwner | undefined>()
export const sharedTooltipHostId = shallowRef<string | undefined>()
export const sharedTooltipPanelElement = shallowRef<HTMLElement | null>(null)
export const sharedTooltipShouldRender = shallowRef(false)
export const sharedTooltipRefresh = shallowRef<((motionChanged?: boolean) => void) | undefined>()
export const sharedTooltipUpdatePosition = shallowRef<(() => void) | undefined>()
export let lastTooltipCloseReason: BingTooltipCloseReason = 'manual'
export let lastTooltipClosedAt = -Infinity
let keyboardInput = true

export function markTooltipClosed(reason: BingTooltipCloseReason) {
  lastTooltipClosedAt = performance.now()
  lastTooltipCloseReason = reason
}

export function tooltipFocusVisible(target: HTMLElement) {
  try { return target.matches(':focus-visible') }
  catch { return keyboardInput }
}

function onKeydown() { keyboardInput = true }
function onPointerdown() { keyboardInput = false }

export function createTooltipOwnerId() {
  tooltipOwnerSeed += 1

  return `bing-tooltip-owner-${tooltipOwnerSeed}`
}

export function registerTooltipOwner(owner: BingTooltipSharedOwner) {
  if (!tooltipOwners.size && typeof window !== 'undefined') {
    window.addEventListener('keydown', onKeydown, true)
    window.addEventListener('pointerdown', onPointerdown, true)
  }
  tooltipOwners.set(owner.id, owner)

  if (!sharedTooltipHostId.value) {
    sharedTooltipHostId.value = owner.id
  }
}

export function unregisterTooltipOwner(owner: BingTooltipSharedOwner) {
  tooltipOwners.delete(owner.id)

  if (sharedTooltipActiveOwner.value?.id === owner.id) {
    sharedTooltipActiveOwner.value = undefined
    sharedTooltipShouldRender.value = false
  }

  if (sharedTooltipHostId.value === owner.id) {
    sharedTooltipHostId.value = tooltipOwners.keys().next().value
  }

  if (tooltipOwners.size === 0) {
    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', onKeydown, true)
      window.removeEventListener('pointerdown', onPointerdown, true)
    }
    keyboardInput = true
    lastTooltipClosedAt = -Infinity
    sharedTooltipPanelElement.value = null
    sharedTooltipRefresh.value = undefined
    sharedTooltipUpdatePosition.value = undefined
    sharedTooltipShouldRender.value = false
  }
}
