import { describe, it, expect } from 'vitest'
import { parseDate, parseDateRange, parseDateMultiple } from '../../src/input/parser'

// ---------------------------------------------------------------------------
// parseDate
// ---------------------------------------------------------------------------

describe('parseDate', () => {
  // -------------------------------------------------------------------------
  // Format: DD/MM/YYYY
  // -------------------------------------------------------------------------

  describe('DD/MM/YYYY format', () => {
    const fmt = 'DD/MM/YYYY'

    it('parses a zero-padded date', () => {
      const d = parseDate('15/06/2025', fmt)
      expect(d).not.toBeNull()
      expect(d!.toISO()).toBe('2025-06-15')
    })

    it('parses single-digit day and month (lenient)', () => {
      const d = parseDate('1/3/2025', fmt)
      expect(d).not.toBeNull()
      expect(d!.toISO()).toBe('2025-03-01')
    })

    it('parses first day of year', () => {
      const d = parseDate('01/01/2025', fmt)
      expect(d!.toISO()).toBe('2025-01-01')
    })

    it('parses last day of year', () => {
      const d = parseDate('31/12/2025', fmt)
      expect(d!.toISO()).toBe('2025-12-31')
    })

    it('returns null for empty string', () => {
      expect(parseDate('', fmt)).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(parseDate('   ', fmt)).toBeNull()
    })

    it('returns null for wrong separator', () => {
      expect(parseDate('15-06-2025', fmt)).toBeNull()
    })

    it('returns null for non-date string', () => {
      expect(parseDate('not-a-date', fmt)).toBeNull()
    })

    it('trims whitespace before parsing', () => {
      const d = parseDate('  15/06/2025  ', fmt)
      expect(d).not.toBeNull()
      expect(d!.toISO()).toBe('2025-06-15')
    })
  })

  // -------------------------------------------------------------------------
  // Format: MM/DD/YYYY (US style)
  // -------------------------------------------------------------------------

  describe('MM/DD/YYYY format', () => {
    const fmt = 'MM/DD/YYYY'

    it('parses US-style date', () => {
      const d = parseDate('06/15/2025', fmt)
      expect(d!.toISO()).toBe('2025-06-15')
    })

    it('parses single-digit values (lenient)', () => {
      const d = parseDate('3/1/2025', fmt)
      expect(d!.toISO()).toBe('2025-03-01')
    })
  })

  // -------------------------------------------------------------------------
  // Format: YYYY-MM-DD (ISO style)
  // -------------------------------------------------------------------------

  describe('YYYY-MM-DD format', () => {
    const fmt = 'YYYY-MM-DD'

    it('parses ISO-style date', () => {
      const d = parseDate('2025-06-15', fmt)
      expect(d!.toISO()).toBe('2025-06-15')
    })

    it('parses with single-digit month/day (lenient)', () => {
      const d = parseDate('2025-6-1', fmt)
      expect(d!.toISO()).toBe('2025-06-01')
    })
  })

  // -------------------------------------------------------------------------
  // Format: DD.MM.YYYY (European dot style)
  // -------------------------------------------------------------------------

  describe('DD.MM.YYYY format', () => {
    const fmt = 'DD.MM.YYYY'

    it('parses dot-separated date', () => {
      const d = parseDate('15.06.2025', fmt)
      expect(d!.toISO()).toBe('2025-06-15')
    })

    it('parses single-digit values (lenient)', () => {
      const d = parseDate('1.3.2025', fmt)
      expect(d!.toISO()).toBe('2025-03-01')
    })
  })

  // -------------------------------------------------------------------------
  // Format: DD-MM-YYYY (dash style)
  // -------------------------------------------------------------------------

  describe('DD-MM-YYYY format', () => {
    const fmt = 'DD-MM-YYYY'

    it('parses dash-separated date', () => {
      const d = parseDate('15-06-2025', fmt)
      expect(d!.toISO()).toBe('2025-06-15')
    })
  })

  // -------------------------------------------------------------------------
  // Format tokens: D, M, YY
  // -------------------------------------------------------------------------

  describe('D/M/YYYY format', () => {
    const fmt = 'D/M/YYYY'

    it('parses single-digit day and month', () => {
      const d = parseDate('1/3/2025', fmt)
      expect(d!.toISO()).toBe('2025-03-01')
    })

    it('parses double-digit day and month', () => {
      const d = parseDate('15/12/2025', fmt)
      expect(d!.toISO()).toBe('2025-12-15')
    })
  })

  describe('DD/MM/YY format', () => {
    const fmt = 'DD/MM/YY'

    it('parses two-digit year (assumes 2000s)', () => {
      const d = parseDate('15/06/25', fmt)
      expect(d).not.toBeNull()
      expect(d!.toISO()).toBe('2025-06-15')
    })

    it('parses year 00 as 2000', () => {
      const d = parseDate('01/01/00', fmt)
      expect(d!.toISO()).toBe('2000-01-01')
    })

    it('parses year 99 as 2099', () => {
      const d = parseDate('01/01/99', fmt)
      expect(d!.toISO()).toBe('2099-01-01')
    })
  })

  // -------------------------------------------------------------------------
  // Validation — reject invalid dates
  // -------------------------------------------------------------------------

  describe('validation', () => {
    const fmt = 'DD/MM/YYYY'

    it('rejects Feb 30', () => {
      expect(parseDate('30/02/2025', fmt)).toBeNull()
    })

    it('rejects Feb 29 in non-leap year', () => {
      expect(parseDate('29/02/2025', fmt)).toBeNull()
    })

    it('accepts Feb 29 in leap year', () => {
      const d = parseDate('29/02/2024', fmt)
      expect(d).not.toBeNull()
      expect(d!.toISO()).toBe('2024-02-29')
    })

    it('rejects Feb 28+1 overflow', () => {
      expect(parseDate('30/02/2024', fmt)).toBeNull() // even leap year
    })

    it('rejects month 0', () => {
      expect(parseDate('15/00/2025', fmt)).toBeNull()
    })

    it('rejects month 13', () => {
      expect(parseDate('15/13/2025', fmt)).toBeNull()
    })

    it('rejects day 0', () => {
      expect(parseDate('00/06/2025', fmt)).toBeNull()
    })

    it('rejects day 32', () => {
      expect(parseDate('32/01/2025', fmt)).toBeNull()
    })

    it('rejects April 31', () => {
      expect(parseDate('31/04/2025', fmt)).toBeNull()
    })

    it('rejects June 31', () => {
      expect(parseDate('31/06/2025', fmt)).toBeNull()
    })

    it('accepts the last valid day of each 30-day month', () => {
      expect(parseDate('30/04/2025', fmt)!.toISO()).toBe('2025-04-30')
      expect(parseDate('30/06/2025', fmt)!.toISO()).toBe('2025-06-30')
      expect(parseDate('30/09/2025', fmt)!.toISO()).toBe('2025-09-30')
      expect(parseDate('30/11/2025', fmt)!.toISO()).toBe('2025-11-30')
    })

    it('accepts the last valid day of each 31-day month', () => {
      expect(parseDate('31/01/2025', fmt)!.toISO()).toBe('2025-01-31')
      expect(parseDate('31/03/2025', fmt)!.toISO()).toBe('2025-03-31')
      expect(parseDate('31/05/2025', fmt)!.toISO()).toBe('2025-05-31')
      expect(parseDate('31/07/2025', fmt)!.toISO()).toBe('2025-07-31')
      expect(parseDate('31/08/2025', fmt)!.toISO()).toBe('2025-08-31')
      expect(parseDate('31/10/2025', fmt)!.toISO()).toBe('2025-10-31')
      expect(parseDate('31/12/2025', fmt)!.toISO()).toBe('2025-12-31')
    })
  })

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------

  describe('edge cases', () => {
    it('rejects extra trailing characters', () => {
      expect(parseDate('15/06/2025abc', 'DD/MM/YYYY')).toBeNull()
    })

    it('rejects extra leading characters', () => {
      expect(parseDate('abc15/06/2025', 'DD/MM/YYYY')).toBeNull()
    })

    it('rejects partial input', () => {
      expect(parseDate('15/06', 'DD/MM/YYYY')).toBeNull()
    })

    it('rejects alphabetic characters in date positions', () => {
      expect(parseDate('ab/cd/efgh', 'DD/MM/YYYY')).toBeNull()
    })
  })
})

