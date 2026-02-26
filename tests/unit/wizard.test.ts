import { describe, it, expect, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import type { CalendarConfig } from '../../src/plugin/calendar-component'
import { CalendarDate } from '../../src/core/calendar-date'

/**
 * Inject mock Alpine magic properties onto a component.
 */
function withAlpineMocks(
  component: ReturnType<typeof createCalendarData>,
  options?: { refs?: Record<string, HTMLElement>; el?: HTMLElement },
) {
  const dispatchSpy = vi.fn()
  const watchSpy = vi.fn()
  const refs = options?.refs ?? {}
  const nextTickCallbacks: (() => void)[] = []

  Object.assign(component, {
    $dispatch: dispatchSpy,
    $watch: watchSpy,
    $refs: refs,
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

function createComponent(config: CalendarConfig = {}) {
  const c = createCalendarData(config)
  const mocks = withAlpineMocks(c)
  c.init()
  mocks.flushNextTick()
  return { c, ...mocks }
}

function pressKey(c: ReturnType<typeof createCalendarData>, key: string) {
  const event = new KeyboardEvent('keydown', { key })
  Object.defineProperty(event, 'preventDefault', { value: vi.fn() })
  Object.defineProperty(event, 'stopPropagation', { value: vi.fn() })
  c.handleKeydown(event)
}

// ---------------------------------------------------------------------------
// Wizard initialization
// ---------------------------------------------------------------------------

describe('wizard — initialization', () => {
  it('starts in years view when wizard=true', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.view).toBe('years')
  })

  it('starts at wizardStep 1 when wizard=true', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizardStep).toBe(1)
  })

  it('wizardStep is 0 when wizard=false (default)', () => {
    const { c } = createComponent()
    expect(c.wizardStep).toBe(0)
  })

  it('centers year around ~30 years ago', () => {
    const { c } = createComponent({ wizard: true })
    const today = CalendarDate.today()
    const expectedYear = today.year - 30
    expect(c.year).toBe(expectedYear)
  })

  it('year grid shows block containing ~30 years ago', () => {
    const { c } = createComponent({ wizard: true })
    const today = CalendarDate.today()
    const targetYear = today.year - 30
    const blockStart = Math.floor(targetYear / 12) * 12
    const years = c.yearGrid.flat().map((cell) => cell.year)
    expect(years[0]).toBe(blockStart)
    expect(years[11]).toBe(blockStart + 11)
  })

  it('wizard property is exposed on component', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizard).toBe(true)
  })

  it('non-wizard mode starts at current date, not ~30 years ago', () => {
    const { c } = createComponent()
    const today = CalendarDate.today()
    expect(c.year).toBe(today.year)
    expect(c.month).toBe(today.month)
  })
})

// ---------------------------------------------------------------------------
// Wizard step labels
// ---------------------------------------------------------------------------

