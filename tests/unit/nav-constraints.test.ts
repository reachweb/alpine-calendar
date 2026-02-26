import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
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
  const nextTickCallbacks: (() => void)[] = []

  Object.assign(component, {
    $dispatch: dispatchSpy,
    $watch: watchSpy,
    $refs: options?.refs ?? {},
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
// canGoPrev / canGoNext — Days view
// ---------------------------------------------------------------------------

describe('canGoPrev / canGoNext — days view', () => {
  it('returns true when no constraints', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.canGoPrev).toBe(true)
    expect(c.canGoNext).toBe(true)
  })

  it('canGoPrev is false when previous month is before minDate', () => {
    // Set minDate to the 1st of the current viewing month
    const c = createCalendarData({ minDate: '2025-06-01' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)

    // Previous month (May 2025) is entirely before minDate (June 1)
    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(true)
  })

  it('canGoNext is false when next month is after maxDate', () => {
    const c = createCalendarData({ maxDate: '2025-06-30' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)

    expect(c.canGoPrev).toBe(true)
    expect(c.canGoNext).toBe(false)
  })

  it('both false when min and max constrain to a single month', () => {
    const c = createCalendarData({ minDate: '2025-06-01', maxDate: '2025-06-30' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)

    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(false)
  })

  it('canGoPrev is true when previous month partially overlaps minDate', () => {
    // minDate is June 15, viewing July — previous month (June) has dates >= minDate
    const c = createCalendarData({ minDate: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 7)

    expect(c.canGoPrev).toBe(true)
  })

  it('canGoNext is true when next month partially overlaps maxDate', () => {
    // maxDate is July 15, viewing June — next month (July) has dates <= maxDate
    const c = createCalendarData({ maxDate: '2025-07-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)

    expect(c.canGoNext).toBe(true)
  })

  it('canGoPrev handles year boundary (Jan → Dec prev year)', () => {
    const c = createCalendarData({ minDate: '2025-01-01' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 1)

    // Previous month would be Dec 2024, which is before minDate
    expect(c.canGoPrev).toBe(false)
  })

  it('canGoNext handles year boundary (Dec → Jan next year)', () => {
    const c = createCalendarData({ maxDate: '2025-12-31' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 12)

    // Next month would be Jan 2026, which is after maxDate
    expect(c.canGoNext).toBe(false)
  })

  it('respects disabledMonths constraint', () => {
    // Disable months 1-5 and 7-12, only June is enabled
    const c = createCalendarData({
      disabledMonths: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12],
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)

    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canGoPrev / canGoNext — Months view
// ---------------------------------------------------------------------------

describe('canGoPrev / canGoNext — months view', () => {
  it('returns true when no constraints', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    c.view = 'months'

    expect(c.canGoPrev).toBe(true)
    expect(c.canGoNext).toBe(true)
  })

  it('canGoPrev is false when previous year is disabled', () => {
    const c = createCalendarData({ minDate: '2025-01-01' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 1)
    c.view = 'months'

    // Previous year (2024) is entirely before minDate
    expect(c.canGoPrev).toBe(false)
  })

  it('canGoNext is false when next year is disabled', () => {
    const c = createCalendarData({ maxDate: '2025-12-31' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 1)
    c.view = 'months'

    // Next year (2026) is entirely after maxDate
    expect(c.canGoNext).toBe(false)
  })

  it('canGoPrev is true when previous year is partially available', () => {
    const c = createCalendarData({ minDate: '2024-06-01' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 1)
    c.view = 'months'

    // Previous year (2024) has months from June onward
    expect(c.canGoPrev).toBe(true)
  })

  it('respects disabledYears constraint', () => {
    const c = createCalendarData({ disabledYears: [2024] })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 1)
    c.view = 'months'

    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// canGoPrev / canGoNext — Years view
// ---------------------------------------------------------------------------

describe('canGoPrev / canGoNext — years view', () => {
  it('returns true when no constraints', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    c.view = 'years'

    expect(c.canGoPrev).toBe(true)
    expect(c.canGoNext).toBe(true)
  })

  it('canGoPrev is false when entire previous decade is before minDate', () => {
    // Year grid uses 12-year blocks: floor(year/12)*12
    // If we're viewing 2024 (block 2016-2027), prev block is 2004-2015
    const c = createCalendarData({ minDate: '2016-01-01' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2020, 1) // Block: 2016-2027
    c.view = 'years'

    // Previous block (2004-2015) is entirely before minDate
    expect(c.canGoPrev).toBe(false)
  })

  it('canGoNext is false when entire next decade is after maxDate', () => {
    const c = createCalendarData({ maxDate: '2027-12-31' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2020, 1) // Block: 2016-2027
    c.view = 'years'

    // Next block (2028-2039) is entirely after maxDate
    expect(c.canGoNext).toBe(false)
  })

  it('canGoPrev is true when at least one year in previous block is available', () => {
    const c = createCalendarData({ minDate: '2015-06-01' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2020, 1) // Block: 2016-2027
    c.view = 'years'

    // Previous block (2004-2015) has year 2015 which has months >= minDate
    expect(c.canGoPrev).toBe(true)
  })

  it('canGoNext is true when at least one year in next block is available', () => {
    const c = createCalendarData({ maxDate: '2028-06-30' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2020, 1) // Block: 2016-2027
    c.view = 'years'

    // Next block (2028-2039) has year 2028 which has months <= maxDate
    expect(c.canGoNext).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// updateConstraints interaction
// ---------------------------------------------------------------------------

describe('canGoPrev / canGoNext — after updateConstraints', () => {
  it('reflects updated constraints', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)

    // Initially no constraints
    expect(c.canGoPrev).toBe(true)
    expect(c.canGoNext).toBe(true)

    // Apply tight constraints
    c.updateConstraints({ minDate: '2025-06-01', maxDate: '2025-06-30' })

    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(false)
  })

  it('re-enables navigation when constraints are loosened', () => {
    const c = createCalendarData({ minDate: '2025-06-01', maxDate: '2025-06-30' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)
    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(false)

    // Loosen constraints
    c.updateConstraints({ minDate: '2024-01-01', maxDate: '2026-12-31' })

    expect(c.canGoPrev).toBe(true)
    expect(c.canGoNext).toBe(true)
  })
})
