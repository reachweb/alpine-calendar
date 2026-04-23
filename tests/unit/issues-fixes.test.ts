import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { withAlpineMocks } from '../helpers'
import { CalendarDate } from '../../src/core/calendar-date'
import { createDateConstraint, createDisabledReasons } from '../../src/core/constraints'

// ---------------------------------------------------------------------------
// BUG-1: closeOnSelect defaults to false for multiple mode
// ---------------------------------------------------------------------------
describe('BUG-1: closeOnSelect in multiple mode', () => {
  it('does not close popup after selecting a date in multiple mode (default)', () => {
    const c = createCalendarData({ mode: 'multiple', display: 'popup' })
    withAlpineMocks(c)
    c.init()
    c.open()
    expect(c.isOpen).toBe(true)
    c.selectDate('2026-03-10')
    expect(c.isOpen).toBe(true) // should stay open
    c.selectDate('2026-03-11')
    expect(c.isOpen).toBe(true) // still open after second selection
  })

  it('closes popup when closeOnSelect is explicitly true in multiple mode', () => {
    const c = createCalendarData({ mode: 'multiple', display: 'popup', closeOnSelect: true })
    withAlpineMocks(c)
    c.init()
    c.open()
    c.selectDate('2026-03-10')
    expect(c.isOpen).toBe(false)
  })

  it('still closes popup after selection in single mode (default)', () => {
    const c = createCalendarData({ mode: 'single', display: 'popup' })
    withAlpineMocks(c)
    c.init()
    c.open()
    c.selectDate('2026-03-10')
    expect(c.isOpen).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// BUG-2: collectReasons early return after enabledDays
// ---------------------------------------------------------------------------
describe('BUG-2: collectReasons divergence fix', () => {
  it('returns only enabledDays reason when day-of-week fails', () => {
    const getReasons = createDisabledReasons({
      enabledDaysOfWeek: [1, 2, 3, 4, 5], // weekdays only
      disabledDates: [new CalendarDate(2026, 3, 14)], // Saturday March 14
      disabledDaysOfWeek: [6], // also disable Saturdays
    })
    // March 14, 2026 is a Saturday
    const reasons = getReasons(new CalendarDate(2026, 3, 14))
    // Should only have the enabledDays reason, not accumulate disabledDates/disabledDays
    expect(reasons).toHaveLength(1)
    expect(reasons[0]).toContain('day of the week')
  })
})

// ---------------------------------------------------------------------------
// BUG-3: handleBlur in multiple mode — set comparison
// ---------------------------------------------------------------------------
describe('BUG-3: handleBlur multiple mode', () => {
  it('does not fire change when parsed dates match current selection', () => {
    const c = createCalendarData({ mode: 'multiple', format: 'YYYY-MM-DD' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2026-03-10')
    c.selectDate('2026-03-11')
    expect(c.selectedDates).toHaveLength(2)
    dispatchSpy.mockClear()

    // Simulate blur with same dates in input
    c.inputValue = '2026-03-10, 2026-03-11'
    c.handleBlur()
    // No change event should fire since dates are the same
    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: [string, unknown]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// BUG: handleBlur re-emits calendar:change with identical selection
// (single and range modes)
// ---------------------------------------------------------------------------
describe('handleBlur does not re-emit calendar:change for identical selection', () => {
  it('single mode: no change event when parsed date matches current selection', () => {
    const c = createCalendarData({ mode: 'single', format: 'YYYY-MM-DD' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2026-03-10')
    expect(c.selectedDates).toHaveLength(1)
    dispatchSpy.mockClear()

    c.inputValue = '2026-03-10'
    c.handleBlur()
    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: [string, unknown]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(0)
  })

  it('range mode: no change event when parsed range matches current selection', () => {
    const c = createCalendarData({ mode: 'range', format: 'YYYY-MM-DD' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2026-03-10')
    c.selectDate('2026-03-17')
    expect(c.selectedDates).toHaveLength(2)
    dispatchSpy.mockClear()

    // Blur re-parses the input text produced by the committed selection.
    // With closeOnSelect + auto-completed range this is what fires after the
    // popup closes — it should be a no-op, not a duplicate emit.
    c.inputValue = c.formattedValue
    c.handleBlur()
    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: [string, unknown]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(0)
  })

  it('single mode: still emits when parsed date differs from current selection', () => {
    const c = createCalendarData({ mode: 'single', format: 'YYYY-MM-DD' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2026-03-10')
    dispatchSpy.mockClear()

    c.inputValue = '2026-03-11'
    c.handleBlur()
    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: [string, unknown]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(1)
  })

  it('range mode: still emits when parsed range differs from current selection', () => {
    const c = createCalendarData({ mode: 'range', format: 'YYYY-MM-DD' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2026-03-10')
    c.selectDate('2026-03-17')
    dispatchSpy.mockClear()

    c.inputValue = '2026-03-10 – 2026-03-18'
    c.handleBlur()
    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: [string, unknown]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// BUG-4: Half-open range rules
// ---------------------------------------------------------------------------
describe('BUG-4: half-open range rules', () => {
  it('supports from-only rule (open-ended future)', () => {
    const isDisabled = createDateConstraint({
      rules: [
        {
          from: new CalendarDate(2026, 6, 1),
          disabledDaysOfWeek: [0, 6],
        },
      ],
    })
    // Before rule range — no constraint
    expect(isDisabled(new CalendarDate(2026, 5, 30))).toBe(false) // Saturday before
    // Within rule range — weekend disabled
    expect(isDisabled(new CalendarDate(2026, 6, 6))).toBe(true) // Saturday after June 1
    expect(isDisabled(new CalendarDate(2026, 6, 5))).toBe(false) // Friday after June 1
  })

  it('supports to-only rule (open-ended past)', () => {
    const isDisabled = createDateConstraint({
      rules: [
        {
          to: new CalendarDate(2026, 6, 30),
          disabledDaysOfWeek: [0, 6],
        },
      ],
    })
    // Within rule range — weekend disabled
    expect(isDisabled(new CalendarDate(2026, 6, 6))).toBe(true) // Saturday
    expect(isDisabled(new CalendarDate(2026, 6, 5))).toBe(false) // Friday
    // After rule range — no constraint
    expect(isDisabled(new CalendarDate(2026, 7, 4))).toBe(false) // Saturday after
  })
})

// ---------------------------------------------------------------------------
// BUG-6: _moveFocusByMonths skips disabled dates
// ---------------------------------------------------------------------------
describe('BUG-6: _moveFocusByMonths disabled date skipping', () => {
  it('skips disabled dates when moving by months', () => {
    const c = createCalendarData({
      defaultDate: '2026-03-15',
      disabledDates: ['2026-04-15'],
    })
    withAlpineMocks(c)
    c.init()
    c.focusedDate = new CalendarDate(2026, 3, 15)
    c._moveFocusByMonths(1) // Would land on April 15 (disabled)
    // Should skip to April 16
    expect(c.focusedDate).not.toBeNull()
    expect((c.focusedDate as CalendarDate).toISO()).toBe('2026-04-16')
  })

  it('skips past fully disabled month to next available date', () => {
    // Disable every day in April 2026
    const disabledDates: string[] = []
    for (let d = 1; d <= 30; d++) {
      disabledDates.push(`2026-04-${String(d).padStart(2, '0')}`)
    }
    const c = createCalendarData({
      defaultDate: '2026-03-15',
      disabledDates,
    })
    withAlpineMocks(c)
    c.init()
    c.focusedDate = new CalendarDate(2026, 3, 15)
    c._moveFocusByMonths(1) // All April dates disabled → skips to May 1
    expect((c.focusedDate as CalendarDate).toISO()).toBe('2026-05-01')
  })
})

// ---------------------------------------------------------------------------
// PERF-1: weekdayHeaders caching
// ---------------------------------------------------------------------------
describe('PERF-1: weekdayHeaders caching', () => {
  it('returns the same array reference on repeated access', () => {
    const c = createCalendarData({})
    withAlpineMocks(c)
    c.init()
    const first = c.weekdayHeaders
    const second = c.weekdayHeaders
    expect(first).toBe(second) // same reference
    expect(first).toHaveLength(7)
  })
})

// ---------------------------------------------------------------------------
// PERF-2: metadata cache reduces lookups
// ---------------------------------------------------------------------------
describe('PERF-2: metadata cache', () => {
  it('calls metadata provider once per date per render cycle', () => {
    const provider = vi.fn((d: CalendarDate) => (d.day === 10 ? { label: 'Test' } : undefined))
    const c = createCalendarData({
      dateMetadata: provider,
      defaultDate: '2026-03-01',
    })
    withAlpineMocks(c)
    c.init()
    provider.mockClear()

    // Access metadata for same cell via multiple methods
    const cell = { date: new CalendarDate(2026, 3, 10), isDisabled: false, isToday: false }
    c.dayClasses(cell)
    c.dayTitle(cell)
    c.dayMeta(cell)
    c.dayStyle(cell)

    // Provider should only be called once due to caching
    const calls = provider.mock.calls.filter(
      (call: [CalendarDate]) => call[0].toISO() === '2026-03-10',
    )
    expect(calls).toHaveLength(1)
  })
})
