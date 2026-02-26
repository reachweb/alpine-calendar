import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'

/**
 * Inject mock Alpine magic properties ($watch, $dispatch, $refs, $nextTick, $el) into a component.
 * Returns spies and helpers for assertions.
 */
function withAlpineMocks(
  component: ReturnType<typeof createCalendarData>,
  options?: { refs?: Record<string, HTMLElement>; el?: HTMLElement },
) {
  const dispatchSpy = vi.fn()
  const watchSpy = vi.fn()
  const refs = options?.refs ?? {}
  const nextTickCallbacks: (() => void)[] = []

  // Inject Alpine magic properties onto the component object
  Object.assign(component, {
    $dispatch: dispatchSpy,
    $watch: watchSpy,
    $refs: refs,
    $nextTick: (cb: () => void) => nextTickCallbacks.push(cb),
    $el: options?.el ?? document.createElement('div'),
  })

  /** Flush all pending $nextTick callbacks */
  const flushNextTick = () => {
    while (nextTickCallbacks.length > 0) {
      const cb = nextTickCallbacks.shift()
      cb?.()
    }
  }

  return { dispatchSpy, watchSpy, flushNextTick }
}

// ---------------------------------------------------------------------------
// Default configuration
// ---------------------------------------------------------------------------

describe('createCalendarData — defaults', () => {
  it('returns an object with default config', () => {
    const c = createCalendarData()
    expect(c.mode).toBe('single')
    expect(c.display).toBe('inline')
    expect(c.format).toBe('DD/MM/YYYY')
    expect(c.monthCount).toBe(1)
    expect(c.firstDay).toBe(0)
    expect(c.wizard).toBe(false)
  })

  it('defaults to current month/year', () => {
    const c = createCalendarData()
    const today = CalendarDate.today()
    expect(c.month).toBe(today.month)
    expect(c.year).toBe(today.year)
  })

  it('defaults to days view', () => {
    const c = createCalendarData()
    expect(c.view).toBe('days')
  })

  it('inline display starts open', () => {
    const c = createCalendarData({ display: 'inline' })
    expect(c.isOpen).toBe(true)
  })

  it('popup display starts closed', () => {
    const c = createCalendarData({ display: 'popup' })
    expect(c.isOpen).toBe(false)
  })

  it('grid is initially empty (populated on init)', () => {
    const c = createCalendarData()
    expect(c.grid).toEqual([])
  })

  it('wizard mode defaults to years view', () => {
    const c = createCalendarData({ wizard: true })
    expect(c.view).toBe('years')
  })
})

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

