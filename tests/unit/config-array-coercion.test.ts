import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'
import { withAlpineMocks } from '../helpers'

const mockAlpine = { initTree: () => undefined }

interface CalendarInternals {
  _isDisabledDate: (d: CalendarDate) => boolean
}

/**
 * Helper: assert behaviorally (constraints actually applied) rather than
 * peeking at the config object, because the runtime mutates it in place.
 */
function isWeekendDisabled(c: ReturnType<typeof createCalendarData>): boolean {
  const internals = c as unknown as CalendarInternals
  // Sunday 2025-06-01, Saturday 2025-06-07 — both should be disabled by [0, 6]
  const sun = new CalendarDate(2025, 6, 1)
  const sat = new CalendarDate(2025, 6, 7)
  return internals._isDisabledDate(sun) && internals._isDisabledDate(sat)
}

describe('config array coercion', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('passes through a normal number array unchanged', () => {
    const c = createCalendarData({ disabledDaysOfWeek: [0, 6] }, mockAlpine)
    withAlpineMocks(c)
    expect(isWeekendDisabled(c)).toBe(true)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('parses a JSON-string array (Blade attribute interop)', () => {
    const c = createCalendarData({ disabledDaysOfWeek: '[0,6]' as unknown as number[] }, mockAlpine)
    withAlpineMocks(c)
    expect(isWeekendDisabled(c)).toBe(true)
    expect(warnSpy).not.toHaveBeenCalled()
  })

  it('warns when a string is not valid JSON', () => {
    const c = createCalendarData(
      { disabledDaysOfWeek: 'not-json' as unknown as number[] },
      mockAlpine,
    )
    withAlpineMocks(c)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('disabledDaysOfWeek: invalid JSON string'),
    )
  })

  it('warns when JSON parses to a non-array value', () => {
    const c = createCalendarData(
      { disabledDaysOfWeek: '"weekday"' as unknown as number[] },
      mockAlpine,
    )
    withAlpineMocks(c)
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('did not parse to an array'))
  })

  it('warns and ignores non-string non-array values', () => {
    const c = createCalendarData({ disabledDaysOfWeek: 42 as unknown as number[] }, mockAlpine)
    withAlpineMocks(c)
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('expected array or JSON-array string'),
    )
  })

  it('coerces all listed array keys (smoke check)', () => {
    const c = createCalendarData(
      {
        disabledDates: '["2025-06-15"]' as unknown as string[],
        disabledDaysOfWeek: '[0,6]' as unknown as number[],
        enabledDates: '["2025-06-15"]' as unknown as string[],
        enabledDaysOfWeek: '[1,2,3,4,5]' as unknown as number[],
        disabledMonths: '[8]' as unknown as number[],
        enabledMonths: '[1,2,3,4,5,6,7,9,10,11,12]' as unknown as number[],
        disabledYears: '[2030]' as unknown as number[],
        enabledYears: '[2025]' as unknown as number[],
      },
      mockAlpine,
    )
    withAlpineMocks(c)
    // Should not warn about coercion (only constraint-conflict warnings might fire)
    const coercionWarnings = warnSpy.mock.calls.filter((call) => String(call[0]).includes('JSON'))
    expect(coercionWarnings).toHaveLength(0)
  })
})
