// ---------------------------------------------------------------------------
// Auto-rendering template generator
// ---------------------------------------------------------------------------

export interface TemplateOptions {
  display: 'inline' | 'popup'
  isDualMonth: boolean
  isWizard: boolean
  hasName: boolean
  showWeekNumbers: boolean
  hasPresets: boolean
  isScrollable: boolean
  scrollHeight: number
}

// Close icon SVG (inline, no external deps)
const closeSvg = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>'

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
    <div class="rc-year-grid" role="grid" :aria-label="decadeLabel">
      <template x-for="cell in yearGrid.flat()" :key="cell.year">
        <div :class="yearClasses(cell)" :aria-disabled="cell.isDisabled" role="gridcell" @click="!cell.isDisabled && selectYear(cell.year)" x-text="cell.label"></div>
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
      <span class="rc-header__label" @click="setView('years')" x-text="yearLabel"></span>
      <button class="rc-header__nav" @click="next()" :disabled="!canGoNext" aria-label="Next year">&#8250;</button>
    </div>
    <div class="rc-month-grid" role="grid" :aria-label="yearLabel">
      <template x-for="cell in monthGrid.flat()" :key="cell.month">
        <div :class="monthClasses(cell)" :aria-disabled="cell.isDisabled" role="gridcell" @click="!cell.isDisabled && selectMonth(cell.month)" x-text="cell.label"></div>
      </template>
    </div>
  </div>
</template>`
}

function dayView(isDual: boolean, showWeekNumbers: boolean): string {
  // For dual-month: hide prev on 2nd month, next on 1st
  const prevStyle = isDual ? ' :style="gi > 0 ? \'visibility:hidden\' : \'\'"' : ''
  const nextStyle = isDual ? ' :style="gi < grid.length - 1 ? \'visibility:hidden\' : \'\'"' : ''
  const monthsClass = isDual ? ' :class="{ \'rc-months--dual\': monthCount === 2 }"' : ''

  // Weekday headers: optional week number label column
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

  // Grid: use dayGridItems() helper when week numbers are enabled
  const gridClass = showWeekNumbers
    ? `"rc-grid rc-grid--week-numbers"`
    : `"rc-grid"`
  const gridClassBinding = showWeekNumbers
    ? `:class="{ 'rc-grid--slide-next': _navDirection === 'next', 'rc-grid--slide-prev': _navDirection === 'prev' }"`
    : `:class="{ 'rc-grid--slide-next': _navDirection === 'next', 'rc-grid--slide-prev': _navDirection === 'prev' }"`

  const cellsBlock = showWeekNumbers
    ? `<template x-for="item in dayGridItems(mg)" :key="item.key">
              <div :class="item.isWeekNumber ? 'rc-week-number' : dayClasses(item.cell)" :id="!item.isWeekNumber ? ('day-' + item.cell.date.toISO()) : undefined" :aria-selected="!item.isWeekNumber ? isSelected(item.cell.date) : undefined" :aria-disabled="!item.isWeekNumber ? item.cell.isDisabled : undefined" :title="!item.isWeekNumber ? dayTitle(item.cell) : undefined" :role="!item.isWeekNumber ? 'gridcell' : undefined" @click="!item.isWeekNumber && !item.cell.isDisabled && selectDate(item.cell.date)" @mouseenter="!item.isWeekNumber && (hoverDate = item.cell.date)" @mouseleave="!item.isWeekNumber && (hoverDate = null)" x-text="item.isWeekNumber ? item.weekNumber : item.cell.date.day"></div>
            </template>`
    : `<template x-for="cell in mg.rows.flat()" :key="cell.date.toISO()">
              <div :class="dayClasses(cell)" :id="'day-' + cell.date.toISO()" :aria-selected="isSelected(cell.date)" :aria-disabled="cell.isDisabled" :title="dayTitle(cell)" role="gridcell" @click="!cell.isDisabled && selectDate(cell.date)" @mouseenter="hoverDate = cell.date" @mouseleave="hoverDate = null" x-text="cell.date.day"></div>
            </template>`

  return `<template x-if="view === 'days'">
  <div class="rc-months${isDual ? '' : ' rc-view-enter'}"${monthsClass}${isDual ? '' : ''}>
    <template x-for="(mg, gi) in grid" :key="mg.year + '-' + mg.month">
      <div${isDual ? '' : ''}>
        <div class="rc-header">
          <button class="rc-header__nav" @click="prev()" :disabled="!canGoPrev" aria-label="Previous month"${prevStyle}>&#8249;</button>
          <span class="rc-header__label" @click="setView('months')" x-text="monthYearLabel(gi)"></span>
          <button class="rc-header__nav" @click="next()" :disabled="!canGoNext" aria-label="Next month"${nextStyle}>&#8250;</button>
        </div>
        ${weekdayBlock}
        <div class="rc-grid-wrapper">
          <div class=${gridClass} ${gridClassBinding} @animationend="_navDirection = ''" role="grid" :aria-label="monthYearLabel(gi)">
            ${cellsBlock}
          </div>
        </div>
      </div>
    </template>
  </div>
