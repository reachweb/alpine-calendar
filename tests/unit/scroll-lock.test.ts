import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { withAlpineMocks } from '../helpers'

// The scroll lock is shared module state, so these tests live in their own file
// (vitest isolates modules per file) and destroy every calendar they create.

const html = document.documentElement
const created: ReturnType<typeof createCalendarData>[] = []

function calendar(config: CalendarConfig = {}) {
  const c = createCalendarData({ display: 'popup', ...config })
  withAlpineMocks(c)
  c.init()
  created.push(c)
  return c
}

/** Simulate a page with a classic scrollbar: innerWidth − clientWidth = scrollbarWidth. */
function setScrollbarWidth(scrollbarWidth: number) {
  Object.defineProperty(window, 'innerWidth', { value: 1024, configurable: true, writable: true })
  Object.defineProperty(html, 'clientWidth', { value: 1024 - scrollbarWidth, configurable: true })
}

describe('popup page scroll lock', () => {
  beforeEach(() => {
    setScrollbarWidth(15)
    // Pre-existing inline styles that the lock must restore, not just clear.
    html.style.overflow = 'scroll'
    html.style.paddingRight = '4px'
  })

  afterEach(() => {
    created.splice(0).forEach((c) => c.destroy())
    html.removeAttribute('style')
    delete (html as { clientWidth?: number }).clientWidth
  })

  it('open() hides page overflow and adds the scrollbar gap to the existing padding; close() restores the previous values', () => {
    const c = calendar()

    c.open()
    expect(html.style.overflow).toBe('hidden')
    expect(html.style.paddingRight).toBe('19px') // 4px existing + 15px scrollbar

    // Input focus calls open() again while open; one close() must still unlock.
    c.open()
    c.close()
    expect(html.style.overflow).toBe('scroll')
    expect(html.style.paddingRight).toBe('4px')
  })

  it('adds the scrollbar gap to right padding set by a stylesheet', () => {
    html.style.paddingRight = ''
    const sheet = document.createElement('style')
    sheet.textContent = 'html { padding-right: 20px; }'
    document.head.appendChild(sheet)
    try {
      const c = calendar()
      c.open()
      expect(html.style.paddingRight).toBe('35px')
      c.close()
      expect(html.style.paddingRight).toBe('')
    } finally {
      sheet.remove()
    }
  })

  it('does not add padding when the page has no scrollbar', () => {
    setScrollbarWidth(0)
    const c = calendar()

    c.open()
    expect(html.style.overflow).toBe('hidden')
    expect(html.style.paddingRight).toBe('4px')
  })

  it.each([
    ['first-opened closes first', 0, 1],
    ['last-opened closes first', 1, 0],
  ])('two popups: %s — page stays locked until both close', (_, firstToClose, secondToClose) => {
    const popups = [calendar(), calendar({ mode: 'range', months: 2 })]
    popups[0]!.open()
    popups[1]!.open()

    popups[firstToClose]!.close()
    expect(html.style.overflow).toBe('hidden')
    expect(html.style.paddingRight).toBe('19px')

    popups[secondToClose]!.close()
    expect(html.style.overflow).toBe('scroll')
    expect(html.style.paddingRight).toBe('4px')

    // Nothing leaked: a fresh open/close cycle still locks and unlocks.
    popups[0]!.open()
    expect(html.style.overflow).toBe('hidden')
    popups[0]!.close()
    expect(html.style.overflow).toBe('scroll')
  })

  it('destroy() while open releases only that calendar’s lock', () => {
    const a = calendar()
    a.open()
    a.destroy()
    expect(html.style.overflow).toBe('scroll')
    expect(html.style.paddingRight).toBe('4px')

    // A closed-then-destroyed calendar must not release another popup's lock.
    const b = calendar()
    const c = calendar()
    b.open()
    c.open()
    b.close()
    b.destroy()
    expect(html.style.overflow).toBe('hidden')
    c.destroy()
    expect(html.style.overflow).toBe('scroll')
  })

  it('inline display never touches <html>', () => {
    const c = calendar({ display: 'inline' })

    c.open()
    c.toggle()
    expect(html.style.overflow).toBe('scroll')
    expect(html.style.paddingRight).toBe('4px')
  })

  it('lockScroll: false never touches <html>', () => {
    const c = calendar({ lockScroll: false })

    c.open()
    expect(c.isOpen).toBe(true)
    expect(html.style.overflow).toBe('scroll')
    expect(html.style.paddingRight).toBe('4px')
    c.close()
    expect(html.style.overflow).toBe('scroll')
  })
})
