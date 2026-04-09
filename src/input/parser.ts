import { CalendarDate, daysInMonth } from '../core/calendar-date'
import { getMonthNames, parseMonthName } from './month-names'

/**
 * Supported format tokens:
 *   DD   - Day of month, zero-padded (01–31)
 *   D    - Day of month (1–31)
 *   MMMM - Full month name (e.g. "March"), locale-aware
 *   MMM  - Short month name (e.g. "Mar"), locale-aware
 *   MM   - Month, zero-padded (01–12)
 *   M    - Month (1–12)
 *   YYYY - Full year (e.g. 2025)
 *   YY   - Two-digit year (e.g. 25 → 2025)
 *
 * Supported separators: `/`, `-`, `.`
 */

/** Map of format tokens to their regex patterns and extraction logic. */
interface TokenDef {
  pattern: string | ((locale?: string) => string)
  extract: (match: string, locale?: string) => number
}

const TOKENS: Record<string, TokenDef> = {
  YYYY: { pattern: '(\\d{4})', extract: (m) => Number(m) },
  YY: { pattern: '(\\d{2})', extract: (m) => 2000 + Number(m) },
  MMMM: {
    pattern: (locale) => {
      const names = getMonthNames('long', locale)
      return '(' + names.map(escapeRegex).join('|') + ')'
    },
    extract: (m, locale) => parseMonthName(m, locale) ?? 0,
  },
  MMM: {
    pattern: (locale) => {
      const names = getMonthNames('short', locale)
      return '(' + names.map(escapeRegex).join('|') + ')'
    },
    extract: (m, locale) => parseMonthName(m, locale) ?? 0,
  },
  MM: { pattern: '(\\d{1,2})', extract: (m) => Number(m) },
  M: { pattern: '(\\d{1,2})', extract: (m) => Number(m) },
  DD: { pattern: '(\\d{1,2})', extract: (m) => Number(m) },
  D: { pattern: '(\\d{1,2})', extract: (m) => Number(m) },
}

// Token names sorted longest-first so MMMM matches before MMM before MM before M, etc.
const TOKEN_NAMES = Object.keys(TOKENS).sort((a, b) => b.length - a.length)

/**
 * Build a regex and extraction plan from a format string.
 *
 * Separators (/, -, .) in the format are matched literally.
 * Tokens (DD, MM, YYYY, etc.) become capturing groups.
 *
 * Results are cached per format+locale since a calendar typically uses
 * one format for its entire lifetime.
 */
const compiledFormatCache = new Map<
  string,
  { regex: RegExp; extractors: { token: string; index: number }[] }
>()

function compileFormat(
  format: string,
  locale?: string,
): {
  regex: RegExp
  extractors: { token: string; index: number }[]
} {
  const cacheKey = (locale ?? '') + '|' + format
  const cached = compiledFormatCache.get(cacheKey)
  if (cached) return cached

  let remaining = format
  let regexStr = '^'
  const extractors: { token: string; index: number }[] = []
  let groupIndex = 1
  let hasMonthName = false

  while (remaining.length > 0) {
    let matched = false

    for (const name of TOKEN_NAMES) {
      if (remaining.startsWith(name)) {
        const def = TOKENS[name]
        if (def) {
          const pat = typeof def.pattern === 'function' ? def.pattern(locale) : def.pattern
          regexStr += pat
          extractors.push({ token: name, index: groupIndex })
          groupIndex++
          remaining = remaining.slice(name.length)
          if (name === 'MMM' || name === 'MMMM') hasMonthName = true
          matched = true
          break
        }
      }
    }

    if (!matched) {
      // Literal character (separator or other)
      const char = remaining[0] as string
      regexStr += escapeRegex(char)
      remaining = remaining.slice(1)
    }
  }

  regexStr += '$'
  const result = { regex: new RegExp(regexStr, hasMonthName ? 'i' : ''), extractors }
  compiledFormatCache.set(cacheKey, result)
  return result
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Validate that a year/month/day combination represents a real date.
 */
function isValidDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12) return false
  if (day < 1) return false
  if (day > daysInMonth(year, month)) return false
  if (year < 1) return false
  return true
}

/**
 * Parse a date string according to the given format.
 *
 * Parsing is lenient: single-digit day/month values are accepted even when
 * the format specifies DD/MM (e.g., `1/3/2025` matches `DD/MM/YYYY`).
 *
 * @param input  - The date string to parse (e.g., "15/06/2025" or "15 Mar 2025")
 * @param format - The format string (e.g., "DD/MM/YYYY" or "DD MMM YYYY")
 * @param locale - BCP 47 locale for month-name tokens; omit for browser default
 * @returns The parsed CalendarDate, or null if parsing fails or date is invalid
 */
export function parseDate(input: string, format: string, locale?: string): CalendarDate | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  const { regex, extractors } = compileFormat(format, locale)
  const match = regex.exec(trimmed)
  if (!match) return null

  let year = 0
  let month = 0
  let day = 0

  for (const { token, index } of extractors) {
    const value = match[index]
    if (value === undefined) return null

    const def = TOKENS[token]
    if (!def) return null

    const extracted = def.extract(value, locale)

    if (token === 'YYYY' || token === 'YY') {
      year = extracted
    } else if (token === 'MM' || token === 'M' || token === 'MMM' || token === 'MMMM') {
      month = extracted
    } else if (token === 'DD' || token === 'D') {
      day = extracted
    }
  }

  if (!isValidDate(year, month, day)) return null

  return new CalendarDate(year, month, day)
}

/**
 * Parse a range string into two CalendarDates.
 *
 * Supported separators between the two dates: ` - `, ` – ` (en-dash), ` — ` (em-dash).
 *
 * @param input  - The range string (e.g., "01/01/2025 - 07/01/2025")
 * @param format - The format for each individual date
 * @param locale - BCP 47 locale for month-name tokens; omit for browser default
 * @returns Tuple of [start, end], or null if parsing fails
 */
export function parseDateRange(
  input: string,
  format: string,
  locale?: string,
): [CalendarDate, CalendarDate] | null {
  const trimmed = input.trim()
  if (trimmed === '') return null

  // Try splitting on range separators (with surrounding spaces)
  const separators = [' – ', ' — ', ' - ']
  for (const sep of separators) {
    const idx = trimmed.indexOf(sep)
    if (idx !== -1) {
      const startStr = trimmed.slice(0, idx)
      const endStr = trimmed.slice(idx + sep.length)
      const start = parseDate(startStr, format, locale) ?? CalendarDate.fromISO(startStr.trim())
      const end = parseDate(endStr, format, locale) ?? CalendarDate.fromISO(endStr.trim())
      if (start && end) return [start, end]
    }
  }

  return null
}

/**
 * Parse a comma-separated list of dates.
 *
 * @param input  - The comma-separated string (e.g., "01/06/2025, 15/06/2025, 20/06/2025")
 * @param format - The format for each individual date
 * @param locale - BCP 47 locale for month-name tokens; omit for browser default
 * @returns Array of parsed CalendarDates (only valid dates included), or empty array
 */
export function parseDateMultiple(input: string, format: string, locale?: string): CalendarDate[] {
  const trimmed = input.trim()
  if (trimmed === '') return []

  const parts = trimmed.split(',')
  const dates: CalendarDate[] = []

  for (const part of parts) {
    const date = parseDate(part, format, locale) ?? CalendarDate.fromISO(part.trim())
    if (date) dates.push(date)
  }

  return dates
}
