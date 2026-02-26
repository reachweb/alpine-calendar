import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { generateYearGrid } from '../../src/core/grid'
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
// generateYearGrid (core)
// ---------------------------------------------------------------------------

describe('generateYearGrid', () => {
  it('returns a 3×4 grid (3 rows of 4 years)', () => {
    const grid = generateYearGrid(2026)
    expect(grid).toHaveLength(3)
    for (const row of grid) {
      expect(row).toHaveLength(4)
    }
  })

  it('contains 12 consecutive years', () => {
    const grid = generateYearGrid(2026)
    const years = grid.flat().map((c) => c.year)
    expect(years).toHaveLength(12)
    // Check consecutive
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBe(years[i - 1]! + 1)
    }
  })

  it('aligns to 12-year blocks (2026 → 2016–2027)', () => {
    const grid = generateYearGrid(2026)
    const years = grid.flat().map((c) => c.year)
    expect(years[0]).toBe(2016)
    expect(years[11]).toBe(2027)
  })

  it('aligns block start: 2028 → 2028–2039', () => {
    const grid = generateYearGrid(2028)
    const years = grid.flat().map((c) => c.year)
    expect(years[0]).toBe(2028)
    expect(years[11]).toBe(2039)
  })

  it('aligns block start: 2016 → 2016–2027', () => {
    const grid = generateYearGrid(2016)
    const years = grid.flat().map((c) => c.year)
    expect(years[0]).toBe(2016)
    expect(years[11]).toBe(2027)
  })

  it('cells have label matching year as string', () => {
    const grid = generateYearGrid(2026)
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.label).toBe(String(cell.year))
      }
    }
  })

  it('marks the current year correctly', () => {
    const today = new CalendarDate(2026, 3, 15)
    const grid = generateYearGrid(2026, today)
    const cell2026 = grid.flat().find((c) => c.year === 2026)
    expect(cell2026!.isCurrentYear).toBe(true)

    // Other years should not be current
    const cell2025 = grid.flat().find((c) => c.year === 2025)
    expect(cell2025!.isCurrentYear).toBe(false)
  })

  it('does not mark current year when today is outside the grid range', () => {
    const today = new CalendarDate(2030, 3, 15)
    const grid = generateYearGrid(2026, today)
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.isCurrentYear).toBe(false)
      }
    }
  })

  it('all years enabled when no disabled callback', () => {
    const grid = generateYearGrid(2026)
    for (const row of grid) {
      for (const cell of row) {
        expect(cell.isDisabled).toBe(false)
      }
    }
  })

  it('respects isYearDisabled callback', () => {
    const disabled = (year: number) => year < 2020
    const grid = generateYearGrid(2026, undefined, disabled)

    // Years 2016-2019 should be disabled
    const disabledYears = grid.flat().filter((c) => c.isDisabled)
    expect(disabledYears.map((c) => c.year)).toEqual([2016, 2017, 2018, 2019])

    // Years 2020-2027 should be enabled
    const enabledYears = grid.flat().filter((c) => !c.isDisabled)
    expect(enabledYears).toHaveLength(8)
  })

  it('labels are unique for all 12 years', () => {
    const grid = generateYearGrid(2026)
    const labels = grid.flat().map((c) => c.label)
    expect(new Set(labels).size).toBe(12)
  })
})

// ---------------------------------------------------------------------------
// Year view in calendar component
// ---------------------------------------------------------------------------

