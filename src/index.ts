import type { Alpine as AlpineType } from 'alpinejs'
import '../styles/calendar.css'
import { createCalendarData } from './plugin/calendar-component'
import type { CalendarConfig } from './plugin/calendar-component'

// ---------------------------------------------------------------------------
// Global defaults
// ---------------------------------------------------------------------------

let globalDefaults: Partial<CalendarConfig> = {}

// ---------------------------------------------------------------------------
// Plugin
// ---------------------------------------------------------------------------

/**
 * Alpine.js plugin that registers the `calendar` component.
 *
 * Usage:
 * ```ts
 * import Alpine from 'alpinejs'
 * import { calendarPlugin } from '@reachgr/alpine-calendar'
 *
 * Alpine.plugin(calendarPlugin)
 * Alpine.start()
 * ```
 */
export function calendarPlugin(Alpine: AlpineType) {
  Alpine.data('calendar', (config: CalendarConfig = {}) =>
    createCalendarData({ ...globalDefaults, ...config }),
  )
}

/**
 * Set global defaults that apply to every calendar instance.
 * Instance-level config overrides global defaults.
 *
 * Usage:
 * ```ts
 * import { calendarPlugin } from '@reachgr/alpine-calendar'
 *
 * calendarPlugin.defaults({ firstDay: 1, locale: 'el' })
 * Alpine.plugin(calendarPlugin)
 * ```
 */
calendarPlugin.defaults = (config: Partial<CalendarConfig>) => {
  globalDefaults = { ...globalDefaults, ...config }
}

/**
 * Get the current global defaults (useful for testing/debugging).
 */
calendarPlugin.getDefaults = (): Partial<CalendarConfig> => ({ ...globalDefaults })

/**
 * Reset global defaults to empty (useful for testing).
 */
calendarPlugin.resetDefaults = () => {
  globalDefaults = {}
}

export default calendarPlugin

// Re-export types and utilities for bundler consumers
export { createCalendarData } from './plugin/calendar-component'
export type { CalendarConfig } from './plugin/calendar-component'
export { CalendarDate, daysInMonth } from './core/calendar-date'
export { generateMonth, generateMonths, generateMonthGrid, generateYearGrid } from './core/grid'
export type { DayCell, MonthGrid, MonthCell, YearCell } from './core/grid'
export { SingleSelection, MultipleSelection, RangeSelection } from './core/selection'
export type { Selection } from './core/selection'
export {
  createDateConstraint,
  createRangeValidator,
  createDisabledReasons,
  isDateDisabled,
} from './core/constraints'
export type {
  DateConstraintOptions,
  DateConstraintProperties,
  DateConstraintRule,
  ConstraintMessages,
} from './core/constraints'
export type { CalendarConfigRule } from './plugin/calendar-component'
export { parseDate, parseDateRange, parseDateMultiple } from './input/parser'
export { formatDate, formatRange, formatMultiple } from './input/formatter'
export { createMask, createMaskHandlers, attachMask, parseFormatToSlots } from './input/mask'
export type { InputMask, MaskEventHandlers, MaskSlot } from './input/mask'
export { computePosition, autoUpdate } from './positioning/popup'
export type { Placement, PositionOptions, PositionResult } from './positioning/popup'
