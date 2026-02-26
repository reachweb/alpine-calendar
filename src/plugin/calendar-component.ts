import { CalendarDate } from '../core/calendar-date'
import {
  createDateConstraint,
  createMonthConstraint,
  createYearConstraint,
  createRangeValidator,
} from '../core/constraints'
import type { DateConstraintOptions, DateConstraintRule } from '../core/constraints'
import { generateMonths, generateMonthGrid, generateYearGrid } from '../core/grid'
import type { MonthGrid, MonthCell, YearCell } from '../core/grid'
import { SingleSelection, MultipleSelection, RangeSelection } from '../core/selection'
import type { Selection } from '../core/selection'
import { formatDate, formatRange, formatMultiple } from '../input/formatter'
import { parseDate, parseDateRange, parseDateMultiple } from '../input/parser'
import { attachMask } from '../input/mask'
import { computePosition, autoUpdate } from '../positioning/popup'
import type { Placement } from '../positioning/popup'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/** Period-specific constraint rule (string-based for Alpine/HTML config). */
export interface CalendarConfigRule {
  /** Start of the period (ISO string). */
  from: string
  /** End of the period (ISO string). */
  to: string
  /** Minimum selectable date within this period (ISO string). */
  minDate?: string
  /** Maximum selectable date within this period (ISO string). */
  maxDate?: string
  /** Specific dates to disable within this period (ISO strings). */
  disabledDates?: string[]
  /** Days of the week to disable within this period (0=Sun, 6=Sat). */
  disabledDaysOfWeek?: number[]
  /** Specific dates to force-enable within this period (ISO strings). */
  enabledDates?: string[]
  /** Days of the week to enable within this period (whitelist, 0=Sun, 6=Sat). */
  enabledDaysOfWeek?: number[]
  /** Specific months to disable within this period (1=Jan, 12=Dec). */
  disabledMonths?: number[]
  /** Months to enable within this period (whitelist, 1=Jan, 12=Dec). */
  enabledMonths?: number[]
  /** Specific years to disable within this period. */
  disabledYears?: number[]
  /** Years to enable within this period (whitelist). */
  enabledYears?: number[]
  /** Minimum range length in days (inclusive) for this period. */
  minRange?: number
  /** Maximum range length in days (inclusive) for this period. */
  maxRange?: number
}

export interface CalendarConfig {
  /** Selection mode. Default: 'single'. */
  mode?: 'single' | 'multiple' | 'range'
  /** Display mode. Default: 'inline'. */
  display?: 'inline' | 'popup'
  /** Date format string (e.g. 'DD/MM/YYYY'). Default: 'DD/MM/YYYY'. */
  format?: string
  /** Number of months to show (1 or 2). Default: 1. */
  months?: number
  /** First day of the week (0=Sun, 1=Mon, …, 6=Sat). Default: 0. */
  firstDay?: number
  /** Minimum selectable date (ISO string). */
  minDate?: string
  /** Maximum selectable date (ISO string). */
  maxDate?: string
  /** Specific dates to disable (ISO strings). */
  disabledDates?: string[]
  /** Days of the week to disable (0=Sun, 6=Sat). */
  disabledDaysOfWeek?: number[]
  /** Specific dates to force-enable (ISO strings). Overrides disabled checks. */
  enabledDates?: string[]
  /** Days of the week to enable (whitelist — all other days disabled). */
  enabledDaysOfWeek?: number[]
  /** Specific months to disable (1=Jan, 12=Dec). */
  disabledMonths?: number[]
  /** Months to enable (whitelist — all other months disabled, 1=Jan, 12=Dec). */
  enabledMonths?: number[]
  /** Specific years to disable. */
  disabledYears?: number[]
  /** Years to enable (whitelist — all other years disabled). */
  enabledYears?: number[]
  /** Minimum range length in days (inclusive). Only used in range mode. */
  minRange?: number
  /** Maximum range length in days (inclusive). Only used in range mode. */
  maxRange?: number
  /** Period-specific constraint rules. First matching rule wins. */
  rules?: CalendarConfigRule[]
  /** Enable birth-date wizard mode. Default: false. Use 'year-month' or 'month-day' for half-wizard. */
  wizard?: boolean | 'year-month' | 'month-day'
  /** Enable input masking. Default: true. */
  mask?: boolean
  /** IANA timezone for "today" resolution. */
  timezone?: string
  /** BCP 47 locale string. */
  locale?: string
  /** Initial value (ISO string or formatted string). */
  value?: string
  /** Name attribute for hidden form input(s). */
  name?: string
  /** Preferred popup placement. Default: 'bottom-start'. */
  placement?: Placement
  /** Offset in pixels between reference and popup. Default: 4. */
  popupOffset?: number
  /** Close popup after a date is selected. Default: true. */
  closeOnSelect?: boolean
  /**
   * Callback invoked before a date is selected. Return `false` to prevent the selection.
   *
   * Receives the date being selected and context about the current selection state.
   * Called after built-in constraint checks (disabled dates, range validation) pass.
   *
   * Usage:
   * ```js
   * calendar({
   *   beforeSelect(date, { mode, selectedDates, action }) {
   *     // Prevent selecting more than 5 dates
   *     if (mode === 'multiple' && action === 'select' && selectedDates.length >= 5) return false
   *     return true
   *   }
   * })
   * ```
   */
  beforeSelect?: (
    date: CalendarDate,
    context: {
      /** Current selection mode. */
      mode: 'single' | 'multiple' | 'range'
      /** Currently selected dates (before this action). */
      selectedDates: CalendarDate[]
      /** Whether this click would select or deselect the date. */
      action: 'select' | 'deselect'
    },
  ) => boolean | void
}

// ---------------------------------------------------------------------------
// Alpine magic property accessor
// ---------------------------------------------------------------------------

/** Alpine injects these properties on the component proxy at runtime. */
interface AlpineMagics {
  $dispatch(event: string, detail?: Record<string, unknown>): void
  $watch(property: string, callback: (newValue: unknown) => void): void
  $refs: Record<string, HTMLElement>
  $nextTick(callback: () => void): void
  $el: HTMLElement
}

/**
 * Type-safe accessor for Alpine magic properties on `this`.
 * Alpine injects $dispatch, $watch, etc. onto the reactive proxy at runtime.
 */