describe('year view — component integration', () => {
  it('starts in days view by default', () => {
    const { c } = createComponent()
    expect(c.view).toBe('days')
  })

  it('wizard mode starts in years view', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.view).toBe('years')
  })

  it('switching to years view works', () => {
    const { c } = createComponent()
    c.setView('years')
    expect(c.view).toBe('years')
  })

  it('yearGrid is populated on init', () => {
    const { c } = createComponent()
    expect(c.yearGrid).toHaveLength(3)
    for (const row of c.yearGrid) {
      expect(row).toHaveLength(4)
    }
  })

  it('yearGrid contains 12 consecutive years', () => {
    const { c } = createComponent()
    const years = c.yearGrid.flat().map((cell) => cell.year)
    expect(years).toHaveLength(12)
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBe(years[i - 1]! + 1)
    }
  })

  it('decadeLabel returns correct range string', () => {
    const { c } = createComponent()
    // For year 2026, the block is 2016-2027
    c.year = 2026
    expect(c.decadeLabel).toBe('2016 – 2027')
  })

  it('decadeLabel updates when year changes', () => {
    const { c } = createComponent()
    c.year = 2030
    expect(c.decadeLabel).toBe('2028 – 2039')
  })

  it('selectYear navigates to that year and switches to months view', () => {
    const { c } = createComponent()
    c.setView('years')
    c.selectYear(2020)
    expect(c.year).toBe(2020)
    expect(c.view).toBe('months')
  })

  it('prev() in years view decrements year by 12', () => {
    const { c } = createComponent()
    c.setView('years')
    const initialYear = c.year
    c.prev()
    expect(c.year).toBe(initialYear - 12)
  })

  it('next() in years view increments year by 12', () => {
    const { c } = createComponent()
    c.setView('years')
    const initialYear = c.year
    c.next()
    expect(c.year).toBe(initialYear + 12)
  })

  it('yearGrid rebuilds when year changes', () => {
    const { c } = createComponent()
    c.year = 2030
    c._rebuildYearGrid()
    const years = c.yearGrid.flat().map((cell) => cell.year)
    // 2030 is in block 2028-2039
    expect(years[0]).toBe(2028)
    expect(years[11]).toBe(2039)
  })

  it('Escape in years view returns to days view', () => {
    const { c } = createComponent()
    c.setView('years')
    expect(c.view).toBe('years')

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
    Object.defineProperty(event, 'stopPropagation', { value: vi.fn() })
    c.handleKeydown(event)

    expect(c.view).toBe('days')
  })

  it('navigating prev/next shows correct decade ranges', () => {
    const { c } = createComponent()
    c.year = 2026 // block 2016-2027
    c.setView('years')

    c.prev() // year → 2014, block 2004-2015
    c._rebuildYearGrid()
    expect(c.yearGrid.flat()[0]!.year).toBe(2004)
    expect(c.yearGrid.flat()[11]!.year).toBe(2015)

    c.next() // year → 2026, block 2016-2027
    c._rebuildYearGrid()
    expect(c.yearGrid.flat()[0]!.year).toBe(2016)
    expect(c.yearGrid.flat()[11]!.year).toBe(2027)
  })
})

// ---------------------------------------------------------------------------
// yearClasses
// ---------------------------------------------------------------------------

