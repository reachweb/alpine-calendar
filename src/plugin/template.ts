// ---------------------------------------------------------------------------
// Auto-rendering template generator
// ---------------------------------------------------------------------------

export interface TemplateOptions {
  display: 'inline' | 'popup'
  /** Emit the dual/single day-view branch (needed when any active monthCount is ≤ 2). */
  needsDayView: boolean
  /** Emit the scrollable day-view branch (needed when any active monthCount is ≥ 3). */
  needsScrollableView: boolean
  /** Include dual-month chrome (nav-arrow visibility classes, rc-months--dual binding). */
  isDualChrome: boolean
  isWizard: boolean
  hasName: boolean
  showWeekNumbers: boolean
  hasPresets: boolean
  scrollHeight: number
  /** Raw HTML extracted from `<template data-rc-slot="header">`. Optional. */
  headerSlot?: string
  /** Raw HTML extracted from `<template data-rc-slot="footer">`. Optional. */
  footerSlot?: string
}

// Close icon SVG (inline, no external deps)
const closeSvg =
  '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** A calendar grid always has 6 rows (weeks). */
const GRID_ROWS = 6

// ---------------------------------------------------------------------------
// Helpers: unrolled day-grid rows
// ---------------------------------------------------------------------------

/**
 * Generate a layout-only row div for a specific row index.
 * No ARIA role — the row is transparent to the accessibility tree.
 * The parent listbox directly owns the option children through these wrappers.
 */
function dayRow(ri: number, showWeekNumbers: boolean): string {
  const rowClass = showWeekNumbers ? 'rc-row rc-row--week-numbers' : 'rc-row'
  const weekNumCell = showWeekNumbers
    ? `<div class="rc-week-number" x-text="mg.weekNumbers[${ri}]"></div>`
    : ''

  return `<div class="${rowClass}" x-show="mg.rows.length > ${ri}">
                ${weekNumCell}<template x-for="cell in (mg.rows[${ri}] || [])" :key="cell.date.toISO()">
                  <div :class="dayClasses(cell)" :style="dayStyle(cell)" :id="'day-' + cell.date.toISO()" :aria-selected="isSelected(cell.date)" :aria-disabled="cell.isDisabled || dayMeta(cell)?.availability === 'unavailable'" :title="dayTitle(cell)" role="option" tabindex="-1" @click="!cell.isDisabled && selectDate(cell.date)" @mouseenter="hoverDate = cell.date" @mouseleave="hoverDate = null"><span class="rc-day__number" x-text="cell.date.day"></span><template x-if="dayMeta(cell)?.label"><span class="rc-day__label" x-text="dayMeta(cell).label"></span></template><template x-if="dayMeta(cell)?.availability === 'available' && !dayMeta(cell)?.label"><span class="rc-day__dot" aria-hidden="true"></span></template></div>
                </template>
              </div>`
}

/** Generate all 6 unrolled row templates. */
function dayRows(showWeekNumbers: boolean): string {
  return Array.from({ length: GRID_ROWS }, (_, ri) => dayRow(ri, showWeekNumbers)).join(
    '\n            ',
  )
}

// ---------------------------------------------------------------------------
// View fragments
// ---------------------------------------------------------------------------

function yearPickerView(): string {
  return `<template x-if="view === 'years'">
  <div class="rc-view-enter">
    <div class="rc-header">
      <button class="rc-header__nav" @click="prev()" :disabled="!canGoPrev" aria-label="Previous decade">&#8249;</button>
      <span class="rc-header__label" x-text="decadeLabel"></span>
      <button class="rc-header__nav" @click="next()" :disabled="!canGoNext" aria-label="Next decade">&#8250;</button>
    </div>
    <div class="rc-year-grid" role="group" :aria-label="decadeLabel">
      <template x-for="cell in yearGrid.flat()" :key="cell.year">
        <div :class="yearClasses(cell)" :aria-disabled="cell.isDisabled" tabindex="-1" @click="!cell.isDisabled && selectYear(cell.year)" x-text="cell.label"></div>
      </template>
    </div>
  </div>
</template>`
}

function monthPickerView(): string {
  return `<template x-if="view === 'months'">
  <div class="rc-view-enter">
    <div class="rc-header">
      <button class="rc-header__nav" @click="prev()" :disabled="!canGoPrev" aria-label="Previous year">&#8249;</button>
      <button class="rc-header__label" @click="setView('years')" aria-label="Change view" x-text="yearLabel"></button>
      <button class="rc-header__nav" @click="next()" :disabled="!canGoNext" aria-label="Next year">&#8250;</button>
    </div>
    <div class="rc-month-grid" role="group" :aria-label="yearLabel">
      <template x-for="cell in monthGrid.flat()" :key="cell.month">
        <div :class="monthClasses(cell)" :aria-disabled="cell.isDisabled" tabindex="-1" @click="!cell.isDisabled && selectMonth(cell.month)" x-text="cell.label"></div>
      </template>
    </div>
  </div>
</template>`
}

