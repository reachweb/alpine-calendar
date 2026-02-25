# Reach Calendar — Task Plan

## Project Overview

A lightweight, AlpineJS-native calendar component with inline/popup display, input binding with masking, single/multiple/range selection, month/year pickers, birth-date wizard, TailwindCSS 4 theming, and timezone-safe date handling.

This file is a development task list for Reach Calendar. Each task is designed to be completed independently in order.

**Legend:**
- `[ ]` - Not started
- `[x]` - Completed
- `[~]` - In progress
- `[!]` - Blocked

**How to use this file:**
1. Find the next uncompleted task (marked with `[ ]`)
2. Read the task description, files involved, and acceptance criteria
3. Complete the task
4. Mark it as `[x]` when done
5. Run the verification step if one is listed
6. Move to the next task

**Rules:**
- Complete tasks in order unless noted otherwise (some tasks can run in parallel)
- Run `vendor/bin/pint` after code changes
- Run `composer test:stop` after each task to catch regressions early
- Do NOT modify files outside the task's scope unless absolutely necessary
- Refer to existing code patterns (sibling files, similar models/controllers/tests) for conventions

---

## Phase 0: Project Setup & Tooling

Get the repo, build pipeline, and dev environment ready before writing any feature code.

### 0.1 Repository & Structure
- [x] Initialize git repo
- [x] Define folder structure:
  ```
  alpine-calendar/
  ├── src/
  │   ├── core/           # Date engine, grid, selection models
  │   ├── input/           # Parser, mask, formatter
  │   ├── plugin/          # Alpine plugin entry, component registration
  │   ├── views/           # Day/month/year/wizard view logic
  │   ├── positioning/     # Popup positioning utils
  │   ├── types/           # Shared TypeScript types & interfaces
  │   ├── index.ts         # Main entry point (exports plugin + utilities)
  │   └── cdn.ts           # CDN entry point (auto-registers via alpine:init)
  ├── styles/
  │   └── calendar.css     # Tailwind @theme definitions & base styles
  ├── tests/
  │   ├── unit/
  │   └── integration/
  ├── demo/                # Dev playground / visual test page
  │   └── index.html
  ├── dist/                # Build output (gitignored)
  ├── tsconfig.json
  ├── vite.config.ts
  ├── tailwind.config.ts   # (if needed — TW4 may use CSS-only config)
  ├── eslint.config.js
  ├── .prettierrc
  ├── package.json
  └── README.md
  ```
- [x] Create `.gitignore` (node_modules, dist, .DS_Store, coverage, etc.)
- [x] Create `.editorconfig` for consistent formatting across editors

### 0.2 Package Manager & package.json
- [x] Initialize with `pnpm init` (pnpm for speed & disk efficiency)
- [x] Define `package.json` fields:
  - `name`: `@reachgr/alpine-calendar` (or chosen scope)
  - `version`: `0.1.0`
  - `type`: `"module"`
  - `main`: `dist/alpine-calendar.umd.js`
  - `module`: `dist/alpine-calendar.es.js`
  - `types`: `dist/index.d.ts`
  - `exports`: dual ESM/CJS map
  - `files`: `["dist"]`
  - `peerDependencies`: `{ "alpinejs": "^3.0.0" }`
  - `sideEffects`: `["*.css"]`
- [x] Add npm scripts:
  ```json
  {
    "dev": "vite",
    "build": "vite build && tsc --emitDeclarationOnly",
    "preview": "vite preview",
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write 'src/**/*.{ts,css}'",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm run build"
  }
  ```

### 0.3 TypeScript
- [x] Install: `typescript` (^5.5+)
- [x] Configure `tsconfig.json`:
  ```jsonc
  {
    "compilerOptions": {
      "target": "ES2020",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "strict": true,
      "noUncheckedIndexedAccess": true,
      "exactOptionalPropertyTypes": false,
      "declaration": true,
      "declarationDir": "dist",
      "outDir": "dist",
      "sourceMap": true,
      "esModuleInterop": true,
      "skipLibCheck": true,
      "forceConsistentCasingInFileNames": true,
      "lib": ["ES2020", "DOM", "DOM.Iterable"],
      "types": ["alpinejs"]
    },
    "include": ["src"],
    "exclude": ["node_modules", "dist", "tests", "demo"]
  }
  ```
- [x] Install Alpine type definitions: `@types/alpinejs`

### 0.4 Build Tool — Vite
- [x] Install: `vite` (^6+)
- [x] Configure `vite.config.ts` in library mode with **two build passes**:
  ```ts
  // Build 1: ESM + UMD for bundler consumers
  // Entry: src/index.ts → exports plugin function
  // Externals: alpinejs

  // Build 2: IIFE for CDN / no-build consumers
  // Entry: src/cdn.ts → self-registers via alpine:init
  // Externals: none bundled, reads window.Alpine
  ```
