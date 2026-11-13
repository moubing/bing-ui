import type { InjectionKey } from 'vue'
import type { useMenuNavigation } from './useMenuNavigation'
import type { useSubmenuIntent } from './useSubmenuIntent'
import type { BingDropDownHighlightMotion } from './BingDropDown.types'

export interface BingDropDownContext {
  close: () => void
  floatingId: string
  getGlassStyle: () => Record<string, string>
  onMenuKeydown: (event: KeyboardEvent) => void
  navigation: ReturnType<typeof useMenuNavigation>
  intent: ReturnType<typeof useSubmenuIntent>
  getHighlightMotion: () => BingDropDownHighlightMotion
  select: (item: HTMLElement) => void
  getSelectedItem: () => HTMLElement | null
  onSurfaceEnter: () => void
  onSurfaceLeave: (event: PointerEvent) => void
}

export const bingDropDownContextKey: InjectionKey<BingDropDownContext> =
  Symbol('BingDropDownContext')
