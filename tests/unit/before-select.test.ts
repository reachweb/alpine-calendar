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
// beforeSelect callback
// ---------------------------------------------------------------------------

describe('beforeSelect callback', () => {
  it('is called before a date is selected', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'single', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('receives the date being selected', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'single', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const date = new CalendarDate(2025, 6, 15)
    c.selectDate(date)

    expect(spy.mock.calls[0]![0].toISO()).toBe('2025-06-15')
  })

  it('receives context with mode, selectedDates, and action', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'single', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    const ctx = spy.mock.calls[0]![1]
    expect(ctx).toEqual({
      mode: 'single',
      selectedDates: [],
      action: 'select',
    })
  })

  it('prevents selection when returning false', () => {
    const c = createCalendarData({
      mode: 'single',
      beforeSelect: () => false,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(c.selectedDates).toHaveLength(0)
  })

  it('allows selection when returning true', () => {
    const c = createCalendarData({
      mode: 'single',
      beforeSelect: () => true,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-15')
  })

  it('allows selection when returning undefined (void)', () => {
    const c = createCalendarData({
      mode: 'single',
      beforeSelect: () => undefined,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(c.selectedDates).toHaveLength(1)
  })

  it('does not dispatch calendar:change when blocked', () => {
    const c = createCalendarData({
      mode: 'single',
      beforeSelect: () => false,
    })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 15))

    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(0)
  })

  it('receives action "deselect" when clicking an already selected date', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'single', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    spy.mockClear()

    // Click the same date again — this is a deselect in multiple mode
    // In single mode, toggle re-selects, but isSelected would be true
    // Let's use multiple mode for a clearer deselect test
    const spy2 = vi.fn(() => true)
    const c2 = createCalendarData({ mode: 'multiple', beforeSelect: spy2 })
    const { flushNextTick: ft2 } = withAlpineMocks(c2)
    c2.init()
    ft2()

    c2.selectDate(new CalendarDate(2025, 6, 15))
    spy2.mockClear()

    c2.selectDate(new CalendarDate(2025, 6, 15))

    expect(spy2.mock.calls[0]![1].action).toBe('deselect')
  })

  it('can prevent deselection', () => {
    const c = createCalendarData({
      mode: 'multiple',
      beforeSelect: (_date, { action }) => {
        if (action === 'deselect') return false
        return true
      },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.selectedDates).toHaveLength(1)

    // Attempt to deselect — should be blocked
    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.selectedDates).toHaveLength(1)
  })

  it('receives currently selected dates in context', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'multiple', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    spy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 15))

    const ctx = spy.mock.calls[0]![1]
    expect(ctx.selectedDates).toHaveLength(1)
    expect(ctx.selectedDates[0].toISO()).toBe('2025-06-10')
  })

  it('can limit maximum number of selected dates', () => {
    const c = createCalendarData({
      mode: 'multiple',
      beforeSelect: (_date, { selectedDates, action }) => {
        if (action === 'select' && selectedDates.length >= 3) return false
        return true
      },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 1))
    c.selectDate(new CalendarDate(2025, 6, 2))
    c.selectDate(new CalendarDate(2025, 6, 3))
    expect(c.selectedDates).toHaveLength(3)

    // 4th selection should be blocked
    c.selectDate(new CalendarDate(2025, 6, 4))
    expect(c.selectedDates).toHaveLength(3)

    // Deselection should still work
    c.selectDate(new CalendarDate(2025, 6, 3))
    expect(c.selectedDates).toHaveLength(2)
  })

  it('is not called for disabled dates (built-in check runs first)', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({
      mode: 'single',
      disabledDates: ['2025-06-15'],
      beforeSelect: spy,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(spy).not.toHaveBeenCalled()
  })

  it('is not called when range validation fails', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({
      mode: 'range',
      minRange: 10,
      beforeSelect: spy,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    spy.mockClear()

    // Try to complete with a 3-day range (minRange is 10)
    c.selectDate(new CalendarDate(2025, 6, 12))

    expect(spy).not.toHaveBeenCalled()
  })

  it('works with range mode for the start date', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'range', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![1].action).toBe('select')
  })

  it('works with range mode for the end date', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'range', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    spy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 20))

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![1].action).toBe('select')
  })

  it('can block range end date selection', () => {
    const c = createCalendarData({
      mode: 'range',
      beforeSelect: (date) => {
        // Block selection on the 20th
        if (date.day === 20) return false
        return true
      },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    expect(c.selectedDates).toHaveLength(1)

    c.selectDate(new CalendarDate(2025, 6, 20))
    // Range should still be partial (only start)
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-10')
  })

  it('does not interfere with keyboard selection (Enter/Space)', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'single', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // Simulate keyboard: set focused date and press Enter
    c.focusedDate = new CalendarDate(2025, 6, 15)
    c.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(spy).toHaveBeenCalledTimes(1)
    expect(c.selectedDates).toHaveLength(1)
  })

  it('component works normally without beforeSelect callback', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(c.selectedDates).toHaveLength(1)
  })

  it('can conditionally allow based on date properties', () => {
    const c = createCalendarData({
      mode: 'single',
      beforeSelect: (date) => {
        // Only allow weekdays (Mon-Fri)
        const nativeDate = date.toNativeDate()
        const dow = nativeDate.getDay()
        return dow >= 1 && dow <= 5
      },
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    // 2025-06-16 is Monday — should be allowed
    c.selectDate(new CalendarDate(2025, 6, 16))
    expect(c.selectedDates).toHaveLength(1)

    c.clearSelection()

    // 2025-06-14 is Saturday — should be blocked
    c.selectDate(new CalendarDate(2025, 6, 14))
    expect(c.selectedDates).toHaveLength(0)
  })
})
