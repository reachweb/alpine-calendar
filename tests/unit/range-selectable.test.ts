import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withAlpineMocks(component: ReturnType<typeof createCalendarData>) {
  const dispatchSpy = vi.fn()
  const watchSpy = vi.fn()
  const nextTickCallbacks: (() => void)[] = []

  Object.assign(component, {
    $dispatch: dispatchSpy,
    $watch: watchSpy,
    $refs: {},
    $nextTick: (cb: () => void) => nextTickCallbacks.push(cb),
    $el: document.createElement('div'),
  })

  const flushNextTick = () => {
    while (nextTickCallbacks.length > 0) {
      const cb = nextTickCallbacks.shift()
      cb?.()
    }
  }

  return { dispatchSpy, watchSpy, flushNextTick }
}

function setup(config: Record<string, unknown> = {}) {
  const c = createCalendarData({ mode: 'range', ...config })
  const mocks = withAlpineMocks(c)
  c.init()
  mocks.flushNextTick()
  return { c, ...mocks }
}

// ---------------------------------------------------------------------------
// isDateSelectableForRange
// ---------------------------------------------------------------------------

describe('isDateSelectableForRange', () => {
  // -----------------------------------------------------------------------
  // Non-range modes
  // -----------------------------------------------------------------------

  it('returns false for single mode', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 15))).toBe(false)
  })

  it('returns false for multiple mode', () => {
    const c = createCalendarData({ mode: 'multiple' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 15))).toBe(false)
  })

  // -----------------------------------------------------------------------
  // Disabled dates
  // -----------------------------------------------------------------------

  it('returns false for disabled dates', () => {
    const { c } = setup({
      disabledDates: ['2025-06-15'],
    })

    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 15))).toBe(false)
  })

  it('returns false for dates before minDate', () => {
    const { c } = setup({
      minDate: '2025-06-10',
    })

    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 5))).toBe(false)
  })

  it('returns false for dates after maxDate', () => {
    const { c } = setup({
      maxDate: '2025-06-20',
    })

    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 25))).toBe(false)
  })

  // -----------------------------------------------------------------------
  // No range start selected
  // -----------------------------------------------------------------------

  it('returns true for any non-disabled date when no range start is selected', () => {
    const { c } = setup()

    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 1))).toBe(true)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 15))).toBe(true)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 30))).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Range already complete (next click restarts)
  // -----------------------------------------------------------------------

  it('returns true when range is already complete (next click restarts)', () => {
    const { c } = setup({ minRange: 5 })

    // Select a complete range
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))

    // Any non-disabled date should be selectable (it will restart the range)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 1))).toBe(true)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 30))).toBe(true)
  })

  // -----------------------------------------------------------------------
  // minRange constraint
  // -----------------------------------------------------------------------

  it('returns false when candidate end date is too close for minRange', () => {
    const { c } = setup({ minRange: 5 })

    // Select start
    c.selectDate(new CalendarDate(2025, 6, 10))

    // June 10 to June 12 = 3 days (< 5)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 12))).toBe(false)

    // June 10 to June 13 = 4 days (< 5)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 13))).toBe(false)
  })

  it('returns true when candidate end date meets minRange exactly', () => {
    const { c } = setup({ minRange: 5 })

    c.selectDate(new CalendarDate(2025, 6, 10))

    // June 10 to June 14 = 5 days (== 5)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 14))).toBe(true)
  })

  it('returns true when candidate end date exceeds minRange', () => {
    const { c } = setup({ minRange: 5 })

    c.selectDate(new CalendarDate(2025, 6, 10))

    // June 10 to June 20 = 11 days (> 5)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 20))).toBe(true)
  })

  // -----------------------------------------------------------------------
  // maxRange constraint
  // -----------------------------------------------------------------------

  it('returns false when candidate end date exceeds maxRange', () => {
    const { c } = setup({ maxRange: 7 })

    c.selectDate(new CalendarDate(2025, 6, 10))

    // June 10 to June 20 = 11 days (> 7)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 20))).toBe(false)

    // June 10 to June 17 = 8 days (> 7)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 17))).toBe(false)
  })

  it('returns true when candidate end date meets maxRange exactly', () => {
    const { c } = setup({ maxRange: 7 })

    c.selectDate(new CalendarDate(2025, 6, 10))

    // June 10 to June 16 = 7 days (== 7)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 16))).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Combined minRange + maxRange
  // -----------------------------------------------------------------------

  it('returns true only within minRange..maxRange window', () => {
    const { c } = setup({ minRange: 3, maxRange: 7 })

    c.selectDate(new CalendarDate(2025, 6, 10))

    // Too short: June 10 to June 11 = 2 days (< 3)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 11))).toBe(false)

    // Just right: June 10 to June 12 = 3 days (== 3)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 12))).toBe(true)

    // In range: June 10 to June 15 = 6 days
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 15))).toBe(true)

    // At max: June 10 to June 16 = 7 days (== 7)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 16))).toBe(true)

    // Too long: June 10 to June 17 = 8 days (> 7)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 17))).toBe(false)
  })

  // -----------------------------------------------------------------------
  // Backward selection (end before start)
  // -----------------------------------------------------------------------

  it('handles backward selection (candidate before start)', () => {
    const { c } = setup({ minRange: 3, maxRange: 7 })

    c.selectDate(new CalendarDate(2025, 6, 15))

    // Candidate before start: June 10 to June 15 = 6 days
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 10))).toBe(true)

    // Too close backward: June 14 to June 15 = 2 days (< 3)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 14))).toBe(false)

    // Too far backward: June 5 to June 15 = 11 days (> 7)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 5))).toBe(false)
  })

  // -----------------------------------------------------------------------
  // Clicking start date to deselect
  // -----------------------------------------------------------------------

  it('returns true when clicking the same date as range start (deselect)', () => {
    const { c } = setup({ minRange: 5 })

    c.selectDate(new CalendarDate(2025, 6, 10))

    // Clicking the start date itself — always allowed (deselects)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 10))).toBe(true)
  })

  // -----------------------------------------------------------------------
  // No range constraints
  // -----------------------------------------------------------------------

  it('returns true for all non-disabled dates when no range constraints exist', () => {
    const { c } = setup()

    c.selectDate(new CalendarDate(2025, 6, 10))

    // Any date should be selectable as range end
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 11))).toBe(true)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 1))).toBe(true)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 7, 15))).toBe(true)
  })

  // -----------------------------------------------------------------------
  // Period-specific rules
  // -----------------------------------------------------------------------

  it('respects period-specific minRange rules', () => {
    const { c } = setup({
      minRange: 3,
      rules: [
        {
          from: '2025-06-01',
          to: '2025-06-30',
          minRange: 7,
        },
      ],
    })

    // Start in June (rule: minRange 7)
    c.selectDate(new CalendarDate(2025, 6, 10))

    // June 10 to June 14 = 5 days (< 7 rule)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 14))).toBe(false)

    // June 10 to June 16 = 7 days (== 7 rule)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 16))).toBe(true)
  })

  it('uses global constraints when start date is outside any rule', () => {
    const { c } = setup({
      minRange: 3,
      rules: [
        {
          from: '2025-06-01',
          to: '2025-06-30',
          minRange: 7,
        },
      ],
    })

    // Start in May (global: minRange 3)
    c.selectDate(new CalendarDate(2025, 5, 28))

    // May 28 to May 30 = 3 days (== 3 global)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 5, 30))).toBe(true)

    // May 28 to May 29 = 2 days (< 3 global)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 5, 29))).toBe(false)
  })

  // -----------------------------------------------------------------------
  // Integration with disabled dates
  // -----------------------------------------------------------------------

  it('returns false for disabled date even if range would be valid', () => {
    const { c } = setup({
      disabledDaysOfWeek: [0, 6], // weekends disabled
    })

    c.selectDate(new CalendarDate(2025, 6, 9)) // Monday

    // June 14 is Saturday (disabled) — should return false
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 14))).toBe(false)

    // June 13 is Friday (enabled)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 13))).toBe(true)
  })

  // -----------------------------------------------------------------------
  // After updateConstraints
  // -----------------------------------------------------------------------

  it('reflects updated constraints after updateConstraints()', () => {
    const { c } = setup()

    c.selectDate(new CalendarDate(2025, 6, 10))

    // Initially no range constraints — all selectable
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 11))).toBe(true)

    // Update constraints to require minRange 5
    c.updateConstraints({ minRange: 5 })

    // Now 2 days is too short
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 11))).toBe(false)

    // But 5 days is fine
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 14))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Hover preview constraint feedback (dayClasses rc-day--range-invalid)
// ---------------------------------------------------------------------------

