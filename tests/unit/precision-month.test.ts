import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { generateCalendarTemplate } from '../../src/plugin/template'
import { withAlpineMocks } from '../helpers'

/** Build an Escape keydown event with spied-on preventDefault/stopPropagation. */
function escapeEvent(): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: 'Escape' })
  Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
  Object.defineProperty(event, 'stopPropagation', { value: vi.fn() })
  return event
}

/**
 * Mount a calendar through the full init() path. Pass `refs` to bind an input
 * (e.g. to exercise the read-only behavior).
 */
function createComponent(config: CalendarConfig = {}, refs?: Record<string, HTMLElement>) {
  const c = createCalendarData(config)
  const mocks = withAlpineMocks(c, refs ? { refs } : undefined)
  c.init()
  mocks.flushNextTick()
  return { c, ...mocks }
}

/** Return the detail of the most recent `calendar:change` dispatch, or null. */
function lastChangeDetail(dispatchSpy: ReturnType<typeof vi.fn>) {
  const call = [...dispatchSpy.mock.calls].reverse().find((c) => c[0] === 'calendar:change')
  return call ? (call[1] as { value: string; dates: string[]; formatted: string }) : null
}

// ---------------------------------------------------------------------------
// Initial view
// ---------------------------------------------------------------------------

describe('precision: month — initial view', () => {
  // Freeze "today" so the clamp tests are deterministic: the fixed date sits after
  // the clamp-DOWN maxDate (2020) and before the clamp-UP minDate (2030), and the
  // "forward-positions on today" test reads the same frozen clock.
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 4, 30)) // 2026-05-30 (month is 0-indexed)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('opens on the months grid (not the day grid, not a year step)', () => {
    const { c } = createComponent({ precision: 'month' })
    expect(c.view).toBe('months')
  })

  it('a day-precision calendar still opens on the day grid', () => {
    const { c } = createComponent({})
    expect(c.view).toBe('days')
  })

  it('forward-positions on today when no value/initialMonth (never today - 30)', () => {
    const today = new Date()
    const { c } = createComponent({ precision: 'month' })
    expect(c.year).toBe(today.getFullYear())
    expect(c.month).toBe(today.getMonth() + 1)
  })

  it('positions from initialMonth', () => {
    const { c } = createComponent({ precision: 'month', initialMonth: '2030-08' })
    expect(c.year).toBe(2030)
    expect(c.month).toBe(8)
  })

  it('value takes precedence over initialMonth for positioning', () => {
    const { c } = createComponent({
      precision: 'month',
      value: '2030-03-01',
      initialMonth: '2030-08',
    })
    expect(c.year).toBe(2030)
    expect(c.month).toBe(3)
  })

  it('clamps the opening view UP to minDate when today precedes it', () => {
    // frozen today (2026) is before 2030, so the clamp must engage.
    const { c } = createComponent({
      precision: 'month',
      minDate: '2030-06-01',
      maxDate: '2031-12-31',
    })
    expect(c.year).toBe(2030)
    expect(c.month).toBe(6)
  })

  it('clamps the opening view DOWN to maxDate when today is after it', () => {
    const { c } = createComponent({
      precision: 'month',
      minDate: '2019-01-01',
      maxDate: '2020-12-31',
    })
    expect(c.year).toBe(2020)
    expect(c.month).toBe(12)
  })

  it('does not clamp a value that is already inside the range', () => {
    const { c } = createComponent({
      precision: 'month',
      value: '2026-08-01',
      minDate: '2026-06-01',
      maxDate: '2027-12-31',
    })
    expect(c.year).toBe(2026)
    expect(c.month).toBe(8)
  })
})

// ---------------------------------------------------------------------------
// Committing a month
// ---------------------------------------------------------------------------

