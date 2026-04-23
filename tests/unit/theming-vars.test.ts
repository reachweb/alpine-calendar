import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const css = fs.readFileSync(path.resolve(__dirname, '../../styles/calendar.css'), 'utf-8')

describe('theming variables — specificity-safe defaults', () => {
  it('declares defaults inside :where(:root) so consumer overrides win at any load order', () => {
    expect(css).toMatch(/:where\(:root\)\s*\{/)
  })

  it('does NOT declare the default token block on a bare :root selector', () => {
    // Look for a :root rule that contains --color-calendar-bg (the first token).
    // If anyone reverts to bare :root the consumer cascade race returns.
    const bareRoot = /:root\s*\{[^}]*--color-calendar-bg:/
    expect(bareRoot.test(css)).toBe(false)
  })
})

describe('day-cell radius variables', () => {
  it('declares --radius-calendar-day with a pill default for visual back-compat', () => {
    expect(css).toMatch(/--radius-calendar-day:\s*9999px/)
  })

  it('declares --radius-calendar-day-range-edge defaulting to the day radius', () => {
    expect(css).toMatch(/--radius-calendar-day-range-edge:\s*var\(--radius-calendar-day\)/)
  })

  it('declares --radius-calendar-day-range-middle (default 0)', () => {
    expect(css).toMatch(/--radius-calendar-day-range-middle:\s*0/)
  })

  it('uses --radius-calendar-day on .rc-day (not a hardcoded 9999px)', () => {
    const dayBlock = css.match(/\.rc-day\s*\{[^}]+\}/)
    expect(dayBlock).not.toBeNull()
    if (dayBlock === null) throw new Error('dayBlock missing')
    expect(dayBlock[0]).toContain('var(--radius-calendar-day)')
    // The original hardcoded value must be gone from this block
    expect(dayBlock[0]).not.toMatch(/border-radius:\s*9999px/)
  })

  it('uses range-edge / range-middle vars on .rc-day--range-start / range-end', () => {
    // Match the dedicated single-selector blocks (the multi-selector rule for
    // selected/range-start/range-end above sets background, not border-radius).
    const startBlock = css.match(/\.rc-day--range-start\s*\{\s*border-radius:[^}]+\}/)
    const endBlock = css.match(/\.rc-day--range-end\s*\{\s*border-radius:[^}]+\}/)
    expect(startBlock).not.toBeNull()
    expect(endBlock).not.toBeNull()
    if (startBlock === null) throw new Error('startBlock missing')
    if (endBlock === null) throw new Error('endBlock missing')
    expect(startBlock[0]).toContain('--radius-calendar-day-range-edge')
    expect(startBlock[0]).toContain('--radius-calendar-day-range-middle')
    expect(endBlock[0]).toContain('--radius-calendar-day-range-edge')
    expect(endBlock[0]).toContain('--radius-calendar-day-range-middle')
  })

  it('uses --radius-calendar-day-range-middle on .rc-day--in-range', () => {
    const inRange = css.match(/\.rc-day--in-range\s*\{[^}]+\}/)
    expect(inRange).not.toBeNull()
    if (inRange === null) throw new Error('inRange missing')
    expect(inRange[0]).toContain('var(--radius-calendar-day-range-middle)')
  })
})

describe('slot containers', () => {
  it('ships default styling for .rc-calendar__header', () => {
    expect(css).toMatch(/\.rc-calendar__header\s*\{/)
  })

  it('ships default styling for .rc-calendar__footer', () => {
    expect(css).toMatch(/\.rc-calendar__footer\s*\{/)
  })
})