function dayView(
  isDual: boolean,
  showWeekNumbers: boolean,
  coexistsWithScrollable: boolean,
): string {
  // For dual-month: CSS classes control arrow visibility (responsive for mobile).
  // Gate on `monthCount === 2` so breakpoints that drop to a single month (e.g. months:1,
  // mobileMonths:2 on desktop) don't inherit the dual-layout visibility rules — otherwise
  // rc-nav--dual-next-first would hide the only forward arrow on desktop.
  const prevClass = isDual ? ` :class="{ 'rc-nav--dual-hidden': monthCount === 2 && gi > 0 }"` : ''
  const nextClass = isDual
    ? ` :class="{ 'rc-nav--dual-next-first': monthCount === 2 && gi === 0, 'rc-nav--dual-next-last': monthCount === 2 && gi > 0 }"`
    : ''
  const monthsClass = isDual ? ' :class="{ \'rc-months--dual\': monthCount === 2 }"' : ''
  const viewCondition = coexistsWithScrollable
    ? `view === 'days' && !isScrollable`
    : `view === 'days'`

  const gridClassBinding = `:class="{ 'rc-grid--slide-next': _navDirection === 'next', 'rc-grid--slide-prev': _navDirection === 'prev' }"`

  // Weekday headers
  const weekdayBlock = showWeekNumbers
    ? `<div class="rc-weekdays rc-weekdays--week-numbers">
          <span class="rc-weekday rc-week-label"></span>
          <template x-for="wd in weekdayHeaders" :key="wd">
            <span class="rc-weekday" x-text="wd"></span>
          </template>
        </div>`
    : `<div class="rc-weekdays">
          <template x-for="wd in weekdayHeaders" :key="wd">
            <span class="rc-weekday" x-text="wd"></span>
          </template>
        </div>`

  const gridClass = showWeekNumbers ? '"rc-grid rc-grid--week-numbers"' : '"rc-grid"'

  // Unrolled rows — each row is a static DOM element with its own x-for
  const rows = dayRows(showWeekNumbers)

  return `<template x-if="${viewCondition}">
  <div class="rc-months${isDual ? '' : ' rc-view-enter'}"${monthsClass}${isDual ? '' : ''}>
    <template x-for="(mg, gi) in grid" :key="mg.year + '-' + mg.month">
      <div${isDual ? '' : ''}>
        <div class="rc-header">
          <button class="rc-header__nav" @click="prev()" :disabled="!canGoPrev" aria-label="Previous month"${prevClass}>&#8249;</button>
          <button class="rc-header__label" @click="setView('months')" aria-label="Change view" x-text="monthYearLabel(gi)"></button>
          <button class="rc-header__nav" @click="next()" :disabled="!canGoNext" aria-label="Next month"${nextClass}>&#8250;</button>
        </div>
        ${weekdayBlock}
        <div class="rc-grid-wrapper">
          <div class=${gridClass} ${gridClassBinding} @animationend="_navDirection = ''" role="listbox" :aria-label="monthYearLabel(gi)">
            ${rows}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>`
}

function scrollableDayView(
  showWeekNumbers: boolean,
  scrollHeight: number,
  coexistsWithDayView: boolean,
): string {
  const viewCondition = coexistsWithDayView ? `view === 'days' && isScrollable` : `view === 'days'`
  const weekdayBlock = showWeekNumbers
    ? `<div class="rc-weekdays rc-weekdays--week-numbers">
          <span class="rc-weekday rc-week-label"></span>
          <template x-for="wd in weekdayHeaders" :key="wd">
            <span class="rc-weekday" x-text="wd"></span>
          </template>
        </div>`
    : `<div class="rc-weekdays">
          <template x-for="wd in weekdayHeaders" :key="wd">
            <span class="rc-weekday" x-text="wd"></span>
          </template>
        </div>`

  const gridClass = showWeekNumbers ? '"rc-grid rc-grid--week-numbers"' : '"rc-grid"'

  // Unrolled rows
  const rows = dayRows(showWeekNumbers)

  return `<template x-if="${viewCondition}">
  <div>
    <div class="rc-header rc-header--scroll-sticky">
      <span class="rc-header__label rc-header__label--scroll" x-text="scrollHeaderLabel"></span>
    </div>
    ${weekdayBlock}
    <div class="rc-months rc-months--scroll" style="max-height: ${scrollHeight}px">
      <template x-for="(mg, gi) in grid" :key="mg.year + '-' + mg.month">
        <div :data-month-id="'month-' + mg.year + '-' + mg.month">
          <div class="rc-header rc-header--scroll" x-show="gi > 0">
            <span class="rc-header__label rc-header__label--scroll" x-text="monthYearLabel(gi)"></span>
          </div>
          <div class=${gridClass} role="listbox" :aria-label="monthYearLabel(gi)">
            ${rows}
          </div>
        </div>
      </template>
    </div>
  </div>
</template>`
}

