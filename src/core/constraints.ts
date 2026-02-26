import { CalendarDate } from './calendar-date'

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
  /** Specific months to disable (1 = January, …, 12 = December). */
  disabledMonths?: number[]
  /** Months to enable (whitelist — all other months are disabled). */
  enabledMonths?: number[]
  /** Specific years to disable. */
  disabledYears?: number[]
  /** Years to enable (whitelist — all other years are disabled). */
  enabledYears?: number[]
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
 *
 * Rules can match by date range (`from`/`to`) or by recurring months
 * (`months`). If `months` is set, the rule applies to those months
 * every year without needing explicit date ranges.
 */
export interface DateConstraintRule extends DateConstraintProperties {
  /** Start of the period this rule applies to (inclusive). */
  from?: CalendarDate
  /** End of the period this rule applies to (inclusive). */
  to?: CalendarDate
  /** Recurring months this rule applies to (1=Jan, …, 12=Dec). Matches every year. */
  months?: number[]
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
  disabledMonths: Set<number> | undefined
  enabledMonths: Set<number> | undefined
  disabledYears: Set<number> | undefined
  enabledYears: Set<number> | undefined
}

interface PrecomputedRule {
  from: CalendarDate | undefined
  to: CalendarDate | undefined
  recurringMonths: Set<number> | undefined
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
    disabledMonths: opts.disabledMonths ? new Set(opts.disabledMonths) : undefined,
    enabledMonths: opts.enabledMonths ? new Set(opts.enabledMonths) : undefined,
    disabledYears: opts.disabledYears ? new Set(opts.disabledYears) : undefined,
    enabledYears: opts.enabledYears ? new Set(opts.enabledYears) : undefined,
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

  // 2. enabledDates force-enables specific dates (bypass all other checks)
  if (sets.enabledKeys && sets.enabledKeys.has(date.toKey())) return false

  // 3. Year-level constraints
  if (sets.enabledYears && !sets.enabledYears.has(date.year)) return true
  if (sets.disabledYears && sets.disabledYears.has(date.year)) return true

  // 4. Month-level constraints
  if (sets.enabledMonths && !sets.enabledMonths.has(date.month)) return true
  if (sets.disabledMonths && sets.disabledMonths.has(date.month)) return true

  // Compute day-of-week once if needed
  const needsDow = sets.enabledDays !== undefined || sets.disabledDays !== undefined
  const dow = needsDow ? date.toNativeDate().getDay() : -1

  // 5. enabledDaysOfWeek whitelist — if set, only these days are allowed
  if (sets.enabledDays && !sets.enabledDays.has(dow)) return true

  // 6. disabledDates blacklist
  if (sets.disabledKeys && sets.disabledKeys.has(date.toKey())) return true

  // 7. disabledDaysOfWeek blacklist
  if (sets.disabledDays && sets.disabledDays.has(dow)) return true

  return false
}

// ---------------------------------------------------------------------------
// Rule matching
// ---------------------------------------------------------------------------

