import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { computePosition, autoUpdate } from '../../src/positioning/popup'
import type { PositionOptions } from '../../src/positioning/popup'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a mock element with a controllable getBoundingClientRect.
 */
function mockElement(rect: Partial<DOMRect>): Element {
  const fullRect: DOMRect = {
    x: rect.x ?? rect.left ?? 0,
    y: rect.y ?? rect.top ?? 0,
    width: rect.width ?? 0,
    height: rect.height ?? 0,
    top: rect.top ?? rect.y ?? 0,
    right: rect.right ?? (rect.left ?? 0) + (rect.width ?? 0),
    bottom: rect.bottom ?? (rect.top ?? 0) + (rect.height ?? 0),
    left: rect.left ?? rect.x ?? 0,
    toJSON: () => ({}),
  }

  return {
    getBoundingClientRect: () => fullRect,
    parentElement: null,
  } as unknown as Element
}

/**
 * Set up viewport dimensions.
 */
function setViewport(width: number, height: number) {
  Object.defineProperty(window, 'innerWidth', { value: width, writable: true })
  Object.defineProperty(window, 'innerHeight', { value: height, writable: true })
}

// ---------------------------------------------------------------------------
// computePosition — basic placement
// ---------------------------------------------------------------------------

describe('computePosition', () => {
  beforeEach(() => {
    setViewport(1024, 768)
  })

  describe('bottom-start (default)', () => {
    it('positions below reference, aligned to left edge', () => {
      const reference = mockElement({ left: 100, top: 200, width: 200, height: 40 })
      const floating = mockElement({ width: 300, height: 250 })

      const result = computePosition(reference, floating)

      expect(result.x).toBe(100)
      expect(result.y).toBe(244) // 200 + 40 + 4 (default offset)
      expect(result.placement).toBe('bottom-start')
    })

    it('uses custom offset', () => {
      const reference = mockElement({ left: 100, top: 200, width: 200, height: 40 })
      const floating = mockElement({ width: 300, height: 250 })

      const result = computePosition(reference, floating, { offset: 8 })

      expect(result.y).toBe(248) // 200 + 40 + 8
    })
  })

  describe('bottom-end', () => {
    it('positions below reference, aligned to right edge', () => {
      const reference = mockElement({ left: 500, top: 200, width: 200, height: 40 })
      const floating = mockElement({ width: 300, height: 250 })

      const result = computePosition(reference, floating, { placement: 'bottom-end' })

      expect(result.x).toBe(400) // 500 + 200 - 300
      expect(result.y).toBe(244)
      expect(result.placement).toBe('bottom-end')
    })
  })

  describe('top-start', () => {
    it('positions above reference, aligned to left edge', () => {
      const reference = mockElement({ left: 100, top: 400, width: 200, height: 40 })
      const floating = mockElement({ width: 300, height: 250 })

      const result = computePosition(reference, floating, { placement: 'top-start' })

      expect(result.x).toBe(100)
      expect(result.y).toBe(146) // 400 - 4 - 250
      expect(result.placement).toBe('top-start')
    })
  })

  describe('top-end', () => {
    it('positions above reference, aligned to right edge', () => {
      const reference = mockElement({ left: 500, top: 400, width: 200, height: 40 })
      const floating = mockElement({ width: 300, height: 250 })

      const result = computePosition(reference, floating, { placement: 'top-end' })

      expect(result.x).toBe(400) // 500 + 200 - 300
      expect(result.y).toBe(146)
      expect(result.placement).toBe('top-end')
    })
  })
})

// ---------------------------------------------------------------------------
// computePosition — flip behavior
// ---------------------------------------------------------------------------

