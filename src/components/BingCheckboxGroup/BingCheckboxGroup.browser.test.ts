import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { createApp, h, nextTick, ref } from 'vue'
import type { App } from 'vue'
import BingCheckboxGroup from './BingCheckboxGroup.vue'
import type { BingCheckboxGroupValue } from './BingCheckboxGroup.types'
import '../../theme/index.css'

let app: App | undefined
let host: HTMLElement | undefined
afterEach(() => { app?.unmount(); host?.remove() })

async function mountGroup(dragSelect = true, rangeSelect = true) {
  const selected = ref<BingCheckboxGroupValue[]>([])
  const changes: BingCheckboxGroupValue[][] = []
  host = document.createElement('div')
  host.style.cssText = 'padding: 40px; width: 240px;'
  document.body.appendChild(host)
  app = createApp({ render: () => h(BingCheckboxGroup, {
    modelValue: selected.value, 'onUpdate:modelValue': value => { selected.value = value },
    onChange: value => changes.push([...value]), dragSelect, rangeSelect, direction: 'column',
    options: [0, 1, 2, 3, 4].map(value => ({ value, label: `选项 ${value}`, disabled: value === 2 })),
  }) })
  app.mount(host)
  await nextTick()
  const labels = [...host.querySelectorAll<HTMLElement>('.bing-checkbox')]
  return { selected, changes, labels }
}

function pointer(element: HTMLElement, type: string, pointerType = 'mouse', target: EventTarget = element) {
  const rect = element.getBoundingClientRect()
  target.dispatchEvent(new PointerEvent(type, {
    bubbles: true, cancelable: true, pointerId: 7, pointerType, button: 0,
    clientX: rect.left + 10, clientY: rect.top + rect.height / 2,
  }))
}

describe('BingCheckboxGroup selection gestures', () => {
  it('Shift + click uses the previous pointer anchor and commits once', async () => {
    const fixture = await mountGroup()
    await userEvent.click(fixture.labels[0]!)
    await userEvent.keyboard('{Shift>}')
    await userEvent.click(fixture.labels[4]!)
    await userEvent.keyboard('{/Shift}')
    expect(fixture.selected.value).toEqual([0, 1, 3, 4])
    expect(fixture.changes).toHaveLength(2)
    expect(fixture.labels[2]!.querySelector('input')!.checked).toBe(false)
  })

  it('brushes each visited available item once and commits only on release', async () => {
    const fixture = await mountGroup()
    pointer(fixture.labels[0]!, 'pointerdown')
    for (const index of [1, 2, 3, 1]) {
      pointer(fixture.labels[index]!, 'pointermove', 'mouse', document)
      await nextTick()
    }
    expect(fixture.selected.value).toEqual([0, 1, 3])
    expect(fixture.changes).toHaveLength(0)
    pointer(fixture.labels[1]!, 'pointerup', 'mouse', document)
    fixture.labels[0]!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
    await nextTick()
    expect(fixture.selected.value).toEqual([0, 1, 3])
    expect(fixture.changes).toEqual([[0, 1, 3]])
    expect(host!.querySelector('.is-drag-selecting')).toBeNull()
    // 下一次真实点击不能被上一次手势吞掉。
    await userEvent.click(fixture.labels[4]!)
    expect(fixture.selected.value).toEqual([0, 1, 3, 4])
    expect(fixture.changes).toHaveLength(2)
  })

  it.each(['touch', 'disabled'])('does not brush on %s input', async mode => {
    const fixture = await mountGroup(mode !== 'disabled')
    const type = mode === 'touch' ? 'touch' : 'mouse'
    pointer(fixture.labels[0]!, 'pointerdown', type)
    pointer(fixture.labels[3]!, 'pointermove', type, document)
    pointer(fixture.labels[3]!, 'pointerup', type, document)
    await nextTick()
    expect(fixture.selected.value).toEqual([])
    expect(fixture.changes).toHaveLength(0)
  })

  it('includes options crossed between two fast pointer samples', async () => {
    const fixture = await mountGroup()
    pointer(fixture.labels[0]!, 'pointerdown')
    pointer(fixture.labels[4]!, 'pointermove', 'mouse', document)
    await nextTick()
    expect(fixture.selected.value).toEqual([0, 1, 3, 4])
    pointer(fixture.labels[4]!, 'pointerup', 'mouse', document)
    expect(fixture.changes).toHaveLength(1)
  })
})
