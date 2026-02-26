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
// setValue()
// ---------------------------------------------------------------------------

describe('setValue()', () => {
  it('sets a single date from an ISO string', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue('2025-06-15')

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-15')
  })

  it('sets a single date from a CalendarDate', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue(new CalendarDate(2025, 6, 15))

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-15')
  })

  it('navigates to the selected date month/year', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue('2030-12-25')

    expect(c.month).toBe(12)
    expect(c.year).toBe(2030)
  })

  it('clears previous selection before setting new one', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-01-01' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-01-01')

    c.setValue('2025-06-15')

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-15')
  })

  it('dispatches calendar:change after setting value', () => {
    const c = createCalendarData({ mode: 'single' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.setValue('2025-06-15')

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', {
      value: '2025-06-15',
      dates: ['2025-06-15'],
      formatted: expect.any(String),
    })
  })

  it('updates inputValue after setting value', () => {
    const c = createCalendarData({ mode: 'single', format: 'DD/MM/YYYY' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue('2025-06-15')

    expect(c.inputValue).toBe('15/06/2025')
  })

  it('does not set disabled dates', () => {
    const c = createCalendarData({
      mode: 'single',
      disabledDates: ['2025-06-15'],
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue('2025-06-15')

    expect(c.selectedDates).toHaveLength(0)
  })

  it('sets multiple dates from an array of ISO strings', () => {
    const c = createCalendarData({ mode: 'multiple' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue(['2025-06-10', '2025-06-15', '2025-06-20'])

    expect(c.selectedDates).toHaveLength(3)
    const isos = c.selectedDates.map((d: CalendarDate) => d.toISO()).sort()
    expect(isos).toEqual(['2025-06-10', '2025-06-15', '2025-06-20'])
  })

  it('sets a range from two ISO strings', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue(['2025-06-10', '2025-06-20'])

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-10')
    expect(c.selectedDates[1]!.toISO()).toBe('2025-06-20')
  })

  it('swaps range dates if end is before start', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue(['2025-06-20', '2025-06-10'])

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-10')
    expect(c.selectedDates[1]!.toISO()).toBe('2025-06-20')
  })

  it('rejects range that violates minRange constraint', () => {
    const c = createCalendarData({ mode: 'range', minRange: 10 })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // 3-day range, minRange is 10
    c.setValue(['2025-06-10', '2025-06-12'])

    expect(c.selectedDates).toHaveLength(0)
  })

  it('accepts range that satisfies range constraints', () => {
    const c = createCalendarData({ mode: 'range', minRange: 3, maxRange: 10 })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue(['2025-06-10', '2025-06-15'])

    expect(c.selectedDates).toHaveLength(2)
  })

  it('can parse formatted date strings', () => {
    const c = createCalendarData({ mode: 'single', format: 'DD/MM/YYYY' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue('15/06/2025')

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-15')
  })

  it('handles empty string by clearing selection', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue('')

    expect(c.selectedDates).toHaveLength(0)
  })

  it('handles empty array by clearing selection', () => {
    const c = createCalendarData({ mode: 'multiple', value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue([])

    expect(c.selectedDates).toHaveLength(0)
  })

  it('sets a range from CalendarDate objects', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue([new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20)])

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-10')
    expect(c.selectedDates[1]!.toISO()).toBe('2025-06-20')
  })

  it('skips disabled dates in a multiple-date array', () => {
    const c = createCalendarData({
      mode: 'multiple',
      disabledDates: ['2025-06-15'],
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.setValue(['2025-06-10', '2025-06-15', '2025-06-20'])

    expect(c.selectedDates).toHaveLength(2)
    const isos = c.selectedDates.map((d: CalendarDate) => d.toISO()).sort()
    expect(isos).toEqual(['2025-06-10', '2025-06-20'])
  })
})

// ---------------------------------------------------------------------------
// clear()
// ---------------------------------------------------------------------------

describe('clear()', () => {
  it('clears the current selection', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.selectedDates).toHaveLength(1)

    c.clear()

    expect(c.selectedDates).toHaveLength(0)
  })

  it('dispatches calendar:change with empty values', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.clear()

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', {
      value: '',
      dates: [],
      formatted: '',
    })
  })

  it('clears inputValue', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.clear()

    expect(c.inputValue).toBe('')
  })

  it('is idempotent (calling twice is safe)', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.clear()
    c.clear()

    expect(c.selectedDates).toHaveLength(0)
  })

  it('works with range mode', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))
    expect(c.selectedDates).toHaveLength(2)

    c.clear()
    expect(c.selectedDates).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// goTo()
// ---------------------------------------------------------------------------

describe('goTo()', () => {
  it('navigates to a specific year and month', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2030, 6)

    expect(c.year).toBe(2030)
    expect(c.month).toBe(6)
  })

  it('navigates to just a year (keeps current month)', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const originalMonth = c.month
    c.goTo(2030)

    expect(c.year).toBe(2030)
    expect(c.month).toBe(originalMonth)
  })

  it('switches to days view', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.view = 'months'
    c.goTo(2030, 6)

    expect(c.view).toBe('days')
  })

  it('does not change selection', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2030, 1)

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-15')
  })

  it('does not dispatch calendar:change', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.goTo(2030, 6)

    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// getSelection()
// ---------------------------------------------------------------------------

describe('getSelection()', () => {
  it('returns empty array when nothing is selected', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.getSelection()).toEqual([])
  })

  it('returns selected dates for single mode', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const sel = c.getSelection()
    expect(sel).toHaveLength(1)
    expect(sel[0]!.toISO()).toBe('2025-06-15')
  })

  it('returns selected dates for range mode', () => {
    const c = createCalendarData({ mode: 'range' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))

    const sel = c.getSelection()
    expect(sel).toHaveLength(2)
    expect(sel[0]!.toISO()).toBe('2025-06-10')
    expect(sel[1]!.toISO()).toBe('2025-06-20')
  })

  it('returns a new array each time (safe to mutate)', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const sel1 = c.getSelection()
    const sel2 = c.getSelection()

    expect(sel1).not.toBe(sel2)
    expect(sel1).toEqual(sel2)
  })

  it('reflects changes after setValue()', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.getSelection()).toHaveLength(0)

    c.setValue('2025-06-15')
    expect(c.getSelection()).toHaveLength(1)
    expect(c.getSelection()[0]!.toISO()).toBe('2025-06-15')

    c.clear()
    expect(c.getSelection()).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// open() / close() (already exist, verify programmatic control)
// ---------------------------------------------------------------------------

describe('programmatic open()/close()', () => {
  it('open() opens the popup', () => {
    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.isOpen).toBe(false)
    c.open()
    expect(c.isOpen).toBe(true)
  })

  it('close() closes the popup', () => {
    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()
    expect(c.isOpen).toBe(true)

    c.close()
    expect(c.isOpen).toBe(false)
  })

  it('toggle() toggles open/close', () => {
    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    expect(c.isOpen).toBe(false)
    c.toggle()
    expect(c.isOpen).toBe(true)
    c.toggle()
    expect(c.isOpen).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// goToToday() (already exists, verify it works programmatically)
// ---------------------------------------------------------------------------

describe('goToToday()', () => {
  it('navigates to the current date', () => {
    const c = createCalendarData()
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.goTo(2090, 1)

    const today = CalendarDate.today()
    c.goToToday()

    expect(c.year).toBe(today.year)
    expect(c.month).toBe(today.month)
    expect(c.view).toBe('days')
  })
})
