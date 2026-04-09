/**
 * Locale-aware month name utilities for MMM/MMMM format tokens.
 *
 * Uses Intl.DateTimeFormat to produce month names that respect the
 * configured BCP 47 locale string. Results are cached per locale+style.
 */

// ---------------------------------------------------------------------------
// Cache
// ---------------------------------------------------------------------------

const cache = new Map<string, string[]>()

function cacheKey(style: 'short' | 'long', locale?: string): string {
  return (locale ?? '') + '|' + style
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return an array of 12 month names (index 0 = January) for the given style
 * and locale. Results are cached.
 *
 * @param style  - 'short' for abbreviated (e.g. "Mar"), 'long' for full (e.g. "March")
 * @param locale - BCP 47 locale string; omit for browser default
 */
export function getMonthNames(style: 'short' | 'long', locale?: string): string[] {
  const key = cacheKey(style, locale)
  const cached = cache.get(key)
  if (cached) return cached

  const fmt = new Intl.DateTimeFormat(locale, { month: style })
  const names: string[] = []
  for (let m = 0; m < 12; m++) {
    // Use a fixed day (15th) to avoid any timezone-related month rollover
    names.push(fmt.format(new Date(2000, m, 15)))
  }

  cache.set(key, names)
  return names
}

/**
 * Parse a month name string (case-insensitive) and return its 1-based month
 * number, or null if not found.
 *
 * Checks both short and long names for the given locale.
 *
 * @param name   - The month name to look up (e.g. "Mar", "march", "MARCH")
 * @param locale - BCP 47 locale string; omit for browser default
 */
export function parseMonthName(name: string, locale?: string): number | null {
  const lower = name.toLowerCase()

  for (const style of ['short', 'long'] as const) {
    const names = getMonthNames(style, locale)
    for (let i = 0; i < names.length; i++) {
      if ((names[i] as string).toLowerCase() === lower) {
        return i + 1
      }
    }
  }

  return null
}

/**
 * Check whether a format string contains MMM or MMMM month-name tokens.
 *
 * When true, the fixed-character input mask cannot be used because month
 * names produce variable-length strings.
 */
export function formatHasMonthName(format: string): boolean {
  // No other token combination produces three consecutive 'M's,
  // so a simple substring check is sufficient for both MMM and MMMM.
  return format.includes('MMM')
}
