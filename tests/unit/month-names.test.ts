import { describe, it, expect } from 'vitest'
import { CalendarDate } from '../../src/core/calendar-date'
import { formatDate, formatRange, formatMultiple } from '../../src/input/formatter'
import { parseDate, parseDateRange, parseDateMultiple } from '../../src/input/parser'
import { getMonthNames, parseMonthName, formatHasMonthName } from '../../src/input/month-names'

// ---------------------------------------------------------------------------
// getMonthNames
// ---------------------------------------------------------------------------

describe('getMonthNames', () => {
  it('returns 12 entries for short style', () => {
    const names = getMonthNames('short', 'en-US')
    expect(names).toHaveLength(12)
  })

  it('returns 12 entries for long style', () => {
    const names = getMonthNames('long', 'en-US')
    expect(names).toHaveLength(12)
  })

  it('short names include Jan and Dec (en-US)', () => {
    const names = getMonthNames('short', 'en-US')
    expect(names[0]).toBe('Jan')
    expect(names[11]).toBe('Dec')
  })

  it('long names include January and December (en-US)', () => {
    const names = getMonthNames('long', 'en-US')
    expect(names[0]).toBe('January')
    expect(names[11]).toBe('December')
  })

  it('returns cached results on second call', () => {
    const a = getMonthNames('short', 'en-US')
    const b = getMonthNames('short', 'en-US')
    expect(a).toBe(b)
  })

  it('returns locale-specific names for Greek', () => {
    const names = getMonthNames('short', 'el')
    // Greek short month for January — just verify it's not the English name
    expect(names[0]).not.toBe('Jan')
    expect(names).toHaveLength(12)
  })
})

// ---------------------------------------------------------------------------
// parseMonthName
// ---------------------------------------------------------------------------

