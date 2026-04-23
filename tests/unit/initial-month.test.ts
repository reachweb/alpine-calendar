import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { withAlpineMocks } from '../helpers'

const mockAlpine = { initTree: () => undefined }

describe('initialMonth config', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('opens at the given ISO month (YYYY-MM)', () => {
    const c = createCalendarData({ initialMonth: '2027-04' }, mockAlpine)
    withAlpineMocks(c)

    expect(c.year).toBe(2027)
    expect(c.month).toBe(4)
  })

  it('accepts a full ISO date and ignores the day', () => {
    const c = createCalendarData({ initialMonth: '2027-04-15' }, mockAlpine)
    withAlpineMocks(c)

    expect(c.year).toBe(2027)
    expect(c.month).toBe(4)
  })

  it('falls back to today and warns when the value is malformed', () => {
    const today = new Date()
    const c = createCalendarData({ initialMonth: 'garbage' }, mockAlpine)
    withAlpineMocks(c)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid initialMonth'))
    // Falls back to today (no selection, no other override)
    expect(c.year).toBe(today.getFullYear())
    expect(c.month).toBe(today.getMonth() + 1)
  })

  it('warns and falls back when month is out of 1-12 range', () => {
    const today = new Date()
    const c = createCalendarData({ initialMonth: '2027-13' }, mockAlpine)
    withAlpineMocks(c)

    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('invalid initialMonth'))
    expect(c.year).toBe(today.getFullYear())
    expect(c.month).toBe(today.getMonth() + 1)
  })

  it('does not affect selection — calendar opens at the month with no value selected', () => {
    const c = createCalendarData({ initialMonth: '2027-04' }, mockAlpine)
    withAlpineMocks(c)

    expect(c.inputValue).toBe('')
  })

  it('takes precedence over today when no value is selected', () => {
    const today = new Date()
    const c = createCalendarData({ initialMonth: '2027-04' }, mockAlpine)
    withAlpineMocks(c)

    expect(c.year).not.toBe(today.getFullYear())
    expect(c.year).toBe(2027)
  })

  it('is overridden by a selected value (selection wins for view positioning)', () => {
    const c = createCalendarData(
      { initialMonth: '2027-04', value: '2025-09-10', format: 'YYYY-MM-DD' },
      mockAlpine,
    )
    withAlpineMocks(c)

    // The user explicitly selected Sept 2025 — view should follow the selection,
    // not the initialMonth hint. initialMonth is a hint for first paint when no
    // selection exists.
    expect(c.year).toBe(2025)
    expect(c.month).toBe(9)
  })

  it('is ignored in wizard year-month / full mode (which centers on today.year - 30)', () => {
    const today = new Date()
    const c = createCalendarData({ wizard: true, initialMonth: '2027-04' }, mockAlpine)
    withAlpineMocks(c)

    // Wizard centers around 30 years ago regardless of initialMonth
    expect(c.year).toBe(today.getFullYear() - 30)
  })
})
