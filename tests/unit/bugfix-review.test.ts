import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'
import { MultipleSelection, RangeSelection } from '../../src/core/selection'
import { withAlpineMocks } from '../helpers'

// ===========================================================================
// Bug 1: Same-day range values dropped
// ===========================================================================

describe('Bug 1: same-day range', () => {
  it('init preserves same-day range value', () => {
    const c = createCalendarData({
      mode: 'range',
      value: '15/06/2025 – 15/06/2025',
    })
    withAlpineMocks(c)
    c.init()

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-15')
  })

  it('init preserves same-day range with ISO format', () => {
    const c = createCalendarData({
      mode: 'range',
      format: 'YYYY-MM-DD',
      value: '2025-06-15 – 2025-06-15',
    })
    withAlpineMocks(c)
    c.init()

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-15')
  })

  it('handleBlur preserves same-day range from input', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ mode: 'range', mask: false })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    input.value = '15/06/2025 – 15/06/2025'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-15')
    expect(dispatchSpy).toHaveBeenCalledWith(
      'calendar:change',
      expect.objectContaining({ dates: ['2025-06-15', '2025-06-15'] }),
    )
  })

  it('setValue preserves same-day range', () => {
    const c = createCalendarData({ mode: 'range' })
    withAlpineMocks(c)
    c.init()

    c.setValue(['2025-06-15', '2025-06-15'])

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-15')
  })
})

// ===========================================================================
// Bug 2: Month/year picker ignores day-level constraints
// ===========================================================================

describe('Bug 2: deep month/year constraint checks', () => {
  it('month is disabled when all days are disabled by disabledDaysOfWeek', () => {
    // Disable all days of week → every day in every month is disabled
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isMonthDisabled(2025, 6)).toBe(true)
    expect(c._isMonthDisabled(2025, 1)).toBe(true)
  })

  it('month is NOT disabled when some days are selectable despite disabledDaysOfWeek', () => {
    // Only disable weekends — weekdays are still selectable
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 6],
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isMonthDisabled(2025, 6)).toBe(false)
  })

  it('month is disabled when all days are in disabledDates', () => {
    // February 2025 has 28 days — disable them all
    const allFebDates: string[] = []
    for (let d = 1; d <= 28; d++) {
      allFebDates.push(`2025-02-${String(d).padStart(2, '0')}`)
    }

    const c = createCalendarData({
      disabledDates: allFebDates,
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isMonthDisabled(2025, 2)).toBe(true)
  })

  it('month is NOT disabled when enabledDates force-enables a day in an otherwise-disabled month', () => {
    // Disable all days of week, but force-enable one specific date
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      enabledDates: ['2025-06-15'],
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isMonthDisabled(2025, 6)).toBe(false) // has a force-enabled date
    expect(c._isMonthDisabled(2025, 7)).toBe(true) // all days still disabled
  })

  it('year is disabled when all months are fully disabled', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isYearDisabled(2025)).toBe(true)
  })

  it('year is NOT disabled when at least one month has a selectable day', () => {
    // Disable all days of week, but force-enable one date in 2025
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      enabledDates: ['2025-06-15'],
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isYearDisabled(2025)).toBe(false)
    expect(c._isYearDisabled(2024)).toBe(true)
  })

  it('shallow month boundary check still works (minDate/maxDate)', () => {
    const c = createCalendarData({
      minDate: '2025-06-01',
      maxDate: '2025-08-31',
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isMonthDisabled(2025, 5)).toBe(true) // before range
    expect(c._isMonthDisabled(2025, 6)).toBe(false) // in range
    expect(c._isMonthDisabled(2025, 9)).toBe(true) // after range
  })

  it('shallow year boundary check still works', () => {
    const c = createCalendarData({
      minDate: '2025-01-01',
      maxDate: '2025-12-31',
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isYearDisabled(2024)).toBe(true)
    expect(c._isYearDisabled(2025)).toBe(false)
    expect(c._isYearDisabled(2026)).toBe(true)
  })

  it('updateConstraints refreshes deep checks', () => {
    const c = createCalendarData()
    withAlpineMocks(c)
    c.init()

    // Initially no constraints — month should be enabled
    expect(c._isMonthDisabled(2025, 6)).toBe(false)

    // Update to disable all days
    c.updateConstraints({ disabledDaysOfWeek: [0, 1, 2, 3, 4, 5, 6] })
    expect(c._isMonthDisabled(2025, 6)).toBe(true)
  })

  it('metadata unavailability makes month disabled when all days unavailable', () => {
    const c = createCalendarData({
      dateMetadata: (d: CalendarDate) => {
        if (d.month === 3 && d.year === 2025) {
          return { availability: 'unavailable' as const }
        }
        return {}
      },
    })
    withAlpineMocks(c)
    c.init()

    expect(c._isMonthDisabled(2025, 3)).toBe(true)
    expect(c._isMonthDisabled(2025, 4)).toBe(false)
  })
})

describe('Bug 2: wizard year-month guard', () => {
  it('wizard year-month mode selects first selectable day (not always day 1)', () => {
    const c = createCalendarData({
      wizard: 'year-month' as const,
      // Day 1 of June 2025 is a Sunday (day 0) — disable Sundays
      disabledDaysOfWeek: [0],
    })
    withAlpineMocks(c)
    c.init()

    c.year = 2025
    c.selectMonth(6)

    // Should select June 2 (Monday), not June 1 (Sunday)
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-02')
  })

  it('wizard year-month mode does nothing when all days in month disabled', () => {
    const c = createCalendarData({
      wizard: 'year-month' as const,
      disabledDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    })
    withAlpineMocks(c)
    c.init()

    c.year = 2025
    c.selectMonth(6)

    expect(c.selectedDates).toHaveLength(0)
  })
})

