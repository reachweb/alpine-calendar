import { describe, it, expect } from 'vitest'
import { CalendarDate } from '../../src/core/calendar-date'
import { formatDate, formatRange, formatMultiple } from '../../src/input/formatter'

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe('formatDate', () => {
  const date = new CalendarDate(2025, 6, 15)

  // -------------------------------------------------------------------------
  // DD/MM/YYYY format
  // -------------------------------------------------------------------------

  describe('DD/MM/YYYY format', () => {
    const fmt = 'DD/MM/YYYY'

    it('formats a standard date', () => {
      expect(formatDate(date, fmt)).toBe('15/06/2025')
    })

    it('zero-pads single-digit day', () => {
      expect(formatDate(new CalendarDate(2025, 6, 1), fmt)).toBe('01/06/2025')
    })

    it('zero-pads single-digit month', () => {
      expect(formatDate(new CalendarDate(2025, 3, 15), fmt)).toBe('15/03/2025')
    })

    it('formats January 1st', () => {
      expect(formatDate(new CalendarDate(2025, 1, 1), fmt)).toBe('01/01/2025')
    })

    it('formats December 31st', () => {
      expect(formatDate(new CalendarDate(2025, 12, 31), fmt)).toBe('31/12/2025')
    })
  })

  // -------------------------------------------------------------------------
  // MM/DD/YYYY format (US style)
  // -------------------------------------------------------------------------

  describe('MM/DD/YYYY format', () => {
    const fmt = 'MM/DD/YYYY'

    it('formats US-style date', () => {
      expect(formatDate(date, fmt)).toBe('06/15/2025')
    })

    it('zero-pads day and month', () => {
      expect(formatDate(new CalendarDate(2025, 3, 1), fmt)).toBe('03/01/2025')
    })
  })

  // -------------------------------------------------------------------------
  // YYYY-MM-DD format (ISO style)
  // -------------------------------------------------------------------------

  describe('YYYY-MM-DD format', () => {
    const fmt = 'YYYY-MM-DD'

    it('formats ISO-style date', () => {
      expect(formatDate(date, fmt)).toBe('2025-06-15')
    })

    it('matches CalendarDate.toISO()', () => {
      expect(formatDate(date, fmt)).toBe(date.toISO())
    })
  })

  // -------------------------------------------------------------------------
  // DD.MM.YYYY format (European dot style)
  // -------------------------------------------------------------------------

  describe('DD.MM.YYYY format', () => {
    const fmt = 'DD.MM.YYYY'

    it('formats dot-separated date', () => {
      expect(formatDate(date, fmt)).toBe('15.06.2025')
    })
  })

  // -------------------------------------------------------------------------
  // DD-MM-YYYY format (dash style)
  // -------------------------------------------------------------------------

  describe('DD-MM-YYYY format', () => {
    const fmt = 'DD-MM-YYYY'

    it('formats dash-separated date', () => {
      expect(formatDate(date, fmt)).toBe('15-06-2025')
    })
  })

  // -------------------------------------------------------------------------
  // Non-padded tokens: D, M
  // -------------------------------------------------------------------------

  describe('D/M/YYYY format', () => {
    const fmt = 'D/M/YYYY'

    it('formats without zero-padding', () => {
      expect(formatDate(new CalendarDate(2025, 3, 1), fmt)).toBe('1/3/2025')
    })

    it('keeps multi-digit day and month as-is', () => {
      expect(formatDate(new CalendarDate(2025, 12, 25), fmt)).toBe('25/12/2025')
    })
  })

  // -------------------------------------------------------------------------
  // Two-digit year: YY
  // -------------------------------------------------------------------------

  describe('DD/MM/YY format', () => {
    const fmt = 'DD/MM/YY'

    it('formats with two-digit year', () => {
      expect(formatDate(date, fmt)).toBe('15/06/25')
    })

    it('formats year 2000 as 00', () => {
      expect(formatDate(new CalendarDate(2000, 1, 1), fmt)).toBe('01/01/00')
    })

    it('formats year 2099 as 99', () => {
      expect(formatDate(new CalendarDate(2099, 12, 31), fmt)).toBe('31/12/99')
    })
  })

  // -------------------------------------------------------------------------
  // Year padding
  // -------------------------------------------------------------------------

  describe('year padding', () => {
    it('pads year below 1000 with leading zeros', () => {
      expect(formatDate(new CalendarDate(5, 1, 1), 'YYYY-MM-DD')).toBe('0005-01-01')
    })

    it('pads year below 100 with leading zeros', () => {
      expect(formatDate(new CalendarDate(99, 6, 15), 'YYYY-MM-DD')).toBe('0099-06-15')
    })
  })

  // -------------------------------------------------------------------------
  // Round-trip with parser
  // -------------------------------------------------------------------------

  describe('round-trip consistency', () => {
    it('formatted output matches expected string', () => {
      const d = new CalendarDate(2025, 6, 15)
      expect(formatDate(d, 'DD/MM/YYYY')).toBe('15/06/2025')
      expect(formatDate(d, 'YYYY-MM-DD')).toBe('2025-06-15')
      expect(formatDate(d, 'D/M/YYYY')).toBe('15/6/2025')
    })
  })
})

