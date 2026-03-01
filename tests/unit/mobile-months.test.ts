import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { generateCalendarTemplate } from '../../src/plugin/template'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

/** Minimal element with an `.rc-calendar` child so auto-template is skipped. */
function createElWithCalendar(): HTMLElement {
  const el = document.createElement('div')
  const cal = document.createElement('div')
  cal.classList.add('rc-calendar')
  el.appendChild(cal)
  return el
}

// ---------------------------------------------------------------------------
// matchMedia mock helpers
// ---------------------------------------------------------------------------

type MqlListener = (e: MediaQueryListEvent) => void

let mqlListeners: MqlListener[] = []
let mqlMatches = false

function mockMatchMedia(matches: boolean) {
  mqlMatches = matches
  mqlListeners = []

  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: mqlMatches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn((_event: string, listener: MqlListener) => {
        mqlListeners.push(listener)
      }),
      removeEventListener: vi.fn((_event: string, listener: MqlListener) => {
        mqlListeners = mqlListeners.filter(l => l !== listener)
      }),
      dispatchEvent: vi.fn(),
    })),
  })
}

function triggerMediaChange(matches: boolean) {
  mqlMatches = matches
  for (const listener of [...mqlListeners]) {
    listener({ matches } as MediaQueryListEvent)
  }
}

// ---------------------------------------------------------------------------
// Tests: Config validation
// ---------------------------------------------------------------------------

describe('mobileMonths config validation', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mockMatchMedia(false) // desktop
  })

  afterEach(() => {
    warnSpy.mockRestore()
  })

  it('warns if mobileMonths is not a positive integer', () => {
    createCalendarData({ months: 2, mobileMonths: 0 })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('mobileMonths must be a positive integer'),
    )
  })

  it('warns if mobileMonths is a float', () => {
    createCalendarData({ months: 2, mobileMonths: 1.5 })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('mobileMonths must be a positive integer'),
    )
  })

  it('warns if mobileMonths >= months', () => {
    createCalendarData({ months: 2, mobileMonths: 2 })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('mobileMonths (2) should be less than months (2)'),
    )
  })

  it('warns if mobileMonths used with months !== 2', () => {
    createCalendarData({ months: 1, mobileMonths: 1 })
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('mobileMonths is only supported when months is 2'),
    )
  })

  it('does not warn for valid mobileMonths config', () => {
    createCalendarData({ months: 2, mobileMonths: 1 })
    // Should not see mobileMonths-specific warnings
    const mobileWarnings = warnSpy.mock.calls.filter(
      ([msg]) => typeof msg === 'string' && msg.includes('mobileMonths'),
    )
    expect(mobileWarnings).toHaveLength(0)
  })
})

// ---------------------------------------------------------------------------
// Tests: Initial monthCount based on viewport
// ---------------------------------------------------------------------------

