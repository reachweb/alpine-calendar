import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'
import { withAlpineMocks } from '../helpers'

// ---------------------------------------------------------------------------
// allowDeselect config option
// ---------------------------------------------------------------------------

describe('allowDeselect: false — single mode', () => {
  it('keeps the selection when re-clicking the selected date', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.selectedDates).toHaveLength(1)

    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-15')
  })

  it('does not dispatch calendar:change on the suppressed re-click', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: false })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 15))

    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(0)
  })

  it('does not bump _selectionRev on the suppressed re-click', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    const rev = c._selectionRev

    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c._selectionRev).toBe(rev)
  })

  it('still closes the popup on the suppressed re-click (confirm gesture)', () => {
    const c = createCalendarData({
      mode: 'single',
      display: 'popup',
      allowDeselect: false,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.isOpen).toBe(false)
    expect(c.selectedDates).toHaveLength(1)

    // Re-open and click the same date: selection kept, popup closes again
    c.open()
    expect(c.isOpen).toBe(true)
    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.isOpen).toBe(false)
    expect(c.selectedDates).toHaveLength(1)
  })

  it('respects closeOnSelect: false on the suppressed re-click', () => {
    const c = createCalendarData({
      mode: 'single',
      display: 'popup',
      allowDeselect: false,
      closeOnSelect: false,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.isOpen).toBe(true)

    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.isOpen).toBe(true)
    expect(c.selectedDates).toHaveLength(1)
  })

  it('still allows switching the selection to a different date', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    c.selectDate(new CalendarDate(2025, 6, 20))

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-20')
  })

  it('suppresses deselection via keyboard (Enter on the selected date)', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    c.focusedDate = new CalendarDate(2025, 6, 15)
    c.handleKeydown(new KeyboardEvent('keydown', { key: 'Enter' }))

    expect(c.selectedDates).toHaveLength(1)
  })
})

describe('allowDeselect: false — multiple mode', () => {
  it('keeps an already-selected date selected on re-click', () => {
    const c = createCalendarData({ mode: 'multiple', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.selectedDates).toHaveLength(2)

    c.selectDate(new CalendarDate(2025, 6, 10))
    expect(c.selectedDates).toHaveLength(2)
  })

  it('still allows adding new dates', () => {
    const c = createCalendarData({ mode: 'multiple', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(c.selectedDates).toHaveLength(2)
  })

  it('does not dispatch calendar:change on a suppressed re-click', () => {
    const c = createCalendarData({ mode: 'multiple', allowDeselect: false })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))

    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(0)
  })
})

describe('allowDeselect default behavior (backward compatibility)', () => {
  it('defaults to true: single-mode re-click deselects', () => {
    const c = createCalendarData({ mode: 'single' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(c.selectedDates).toHaveLength(0)
  })

  it('explicit allowDeselect: true behaves like the default', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: true })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(c.selectedDates).toHaveLength(0)
  })

  it('defaults to true: multiple-mode re-click removes the date', () => {
    const c = createCalendarData({ mode: 'multiple' })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 10))

    expect(c.selectedDates).toHaveLength(0)
  })

  it('deselect still dispatches calendar:change by default', () => {
    const c = createCalendarData({ mode: 'single' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 15))

    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(1)
  })
})

