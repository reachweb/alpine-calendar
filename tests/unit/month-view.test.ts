import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { generateMonthGrid } from '../../src/core/grid'
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
// generateMonthGrid (core)
// ---------------------------------------------------------------------------

describe('generateMonthGrid', () => {
  it('returns a 3×4 grid (3 rows of 4 months)', () => {
    const grid = generateMonthGrid(2026)
    expect(grid).toHaveLength(3)
    for (const row of grid) {
      expect(row).toHaveLength(4)
    }
  })

  it('months go from 1 to 12 in order', () => {
    const grid = generateMonthGrid(2026)
    const months = grid.flat().map((c) => c.month)
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('all cells have the correct year', () => {
    const grid = generateMonthGrid(2025)
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.year).toBe(2025)
      }
    }
  })

  it('cells have non-empty labels', () => {
    const grid = generateMonthGrid(2026)
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.label.length).toBeGreaterThan(0)
      }
    }
  })

  it('marks the current month correctly', () => {
    const today = new CalendarDate(2026, 3, 15)
    const grid = generateMonthGrid(2026, today)
    const marchCell = grid[0]![2]! // Row 0, Col 2 = March (4-col layout)
    expect(marchCell.isCurrentMonth).toBe(true)

    // Other months should not be current
    const janCell = grid[0]![0]!
    expect(janCell.isCurrentMonth).toBe(false)
  })

  it('does not mark current month for a different year', () => {
    const today = new CalendarDate(2026, 3, 15)
    const grid = generateMonthGrid(2025, today)
    // No month in 2025 should be current if today is in 2026
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.isCurrentMonth).toBe(false)
      }
    }
  })

  it('all months enabled when no disabled callback', () => {
    const grid = generateMonthGrid(2026)
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.isDisabled).toBe(false)
      }
    }
  })

  it('respects isMonthDisabled callback', () => {
    const disabled = (year: number, month: number) => month > 6
    const grid = generateMonthGrid(2026, undefined, undefined, disabled)

    // Months 1-6 should be enabled
    for (let i = 0; i < 6; i++) {
      const row = Math.floor(i / 4)
      const col = i % 4
      expect(grid[row]![col]!.isDisabled).toBe(false)
    }

    // Months 7-12 should be disabled
    for (let i = 6; i < 12; i++) {
      const row = Math.floor(i / 4)
      const col = i % 4
      expect(grid[row]![col]!.isDisabled).toBe(true)
    }
  })

  it('labels are unique for all 12 months', () => {
    const grid = generateMonthGrid(2026)
    const labels = grid.flat().map((c) => c.label)
    expect(new Set(labels).size).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// Month view in calendar component
// ---------------------------------------------------------------------------

describe('month view — component integration', () => {
  it('starts in days view by default', () => {
    const { c } = createComponent()
    expect(c.view).toBe('days')
  })

  it('switching to months view works', () => {
    const { c } = createComponent()
    c.setView('months')
    expect(c.view).toBe('months')
  })

  it('monthGrid is populated on init', () => {
    const { c } = createComponent()
    expect(c.monthGrid).toHaveLength(3)
    for (const row of c.monthGrid) {
      expect(row).toHaveLength(4)
    }
  })

  it('monthGrid months go from 1 to 12', () => {
    const { c } = createComponent()
    const months = c.monthGrid.flat().map((cell) => cell.month)
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('yearLabel returns the current year as string', () => {
    const { c } = createComponent()
    expect(c.yearLabel).toBe(String(c.year))
  })

  it('selectMonth navigates to that month and switches to day view', () => {
    const { c } = createComponent()
    c.setView('months')
    c.selectMonth(7)
    expect(c.month).toBe(7)
    expect(c.view).toBe('days')
  })

  it('prev() in months view decrements year', () => {
    const { c } = createComponent()
    c.setView('months')
    const initialYear = c.year
    c.prev()
    expect(c.year).toBe(initialYear - 1)
  })

  it('next() in months view increments year', () => {
    const { c } = createComponent()
    c.setView('months')
    const initialYear = c.year
    c.next()
    expect(c.year).toBe(initialYear + 1)
  })

  it('monthGrid rebuilds when year changes', () => {
    const { c } = createComponent()
    const initialYear = c.monthGrid.flat()[0]!.year
    c.year = initialYear + 1
    c._rebuildMonthGrid()
    expect(c.monthGrid.flat()[0]!.year).toBe(initialYear + 1)
  })

  it('Escape in months view returns to days view', () => {
    const { c } = createComponent()
    c.setView('months')
    expect(c.view).toBe('months')

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
    Object.defineProperty(event, 'stopPropagation', { value: vi.fn() })
    c.handleKeydown(event)

    expect(c.view).toBe('days')
  })
})

// ---------------------------------------------------------------------------
// monthClasses
// ---------------------------------------------------------------------------

describe('monthClasses', () => {
  it('always includes rc-month', () => {
    const { c } = createComponent()
    const cell = c.monthGrid[0]![0]!
    const classes = c.monthClasses(cell)
    expect(classes['rc-month']).toBe(true)
  })

  it('marks current month cell', () => {
    const { c } = createComponent()
    // Find the cell that matches today's month
    const currentCell = c.monthGrid.flat().find((cell) => cell.isCurrentMonth)
    if (currentCell) {
      const classes = c.monthClasses(currentCell)
      expect(classes['rc-month--current']).toBe(true)
    }
  })

  it('marks disabled month cell', () => {
    const { c } = createComponent({
      minDate: '2026-06-01',
    })
    // January 2026 should be disabled (before minDate)
    c.year = 2026
    c._rebuildMonthGrid()
    const janCell = c.monthGrid[0]![0]!
    expect(janCell.isDisabled).toBe(true)
    const classes = c.monthClasses(janCell)
    expect(classes['rc-month--disabled']).toBe(true)
  })

  it('does not mark months as disabled when no constraints', () => {
    const { c } = createComponent()
    for (const row of c.monthGrid) {
      for (const cell of row) {
        const classes = c.monthClasses(cell)
        expect(classes['rc-month--disabled']).toBe(false)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Month disabling with min/max constraints
// ---------------------------------------------------------------------------

describe('month disabling with constraints', () => {
  it('disables months before minDate', () => {
    const { c } = createComponent({
      minDate: '2026-04-01',
    })
    c.year = 2026
    c._rebuildMonthGrid()

    // Jan, Feb, Mar should be disabled
    expect(c.monthGrid[0]![0]!.isDisabled).toBe(true) // Jan
    expect(c.monthGrid[0]![1]!.isDisabled).toBe(true) // Feb
    expect(c.monthGrid[0]![2]!.isDisabled).toBe(true) // Mar

    // April and after should be enabled
    expect(c.monthGrid[0]![3]!.isDisabled).toBe(false) // Apr
    expect(c.monthGrid[1]![0]!.isDisabled).toBe(false) // May
  })

  it('disables months after maxDate', () => {
    const { c } = createComponent({
      maxDate: '2026-09-15',
    })
    c.year = 2026
    c._rebuildMonthGrid()

    // Sep should be enabled (maxDate is within Sep)
    expect(c.monthGrid[2]![0]!.isDisabled).toBe(false) // Sep

    // Oct, Nov, Dec should be disabled
    expect(c.monthGrid[2]![1]!.isDisabled).toBe(true) // Oct
    expect(c.monthGrid[2]![2]!.isDisabled).toBe(true) // Nov
    expect(c.monthGrid[2]![3]!.isDisabled).toBe(true) // Dec
  })

  it('disables all months when year is entirely before minDate', () => {
    const { c } = createComponent({
      minDate: '2027-01-01',
    })
    c.year = 2026
    c._rebuildMonthGrid()

    for (const row of c.monthGrid) {
      for (const cell of row) {
        expect(cell.isDisabled).toBe(true)
      }
    }
  })

  it('disables all months when year is entirely after maxDate', () => {
    const { c } = createComponent({
      maxDate: '2025-12-31',
    })
    c.year = 2026
    c._rebuildMonthGrid()

    for (const row of c.monthGrid) {
      for (const cell of row) {
        expect(cell.isDisabled).toBe(true)
      }
    }
  })

  it('minDate mid-month: month containing minDate is enabled', () => {
    const { c } = createComponent({
      minDate: '2026-03-15',
    })
    c.year = 2026
    c._rebuildMonthGrid()

    // Feb ends before minDate → disabled
    expect(c.monthGrid[0]![1]!.isDisabled).toBe(true) // Feb
    // March contains minDate → enabled
    expect(c.monthGrid[0]![2]!.isDisabled).toBe(false) // Mar
  })

  it('disabled month cannot be selected', () => {
    const { c } = createComponent({
      minDate: '2026-06-01',
    })
    c.year = 2026
    c._rebuildMonthGrid()
    c.setView('months')

    // Try to select January (disabled)
    const janCell = c.monthGrid[0]![0]!
    expect(janCell.isDisabled).toBe(true)

    // selectMonth guards against disabled months
    const origMonth = c.month
    c.selectMonth(1)
    expect(c.month).toBe(origMonth) // month unchanged
    expect(c.view).toBe('months') // still in months view
  })
})

// ---------------------------------------------------------------------------
// Month disabling with disabledMonths / enabledMonths
// ---------------------------------------------------------------------------

describe('month disabling with disabledMonths', () => {
  it('disables specific months across all years', () => {
    const { c } = createComponent({
      disabledMonths: [1, 2, 12],
    })
    c.year = 2026
    c._rebuildMonthGrid()

    expect(c.monthGrid[0]![0]!.isDisabled).toBe(true) // Jan
    expect(c.monthGrid[0]![1]!.isDisabled).toBe(true) // Feb
    expect(c.monthGrid[0]![2]!.isDisabled).toBe(false) // Mar
    expect(c.monthGrid[2]![3]!.isDisabled).toBe(true) // Dec

    // Same for a different year
    c.year = 2030
    c._rebuildMonthGrid()
    expect(c.monthGrid[0]![0]!.isDisabled).toBe(true) // Jan 2030
    expect(c.monthGrid[0]![2]!.isDisabled).toBe(false) // Mar 2030
  })

  it('selectMonth rejects disabled month', () => {
    const { c } = createComponent({ disabledMonths: [6] })
    c.setView('months')
    const origMonth = c.month
    c.selectMonth(6)
    expect(c.month).toBe(origMonth) // unchanged
    expect(c.view).toBe('months') // still in months view
  })

  it('days in disabled months are also disabled', () => {
    const { c } = createComponent({ disabledMonths: [1] })
    // Try selecting a day in January — should be rejected
    const janDate = new CalendarDate(2026, 1, 15)
    c.selectDate(janDate)
    expect(c.selectedDates).toHaveLength(0)
  })
})

describe('month disabling with enabledMonths', () => {
  it('only enables specified months', () => {
    const { c } = createComponent({
      enabledMonths: [6, 7, 8], // Summer only
    })
    c.year = 2026
    c._rebuildMonthGrid()

    // Jan-May disabled
    for (let i = 0; i < 5; i++) {
      const row = Math.floor(i / 4)
      const col = i % 4
      expect(c.monthGrid[row]![col]!.isDisabled).toBe(true)
    }

    // Jun, Jul, Aug enabled
    expect(c.monthGrid[1]![1]!.isDisabled).toBe(false) // Jun (month 6, index 5)
    expect(c.monthGrid[1]![2]!.isDisabled).toBe(false) // Jul
    expect(c.monthGrid[1]![3]!.isDisabled).toBe(false) // Aug

    // Sep-Dec disabled
    for (let i = 8; i < 12; i++) {
      const row = Math.floor(i / 4)
      const col = i % 4
      expect(c.monthGrid[row]![col]!.isDisabled).toBe(true)
    }
  })

  it('selectMonth rejects non-enabled month', () => {
    const { c } = createComponent({ enabledMonths: [6, 7, 8] })
    c.setView('months')
    const origMonth = c.month
    c.selectMonth(1) // January not in whitelist
    expect(c.month).toBe(origMonth)
  })
})

describe('month disabling with disabledYears cascading', () => {
  it('all months disabled when year is in disabledYears', () => {
    const { c } = createComponent({
      disabledYears: [2026],
    })
    c.year = 2026
    c._rebuildMonthGrid()

    for (const row of c.monthGrid) {
      for (const cell of row) {
        expect(cell.isDisabled).toBe(true)
      }
    }
  })

  it('months enabled in non-disabled year', () => {
    const { c } = createComponent({
      disabledYears: [2026],
    })
    c.year = 2025
    c._rebuildMonthGrid()

    for (const row of c.monthGrid) {
      for (const cell of row) {
        expect(cell.isDisabled).toBe(false)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Navigation in month view
// ---------------------------------------------------------------------------

describe('month view navigation', () => {
  it('prev/next navigate years, not months', () => {
    const { c } = createComponent()
    c.setView('months')
    const year = c.year

    c.prev()
    expect(c.year).toBe(year - 1)

    c.next()
    c.next()
    expect(c.year).toBe(year + 1)
  })

  it('_navDirection is set on prev/next in months view', () => {
    const { c } = createComponent()
    c.setView('months')

    c.prev()
    expect(c._navDirection).toBe('prev')

    c.next()
    expect(c._navDirection).toBe('next')
  })

  it('clicking month label in day view switches to months view', () => {
    const { c } = createComponent()
    expect(c.view).toBe('days')
    c.setView('months')
    expect(c.view).toBe('months')
  })

  it('goToToday resets to day view', () => {
    const { c } = createComponent()
    c.setView('months')
    c.goToToday()
    expect(c.view).toBe('days')
  })
})
