import type { CalendarDate } from './calendar-date'

// ---------------------------------------------------------------------------
// Per-date metadata types
// ---------------------------------------------------------------------------

/** Metadata that can be attached to individual dates. */
export interface DateMeta {
  /** Text below the day number (e.g., "$150"). */
  label?: string
  /** Visual availability state. 'unavailable' disables selection + shows strikethrough. */
  availability?: 'available' | 'unavailable'
  /** CSS color applied as --color-calendar-day-meta on the cell (for dot/label). */
  color?: string
  /** Custom class(es) added to the day cell. */
  cssClass?: string
}

/**
 * Provider for per-date metadata.
 * Either a static object map keyed by ISO date strings, or a callback.
 */
export type DateMetaProvider =
  | ((date: CalendarDate) => DateMeta | undefined)
  | Record<string, DateMeta>

/**
 * Normalize a DateMetaProvider into a consistent callback form.
 *
 * - `undefined`/`null` → returns a no-op that always returns `undefined`
 * - function → pass through
 * - object map → wrap in `(date) => map[date.toISO()]`
 */
export function normalizeDateMeta(
  provider: DateMetaProvider | undefined | null,
): (date: CalendarDate) => DateMeta | undefined {
  if (provider == null) return () => undefined
  if (typeof provider === 'function') return provider
  return (date) => provider[date.toISO()]
}