describe('wizard — step labels', () => {
  it('step 1 label is "Select Year"', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizardStepLabel).toBe('Select Year')
  })

  it('step 2 label is "Select Month"', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(2000)
    expect(c.wizardStepLabel).toBe('Select Month')
  })

  it('step 3 label is "Select Day"', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(2000)
    c.selectMonth(6)
    expect(c.wizardStepLabel).toBe('Select Day')
  })

  it('non-wizard returns empty label', () => {
    const { c } = createComponent()
    expect(c.wizardStepLabel).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Wizard flow: Year → Month → Day
// ---------------------------------------------------------------------------

describe('wizard — step flow', () => {
  it('selectYear advances to step 2 (months view)', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')

    c.selectYear(1995)

    expect(c.wizardStep).toBe(2)
    expect(c.view).toBe('months')
    expect(c.year).toBe(1995)
  })

  it('selectMonth advances to step 3 (days view)', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    expect(c.wizardStep).toBe(2)

    c.selectMonth(6)

    expect(c.wizardStep).toBe(3)
    expect(c.view).toBe('days')
    expect(c.month).toBe(6)
  })

  it('selectDate completes the wizard flow', () => {
    const { c, dispatchSpy } = createComponent({ wizard: true })
    c.selectYear(1995)
    c.selectMonth(6)

    c.selectDate(new CalendarDate(1995, 6, 15))

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('1995-06-15')
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', expect.any(Object))
  })

  it('full wizard flow: year → month → day', () => {
    const { c } = createComponent({ wizard: true })

    // Step 1: years view
    expect(c.view).toBe('years')
    expect(c.wizardStep).toBe(1)

    // Select year
    c.selectYear(1990)
    expect(c.view).toBe('months')
    expect(c.wizardStep).toBe(2)
    expect(c.year).toBe(1990)

    // Select month
    c.selectMonth(3)
    expect(c.view).toBe('days')
    expect(c.wizardStep).toBe(3)
    expect(c.month).toBe(3)

    // Select day
    c.selectDate(new CalendarDate(1990, 3, 25))
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('1990-03-25')
  })

  it('non-wizard selectYear/selectMonth do not set wizardStep', () => {
    const { c } = createComponent()
    expect(c.wizardStep).toBe(0)
    c.setView('years')
    c.selectYear(2020)
    expect(c.wizardStep).toBe(0)
    c.selectMonth(6)
    expect(c.wizardStep).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// wizardBack()
// ---------------------------------------------------------------------------

describe('wizard — back navigation', () => {
  it('wizardBack from step 3 goes to step 2 (months)', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    c.selectMonth(6)
    expect(c.wizardStep).toBe(3)

    c.wizardBack()

    expect(c.wizardStep).toBe(2)
    expect(c.view).toBe('months')
  })

  it('wizardBack from step 2 goes to step 1 (years)', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    expect(c.wizardStep).toBe(2)

    c.wizardBack()

    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')
  })

  it('wizardBack from step 1 is a no-op', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizardStep).toBe(1)

    c.wizardBack()

    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')
  })

  it('wizardBack is a no-op when not in wizard mode', () => {
    const { c } = createComponent()
    c.wizardBack()
    expect(c.view).toBe('days')
    expect(c.wizardStep).toBe(0)
  })

  it('after going back to step 2, can select a different month', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    c.selectMonth(6)
    expect(c.wizardStep).toBe(3)

    c.wizardBack()
    expect(c.wizardStep).toBe(2)

    c.selectMonth(9)
    expect(c.wizardStep).toBe(3)
    expect(c.month).toBe(9)
  })

  it('after going back to step 1, can select a different year', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    expect(c.wizardStep).toBe(2)

    c.wizardBack()
    expect(c.wizardStep).toBe(1)

    c.selectYear(2000)
    expect(c.wizardStep).toBe(2)
    expect(c.year).toBe(2000)
  })
})

// ---------------------------------------------------------------------------
// Wizard keyboard navigation (Escape)
// ---------------------------------------------------------------------------

describe('wizard — Escape key', () => {
  it('Escape in step 3 goes back to step 2', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    c.selectMonth(6)
    expect(c.wizardStep).toBe(3)

    pressKey(c, 'Escape')

    expect(c.wizardStep).toBe(2)
    expect(c.view).toBe('months')
  })

  it('Escape in step 2 goes back to step 1', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    expect(c.wizardStep).toBe(2)

    pressKey(c, 'Escape')

    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')
  })

  it('Escape in step 1 does not change step (already at start)', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizardStep).toBe(1)

    pressKey(c, 'Escape')

    // Step 1: wizard is at beginning, Escape doesn't go further back
    // But view changes to 'days' via the non-wizard fallback
    // Actually, wizardStep > 1 check fails, so it falls through to standard behavior
    expect(c.wizardStep).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Wizard with constraints
// ---------------------------------------------------------------------------

describe('wizard — constraints', () => {
  it('respects minDate/maxDate in wizard year view', () => {
    const { c } = createComponent({
      wizard: true,
      minDate: '1990-01-01',
      maxDate: '2000-12-31',
    })

    const years = c.yearGrid.flat()
    // Years before 1990 should be disabled
    const disabledYears = years.filter((cell) => cell.isDisabled)
    const enabledYears = years.filter((cell) => !cell.isDisabled)

    for (const cell of disabledYears) {
      expect(cell.year < 1990 || cell.year > 2000).toBe(true)
    }
    for (const cell of enabledYears) {
      expect(cell.year >= 1990 && cell.year <= 2000).toBe(true)
    }
  })

  it('respects minDate/maxDate in wizard month view', () => {
    const { c } = createComponent({
      wizard: true,
      minDate: '1995-06-01',
      maxDate: '1995-09-30',
    })

    c.selectYear(1995)
    // $watch is mocked, so manually rebuild month grid for the new year
    c._rebuildMonthGrid()
    expect(c.view).toBe('months')

    const months = c.monthGrid.flat()
    // Months before June should be disabled
    const janCell = months.find((m) => m.month === 1)!
    expect(janCell.isDisabled).toBe(true)

    // June should be enabled
    const junCell = months.find((m) => m.month === 6)!
    expect(junCell.isDisabled).toBe(false)

    // October+ should be disabled
    const octCell = months.find((m) => m.month === 10)!
    expect(octCell.isDisabled).toBe(true)
  })

  it('disabled dates are enforced in wizard day view', () => {
    const { c } = createComponent({
      wizard: true,
      disabledDaysOfWeek: [0, 6], // weekends disabled
    })

    c.selectYear(1995)
    c.selectMonth(6)

    // Try to select a Saturday (June 3, 1995 is a Saturday)
    const saturday = new CalendarDate(1995, 6, 3)
    c.selectDate(saturday)
    expect(c.selectedDates).toHaveLength(0)

    // Try to select a Wednesday (June 7, 1995 is a Wednesday)
    const wednesday = new CalendarDate(1995, 6, 7)
    c.selectDate(wednesday)
    expect(c.selectedDates).toHaveLength(1)
  })
})

