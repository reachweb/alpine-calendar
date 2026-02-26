# Reach Calendar

A lightweight, AlpineJS-native calendar component with inline/popup display, input binding with masking, single/multiple/range selection, month/year pickers, birth-date wizard, TailwindCSS 4 theming, and timezone-safe date handling.

**Zero runtime dependencies.** Alpine.js is a peer dependency — not bundled.

## Installation

### npm / pnpm

```bash
pnpm add @reachgr/alpine-calendar
# or
npm install @reachgr/alpine-calendar
```

```js
import Alpine from 'alpinejs'
import { calendarPlugin } from '@reachgr/alpine-calendar'
import '@reachgr/alpine-calendar/css'

Alpine.plugin(calendarPlugin)
Alpine.start()
```

### CDN (no bundler)

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.css">
<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.cdn.js"></script>
```

The CDN build auto-registers via `alpine:init` — no manual setup needed. Works with Livewire, Statamic, or any server-rendered HTML.

## Quick Start

### Inline Single Date

```html
<div x-data="calendar({ mode: 'single', firstDay: 1 })">
  <div class="rc-calendar" @keydown="handleKeydown($event)" tabindex="0" role="application">
    <template x-if="view === 'days'">
      <div class="rc-months">
        <template x-for="(mg, gi) in grid" :key="mg.year + '-' + mg.month">
          <div>
            <div class="rc-header">
              <button class="rc-header__nav" @click="prev()">&#8249;</button>
              <span class="rc-header__label" @click="setView('months')" x-text="monthYearLabel(gi)"></span>
              <button class="rc-header__nav" @click="next()">&#8250;</button>
            </div>
            <div class="rc-weekdays">
              <template x-for="wd in weekdayHeaders" :key="wd">
                <span class="rc-weekday" x-text="wd"></span>
              </template>
            </div>
            <div class="rc-grid" role="grid">
              <template x-for="cell in mg.rows.flat()" :key="cell.date.toISO()">
                <div :class="dayClasses(cell)"
                     :aria-selected="isSelected(cell.date)"
                     :aria-disabled="cell.isDisabled"
                     role="gridcell"
                     @click="!cell.isDisabled && selectDate(cell.date)"
                     @mouseenter="hoverDate = cell.date"
                     @mouseleave="hoverDate = null"
                     x-text="cell.date.day">
                </div>
              </template>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
  <p>Selected: <span x-text="formattedValue || 'none'"></span></p>
</div>
```

### Popup with Input Masking

```html
<div x-data="calendar({ mode: 'single', display: 'popup', mask: true })">
  <input x-ref="input" type="text"
         @focus="handleFocus()"
         @blur="handleBlur()">

  <div x-ref="popup" x-show="isOpen" :style="popupStyle"
       class="rc-popup-overlay" @click.self="close()">
    <div class="rc-calendar" @keydown="handleKeydown($event)" tabindex="0">
      <!-- same calendar template as above -->
    </div>
  </div>
</div>
```

### Range Selection (2-Month)

```html
<div x-data="calendar({ mode: 'range', months: 2, firstDay: 1 })">
  <div class="rc-calendar" @keydown="handleKeydown($event)" tabindex="0">
    <template x-if="view === 'days'">
      <div class="rc-months" :class="{ 'rc-months--dual': monthCount === 2 }">
        <template x-for="(mg, gi) in grid" :key="mg.year + '-' + mg.month">
          <div>
            <div class="rc-header">
              <button class="rc-header__nav" @click="prev()"
                      :style="gi > 0 ? 'visibility:hidden' : ''">&#8249;</button>
              <span class="rc-header__label" x-text="monthYearLabel(gi)"></span>
              <button class="rc-header__nav" @click="next()"
                      :style="gi < grid.length - 1 ? 'visibility:hidden' : ''">&#8250;</button>
            </div>
            <!-- weekdays + grid same as single -->
          </div>
        </template>
      </div>
    </template>
  </div>
</div>
```

### Multiple Date Selection

```html
<div x-data="calendar({ mode: 'multiple' })">
  <!-- same template structure -->
  <p x-text="selectedDates.length + ' dates selected'"></p>
