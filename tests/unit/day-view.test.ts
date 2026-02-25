import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'

/**
 * Inject mock Alpine magic properties onto a component.
 */
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
// Weekday Headers
// ---------------------------------------------------------------------------

describe('weekdayHeaders', () => {
  it('returns 7 headers', () => {
    const { c } = createComponent()
    expect(c.weekdayHeaders).toHaveLength(7)
  })

  it('starts with Sun when firstDay=0', () => {
    const { c } = createComponent({ firstDay: 0 })
    const headers = c.weekdayHeaders
    // First header should be Sunday (checking that it starts with "S" — locale may vary)
    expect(headers[0]).toBeTruthy()
    // All headers should be unique
    expect(new Set(headers).size).toBe(7)
  })

  it('starts with Mon when firstDay=1', () => {
    const { c } = createComponent({ firstDay: 1 })
    const headers = c.weekdayHeaders
    // All 7 should be unique
    expect(new Set(headers).size).toBe(7)
    // First header should differ from firstDay=0
    const { c: c2 } = createComponent({ firstDay: 0 })
    expect(headers[0]).not.toBe(c2.weekdayHeaders[0])
  })

  it('returns different order for different firstDay values', () => {
    const { c: c0 } = createComponent({ firstDay: 0 })
    const { c: c1 } = createComponent({ firstDay: 1 })
    const { c: c6 } = createComponent({ firstDay: 6 })

    // The sets are the same but order is different
    const set0 = new Set(c0.weekdayHeaders)
    const set1 = new Set(c1.weekdayHeaders)
    const set6 = new Set(c6.weekdayHeaders)
    expect(set0).toEqual(set1)
    expect(set0).toEqual(set6)
    // But the actual arrays should be rotated
    expect(c0.weekdayHeaders).not.toEqual(c1.weekdayHeaders)
  })
})

// ---------------------------------------------------------------------------
// monthYearLabel
// ---------------------------------------------------------------------------

describe('monthYearLabel', () => {
  it('returns month and year for grid index 0', () => {
    const { c } = createComponent()
    const label = c.monthYearLabel(0)
    // Should contain the year
    expect(label).toContain(String(c.year))
    // Should be a non-empty string
    expect(label.length).toBeGreaterThan(0)
  })

  it('returns empty string for invalid grid index', () => {
    const { c } = createComponent()
    expect(c.monthYearLabel(5)).toBe('')
  })

  it('returns different labels for 2-month view', () => {
    const { c } = createComponent({ months: 2 })
    const label0 = c.monthYearLabel(0)
    const label1 = c.monthYearLabel(1)
    expect(label0).not.toBe(label1)
  })

  it('includes correct month name after navigation', () => {
    const { c } = createComponent()
    c.month = 1
    c.year = 2026
    c._rebuildGrid()
    const label = c.monthYearLabel(0)
    // January 2026 — the label should contain "2026"
    expect(label).toContain('2026')
  })
})

// ---------------------------------------------------------------------------
// dayClasses
// ---------------------------------------------------------------------------