// ---------------------------------------------------------------------------
// Wizard with initial value
// ---------------------------------------------------------------------------

describe('wizard — initial value', () => {
  it('wizard with initial value still starts at step 1', () => {
    const { c } = createComponent({
      wizard: true,
      value: '1995-06-15',
    })

    // Wizard always starts at step 1 (year view)
    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')
  })

  it('wizard with initial value has the date pre-selected', () => {
    const { c } = createComponent({
      wizard: true,
      value: '1995-06-15',
    })

    // But the value is already set in selection
    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('1995-06-15')
  })
})

// ---------------------------------------------------------------------------
// Wizard with popup
// ---------------------------------------------------------------------------

describe('wizard — popup mode', () => {
  it('wizard with popup starts closed', () => {
    const { c } = createComponent({
      wizard: true,
      display: 'popup',
    })
    expect(c.isOpen).toBe(false)
  })

  it('wizard popup opens to years view', () => {
    const { c } = createComponent({
      wizard: true,
      display: 'popup',
    })

    c.open()
    expect(c.isOpen).toBe(true)
    expect(c.view).toBe('years')
    expect(c.wizardStep).toBe(1)
  })

  it('wizard popup auto-closes after day selection when closeOnSelect=true', () => {
    const { c } = createComponent({
      wizard: true,
      display: 'popup',
      closeOnSelect: true,
    })

    c.open()
    c.selectYear(1995)
    c.selectMonth(6)
    expect(c.isOpen).toBe(true)

    c.selectDate(new CalendarDate(1995, 6, 15))
    expect(c.isOpen).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Grid shape: 3 rows × 4 cols
// ---------------------------------------------------------------------------

describe('wizard — grid shape', () => {
  it('yearGrid has 3 rows × 4 cols', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.yearGrid).toHaveLength(3)
    for (const row of c.yearGrid) {
      expect(row).toHaveLength(4)
    }
    // Flat should give 12 items
    expect(c.yearGrid.flat()).toHaveLength(12)
  })

  it('monthGrid has 3 rows × 4 cols', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    c._rebuildMonthGrid()
    expect(c.monthGrid).toHaveLength(3)
    for (const row of c.monthGrid) {
      expect(row).toHaveLength(4)
    }
    expect(c.monthGrid.flat()).toHaveLength(12)
  })

  it('yearGrid items follow 4-col layout', () => {
    const { c } = createComponent({ wizard: true })
    const flat = c.yearGrid.flat().map((cell) => cell.year)
    // First row should have 4 consecutive years
    expect(flat[1]! - flat[0]!).toBe(1)
    expect(flat[2]! - flat[1]!).toBe(1)
    expect(flat[3]! - flat[2]!).toBe(1)
    // Second row starts where first left off
    expect(flat[4]! - flat[3]!).toBe(1)
  })

  it('monthGrid items follow 4-col layout', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(2000)
    c._rebuildMonthGrid()
    const months = c.monthGrid.flat().map((cell) => cell.month)
    expect(months).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })
})

// ---------------------------------------------------------------------------
// Wizard summary
// ---------------------------------------------------------------------------

