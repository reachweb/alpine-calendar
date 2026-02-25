import { CalendarDate } from './calendar-date'

/**
 * Common interface for all selection models.
 *
 * Each model tracks which dates are selected and exposes a uniform API
 * for querying, toggling, clearing, and serializing the selection.
 */
export interface Selection {
  /** Check if a specific date is selected. */
  isSelected(date: CalendarDate): boolean

  /** Toggle a date's selection state. */
  toggle(date: CalendarDate): void

  /** Clear all selected dates. */
  clear(): void

  /** Return selected dates as an array (sorted chronologically). */
  toArray(): CalendarDate[]

  /** Serialize the selection to a string value (for form inputs). */
  toValue(): string
}

// ---------------------------------------------------------------------------
// SingleSelection
// ---------------------------------------------------------------------------

/** Stores zero or one selected date. */
export class SingleSelection implements Selection {
  private selected: CalendarDate | null = null

  constructor(initial?: CalendarDate | null) {
    this.selected = initial ?? null
  }

  isSelected(date: CalendarDate): boolean {
    return this.selected !== null && this.selected.isSame(date)
  }

  /** Toggle: select the date, or deselect if it's already selected. */
  toggle(date: CalendarDate): void {
    if (this.selected !== null && this.selected.isSame(date)) {
      this.selected = null
    } else {
      this.selected = date
    }
  }

  clear(): void {
    this.selected = null
  }

  toArray(): CalendarDate[] {
    return this.selected !== null ? [this.selected] : []
  }

  /** Returns the ISO string of the selected date, or empty string. */
  toValue(): string {
    return this.selected !== null ? this.selected.toISO() : ''
  }

  /** Direct access to the current selection. */
  getSelected(): CalendarDate | null {
    return this.selected
  }
}

// ---------------------------------------------------------------------------
// MultipleSelection
// ---------------------------------------------------------------------------

/** Stores zero or more selected dates via a Set of ISO keys. */
export class MultipleSelection implements Selection {
  private keys = new Set<string>()

  constructor(initial?: CalendarDate[]) {
    if (initial) {
      for (const date of initial) {
        this.keys.add(date.toKey())
      }
    }
  }

  isSelected(date: CalendarDate): boolean {
    return this.keys.has(date.toKey())
  }

  /** Toggle: add the date if absent, remove if present. */
  toggle(date: CalendarDate): void {
    const key = date.toKey()
    if (this.keys.has(key)) {
      this.keys.delete(key)
    } else {
      this.keys.add(key)
    }
  }

  clear(): void {
    this.keys.clear()
  }

  /** Returns selected dates sorted chronologically. */
  toArray(): CalendarDate[] {
    return [...this.keys].sort().map((key) => CalendarDate.fromISO(key) as CalendarDate)
  }

  /** Returns comma-separated ISO strings, sorted chronologically. */
  toValue(): string {
    return [...this.keys].sort().join(', ')
  }

  /** Number of currently selected dates. */
  get count(): number {
    return this.keys.size
  }
}

// ---------------------------------------------------------------------------
// RangeSelection
// ---------------------------------------------------------------------------

/** Stores a date range (start → end), with support for partial state. */
export class RangeSelection implements Selection {
  private start: CalendarDate | null = null
  private end: CalendarDate | null = null

  constructor(start?: CalendarDate | null, end?: CalendarDate | null) {
    this.start = start ?? null
    this.end = end ?? null
  }

  isSelected(date: CalendarDate): boolean {
    if (this.start !== null && this.start.isSame(date)) return true
    if (this.end !== null && this.end.isSame(date)) return true
    return false
  }

  /**
   * Toggle behavior for range selection:
   * 1. Nothing selected → set as start
   * 2. Only start selected → set as end (swap if before start)
   * 3. Both selected → clear and set as new start
   */
  toggle(date: CalendarDate): void {
    if (this.start === null) {
      // Step 1: nothing selected — set start
      this.start = date
    } else if (this.end === null) {
      // Step 2: start set, no end — set end (ensure start <= end)
      if (date.isBefore(this.start)) {
        this.end = this.start
        this.start = date
      } else if (date.isSame(this.start)) {
        // Clicking start again → deselect
        this.start = null
      } else {
        this.end = date
      }
    } else {
      // Step 3: both set — start new selection
      this.start = date
      this.end = null
    }
  }

  clear(): void {
    this.start = null
    this.end = null
  }

  /** Returns [start, end] if both set, [start] if partial, or [] if empty. */
  toArray(): CalendarDate[] {
    if (this.start === null) return []
    if (this.end === null) return [this.start]
    return [this.start, this.end]
  }

  /** Returns "start – end" ISO strings, or just start, or empty string. */
  toValue(): string {
    if (this.start === null) return ''
    if (this.end === null) return this.start.toISO()
    return `${this.start.toISO()} – ${this.end.toISO()}`
  }

  /**
   * Check if a date falls within the range (inclusive), with optional
   * hover preview for visual feedback during range building.
   *
   * When only start is selected and the user hovers over a date,
   * pass that date as `hoverDate` to preview the range.
   */
  isInRange(date: CalendarDate, hoverDate?: CalendarDate): boolean {
    // Full range: both endpoints set
    if (this.start !== null && this.end !== null) {
      return date.isBetween(this.start, this.end)
    }

    // Hover preview: start set, hovering over a candidate end
    if (this.start !== null && hoverDate !== undefined) {
      const rangeStart = this.start.isBefore(hoverDate) ? this.start : hoverDate
      const rangeEnd = this.start.isBefore(hoverDate) ? hoverDate : this.start
      return date.isBetween(rangeStart, rangeEnd)
    }

    return false
  }

  /** Direct access to the range endpoints. */
  getStart(): CalendarDate | null {
    return this.start
  }

  getEnd(): CalendarDate | null {
    return this.end
  }

  /** Whether the range is partially selected (start only, no end). */
  isPartial(): boolean {
    return this.start !== null && this.end === null
  }

  /** Whether the range is fully selected (both start and end). */
  isComplete(): boolean {
    return this.start !== null && this.end !== null
  }
}
