import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true })
}

function withAlpineMocks(
  component: ReturnType<typeof createCalendarData>,
  options?: { refs?: Record<string, HTMLElement>; el?: HTMLElement },
) {
  const dispatchSpy = vi.fn()
  const watchSpy = vi.fn()
  const refs = options?.refs ?? {}
  const nextTickCallbacks: (() => void)[] = []

  Object.assign(component, {
    $dispatch: dispatchSpy,
    $watch: watchSpy,
    $refs: refs,
    $nextTick: (cb: () => void) => nextTickCallbacks.push(cb),
    $el: options?.el ?? document.createElement('div'),
  })

  const flushNextTick = () => {
    while (nextTickCallbacks.length > 0) {
      const cb = nextTickCallbacks.shift()
      cb?.()
    }
  }

  return { dispatchSpy, watchSpy, flushNextTick }
}

/**
 * Create a popup element containing an .rc-calendar child.
 */
function createPopupEl(): HTMLElement {
  const overlay = document.createElement('div')
  overlay.classList.add('rc-popup-overlay')

  const calendar = document.createElement('div')
  calendar.classList.add('rc-calendar')
  overlay.appendChild(calendar)

  return overlay
}

/**
 * Create a mock input element with getBoundingClientRect.
 */
function createInputEl(): HTMLInputElement {
  const input = document.createElement('input')
  input.getBoundingClientRect = () => ({
    x: 100, y: 200, width: 200, height: 40,
    top: 200, right: 300, bottom: 240, left: 100,
    toJSON: () => ({}),
  })
  return input
}

// ---------------------------------------------------------------------------
// Centered modal popup tests
// ---------------------------------------------------------------------------

describe('popup — centered modal (mobile)', () => {
  beforeEach(() => {
    setViewport(375, 667) // iPhone-sized
  })

  it('does NOT apply inline position styles', () => {
    const popupEl = createPopupEl()
    const inputEl = createInputEl()

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl, input: inputEl },
    })
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()

    // CSS handles centering — no inline position styles
    const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement
    expect(calendarEl.style.position).toBe('')
    expect(calendarEl.style.left).toBe('')
    expect(calendarEl.style.top).toBe('')
  })

  it('popupStyle is set for full-screen overlay', () => {
    const c = createCalendarData({ display: 'popup' })
    expect(c.popupStyle).toContain('position:fixed')
    expect(c.popupStyle).toContain('inset:0')
  })
})

describe('popup — centered modal (desktop)', () => {
  beforeEach(() => {
    setViewport(1024, 768)
  })

  it('does NOT apply inline position styles on desktop either', () => {
    const popupEl = createPopupEl()
    const inputEl = createInputEl()

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl, input: inputEl },
    })
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()

    // CSS handles centering — no inline position styles
    const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement
    expect(calendarEl.style.position).toBe('')
    expect(calendarEl.style.left).toBe('')
    expect(calendarEl.style.top).toBe('')
  })

  it('stores popup ref on open', () => {
    const popupEl = createPopupEl()
    const inputEl = createInputEl()

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl, input: inputEl },
    })
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()

    expect(c._popupEl).toBe(popupEl)
  })

  it('clears popup ref on close', () => {
    const popupEl = createPopupEl()
    const inputEl = createInputEl()

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl, input: inputEl },
    })
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()
    expect(c._popupEl).toBe(popupEl)

    c.close()
    expect(c._popupEl).toBeNull()
  })

  it('destroy() cleans up popup ref', () => {
    const popupEl = createPopupEl()
    const inputEl = createInputEl()

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl, input: inputEl },
    })
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()

    c.destroy()

    expect(c._popupEl).toBeNull()
  })
})

describe('popup — no popup element', () => {
  beforeEach(() => {
    setViewport(1024, 768)
  })

  it('handles missing popup ref gracefully', () => {
    const inputEl = createInputEl()

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { input: inputEl },
    })
    c.init()
    flushNextTick()

    // Should not throw
    c.open()
    flushNextTick()

    expect(c._popupEl).toBeNull()
  })

  it('handles missing input element gracefully', () => {
    const popupEl = createPopupEl()

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl },
    })
    c.init()
    flushNextTick()

    // Should not throw
    c.open()
    flushNextTick()

    expect(c._popupEl).toBe(popupEl)
  })
})