describe('yearClasses', () => {
  it('always includes rc-year', () => {
    const { c } = createComponent()
    const cell = c.yearGrid[0]![0]!
    const classes = c.yearClasses(cell)
    expect(classes['rc-year']).toBe(true)
  })

  it('marks current year cell', () => {
    const { c } = createComponent()
    const currentCell = c.yearGrid.flat().find((cell) => cell.isCurrentYear)
    if (currentCell) {
      const classes = c.yearClasses(currentCell)
      expect(classes['rc-year--current']).toBe(true)
    }
  })

  it('marks selected year when in months view', () => {
    const { c } = createComponent()
    c.year = 2026
    c.setView('months')
    c._rebuildYearGrid()

    const cell2026 = c.yearGrid.flat().find((cell) => cell.year === 2026)!
    const classes = c.yearClasses(cell2026)
    expect(classes['rc-year--selected']).toBe(true)
  })

  it('does not mark selected when not in months view', () => {
    const { c } = createComponent()
    c.year = 2026
    c.setView('years')
    c._rebuildYearGrid()

    const cell2026 = c.yearGrid.flat().find((cell) => cell.year === 2026)!
    const classes = c.yearClasses(cell2026)
    expect(classes['rc-year--selected']).toBe(false)
  })

  it('marks disabled year cell', () => {
    const { c } = createComponent({
      minDate: '2025-01-01',
    })
    c.year = 2026
    c._rebuildYearGrid()
    // Years in the 2016-2027 block: 2016-2024 should be disabled
    const cell2020 = c.yearGrid.flat().find((cell) => cell.year === 2020)!
    expect(cell2020.isDisabled).toBe(true)
    const classes = c.yearClasses(cell2020)
    expect(classes['rc-year--disabled']).toBe(true)
  })

  it('does not mark years as disabled when no constraints', () => {
    const { c } = createComponent()
    for (const row of c.yearGrid) {
      for (const cell of row) {
        const classes = c.yearClasses(cell)
        expect(classes['rc-year--disabled']).toBe(false)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Year disabling with min/max constraints
// ---------------------------------------------------------------------------

describe('year disabling with constraints', () => {
  it('disables years before minDate', () => {
    const { c } = createComponent({
      minDate: '2022-06-01',
    })
    c.year = 2026
    c._rebuildYearGrid()

    // Grid shows 2016-2027
    // Years 2016-2021 should be disabled (entire year before minDate)
    for (let y = 2016; y <= 2021; y++) {
      const cell = c.yearGrid.flat().find((cell) => cell.year === y)!
      expect(cell.isDisabled).toBe(true)
    }

    // 2022 contains minDate → should be enabled
    const cell2022 = c.yearGrid.flat().find((cell) => cell.year === 2022)!
    expect(cell2022.isDisabled).toBe(false)

    // 2023-2027 should be enabled
    for (let y = 2023; y <= 2027; y++) {
      const cell = c.yearGrid.flat().find((cell) => cell.year === y)!
      expect(cell.isDisabled).toBe(false)
    }
  })

  it('disables years after maxDate', () => {
    const { c } = createComponent({
      maxDate: '2024-03-15',
    })
    c.year = 2026
    c._rebuildYearGrid()

    // Grid shows 2016-2027
    // 2024 contains maxDate → enabled
    const cell2024 = c.yearGrid.flat().find((cell) => cell.year === 2024)!
    expect(cell2024.isDisabled).toBe(false)

    // 2025-2027 should be disabled
    for (let y = 2025; y <= 2027; y++) {
      const cell = c.yearGrid.flat().find((cell) => cell.year === y)!
      expect(cell.isDisabled).toBe(true)
    }
  })

  it('disables all years when entire grid is before minDate', () => {
    const { c } = createComponent({
      minDate: '2030-01-01',
    })
    c.year = 2026
    c._rebuildYearGrid()

    // Grid shows 2016-2027, all before 2030
    for (const row of c.yearGrid) {
      for (const cell of row) {
        expect(cell.isDisabled).toBe(true)
      }
    }
  })

  it('disables all years when entire grid is after maxDate', () => {
    const { c } = createComponent({
      maxDate: '2015-12-31',
    })
    c.year = 2026
    c._rebuildYearGrid()

    // Grid shows 2016-2027, all after 2015
    for (const row of c.yearGrid) {
      for (const cell of row) {
        expect(cell.isDisabled).toBe(true)
      }
    }
  })

  it('year with minDate on Jan 1 is enabled', () => {
    const { c } = createComponent({
      minDate: '2020-01-01',
    })
    c.year = 2026
    c._rebuildYearGrid()

    const cell2020 = c.yearGrid.flat().find((cell) => cell.year === 2020)!
    expect(cell2020.isDisabled).toBe(false)

    const cell2019 = c.yearGrid.flat().find((cell) => cell.year === 2019)!
    expect(cell2019.isDisabled).toBe(true)
  })

  it('year with maxDate on Dec 31 is enabled', () => {
    const { c } = createComponent({
      maxDate: '2024-12-31',
    })
    c.year = 2026
    c._rebuildYearGrid()

    const cell2024 = c.yearGrid.flat().find((cell) => cell.year === 2024)!
    expect(cell2024.isDisabled).toBe(false)

    const cell2025 = c.yearGrid.flat().find((cell) => cell.year === 2025)!
    expect(cell2025.isDisabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Navigation in year view
// ---------------------------------------------------------------------------

describe('year view navigation', () => {
  it('prev/next navigate by 12 years', () => {
    const { c } = createComponent()
    c.setView('years')
    const year = c.year

    c.prev()
    expect(c.year).toBe(year - 12)

    c.next()
    c.next()
    expect(c.year).toBe(year + 12)
  })

  it('_navDirection is set on prev/next in years view', () => {
    const { c } = createComponent()
    c.setView('years')

    c.prev()
    expect(c._navDirection).toBe('prev')

    c.next()
    expect(c._navDirection).toBe('next')
  })

  it('clicking year label in month view switches to years view', () => {
    const { c } = createComponent()
    c.setView('months')
    expect(c.view).toBe('months')
    c.setView('years')
    expect(c.view).toBe('years')
  })

  it('goToToday resets to day view from years view', () => {
    const { c } = createComponent()
    c.setView('years')
    c.goToToday()
    expect(c.view).toBe('days')
  })

  it('full navigation flow: days → months → years → select year → select month → days', () => {
    const { c } = createComponent()
    expect(c.view).toBe('days')

    c.setView('months')
    expect(c.view).toBe('months')

    c.setView('years')
    expect(c.view).toBe('years')

    c.selectYear(2020)
    expect(c.year).toBe(2020)
    expect(c.view).toBe('months')

    c.selectMonth(6)
    expect(c.month).toBe(6)
    expect(c.view).toBe('days')
  })
})

// ---------------------------------------------------------------------------
// Year disabling with disabledYears / enabledYears
// ---------------------------------------------------------------------------

describe('year disabling with disabledYears', () => {
  it('disables specific years in yearGrid', () => {
    const { c } = createComponent({
      disabledYears: [2020, 2021, 2022],
    })
    c.year = 2026
    c._rebuildYearGrid()

    // Grid shows 2016-2027
    const cell2020 = c.yearGrid.flat().find((cell) => cell.year === 2020)!
    const cell2021 = c.yearGrid.flat().find((cell) => cell.year === 2021)!
    const cell2022 = c.yearGrid.flat().find((cell) => cell.year === 2022)!
    const cell2023 = c.yearGrid.flat().find((cell) => cell.year === 2023)!

    expect(cell2020.isDisabled).toBe(true)
    expect(cell2021.isDisabled).toBe(true)
    expect(cell2022.isDisabled).toBe(true)
    expect(cell2023.isDisabled).toBe(false)
  })

  it('selectYear rejects disabled year', () => {
    const { c } = createComponent({ disabledYears: [2020] })
    c.setView('years')
    const origYear = c.year
    c.selectYear(2020)
    expect(c.year).toBe(origYear) // unchanged
    expect(c.view).toBe('years') // still in years view
  })

  it('yearClasses marks disabled year', () => {
    const { c } = createComponent({ disabledYears: [2020] })
    c.year = 2026
    c._rebuildYearGrid()

    const cell2020 = c.yearGrid.flat().find((cell) => cell.year === 2020)!
    const classes = c.yearClasses(cell2020)
    expect(classes['rc-year--disabled']).toBe(true)
  })

  it('disabledYears + minDate combined', () => {
    const { c } = createComponent({
      minDate: '2018-01-01',
      disabledYears: [2020],
    })
    c.year = 2026
    c._rebuildYearGrid()

    // 2017 disabled by minDate, 2018 enabled, 2020 disabled explicitly
    const cell2017 = c.yearGrid.flat().find((cell) => cell.year === 2017)!
    const cell2018 = c.yearGrid.flat().find((cell) => cell.year === 2018)!
    const cell2020 = c.yearGrid.flat().find((cell) => cell.year === 2020)!

    expect(cell2017.isDisabled).toBe(true) // before minDate
    expect(cell2018.isDisabled).toBe(false) // at minDate
    expect(cell2020.isDisabled).toBe(true) // explicitly disabled
  })
})

describe('year disabling with enabledYears', () => {
  it('only enables specified years in yearGrid', () => {
    const { c } = createComponent({
      enabledYears: [2025, 2026, 2027],
    })
    c.year = 2026
    c._rebuildYearGrid()

    // Grid shows 2016-2027
    for (const cell of c.yearGrid.flat()) {
      if ([2025, 2026, 2027].includes(cell.year)) {
        expect(cell.isDisabled).toBe(false)
      } else {
        expect(cell.isDisabled).toBe(true)
      }
    }
  })

  it('selectYear rejects non-enabled year', () => {
    const { c } = createComponent({ enabledYears: [2025, 2026] })
    c.setView('years')
    const origYear = c.year
    c.selectYear(2020) // not in whitelist
    expect(c.year).toBe(origYear)
  })

  it('days in disabled years are also disabled', () => {
    const { c } = createComponent({ disabledYears: [2020] })
    const dateIn2020 = new CalendarDate(2020, 6, 15)
    c.selectDate(dateIn2020)
    expect(c.selectedDates).toHaveLength(0) // rejected
  })
})