function alpine(self: unknown): AlpineMagics {
  return self as AlpineMagics
}

// ---------------------------------------------------------------------------
// Config parsing helpers
// ---------------------------------------------------------------------------

function parseISODate(s: string): CalendarDate | null {
  return CalendarDate.fromISO(s)
}

function parseISODates(arr: string[]): CalendarDate[] {
  return arr.map((s) => CalendarDate.fromISO(s)).filter((d): d is CalendarDate => d !== null)
}

function parseConfigRule(rule: CalendarConfigRule): DateConstraintRule | null {
  const from = parseISODate(rule.from)
  const to = parseISODate(rule.to)
  if (!from || !to) return null

  const result: DateConstraintRule = { from, to }

  if (rule.minDate) {
    const d = parseISODate(rule.minDate)
    if (d) result.minDate = d
  }
  if (rule.maxDate) {
    const d = parseISODate(rule.maxDate)
    if (d) result.maxDate = d
  }
  if (rule.disabledDates) {
    result.disabledDates = parseISODates(rule.disabledDates)
  }
  if (rule.disabledDaysOfWeek) {
    result.disabledDaysOfWeek = rule.disabledDaysOfWeek
  }
  if (rule.enabledDates) {
    result.enabledDates = parseISODates(rule.enabledDates)
  }
  if (rule.enabledDaysOfWeek) {
    result.enabledDaysOfWeek = rule.enabledDaysOfWeek
  }
  if (rule.disabledMonths) {
    result.disabledMonths = rule.disabledMonths
  }
  if (rule.enabledMonths) {
    result.enabledMonths = rule.enabledMonths
  }
  if (rule.disabledYears) {
    result.disabledYears = rule.disabledYears
  }
  if (rule.enabledYears) {
    result.enabledYears = rule.enabledYears
  }
  if (rule.minRange !== undefined) {
    result.minRange = rule.minRange
  }
  if (rule.maxRange !== undefined) {
    result.maxRange = rule.maxRange
  }

  return result
}

// ---------------------------------------------------------------------------
// Config validation
// ---------------------------------------------------------------------------

/**
 * Validate calendar configuration and warn about invalid combinations.
 * Does not throw — the component still initialises with best-effort defaults.
 */
function validateConfig(config: CalendarConfig): void {
  const warn = (msg: string) => console.warn(`[reach-calendar] ${msg}`)

  // months must be 1 or 2
  if (config.months !== undefined && config.months !== 1 && config.months !== 2) {
    warn(`months must be 1 or 2, got: ${config.months}`)
  }

  // firstDay must be 0-6
  if (config.firstDay !== undefined && (config.firstDay < 0 || config.firstDay > 6)) {
    warn(`firstDay must be 0-6, got: ${config.firstDay}`)
  }

  // Invalid date strings
  if (config.minDate && !CalendarDate.fromISO(config.minDate)) {
    warn(`invalid minDate: "${config.minDate}"`)
  }
  if (config.maxDate && !CalendarDate.fromISO(config.maxDate)) {
    warn(`invalid maxDate: "${config.maxDate}"`)
  }

  // minDate must be before maxDate
  if (config.minDate && config.maxDate) {
    const min = CalendarDate.fromISO(config.minDate)
    const max = CalendarDate.fromISO(config.maxDate)
    if (min && max && min.isAfter(max)) {
      warn(`minDate "${config.minDate}" is after maxDate "${config.maxDate}"`)
    }
  }

  // minRange <= maxRange
  if (
    config.minRange !== undefined &&
    config.maxRange !== undefined &&
    config.minRange > config.maxRange
  ) {
    warn(`minRange (${config.minRange}) exceeds maxRange (${config.maxRange})`)
  }

  // wizard with non-single mode
  if (config.wizard && config.mode && config.mode !== 'single') {
    warn(`wizard mode is designed for single selection; mode "${config.mode}" may not work as expected`)
  }
}

// ---------------------------------------------------------------------------
// Constraint builder (reusable for initial config + runtime updates)
// ---------------------------------------------------------------------------

interface ConstraintFunctions {
  isDisabledDate: (d: CalendarDate) => boolean
  isRangeValid: (start: CalendarDate, end: CalendarDate) => boolean
  isMonthDisabled: (year: number, month: number) => boolean
  isYearDisabled: (year: number) => boolean
}

/**
 * Build constraint functions from a CalendarConfig (or partial update).
 * Reused by both initial config parsing and `updateConstraints()`.
 */
function buildConstraints(cfg: Partial<CalendarConfig>): ConstraintFunctions {
  const opts: DateConstraintOptions = {}

  if (cfg.minDate) {
    const d = CalendarDate.fromISO(cfg.minDate)
    if (d) opts.minDate = d
  }
  if (cfg.maxDate) {
    const d = CalendarDate.fromISO(cfg.maxDate)
    if (d) opts.maxDate = d
  }
  if (cfg.disabledDates) {
    opts.disabledDates = parseISODates(cfg.disabledDates)
  }
  if (cfg.disabledDaysOfWeek) {
    opts.disabledDaysOfWeek = cfg.disabledDaysOfWeek
  }
  if (cfg.enabledDates) {
    opts.enabledDates = parseISODates(cfg.enabledDates)
  }
  if (cfg.enabledDaysOfWeek) {
    opts.enabledDaysOfWeek = cfg.enabledDaysOfWeek
  }
  if (cfg.disabledMonths) {
    opts.disabledMonths = cfg.disabledMonths
  }
  if (cfg.enabledMonths) {
    opts.enabledMonths = cfg.enabledMonths
  }
  if (cfg.disabledYears) {
    opts.disabledYears = cfg.disabledYears
  }
  if (cfg.enabledYears) {
    opts.enabledYears = cfg.enabledYears
  }
  if (cfg.minRange !== undefined) {
    opts.minRange = cfg.minRange
  }
  if (cfg.maxRange !== undefined) {
    opts.maxRange = cfg.maxRange
  }
  if (cfg.rules) {
    const parsedRules = cfg.rules
      .map((r) => parseConfigRule(r))
      .filter((r): r is DateConstraintRule => r !== null)
    if (parsedRules.length > 0) {
      opts.rules = parsedRules
    }
  }

  return {
    isDisabledDate: createDateConstraint(opts),
    isRangeValid: createRangeValidator(opts),
    isMonthDisabled: createMonthConstraint(opts),
    isYearDisabled: createYearConstraint(opts),
  }
}

