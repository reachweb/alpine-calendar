import { describe, it, expect } from 'vitest'
import { CalendarDate } from '../../src/core/calendar-date'
import { SingleSelection, MultipleSelection, RangeSelection } from '../../src/core/selection'

// ---------------------------------------------------------------------------
// SingleSelection
// ---------------------------------------------------------------------------

describe('SingleSelection', () => {
  describe('constructor', () => {
    it('starts with no selection by default', () => {
      const sel = new SingleSelection()
      expect(sel.getSelected()).toBeNull()
      expect(sel.toArray()).toEqual([])
      expect(sel.toValue()).toBe('')
    })

    it('accepts an initial date', () => {
      const date = new CalendarDate(2025, 6, 15)
      const sel = new SingleSelection(date)
      expect(sel.getSelected()!.toISO()).toBe('2025-06-15')
    })

    it('accepts null as initial value', () => {
      const sel = new SingleSelection(null)
      expect(sel.getSelected()).toBeNull()
    })
  })

  describe('isSelected()', () => {
    it('returns true for the selected date', () => {
      const sel = new SingleSelection(new CalendarDate(2025, 6, 15))
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
    })

    it('returns false for a different date', () => {
      const sel = new SingleSelection(new CalendarDate(2025, 6, 15))
      expect(sel.isSelected(new CalendarDate(2025, 6, 16))).toBe(false)
    })

    it('returns false when nothing is selected', () => {
      const sel = new SingleSelection()
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
    })
  })

  describe('toggle()', () => {
    it('selects a date when nothing is selected', () => {
      const sel = new SingleSelection()
      sel.toggle(new CalendarDate(2025, 6, 15))
      expect(sel.getSelected()!.toISO()).toBe('2025-06-15')
    })

    it('deselects when toggling the same date', () => {
      const sel = new SingleSelection(new CalendarDate(2025, 6, 15))
      sel.toggle(new CalendarDate(2025, 6, 15))
      expect(sel.getSelected()).toBeNull()
    })

    it('replaces selection when toggling a different date', () => {
      const sel = new SingleSelection(new CalendarDate(2025, 6, 15))
      sel.toggle(new CalendarDate(2025, 7, 1))
      expect(sel.getSelected()!.toISO()).toBe('2025-07-01')
    })
  })

  describe('clear()', () => {
    it('removes the selection', () => {
      const sel = new SingleSelection(new CalendarDate(2025, 6, 15))
      sel.clear()
      expect(sel.getSelected()).toBeNull()
      expect(sel.toArray()).toEqual([])
      expect(sel.toValue()).toBe('')
    })

    it('is safe to call when already empty', () => {
      const sel = new SingleSelection()
      sel.clear()
      expect(sel.getSelected()).toBeNull()
    })
  })

  describe('toArray()', () => {
    it('returns empty array when nothing selected', () => {
      expect(new SingleSelection().toArray()).toEqual([])
    })

    it('returns single-element array when a date is selected', () => {
      const sel = new SingleSelection(new CalendarDate(2025, 6, 15))
      const arr = sel.toArray()
      expect(arr).toHaveLength(1)
      expect(arr[0]!.toISO()).toBe('2025-06-15')
    })
  })

  describe('toValue()', () => {
    it('returns empty string when nothing selected', () => {
      expect(new SingleSelection().toValue()).toBe('')
    })

    it('returns ISO string of selected date', () => {
      const sel = new SingleSelection(new CalendarDate(2025, 1, 5))
      expect(sel.toValue()).toBe('2025-01-05')
    })
  })
})

// ---------------------------------------------------------------------------
// MultipleSelection
// ---------------------------------------------------------------------------

