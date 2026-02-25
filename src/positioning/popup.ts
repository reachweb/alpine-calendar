/**
 * Lightweight popup positioning engine.
 *
 * Calculates fixed-position coordinates for a floating element relative to
 * a reference element. Supports automatic flipping when the popup would
 * overflow the viewport.
 *
 * No external dependencies — replaces Floating UI for simple use cases.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Placement = 'bottom-start' | 'bottom-end' | 'top-start' | 'top-end'

export interface PositionOptions {
  /** Preferred placement. Default: 'bottom-start'. */
  placement?: Placement
  /** Offset in pixels between reference and floating element. Default: 4. */
  offset?: number
  /** Whether to flip to the opposite side when there's not enough space. Default: true. */
  flip?: boolean
}

export interface PositionResult {
  /** X coordinate (CSS `left`) for `position: fixed`. */
  x: number
  /** Y coordinate (CSS `top`) for `position: fixed`. */
  y: number
  /** Actual placement after potential flip. */
  placement: Placement
}

// ---------------------------------------------------------------------------
// Core positioning
// ---------------------------------------------------------------------------

/**
 * Compute fixed-position coordinates for a floating element.
 *
 * Uses `getBoundingClientRect()` on both the reference and floating elements
 * to calculate position. The floating element must be in the DOM (but can
 * be hidden with `visibility: hidden`) so its dimensions are measurable.
 *
 * @param reference - The trigger/anchor element
 * @param floating  - The popup element to position
 * @param options   - Positioning options
 * @returns Position coordinates and resolved placement
 */
export function computePosition(
  reference: Element,
  floating: Element,
  options: PositionOptions = {},
): PositionResult {
  const placement = options.placement ?? 'bottom-start'
  const offset = options.offset ?? 4
  const flip = options.flip ?? true

  const refRect = reference.getBoundingClientRect()
  const floatRect = floating.getBoundingClientRect()
  const viewportHeight = window.innerHeight
  const viewportWidth = window.innerWidth

  // Calculate x (horizontal alignment)
  let x: number
  const side = placement.includes('start') ? 'start' : 'end'
  if (side === 'start') {
    x = refRect.left
  } else {
    x = refRect.right - floatRect.width
  }

  // Clamp x to viewport
  x = clamp(x, 0, Math.max(0, viewportWidth - floatRect.width))

  // Calculate y based on vertical side
  const isBottom = placement.startsWith('bottom')
  let resolvedPlacement = placement

  if (isBottom) {
    const yBelow = refRect.bottom + offset
    const fitsBelow = yBelow + floatRect.height <= viewportHeight

    if (!fitsBelow && flip) {
      const yAbove = refRect.top - offset - floatRect.height
      const fitsAbove = yAbove >= 0

      if (fitsAbove) {
        resolvedPlacement = placement.replace('bottom', 'top') as Placement
        return { x, y: yAbove, placement: resolvedPlacement }
      }
    }

    return { x, y: yBelow, placement: resolvedPlacement }
  }

  // top placement
  const yAbove = refRect.top - offset - floatRect.height

  if (yAbove < 0 && flip) {
    const yBelow = refRect.bottom + offset
    const fitsBelow = yBelow + floatRect.height <= viewportHeight

    if (fitsBelow) {
      resolvedPlacement = placement.replace('top', 'bottom') as Placement
      return { x, y: yBelow, placement: resolvedPlacement }
    }
  }

  return { x, y: Math.max(0, yAbove), placement: resolvedPlacement }
}

// ---------------------------------------------------------------------------
// Auto-update (scroll/resize listener)
// ---------------------------------------------------------------------------

/**
 * Subscribe to scroll and resize events that could affect popup position.
 *
 * Calls `update()` whenever the reference element's position may have
 * changed due to scrolling or window resize. Uses passive event listeners
 * and throttles callbacks for performance.
 *
 * @param reference - The trigger/anchor element
 * @param update    - Callback to recalculate position
 * @param throttleMs - Throttle interval in ms. Default: 16 (~60fps)
 * @returns Cleanup function to remove all listeners
 */
export function autoUpdate(reference: Element, update: () => void, throttleMs = 16): () => void {
  let ticking = false
  let rafId = 0

  const onEvent = () => {
    if (ticking) return
    ticking = true

    if (throttleMs <= 16) {
      // Use rAF for frame-rate throttling
      rafId = requestAnimationFrame(() => {
        update()
        ticking = false
      })
    } else {
      setTimeout(() => {
        update()
        ticking = false
      }, throttleMs)
    }
  }

  // Listen on window for resize
  window.addEventListener('resize', onEvent, { passive: true })

  // Listen on all scrollable ancestors
  const scrollParents = getScrollParents(reference)
  for (const parent of scrollParents) {
    parent.addEventListener('scroll', onEvent, { passive: true })
  }

  return () => {
    cancelAnimationFrame(rafId)
    window.removeEventListener('resize', onEvent)
    for (const parent of scrollParents) {
      parent.removeEventListener('scroll', onEvent)
    }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

/**
 * Walk up the DOM tree and collect all scrollable ancestors.
 * Includes the document for top-level scroll.
 */
function getScrollParents(element: Element): EventTarget[] {
  const parents: EventTarget[] = []
  let current = element.parentElement

  while (current) {
    const style = getComputedStyle(current)
    const overflow = style.overflow + style.overflowX + style.overflowY

    if (/auto|scroll|overlay/.test(overflow)) {
      parents.push(current)
    }

    current = current.parentElement
  }

  // Always listen on document (handles body scroll)
  parents.push(document)

  return parents
}
