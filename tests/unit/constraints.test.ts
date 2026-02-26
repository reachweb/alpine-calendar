import { describe, it, expect } from 'vitest'
import { CalendarDate } from '../../src/core/calendar-date'
import {
  createDateConstraint,
  createMonthConstraint,
  createYearConstraint,
  createRangeValidator,
  isDateDisabled,
} from '../../src/core/constraints'

// ---------------------------------------------------------------------------
// createDateConstraint — original constraints (backward compatibility)
// ---------------------------------------------------------------------------

describe('createDateConstraint', () => {
  describe('no constraints', () => {
    it('returns false for any date when no options are set', () => {
      const check = createDateConstraint({})
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
      expect(check(new CalendarDate(2000, 1, 1))).toBe(false)
      expect(check(new CalendarDate(2099, 12, 31))).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // minDate
  // ---------------------------------------------------------------------------

  describe('minDate', () => {
    it('disables dates before minDate', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 10),
      })
      expect(check(new CalendarDate(2025, 6, 9))).toBe(true)
      expect(check(new CalendarDate(2025, 5, 31))).toBe(true)
      expect(check(new CalendarDate(2024, 12, 31))).toBe(true)
    })

    it('allows minDate itself (inclusive)', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 10),
      })
      expect(check(new CalendarDate(2025, 6, 10))).toBe(false)
    })

    it('allows dates after minDate', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 10),
      })
      expect(check(new CalendarDate(2025, 6, 11))).toBe(false)
      expect(check(new CalendarDate(2025, 7, 1))).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // maxDate
  // ---------------------------------------------------------------------------

  describe('maxDate', () => {
    it('disables dates after maxDate', () => {
      const check = createDateConstraint({
        maxDate: new CalendarDate(2025, 6, 20),
      })
      expect(check(new CalendarDate(2025, 6, 21))).toBe(true)
      expect(check(new CalendarDate(2025, 7, 1))).toBe(true)
      expect(check(new CalendarDate(2026, 1, 1))).toBe(true)
    })

    it('allows maxDate itself (inclusive)', () => {
      const check = createDateConstraint({
        maxDate: new CalendarDate(2025, 6, 20),
      })
      expect(check(new CalendarDate(2025, 6, 20))).toBe(false)
    })

    it('allows dates before maxDate', () => {
      const check = createDateConstraint({
        maxDate: new CalendarDate(2025, 6, 20),
      })
      expect(check(new CalendarDate(2025, 6, 19))).toBe(false)
      expect(check(new CalendarDate(2025, 1, 1))).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // minDate + maxDate combined
  // ---------------------------------------------------------------------------

  describe('minDate + maxDate combined', () => {
    it('allows dates within the range', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 10),
        maxDate: new CalendarDate(2025, 6, 20),
      })
      expect(check(new CalendarDate(2025, 6, 10))).toBe(false)
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
      expect(check(new CalendarDate(2025, 6, 20))).toBe(false)
    })

    it('disables dates outside the range', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 10),
        maxDate: new CalendarDate(2025, 6, 20),
      })
      expect(check(new CalendarDate(2025, 6, 9))).toBe(true)
      expect(check(new CalendarDate(2025, 6, 21))).toBe(true)
    })

    it('handles single-day range (minDate === maxDate)', () => {
      const date = new CalendarDate(2025, 6, 15)
      const check = createDateConstraint({ minDate: date, maxDate: date })
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true)
      expect(check(new CalendarDate(2025, 6, 16))).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // disabledDates
  // ---------------------------------------------------------------------------

  describe('disabledDates', () => {
    it('disables specific dates', () => {
      const check = createDateConstraint({
        disabledDates: [
          new CalendarDate(2025, 6, 15),
          new CalendarDate(2025, 6, 20),
          new CalendarDate(2025, 12, 25),
        ],
      })
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true)
      expect(check(new CalendarDate(2025, 6, 20))).toBe(true)
      expect(check(new CalendarDate(2025, 12, 25))).toBe(true)
    })

    it('allows dates not in the disabled list', () => {
      const check = createDateConstraint({
        disabledDates: [new CalendarDate(2025, 6, 15)],
      })
      expect(check(new CalendarDate(2025, 6, 14))).toBe(false)
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false)
    })

    it('handles empty disabled dates array', () => {
      const check = createDateConstraint({ disabledDates: [] })
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
    })

    it('handles duplicate disabled dates', () => {
      const check = createDateConstraint({
        disabledDates: [new CalendarDate(2025, 6, 15), new CalendarDate(2025, 6, 15)],
      })
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // disabledDaysOfWeek
  // ---------------------------------------------------------------------------

  describe('disabledDaysOfWeek', () => {
    it('disables weekends (Saturday=6, Sunday=0)', () => {
      const check = createDateConstraint({
        disabledDaysOfWeek: [0, 6],
      })
      // 2025-06-14 is Saturday, 2025-06-15 is Sunday
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true) // Saturday
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true) // Sunday
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false) // Monday
      expect(check(new CalendarDate(2025, 6, 17))).toBe(false) // Tuesday
    })

    it('disables specific weekdays', () => {
      const check = createDateConstraint({
        disabledDaysOfWeek: [3], // Wednesday
      })
      // 2025-06-18 is Wednesday
      expect(check(new CalendarDate(2025, 6, 18))).toBe(true)
      expect(check(new CalendarDate(2025, 6, 17))).toBe(false) // Tuesday
      expect(check(new CalendarDate(2025, 6, 19))).toBe(false) // Thursday
    })

    it('handles empty array (no days disabled)', () => {
      const check = createDateConstraint({ disabledDaysOfWeek: [] })
      expect(check(new CalendarDate(2025, 6, 14))).toBe(false) // Saturday
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false) // Monday
    })

    it('can disable all days of the week', () => {
      const check = createDateConstraint({
        disabledDaysOfWeek: [0, 1, 2, 3, 4, 5, 6],
      })
      // Every day of a week: Mon-Sun
      for (let d = 16; d <= 22; d++) {
        expect(check(new CalendarDate(2025, 6, d))).toBe(true)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // enabledDates (new — force-enable whitelist)
  // ---------------------------------------------------------------------------

  describe('enabledDates', () => {
    it('force-enables specific dates that would be disabled by disabledDaysOfWeek', () => {
      const check = createDateConstraint({
        disabledDaysOfWeek: [0, 6], // disable weekends
        enabledDates: [new CalendarDate(2025, 6, 14)], // force-enable Saturday June 14
      })
      expect(check(new CalendarDate(2025, 6, 14))).toBe(false) // Saturday — force-enabled
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true) // Sunday — still disabled
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false) // Monday — allowed
    })

    it('force-enables specific dates that would be disabled by disabledDates', () => {
      const check = createDateConstraint({
        disabledDates: [new CalendarDate(2025, 6, 15), new CalendarDate(2025, 6, 16)],
        enabledDates: [new CalendarDate(2025, 6, 15)], // override one disabled date
      })
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false) // force-enabled
      expect(check(new CalendarDate(2025, 6, 16))).toBe(true) // still disabled
    })

    it('does NOT override minDate/maxDate boundaries', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 10),
        enabledDates: [new CalendarDate(2025, 6, 5)], // before minDate
      })
      // minDate is absolute — enabledDates cannot override it
      expect(check(new CalendarDate(2025, 6, 5))).toBe(true)
    })

    it('handles empty array (no force-enabled dates)', () => {
      const check = createDateConstraint({
        disabledDaysOfWeek: [0, 6],
        enabledDates: [],
      })
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true) // Saturday — still disabled
    })
  })

  // ---------------------------------------------------------------------------
  // enabledDaysOfWeek (new — weekday whitelist)
  // ---------------------------------------------------------------------------

  describe('enabledDaysOfWeek', () => {
    it('only allows specified weekdays', () => {
      const check = createDateConstraint({
        enabledDaysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri only
      })
      // 2025-06-14 is Saturday, 2025-06-15 is Sunday
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true) // Saturday — not in whitelist
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true) // Sunday — not in whitelist
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false) // Monday — whitelisted
      expect(check(new CalendarDate(2025, 6, 17))).toBe(false) // Tuesday — whitelisted
    })

    it('can whitelist only weekends', () => {
      const check = createDateConstraint({
        enabledDaysOfWeek: [0, 6], // Sat-Sun only
      })
      expect(check(new CalendarDate(2025, 6, 14))).toBe(false) // Saturday
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false) // Sunday
      expect(check(new CalendarDate(2025, 6, 16))).toBe(true) // Monday — disabled
    })

    it('empty array disables all days', () => {
      const check = createDateConstraint({
        enabledDaysOfWeek: [],
      })
      for (let d = 16; d <= 22; d++) {
        expect(check(new CalendarDate(2025, 6, d))).toBe(true)
      }
    })

    it('enabledDates can override enabledDaysOfWeek', () => {
      const check = createDateConstraint({
        enabledDaysOfWeek: [1, 2, 3, 4, 5], // weekdays only
        enabledDates: [new CalendarDate(2025, 6, 14)], // force-enable Saturday
      })
      expect(check(new CalendarDate(2025, 6, 14))).toBe(false) // Saturday — force-enabled
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true) // Sunday — still blocked
    })

    it('disabledDates still applies on whitelisted days', () => {
      const check = createDateConstraint({
        enabledDaysOfWeek: [1, 2, 3, 4, 5], // weekdays
        disabledDates: [new CalendarDate(2025, 6, 16)], // disable a specific Monday
      })
      expect(check(new CalendarDate(2025, 6, 16))).toBe(true) // Monday — explicitly disabled
      expect(check(new CalendarDate(2025, 6, 17))).toBe(false) // Tuesday — allowed
    })
  })

  // ---------------------------------------------------------------------------
  // Combined constraints
  // ---------------------------------------------------------------------------

  describe('combined constraints', () => {
    it('applies minDate AND disabledDaysOfWeek', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 10),
        disabledDaysOfWeek: [0, 6], // no weekends
      })
      // 2025-06-09 is Monday but before minDate → disabled
      expect(check(new CalendarDate(2025, 6, 9))).toBe(true)
      // 2025-06-10 is Tuesday, on/after minDate → allowed
      expect(check(new CalendarDate(2025, 6, 10))).toBe(false)
      // 2025-06-14 is Saturday, after minDate but weekend → disabled
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true)
      // 2025-06-16 is Monday, after minDate and weekday → allowed
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false)
    })

    it('applies maxDate AND disabledDates', () => {
      const check = createDateConstraint({
        maxDate: new CalendarDate(2025, 6, 30),
        disabledDates: [new CalendarDate(2025, 6, 15)],
      })
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true) // specific disabled
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false) // allowed
      expect(check(new CalendarDate(2025, 7, 1))).toBe(true) // after maxDate
    })

    it('applies all four original constraints together', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 1),
        maxDate: new CalendarDate(2025, 6, 30),
        disabledDates: [new CalendarDate(2025, 6, 15)],
        disabledDaysOfWeek: [0, 6],
      })
      // Before range
      expect(check(new CalendarDate(2025, 5, 31))).toBe(true)
      // After range
      expect(check(new CalendarDate(2025, 7, 1))).toBe(true)
      // Specific disabled date
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true) // Sunday anyway
      // Weekend in range
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true) // Saturday
      // Weekday in range, not specifically disabled
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false) // Monday
      expect(check(new CalendarDate(2025, 6, 2))).toBe(false) // Monday
    })

    it('combines enabledDaysOfWeek + enabledDates + disabledDates', () => {
      const check = createDateConstraint({
        enabledDaysOfWeek: [1, 3, 5], // Mon, Wed, Fri
        enabledDates: [new CalendarDate(2025, 6, 14)], // force-enable Saturday
        disabledDates: [new CalendarDate(2025, 6, 18)], // disable a Wednesday
      })
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false) // Monday — whitelisted
      expect(check(new CalendarDate(2025, 6, 17))).toBe(true) // Tuesday — not in whitelist
      expect(check(new CalendarDate(2025, 6, 18))).toBe(true) // Wednesday — explicitly disabled
      expect(check(new CalendarDate(2025, 6, 14))).toBe(false) // Saturday — force-enabled
    })
  })

  // ---------------------------------------------------------------------------
  // Integration with grid generator
  // ---------------------------------------------------------------------------

  describe('integration with generateMonth', () => {
    it('can be used as the isDisabled callback', () => {
      // Just verifying the function signature is compatible
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 6, 5),
        maxDate: new CalendarDate(2025, 6, 25),
      })
      // The function accepts CalendarDate and returns boolean
      const result = check(new CalendarDate(2025, 6, 15))
      expect(typeof result).toBe('boolean')
    })
  })
})