describe('MultipleSelection', () => {
  describe('constructor', () => {
    it('starts empty by default', () => {
      const sel = new MultipleSelection()
      expect(sel.count).toBe(0)
      expect(sel.toArray()).toEqual([])
      expect(sel.toValue()).toBe('')
    })

    it('accepts initial dates', () => {
      const sel = new MultipleSelection([
        new CalendarDate(2025, 6, 15),
        new CalendarDate(2025, 6, 20),
      ])
      expect(sel.count).toBe(2)
    })

    it('deduplicates initial dates', () => {
      const sel = new MultipleSelection([
        new CalendarDate(2025, 6, 15),
        new CalendarDate(2025, 6, 15),
      ])
      expect(sel.count).toBe(1)
    })
  })

  describe('isSelected()', () => {
    it('returns true for selected dates', () => {
      const sel = new MultipleSelection([new CalendarDate(2025, 6, 15)])
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
    })

    it('returns false for unselected dates', () => {
      const sel = new MultipleSelection([new CalendarDate(2025, 6, 15)])
      expect(sel.isSelected(new CalendarDate(2025, 6, 16))).toBe(false)
    })

    it('returns false when empty', () => {
      const sel = new MultipleSelection()
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
    })
  })

  describe('toggle()', () => {
    it('adds a date when not present', () => {
      const sel = new MultipleSelection()
      sel.toggle(new CalendarDate(2025, 6, 15))
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
      expect(sel.count).toBe(1)
    })

    it('removes a date when already present', () => {
      const sel = new MultipleSelection([new CalendarDate(2025, 6, 15)])
      sel.toggle(new CalendarDate(2025, 6, 15))
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
      expect(sel.count).toBe(0)
    })

    it('can toggle multiple independent dates', () => {
      const sel = new MultipleSelection()
      sel.toggle(new CalendarDate(2025, 6, 10))
      sel.toggle(new CalendarDate(2025, 6, 15))
      sel.toggle(new CalendarDate(2025, 6, 20))
      expect(sel.count).toBe(3)
      expect(sel.isSelected(new CalendarDate(2025, 6, 10))).toBe(true)
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(true)
      expect(sel.isSelected(new CalendarDate(2025, 6, 20))).toBe(true)
    })

    it('removing one date does not affect others', () => {
      const sel = new MultipleSelection([
        new CalendarDate(2025, 6, 10),
        new CalendarDate(2025, 6, 15),
        new CalendarDate(2025, 6, 20),
      ])
      sel.toggle(new CalendarDate(2025, 6, 15))
      expect(sel.count).toBe(2)
      expect(sel.isSelected(new CalendarDate(2025, 6, 10))).toBe(true)
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
      expect(sel.isSelected(new CalendarDate(2025, 6, 20))).toBe(true)
    })
  })

  describe('clear()', () => {
    it('removes all selections', () => {
      const sel = new MultipleSelection([
        new CalendarDate(2025, 6, 10),
        new CalendarDate(2025, 6, 15),
      ])
      sel.clear()
      expect(sel.count).toBe(0)
      expect(sel.toArray()).toEqual([])
    })

    it('is safe to call when already empty', () => {
      const sel = new MultipleSelection()
      sel.clear()
      expect(sel.count).toBe(0)
    })
  })

  describe('toArray()', () => {
    it('returns dates sorted chronologically', () => {
      const sel = new MultipleSelection([
        new CalendarDate(2025, 6, 20),
        new CalendarDate(2025, 6, 5),
        new CalendarDate(2025, 6, 15),
      ])
      const arr = sel.toArray()
      expect(arr).toHaveLength(3)
      expect(arr[0]!.toISO()).toBe('2025-06-05')
      expect(arr[1]!.toISO()).toBe('2025-06-15')
      expect(arr[2]!.toISO()).toBe('2025-06-20')
    })

    it('sorts across months and years', () => {
      const sel = new MultipleSelection([
        new CalendarDate(2026, 1, 1),
        new CalendarDate(2025, 6, 15),
        new CalendarDate(2025, 12, 31),
      ])
      const arr = sel.toArray()
      expect(arr[0]!.toISO()).toBe('2025-06-15')
      expect(arr[1]!.toISO()).toBe('2025-12-31')
      expect(arr[2]!.toISO()).toBe('2026-01-01')
    })

    it('returns empty array when nothing selected', () => {
      expect(new MultipleSelection().toArray()).toEqual([])
    })
  })

  describe('toValue()', () => {
    it('returns comma-separated ISO strings, sorted', () => {
      const sel = new MultipleSelection([
        new CalendarDate(2025, 6, 20),
        new CalendarDate(2025, 6, 5),
      ])
      expect(sel.toValue()).toBe('2025-06-05, 2025-06-20')
    })

    it('returns empty string when nothing selected', () => {
      expect(new MultipleSelection().toValue()).toBe('')
    })

    it('returns single ISO string for one selected date', () => {
      const sel = new MultipleSelection([new CalendarDate(2025, 6, 15)])
      expect(sel.toValue()).toBe('2025-06-15')
    })
  })

  describe('count', () => {
    it('reflects the number of selected dates', () => {
      const sel = new MultipleSelection()
      expect(sel.count).toBe(0)
      sel.toggle(new CalendarDate(2025, 6, 1))
      expect(sel.count).toBe(1)
      sel.toggle(new CalendarDate(2025, 6, 2))
      expect(sel.count).toBe(2)
      sel.toggle(new CalendarDate(2025, 6, 1))
      expect(sel.count).toBe(1)
    })
  })
})

