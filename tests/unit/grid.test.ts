import { describe, it, expect } from 'vitest'
import { generateMonth, generateMonths } from '../../src/core/grid'
import { CalendarDate } from '../../src/core/calendar-date'

// Fixed "today" to avoid flaky tests
const TODAY = new CalendarDate(2025, 6, 15)

describe('generateMonth()', () => {
  describe('grid dimensions', () => {
    it('always returns 6 rows × 7 cols', () => {
      const grid = generateMonth(2025, 6, 0, TODAY)
      expect(grid.rows).toHaveLength(6)
      for (const row of grid.rows) {
        expect(row).toHaveLength(7)
      }
    })

    it('returns correct year and month metadata', () => {
      const grid = generateMonth(2025, 6, 0, TODAY)
      expect(grid.year).toBe(2025)
      expect(grid.month).toBe(6)
    })
  })

  describe('firstDayOfWeek = 0 (Sunday)', () => {
    it('first cell of first row is a Sunday', () => {
      const grid = generateMonth(2025, 6, 0, TODAY)
      const firstCell = grid.rows[0]![0]!
      const dow = firstCell.date.toNativeDate().getDay()
      expect(dow).toBe(0) // Sunday
    })

    it('June 2025 starts on Sunday → first cell is June 1', () => {
      // June 1, 2025 is a Sunday
      const grid = generateMonth(2025, 6, 0, TODAY)
      const firstCell = grid.rows[0]![0]!
      expect(firstCell.date.toISO()).toBe('2025-06-01')
      expect(firstCell.isCurrentMonth).toBe(true)
    })

    it('includes leading days from previous month when needed', () => {
      // March 2025: March 1 is Saturday → need 6 leading days (Sun-Fri from Feb)
      const grid = generateMonth(2025, 3, 0, TODAY)
      const firstCell = grid.rows[0]![0]!
      expect(firstCell.date.toISO()).toBe('2025-02-23')
      expect(firstCell.isCurrentMonth).toBe(false)
    })

    it('includes trailing days from next month', () => {
      // June 2025 has 30 days, starts on Sunday → last June day is row 4 col 0 (June 30, Mon)
      // Actually: June 30 is Monday. Grid continues to fill rows 4 and 5.
      const grid = generateMonth(2025, 6, 0, TODAY)
      const lastRow = grid.rows[5]!
      // Row 5 should have July dates
      for (const cell of lastRow) {
        expect(cell.date.month).toBe(7)
        expect(cell.isCurrentMonth).toBe(false)
      }
    })
  })

  describe('firstDayOfWeek = 1 (Monday)', () => {
    it('first cell of first row is a Monday', () => {
      const grid = generateMonth(2025, 6, 1, TODAY)
      const firstCell = grid.rows[0]![0]!
      const dow = firstCell.date.toNativeDate().getDay()
      expect(dow).toBe(1) // Monday
    })

    it('June 2025 with Monday start → first cell is May 26', () => {
      // June 1, 2025 is Sunday → need 6 leading days (Mon May 26 - Sat May 31)
      const grid = generateMonth(2025, 6, 1, TODAY)
      const firstCell = grid.rows[0]![0]!
      expect(firstCell.date.toISO()).toBe('2025-05-26')
      expect(firstCell.isCurrentMonth).toBe(false)
    })

    it('last column (index 6) is always Sunday', () => {
      const grid = generateMonth(2025, 6, 1, TODAY)
      for (const row of grid.rows) {
        const lastCell = row[6]!
        expect(lastCell.date.toNativeDate().getDay()).toBe(0)
      }
    })
  })

  describe('firstDayOfWeek = 6 (Saturday)', () => {
    it('first cell of first row is a Saturday', () => {
      const grid = generateMonth(2025, 6, 6, TODAY)
      const firstCell = grid.rows[0]![0]!
      const dow = firstCell.date.toNativeDate().getDay()
      expect(dow).toBe(6) // Saturday
    })
  })

  describe('isCurrentMonth flag', () => {
    it('marks days in the target month as current', () => {
      const grid = generateMonth(2025, 6, 0, TODAY)
      let currentMonthCount = 0
      for (const row of grid.rows) {
        for (const cell of row) {
          if (cell.isCurrentMonth) {
            expect(cell.date.month).toBe(6)
            expect(cell.date.year).toBe(2025)
            currentMonthCount++
          }
        }
      }
      // June has 30 days
      expect(currentMonthCount).toBe(30)
    })

    it('marks leading/trailing days as not current month', () => {
      const grid = generateMonth(2025, 3, 0, TODAY)
      const firstCell = grid.rows[0]![0]!
      expect(firstCell.isCurrentMonth).toBe(false) // February day
    })
  })

  describe('isToday flag', () => {
    it('marks the correct day as today', () => {
      const grid = generateMonth(2025, 6, 0, TODAY) // TODAY = June 15
      let todayCount = 0
      let todayCell = null
      for (const row of grid.rows) {
        for (const cell of row) {
          if (cell.isToday) {
            todayCount++
            todayCell = cell
          }
        }
      }
      expect(todayCount).toBe(1)
      expect(todayCell!.date.toISO()).toBe('2025-06-15')
    })

    it('no day is marked as today when today is in a different month', () => {
      const grid = generateMonth(2025, 1, 0, TODAY) // TODAY is June, viewing January
      let todayCount = 0
      for (const row of grid.rows) {
        for (const cell of row) {
          if (cell.isToday) todayCount++
        }
      }
      expect(todayCount).toBe(0)
    })
  })

  describe('isDisabled callback', () => {
    it('marks weekends as disabled when callback provided', () => {
      const disableWeekends = (date: CalendarDate) => {
        const dow = date.toNativeDate().getDay()
        return dow === 0 || dow === 6
      }
      const grid = generateMonth(2025, 6, 0, TODAY, disableWeekends)

      for (const row of grid.rows) {
        // Column 0 = Sunday (with firstDayOfWeek=0), Column 6 = Saturday
        expect(row[0]!.isDisabled).toBe(true)
        expect(row[6]!.isDisabled).toBe(true)
        // Weekdays should not be disabled
        expect(row[1]!.isDisabled).toBe(false)
        expect(row[5]!.isDisabled).toBe(false)
      }
    })

    it('defaults to no disabled days', () => {
      const grid = generateMonth(2025, 6, 0, TODAY)
      for (const row of grid.rows) {
        for (const cell of row) {
          expect(cell.isDisabled).toBe(false)
        }
      }
    })
  })

  describe('edge cases', () => {
    it('February 2024 (leap year)', () => {
      const grid = generateMonth(2024, 2, 0, TODAY)
      let febDays = 0
      for (const row of grid.rows) {
        for (const cell of row) {
          if (cell.isCurrentMonth) febDays++
        }
      }
      expect(febDays).toBe(29)
    })

    it('February 2025 (non-leap year)', () => {
      const grid = generateMonth(2025, 2, 0, TODAY)
      let febDays = 0
      for (const row of grid.rows) {
        for (const cell of row) {
          if (cell.isCurrentMonth) febDays++
        }
      }
      expect(febDays).toBe(28)
    })

    it('January 2025 (month that starts on Wednesday)', () => {
      // Jan 1, 2025 = Wednesday
      const grid = generateMonth(2025, 1, 0, TODAY)
      // With Sunday start, need 3 leading days (Sun Dec 29, Mon Dec 30, Tue Dec 31)
      expect(grid.rows[0]![0]!.date.toISO()).toBe('2024-12-29')
      expect(grid.rows[0]![3]!.date.toISO()).toBe('2025-01-01')
    })

    it('all 42 cells are sequential dates', () => {
      const grid = generateMonth(2025, 6, 0, TODAY)
      let prevDate = grid.rows[0]![0]!.date
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 7; col++) {
          if (row === 0 && col === 0) continue
          const cell = grid.rows[row]![col]!
          const expected = prevDate.addDays(1)
          expect(cell.date.toISO()).toBe(expected.toISO())
          prevDate = cell.date
        }
      }
    })
  })
})