// ---------------------------------------------------------------------------
// parseDateRange
// ---------------------------------------------------------------------------

describe('parseDateRange', () => {
  const fmt = 'DD/MM/YYYY'

  it('parses a range with " - " separator', () => {
    const result = parseDateRange('01/01/2025 - 07/01/2025', fmt)
    expect(result).not.toBeNull()
    expect(result![0].toISO()).toBe('2025-01-01')
    expect(result![1].toISO()).toBe('2025-01-07')
  })

  it('parses a range with " – " (en-dash) separator', () => {
    const result = parseDateRange('01/06/2025 – 30/06/2025', fmt)
    expect(result).not.toBeNull()
    expect(result![0].toISO()).toBe('2025-06-01')
    expect(result![1].toISO()).toBe('2025-06-30')
  })

  it('parses a range with " — " (em-dash) separator', () => {
    const result = parseDateRange('01/06/2025 — 30/06/2025', fmt)
    expect(result).not.toBeNull()
    expect(result![0].toISO()).toBe('2025-06-01')
    expect(result![1].toISO()).toBe('2025-06-30')
  })

  it('parses range spanning months', () => {
    const result = parseDateRange('25/06/2025 - 05/08/2025', fmt)
    expect(result).not.toBeNull()
    expect(result![0].toISO()).toBe('2025-06-25')
    expect(result![1].toISO()).toBe('2025-08-05')
  })

  it('parses range spanning years', () => {
    const result = parseDateRange('20/12/2025 - 10/01/2026', fmt)
    expect(result).not.toBeNull()
    expect(result![0].toISO()).toBe('2025-12-20')
    expect(result![1].toISO()).toBe('2026-01-10')
  })

  it('returns null for empty input', () => {
    expect(parseDateRange('', fmt)).toBeNull()
  })

  it('returns null for single date (no separator)', () => {
    expect(parseDateRange('15/06/2025', fmt)).toBeNull()
  })

  it('returns null if start date is invalid', () => {
    expect(parseDateRange('32/06/2025 - 15/06/2025', fmt)).toBeNull()
  })

  it('returns null if end date is invalid', () => {
    expect(parseDateRange('01/06/2025 - 31/06/2025', fmt)).toBeNull()
  })

  it('works with ISO format', () => {
    const result = parseDateRange('2025-06-01 - 2025-06-30', 'YYYY-MM-DD')
    expect(result).not.toBeNull()
    expect(result![0].toISO()).toBe('2025-06-01')
    expect(result![1].toISO()).toBe('2025-06-30')
  })

  it('trims whitespace around the full string', () => {
    const result = parseDateRange('  01/06/2025 - 30/06/2025  ', fmt)
    expect(result).not.toBeNull()
    expect(result![0].toISO()).toBe('2025-06-01')
    expect(result![1].toISO()).toBe('2025-06-30')
  })
})