describe('computePosition — flip', () => {
  beforeEach(() => {
    setViewport(1024, 768)
  })

  it('flips from bottom to top when no space below', () => {
    // Reference near bottom of viewport
    const reference = mockElement({ left: 100, top: 600, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'bottom-start' })

    // 600 + 40 + 4 + 250 = 894 > 768 → flip to top
    expect(result.placement).toBe('top-start')
    expect(result.y).toBe(346) // 600 - 4 - 250
  })

  it('flips from top to bottom when no space above', () => {
    // Reference near top of viewport
    const reference = mockElement({ left: 100, top: 50, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'top-start' })

    // 50 - 4 - 250 = -204 < 0 → flip to bottom
    expect(result.placement).toBe('bottom-start')
    expect(result.y).toBe(94) // 50 + 40 + 4
  })

  it('does not flip when flip is disabled', () => {
    const reference = mockElement({ left: 100, top: 600, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, {
      placement: 'bottom-start',
      flip: false,
    })

    expect(result.placement).toBe('bottom-start')
    expect(result.y).toBe(644) // stays below even though it overflows
  })

  it('stays at requested placement when enough space', () => {
    const reference = mockElement({ left: 100, top: 200, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'bottom-start' })

    // 200 + 40 + 4 + 250 = 494 < 768 → no flip needed
    expect(result.placement).toBe('bottom-start')
  })

  it('preserves horizontal alignment when flipping', () => {
    const reference = mockElement({ left: 500, top: 600, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'bottom-end' })

    expect(result.placement).toBe('top-end')
    expect(result.x).toBe(400) // right-aligned: 500 + 200 - 300
  })

  it('stays bottom when cannot fit above either (prefers bottom)', () => {
    // Tiny viewport, reference in middle — can't fit above or below
    setViewport(1024, 200)
    const reference = mockElement({ left: 100, top: 80, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'bottom-start' })

    // Neither fits, so stays at requested placement
    expect(result.placement).toBe('bottom-start')
    expect(result.y).toBe(124) // 80 + 40 + 4
  })

  it('stays top when cannot fit below either (prefers top)', () => {
    setViewport(1024, 200)
    const reference = mockElement({ left: 100, top: 80, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'top-start' })

    // Neither fits, so stays at requested, clamped to 0
    expect(result.placement).toBe('top-start')
    expect(result.y).toBe(0) // max(0, 80 - 4 - 250) = max(0, -174) = 0
  })
})

// ---------------------------------------------------------------------------
// computePosition — horizontal clamping
// ---------------------------------------------------------------------------

describe('computePosition — horizontal clamping', () => {
  beforeEach(() => {
    setViewport(1024, 768)
  })

  it('clamps x to 0 when reference is at far left', () => {
    const reference = mockElement({ left: -50, top: 200, width: 100, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'bottom-start' })

    expect(result.x).toBe(0)
  })

  it('clamps x to prevent overflow on the right', () => {
    const reference = mockElement({ left: 900, top: 200, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'bottom-start' })

    expect(result.x).toBe(724) // 1024 - 300
  })

  it('does not clamp when popup fits', () => {
    const reference = mockElement({ left: 200, top: 200, width: 200, height: 40 })
    const floating = mockElement({ width: 300, height: 250 })

    const result = computePosition(reference, floating, { placement: 'bottom-start' })

    expect(result.x).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// computePosition — edge cases
// ---------------------------------------------------------------------------

describe('computePosition — edge cases', () => {
  it('works with zero-size floating element', () => {
    setViewport(1024, 768)
    const reference = mockElement({ left: 100, top: 200, width: 200, height: 40 })
    const floating = mockElement({ width: 0, height: 0 })

    const result = computePosition(reference, floating)

    expect(result.x).toBe(100)
    expect(result.y).toBe(244)
  })

  it('works with defaults (no options)', () => {
    setViewport(1024, 768)
    const reference = mockElement({ left: 50, top: 100, width: 150, height: 30 })
    const floating = mockElement({ width: 280, height: 200 })

    const result = computePosition(reference, floating)

    expect(result.placement).toBe('bottom-start')
    expect(result.x).toBe(50)
    expect(result.y).toBe(134) // 100 + 30 + 4
  })
})

// ---------------------------------------------------------------------------
// autoUpdate
// ---------------------------------------------------------------------------

describe('autoUpdate', () => {
  let cleanupFns: (() => void)[]

  beforeEach(() => {
    cleanupFns = []
    vi.useFakeTimers()
  })

  afterEach(() => {
    for (const cleanup of cleanupFns) cleanup()
    cleanupFns = []
    vi.useRealTimers()
  })

  it('returns a cleanup function', () => {
    const reference = mockElement({ left: 0, top: 0, width: 100, height: 40 })
    Object.assign(reference, { parentElement: null })

    const cleanup = autoUpdate(reference, vi.fn())
    cleanupFns.push(cleanup)

    expect(typeof cleanup).toBe('function')
  })

  it('calls update on window resize', async () => {
    const reference = mockElement({ left: 0, top: 0, width: 100, height: 40 })
    Object.assign(reference, { parentElement: null })

    const update = vi.fn()
    const cleanup = autoUpdate(reference, update)
    cleanupFns.push(cleanup)

    window.dispatchEvent(new Event('resize'))

    // Uses rAF by default
    vi.advanceTimersByTime(20)
    await Promise.resolve()

    expect(update).toHaveBeenCalled()
  })

  it('stops calling update after cleanup', async () => {
    const reference = mockElement({ left: 0, top: 0, width: 100, height: 40 })
    Object.assign(reference, { parentElement: null })

    const update = vi.fn()
    const cleanup = autoUpdate(reference, update)

    cleanup()

    window.dispatchEvent(new Event('resize'))
    vi.advanceTimersByTime(20)
    await Promise.resolve()

    expect(update).not.toHaveBeenCalled()
  })

  it('throttles rapid events', async () => {
    const reference = mockElement({ left: 0, top: 0, width: 100, height: 40 })
    Object.assign(reference, { parentElement: null })

    const update = vi.fn()
    const cleanup = autoUpdate(reference, update, 100)
    cleanupFns.push(cleanup)

    // Fire 5 rapid events
    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new Event('resize'))
    }

    // Only one should be scheduled
    vi.advanceTimersByTime(110)
    expect(update).toHaveBeenCalledTimes(1)
  })

  it('cancels pending setTimeout on cleanup (throttleMs > 16)', () => {
    const reference = mockElement({ left: 0, top: 0, width: 100, height: 40 })
    Object.assign(reference, { parentElement: null })

    const update = vi.fn()
    const cleanup = autoUpdate(reference, update, 100)

    // Trigger a throttled event
    window.dispatchEvent(new Event('resize'))

    // Cleanup before the timeout fires
    cleanup()

    // Advance past the throttle interval — update should NOT fire
    vi.advanceTimersByTime(200)
    expect(update).not.toHaveBeenCalled()
  })
})
