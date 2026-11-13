import { enableAutoUnmount, mount } from '@vue/test-utils'
import { gsap } from 'gsap'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import BingSortableList from './BingSortableList.vue'

enableAutoUnmount(afterEach)

const items = [
  { id: 'project', label: 'Project' },
  { id: 'owner', label: 'Owner' },
  { id: 'status', label: 'Status' },
]

function createPointerEvent(type: string, options: Record<string, unknown> = {}) {
  const defaults = {
    button: 0,
    clientX: 0,
    clientY: 0,
    isPrimary: true,
    pointerId: 1,
    pointerType: 'mouse',
  }
  const init = {
    bubbles: true,
    cancelable: true,
    ...defaults,
    ...options,
  }
  const event =
    typeof PointerEvent === 'function'
      ? new PointerEvent(type, init)
      : new Event(type, {
          bubbles: true,
          cancelable: true,
        })

  Object.entries(init).forEach(([key, value]) => {
    Object.defineProperty(event, key, {
      configurable: true,
      value,
    })
  })

  return event as PointerEvent
}

function dispatchPointer(target: EventTarget, type: string, options: Record<string, unknown> = {}) {
  target.dispatchEvent(createPointerEvent(type, options))
}

function installItemRects(root: HTMLElement) {
  Object.defineProperty(root, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      width: 240,
      height: 132,
      top: 0,
      right: 240,
      bottom: 132,
      left: 0,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    }),
  })

  root.querySelectorAll<HTMLElement>('[data-bing-sortable-key]').forEach((element) => {
    Object.defineProperty(element, 'getBoundingClientRect', {
      configurable: true,
      value: () => {
        const siblings = Array.from(root.querySelectorAll('[data-bing-sortable-key]'))
        const index = siblings.indexOf(element)
        const top = index * 44

        return {
          width: 240,
          height: 36,
          top,
          right: 240,
          bottom: top + 36,
          left: 0,
          x: 0,
          y: top,
          toJSON: () => ({}),
        }
      },
    })
  })
}

function mountSortable(options: Record<string, unknown> = {}) {
  return mount(BingSortableList, {
    props: {
      items,
      itemKey: 'id',
      flip: false,
      settleDuration: 0,
      ...options,
    },
    slots: {
      default: `
        <template #default="{ item, handleProps }">
          <div class="demo-item">
            <span class="demo-handle" v-bind="handleProps">{{ item.label }}</span>
          </div>
        </template>
      `,
    },
  })
}

describe('BingSortableList', () => {
  beforeEach(() => {
    Object.defineProperty(document, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
    Object.defineProperty(Element.prototype, 'getAnimations', {
      configurable: true,
      value: () => [],
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
    document.body.innerHTML = ''
    document.documentElement.style.cursor = ''
    document.documentElement.style.userSelect = ''
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  })

  it('renders items with handle props', () => {
    const wrapper = mountSortable()

    expect(wrapper.findAll('.bing-sortable-list__item')).toHaveLength(3)
    expect(wrapper.text()).toContain('Project')
    expect(wrapper.get('.demo-handle').attributes('role')).toBe('button')
    expect(wrapper.get('.demo-handle').attributes('tabindex')).toBe('0')
  })

  it('uses an external order when provided', () => {
    const wrapper = mountSortable({
      order: ['status', 'project', 'owner'],
    })

    expect(wrapper.findAll('.demo-item').map((item) => item.text())).toEqual([
      'Status',
      'Project',
      'Owner',
    ])
  })

  it('animates external order changes with FLIP transforms', async () => {
    const fromTo = vi.spyOn(gsap, 'fromTo')
    const wrapper = mountSortable({
      order: ['project', 'owner', 'status'],
      flip: true,
      duration: 0.22,
    })
    const root = wrapper.element as HTMLElement

    installItemRects(root)

    await wrapper.setProps({
      order: ['owner', 'project', 'status'],
    })
    await nextTick()
    await nextTick()

    const ownerElement = root.querySelector<HTMLElement>('[data-bing-sortable-key="owner"]')
    const projectElement = root.querySelector<HTMLElement>('[data-bing-sortable-key="project"]')
    const flipCall = fromTo.mock.calls.find(
      ([targets]) =>
        Array.isArray(targets) &&
        targets.includes(ownerElement) &&
        targets.includes(projectElement),
    )

    expect(flipCall).toBeTruthy()

    const fromVars = flipCall?.[1] as { y?: (index: number, target: HTMLElement) => number }
    const toVars = flipCall?.[2]

    expect(fromVars.y?.(0, ownerElement as HTMLElement)).toBe(44)
    expect(fromVars.y?.(0, projectElement as HTMLElement)).toBe(-44)
    expect(toVars).toMatchObject({
      x: 0,
      y: 0,
      duration: 0.22,
      ease: 'power3.out',
      clearProps: 'transform',
    })
  })

  it('reorders with keyboard controls', async () => {
    const wrapper = mountSortable()

    await wrapper.get('.demo-handle').trigger('keydown', {
      key: 'ArrowDown',
    })

    expect(wrapper.emitted('update:order')?.[0]?.[0]).toEqual(['owner', 'project', 'status'])
    expect(wrapper.emitted('reorder')?.[0]?.[0]).toMatchObject({
      key: 'project',
      from: 0,
      to: 1,
      order: ['owner', 'project', 'status'],
    })
  })

  it('marks disabled handles as unavailable', () => {
    const wrapper = mountSortable({
      disabledKeys: ['project'],
    })

    expect(wrapper.get('.demo-handle').attributes('aria-disabled')).toBe('true')
    expect(wrapper.get('.demo-handle').attributes('tabindex')).toBe('-1')
  })

  it('reorders to the end with keyboard controls', async () => {
    const wrapper = mountSortable()

    await wrapper.get('.demo-handle').trigger('keydown', {
      key: 'End',
    })

    expect(wrapper.emitted('update:order')?.[0]?.[0]).toEqual(['owner', 'status', 'project'])
    expect(wrapper.emitted('reorder')?.[0]?.[0]).toMatchObject({
      key: 'project',
      from: 0,
      to: 2,
      order: ['owner', 'status', 'project'],
    })
  })

  it('uses a custom handle aria label', () => {
    const wrapper = mountSortable({
      handleAriaLabel: (item: { label: string }) => `Move ${item.label}`,
    })

    expect(wrapper.get('.demo-handle').attributes('aria-label')).toBe('Move Project')
  })

  it('does not start pointer drag from a disabled item', async () => {
    const wrapper = mountSortable({
      disabledKeys: ['project'],
    })
    const root = wrapper.element as HTMLElement

    installItemRects(root)
    await nextTick()

    dispatchPointer(wrapper.get('.demo-handle').element, 'pointerdown', {
      clientX: 12,
      clientY: 12,
    })
    dispatchPointer(document, 'pointermove', { clientX: 12, clientY: 92 })
    await nextTick()

    expect(wrapper.emitted('drag-start')).toBeUndefined()
    expect(wrapper.emitted('update:order')).toBeUndefined()
  })
})