</div>
```

### Birth Date Wizard

```html
<div x-data="calendar({ mode: 'single', wizard: true })">
  <div class="rc-calendar rc-calendar--wizard">
    <div class="rc-wizard-steps">
      <template x-for="s in wizardTotalSteps" :key="s">
        <span :class="{ 'active': wizardStep >= s }"></span>
      </template>
    </div>
    <span class="rc-wizard-label" x-text="wizardStepLabel"></span>
    <button class="rc-wizard-back" x-show="wizardStep > 1" @click="wizardBack()">Back</button>

    <!-- Year view (step 1) -->
    <template x-if="view === 'years'">
      <!-- year grid template -->
    </template>

    <!-- Month view (step 2) -->
    <template x-if="view === 'months'">
      <!-- month grid template -->
    </template>

    <!-- Day view (step 3) -->
    <template x-if="view === 'days'">
      <!-- day grid template -->
    </template>
  </div>
</div>
```

Wizard modes: `true` (or `'full'`) for Year → Month → Day, `'year-month'` for Year → Month, `'month-day'` for Month → Day.

## Configuration

All options are passed via `x-data="calendar({ ... })"`.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `mode` | `'single' \| 'multiple' \| 'range'` | `'single'` | Selection mode |
| `display` | `'inline' \| 'popup'` | `'inline'` | Inline calendar or popup with input |
| `format` | `string` | `'DD/MM/YYYY'` | Date format (tokens: `DD`, `MM`, `YYYY`, `D`, `M`, `YY`) |
| `months` | `1 \| 2` | `1` | Number of months to display side-by-side |
| `firstDay` | `0–6` | `0` | First day of week (0=Sun, 1=Mon, ...) |
| `mask` | `boolean` | `true` | Enable input masking |
| `value` | `string` | — | Initial value (ISO or formatted string) |
| `name` | `string` | `''` | Input name attribute for form submission |
| `locale` | `string` | — | BCP 47 locale for month/day names |
| `timezone` | `string` | — | IANA timezone for resolving "today" |
| `placement` | `Placement` | `'bottom-start'` | Popup position (`bottom-start`, `bottom-end`, `top-start`, `top-end`) |
| `popupOffset` | `number` | `4` | Popup offset in pixels |
| `closeOnSelect` | `boolean` | `true` | Close popup after selection |
| `wizard` | `boolean \| 'year-month' \| 'month-day'` | `false` | Birth date wizard mode |
| `beforeSelect` | `(date, ctx) => boolean` | — | Custom validation before selection |

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

All classes use the `.rc-` prefix (BEM-like):

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
| `.rc-calendar--wizard` | Wizard mode container |

## Global Defaults

Set defaults that apply to every calendar instance:

```js
import { calendarPlugin } from '@reachgr/alpine-calendar'

calendarPlugin.defaults({ firstDay: 1, locale: 'el' })
Alpine.plugin(calendarPlugin)
```

Instance config overrides global defaults.

## Responsive Behavior

- **Mobile (<640px):** Popup renders as a bottom sheet with overlay. Touch-friendly targets (min 44px).
- **Desktop (>=640px):** Popup uses floating positioning with auto-flip.
- **Two months:** Side-by-side on desktop, stacked on mobile.
- **`prefers-reduced-motion`:** All animations are disabled.

## Bundle Outputs

| File | Format | Size (gzip) | Use case |
|------|--------|-------------|----------|
| `alpine-calendar.es.js` | ESM | ~16KB | Bundler (`import`) |
| `alpine-calendar.umd.js` | UMD | ~9KB | Legacy (`require()`) |
| `alpine-calendar.cdn.js` | IIFE | ~9KB | CDN / `<script>` tag |
| `alpine-calendar.css` | CSS | ~4KB | All environments |

## TypeScript

Full type definitions are included. Key exports:

```ts
import {
  calendarPlugin,
  CalendarDate,
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
} from '@reachgr/alpine-calendar'

import type {
  CalendarConfig,
  CalendarConfigRule,
  DayCell,
  MonthCell,
  YearCell,
  Selection,
  Placement,
  PositionOptions,
  DateConstraintOptions,
  DateConstraintRule,
  InputMask,
  MaskEventHandlers,
} from '@reachgr/alpine-calendar'
```

## Livewire Integration

```php
@push('styles')
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.css">
@endpush
@push('scripts')
  <script src="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.cdn.js"></script>
@endpush
```

Use `wire:ignore` on the calendar container to prevent Livewire from morphing it:

```html
<div wire:ignore>
  <div x-data="calendar({ mode: 'single', display: 'popup' })"
       @calendar:change="$wire.set('date', $event.detail.value)">
    <!-- calendar template -->
  </div>
</div>
```

## License

MIT