// ---------------------------------------------------------------------------
// parseDateMultiple
// ---------------------------------------------------------------------------

describe('parseDateMultiple', () => {
  const fmt = 'DD/MM/YYYY'

  it('parses comma-separated dates', () => {
    const result = parseDateMultiple('01/06/2025, 15/06/2025, 20/06/2025', fmt)
    expect(result).toHaveLength(3)
    expect(result[0]!.toISO()).toBe('2025-06-01')
    expect(result[1]!.toISO()).toBe('2025-06-15')
    expect(result[2]!.toISO()).toBe('2025-06-20')
  })

  it('parses comma-separated dates without spaces', () => {
    const result = parseDateMultiple('01/06/2025,15/06/2025', fmt)
    expect(result).toHaveLength(2)
    expect(result[0]!.toISO()).toBe('2025-06-01')
    expect(result[1]!.toISO()).toBe('2025-06-15')
  })

  it('skips invalid dates in the list', () => {
    const result = parseDateMultiple('01/06/2025, 30/02/2025, 20/06/2025', fmt)
    expect(result).toHaveLength(2)
    expect(result[0]!.toISO()).toBe('2025-06-01')
    expect(result[1]!.toISO()).toBe('2025-06-20')
  })

  it('returns empty array for empty input', () => {
    expect(parseDateMultiple('', fmt)).toEqual([])
  })

  it('returns empty array for whitespace-only input', () => {
    expect(parseDateMultiple('   ', fmt)).toEqual([])
  })

  it('parses a single date', () => {
    const result = parseDateMultiple('15/06/2025', fmt)
    expect(result).toHaveLength(1)
    expect(result[0]!.toISO()).toBe('2025-06-15')
  })

  it('returns empty array when all dates are invalid', () => {
    const result = parseDateMultiple('30/02/2025, 31/06/2025', fmt)
    expect(result).toEqual([])
  })

  it('works with ISO format', () => {
    const result = parseDateMultiple('2025-06-01, 2025-06-15', 'YYYY-MM-DD')
    expect(result).toHaveLength(2)
    expect(result[0]!.toISO()).toBe('2025-06-01')
    expect(result[1]!.toISO()).toBe('2025-06-15')
  })

  it('trims whitespace around the full string', () => {
    const result = parseDateMultiple('  01/06/2025, 15/06/2025  ', fmt)
    expect(result).toHaveLength(2)
  })
})
