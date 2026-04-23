import { describe, it, expect } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'
import { withAlpineMocks } from '../helpers'

// ---------------------------------------------------------------------------
// calendar:change (already implemented, verify it works)
// ---------------------------------------------------------------------------

describe('calendar:change event', () => {
  it('fires on date selection with value, dates, and formatted', () => {
    const c = createCalendarData({ mode: 'single', format: 'DD/MM/YYYY' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 15))

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', {
      value: '2025-06-15',
      dates: ['2025-06-15'],
      formatted: '15/06/2025',
    })
  })

  it('fires on clearSelection', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    dispatchSpy.mockClear()
    c.clearSelection()

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', {
      value: '',
      dates: [],
      formatted: '',
    })
  })

  it('fires with multiple dates in multiple mode', () => {
    const c = createCalendarData({ mode: 'multiple' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 15))

    const lastCall = dispatchSpy.mock.calls
      .filter((call: unknown[]) => call[0] === 'calendar:change')
      .pop()
    expect(lastCall?.[1]).toEqual(
      expect.objectContaining({
        dates: expect.arrayContaining(['2025-06-10', '2025-06-15']),
      }),
    )
  })

  // ---- Range mode commit gating (BC break from 0.7.x) ----

  it('does NOT fire on partial range (first click only)', () => {
    const c = createCalendarData({ mode: 'range' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))

    const changeCalls = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeCalls).toHaveLength(0)
  })

  it('fires on committed range (second click completes)', () => {
    const c = createCalendarData({ mode: 'range' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))

    const changeCalls = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeCalls).toHaveLength(1)
    expect(changeCalls[0]?.[1]).toEqual({
      value: '2025-06-10 – 2025-06-20',
      dates: ['2025-06-10', '2025-06-20'],
      formatted: '10/06/2025 – 20/06/2025',
    })
  })

  it('does NOT fire when starting a new range (third click)', () => {
    const c = createCalendarData({ mode: 'range' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.selectDate(new CalendarDate(2025, 6, 10))
    c.selectDate(new CalendarDate(2025, 6, 20))
    dispatchSpy.mockClear()

    // Third click starts a new partial range
    c.selectDate(new CalendarDate(2025, 7, 5))

    const changeCalls = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeCalls).toHaveLength(0)
  })

  it('fires when deselecting start (click start twice clears to empty)', () => {
    const c = createCalendarData({ mode: 'range' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    const start = new CalendarDate(2025, 6, 10)
    c.selectDate(start)
    dispatchSpy.mockClear()

    // Clicking the same date again deselects — committed empty state
    c.selectDate(start)

    const changeCalls = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(changeCalls).toHaveLength(1)
    expect(changeCalls[0]?.[1]).toMatchObject({ dates: [] })
  })
})

// ---------------------------------------------------------------------------
// calendar:select (per-click signal, fires on every selection update)
// ---------------------------------------------------------------------------

describe('calendar:select event', () => {
  it('fires on every click in range mode, including partial', () => {
    const c = createCalendarData({ mode: 'range' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 10))

    const selectCalls = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:select',
    )
    expect(selectCalls).toHaveLength(1)
    expect(selectCalls[0]?.[1]).toMatchObject({ dates: ['2025-06-10'] })

    c.selectDate(new CalendarDate(2025, 6, 20))

    const selectCallsAfter = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:select',
    )
    expect(selectCallsAfter).toHaveLength(2)
    expect(selectCallsAfter[1]?.[1]).toMatchObject({
      dates: ['2025-06-10', '2025-06-20'],
    })
  })

  it('fires alongside calendar:change in single mode', () => {
    const c = createCalendarData({ mode: 'single' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 15))

    const types = dispatchSpy.mock.calls.map((call: unknown[]) => call[0])
    expect(types).toContain('calendar:select')
    expect(types).toContain('calendar:change')
  })

  it('fires on clearSelection', () => {
    const c = createCalendarData({ mode: 'single', value: '2025-06-15' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.clearSelection()

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:select', {
      value: '',
      dates: [],
      formatted: '',
    })
  })

  it('fires on setValue', () => {
    const c = createCalendarData({ mode: 'single' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.setValue('2025-06-15')

    const selectCalls = dispatchSpy.mock.calls.filter(
      (call: unknown[]) => call[0] === 'calendar:select',
    )
    expect(selectCalls).toHaveLength(1)
  })

  it('has same detail shape as calendar:change', () => {
    const c = createCalendarData({ mode: 'single', format: 'DD/MM/YYYY' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.selectDate(new CalendarDate(2025, 6, 15))

    const selectCall = dispatchSpy.mock.calls.find(
      (call: unknown[]) => call[0] === 'calendar:select',
    )
    const changeCall = dispatchSpy.mock.calls.find(
      (call: unknown[]) => call[0] === 'calendar:change',
    )
    expect(selectCall?.[1]).toEqual(changeCall?.[1])
  })
})

// ---------------------------------------------------------------------------
// calendar:navigate
// ---------------------------------------------------------------------------

describe('calendar:navigate event', () => {
  it('registers $watch on month and year', () => {
    const c = createCalendarData()
    const { watchSpy } = withAlpineMocks(c)
    c.init()

    expect(watchSpy).toHaveBeenCalledWith('month', expect.any(Function))
    expect(watchSpy).toHaveBeenCalledWith('year', expect.any(Function))
  })

  it('fires when month watch triggers (simulating prev/next)', () => {
    const c = createCalendarData()
    const { dispatchSpy, flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    // Simulate a month change
    c.month = 3
    triggerWatch('month')

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:navigate', {
      year: c.year,
      month: 3,
      view: 'days',
    })
  })

  it('fires when year watch triggers', () => {
    const c = createCalendarData()
    const { dispatchSpy, flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.year = 2030
    triggerWatch('year')

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:navigate', {
      year: 2030,
      month: c.month,
      view: 'days',
    })
  })

  it('includes current view in navigate event', () => {
    const c = createCalendarData()
    const { dispatchSpy, flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.view = 'months'
    c.year = 2028
    triggerWatch('year')

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:navigate', {
      year: 2028,
      month: c.month,
      view: 'months',
    })
  })

  it('_emitNavigate() can be called directly', () => {
    const c = createCalendarData()
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c._emitNavigate()

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:navigate', {
      year: c.year,
      month: c.month,
      view: c.view,
    })
  })
})