describe('wizard — summary', () => {
  it('summary is empty at step 1', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizardSummary).toBe('')
  })

  it('summary shows year at step 2', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    expect(c.wizardSummary).toBe('1995')
  })

  it('summary shows year and month at step 3 (before day pick)', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    c.selectMonth(6)
    expect(c.wizardSummary).toContain('1995')
    expect(c.wizardSummary).toContain('\u00b7')
    // Day not yet selected — should not appear
    expect(c.wizardSummary).not.toMatch(/\d+\s*$/)
    const parts = c.wizardSummary.split('\u00b7').map((s: string) => s.trim())
    expect(parts).toHaveLength(2)
  })

  it('summary includes day after selectDate', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    c.selectMonth(6)
    c.selectDate(new CalendarDate(1995, 6, 15))
    expect(c.wizardSummary).toContain('1995')
    expect(c.wizardSummary).toContain('15')
    const parts = c.wizardSummary.split('\u00b7').map((s: string) => s.trim())
    expect(parts).toHaveLength(3)
    expect(parts[2]).toBe('15')
  })

  it('summary clears day on wizardBack from step 3', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    c.selectMonth(6)
    c.selectDate(new CalendarDate(1995, 6, 15))
    expect(c.wizardSummary).toContain('15')

    c.wizardBack()
    expect(c.wizardSummary).not.toContain('15')
    const parts = c.wizardSummary.split('\u00b7').map((s: string) => s.trim())
    expect(parts).toHaveLength(1) // Only year remains (month cleared too)
  })

  it('summary clears month on back from step 3 to step 2', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    c.selectMonth(6)
    expect(c.wizardSummary).toContain('\u00b7')

    c.wizardBack()
    expect(c.wizardSummary).toBe('1995')
  })

  it('summary clears everything on back from step 2 to step 1', () => {
    const { c } = createComponent({ wizard: true })
    c.selectYear(1995)
    expect(c.wizardSummary).toBe('1995')

    c.wizardBack()
    expect(c.wizardSummary).toBe('')
  })

  it('summary is empty for non-wizard mode', () => {
    const { c } = createComponent()
    expect(c.wizardSummary).toBe('')
  })
})

// ---------------------------------------------------------------------------
// Half-wizard: year-month mode
// ---------------------------------------------------------------------------