describe('generateMonths()', () => {
  it('generates a single month', () => {
    const grids = generateMonths(2025, 6, 1, 0, TODAY)
    expect(grids).toHaveLength(1)
    expect(grids[0]!.year).toBe(2025)
    expect(grids[0]!.month).toBe(6)
  })

  it('generates two consecutive months', () => {
    const grids = generateMonths(2025, 6, 2, 0, TODAY)
    expect(grids).toHaveLength(2)
    expect(grids[0]!.year).toBe(2025)
    expect(grids[0]!.month).toBe(6)
    expect(grids[1]!.year).toBe(2025)
    expect(grids[1]!.month).toBe(7)
  })

  it('handles year rollover (November + 3 months)', () => {
    const grids = generateMonths(2025, 11, 3, 0, TODAY)
    expect(grids).toHaveLength(3)
    expect(grids[0]!.year).toBe(2025)
    expect(grids[0]!.month).toBe(11)
    expect(grids[1]!.year).toBe(2025)
    expect(grids[1]!.month).toBe(12)
    expect(grids[2]!.year).toBe(2026)
    expect(grids[2]!.month).toBe(1)
  })

  it('passes firstDayOfWeek through to each grid', () => {
    const grids = generateMonths(2025, 6, 2, 1, TODAY) // Monday start
    for (const grid of grids) {
      const firstCell = grid.rows[0]![0]!
      expect(firstCell.date.toNativeDate().getDay()).toBe(1) // Monday
    }
  })

  it('passes isDisabled callback through', () => {
    const alwaysDisabled = () => true
    const grids = generateMonths(2025, 6, 2, 0, TODAY, alwaysDisabled)
    for (const grid of grids) {
      for (const row of grid.rows) {
        for (const cell of row) {
          expect(cell.isDisabled).toBe(true)
        }
      }
    }
  })

  it('each generated grid has correct 6×7 dimensions', () => {
    const grids = generateMonths(2025, 1, 12, 0, TODAY) // All 12 months
    expect(grids).toHaveLength(12)
    for (const grid of grids) {
      expect(grid.rows).toHaveLength(6)
      for (const row of grid.rows) {
        expect(row).toHaveLength(7)
      }
    }
  })
})
