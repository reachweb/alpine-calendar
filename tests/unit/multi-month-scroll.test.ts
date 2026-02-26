import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'
import type { MonthGrid } from '../../src/core/grid'

// ---------------------------------------------------------------------------
// Alpine mock helper (same pattern as other test files)
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
// Config validation
// ---------------------------------------------------------------------------

describe('multi-month scrollable — config', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('months: 3 does not warn', () => {
    createCalendarData({ months: 3 })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('months: 6 does not warn', () => {
    createCalendarData({ months: 6 })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('months: 12 does not warn', () => {
    createCalendarData({ months: 12 })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('months: 0 warns', () => {
    createCalendarData({ months: 0 })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('months must be a positive integer'),
    )
  })

  it('months: -1 warns', () => {
    createCalendarData({ months: -1 })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('months must be a positive integer'),
    )
  })

  it('months: 1.5 warns', () => {
    createCalendarData({ months: 1.5 })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('months must be a positive integer'),
    )
  })

  it('wizard + months >= 3 warns and falls back to months: 1', () => {
    createCalendarData({ months: 3, wizard: true })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('not compatible with wizard mode'),
    )
  })
})

// ---------------------------------------------------------------------------
// Scrollable state
// ---------------------------------------------------------------------------

describe('multi-month scrollable — state', () => {
  it('isScrollable is true for months >= 3', () => {
    const { c } = createComponent({ months: 3 })
    expect(c.isScrollable).toBe(true)
  })

  it('isScrollable is true for months: 6', () => {
    const { c } = createComponent({ months: 6 })
    expect(c.isScrollable).toBe(true)
  })

  it('isScrollable is false for months: 1', () => {
    const { c } = createComponent({ months: 1 })
    expect(c.isScrollable).toBe(false)
  })

  it('isScrollable is false for months: 2', () => {
    const { c } = createComponent({ months: 2 })
    expect(c.isScrollable).toBe(false)
  })

  it('scrollHeight defaults to 400', () => {
    const { c } = createComponent({ months: 3 })
    expect(c._scrollHeight).toBe(400)
  })

  it('scrollHeight can be customized', () => {
    const { c } = createComponent({ months: 3, scrollHeight: 600 })
    expect(c._scrollHeight).toBe(600)
  })

  it('_scrollVisibleIndex starts at 0', () => {
    const { c } = createComponent({ months: 3 })
    expect(c._scrollVisibleIndex).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Grid generation — months controls the exact count
// ---------------------------------------------------------------------------

describe('multi-month scrollable — grid', () => {
  it('months: 3 generates exactly 3 month grids', () => {
    const { c } = createComponent({ months: 3 })
    expect(c.grid.length).toBe(3)
  })

  it('months: 6 generates exactly 6 month grids', () => {
    const { c } = createComponent({ months: 6 })
    expect(c.grid.length).toBe(6)
  })

  it('months: 12 generates exactly 12 month grids', () => {
    const { c } = createComponent({ months: 12 })
    expect(c.grid.length).toBe(12)
  })

  it('grid months are consecutive', () => {
    const { c } = createComponent({ months: 6 })
    for (let i = 1; i < c.grid.length; i++) {
      const prev = c.grid[i - 1] as MonthGrid
      const curr = c.grid[i] as MonthGrid
      let expectedMonth = prev.month + 1
      let expectedYear = prev.year
      if (expectedMonth > 12) { expectedMonth = 1; expectedYear++ }
      expect(curr.month).toBe(expectedMonth)
      expect(curr.year).toBe(expectedYear)
    }
  })

  it('handles year rollover correctly', () => {
    // Start at November — grid should include Dec, Jan of next year
    const { c } = createComponent({ months: 4, value: '2025-11-15', format: 'YYYY-MM-DD' })
    const months = c.grid.map((g: MonthGrid) => `${g.year}-${g.month}`)
    expect(months).toContain('2025-12')
    expect(months).toContain('2026-1')
  })

  it('first grid month matches the calendar year/month', () => {
    const { c } = createComponent({ months: 3, value: '2026-05-15', format: 'YYYY-MM-DD' })
    const first = c.grid[0] as MonthGrid
    expect(first.year).toBe(2026)
    expect(first.month).toBe(5)
  })
})

// ---------------------------------------------------------------------------
// Scroll header label
// ---------------------------------------------------------------------------

describe('multi-month scrollable — scrollHeaderLabel', () => {
  it('reflects the month at _scrollVisibleIndex', () => {
    const { c } = createComponent({ months: 3, value: '2026-03-15', format: 'YYYY-MM-DD' })
    expect(c.scrollHeaderLabel).toContain('March')
    expect(c.scrollHeaderLabel).toContain('2026')
  })

  it('updates when _scrollVisibleIndex changes', () => {
    const { c } = createComponent({ months: 3, value: '2026-03-15', format: 'YYYY-MM-DD' })
    c._scrollVisibleIndex = 1
    expect(c.scrollHeaderLabel).toContain('April')
  })

  it('updates to last month when scrolled to end', () => {
    const { c } = createComponent({ months: 3, value: '2026-03-15', format: 'YYYY-MM-DD' })
    c._scrollVisibleIndex = 2
    expect(c.scrollHeaderLabel).toContain('May')
  })

  it('returns empty string for non-scrollable', () => {
    const { c } = createComponent({ months: 1 })
    expect(c.scrollHeaderLabel).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Navigation — arrows are no-ops in scrollable mode
// ---------------------------------------------------------------------------

describe('multi-month scrollable — navigation', () => {
  it('prev() is a no-op in scrollable day view', () => {
    const { c } = createComponent({ months: 3, value: '2026-06-15', format: 'YYYY-MM-DD' })
    const origMonth = c.month
    const origYear = c.year
    c.prev()
    expect(c.month).toBe(origMonth)
    expect(c.year).toBe(origYear)
  })

  it('next() is a no-op in scrollable day view', () => {
    const { c } = createComponent({ months: 3, value: '2026-06-15', format: 'YYYY-MM-DD' })
    const origMonth = c.month
    const origYear = c.year
    c.next()
    expect(c.month).toBe(origMonth)
    expect(c.year).toBe(origYear)
  })

  it('canGoPrev is false in scrollable day view', () => {
    const { c } = createComponent({ months: 3 })
    expect(c.canGoPrev).toBe(false)
  })

  it('canGoNext is false in scrollable day view', () => {
    const { c } = createComponent({ months: 3 })
    expect(c.canGoNext).toBe(false)
  })

  it('canGoPrev/canGoNext still work in month/year views', () => {
    const { c } = createComponent({ months: 3 })
    c.view = 'months' as 'days' | 'months' | 'years'
    // Should delegate to normal month/year view logic
    expect(typeof c.canGoPrev).toBe('boolean')
    expect(typeof c.canGoNext).toBe('boolean')
  })
})

// ---------------------------------------------------------------------------
// Selection across months
// ---------------------------------------------------------------------------

describe('multi-month scrollable — selection', () => {
  it('single selection works in scrollable mode', () => {
    const { c } = createComponent({ months: 3, value: '2026-03-15', format: 'YYYY-MM-DD' })
    const date = new CalendarDate(2026, 4, 10)
    c.selectDate(date)
    expect(c.isSelected(date)).toBe(true)
  })

  it('range selection works across scroll months', () => {
    const { c } = createComponent({ months: 3, mode: 'range' })
    const start = new CalendarDate(2026, 2, 10)
    const end = new CalendarDate(2026, 4, 5)
    c.selectDate(start)
    c.selectDate(end)
    expect(c.isRangeStart(start)).toBe(true)
    expect(c.isRangeEnd(end)).toBe(true)
  })

  it('dayClasses hides other-month days in scrollable mode', () => {
    const { c } = createComponent({ months: 3 })
    const mg = c.grid[0] as MonthGrid
    const otherCell = mg.rows.flat().find((cell) => !cell.isCurrentMonth)
    if (otherCell) {
      const classes = c.dayClasses(otherCell)
      expect(classes['rc-day--hidden']).toBe(true)
    }
  })

  it('dayClasses does not hide other-month days in single month mode', () => {
    const { c } = createComponent({ months: 1 })
    const mg = c.grid[0] as MonthGrid
    const otherCell = mg.rows.flat().find((cell) => !cell.isCurrentMonth)
    if (otherCell) {
      const classes = c.dayClasses(otherCell)
      expect(classes['rc-day--hidden']).toBe(false)
    }
  })
})

// ---------------------------------------------------------------------------
// Keyboard navigation
// ---------------------------------------------------------------------------

describe('multi-month scrollable — keyboard nav', () => {
  it('arrow keys cross month boundaries', () => {
    const { c } = createComponent({ months: 3, value: '2026-03-31', format: 'YYYY-MM-DD' })
    c.focusedDate = new CalendarDate(2026, 3, 31)
    c._moveFocus(1) // ArrowRight → April 1
    expect(c.focusedDate!.month).toBe(4)
    expect(c.focusedDate!.day).toBe(1)
  })

  it('PageDown moves focus forward by one month', () => {
    const { c } = createComponent({ months: 3, value: '2026-03-15', format: 'YYYY-MM-DD' })
    c.focusedDate = new CalendarDate(2026, 3, 15)
    c._moveFocusByMonths(1)
    expect(c.focusedDate!.month).toBe(4)
  })

  it('PageUp moves focus backward by one month', () => {
    const { c } = createComponent({ months: 3, value: '2026-03-15', format: 'YYYY-MM-DD' })
    c.focusedDate = new CalendarDate(2026, 3, 15)
    c._moveFocusByMonths(-1)
    expect(c.focusedDate!.month).toBe(2)
  })

  it('_setFocusedDate does not change year/month state in scrollable mode', () => {
    const { c } = createComponent({ months: 3, value: '2026-03-15', format: 'YYYY-MM-DD' })
    const origMonth = c.month
    const origYear = c.year
    c._setFocusedDate(new CalendarDate(2026, 4, 10))
    expect(c.month).toBe(origMonth)
    expect(c.year).toBe(origYear)
  })
})

// ---------------------------------------------------------------------------
// Backward compatibility
// ---------------------------------------------------------------------------

describe('multi-month scrollable — backward compat', () => {
  it('months: 1 behaves identically (no scrollable)', () => {
    const { c } = createComponent({ months: 1 })
    expect(c.isScrollable).toBe(false)
    expect(c.grid.length).toBe(1)
  })

  it('months: 2 behaves identically (dual month, no scrollable)', () => {
    const { c } = createComponent({ months: 2 })
    expect(c.isScrollable).toBe(false)
    expect(c.grid.length).toBe(2)
  })

  it('prev/next in months: 1 still changes month/year', () => {
    const { c } = createComponent({ months: 1, value: '2026-06-15', format: 'YYYY-MM-DD' })
    c.next()
    expect(c.month).toBe(7)
    c.prev()
    expect(c.month).toBe(6)
  })

  it('wizard mode forces months: 1 when config has months >= 3', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { c } = createComponent({ months: 3, wizard: true })
    expect(c.isScrollable).toBe(false)
    expect(c.monthCount).toBe(1)
    warnSpy.mockRestore()
  })
})

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

describe('multi-month scrollable — lifecycle', () => {
  it('destroy cleans up scroll handler', () => {
    const { c } = createComponent({ months: 3 })
    const removeEventListenerSpy = vi.fn()
    const handler = () => {}
    c._scrollHandler = handler
    c._scrollContainerEl = { removeEventListener: removeEventListenerSpy } as unknown as HTMLElement

    c.destroy()

    expect(removeEventListenerSpy).toHaveBeenCalledWith('scroll', handler)
    expect(c._scrollHandler).toBeNull()
    expect(c._scrollContainerEl).toBeNull()
  })

  it('goTo navigates correctly in scrollable mode', () => {
    const { c, flushNextTick } = createComponent({ months: 6, value: '2026-03-15', format: 'YYYY-MM-DD' })
    c.goTo(2026, 5)
    flushNextTick()
    expect(c.year).toBe(2026)
    expect(c.month).toBe(5)
    // Grid should have been rebuilt starting from May
    const first = c.grid[0] as MonthGrid
    expect(first.year).toBe(2026)
    expect(first.month).toBe(5)
  })
})
