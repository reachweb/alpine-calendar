import { describe, it, expect } from 'vitest'
import { CalendarDate } from '../../src/core/calendar-date'
import { createDateConstraint, createDisabledReasons } from '../../src/core/constraints'
import { createCalendarData } from '../../src/plugin/calendar-component'

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function flushNextTick() {
  // no-op in sync tests — $nextTick is mocked as sync
}

function withAlpineMocks(c: ReturnType<typeof createCalendarData>) {
  const dispatched: Array<{ event: string; detail?: Record<string, unknown> }> = []
  const obj = c as Record<string, unknown>
  obj.$dispatch = (event: string, detail?: Record<string, unknown>) => {
    dispatched.push({ event, detail })
  }
  obj.$watch = () => {}
  obj.$refs = {}
  obj.$nextTick = (cb: () => void) => cb()
  obj.$el = document.createElement('div')
  return { dispatched }
}

// ---------------------------------------------------------------------------
// Core: createDisabledReasons
// ---------------------------------------------------------------------------

describe('createDisabledReasons', () => {
  describe('no constraints', () => {
    it('returns empty array for any date', () => {
      const reasons = createDisabledReasons({})
      expect(reasons(new CalendarDate(2025, 6, 15))).toEqual([])
    })
  })

  describe('minDate', () => {
    it('returns reason for dates before minDate', () => {
      const reasons = createDisabledReasons({
        minDate: new CalendarDate(2025, 3, 1),
      })
      expect(reasons(new CalendarDate(2025, 2, 28))).toEqual([
        'Before the earliest available date',
      ])
    })

    it('returns empty for dates on or after minDate', () => {
      const reasons = createDisabledReasons({
        minDate: new CalendarDate(2025, 3, 1),
      })
      expect(reasons(new CalendarDate(2025, 3, 1))).toEqual([])
      expect(reasons(new CalendarDate(2025, 3, 2))).toEqual([])
    })
  })

  describe('maxDate', () => {
    it('returns reason for dates after maxDate', () => {
      const reasons = createDisabledReasons({
        maxDate: new CalendarDate(2025, 12, 31),
      })
      expect(reasons(new CalendarDate(2026, 1, 1))).toEqual([
        'After the latest available date',
      ])
    })

    it('returns empty for dates on or before maxDate', () => {
      const reasons = createDisabledReasons({
        maxDate: new CalendarDate(2025, 12, 31),
      })
      expect(reasons(new CalendarDate(2025, 12, 31))).toEqual([])
    })
  })

  describe('disabledDates', () => {
    it('returns reason for specific disabled dates', () => {
      const reasons = createDisabledReasons({
        disabledDates: [new CalendarDate(2025, 7, 4)],
      })
      expect(reasons(new CalendarDate(2025, 7, 4))).toEqual([
        'This date is not available',
      ])
      expect(reasons(new CalendarDate(2025, 7, 5))).toEqual([])
    })
  })

  describe('disabledDaysOfWeek', () => {
    it('returns reason for disabled days of week', () => {
      const reasons = createDisabledReasons({
        disabledDaysOfWeek: [0, 6], // Sun, Sat
      })
      // 2025-06-07 is Saturday
      expect(reasons(new CalendarDate(2025, 6, 7))).toEqual([
        'This day of the week is not available',
      ])
      // 2025-06-09 is Monday
      expect(reasons(new CalendarDate(2025, 6, 9))).toEqual([])
    })
  })

  describe('enabledDates override', () => {
    it('returns empty for force-enabled dates even if day-of-week disabled', () => {
      const reasons = createDisabledReasons({
        disabledDaysOfWeek: [0, 6],
        enabledDates: [new CalendarDate(2025, 6, 7)], // Saturday but force-enabled
      })
      expect(reasons(new CalendarDate(2025, 6, 7))).toEqual([])
    })
  })

  describe('enabledDaysOfWeek', () => {
    it('returns reason for days not in whitelist', () => {
      const reasons = createDisabledReasons({
        enabledDaysOfWeek: [1, 2, 3, 4, 5], // weekdays only
      })
      // 2025-06-07 is Saturday
      expect(reasons(new CalendarDate(2025, 6, 7))).toEqual([
        'This day of the week is not available',
      ])
      // 2025-06-09 is Monday
      expect(reasons(new CalendarDate(2025, 6, 9))).toEqual([])
    })
  })

  describe('disabledMonths', () => {
    it('returns reason for disabled months', () => {
      const reasons = createDisabledReasons({
        disabledMonths: [1, 2],
      })
      expect(reasons(new CalendarDate(2025, 1, 15))).toEqual([
        'This month is not available',
      ])
      expect(reasons(new CalendarDate(2025, 3, 15))).toEqual([])
    })
  })

  describe('enabledMonths', () => {
    it('returns reason for months not in whitelist', () => {
      const reasons = createDisabledReasons({
        enabledMonths: [6, 7, 8],
      })
      expect(reasons(new CalendarDate(2025, 1, 15))).toEqual([
        'This month is not available',
      ])
      expect(reasons(new CalendarDate(2025, 6, 15))).toEqual([])
    })
  })

  describe('disabledYears', () => {
    it('returns reason for disabled years', () => {
      const reasons = createDisabledReasons({
        disabledYears: [2020],
      })
      expect(reasons(new CalendarDate(2020, 6, 15))).toEqual([
        'This year is not available',
      ])
      expect(reasons(new CalendarDate(2025, 6, 15))).toEqual([])
    })
  })

  describe('enabledYears', () => {
    it('returns reason for years not in whitelist', () => {
      const reasons = createDisabledReasons({
        enabledYears: [2025, 2026],
      })
      expect(reasons(new CalendarDate(2024, 6, 15))).toEqual([
        'This year is not available',
      ])
      expect(reasons(new CalendarDate(2025, 6, 15))).toEqual([])
    })
  })

  describe('custom messages', () => {
    it('uses custom messages when provided', () => {
      const reasons = createDisabledReasons(
        { disabledDaysOfWeek: [0, 6] },
        { disabledDayOfWeek: 'Weekends are not available' },
      )
      expect(reasons(new CalendarDate(2025, 6, 7))).toEqual([
        'Weekends are not available',
      ])
    })

    it('uses custom minDate message', () => {
      const reasons = createDisabledReasons(
        { minDate: new CalendarDate(2025, 3, 1) },
        { beforeMinDate: 'Too early — bookings start in March' },
      )
      expect(reasons(new CalendarDate(2025, 2, 15))).toEqual([
        'Too early — bookings start in March',
      ])
    })

    it('uses custom maxDate message', () => {
      const reasons = createDisabledReasons(
        { maxDate: new CalendarDate(2025, 12, 31) },
        { afterMaxDate: 'Bookings only available for 2025' },
      )
      expect(reasons(new CalendarDate(2026, 1, 1))).toEqual([
        'Bookings only available for 2025',
      ])
    })

    it('partial custom messages fall back to defaults for unset keys', () => {
      const reasons = createDisabledReasons(
        {
          disabledDaysOfWeek: [0, 6],
          minDate: new CalendarDate(2025, 1, 1),
        },
        { disabledDayOfWeek: 'No weekends' },
      )
      // Custom message for day-of-week
      expect(reasons(new CalendarDate(2025, 6, 7))).toEqual(['No weekends'])
      // Default message for minDate
      expect(reasons(new CalendarDate(2024, 12, 31))).toEqual([
        'Before the earliest available date',
      ])
    })
  })

  describe('with period rules', () => {
    it('returns reasons using rule constraints for dates in a rule period', () => {
      const reasons = createDisabledReasons({
        rules: [{
          from: new CalendarDate(2025, 6, 1),
          to: new CalendarDate(2025, 8, 31),
          disabledDaysOfWeek: [0, 6],
        }],
      })
      // Saturday in summer → rule applies
      expect(reasons(new CalendarDate(2025, 6, 7))).toEqual([
        'This day of the week is not available',
      ])
      // Saturday outside rule → global (no constraint)
      expect(reasons(new CalendarDate(2025, 5, 3))).toEqual([])
    })

    it('returns reasons using recurring months rule', () => {
      const reasons = createDisabledReasons({
        rules: [{
          months: [12],
          disabledDaysOfWeek: [0, 6],
        }],
      })
      // Saturday in December
      expect(reasons(new CalendarDate(2025, 12, 6))).toEqual([
        'This day of the week is not available',
      ])
      // Saturday in November (no rule)
      expect(reasons(new CalendarDate(2025, 11, 1))).toEqual([])
    })

    it('rule minDate override produces correct reason', () => {
      const reasons = createDisabledReasons({
        minDate: new CalendarDate(2025, 1, 1),
        rules: [{
          months: [6, 7, 8],
          minDate: new CalendarDate(2025, 6, 15),
        }],
      })
      // June 1 in rule → rule minDate = June 15
      expect(reasons(new CalendarDate(2025, 6, 1))).toEqual([
        'Before the earliest available date',
      ])
      // December 2024 outside rule → global minDate
      expect(reasons(new CalendarDate(2024, 12, 31))).toEqual([
        'Before the earliest available date',
      ])
    })
  })

  describe('consistency with createDateConstraint', () => {
    it('reasons are non-empty if and only if date is disabled', () => {
      const opts = {
        minDate: new CalendarDate(2025, 1, 1),
        maxDate: new CalendarDate(2025, 12, 31),
        disabledDaysOfWeek: [0, 6],
        disabledDates: [new CalendarDate(2025, 7, 4)],
        enabledDates: [new CalendarDate(2025, 7, 5)], // Saturday but enabled
      }
      const isDisabled = createDateConstraint(opts)
      const reasons = createDisabledReasons(opts)

      const testDates = [
        new CalendarDate(2024, 12, 31), // before min
        new CalendarDate(2025, 1, 1),   // on min
        new CalendarDate(2025, 3, 3),   // Monday
        new CalendarDate(2025, 3, 1),   // Saturday
        new CalendarDate(2025, 7, 4),   // disabled date (Friday)
        new CalendarDate(2025, 7, 5),   // enabled date (Saturday but force-enabled)
        new CalendarDate(2026, 1, 1),   // after max
      ]

      for (const d of testDates) {
        const disabled = isDisabled(d)
        const r = reasons(d)
        expect(r.length > 0).toBe(disabled)
      }
    })
  })
})

