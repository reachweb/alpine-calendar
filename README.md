# Alpine Calendar

A lightweight, AlpineJS-native calendar component with inline/popup display, input binding with masking, single/multiple/range selection, month/year pickers, birth-date wizard, TailwindCSS 4 theming, and timezone-safe date handling.

**[Live Demo](https://reachweb.github.io/alpine-calendar/)**

## Installation

### npm / pnpm

```bash
pnpm add @reachweb/alpine-calendar
# or
npm install @reachweb/alpine-calendar
```

```js
import Alpine from 'alpinejs'
import { calendarPlugin } from '@reachweb/alpine-calendar'
import '@reachweb/alpine-calendar/css'

Alpine.plugin(calendarPlugin)
Alpine.start()
```

### CDN (no bundler)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@reachweb/alpine-calendar/dist/alpine-calendar.css">
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@reachweb/alpine-calendar/dist/alpine-calendar.cdn.js"></script>
```

The CDN build auto-registers via `alpine:init` — no manual setup needed. Works with Livewire, Statamic, or any server-rendered HTML.

## Quick Start

You can use x-data in any block element to load the calendar.

### Inline Single Date

```html
<div x-data="calendar({ mode: 'single', firstDay: 1 })"></div>
```

### Popup with Input

```html
<div x-data="calendar({ mode: 'single', display: 'popup' })">
  <input x-ref="rc-input" type="text" class="rc-input">
</div>
```

Provide your own `<input>` with `x-ref="rc-input"` — the calendar binds to it automatically, attaching focus/blur handlers, input masking, and ARIA attributes. The popup overlay with close button, transitions, and mobile-responsive sizing is auto-rendered alongside the input.

To use a custom ref name:

```html
<div x-data="calendar({ display: 'popup', inputRef: 'dateField' })">
  <input x-ref="dateField" type="text" class="my-custom-input">
</div>
```

### Range Selection (2-Month)

```html
<div x-data="calendar({ mode: 'range', months: 2, firstDay: 1 })"></div>
```

### Multiple Date Selection

```html
<div x-data="calendar({ mode: 'multiple' })"></div>
```

### Birth Date Wizard

```html
<div x-data="calendar({ mode: 'single', wizard: true })"></div>
```

Wizard modes: `true` (or `'full'`) for Year → Month → Day, `'year-month'` for Year → Month, `'month-day'` for Month → Day.

### Form Submission

```html
<form>
  <div x-data="calendar({ mode: 'single', name: 'date' })"></div>
  <button type="submit">Submit</button>
</form>
```

When `name` is set, hidden `<input>` elements are auto-generated for form submission.

### Disabling Auto-Rendering

Set `template: false` to require a manual template, or provide your own `.rc-calendar` element — the calendar skips auto-rendering when it detects an existing `.rc-calendar`:

```html
<!-- Manual template (auto-rendering skipped) -->
<div x-data="calendar({ mode: 'single' })">
  <div class="rc-calendar" @keydown="handleKeydown($event)" tabindex="0" role="application">
    <!-- your custom template here -->
  </div>
</div>

<!-- Explicitly disabled -->
<div x-data="calendar({ mode: 'single', template: false })"></div>
```

## Presetting Values

### Initial Value

Set `value` in the config to pre-select dates on load:

```html
<!-- Single date -->
<div x-data="calendar({ mode: 'single', value: '2026-03-15' })"></div>

<!-- Range -->
<div x-data="calendar({ mode: 'range', value: '2026-03-10 - 2026-03-20' })"></div>

<!-- Multiple dates -->
<div x-data="calendar({ mode: 'multiple', value: '2026-03-10, 2026-03-15, 2026-03-20' })"></div>
```

### Dynamic Updates

Use `setValue()` to change the selection after initialization:

```html
<div x-data="calendar({ mode: 'single' })" x-ref="cal">
  <button @click="$refs.cal.setValue('2026-06-15')">Set June 15</button>
  <button @click="$refs.cal.clear()">Clear</button>
</div>
```

### Server-Rendered / Livewire

Pass backend variables directly into the config:

```html
<div x-data="calendar({ mode: 'single', value: '{{ $date }}' })"></div>
```

Or with Livewire's `@entangle`:

```html
<div x-data="calendar({ mode: 'single', value: @entangle('date') })"></div>
```

## Configuration

All options are passed via `x-data="calendar({ ... })"`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'single' \| 'multiple' \| 'range'` | `'single'` | Selection mode |
| `display` | `'inline' \| 'popup'` | `'inline'` | Inline calendar or popup with input |
| `format` | `string` | `'DD/MM/YYYY'` | Date format (tokens: `DD`, `MM`, `YYYY`, `D`, `M`, `YY`) |
| `months` | `number` | `1` | Months to display (1=single, 2=dual side-by-side, 3+=scrollable) |
| `firstDay` | `0–6` | `1` | First day of week (0=Sun, 1=Mon, ...) |
| `mask` | `boolean` | `true` | Enable input masking |
| `value` | `string` | — | Initial value (ISO or formatted string) |
| `name` | `string` | `''` | Input name attribute for form submission |
| `locale` | `string` | — | BCP 47 locale for month/day names |
| `timezone` | `string` | — | IANA timezone for resolving "today" |
| `closeOnSelect` | `boolean` | `true` | Close popup after selection |
| `wizard` | `boolean \| 'year-month' \| 'month-day'` | `false` | Birth date wizard mode |
| `beforeSelect` | `(date, ctx) => boolean` | — | Custom validation before selection |
| `showWeekNumbers` | `boolean` | `false` | Show ISO 8601 week numbers alongside the day grid |
| `inputId` | `string` | — | ID for the popup input (allows external `<label for="...">`) |
| `inputRef` | `string` | `'rc-input'` | Alpine `x-ref` name for the input element |
| `scrollHeight` | `number` | `400` | Max height (px) of scrollable container when `months >= 3` |
| `presets` | `RangePreset[]` | — | Predefined date range shortcuts (see [Range Presets](#range-presets)) |
| `constraintMessages` | `ConstraintMessages` | — | Custom tooltip strings for disabled dates |
| `template` | `boolean` | `true` | Auto-render template when no `.rc-calendar` exists |

### Date Constraints

| Option | Type | Description |
|--------|------|-------------|
| `minDate` | `string` | Earliest selectable date (ISO) |
| `maxDate` | `string` | Latest selectable date (ISO) |
| `disabledDates` | `string[]` | Specific dates to disable (ISO) |
| `disabledDaysOfWeek` | `number[]` | Days of week to disable (0=Sun, 6=Sat) |
| `enabledDates` | `string[]` | Force-enable specific dates (overrides day-of-week rules) |
| `enabledDaysOfWeek` | `number[]` | Only these days are selectable |
| `disabledMonths` | `number[]` | Months to disable (1=Jan, 12=Dec) |
| `enabledMonths` | `number[]` | Only these months are selectable |
| `disabledYears` | `number[]` | Specific years to disable |
| `enabledYears` | `number[]` | Only these years are selectable |
| `minRange` | `number` | Minimum range length in days (inclusive) |
| `maxRange` | `number` | Maximum range length in days (inclusive) |
| `rules` | `CalendarConfigRule[]` | Period-specific constraint overrides |

### Period-Specific Rules

Override constraints for specific date ranges. First matching rule wins; unmatched dates use global constraints.

```html
<div x-data="calendar({
  mode: 'range',
  minRange: 3,
  rules: [
    {
      from: '2025-06-01',
      to: '2025-08-31',
      minRange: 7,
      disabledDaysOfWeek: [0, 6]
    }
  ]
})">
```

## Reactive State

These properties are available in templates via Alpine's reactivity:

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `string` | Current selection mode |
| `display` | `string` | `'inline'` or `'popup'` |
| `month` | `number` | Currently viewed month (1–12) |
| `year` | `number` | Currently viewed year |
| `view` | `string` | Current view: `'days'`, `'months'`, or `'years'` |
| `isOpen` | `boolean` | Whether popup is open |
| `grid` | `MonthGrid[]` | Day grid data for rendering |
| `monthGrid` | `MonthCell[][]` | Month picker grid |
| `yearGrid` | `YearCell[][]` | Year picker grid |
| `inputValue` | `string` | Formatted selected value |
| `focusedDate` | `CalendarDate \| null` | Keyboard-focused date |
| `hoverDate` | `CalendarDate \| null` | Mouse-hovered date (for range preview) |
| `wizardStep` | `number` | Current wizard step (0=off, 1–3) |
| `showWeekNumbers` | `boolean` | Whether week numbers are displayed |
| `presets` | `RangePreset[]` | Configured range presets |
| `isScrollable` | `boolean` | Whether the calendar uses scrollable layout (months >= 3) |

### Computed Getters

| Getter | Type | Description |
|--------|------|-------------|
| `selectedDates` | `CalendarDate[]` | Array of selected dates |
| `formattedValue` | `string` | Formatted display string |
| `hiddenInputValues` | `string[]` | ISO strings for hidden form inputs |
| `focusedDateISO` | `string` | ISO string of focused date (for `aria-activedescendant`) |
| `weekdayHeaders` | `string[]` | Localized weekday abbreviations |
| `yearLabel` | `string` | Current year as string |
| `decadeLabel` | `string` | Decade range label (e.g., "2024 – 2035") |
| `wizardStepLabel` | `string` | Current wizard step name |
| `canGoPrev` | `boolean` | Whether backward navigation is possible |
| `canGoNext` | `boolean` | Whether forward navigation is possible |

## Methods

### Navigation

| Method | Description |
|--------|-------------|
| `prev()` | Navigate to previous month/year/decade |
| `next()` | Navigate to next month/year/decade |
| `goToToday()` | Jump to current month |
| `goTo(year, month?)` | Navigate to specific year/month |
| `setView(view)` | Switch to `'days'`, `'months'`, or `'years'` |

### Selection

| Method | Description |
|--------|-------------|
| `selectDate(date)` | Select or toggle a date |
| `selectMonth(month)` | Select month in month picker |
| `selectYear(year)` | Select year in year picker |
| `clearSelection()` | Clear all selected dates |
| `isSelected(date)` | Check if date is selected |
| `isInRange(date, hover?)` | Check if date is within range |
| `isRangeStart(date)` | Check if date is range start |
| `isRangeEnd(date)` | Check if date is range end |
| `applyPreset(index)` | Apply a range preset by index |

### Programmatic Control

Access these via `$refs`:

```html
<div x-data="calendar({ ... })" x-ref="cal">
  <button @click="$refs.cal.setValue('2025-06-15')">Set Date</button>
  <button @click="$refs.cal.clear()">Clear</button>
</div>
```

| Method | Description |
|--------|-------------|
| `setValue(value)` | Set selection (ISO string, string[], or CalendarDate) |
| `clear()` | Clear selection |
| `goTo(year, month)` | Navigate without changing selection |
| `open()` / `close()` / `toggle()` | Popup lifecycle |
| `getSelection()` | Get current selection as `CalendarDate[]` |
| `updateConstraints(options)` | Update constraints at runtime |

### Template Helpers

| Method | Description |
|--------|-------------|
| `dayClasses(cell)` | CSS class object for day cells |
| `monthClasses(cell)` | CSS class object for month cells |
| `yearClasses(cell)` | CSS class object for year cells |
| `monthYearLabel(index)` | Formatted "Month Year" label for grid at index |
| `handleKeydown(event)` | Keyboard navigation handler |
| `handleFocus()` | Input focus handler (opens popup) |
| `handleBlur()` | Input blur handler (parses typed value) |

### Input Binding

| Method | Description |
|--------|-------------|
| `bindInput(el)` | Manually bind to an input element |
| `handleInput(event)` | For unbound inputs using `:value` + `@input` |

## Events

Listen with Alpine's `@` syntax on the calendar container:

```html
<div x-data="calendar({ ... })"
     @calendar:change="console.log($event.detail)"
     @calendar:navigate="console.log($event.detail)">
```

| Event | Detail | Description |
|-------|--------|-------------|
| `calendar:change` | `{ value, dates, formatted }` | Selection changed |
| `calendar:navigate` | `{ year, month, view }` | Month/year navigation |
| `calendar:open` | — | Popup opened |
| `calendar:close` | — | Popup closed |
| `calendar:view-change` | `{ view, year, month }` | View switched (days/months/years) |

## Keyboard Navigation

| Key | Action |
|-----|--------|
| Arrow keys | Move focus between days |
| Enter / Space | Select focused day |
| Page Down / Up | Next / previous month |
| Shift + Page Down / Up | Next / previous year |
| Home / End | First / last day of month |
| Escape | Close popup or return to day view |

## Theming

The calendar uses CSS custom properties for all visual styles. Override them in your CSS:

### With TailwindCSS 4

```css
@theme {
  --color-calendar-bg: var(--color-white);
  --color-calendar-text: var(--color-gray-900);
  --color-calendar-primary: var(--color-indigo-600);
  --color-calendar-primary-text: var(--color-white);
  --color-calendar-hover: var(--color-gray-100);
  --color-calendar-disabled: var(--color-gray-300);
  --color-calendar-range: var(--color-indigo-50);
  --color-calendar-today-ring: var(--color-indigo-400);
  --color-calendar-border: var(--color-gray-200);
  --color-calendar-other-month: var(--color-gray-400);
  --color-calendar-weekday: var(--color-gray-500);
  --color-calendar-focus-ring: var(--color-indigo-600);
  --color-calendar-overlay: oklch(0 0 0 / 0.2);
  --radius-calendar: var(--radius-lg);
  --shadow-calendar: var(--shadow-lg);
  --font-calendar: system-ui, -apple-system, sans-serif;
}
```

### Without Tailwind (plain CSS)

```css
:root {
  --color-calendar-primary: #4f46e5;
  --color-calendar-primary-text: #ffffff;
  --color-calendar-bg: #ffffff;
  --color-calendar-text: #111827;
  --color-calendar-hover: #f3f4f6;
  --color-calendar-range: #eef2ff;
  --color-calendar-today-ring: #818cf8;
  --color-calendar-disabled: #d1d5db;
  --color-calendar-border: #e5e7eb;
  --color-calendar-other-month: #9ca3af;
  --color-calendar-weekday: #6b7280;
  --color-calendar-focus-ring: #4f46e5;
  --color-calendar-overlay: rgba(0, 0, 0, 0.2);
  --radius-calendar: 0.5rem;
  --shadow-calendar: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  --font-calendar: system-ui, -apple-system, sans-serif;
}
```

### CSS Class Reference

All classes use the `.rc-` prefix:

| Class | Description |
|-------|-------------|
| `.rc-calendar` | Root container |
| `.rc-header` / `.rc-header__nav` / `.rc-header__label` | Navigation header |
| `.rc-weekdays` / `.rc-weekday` | Weekday header row |
| `.rc-grid` | Day grid container |
| `.rc-day` | Day cell |
| `.rc-day--today` | Today's date |
| `.rc-day--selected` | Selected date |
| `.rc-day--range-start` / `.rc-day--range-end` | Range endpoints |
| `.rc-day--in-range` | Dates within range |
| `.rc-day--disabled` | Disabled date |
| `.rc-day--other-month` | Leading/trailing days |
| `.rc-day--focused` | Keyboard-focused date |
| `.rc-month-grid` / `.rc-month` | Month picker |
| `.rc-year-grid` / `.rc-year` | Year picker |
| `.rc-months--dual` | Two-month side-by-side layout |
| `.rc-popup-overlay` | Popup backdrop |
| `.rc-popup-header` / `.rc-popup-header__close` | Popup close header bar |
| `.rc-calendar--wizard` | Wizard mode container |
| `.rc-row--week-numbers` / `.rc-week-number` | Week number row and cell |
| `.rc-grid--week-numbers` | Grid with week number column |
| `.rc-presets` / `.rc-preset` | Range preset container and buttons |
| `.rc-months--scroll` | Scrollable multi-month container |
| `.rc-header--scroll-sticky` | Sticky header in scrollable layout |
| `.rc-sr-only` | Screen reader only utility |

## Global Defaults

Set defaults that apply to every calendar instance:

```js
import { calendarPlugin } from '@reachweb/alpine-calendar'

calendarPlugin.defaults({ firstDay: 1, locale: 'el' })
Alpine.plugin(calendarPlugin)
```

Instance config overrides global defaults.

## Week Numbers

Display ISO 8601 week numbers alongside the day grid:

```html
<div x-data="calendar({ mode: 'single', showWeekNumbers: true, firstDay: 1 })"></div>
```

Week numbers appear in a narrow column to the left of each row.

## Range Presets

Add quick-select buttons for common date ranges. Works with `range` and `single` modes:

```html
<div x-data="calendar({
  mode: 'range',
  presets: [
    presetToday(),
    presetLastNDays(7),
    presetThisWeek(),
    presetThisMonth(),
    presetLastMonth()
  ]
})"></div>
```

Import the built-in factories:

```js
import {
  presetToday,
  presetYesterday,
  presetLastNDays,
  presetThisWeek,
  presetLastWeek,
  presetThisMonth,
  presetLastMonth,
  presetThisYear,
  presetLastYear,
} from '@reachweb/alpine-calendar'
```

All factories accept an optional `label` and `timezone` parameter. `presetThisWeek` and `presetLastWeek` also accept a `firstDay` (default: 1 = Monday).

Custom presets:

```js
const customPreset = {
  label: 'Next 30 Days',
  value: () => {
    const today = CalendarDate.today()
    return [today, today.addDays(29)]
  }
}
```

## Multi-Month Scrollable Layout

When `months` is 3 or more, the calendar renders as a vertically scrollable container instead of side-by-side panels:

```html
<div x-data="calendar({ mode: 'range', months: 6 })"></div>

<!-- Custom scroll height -->
<div x-data="calendar({ mode: 'range', months: 12, scrollHeight: 500 })"></div>
```

A sticky header tracks the currently visible month as you scroll. Default scroll height is 400px.

## Responsive Behavior

- **Mobile (<640px):** Popup renders as a centered fullscreen overlay. Touch-friendly targets (min 44px).
- **Desktop (>=640px):** Popup renders as a centered modal with scale-in animation.
- **Two months:** Side-by-side on desktop, stacked on mobile.
- **Scrollable (3+ months):** Smooth scroll with `-webkit-overflow-scrolling: touch`.
- **`prefers-reduced-motion`:** All animations are disabled.

## Accessibility

The calendar targets WCAG 2.1 AA compliance:

- Full keyboard navigation (arrow keys, Enter, Escape, Page Up/Down, Home/End)
- ARIA roles: `application`, `dialog`, `combobox`, `option`, `group`
- `aria-live="polite"` announcements for navigation and selection changes
- `aria-activedescendant` for focus management within the grid
- `aria-modal="true"` on popup overlays
- `aria-expanded`, `aria-selected`, `aria-disabled` on interactive elements
- `:focus-visible` outlines on all interactive elements
- Screen reader support via `.rc-sr-only` utility class
- Validated with axe-core (no critical or serious violations)

## Bundle Outputs

| File | Format | Size (gzip) | Use case |
|------|--------|-------------|----------|
| `alpine-calendar.es.js` | ESM | ~19KB | Bundler (`import`) |
| `alpine-calendar.umd.js` | UMD | ~12KB | Legacy (`require()`) |
| `alpine-calendar.cdn.js` | IIFE | ~12KB | CDN / `<script>` tag |
| `alpine-calendar.css` | CSS | ~4KB | All environments |

## TypeScript

Full type definitions are included. Key exports:

```ts
import {
  calendarPlugin,
  CalendarDate,
  getISOWeekNumber,
  SingleSelection,
  MultipleSelection,
  RangeSelection,
  createCalendarData,
  parseDate,
  formatDate,
  createMask,
  computePosition,
  autoUpdate,
  generateMonth,
  generateMonths,
  generateMonthGrid,
  generateYearGrid,
  createDateConstraint,
  createRangeValidator,
  createDisabledReasons,
  isDateDisabled,
  presetToday,
  presetYesterday,
  presetLastNDays,
  presetThisWeek,
  presetLastWeek,
  presetThisMonth,
  presetLastMonth,
  presetThisYear,
  presetLastYear,
} from '@reachweb/alpine-calendar'

import type {
  CalendarConfig,
  CalendarConfigRule,
  RangePreset,
  DayCell,
  MonthCell,
  YearCell,
  Selection,
  Placement,
  PositionOptions,
  DateConstraintOptions,
  DateConstraintProperties,
  DateConstraintRule,
  ConstraintMessages,
  InputMask,
  MaskEventHandlers,
} from '@reachweb/alpine-calendar'
```

## Livewire Integration

```php
@push('styles')
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@reachweb/alpine-calendar/dist/alpine-calendar.css">
@endpush
@push('scripts')
  <script src="https://cdn.jsdelivr.net/npm/@reachweb/alpine-calendar/dist/alpine-calendar.cdn.js"></script>
@endpush
```

Use `wire:ignore` on the calendar container to prevent Livewire from morphing it:

```html
<div wire:ignore>
  <div x-data="calendar({ mode: 'single', display: 'popup' })"
       @calendar:change="$wire.set('date', $event.detail.value)">
    <input x-ref="rc-input" type="text" class="rc-input">
  </div>
</div>
```

## Development

```bash
pnpm install          # Install dependencies
pnpm dev              # Start dev server with demo
pnpm test             # Run tests
pnpm test:watch       # Run tests in watch mode
pnpm test:coverage    # Run tests with coverage report
pnpm typecheck        # Type-check without emitting
pnpm lint             # Lint source files
pnpm lint:fix         # Lint and auto-fix
pnpm format           # Format source files with Prettier
pnpm build            # Build all bundles (ESM + UMD + CDN + CSS + types)
pnpm build:lib        # Build ESM + UMD only
pnpm build:cdn        # Build CDN/IIFE bundle only
```

Before a release, run the full verification chain:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

## License

MIT