describe('precision: month — committing a month', () => {
  it('clicking a month commits the first day of that month as the single selection', () => {
    const { c } = createComponent({ precision: 'month', initialMonth: '2026-01' })
    c.selectMonth(8)
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2026-08-01')
  })

  it('emits calendar:change with dates[0] = first-of-month', () => {
    const { c, dispatchSpy } = createComponent({ precision: 'month', initialMonth: '2026-01' })
    c.selectMonth(8)
    const detail = lastChangeDetail(dispatchSpy)
    expect(detail).not.toBeNull()
    expect(detail!.dates[0]).toBe('2026-08-01')
  })

  it('formats the input via `format` (MMMM YYYY -> "August 2026")', () => {
    const { c } = createComponent({
      precision: 'month',
      format: 'MMMM YYYY',
      initialMonth: '2026-01',
    })
    c.selectMonth(8)
    expect(c.inputValue).toBe('August 2026')
  })

  it('stays on the months view (no drill into the day grid)', () => {
    const { c } = createComponent({ precision: 'month', initialMonth: '2026-01' })
    c.selectMonth(8)
    expect(c.view).toBe('months')
  })

  it('closes the popup after a month is selected', () => {
    const input = document.createElement('input')
    const { c } = createComponent(
      { precision: 'month', display: 'popup', format: 'MMMM YYYY', initialMonth: '2026-01' },
      { 'rc-input': input },
    )
    c.open()
    expect(c.isOpen).toBe(true)
    c.selectMonth(8)
    expect(c.isOpen).toBe(false)
  })

  it('commits day 1 even when minDate falls mid-month (month is the unit)', () => {
    const { c, dispatchSpy } = createComponent({
      precision: 'month',
      minDate: '2026-06-15',
      maxDate: '2027-12-31',
    })
    // June 2026 is selectable (part of it is in range), so day 1 must commit
    // despite preceding minDate.
    c.selectMonth(6)
    expect(c.selectedDates[0]!.toISO()).toBe('2026-06-01')
    expect(lastChangeDetail(dispatchSpy)!.dates[0]).toBe('2026-06-01')
  })

  it('clicking a disabled (out-of-range) month is a no-op', () => {
    const { c, dispatchSpy } = createComponent({
      precision: 'month',
      value: '2026-08-01',
      minDate: '2026-06-01',
      maxDate: '2027-12-31',
    })
    dispatchSpy.mockClear()
    c.selectMonth(5) // May 2026 — before minDate
    expect(c.selectedDates[0]!.toISO()).toBe('2026-08-01') // unchanged
    expect(dispatchSpy.mock.calls.find((cc) => cc[0] === 'calendar:change')).toBeUndefined()
  })

  it('re-clicking the already-selected month keeps it selected (no toggle-off)', () => {
    const { c } = createComponent({ precision: 'month', value: '2026-08-01' })
    c.selectMonth(8)
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2026-08-01')
  })

  it('honors a beforeSelect veto', () => {
    const { c } = createComponent({
      precision: 'month',
      initialMonth: '2026-01',
      beforeSelect: () => false,
    })
    c.selectMonth(8)
    expect(c.selectedDates).toHaveLength(0)
  })

  it('defaults to a month-only format (MM/YYYY) when none is given', () => {
    const { c } = createComponent({ precision: 'month', initialMonth: '2026-01' })
    c.selectMonth(8)
    expect(c.inputValue).toBe('08/2026')
  })

  it('exposes the first-of-month ISO as the hidden form input value', () => {
    const { c } = createComponent({
      precision: 'month',
      name: 'departure_month',
      initialMonth: '2026-01',
    })
    c.selectMonth(8)
    expect(c.hiddenInputValues).toEqual(['2026-08-01'])
  })
})

// ---------------------------------------------------------------------------
// Restore from value
// ---------------------------------------------------------------------------

