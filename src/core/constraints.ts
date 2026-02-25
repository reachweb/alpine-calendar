import type { CalendarDate } from './calendar-date'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Constraint properties that can be set globally or overridden per rule.
 *
 * All properties are optional — only specified constraints are enforced.
 */
export interface DateConstraintProperties {
  /** Earliest selectable date (inclusive). */
  minDate?: CalendarDate
  /** Latest selectable date (inclusive). */
  maxDate?: CalendarDate
  /** Specific dates to disable (blacklist). */
  disabledDates?: CalendarDate[]
  /** Days of the week to disable (0 = Sunday, 1 = Monday, …, 6 = Saturday). */
  disabledDaysOfWeek?: number[]
  /** Specific dates to force-enable (overrides disabledDates and disabledDaysOfWeek). */
  enabledDates?: CalendarDate[]
  /** Days of the week to enable (whitelist — all other days are disabled). */
  enabledDaysOfWeek?: number[]
  /** Minimum range length in days (inclusive). Only used in range mode. */
  minRange?: number
  /** Maximum range length in days (inclusive). Only used in range mode. */
  maxRange?: number
}

/**
 * A period-specific constraint rule that overrides global settings.
 *
 * When checking a date, if it falls within [from, to], the rule's
 * properties override the global defaults. Unset properties inherit
 * from the global configuration. First matching rule wins.
 */
export interface DateConstraintRule extends DateConstraintProperties {
  /** Start of the period this rule applies to (inclusive). */
  from: CalendarDate
  /** End of the period this rule applies to (inclusive). */
  to: CalendarDate
}

/**
 * Full constraint configuration with global defaults and optional period rules.
 *
 * Backward compatible: all original properties (minDate, maxDate,
 * disabledDates, disabledDaysOfWeek) continue to work as before.
 */
export interface DateConstraintOptions extends DateConstraintProperties {
  /** Period-specific constraint overrides. First matching rule wins. */
  rules?: DateConstraintRule[]
}

// ---------------------------------------------------------------------------
// Precomputation
// ---------------------------------------------------------------------------

interface PrecomputedSets {
  disabledKeys: Set<string> | undefined
  disabledDays: Set<number> | undefined
  enabledKeys: Set<string> | undefined
  enabledDays: Set<number> | undefined
}

interface PrecomputedRule {
  from: CalendarDate
  to: CalendarDate
  minDate: CalendarDate | undefined
  maxDate: CalendarDate | undefined
  minRange: number | undefined
  maxRange: number | undefined
  sets: PrecomputedSets
  hasMinDate: boolean
  hasMaxDate: boolean
}

function precomputeSets(opts: DateConstraintProperties): PrecomputedSets {
  return {
    disabledKeys: opts.disabledDates
      ? new Set(opts.disabledDates.map((d) => d.toKey()))
      : undefined,
    disabledDays: opts.disabledDaysOfWeek ? new Set(opts.disabledDaysOfWeek) : undefined,
    enabledKeys: opts.enabledDates ? new Set(opts.enabledDates.map((d) => d.toKey())) : undefined,
    enabledDays: opts.enabledDaysOfWeek ? new Set(opts.enabledDaysOfWeek) : undefined,
  }
}

// ---------------------------------------------------------------------------
// Core disabled check
// ---------------------------------------------------------------------------

function checkDisabled(
  date: CalendarDate,
  minDate: CalendarDate | undefined,
  maxDate: CalendarDate | undefined,
  sets: PrecomputedSets,
): boolean {
  // 1. Boundary check (absolute — always enforced)
  if (minDate && date.isBefore(minDate)) return true
  if (maxDate && date.isAfter(maxDate)) return true

  // 2. enabledDates force-enables specific dates (bypass DOW and blacklist checks)
  if (sets.enabledKeys && sets.enabledKeys.has(date.toKey())) return false

  // Compute day-of-week once if needed
  const needsDow = sets.enabledDays !== undefined || sets.disabledDays !== undefined
  const dow = needsDow ? date.toNativeDate().getDay() : -1

  // 3. enabledDaysOfWeek whitelist — if set, only these days are allowed
  if (sets.enabledDays && !sets.enabledDays.has(dow)) return true

  // 4. disabledDates blacklist
  if (sets.disabledKeys && sets.disabledKeys.has(date.toKey())) return true

  // 5. disabledDaysOfWeek blacklist
  if (sets.disabledDays && sets.disabledDays.has(dow)) return true

  return false
}

// ---------------------------------------------------------------------------
// createDateConstraint
// ---------------------------------------------------------------------------

/**
 * Create a single `isDateDisabled` function from a set of constraint options.
 *
 * The returned function checks all configured constraints (including
 * period-specific rules) and returns `true` if the date should be
 * disabled (not selectable).
 *
 * @example
 * ```ts
 * const isDisabled = createDateConstraint({
 *   minDate: new CalendarDate(2025, 1, 1),
 *   maxDate: new CalendarDate(2025, 12, 31),
 *   disabledDaysOfWeek: [0, 6],
 *   rules: [{
 *     from: new CalendarDate(2025, 6, 1),
 *     to: new CalendarDate(2025, 8, 31),
 *     enabledDaysOfWeek: [1, 2, 3, 4, 5], // weekdays only in summer
 *   }],
 * })
 * ```
 */
