import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { h, nextTick } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import BingDropDown from './BingDropDown.vue'
import dropdownSource from './BingDropDown.vue?raw'
import BingDropDownItem from './BingDropDownItem.vue'
import dropdownItemSource from './BingDropDownItem.vue?raw'

enableAutoUnmount(afterEach)

function stubReducedMotion(matches = true) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  )
}

function rect(top: number, left: number, width: number, height: number): DOMRect {
  return {
    bottom: top + height,
    height,
    left,
    right: left + width,
    top,
    width,
    x: left,
    y: top,
    toJSON: () => ({}),
  }
}

function getBodyPanel() {
  return document.body.querySelector<HTMLElement>('.bing-dropdown__panel')
}

function getBodyItems() {
  return Array.from(document.body.querySelectorAll<HTMLElement>('.bing-dropdown-item'))
}

function getBodyItemByText(text: string) {
  return getBodyItems().find((item) => item.textContent?.includes(text))
}

function dispatchPanelKey(key: string) {
  getBodyPanel()?.dispatchEvent(
    new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
    }),
  )
}

type TriggerSlotProps = {
  triggerProps: Record<string, unknown>
  getTriggerProps: (context?: unknown) => Record<string, unknown>
}

type DefaultSlotProps = {
  context: unknown
}

type MenuContext = {
  kind: string
  name: string
}

