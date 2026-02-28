import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'
import type { DateMeta } from '../../src/core/metadata'

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

function makeCell(year: number, month: number, day: number, isDisabled = false) {
  return {
    date: new CalendarDate(year, month, day),
    isCurrentMonth: true,
    isToday: false,
    isDisabled,
  }
}

// ---------------------------------------------------------------------------
// dayMeta()
// ---------------------------------------------------------------------------

describe('dayMeta()', () => {
  it('returns undefined when no dateMetadata is configured', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const cell = makeCell(2026, 3, 15)
    expect(c.dayMeta(cell)).toBeUndefined()
  })

  it('returns metadata for a date in the object map', () => {
    const meta: DateMeta = { label: '$150', availability: 'available' }
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': meta },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.dayMeta(makeCell(2026, 3, 15))).toEqual(meta)
  })

  it('returns undefined for a date not in the map', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { label: '$150' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.dayMeta(makeCell(2026, 3, 20))).toBeUndefined()
  })

  it('returns metadata from callback function', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: (date) => {
        if (date.day === 15) return { label: 'special' }
        return undefined
      },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.dayMeta(makeCell(2026, 3, 15))).toEqual({ label: 'special' })
    expect(c.dayMeta(makeCell(2026, 3, 16))).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Unavailable dates → disabled, not selectable
// ---------------------------------------------------------------------------

describe('unavailable dates', () => {
  it('marks unavailable dates as isDisabled in the grid', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // Navigate to March 2026 and rebuild grid (watchers are mocked)
    c.month = 3
    c.year = 2026
    c._rebuildGrid()

    const march = c.grid.find((g) => g.month === 3 && g.year === 2026)
    expect(march).toBeDefined()
    const day15 = march!.rows.flat().find((cell) => cell.date.day === 15 && cell.isCurrentMonth)
    expect(day15).toBeDefined()
    expect(day15!.isDisabled).toBe(true)
  })

  it('prevents selecting unavailable dates via selectDate()', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 15))
    expect(c.selectedDates).toHaveLength(0)
  })

  it('prevents selecting unavailable dates via setValue()', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue('2026-03-15')
    expect(c.selectedDates).toHaveLength(0)
  })

  it('prevents setting unavailable dates as initial value', () => {
    const c = createCalendarData({
      mode: 'single',
      value: '15/03/2026',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.selectedDates).toHaveLength(0)
  })

  it('adds rc-day--unavailable class', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const cell = makeCell(2026, 3, 15, true)
    const classes = c.dayClasses(cell)
    expect(classes['rc-day--unavailable']).toBe(true)
  })

  it('shows "Unavailable" in tooltip for metadata-disabled dates', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const cell = makeCell(2026, 3, 15, true)
    const title = c.dayTitle(cell)
    expect(title).toContain('Unavailable')
  })
})

// ---------------------------------------------------------------------------
// Available dates
// ---------------------------------------------------------------------------

describe('available dates', () => {
  it('adds rc-day--available class', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'available' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const cell = makeCell(2026, 3, 15)
    const classes = c.dayClasses(cell)
    expect(classes['rc-day--available']).toBe(true)
  })

  it('available dates are selectable', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'available' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 15))
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2026-03-15')
  })
})

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

describe('labels', () => {
  it('adds rc-day--has-label class when label is set', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { label: '$150' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const classes = c.dayClasses(makeCell(2026, 3, 15))
    expect(classes['rc-day--has-label']).toBe(true)
  })

  it('does not add rc-day--has-label when no label', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'available' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const classes = c.dayClasses(makeCell(2026, 3, 15))
    expect(classes['rc-day--has-label']).toBe(false)
  })

  it('includes label text in tooltip', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { label: '$150' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const title = c.dayTitle(makeCell(2026, 3, 15))
    expect(title).toContain('$150')
  })

  it('tooltip combines "Unavailable" and label for unavailable dates', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { label: 'Sold', availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const title = c.dayTitle(makeCell(2026, 3, 15, true))
    expect(title).toContain('Unavailable')
    expect(title).toContain('Sold')
  })
})

// ---------------------------------------------------------------------------
// cssClass from metadata
// ---------------------------------------------------------------------------

