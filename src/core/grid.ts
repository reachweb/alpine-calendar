import { CalendarDate } from './calendar-date'

/** Metadata for a single day cell in the calendar grid. */
export interface DayCell {
  date: CalendarDate
  isCurrentMonth: boolean
  isToday: boolean
  isDisabled: boolean
}

/** A single month grid: always 6 rows × 7 cols. */
export interface MonthGrid {
  year: number
  month: number
  rows: DayCell[][]
}

/**
 * Generate a 6×7 calendar grid for a given month.
 *
 * @param year           - Full year (e.g. 2025)
 * @param month          - Month 1-12
 * @param firstDayOfWeek - 0 = Sunday, 1 = Monday, …, 6 = Saturday
 * @param today          - Reference date for "isToday" marking (defaults to CalendarDate.today())
 * @param isDisabled     - Optional callback to mark dates as disabled
 */
export function generateMonth(
  year: number,
  month: number,
  firstDayOfWeek = 0,
  today?: CalendarDate,
  isDisabled?: (date: CalendarDate) => boolean,
): MonthGrid {
  const todayRef = today ?? CalendarDate.today()
  const disabledFn = isDisabled ?? (() => false)

  // First day of the target month
  const firstOfMonth = new CalendarDate(year, month, 1)
  // Day of week for the 1st (0=Sun, 1=Mon, …)
  const firstDow = firstOfMonth.toNativeDate().getDay()

  // How many leading days from the previous month?
  // offset = (firstDow - firstDayOfWeek + 7) % 7
  const offset = (firstDow - firstDayOfWeek + 7) % 7

  // Start date: go back `offset` days from the 1st
  const gridStart = firstOfMonth.addDays(-offset)

  const rows: DayCell[][] = []

  for (let row = 0; row < 6; row++) {
    const cells: DayCell[] = []
    for (let col = 0; col < 7; col++) {
      const dayIndex = row * 7 + col
      const date = gridStart.addDays(dayIndex)
      cells.push({
        date,
        isCurrentMonth: date.month === month && date.year === year,
        isToday: date.isSame(todayRef),
        isDisabled: disabledFn(date),
      })
    }
    rows.push(cells)
  }

  return { year, month, rows }
}

// ---------------------------------------------------------------------------
// Month view grid (3×4 of month cells)
// ---------------------------------------------------------------------------

/** Metadata for a single month cell in the month picker view. */
export interface MonthCell {
  /** Month number (1-12). */
  month: number
  /** Year for this cell. */
  year: number
  /** Localized short month label (e.g. "Jan"). */
  label: string
  /** Whether this is the current month (today's month and year). */
  isCurrentMonth: boolean
  /** Whether this entire month is outside the selectable range. */
  isDisabled: boolean
}

/**
 * Generate a 3×4 grid of months for the month picker view.
 *
 * @param year             - Year to display
 * @param today            - Reference date for "isCurrentMonth" marking
 * @param locale           - BCP 47 locale for month labels
 * @param isMonthDisabled  - Optional callback to check if a month should be disabled
 */
export function generateMonthGrid(
  year: number,
  today?: CalendarDate,
  locale?: string,
  isMonthDisabled?: (year: number, month: number) => boolean,
): MonthCell[][] {
  const todayRef = today ?? CalendarDate.today()
  const disabledFn = isMonthDisabled ?? (() => false)

  const rows: MonthCell[][] = []
  for (let row = 0; row < 3; row++) {
    const cells: MonthCell[] = []
    for (let col = 0; col < 4; col++) {
      const month = row * 4 + col + 1
      const d = new CalendarDate(year, month, 1)
      cells.push({
        month,
        year,
        label: d.format({ month: 'short' }, locale),
        isCurrentMonth: todayRef.month === month && todayRef.year === year,
        isDisabled: disabledFn(year, month),
      })
    }
    rows.push(cells)
  }

  return rows
}

// ---------------------------------------------------------------------------
// Year view grid (3×4 of year cells)
// ---------------------------------------------------------------------------

/** Metadata for a single year cell in the year picker view. */
export interface YearCell {
  /** Full year number (e.g. 2026). */
  year: number
  /** Year as string label. */
  label: string
  /** Whether this is the current year (today's year). */
  isCurrentYear: boolean
  /** Whether this entire year is outside the selectable range. */
  isDisabled: boolean
}

/**
 * Generate a 3×4 grid of years for the year picker view.
 *
 * Shows 12 consecutive years in a block aligned to multiples of 12.
 * For example, if centerYear is 2026, the grid shows 2016–2027.
 *
 * @param centerYear      - Year to determine which 12-year block to display
 * @param today           - Reference date for "isCurrentYear" marking
 * @param isYearDisabled  - Optional callback to check if a year should be disabled
 */
export function generateYearGrid(
  centerYear: number,
  today?: CalendarDate,
  isYearDisabled?: (year: number) => boolean,
): YearCell[][] {
  const todayRef = today ?? CalendarDate.today()
  const disabledFn = isYearDisabled ?? (() => false)

  const startYear = Math.floor(centerYear / 12) * 12

  const rows: YearCell[][] = []
  for (let row = 0; row < 3; row++) {
    const cells: YearCell[] = []
    for (let col = 0; col < 4; col++) {
      const year = startYear + row * 4 + col
      cells.push({
        year,
        label: String(year),
        isCurrentYear: todayRef.year === year,
        isDisabled: disabledFn(year),
      })
    }
    rows.push(cells)
  }

  return rows
}

// ---------------------------------------------------------------------------
// Multi-month day view grids
// ---------------------------------------------------------------------------

/**
 * Generate `count` consecutive month grids starting from year/month.
 *
 * @param year           - Starting year
 * @param month          - Starting month (1-12)
 * @param count          - Number of months to generate (e.g. 1 or 2)
 * @param firstDayOfWeek - 0 = Sunday, 1 = Monday, …
 * @param today          - Reference for "isToday"
 * @param isDisabled     - Optional disabled callback
 */
export function generateMonths(
  year: number,
  month: number,
  count: number,
  firstDayOfWeek = 0,
  today?: CalendarDate,
  isDisabled?: (date: CalendarDate) => boolean,
): MonthGrid[] {
  const grids: MonthGrid[] = []

  for (let i = 0; i < count; i++) {
    // Compute the target month, handling year rollover
    let targetMonth = month + i
    let targetYear = year
    while (targetMonth > 12) {
      targetMonth -= 12
      targetYear++
    }
    grids.push(generateMonth(targetYear, targetMonth, firstDayOfWeek, today, isDisabled))
  }

  return grids
}