- [x] Add npm scripts for both builds:
  ```json
  {
    "build": "pnpm build:lib && pnpm build:cdn && tsc --emitDeclarationOnly",
    "build:lib": "vite build --config vite.config.lib.ts",
    "build:cdn": "vite build --config vite.config.cdn.ts"
  }
  ```
- [x] Verify build output produces ESM, UMD, and IIFE bundles + extracted CSS
- [x] Verify the CDN IIFE bundle does NOT include Alpine (should be ~8KB, not ~40KB)
- [x] Set up dev server with demo page (hot reload)

### 0.5 Linting — ESLint
- [x] Install: `eslint` (^9+, flat config), `@eslint/js`, `typescript-eslint`
- [x] Configure `eslint.config.js` (flat config format):
  ```js
  import js from '@eslint/js'
  import tseslint from 'typescript-eslint'

  export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.strict,
    ...tseslint.configs.stylistic,
    {
      rules: {
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/consistent-type-imports': 'error',
      },
    },
    { ignores: ['dist/', 'demo/', 'coverage/'] },
  )
  ```

### 0.6 Formatting — Prettier
- [x] Install: `prettier`
- [x] Configure `.prettierrc`:
  ```json
  {
    "semi": false,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
  }
  ```
- [x] Add `.prettierignore`: `dist`, `coverage`, `pnpm-lock.yaml`
- [x] Optionally install `eslint-config-prettier` to avoid rule conflicts

### 0.7 Testing — Vitest
- [x] Install: `vitest`, `@vitest/coverage-v8`
- [x] Configure in `vite.config.ts` (or separate `vitest.config.ts`):
  ```ts
  test: {
    globals: true,
    environment: 'jsdom',     // needed for DOM/Alpine integration tests
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      thresholds: { statements: 80, branches: 80 },
    },
  }
  ```
- [x] Install `jsdom` for DOM simulation in tests
- [x] Write a smoke test (`tests/unit/smoke.test.ts`) to verify the pipeline works
- [ ] Optionally install `@testing-library/dom` for integration tests later (deferred)

### 0.8 TailwindCSS 4
- [x] Install: `tailwindcss` (^4+), `@tailwindcss/vite`
- [x] Add Tailwind Vite plugin to `vite.config.ts`
- [x] Create `styles/calendar.css` with:
  - `@import "tailwindcss"` (TW4 CSS-first approach)
  - `@theme { }` block with all calendar CSS variables (stubs for now)
- [x] Verify Tailwind processes the component's utility classes in `src/` and `demo/`
- [x] Note: TW4 uses CSS-native `@theme` — no `tailwind.config.ts` needed unless extending beyond CSS

### 0.9 Dev Playground
- [x] Create `demo/index.html` with:
  - Alpine.js loaded via CDN (`<script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js">`)
  - Local build imported (`<script type="module" src="../src/index.ts">`)
  - Tailwind styles loaded
  - Several example instances: inline, popup, range, wizard
- [x] Verify hot reload works for both TS and CSS changes
- [x] This serves as the visual test bed throughout development

### 0.10 CI / Pre-commit (Optional but Recommended)
- [x] Set up a git pre-commit hook via `simple-git-hooks` + `lint-staged`:
  - On commit: run `eslint --fix` and `prettier --write` on staged files
- [x] Install: `simple-git-hooks`, `lint-staged`
- [x] Configure in `package.json`:
  ```json
  {
    "simple-git-hooks": {
      "pre-commit": "pnpm lint-staged"
    },
    "lint-staged": {
      "*.ts": ["eslint --fix", "prettier --write"],
      "*.css": ["prettier --write"]
    }
  }
  ```
- [ ] Optionally add a GitHub Actions workflow later for CI (build + test + lint) (deferred)

### 0.11 Dependencies Summary

| Package | Purpose | Dev/Prod |
|---------|---------|----------|
| `alpinejs` | Peer dependency (not bundled) | peer |
| `typescript` ^5.5 | Type checking & declarations | dev |
| `@types/alpinejs` | Alpine type definitions | dev |
| `vite` ^6 | Build & dev server | dev |
| `terser` | Minification (Vite uses it) | dev |
| `tailwindcss` ^4 | Utility CSS & theming | dev |
| `@tailwindcss/vite` | TW4 Vite integration | dev |
| `eslint` ^9 | Linting | dev |
| `@eslint/js` | ESLint base config | dev |
| `typescript-eslint` | TS ESLint rules | dev |
| `prettier` | Code formatting | dev |
| `eslint-config-prettier` | Disable conflicting rules | dev |
| `vitest` | Testing framework | dev |
| `@vitest/coverage-v8` | Coverage reports | dev |
| `jsdom` | DOM env for tests | dev |
| `simple-git-hooks` | Pre-commit hooks | dev |
| `lint-staged` | Run tools on staged files | dev |

