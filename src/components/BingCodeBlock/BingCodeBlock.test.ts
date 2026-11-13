import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { highlightCode } from './BingCodeBlock.highlight'
import BingButton from '../BingButton/BingButton.vue'
import BingScrollbar from '../BingScrollbar/BingScrollbar.vue'
import BingCodeBlock from './BingCodeBlock.vue'

vi.mock('./BingCodeBlock.highlight', () => ({
  highlightCode: vi.fn(),
}))

const mockedHighlightCode = vi.mocked(highlightCode)
const originalClipboardDescriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')

enableAutoUnmount(afterEach)

function tokenResult(lines: Array<Array<{ content: string; color?: string; fontStyle?: number }>>) {
  return lines.map((line, index) => ({
    number: index + 1,
    tokens: line,
  })) as Awaited<ReturnType<typeof highlightCode>>
}

function plainTokenResult(code: string) {
  return tokenResult(
    code.split('\n').map((line) => [
      {
        content: line,
      },
    ]),
  )
}

function setClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: {
      writeText,
    },
  })
}

function restoreClipboard() {
  if (originalClipboardDescriptor) {
    Object.defineProperty(navigator, 'clipboard', originalClipboardDescriptor)
    return
  }

  Reflect.deleteProperty(navigator, 'clipboard')
}

beforeEach(() => {
  delete document.documentElement.dataset.bingTheme
  mockedHighlightCode.mockReset()
  mockedHighlightCode.mockResolvedValue(plainTokenResult('const value = 1'))
})

