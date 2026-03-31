# Confirmed Issues — Alpine Calendar

Issues identified through multi-pass code review with independent confirmation.

---

## Bugs

### BUG-1: `closeOnSelect` causes popup to close after every click in `multiple` mode

**Severity:** High
**File:** `src/plugin/calendar-component.ts`, lines 1619-1625

In `selectDate()`, the auto-close logic treats `mode === 'multiple'` as always "complete":

```ts
const isComplete =
  mode === 'single' ||
  (mode === 'range' && !(this._selection as RangeSelection).isPartial()) ||
  mode === 'multiple'   // <-- always true
if (isComplete) this.close()
```

Since `closeOnSelect` defaults to `true` (line 533), the popup closes after every single date click in multiple mode, making it unusable for selecting more than one date.

**Fix:** Either remove `mode === 'multiple'` from the `isComplete` condition, or default `closeOnSelect` to `false` when `mode === 'multiple'`.

---

### BUG-2: `collectReasons()` diverges from `checkDisabled()` — missing early return after `enabledDays` check

**Severity:** Medium
**File:** `src/core/constraints.ts`, lines 566-578

In `checkDisabled()` (line 147), when `enabledDays` is set and the date's day-of-week is not in the whitelist, the function returns `true` immediately. The subsequent `disabledKeys` and `disabledDays` checks are never reached.

In `collectReasons()` (line 566), when `enabledDays` fails, it pushes a reason but does NOT return early. Execution falls through to check `disabledKeys` (line 571) and `disabledDays` (line 576), accumulating extra reasons that `checkDisabled` would never evaluate. This makes the disabled-reason tooltip show incorrect/misleading messages.

**Fix:** Add `return reasons` after line 567 (after pushing `msgs.notEnabledDayOfWeek`), matching the early-return pattern used for year-level and month-level checks in the same function.

---

### BUG-3: `handleBlur` in `multiple` mode replaces entire selection with parsed input

**Severity:** Medium
**File:** `src/plugin/calendar-component.ts`, lines 1392-1404

When the input loses focus in multiple mode, the handler parses the text and replaces the entire selection:

```ts
const dates = parseDateMultiple(value, format)
const valid = dates.filter((d) => !this._isEffectivelyDisabled(d))
if (valid.length > 0) {
    this._selection.clear()       // clears ALL existing dates
    for (const d of valid) {
        ;(this._selection as MultipleSelection).add(d)
    }
```

If a user had 5 dates selected and edits the input text to corrupt one of them, `parseDateMultiple` returns only the 4 valid dates, and ALL 5 previous selections are cleared before adding the 4 back. The corrupted date is silently lost. Worse, the `if (valid.length > 0)` guard means if zero dates parse, the selection is preserved — but if even one parses, the rest are replaced. This asymmetry is surprising.

**Fix:** Consider merging parsed dates with existing selection, or warning the user about dates that failed to parse rather than silently dropping them.

---

### BUG-4: `matchesRule()` silently ignores rules with only `from` or only `to`

**Severity:** Medium
**File:** `src/core/constraints.ts`, lines 163-173

```ts
function matchesRule(rule: PrecomputedRule, date: CalendarDate): boolean {
  if (rule.from && rule.to) {        // requires BOTH
    return date.isBetween(rule.from, rule.to)
  }
  if (rule.recurringMonths) {
    return rule.recurringMonths.has(date.month)
  }
  return false
}
```

A rule with only `from` (open-ended: "from June 1 onward") or only `to` ("up to this date") will never match any date. The `parseConfigRule` function (line 215) also enforces `hasDateRange = from !== null && to !== null`, so such rules are filtered out before they even reach `matchesRule`. This means users cannot define open-ended period rules, which is a reasonable use case.

**Fix:** Support half-open ranges: if only `from` is set, match `date >= from`; if only `to` is set, match `date <= to`. Update both `parseConfigRule` and `matchesRule`.

---

### BUG-5: `aria-disabled` does not reflect metadata `unavailable` state

**Severity:** Low
**File:** `src/plugin/template.ts`, line 43

The template binds `:aria-disabled="cell.isDisabled"`, but `cell.isDisabled` is computed at grid generation time from constraints only. Dates marked `unavailable` via metadata (`dateMetadata`) are not reflected in `aria-disabled`, so screen readers will announce them as enabled even though `selectDate()` blocks their selection internally.

**Fix:** Change the binding to check both constraint disabling and metadata unavailability, e.g., `:aria-disabled="cell.isDisabled || dayMeta(cell)?.availability === 'unavailable'"`.

---

## Performance Issues