**Runtime dependencies: zero.** Everything ships as a single self-contained bundle + CSS file.

---

## Phase 1: Core Date Engine

The foundation — a pure JS date utility layer with zero UI. Everything else builds on this.

### 1.1 Timezone-Safe Date Primitives
- [x] Create a `CalendarDate` value object that wraps year/month/day as plain integers (no `Date` object internally for storage)
- [x] Implement `CalendarDate.today(timezone?)` that resolves "today" in a given IANA timezone (fallback: browser timezone)
- [x] Implement comparison helpers: `isSame()`, `isBefore()`, `isAfter()`, `isBetween()`
- [x] Implement arithmetic: `addDays()`, `addMonths()`, `addYears()`, `startOfMonth()`, `endOfMonth()`
- [x] Write conversion: `toNativeDate()`, `fromNativeDate(date, timezone?)` — the **only** place we touch `Date`/`Intl.DateTimeFormat`
- [x] Add `format(pattern, locale?)` using `Intl.DateTimeFormat` for display strings
- [x] Unit tests for DST edge cases (e.g., March 31 + 1 month = April 30, midnight UTC vs UTC+2)

### 1.2 Calendar Grid Generator
- [x] `generateMonth(year, month, firstDayOfWeek)` → returns a 2D array of `CalendarDate` (6 rows × 7 cols), including leading/trailing days from adjacent months
- [x] `generateMonths(year, month, count, firstDayOfWeek)` → generates `count` consecutive months (for 1- or 2-month view)
- [x] Support configurable `firstDayOfWeek` (0 = Sunday, 1 = Monday, etc.)
- [x] Mark each cell with metadata: `{ date, isCurrentMonth, isToday, isDisabled }`

### 1.3 Selection Models
- [x] `SingleSelection` — stores one `CalendarDate | null`
- [x] `MultipleSelection` — stores a `Set<string>` of date keys (YYYY-MM-DD)
- [x] `RangeSelection` — stores `{ start, end }`, handles partial state (only start selected)
- [x] Each model exposes: `isSelected(date)`, `toggle(date)`, `clear()`, `toArray()`, `toValue()` (serialized string)
- [x] `RangeSelection` hover preview: `isInRange(date, hoverDate?)` for visual feedback

### 1.4 Date Constraints
- [x] `minDate` / `maxDate` boundaries
- [x] `disabledDates: CalendarDate[]` — specific disabled dates
- [x] `disabledDaysOfWeek: number[]` — e.g., `[0, 6]` to disable weekends
- [x] `isDateDisabled(date)` — single function that checks all constraints

### 1.5 Advanced Date Constraints
- [x] `CalendarDate.diffDays(other)` — timezone-safe day difference calculation using UTC
- [x] `enabledDates: CalendarDate[]` — force-enable specific dates (overrides disabledDates/disabledDaysOfWeek but NOT minDate/maxDate)
- [x] `enabledDaysOfWeek: number[]` — weekday whitelist (only these days are selectable; all others disabled)
- [x] `enabledDates` + `enabledDaysOfWeek` interaction: enabledDates can override enabledDaysOfWeek for specific dates
- [x] `disabledDates` still applies on top of enabledDaysOfWeek (further blacklisting whitelisted days)
- [x] `minRange: number` — minimum range length in days (inclusive count); rejects range completion if too short
- [x] `maxRange: number` — maximum range length in days (inclusive count); rejects range completion if too long
- [x] `createRangeValidator(options)` — factory that returns `(start, end) => boolean` for range validation
- [x] Range validation integrated into `selectDate()` — when completing a range, validates before toggling
- [x] Range validation handles start/end swap correctly (when user clicks before start)
- [x] Clicking start to deselect bypasses range validation (intentional: deselection always works)

### 1.6 Period-Specific Constraint Rules
- [x] `DateConstraintRule` interface — extends `DateConstraintProperties` with `from`/`to` period
- [x] `DateConstraintOptions.rules: DateConstraintRule[]` — array of period-specific overrides
- [x] First matching rule wins when a date falls in `[rule.from, rule.to]`
- [x] Rule properties override global defaults; unset properties inherit from global
- [x] Rules support all constraint properties: minDate, maxDate, disabledDates, disabledDaysOfWeek, enabledDates, enabledDaysOfWeek, minRange, maxRange
- [x] Range validation uses start date to determine applicable rule
- [x] `CalendarConfig.rules` accepts string-based rules (ISO dates) for Alpine/HTML compatibility
- [x] Invalid rule dates (unparseable ISO strings) are silently skipped
- [x] Pre-computed Sets per rule for O(1) lookups (disabledKeys, disabledDays, enabledKeys, enabledDays)
- [x] Fast path: when no rules are configured, constraint checking skips rule resolution
- [x] All new types exported from index.ts: `DateConstraintProperties`, `DateConstraintRule`, `CalendarConfigRule`, `createRangeValidator`
- [x] Comprehensive test coverage: 570 total tests passing (61 constraint tests, 151 component tests, 21 popup tests)