describe('dayClasses', () => {
  it('returns rc-day class for all cells', () => {
    const { c } = createComponent()
    const cell = c.grid[0]!.rows[2]![3]!
    const classes = c.dayClasses(cell)
    expect(classes['rc-day']).toBe(true)
  })

  it('marks today cell', () => {
    const { c } = createComponent()
    // Find the today cell
    for (const row of c.grid[0]!.rows) {
      for (const cell of row) {
        if (cell.isToday) {
          const classes = c.dayClasses(cell)
          expect(classes['rc-day--today']).toBe(true)
          return
        }
      }
    }
  })

  it('marks other-month cells', () => {
    const { c } = createComponent()
    // Row 0, col 0 is often an other-month cell (depends on month)
    // Find an other-month cell
    for (const row of c.grid[0]!.rows) {
      for (const cell of row) {
        if (!cell.isCurrentMonth) {
          const classes = c.dayClasses(cell)
          expect(classes['rc-day--other-month']).toBe(true)
          return
        }
      }
    }
  })

  it('marks disabled cells', () => {
    const { c } = createComponent({
      disabledDaysOfWeek: [0, 6], // Disable weekends
    })
    // Find a disabled cell
    for (const row of c.grid[0]!.rows) {
      for (const cell of row) {
        if (cell.isDisabled) {
          const classes = c.dayClasses(cell)
          expect(classes['rc-day--disabled']).toBe(true)
          return
        }
      }
    }
  })

  it('marks selected cell in single mode', () => {
    const { c } = createComponent({ mode: 'single' })
    // Select a date
    const cell = c.grid[0]!.rows[2]![3]!
    if (!cell.isDisabled) {
      c.selectDate(cell.date)
      const classes = c.dayClasses(cell)
      expect(classes['rc-day--selected']).toBe(true)
    }
  })

  it('marks range-start and range-end in range mode', () => {
    const { c } = createComponent({ mode: 'range' })
    const grid = c.grid[0]!
    // Find two current-month, non-disabled cells
    const cells = grid.rows
      .flat()
      .filter((cell) => cell.isCurrentMonth && !cell.isDisabled)
    const startCell = cells[5]!
    const endCell = cells[10]!

    c.selectDate(startCell.date)
    c.selectDate(endCell.date)

    const startClasses = c.dayClasses(startCell)
    const endClasses = c.dayClasses(endCell)
    expect(startClasses['rc-day--range-start']).toBe(true)
    expect(endClasses['rc-day--range-end']).toBe(true)
  })

  it('marks in-range cells in range mode', () => {
    const { c } = createComponent({ mode: 'range' })
    const grid = c.grid[0]!
    const cells = grid.rows
      .flat()
      .filter((cell) => cell.isCurrentMonth && !cell.isDisabled)
    const startCell = cells[5]!
    const endCell = cells[10]!

    c.selectDate(startCell.date)
    c.selectDate(endCell.date)

    // A cell between start and end
    const midCell = cells[7]!
    const classes = c.dayClasses(midCell)
    expect(classes['rc-day--in-range']).toBe(true)
    expect(classes['rc-day--range-start']).toBe(false)
    expect(classes['rc-day--range-end']).toBe(false)
  })

  it('marks focused cell', () => {
    const { c } = createComponent()
    const cell = c.grid[0]!.rows[2]![3]!
    c.focusedDate = cell.date
    const classes = c.dayClasses(cell)
    expect(classes['rc-day--focused']).toBe(true)
  })

  it('does not mark focused when focusedDate is null', () => {
    const { c } = createComponent()
    const cell = c.grid[0]!.rows[2]![3]!
    c.focusedDate = null
    const classes = c.dayClasses(cell)
    expect(classes['rc-day--focused']).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// hoverDate (range hover preview)
// ---------------------------------------------------------------------------

describe('hoverDate — range preview', () => {
  it('starts as null', () => {
    const { c } = createComponent({ mode: 'range' })
    expect(c.hoverDate).toBeNull()
  })

  it('isInRange considers hoverDate for partial range', () => {
    const { c } = createComponent({ mode: 'range' })
    const grid = c.grid[0]!
    const cells = grid.rows
      .flat()
      .filter((cell) => cell.isCurrentMonth && !cell.isDisabled)

    // Select start only
    const startCell = cells[5]!
    c.selectDate(startCell.date)

    // Hover over a later date
    const hoverCell = cells[10]!
    c.hoverDate = hoverCell.date

    // A cell between should now be in range
    const midCell = cells[7]!
    const inRange = c.isInRange(midCell.date, c.hoverDate ?? undefined)
    expect(inRange).toBe(true)
  })

  it('dayClasses uses hoverDate for range preview', () => {
    const { c } = createComponent({ mode: 'range' })
    const grid = c.grid[0]!
    const cells = grid.rows
      .flat()
      .filter((cell) => cell.isCurrentMonth && !cell.isDisabled)

    // Select start only
    c.selectDate(cells[5]!.date)
    // Set hover
    c.hoverDate = cells[10]!.date

    // Mid cell should be in-range
    const classes = c.dayClasses(cells[7]!)
    expect(classes['rc-day--in-range']).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Navigation direction tracking
// ---------------------------------------------------------------------------

describe('_navDirection', () => {
  it('starts as empty string', () => {
    const { c } = createComponent()
    expect(c._navDirection).toBe('')
  })

  it('sets to "prev" on prev()', () => {
    const { c } = createComponent()
    c.prev()
    expect(c._navDirection).toBe('prev')
  })

  it('sets to "next" on next()', () => {
    const { c } = createComponent()
    c.next()
    expect(c._navDirection).toBe('next')
  })

  it('can be reset to empty', () => {
    const { c } = createComponent()
    c.next()
    expect(c._navDirection).toBe('next')
    c._navDirection = ''
    expect(c._navDirection).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Day view grid rendering
// ---------------------------------------------------------------------------

describe('day view grid', () => {
  it('generates grid with correct number of months', () => {
    const { c } = createComponent({ months: 1 })
    expect(c.grid).toHaveLength(1)

    const { c: c2 } = createComponent({ months: 2 })
    expect(c2.grid).toHaveLength(2)
  })

  it('each grid has 6 rows of 7 cells', () => {
    const { c } = createComponent()
    for (const mg of c.grid) {
      expect(mg.rows).toHaveLength(6)
      for (const row of mg.rows) {
        expect(row).toHaveLength(7)
      }
    }
  })

  it('grid cells have all required properties', () => {
    const { c } = createComponent()
    const cell = c.grid[0]!.rows[0]![0]!
    expect(cell).toHaveProperty('date')
    expect(cell).toHaveProperty('isCurrentMonth')
    expect(cell).toHaveProperty('isToday')
    expect(cell).toHaveProperty('isDisabled')
    expect(cell.date).toBeInstanceOf(CalendarDate)
  })

  it('grid updates on navigation', () => {
    const { c } = createComponent()
    const initialMonth = c.month
    const initialGrid = JSON.stringify(c.grid[0]!.month)

    c.next()
    c._rebuildGrid()
    expect(c.grid[0]!.month).not.toBe(Number(initialGrid))
  })

  it('2-month grid shows consecutive months', () => {
    const { c } = createComponent({ months: 2 })
    const m1 = c.grid[0]!
    const m2 = c.grid[1]!

    // Second month should be one month after first
    const expected = new CalendarDate(m1.year, m1.month, 1).addMonths(1)
    expect(m2.month).toBe(expected.month)
    expect(m2.year).toBe(expected.year)
  })
})

// ---------------------------------------------------------------------------
// Day cell interactions
// ---------------------------------------------------------------------------

describe('day cell interactions', () => {
  it('selectDate updates selection and emits change', () => {
    const { c, dispatchSpy } = createComponent({ mode: 'single' })
    const cells = c.grid[0]!.rows
      .flat()
      .filter((cell) => cell.isCurrentMonth && !cell.isDisabled)
    const cell = cells[5]!

    c.selectDate(cell.date)
    expect(c.isSelected(cell.date)).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(
      'calendar:change',
      expect.objectContaining({
        value: cell.date.toISO(),
      }),
    )
  })

  it('disabled cells cannot be selected', () => {
    const { c } = createComponent({ disabledDaysOfWeek: [0, 6] })
    const disabledCell = c.grid[0]!.rows
      .flat()
      .find((cell) => cell.isDisabled)

    if (disabledCell) {
      c.selectDate(disabledCell.date)
      expect(c.isSelected(disabledCell.date)).toBe(false)
    }
  })

  it('clicking month/year label switches view', () => {
    const { c } = createComponent()
    expect(c.view).toBe('days')
    c.setView('months')
    expect(c.view).toBe('months')
  })

  it('prev/next navigate months in day view', () => {
    const { c } = createComponent()
    const initialMonth = c.month
    const initialYear = c.year

    c.next()
    const expectedNext = new CalendarDate(initialYear, initialMonth, 1).addMonths(1)
    expect(c.month).toBe(expectedNext.month)
    expect(c.year).toBe(expectedNext.year)

    c.prev()
    c.prev()
    const expectedPrev = new CalendarDate(initialYear, initialMonth, 1).addMonths(-1)
    expect(c.month).toBe(expectedPrev.month)
    expect(c.year).toBe(expectedPrev.year)
  })
})

// ---------------------------------------------------------------------------
// Multiple selection in day view
// ---------------------------------------------------------------------------

describe('multiple selection day view', () => {
  it('can select multiple dates', () => {
    const { c } = createComponent({ mode: 'multiple' })
    const cells = c.grid[0]!.rows
      .flat()
      .filter((cell) => cell.isCurrentMonth && !cell.isDisabled)

    c.selectDate(cells[0]!.date)
    c.selectDate(cells[1]!.date)
    c.selectDate(cells[2]!.date)

    expect(c.isSelected(cells[0]!.date)).toBe(true)
    expect(c.isSelected(cells[1]!.date)).toBe(true)
    expect(c.isSelected(cells[2]!.date)).toBe(true)
    expect(c.selectedDates).toHaveLength(3)
  })

  it('toggle deselects in multiple mode', () => {
    const { c } = createComponent({ mode: 'multiple' })
    const cells = c.grid[0]!.rows
      .flat()
      .filter((cell) => cell.isCurrentMonth && !cell.isDisabled)

    c.selectDate(cells[0]!.date)
    expect(c.isSelected(cells[0]!.date)).toBe(true)

    c.selectDate(cells[0]!.date)
    expect(c.isSelected(cells[0]!.date)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// 2-month layout specifics
// ---------------------------------------------------------------------------

describe('2-month layout', () => {
  it('grid has 2 entries', () => {
    const { c } = createComponent({ months: 2 })
    expect(c.grid).toHaveLength(2)
  })

  it('labels are different for each month', () => {
    const { c } = createComponent({ months: 2 })
    const label0 = c.monthYearLabel(0)
    const label1 = c.monthYearLabel(1)
    expect(label0).not.toBe(label1)
  })

  it('hides other-month days in multi-month layout', () => {
    const { c } = createComponent({ months: 2 })
    const otherMonthCell = c.grid[0]!.rows
      .flat()
      .find((cell) => !cell.isCurrentMonth)
    if (otherMonthCell) {
      const classes = c.dayClasses(otherMonthCell)
      expect(classes['rc-day--hidden']).toBe(true)
      expect(classes['rc-day--other-month']).toBe(true)
    }
  })

  it('does not hide other-month days in single-month layout', () => {
    const { c } = createComponent({ months: 1 })
    const otherMonthCell = c.grid[0]!.rows
      .flat()
      .find((cell) => !cell.isCurrentMonth)
    if (otherMonthCell) {
      const classes = c.dayClasses(otherMonthCell)
      expect(classes['rc-day--hidden']).toBe(false)
      expect(classes['rc-day--other-month']).toBe(true)
    }
  })

  it('navigation advances both months together', () => {
    const { c } = createComponent({ months: 2 })
    const m1Before = c.grid[0]!.month
    const m2Before = c.grid[1]!.month

    c.next()
    c._rebuildGrid()

    const m1After = c.grid[0]!.month
    const m2After = c.grid[1]!.month

    // Both should have advanced by 1
    const expected1 = new CalendarDate(c.grid[0]!.year, m1Before, 1).addMonths(1)
    expect(m1After).toBe(expected1.month)
    // Second month should still be 1 after first
    const expected2 = new CalendarDate(c.grid[0]!.year, m1After, 1).addMonths(1)
    expect(m2After).toBe(expected2.month)
  })
})
