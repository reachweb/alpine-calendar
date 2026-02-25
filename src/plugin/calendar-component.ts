import { CalendarDate } from '../core/calendar-date'
import { createDateConstraint, createRangeValidator } from '../core/constraints'
import type { DateConstraintOptions, DateConstraintRule } from '../core/constraints'
import { generateMonths, generateMonthGrid } from '../core/grid'
import type { MonthGrid, MonthCell } from '../core/grid'
import { SingleSelection, MultipleSelection, RangeSelection } from '../core/selection'
import type { Selection } from '../core/selection'
import { formatDate, formatRange, formatMultiple } from '../input/formatter'
import { parseDate, parseDateRange, parseDateMultiple } from '../input/parser'
import { attachMask } from '../input/mask'
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
  /** Minimum range length in days (inclusive). Only used in range mode. */
  minRange?: number
  /** Maximum range length in days (inclusive). Only used in range mode. */
  maxRange?: number
  /** Period-specific constraint rules. First matching rule wins. */
  rules?: CalendarConfigRule[]
  /** Enable birth-date wizard mode. Default: false. */
  wizard?: boolean
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
  if (rule.minRange !== undefined) {
    result.minRange = rule.minRange
  }
  if (rule.maxRange !== undefined) {
    result.maxRange = rule.maxRange
  }

  return result
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
  // --- Parse config with defaults ---
  const mode = config.mode ?? 'single'
  const display = config.display ?? 'inline'
  const format = config.format ?? 'DD/MM/YYYY'
  const monthCount = config.months ?? 1
  const firstDay = config.firstDay ?? 0
  const timezone = config.timezone
  const wizard = config.wizard ?? false
  const useMask = config.mask ?? true
  const inputName = config.name ?? ''
  const locale = config.locale
  const closeOnSelect = config.closeOnSelect ?? true

  // --- Build constraint options ---
  const constraintOpts: DateConstraintOptions = {}

  if (config.minDate) {
    const d = CalendarDate.fromISO(config.minDate)
    if (d) constraintOpts.minDate = d
  }
  if (config.maxDate) {
    const d = CalendarDate.fromISO(config.maxDate)
    if (d) constraintOpts.maxDate = d
  }
  if (config.disabledDates) {
    constraintOpts.disabledDates = parseISODates(config.disabledDates)
  }
  if (config.disabledDaysOfWeek) {
    constraintOpts.disabledDaysOfWeek = config.disabledDaysOfWeek
  }
  if (config.enabledDates) {
    constraintOpts.enabledDates = parseISODates(config.enabledDates)
  }
  if (config.enabledDaysOfWeek) {
    constraintOpts.enabledDaysOfWeek = config.enabledDaysOfWeek
  }
  if (config.minRange !== undefined) {
    constraintOpts.minRange = config.minRange
  }
  if (config.maxRange !== undefined) {
    constraintOpts.maxRange = config.maxRange
  }
  if (config.rules) {
    const parsedRules = config.rules
      .map((r) => parseConfigRule(r))
      .filter((r): r is DateConstraintRule => r !== null)
    if (parsedRules.length > 0) {
      constraintOpts.rules = parsedRules
    }
  }

  const isDisabledDate = createDateConstraint(constraintOpts)
  const isRangeValid = createRangeValidator(constraintOpts)

  // Month-level disabled check: a month is disabled when it falls entirely
  // outside the [minDate, maxDate] range.
  const isMonthDisabled = (year: number, month: number): boolean => {
    if (constraintOpts.minDate) {
      // End of this month is before minDate → entire month is before range
      const endOfMonth = new CalendarDate(year, month, 1).endOfMonth()
      if (endOfMonth.isBefore(constraintOpts.minDate)) return true
    }
    if (constraintOpts.maxDate) {
      // Start of this month is after maxDate → entire month is after range
      const startOfMonth = new CalendarDate(year, month, 1)
      if (startOfMonth.isAfter(constraintOpts.maxDate)) return true
    }
    return false
  }

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
      if (d && !isDisabledDate(d)) selection.toggle(d)
    } else if (mode === 'range') {
      const range = parseDateRange(config.value, format)
      if (range) {
        selection.toggle(range[0])
        selection.toggle(range[1])
      }
    } else if (mode === 'multiple') {
      const dates = parseDateMultiple(config.value, format)
      for (const d of dates) {
        if (!isDisabledDate(d)) selection.toggle(d)
      }
    }
  }

  // --- Resolve today ---
  const today = CalendarDate.today(timezone)

  // --- Determine initial viewing month/year ---
  const initialDates = selection.toArray()
  const viewDate = (initialDates.length > 0 ? initialDates[0] : today) as CalendarDate

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
    inputName,

    // --- Reactive state ---
    month: viewDate.month,
    year: viewDate.year,
    view: (wizard ? 'years' : 'days') as 'days' | 'months' | 'years',
    isOpen: display === 'inline',
    grid: [] as MonthGrid[],
    monthGrid: [] as MonthCell[][],
    inputValue: computeFormattedValue(selection),
    popupStyle: display === 'popup'
      ? 'position:fixed;inset:0;z-index:50;'
      : '',
    focusedDate: null as CalendarDate | null,
    hoverDate: null as CalendarDate | null,

    // --- Internal state ---
    _navDirection: '' as '' | 'next' | 'prev',
    _selection: selection,
    _today: today,
    _isDisabledDate: isDisabledDate,
    _isRangeValid: isRangeValid,
    _inputEl: null as HTMLInputElement | null,
    _detachMask: null as (() => void) | null,
    _syncing: false,
    _popupEl: null as HTMLElement | null,

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

      // Alpine $watch: rebuild grid when month or year changes externally
      alpine(this).$watch('month', () => this._rebuildGrid())
      alpine(this).$watch('year', () => {
        this._rebuildGrid()
        this._rebuildMonthGrid()
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

    /** Rebuild the 4×3 month picker grid for the current year. */
    _rebuildMonthGrid() {
      this.monthGrid = generateMonthGrid(this.year, this._today, locale, isMonthDisabled)
    },

    /** Year label for the month view header (e.g. "2026"). */
    get yearLabel(): string {
      return String(this.year)
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

      this._selection.toggle(date)
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

    clearSelection() {
      this._selection.clear()
      this._rebuildGrid()
      this._emitChange()
      this._syncInputFromSelection()
    },

    // --- View switching ---

    setView(newView: 'days' | 'months' | 'years') {
      this.view = newView
    },

    selectMonth(targetMonth: number) {
      this.month = targetMonth
      this.view = 'days'
    },

    selectYear(targetYear: number) {
      this.year = targetYear
      this.view = 'months'
    },

    // --- Popup ---

    open() {
      if (this.display !== 'popup') return
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
      // --- Escape: view fallback → close popup → do nothing ---
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
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

    /** Capture popup element reference on open. */
    _startPositioning() {
      const refs = alpine(this).$refs
      const popupEl = refs['popup'] as HTMLElement | undefined
      if (popupEl) this._popupEl = popupEl
    },

    /** Stop position tracking. Keep popupStyle so the leave transition doesn't flash. */
    _stopPositioning() {
      this._popupEl = null
    },
  }
}
