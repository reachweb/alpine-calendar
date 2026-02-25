/**
 * CalendarDate — a timezone-safe date value object.
 *
 * Stores year/month/day as plain integers. No internal `Date` object.
 * The only place we touch native `Date` / `Intl.DateTimeFormat` is in
 * `toNativeDate()`, `fromNativeDate()`, `today()`, and `format()`.
 */
export class CalendarDate {
  readonly year: number
  readonly month: number // 1-12
  readonly day: number // 1-31

  constructor(year: number, month: number, day: number) {
    this.year = year
    this.month = month
    this.day = day
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /** Resolve "today" in a given IANA timezone (fallback: browser default). */
  static today(timezone?: string): CalendarDate {
    const now = new Date()
    if (timezone) {
      return CalendarDate.fromNativeDate(now, timezone)
    }
    return new CalendarDate(now.getFullYear(), now.getMonth() + 1, now.getDate())
  }

  /** Create from a native Date, interpreting it in the given timezone. */
  static fromNativeDate(date: Date, timezone?: string): CalendarDate {
    if (timezone) {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(date)

      let year = 0
      let month = 0
      let day = 0
      for (const part of parts) {
        if (part.type === 'year') year = Number(part.value)
        else if (part.type === 'month') month = Number(part.value)
        else if (part.type === 'day') day = Number(part.value)
      }
      return new CalendarDate(year, month, day)
    }
    return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
  }

  /** Create from an ISO string (YYYY-MM-DD). */
  static fromISO(iso: string): CalendarDate | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
    if (!match) return null
    return new CalendarDate(Number(match[1]), Number(match[2]), Number(match[3]))
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /** Convert to a native Date (midnight local time). */
  toNativeDate(): Date {
    return new Date(this.year, this.month - 1, this.day)
  }

  /** Serialize to ISO string YYYY-MM-DD. */
  toISO(): string {
    const y = String(this.year).padStart(4, '0')
    const m = String(this.month).padStart(2, '0')
    const d = String(this.day).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  /** Unique string key for use in Sets/Maps. */
  toKey(): string {
    return this.toISO()
  }

  // ---------------------------------------------------------------------------
  // Comparison helpers
  // ---------------------------------------------------------------------------

  isSame(other: CalendarDate): boolean {
    return this.year === other.year && this.month === other.month && this.day === other.day
  }

  isBefore(other: CalendarDate): boolean {
    if (this.year !== other.year) return this.year < other.year
    if (this.month !== other.month) return this.month < other.month
    return this.day < other.day
  }

  isAfter(other: CalendarDate): boolean {
    if (this.year !== other.year) return this.year > other.year
    if (this.month !== other.month) return this.month > other.month
    return this.day > other.day
  }

  /** Inclusive range check: start <= this <= end. */
  isBetween(start: CalendarDate, end: CalendarDate): boolean {
    return !this.isBefore(start) && !this.isAfter(end)
  }

  /**
   * Number of days from this date to another.
   * Positive when `other` is after `this`, negative when before.
   * Uses UTC to avoid DST issues.
   */
  diffDays(other: CalendarDate): number {
    const a = Date.UTC(this.year, this.month - 1, this.day)
    const b = Date.UTC(other.year, other.month - 1, other.day)
    return Math.round((b - a) / 86_400_000)
  }

  // ---------------------------------------------------------------------------
  // Arithmetic (returns new CalendarDate — immutable)
  // ---------------------------------------------------------------------------

  addDays(days: number): CalendarDate {
    const d = this.toNativeDate()
    d.setDate(d.getDate() + days)
    return CalendarDate.fromNativeDate(d)
  }

  /** Add months with day clamping (e.g. Jan 31 + 1 month = Feb 28/29). */
  addMonths(months: number): CalendarDate {
    let newMonth = this.month - 1 + months
    const newYear = this.year + Math.floor(newMonth / 12)
    newMonth = ((newMonth % 12) + 12) % 12 // normalize to 0-11
    const maxDay = daysInMonth(newYear, newMonth + 1)
    const newDay = Math.min(this.day, maxDay)
    return new CalendarDate(newYear, newMonth + 1, newDay)
  }

  addYears(years: number): CalendarDate {
    const maxDay = daysInMonth(this.year + years, this.month)
    const newDay = Math.min(this.day, maxDay)
    return new CalendarDate(this.year + years, this.month, newDay)
  }

  startOfMonth(): CalendarDate {
    return new CalendarDate(this.year, this.month, 1)
  }

  endOfMonth(): CalendarDate {
    return new CalendarDate(this.year, this.month, daysInMonth(this.year, this.month))
  }

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  /**
   * Format the date using Intl.DateTimeFormat options.
   *
   * @param options - Intl.DateTimeFormat options (e.g. { month: 'long', year: 'numeric' })
   * @param locale  - BCP 47 locale string (default: browser locale)
   */
  format(options: Intl.DateTimeFormatOptions, locale?: string): string {
    const d = this.toNativeDate()
    return new Intl.DateTimeFormat(locale, options).format(d)
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the number of days in a given month (1-12). */
export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month = last day of this month
  return new Date(year, month, 0).getDate()
}