describe('wizard — year-month mode', () => {
  it('starts in years view at step 1', () => {
    const { c } = createComponent({ wizard: 'year-month' })
    expect(c.view).toBe('years')
    expect(c.wizardStep).toBe(1)
    expect(c.wizardMode).toBe('year-month')
    expect(c.wizardTotalSteps).toBe(2)
  })

  it('centers year around ~30 years ago', () => {
    const { c } = createComponent({ wizard: 'year-month' })
    const today = CalendarDate.today()
    expect(c.year).toBe(today.year - 30)
  })

  it('step labels are correct', () => {
    const { c } = createComponent({ wizard: 'year-month' })
    expect(c.wizardStepLabel).toBe('Select Year')

    c.selectYear(2000)
    expect(c.wizardStepLabel).toBe('Select Month')
  })

  it('selectYear advances to step 2 (months view)', () => {
    const { c } = createComponent({ wizard: 'year-month' })
    c.selectYear(2000)
    expect(c.wizardStep).toBe(2)
    expect(c.view).toBe('months')
  })

  it('selectMonth auto-selects 1st of month and emits', () => {
    const { c, dispatchSpy } = createComponent({ wizard: 'year-month' })
    c.selectYear(2000)
    c.selectMonth(6)

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.toISO()).toBe('2000-06-01')
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', expect.any(Object))
  })

  it('wizardBack from step 2 goes to step 1', () => {
    const { c } = createComponent({ wizard: 'year-month' })
    c.selectYear(2000)
    expect(c.wizardStep).toBe(2)

    c.wizardBack()
    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')
  })

  it('wizardBack from step 1 is a no-op', () => {
    const { c } = createComponent({ wizard: 'year-month' })
    c.wizardBack()
    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')
  })

  it('popup auto-closes after month selection', () => {
    const { c } = createComponent({ wizard: 'year-month', display: 'popup' })
    c.open()
    c.selectYear(2000)
    expect(c.isOpen).toBe(true)

    c.selectMonth(6)
    expect(c.isOpen).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Half-wizard: month-day mode
// ---------------------------------------------------------------------------

describe('wizard — month-day mode', () => {
  it('starts in months view at step 1', () => {
    const { c } = createComponent({ wizard: 'month-day' })
    expect(c.view).toBe('months')
    expect(c.wizardStep).toBe(1)
    expect(c.wizardMode).toBe('month-day')
    expect(c.wizardTotalSteps).toBe(2)
  })

  it('uses current year (not ~30 years ago)', () => {
    const { c } = createComponent({ wizard: 'month-day' })
    const today = CalendarDate.today()
    expect(c.year).toBe(today.year)
  })

  it('step labels are correct', () => {
    const { c } = createComponent({ wizard: 'month-day' })
    expect(c.wizardStepLabel).toBe('Select Month')

    c.selectMonth(6)
    expect(c.wizardStepLabel).toBe('Select Day')
  })

  it('selectMonth advances to step 2 (days view)', () => {
    const { c } = createComponent({ wizard: 'month-day' })
    c.selectMonth(6)
    expect(c.wizardStep).toBe(2)
    expect(c.view).toBe('days')
    expect(c.month).toBe(6)
  })

  it('selectDate completes the flow', () => {
    const { c, dispatchSpy } = createComponent({ wizard: 'month-day' })
    const today = CalendarDate.today()
    c.selectMonth(6)
    c.selectDate(new CalendarDate(today.year, 6, 15))

    expect(c.selectedDates).toHaveLength(1)
    expect(c.selectedDates[0]!.day).toBe(15)
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', expect.any(Object))
  })

  it('wizardBack from step 2 goes to step 1 (months)', () => {
    const { c } = createComponent({ wizard: 'month-day' })
    c.selectMonth(6)
    expect(c.wizardStep).toBe(2)

    c.wizardBack()
    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('months')
  })

  it('wizardBack from step 1 is a no-op', () => {
    const { c } = createComponent({ wizard: 'month-day' })
    c.wizardBack()
    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('months')
  })
})

// ---------------------------------------------------------------------------
// Popup reset on reopen
// ---------------------------------------------------------------------------

describe('wizard — popup reset', () => {
  it('reopen resets to step 1', () => {
    const { c } = createComponent({ wizard: true, display: 'popup' })
    c.open()
    c.selectYear(1995)
    c.selectMonth(6)
    expect(c.wizardStep).toBe(3)

    c.close()
    c.open()

    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')
  })

  it('reopen preserves inputValue from previous selection', () => {
    const { c } = createComponent({ wizard: true, display: 'popup' })
    c.open()
    c.selectYear(1995)
    c.selectMonth(6)
    c.selectDate(new CalendarDate(1995, 6, 15))

    const valueBefore = c.inputValue
    expect(valueBefore).not.toBe('')

    c.open()
    expect(c.inputValue).toBe(valueBefore)
    expect(c.wizardStep).toBe(1)
  })

  it('reopen clears wizard tracking state', () => {
    const { c } = createComponent({ wizard: true, display: 'popup' })
    c.open()
    c.selectYear(1995)
    c.selectMonth(6)

    c.close()
    c.open()

    expect(c._wizardYear).toBeNull()
    expect(c._wizardMonth).toBeNull()
    expect(c._wizardDay).toBeNull()
    expect(c.wizardSummary).toBe('')
  })

  it('reopen resets year to ~30 years ago for full wizard', () => {
    const { c } = createComponent({ wizard: true, display: 'popup' })
    c.open()
    c.selectYear(1995)
    expect(c.year).toBe(1995)

    c.close()
    c.open()

    const today = CalendarDate.today()
    expect(c.year).toBe(today.year - 30)
  })

  it('year-month popup resets on reopen', () => {
    const { c } = createComponent({ wizard: 'year-month', display: 'popup' })
    c.open()
    c.selectYear(2000)
    expect(c.wizardStep).toBe(2)

    c.close()
    c.open()

    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('years')
  })

  it('month-day popup does not reset year on reopen', () => {
    const { c } = createComponent({ wizard: 'month-day', display: 'popup' })
    const today = CalendarDate.today()
    c.open()
    c.selectMonth(6)
    expect(c.wizardStep).toBe(2)

    c.close()
    c.open()

    expect(c.wizardStep).toBe(1)
    expect(c.view).toBe('months')
    expect(c.year).toBe(today.year)
  })
})

// ---------------------------------------------------------------------------
// Backward compatibility: wizard: true behaves identically
// ---------------------------------------------------------------------------

describe('wizard — backward compat (wizard: true)', () => {
  it('wizard: true sets wizardMode to "full"', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizardMode).toBe('full')
  })

  it('wizard: true has 3 total steps', () => {
    const { c } = createComponent({ wizard: true })
    expect(c.wizardTotalSteps).toBe(3)
  })

  it('wizard: false sets wizardMode to "none"', () => {
    const { c } = createComponent()
    expect(c.wizardMode).toBe('none')
    expect(c.wizardTotalSteps).toBe(0)
  })

  it('full wizard flow still works identically', () => {
    const { c, dispatchSpy } = createComponent({ wizard: true })
    expect(c.view).toBe('years')
    expect(c.wizardStep).toBe(1)

    c.selectYear(1990)
    expect(c.view).toBe('months')
    expect(c.wizardStep).toBe(2)

    c.selectMonth(3)
    expect(c.view).toBe('days')
    expect(c.wizardStep).toBe(3)

    c.selectDate(new CalendarDate(1990, 3, 25))
    expect(c.selectedDates).toHaveLength(1)
    expect(dispatchSpy).toHaveBeenCalledWith('calendar:change', expect.any(Object))
  })
})