afterEach(() => {
  delete document.documentElement.dataset.bingTheme
  restoreClipboard()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('BingCodeBlock', () => {
  it('enables smooth scrolling by default and allows opting out', async () => {
    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const smooth = true',
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(1)
    })

    expect(wrapper.findComponent(BingScrollbar).props('smooth')).toBe(true)

    await wrapper.setProps({ smoothScroll: false })

    expect(wrapper.findComponent(BingScrollbar).props('smooth')).toBe(false)
  })

  it('renders highlighted code tokens and metadata', async () => {
    mockedHighlightCode.mockResolvedValueOnce(
      tokenResult([
        [
          { content: 'const ', color: '#f472b6' },
          { content: 'count', color: '#7dd3fc', fontStyle: 2 },
        ],
        [{ content: 'return count', color: '#d7dee8' }],
      ]),
    )

    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const count = 1\nreturn count',
        language: 'ts',
        title: 'counter.ts',
        languageLabel: 'TypeScript',
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(2)
    })

    expect(mockedHighlightCode).toHaveBeenCalledWith(
      'const count = 1\nreturn count',
      'ts',
      'vitesse-light',
    )
    expect(wrapper.props('theme')).toBe('auto')
    expect(wrapper.text()).toContain('counter.ts')
    expect(wrapper.text()).toContain('TypeScript')
    expect(wrapper.text()).toContain('const count')
    expect(wrapper.getComponent(BingButton).classes()).toContain('bing-code-block__copy')
    expect(wrapper.get('.bing-code-block__copy').attributes('aria-label')).toBe('复制代码')
    expect(wrapper.get('.bing-code-block__token').attributes('style')).toContain(
      'color: #f472b6',
    )
  })

  it('follows the global Bing UI theme in auto mode without remounting', async () => {
    document.documentElement.dataset.bingTheme = 'dark'

    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const themed = true',
        language: 'ts',
      },
    })

    await vi.waitFor(() => {
      expect(mockedHighlightCode).toHaveBeenLastCalledWith(
        'const themed = true',
        'ts',
        'github-dark',
      )
    })

    document.documentElement.dataset.bingTheme = 'light'

    await vi.waitFor(() => {
      expect(mockedHighlightCode).toHaveBeenLastCalledWith(
        'const themed = true',
        'ts',
        'vitesse-light',
      )
    })

    expect(wrapper.props('theme')).toBe('auto')
  })

  it('follows system color-scheme changes and removes the media listener', async () => {
    let matchesDark = true
    const listeners = new Set<() => void>()
    const addEventListener = vi.fn((_type: string, listener: EventListener) => {
      listeners.add(listener as unknown as () => void)
    })
    const removeEventListener = vi.fn((_type: string, listener: EventListener) => {
      listeners.delete(listener as unknown as () => void)
    })
    const mediaQuery = {
      get matches() {
        return matchesDark
      },
      media: '(prefers-color-scheme: dark)',
      onchange: null,
      addEventListener,
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as unknown as MediaQueryList

    vi.spyOn(window, 'matchMedia').mockReturnValue(mediaQuery)
    document.documentElement.dataset.bingTheme = 'system'

    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const system = true',
        language: 'ts',
      },
    })

    await vi.waitFor(() => {
      expect(mockedHighlightCode).toHaveBeenLastCalledWith(
        'const system = true',
        'ts',
        'github-dark',
      )
    })

    matchesDark = false
    listeners.forEach((listener) => listener())

    await vi.waitFor(() => {
      expect(mockedHighlightCode).toHaveBeenLastCalledWith(
        'const system = true',
        'ts',
        'vitesse-light',
      )
    })

    wrapper.unmount()
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function))
    expect(listeners.size).toBe(0)
  })

  it('keeps an explicit Shiki theme when the global theme changes', async () => {
    document.documentElement.dataset.bingTheme = 'dark'

    mount(BingCodeBlock, {
      props: {
        code: 'const fixed = true',
        language: 'ts',
        theme: 'github-light',
      },
    })

    await vi.waitFor(() => {
      expect(mockedHighlightCode).toHaveBeenLastCalledWith(
        'const fixed = true',
        'ts',
        'github-light',
      )
    })

    const callCount = mockedHighlightCode.mock.calls.length
    document.documentElement.dataset.bingTheme = 'light'
    await flushPromises()

    expect(mockedHighlightCode).toHaveBeenCalledTimes(callCount)
  })

  it('highlights individual lines and inclusive line ranges', async () => {
    const code = 'one\ntwo\nthree\nfour\nfive'

    mockedHighlightCode.mockResolvedValueOnce(plainTokenResult(code))

    const wrapper = mount(BingCodeBlock, {
      props: {
        code,
        highlightLines: [2, [4, 5], 0, [7, 6]],
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(5)
    })

    const highlightedLineNumbers = wrapper
      .findAll('.bing-code-block__line.is-highlighted')
      .map((line) => line.get('.bing-code-block__line-number').text())

    expect(highlightedLineNumbers).toEqual(['2', '4', '5'])
  })

  it('applies configured width to the root element', async () => {
    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const sized = true',
        width: 420,
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(1)
    })

    expect(wrapper.attributes('style')).toContain('width: 420px')

    await wrapper.setProps({
      width: '50%',
    })

    expect(wrapper.attributes('style')).toContain('width: 50%')
  })

  it('wraps the code block with BingResizable when resizable is enabled', async () => {
    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const resizable = true',
        resizable: true,
        resizableOptions: {
          defaultSize: {
            width: 520,
            height: 300,
          },
          minWidth: 360,
          minHeight: 220,
          directions: ['right', 'bottom-right'],
          showSize: true,
        },
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(1)
    })

    expect(wrapper.get('.bing-resizable').attributes('style')).toContain('width: 520px')
    expect(wrapper.get('.bing-resizable').attributes('style')).toContain('height: 300px')
    expect(wrapper.get('.bing-code-block').attributes('style')).toContain('width: 100%')
    expect(wrapper.get('.bing-code-block').attributes('style')).toContain('height: 100%')
    expect(wrapper.findAll('.bing-resizable__handle')).toHaveLength(2)
    expect(wrapper.get('.bing-resizable__size').text()).toBe('520 × 300')
  })

  it('maps shift wheel from the code block chrome to horizontal code scrolling', async () => {
    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const longLine = "This line is deliberately long enough to overflow the viewport"',
        title: 'overflow.ts',
        smoothScroll: false,
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(1)
    })

    const viewport = wrapper.get('.bing-scrollbar__viewport').element as HTMLElement

    Object.defineProperties(viewport, {
      clientWidth: {
        configurable: true,
        value: 240,
      },
      scrollWidth: {
        configurable: true,
        value: 720,
      },
      scrollLeft: {
        configurable: true,
        writable: true,
        value: 0,
      },
    })

    await wrapper.get('.bing-code-block__header').trigger('wheel', {
      deltaY: 96,
      shiftKey: true,
    })
    await wrapper.vm.$nextTick()

    expect(viewport.scrollLeft).toBe(96)
  })

  it('falls back to immediate header scrolling when touchpad input bypasses smoothing', async () => {
    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const touchpadLine = "This line is deliberately long enough to overflow"',
        title: 'touchpad.ts',
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(1)
    })

    const viewport = wrapper.get('.bing-scrollbar__viewport').element as HTMLElement

    Object.defineProperties(viewport, {
      clientWidth: { configurable: true, value: 240 },
      scrollWidth: { configurable: true, value: 720 },
      scrollLeft: { configurable: true, writable: true, value: 0 },
    })

    await wrapper.get('.bing-code-block__header').trigger('wheel', {
      deltaY: 2,
      shiftKey: true,
    })

    expect(viewport.scrollLeft).toBe(2)
  })

  it('copies code with the Clipboard API and resets the copied state', async () => {
    vi.useFakeTimers()

    const writeText = vi.fn().mockResolvedValue(undefined)
    const code = 'const copied = true'

    setClipboard(writeText)
    mockedHighlightCode.mockResolvedValueOnce(plainTokenResult(code))

    const wrapper = mount(BingCodeBlock, {
      props: {
        code,
        language: 'ts',
        copyResetDelay: 900,
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(1)
    })

    await wrapper.get('.bing-code-block__copy').trigger('click')
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith(code)
    expect(wrapper.emitted('copy')?.[0]).toEqual([
      {
        code,
        language: 'ts',
      },
    ])
    expect(wrapper.get('.bing-code-block__copy-label').text()).toBe('已复制')

    vi.advanceTimersByTime(900)
    await wrapper.vm.$nextTick()

    expect(wrapper.get('.bing-code-block__copy-label').text()).toBe('复制代码')
  })

  it('emits copyError when copying fails', async () => {
    const error = new Error('Clipboard denied')
    const writeText = vi.fn().mockRejectedValue(error)

    setClipboard(writeText)

    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'const blocked = true',
        language: 'ts',
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(1)
    })

    await wrapper.get('.bing-code-block__copy').trigger('click')
    await flushPromises()

    expect(wrapper.emitted('copy')).toBeUndefined()
    expect(wrapper.emitted('copyError')?.[0]?.[0]).toBe(error)
  })

  it('falls back to plain text when Shiki highlighting fails', async () => {
    const error = new Error('Unknown language')

    mockedHighlightCode.mockRejectedValueOnce(error)

    const wrapper = mount(BingCodeBlock, {
      props: {
        code: 'alpha\nbeta',
        language: 'not-real',
      },
    })

    await vi.waitFor(() => {
      expect(wrapper.classes()).toContain('is-error')
    })

    expect(wrapper.findAll('.bing-code-block__line')).toHaveLength(2)
    expect(wrapper.text()).toContain('alpha')
    expect(wrapper.text()).toContain('beta')
    expect(wrapper.emitted('highlightError')?.[0]?.[0]).toBe(error)
  })
})
