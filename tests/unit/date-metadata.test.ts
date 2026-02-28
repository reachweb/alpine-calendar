import { describe, it, expect } from 'vitest'
import { normalizeDateMeta } from '../../src/core/metadata'
import type { DateMeta, DateMetaProvider } from '../../src/core/metadata'
import { CalendarDate } from '../../src/core/calendar-date'

// ---------------------------------------------------------------------------
// normalizeDateMeta
// ---------------------------------------------------------------------------

describe('normalizeDateMeta', () => {
  const d = new CalendarDate(2026, 3, 15)

  it('returns a no-op function for undefined', () => {
    const fn = normalizeDateMeta(undefined)
    expect(fn(d)).toBeUndefined()
  })

  it('returns a no-op function for null', () => {
    const fn = normalizeDateMeta(null)
    expect(fn(d)).toBeUndefined()
  })

  it('passes through a callback function', () => {
    const cb: DateMetaProvider = (date) => ({ label: `$${date.day}` })
    const fn = normalizeDateMeta(cb)
    expect(fn(d)).toEqual({ label: '$15' })
  })

  it('wraps an object map into a lookup function', () => {
    const map: Record<string, DateMeta> = {
      '2026-03-15': { label: '$150', availability: 'available' },
      '2026-03-16': { availability: 'unavailable' },
    }
    const fn = normalizeDateMeta(map)
    expect(fn(d)).toEqual({ label: '$150', availability: 'available' })
    expect(fn(new CalendarDate(2026, 3, 16))).toEqual({ availability: 'unavailable' })
  })

  it('returns undefined for dates not in the map', () => {
    const map: Record<string, DateMeta> = {
      '2026-03-15': { label: '$150' },
    }
    const fn = normalizeDateMeta(map)
    expect(fn(new CalendarDate(2026, 3, 20))).toBeUndefined()
  })

  it('callback can return undefined for some dates', () => {
    const cb: DateMetaProvider = (date) => {
      if (date.day === 15) return { label: 'yes' }
      return undefined
    }
    const fn = normalizeDateMeta(cb)
    expect(fn(d)).toEqual({ label: 'yes' })
    expect(fn(new CalendarDate(2026, 3, 10))).toBeUndefined()
  })

  it('preserves all DateMeta properties from object map', () => {
    const meta: DateMeta = {
      label: '$200',
      availability: 'available',
      color: '#16a34a',
      cssClass: 'custom-class extra',
    }
    const fn = normalizeDateMeta({ '2026-03-15': meta })
    expect(fn(d)).toEqual(meta)
  })

  it('preserves all DateMeta properties from callback', () => {
    const meta: DateMeta = {
      label: 'Sold',
      availability: 'unavailable',
      color: '#ef4444',
      cssClass: 'sold-out',
    }
    const fn = normalizeDateMeta(() => meta)
    expect(fn(d)).toEqual(meta)
  })
})