describe('precision: month — restore from value', () => {
  it('displays the formatted month in the input', () => {
    const { c } = createComponent({
      precision: 'month',
      format: 'MMMM YYYY',
      value: '2026-08-01',
    })
    expect(c.inputValue).toBe('August 2026')
  })

  it('marks the stored month selected in the months grid — even though view is "months"', () => {
    const { c } = createComponent({
      precision: 'month',
      format: 'MMMM YYYY',
      value: '2026-08-01',
    })
    expect(c.view).toBe('months')
    const august = c.monthGrid.flat().find((cell) => cell.month === 8)!
    const july = c.monthGrid.flat().find((cell) => cell.month === 7)!
    expect(c.monthClasses(august)['rc-month--selected']).toBe(true)
    expect(c.monthClasses(july)['rc-month--selected']).toBe(false)
  })

  it('restores a first-of-month value that precedes a mid-month minDate', () => {
    // The picker lets the user commit June (part of it is in range) and emits
    // 2026-06-01. Reloading with that exact value must restore the selection even
    // though day 1 precedes minDate — month precision accepts at month granularity.
    const { c } = createComponent({
      precision: 'month',
      format: 'MMMM YYYY',
      value: '2026-06-01',
      minDate: '2026-06-15',
      maxDate: '2027-12-31',
    })
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2026-06-01')
    expect(c.inputValue).toBe('June 2026')
    const june = c.monthGrid.flat().find((cell) => cell.month === 6)!
    expect(c.monthClasses(june)['rc-month--selected']).toBe(true)
  })

  it('round-trips: a committed month restores to the same selection', () => {
    const { c: picker } = createComponent({
      precision: 'month',
      minDate: '2026-06-15',
      maxDate: '2027-12-31',
    })
    picker.selectMonth(6)
    const emitted = picker.selectedDates[0]!.toISO()
    const { c: restored } = createComponent({
      precision: 'month',
      value: emitted,
      minDate: '2026-06-15',
      maxDate: '2027-12-31',
    })
    expect(restored.selectedDates[0]!.toISO()).toBe(emitted)
  })

  it('still rejects a value whose whole month is out of range', () => {
    const { c } = createComponent({
      precision: 'month',
      value: '2026-05-01', // May: entirely before minDate
      minDate: '2026-06-15',
      maxDate: '2027-12-31',
    })
    expect(c.selectedDates).toHaveLength(0)
  })

  it('normalizes a non-first-of-month value to the first of the month', () => {
    const { c } = createComponent({
      precision: 'month',
      value: '2026-08-20',
      minDate: '2026-06-01',
      maxDate: '2027-12-31',
    })
    expect(c.selectedDates[0]!.toISO()).toBe('2026-08-01')
  })

  it('opens on the stored year', () => {
    const { c } = createComponent({
      precision: 'month',
      value: '2026-08-01',
      minDate: '2026-06-01',
      maxDate: '2027-12-31',
    })
    expect(c.year).toBe(2026)
  })

  it('reopening the popup repositions onto the committed selection', () => {
    const input = document.createElement('input')
    const { c } = createComponent(
      {
        precision: 'month',
        display: 'popup',
        format: 'MMMM YYYY',
        minDate: '2026-01-01',
        maxDate: '2027-12-31',
      },
      { 'rc-input': input },
    )
    c.open()
    c.selectMonth(8) // commit Aug 2026, closes popup
    // Navigate away while closed, then reopen — should snap back to the selection.
    c.year = 2027
    c.open()
    expect(c.view).toBe('months')
    expect(c.year).toBe(2026)
    expect(c.month).toBe(8)
  })

  it('initialMonth positions the view but does NOT select a month', () => {
    const { c } = createComponent({ precision: 'month', initialMonth: '2026-08' })
    expect(c.year).toBe(2026)
    expect(c.month).toBe(8)
    expect(c.selectedDates).toHaveLength(0)
    const august = c.monthGrid.flat().find((cell) => cell.month === 8)!
    expect(c.monthClasses(august)['rc-month--selected']).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Year navigation clamping (hard min/max limits)
// ---------------------------------------------------------------------------

describe('precision: month — year clamping to [minYear, maxYear]', () => {
  const RANGE: CalendarConfig = {
    precision: 'month',
    minDate: '2026-06-01',
    maxDate: '2027-12-31',
  }

  it('only years 2026 and 2027 are reachable', () => {
    const { c } = createComponent({ ...RANGE, value: '2026-08-01' })
    expect(c._isYearDisabled(2025)).toBe(true)
    expect(c._isYearDisabled(2026)).toBe(false)
    expect(c._isYearDisabled(2027)).toBe(false)
    expect(c._isYearDisabled(2028)).toBe(true)
  })

  it('disables the prev arrow at the min year (months view)', () => {
    const { c } = createComponent({ ...RANGE, value: '2026-08-01' })
    expect(c.view).toBe('months')
    expect(c.year).toBe(2026)
    expect(c.canGoPrev).toBe(false)
    expect(c.canGoNext).toBe(true)
  })

  it('disables the next arrow at the max year (months view)', () => {
    const { c } = createComponent({ ...RANGE, value: '2027-03-01' })
    expect(c.year).toBe(2027)
    expect(c.canGoNext).toBe(false)
    expect(c.canGoPrev).toBe(true)
  })

  it('disables months before minDate in the opening year', () => {
    const { c } = createComponent({ ...RANGE, value: '2026-08-01' })
    const may = c.monthGrid.flat().find((cell) => cell.month === 5)!
    const june = c.monthGrid.flat().find((cell) => cell.month === 6)!
    expect(may.isDisabled).toBe(true)
    expect(june.isDisabled).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// View containment — the months grid is the only reachable view
// ---------------------------------------------------------------------------

describe('precision: month — view containment', () => {
  it('setView ignores attempts to switch to the year step', () => {
    const { c } = createComponent({ precision: 'month', initialMonth: '2026-01' })
    c.setView('years')
    expect(c.view).toBe('months')
  })

  it('setView ignores attempts to switch to the day grid', () => {
    const { c } = createComponent({ precision: 'month', initialMonth: '2026-01' })
    c.setView('days')
    expect(c.view).toBe('months')
  })

  it('Escape in the months view does NOT drop to the day grid (inline)', () => {
    const { c } = createComponent({ precision: 'month', initialMonth: '2026-01' })
    expect(c.view).toBe('months')
    c.handleKeydown(escapeEvent())
    expect(c.view).toBe('months')
  })

  it('Escape closes the popup from the months view without exposing days', () => {
    const input = document.createElement('input')
    const { c } = createComponent(
      { precision: 'month', display: 'popup', format: 'MMMM YYYY', initialMonth: '2026-01' },
      { 'rc-input': input },
    )
    c.open()
    expect(c.isOpen).toBe(true)
    c.handleKeydown(escapeEvent())
    expect(c.isOpen).toBe(false)
    expect(c.view).toBe('months')
  })

  it('day-precision Escape still returns to the day grid (regression guard)', () => {
    const { c } = createComponent({})
    c.setView('months')
    expect(c.view).toBe('months')
    c.handleKeydown(escapeEvent())
    expect(c.view).toBe('days')
  })

  it('the rendered month header has no year-step button', () => {
    const monthHtml = generateCalendarTemplate({
      display: 'inline',
      needsDayView: true,
      needsScrollableView: false,
      isDualChrome: false,
      isWizard: false,
      precisionMonth: true,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      scrollHeight: 400,
    })
    expect(monthHtml).not.toContain("setView('years')")

    const dayHtml = generateCalendarTemplate({
      display: 'inline',
      needsDayView: true,
      needsScrollableView: false,
      isDualChrome: false,
      isWizard: false,
      precisionMonth: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      scrollHeight: 400,
    })
    expect(dayHtml).toContain("setView('years')")
  })
})

// ---------------------------------------------------------------------------
// Read-only input
// ---------------------------------------------------------------------------

describe('precision: month — read-only input', () => {
  it('makes the bound input read-only', () => {
    const input = document.createElement('input')
    createComponent(
      { precision: 'month', display: 'popup', format: 'MMMM YYYY' },
      {
        'rc-input': input,
      },
    )
    expect(input.readOnly).toBe(true)
  })

  it('leaves a day-precision input editable', () => {
    const input = document.createElement('input')
    createComponent({ display: 'popup' }, { 'rc-input': input })
    expect(input.readOnly).toBe(false)
  })

  it('restores the input to NOT read-only on detach (original state)', () => {
    const input = document.createElement('input')
    const { c } = createComponent(
      { precision: 'month', display: 'popup', format: 'MMMM YYYY' },
      { 'rc-input': input },
    )
    expect(input.readOnly).toBe(true)
    c._detachInput!()
    expect(input.readOnly).toBe(false)
  })

  it('does not clobber an input that was already read-only on detach', () => {
    const input = document.createElement('input')
    input.readOnly = true // consumer set it read-only for their own reasons
    const { c } = createComponent(
      { precision: 'month', display: 'popup', format: 'MMMM YYYY' },
      { 'rc-input': input },
    )
    expect(input.readOnly).toBe(true)
    c._detachInput!()
    // Must restore the consumer's original read-only state, not force false.
    expect(input.readOnly).toBe(true)
  })

  it('handleBlur never re-parses or clears the selection', () => {
    const input = document.createElement('input')
    const { c } = createComponent(
      { precision: 'month', display: 'popup', format: 'MMMM YYYY', initialMonth: '2026-01' },
      { 'rc-input': input },
    )
    c.open()
    c.selectMonth(8)
    // Simulate a stray blur (input is read-only, but the handler must still be safe).
    input.value = 'garbage'
    c.handleBlur()
    expect(c.selectedDates[0]!.toISO()).toBe('2026-08-01')
    expect(c.inputValue).toBe('August 2026')
  })
})

// ---------------------------------------------------------------------------
// Overrides the wizard
// ---------------------------------------------------------------------------

describe('precision: month — overrides the wizard', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>
  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('neutralizes wizard state even when wizard: true is set', () => {
    const { c } = createComponent({ precision: 'month', wizard: true, initialMonth: '2026-01' })
    expect(c.wizard).toBe(false)
    expect(c.wizardMode).toBe('none')
    expect(c.view).toBe('months')
  })

  it('reopening the popup lands on the months grid, not the wizard flow', () => {
    const input = document.createElement('input')
    const { c } = createComponent(
      {
        precision: 'month',
        wizard: true,
        display: 'popup',
        format: 'MMMM YYYY',
        initialMonth: '2026-01',
      },
      { 'rc-input': input },
    )
    c.open()
    expect(c.view).toBe('months')
    c.close()
    c.open()
    expect(c.view).toBe('months')
    expect(c.wizardStep).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------

describe('precision: month — config validation', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })
  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('warns when combined with a non-single mode', () => {
    createCalendarData({ precision: 'month', mode: 'range' })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('precision'))
  })

  it('warns when combined with wizard mode', () => {
    createCalendarData({ precision: 'month', wizard: true })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('wizard'))
  })

  it('warns when an explicit format contains a day token', () => {
    createCalendarData({ precision: 'month', format: 'DD/MM/YYYY' })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('day-based format'))
  })

  it('warns on an invalid precision value', () => {
    createCalendarData({ precision: 'week' as unknown as 'month' })
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid precision'))
  })

  it('does not warn for a valid precision: month single picker', () => {
    createCalendarData({ precision: 'month', mode: 'single', format: 'MMMM YYYY' })
    expect(warnSpy).not.toHaveBeenCalled()
  })
})
