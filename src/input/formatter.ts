import type { CalendarDate } from '../core/calendar-date'

/**
 * Date formatting utilities using format token strings.
 *
 * Supported tokens (same as parser):
 *   DD   - Day of month, zero-padded (01–31)
 *   D    - Day of month (1–31)
 *   MM   - Month, zero-padded (01–12)
 *   M    - Month (1–12)
 *   YYYY - Full year (e.g. 2025)
 *   YY   - Two-digit year (e.g. 25)
 *
 * Supported separators: `/`, `-`, `.`, and any other literal character.
 */

// ---------------------------------------------------------------------------
// Token replacement
// ---------------------------------------------------------------------------

/** Map of token names to their formatting functions. */
const TOKEN_FORMATTERS: Record<string, (date: CalendarDate) => string> = {
  YYYY: (d) => String(d.year).padStart(4, '0'),
  YY: (d) => String(d.year % 100).padStart(2, '0'),
  MM: (d) => String(d.month).padStart(2, '0'),
  M: (d) => String(d.month),
  DD: (d) => String(d.day).padStart(2, '0'),
  D: (d) => String(d.day),
}

// Sorted longest-first so YYYY matches before YY, DD before D, MM before M
const TOKEN_NAMES = Object.keys(TOKEN_FORMATTERS).sort((a, b) => b.length - a.length)

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Format a CalendarDate according to a format string.
 *
 * Replaces format tokens with the corresponding date values.
 * All non-token characters are passed through as literals.
 *
 * @param date   - The CalendarDate to format
 * @param format - The format string (e.g., "DD/MM/YYYY")
 * @returns Formatted date string (e.g., "15/06/2025")
 */
export function formatDate(date: CalendarDate, format: string): string {
  let remaining = format
  let result = ''

  while (remaining.length > 0) {
    let matched = false
    for (const token of TOKEN_NAMES) {
      if (remaining.startsWith(token)) {
        const formatter = TOKEN_FORMATTERS[token]
        if (formatter) {
          result += formatter(date)
          remaining = remaining.slice(token.length)
          matched = true
          break
        }
      }
    }
    if (!matched) {
      result += remaining[0] as string
      remaining = remaining.slice(1)
    }
  }

  return result
}

/**
 * Format a date range as a display string.
 *
 * Uses en-dash (–) as the range separator.
 *
 * @param start  - The range start date
 * @param end    - The range end date
 * @param format - The format string for each date
 * @returns Formatted range string (e.g., "01/06/2025 – 30/06/2025")
 */
export function formatRange(start: CalendarDate, end: CalendarDate, format: string): string {
  return `${formatDate(start, format)} – ${formatDate(end, format)}`
}

/**
 * Format multiple dates as a display string.
 *
 * When the number of dates exceeds `maxDisplay`, returns a count string
 * instead of listing all dates (e.g., "3 dates selected").
 *
 * @param dates      - Array of CalendarDates to format
 * @param format     - The format string for each date
 * @param maxDisplay - Maximum number of dates to show before switching to count
 *                     (default: no limit — always shows all dates)
 * @returns Formatted string: comma-separated dates or count string
 */
export function formatMultiple(
  dates: readonly CalendarDate[],
  format: string,
  maxDisplay?: number,
): string {
  if (dates.length === 0) return ''

  if (maxDisplay !== undefined && dates.length > maxDisplay) {
    return `${dates.length} dates selected`
  }

  return dates.map((d) => formatDate(d, format)).join(', ')
}
