import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'
import { generateCalendarTemplate } from '../../src/plugin/template'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withAlpineMocks(
  component: ReturnType<typeof createCalendarData>,
  options?: { refs?: Record<string, HTMLElement>; el?: HTMLElement },
) {
  const dispatchSpy = vi.fn()
  const watchCallbacks = new Map<string, (() => void)[]>()
  const watchSpy = vi.fn((prop: string, cb: () => void) => {
    if (!watchCallbacks.has(prop)) watchCallbacks.set(prop, [])
    watchCallbacks.get(prop)!.push(cb)
  })
  const nextTickCallbacks: (() => void)[] = []

  Object.assign(component, {
    $dispatch: dispatchSpy,
    $watch: watchSpy,
    $refs: options?.refs ?? {},
    $nextTick: (cb: () => void) => nextTickCallbacks.push(cb),
    $el: options?.el ?? document.createElement('div'),
  })

  const flushNextTick = () => {
    while (nextTickCallbacks.length > 0) {
      const cb = nextTickCallbacks.shift()
      cb?.()
    }
  }

  const triggerWatch = (prop: string) => {
    const cbs = watchCallbacks.get(prop) ?? []
    for (const cb of cbs) cb()
  }

  return { dispatchSpy, watchSpy, flushNextTick, triggerWatch }
}

// ===========================================================================
// Aria-live announcements
// ===========================================================================

