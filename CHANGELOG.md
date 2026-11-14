# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- **Popup calendars taller than the viewport could not be scrolled on mobile.** Below 640px a `months: 2` popup stacks both months (≈830px tall), and the overlay centered it with no overflow handling, so the header and close button sat off-screen above the viewport and scroll or swipe gestures moved the page behind the popup instead. `.rc-popup-overlay` is now its own scroll container (`overflow-y: auto; overscroll-behavior: contain`) and aligns the calendar to the top with `margin-block: auto`, so it stays centered when it fits and starts at the top, scrollable to the end, when it doesn't. A popup closed while scrolled down reopens at the top. The scrollable multi-month popup reserves `12rem` of viewport height instead of `11rem`, so it still fits the overlay on short screens and only its month list scrolls (the list is 16px shorter wherever that cap applies). Desktop layout is otherwise unchanged.
- **Calendars overflowed horizontally on phones.** Below 640px every day cell had a 44px minimum (`min-height: 2.75rem` with `aspect-ratio: 1`), so a week needed 314px of content width (347px with `showWeekNumbers`). Anywhere narrower, the last columns ran into the padding or out of the calendar: popups below about 372px (405px with week numbers), and inline calendars in padded containers on most phones (by 60px in the demo's cards at 360px). Inline calendars in flex or grid containers, and any calendar in a container under 280px (`min-width: 17.5rem` beat `max-width: 100%`), stuck out of the container entirely. Days on mobile now shrink with their row instead, down to 24px (the WCAG 2.2 AA minimum target size), and stay 44px or larger wherever a 44px week fits: popups fill the screen width, and the weekday header asks for room for 44px days, so inline calendars, which size to their content, still get it when the container allows. The mobile `min-width` is now `min(17.5rem, 100%)`, backed by a zero-height `.rc-calendar::before` spacer so wizard steps and month pickers keep their 280px width in flex, grid and inline-block parents. Below 360px the popup overlay and calendar padding drop to `0.5rem`, and below 390px the weekday labels drop to `0.625rem` with no letter-spacing, so neighbouring labels don't run together in the narrower columns (they overlapped in the demo's cards with week numbers or French labels up to 389px). Desktop is unchanged.

### Added

- **`lockScroll` option (default `true`).** While a popup is open, page scrolling is locked by setting `overflow: hidden` on `<html>`, or on `<body>` when `<html>` sets no overflow of its own (so sticky headers stay put on pages with `body { overflow-x: hidden }`), and adding the scrollbar width to `<html>`'s right padding so the page doesn't shift (skipped when there is no scrollbar or the page uses `scrollbar-gutter: stable`). `close()` restores the previous inline values, including a lone `overflow-x` or `overflow-y`, and leaves them alone if another scroll lock (such as a modal around the calendar) has changed them since. The lock is reference-counted across calendars, so one closing popup can't unlock the page while another is open, and it is released if the component is destroyed, if `isOpen` is set to `false` directly, or if the component's root element leaves the document while open without `destroy()` running (a swapped-out ancestor or `<body>`), in which case the popup closes. Inline calendars never touch `<html>` or `<body>`; pass `lockScroll: false` to opt out.
- **`--z-calendar-popup` theme variable (default `50`).** The overlay's `z-index` is now `var(--z-calendar-popup, 50)` instead of a fixed inline `50`, both in the `.rc-popup-overlay` rule and in the inline `popupStyle` (so custom popups that bind `popupStyle` get it too). Sites with sticky headers or cookie banners above `50` can raise the popup without `!important`.

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