describe('hover preview constraint feedback (dayClasses)', () => {
  function getClasses(c: ReturnType<typeof createCalendarData>, date: CalendarDate) {
    return c.dayClasses({
      date,
      isCurrentMonth: true,
      isToday: false,
      isDisabled: false,
    })
  }

  function getClassesDisabled(c: ReturnType<typeof createCalendarData>, date: CalendarDate) {
    return c.dayClasses({
      date,
      isCurrentMonth: true,
      isToday: false,
      isDisabled: true,
    })
  }

  it('does not set range-invalid when not in range mode', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.hoverDate = new CalendarDate(2025, 6, 15)
    const classes = getClasses(c, new CalendarDate(2025, 6, 15))
    expect(classes['rc-day--range-invalid']).toBe(false)
  })

  it('does not set range-invalid when no hover date is set', () => {
    const { c } = setup({ minRange: 5 })
    c.selectDate(new CalendarDate(2025, 6, 10))

    // No hover — should not mark invalid
    const classes = getClasses(c, new CalendarDate(2025, 6, 11))
    expect(classes['rc-day--range-invalid']).toBe(false)
  })

  it('does not set range-invalid when no range start is selected', () => {
    const { c } = setup({ minRange: 5 })
    c.hoverDate = new CalendarDate(2025, 6, 15)

    const classes = getClasses(c, new CalendarDate(2025, 6, 11))
    expect(classes['rc-day--range-invalid']).toBe(false)
  })

  it('sets range-invalid for dates too close to start (minRange)', () => {
    const { c } = setup({ minRange: 5 })
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.hoverDate = new CalendarDate(2025, 6, 12)

    // June 12 is only 3 days from June 10 — invalid
    const classes = getClasses(c, new CalendarDate(2025, 6, 12))
    expect(classes['rc-day--range-invalid']).toBe(true)
  })

  it('does not set range-invalid for dates meeting minRange', () => {
    const { c } = setup({ minRange: 5 })
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.hoverDate = new CalendarDate(2025, 6, 14)

    // June 14 is exactly 5 days from June 10 — valid
    const classes = getClasses(c, new CalendarDate(2025, 6, 14))
    expect(classes['rc-day--range-invalid']).toBe(false)
  })

  it('sets range-invalid for dates exceeding maxRange', () => {
    const { c } = setup({ maxRange: 7 })
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.hoverDate = new CalendarDate(2025, 6, 20)

    // June 20 is 11 days from June 10 — exceeds maxRange 7
    const classes = getClasses(c, new CalendarDate(2025, 6, 20))
    expect(classes['rc-day--range-invalid']).toBe(true)
  })

  it('does not set range-invalid for disabled cells (they already have their own styling)', () => {
    const { c } = setup({ minRange: 5 })
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.hoverDate = new CalendarDate(2025, 6, 12)

    // isDisabled cells should not also get range-invalid
    const classes = getClassesDisabled(c, new CalendarDate(2025, 6, 12))
    expect(classes['rc-day--range-invalid']).toBe(false)
    expect(classes['rc-day--disabled']).toBe(true)
  })

  it('does not set range-invalid for the selected start date', () => {
    const { c } = setup({ minRange: 5 })
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.hoverDate = new CalendarDate(2025, 6, 12)

    // The start date itself should not be marked invalid
    const classes = getClasses(c, new CalendarDate(2025, 6, 10))
    expect(classes['rc-day--range-invalid']).toBe(false)
  })

  it('does not set range-invalid when range is already complete', () => {
    const { c } = setup({ minRange: 5 })
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))
    c.hoverDate = new CalendarDate(2025, 6, 12)

    // Range is complete — no invalid marking (next click would restart)
    const classes = getClasses(c, new CalendarDate(2025, 6, 12))
    expect(classes['rc-day--range-invalid']).toBe(false)
  })

  it('marks backward dates correctly', () => {
    const { c } = setup({ minRange: 3, maxRange: 7 })
    c.selectDate(new CalendarDate(2025, 6, 15))
    c.hoverDate = new CalendarDate(2025, 6, 5)

    // June 14 is only 2 days before June 15 — invalid (< minRange 3)
    const classes14 = getClasses(c, new CalendarDate(2025, 6, 14))
    expect(classes14['rc-day--range-invalid']).toBe(true)

    // June 12 is 4 days — valid
    const classes12 = getClasses(c, new CalendarDate(2025, 6, 12))
    expect(classes12['rc-day--range-invalid']).toBe(false)

    // June 5 is 11 days — invalid (> maxRange 7)
    const classes5 = getClasses(c, new CalendarDate(2025, 6, 5))
    expect(classes5['rc-day--range-invalid']).toBe(true)
  })
})
