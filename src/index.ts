import type { Alpine as AlpineType } from 'alpinejs'
import '../styles/calendar.css'
import { createCalendarData } from './plugin/calendar-component'
import type { CalendarConfig } from './plugin/calendar-component'

export function calendarPlugin(Alpine: AlpineType) {
  Alpine.data('calendar', (config: CalendarConfig = {}) => createCalendarData(config))
}

export default calendarPlugin

// Re-export types and utilities for bundler consumers
export { createCalendarData } from './plugin/calendar-component'
export type { CalendarConfig } from './plugin/calendar-component'
export { CalendarDate, daysInMonth } from './core/calendar-date'
export { generateMonth, generateMonths, generateMonthGrid } from './core/grid'
export type { DayCell, MonthGrid, MonthCell } from './core/grid'
export { SingleSelection, MultipleSelection, RangeSelection } from './core/selection'
export type { Selection } from './core/selection'
export { createDateConstraint, createRangeValidator, isDateDisabled } from './core/constraints'
export type {
  DateConstraintOptions,
  DateConstraintProperties,
  DateConstraintRule,
} from './core/constraints'
export type { CalendarConfigRule } from './plugin/calendar-component'
export { parseDate, parseDateRange, parseDateMultiple } from './input/parser'
export { formatDate, formatRange, formatMultiple } from './input/formatter'
export { createMask, createMaskHandlers, attachMask, parseFormatToSlots } from './input/mask'
export type { InputMask, MaskEventHandlers, MaskSlot } from './input/mask'
export { computePosition, autoUpdate } from './positioning/popup'
export type { Placement, PositionOptions, PositionResult } from './positioning/popup'