describe('mobileMonths initial viewport detection', () => {
  it('starts with mobileMonths on mobile viewport', () => {
    mockMatchMedia(true) // mobile
    const c = createCalendarData({ months: 2, mobileMonths: 1 })
    expect(c.monthCount).toBe(1)
  })

  it('starts with full months on desktop viewport', () => {
    mockMatchMedia(false) // desktop
    const c = createCalendarData({ months: 2, mobileMonths: 1 })
    expect(c.monthCount).toBe(2)
  })

  it('uses months as monthCount when mobileMonths is not set', () => {
    mockMatchMedia(true) // mobile
    const c = createCalendarData({ months: 2 })
    expect(c.monthCount).toBe(2) // no mobileMonths, stays at 2
  })

  it('clamps mobileMonths to at least 1', () => {
    mockMatchMedia(true) // mobile viewport — should use clamped value
    const c = createCalendarData({ months: 2, mobileMonths: -1 })
    // mobileMonths: -1 gets clamped to 1 by Math.max(1, ...)
    expect(c.monthCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Tests: matchMedia listener updates monthCount
// ---------------------------------------------------------------------------

describe('mobileMonths responsive behavior', () => {
  beforeEach(() => {
    mockMatchMedia(false) // start on desktop
  })

  it('updates monthCount when viewport crosses breakpoint', () => {
    const c = createCalendarData({ months: 2, mobileMonths: 1 })
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(c.monthCount).toBe(2) // desktop

    // Simulate crossing to mobile
    triggerMediaChange(true)
    expect(c.monthCount).toBe(1)

    // Back to desktop
    triggerMediaChange(false)
    expect(c.monthCount).toBe(2)
  })

  it('rebuilds grid on viewport change', () => {
    const c = createCalendarData({ months: 2, mobileMonths: 1 })
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(c.grid.length).toBe(2) // 2 months on desktop

    triggerMediaChange(true) // mobile
    expect(c.grid.length).toBe(1) // 1 month on mobile

    triggerMediaChange(false) // desktop
    expect(c.grid.length).toBe(2)
  })

  it('preserves selection across viewport changes', () => {
    const c = createCalendarData({ months: 2, mobileMonths: 1, value: '15/01/2026' })
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    const selectedBefore = c.selectedDates.map(d => d.toISO())
    expect(selectedBefore).toEqual(['2026-01-15'])

    triggerMediaChange(true) // mobile
    const selectedAfter = c.selectedDates.map(d => d.toISO())
    expect(selectedAfter).toEqual(['2026-01-15'])
  })

  it('does not set up listener when mobileMonths equals months', () => {
    const c = createCalendarData({ months: 2 }) // no mobileMonths
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    // No listener should be registered
    expect(mqlListeners).toHaveLength(0)
  })

  it('does not set up listener for single month', () => {
    const c = createCalendarData({ months: 1, mobileMonths: 1 })
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(mqlListeners).toHaveLength(0)
  })

  it('does not update if monthCount already matches', () => {
    const c = createCalendarData({ months: 2, mobileMonths: 1 })
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    // Already on desktop (monthCount = 2), trigger desktop again
    const gridBefore = c.grid
    triggerMediaChange(false) // no change
    expect(c.grid).toBe(gridBefore) // same reference = no rebuild
  })
})

// ---------------------------------------------------------------------------
// Tests: Cleanup
// ---------------------------------------------------------------------------

describe('mobileMonths cleanup', () => {
  beforeEach(() => {
    mockMatchMedia(false)
  })

  it('removes matchMedia listener on destroy', () => {
    const c = createCalendarData({ months: 2, mobileMonths: 1 })
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(mqlListeners.length).toBeGreaterThan(0)

    c.destroy()

    // After destroy, viewport changes should not affect monthCount
    const countBefore = c.monthCount
    triggerMediaChange(true)
    expect(c.monthCount).toBe(countBefore)
  })

  it('does not error on destroy when no listener set', () => {
    const c = createCalendarData({ months: 1 })
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(() => c.destroy()).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Tests: Template uses _desktopMonthCount for isDualMonth
// ---------------------------------------------------------------------------

describe('template isDualMonth uses desktop month count', () => {
  beforeEach(() => {
    mockMatchMedia(true) // mobile viewport
  })

  it('starts on mobile with 1 month but can expand to 2 on desktop', () => {
    const c = createCalendarData({ months: 2, mobileMonths: 1 })
    const el = createElWithCalendar()
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    // Starts with 1 month on mobile
    expect(c.monthCount).toBe(1)
    expect(c.grid.length).toBe(1)

    // Switch to desktop — should expand to 2 months
    triggerMediaChange(false)
    expect(c.monthCount).toBe(2)
    expect(c.grid.length).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// Tests: Nav arrow CSS classes in dual-month template
// ---------------------------------------------------------------------------

describe('dual-month nav arrow CSS classes', () => {
  it('includes rc-nav--dual-hidden class binding for prev arrow', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: true,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 400,
    })
    expect(html).toContain('rc-nav--dual-hidden')
  })

  it('includes rc-nav--dual-next-first and rc-nav--dual-next-last class bindings', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: true,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 400,
    })
    expect(html).toContain('rc-nav--dual-next-first')
    expect(html).toContain('rc-nav--dual-next-last')
  })

  it('does not include dual nav classes for single-month template', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 400,
    })
    expect(html).not.toContain('rc-nav--dual-hidden')
    expect(html).not.toContain('rc-nav--dual-next-first')
    expect(html).not.toContain('rc-nav--dual-next-last')
  })

  it('does not use inline :style for visibility in dual-month', () => {
    const html = generateCalendarTemplate({
      display: 'inline',
      isDualMonth: true,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 400,
    })
    expect(html).not.toContain('visibility:hidden')
  })
})