export function createDateConstraint(
  options: DateConstraintOptions,
): (date: CalendarDate) => boolean {
  const { minDate, maxDate, rules } = options

  // Precompute global sets
  const globalSets = precomputeSets(options)

  // Precompute rule sets
  const precomputedRules: PrecomputedRule[] | undefined = rules?.map((rule) => ({
    from: rule.from,
    to: rule.to,
    minDate: rule.minDate,
    maxDate: rule.maxDate,
    minRange: rule.minRange,
    maxRange: rule.maxRange,
    sets: precomputeSets(rule),
    hasMinDate: rule.minDate !== undefined,
    hasMaxDate: rule.maxDate !== undefined,
  }))

  // Fast path: no rules
  if (!precomputedRules || precomputedRules.length === 0) {
    return (date: CalendarDate): boolean => checkDisabled(date, minDate, maxDate, globalSets)
  }

  // With rules: find the first matching rule, merge, and check
  return (date: CalendarDate): boolean => {
    const rule = precomputedRules.find((r) => date.isBetween(r.from, r.to))

    if (!rule) {
      return checkDisabled(date, minDate, maxDate, globalSets)
    }

    // Rule overrides global where explicitly set
    const effectiveMinDate = rule.hasMinDate ? rule.minDate : minDate
    const effectiveMaxDate = rule.hasMaxDate ? rule.maxDate : maxDate

    const mergedSets: PrecomputedSets = {
      disabledKeys:
        rule.sets.disabledKeys !== undefined ? rule.sets.disabledKeys : globalSets.disabledKeys,
      disabledDays:
        rule.sets.disabledDays !== undefined ? rule.sets.disabledDays : globalSets.disabledDays,
      enabledKeys:
        rule.sets.enabledKeys !== undefined ? rule.sets.enabledKeys : globalSets.enabledKeys,
      enabledDays:
        rule.sets.enabledDays !== undefined ? rule.sets.enabledDays : globalSets.enabledDays,
    }

    return checkDisabled(date, effectiveMinDate, effectiveMaxDate, mergedSets)
  }
}

// ---------------------------------------------------------------------------
// createRangeValidator
// ---------------------------------------------------------------------------

/**
 * Create a range validation function.
 *
 * Returns a function that checks whether a range [start, end] satisfies
 * the minRange/maxRange constraints. Rule matching is based on the
 * start date — the rule that contains the start date determines the
 * applicable range limits.
 *
 * Range length is counted inclusively: a range from Jan 1 to Jan 3 is
 * 3 days long.
 *
 * @example
 * ```ts
 * const isValid = createRangeValidator({
 *   minRange: 3,
 *   maxRange: 14,
 *   rules: [{
 *     from: new CalendarDate(2025, 5, 1),
 *     to: new CalendarDate(2025, 10, 31),
 *     minRange: 5, // stricter minimum in summer
 *   }],
 * })
 *
 * isValid(new CalendarDate(2025, 3, 1), new CalendarDate(2025, 3, 3)) // true (3 >= 3)
 * isValid(new CalendarDate(2025, 6, 1), new CalendarDate(2025, 6, 3)) // false (3 < 5)
 * ```
 */
export function createRangeValidator(
  options: DateConstraintOptions,
): (start: CalendarDate, end: CalendarDate) => boolean {
  const { minRange, maxRange, rules } = options

  // No range constraints at all → always valid
  if (
    minRange === undefined &&
    maxRange === undefined &&
    (!rules || rules.every((r) => r.minRange === undefined && r.maxRange === undefined))
  ) {
    return () => true
  }

  // Precompute rules for range validation
  const rangeRules = rules
    ?.filter((r) => r.minRange !== undefined || r.maxRange !== undefined || true)
    .map((rule) => ({
      from: rule.from,
      to: rule.to,
      minRange: rule.minRange,
      maxRange: rule.maxRange,
    }))

  return (start: CalendarDate, end: CalendarDate): boolean => {
    // Find rule based on start date
    let effectiveMinRange = minRange
    let effectiveMaxRange = maxRange

    if (rangeRules) {
      const rule = rangeRules.find((r) => start.isBetween(r.from, r.to))
      if (rule) {
        if (rule.minRange !== undefined) effectiveMinRange = rule.minRange
        if (rule.maxRange !== undefined) effectiveMaxRange = rule.maxRange
      }
    }

    // Inclusive day count
    const length = start.diffDays(end) + 1

    if (effectiveMinRange !== undefined && length < effectiveMinRange) return false
    if (effectiveMaxRange !== undefined && length > effectiveMaxRange) return false

    return true
  }
}

// ---------------------------------------------------------------------------
// Convenience
// ---------------------------------------------------------------------------

/**
 * Standalone check: is a date disabled by the given constraints?
 *
 * Convenience wrapper around `createDateConstraint` for one-off checks.
 */
export function isDateDisabled(date: CalendarDate, options: DateConstraintOptions): boolean {
  return createDateConstraint(options)(date)
}