// ---------------------------------------------------------------------------
// calendar:view-change
// ---------------------------------------------------------------------------

describe('calendar:view-change event', () => {
  it('registers $watch on view', () => {
    const c = createCalendarData()
    const { watchSpy } = withAlpineMocks(c)
    c.init()

    expect(watchSpy).toHaveBeenCalledWith('view', expect.any(Function))
  })

  it('fires when view watch triggers', () => {
    const c = createCalendarData()
    const { dispatchSpy, flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.view = 'months'
    triggerWatch('view')

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:view-change', {
      view: 'months',
      year: c.year,
      month: c.month,
    })
  })

  it('fires with years view', () => {
    const c = createCalendarData()
    const { dispatchSpy, flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.view = 'years'
    triggerWatch('view')

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:view-change', {
      view: 'years',
      year: c.year,
      month: c.month,
    })
  })

  it('fires when returning to days view', () => {
    const c = createCalendarData()
    const { dispatchSpy, flushNextTick, triggerWatch } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.view = 'months'
    triggerWatch('view')
    dispatchSpy.mockClear()

    c.view = 'days'
    triggerWatch('view')

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:view-change', {
      view: 'days',
      year: c.year,
      month: c.month,
    })
  })

  it('_emitViewChange() can be called directly', () => {
    const c = createCalendarData()
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c._emitViewChange()

    expect(dispatchSpy).toHaveBeenCalledWith('calendar:view-change', {
      view: 'days',
      year: c.year,
      month: c.month,
    })
  })
})

// ---------------------------------------------------------------------------
// calendar:open / calendar:close (already implemented, verify)
// ---------------------------------------------------------------------------

describe('calendar:open / calendar:close events', () => {
  it('dispatches calendar:open on open()', () => {
    const c = createCalendarData({ display: 'popup' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:open', null)
  })

  it('dispatches calendar:close on close()', () => {
    const c = createCalendarData({ display: 'popup' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()

    c.open()
    flushNextTick()
    c.close()
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:close', null)
  })

  it('does not dispatch open in inline mode', () => {
    const c = createCalendarData({ display: 'inline' })
    const { dispatchSpy, flushNextTick } = withAlpineMocks(c)
    c.init()
    flushNextTick()
    dispatchSpy.mockClear()

    c.open()
    expect(dispatchSpy).not.toHaveBeenCalledWith('calendar:open', null)
  })
})
