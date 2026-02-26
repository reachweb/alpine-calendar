import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'

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
 * Create a popup element containing an .rc-calendar child,
 * suitable for _startPositioning() to find.
 */
function createPopupEl(): HTMLElement {
  const overlay = document.createElement('div')
  overlay.classList.add('rc-popup-overlay')

  const calendar = document.createElement('div')
  calendar.classList.add('rc-calendar')
  // Mock getBoundingClientRect for computePosition
  calendar.getBoundingClientRect = () => ({
    x: 0, y: 0, width: 300, height: 280,
    top: 0, right: 300, bottom: 280, left: 0,
    toJSON: () => ({}),
  })
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
// Responsive popup tests
// ---------------------------------------------------------------------------

describe('responsive popup — mobile (< 640px)', () => {
  beforeEach(() => {
    setViewport(375, 667) // iPhone-sized
  })

  it('does NOT use computePosition on mobile', () => {
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

    // On mobile, the calendar inside the popup should NOT have inline position styles
    const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement
    expect(calendarEl.style.position).toBe('')
    expect(calendarEl.style.left).toBe('')
    expect(calendarEl.style.top).toBe('')
  })

  it('does not set up autoUpdate or document click handler on mobile', () => {
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

    expect(c._autoUpdateCleanup).toBeNull()
    expect(c._documentClickHandler).toBeNull()
  })

  it('popupStyle is set for full-screen overlay', () => {
    const c = createCalendarData({ display: 'popup' })
    expect(c.popupStyle).toContain('position:fixed')
    expect(c.popupStyle).toContain('inset:0')
  })
})

describe('responsive popup — desktop (≥ 640px)', () => {
  beforeEach(() => {
    setViewport(1024, 768)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses computePosition to float calendar below input', () => {
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

    const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement
    expect(calendarEl.style.position).toBe('fixed')
    expect(calendarEl.style.left).not.toBe('')
    expect(calendarEl.style.top).not.toBe('')
    expect(calendarEl.style.zIndex).toBe('51')
  })

  it('positions calendar at correct coordinates', () => {
    const popupEl = createPopupEl()
    const inputEl = createInputEl()

    const c = createCalendarData({
      display: 'popup',
      mask: false,
      placement: 'bottom-start',
      popupOffset: 4,
    })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl, input: inputEl },
    })
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()

    const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement
    // Input: top=200, height=40, offset=4 → top = 244
    expect(calendarEl.style.top).toBe('244px')
    // Input: left=100, placement=bottom-start → left = 100
    expect(calendarEl.style.left).toBe('100px')
  })

  it('sets up autoUpdate cleanup function', () => {
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

    expect(c._autoUpdateCleanup).toBeTypeOf('function')
  })

  it('sets up document click handler for outside clicks', () => {
    vi.useFakeTimers()
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

    expect(c._documentClickHandler).toBeTypeOf('function')

    // Advance timers so the deferred addEventListener fires
    vi.advanceTimersByTime(1)

    // Simulate outside click
    const outsideClick = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(outsideClick, 'target', { value: document.body })
    document.dispatchEvent(outsideClick)

    expect(c.isOpen).toBe(false)
  })

  it('does not close on click inside calendar', () => {
    vi.useFakeTimers()
    const popupEl = createPopupEl()
    const inputEl = createInputEl()
    const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl, input: inputEl },
    })
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()
    vi.advanceTimersByTime(1)

    // Simulate click inside calendar
    const insideClick = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(insideClick, 'target', { value: calendarEl })
    document.dispatchEvent(insideClick)

    expect(c.isOpen).toBe(true)
  })

  it('does not close on click on input', () => {
    vi.useFakeTimers()
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
    vi.advanceTimersByTime(1)

    // Simulate click on input
    const inputClick = new MouseEvent('mousedown', { bubbles: true })
    Object.defineProperty(inputClick, 'target', { value: inputEl })
    document.dispatchEvent(inputClick)

    expect(c.isOpen).toBe(true)
  })

  it('close() cleans up autoUpdate and document listener', () => {
    vi.useFakeTimers()
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
    vi.advanceTimersByTime(1)

    expect(c._autoUpdateCleanup).toBeTypeOf('function')
    expect(c._documentClickHandler).toBeTypeOf('function')

    c.close()

    expect(c._autoUpdateCleanup).toBeNull()
    expect(c._documentClickHandler).toBeNull()
  })

  it('close() resets inline styles on calendar element', () => {
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

    const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement
    expect(calendarEl.style.position).toBe('fixed')

    c.close()

    expect(calendarEl.style.position).toBe('')
    expect(calendarEl.style.left).toBe('')
    expect(calendarEl.style.top).toBe('')
    expect(calendarEl.style.zIndex).toBe('')
  })

  it('destroy() cleans up positioning', () => {
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

    expect(c._autoUpdateCleanup).toBeTypeOf('function')

    c.destroy()

    expect(c._autoUpdateCleanup).toBeNull()
    expect(c._documentClickHandler).toBeNull()
    expect(c._popupEl).toBeNull()
  })

  it('respects custom placement config', () => {
    const popupEl = createPopupEl()
    const inputEl = createInputEl()

    const c = createCalendarData({
      display: 'popup',
      mask: false,
      placement: 'bottom-end',
      popupOffset: 8,
    })
    const { flushNextTick } = withAlpineMocks(c, {
      refs: { popup: popupEl, input: inputEl },
    })
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()

    const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement
    // Input: right=300, calendar width=300, placement=bottom-end → left = 300 - 300 = 0
    expect(calendarEl.style.left).toBe('0px')
    // Input: top=200, height=40, offset=8 → top = 248
    expect(calendarEl.style.top).toBe('248px')
  })
})

describe('responsive popup — no popup element', () => {
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

    expect(c._autoUpdateCleanup).toBeNull()
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

    expect(c._autoUpdateCleanup).toBeNull()
  })
})