describe('allowDeselect: false — range mode', () => {
  it('re-clicking the lone range start completes a one-day range', () => {
    const c = createCalendarData({ mode: 'range', display: 'popup', allowDeselect: false })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    c.selectDate(new CalendarDate(2025, 6, 10))
    expect(c.isOpen).toBe(true)
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 10))).toBe(true)
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))
    flushNextTick()

    expect(c.selectedDates.map((d) => d.toISO())).toEqual(['2025-06-10', '2025-06-10'])
    const changeEvents = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeEvents).toHaveLength(1)
    expect(changeEvents[0]![1].value).toBe('2025-06-10 – 2025-06-10')
    expect(c.isOpen).toBe(false)
    expect(c._statusMessage).toMatch(/^Range: .*2025 \(one day\)$/)
  })

  it('re-clicking a completed one-day range keeps it and closes the popup', () => {
    const c = createCalendarData({ mode: 'range', display: 'popup', allowDeselect: false })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 10))
    c.open()
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))

    expect(c.selectedDates.map((d) => d.toISO())).toEqual(['2025-06-10', '2025-06-10'])
    expect(
      dispatchSpy.mock.calls.filter((call: unknown[]) => call[0] === 'calendar:select'),
    ).toHaveLength(0)
    expect(c.isOpen).toBe(false)
  })

  it('minRange above 1 forbids the one-day range, so the re-click clears the start', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({
      mode: 'range',
      allowDeselect: false,
      minRange: 2,
      beforeSelect: spy,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    expect(c.isDateSelectableForRange(new CalendarDate(2025, 6, 10))).toBe(true)

    // The freshly picked start is never dimmed, even while the pointer is still on it
    c.hoverDate = new CalendarDate(2025, 6, 10)
    const startClasses = c.dayClasses({
      date: new CalendarDate(2025, 6, 10),
      isCurrentMonth: true,
      isToday: false,
      isDisabled: false,
    })
    expect(startClasses['rc-day--range-invalid']).toBe(false)
    c.hoverDate = null
    spy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))
    expect(c.selectedDates).toHaveLength(0)
    expect(spy.mock.calls[0]![1].action).toBe('deselect')

    // A different start can then be picked and completed
    c.selectDate(new CalendarDate(2025, 6, 12))
    c.selectDate(new CalendarDate(2025, 6, 13))
    expect(c.selectedDates.map((d) => d.toISO())).toEqual(['2025-06-12', '2025-06-13'])
  })

  it('a rules minRange forbids the one-day range only for starts inside the rule', () => {
    const c = createCalendarData({
      mode: 'range',
      allowDeselect: false,
      rules: [{ from: '2025-06-01', to: '2025-06-30', minRange: 3 }],
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 10))
    expect(c.selectedDates).toHaveLength(0)

    c.selectDate(new CalendarDate(2025, 7, 10))
    c.selectDate(new CalendarDate(2025, 7, 10))
    expect(c.selectedDates.map((d) => d.toISO())).toEqual(['2025-07-10', '2025-07-10'])
  })

  it('range building works normally', () => {
    const c = createCalendarData({ mode: 'range', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))

    expect(c.selectedDates).toHaveLength(2)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-10')
    expect(c.selectedDates[1]!.toISO()).toBe('2025-06-20')
  })

  it('clicking a complete range endpoint starts a new range', () => {
    const c = createCalendarData({ mode: 'range', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))
    c.selectDate(new CalendarDate(2025, 6, 10))

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-10')
  })

  it('clicking the end of a complete range starts a new range there', () => {
    const c = createCalendarData({ mode: 'range', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))
    c.selectDate(new CalendarDate(2025, 6, 20))

    expect(c.selectedDates.map((d) => d.toISO())).toEqual(['2025-06-20'])
  })
})

describe('allowDeselect: false — interaction with beforeSelect', () => {
  it('does not call beforeSelect for a suppressed deselect', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({
      mode: 'single',
      allowDeselect: false,
      beforeSelect: spy,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    spy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(spy).not.toHaveBeenCalled()
  })

  it('still calls beforeSelect for select actions', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({
      mode: 'single',
      allowDeselect: false,
      beforeSelect: spy,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![1].action).toBe('select')
  })

  it('beforeSelect can still veto a select while deselects are suppressed', () => {
    const c = createCalendarData({
      mode: 'single',
      allowDeselect: false,
      beforeSelect: (date) => date.day !== 20,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 20))
    expect(c.selectedDates).toHaveLength(0)

    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(c.selectedDates).toHaveLength(1)
  })

  it('completing a one-day range reaches beforeSelect as a select', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({
      mode: 'range',
      allowDeselect: false,
      beforeSelect: spy,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    spy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))
    expect(spy).toHaveBeenCalledTimes(1)
    expect(spy.mock.calls[0]![1].action).toBe('select')
  })

  it('beforeSelect still receives deselect actions when allowDeselect is true', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({
      mode: 'multiple',
      allowDeselect: true,
      beforeSelect: spy,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    spy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 15))
    expect(spy.mock.calls[0]![1].action).toBe('deselect')
  })

  it('range mode by default: re-clicking the lone start reaches beforeSelect as a deselect', () => {
    const spy = vi.fn(() => true)
    const c = createCalendarData({ mode: 'range', beforeSelect: spy })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    spy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))
    expect(spy.mock.calls[0]![1].action).toBe('deselect')
    expect(c.selectedDates).toHaveLength(0)
  })
})

describe('allowDeselect: false — programmatic clearing unaffected', () => {
  it('clearSelection() still clears', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    c.clearSelection()

    expect(c.selectedDates).toHaveLength(0)
  })

  it('clear() alias still clears', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    c.clear()

    expect(c.selectedDates).toHaveLength(0)
  })

  it('setValue() still replaces the selection', () => {
    const c = createCalendarData({ mode: 'single', allowDeselect: false })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))
    c.setValue('2025-06-20')

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2025-06-20')
  })
})

describe('allowDeselect: false — precision month', () => {
  it('re-selecting the selected month keeps the selection and closes the popup', () => {
    const c = createCalendarData({
      precision: 'month',
      display: 'popup',
      allowDeselect: false,
    })
    const { flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    c.selectMonth(6)
    expect(c.selectedDates).toHaveLength(1)
    expect(c.isOpen).toBe(false)

    c.open()
    c.selectMonth(6)
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.month).toBe(6)
    expect(c.isOpen).toBe(false)
  })
})