// ---------------------------------------------------------------------------
// Component: getDisabledReason / dayTitle
// ---------------------------------------------------------------------------

describe('component getDisabledReason', () => {
  it('returns reasons for disabled dates', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 6],
    })
    withAlpineMocks(c)
    c.init()
    // Saturday
    const r = c.getDisabledReason('2025-06-07')
    expect(r).toEqual(['This day of the week is not available'])
  })

  it('returns empty array for enabled dates', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 6],
    })
    withAlpineMocks(c)
    c.init()
    // Monday
    expect(c.getDisabledReason('2025-06-09')).toEqual([])
  })

  it('accepts CalendarDate objects', () => {
    const c = createCalendarData({
      minDate: '2025-03-01',
    })
    withAlpineMocks(c)
    c.init()
    expect(c.getDisabledReason(new CalendarDate(2025, 2, 28))).toEqual([
      'Before the earliest available date',
    ])
  })

  it('returns empty array for invalid ISO string', () => {
    const c = createCalendarData({})
    withAlpineMocks(c)
    c.init()
    expect(c.getDisabledReason('invalid')).toEqual([])
  })

  it('uses custom constraintMessages', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 6],
      constraintMessages: {
        disabledDayOfWeek: 'Weekends are closed',
      },
    })
    withAlpineMocks(c)
    c.init()
    expect(c.getDisabledReason('2025-06-07')).toEqual(['Weekends are closed'])
  })

  it('reflects updateConstraints changes', () => {
    const c = createCalendarData({})
    withAlpineMocks(c)
    c.init()
    expect(c.getDisabledReason('2025-06-07')).toEqual([])

    c.updateConstraints({ disabledDaysOfWeek: [0, 6] })
    expect(c.getDisabledReason('2025-06-07')).toEqual([
      'This day of the week is not available',
    ])
  })
})