describe('BingDropDown', () => {
  beforeEach(() => {
    stubReducedMotion()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.innerHTML = ''
  })

  it('renders a controlled glass menu panel with slotted items', async () => {
    const wrapper = mount(BingDropDown, {
      props: {
        open: true,
        ariaLabel: 'Action menu',
        glassBlur: 6,
        glassOpacity: 0.9,
        glassSaturation: 1.05,
      },
      slots: {
        default: () =>
          h(BingDropDownItem, {
            title: 'Create project',
            description: 'Start from a clean board',
            shortcut: 'Ctrl+N',
          }),
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()

    expect(wrapper.classes()).toContain('is-open')
    expect(panel?.getAttribute('role')).toBe('menu')
    expect(panel?.getAttribute('aria-label')).toBe('Action menu')
    expect(panel?.getAttribute('style')).toContain('--bing-dropdown-glass-blur: 6px')
    expect(panel?.getAttribute('style')).toContain('--bing-dropdown-glass-opacity: 0.9')
    expect(panel?.getAttribute('style')).toContain('--bing-dropdown-glass-saturation: 1.05')
    expect(panel?.getAttribute('style')).toContain('--bing-dropdown-item-height: 32px')
    expect(panel?.querySelector('.bing-dropdown-item__title')?.textContent).toBe('Create project')
    expect(Array.from(panel?.querySelectorAll('kbd') ?? []).map(key => key.textContent)).toEqual(['Ctrl', 'N'])
    expect(panel?.querySelector('[data-bing-dropdown-item]')?.getAttribute('aria-keyshortcuts')).toBe('Control+N')
  })

  it('uses a visible glass treatment by default on the menu panel', async () => {
    mount(BingDropDown, {
      props: {
        open: true,
      },
      slots: {
        default: () => h(BingDropDownItem, { title: 'Default glass' }),
      },
    })

    await nextTick()
    await nextTick()

    const panel = getBodyPanel()

    expect(panel?.classList).toContain('is-glass')
    expect(panel?.getAttribute('style')).toContain('--bing-dropdown-glass-blur: var(--bing-glass-blur, 16px)')
    expect(panel?.getAttribute('style')).toContain('--bing-dropdown-glass-opacity: var(--bing-glass-opacity, 0.85)')
    expect(panel?.getAttribute('style')).toContain('--bing-dropdown-glass-saturation: var(--bing-glass-saturation, 1.05)')
  })

  it('uses an opaque surface when glass is disabled', async () => {
    mount(BingDropDown, {
      props: {
        glass: false,
        open: true,
      },
      slots: {
        default: () => h(BingDropDownItem, { title: 'Solid menu' }),
      },
    })

    await nextTick()
    await nextTick()

    const panel = getBodyPanel()
    const style = panel?.getAttribute('style') ?? ''

    expect(panel?.classList).not.toContain('is-glass')
    expect(style).toContain('--bing-dropdown-glass-blur: 0px')
    expect(style).toContain('--bing-dropdown-glass-opacity: 1')
    expect(style).toContain('--bing-dropdown-glass-saturation: 1')
  })

  it('applies a custom class to the teleported panel', async () => {
    mount(BingDropDown, {
      props: {
        open: true,
        panelClass: 'custom-floating-panel',
      },
      slots: {
        default: () => h(BingDropDownItem, { title: 'Custom panel' }),
      },
    })

    await nextTick()
    await nextTick()

    expect(getBodyPanel()?.classList).toContain('custom-floating-panel')
  })

  it('uses semantic translucent surfaces without decorative panel gradients', () => {
    const panelRule = dropdownSource.match(/\.bing-dropdown__panel\s*{[^}]+}/)?.[0] ?? ''
    const submenuRule =
      dropdownItemSource.match(/\.bing-dropdown-item__submenu\s*{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(panelRule).toContain('var(--bing-surface-rgb)')
    expect(panelRule).toContain('var(--bing-dropdown-glass-opacity, 0.85)')
    expect(panelRule).toContain('var(--bing-popover-shadow)')
    expect(panelRule).toContain('var(--bing-dropdown-glass-blur, 10px)')
    expect(panelRule).not.toContain('linear-gradient')
    expect(dropdownSource).not.toContain('.bing-dropdown__panel::before')
    expect(submenuRule).toContain('var(--bing-surface-rgb)')
    expect(submenuRule).toContain('var(--bing-dropdown-glass-opacity, 0.85)')
    expect(submenuRule).toContain('var(--bing-popover-shadow)')
    expect(submenuRule).toContain('var(--bing-dropdown-glass-blur, 10px)')
    expect(submenuRule).not.toContain('linear-gradient')
    expect(dropdownItemSource).toContain('background: var(--bing-surface-hover)')
    expect(dropdownItemSource).toContain('box-shadow: var(--bing-control-focus-shadow)')
  })

  it('lets a trigger slot use internal open state and closes on outside pointerdown', async () => {
    const wrapper = mount(BingDropDown, {
      attachTo: document.body,
      slots: {
        trigger: ({ triggerProps }: TriggerSlotProps) =>
          h('button', { class: 'menu-trigger', ...triggerProps }, '打开'),
        default: () => h(BingDropDownItem, { title: 'Archive' }),
      },
    })

    await wrapper.get('.menu-trigger').trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-open')
    expect(wrapper.emitted('update:open')?.[0]).toEqual([true])

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).not.toContain('is-open')
    expect(wrapper.emitted('update:open')?.[1]).toEqual([false])
  })

  it('opens with hover trigger and stays open while entering the panel', async () => {
    vi.useFakeTimers()

    const wrapper = mount(BingDropDown, {
      props: {
        trigger: 'hover',
      },
      attachTo: document.body,
      slots: {
        trigger: ({ triggerProps }: TriggerSlotProps) =>
          h('button', { class: 'menu-trigger', ...triggerProps }, '打开'),
        default: () => h(BingDropDownItem, { title: 'Settings' }),
      },
    })

    await wrapper.get('.menu-trigger').trigger('pointerenter')
    vi.advanceTimersByTime(80)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()

    expect(wrapper.classes()).toContain('is-open')
    expect(wrapper.emitted('update:open')?.[0]).toEqual([true])
    expect(panel).not.toBeNull()

    await wrapper.get('.menu-trigger').trigger('pointerleave')
    panel?.dispatchEvent(new Event('pointerenter', { bubbles: true }))
    vi.advanceTimersByTime(120)
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).toContain('is-open')
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true])

    panel?.dispatchEvent(new Event('pointerleave', { bubbles: true }))
    vi.advanceTimersByTime(120)
    await wrapper.vm.$nextTick()

    expect(wrapper.classes()).not.toContain('is-open')
    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('shares one context menu across targets and renders from the active context', async () => {
    const fileContext = { kind: 'file', name: 'report.pdf' }
    const folderContext = { kind: 'folder', name: 'Design assets' }
    const wrapper = mount(BingDropDown, {
      props: {
        trigger: 'contextmenu',
        minWidth: '220px',
      },
      attachTo: document.body,
      slots: {
        trigger: ({ getTriggerProps }: TriggerSlotProps) =>
          h('div', { class: 'context-targets' }, [
            h('button', { class: 'file-target', ...getTriggerProps(fileContext) }, 'report.pdf'),
            h(
              'button',
              { class: 'folder-target', ...getTriggerProps(folderContext) },
              'Design assets',
            ),
          ]),
        default: ({ context }: DefaultSlotProps) => {
          const menuContext = context as MenuContext | null

          return [
          menuContext?.kind === 'folder'
            ? h(BingDropDownItem, { title: 'New file' })
            : h(BingDropDownItem, { title: 'Open file' }),
          h(BingDropDownItem, { title: `Rename ${menuContext?.name ?? ''}` }),
        ]
        },
      },
    })

    const fileTarget = wrapper.get('.file-target').element
    const folderTarget = wrapper.get('.folder-target').element
    const fileEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 320,
      clientY: 240,
    })

    fileTarget.dispatchEvent(fileEvent)
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    let panel = getBodyPanel()

    expect(fileEvent.defaultPrevented).toBe(true)
    expect(wrapper.emitted('update:open')?.[0]).toEqual([true])
    expect(wrapper.emitted('update:context')?.[0]).toEqual([fileContext])
    expect(wrapper.emitted('context-open')?.[0]?.[0]).toMatchObject({
      context: fileContext,
      x: 320,
      y: 240,
    })
    expect(panel?.style.left).toBe('326px')
    expect(panel?.style.top).toBe('246px')
    expect(panel?.textContent).toContain('Open file')
    expect(panel?.textContent).toContain('Rename report.pdf')
    expect(panel?.textContent).not.toContain('New file')

    folderTarget.dispatchEvent(
      new MouseEvent('pointerdown', {
        bubbles: true,
        button: 2,
        buttons: 2,
      }),
    )
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([true])

    folderTarget.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 480,
        clientY: 160,
      }),
    )
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    panel = getBodyPanel()

    expect(wrapper.emitted('update:context')?.at(-1)).toEqual([folderContext])
    expect(panel?.style.left).toBe('486px')
    expect(panel?.style.top).toBe('166px')
    expect(panel?.textContent).toContain('New file')
    expect(panel?.textContent).toContain('Rename Design assets')
    expect(panel?.textContent).not.toContain('Open file')

    folderTarget.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
  })

  it('keeps context menu content stable while the close animation runs', async () => {
    stubReducedMotion(false)

    const fileContext = { kind: 'file', name: 'draft.fig', deletable: true }
    const wrapper = mount(BingDropDown, {
      props: {
        trigger: 'contextmenu',
      },
      attachTo: document.body,
      slots: {
        trigger: ({ getTriggerProps }: TriggerSlotProps) =>
          h('button', { class: 'file-target', ...getTriggerProps(fileContext) }, 'draft.fig'),
        default: ({ context }: DefaultSlotProps) => {
          const menuContext = context as typeof fileContext | null

          return [
            h(BingDropDownItem, {
              title: 'Open file',
              description: menuContext?.name ?? '',
            }),
            h(BingDropDownItem, { title: 'Rename' }),
            menuContext?.deletable
              ? h(BingDropDownItem, { title: 'Delete', tone: 'danger' })
              : null,
          ]
        },
      },
    })

    wrapper.get('.file-target').element.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
        clientX: 320,
        clientY: 240,
      }),
    )
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()

    expect(panel?.textContent).toContain('draft.fig')
    expect(panel?.textContent).toContain('Delete')

    document.body.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:open')?.at(-1)).toEqual([false])
    expect(wrapper.emitted('update:context')?.at(-1)).toEqual([fileContext])
    expect(panel?.textContent).toContain('draft.fig')
    expect(panel?.textContent).toContain('Delete')
  })

  it('requests parent close when an enabled item is clicked', async () => {
    const onClick = vi.fn()
    const wrapper = mount(BingDropDown, {
      props: {
        open: true,
      },
      slots: {
        default: () => h(BingDropDownItem, { title: 'Delete', tone: 'danger', onClick }),
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    getBodyItems()[0]?.click()
    await wrapper.vm.$nextTick()

    expect(onClick).toHaveBeenCalledTimes(1)
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('keeps submenu hover-driven with a short close grace', async () => {
    vi.useFakeTimers()

    const wrapper = mount(BingDropDown, {
      props: {
        open: true,
        glassBlur: 7,
        glassOpacity: 0.88,
        glassSaturation: 1.08,
      },
      slots: {
        default: () =>
          h(
            BingDropDownItem,
            { title: 'Export' },
            {
              submenu: () => h(BingDropDownItem, { title: 'Export PDF' }),
            },
          ),
      },
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const submenuShell = document.body.querySelector<HTMLElement>('.bing-dropdown-item-shell')
    const submenuTrigger = getBodyItems()[0]

    submenuShell?.dispatchEvent(new Event('pointerenter'))
    vi.advanceTimersByTime(100)
    await wrapper.vm.$nextTick()

    const submenu = document.body.querySelector<HTMLElement>('.bing-dropdown-item__submenu')

    expect(submenuShell?.classList).toContain('is-submenu-visible')
    expect(submenuTrigger?.getAttribute('aria-expanded')).toBe('true')
    expect(submenu?.getAttribute('style')).toContain('--bing-dropdown-glass-blur: 7px')
    expect(submenu?.getAttribute('style')).toContain('--bing-dropdown-glass-opacity: 0.88')
    expect(submenu?.getAttribute('style')).toContain('--bing-dropdown-glass-saturation: 1.08')
    expect(submenu?.getAttribute('style')).toContain('--bing-dropdown-item-height: 32px')

    submenuShell?.dispatchEvent(new Event('focusin'))
    await wrapper.vm.$nextTick()

    submenuTrigger?.click()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:open')).toBeUndefined()
    expect(submenuShell?.classList).toContain('has-submenu')
    expect(submenuShell?.classList).toContain('is-submenu-visible')
    expect(submenuTrigger?.getAttribute('aria-expanded')).toBe('true')

    submenuShell?.dispatchEvent(new Event('pointerleave'))
    vi.advanceTimersByTime(60)
    await wrapper.vm.$nextTick()

    expect(submenuShell?.classList).toContain('is-submenu-visible')
    expect(submenuTrigger?.getAttribute('aria-expanded')).toBe('true')

    submenuShell?.dispatchEvent(new Event('pointerenter'))
    await wrapper.vm.$nextTick()

    vi.advanceTimersByTime(40)
    await wrapper.vm.$nextTick()

    expect(submenuShell?.classList).toContain('is-submenu-visible')
    expect(submenuTrigger?.getAttribute('aria-expanded')).toBe('true')

    submenuShell?.dispatchEvent(new Event('pointerleave'))
    vi.advanceTimersByTime(90)
    await wrapper.vm.$nextTick()

    expect(submenuShell?.classList).not.toContain('is-submenu-visible')
    expect(submenuTrigger?.getAttribute('aria-expanded')).toBe('false')
  })

  it('blocks disabled item click events', async () => {
    const wrapper = mount(BingDropDownItem, {
      props: {
        title: 'Disabled action',
        disabled: true,
      },
    })

    await wrapper.get('.bing-dropdown-item').trigger('click')

    expect(wrapper.emitted('click')).toBeUndefined()
    expect(wrapper.get('.bing-dropdown-item').attributes('aria-disabled')).toBe('true')
  })

  it('moves focus through items with arrow keys and closes with escape', async () => {
    const wrapper = mount(BingDropDown, {
      props: {
        open: true,
      },
      slots: {
        default: () => [
          h(BingDropDownItem, { title: 'First' }),
          h(BingDropDownItem, { title: 'Second' }),
          h(BingDropDownItem, { title: 'Disabled', disabled: true }),
        ],
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const items = getBodyItems()

    items[0]?.focus()
    dispatchPanelKey('ArrowDown')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(items[1])

    dispatchPanelKey('ArrowDown')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(items[0])

    dispatchPanelKey('Escape')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })

  it('opens from the trigger with arrow keys and restores trigger focus on escape', async () => {
    const wrapper = mount(BingDropDown, {
      attachTo: document.body,
      slots: {
        trigger: ({ triggerProps }: TriggerSlotProps) =>
          h('button', { class: 'menu-trigger', ...triggerProps }, '打开'),
        default: () => [
          h(BingDropDownItem, { title: 'First' }),
          h(BingDropDownItem, { title: 'Second' }),
          h(BingDropDownItem, { title: 'Third' }),
        ],
      },
    })

    const trigger = wrapper.get<HTMLButtonElement>('.menu-trigger').element

    trigger.focus()
    await wrapper.get('.menu-trigger').trigger('keydown', { key: 'ArrowDown' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const firstItems = getBodyItems()

    expect(wrapper.emitted('update:open')?.[0]).toEqual([true])
    expect(document.activeElement).toBe(firstItems[0])

    dispatchPanelKey('Escape')
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:open')?.[1]).toEqual([false])
    expect(document.activeElement).toBe(trigger)

    await wrapper.get('.menu-trigger').trigger('keydown', { key: 'ArrowUp' })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    expect(wrapper.emitted('update:open')?.[2]).toEqual([true])
    expect(document.activeElement).toBe(getBodyItems()[2])
  })

  it('keeps arrow navigation scoped to the current menu and enters submenu with right arrow', async () => {
    const wrapper = mount(BingDropDown, {
      props: {
        open: true,
      },
      slots: {
        default: () => [
          h(BingDropDownItem, { title: 'Rename' }),
          h(
            BingDropDownItem,
            { title: 'Settings' },
            {
              submenu: () => [
                h(BingDropDownItem, { title: 'Personal' }),
                h(BingDropDownItem, { title: 'Team' }),
              ],
            },
          ),
          h(BingDropDownItem, { title: 'Docs' }),
        ],
      },
      attachTo: document.body,
    })

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const settingsItem = getBodyItemByText('Settings')
    const docsItem = getBodyItemByText('Docs')
    const personalItem = getBodyItemByText('Personal')
    const teamItem = getBodyItemByText('Team')

    settingsItem?.focus()
    dispatchPanelKey('ArrowDown')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(docsItem)

    dispatchPanelKey('ArrowUp')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(settingsItem)

    dispatchPanelKey('ArrowRight')
    await flushPromises()

    expect(document.activeElement).toBe(personalItem)

    dispatchPanelKey('ArrowDown')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(teamItem)

    dispatchPanelKey('ArrowDown')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(personalItem)

    dispatchPanelKey('ArrowLeft')
    await wrapper.vm.$nextTick()

    expect(document.activeElement).toBe(settingsItem)
  })

  it('places the panel above the trigger when there is not enough room below', async () => {
    const originalInnerHeight = window.innerHeight
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 600,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 900,
    })

    const wrapper = mount(BingDropDown, {
      props: {
        open: true,
      },
      slots: {
        default: () => [
          h(BingDropDownItem, { title: 'First' }),
          h(BingDropDownItem, { title: 'Second' }),
          h(BingDropDownItem, { title: 'Third' }),
        ],
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-dropdown').element

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(520, 760, 120, 42))

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()

    expect(panel?.classList).toContain('is-placement-top')
    expect(Number.parseFloat(panel?.style.top ?? '0')).toBeLessThan(520)
    expect(Number.parseFloat(panel?.style.left ?? '0')).toBeLessThanOrEqual(900 - 12)
    expect(panel?.style.position).toBe('')

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })

  it('places the panel to the left of the trigger when requested', async () => {
    const originalInnerHeight = window.innerHeight
    const originalInnerWidth = window.innerWidth

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: 1000,
    })

    const wrapper = mount(BingDropDown, {
      props: {
        open: true,
        placement: 'left-start',
        minWidth: 360,
      },
      slots: {
        default: () => h('div', { 'data-bing-dropdown-stagger': '' }, '列设置'),
      },
      attachTo: document.body,
    })
    const root = wrapper.get('.bing-dropdown').element

    vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(60, 820, 44, 44))

    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const panel = getBodyPanel()

    expect(panel?.classList).toContain('is-placement-left')
    expect(Number.parseFloat(panel?.style.left ?? '0')).toBe(452)
    expect(Number.parseFloat(panel?.style.top ?? '0')).toBe(60)
    expect(panel?.querySelector('[data-bing-dropdown-stagger]')?.textContent).toBe('列设置')

    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: originalInnerHeight,
    })
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      value: originalInnerWidth,
    })
  })
})