/** Check if a date matches a precomputed rule (date-range or recurring months). */
function matchesRule(rule: PrecomputedRule, date: CalendarDate): boolean {
  // Date-range rule: from/to both set
  if (rule.from && rule.to) {
    return date.isBetween(rule.from, rule.to)
  }
  // Recurring months rule
  if (rule.recurringMonths) {
    return rule.recurringMonths.has(date.month)
  }
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
    recurringMonths: rule.months ? new Set(rule.months) : undefined,
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
    const rule = precomputedRules.find((r) => matchesRule(r, date))

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
      disabledMonths:
        rule.sets.disabledMonths !== undefined
          ? rule.sets.disabledMonths
          : globalSets.disabledMonths,
      enabledMonths:
        rule.sets.enabledMonths !== undefined ? rule.sets.enabledMonths : globalSets.enabledMonths,
      disabledYears:
        rule.sets.disabledYears !== undefined ? rule.sets.disabledYears : globalSets.disabledYears,
      enabledYears:
        rule.sets.enabledYears !== undefined ? rule.sets.enabledYears : globalSets.enabledYears,
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
      recurringMonths: rule.months ? new Set(rule.months) : undefined,
      minRange: rule.minRange,
      maxRange: rule.maxRange,
    }))

  return (start: CalendarDate, end: CalendarDate): boolean => {
    // Find rule based on start date
    let effectiveMinRange = minRange
    let effectiveMaxRange = maxRange

    if (rangeRules) {
      const rule = rangeRules.find((r) => {
        if (r.from && r.to) return start.isBetween(r.from, r.to)
        if (r.recurringMonths) return r.recurringMonths.has(start.month)
        return false
      })
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
// createMonthConstraint
// ---------------------------------------------------------------------------

/**
 * Create a single `isMonthDisabled` function from constraint options.
 *
 * A month is disabled when:
 * 1. The entire month falls outside [minDate, maxDate].
 * 2. The year is disabled (via disabledYears or not in enabledYears).
 * 3. The month number is disabled (via disabledMonths or not in enabledMonths).
 *
 * @example
 * ```ts
 * const isDisabled = createMonthConstraint({
 *   minDate: new CalendarDate(2025, 3, 1),
 *   disabledMonths: [1, 2], // no January or February
 * })
 * isDisabled(2025, 1)  // true (January disabled)
 * isDisabled(2025, 6)  // false
 * ```
 */
export function createMonthConstraint(
  options: DateConstraintOptions,
): (year: number, month: number) => boolean {
  const { minDate, maxDate } = options

  const disabledMonthSet = options.disabledMonths ? new Set(options.disabledMonths) : undefined
  const enabledMonthSet = options.enabledMonths ? new Set(options.enabledMonths) : undefined
  const disabledYearSet = options.disabledYears ? new Set(options.disabledYears) : undefined
  const enabledYearSet = options.enabledYears ? new Set(options.enabledYears) : undefined

  return (year: number, month: number): boolean => {
    // 1. Boundary: entire month outside [minDate, maxDate]
    if (minDate) {
      const endOfMonth = new CalendarDate(year, month, 1).endOfMonth()
      if (endOfMonth.isBefore(minDate)) return true
    }
    if (maxDate) {
      const startOfMonth = new CalendarDate(year, month, 1)
      if (startOfMonth.isAfter(maxDate)) return true
    }

    // 2. Year constraints cascade to months
    if (enabledYearSet && !enabledYearSet.has(year)) return true
    if (disabledYearSet && disabledYearSet.has(year)) return true

    // 3. Month constraints
    if (enabledMonthSet && !enabledMonthSet.has(month)) return true
    if (disabledMonthSet && disabledMonthSet.has(month)) return true

    return false
  }
}

// ---------------------------------------------------------------------------
// createYearConstraint
// ---------------------------------------------------------------------------

/**
 * Create a single `isYearDisabled` function from constraint options.
 *
 * A year is disabled when:
 * 1. The entire year falls outside [minDate, maxDate].
 * 2. The year is in disabledYears or not in enabledYears.
 *
 * @example
 * ```ts
 * const isDisabled = createYearConstraint({
 *   disabledYears: [2020, 2021],
 * })
 * isDisabled(2020)  // true
 * isDisabled(2025)  // false
 * ```
 */
export function createYearConstraint(
  options: DateConstraintOptions,
): (year: number) => boolean {
  const { minDate, maxDate } = options

  const disabledYearSet = options.disabledYears ? new Set(options.disabledYears) : undefined
  const enabledYearSet = options.enabledYears ? new Set(options.enabledYears) : undefined

  return (year: number): boolean => {
    // 1. Boundary: entire year outside [minDate, maxDate]
    if (minDate) {
      const endOfYear = new CalendarDate(year, 12, 31)
      if (endOfYear.isBefore(minDate)) return true
    }
    if (maxDate) {
      const startOfYear = new CalendarDate(year, 1, 1)
      if (startOfYear.isAfter(maxDate)) return true
    }

    // 2. Year constraints
    if (enabledYearSet && !enabledYearSet.has(year)) return true
    if (disabledYearSet && disabledYearSet.has(year)) return true

    return false
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

// ---------------------------------------------------------------------------
// Constraint messages (configurable tooltip text)
// ---------------------------------------------------------------------------

/**
 * Custom messages for each constraint reason. All properties are optional —
 * defaults are used for any omitted keys.
 */
export interface ConstraintMessages {
  beforeMinDate?: string
  afterMaxDate?: string
  disabledDate?: string
  disabledDayOfWeek?: string
  disabledMonth?: string
  disabledYear?: string
  notEnabledDate?: string
  notEnabledDayOfWeek?: string
  notEnabledMonth?: string
  notEnabledYear?: string
}

const DEFAULT_MESSAGES: Required<ConstraintMessages> = {
  beforeMinDate: 'Before the earliest available date',
  afterMaxDate: 'After the latest available date',
  disabledDate: 'This date is not available',
  disabledDayOfWeek: 'This day of the week is not available',
  disabledMonth: 'This month is not available',
  disabledYear: 'This year is not available',
  notEnabledDate: 'This date is not available',
  notEnabledDayOfWeek: 'This day of the week is not available',
  notEnabledMonth: 'This month is not available',
  notEnabledYear: 'This year is not available',
}

// ---------------------------------------------------------------------------
// createDisabledReasons
// ---------------------------------------------------------------------------

function collectReasons(
  date: CalendarDate,
  minDate: CalendarDate | undefined,
  maxDate: CalendarDate | undefined,
  sets: PrecomputedSets,
  msgs: Required<ConstraintMessages>,
): string[] {
  const reasons: string[] = []

  // 1. Boundary check
  if (minDate && date.isBefore(minDate)) {
    reasons.push(msgs.beforeMinDate)
    return reasons // absolute — no further checks
  }
  if (maxDate && date.isAfter(maxDate)) {
    reasons.push(msgs.afterMaxDate)
    return reasons // absolute — no further checks
  }

  // 2. enabledDates force-enables (bypass)
  if (sets.enabledKeys && sets.enabledKeys.has(date.toKey())) return reasons

  // 3. Year-level
  if (sets.enabledYears && !sets.enabledYears.has(date.year)) {
    reasons.push(msgs.notEnabledYear)
    return reasons
  }
  if (sets.disabledYears && sets.disabledYears.has(date.year)) {
    reasons.push(msgs.disabledYear)
    return reasons
  }

  // 4. Month-level
  if (sets.enabledMonths && !sets.enabledMonths.has(date.month)) {
    reasons.push(msgs.notEnabledMonth)
    return reasons
  }
  if (sets.disabledMonths && sets.disabledMonths.has(date.month)) {
    reasons.push(msgs.disabledMonth)
    return reasons
  }

  // 5. Day-of-week
  const needsDow = sets.enabledDays !== undefined || sets.disabledDays !== undefined
  const dow = needsDow ? date.toNativeDate().getDay() : -1

  if (sets.enabledDays && !sets.enabledDays.has(dow)) {
    reasons.push(msgs.notEnabledDayOfWeek)
  }

  // 6. Specific dates
  if (sets.disabledKeys && sets.disabledKeys.has(date.toKey())) {
    reasons.push(msgs.disabledDate)
  }

  // 7. Day-of-week blacklist
  if (sets.disabledDays && sets.disabledDays.has(dow)) {
    reasons.push(msgs.disabledDayOfWeek)
  }

  return reasons
}

/**
 * Create a function that returns human-readable reasons why a date is
 * disabled. Returns an empty array for enabled dates.
 *
 * Uses the same logic as `createDateConstraint` (including period-specific
 * rules) but produces descriptive messages instead of a boolean.
 *
 * @example
 * ```ts
 * const getReasons = createDisabledReasons({
 *   minDate: new CalendarDate(2025, 3, 1),
 *   disabledDaysOfWeek: [0, 6],
 * })
 * getReasons(new CalendarDate(2025, 2, 28))
 * // → ['Before the earliest available date']
 * getReasons(new CalendarDate(2025, 3, 1))
 * // → [] (enabled)
 * getReasons(new CalendarDate(2025, 3, 2))
 * // → ['This day of the week is not available'] (Sunday)
 * ```
 */
export function createDisabledReasons(
  options: DateConstraintOptions,
  messages?: ConstraintMessages,
): (date: CalendarDate) => string[] {
  const { minDate, maxDate, rules } = options
  const msgs = { ...DEFAULT_MESSAGES, ...messages }

  // Precompute global sets
  const globalSets = precomputeSets(options)

  // Precompute rule sets
  const precomputedRules: PrecomputedRule[] | undefined = rules?.map((rule) => ({
    from: rule.from,
    to: rule.to,
    recurringMonths: rule.months ? new Set(rule.months) : undefined,
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
    return (date: CalendarDate) => collectReasons(date, minDate, maxDate, globalSets, msgs)
  }

  // With rules
  return (date: CalendarDate): string[] => {
    const rule = precomputedRules.find((r) => matchesRule(r, date))

    if (!rule) {
      return collectReasons(date, minDate, maxDate, globalSets, msgs)
    }

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
      disabledMonths:
        rule.sets.disabledMonths !== undefined
          ? rule.sets.disabledMonths
          : globalSets.disabledMonths,
      enabledMonths:
        rule.sets.enabledMonths !== undefined ? rule.sets.enabledMonths : globalSets.enabledMonths,
      disabledYears:
        rule.sets.disabledYears !== undefined ? rule.sets.disabledYears : globalSets.disabledYears,
      enabledYears:
        rule.sets.enabledYears !== undefined ? rule.sets.enabledYears : globalSets.enabledYears,
    }

    return collectReasons(date, effectiveMinDate, effectiveMaxDate, mergedSets, msgs)
  }
}