// ===========================================================================
// Bug 3: Scrollable popup breaks after teleport
// ===========================================================================

describe('Bug 3: scroll listener with teleported overlay', () => {
  // Mock IntersectionObserver for jsdom
  const originalIO = globalThis.IntersectionObserver
  beforeEach(() => {
    globalThis.IntersectionObserver = class MockIO {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
      constructor(_cb: IntersectionObserverCallback, _opts?: IntersectionObserverInit) {}
    } as unknown as typeof IntersectionObserver
  })

  afterEach(() => {
    if (originalIO) {
      globalThis.IntersectionObserver = originalIO
    } else {
      delete (globalThis as any).IntersectionObserver
    }
  })

  it('_initScrollListener finds container in teleported overlay', () => {
    const c = createCalendarData({
      months: 3,
      scrollable: true,
    })

    // Create a mock overlay element with .rc-months--scroll inside
    const overlay = document.createElement('div')
    overlay.classList.add('rc-popup-overlay')
    const scrollContainer = document.createElement('div')
    scrollContainer.classList.add('rc-months--scroll')
    // Add a month element so the observer has something to observe
    const monthEl = document.createElement('div')
    monthEl.setAttribute('data-month-id', '2025-06')
    scrollContainer.appendChild(monthEl)
    overlay.appendChild(scrollContainer)

    // Simulate teleport: overlay is in document.body, not in $el
    document.body.appendChild(overlay)

    const rootEl = document.createElement('div')
    // Root does NOT contain the overlay (it was teleported away)
    withAlpineMocks(c, { el: rootEl })

    // Set _popupOverlayEl as the teleport would
    ;(c as any)._popupOverlayEl = overlay

    c.init()
    c._initScrollListener()

    // The scroll container should be found via _popupOverlayEl
    expect(c._scrollContainerEl).toBe(scrollContainer)

    // Cleanup
    document.body.removeChild(overlay)
  })

  it('_initScrollListener falls back to $el when no teleport', () => {
    const c = createCalendarData({
      months: 3,
      scrollable: true,
    })

    const rootEl = document.createElement('div')
    const scrollContainer = document.createElement('div')
    scrollContainer.classList.add('rc-months--scroll')
    const monthEl = document.createElement('div')
    monthEl.setAttribute('data-month-id', '2025-06')
    scrollContainer.appendChild(monthEl)
    rootEl.appendChild(scrollContainer)

    withAlpineMocks(c, { el: rootEl })
    c.init()
    c._initScrollListener()

    expect(c._scrollContainerEl).toBe(scrollContainer)
  })
})

// ===========================================================================
// Bug 4: Multiple-selection duplicates cancel out
// ===========================================================================

describe('Bug 4: MultipleSelection.add()', () => {
  it('add() adds a new date', () => {
    const sel = new MultipleSelection()
    sel.add(new CalendarDate(2025, 6, 15))
    expect(sel.count).toBe(1)
    expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
  })

  it('add() is idempotent — duplicate does not remove', () => {
    const sel = new MultipleSelection()
    sel.add(new CalendarDate(2025, 6, 15))
    sel.add(new CalendarDate(2025, 6, 15))
    expect(sel.count).toBe(1)
    expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
  })

  it('add() differs from toggle() on duplicates', () => {
    const selToggle = new MultipleSelection()
    selToggle.toggle(new CalendarDate(2025, 6, 15))
    selToggle.toggle(new CalendarDate(2025, 6, 15))
    expect(selToggle.count).toBe(0) // toggle deselected

    const selAdd = new MultipleSelection()
    selAdd.add(new CalendarDate(2025, 6, 15))
    selAdd.add(new CalendarDate(2025, 6, 15))
    expect(selAdd.count).toBe(1) // add kept it
  })
})

describe('Bug 4: duplicate dates in multiple mode', () => {
  it('init with duplicate dates in value keeps all unique dates', () => {
    const c = createCalendarData({
      mode: 'multiple',
      value: '15/06/2025, 15/06/2025, 20/06/2025',
    })
    withAlpineMocks(c)
    c.init()

    // Should have 2 unique dates, not 0 or 1 from toggle cancellation
    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-20')
  })

  it('handleBlur with duplicate dates keeps all unique dates', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ mode: 'multiple', mask: false })
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    input.value = '15/06/2025, 15/06/2025, 20/06/2025'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-20')
  })

  it('setValue with duplicate CalendarDates keeps all unique dates', () => {
    const c = createCalendarData({ mode: 'multiple' })
    withAlpineMocks(c)
    c.init()

    c.setValue([
      new CalendarDate(2025, 6, 15),
      new CalendarDate(2025, 6, 15),
      new CalendarDate(2025, 6, 20),
    ])

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-20')
  })

  it('setValue with duplicate ISO strings keeps all unique dates', () => {
    const c = createCalendarData({ mode: 'multiple' })
    withAlpineMocks(c)
    c.init()

    c.setValue(['2025-06-15', '2025-06-15', '2025-06-20'])

    expect(c.selectedDates).toHaveLength(2)
  })
})