---

## Phase 2: Input Parsing & Masking

Handle user-typed dates and enforce format via masking.

### 2.1 Date Parser
- [x] Define supported format tokens: `DD`, `MM`, `YYYY`, `D`, `M`, `YY`
- [x] Build `parseDate(input, format)` → `CalendarDate | null` with lenient parsing (e.g., `1/3/2025` matches `DD/MM/YYYY`)
- [x] Support common separators: `/`, `-`, `.`
- [x] Validate parsed result (reject Feb 30, etc.)
- [x] For range mode, parse two dates from one input (e.g., `01/01/2025 - 07/01/2025`)
- [x] For multiple mode, parse comma-separated dates

### 2.2 Input Mask
- [x] Implement a lightweight input mask engine (no dependencies)
- [x] Map format string to mask pattern: `DD/MM/YYYY` → `99/99/9999` (where `9` = digit)
- [x] Handle cursor position correctly on insert, delete, and backspace
- [x] Auto-insert separator characters as user types
- [x] Prevent invalid characters (non-digits in date slots)
- [x] Expose as a standalone function `createMask(format)` → returns handlers for `input`, `keydown`, `paste` events
- [x] Optional: allow mask to be disabled (free-text mode with parse-on-blur — consumer simply doesn't call `attachMask`)

### 2.3 Format & Display
- [x] `formatDate(date, format, locale?)` — format a `CalendarDate` to display string
- [x] `formatRange(start, end, format)` — smart range formatting (e.g., `Jan 1 – 7, 2025` when same month)
- [x] `formatMultiple(dates, format)` — comma-separated or count-based (`3 dates selected`)

---

## Phase 3: Alpine.js Integration

Wire everything into Alpine as a reusable plugin/component.

### 3.1 Plugin Architecture
- [x] Create `alpine-calendar.js` as an Alpine plugin: `Alpine.plugin(calendarPlugin)`
- [x] Register `x-data` component via `Alpine.data('calendar', (config) => { ... })`
- [x] Decide config surface — everything via `x-data` props:
  ```html
  <div x-data="calendar({
    mode: 'single',        // 'single' | 'multiple' | 'range'
    display: 'inline',     // 'inline' | 'popup'
    format: 'DD/MM/YYYY',
    months: 1,             // 1 or 2
    firstDay: 1,
    minDate: '2020-01-01',
    maxDate: '2030-12-31',
    wizard: false,         // birth-date wizard mode
    mask: true,
    timezone: 'Europe/Athens',
    locale: 'el',
  })">
  ```
- [x] Expose reactive state: `month`, `year`, `grid`, `selection`, `view` (days/months/years)
- [x] Expose methods: `prev()`, `next()`, `selectDate(date)`, `goToToday()`, `open()`, `close()`, `toggle()`
- [x] Dispatch custom events: `x-on:calendar:change`, `x-on:calendar:open`, `x-on:calendar:close`

### 3.1b Auto-Registration for CDN / No-Build Environments
- [x] Create a separate entry point `src/cdn.ts` that auto-registers the plugin:
  ```ts
  import calendarPlugin from './plugin'

  // Auto-register if Alpine is already loaded (e.g., user loaded Alpine via CDN before this script)
  if (window.Alpine) {
    window.Alpine.plugin(calendarPlugin)
  }

  // Also listen for alpine:init in case Alpine loads after this script
  // (this is how Livewire v3 works — it fires alpine:init during boot)
  document.addEventListener('alpine:init', () => {
    window.Alpine.plugin(calendarPlugin)
  })
  ```
- [x] The CDN build must be a self-contained IIFE — Alpine is NOT bundled in, it reads `window.Alpine`
- [x] Ensure the plugin is idempotent (safe to register twice if both paths fire)
- [x] CSS must also work standalone — either inline or via separate CDN link:
  ```html
  <!-- Livewire / no-build usage -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.css">
  <script src="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.cdn.js"></script>
  <!-- That's it. No import, no init, no bundler. -->
  ```
- [x] Test the full lifecycle order: script loads → `alpine:init` fires → plugin registers → `Alpine.start()` → components work

### 3.2 Input Binding
- [x] Bind to an `<input>` via `x-ref="input"` approach — auto-binds during `init()` via `$nextTick`
- [x] On input focus (popup mode): open calendar via `handleFocus()`
- [x] On input blur: parse typed value → update selection → reformat input via `handleBlur()`
- [x] On selection change in calendar: update input value via `_syncInputFromSelection()`
- [x] Two-way sync: `inputValue` reactive property stays in sync with selection; `bindInput()` syncs DOM input
- [x] Support `name` attribute pass-through for form submission via `inputName` config
- [x] Hidden input fallback for range/multiple via `hiddenInputValues` getter (ISO strings)
- [x] `bindInput(el)` — attaches mask (if enabled), syncs value, sets placeholder, adds input listener
- [x] `handleInput(e)` — for unbound inputs using `:value` + `@input`
- [x] `destroy()` — cleans up mask listeners and input reference
- [x] `_emitChange()` — centralized `calendar:change` event dispatch with `{ value, dates, formatted }`
- [x] Comprehensive test coverage: 539 total tests passing (54 input binding tests)

### 3.3 Popup Positioning
- [x] Implement lightweight popup positioning in `src/positioning/popup.ts` (no Floating UI dependency)
- [x] Default: below-start, flip to above if no space
- [x] Use `position: fixed` + manual coordinate calc from `getBoundingClientRect()`
- [x] Close on Escape key via `handleKeydown()` — returns focus to input element
- [x] Close on outside click: documented via Alpine's `@click.outside` directive (template-level)
- [x] Handle scroll/resize repositioning via `autoUpdate()` with rAF throttling
- [x] `computePosition(reference, floating, options)` — calculates x/y/placement with flip logic
- [x] `autoUpdate(reference, update, throttleMs)` — subscribes to scroll/resize on all scrollable ancestors, returns cleanup fn
- [x] Horizontal clamping to viewport boundaries
- [x] `popupStyle` reactive property for inline CSS (`position:fixed;left:Xpx;top:Ypx;z-index:50;`)
- [x] Config: `placement` (bottom-start/bottom-end/top-start/top-end), `popupOffset` (px gap)
- [x] `_startPositioning()` / `_stopPositioning()` internal lifecycle methods
- [x] Auto-bind to `x-ref="popup"` for popup element discovery
- [x] Proper cleanup in `destroy()` and `close()`
- [x] All types exported from index.ts: `Placement`, `PositionOptions`, `PositionResult`
- [x] Comprehensive test coverage: 570 total tests (21 popup positioning, 10 component popup integration)

### 3.4 Keyboard Navigation
- [x] Arrow keys: move focus between days (±1 day horizontal, ±7 days vertical), auto-navigates months at boundaries, skips disabled dates
- [x] Enter/Space: select focused day (only when focus is established; no-op when focusedDate is null)
- [x] Page Up/Down: prev/next month; Shift+Page Up/Down: prev/next year; clamps day to valid range
- [x] Home/End: first/last day of current month view
- [x] Escape: return to day view from month/year picker; close popup (if popup mode) and return focus to input
- [x] Tab: natural tab order — calendar grid uses `aria-activedescendant` pattern (container holds focus)
- [x] Manage `aria-activedescendant`: `focusedDateISO` getter drives `aria-activedescendant` attribute; day cells use `id="day-{ISO}"`
- [x] Comprehensive test coverage: 610 total tests passing (40 keyboard navigation tests)

---

## Phase 4: Views & Navigation

### 4.1 Day View (Default)
- [x] Render month grid(s) with day cells
- [x] Highlight: today, selected, range-start, range-end, in-range, disabled, other-month
- [x] Navigation: prev/next month, click month/year label to switch view
- [x] 2-month layout: side-by-side on desktop, stacked on mobile
- [x] Animate month transition (CSS-only, `translate` left/right based on direction)

### 4.2 Month View
- [x] Show 12-month grid for the current year (4×3 `MonthCell` grid via `generateMonthGrid()`)
- [x] Clicking a month enters day view for that month (`selectMonth()`)
- [ ] Can also be used as standalone month picker (`mode: 'month'`?) (deferred to post-MVP)
- [x] Highlight current month, disable months outside min/max range (`monthClasses()`, `isMonthDisabled()`)
- [x] Navigation: prev/next year (`prev()`/`next()` in months view navigate years)
- [x] `MonthCell` interface and `generateMonthGrid()` in `src/core/grid.ts`
- [x] `monthGrid` reactive state, `_rebuildMonthGrid()`, `monthClasses()`, `yearLabel` getter in component
- [x] CSS styles: `.rc-month-grid`, `.rc-month`, `.rc-month--current`, `.rc-month--selected`, `.rc-month--disabled`
- [x] Demo page updated with month view template (x-if="view === 'months'")
- [x] Comprehensive test coverage: 681 total tests passing (33 month view tests)

### 4.3 Year View
- [ ] Show a grid/list of years (e.g., 12 years at a time)
- [ ] Clicking a year enters month view for that year
- [ ] Navigation: prev/next decade
- [ ] Highlight current year

### 4.4 Birth Date Wizard
- [ ] Three-step flow: **Year → Month → Day**
- [ ] Year step: show a scrollable year grid, default centered around ~30 years ago
- [ ] Month step: show 12-month grid for selected year
- [ ] Day step: show standard day grid for selected year/month
- [ ] Each step auto-advances on selection
- [ ] Back button to return to previous step
- [ ] Optimize for mobile UX (large touch targets)

---

## Phase 5: Styling & Theming

### 5.1 TailwindCSS 4 Integration
- [ ] Define all visual properties via `@theme` in a `calendar.css` file:
  ```css
  @theme {
    --color-calendar-bg: var(--color-white);
    --color-calendar-text: var(--color-gray-900);
    --color-calendar-primary: var(--color-blue-600);
    --color-calendar-primary-text: var(--color-white);
    --color-calendar-hover: var(--color-gray-100);
    --color-calendar-disabled: var(--color-gray-300);
    --color-calendar-range: var(--color-blue-50);
    --color-calendar-today-ring: var(--color-blue-400);
    --color-calendar-border: var(--color-gray-200);
    --radius-calendar: var(--radius-lg);
    --shadow-calendar: var(--shadow-lg);
    /* ... */
  }
  ```
- [ ] Use only Tailwind utility classes + these theme variables in the component markup
- [ ] No hardcoded colors anywhere — everything via `--color-calendar-*`
- [ ] Document how to override theme variables in user's own CSS

### 5.2 Responsive Design
- [ ] Single month: works from 280px wide (mobile-first)
- [ ] Two months: side-by-side above `640px`, stacked below
- [ ] Popup: full-width bottom sheet on mobile (`< 640px`), floating dropdown on desktop
- [ ] Touch-friendly: minimum 44px tap targets for day cells on mobile
- [ ] Use container queries if beneficial, otherwise media queries

### 5.3 Transitions & Polish
- [ ] Fade in/out for popup open/close (Alpine `x-transition`)
- [ ] Slide left/right for month navigation
- [ ] View switch animation (days → months → years)
- [ ] Keep transitions under 200ms, respect `prefers-reduced-motion`

---

## Phase 6: Developer API & Distribution

### 6.1 Configuration API
- [ ] Document all config options with types and defaults
- [ ] Support setting global defaults: `CalendarPlugin.defaults({ firstDay: 1, locale: 'el' })`
- [ ] Allow runtime config changes that reactively update the calendar
- [ ] Validate config on init, warn on invalid combinations

### 6.2 Events & Callbacks
- [ ] `@calendar:change` — fires with `{ value, dates, formatted }` on selection change
- [ ] `@calendar:navigate` — fires on month/year change with `{ year, month, view }`
- [ ] `@calendar:open` / `@calendar:close` — popup lifecycle
- [ ] `@calendar:view-change` — when switching between day/month/year view
- [ ] All events work with Alpine's `x-on` / `@` syntax

### 6.3 Programmatic Control
- [ ] `$refs.calendar.setValue(date)` — set selection programmatically
- [ ] `$refs.calendar.clear()` — clear selection
- [ ] `$refs.calendar.goTo(year, month)` — navigate to specific month
- [ ] `$refs.calendar.open()` / `$refs.calendar.close()`
- [ ] `$refs.calendar.getSelection()` — get current selection as `CalendarDate[]`

### 6.4 Build & Package
- [ ] Set up build with Vite (library mode) producing **three** bundles:
  | File | Format | Use case |
  |------|--------|----------|
  | `dist/alpine-calendar.es.js` | ESM | Bundler users (`import`) |
  | `dist/alpine-calendar.umd.js` | UMD | Legacy bundlers / `require()` |
  | `dist/alpine-calendar.cdn.js` | IIFE | CDN / `<script>` tag / Livewire |
  | `dist/alpine-calendar.css` | CSS | All environments |
  | `dist/index.d.ts` | Types | TypeScript consumers |
- [ ] CDN build (`cdn.ts` entry): self-registering IIFE, externalizes Alpine via `window.Alpine`
- [ ] ESM/UMD builds (`index.ts` entry): export the plugin function, let consumer call `Alpine.plugin()`
- [ ] Vite config for dual entry points:
  ```ts
  // Two separate builds, run sequentially via npm script
  // Build 1: ESM + UMD (library consumers)
  // Build 2: IIFE cdn bundle (script tag consumers)
  ```
- [ ] Target: < 8KB gzipped JS (CDN bundle), < 2KB gzipped CSS
- [ ] Tree-shakeable ESM: allow importing only what's needed (core, mask, popup)
- [ ] No runtime dependencies — Alpine is a peer dep (ESM) / global (CDN)
- [ ] Verify `package.json` exports map:
  ```json
  {
    "exports": {
      ".": {
        "import": "./dist/alpine-calendar.es.js",
        "require": "./dist/alpine-calendar.umd.js",
        "types": "./dist/index.d.ts"
      },
      "./cdn": "./dist/alpine-calendar.cdn.js",
      "./css": "./dist/alpine-calendar.css"
    }
  }
  ```
- [ ] Publish to npm as `@reachgr/alpine-calendar`
- [ ] Ensure jsDelivr / unpkg CDN works out of the box after npm publish

### 6.5 Framework Integration Guides

Each integration must work **without requiring the user to set up a JS bundler**.

#### Livewire v4 (+ Filament)
- [ ] Document the "just add two tags" approach:
  ```php
  // In a Blade layout or Livewire component
  @push('styles')
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.css">
  @endpush
  @push('scripts')
    <script src="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.cdn.js"></script>
  @endpush
  ```
- [ ] Verify it works with Livewire's Alpine lifecycle (`alpine:init` → plugin registers → Livewire morphs DOM → calendar works)
- [ ] Test `wire:model` ↔ calendar two-way binding via Alpine's `$wire` or by dispatching `input` events on the bound `<input>`
- [ ] Test Livewire DOM morphing: ensure calendar survives Livewire re-renders (use `wire:ignore` on calendar container if needed, document this)
- [ ] Handle Livewire navigation (SPA mode): verify calendar initializes correctly on page transitions

#### Statamic
- [ ] Document usage in Antlers templates:
  ```html
  <!-- In a fieldtype blade view or Antlers partial -->
  <div x-data="calendar({ mode: 'single', format: 'YYYY-MM-DD' })">
    ...
  </div>
  ```
- [ ] If building a Statamic addon: the addon's `ServiceProvider` can push the CDN assets via `$this->loadScriptsUsing()` or `@push`

#### Plain HTML / Any Server Framework
- [ ] Provide a copy-paste CDN snippet that works in any HTML page:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.css">
  <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3/dist/cdn.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/@reachgr/alpine-calendar/dist/alpine-calendar.cdn.js"></script>

  <div x-data="calendar({ mode: 'single' })">
    <!-- calendar markup -->
  </div>
  ```
- [ ] Test ordering: calendar script before Alpine (registers on `alpine:init`), or after Alpine (registers immediately via `window.Alpine` check) — both must work

---

## Phase 7: Testing & Documentation

### 7.1 Unit Tests
- [ ] Date engine: all `CalendarDate` methods, especially timezone edge cases
- [ ] Grid generator: correct leading/trailing days, first-day-of-week variants
- [ ] Selection models: single, multiple, range — toggle, boundaries, serialization
- [ ] Parser: valid dates, invalid dates, edge formats, lenient parsing
- [ ] Mask: cursor behavior, paste handling, separator insertion

### 7.2 Integration Tests
- [ ] Alpine component lifecycle: init, destroy, config changes
- [ ] Input binding: type → parse → display, select → format → update input
- [ ] Popup: open/close, positioning, outside click, scroll behavior
- [ ] Keyboard navigation: full flow through grid
- [ ] Wizard: year → month → day flow

### 7.3 Build & Distribution Verification
- [ ] ESM import works: `import calendar from '@reachgr/alpine-calendar'` → `Alpine.plugin(calendar)`
- [ ] UMD require works: `const calendar = require('@reachgr/alpine-calendar')`
- [ ] CDN IIFE auto-registers: load script → `alpine:init` fires → calendar available
- [ ] CDN script order: works whether loaded **before** or **after** Alpine's `<script>`
- [ ] Bundle size check: IIFE < 8KB gzip, CSS < 2KB gzip
- [ ] IIFE does NOT contain Alpine source (check `dist/alpine-calendar.cdn.js` for Alpine internals)
- [ ] CSS loads independently — no FOUC, no dependency on JS loading first
- [ ] jsDelivr URL works after npm publish

### 7.4 Framework Smoke Tests
- [ ] **Livewire v4**: fresh Laravel + Livewire app, add CDN tags, verify calendar renders and `wire:model` syncs
- [ ] **Livewire DOM morphing**: change server state → Livewire re-renders → calendar inside `wire:ignore` survives
- [ ] **Livewire SPA navigation**: `wire:navigate` between pages with calendars → each initializes correctly
- [ ] **Statamic CP**: load in a custom fieldtype view, verify no Alpine conflicts
- [ ] **Plain HTML**: single HTML file with only CDN links, no bundler — full functionality

### 7.5 Visual / Manual Testing
- [ ] Responsive: test at 320px, 375px, 640px, 1024px
- [ ] RTL layout support check (future-proofing, not full implementation)
- [ ] Dark mode theming test
- [ ] Different locales: EN, EL, DE, AR (RTL)

### 7.6 Documentation
- [ ] README with quick start, installation (CDN + npm), basic examples
- [ ] Full config reference table
- [ ] Usage examples for each mode: single, multiple, range, month-picker, wizard
- [ ] Theming guide: how to override `@theme` variables
- [ ] Integration guide: using with Filament, Statamic, Livewire, plain HTML
- [ ] Migration/adoption guide for existing projects

---

## Phase 8: Advanced Constraint Enhancements (Post-MVP)

Future enhancements to the constraint/rule system.

- [ ] Recurring rules: `{ months: [1,2,3,4] }` to apply rules to specific months every year without specifying exact date ranges
- [ ] Hover preview constraint feedback: visually indicate when a hovered date would result in an invalid range (e.g., dim dates outside valid minRange/maxRange from the start date)
- [ ] `isDateSelectableForRange(date)` method: given a start date, return whether clicking a candidate end date would produce a valid range
- [ ] Per-date constraint tooltips: API to provide reasons why a date is disabled (e.g., "Weekends are not available" or "Minimum 5-day booking required in summer")
- [ ] Rule priority/weight system: instead of first-match-wins, support explicit priority ordering
- [ ] Constraint-aware month/year navigation: disable prev/next when all dates in adjacent months are disabled
- [ ] `beforeSelect` callback: allow consumers to run custom validation logic before a date is selected

## Phase 9: Extras (Post-MVP)

These are explicitly **out of scope** for v1 but documented for future planning.

- [ ] Time picker support (hour/minute selection)
- [ ] Week number display
- [ ] Inline multi-month (3+ months, scrollable)
- [ ] Predefined ranges (Today, Last 7 days, This month, etc.)
- [ ] RTL full support
- [ ] SSR compatibility (Nuxt, etc.)
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Filament form field package (`@reachgr/filament-alpine-calendar`)
- [ ] Statamic fieldtype addon package
- [ ] i18n: bundled locale packs vs `Intl` only
- [ ] Virtual scrolling for year picker (performance)
- [ ] Animations via View Transitions API

---

## Implementation Order (Suggested)

| Sprint | Phases | Milestone |
|--------|--------|-----------|
| 0 | 0.1 – 0.11 | Repo ready: builds, lints, tests, hot-reloads |
| 1 | 1.1 – 1.6 | Core engine works with advanced constraints, fully tested |
| 2 | 2.1 – 2.3 | Input parsing & masking work standalone |
| 3 | 3.1 – 3.2, 4.1 | Basic Alpine calendar renders, input binding works ✅ 3.2 done |
| 4 | 4.2 – 4.4 | Month/year views, wizard mode |
| 5 | 3.3 – 3.4, 5.1 – 5.3 | Popup, keyboard nav, full styling ✅ 3.3 done |
| 6 | 6.1 – 6.4 | Packaged, published, documented |
| 7 | 7.1 – 7.4 | Tested and documented |

---

## Design Decisions Log

Document key decisions here as they're made:

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Date storage | Plain `{ year, month, day }` integers | Avoids timezone bugs from `Date` objects |
| Positioning lib | Custom (no Floating UI) | Keep lightweight; our needs are simple |
| Mask engine | Custom | Avoids dependency; input masking libs are heavy |
| Styling approach | Tailwind utilities + CSS `@theme` vars | Easy to customize without touching component code |
| Build tool | Vite library mode | Fast, produces clean ESM + UMD bundles |
| State management | Alpine reactive `$data` | Native to Alpine, no external store needed |
| Constraint rules | First-match-wins, rule overrides global | Simple, predictable; consumer controls rule order |
| Range validation | Start date determines rule | User selects start first; consistent behavior |
| enabledDates | Force-enable (overrides DOW/blacklist) | Most useful as "exceptions" to general rules |
| enabledDaysOfWeek | Whitelist (inverse of disabledDaysOfWeek) | Cleaner API when most days should be disabled |
| Range length | Inclusive day count (start to end) | Intuitive: "3-day range" = 3 calendar days |
| Popup positioning | Custom `position:fixed` + `getBoundingClientRect` | Zero dependencies; simple flip logic covers 95% of cases |
| Popup auto-update | rAF-throttled scroll/resize listeners on ancestors | Performance-safe; passive listeners, single rAF per event burst |
| Input binding | `x-ref="input"` auto-bind + `bindInput()` API | Works with Alpine's ref system; explicit binding also supported |
