import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { withAlpineMocks } from '../helpers'

// The scroll lock is shared module state, so these tests live in their own file
// (vitest isolates modules per file) and destroy every calendar they create.
//
// Not covered here: restoring a lone inline `overflow-x` or `overflow-y`. jsdom
// doesn't expand the `overflow` shorthand, so a test for it would pass with or
// without the per-axis restore. That behaviour is only checked in a real browser.

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
    document.body.removeAttribute('style')
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
    // No existing padding: writing "existing + 0px" must not pass for "wrote nothing".
    html.style.paddingRight = ''
    const c = calendar()

    c.open()
    expect(html.style.overflow).toBe('hidden')
    expect(html.style.paddingRight).toBe('')
  })

  it('does not add padding when the page keeps its scrollbar gutter', () => {
    html.style.paddingRight = ''
    const sheet = document.createElement('style')
    sheet.textContent = 'html { scrollbar-gutter: stable; }'
    document.head.appendChild(sheet)
    try {
      const c = calendar()
      c.open()
      expect(html.style.overflow).toBe('hidden')
      expect(html.style.paddingRight).toBe('')
    } finally {
      sheet.remove()
    }
  })

  it('setting isOpen = false directly releases the lock', () => {
    const c = createCalendarData({ display: 'popup' })
    const { triggerWatch } = withAlpineMocks(c)
    c.init()
    created.push(c)

    c.open()
    c.isOpen = false
    triggerWatch('isOpen')
    expect(html.style.overflow).toBe('scroll')
    expect(html.style.paddingRight).toBe('4px')
  })

  it('closes the popup and releases the lock when its root leaves the document without destroy()', async () => {
    // Alpine only runs destroy() for removed nodes it initialised, so removing a
    // plain ancestor (or swapping the whole <body>) never reaches the component.
    const ancestor = document.createElement('div')
    const root = document.createElement('div')
    ancestor.appendChild(root)
    document.body.appendChild(ancestor)
    const c = createCalendarData({ display: 'popup' })
    withAlpineMocks(c, { el: root })
    c.init()
    created.push(c)

    c.open()
    ancestor.remove()
    await new Promise((resolve) => setTimeout(resolve))
    expect(c.isOpen).toBe(false)
    expect(html.style.overflow).toBe('scroll')
    expect(html.style.paddingRight).toBe('4px')
  })

  it('close() does not write its saved values over another scroll lock that was released first', () => {
    // A modal around the calendar locks <html> the same way (as Alpine's
    // x-trap.noscroll does), which hides the scrollbar before the popup opens.
    html.style.overflow = 'hidden'
    html.style.paddingRight = '15px'
    setScrollbarWidth(0)
    const c = calendar()
    c.open()

    // The modal closes first and restores the page; the popup closes after it.
    html.style.overflow = ''
    html.style.paddingRight = ''
    c.close()
    expect(html.style.overflow).toBe('')
    expect(html.style.paddingRight).toBe('')
  })

  it('locks <body> instead when <html> has no overflow of its own', () => {
    // Hiding <html>'s overflow here would turn <body> into a scroll container
    // and move sticky headers off-screen.
    html.style.overflow = ''
    document.body.style.overflowX = 'hidden'
    const c = calendar()

    c.open()
    expect(html.style.overflow).toBe('')
    expect(document.body.style.overflow).toBe('hidden')
    expect(html.style.paddingRight).toBe('19px') // the scrollbar gap still goes on <html>

    c.close()
    expect(document.body.style.overflow).toBe('')
    expect(document.body.style.overflowX).toBe('hidden')
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
