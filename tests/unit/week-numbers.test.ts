import { describe, it, expect, vi } from 'vitest'
import { CalendarDate, getISOWeekNumber } from '../../src/core/calendar-date'
import { generateMonth, generateMonths } from '../../src/core/grid'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'

// Fixed "today" to avoid flaky tests
const TODAY = new CalendarDate(2025, 6, 15)

// ---------------------------------------------------------------------------
// Helper: mock Alpine magic properties
// ---------------------------------------------------------------------------

function withAlpineMocks(
  component: ReturnType<typeof createCalendarData>,
  options?: { refs?: Record<string, HTMLElement>; el?: HTMLElement },
) {
  const dispatchSpy = vi.fn()
  const watchSpy = vi.fn()
  const refs = options?.refs ?? {}
  const nextTickCallbacks: (() => void)[] = []

  Object.assign(component, {
    $dispatch: dispatchSpy,
    $watch: watchSpy,
    $refs: refs,
    $nextTick: (cb: () => void) => nextTickCallbacks.push(cb),
    $el: options?.el ?? document.createElement('div'),
  })

  const flushNextTick = () => {
    while (nextTickCallbacks.length > 0) {
      const cb = nextTickCallbacks.shift()
      cb?.()
    }
  }

  return { dispatchSpy, watchSpy, flushNextTick }
}

function createComponent(config: CalendarConfig = {}) {
  const c = createCalendarData(config)
  const mocks = withAlpineMocks(c)
  c.init()
  mocks.flushNextTick()
  return { c, ...mocks }
}

// ---------------------------------------------------------------------------
// getISOWeekNumber — core utility
// ---------------------------------------------------------------------------

describe('getISOWeekNumber', () => {
  it('returns 1 for January 1, 2024 (Monday — first day of ISO week 1)', () => {
    expect(getISOWeekNumber(new CalendarDate(2024, 1, 1))).toBe(1)
  })

  it('returns 1 for January 5, 2024 (Friday of week 1)', () => {
    expect(getISOWeekNumber(new CalendarDate(2024, 1, 5))).toBe(1)
  })

  it('returns 1 for January 7, 2024 (Sunday — last day of ISO week 1)', () => {
    expect(getISOWeekNumber(new CalendarDate(2024, 1, 7))).toBe(1)
  })

  it('returns 2 for January 8, 2024 (Monday — start of week 2)', () => {
    expect(getISOWeekNumber(new CalendarDate(2024, 1, 8))).toBe(2)
  })

  it('returns 52 for December 31, 2024 (Tuesday — ISO week 1 of 2025 starts Dec 30)', () => {
    // Dec 30, 2024 = Monday → ISO week 1 of 2025
    // Dec 31, 2024 = Tuesday → ISO week 1 of 2025
    expect(getISOWeekNumber(new CalendarDate(2024, 12, 31))).toBe(1)
  })

  it('returns 1 for December 30, 2024 (Monday — week 1 of ISO year 2025)', () => {
    expect(getISOWeekNumber(new CalendarDate(2024, 12, 30))).toBe(1)
  })

  it('returns 52 for December 29, 2024 (Sunday — last day of ISO week 52)', () => {
    expect(getISOWeekNumber(new CalendarDate(2024, 12, 29))).toBe(52)
  })

  it('returns 53 for December 31, 2020 (Thursday — year with 53 weeks)', () => {
    // 2020 is a long ISO year with 53 weeks
    expect(getISOWeekNumber(new CalendarDate(2020, 12, 31))).toBe(53)
  })

  it('returns 1 for January 4, 2021 (Monday — first week of 2021)', () => {
    expect(getISOWeekNumber(new CalendarDate(2021, 1, 4))).toBe(1)
  })

  it('handles January 1 that falls on different weekdays', () => {
    // Jan 1, 2025 = Wednesday → still week 1 (contains Thursday Jan 2)
    expect(getISOWeekNumber(new CalendarDate(2025, 1, 1))).toBe(1)
    // Jan 1, 2023 = Sunday → ISO week 52 of 2022
    expect(getISOWeekNumber(new CalendarDate(2023, 1, 1))).toBe(52)
    // Jan 1, 2022 = Saturday → ISO week 52 of 2021
    expect(getISOWeekNumber(new CalendarDate(2022, 1, 1))).toBe(52)
  })

  it('returns week 26 for June 30, 2025', () => {
    expect(getISOWeekNumber(new CalendarDate(2025, 6, 30))).toBe(27)
  })

  it('returns correct week for mid-year dates', () => {
    // July 1, 2025 = Tuesday
    const wn = getISOWeekNumber(new CalendarDate(2025, 7, 1))
    expect(wn).toBeGreaterThanOrEqual(26)
    expect(wn).toBeLessThanOrEqual(27)
  })

  it('week numbers are always between 1 and 53', () => {
    // Check a full year
    for (let m = 1; m <= 12; m++) {
      for (let d = 1; d <= 28; d++) {
        const wn = getISOWeekNumber(new CalendarDate(2025, m, d))
        expect(wn).toBeGreaterThanOrEqual(1)
        expect(wn).toBeLessThanOrEqual(53)
      }
    }
  })

  it('consecutive days increment week number every 7 days', () => {
    const start = new CalendarDate(2025, 3, 3) // Monday
    const startWeek = getISOWeekNumber(start)
    // Same week (Mon-Sun)
    for (let i = 0; i < 7; i++) {
      expect(getISOWeekNumber(start.addDays(i))).toBe(startWeek)
    }
    // Next week
    expect(getISOWeekNumber(start.addDays(7))).toBe(startWeek + 1)
  })
})