// ---------------------------------------------------------------------------
// RangeSelection
// ---------------------------------------------------------------------------

describe('RangeSelection', () => {
  describe('constructor', () => {
    it('starts empty by default', () => {
      const sel = new RangeSelection()
      expect(sel.getStart()).toBeNull()
      expect(sel.getEnd()).toBeNull()
      expect(sel.toArray()).toEqual([])
      expect(sel.toValue()).toBe('')
    })

    it('accepts initial start and end', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      expect(sel.getStart()!.toISO()).toBe('2025-06-10')
      expect(sel.getEnd()!.toISO()).toBe('2025-06-20')
    })

    it('accepts initial start only (partial)', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      expect(sel.getStart()!.toISO()).toBe('2025-06-10')
      expect(sel.getEnd()).toBeNull()
    })
  })

  describe('isSelected()', () => {
    it('returns true for the start date', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      expect(sel.isSelected(new CalendarDate(2025, 6, 10))).toBe(true)
    })

    it('returns true for the end date', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      expect(sel.isSelected(new CalendarDate(2025, 6, 20))).toBe(true)
    })

    it('returns false for dates between start and end', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      // isSelected only checks endpoints — use isInRange for between
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
    })

    it('returns false when nothing is selected', () => {
      const sel = new RangeSelection()
      expect(sel.isSelected(new CalendarDate(2025, 6, 15))).toBe(false)
    })
  })

  describe('toggle()', () => {
    it('sets start when nothing is selected', () => {
      const sel = new RangeSelection()
      sel.toggle(new CalendarDate(2025, 6, 10))
      expect(sel.getStart()!.toISO()).toBe('2025-06-10')
      expect(sel.getEnd()).toBeNull()
      expect(sel.isPartial()).toBe(true)
    })

    it('sets end when start is already selected', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      sel.toggle(new CalendarDate(2025, 6, 20))
      expect(sel.getStart()!.toISO()).toBe('2025-06-10')
      expect(sel.getEnd()!.toISO()).toBe('2025-06-20')
      expect(sel.isComplete()).toBe(true)
    })

    it('swaps start/end when end is before start', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 20))
      sel.toggle(new CalendarDate(2025, 6, 10))
      expect(sel.getStart()!.toISO()).toBe('2025-06-10')
      expect(sel.getEnd()!.toISO()).toBe('2025-06-20')
    })

    it('deselects when clicking start again (partial state)', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      sel.toggle(new CalendarDate(2025, 6, 10))
      expect(sel.getStart()).toBeNull()
      expect(sel.getEnd()).toBeNull()
    })

    it('restarts selection when both are already set', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      sel.toggle(new CalendarDate(2025, 7, 1))
      expect(sel.getStart()!.toISO()).toBe('2025-07-01')
      expect(sel.getEnd()).toBeNull()
      expect(sel.isPartial()).toBe(true)
    })

    it('restarts even when clicking start of existing range', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      sel.toggle(new CalendarDate(2025, 6, 10))
      expect(sel.getStart()!.toISO()).toBe('2025-06-10')
      expect(sel.getEnd()).toBeNull()
    })

    it('restarts even when clicking end of existing range', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      sel.toggle(new CalendarDate(2025, 6, 20))
      expect(sel.getStart()!.toISO()).toBe('2025-06-20')
      expect(sel.getEnd()).toBeNull()
    })
  })

  describe('clear()', () => {
    it('removes both start and end', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      sel.clear()
      expect(sel.getStart()).toBeNull()
      expect(sel.getEnd()).toBeNull()
      expect(sel.toArray()).toEqual([])
      expect(sel.toValue()).toBe('')
    })

    it('clears partial selection', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      sel.clear()
      expect(sel.getStart()).toBeNull()
    })

    it('is safe to call when already empty', () => {
      const sel = new RangeSelection()
      sel.clear()
      expect(sel.getStart()).toBeNull()
      expect(sel.getEnd()).toBeNull()
    })
  })

  describe('toArray()', () => {
    it('returns empty array when nothing selected', () => {
      expect(new RangeSelection().toArray()).toEqual([])
    })

    it('returns [start] when only start is selected', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      const arr = sel.toArray()
      expect(arr).toHaveLength(1)
      expect(arr[0]!.toISO()).toBe('2025-06-10')
    })

    it('returns [start, end] when both are selected', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      const arr = sel.toArray()
      expect(arr).toHaveLength(2)
      expect(arr[0]!.toISO()).toBe('2025-06-10')
      expect(arr[1]!.toISO()).toBe('2025-06-20')
    })
  })

  describe('toValue()', () => {
    it('returns empty string when nothing selected', () => {
      expect(new RangeSelection().toValue()).toBe('')
    })

    it('returns start ISO when only start is selected', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      expect(sel.toValue()).toBe('2025-06-10')
    })

    it('returns "start – end" when both are selected', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      expect(sel.toValue()).toBe('2025-06-10 – 2025-06-20')
    })
  })

  describe('isInRange()', () => {
    describe('complete range (both start and end set)', () => {
      it('returns true for dates between start and end', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
        expect(sel.isInRange(new CalendarDate(2025, 6, 15))).toBe(true)
      })

      it('returns true for start and end dates', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
        expect(sel.isInRange(new CalendarDate(2025, 6, 10))).toBe(true)
        expect(sel.isInRange(new CalendarDate(2025, 6, 20))).toBe(true)
      })

      it('returns false for dates outside the range', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
        expect(sel.isInRange(new CalendarDate(2025, 6, 9))).toBe(false)
        expect(sel.isInRange(new CalendarDate(2025, 6, 21))).toBe(false)
      })

      it('ignores hoverDate when range is complete', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
        // Even with a hover date far away, only the actual range matters
        expect(sel.isInRange(new CalendarDate(2025, 6, 25), new CalendarDate(2025, 6, 30))).toBe(
          false,
        )
      })
    })

    describe('hover preview (only start set)', () => {
      it('shows range from start to hoverDate', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
        const hover = new CalendarDate(2025, 6, 20)
        expect(sel.isInRange(new CalendarDate(2025, 6, 15), hover)).toBe(true)
        expect(sel.isInRange(new CalendarDate(2025, 6, 10), hover)).toBe(true)
        expect(sel.isInRange(new CalendarDate(2025, 6, 20), hover)).toBe(true)
      })

      it('handles hover before start (reverse direction)', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 20))
        const hover = new CalendarDate(2025, 6, 10)
        expect(sel.isInRange(new CalendarDate(2025, 6, 15), hover)).toBe(true)
        expect(sel.isInRange(new CalendarDate(2025, 6, 10), hover)).toBe(true)
        expect(sel.isInRange(new CalendarDate(2025, 6, 20), hover)).toBe(true)
      })

      it('returns false for dates outside hover range', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
        const hover = new CalendarDate(2025, 6, 20)
        expect(sel.isInRange(new CalendarDate(2025, 6, 9), hover)).toBe(false)
        expect(sel.isInRange(new CalendarDate(2025, 6, 21), hover)).toBe(false)
      })

      it('returns false without hoverDate when only start is set', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
        expect(sel.isInRange(new CalendarDate(2025, 6, 15))).toBe(false)
      })

      it('shows single-day range when hovering over start', () => {
        const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
        const hover = new CalendarDate(2025, 6, 10)
        expect(sel.isInRange(new CalendarDate(2025, 6, 10), hover)).toBe(true)
        expect(sel.isInRange(new CalendarDate(2025, 6, 11), hover)).toBe(false)
      })
    })

    describe('empty selection', () => {
      it('returns false for any date', () => {
        const sel = new RangeSelection()
        expect(sel.isInRange(new CalendarDate(2025, 6, 15))).toBe(false)
      })

      it('returns false even with hoverDate', () => {
        const sel = new RangeSelection()
        expect(sel.isInRange(new CalendarDate(2025, 6, 15), new CalendarDate(2025, 6, 20))).toBe(
          false,
        )
      })
    })
  })

  describe('isPartial()', () => {
    it('returns false when empty', () => {
      expect(new RangeSelection().isPartial()).toBe(false)
    })

    it('returns true when only start is set', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      expect(sel.isPartial()).toBe(true)
    })

    it('returns false when both are set', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      expect(sel.isPartial()).toBe(false)
    })
  })

  describe('isComplete()', () => {
    it('returns false when empty', () => {
      expect(new RangeSelection().isComplete()).toBe(false)
    })

    it('returns false when only start is set', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10))
      expect(sel.isComplete()).toBe(false)
    })

    it('returns true when both are set', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 10), new CalendarDate(2025, 6, 20))
      expect(sel.isComplete()).toBe(true)
    })
  })

  describe('range across months and years', () => {
    it('handles range spanning multiple months', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 6, 25), new CalendarDate(2025, 8, 5))
      expect(sel.isInRange(new CalendarDate(2025, 7, 15))).toBe(true)
      expect(sel.isInRange(new CalendarDate(2025, 6, 24))).toBe(false)
      expect(sel.isInRange(new CalendarDate(2025, 8, 6))).toBe(false)
    })

    it('handles range spanning years', () => {
      const sel = new RangeSelection(new CalendarDate(2025, 12, 20), new CalendarDate(2026, 1, 10))
      expect(sel.isInRange(new CalendarDate(2025, 12, 31))).toBe(true)
      expect(sel.isInRange(new CalendarDate(2026, 1, 1))).toBe(true)
      expect(sel.isInRange(new CalendarDate(2025, 12, 19))).toBe(false)
    })
  })

  describe('single-day range', () => {
    it('supports start === end (single day range)', () => {
      const date = new CalendarDate(2025, 6, 15)
      const sel = new RangeSelection(date, date)
      expect(sel.isInRange(new CalendarDate(2025, 6, 15))).toBe(true)
      expect(sel.isInRange(new CalendarDate(2025, 6, 14))).toBe(false)
      expect(sel.isInRange(new CalendarDate(2025, 6, 16))).toBe(false)
      expect(sel.isComplete()).toBe(true)
    })
  })
})