describe('cssClass from metadata', () => {
  it('applies single custom class', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { cssClass: 'premium' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const classes = c.dayClasses(makeCell(2026, 3, 15))
    expect(classes['premium']).toBe(true)
  })

  it('applies multiple space-separated custom classes', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { cssClass: 'premium highlight' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const classes = c.dayClasses(makeCell(2026, 3, 15))
    expect(classes['premium']).toBe(true)
    expect(classes['highlight']).toBe(true)
  })

  it('does not add custom classes when cssClass is undefined', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { label: '$100' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const classes = c.dayClasses(makeCell(2026, 3, 15))
    // No extra custom keys beyond the standard rc-day--* classes
    const customKeys = Object.keys(classes).filter((k) => !k.startsWith('rc-day'))
    expect(customKeys).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// dayStyle()
// ---------------------------------------------------------------------------

describe('dayStyle()', () => {
  it('returns CSS custom property when color is set', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { color: '#16a34a' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const style = c.dayStyle(makeCell(2026, 3, 15))
    expect(style).toBe('--color-calendar-day-meta: #16a34a;')
  })

  it('returns empty string when no color', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { label: '$150' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.dayStyle(makeCell(2026, 3, 15))).toBe('')
  })

  it('returns empty string when no metadata', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.dayStyle(makeCell(2026, 3, 15))).toBe('')
  })
})

// ---------------------------------------------------------------------------
// updateDateMetadata() — runtime updates
// ---------------------------------------------------------------------------

describe('updateDateMetadata()', () => {
  it('updates metadata at runtime', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // Initially no metadata
    expect(c.dayMeta(makeCell(2026, 3, 15))).toBeUndefined()

    // Update metadata
    c.updateDateMetadata({ '2026-03-15': { label: '$200' } })

    expect(c.dayMeta(makeCell(2026, 3, 15))).toEqual({ label: '$200' })
  })

  it('bumps _metadataRev on update', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const rev0 = c._metadataRev
    c.updateDateMetadata({ '2026-03-15': { label: '$200' } })
    expect(c._metadataRev).toBe(rev0 + 1)
  })

  it('rebuilds grid after metadata update', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.month = 3
    c.year = 2026
    c._rebuildGrid()

    // Before: day 15 should be enabled
    let march = c.grid.find((g) => g.month === 3 && g.year === 2026)
    let day15 = march?.rows.flat().find((cell) => cell.date.day === 15 && cell.isCurrentMonth)
    expect(day15?.isDisabled).toBe(false)

    // Make unavailable (updateDateMetadata calls _rebuildGrid internally)
    c.updateDateMetadata({ '2026-03-15': { availability: 'unavailable' } })

    march = c.grid.find((g) => g.month === 3 && g.year === 2026)
    day15 = march?.rows.flat().find((cell) => cell.date.day === 15 && cell.isCurrentMonth)
    expect(day15?.isDisabled).toBe(true)
  })

  it('can clear metadata by passing null', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { label: '$150' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.dayMeta(makeCell(2026, 3, 15))).toBeDefined()

    c.updateDateMetadata(null)
    expect(c.dayMeta(makeCell(2026, 3, 15))).toBeUndefined()
  })

  it('can replace metadata with callback', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.updateDateMetadata((date) => {
      if (date.day % 2 === 0) return { label: 'even' }
      return undefined
    })

    expect(c.dayMeta(makeCell(2026, 3, 14))).toEqual({ label: 'even' })
    expect(c.dayMeta(makeCell(2026, 3, 15))).toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// Coexistence with constraint-disabled dates
// ---------------------------------------------------------------------------

describe('coexistence with constraints', () => {
  it('constraint-disabled dates remain disabled regardless of metadata', () => {
    const c = createCalendarData({
      mode: 'single',
      disabledDates: ['2026-03-15'],
      dateMetadata: { '2026-03-15': { availability: 'available', label: '$150' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.month = 3
    c.year = 2026
    c._rebuildGrid()

    const march = c.grid.find((g) => g.month === 3 && g.year === 2026)
    const day15 = march?.rows.flat().find((cell) => cell.date.day === 15 && cell.isCurrentMonth)
    expect(day15?.isDisabled).toBe(true)

    // Also cannot select via selectDate
    c.selectDate(new CalendarDate(2026, 3, 15))
    expect(c.selectedDates).toHaveLength(0)
  })

  it('constraint-disabled dates show constraint reasons in tooltip, not "Unavailable"', () => {
    const c = createCalendarData({
      mode: 'single',
      disabledDates: ['2026-03-15'],
      dateMetadata: { '2026-03-15': { availability: 'available' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const cell = makeCell(2026, 3, 15, true)
    const title = c.dayTitle(cell)
    // Should mention the constraint reason, not "Unavailable"
    expect(title).not.toBe('')
    expect(title).not.toBe('Unavailable')
  })

  it('metadata unavailability works independently of constraints', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 15))
    expect(c.selectedDates).toHaveLength(0)

    // Day 16 (no metadata) should be selectable
    c.selectDate(new CalendarDate(2026, 3, 16))
    expect(c.selectedDates).toHaveLength(1)
  })

  it('dates with no metadata and no constraints are selectable', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 20))
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2026-03-20')
  })
})

// ---------------------------------------------------------------------------
// Range mode with metadata
// ---------------------------------------------------------------------------

describe('range mode with metadata', () => {
  it('unavailable dates block range selection', () => {
    const c = createCalendarData({
      mode: 'range',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // Start range at day 10
    c.selectDate(new CalendarDate(2026, 3, 10))
    // Try to select unavailable day 15 as end
    c.selectDate(new CalendarDate(2026, 3, 15))
    // Should still be partial range (only start)
    expect(c.selectedDates).toHaveLength(1)
  })

  it('isDateSelectableForRange returns false for unavailable dates', () => {
    const c = createCalendarData({
      mode: 'range',
      dateMetadata: { '2026-03-15': { availability: 'unavailable' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // Start a range
    c.selectDate(new CalendarDate(2026, 3, 10))

    expect(c.isDateSelectableForRange(new CalendarDate(2026, 3, 15))).toBe(false)
    expect(c.isDateSelectableForRange(new CalendarDate(2026, 3, 20))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Multiple mode with metadata
// ---------------------------------------------------------------------------

describe('multiple mode with metadata', () => {
  it('cannot select unavailable dates', () => {
    const c = createCalendarData({
      mode: 'multiple',
      dateMetadata: {
        '2026-03-15': { availability: 'unavailable' },
        '2026-03-16': { availability: 'available' },
      },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2026, 3, 15))
    c.selectDate(new CalendarDate(2026, 3, 16))
    c.selectDate(new CalendarDate(2026, 3, 17))

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates.map((d) => d.toISO())).toEqual(['2026-03-16', '2026-03-17'])
  })
})

// ---------------------------------------------------------------------------
// dayTitle edge cases
// ---------------------------------------------------------------------------

describe('dayTitle edge cases', () => {
  it('returns empty string for enabled date with no metadata', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.dayTitle(makeCell(2026, 3, 15))).toBe('')
  })

  it('returns label only for enabled date with label metadata', () => {
    const c = createCalendarData({
      mode: 'single',
      dateMetadata: { '2026-03-15': { label: '$99' } },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.dayTitle(makeCell(2026, 3, 15))).toBe('$99')
  })
})
