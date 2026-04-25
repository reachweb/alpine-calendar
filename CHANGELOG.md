# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1]

### Fixed

- **Scrollable popup overflowed the viewport on small screens.** In popup mode the scroll container used a fixed `${scrollHeight}px` cap, which left a tall popup hanging below the visible viewport on phones. The container now caps at `min(1.5× scrollHeight, calc(100svh - 11rem - env(safe-area-inset-bottom)))` in popup mode, so the calendar shrinks to fit the small viewport, reserves room for the popup/nav/weekday headers, and clears the iOS home indicator. Inline mode is unchanged (still a fixed pixel cap).

### Changed

- `scrollableDayView()` template helper now takes an `isPopup` flag and routes through a new internal `scrollMaxHeight()` helper.
- Demo (`demo/index.html`) updated to better showcase the responsive popup behavior.

[1.0.1]: https://github.com/reachweb/alpine-calendar/releases/tag/v1.0.1