### PERF-1: `weekdayHeaders` getter creates 7 `Intl.DateTimeFormat` instances on every access

**Severity:** High
**File:** `src/plugin/calendar-component.ts`, lines 803-814

```ts
get weekdayHeaders(): string[] {
  const headers: string[] = []
  const refSunday = new Date(2026, 0, 4)
  for (let i = 0; i < 7; i++) {
    const dayIndex = (this.firstDay + i) % 7
    const d = new Date(refSunday)
    d.setDate(refSunday.getDate() + dayIndex)
    headers.push(new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(d))
  }
  return headers
}
```

This getter creates 7 `Intl.DateTimeFormat` instances plus 7 `Date` objects on every access. Since `this.firstDay` is a reactive property, Alpine re-evaluates this getter on every render cycle. Neither `firstDay` nor `locale` ever change at runtime — the result is always identical.

**Fix:** Compute the headers once during `init()` and store as `this._weekdayHeaders`. Reference the cached array in the getter or replace the getter entirely.

---

### PERF-2: Quadruple metadata lookup per day cell

**Severity:** Medium
**File:** `src/plugin/calendar-component.ts`, lines 1128-1234

For each of the 42 day cells per visible month, Alpine evaluates bindings for `dayClasses()`, `dayTitle()`, `dayMeta()`, and `dayStyle()` independently. Each calls `this._getDateMeta(d)`:
- `dayClasses()` — line 1157
- `dayTitle()` — line 1195 (via `_getDateMeta`)
- `dayMeta()` — line 1220
- `dayStyle()` — line 1229

This results in **168 metadata lookups per month** (4 x 42) instead of 42. When the metadata provider is a user-supplied callback function rather than a static map, this means the callback fires 4x more than necessary.

**Fix:** Cache metadata per-cell in a `Map<string, DateMeta>` that is invalidated when `_metadataRev` changes, or compute all per-cell derived data in a single pass.

---

### PERF-3: `_wrapWithDeepChecks` causes cascading constraint evaluation — up to 4,464 calls per navigation

**Severity:** Medium
**File:** `src/plugin/calendar-component.ts`, lines 707-722 and 1035-1084

The deep-check chain:
- `_isYearDisabled(y)` iterates months 1-12, calling `_isMonthDisabled` for each
- `_isMonthDisabled(y, m)` calls `_firstSelectableDay` which iterates up to 31 days
- `_firstSelectableDay` calls `_isEffectivelyDisabled` per day, which also calls `_getDateMeta`

For the year view, `canGoPrev`/`canGoNext` each check 12 years in the adjacent block. Worst case: **12 years x 12 months x 31 days = 4,464 calls** to `_isEffectivelyDisabled` plus 4,464 calls to `_getDateMeta`. These run on every year navigation.

Additionally, `_rebuildYearGrid` checks 12 years and `_rebuildMonthGrid` checks 12 months on every year change.

**Fix:** Cache `_isMonthDisabled` and `_isYearDisabled` results, invalidating the cache when constraints or metadata change (i.e., when `_constraintConfig` or `_metadataRev` changes).

---

### PERF-4: `CalendarDate.format()` creates a new `Intl.DateTimeFormat` on every call

**Severity:** Low
**File:** `src/core/calendar-date.ts`, line 171

```ts
format(options: Intl.DateTimeFormatOptions, locale?: string): string {
  const d = this.toNativeDate()
  return new Intl.DateTimeFormat(locale, options).format(d)
}
```

`Intl.DateTimeFormat` construction involves locale resolution and is relatively expensive. This method is called from `generateMonthGrid()` (12 times with identical options), `monthYearLabel()`, `wizardSummary`, and screen reader announcements. Each call creates a fresh instance.

**Fix:** Cache `Intl.DateTimeFormat` instances by locale + options key. A simple `Map<string, Intl.DateTimeFormat>` cache would eliminate repeated construction.

---

### PERF-5: Constraint rule merging allocates a new `mergedSets` object on every date check

**Severity:** Low
**File:** `src/core/constraints.ts`, lines 258-277

When rules are configured and a rule matches a date, the returned closure allocates a new `mergedSets` object with 8 properties on every call:

```ts
const mergedSets: PrecomputedSets = {
  disabledKeys: rule.sets.disabledKeys !== undefined ? rule.sets.disabledKeys : globalSets.disabledKeys,
  // ... 7 more properties
}
```

For 42 day cells per month that all match the same rule, this creates 42 identical objects. These are short-lived and add GC pressure.

**Fix:** Pre-compute merged sets per rule at setup time (since each rule always merges the same way with the same global sets). Store the merged result on the `PrecomputedRule` object.