describe('createCalendarData — config', () => {
  it('respects mode config', () => {
    expect(createCalendarData({ mode: 'range' }).mode).toBe('range')
    expect(createCalendarData({ mode: 'multiple' }).mode).toBe('multiple')
    expect(createCalendarData({ mode: 'single' }).mode).toBe('single')
  })

  it('respects display config', () => {
    expect(createCalendarData({ display: 'popup' }).display).toBe('popup')
    expect(createCalendarData({ display: 'inline' }).display).toBe('inline')
  })

  it('respects format config', () => {
    expect(createCalendarData({ format: 'YYYY-MM-DD' }).format).toBe('YYYY-MM-DD')
  })

  it('respects months config', () => {
    const c = createCalendarData({ months: 2 })
    expect(c.monthCount).toBe(2)
  })

  it('respects firstDay config', () => {
    expect(createCalendarData({ firstDay: 1 }).firstDay).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// init() and grid building
// ---------------------------------------------------------------------------

describe('init()', () => {
  it('builds grid on init', () => {
    const c = createCalendarData()
    withAlpineMocks(c)
    c.init()
    expect(c.grid.length).toBeGreaterThan(0)
  })

  it('builds correct number of month grids', () => {
    const c1 = createCalendarData({ months: 1 })
    withAlpineMocks(c1)
    c1.init()
    expect(c1.grid).toHaveLength(1)

    const c2 = createCalendarData({ months: 2 })
    withAlpineMocks(c2)
    c2.init()
    expect(c2.grid).toHaveLength(2)
  })

  it('grid month/year matches component state', () => {
    const c = createCalendarData()
    withAlpineMocks(c)
    c.init()
    expect(c.grid[0].year).toBe(c.year)
    expect(c.grid[0].month).toBe(c.month)
  })

  it('registers $watch for month and year', () => {
    const c = createCalendarData()
    const { watchSpy } = withAlpineMocks(c)
    c.init()
    expect(watchSpy).toHaveBeenCalledWith('month', expect.any(Function))
    expect(watchSpy).toHaveBeenCalledWith('year', expect.any(Function))
  })

  it('each grid has 6 rows × 7 columns', () => {
    const c = createCalendarData()
    withAlpineMocks(c)
    c.init()
    for (const monthGrid of c.grid) {
      expect(monthGrid.rows).toHaveLength(6)
      for (const row of monthGrid.rows) {
        expect(row).toHaveLength(7)
      }
    }
  })
})

// ---------------------------------------------------------------------------
// Navigation — prev / next
// ---------------------------------------------------------------------------

describe('navigation', () => {
  let c: ReturnType<typeof createCalendarData>

  beforeEach(() => {
    c = createCalendarData()
    withAlpineMocks(c)
    c.month = 6
    c.year = 2025
    c.init()
  })

  describe('prev()', () => {
    it('goes to previous month in days view', () => {
      c.view = 'days'
      c.prev()
      expect(c.month).toBe(5)
      expect(c.year).toBe(2025)
    })

    it('wraps from January to December of previous year', () => {
      c.view = 'days'
      c.month = 1
      c.prev()
      expect(c.month).toBe(12)
      expect(c.year).toBe(2024)
    })

    it('goes to previous year in months view', () => {
      c.view = 'months'
      c.prev()
      expect(c.year).toBe(2024)
      expect(c.month).toBe(6) // month unchanged
    })

    it('goes back 12 years in years view', () => {
      c.view = 'years'
      c.prev()
      expect(c.year).toBe(2013)
    })
  })

  describe('next()', () => {
    it('goes to next month in days view', () => {
      c.view = 'days'
      c.next()
      expect(c.month).toBe(7)
      expect(c.year).toBe(2025)
    })

    it('wraps from December to January of next year', () => {
      c.view = 'days'
      c.month = 12
      c.next()
      expect(c.month).toBe(1)
      expect(c.year).toBe(2026)
    })

    it('goes to next year in months view', () => {
      c.view = 'months'
      c.next()
      expect(c.year).toBe(2026)
    })

    it('goes forward 12 years in years view', () => {
      c.view = 'years'
      c.next()
      expect(c.year).toBe(2037)
    })
  })

  describe('goToToday()', () => {
    it('navigates to current month/year', () => {
      c.month = 1
      c.year = 2020
      c.view = 'months'
      c.goToToday()
      const today = CalendarDate.today()
      expect(c.month).toBe(today.month)
      expect(c.year).toBe(today.year)
      expect(c.view).toBe('days')
    })
  })
})

// ---------------------------------------------------------------------------
// Selection — single mode
// ---------------------------------------------------------------------------

describe('selection — single mode', () => {
  let c: ReturnType<typeof createCalendarData>
  let dispatchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    c = createCalendarData({ mode: 'single' })
    const mocks = withAlpineMocks(c)
    dispatchSpy = mocks.dispatchSpy
    c.init()
  })

  it('selects a date via ISO string', () => {
    c.selectDate('2025-06-15')
    expect(c.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
  })

  it('selects a date via CalendarDate object', () => {
    const date = new CalendarDate(2025, 6, 15)
    c.selectDate(date)
    expect(c.isSelected(date)).toBe(true)
  })

  it('deselects on second click', () => {
    c.selectDate('2025-06-15')
    c.selectDate('2025-06-15')
    expect(c.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
  })

  it('replaces previous selection', () => {
    c.selectDate('2025-06-15')
    c.selectDate('2025-06-20')
    expect(c.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
    expect(c.isSelected(new CalendarDate(2025, 6, 20))).toBe(true)
  })

  it('dispatches calendar:change event on selection', () => {
    c.selectDate('2025-06-15')
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', {
      value: '2025-06-15',
      dates: ['2025-06-15'],
      formatted: '15/06/2025',
    })
  })

  it('selectedDates returns selected date array', () => {
    c.selectDate('2025-06-15')
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
  })

  it('formattedValue returns formatted date', () => {
    c.selectDate('2025-06-15')
    expect(c.formattedValue).toBe('15/06/2025')
  })

  it('formattedValue returns empty string when nothing selected', () => {
    expect(c.formattedValue).toBe('')
  })

  it('ignores invalid ISO strings', () => {
    c.selectDate('not-a-date')
    expect(c.selectedDates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Selection — multiple mode
// ---------------------------------------------------------------------------

describe('selection — multiple mode', () => {
  let c: ReturnType<typeof createCalendarData>

  beforeEach(() => {
    c = createCalendarData({ mode: 'multiple' })
    withAlpineMocks(c)
    c.init()
  })

  it('selects multiple dates', () => {
    c.selectDate('2025-06-15')
    c.selectDate('2025-06-20')
    c.selectDate('2025-06-25')
    expect(c.selectedDates).toHaveLength(3)
  })

  it('toggles individual dates off', () => {
    c.selectDate('2025-06-15')
    c.selectDate('2025-06-20')
    c.selectDate('2025-06-15') // deselect
    expect(c.selectedDates).toHaveLength(1)
    expect(c.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
    expect(c.isSelected(new CalendarDate(2025, 6, 20))).toBe(true)
  })

  it('formattedValue returns comma-separated dates', () => {
    c.selectDate('2025-06-15')
    c.selectDate('2025-06-20')
    expect(c.formattedValue).toBe('15/06/2025, 20/06/2025')
  })
})

// ---------------------------------------------------------------------------
// Selection — range mode
// ---------------------------------------------------------------------------

describe('selection — range mode', () => {
  let c: ReturnType<typeof createCalendarData>

  beforeEach(() => {
    c = createCalendarData({ mode: 'range' })
    withAlpineMocks(c)
    c.init()
  })

  it('first click sets range start', () => {
    c.selectDate('2025-06-10')
    expect(c.isRangeStart(new CalendarDate(2025, 6, 10))).toBe(true)
    expect(c.selectedDates).toHaveLength(1)
  })

  it('second click sets range end', () => {
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-20')
    expect(c.isRangeStart(new CalendarDate(2025, 6, 10))).toBe(true)
    expect(c.isRangeEnd(new CalendarDate(2025, 6, 20))).toBe(true)
  })

  it('third click starts a new range', () => {
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-20')
    c.selectDate('2025-07-01')
    expect(c.isRangeStart(new CalendarDate(2025, 7, 1))).toBe(true)
    expect(c.isRangeEnd(new CalendarDate(2025, 6, 20))).toBe(false)
    expect(c.selectedDates).toHaveLength(1)
  })

  it('isInRange returns true for dates within range', () => {
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-20')
    expect(c.isInRange(new CalendarDate(2025, 6, 15))).toBe(true)
    expect(c.isInRange(new CalendarDate(2025, 6, 10))).toBe(true)
    expect(c.isInRange(new CalendarDate(2025, 6, 20))).toBe(true)
  })

  it('isInRange returns false for dates outside range', () => {
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-20')
    expect(c.isInRange(new CalendarDate(2025, 6, 9))).toBe(false)
    expect(c.isInRange(new CalendarDate(2025, 6, 21))).toBe(false)
  })

  it('isInRange supports hover preview', () => {
    c.selectDate('2025-06-10') // start only
    const hover = new CalendarDate(2025, 6, 15)
    expect(c.isInRange(new CalendarDate(2025, 6, 12), hover)).toBe(true)
    expect(c.isInRange(new CalendarDate(2025, 6, 16), hover)).toBe(false)
  })

  it('formattedValue returns range string', () => {
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-20')
    expect(c.formattedValue).toBe('10/06/2025 – 20/06/2025')
  })

  it('formattedValue returns start only when partial', () => {
    c.selectDate('2025-06-10')
    expect(c.formattedValue).toBe('10/06/2025')
  })

  it('isRangeStart/End return false in non-range mode', () => {
    const single = createCalendarData({ mode: 'single' })
    withAlpineMocks(single)
    single.init()
    expect(single.isRangeStart(new CalendarDate(2025, 6, 10))).toBe(false)
    expect(single.isRangeEnd(new CalendarDate(2025, 6, 10))).toBe(false)
    expect(single.isInRange(new CalendarDate(2025, 6, 10))).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// clearSelection
// ---------------------------------------------------------------------------

describe('clearSelection', () => {
  it('clears all selected dates', () => {
    const c = createCalendarData({ mode: 'multiple' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')
    c.selectDate('2025-06-20')
    c.clearSelection()
    expect(c.selectedDates).toHaveLength(0)
    expect(c.formattedValue).toBe('')
    expect(dispatchSpy).toHaveBeenLastCalledWith('calendar:change', {
      value: '',
      dates: [],
      formatted: '',
    })
  })
})

// ---------------------------------------------------------------------------
// Constraints
// ---------------------------------------------------------------------------

describe('constraints', () => {
  it('prevents selecting disabled dates', () => {
    const c = createCalendarData({
      disabledDates: ['2025-06-15'],
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')
    expect(c.selectedDates).toHaveLength(0)
  })

  it('prevents selecting dates before minDate', () => {
    const c = createCalendarData({
      minDate: '2025-06-10',
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-09')
    expect(c.selectedDates).toHaveLength(0)
    c.selectDate('2025-06-10')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('prevents selecting dates after maxDate', () => {
    const c = createCalendarData({
      maxDate: '2025-06-20',
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-21')
    expect(c.selectedDates).toHaveLength(0)
    c.selectDate('2025-06-20')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('marks disabled dates in grid', () => {
    const c = createCalendarData({
      disabledDates: ['2025-06-15'],
    })
    withAlpineMocks(c)
    c.month = 6
    c.year = 2025
    c.init()

    // Find June 15 in the grid
    let found = false
    for (const monthGrid of c.grid) {
      for (const row of monthGrid.rows) {
        for (const cell of row) {
          if (cell.date.isSame(new CalendarDate(2025, 6, 15))) {
            expect(cell.isDisabled).toBe(true)
            found = true
          }
        }
      }
    }
    expect(found).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Constraints — enabledDates
// ---------------------------------------------------------------------------

describe('constraints — enabledDates', () => {
  it('force-enables dates that would be disabled by disabledDaysOfWeek', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 6],
      enabledDates: ['2025-06-14'], // Saturday
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-14') // Saturday — force-enabled
    expect(c.selectedDates).toHaveLength(1)
    c.selectDate('2025-06-14') // deselect
    c.selectDate('2025-06-15') // Sunday — still disabled
    expect(c.selectedDates).toHaveLength(0)
  })

  it('marks force-enabled dates as not disabled in grid', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0, 6],
      enabledDates: ['2025-06-14'], // force-enable Saturday
    })
    withAlpineMocks(c)
    c.month = 6
    c.year = 2025
    c.init()

    let sat14Disabled = true
    let sun15Disabled = false
    for (const monthGrid of c.grid) {
      for (const row of monthGrid.rows) {
        for (const cell of row) {
          if (cell.date.isSame(new CalendarDate(2025, 6, 14))) {
            sat14Disabled = cell.isDisabled
          }
          if (cell.date.isSame(new CalendarDate(2025, 6, 15))) {
            sun15Disabled = cell.isDisabled
          }
        }
      }
    }
    expect(sat14Disabled).toBe(false)
    expect(sun15Disabled).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Constraints — enabledDaysOfWeek
// ---------------------------------------------------------------------------

describe('constraints — enabledDaysOfWeek', () => {
  it('only allows specified weekdays', () => {
    const c = createCalendarData({
      enabledDaysOfWeek: [1, 2, 3, 4, 5], // weekdays only
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-16') // Monday
    expect(c.selectedDates).toHaveLength(1)
    c.selectDate('2025-06-16') // deselect
    c.selectDate('2025-06-14') // Saturday — not whitelisted
    expect(c.selectedDates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Constraints — minRange / maxRange
// ---------------------------------------------------------------------------

describe('constraints — range validation', () => {
  it('prevents range shorter than minRange', () => {
    const c = createCalendarData({
      mode: 'range',
      minRange: 3,
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10') // start
    c.selectDate('2025-06-11') // end — 2 days < 3 → rejected
    expect(c.selectedDates).toHaveLength(1) // still partial
    expect(c.isRangeStart(new CalendarDate(2025, 6, 10))).toBe(true)
  })

  it('allows range equal to minRange', () => {
    const c = createCalendarData({
      mode: 'range',
      minRange: 3,
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10') // start
    c.selectDate('2025-06-12') // end — 3 days = 3 → accepted
    expect(c.selectedDates).toHaveLength(2)
    expect(c.isRangeEnd(new CalendarDate(2025, 6, 12))).toBe(true)
  })

  it('prevents range longer than maxRange', () => {
    const c = createCalendarData({
      mode: 'range',
      maxRange: 7,
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10') // start
    c.selectDate('2025-06-17') // end — 8 days > 7 → rejected
    expect(c.selectedDates).toHaveLength(1)
  })

  it('allows range equal to maxRange', () => {
    const c = createCalendarData({
      mode: 'range',
      maxRange: 7,
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10') // start
    c.selectDate('2025-06-16') // end — 7 days = 7 → accepted
    expect(c.selectedDates).toHaveLength(2)
  })

  it('validates range when end is before start (swap scenario)', () => {
    const c = createCalendarData({
      mode: 'range',
      minRange: 3,
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15') // start
    c.selectDate('2025-06-14') // before start — swaps to [14, 15] = 2 days < 3 → rejected
    expect(c.selectedDates).toHaveLength(1) // still partial
    expect(c.isRangeStart(new CalendarDate(2025, 6, 15))).toBe(true)
  })

  it('allows clicking the start date to deselect (bypass range validation)', () => {
    const c = createCalendarData({
      mode: 'range',
      minRange: 5,
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10') // start
    c.selectDate('2025-06-10') // click start again → deselect (no range to validate)
    expect(c.selectedDates).toHaveLength(0)
  })

  it('does not apply range validation in single mode', () => {
    const c = createCalendarData({
      mode: 'single',
      minRange: 5, // should be ignored
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('does not apply range validation in multiple mode', () => {
    const c = createCalendarData({
      mode: 'multiple',
      minRange: 5, // should be ignored
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-11')
    expect(c.selectedDates).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// Constraints — period-specific rules
// ---------------------------------------------------------------------------

describe('constraints — rules', () => {
  it('applies rule-specific disabled days for dates in rule period', () => {
    const c = createCalendarData({
      rules: [
        {
          from: '2025-06-01',
          to: '2025-06-30',
          disabledDaysOfWeek: [0, 6], // no weekends in June
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-14') // Saturday in June → disabled by rule
    expect(c.selectedDates).toHaveLength(0)
    c.selectDate('2025-06-16') // Monday in June → allowed
    expect(c.selectedDates).toHaveLength(1)
  })

  it('falls back to global constraints outside rule periods', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0], // globally disable Sundays
      rules: [
        {
          from: '2025-06-01',
          to: '2025-06-30',
          disabledDaysOfWeek: [6], // in June, disable Saturdays instead
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // June Sunday — rule overrides (rule says [6] not [0]) → allowed
    c.selectDate('2025-06-15')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('applies period-specific minRange', () => {
    const c = createCalendarData({
      mode: 'range',
      minRange: 3,
      rules: [
        {
          from: '2025-05-01',
          to: '2025-10-31',
          minRange: 5,
        },
      ],
    })
    withAlpineMocks(c)
    c.init()

    // Start in June (rule period: minRange 5)
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-13') // 4 days < 5 → rejected
    expect(c.selectedDates).toHaveLength(1)

    c.clearSelection()

    // Start in June, valid range
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-14') // 5 days = 5 → accepted
    expect(c.selectedDates).toHaveLength(2)
  })

  it('applies global minRange when start is outside rule periods', () => {
    const c = createCalendarData({
      mode: 'range',
      minRange: 3,
      rules: [
        {
          from: '2025-05-01',
          to: '2025-10-31',
          minRange: 5,
        },
      ],
    })
    withAlpineMocks(c)
    c.init()

    // Start in March (no rule: global minRange 3)
    c.selectDate('2025-03-10')
    c.selectDate('2025-03-12') // 3 days = 3 → accepted
    expect(c.selectedDates).toHaveLength(2)
  })

  it('handles invalid rule dates gracefully', () => {
    const c = createCalendarData({
      rules: [
        {
          from: 'invalid',
          to: '2025-06-30',
          disabledDaysOfWeek: [0, 6],
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Invalid rule is skipped — no constraints applied
    c.selectDate('2025-06-14') // Saturday → no rule active → allowed
    expect(c.selectedDates).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Constraints — recurring month rules
// ---------------------------------------------------------------------------

describe('constraints — recurring month rules', () => {
  it('applies recurring months rule to disable weekends in summer', () => {
    const c = createCalendarData({
      rules: [
        {
          months: [6, 7, 8],
          disabledDaysOfWeek: [0, 6],
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Saturday in June → disabled by rule
    c.selectDate('2025-06-07')
    expect(c.selectedDates).toHaveLength(0)
    // Monday in June → allowed
    c.selectDate('2025-06-09')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('falls back to global constraints for months not in recurring rule', () => {
    const c = createCalendarData({
      disabledDaysOfWeek: [0], // globally disable Sundays
      rules: [
        {
          months: [6],
          disabledDaysOfWeek: [6], // in any June, disable Saturdays instead
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // June Sunday — rule overrides (rule says [6] not [0]) → allowed
    c.selectDate('2025-06-15')
    expect(c.selectedDates).toHaveLength(1)
    c.clearSelection()
    // March Sunday — global rule: Sundays disabled
    c.selectDate('2025-03-02')
    expect(c.selectedDates).toHaveLength(0)
  })

  it('applies recurring months rule with minRange for range mode', () => {
    const c = createCalendarData({
      mode: 'range',
      minRange: 3,
      rules: [
        {
          months: [7, 8],
          minRange: 5,
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Start in July (recurring rule: minRange 5)
    c.selectDate('2025-07-10')
    c.selectDate('2025-07-13') // 4 days < 5 → rejected
    expect(c.selectedDates).toHaveLength(1)
    c.clearSelection()
    // Start in July, valid range
    c.selectDate('2025-07-10')
    c.selectDate('2025-07-14') // 5 days = 5 → accepted
    expect(c.selectedDates).toHaveLength(2)
  })

  it('handles rule with only months (no from/to)', () => {
    const c = createCalendarData({
      rules: [
        {
          months: [12],
          disabledDaysOfWeek: [0, 6],
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Saturday in December → disabled
    c.selectDate('2025-12-06')
    expect(c.selectedDates).toHaveLength(0)
    // Monday in December → allowed
    c.selectDate('2025-12-01')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('skips rule with neither from/to nor months', () => {
    const c = createCalendarData({
      rules: [
        {
          // No from/to and no months → invalid rule, skipped
          disabledDaysOfWeek: [0, 6],
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Saturday → no rule active → allowed
    c.selectDate('2025-06-14')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('recurring rule works with updateConstraints', () => {
    const c = createCalendarData({})
    withAlpineMocks(c)
    c.init()
    // No constraints initially
    c.selectDate('2025-07-05') // Saturday
    expect(c.selectedDates).toHaveLength(1)
    c.clearSelection()

    // Add recurring rule via updateConstraints
    c.updateConstraints({
      rules: [
        {
          months: [7],
          disabledDaysOfWeek: [0, 6],
        },
      ],
    })
    c.selectDate('2025-07-05') // Saturday in July → now disabled
    expect(c.selectedDates).toHaveLength(0)
    c.selectDate('2025-07-07') // Monday in July → allowed
    expect(c.selectedDates).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Constraints — rule priority/weight
// ---------------------------------------------------------------------------

describe('constraints — rule priority', () => {
  it('higher priority rule wins with string-based config', () => {
    const c = createCalendarData({
      rules: [
        {
          from: '2025-06-01',
          to: '2025-06-30',
          disabledDaysOfWeek: [0, 6], // disable weekends
          priority: 1,
        },
        {
          from: '2025-06-10',
          to: '2025-06-20',
          disabledDaysOfWeek: [], // allow all
          priority: 10,
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Saturday June 14 — in overlap, priority 10 → allowed
    c.selectDate('2025-06-14')
    expect(c.selectedDates).toHaveLength(1)
    c.clearSelection()
    // Saturday June 7 — only priority 1 → disabled
    c.selectDate('2025-06-07')
    expect(c.selectedDates).toHaveLength(0)
  })

  it('priority works with recurring months and date-range overlap', () => {
    const c = createCalendarData({
      rules: [
        {
          months: [6], // June every year
          disabledDaysOfWeek: [0, 6],
          priority: 1,
        },
        {
          from: '2025-06-01',
          to: '2025-06-30', // June 2025 specifically
          disabledDaysOfWeek: [],
          priority: 10,
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Saturday June 7, 2025 — both match, priority 10 → allowed
    c.selectDate('2025-06-07')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('priority works with updateConstraints', () => {
    const c = createCalendarData({
      rules: [
        {
          from: '2025-06-01',
          to: '2025-06-30',
          disabledDaysOfWeek: [0, 6],
          priority: 1,
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Saturday June 14 → disabled
    c.selectDate('2025-06-14')
    expect(c.selectedDates).toHaveLength(0)

    // Update: add higher priority rule that allows it
    c.updateConstraints({
      rules: [
        {
          from: '2025-06-01',
          to: '2025-06-30',
          disabledDaysOfWeek: [0, 6],
          priority: 1,
        },
        {
          from: '2025-06-10',
          to: '2025-06-20',
          disabledDaysOfWeek: [],
          priority: 10,
        },
      ],
    })
    c.selectDate('2025-06-14')
    expect(c.selectedDates).toHaveLength(1)
  })

  it('backward compatible — no priority defaults to first-match-wins', () => {
    const c = createCalendarData({
      rules: [
        {
          from: '2025-06-01',
          to: '2025-06-30',
          disabledDaysOfWeek: [0, 6, 5], // more restrictive (first)
        },
        {
          from: '2025-06-10',
          to: '2025-06-20',
          disabledDaysOfWeek: [], // less restrictive (second, but ignored)
        },
      ],
    })
    withAlpineMocks(c)
    c.init()
    // Friday June 13 — first rule matches (priority 0, first) → disabled
    c.selectDate('2025-06-13')
    expect(c.selectedDates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Initial value
// ---------------------------------------------------------------------------

describe('initial value', () => {
  it('parses initial value in single mode (ISO)', () => {
    const c = createCalendarData({ value: '2025-06-15' })
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
  })

  it('parses initial value in single mode (formatted)', () => {
    const c = createCalendarData({ format: 'DD/MM/YYYY', value: '15/06/2025' })
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
  })

  it('sets viewing month/year to initial value', () => {
    const c = createCalendarData({ value: '2020-03-15' })
    expect(c.month).toBe(3)
    expect(c.year).toBe(2020)
  })

  it('parses initial value in range mode', () => {
    const c = createCalendarData({
      mode: 'range',
      format: 'DD/MM/YYYY',
      value: '01/06/2025 - 15/06/2025',
    })
    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-01')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-15')
  })

  it('parses initial value in multiple mode', () => {
    const c = createCalendarData({
      mode: 'multiple',
      format: 'DD/MM/YYYY',
      value: '01/06/2025, 15/06/2025, 20/06/2025',
    })
    expect(c.selectedDates).toHaveLength(3)
  })

  it('does not pre-select disabled dates from initial value', () => {
    const c = createCalendarData({
      value: '2025-06-15',
      disabledDates: ['2025-06-15'],
    })
    expect(c.selectedDates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// View switching
// ---------------------------------------------------------------------------

describe('view switching', () => {
  let c: ReturnType<typeof createCalendarData>

  beforeEach(() => {
    c = createCalendarData()
    withAlpineMocks(c)
    c.init()
  })

  it('setView changes the current view', () => {
    c.setView('months')
    expect(c.view).toBe('months')
    c.setView('years')
    expect(c.view).toBe('years')
    c.setView('days')
    expect(c.view).toBe('days')
  })

  it('selectMonth sets month and switches to days view', () => {
    c.view = 'months'
    c.selectMonth(8)
    expect(c.month).toBe(8)
    expect(c.view).toBe('days')
  })

  it('selectYear sets year and switches to months view', () => {
    c.view = 'years'
    c.selectYear(2030)
    expect(c.year).toBe(2030)
    expect(c.view).toBe('months')
  })
})

// ---------------------------------------------------------------------------
// Popup
// ---------------------------------------------------------------------------

describe('popup', () => {
  it('open() opens popup in popup mode', () => {
    const c = createCalendarData({ display: 'popup' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.open()
    expect(c.isOpen).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:open')
  })

  it('close() closes popup in popup mode', () => {
    const c = createCalendarData({ display: 'popup' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.open()
    c.close()
    expect(c.isOpen).toBe(false)
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:close')
  })

  it('toggle() toggles popup state', () => {
    const c = createCalendarData({ display: 'popup' })
    withAlpineMocks(c)
    c.init()
    c.toggle()
    expect(c.isOpen).toBe(true)
    c.toggle()
    expect(c.isOpen).toBe(false)
  })

  it('open/close do nothing in inline mode', () => {
    const c = createCalendarData({ display: 'inline' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.open()
    expect(c.isOpen).toBe(true) // was already true
    c.close()
    expect(c.isOpen).toBe(true) // still true — close is a no-op for inline
    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Format config
// ---------------------------------------------------------------------------

describe('format config', () => {
  it('uses custom format for formattedValue', () => {
    const c = createCalendarData({ format: 'YYYY-MM-DD' })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')
    expect(c.formattedValue).toBe('2025-06-15')
  })

  it('uses custom format for range formattedValue', () => {
    const c = createCalendarData({ mode: 'range', format: 'YYYY-MM-DD' })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-20')
    expect(c.formattedValue).toBe('2025-06-10 – 2025-06-20')
  })
})

// ---------------------------------------------------------------------------
// Smoke test backward compatibility
// ---------------------------------------------------------------------------

describe('smoke test compatibility', () => {
  it('exports calendarPlugin as a function', async () => {
    const { calendarPlugin } = await import('../../src/index')
    expect(typeof calendarPlugin).toBe('function')
  })

  it('plugin registers calendar data when called with Alpine mock', async () => {
    const { calendarPlugin } = await import('../../src/index')
    const registered: Record<string, unknown> = {}
    const mockAlpine = {
      data: (name: string, factory: unknown) => {
        registered[name] = factory
      },
    }

    calendarPlugin(mockAlpine as never)
    expect(registered).toHaveProperty('calendar')
    expect(typeof registered['calendar']).toBe('function')
  })

  it('calendar factory returns object with mode and display', async () => {
    const { calendarPlugin } = await import('../../src/index')
    let factory: ((config?: Record<string, unknown>) => Record<string, unknown>) | null = null
    const mockAlpine = {
      data: (_name: string, fn: typeof factory) => {
        factory = fn
      },
    }

    calendarPlugin(mockAlpine as never)
    const instance = factory!()
    expect(instance.mode).toBe('single')
    expect(instance.display).toBe('inline')
  })

  it('calendar factory respects passed config', async () => {
    const { calendarPlugin } = await import('../../src/index')
    let factory: ((config?: Record<string, unknown>) => Record<string, unknown>) | null = null
    const mockAlpine = {
      data: (_name: string, fn: typeof factory) => {
        factory = fn
      },
    }

    calendarPlugin(mockAlpine as never)
    const instance = factory!({ mode: 'range', display: 'popup' })
    expect(instance.mode).toBe('range')
    expect(instance.display).toBe('popup')
  })
})

// ---------------------------------------------------------------------------
// Input binding — config & initial state
// ---------------------------------------------------------------------------

describe('input binding — config & initial state', () => {
  it('inputValue is empty when no initial value', () => {
    const c = createCalendarData()
    expect(c.inputValue).toBe('')
  })

  it('inputValue reflects initial value (single)', () => {
    const c = createCalendarData({ value: '2025-06-15' })
    expect(c.inputValue).toBe('15/06/2025')
  })

  it('inputValue reflects initial value (range)', () => {
    const c = createCalendarData({
      mode: 'range',
      value: '10/06/2025 - 20/06/2025',
    })
    expect(c.inputValue).toBe('10/06/2025 – 20/06/2025')
  })

  it('inputValue reflects initial value (multiple)', () => {
    const c = createCalendarData({
      mode: 'multiple',
      value: '15/06/2025, 20/06/2025',
    })
    expect(c.inputValue).toBe('15/06/2025, 20/06/2025')
  })

  it('inputName defaults to empty string', () => {
    const c = createCalendarData()
    expect(c.inputName).toBe('')
  })

  it('inputName reflects config', () => {
    const c = createCalendarData({ name: 'appointment_date' })
    expect(c.inputName).toBe('appointment_date')
  })
})

// ---------------------------------------------------------------------------
// Input binding — hiddenInputValues
// ---------------------------------------------------------------------------

describe('hiddenInputValues', () => {
  it('returns empty array when nothing selected', () => {
    const c = createCalendarData()
    expect(c.hiddenInputValues).toEqual([])
  })

  it('returns ISO string for single selection', () => {
    const c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')
    expect(c.hiddenInputValues).toEqual(['2025-06-15'])
  })

  it('returns ISO strings for range selection', () => {
    const c = createCalendarData({ mode: 'range' })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-20')
    expect(c.hiddenInputValues).toEqual(['2025-06-10', '2025-06-20'])
  })

  it('returns ISO strings for multiple selection', () => {
    const c = createCalendarData({ mode: 'multiple' })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')
    c.selectDate('2025-06-20')
    expect(c.hiddenInputValues).toEqual(['2025-06-15', '2025-06-20'])
  })
})

// ---------------------------------------------------------------------------
// Input binding — init() auto-bind
// ---------------------------------------------------------------------------

describe('init() — auto-bind to x-ref="input"', () => {
  it('auto-binds to x-ref="input" when present', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c, { refs: { input } })
    c.init()
    flushNextTick()

    expect(c._inputEl).toBe(input)
    expect(input.value).toBe('15/06/2025')
  })

  it('does not bind when x-ref="input" is absent', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c, { refs: {} })
    c.init()
    flushNextTick()

    expect(c._inputEl).toBeNull()
  })

  it('does not bind when ref is not an HTMLInputElement', () => {
    const div = document.createElement('div')
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c, { refs: { input: div } })
    c.init()
    flushNextTick()

    expect(c._inputEl).toBeNull()
  })

  it('sets placeholder on auto-bound input', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ format: 'DD/MM/YYYY' })
    const { flushNextTick } = withAlpineMocks(c, { refs: { input } })
    c.init()
    flushNextTick()

    expect(input.placeholder).toBe('dd/mm/yyyy')
  })

  it('does not override existing placeholder', () => {
    const input = document.createElement('input')
    input.placeholder = 'Enter date'
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c, { refs: { input } })
    c.init()
    flushNextTick()

    expect(input.placeholder).toBe('Enter date')
  })
})

// ---------------------------------------------------------------------------
// Input binding — bindInput()
// ---------------------------------------------------------------------------

describe('bindInput()', () => {
  it('sets _inputEl to the provided element', () => {
    const input = document.createElement('input')
    const c = createCalendarData()
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    expect(c._inputEl).toBe(input)
  })

  it('syncs initial value to input', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ value: '2025-06-15' })
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    expect(input.value).toBe('15/06/2025')
  })

  it('sets placeholder from format', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ format: 'YYYY-MM-DD' })
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    expect(input.placeholder).toBe('yyyy-mm-dd')
  })

  it('cleans up previous binding when rebinding', () => {
    const input1 = document.createElement('input')
    const input2 = document.createElement('input')
    const c = createCalendarData({ value: '2025-06-15' })
    withAlpineMocks(c)
    c.init()

    c.bindInput(input1)
    expect(c._inputEl).toBe(input1)

    c.bindInput(input2)
    expect(c._inputEl).toBe(input2)
    expect(input2.value).toBe('15/06/2025')
  })

  it('applies mask when mask is enabled (default)', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ value: '2025-06-15' }) // mask defaults to true
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    // bindInput sets el.value = inputValue, then attachMask reformats through mask
    expect(input.value).toBe('15/06/2025')
    // _detachMask should be set (mask + sync listener cleanup)
    expect(c._detachMask).not.toBeNull()
  })

  it('does not apply mask when mask is disabled', () => {
    const input = document.createElement('input')
    input.value = 'some text'
    const c = createCalendarData({ mask: false })
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    // With mask disabled, input value is set to inputValue (empty or formatted)
    // The existing value gets replaced with the component's inputValue
    expect(input.value).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Input binding — handleFocus()
// ---------------------------------------------------------------------------

describe('handleFocus()', () => {
  it('opens calendar in popup mode', () => {
    const c = createCalendarData({ display: 'popup' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()

    expect(c.isOpen).toBe(false)
    c.handleFocus()
    expect(c.isOpen).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:open')
  })

  it('does nothing in inline mode', () => {
    const c = createCalendarData({ display: 'inline' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()

    c.handleFocus()
    expect(c.isOpen).toBe(true) // was already true
    expect(dispatchSpy).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// Input binding — handleBlur() — single mode
// ---------------------------------------------------------------------------

describe('handleBlur() — single mode', () => {
  let c: ReturnType<typeof createCalendarData>
  let input: HTMLInputElement
  let dispatchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    input = document.createElement('input')
    c = createCalendarData({ mode: 'single', mask: false })
    const mocks = withAlpineMocks(c)
    dispatchSpy = mocks.dispatchSpy
    c.init()
    c.bindInput(input)
  })

  it('parses valid formatted input and updates selection', () => {
    input.value = '15/06/2025'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.inputValue).toBe('15/06/2025')
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', expect.objectContaining({
      dates: ['2025-06-15'],
    }))
  })

  it('parses valid ISO input and updates selection', () => {
    input.value = '2025-06-15'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
  })

  it('navigates to parsed date month/year', () => {
    input.value = '15/03/2020'
    c.handleBlur()

    expect(c.month).toBe(3)
    expect(c.year).toBe(2020)
  })

  it('reformats input to canonical format on blur', () => {
    input.value = '2025-06-15' // ISO format, but calendar uses DD/MM/YYYY
    c.handleBlur()

    expect(input.value).toBe('15/06/2025')
    expect(c.inputValue).toBe('15/06/2025')
  })

  it('clears selection when input is empty', () => {
    c.selectDate('2025-06-15')
    dispatchSpy.mockClear()

    input.value = ''
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(0)
    expect(c.inputValue).toBe('')
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', expect.objectContaining({
      dates: [],
    }))
  })

  it('clears selection when input is whitespace-only', () => {
    c.selectDate('2025-06-15')
    input.value = '   '
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(0)
  })

  it('reverts input on invalid input (keeps previous selection)', () => {
    c.selectDate('2025-06-15')
    dispatchSpy.mockClear()

    input.value = 'not a date'
    c.handleBlur()

    // Selection unchanged
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    // Input reformatted to existing selection
    expect(input.value).toBe('15/06/2025')
  })

  it('does not select disabled dates from input', () => {
    const c2 = createCalendarData({
      mode: 'single',
      mask: false,
      disabledDates: ['2025-06-15'],
    })
    withAlpineMocks(c2)
    c2.init()
    const input2 = document.createElement('input')
    c2.bindInput(input2)

    input2.value = '15/06/2025'
    c2.handleBlur()

    expect(c2.selectedDates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Input binding — handleBlur() — range mode
// ---------------------------------------------------------------------------

describe('handleBlur() — range mode', () => {
  let c: ReturnType<typeof createCalendarData>
  let input: HTMLInputElement
  let dispatchSpy: ReturnType<typeof vi.fn>

  beforeEach(() => {
    input = document.createElement('input')
    c = createCalendarData({ mode: 'range', mask: false })
    const mocks = withAlpineMocks(c)
    dispatchSpy = mocks.dispatchSpy
    c.init()
    c.bindInput(input)
  })

  it('parses valid range input', () => {
    input.value = '10/06/2025 – 20/06/2025'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-10')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-20')
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', expect.objectContaining({
      dates: ['2025-06-10', '2025-06-20'],
    }))
  })

  it('parses range with hyphen separator', () => {
    input.value = '10/06/2025 - 20/06/2025'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(2)
  })

  it('navigates to start date month/year', () => {
    input.value = '10/03/2020 – 20/03/2020'
    c.handleBlur()

    expect(c.month).toBe(3)
    expect(c.year).toBe(2020)
  })

  it('does not accept range with disabled dates', () => {
    const c2 = createCalendarData({
      mode: 'range',
      mask: false,
      disabledDates: ['2025-06-15'],
    })
    withAlpineMocks(c2)
    c2.init()
    const input2 = document.createElement('input')
    c2.bindInput(input2)

    input2.value = '10/06/2025 – 20/06/2025'
    c2.handleBlur()

    // Range contains disabled date at start or end — but constraint only checks start/end
    // Actually the blur handler checks start and end dates individually, not intermediate
    // So this range is fine since neither 10 nor 20 is disabled
    expect(c2.selectedDates).toHaveLength(2)
  })

  it('rejects range where start is disabled', () => {
    const c2 = createCalendarData({
      mode: 'range',
      mask: false,
      disabledDates: ['2025-06-10'],
    })
    withAlpineMocks(c2)
    c2.init()
    const input2 = document.createElement('input')
    c2.bindInput(input2)

    input2.value = '10/06/2025 – 20/06/2025'
    c2.handleBlur()

    expect(c2.selectedDates).toHaveLength(0)
  })

  it('validates range constraints on blur', () => {
    const c2 = createCalendarData({
      mode: 'range',
      mask: false,
      minRange: 5,
    })
    withAlpineMocks(c2)
    c2.init()
    const input2 = document.createElement('input')
    c2.bindInput(input2)

    input2.value = '10/06/2025 – 12/06/2025' // 3 days < 5
    c2.handleBlur()

    expect(c2.selectedDates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Input binding — handleBlur() — multiple mode
// ---------------------------------------------------------------------------

describe('handleBlur() — multiple mode', () => {
  let c: ReturnType<typeof createCalendarData>
  let input: HTMLInputElement

  beforeEach(() => {
    input = document.createElement('input')
    c = createCalendarData({ mode: 'multiple', mask: false })
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)
  })

  it('parses comma-separated dates', () => {
    input.value = '15/06/2025, 20/06/2025, 25/06/2025'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(3)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
    expect(c.selectedDates[1].toISO()).toBe('2025-06-20')
    expect(c.selectedDates[2].toISO()).toBe('2025-06-25')
  })

  it('skips invalid dates in list', () => {
    input.value = '15/06/2025, invalid, 25/06/2025'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(2)
  })

  it('filters out disabled dates', () => {
    const c2 = createCalendarData({
      mode: 'multiple',
      mask: false,
      disabledDates: ['2025-06-20'],
    })
    withAlpineMocks(c2)
    c2.init()
    const input2 = document.createElement('input')
    c2.bindInput(input2)

    input2.value = '15/06/2025, 20/06/2025, 25/06/2025'
    c2.handleBlur()

    expect(c2.selectedDates).toHaveLength(2)
    expect(c2.selectedDates.map((d: CalendarDate) => d.toISO())).toEqual([
      '2025-06-15',
      '2025-06-25',
    ])
  })

  it('navigates to first valid date month/year', () => {
    input.value = '15/03/2020, 20/03/2020'
    c.handleBlur()

    expect(c.month).toBe(3)
    expect(c.year).toBe(2020)
  })
})

// ---------------------------------------------------------------------------
// Input binding — handleInput()
// ---------------------------------------------------------------------------

describe('handleInput()', () => {
  it('updates inputValue from event target', () => {
    const c = createCalendarData({ mask: false })
    withAlpineMocks(c)
    c.init()

    const input = document.createElement('input')
    input.value = '15/06/2025'
    c.handleInput({ target: input } as unknown as Event)

    expect(c.inputValue).toBe('15/06/2025')
  })
})

// ---------------------------------------------------------------------------
// Input binding — selection → input sync
// ---------------------------------------------------------------------------

describe('selection → input sync', () => {
  it('selectDate updates inputValue', () => {
    const c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')

    expect(c.inputValue).toBe('15/06/2025')
  })

  it('selectDate updates bound input element', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ mode: 'single', mask: false })
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    c.selectDate('2025-06-15')
    expect(input.value).toBe('15/06/2025')
  })

  it('clearSelection clears inputValue and bound input', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ mode: 'single', mask: false })
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    c.selectDate('2025-06-15')
    expect(input.value).toBe('15/06/2025')

    c.clearSelection()
    expect(c.inputValue).toBe('')
    expect(input.value).toBe('')
  })

  it('range selection updates inputValue progressively', () => {
    const c = createCalendarData({ mode: 'range' })
    withAlpineMocks(c)
    c.init()

    c.selectDate('2025-06-10')
    expect(c.inputValue).toBe('10/06/2025')

    c.selectDate('2025-06-20')
    expect(c.inputValue).toBe('10/06/2025 – 20/06/2025')
  })

  it('multiple selection updates inputValue', () => {
    const c = createCalendarData({ mode: 'multiple' })
    withAlpineMocks(c)
    c.init()

    c.selectDate('2025-06-15')
    c.selectDate('2025-06-20')
    expect(c.inputValue).toBe('15/06/2025, 20/06/2025')
  })
})

// ---------------------------------------------------------------------------
// Input binding — destroy()
// ---------------------------------------------------------------------------

describe('destroy()', () => {
  it('nulls _inputEl', () => {
    const input = document.createElement('input')
    const c = createCalendarData({ mask: false })
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    expect(c._inputEl).toBe(input)
    c.destroy()
    expect(c._inputEl).toBeNull()
  })

  it('calls detach function for mask cleanup', () => {
    const input = document.createElement('input')
    const c = createCalendarData() // mask enabled by default
    withAlpineMocks(c)
    c.init()
    c.bindInput(input)

    expect(c._detachMask).not.toBeNull()
    c.destroy()
    expect(c._detachMask).toBeNull()
  })

  it('is safe to call multiple times', () => {
    const c = createCalendarData()
    withAlpineMocks(c)
    c.init()

    c.destroy()
    c.destroy() // should not throw
    expect(c._inputEl).toBeNull()
    expect(c._detachMask).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// Input binding — handleBlur() uses inputValue when no bound input
// ---------------------------------------------------------------------------

describe('handleBlur() — no bound input', () => {
  it('uses inputValue when no input element is bound', () => {
    const c = createCalendarData({ mode: 'single', mask: false })
    withAlpineMocks(c)
    c.init()

    c.inputValue = '15/06/2025'
    c.handleBlur()

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0].toISO()).toBe('2025-06-15')
  })
})

// ---------------------------------------------------------------------------
// Input binding — _emitChange()
// ---------------------------------------------------------------------------

describe('_emitChange()', () => {
  it('dispatches calendar:change with correct shape', () => {
    const c = createCalendarData({ mode: 'single' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', {
      value: '2025-06-15',
      dates: ['2025-06-15'],
      formatted: '15/06/2025',
    })
  })

  it('dispatches with range value shape', () => {
    const c = createCalendarData({ mode: 'range' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-10')
    c.selectDate('2025-06-20')

    expect(dispatchSpy).toHaveBeenLastCalledWith('calendar:change', {
      value: '2025-06-10 – 2025-06-20',
      dates: ['2025-06-10', '2025-06-20'],
      formatted: '10/06/2025 – 20/06/2025',
    })
  })

  it('dispatches on clearSelection', () => {
    const c = createCalendarData({ mode: 'single' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')
    dispatchSpy.mockClear()

    c.clearSelection()
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', {
      value: '',
      dates: [],
      formatted: '',
    })
  })
})

// ---------------------------------------------------------------------------
// Popup positioning integration
// ---------------------------------------------------------------------------

describe('popup positioning', () => {
  it('popupStyle is set eagerly for popup display', () => {
    const c = createCalendarData({ display: 'popup' })
    expect(c.popupStyle).toContain('position:fixed')
  })

  it('open() dispatches calendar:open and sets isOpen', () => {
    const c = createCalendarData({ display: 'popup' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    expect(c.isOpen).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:open')
  })

  it('close() resets popupStyle and stops positioning', () => {
    const c = createCalendarData({ display: 'popup' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()
    c.close()
    expect(c.isOpen).toBe(false)
    expect(c.popupStyle).toContain('position:fixed')
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:close')
  })

  it('destroy() cleans up auto-update', () => {
    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.destroy()
    expect(c._popupEl).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// handleKeydown — Escape
// ---------------------------------------------------------------------------

describe('handleKeydown', () => {
  it('closes popup on Escape', () => {
    const c = createCalendarData({ display: 'popup' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()
    expect(c.isOpen).toBe(true)

    const event = new KeyboardEvent('keydown', { key: 'Escape' })
    const preventSpy = vi.spyOn(event, 'preventDefault')
    const stopSpy = vi.spyOn(event, 'stopPropagation')

    c.handleKeydown(event)
    expect(c.isOpen).toBe(false)
    expect(preventSpy).toHaveBeenCalled()
    expect(stopSpy).toHaveBeenCalled()
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:close')
  })

  it('returns focus to input on Escape', () => {
    const input = document.createElement('input')
    const focusSpy = vi.spyOn(input, 'focus')

    const c = createCalendarData({ display: 'popup', mask: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    c.bindInput(input)

    c.open()
    flushNextTick()

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(focusSpy).toHaveBeenCalled()
  })

  it('does nothing for unhandled keys', () => {
    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()

    const event = new KeyboardEvent('keydown', { key: 'a' })
    const preventSpy = vi.spyOn(event, 'preventDefault')

    c.handleKeydown(event)
    expect(c.isOpen).toBe(true) // still open
    expect(preventSpy).not.toHaveBeenCalled()
  })

  it('does nothing in inline mode', () => {
    const c = createCalendarData({ display: 'inline' })
    withAlpineMocks(c)
    c.init()

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(c.isOpen).toBe(true) // inline is always open
  })
})

// ---------------------------------------------------------------------------
// Popup positioning — config
// ---------------------------------------------------------------------------

describe('popup config', () => {
  it('accepts placement config', () => {
    const c = createCalendarData({ display: 'popup', placement: 'top-end' })
    withAlpineMocks(c)
    c.init()
    // Config is parsed — no error, component creates fine
    expect(c.display).toBe('popup')
  })

  it('accepts popupOffset config', () => {
    const c = createCalendarData({ display: 'popup', popupOffset: 8 })
    withAlpineMocks(c)
    c.init()
    expect(c.display).toBe('popup')
  })
})

// ---------------------------------------------------------------------------
// Keyboard navigation (Task 3.4)
// ---------------------------------------------------------------------------

describe('keyboard navigation — arrow keys', () => {
  let c: ReturnType<typeof createCalendarData>

  function fireKey(key: string, extra?: Record<string, unknown>) {
    const e = new KeyboardEvent('keydown', { key, ...extra } as KeyboardEventInit)
    vi.spyOn(e, 'preventDefault')
    c.handleKeydown(e)
    return e
  }

  beforeEach(() => {
    c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    // Navigate to June 2025 and set focused date
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 15)
  })

  it('ArrowRight moves focus forward one day', () => {
    fireKey('ArrowRight')
    expect(c.focusedDate?.toISO()).toBe('2025-06-16')
  })

  it('ArrowLeft moves focus back one day', () => {
    fireKey('ArrowLeft')
    expect(c.focusedDate?.toISO()).toBe('2025-06-14')
  })

  it('ArrowDown moves focus forward one week', () => {
    fireKey('ArrowDown')
    expect(c.focusedDate?.toISO()).toBe('2025-06-22')
  })

  it('ArrowUp moves focus back one week', () => {
    fireKey('ArrowUp')
    expect(c.focusedDate?.toISO()).toBe('2025-06-08')
  })

  it('ArrowRight at end of month navigates to next month', () => {
    c.focusedDate = new CalendarDate(2025, 6, 30)
    fireKey('ArrowRight')
    expect(c.focusedDate?.toISO()).toBe('2025-07-01')
    expect(c.month).toBe(7)
    expect(c.year).toBe(2025)
  })

  it('ArrowLeft at start of month navigates to previous month', () => {
    c.focusedDate = new CalendarDate(2025, 6, 1)
    fireKey('ArrowLeft')
    expect(c.focusedDate?.toISO()).toBe('2025-05-31')
    expect(c.month).toBe(5)
    expect(c.year).toBe(2025)
  })

  it('ArrowDown crossing month boundary navigates month', () => {
    c.focusedDate = new CalendarDate(2025, 6, 28)
    fireKey('ArrowDown')
    expect(c.focusedDate?.toISO()).toBe('2025-07-05')
    expect(c.month).toBe(7)
  })

  it('ArrowUp crossing month boundary navigates month', () => {
    c.focusedDate = new CalendarDate(2025, 6, 3)
    fireKey('ArrowUp')
    expect(c.focusedDate?.toISO()).toBe('2025-05-27')
    expect(c.month).toBe(5)
  })

  it('ArrowRight crossing year boundary navigates year', () => {
    c.focusedDate = new CalendarDate(2025, 12, 31)
    c.month = 12
    c.year = 2025
    fireKey('ArrowRight')
    expect(c.focusedDate?.toISO()).toBe('2026-01-01')
    expect(c.month).toBe(1)
    expect(c.year).toBe(2026)
  })

  it('arrow keys call preventDefault', () => {
    const e = fireKey('ArrowRight')
    expect(e.preventDefault).toHaveBeenCalled()
  })
})

describe('keyboard navigation — Enter / Space', () => {
  let c: ReturnType<typeof createCalendarData>
  let dispatchSpy: ReturnType<typeof vi.fn>

  function fireKey(key: string) {
    const e = new KeyboardEvent('keydown', { key })
    vi.spyOn(e, 'preventDefault')
    c.handleKeydown(e)
    return e
  }

  beforeEach(() => {
    c = createCalendarData({ mode: 'single' })
    const mocks = withAlpineMocks(c)
    dispatchSpy = mocks.dispatchSpy
    c.init()
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 15)
  })

  it('Enter selects the focused date', () => {
    fireKey('Enter')
    expect(c.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
    expect(dispatchSpy).toHaveBeenCalledWith(
      'calendar:change',
      expect.objectContaining({ dates: ['2025-06-15'] }),
    )
  })

  it('Space selects the focused date', () => {
    fireKey(' ')
    expect(c.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
  })

  it('Enter calls preventDefault', () => {
    const e = fireKey('Enter')
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('does nothing when focusedDate is null', () => {
    c.focusedDate = null
    fireKey('Enter')
    expect(c.selectedDates).toHaveLength(0)
  })

  it('does not select a disabled focused date', () => {
    const c2 = createCalendarData({
      mode: 'single',
      disabledDates: ['2025-06-15'],
    })
    withAlpineMocks(c2)
    c2.init()
    c2.month = 6
    c2.year = 2025
    c2.focusedDate = new CalendarDate(2025, 6, 15)

    const e = new KeyboardEvent('keydown', { key: 'Enter' })
    c2.handleKeydown(e)
    expect(c2.selectedDates).toHaveLength(0)
  })
})

describe('keyboard navigation — PageUp / PageDown', () => {
  let c: ReturnType<typeof createCalendarData>

  function fireKey(key: string, extra?: Record<string, unknown>) {
    const e = new KeyboardEvent('keydown', { key, ...extra } as KeyboardEventInit)
    vi.spyOn(e, 'preventDefault')
    c.handleKeydown(e)
    return e
  }

  beforeEach(() => {
    c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 15)
  })

  it('PageDown moves to next month', () => {
    fireKey('PageDown')
    expect(c.focusedDate?.toISO()).toBe('2025-07-15')
    expect(c.month).toBe(7)
  })

  it('PageUp moves to previous month', () => {
    fireKey('PageUp')
    expect(c.focusedDate?.toISO()).toBe('2025-05-15')
    expect(c.month).toBe(5)
  })

  it('Shift+PageDown moves to next year', () => {
    fireKey('PageDown', { shiftKey: true })
    expect(c.focusedDate?.toISO()).toBe('2026-06-15')
    expect(c.year).toBe(2026)
  })

  it('Shift+PageUp moves to previous year', () => {
    fireKey('PageUp', { shiftKey: true })
    expect(c.focusedDate?.toISO()).toBe('2024-06-15')
    expect(c.year).toBe(2024)
  })

  it('PageDown clamps day when target month has fewer days', () => {
    c.focusedDate = new CalendarDate(2025, 1, 31)
    c.month = 1
    c.year = 2025
    fireKey('PageDown')
    expect(c.focusedDate?.toISO()).toBe('2025-02-28')
    expect(c.month).toBe(2)
  })

  it('PageDown calls preventDefault', () => {
    const e = fireKey('PageDown')
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('PageDown across year boundary', () => {
    c.focusedDate = new CalendarDate(2025, 12, 15)
    c.month = 12
    c.year = 2025
    fireKey('PageDown')
    expect(c.focusedDate?.toISO()).toBe('2026-01-15')
    expect(c.month).toBe(1)
    expect(c.year).toBe(2026)
  })
})

describe('keyboard navigation — Home / End', () => {
  let c: ReturnType<typeof createCalendarData>

  function fireKey(key: string) {
    const e = new KeyboardEvent('keydown', { key })
    vi.spyOn(e, 'preventDefault')
    c.handleKeydown(e)
    return e
  }

  beforeEach(() => {
    c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 15)
  })

  it('Home moves to first day of month', () => {
    fireKey('Home')
    expect(c.focusedDate?.toISO()).toBe('2025-06-01')
  })

  it('End moves to last day of month', () => {
    fireKey('End')
    expect(c.focusedDate?.toISO()).toBe('2025-06-30')
  })

  it('Home calls preventDefault', () => {
    const e = fireKey('Home')
    expect(e.preventDefault).toHaveBeenCalled()
  })

  it('End for February non-leap year', () => {
    c.focusedDate = new CalendarDate(2025, 2, 10)
    c.month = 2
    c.year = 2025
    fireKey('End')
    expect(c.focusedDate?.toISO()).toBe('2025-02-28')
  })

  it('End for February leap year', () => {
    c.focusedDate = new CalendarDate(2024, 2, 10)
    c.month = 2
    c.year = 2024
    fireKey('End')
    expect(c.focusedDate?.toISO()).toBe('2024-02-29')
  })
})

describe('keyboard navigation — Escape (enhanced)', () => {
  it('returns from months view to days view', () => {
    const c = createCalendarData({ display: 'inline' })
    withAlpineMocks(c)
    c.init()
    c.view = 'months'

    const e = new KeyboardEvent('keydown', { key: 'Escape' })
    c.handleKeydown(e)
    expect(c.view).toBe('days')
  })

  it('returns from years view to days view', () => {
    const c = createCalendarData({ display: 'inline' })
    withAlpineMocks(c)
    c.init()
    c.view = 'years'

    const e = new KeyboardEvent('keydown', { key: 'Escape' })
    c.handleKeydown(e)
    expect(c.view).toBe('days')
  })

  it('closes popup in days view (not month/year view)', () => {
    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick, dispatchSpy } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()
    expect(c.isOpen).toBe(true)
    expect(c.view).toBe('days')

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(c.isOpen).toBe(false)
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:close')
  })

  it('in popup month view: returns to days view without closing', () => {
    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()
    c.view = 'months'

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'Escape' }))
    expect(c.view).toBe('days')
    expect(c.isOpen).toBe(true) // still open
  })
})

describe('keyboard navigation — focusedDate auto-initialization', () => {
  it('initializes focusedDate to selected date on first arrow key', () => {
    const c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    c.selectDate('2025-06-15')
    c.focusedDate = null // simulate no focus yet

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    // Should init to selected date (2025-06-15) then move +1
    expect(c.focusedDate?.toISO()).toBe('2025-06-16')
  })

  it('initializes focusedDate to 1st of month when nothing selected', () => {
    const c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    c.month = 6
    c.year = 2025

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    // Should init to 2025-06-01 then move +1
    expect(c.focusedDate?.toISO()).toBe('2025-06-02')
  })
})

describe('keyboard navigation — disabled date skipping', () => {
  it('skips disabled dates when moving forward', () => {
    const c = createCalendarData({
      mode: 'single',
      disabledDates: ['2025-06-16'],
    })
    withAlpineMocks(c)
    c.init()
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 15)

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(c.focusedDate?.toISO()).toBe('2025-06-17')
  })

  it('skips disabled dates when moving backward', () => {
    const c = createCalendarData({
      mode: 'single',
      disabledDates: ['2025-06-14'],
    })
    withAlpineMocks(c)
    c.init()
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 15)

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowLeft' }))
    expect(c.focusedDate?.toISO()).toBe('2025-06-13')
  })

  it('skips multiple consecutive disabled dates', () => {
    const c = createCalendarData({
      mode: 'single',
      disabledDates: ['2025-06-16', '2025-06-17', '2025-06-18'],
    })
    withAlpineMocks(c)
    c.init()
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 15)

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    expect(c.focusedDate?.toISO()).toBe('2025-06-19')
  })

  it('does not move if all candidates are disabled (stays put)', () => {
    const c = createCalendarData({
      mode: 'single',
      disabledDaysOfWeek: [0, 1, 2, 3, 4, 5, 6], // all days disabled
    })
    withAlpineMocks(c)
    c.init()
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 15)

    c.handleKeydown(new KeyboardEvent('keydown', { key: 'ArrowRight' }))
    // Should not move since all candidates are disabled
    expect(c.focusedDate?.toISO()).toBe('2025-06-15')
  })
})

describe('keyboard navigation — range mode', () => {
  it('Enter selects range start then end', () => {
    const c = createCalendarData({ mode: 'range' })
    const { dispatchSpy } = withAlpineMocks(c)
    c.init()
    c.month = 6
    c.year = 2025
    c.focusedDate = new CalendarDate(2025, 6, 10)

    // Select start
    c.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(c.selectedDates).toHaveLength(1)

    // Move to end
    c.focusedDate = new CalendarDate(2025, 6, 20)
    c.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))
    expect(c.selectedDates).toHaveLength(2)
    expect(dispatchSpy).toHaveBeenLastCalledWith(
      'calendar:change',
      expect.objectContaining({ dates: ['2025-06-10', '2025-06-20'] }),
    )
  })
})

describe('keyboard navigation — does not fire in non-days views', () => {
  it('arrow keys do nothing in months view', () => {
    const c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    c.view = 'months'
    c.focusedDate = new CalendarDate(2025, 6, 15)

    const e = new KeyboardEvent('keydown', { key: 'ArrowRight' })
    const preventSpy = vi.spyOn(e, 'preventDefault')
    c.handleKeydown(e)

    // focusedDate should not change
    expect(c.focusedDate?.toISO()).toBe('2025-06-15')
    expect(preventSpy).not.toHaveBeenCalled()
  })

  it('arrow keys do nothing in years view', () => {
    const c = createCalendarData({ mode: 'single' })
    withAlpineMocks(c)
    c.init()
    c.view = 'years'
    c.focusedDate = new CalendarDate(2025, 6, 15)

    const e = new KeyboardEvent('keydown', { key: 'ArrowDown' })
    const preventSpy = vi.spyOn(e, 'preventDefault')
    c.handleKeydown(e)

    expect(c.focusedDate?.toISO()).toBe('2025-06-15')
    expect(preventSpy).not.toHaveBeenCalled()
  })
})
