import { CalendarDate, daysInMonth } from './calendar-date'

/**
 * A predefined date range shortcut (e.g., "Today", "Last 7 Days").
 *
 * Re-exported from the component module for convenience — this is the
 * canonical definition of the interface used by both core and plugin.
 */
export interface RangePreset {
  /** Display label for the preset button. */
  label: string
  /**
   * Function that returns a `[start, end]` date pair.
   * Called at click time so "Today", "Last 7 Days", etc. stay current.
   */
  value: () => [CalendarDate, CalendarDate]
}

// ---------------------------------------------------------------------------
// Built-in preset factories
// ---------------------------------------------------------------------------

/**
 * Create a "Today" preset — selects today as a single-day range.
 *
 * @param label  - Custom label (default: "Today")
 * @param timezone - IANA timezone for resolving today
 */
export function presetToday(label = 'Today', timezone?: string): RangePreset {
  return {
    label,
    value: () => {
      const today = CalendarDate.today(timezone)
      return [today, today]
    },
  }
}

/**
 * Create a "Yesterday" preset — selects yesterday as a single-day range.
 *
 * @param label  - Custom label (default: "Yesterday")
 * @param timezone - IANA timezone for resolving today
 */
export function presetYesterday(label = 'Yesterday', timezone?: string): RangePreset {
  return {
    label,
    value: () => {
      const yesterday = CalendarDate.today(timezone).addDays(-1)
      return [yesterday, yesterday]
    },
  }
}

/**
 * Create a "Last N Days" preset — selects from (today - N + 1) to today.
 *
 * @param days     - Number of days (inclusive)
 * @param label    - Custom label (default: "Last {days} Days")
 * @param timezone - IANA timezone for resolving today
 */
export function presetLastNDays(days: number, label?: string, timezone?: string): RangePreset {
  return {
    label: label ?? `Last ${days} Days`,
    value: () => {
      const today = CalendarDate.today(timezone)
      return [today.addDays(-(days - 1)), today]
    },
  }
}

/**
 * Create a "This Week" preset — selects from the start of the current week to today.
 * Weeks start on the given `firstDay` (0=Sun, 1=Mon, default: 1).
 *
 * @param label    - Custom label (default: "This Week")
 * @param firstDay - First day of the week (0=Sun, 1=Mon; default: 1)
 * @param timezone - IANA timezone for resolving today
 */
export function presetThisWeek(label = 'This Week', firstDay = 1, timezone?: string): RangePreset {
  return {
    label,
    value: () => {
      const today = CalendarDate.today(timezone)
      const dow = today.toNativeDate().getDay()
      const diff = (dow - firstDay + 7) % 7
      const weekStart = today.addDays(-diff)
      return [weekStart, today]
    },
  }
}

/**
 * Create a "Last Week" preset — selects the full 7-day week before the current week.
 * Weeks start on the given `firstDay` (0=Sun, 1=Mon, default: 1).
 *
 * @param label    - Custom label (default: "Last Week")
 * @param firstDay - First day of the week (0=Sun, 1=Mon; default: 1)
 * @param timezone - IANA timezone for resolving today
 */
export function presetLastWeek(label = 'Last Week', firstDay = 1, timezone?: string): RangePreset {
  return {
    label,
    value: () => {
      const today = CalendarDate.today(timezone)
      const dow = today.toNativeDate().getDay()
      const diff = (dow - firstDay + 7) % 7
      const thisWeekStart = today.addDays(-diff)
      const lastWeekStart = thisWeekStart.addDays(-7)
      const lastWeekEnd = thisWeekStart.addDays(-1)
      return [lastWeekStart, lastWeekEnd]
    },
  }
}

/**
 * Create a "This Month" preset — selects from the 1st of the current month to today.
 *
 * @param label    - Custom label (default: "This Month")
 * @param timezone - IANA timezone for resolving today
 */
export function presetThisMonth(label = 'This Month', timezone?: string): RangePreset {
  return {
    label,
    value: () => {
      const today = CalendarDate.today(timezone)
      return [today.startOfMonth(), today]
    },
  }
}

/**
 * Create a "Last Month" preset — selects the full previous month.
 *
 * @param label    - Custom label (default: "Last Month")
 * @param timezone - IANA timezone for resolving today
 */
export function presetLastMonth(label = 'Last Month', timezone?: string): RangePreset {
  return {
    label,
    value: () => {
      const today = CalendarDate.today(timezone)
      const prevMonth = today.addMonths(-1)
      return [
        prevMonth.startOfMonth(),
        new CalendarDate(prevMonth.year, prevMonth.month, daysInMonth(prevMonth.year, prevMonth.month)),
      ]
    },
  }
}

/**
 * Create a "This Year" preset — selects from January 1st of the current year to today.
 *
 * @param label    - Custom label (default: "This Year")
 * @param timezone - IANA timezone for resolving today
 */
export function presetThisYear(label = 'This Year', timezone?: string): RangePreset {
  return {
    label,
    value: () => {
      const today = CalendarDate.today(timezone)
      return [new CalendarDate(today.year, 1, 1), today]
    },
  }
}

/**
 * Create a "Last Year" preset — selects the full previous year (Jan 1 – Dec 31).
 *
 * @param label    - Custom label (default: "Last Year")
 * @param timezone - IANA timezone for resolving today
 */
export function presetLastYear(label = 'Last Year', timezone?: string): RangePreset {
  return {
    label,
    value: () => {
      const today = CalendarDate.today(timezone)
      const prevYear = today.year - 1
      return [new CalendarDate(prevYear, 1, 1), new CalendarDate(prevYear, 12, 31)]
    },
  }
}
