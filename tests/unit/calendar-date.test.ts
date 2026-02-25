import { describe, it, expect } from 'vitest'
import { CalendarDate, daysInMonth } from '../../src/core/calendar-date'

describe('CalendarDate', () => {
  describe('constructor & basic properties', () => {
    it('stores year, month, day as plain integers', () => {
      const d = new CalendarDate(2025, 3, 15)
      expect(d.year).toBe(2025)
      expect(d.month).toBe(3)
      expect(d.day).toBe(15)
    })
  })

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  describe('today()', () => {
    it('returns a CalendarDate for the current local date', () => {
      const today = CalendarDate.today()
      const now = new Date()
      expect(today.year).toBe(now.getFullYear())
      expect(today.month).toBe(now.getMonth() + 1)
      expect(today.day).toBe(now.getDate())
    })

    it('resolves today in a specific IANA timezone', () => {
      // Use a timezone where the date could differ from local
      const tokyo = CalendarDate.today('Asia/Tokyo')
      expect(tokyo.year).toBeGreaterThanOrEqual(2020)
      expect(tokyo.month).toBeGreaterThanOrEqual(1)
      expect(tokyo.month).toBeLessThanOrEqual(12)
      expect(tokyo.day).toBeGreaterThanOrEqual(1)
      expect(tokyo.day).toBeLessThanOrEqual(31)
    })
  })

  describe('fromNativeDate()', () => {
    it('converts a native Date to CalendarDate (local)', () => {
      const native = new Date(2025, 5, 20) // June 20, 2025
      const d = CalendarDate.fromNativeDate(native)
      expect(d.year).toBe(2025)
      expect(d.month).toBe(6)
      expect(d.day).toBe(20)
    })

    it('converts with timezone — midnight UTC vs UTC+2 (Athens)', () => {
      // Midnight UTC on Jan 1 → still Dec 31 in UTC-5 (New York)
      const midnightUTC = new Date('2025-01-01T00:30:00Z')
      const nyDate = CalendarDate.fromNativeDate(midnightUTC, 'America/New_York')
      // At 00:30 UTC, it's 19:30 Dec 31 in New York (UTC-5)
      expect(nyDate.month).toBe(12)
      expect(nyDate.day).toBe(31)
      expect(nyDate.year).toBe(2024)
    })

    it('converts with timezone — Athens (UTC+2/+3)', () => {
      // 23:00 UTC on June 15 → 02:00 June 16 in Athens (UTC+3 in summer)
      const lateUTC = new Date('2025-06-15T23:00:00Z')
      const athens = CalendarDate.fromNativeDate(lateUTC, 'Europe/Athens')
      expect(athens.month).toBe(6)
      expect(athens.day).toBe(16)
      expect(athens.year).toBe(2025)
    })
  })

  describe('fromISO()', () => {
    it('parses a valid ISO date string', () => {
      const d = CalendarDate.fromISO('2025-03-15')
      expect(d).not.toBeNull()
      expect(d!.year).toBe(2025)
      expect(d!.month).toBe(3)
      expect(d!.day).toBe(15)
    })

    it('returns null for invalid format', () => {
      expect(CalendarDate.fromISO('2025/03/15')).toBeNull()
      expect(CalendarDate.fromISO('03-15-2025')).toBeNull()
      expect(CalendarDate.fromISO('not-a-date')).toBeNull()
      expect(CalendarDate.fromISO('')).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  describe('toISO() / toKey()', () => {
    it('serializes to YYYY-MM-DD', () => {
      expect(new CalendarDate(2025, 1, 5).toISO()).toBe('2025-01-05')
      expect(new CalendarDate(2025, 12, 31).toISO()).toBe('2025-12-31')
    })

    it('toKey() is an alias for toISO()', () => {
      const d = new CalendarDate(2025, 6, 1)
      expect(d.toKey()).toBe(d.toISO())
    })

    it('pads single-digit months and days', () => {
      expect(new CalendarDate(2025, 3, 7).toISO()).toBe('2025-03-07')
    })
  })

  describe('toNativeDate()', () => {
    it('converts back to a native Date at midnight local', () => {
      const d = new CalendarDate(2025, 6, 15)
      const native = d.toNativeDate()
      expect(native.getFullYear()).toBe(2025)
      expect(native.getMonth()).toBe(5) // 0-indexed
      expect(native.getDate()).toBe(15)
    })
  })

  // ---------------------------------------------------------------------------
  // Comparison
  // ---------------------------------------------------------------------------

  describe('isSame()', () => {
    it('returns true for identical dates', () => {
      const a = new CalendarDate(2025, 6, 15)
      const b = new CalendarDate(2025, 6, 15)
      expect(a.isSame(b)).toBe(true)
    })

    it('returns false for different dates', () => {
      const a = new CalendarDate(2025, 6, 15)
      expect(a.isSame(new CalendarDate(2025, 6, 16))).toBe(false)
      expect(a.isSame(new CalendarDate(2025, 7, 15))).toBe(false)
      expect(a.isSame(new CalendarDate(2024, 6, 15))).toBe(false)
    })
  })

  describe('isBefore()', () => {
    it('compares by year first', () => {
      expect(new CalendarDate(2024, 12, 31).isBefore(new CalendarDate(2025, 1, 1))).toBe(true)
      expect(new CalendarDate(2025, 1, 1).isBefore(new CalendarDate(2024, 12, 31))).toBe(false)
    })

    it('compares by month when years are equal', () => {
      expect(new CalendarDate(2025, 1, 31).isBefore(new CalendarDate(2025, 2, 1))).toBe(true)
    })

    it('compares by day when year and month are equal', () => {
      expect(new CalendarDate(2025, 6, 14).isBefore(new CalendarDate(2025, 6, 15))).toBe(true)
      expect(new CalendarDate(2025, 6, 15).isBefore(new CalendarDate(2025, 6, 15))).toBe(false)
    })
  })

  describe('isAfter()', () => {
    it('returns true when date is strictly after', () => {
      expect(new CalendarDate(2025, 6, 16).isAfter(new CalendarDate(2025, 6, 15))).toBe(true)
    })

    it('returns false for same date', () => {
      expect(new CalendarDate(2025, 6, 15).isAfter(new CalendarDate(2025, 6, 15))).toBe(false)
    })

    it('returns false when before', () => {
      expect(new CalendarDate(2025, 6, 14).isAfter(new CalendarDate(2025, 6, 15))).toBe(false)
    })
  })

  describe('isBetween()', () => {
    it('returns true when date is within range (inclusive)', () => {
      const start = new CalendarDate(2025, 6, 10)
      const end = new CalendarDate(2025, 6, 20)
      expect(new CalendarDate(2025, 6, 15).isBetween(start, end)).toBe(true)
    })

    it('returns true on boundary dates', () => {
      const start = new CalendarDate(2025, 6, 10)
      const end = new CalendarDate(2025, 6, 20)
      expect(new CalendarDate(2025, 6, 10).isBetween(start, end)).toBe(true)
      expect(new CalendarDate(2025, 6, 20).isBetween(start, end)).toBe(true)
    })

    it('returns false outside range', () => {
      const start = new CalendarDate(2025, 6, 10)
      const end = new CalendarDate(2025, 6, 20)
      expect(new CalendarDate(2025, 6, 9).isBetween(start, end)).toBe(false)
      expect(new CalendarDate(2025, 6, 21).isBetween(start, end)).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Arithmetic
  // ---------------------------------------------------------------------------

  describe('addDays()', () => {
    it('adds positive days', () => {
      const d = new CalendarDate(2025, 6, 28).addDays(5)
      expect(d.toISO()).toBe('2025-07-03')
    })

    it('subtracts days with negative value', () => {
      const d = new CalendarDate(2025, 7, 3).addDays(-5)
      expect(d.toISO()).toBe('2025-06-28')
    })

    it('handles month boundary', () => {
      const d = new CalendarDate(2025, 1, 31).addDays(1)
      expect(d.toISO()).toBe('2025-02-01')
    })

    it('handles year boundary', () => {
      const d = new CalendarDate(2025, 12, 31).addDays(1)
      expect(d.toISO()).toBe('2026-01-01')
    })
  })

  describe('addMonths()', () => {
    it('adds months normally', () => {
      const d = new CalendarDate(2025, 1, 15).addMonths(3)
      expect(d.toISO()).toBe('2025-04-15')
    })

    it('clamps day when target month has fewer days — March 31 + 1 = April 30', () => {
      const d = new CalendarDate(2025, 3, 31).addMonths(1)
      expect(d.toISO()).toBe('2025-04-30')
    })

    it('clamps day — Jan 31 + 1 = Feb 28 (non-leap)', () => {
      const d = new CalendarDate(2025, 1, 31).addMonths(1)
      expect(d.toISO()).toBe('2025-02-28')
    })

    it('clamps day — Jan 31 + 1 = Feb 29 (leap year)', () => {
      const d = new CalendarDate(2024, 1, 31).addMonths(1)
      expect(d.toISO()).toBe('2024-02-29')
    })

    it('wraps year forward', () => {
      const d = new CalendarDate(2025, 11, 15).addMonths(3)
      expect(d.toISO()).toBe('2026-02-15')
    })

    it('wraps year backward with negative months', () => {
      const d = new CalendarDate(2025, 2, 15).addMonths(-3)
      expect(d.toISO()).toBe('2024-11-15')
    })

    it('handles adding 12 months (full year)', () => {
      const d = new CalendarDate(2025, 6, 15).addMonths(12)
      expect(d.toISO()).toBe('2026-06-15')
    })

    it('handles adding 0 months', () => {
      const d = new CalendarDate(2025, 6, 15).addMonths(0)
      expect(d.toISO()).toBe('2025-06-15')
    })
  })

  describe('addYears()', () => {
    it('adds years normally', () => {
      const d = new CalendarDate(2025, 6, 15).addYears(1)
      expect(d.toISO()).toBe('2026-06-15')
    })

    it('clamps Feb 29 → Feb 28 when going from leap to non-leap year', () => {
      const d = new CalendarDate(2024, 2, 29).addYears(1)
      expect(d.toISO()).toBe('2025-02-28')
    })

    it('handles negative years', () => {
      const d = new CalendarDate(2025, 6, 15).addYears(-5)
      expect(d.toISO()).toBe('2020-06-15')
    })
  })

  describe('startOfMonth()', () => {
    it('returns the first day of the month', () => {
      const d = new CalendarDate(2025, 6, 15).startOfMonth()
      expect(d.toISO()).toBe('2025-06-01')
    })
  })

  describe('endOfMonth()', () => {
    it('returns the last day of each month', () => {
      expect(new CalendarDate(2025, 1, 15).endOfMonth().toISO()).toBe('2025-01-31')
      expect(new CalendarDate(2025, 2, 1).endOfMonth().toISO()).toBe('2025-02-28')
      expect(new CalendarDate(2024, 2, 1).endOfMonth().toISO()).toBe('2024-02-29') // leap year
      expect(new CalendarDate(2025, 4, 10).endOfMonth().toISO()).toBe('2025-04-30')
      expect(new CalendarDate(2025, 12, 1).endOfMonth().toISO()).toBe('2025-12-31')
    })
  })

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  describe('format()', () => {
    it('formats with Intl.DateTimeFormat options', () => {
      const d = new CalendarDate(2025, 6, 15)
      const result = d.format({ year: 'numeric', month: 'long', day: 'numeric' }, 'en-US')
      expect(result).toBe('June 15, 2025')
    })

    it('formats with locale', () => {
      const d = new CalendarDate(2025, 3, 1)
      const result = d.format({ month: 'long' }, 'el')
      // Greek month name for March
      expect(result).toBeTruthy()
      expect(typeof result).toBe('string')
    })

    it('formats short month', () => {
      const d = new CalendarDate(2025, 12, 25)
      const result = d.format({ month: 'short', day: 'numeric' }, 'en-US')
      expect(result).toBe('Dec 25')
    })
  })

  // ---------------------------------------------------------------------------
  // DST edge cases
  // ---------------------------------------------------------------------------

  describe('DST edge cases', () => {
    it('March 31 + 1 month = April 30 (day clamping across DST)', () => {
      const d = new CalendarDate(2025, 3, 31).addMonths(1)
      expect(d.toISO()).toBe('2025-04-30')
    })

    it('handles DST spring-forward: March 9, 2025 (US) addDays(1)', () => {
      // US DST spring forward: March 9, 2025
      const d = new CalendarDate(2025, 3, 9).addDays(1)
      expect(d.toISO()).toBe('2025-03-10')
    })

    it('handles DST fall-back: November 2, 2025 (US) addDays(1)', () => {
      // US DST fall back: November 2, 2025
      const d = new CalendarDate(2025, 11, 2).addDays(1)
      expect(d.toISO()).toBe('2025-11-03')
    })

    it('midnight UTC interpreted in different timezones gives correct date', () => {
      // At midnight UTC on March 30, 2025:
      // - In UTC+2 (Athens, winter) it's 02:00 March 30 → same date
      // - In UTC-5 (New York) it's 19:00 March 29 → previous date
      const midnightUTC = new Date('2025-03-30T00:00:00Z')

      const athens = CalendarDate.fromNativeDate(midnightUTC, 'Europe/Athens')
      expect(athens.day).toBe(30)
      expect(athens.month).toBe(3)

      const ny = CalendarDate.fromNativeDate(midnightUTC, 'America/New_York')
      expect(ny.day).toBe(29)
      expect(ny.month).toBe(3)
    })

    it('Feb 29 on leap year + 1 year = Feb 28', () => {
      const d = new CalendarDate(2024, 2, 29).addYears(1)
      expect(d.toISO()).toBe('2025-02-28')
    })

    it('Feb 28 non-leap + 1 year to leap = Feb 28 (no upward clamp)', () => {
      const d = new CalendarDate(2023, 2, 28).addYears(1)
      expect(d.toISO()).toBe('2024-02-28')
    })
  })

  // ---------------------------------------------------------------------------
  // Immutability
  // ---------------------------------------------------------------------------

  describe('immutability', () => {
    it('arithmetic returns new instances, does not mutate original', () => {
      const original = new CalendarDate(2025, 6, 15)
      const added = original.addDays(5)
      expect(original.toISO()).toBe('2025-06-15')
      expect(added.toISO()).toBe('2025-06-20')
    })
  })
})

// ---------------------------------------------------------------------------
// daysInMonth helper
// ---------------------------------------------------------------------------

describe('daysInMonth()', () => {
  it('returns correct days for each month', () => {
    // Non-leap year 2025
    expect(daysInMonth(2025, 1)).toBe(31)
    expect(daysInMonth(2025, 2)).toBe(28)
    expect(daysInMonth(2025, 3)).toBe(31)
    expect(daysInMonth(2025, 4)).toBe(30)
    expect(daysInMonth(2025, 5)).toBe(31)
    expect(daysInMonth(2025, 6)).toBe(30)
    expect(daysInMonth(2025, 7)).toBe(31)
    expect(daysInMonth(2025, 8)).toBe(31)
    expect(daysInMonth(2025, 9)).toBe(30)
    expect(daysInMonth(2025, 10)).toBe(31)
    expect(daysInMonth(2025, 11)).toBe(30)
    expect(daysInMonth(2025, 12)).toBe(31)
  })

  it('returns 29 for February in a leap year', () => {
    expect(daysInMonth(2024, 2)).toBe(29)
    expect(daysInMonth(2000, 2)).toBe(29) // divisible by 400
  })

  it('returns 28 for February in non-leap years', () => {
    expect(daysInMonth(2025, 2)).toBe(28)
    expect(daysInMonth(1900, 2)).toBe(28) // divisible by 100 but not 400
  })
})