// ---------------------------------------------------------------------------
// Component factory
// ---------------------------------------------------------------------------

/**
 * Create the Alpine component data object for the calendar.
 *
 * This factory is called by `Alpine.data('calendar', createCalendarData)`.
 * The returned object becomes the reactive component state.
 */
export function createCalendarData(config: CalendarConfig = {}) {
  // --- Validate config ---
  validateConfig(config)

  // --- Parse config with defaults ---
  const mode = config.mode ?? 'single'
  const display = config.display ?? 'inline'
  const format = config.format ?? 'DD/MM/YYYY'
  const monthCount = config.months ?? 1
  const firstDay = config.firstDay ?? 0
  const timezone = config.timezone
  const wizardConfig = config.wizard ?? false
  const wizard = !!wizardConfig
  const wizardMode: 'none' | 'full' | 'year-month' | 'month-day' =
    wizardConfig === true ? 'full'
    : wizardConfig === false ? 'none'
    : wizardConfig
  const wizardTotalSteps = wizardMode === 'none' ? 0 : wizardMode === 'full' ? 3 : 2
  const wizardStartView: 'days' | 'months' | 'years' =
    wizardMode === 'full' || wizardMode === 'year-month' ? 'years'
    : wizardMode === 'month-day' ? 'months'
    : 'days'
  const useMask = config.mask ?? true
  const inputName = config.name ?? ''
  const locale = config.locale
  const closeOnSelect = config.closeOnSelect ?? true
  const placementConfig = config.placement ?? 'bottom-start'
  const popupOffsetPx = config.popupOffset ?? 4
  const beforeSelectCb = config.beforeSelect ?? null

  // --- Build constraint functions ---
  const constraints = buildConstraints(config)

  // --- Create selection model ---
  function buildSelection(): Selection {
    if (mode === 'multiple') return new MultipleSelection()
    if (mode === 'range') return new RangeSelection()
    return new SingleSelection()
  }

  const selection = buildSelection()

  // --- Parse initial value ---
  if (config.value) {
    if (mode === 'single') {
      const d = parseDate(config.value, format) ?? CalendarDate.fromISO(config.value)
      if (d && !constraints.isDisabledDate(d)) selection.toggle(d)
    } else if (mode === 'range') {
      const range = parseDateRange(config.value, format)
      if (range) {
        selection.toggle(range[0])
        selection.toggle(range[1])
      }
    } else if (mode === 'multiple') {
      const dates = parseDateMultiple(config.value, format)
      for (const d of dates) {
        if (!constraints.isDisabledDate(d)) selection.toggle(d)
      }
    }
  }

  // --- Resolve today ---
  const today = CalendarDate.today(timezone)

  // --- Determine initial viewing month/year ---
  const initialDates = selection.toArray()
  const defaultViewDate = (initialDates.length > 0 ? initialDates[0] : today) as CalendarDate

  // Wizard: center year picker around ~30 years ago (full & year-month modes)
  const viewDate = (wizardMode === 'full' || wizardMode === 'year-month')
    ? new CalendarDate(today.year - 30, today.month, today.day)
    : defaultViewDate

  // --- Compute initial inputValue ---
  function computeFormattedValue(sel: Selection): string {
    const dates = sel.toArray()
    if (dates.length === 0) return ''
    const first = dates[0] as CalendarDate
    if (mode === 'range' && dates.length === 2) {
      return formatRange(first, dates[1] as CalendarDate, format)
    }
    if (mode === 'multiple') {
      return formatMultiple(dates, format)
    }
    return formatDate(first, format)
  }

  // ---------------------------------------------------------------------------
  // Return the Alpine data object
  // ---------------------------------------------------------------------------

  return {
    // --- Config (exposed to templates) ---
    mode,
    display,
    format,
    monthCount,
    firstDay,
    wizard,
    wizardMode,
    wizardTotalSteps,
    inputName,

    // --- Reactive state ---
    month: viewDate.month,
    year: viewDate.year,
    view: (wizard ? wizardStartView : 'days') as 'days' | 'months' | 'years',
    isOpen: display === 'inline',
    grid: [] as MonthGrid[],
    monthGrid: [] as MonthCell[][],
    yearGrid: [] as YearCell[][],
    inputValue: computeFormattedValue(selection),
    popupStyle: display === 'popup'
      ? 'position:fixed;inset:0;z-index:50;'
      : '',
    focusedDate: null as CalendarDate | null,
    hoverDate: null as CalendarDate | null,
    wizardStep: (wizard ? 1 : 0) as number,
    _wizardYear: null as number | null,
    _wizardMonth: null as number | null,
    _wizardDay: null as number | null,

    // --- Internal state ---
    _navDirection: '' as '' | 'next' | 'prev',
    _selection: selection,
    _today: today,
    _isDisabledDate: constraints.isDisabledDate,
    _isRangeValid: constraints.isRangeValid,
    _isMonthDisabled: constraints.isMonthDisabled,
    _isYearDisabled: constraints.isYearDisabled,
    _inputEl: null as HTMLInputElement | null,
    _detachMask: null as (() => void) | null,
    _syncing: false,
    _popupEl: null as HTMLElement | null,
    _autoUpdateCleanup: null as (() => void) | null,
    _documentClickHandler: null as ((e: Event) => void) | null,

    // --- Getters ---

    get selectedDates(): CalendarDate[] {
      return this._selection.toArray()
    },

    get formattedValue(): string {
      return computeFormattedValue(this._selection)
    },

    /** ISO string values for hidden form inputs. */
    get hiddenInputValues(): string[] {
      return this._selection.toArray().map((d: CalendarDate) => d.toISO())
    },

    /** ISO string of focused date for aria-activedescendant binding. */
    get focusedDateISO(): string {
      return this.focusedDate ? this.focusedDate.toISO() : ''
    },

    /** Label for the current wizard step (e.g. "Select Year"). */
    get wizardStepLabel(): string {
      if (!this.wizard) return ''
      if (wizardMode === 'full') {
        if (this.wizardStep === 1) return 'Select Year'
        if (this.wizardStep === 2) return 'Select Month'
        return 'Select Day'
      }
      if (wizardMode === 'year-month') {
        if (this.wizardStep === 1) return 'Select Year'
        return 'Select Month'
      }
      if (wizardMode === 'month-day') {
        if (this.wizardStep === 1) return 'Select Month'
        return 'Select Day'
      }
      return ''
    },

    /** Summary of wizard selections so far (e.g. "1995 · June · 15"). */
    get wizardSummary(): string {
      if (!wizard) return ''
      const parts: string[] = []
      if (this._wizardYear !== null) parts.push(String(this._wizardYear))
      if (this._wizardMonth !== null) {
        const d = new CalendarDate(this._wizardYear ?? this.year, this._wizardMonth, 1)
        parts.push(d.format({ month: 'long' }, locale))
      }
      if (this._wizardDay !== null) parts.push(String(this._wizardDay))
      return parts.join(' \u00b7 ')
    },

    /**
     * Localized short weekday headers in the correct order for the current `firstDay`.
     * Returns an array of 7 short names (e.g., ["Mo", "Tu", "We", ...]).
     */
    get weekdayHeaders(): string[] {
      const headers: string[] = []
      // Use a reference Sunday (Jan 4 2026 is a Sunday)
      const refSunday = new Date(2026, 0, 4)
      for (let i = 0; i < 7; i++) {
        const dayIndex = (this.firstDay + i) % 7
        const d = new Date(refSunday)
        d.setDate(refSunday.getDate() + dayIndex)
        headers.push(
          new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d),
        )
      }
      return headers
    },

    // --- Lifecycle ---

    init() {
      this._rebuildGrid()
      this._rebuildMonthGrid()
      this._rebuildYearGrid()

      // Alpine $watch: rebuild grids and dispatch events on state changes
      alpine(this).$watch('month', () => {
        this._rebuildGrid()
        this._emitNavigate()
      })
      alpine(this).$watch('year', () => {
        this._rebuildGrid()
        this._rebuildMonthGrid()
        this._rebuildYearGrid()
        this._emitNavigate()
      })
      alpine(this).$watch('view', () => {
        this._emitViewChange()
      })

      // Auto-bind to x-ref="input" if present
      alpine(this).$nextTick(() => {
        const refs = alpine(this).$refs
        if (refs && refs['input'] && refs['input'] instanceof HTMLInputElement) {
          this.bindInput(refs['input'])
        }
      })
    },

    destroy() {
      this._stopPositioning()
      if (this._detachMask) {
        this._detachMask()
        this._detachMask = null
      }
      this._inputEl = null
      this._popupEl = null
    },

    // --- Grid ---

    _rebuildGrid() {
      this.grid = generateMonths(
        this.year,
        this.month,
        this.monthCount,
        this.firstDay,
        this._today,
        this._isDisabledDate,
      )
    },

    /** Rebuild the 3×4 month picker grid for the current year. */
    _rebuildMonthGrid() {
      this.monthGrid = generateMonthGrid(this.year, this._today, locale, this._isMonthDisabled)
    },

    /** Rebuild the 3×4 year picker grid for the current year's 12-year block. */
    _rebuildYearGrid() {
      this.yearGrid = generateYearGrid(this.year, this._today, this._isYearDisabled)
    },

    /** Year label for the month view header (e.g. "2026"). */
    get yearLabel(): string {
      return String(this.year)
    },

    /** Decade range label for the year view header (e.g. "2016 – 2027"). */
    get decadeLabel(): string {
      const startYear = Math.floor(this.year / 12) * 12
      return `${startYear} – ${startYear + 11}`
    },

    /**
     * Whether backward navigation is possible from the current position.
     *
     * - Days view: checks if the previous month has any selectable dates.
     * - Months view: checks if the previous year has any selectable months.
     * - Years view: checks if the previous 12-year block has any selectable years.
     *
     * Usage in Alpine template:
     * ```html
     * <button @click="prev()" :disabled="!canGoPrev">←</button>
     * ```
     */
    get canGoPrev(): boolean {
      if (this.view === 'days') {
        const d = new CalendarDate(this.year, this.month, 1).addMonths(-1)
        return !this._isMonthDisabled(d.year, d.month)
      }
      if (this.view === 'months') {
        return !this._isYearDisabled(this.year - 1)
      }
      if (this.view === 'years') {
        const blockStart = Math.floor(this.year / 12) * 12
        // Check if any year in the previous 12-year block is enabled
        for (let y = blockStart - 12; y < blockStart; y++) {
          if (!this._isYearDisabled(y)) return true
        }
        return false
      }
      return true
    },

    /**
     * Whether forward navigation is possible from the current position.
     *
     * - Days view: checks if the next month has any selectable dates.
     * - Months view: checks if the next year has any selectable months.
     * - Years view: checks if the next 12-year block has any selectable years.
     *
     * Usage in Alpine template:
     * ```html
     * <button @click="next()" :disabled="!canGoNext">→</button>
     * ```
     */
    get canGoNext(): boolean {
      if (this.view === 'days') {
        const d = new CalendarDate(this.year, this.month, 1).addMonths(1)
        return !this._isMonthDisabled(d.year, d.month)
      }
      if (this.view === 'months') {
        return !this._isYearDisabled(this.year + 1)
      }
      if (this.view === 'years') {
        const blockStart = Math.floor(this.year / 12) * 12
        // Check if any year in the next 12-year block is enabled
        for (let y = blockStart + 12; y < blockStart + 24; y++) {
          if (!this._isYearDisabled(y)) return true
        }
        return false
      }
      return true
    },

    /**
     * Compute CSS class object for a year cell in the year picker view.
     */
    yearClasses(cell: YearCell): Record<string, boolean> {
      const selected = this.year === cell.year && this.view === 'months'
      return {
        'rc-year': true,
        'rc-year--current': cell.isCurrentYear,
        'rc-year--selected': selected,
        'rc-year--disabled': cell.isDisabled,
      }
    },

    /**
     * Compute CSS class object for a month cell in the month picker view.
     */
    monthClasses(cell: MonthCell): Record<string, boolean> {
      const selected = this.month === cell.month && this.view === 'days'
      return {
        'rc-month': true,
        'rc-month--current': cell.isCurrentMonth,
        'rc-month--selected': selected,
        'rc-month--disabled': cell.isDisabled,
      }
    },

    /**
     * Get a localized "Month Year" label for a specific month grid.
     * @param gridIndex - Index into the `grid` array (0 for first month, 1 for second).
     */
    monthYearLabel(gridIndex: number): string {
      const g = this.grid[gridIndex]
      if (!g) return ''
      const d = new CalendarDate(g.year, g.month, 1)
      return d.format({ month: 'long', year: 'numeric' }, locale)
    },

    /**
     * Compute CSS class object for a day cell.
     * Returns an object keyed by class name with boolean values, suitable for Alpine `:class`.
     */
    dayClasses(
      cell: { date: CalendarDate; isCurrentMonth: boolean; isToday: boolean; isDisabled: boolean },
    ): Record<string, boolean> {
      const d = cell.date
      const selected = this.isSelected(d)
      const rangeStart = this.isRangeStart(d)
      const rangeEnd = this.isRangeEnd(d)
      const inRange = this.isInRange(d, this.hoverDate ?? undefined)
      const isOtherMonth = !cell.isCurrentMonth

      // Hover preview constraint feedback: mark dates that would form an invalid range
      let rangeInvalid = false
      if (
        mode === 'range' &&
        this.hoverDate !== null &&
        !cell.isDisabled &&
        !selected &&
        (this._selection as RangeSelection).isPartial()
      ) {
        rangeInvalid = !this.isDateSelectableForRange(d)
      }

      return {
        'rc-day': true,
        'rc-day--today': cell.isToday,
        'rc-day--selected': selected,
        'rc-day--range-start': rangeStart,
        'rc-day--range-end': rangeEnd,
        'rc-day--in-range': inRange && !rangeStart && !rangeEnd,
        'rc-day--disabled': cell.isDisabled,
        'rc-day--other-month': isOtherMonth,
        'rc-day--hidden': isOtherMonth && this.monthCount > 1,
        'rc-day--focused': this.focusedDate !== null && this.focusedDate.isSame(d),
        'rc-day--range-invalid': rangeInvalid,
      }
    },

    // --- Input binding ---

    /**
     * Bind an input element to the calendar.
     *
     * Sets up input masking (if enabled), syncs the initial value, and
     * attaches an input listener to keep `inputValue` in sync.
     *
     * Usage in Alpine template:
     * ```html
     * <input x-ref="input" @focus="handleFocus()" @blur="handleBlur()">
     * ```
     * The component auto-binds to `x-ref="input"` during init().
     * For custom refs, call `bindInput($refs.myInput)` explicitly.
     */
    bindInput(el: HTMLInputElement) {
      // Clean up previous binding
      if (this._detachMask) {
        this._detachMask()
        this._detachMask = null
      }

      this._inputEl = el

      // Set initial value
      el.value = this.inputValue

      // Attach mask if enabled
      if (useMask) {
        this._detachMask = attachMask(el, format)
        // attachMask reformats the existing value through the mask
        this.inputValue = el.value
      }

      // Listen for input changes to keep inputValue in sync
      const syncHandler = () => {
        if (!this._syncing) {
          this.inputValue = el.value
        }
      }
      el.addEventListener('input', syncHandler)

      // Extend detach to include our sync listener
      const prevDetach = this._detachMask
      this._detachMask = () => {
        prevDetach?.()
        el.removeEventListener('input', syncHandler)
      }

      // Set placeholder if not already set
      if (!el.placeholder) {
        el.placeholder = format.toLowerCase()
      }
    },

    /**
     * Handle input event for unbound inputs (using `:value` + `@input`).
     * When using `bindInput()`, this is handled automatically.
     */
    handleInput(e: Event) {
      const el = e.target as HTMLInputElement
      this.inputValue = el.value
    },

    /**
     * Handle focus on the input element.
     * Opens the calendar popup in popup display mode.
     */
    handleFocus() {
      this.open()
    },

    /**
     * Handle blur on the input element.
     * Parses the typed value, updates selection if valid, and reformats the input.
     */
    handleBlur() {
      const value = this._inputEl ? this._inputEl.value : this.inputValue

      // Empty input → clear selection
      if (!value.trim()) {
        if (this._selection.toArray().length > 0) {
          this._selection.clear()
          this._rebuildGrid()
          this._emitChange()
        }
        this._syncInputFromSelection()
        return
      }

      // Try to parse and update selection
      let changed = false

      if (mode === 'single') {
        const parsed = parseDate(value, format) ?? CalendarDate.fromISO(value)
        if (parsed && !this._isDisabledDate(parsed)) {
          this._selection.clear()
          this._selection.toggle(parsed)
          this.month = parsed.month
          this.year = parsed.year
          changed = true
        }
      } else if (mode === 'range') {
        const range = parseDateRange(value, format)
        if (
          range &&
          !this._isDisabledDate(range[0]) &&
          !this._isDisabledDate(range[1]) &&
          this._isRangeValid(range[0], range[1])
        ) {
          this._selection.clear()
          this._selection.toggle(range[0])
          this._selection.toggle(range[1])
          this.month = range[0].month
          this.year = range[0].year
          changed = true
        }
      } else if (mode === 'multiple') {
        const dates = parseDateMultiple(value, format)
        const valid = dates.filter((d) => !this._isDisabledDate(d))
        if (valid.length > 0) {
          this._selection.clear()
          for (const d of valid) {
            this._selection.toggle(d)
          }
          const first = valid[0] as CalendarDate
          this.month = first.month
          this.year = first.year
          changed = true
        }
      }

      if (changed) {
        this._rebuildGrid()
        this._emitChange()
      }

      // Always reformat input to canonical display
      this._syncInputFromSelection()
    },

    // --- Internal: input sync ---

    /** Update inputValue and bound input element from current selection. */
    _syncInputFromSelection() {
      this._syncing = true
      this.inputValue = this.formattedValue

      if (this._inputEl) {
        this._inputEl.value = this.inputValue
      }

      this._syncing = false
    },

    /** Dispatch calendar:change event with current selection state. */
    _emitChange() {
      alpine(this).$dispatch('calendar:change', {
        value: this._selection.toValue(),
        dates: this._selection.toArray().map((d: CalendarDate) => d.toISO()),
        formatted: this.formattedValue,
      })
    },

    /** Dispatch calendar:navigate event on month/year change. */
    _emitNavigate() {
      alpine(this).$dispatch('calendar:navigate', {
        year: this.year,
        month: this.month,
        view: this.view,
      })
    },

    /** Dispatch calendar:view-change event on view switch. */
    _emitViewChange() {
      alpine(this).$dispatch('calendar:view-change', {
        view: this.view,
        year: this.year,
        month: this.month,
      })
    },

    // --- Navigation ---

    prev() {
      this._navDirection = 'prev'
      if (this.view === 'days') {
        const d = new CalendarDate(this.year, this.month, 1).addMonths(-1)
        this.month = d.month
        this.year = d.year
      } else if (this.view === 'months') {
        this.year--
      } else if (this.view === 'years') {
        this.year -= 12
      }
    },

    next() {
      this._navDirection = 'next'
      if (this.view === 'days') {
        const d = new CalendarDate(this.year, this.month, 1).addMonths(1)
        this.month = d.month
        this.year = d.year
      } else if (this.view === 'months') {
        this.year++
      } else if (this.view === 'years') {
        this.year += 12
      }
    },

    goToToday() {
      this.month = this._today.month
      this.year = this._today.year
      this.view = 'days'
    },

    // --- Selection ---

    selectDate(dateOrISO: CalendarDate | string) {
      const date = typeof dateOrISO === 'string' ? CalendarDate.fromISO(dateOrISO) : dateOrISO
      if (!date) return
      if (this._isDisabledDate(date)) return

      // Range validation: when about to complete a range, check min/max range
      if (mode === 'range') {
        const range = this._selection as RangeSelection
        const rangeStart = range.getStart()
        if (range.isPartial() && rangeStart && !date.isSame(rangeStart)) {
          // Determine actual start/end after potential swap
          let start: CalendarDate = rangeStart
          let end: CalendarDate = date
          if (end.isBefore(start)) {
            const tmp = start
            start = end
            end = tmp
          }
          if (!this._isRangeValid(start, end)) return
        }
      }

      // beforeSelect callback: allow consumers to prevent selection
      if (beforeSelectCb) {
        const action = this._selection.isSelected(date) ? 'deselect' : 'select'
        const result = beforeSelectCb(date, {
          mode,
          selectedDates: this._selection.toArray(),
          action,
        })
        if (result === false) return
      }

      this._selection.toggle(date)
      if (wizard) this._wizardDay = date.day
      this._rebuildGrid()
      this._emitChange()
      this._syncInputFromSelection()

      // Auto-close popup after selection is complete
      if (closeOnSelect && display === 'popup' && this.isOpen) {
        const isComplete =
          mode === 'single' ||
          (mode === 'range' && !(this._selection as RangeSelection).isPartial()) ||
          mode === 'multiple'
        if (isComplete) this.close()
      }
    },

    isSelected(date: CalendarDate): boolean {
      return this._selection.isSelected(date)
    },

    isInRange(date: CalendarDate, hoverDate?: CalendarDate): boolean {
      if (mode !== 'range') return false
      return (this._selection as RangeSelection).isInRange(date, hoverDate)
    },

    isRangeStart(date: CalendarDate): boolean {
      if (mode !== 'range') return false
      const start = (this._selection as RangeSelection).getStart()
      return start !== null && date.isSame(start)
    },

    isRangeEnd(date: CalendarDate): boolean {
      if (mode !== 'range') return false
      const end = (this._selection as RangeSelection).getEnd()
      return end !== null && date.isSame(end)
    },

    /**
     * Check whether selecting `date` as a range endpoint would produce a valid range.
     *
     * Returns `true` when:
     * - The date is not disabled AND
     * - Either no range start is selected yet (any non-disabled date can start), OR
     * - Completing the range with this date would satisfy minRange/maxRange constraints.
     *
     * Returns `false` for non-range modes.
     *
     * Useful for dimming dates in the UI that would result in an invalid range.
     */
    isDateSelectableForRange(date: CalendarDate): boolean {
      if (mode !== 'range') return false
      if (this._isDisabledDate(date)) return false

      const range = this._selection as RangeSelection

      // No start selected yet, or range is already complete (next click restarts)
      if (!range.isPartial()) return true

      const rangeStart = range.getStart()!

      // Clicking the same date as start deselects — always allowed
      if (date.isSame(rangeStart)) return true

      // Determine actual start/end after potential swap
      let start = rangeStart
      let end = date
      if (end.isBefore(start)) {
        const tmp = start
        start = end
        end = tmp
      }

      return this._isRangeValid(start, end)
    },

    clearSelection() {
      this._selection.clear()
      this._rebuildGrid()
      this._emitChange()
      this._syncInputFromSelection()
    },

    // --- Programmatic control ---

    /**
     * Set the calendar selection programmatically.
     *
     * Accepts a single ISO date string, an array of ISO strings, or CalendarDate(s).
     * The calendar navigates to show the first selected date.
     *
     * Usage:
     * ```js
     * // Single mode
     * $data.setValue('2025-06-15')
     *
     * // Multiple mode
     * $data.setValue(['2025-06-15', '2025-06-20'])
     *
     * // Range mode
     * $data.setValue(['2025-06-15', '2025-06-20'])
     *
     * // With CalendarDate
     * $data.setValue(new CalendarDate(2025, 6, 15))
     * ```
     */
    setValue(value: string | string[] | CalendarDate | CalendarDate[]) {
      this._selection.clear()

      const dates: CalendarDate[] = []

      if (typeof value === 'string') {
        // Single ISO string
        const d = CalendarDate.fromISO(value) ?? parseDate(value, format)
        if (d && !this._isDisabledDate(d)) {
          dates.push(d)
        }
      } else if (Array.isArray(value)) {
        for (const v of value) {
          const d = typeof v === 'string' ? (CalendarDate.fromISO(v) ?? parseDate(v, format)) : v
          if (d && !this._isDisabledDate(d)) {
            dates.push(d)
          }
        }
      } else if (value instanceof CalendarDate) {
        if (!this._isDisabledDate(value)) {
          dates.push(value)
        }
      }

      // Range validation
      if (mode === 'range' && dates.length === 2) {
        let [start, end] = dates as [CalendarDate, CalendarDate]
        if (end.isBefore(start)) {
          const tmp = start
          start = end
          end = tmp
        }
        if (!this._isRangeValid(start, end)) {
          // Invalid range — don't set anything
          this._rebuildGrid()
          this._emitChange()
          this._syncInputFromSelection()
          return
        }
        this._selection.toggle(start)
        this._selection.toggle(end)
      } else {
        for (const d of dates) {
          this._selection.toggle(d)
        }
      }

      // Navigate to the first selected date
      const selected = this._selection.toArray()
      if (selected.length > 0) {
        const first = selected[0] as CalendarDate
        this.month = first.month
        this.year = first.year
      }

      this._rebuildGrid()
      this._emitChange()
      this._syncInputFromSelection()
    },

    /**
     * Clear the current selection. Alias for `clearSelection()`.
     */
    clear() {
      this.clearSelection()
    },

    /**
     * Navigate the calendar to a specific year and month without changing selection.
     *
     * Usage:
     * ```js
     * $data.goTo(2025, 6)   // Navigate to June 2025
     * $data.goTo(2030)      // Navigate to the current month in 2030
     * ```
     */
    goTo(year: number, month?: number) {
      this.year = year
      if (month !== undefined) {
        this.month = month
      }
      this.view = 'days'
    },

    /**
     * Get the current selection as an array of CalendarDate objects.
     *
     * Returns a new array each time (safe to mutate).
     *
     * Usage:
     * ```js
     * const dates = $data.getSelection()
     * console.log(dates.map(d => d.toISO()))
     * ```
     */
    getSelection(): CalendarDate[] {
      return [...this._selection.toArray()]
    },

    // --- Runtime config ---

    /**
     * Update constraint-related configuration at runtime.
     *
     * Rebuilds all constraint functions and refreshes grids. Accepts the same
     * constraint properties as `CalendarConfig` (minDate, maxDate, disabledDates,
     * disabledDaysOfWeek, enabledDates, enabledDaysOfWeek, disabledMonths,
     * enabledMonths, disabledYears, enabledYears, minRange, maxRange, rules).
     *
     * Usage:
     * ```js
     * $data.updateConstraints({ minDate: '2025-06-01', disabledDaysOfWeek: [0, 6] })
     * ```
     */
    updateConstraints(updates: Partial<CalendarConfig>) {
      const c = buildConstraints(updates)
      this._isDisabledDate = c.isDisabledDate
      this._isRangeValid = c.isRangeValid
      this._isMonthDisabled = c.isMonthDisabled
      this._isYearDisabled = c.isYearDisabled
      this._rebuildGrid()
      this._rebuildMonthGrid()
      this._rebuildYearGrid()
    },

    // --- View switching ---

    setView(newView: 'days' | 'months' | 'years') {
      this.view = newView
    },

    selectMonth(targetMonth: number) {
      if (this._isMonthDisabled(this.year, targetMonth)) return
      this.month = targetMonth
      this._wizardMonth = targetMonth

      if (wizardMode === 'year-month') {
        // Auto-select 1st of month → emit → close
        this.wizardStep = wizardTotalSteps
        this.selectDate(new CalendarDate(this.year, targetMonth, 1))
        return
      }

      this.view = 'days'
      if (wizard) {
        this.wizardStep = wizardMode === 'month-day' ? 2 : 3
      }
    },

    selectYear(targetYear: number) {
      if (this._isYearDisabled(targetYear)) return
      this.year = targetYear
      this._wizardYear = targetYear
      this.view = 'months'
      if (this.wizard) this.wizardStep = 2
    },

    /** Navigate the wizard back one step. No-op if not in wizard mode. */
    wizardBack() {
      if (!this.wizard) return
      if (wizardMode === 'full') {
        if (this.wizardStep === 3) {
          this.wizardStep = 2
          this.view = 'months'
          this._wizardMonth = null
          this._wizardDay = null
        } else if (this.wizardStep === 2) {
          this.wizardStep = 1
          this.view = 'years'
          this._wizardYear = null
          this._wizardMonth = null
        }
      } else if (wizardMode === 'year-month') {
        if (this.wizardStep === 2) {
          this.wizardStep = 1
          this.view = 'years'
          this._wizardYear = null
          this._wizardMonth = null
        }
      } else if (wizardMode === 'month-day') {
        if (this.wizardStep === 2) {
          this.wizardStep = 1
          this.view = 'months'
          this._wizardMonth = null
        }
      }
    },

    // --- Popup ---

    open() {
      if (this.display !== 'popup') return

      // Reset wizard to first step on reopen
      if (wizard) {
        this.wizardStep = 1
        this.view = wizardStartView
        this._wizardYear = null
        this._wizardMonth = null
        this._wizardDay = null
        if (wizardMode !== 'month-day') {
          this.year = this._today.year - 30
          this._rebuildYearGrid()
        }
      }

      this.isOpen = true
      alpine(this).$dispatch('calendar:open')

      // Position the popup on next tick (after Alpine renders it)
      alpine(this).$nextTick(() => {
        this._startPositioning()
      })
    },

    close() {
      if (this.display !== 'popup') return
      this.isOpen = false
      this._stopPositioning()
      alpine(this).$dispatch('calendar:close')
    },

    toggle() {
      if (this.isOpen) {
        this.close()
      } else {
        this.open()
      }
    },

    /**
     * Handle keydown events on the calendar container.
     *
     * Supports full keyboard navigation per ARIA grid pattern:
     * - Arrow keys: move focus between days (±1 day / ±7 days)
     * - Enter/Space: select the focused day
     * - PageUp/PageDown: navigate prev/next month (+ Shift: prev/next year)
     * - Home/End: jump to first/last day of current month
     * - Escape: return to day view from month/year picker, or close popup
     * - Tab: natural tab order (exits calendar)
     *
     * Uses `aria-activedescendant` pattern: the calendar grid container holds
     * focus (`tabindex="0"`), and `focusedDate` drives which cell is visually
     * highlighted. Day cells should have `id="day-{ISO}"` in the template.
     *
     * Usage in Alpine template:
     * ```html
     * <div @keydown="handleKeydown($event)" tabindex="0"
     *      :aria-activedescendant="focusedDateISO ? 'day-' + focusedDateISO : null">
     * ```
     */
    handleKeydown(e: KeyboardEvent) {
      // --- Escape: wizard back → view fallback → close popup → do nothing ---
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        // Wizard mode: go back one step instead of jumping to days
        if (this.wizard && this.wizardStep > 1) {
          this.wizardBack()
          return
        }
        // If in month or year picker, return to days view
        if (this.view === 'months' || this.view === 'years') {
          this.view = 'days'
          return
        }
        // If popup is open, close it and return focus to input
        if (display === 'popup' && this.isOpen) {
          this.close()
          if (this._inputEl) {
            this._inputEl.focus()
          }
        }
        return
      }

      // --- Day view keyboard navigation ---
      if (this.view === 'days') {
        switch (e.key) {
          // Navigation keys: auto-initialize focusedDate if not set
          case 'ArrowRight':
          case 'ArrowLeft':
          case 'ArrowDown':
          case 'ArrowUp':
          case 'PageDown':
          case 'PageUp':
          case 'Home':
          case 'End': {
            e.preventDefault()
            // Auto-init focusedDate on first navigation keypress
            if (!this.focusedDate) {
              const selected = this._selection.toArray()
              if (selected.length > 0) {
                this.focusedDate = selected[0] as CalendarDate
              } else {
                this.focusedDate = new CalendarDate(this.year, this.month, 1)
              }
            }
            // Now dispatch to the specific navigation action
            if (e.key === 'ArrowRight') this._moveFocus(1)
            else if (e.key === 'ArrowLeft') this._moveFocus(-1)
            else if (e.key === 'ArrowDown') this._moveFocus(7)
            else if (e.key === 'ArrowUp') this._moveFocus(-7)
            else if (e.key === 'PageDown') this._moveFocusByMonths(e.shiftKey ? 12 : 1)
            else if (e.key === 'PageUp') this._moveFocusByMonths(e.shiftKey ? -12 : -1)
            else if (e.key === 'Home')
              this._setFocusedDate(new CalendarDate(this.year, this.month, 1))
            else if (e.key === 'End')
              this._setFocusedDate(new CalendarDate(this.year, this.month, 1).endOfMonth())
            return
          }
          // Selection keys: only act when focus is already established
          case 'Enter':
          case ' ':
            if (this.focusedDate) {
              e.preventDefault()
              this.selectDate(this.focusedDate)
            }
            return
        }
      }
    },

    // --- Internal: keyboard focus management ---

    /**
     * Move focusedDate by a number of days, navigating months as needed.
     * Skips disabled dates in the direction of movement (up to 31 attempts).
     */
    _moveFocus(deltaDays: number) {
      if (!this.focusedDate) return
      let candidate = this.focusedDate.addDays(deltaDays)

      // Skip disabled dates (up to 31 attempts to avoid infinite loops)
      let attempts = 0
      while (this._isDisabledDate(candidate) && attempts < 31) {
        candidate = candidate.addDays(deltaDays > 0 ? 1 : -1)
        attempts++
      }

      // If all candidates were disabled, don't move
      if (this._isDisabledDate(candidate)) return

      this._setFocusedDate(candidate)
    },

    /**
     * Move focusedDate by a number of months, clamping the day to valid range.
     */
    _moveFocusByMonths(deltaMonths: number) {
      if (!this.focusedDate) return
      const candidate = this.focusedDate.addMonths(deltaMonths)
      this._setFocusedDate(candidate)
    },

    /**
     * Set focusedDate and navigate the calendar view if needed.
     */
    _setFocusedDate(date: CalendarDate) {
      this.focusedDate = date
      // Navigate the calendar view to show the focused date's month
      if (date.month !== this.month || date.year !== this.year) {
        this.month = date.month
        this.year = date.year
      }
    },

    // --- Internal: popup positioning ---

    /**
     * Start popup positioning.
     *
     * Mobile  (< 640px): CSS handles bottom-sheet layout via `.rc-popup-overlay`.
     * Desktop (≥ 640px): uses `computePosition` to float the calendar below
     *         the input element, with `autoUpdate` for scroll/resize tracking
     *         and a document click listener for outside-click dismissal.
     */
    _startPositioning() {
      const refs = alpine(this).$refs
      const popupEl = refs['popup'] as HTMLElement | undefined
      if (popupEl) this._popupEl = popupEl

      // Desktop floating mode: position via computePosition
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 640
      if (isDesktop && this._inputEl && popupEl) {
        const calendarEl = popupEl.querySelector('.rc-calendar') as HTMLElement
        if (!calendarEl) return

        const updatePosition = () => {
          if (!this._inputEl || !calendarEl) return
          const result = computePosition(this._inputEl, calendarEl, {
            placement: placementConfig,
            offset: popupOffsetPx,
          })
          calendarEl.style.position = 'fixed'
          calendarEl.style.left = `${result.x}px`
          calendarEl.style.top = `${result.y}px`
          calendarEl.style.zIndex = '51'
        }

        updatePosition()
        this._autoUpdateCleanup = autoUpdate(this._inputEl, updatePosition)

        // Desktop click-outside handler (deferred to avoid the opening click)
        const handler = (e: Event) => {
          const target = e.target as Node
          if (
            calendarEl &&
            !calendarEl.contains(target) &&
            !this._inputEl?.contains(target)
          ) {
            this.close()
          }
        }
        this._documentClickHandler = handler
        setTimeout(() => {
          document.addEventListener('mousedown', handler)
        }, 0)
      }
      // else: mobile — CSS handles bottom-sheet positioning
    },

    /** Stop position tracking and clean up listeners. */
    _stopPositioning() {
      // Clean up desktop auto-update
      if (this._autoUpdateCleanup) {
        this._autoUpdateCleanup()
        this._autoUpdateCleanup = null
      }

      // Clean up desktop click-outside listener
      if (this._documentClickHandler) {
        document.removeEventListener('mousedown', this._documentClickHandler)
        this._documentClickHandler = null
      }

      // Reset inline positioning styles on the calendar element
      if (this._popupEl) {
        const calendarEl = this._popupEl.querySelector('.rc-calendar') as HTMLElement
        if (calendarEl) {
          calendarEl.style.position = ''
          calendarEl.style.left = ''
          calendarEl.style.top = ''
          calendarEl.style.zIndex = ''
        }
      }

      this._popupEl = null
    },
  }
}