describe('Aria-live announcements', () => {
  it('_statusMessage starts empty', () => {
    const c = createCalendarData({})
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    expect(c._statusMessage).toBe('')
  })

  it('_announce() sets _statusMessage after nextTick', () => {
    const c = createCalendarData({})
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c._announce('Hello')
    // Before flush: cleared to '' first
    expect(c._statusMessage).toBe('')
    flushNextTick()
    expect(c._statusMessage).toBe('Hello')
  })

  it('_announce() resets before setting (for repeated announcements)', () => {
    const c = createCalendarData({})
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c._announce('First')
    flushNextTick()
    expect(c._statusMessage).toBe('First')

    c._announce('Second')
    // Immediately after calling _announce, message is cleared
    expect(c._statusMessage).toBe('')
    flushNextTick()
    expect(c._statusMessage).toBe('Second')
  })

  it('prev() in day view announces new month/year', () => {
    // Use value to set initial month to March 2026
    const c = createCalendarData({ value: '2026-03-15' })
    const { flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.prev()
    // Only trigger month watch (year doesn't change when going Mar→Feb)
    triggerWatch('month')
    flushNextTick()

    expect(c._statusMessage).toContain('February')
    expect(c._statusMessage).toContain('2026')
  })

  it('next() in day view announces new month/year', () => {
    const c = createCalendarData({ value: '2026-03-15' })
    const { flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.next()
    triggerWatch('month')
    flushNextTick()

    expect(c._statusMessage).toContain('April')
    expect(c._statusMessage).toContain('2026')
  })

  it('setView("months") announces "Select month, {year}"', () => {
    const c = createCalendarData({ value: '2026-03-15' })
    const { flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setView('months')
    triggerWatch('view')
    flushNextTick()

    expect(c._statusMessage).toBe('Select month, 2026')
  })

  it('setView("years") announces "Select year, {decade}"', () => {
    const c = createCalendarData({ value: '2026-03-15' })
    const { flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setView('years')
    triggerWatch('view')
    flushNextTick()

    // Year 2026: decade is floor(2026/12)*12 = 2016, so "2016 – 2027"
    expect(c._statusMessage).toContain('Select year,')
    expect(c._statusMessage).toContain('2016')
    expect(c._statusMessage).toContain('2027')
  })

  it('returning to day view announces month/year', () => {
    const c = createCalendarData({ value: '2026-06-15' })
    const { flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.view = 'months'
    triggerWatch('view')
    flushNextTick()

    c.view = 'days'
    triggerWatch('view')
    flushNextTick()

    expect(c._statusMessage).toContain('June')
    expect(c._statusMessage).toContain('2026')
  })

  it('single-mode selectDate() announces "{date} selected"', () => {
    const c = createCalendarData({ mode: 'single', value: '2026-03-01' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 12))
    flushNextTick()

    expect(c._statusMessage).toContain('March')
    expect(c._statusMessage).toContain('12')
    expect(c._statusMessage).toContain('2026')
    expect(c._statusMessage).toContain('selected')
  })

  it('multiple-mode select announces count', () => {
    const c = createCalendarData({ mode: 'multiple' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 10))
    flushNextTick()

    expect(c._statusMessage).toContain('selected')
    expect(c._statusMessage).toContain('1 dates selected')
  })

  it('multiple-mode deselect announces deselected + count', () => {
    const c = createCalendarData({ mode: 'multiple' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 10))
    flushNextTick()
    c.selectDate(new CalendarDate(2026, 3, 15))
    flushNextTick()

    // Now deselect
    c.selectDate(new CalendarDate(2026, 3, 10))
    flushNextTick()

    expect(c._statusMessage).toContain('deselected')
    expect(c._statusMessage).toContain('1 dates selected')
  })

  it('range start announces "Range start: {date}. Select end date"', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 10))
    flushNextTick()

    expect(c._statusMessage).toContain('Range start:')
    expect(c._statusMessage).toContain('Select end date')
  })

  it('range complete announces "Range: {start} to {end}"', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 10))
    flushNextTick()
    c.selectDate(new CalendarDate(2026, 3, 15))
    flushNextTick()

    expect(c._statusMessage).toContain('Range:')
    expect(c._statusMessage).toContain('to')
  })

  it('clearSelection() announces "Selection cleared"', () => {
    const c = createCalendarData({ mode: 'single', value: '2026-03-10' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.clearSelection()
    flushNextTick()

    expect(c._statusMessage).toBe('Selection cleared')
  })

  it('dual-month navigation announces both months', () => {
    // months: 2 for dual-month display
    const c = createCalendarData({ months: 2, value: '2026-03-15' })
    const { flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.next()
    triggerWatch('month')
    flushNextTick()

    // Should contain both months separated by en-dash
    expect(c._statusMessage).toContain('\u2013')
  })
})

// ===========================================================================
// Template ARIA attributes
// ===========================================================================

describe('Template ARIA attributes', () => {
  it('contains aria-live="polite" region with role="status"', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(html).toContain('aria-live="polite"')
    expect(html).toContain('role="status"')
  })

  it('live region has rc-sr-only class', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(html).toContain('class="rc-sr-only"')
    expect(html).toContain('x-text="_statusMessage"')
  })

  it('popup input has :aria-label, aria-haspopup="dialog", :aria-expanded', () => {
    const html = generateCalendarTemplate({
      display: 'popup',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(html).toContain(':aria-label="inputAriaLabel"')
    expect(html).toContain('aria-haspopup="dialog"')
    expect(html).toContain(':aria-expanded="isOpen"')
  })

  it('popup wrapper has role="dialog" and aria-modal="true"', () => {
    const html = generateCalendarTemplate({
      display: 'popup',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(html).toContain('role="dialog"')
    expect(html).toContain('aria-modal="true"')
    expect(html).toContain(':aria-label="popupAriaLabel"')
  })

  it('close SVG has aria-hidden="true"', () => {
    const html = generateCalendarTemplate({
      display: 'popup',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(html).toContain('aria-hidden="true"')
  })

  it('header labels are <button> elements in day view', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    // Day view header label should be a button
    expect(html).toContain('<button class="rc-header__label" @click="setView(\'months\')"')
    // Should not have <span> with @click="setView('months')"
    expect(html).not.toContain('<span class="rc-header__label" @click="setView(\'months\')"')
  })

  it('header labels are <button> elements in month view', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    // Month view header label should be a button
    expect(html).toContain('<button class="rc-header__label" @click="setView(\'years\')"')
    expect(html).not.toContain('<span class="rc-header__label" @click="setView(\'years\')"')
  })

  it('year view header label is a <span> (not clickable)', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    // Year view header is a span with x-text="decadeLabel" and no @click
    expect(html).toContain('<span class="rc-header__label" x-text="decadeLabel">')
  })

  it('calendar root has role="application" and aria-label', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(html).toContain('role="application"')
    expect(html).toContain('aria-label="Calendar"')
  })
})

// ===========================================================================
// Input and popup accessibility getters
// ===========================================================================

describe('Input and popup accessibility', () => {
  it('inputAriaLabel returns "Select date" for single mode', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    expect(c.inputAriaLabel).toBe('Select date')
  })

  it('inputAriaLabel returns "Select date range" for range mode', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    expect(c.inputAriaLabel).toBe('Select date range')
  })

  it('inputAriaLabel returns "Select dates" for multiple mode', () => {
    const c = createCalendarData({ mode: 'multiple' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    expect(c.inputAriaLabel).toBe('Select dates')
  })

  it('inputAriaLabel returns "Select birth date" for wizard mode', () => {
    const c = createCalendarData({ wizard: 'full' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    expect(c.inputAriaLabel).toBe('Select birth date')
  })

  it('popupAriaLabel returns "Date picker" for single mode', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    expect(c.popupAriaLabel).toBe('Date picker')
  })

  it('popupAriaLabel returns "Date range picker" for range mode', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    expect(c.popupAriaLabel).toBe('Date range picker')
  })

  it('popupAriaLabel returns "Birth date wizard" for wizard mode', () => {
    const c = createCalendarData({ wizard: 'full' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    expect(c.popupAriaLabel).toBe('Birth date wizard')
  })
})

// ===========================================================================
// Focus management
// ===========================================================================

describe('Focus management', () => {
  it('focusedDateISO produces correct ID for aria-activedescendant', () => {
    const c = createCalendarData({})
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.focusedDate = new CalendarDate(2026, 3, 15)
    expect(c.focusedDateISO).toBe('2026-03-15')
  })

  it('focusedDateISO is empty when no date is focused', () => {
    const c = createCalendarData({})
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.focusedDateISO).toBe('')
  })

  it('Escape returns focus to input via handleKeydown', () => {
    const inputEl = document.createElement('input')
    inputEl.focus = vi.fn()
    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick } = withAlpineMocks(c, { refs: { input: inputEl } })
    c.init()
    flushNextTick()

    // Open the popup first
    c.open()
    flushNextTick()
    expect(c.isOpen).toBe(true)

    // Simulate Escape keydown (this is how the real code focuses the input)
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    c.handleKeydown(event)
    flushNextTick()

    expect(c.isOpen).toBe(false)
    expect(inputEl.focus).toHaveBeenCalled()
  })

  it('keyboard navigation does not trap Tab key', () => {
    const c = createCalendarData({})
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // Tab key should not be intercepted by handleKeydown
    const event = new KeyboardEvent('keydown', { key: 'Tab' })
    const preventSpy = vi.spyOn(event, 'preventDefault')
    c.handleKeydown(event)
    expect(preventSpy).not.toHaveBeenCalled()
  })

  it('aria-atomic="true" on live region ensures full text is read', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(html).toContain('aria-atomic="true"')
  })
})

// ===========================================================================
// CSS regression guards
// ===========================================================================

describe('CSS regression guards', () => {
  const cssPath = resolve(__dirname, '../../styles/calendar.css')
  const css = readFileSync(cssPath, 'utf-8')

  it('disabled text uses --color-gray-500 for sufficient contrast', () => {
    expect(css).toContain('--color-calendar-disabled: var(--color-gray-500)')
  })

  it('other-month text uses --color-gray-500 for sufficient contrast', () => {
    expect(css).toContain('--color-calendar-other-month: var(--color-gray-500)')
  })

  it('contains .rc-sr-only class definition', () => {
    expect(css).toContain('.rc-sr-only')
    expect(css).toContain('clip: rect(0, 0, 0, 0)')
  })

  it('contains :focus-visible styles for nav buttons', () => {
    expect(css).toContain('.rc-header__nav:focus-visible')
    expect(css).toContain('outline: 2px solid var(--color-calendar-focus-ring)')
  })

  it('contains button.rc-header__label reset styles', () => {
    expect(css).toContain('button.rc-header__label')
  })
})