// ---------------------------------------------------------------------------
// formatRange
// ---------------------------------------------------------------------------

describe('formatRange', () => {
  const fmt = 'DD/MM/YYYY'

  it('formats a basic range with en-dash', () => {
    const start = new CalendarDate(2025, 6, 1)
    const end = new CalendarDate(2025, 6, 30)
    expect(formatRange(start, end, fmt)).toBe('01/06/2025 – 30/06/2025')
  })

  it('formats a range spanning months', () => {
    const start = new CalendarDate(2025, 6, 25)
    const end = new CalendarDate(2025, 8, 5)
    expect(formatRange(start, end, fmt)).toBe('25/06/2025 – 05/08/2025')
  })

  it('formats a range spanning years', () => {
    const start = new CalendarDate(2025, 12, 20)
    const end = new CalendarDate(2026, 1, 10)
    expect(formatRange(start, end, fmt)).toBe('20/12/2025 – 10/01/2026')
  })

  it('formats a single-day range', () => {
    const date = new CalendarDate(2025, 6, 15)
    expect(formatRange(date, date, fmt)).toBe('15/06/2025 – 15/06/2025')
  })

  it('works with ISO format', () => {
    const start = new CalendarDate(2025, 6, 1)
    const end = new CalendarDate(2025, 6, 30)
    expect(formatRange(start, end, 'YYYY-MM-DD')).toBe('2025-06-01 – 2025-06-30')
  })

  it('works with non-padded format', () => {
    const start = new CalendarDate(2025, 3, 1)
    const end = new CalendarDate(2025, 3, 7)
    expect(formatRange(start, end, 'D/M/YYYY')).toBe('1/3/2025 – 7/3/2025')
  })
})

// ---------------------------------------------------------------------------
// formatMultiple
// ---------------------------------------------------------------------------

describe('formatMultiple', () => {
  const fmt = 'DD/MM/YYYY'

  it('returns empty string for empty array', () => {
    expect(formatMultiple([], fmt)).toBe('')
  })

  it('formats a single date', () => {
    const dates = [new CalendarDate(2025, 6, 15)]
    expect(formatMultiple(dates, fmt)).toBe('15/06/2025')
  })

  it('formats multiple dates comma-separated', () => {
    const dates = [
      new CalendarDate(2025, 6, 1),
      new CalendarDate(2025, 6, 15),
      new CalendarDate(2025, 6, 20),
    ]
    expect(formatMultiple(dates, fmt)).toBe('01/06/2025, 15/06/2025, 20/06/2025')
  })

  it('returns count string when dates exceed maxDisplay', () => {
    const dates = [
      new CalendarDate(2025, 6, 1),
      new CalendarDate(2025, 6, 15),
      new CalendarDate(2025, 6, 20),
    ]
    expect(formatMultiple(dates, fmt, 2)).toBe('3 dates selected')
  })

  it('shows dates when count equals maxDisplay', () => {
    const dates = [
      new CalendarDate(2025, 6, 1),
      new CalendarDate(2025, 6, 15),
    ]
    expect(formatMultiple(dates, fmt, 2)).toBe('01/06/2025, 15/06/2025')
  })

  it('shows count when dates exceed maxDisplay of 0', () => {
    const dates = [new CalendarDate(2025, 6, 15)]
    expect(formatMultiple(dates, fmt, 0)).toBe('1 dates selected')
  })

  it('works with ISO format', () => {
    const dates = [
      new CalendarDate(2025, 6, 1),
      new CalendarDate(2025, 6, 15),
    ]
    expect(formatMultiple(dates, 'YYYY-MM-DD')).toBe('2025-06-01, 2025-06-15')
  })

  it('works with maxDisplay undefined (no limit)', () => {
    const dates = [
      new CalendarDate(2025, 1, 1),
      new CalendarDate(2025, 2, 1),
      new CalendarDate(2025, 3, 1),
      new CalendarDate(2025, 4, 1),
      new CalendarDate(2025, 5, 1),
    ]
    expect(formatMultiple(dates, fmt)).toBe(
      '01/01/2025, 01/02/2025, 01/03/2025, 01/04/2025, 01/05/2025',
    )
  })
})