</template>`
}

function scrollableDayView(showWeekNumbers: boolean, scrollHeight: number): string {
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

  const gridClass = showWeekNumbers ? `"rc-grid rc-grid--week-numbers"` : `"rc-grid"`

  const cellsBlock = showWeekNumbers
    ? `<template x-for="item in dayGridItems(mg)" :key="item.key">
              <div :class="item.isWeekNumber ? 'rc-week-number' : dayClasses(item.cell)" :id="!item.isWeekNumber ? ('day-' + item.cell.date.toISO()) : undefined" :aria-selected="!item.isWeekNumber ? isSelected(item.cell.date) : undefined" :aria-disabled="!item.isWeekNumber ? item.cell.isDisabled : undefined" :title="!item.isWeekNumber ? dayTitle(item.cell) : undefined" :role="!item.isWeekNumber ? 'gridcell' : undefined" @click="!item.isWeekNumber && !item.cell.isDisabled && selectDate(item.cell.date)" @mouseenter="!item.isWeekNumber && (hoverDate = item.cell.date)" @mouseleave="!item.isWeekNumber && (hoverDate = null)" x-text="item.isWeekNumber ? item.weekNumber : item.cell.date.day"></div>
            </template>`
    : `<template x-for="cell in mg.rows.flat()" :key="cell.date.toISO()">
              <div :class="dayClasses(cell)" :id="'day-' + cell.date.toISO()" :aria-selected="isSelected(cell.date)" :aria-disabled="cell.isDisabled" :title="dayTitle(cell)" role="gridcell" @click="!cell.isDisabled && selectDate(cell.date)" @mouseenter="hoverDate = cell.date" @mouseleave="hoverDate = null" x-text="cell.date.day"></div>
            </template>`

  return `<template x-if="view === 'days'">
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
          <div class=${gridClass} role="grid" :aria-label="monthYearLabel(gi)">
            ${cellsBlock}
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
  return `<div x-ref="popup" x-show="isOpen" :style="popupStyle" class="rc-popup-overlay" @click.self="close()" x-transition:enter="transition ease-out duration-150" x-transition:enter-start="opacity-0" x-transition:enter-end="opacity-100" x-transition:leave="transition ease-in duration-100" x-transition:leave-start="opacity-100" x-transition:leave-end="opacity-0">
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
  return `<div class="rc-presets" role="list" aria-label="Quick select">
  <template x-for="(preset, pi) in presets" :key="pi">
    <button class="rc-preset" role="listitem" @click="applyPreset(pi)" x-text="preset.label"></button>
  </template>
</div>`
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
  const { display, isDualMonth, isWizard, hasName, showWeekNumbers, hasPresets, isScrollable, scrollHeight } = options
  const isPopup = display === 'popup'

  const calendarClass = isWizard ? 'rc-calendar rc-calendar--wizard' : 'rc-calendar'
  const ariaLabel = isWizard ? 'Birth date wizard' : 'Calendar'

  // Build the inner calendar content
  const parts: string[] = []

  // Popup header (close button + title)
  if (isPopup) {
    parts.push(popupHeader(isWizard))
  }

  // Wizard chrome (step dots, label, back button)
  if (isWizard) {
    parts.push(wizardChrome())
  }

  // Views — always include all three (guarded by x-if)
  parts.push(yearPickerView())
  parts.push(monthPickerView())
  if (isScrollable) {
    parts.push(scrollableDayView(showWeekNumbers, scrollHeight))
  } else {
    parts.push(dayView(isDualMonth, showWeekNumbers))
  }

  // Range presets (below the calendar grid, above wizard summary)
  if (hasPresets) {
    parts.push(presetsBlock())
  }

  // Wizard summary bar
  if (isWizard) {
    parts.push(wizardSummary())
  }

  // Hidden form inputs
  if (hasName) {
    parts.push(hiddenInputs())
  }

  const calendarInner = parts.join('\n')

  // Wrap in rc-calendar container
  const calendarEl = `<div class="${calendarClass}" @keydown="handleKeydown($event)" tabindex="0" :aria-activedescendant="focusedDateISO ? 'day-' + focusedDateISO : null" role="application" aria-label="${ariaLabel}">
${calendarInner}
</div>`

  if (isPopup) {
    // For popup: input + popup overlay wrapper
    const inputEl = '<input x-ref="input" type="text" class="rc-input" @focus="handleFocus()" @blur="handleBlur()">'
    return inputEl + '\n' + popupWrapper(calendarEl)
  }

  return calendarEl
}
