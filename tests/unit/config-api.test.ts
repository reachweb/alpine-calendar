import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { calendarPlugin } from '../../src/index'
import { CalendarDate } from '../../src/core/calendar-date'

// ---------------------------------------------------------------------------
// Helpers
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

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------

describe('config validation', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('warns when months is not 1 or 2', () => {
    createCalendarData({ months: 3 as never })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('months must be 1 or 2'),
    )
  })

  it('warns when firstDay is out of range', () => {
    createCalendarData({ firstDay: 7 as never })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('firstDay must be 0-6'),
    )
  })

  it('warns when firstDay is negative', () => {
    createCalendarData({ firstDay: -1 as never })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('firstDay must be 0-6'),
    )
  })

  it('warns when minDate is invalid', () => {
    createCalendarData({ minDate: 'not-a-date' })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid minDate'),
    )
  })

  it('warns when maxDate is invalid', () => {
    createCalendarData({ maxDate: 'garbage' })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('invalid maxDate'),
    )
  })

  it('warns when minDate is after maxDate', () => {
    createCalendarData({ minDate: '2025-12-01', maxDate: '2025-01-01' })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('minDate'),
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('after maxDate'),
    )
  })

  it('warns when minRange exceeds maxRange', () => {
    createCalendarData({ mode: 'range', minRange: 10, maxRange: 3 })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('minRange'),
    )
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('exceeds maxRange'),
    )
  })

  it('warns when wizard mode with non-single selection', () => {
    createCalendarData({ wizard: true, mode: 'range' })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('wizard mode is designed for single selection'),
    )
  })

  it('does not warn for valid config', () => {
    createCalendarData({
      mode: 'single',
      months: 2,
      firstDay: 1,
      minDate: '2025-01-01',
      maxDate: '2025-12-31',
    })
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('does not warn for empty config', () => {
    createCalendarData()
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('still creates a working component despite warnings', () => {
    const c = createCalendarData({ months: 99 as never, firstDay: -5 as never })
    withAlpineMocks(c)
    c.init()
    // Component should still work
    expect(c.mode).toBe('single')
    expect(c.grid.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// Global defaults
// ---------------------------------------------------------------------------

describe('global defaults', () => {
  afterEach(() => {
    calendarPlugin.resetDefaults()
  })

  it('defaults() sets global config', () => {
    calendarPlugin.defaults({ firstDay: 1, locale: 'el' })
    const defaults = calendarPlugin.getDefaults()
    expect(defaults.firstDay).toBe(1)
    expect(defaults.locale).toBe('el')
  })

  it('defaults() merges with previous defaults', () => {
    calendarPlugin.defaults({ firstDay: 1 })
    calendarPlugin.defaults({ locale: 'el' })
    const defaults = calendarPlugin.getDefaults()
    expect(defaults.firstDay).toBe(1)
    expect(defaults.locale).toBe('el')
  })

  it('defaults() can override previous defaults', () => {
    calendarPlugin.defaults({ firstDay: 1 })
    calendarPlugin.defaults({ firstDay: 0 })
    expect(calendarPlugin.getDefaults().firstDay).toBe(0)
  })

  it('resetDefaults() clears all defaults', () => {
    calendarPlugin.defaults({ firstDay: 1, locale: 'de' })
    calendarPlugin.resetDefaults()
    expect(calendarPlugin.getDefaults()).toEqual({})
  })

  it('getDefaults() returns a copy (not a reference)', () => {
    calendarPlugin.defaults({ firstDay: 1 })
    const d = calendarPlugin.getDefaults()
    d.firstDay = 5
    expect(calendarPlugin.getDefaults().firstDay).toBe(1)
  })

  it('global defaults are applied when creating components via plugin', () => {
    calendarPlugin.defaults({ firstDay: 1 })

    // Simulate Alpine.data registration
    let factory: ((config?: Record<string, unknown>) => ReturnType<typeof createCalendarData>) | null = null
    const mockAlpine = {
      data(name: string, fn: typeof factory) {
        if (name === 'calendar') factory = fn as typeof factory
      },
    }

    calendarPlugin(mockAlpine as never)

    const instance = factory!({})
    expect(instance.firstDay).toBe(1)
  })

  it('instance config overrides global defaults', () => {
    calendarPlugin.defaults({ firstDay: 1 })

    let factory: ((config?: Record<string, unknown>) => ReturnType<typeof createCalendarData>) | null = null
    const mockAlpine = {
      data(name: string, fn: typeof factory) {
        if (name === 'calendar') factory = fn as typeof factory
      },
    }

    calendarPlugin(mockAlpine as never)

    const instance = factory!({ firstDay: 0 })
    expect(instance.firstDay).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// updateConstraints — runtime config changes
// ---------------------------------------------------------------------------

describe('updateConstraints', () => {
  it('updates minDate/maxDate at runtime', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // Initially no constraints — all dates selectable
    const d = new CalendarDate(2025, 1, 1)
    expect(c._isDisabledDate(d)).toBe(false)

    // Update constraints: minDate in the future
    c.updateConstraints({ minDate: '2025-06-01' })

    // Jan 1 should now be disabled
    expect(c._isDisabledDate(d)).toBe(true)
    // June 15 should be enabled
    expect(c._isDisabledDate(new CalendarDate(2025, 6, 15))).toBe(false)
  })

  it('updates disabledDaysOfWeek at runtime', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // No weekday constraints initially
    // 2025-01-04 is Saturday (day 6), 2025-01-05 is Sunday (day 0)
    const sat = new CalendarDate(2025, 1, 4)
    const sun = new CalendarDate(2025, 1, 5)
    expect(c._isDisabledDate(sat)).toBe(false)
    expect(c._isDisabledDate(sun)).toBe(false)

    // Disable weekends
    c.updateConstraints({ disabledDaysOfWeek: [0, 6] })

    expect(c._isDisabledDate(sat)).toBe(true)
    expect(c._isDisabledDate(sun)).toBe(true)
    // Monday should still be enabled
    expect(c._isDisabledDate(new CalendarDate(2025, 1, 6))).toBe(false)
  })

  it('updates disabledDates at runtime', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const target = new CalendarDate(2025, 3, 15)
    expect(c._isDisabledDate(target)).toBe(false)

    c.updateConstraints({ disabledDates: ['2025-03-15'] })
    expect(c._isDisabledDate(target)).toBe(true)
  })

  it('rebuilds grids after constraint update', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const gridBefore = c.grid
    c.updateConstraints({ minDate: '2025-06-01' })
    // Grid should be rebuilt (new reference)
    expect(c.grid).not.toBe(gridBefore)
  })

  it('updates month-level constraints', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // Initially no month constraints
    expect(c._isMonthDisabled(2025, 1)).toBe(false)

    // Disable specific months
    c.updateConstraints({ disabledMonths: [1, 2, 3] })
    expect(c._isMonthDisabled(2025, 1)).toBe(true)
    expect(c._isMonthDisabled(2025, 4)).toBe(false)
  })

  it('updates year-level constraints', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c._isYearDisabled(2020)).toBe(false)

    c.updateConstraints({ minDate: '2025-01-01', maxDate: '2030-12-31' })
    expect(c._isYearDisabled(2020)).toBe(true)
    expect(c._isYearDisabled(2025)).toBe(false)
  })

  it('updates range validation constraints', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const start = new CalendarDate(2025, 6, 1)
    const end = new CalendarDate(2025, 6, 3) // 3-day range

    // Initially no range constraints
    expect(c._isRangeValid(start, end)).toBe(true)

    // Set minRange of 5
    c.updateConstraints({ minRange: 5 })
    expect(c._isRangeValid(start, end)).toBe(false)
    expect(c._isRangeValid(start, new CalendarDate(2025, 6, 5))).toBe(true)
  })

  it('replaces constraints entirely (no merging with previous)', () => {
    const c = createCalendarData({
      mode: 'single',
      disabledDaysOfWeek: [0, 6],
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const sat = new CalendarDate(2025, 1, 4) // Saturday
    expect(c._isDisabledDate(sat)).toBe(true)

    // Update with only minDate — weekday constraint should be gone
    c.updateConstraints({ minDate: '2025-01-01' })
    expect(c._isDisabledDate(sat)).toBe(false)
  })
})
