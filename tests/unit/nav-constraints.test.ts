import { describe, it, expect } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'
import { withAlpineMocks } from '../helpers'

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

  it('skips over disabledMonths to the next enabled month (no min/max bounds)', () => {
    // Disable months 1-5 and 7-12, so only June is ever enabled. With no date bounds,
    // June recurs every year — navigation hops across the 11-month disabled gap to the
    // next/previous June rather than dead-ending at the adjacent (disabled) month.
    const c = createCalendarData({
      disabledMonths: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12],
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)

    // A selectable month (June of an adjacent year) is reachable in both directions.
    expect(c.canGoPrev).toBe(true)
    expect(c.canGoNext).toBe(true)

    c.next()
    expect(c.year).toBe(2026)
    expect(c.month).toBe(6) // jumped over Jul 2025..May 2026 to the next enabled June

    c.goTo(2025, 6)
    c.prev()
    expect(c.year).toBe(2024)
    expect(c.month).toBe(6) // jumped back over the gap to the previous enabled June
  })

  it('disabledMonths within a bounded range disables navigation past the bounds', () => {
    // Same single-enabled-month constraint, but bounded so only one June exists.
    const c = createCalendarData({
      disabledMonths: [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12],
      minDate: '2025-01-01',
      maxDate: '2025-12-31',
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2025, 6)

    // June 2024 / June 2026 are out of range, so no other enabled month is reachable.
    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// canGoPrev / canGoNext — Days view: crossing a gap of unavailable months
// ---------------------------------------------------------------------------

describe('days-view navigation across a gap of fully-unavailable months', () => {
  // Booking-calendar shape: a product has departures in Aug–Oct 2026 (A..A+2) and
  // then nothing until May 2027 (G); the gap Nov 2026..Apr 2027 is in-range but has
  // no available days. Months past G up to maxDate are also unavailable.
  //
  //   minDate = 2026-08-01 (A)          maxDate = 2028-02-28 (~18 months later)
  //   available months: Aug/Sep/Oct 2026, May 2027
  const AVAILABLE = new Set(['2026-8', '2026-9', '2026-10', '2027-5'])
  const dateMetadata = (d: CalendarDate) =>
    AVAILABLE.has(`${d.year}-${d.month}`) ? undefined : { availability: 'unavailable' as const }

  const makeCalendar = () => {
    const c = createCalendarData({
      minDate: '2026-08-01',
      maxDate: '2028-02-28',
      dateMetadata,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    return c
  }

  it('canGoNext at the last month before the gap (Oct 2026) reaches across to May 2027', () => {
    const c = makeCalendar()
    c.goTo(2026, 10) // A+2 — last available month before the gap

    // Old behavior only checked the immediately-next month (Nov 2026, unavailable)
    // and wrongly disabled the arrow. It must now see past the gap to May 2027.
    expect(c.canGoNext).toBe(true)
  })

  it('next() from Oct 2026 jumps over the gap straight to May 2027', () => {
    const c = makeCalendar()
    c.goTo(2026, 10)

    c.next()

    expect(c.year).toBe(2027)
    expect(c.month).toBe(5) // G — skipped Nov 2026..Apr 2027
  })

  it('canGoNext is false at the last selectable month in range (May 2027)', () => {
    const c = makeCalendar()
    c.goTo(2027, 5) // G — nothing selectable afterward before maxDate

    expect(c.canGoNext).toBe(false)
  })

  it('canGoPrev is false at the first selectable month (Aug 2026, == minDate month)', () => {
    const c = makeCalendar()
    c.goTo(2026, 8) // A — July 2026 is before minDate, nothing earlier is selectable

    expect(c.canGoPrev).toBe(false)
  })

  it('canGoPrev at May 2027 reaches back across the gap, and prev() lands on Oct 2026', () => {
    const c = makeCalendar()
    c.goTo(2027, 5) // G

    expect(c.canGoPrev).toBe(true)

    c.prev()

    expect(c.year).toBe(2026)
    expect(c.month).toBe(10) // A+2 — skipped the gap going backward
  })

  it('one-step navigation still works when the adjacent month is available', () => {
    const c = makeCalendar()
    c.goTo(2026, 10) // A+2

    c.prev()

    expect(c.year).toBe(2026)
    expect(c.month).toBe(9) // A+1 — adjacent and available, no skipping
  })

  it('does not skip past minDate/maxDate edges when there is no metadata gap', () => {
    // Pure min/max bounds, no metadata: arrows must still hard-stop at the edges.
    const c = createCalendarData({ minDate: '2026-08-01', maxDate: '2026-10-31' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2026, 8)
    expect(c.canGoPrev).toBe(false) // July 2026 is before minDate
    expect(c.canGoNext).toBe(true) // Sep 2026 is in range

    c.goTo(2026, 10)
    expect(c.canGoNext).toBe(false) // Nov 2026 is after maxDate
    expect(c.canGoPrev).toBe(true)
  })

  it('navigation works from inside the gap (a fully-unavailable in-range month)', () => {
    const c = makeCalendar()
    c.goTo(2027, 1) // Jan 2027 — squarely inside the Nov 2026..Apr 2027 gap

    expect(c.canGoPrev).toBe(true)
    expect(c.canGoNext).toBe(true)

    c.next()
    expect(c.year).toBe(2027)
    expect(c.month).toBe(5) // forward out of the gap → May 2027

    c.goTo(2027, 1)
    c.prev()
    expect(c.year).toBe(2026)
    expect(c.month).toBe(10) // backward out of the gap → Oct 2026
  })

  it('next()/prev() are a no-op (and trigger no slide) when navigation is exhausted', () => {
    // Mirrors the month-view "no phantom slide on a no-op" guarantee: the null-guard
    // returns before _navDirection is set, so an exhausted arrow leaves no stale slide.
    const c = makeCalendar()

    c.goTo(2027, 5) // G — canGoNext is false here
    expect(c.canGoNext).toBe(false)
    c.next()
    expect(c.year).toBe(2027)
    expect(c.month).toBe(5) // unchanged
    expect(c._navDirection).toBe('') // no slide animation queued

    c.goTo(2026, 8) // A — canGoPrev is false here
    expect(c.canGoPrev).toBe(false)
    c.prev()
    expect(c.year).toBe(2026)
    expect(c.month).toBe(8) // unchanged
    expect(c._navDirection).toBe('')
  })

  it('keyboard PageDown/PageUp cross the gap just like the arrows', () => {
    // PageDown/PageUp dispatch to _moveFocusByMonths(±1); it must hop the multi-month
    // gap rather than dead-ending at the adjacent unavailable month (the day-by-day
    // skip only reaches ~31 days, well short of the ~6-month gap).
    const c = makeCalendar()
    c.goTo(2026, 10)
    c.focusedDate = new CalendarDate(2026, 10, 15) // a selectable day in Oct 2026

    c._moveFocusByMonths(1) // PageDown
    expect((c.focusedDate as CalendarDate).toISO()).toBe('2027-05-01') // first selectable day in May 2027
    expect(c.year).toBe(2027)
    expect(c.month).toBe(5) // view followed the focus across the gap

    c.focusedDate = new CalendarDate(2027, 5, 10)
    c._moveFocusByMonths(-1) // PageUp
    expect((c.focusedDate as CalendarDate).toISO()).toBe('2026-10-01') // first selectable day in Oct 2026
    expect(c.year).toBe(2026)
    expect(c.month).toBe(10)
  })

  it('keyboard paging still hard-stops at minDate/maxDate (no move past the edge)', () => {
    const c = makeCalendar()
    c.goTo(2027, 5)
    c.focusedDate = new CalendarDate(2027, 5, 10) // last selectable month

    c._moveFocusByMonths(1) // PageDown — nothing selectable after May 2027 within maxDate
    expect((c.focusedDate as CalendarDate).toISO()).toBe('2027-05-10') // unchanged
  })

  it('honors a minDate that cuts partway into the first available month', () => {
    // minDate mid-month: Aug 2026 is only partially in range (Aug 15 onward).
    const c = createCalendarData({ minDate: '2026-08-15', maxDate: '2026-10-31' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2026, 8)
    // The partial first month is still selectable…
    expect(c._firstSelectableDay(2026, 8)?.toISO()).toBe('2026-08-15')
    // …but there is nothing selectable before it, so backward navigation hard-stops.
    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(true)
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
