# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0]

### Added

- **`allowDeselect` option (default `true`).** When `false`, clicking the currently-selected date in `single` mode (or an already-selected date in `multiple` mode) keeps the selection instead of toggling it off — no `calendar:change` fires and `beforeSelect` is not invoked; in popup display the click still closes the popup, like a confirmed selection. Range mode and programmatic clearing (`clearSelection()`, `setValue()`) are unaffected. Useful for booking UIs where re-clicking the selected date should read as "confirm this date" rather than clearing it.

## [1.2.0]

### Fixed

- **Day-view month navigation could not cross a gap of fully-unavailable months.** When `dateMetadata` marked entire months as `availability: 'unavailable'` (e.g. a booking calendar with departures Aug–Oct 2026, then nothing until May 2027), the "Next month" arrow disabled itself at the last month before the gap and the later, still-selectable months became unreachable — and likewise backward. `canGoPrev`/`canGoNext` and `prev()`/`next()` now scan for the nearest earlier/later month that has a selectable day and hop straight to it, skipping any run of fully-unavailable in-range months — mirroring the existing `precision: 'month'` year-skipping behavior. The keyboard `PageUp`/`PageDown` path (`_moveFocusByMonths`) hops the same gaps, so keyboard and pointer navigation stay consistent. Genuine `minDate`/`maxDate` bounds still stop navigation at the edges, and scrollable (mobile multi-month) mode is unchanged.

## [1.1.0]

### Added

- **`precision: 'month'` — a forward-looking month picker.** Opens directly on the months grid (with the year prev/next arrows), positioned by the usual `value` > `initialMonth` > today precedence and clamped into `[minDate, maxDate]`. Clicking a month commits the first day of that month as the single selection, emits `calendar:change` (`detail.dates[0]` = first-of-month), formats the input via `format` (e.g. `'MMMM YYYY'` → `"August 2026"`), and closes the popup — no day grid, no year step. The bound input becomes read-only (selection-only), `format` defaults to `'MM/YYYY'`, and a stored first-of-month `value` restores both the displayed string and the highlighted month. Designed to compose with `mode: 'single'`; combining with `range`/`multiple` or `wizard` warns (precision takes precedence over the wizard).

## [1.0.1]

### Fixed

- **Scrollable popup overflowed the viewport on small screens.** In popup mode the scroll container used a fixed `${scrollHeight}px` cap, which left a tall popup hanging below the visible viewport on phones. The container now caps at `min(1.5× scrollHeight, calc(100svh - 11rem - env(safe-area-inset-bottom)))` in popup mode, so the calendar shrinks to fit the small viewport, reserves room for the popup/nav/weekday headers, and clears the iOS home indicator. Inline mode is unchanged (still a fixed pixel cap).

### Changed

- `scrollableDayView()` template helper now takes an `isPopup` flag and routes through a new internal `scrollMaxHeight()` helper.
- Demo (`demo/index.html`) updated to better showcase the responsive popup behavior.

[1.3.0]: https://github.com/reachweb/alpine-calendar/releases/tag/v1.3.0
[1.2.0]: https://github.com/reachweb/alpine-calendar/releases/tag/v1.2.0
[1.1.0]: https://github.com/reachweb/alpine-calendar/releases/tag/v1.1.0
[1.0.1]: https://github.com/reachweb/alpine-calendar/releases/tag/v1.0.1