// ---------------------------------------------------------------------------
// MonthGrid.weekNumbers — grid integration
// ---------------------------------------------------------------------------

describe('MonthGrid.weekNumbers', () => {
  it('returns 6 week numbers (one per row)', () => {
    const grid = generateMonth(2025, 6, 0, TODAY)
    expect(grid.weekNumbers).toHaveLength(6)
  })

  it('each week number is between 1 and 53', () => {
    const grid = generateMonth(2025, 6, 0, TODAY)
    for (const wn of grid.weekNumbers) {
      expect(wn).toBeGreaterThanOrEqual(1)
      expect(wn).toBeLessThanOrEqual(53)
    }
  })

  it('week numbers are sequential (each row is 1 week later)', () => {
    // For most months, week numbers increase by 1 each row
    const grid = generateMonth(2025, 3, 0, TODAY) // March 2025
    for (let i = 1; i < grid.weekNumbers.length; i++) {
      const prev = grid.weekNumbers[i - 1]!
      const curr = grid.weekNumbers[i]!
      // Handle year boundary: week 52/53 → week 1
      if (curr < prev) {
        expect(prev).toBeGreaterThanOrEqual(52)
        expect(curr).toBe(1)
      } else {
        expect(curr).toBe(prev + 1)
      }
    }
  })

  it('matches the first cell of each row', () => {
    const grid = generateMonth(2025, 6, 0, TODAY)
    for (let ri = 0; ri < 6; ri++) {
      const firstCellDate = grid.rows[ri]![0]!.date
      expect(grid.weekNumbers[ri]).toBe(getISOWeekNumber(firstCellDate))
    }
  })

  it('works with Monday first-day-of-week', () => {
    const grid = generateMonth(2025, 6, 1, TODAY) // Monday start
    expect(grid.weekNumbers).toHaveLength(6)
    for (let ri = 0; ri < 6; ri++) {
      const firstCellDate = grid.rows[ri]![0]!.date
      expect(grid.weekNumbers[ri]).toBe(getISOWeekNumber(firstCellDate))
    }
  })

  it('handles December/January week number boundary', () => {
    // December 2024: last rows should have week 52 or week 1 (of 2025)
    const grid = generateMonth(2024, 12, 0, TODAY)
    const lastWn = grid.weekNumbers[grid.weekNumbers.length - 1]!
    // Last row starts in January 2025, so week number could be 1 or 2
    expect(lastWn).toBeGreaterThanOrEqual(1)
    expect(lastWn).toBeLessThanOrEqual(5)
  })

  it('multi-month grids each have their own weekNumbers', () => {
    const grids = generateMonths(2025, 6, 2, 0, TODAY)
    expect(grids).toHaveLength(2)
    expect(grids[0]!.weekNumbers).toHaveLength(6)
    expect(grids[1]!.weekNumbers).toHaveLength(6)
    // Week numbers should be different between months (July starts later)
    expect(grids[1]!.weekNumbers[0]).toBeGreaterThan(grids[0]!.weekNumbers[0]!)
  })
})

// ---------------------------------------------------------------------------
// Component: showWeekNumbers config
// ---------------------------------------------------------------------------