describe('parseMonthName', () => {
  it('parses short English month names', () => {
    expect(parseMonthName('Jan', 'en-US')).toBe(1)
    expect(parseMonthName('Mar', 'en-US')).toBe(3)
    expect(parseMonthName('Dec', 'en-US')).toBe(12)
  })

  it('parses long English month names', () => {
    expect(parseMonthName('January', 'en-US')).toBe(1)
    expect(parseMonthName('March', 'en-US')).toBe(3)
    expect(parseMonthName('December', 'en-US')).toBe(12)
  })

  it('is case-insensitive', () => {
    expect(parseMonthName('jan', 'en-US')).toBe(1)
    expect(parseMonthName('JAN', 'en-US')).toBe(1)
    expect(parseMonthName('january', 'en-US')).toBe(1)
    expect(parseMonthName('MARCH', 'en-US')).toBe(3)
  })

  it('returns null for invalid names', () => {
    expect(parseMonthName('Foo', 'en-US')).toBeNull()
    expect(parseMonthName('', 'en-US')).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// formatHasMonthName
// ---------------------------------------------------------------------------

describe('formatHasMonthName', () => {
  it('returns true for MMM token', () => {
    expect(formatHasMonthName('DD MMM YYYY')).toBe(true)
  })

  it('returns true for MMMM token', () => {
    expect(formatHasMonthName('DD MMMM YYYY')).toBe(true)
  })

  it('returns false for numeric-only format', () => {
    expect(formatHasMonthName('DD/MM/YYYY')).toBe(false)
  })

  it('returns false for MM token (not MMM)', () => {
    expect(formatHasMonthName('DD-MM-YYYY')).toBe(false)
  })

  it('returns false for M token', () => {
    expect(formatHasMonthName('D/M/YYYY')).toBe(false)
  })

  it('returns false for empty format', () => {
    expect(formatHasMonthName('')).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// formatDate with MMM
// ---------------------------------------------------------------------------

describe('formatDate with month-name tokens', () => {
  const date = new CalendarDate(2026, 3, 15)

  describe('DD MMM YYYY format', () => {
    const fmt = 'DD MMM YYYY'

    it('formats with short month name', () => {
      expect(formatDate(date, fmt, 'en-US')).toBe('15 Mar 2026')
    })

    it('formats January', () => {
      expect(formatDate(new CalendarDate(2026, 1, 1), fmt, 'en-US')).toBe('01 Jan 2026')
    })

    it('formats December', () => {
      expect(formatDate(new CalendarDate(2026, 12, 25), fmt, 'en-US')).toBe('25 Dec 2026')
    })
  })

  describe('DD MMMM YYYY format', () => {
    const fmt = 'DD MMMM YYYY'

    it('formats with full month name', () => {
      expect(formatDate(date, fmt, 'en-US')).toBe('15 March 2026')
    })

    it('formats September (long name)', () => {
      expect(formatDate(new CalendarDate(2026, 9, 5), fmt, 'en-US')).toBe('05 September 2026')
    })
  })

  describe('MMMM D, YYYY format', () => {
    it('formats US-style long month name', () => {
      expect(formatDate(new CalendarDate(2026, 7, 4), 'MMMM D, YYYY', 'en-US')).toBe('July 4, 2026')
    })
  })

  describe('non-English locale', () => {
    it('formats with Greek short month names', () => {
      const result = formatDate(date, 'DD MMM YYYY', 'el')
      // Should NOT be English "Mar"
      expect(result).not.toBe('15 Mar 2026')
      // Should still start with "15 " and end with " 2026"
      expect(result).toMatch(/^15 .+ 2026$/)
    })

    it('formats with Greek long month names', () => {
      const result = formatDate(date, 'DD MMMM YYYY', 'el')
      expect(result).not.toBe('15 March 2026')
      expect(result).toMatch(/^15 .+ 2026$/)
    })
  })

  describe('backward compatibility', () => {
    it('numeric formats still work without locale', () => {
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/03/2026')
    })

    it('numeric formats still work with locale param', () => {
      expect(formatDate(date, 'DD/MM/YYYY', 'en-US')).toBe('15/03/2026')
    })
  })
})

// ---------------------------------------------------------------------------
// formatRange with MMM
// ---------------------------------------------------------------------------

describe('formatRange with month-name tokens', () => {
  it('formats range with short month names', () => {
    const start = new CalendarDate(2026, 3, 15)
    const end = new CalendarDate(2026, 3, 22)
    expect(formatRange(start, end, 'DD MMM YYYY', 'en-US')).toBe('15 Mar 2026 – 22 Mar 2026')
  })

  it('formats cross-month range', () => {
    const start = new CalendarDate(2026, 1, 28)
    const end = new CalendarDate(2026, 2, 5)
    expect(formatRange(start, end, 'DD MMM YYYY', 'en-US')).toBe('28 Jan 2026 – 05 Feb 2026')
  })
})

// ---------------------------------------------------------------------------
// formatMultiple with MMM
// ---------------------------------------------------------------------------

describe('formatMultiple with month-name tokens', () => {
  it('formats multiple dates with short month names', () => {
    const dates = [
      new CalendarDate(2026, 1, 5),
      new CalendarDate(2026, 6, 15),
      new CalendarDate(2026, 12, 25),
    ]
    expect(formatMultiple(dates, 'DD MMM YYYY', undefined, 'en-US')).toBe(
      '05 Jan 2026, 15 Jun 2026, 25 Dec 2026',
    )
  })
})

// ---------------------------------------------------------------------------
// parseDate with MMM/MMMM
// ---------------------------------------------------------------------------

describe('parseDate with month-name tokens', () => {
  describe('DD MMM YYYY format', () => {
    const fmt = 'DD MMM YYYY'

    it('parses standard short month name', () => {
      const d = parseDate('15 Mar 2026', fmt, 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-03-15')
    })

    it('parses all 12 months', () => {
      const months = [
        'Jan',
        'Feb',
        'Mar',
        'Apr',
        'May',
        'Jun',
        'Jul',
        'Aug',
        'Sep',
        'Oct',
        'Nov',
        'Dec',
      ]
      for (let i = 0; i < months.length; i++) {
        const d = parseDate(`15 ${months[i]} 2026`, fmt, 'en-US')
        expect(d).not.toBeNull()
        expect(d?.month).toBe(i + 1)
      }
    })

    it('parses lowercase month name', () => {
      const d = parseDate('15 mar 2026', fmt, 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-03-15')
    })

    it('parses uppercase month name', () => {
      const d = parseDate('15 MAR 2026', fmt, 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-03-15')
    })

    it('returns null for invalid month name', () => {
      expect(parseDate('15 Xyz 2026', fmt, 'en-US')).toBeNull()
    })

    it('returns null for invalid day', () => {
      expect(parseDate('32 Mar 2026', fmt, 'en-US')).toBeNull()
    })

    it('validates Feb 29 in non-leap year', () => {
      expect(parseDate('29 Feb 2026', fmt, 'en-US')).toBeNull()
    })

    it('allows Feb 29 in leap year', () => {
      const d = parseDate('29 Feb 2028', fmt, 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2028-02-29')
    })
  })

  describe('DD MMMM YYYY format', () => {
    const fmt = 'DD MMMM YYYY'

    it('parses full month name', () => {
      const d = parseDate('15 March 2026', fmt, 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-03-15')
    })

    it('parses case-insensitive', () => {
      const d = parseDate('15 march 2026', fmt, 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-03-15')
    })

    it('parses September (long name)', () => {
      const d = parseDate('05 September 2026', fmt, 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-09-05')
    })
  })

  describe('MMMM D, YYYY format', () => {
    it('parses US-style date', () => {
      const d = parseDate('July 4, 2026', 'MMMM D, YYYY', 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-07-04')
    })
  })

  describe('round-trip', () => {
    it('format then parse returns same date (MMM)', () => {
      const original = new CalendarDate(2026, 11, 8)
      const fmt = 'DD MMM YYYY'
      const formatted = formatDate(original, fmt, 'en-US')
      const parsed = parseDate(formatted, fmt, 'en-US')
      expect(parsed).not.toBeNull()
      expect(parsed?.toISO()).toBe(original.toISO())
    })

    it('format then parse returns same date (MMMM)', () => {
      const original = new CalendarDate(2026, 4, 22)
      const fmt = 'DD MMMM YYYY'
      const formatted = formatDate(original, fmt, 'en-US')
      const parsed = parseDate(formatted, fmt, 'en-US')
      expect(parsed).not.toBeNull()
      expect(parsed?.toISO()).toBe(original.toISO())
    })

    it('round-trips all 12 months (MMM)', () => {
      const fmt = 'DD MMM YYYY'
      for (let m = 1; m <= 12; m++) {
        const original = new CalendarDate(2026, m, 15)
        const formatted = formatDate(original, fmt, 'en-US')
        const parsed = parseDate(formatted, fmt, 'en-US')
        expect(parsed).not.toBeNull()
        expect(parsed?.toISO()).toBe(original.toISO())
      }
    })

    it('round-trips with Greek locale (MMM)', () => {
      const fmt = 'DD MMM YYYY'
      const original = new CalendarDate(2026, 6, 15)
      const formatted = formatDate(original, fmt, 'el')
      const parsed = parseDate(formatted, fmt, 'el')
      expect(parsed).not.toBeNull()
      expect(parsed?.toISO()).toBe(original.toISO())
    })

    it('round-trips with Greek locale (MMMM)', () => {
      const fmt = 'DD MMMM YYYY'
      const original = new CalendarDate(2026, 6, 15)
      const formatted = formatDate(original, fmt, 'el')
      const parsed = parseDate(formatted, fmt, 'el')
      expect(parsed).not.toBeNull()
      expect(parsed?.toISO()).toBe(original.toISO())
    })
  })

  describe('backward compatibility', () => {
    it('numeric parseDate still works without locale', () => {
      const d = parseDate('15/03/2026', 'DD/MM/YYYY')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-03-15')
    })

    it('numeric parseDate still works with locale param', () => {
      const d = parseDate('15/03/2026', 'DD/MM/YYYY', 'en-US')
      expect(d).not.toBeNull()
      expect(d?.toISO()).toBe('2026-03-15')
    })
  })
})

// ---------------------------------------------------------------------------
// parseDateRange with MMM
// ---------------------------------------------------------------------------

describe('parseDateRange with month-name tokens', () => {
  it('parses range with en-dash separator', () => {
    const result = parseDateRange('15 Mar 2026 – 22 Mar 2026', 'DD MMM YYYY', 'en-US')
    expect(result).not.toBeNull()
    expect(result?.[0].toISO()).toBe('2026-03-15')
    expect(result?.[1].toISO()).toBe('2026-03-22')
  })

  it('parses range with hyphen separator', () => {
    const result = parseDateRange('15 Mar 2026 - 22 Mar 2026', 'DD MMM YYYY', 'en-US')
    expect(result).not.toBeNull()
    expect(result?.[0].toISO()).toBe('2026-03-15')
    expect(result?.[1].toISO()).toBe('2026-03-22')
  })

  it('parses cross-month range', () => {
    const result = parseDateRange('28 Jan 2026 – 05 Feb 2026', 'DD MMM YYYY', 'en-US')
    expect(result).not.toBeNull()
    expect(result?.[0].toISO()).toBe('2026-01-28')
    expect(result?.[1].toISO()).toBe('2026-02-05')
  })
})

// ---------------------------------------------------------------------------
// parseDateMultiple with MMM
// ---------------------------------------------------------------------------

describe('parseDateMultiple with month-name tokens', () => {
  it('parses comma-separated dates', () => {
    const result = parseDateMultiple(
      '05 Jan 2026, 15 Jun 2026, 25 Dec 2026',
      'DD MMM YYYY',
      'en-US',
    )
    expect(result).toHaveLength(3)
    expect(result[0]?.toISO()).toBe('2026-01-05')
    expect(result[1]?.toISO()).toBe('2026-06-15')
    expect(result[2]?.toISO()).toBe('2026-12-25')
  })
})