describe('component dayTitle', () => {
  it('returns tooltip text for disabled cells', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 6],
    })
    withAlpineMocks(c)
    c.init()
    const cell = {
      date: new CalendarDate(2025, 6, 7), // Saturday
      isCurrentMonth: true,
      isToday: false,
      isDisabled: true,
    }
    expect(c.dayTitle(cell)).toBe('This day of the week is not available')
  })

  it('returns empty string for enabled cells', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 6],
    })
    withAlpineMocks(c)
    c.init()
    const cell = {
      date: new CalendarDate(2025, 6, 9), // Monday
      isCurrentMonth: true,
      isToday: false,
      isDisabled: false,
    }
    expect(c.dayTitle(cell)).toBe('')
  })

  it('joins multiple reasons with semicolons', () => {
    // A date disabled by both day-of-week and specific date
    const c = createCalendarData({
      disabledDaysOfWeek: [6],
      disabledDates: ['2025-06-07'], // also Saturday
    })
    withAlpineMocks(c)
    c.init()
    const cell = {
      date: new CalendarDate(2025, 6, 7),
      isCurrentMonth: true,
      isToday: false,
      isDisabled: true,
    }
    const title = c.dayTitle(cell)
    // Should contain both reasons
    expect(title).toContain('This date is not available')
    expect(title).toContain('This day of the week is not available')
    expect(title).toContain('; ')
  })
})