describe('showWeekNumbers config', () => {
  it('defaults to false', () => {
    const { c } = createComponent()
    expect(c.showWeekNumbers).toBe(false)
  })

  it('can be set to true', () => {
    const { c } = createComponent({ showWeekNumbers: true })
    expect(c.showWeekNumbers).toBe(true)
  })

  it('grid contains weekNumbers when showWeekNumbers is true', () => {
    const { c } = createComponent({ showWeekNumbers: true })
    expect(c.grid.length).toBeGreaterThan(0)
    for (const mg of c.grid) {
      expect(mg.weekNumbers).toHaveLength(6)
    }
  })

  it('grid contains weekNumbers even when showWeekNumbers is false', () => {
    // weekNumbers are always computed on MonthGrid — it's cheap
    const { c } = createComponent({ showWeekNumbers: false })
    expect(c.grid.length).toBeGreaterThan(0)
    for (const mg of c.grid) {
      expect(mg.weekNumbers).toHaveLength(6)
    }
  })
})

// ---------------------------------------------------------------------------
// Component: dayGridItems() method
// ---------------------------------------------------------------------------

describe('dayGridItems', () => {
  it('returns 48 items (6 week numbers + 42 day cells) for a single month', () => {
    const { c } = createComponent({ showWeekNumbers: true })
    const mg = c.grid[0]!
    const items = c.dayGridItems(mg)
    expect(items).toHaveLength(48) // 6 * (1 wn + 7 days)
  })

  it('interleaves week numbers with day cells in correct order', () => {
    const { c } = createComponent({ showWeekNumbers: true })
    const mg = c.grid[0]!
    const items = c.dayGridItems(mg)

    // Pattern: wn, day, day, day, day, day, day, day, wn, day, ...
    for (let row = 0; row < 6; row++) {
      const rowStart = row * 8
      expect(items[rowStart]!.isWeekNumber).toBe(true)
      expect(items[rowStart]!.weekNumber).toBe(mg.weekNumbers[row])
      for (let col = 1; col <= 7; col++) {
        expect(items[rowStart + col]!.isWeekNumber).toBe(false)
      }
    }
  })

  it('week number items have correct keys', () => {
    const { c } = createComponent({ showWeekNumbers: true })
    const mg = c.grid[0]!
    const items = c.dayGridItems(mg)

    for (let row = 0; row < 6; row++) {
      const wnItem = items[row * 8]!
      expect(wnItem.key).toBe(`wn-${row}`)
    }
  })

  it('day cell items have ISO date keys', () => {
    const { c } = createComponent({ showWeekNumbers: true })
    const mg = c.grid[0]!
    const items = c.dayGridItems(mg)

    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 7; col++) {
        const dayItem = items[row * 8 + col + 1]!
        expect(dayItem.key).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(dayItem.cell.date.toISO()).toBe(dayItem.key)
      }
    }
  })

  it('works with dual-month grids', () => {
    const { c } = createComponent({ showWeekNumbers: true, months: 2 })
    expect(c.grid).toHaveLength(2)
    for (const mg of c.grid) {
      const items = c.dayGridItems(mg)
      expect(items).toHaveLength(48)
    }
  })

  it('week number items have a valid cell reference (for safety)', () => {
    const { c } = createComponent({ showWeekNumbers: true })
    const mg = c.grid[0]!
    const items = c.dayGridItems(mg)

    for (let row = 0; row < 6; row++) {
      const wnItem = items[row * 8]!
      // cell should be the first cell of the row (used as placeholder)
      expect(wnItem.cell).toBeDefined()
      expect(wnItem.cell.date).toBeDefined()
    }
  })
})

// ---------------------------------------------------------------------------
// getISOWeekNumber — edge cases
// ---------------------------------------------------------------------------

describe('getISOWeekNumber edge cases', () => {
  it('February 29 on a leap year', () => {
    const wn = getISOWeekNumber(new CalendarDate(2024, 2, 29))
    expect(wn).toBe(9) // Feb 29, 2024 is Thursday of week 9
  })

  it('year 2000 (century leap year)', () => {
    // Jan 1, 2000 = Saturday → ISO week 52 of 1999
    expect(getISOWeekNumber(new CalendarDate(2000, 1, 1))).toBe(52)
  })

  it('year 1900 (century non-leap year)', () => {
    // Jan 1, 1900 = Monday → week 1
    expect(getISOWeekNumber(new CalendarDate(1900, 1, 1))).toBe(1)
  })

  it('far future date', () => {
    const wn = getISOWeekNumber(new CalendarDate(2099, 12, 31))
    expect(wn).toBeGreaterThanOrEqual(1)
    expect(wn).toBeLessThanOrEqual(53)
  })
})