function wizardChrome(): string {
  return `<div class="rc-wizard-steps">
  <template x-for="step in wizardTotalSteps" :key="step">
    <div class="rc-wizard-step" :class="{ 'rc-wizard-step--active': wizardStep === step, 'rc-wizard-step--done': wizardStep > step }"></div>
  </template>
</div>
<div class="rc-wizard-label" x-text="wizardStepLabel"></div>
<template x-if="wizardStep > 1">
  <button class="rc-wizard-back" @click="wizardBack()" aria-label="Go back">&#8249; Back</button>
</template>`
}

function wizardSummary(): string {
  return `<div class="rc-wizard-summary" x-show="wizardSummary" x-transition:enter="transition ease-out duration-200" x-transition:enter-start="opacity-0 transform translate-y-1" x-transition:enter-end="opacity-100 transform translate-y-0" x-text="wizardSummary"></div>`
}

function popupWrapper(content: string): string {
  return `<div x-ref="popup" x-show="isOpen" :style="popupStyle" class="rc-popup-overlay" data-rc-portal @click.self="close()" role="dialog" aria-modal="true" :aria-label="popupAriaLabel" x-transition:enter="transition ease-out duration-150" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100" x-transition:leave="transition ease-in duration-100" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0">
${content}
</div>`
}

function popupHeader(isWizard: boolean): string {
  const title = isWizard
    ? '<span class="rc-popup-header__title" x-text="wizardStepLabel"></span>'
    : '<span class="rc-popup-header__title">Select Date</span>'
  return `<div class="rc-popup-header">
  ${title}
  <button class="rc-popup-header__close" @click="close()" aria-label="Close calendar">${closeSvg}</button>
</div>`
}

function presetsBlock(): string {
  return `<div class="rc-presets" role="group" aria-label="Quick select">
  <template x-for="(preset, pi) in presets" :key="pi">
    <button class="rc-preset" @click="applyPreset(pi)" x-text="preset.label"></button>
  </template>
</div>`
}

function headerSlotBlock(html: string): string {
  return `<div class="rc-calendar__header" data-rc-slot="header">${html}</div>`
}

function footerSlotBlock(html: string): string {
  return `<div class="rc-calendar__footer" data-rc-slot="footer">${html}</div>`
}

function hiddenInputs(): string {
  return `<template x-if="inputName">
  <template x-for="val in hiddenInputValues" :key="val">
    <input type="hidden" :name="inputName" :value="val">
  </template>
</template>`
}

// ---------------------------------------------------------------------------
// Main generator
// ---------------------------------------------------------------------------

export function generateCalendarTemplate(options: TemplateOptions): string {
  const {
    display,
    needsDayView,
    needsScrollableView,
    isDualChrome,
    isWizard,
    hasName,
    showWeekNumbers,
    hasPresets,
    scrollHeight,
    headerSlot,
    footerSlot,
  } = options
  const isPopup = display === 'popup'
  const coexist = needsDayView && needsScrollableView

  const calendarClass = isWizard ? 'rc-calendar rc-calendar--wizard' : 'rc-calendar'
  const ariaLabel = isWizard ? 'Birth date wizard' : 'Calendar'

  // Build the inner calendar content
  const parts: string[] = []

  // Popup header (close button + title)
  if (isPopup) {
    parts.push(popupHeader(isWizard))
  }

  // Consumer header slot (sits below the close button, above wizard chrome / views)
  if (headerSlot) {
    parts.push(headerSlotBlock(headerSlot))
  }

  // Wizard chrome (step dots, label, back button)
  if (isWizard) {
    parts.push(wizardChrome())
  }

  // Views — always include all three (guarded by x-if)
  parts.push(yearPickerView())
  parts.push(monthPickerView())
  if (needsDayView) {
    parts.push(dayView(isDualChrome, showWeekNumbers, coexist))
  }
  if (needsScrollableView) {
    parts.push(scrollableDayView(showWeekNumbers, scrollHeight, coexist))
  }

  // Range presets (below the calendar grid, above wizard summary)
  if (hasPresets) {
    parts.push(presetsBlock())
  }

  // Wizard summary bar
  if (isWizard) {
    parts.push(wizardSummary())
  }

  // Consumer footer slot (sits at the very bottom of visible content)
  if (footerSlot) {
    parts.push(footerSlotBlock(footerSlot))
  }

  // Hidden form inputs
  if (hasName) {
    parts.push(hiddenInputs())
  }

  const calendarInner = parts.join('\n')

  // Wrap in rc-calendar container
  const calendarEl = `<div class="${calendarClass}" @keydown="handleKeydown($event)" tabindex="0" :aria-activedescendant="focusedDateISO ? 'day-' + focusedDateISO : null" role="application" aria-label="${ariaLabel}">
<div class="rc-sr-only" role="status" aria-live="polite" aria-atomic="true" x-text="_statusMessage"></div>
${calendarInner}
</div>`

  if (isPopup) {
    return popupWrapper(calendarEl)
  }

  return calendarEl
}