// ---------------------------------------------------------------------------
// Period-specific rules
// ---------------------------------------------------------------------------

describe('createDateConstraint — rules', () => {
  describe('basic rule matching', () => {
    it('applies rule constraints for dates within the rule period', () => {
      const check = createDateConstraint({
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            disabledDaysOfWeek: [0, 6], // disable weekends in June only
          },
        ],
      })
      // June Saturday — rule applies, weekends disabled
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true)
      // June Monday — rule applies, weekdays allowed
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false)
      // July Saturday — no rule, no global constraints → allowed
      expect(check(new CalendarDate(2025, 7, 12))).toBe(false)
    })

    it('falls back to global constraints for dates outside any rule', () => {
      const check = createDateConstraint({
        disabledDaysOfWeek: [0], // globally disable Sundays
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            disabledDaysOfWeek: [6], // in June, disable Saturdays instead
          },
        ],
      })
      // June Sunday — rule overrides, Sundays are NOT disabled in June (rule says [6])
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
      // June Saturday — rule says [6], so Saturday is disabled
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true)
      // July Sunday — no rule, global [0] applies
      expect(check(new CalendarDate(2025, 7, 13))).toBe(true)
      // July Saturday — no rule, global [0] doesn't include 6 → allowed
      expect(check(new CalendarDate(2025, 7, 12))).toBe(false)
    })

    it('first matching rule wins when periods overlap', () => {
      const check = createDateConstraint({
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 15),
            disabledDaysOfWeek: [0, 6],
          },
          {
            from: new CalendarDate(2025, 6, 10),
            to: new CalendarDate(2025, 6, 30),
            disabledDaysOfWeek: [3], // Wednesday
          },
        ],
      })
      // June 14 (Saturday) — matches first rule → disabled (weekends)
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true)
      // June 14 is in overlap zone — first rule wins
    })
  })

  describe('rule with minDate/maxDate override', () => {
    it('rule can set its own minDate that overrides global', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 1, 1),
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 8, 31),
            minDate: new CalendarDate(2025, 6, 15), // stricter min for summer
          },
        ],
      })
      // June 10 — in rule period, rule minDate is Jun 15 → disabled
      expect(check(new CalendarDate(2025, 6, 10))).toBe(true)
      // June 15 — in rule period, at rule minDate → allowed
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
      // March 1 — outside rule, global minDate Jan 1 → allowed
      expect(check(new CalendarDate(2025, 3, 1))).toBe(false)
    })

    it('rule with undefined minDate inherits global minDate', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 3, 1),
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 8, 31),
            // No minDate override — inherits global
            disabledDaysOfWeek: [0, 6],
          },
        ],
      })
      // Feb 28 — outside rule, global minDate Mar 1 → disabled
      expect(check(new CalendarDate(2025, 2, 28))).toBe(true)
      // June 14 — in rule, inherits global minDate (passes), but Saturday → disabled
      expect(check(new CalendarDate(2025, 6, 14))).toBe(true)
      // June 16 — in rule, inherits global minDate (passes), Monday → allowed
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false)
    })
  })

  describe('rule with enabledDates/enabledDaysOfWeek', () => {
    it('rule can set enabledDaysOfWeek for its period', () => {
      const check = createDateConstraint({
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            enabledDaysOfWeek: [1, 3, 5], // Mon, Wed, Fri only in June
          },
        ],
      })
      expect(check(new CalendarDate(2025, 6, 16))).toBe(false) // Monday — enabled
      expect(check(new CalendarDate(2025, 6, 17))).toBe(true) // Tuesday — not in whitelist
      expect(check(new CalendarDate(2025, 6, 18))).toBe(false) // Wednesday — enabled
      // July (no rule) — everything allowed
      expect(check(new CalendarDate(2025, 7, 1))).toBe(false) // Tuesday
    })

    it('rule can set enabledDates to force-enable within its period', () => {
      const check = createDateConstraint({
        disabledDaysOfWeek: [0, 6], // global: disable weekends
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            enabledDates: [new CalendarDate(2025, 6, 14)], // force-enable one Saturday
          },
        ],
      })
      // June 14 (Saturday) — rule force-enables
      expect(check(new CalendarDate(2025, 6, 14))).toBe(false)
      // June 15 (Sunday) — rule inherits global disabled weekends
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true)
    })
  })

  describe('rule with disabledDates override', () => {
    it('rule replaces global disabledDates for its period', () => {
      const check = createDateConstraint({
        disabledDates: [new CalendarDate(2025, 6, 15), new CalendarDate(2025, 7, 4)],
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            disabledDates: [new CalendarDate(2025, 6, 20)], // different disabled date in June
          },
        ],
      })
      // June 15 — in rule, rule's disabledDates doesn't include it → allowed
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
      // June 20 — in rule, rule's disabledDates includes it → disabled
      expect(check(new CalendarDate(2025, 6, 20))).toBe(true)
      // July 4 — no rule, global disabledDates applies → disabled
      expect(check(new CalendarDate(2025, 7, 4))).toBe(true)
    })
  })

  describe('multiple rules for different periods', () => {
    it('applies different constraints per period', () => {
      const check = createDateConstraint({
        rules: [
          {
            from: new CalendarDate(2025, 1, 1),
            to: new CalendarDate(2025, 4, 30),
            disabledDaysOfWeek: [0, 6], // no weekends Jan-Apr
          },
          {
            from: new CalendarDate(2025, 5, 1),
            to: new CalendarDate(2025, 10, 31),
            disabledDaysOfWeek: [0], // only no Sundays May-Oct
          },
        ],
      })
      // March Saturday — first rule → disabled
      expect(check(new CalendarDate(2025, 3, 15))).toBe(true)
      // June Saturday — second rule, [0] doesn't include 6 → allowed
      expect(check(new CalendarDate(2025, 6, 14))).toBe(false)
      // June Sunday — second rule, [0] includes 0 → disabled
      expect(check(new CalendarDate(2025, 6, 15))).toBe(true)
      // December Saturday — no rule → allowed
      expect(check(new CalendarDate(2025, 12, 13))).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// createRangeValidator
// ---------------------------------------------------------------------------

describe('createRangeValidator', () => {
  describe('no range constraints', () => {
    it('returns true for any range when no min/max is set', () => {
      const validate = createRangeValidator({})
      expect(
        validate(new CalendarDate(2025, 6, 1), new CalendarDate(2025, 6, 1)),
      ).toBe(true)
      expect(
        validate(new CalendarDate(2025, 1, 1), new CalendarDate(2025, 12, 31)),
      ).toBe(true)
    })
  })

  describe('global minRange', () => {
    it('rejects ranges shorter than minRange', () => {
      const validate = createRangeValidator({ minRange: 3 })
      // 1 day range (Jun 10 to Jun 10)
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 10)),
      ).toBe(false)
      // 2 day range
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 11)),
      ).toBe(false)
    })

    it('allows ranges equal to minRange', () => {
      const validate = createRangeValidator({ minRange: 3 })
      // 3 day range (Jun 10, 11, 12)
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 12)),
      ).toBe(true)
    })

    it('allows ranges longer than minRange', () => {
      const validate = createRangeValidator({ minRange: 3 })
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20)),
      ).toBe(true)
    })
  })

  describe('global maxRange', () => {
    it('rejects ranges longer than maxRange', () => {
      const validate = createRangeValidator({ maxRange: 7 })
      // 8 day range
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 17)),
      ).toBe(false)
    })

    it('allows ranges equal to maxRange', () => {
      const validate = createRangeValidator({ maxRange: 7 })
      // 7 day range
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 16)),
      ).toBe(true)
    })

    it('allows ranges shorter than maxRange', () => {
      const validate = createRangeValidator({ maxRange: 7 })
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 12)),
      ).toBe(true)
    })
  })

  describe('global minRange + maxRange', () => {
    it('allows ranges within bounds', () => {
      const validate = createRangeValidator({ minRange: 3, maxRange: 7 })
      // 3 days — at min
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 12)),
      ).toBe(true)
      // 5 days — in between
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 14)),
      ).toBe(true)
      // 7 days — at max
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 16)),
      ).toBe(true)
    })

    it('rejects ranges outside bounds', () => {
      const validate = createRangeValidator({ minRange: 3, maxRange: 7 })
      // 2 days — too short
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 11)),
      ).toBe(false)
      // 8 days — too long
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 17)),
      ).toBe(false)
    })
  })

  describe('period-specific range rules', () => {
    it('applies different minRange per period based on start date', () => {
      const validate = createRangeValidator({
        minRange: 3,
        rules: [
          {
            from: new CalendarDate(2025, 1, 1),
            to: new CalendarDate(2025, 4, 30),
            minRange: 3,
          },
          {
            from: new CalendarDate(2025, 5, 1),
            to: new CalendarDate(2025, 10, 31),
            minRange: 5,
          },
        ],
      })

      // Start in Feb (rule 1: minRange 3)
      expect(
        validate(new CalendarDate(2025, 2, 1), new CalendarDate(2025, 2, 3)),
      ).toBe(true) // 3 days >= 3
      expect(
        validate(new CalendarDate(2025, 2, 1), new CalendarDate(2025, 2, 2)),
      ).toBe(false) // 2 days < 3

      // Start in Jun (rule 2: minRange 5)
      expect(
        validate(new CalendarDate(2025, 6, 1), new CalendarDate(2025, 6, 5)),
      ).toBe(true) // 5 days >= 5
      expect(
        validate(new CalendarDate(2025, 6, 1), new CalendarDate(2025, 6, 3)),
      ).toBe(false) // 3 days < 5

      // Start in Dec (no rule, global minRange 3)
      expect(
        validate(new CalendarDate(2025, 12, 1), new CalendarDate(2025, 12, 3)),
      ).toBe(true) // 3 days >= 3
    })

    it('applies different maxRange per period based on start date', () => {
      const validate = createRangeValidator({
        maxRange: 14,
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 8, 31),
            maxRange: 7, // shorter max in summer
          },
        ],
      })

      // Start in June (rule: maxRange 7)
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 16)),
      ).toBe(true) // 7 days <= 7
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20)),
      ).toBe(false) // 11 days > 7

      // Start in March (no rule, global maxRange 14)
      expect(
        validate(new CalendarDate(2025, 3, 1), new CalendarDate(2025, 3, 14)),
      ).toBe(true) // 14 days <= 14
      expect(
        validate(new CalendarDate(2025, 3, 1), new CalendarDate(2025, 3, 15)),
      ).toBe(false) // 15 days > 14
    })

    it('rule can override both minRange and maxRange', () => {
      const validate = createRangeValidator({
        minRange: 2,
        maxRange: 30,
        rules: [
          {
            from: new CalendarDate(2025, 12, 20),
            to: new CalendarDate(2025, 12, 31),
            minRange: 5,
            maxRange: 10,
          },
        ],
      })

      // Start in holiday period (minRange 5, maxRange 10)
      expect(
        validate(new CalendarDate(2025, 12, 22), new CalendarDate(2025, 12, 24)),
      ).toBe(false) // 3 days < 5
      expect(
        validate(new CalendarDate(2025, 12, 22), new CalendarDate(2025, 12, 26)),
      ).toBe(true) // 5 days
      expect(
        validate(new CalendarDate(2025, 12, 22), new CalendarDate(2026, 1, 5)),
      ).toBe(false) // 15 days > 10

      // Start outside (minRange 2, maxRange 30)
      expect(
        validate(new CalendarDate(2025, 11, 1), new CalendarDate(2025, 11, 2)),
      ).toBe(true) // 2 days >= 2
    })

    it('rule with only minRange inherits global maxRange', () => {
      const validate = createRangeValidator({
        maxRange: 10,
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            minRange: 5, // only overrides minRange
          },
        ],
      })

      // Start in June — minRange 5 from rule, maxRange 10 from global
      expect(
        validate(new CalendarDate(2025, 6, 1), new CalendarDate(2025, 6, 3)),
      ).toBe(false) // 3 < 5
      expect(
        validate(new CalendarDate(2025, 6, 1), new CalendarDate(2025, 6, 5)),
      ).toBe(true) // 5 >= 5 && 5 <= 10
      expect(
        validate(new CalendarDate(2025, 6, 1), new CalendarDate(2025, 6, 15)),
      ).toBe(false) // 15 > 10
    })
  })

  describe('edge cases', () => {
    it('single-day range with minRange 1', () => {
      const validate = createRangeValidator({ minRange: 1 })
      expect(
        validate(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 10)),
      ).toBe(true)
    })

    it('range spanning months', () => {
      const validate = createRangeValidator({ minRange: 3, maxRange: 45 })
      // Jan 30 to Feb 2 = 4 days
      expect(
        validate(new CalendarDate(2025, 1, 30), new CalendarDate(2025, 2, 2)),
      ).toBe(true)
    })

    it('range spanning years', () => {
      const validate = createRangeValidator({ maxRange: 10 })
      // Dec 28 to Jan 3 = 7 days
      expect(
        validate(new CalendarDate(2025, 12, 28), new CalendarDate(2026, 1, 3)),
      ).toBe(true)
      // Dec 25 to Jan 10 = 17 days
      expect(
        validate(new CalendarDate(2025, 12, 25), new CalendarDate(2026, 1, 10)),
      ).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// isDateDisabled (convenience function)
// ---------------------------------------------------------------------------

describe('isDateDisabled', () => {
  it('is a convenience wrapper for one-off checks', () => {
    const result = isDateDisabled(new CalendarDate(2025, 6, 15), {
      minDate: new CalendarDate(2025, 6, 20),
    })
    expect(result).toBe(true)
  })

  it('returns false when date passes all constraints', () => {
    const result = isDateDisabled(new CalendarDate(2025, 6, 15), {
      minDate: new CalendarDate(2025, 6, 1),
      maxDate: new CalendarDate(2025, 6, 30),
    })
    expect(result).toBe(false)
  })

  it('works with empty options', () => {
    expect(isDateDisabled(new CalendarDate(2025, 6, 15), {})).toBe(false)
  })

  it('works with rules', () => {
    expect(
      isDateDisabled(new CalendarDate(2025, 6, 14), {
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            disabledDaysOfWeek: [0, 6],
          },
        ],
      }),
    ).toBe(true) // Saturday in June rule
  })
})

// ---------------------------------------------------------------------------
// disabledMonths / enabledMonths — day-level impact
// ---------------------------------------------------------------------------

describe('createDateConstraint — disabledMonths', () => {
  it('disables all days in disabled months', () => {
    const check = createDateConstraint({
      disabledMonths: [1, 2], // January and February
    })
    expect(check(new CalendarDate(2025, 1, 15))).toBe(true) // Jan
    expect(check(new CalendarDate(2025, 2, 28))).toBe(true) // Feb
    expect(check(new CalendarDate(2025, 3, 1))).toBe(false) // Mar
    expect(check(new CalendarDate(2025, 12, 25))).toBe(false) // Dec
  })

  it('handles empty array (no months disabled)', () => {
    const check = createDateConstraint({ disabledMonths: [] })
    expect(check(new CalendarDate(2025, 1, 15))).toBe(false)
  })

  it('combines with minDate/maxDate', () => {
    const check = createDateConstraint({
      minDate: new CalendarDate(2025, 1, 1),
      maxDate: new CalendarDate(2025, 12, 31),
      disabledMonths: [6], // June disabled
    })
    expect(check(new CalendarDate(2025, 6, 15))).toBe(true) // June — disabled month
    expect(check(new CalendarDate(2025, 5, 15))).toBe(false) // May — ok
    expect(check(new CalendarDate(2024, 6, 15))).toBe(true) // before minDate
  })

  it('enabledDates overrides disabledMonths', () => {
    const check = createDateConstraint({
      disabledMonths: [1], // January disabled
      enabledDates: [new CalendarDate(2025, 1, 1)], // force-enable New Year
    })
    expect(check(new CalendarDate(2025, 1, 1))).toBe(false) // force-enabled
    expect(check(new CalendarDate(2025, 1, 2))).toBe(true) // rest of Jan disabled
  })
})

describe('createDateConstraint — enabledMonths', () => {
  it('only allows dates in enabled months', () => {
    const check = createDateConstraint({
      enabledMonths: [6, 7, 8], // Summer only
    })
    expect(check(new CalendarDate(2025, 5, 31))).toBe(true) // May
    expect(check(new CalendarDate(2025, 6, 1))).toBe(false) // June
    expect(check(new CalendarDate(2025, 7, 15))).toBe(false) // July
    expect(check(new CalendarDate(2025, 8, 31))).toBe(false) // August
    expect(check(new CalendarDate(2025, 9, 1))).toBe(true) // September
  })

  it('empty array disables all months', () => {
    const check = createDateConstraint({ enabledMonths: [] })
    expect(check(new CalendarDate(2025, 6, 15))).toBe(true)
    expect(check(new CalendarDate(2025, 1, 1))).toBe(true)
  })

  it('enabledDates overrides enabledMonths', () => {
    const check = createDateConstraint({
      enabledMonths: [6, 7, 8], // Summer only
      enabledDates: [new CalendarDate(2025, 12, 25)], // force-enable Christmas
    })
    expect(check(new CalendarDate(2025, 12, 25))).toBe(false) // force-enabled
    expect(check(new CalendarDate(2025, 12, 26))).toBe(true) // rest of Dec disabled
  })
})

// ---------------------------------------------------------------------------
// disabledYears / enabledYears — day-level impact
// ---------------------------------------------------------------------------

describe('createDateConstraint — disabledYears', () => {
  it('disables all days in disabled years', () => {
    const check = createDateConstraint({
      disabledYears: [2020, 2021],
    })
    expect(check(new CalendarDate(2020, 6, 15))).toBe(true)
    expect(check(new CalendarDate(2021, 1, 1))).toBe(true)
    expect(check(new CalendarDate(2022, 1, 1))).toBe(false)
    expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
  })

  it('handles empty array', () => {
    const check = createDateConstraint({ disabledYears: [] })
    expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
  })

  it('enabledDates overrides disabledYears', () => {
    const check = createDateConstraint({
      disabledYears: [2020],
      enabledDates: [new CalendarDate(2020, 3, 15)],
    })
    expect(check(new CalendarDate(2020, 3, 15))).toBe(false) // force-enabled
    expect(check(new CalendarDate(2020, 3, 16))).toBe(true) // rest of 2020 disabled
  })
})

describe('createDateConstraint — enabledYears', () => {
  it('only allows dates in enabled years', () => {
    const check = createDateConstraint({
      enabledYears: [2025, 2026],
    })
    expect(check(new CalendarDate(2024, 12, 31))).toBe(true)
    expect(check(new CalendarDate(2025, 1, 1))).toBe(false)
    expect(check(new CalendarDate(2026, 12, 31))).toBe(false)
    expect(check(new CalendarDate(2027, 1, 1))).toBe(true)
  })

  it('empty array disables all years', () => {
    const check = createDateConstraint({ enabledYears: [] })
    expect(check(new CalendarDate(2025, 6, 15))).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// Combined month + year constraints at day level
// ---------------------------------------------------------------------------

describe('createDateConstraint — combined month/year constraints', () => {
  it('disabledYears + disabledMonths both apply', () => {
    const check = createDateConstraint({
      disabledYears: [2020],
      disabledMonths: [12], // December
    })
    expect(check(new CalendarDate(2020, 6, 15))).toBe(true) // disabled year
    expect(check(new CalendarDate(2025, 12, 25))).toBe(true) // disabled month
    expect(check(new CalendarDate(2025, 6, 15))).toBe(false) // ok
  })

  it('enabledYears + enabledMonths both restrict', () => {
    const check = createDateConstraint({
      enabledYears: [2025, 2026],
      enabledMonths: [6, 7, 8],
    })
    expect(check(new CalendarDate(2025, 6, 15))).toBe(false) // right year + month
    expect(check(new CalendarDate(2025, 1, 15))).toBe(true) // right year, wrong month
    expect(check(new CalendarDate(2024, 6, 15))).toBe(true) // wrong year, right month
  })

  it('disabledMonths + disabledDaysOfWeek stack', () => {
    const check = createDateConstraint({
      disabledMonths: [1],
      disabledDaysOfWeek: [0, 6],
    })
    // Jan 15 2025 is Wednesday — disabled by month
    expect(check(new CalendarDate(2025, 1, 15))).toBe(true)
    // Feb 15 2025 is Saturday — disabled by DOW
    expect(check(new CalendarDate(2025, 2, 15))).toBe(true)
    // Feb 17 2025 is Monday — neither
    expect(check(new CalendarDate(2025, 2, 17))).toBe(false)
  })

  it('rules can override disabledMonths for a period', () => {
    const check = createDateConstraint({
      disabledMonths: [1, 2], // Jan/Feb globally disabled
      rules: [
        {
          from: new CalendarDate(2025, 1, 1),
          to: new CalendarDate(2025, 3, 31),
          disabledMonths: [], // clear month restrictions in Q1 2025
        },
      ],
    })
    // Q1 2025: rule clears disabledMonths → all allowed
    expect(check(new CalendarDate(2025, 1, 15))).toBe(false)
    expect(check(new CalendarDate(2025, 2, 15))).toBe(false)
    // Outside rule: global disabledMonths applies
    expect(check(new CalendarDate(2025, 1, 15))).toBe(false) // this is within the rule
    expect(check(new CalendarDate(2026, 1, 15))).toBe(true) // outside rule, Jan disabled
  })
})

// ---------------------------------------------------------------------------
// createMonthConstraint
// ---------------------------------------------------------------------------

describe('createMonthConstraint', () => {
  describe('no constraints', () => {
    it('returns false for any month when no options are set', () => {
      const check = createMonthConstraint({})
      expect(check(2025, 1)).toBe(false)
      expect(check(2025, 6)).toBe(false)
      expect(check(2025, 12)).toBe(false)
    })
  })

  describe('minDate / maxDate boundary', () => {
    it('disables months entirely before minDate', () => {
      const check = createMonthConstraint({
        minDate: new CalendarDate(2025, 4, 15),
      })
      expect(check(2025, 3)).toBe(true) // Mar ends before Apr 15
      expect(check(2025, 4)).toBe(false) // Apr contains minDate
      expect(check(2025, 5)).toBe(false)
    })

    it('disables months entirely after maxDate', () => {
      const check = createMonthConstraint({
        maxDate: new CalendarDate(2025, 9, 15),
      })
      expect(check(2025, 9)).toBe(false) // Sep contains maxDate
      expect(check(2025, 10)).toBe(true) // Oct starts after Sep 15
      expect(check(2025, 12)).toBe(true)
    })
  })

  describe('disabledMonths', () => {
    it('disables specific months', () => {
      const check = createMonthConstraint({
        disabledMonths: [1, 2, 12],
      })
      expect(check(2025, 1)).toBe(true) // Jan
      expect(check(2025, 2)).toBe(true) // Feb
      expect(check(2025, 3)).toBe(false) // Mar
      expect(check(2025, 12)).toBe(true) // Dec
    })

    it('handles empty array', () => {
      const check = createMonthConstraint({ disabledMonths: [] })
      expect(check(2025, 1)).toBe(false)
    })

    it('applies across all years', () => {
      const check = createMonthConstraint({ disabledMonths: [6] })
      expect(check(2024, 6)).toBe(true)
      expect(check(2025, 6)).toBe(true)
      expect(check(2026, 6)).toBe(true)
    })
  })

  describe('enabledMonths', () => {
    it('only allows specified months', () => {
      const check = createMonthConstraint({
        enabledMonths: [6, 7, 8],
      })
      expect(check(2025, 5)).toBe(true)
      expect(check(2025, 6)).toBe(false)
      expect(check(2025, 7)).toBe(false)
      expect(check(2025, 8)).toBe(false)
      expect(check(2025, 9)).toBe(true)
    })

    it('empty array disables all months', () => {
      const check = createMonthConstraint({ enabledMonths: [] })
      for (let m = 1; m <= 12; m++) {
        expect(check(2025, m)).toBe(true)
      }
    })
  })

  describe('disabledYears cascading to months', () => {
    it('disables all months in a disabled year', () => {
      const check = createMonthConstraint({
        disabledYears: [2020],
      })
      for (let m = 1; m <= 12; m++) {
        expect(check(2020, m)).toBe(true)
      }
      expect(check(2021, 1)).toBe(false)
    })
  })

  describe('enabledYears cascading to months', () => {
    it('disables all months in non-enabled years', () => {
      const check = createMonthConstraint({
        enabledYears: [2025],
      })
      expect(check(2025, 6)).toBe(false)
      expect(check(2024, 6)).toBe(true)
      expect(check(2026, 6)).toBe(true)
    })
  })

  describe('combined', () => {
    it('minDate + disabledMonths', () => {
      const check = createMonthConstraint({
        minDate: new CalendarDate(2025, 3, 1),
        disabledMonths: [6],
      })
      expect(check(2025, 2)).toBe(true) // before minDate
      expect(check(2025, 3)).toBe(false) // at minDate
      expect(check(2025, 6)).toBe(true) // disabled month
      expect(check(2025, 7)).toBe(false) // ok
    })

    it('enabledYears + enabledMonths', () => {
      const check = createMonthConstraint({
        enabledYears: [2025],
        enabledMonths: [6, 7, 8],
      })
      expect(check(2025, 6)).toBe(false)
      expect(check(2025, 1)).toBe(true) // wrong month
      expect(check(2024, 6)).toBe(true) // wrong year
    })

    it('disabledYears + disabledMonths', () => {
      const check = createMonthConstraint({
        disabledYears: [2020],
        disabledMonths: [12],
      })
      expect(check(2020, 6)).toBe(true) // disabled year
      expect(check(2025, 12)).toBe(true) // disabled month
      expect(check(2025, 6)).toBe(false) // ok
    })
  })
})

// ---------------------------------------------------------------------------
// createYearConstraint
// ---------------------------------------------------------------------------

describe('createYearConstraint', () => {
  describe('no constraints', () => {
    it('returns false for any year when no options are set', () => {
      const check = createYearConstraint({})
      expect(check(2020)).toBe(false)
      expect(check(2025)).toBe(false)
      expect(check(2030)).toBe(false)
    })
  })

  describe('minDate / maxDate boundary', () => {
    it('disables years entirely before minDate', () => {
      const check = createYearConstraint({
        minDate: new CalendarDate(2025, 6, 1),
      })
      expect(check(2024)).toBe(true) // ends Dec 31 2024, before Jun 1 2025
      expect(check(2025)).toBe(false) // contains minDate
      expect(check(2026)).toBe(false)
    })

    it('disables years entirely after maxDate', () => {
      const check = createYearConstraint({
        maxDate: new CalendarDate(2025, 6, 30),
      })
      expect(check(2025)).toBe(false) // contains maxDate
      expect(check(2026)).toBe(true) // starts Jan 1 2026, after Jun 30 2025
    })
  })

  describe('disabledYears', () => {
    it('disables specific years', () => {
      const check = createYearConstraint({
        disabledYears: [2020, 2021, 2022],
      })
      expect(check(2019)).toBe(false)
      expect(check(2020)).toBe(true)
      expect(check(2021)).toBe(true)
      expect(check(2022)).toBe(true)
      expect(check(2023)).toBe(false)
    })

    it('handles empty array', () => {
      const check = createYearConstraint({ disabledYears: [] })
      expect(check(2025)).toBe(false)
    })
  })

  describe('enabledYears', () => {
    it('only allows specified years', () => {
      const check = createYearConstraint({
        enabledYears: [2025, 2026, 2027],
      })
      expect(check(2024)).toBe(true)
      expect(check(2025)).toBe(false)
      expect(check(2026)).toBe(false)
      expect(check(2027)).toBe(false)
      expect(check(2028)).toBe(true)
    })

    it('empty array disables all years', () => {
      const check = createYearConstraint({ enabledYears: [] })
      expect(check(2025)).toBe(true)
      expect(check(2000)).toBe(true)
    })
  })

  describe('combined', () => {
    it('minDate + disabledYears', () => {
      const check = createYearConstraint({
        minDate: new CalendarDate(2020, 1, 1),
        disabledYears: [2022],
      })
      expect(check(2019)).toBe(true) // before minDate
      expect(check(2020)).toBe(false)
      expect(check(2022)).toBe(true) // explicitly disabled
      expect(check(2025)).toBe(false)
    })

    it('maxDate + enabledYears', () => {
      const check = createYearConstraint({
        maxDate: new CalendarDate(2026, 12, 31),
        enabledYears: [2025, 2026],
      })
      expect(check(2024)).toBe(true) // not in enabledYears
      expect(check(2025)).toBe(false) // enabled + within range
      expect(check(2026)).toBe(false) // enabled + within range
      expect(check(2027)).toBe(true) // after maxDate
    })
  })
})

// ---------------------------------------------------------------------------
// Recurring month rules
// ---------------------------------------------------------------------------

describe('recurring month rules', () => {
  describe('createDateConstraint with months rules', () => {
    it('applies rule to matching months every year', () => {
      const check = createDateConstraint({
        rules: [{
          months: [6, 7, 8], // summer months
          disabledDaysOfWeek: [0, 6], // no weekends in summer
        }],
      })
      // A Saturday in June 2025
      expect(check(new CalendarDate(2025, 6, 7))).toBe(true) // Saturday in summer → disabled
      // A Monday in June 2025
      expect(check(new CalendarDate(2025, 6, 9))).toBe(false) // Monday in summer → enabled
      // A Saturday in May 2025 (not summer)
      expect(check(new CalendarDate(2025, 5, 3))).toBe(false) // Saturday outside rule → global (no constraint)
    })

    it('recurring months rule applies across different years', () => {
      const check = createDateConstraint({
        rules: [{
          months: [12], // December rule
          disabledDaysOfWeek: [0, 6],
        }],
      })
      // December Saturday in 2025
      expect(check(new CalendarDate(2025, 12, 6))).toBe(true)
      // December Saturday in 2026
      expect(check(new CalendarDate(2026, 12, 5))).toBe(true)
      // December Monday in 2025
      expect(check(new CalendarDate(2025, 12, 1))).toBe(false)
    })

    it('recurring months rule overrides global constraints', () => {
      const check = createDateConstraint({
        disabledDaysOfWeek: [0, 6], // globally disable weekends
        rules: [{
          months: [1], // January: override to allow all days
          disabledDaysOfWeek: [], // empty array = no days disabled
        }],
      })
      // Saturday in January → rule overrides global, weekends allowed
      expect(check(new CalendarDate(2025, 1, 4))).toBe(false)
      // Saturday in February → global rule, weekends disabled
      expect(check(new CalendarDate(2025, 2, 1))).toBe(true)
    })

    it('recurring months rule with enabledDaysOfWeek', () => {
      const check = createDateConstraint({
        rules: [{
          months: [3, 4], // March and April
          enabledDaysOfWeek: [1, 2, 3, 4, 5], // weekdays only
        }],
      })
      // Weekday in March
      expect(check(new CalendarDate(2025, 3, 3))).toBe(false) // Monday → allowed
      // Weekend in March
      expect(check(new CalendarDate(2025, 3, 1))).toBe(true) // Saturday → disabled
      // Weekend in May (no rule)
      expect(check(new CalendarDate(2025, 5, 3))).toBe(false) // Saturday, no rule → global allows
    })

    it('recurring months rule with disabledDates', () => {
      const check = createDateConstraint({
        rules: [{
          months: [7], // July
          disabledDates: [
            new CalendarDate(2025, 7, 4), // Independence Day
            new CalendarDate(2025, 7, 25),
          ],
        }],
      })
      expect(check(new CalendarDate(2025, 7, 4))).toBe(true) // disabled
      expect(check(new CalendarDate(2025, 7, 5))).toBe(false) // not disabled
      expect(check(new CalendarDate(2025, 7, 25))).toBe(true) // disabled
    })

    it('recurring months rule with enabledDates override', () => {
      const check = createDateConstraint({
        rules: [{
          months: [12],
          disabledDaysOfWeek: [0, 6], // no weekends in December
          enabledDates: [new CalendarDate(2025, 12, 25)], // but Christmas is OK even if it's a Thursday
        }],
      })
      // Christmas 2025 is Thursday, but enabledDates overrides
      expect(check(new CalendarDate(2025, 12, 25))).toBe(false)
      // Saturday in December → disabled
      expect(check(new CalendarDate(2025, 12, 6))).toBe(true)
    })

    it('first matching rule wins (date-range before recurring)', () => {
      const check = createDateConstraint({
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            disabledDaysOfWeek: [0, 6, 5], // no weekends+Friday in June 2025 specifically
          },
          {
            months: [6], // June every year — less restrictive
            disabledDaysOfWeek: [0, 6],
          },
        ],
      })
      // Friday in June 2025 → first rule matches (date-range), Friday disabled
      expect(check(new CalendarDate(2025, 6, 6))).toBe(true)
      // Friday in June 2026 → first rule doesn't match, second rule matches, Friday allowed
      expect(check(new CalendarDate(2026, 6, 5))).toBe(false)
    })

    it('first matching rule wins (recurring before date-range)', () => {
      const check = createDateConstraint({
        rules: [
          {
            months: [6], // June recurring: no weekends
            disabledDaysOfWeek: [0, 6],
          },
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            disabledDaysOfWeek: [0, 6, 5], // would also disable Friday but never reached
          },
        ],
      })
      // Friday in June 2025 → first rule (recurring) matches, only weekends disabled
      expect(check(new CalendarDate(2025, 6, 6))).toBe(false) // Friday → allowed
    })

    it('recurring rule with minDate/maxDate override', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 1, 1),
        maxDate: new CalendarDate(2025, 12, 31),
        rules: [{
          months: [6, 7, 8],
          minDate: new CalendarDate(2025, 6, 15), // summer starts mid-June
        }],
      })
      // June 1 falls in the recurring rule → rule minDate = June 15
      expect(check(new CalendarDate(2025, 6, 1))).toBe(true) // before rule minDate
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false) // on rule minDate
      expect(check(new CalendarDate(2025, 6, 20))).toBe(false) // after rule minDate
      // Outside rule, global minDate applies
      expect(check(new CalendarDate(2024, 12, 31))).toBe(true) // before global minDate
      expect(check(new CalendarDate(2025, 1, 1))).toBe(false) // on global minDate
    })

    it('single recurring month', () => {
      const check = createDateConstraint({
        rules: [{
          months: [2], // February only
          disabledDaysOfWeek: [0], // no Sundays in February
        }],
      })
      // Sunday in February
      expect(check(new CalendarDate(2025, 2, 2))).toBe(true) // disabled
      // Monday in February
      expect(check(new CalendarDate(2025, 2, 3))).toBe(false) // allowed
      // Sunday in March (no rule)
      expect(check(new CalendarDate(2025, 3, 2))).toBe(false) // allowed (no rule)
    })

    it('all months in recurring rule effectively makes it global', () => {
      const check = createDateConstraint({
        rules: [{
          months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          disabledDaysOfWeek: [0, 6],
        }],
      })
      // Every month is covered, so weekends are disabled everywhere
      expect(check(new CalendarDate(2025, 1, 4))).toBe(true) // Saturday Jan
      expect(check(new CalendarDate(2025, 7, 6))).toBe(true) // Sunday Jul
      expect(check(new CalendarDate(2025, 10, 6))).toBe(false) // Monday Oct
    })

    it('global minDate/maxDate still enforced even with recurring rule', () => {
      const check = createDateConstraint({
        minDate: new CalendarDate(2025, 1, 1),
        maxDate: new CalendarDate(2025, 12, 31),
        rules: [{
          months: [6],
          // Rule doesn't override minDate/maxDate
        }],
      })
      // June 2024 matches recurring month but before global minDate
      expect(check(new CalendarDate(2024, 6, 15))).toBe(true)
      // June 2025 within global bounds
      expect(check(new CalendarDate(2025, 6, 15))).toBe(false)
      // June 2026 matches recurring month but after global maxDate
      expect(check(new CalendarDate(2026, 6, 15))).toBe(true)
    })
  })

  describe('createRangeValidator with months rules', () => {
    it('applies minRange from recurring rule based on start month', () => {
      const validate = createRangeValidator({
        minRange: 3,
        rules: [{
          months: [6, 7, 8], // summer: stricter minimum
          minRange: 5,
        }],
      })
      // Start in June → summer rule: minRange 5
      expect(validate(
        new CalendarDate(2025, 6, 1),
        new CalendarDate(2025, 6, 3),
      )).toBe(false) // 3 < 5
      expect(validate(
        new CalendarDate(2025, 6, 1),
        new CalendarDate(2025, 6, 5),
      )).toBe(true) // 5 >= 5

      // Start in March → no rule: global minRange 3
      expect(validate(
        new CalendarDate(2025, 3, 1),
        new CalendarDate(2025, 3, 3),
      )).toBe(true) // 3 >= 3
      expect(validate(
        new CalendarDate(2025, 3, 1),
        new CalendarDate(2025, 3, 2),
      )).toBe(false) // 2 < 3
    })

    it('applies maxRange from recurring rule', () => {
      const validate = createRangeValidator({
        maxRange: 14,
        rules: [{
          months: [12], // December: shorter max
          maxRange: 7,
        }],
      })
      // Start in December → rule maxRange 7
      expect(validate(
        new CalendarDate(2025, 12, 1),
        new CalendarDate(2025, 12, 7),
      )).toBe(true) // 7 <= 7
      expect(validate(
        new CalendarDate(2025, 12, 1),
        new CalendarDate(2025, 12, 8),
      )).toBe(false) // 8 > 7

      // Start in January → global maxRange 14
      expect(validate(
        new CalendarDate(2025, 1, 1),
        new CalendarDate(2025, 1, 14),
      )).toBe(true) // 14 <= 14
    })

    it('recurring rule overrides both minRange and maxRange', () => {
      const validate = createRangeValidator({
        minRange: 2,
        maxRange: 30,
        rules: [{
          months: [7, 8],
          minRange: 7,
          maxRange: 14,
        }],
      })
      // Start in July → rule: 7-14
      expect(validate(
        new CalendarDate(2025, 7, 1),
        new CalendarDate(2025, 7, 5),
      )).toBe(false) // 5 < 7
      expect(validate(
        new CalendarDate(2025, 7, 1),
        new CalendarDate(2025, 7, 7),
      )).toBe(true) // 7 >= 7 && 7 <= 14
      expect(validate(
        new CalendarDate(2025, 7, 1),
        new CalendarDate(2025, 7, 15),
      )).toBe(false) // 15 > 14

      // Start in September → global: 2-30
      expect(validate(
        new CalendarDate(2025, 9, 1),
        new CalendarDate(2025, 9, 20),
      )).toBe(true) // within 2-30
    })

    it('date-range rule takes priority over recurring rule for range validation', () => {
      const validate = createRangeValidator({
        rules: [
          {
            from: new CalendarDate(2025, 6, 1),
            to: new CalendarDate(2025, 6, 30),
            minRange: 10,
          },
          {
            months: [6],
            minRange: 3,
          },
        ],
      })
      // Start in June 2025 → first rule (date-range) matches: minRange 10
      expect(validate(
        new CalendarDate(2025, 6, 1),
        new CalendarDate(2025, 6, 5),
      )).toBe(false) // 5 < 10

      // Start in June 2026 → first rule doesn't match, second (recurring) matches: minRange 3
      expect(validate(
        new CalendarDate(2026, 6, 1),
        new CalendarDate(2026, 6, 3),
      )).toBe(true) // 3 >= 3
    })
  })
})
