import { describe, it, expect, vi, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'

/**
 * Inject mock Alpine magic properties onto a component.
 */
function withAlpineMocks(
  component: ReturnType<typeof createCalendarData>,
  options?: { refs?: Record<string, HTMLElement>; el?: HTMLElement },
) {
  const dispatchSpy = vi.fn()
  const watchSpy = vi.fn()
  const refs = options?.refs ?? {}
  const nextTickCallbacks: (() => void)[] = []

  Object.assign(component, {
    $dispatch: dispatchSpy,
    $watch: watchSpy,
    $refs: refs,
    $nextTick: (cb: () => void) => nextTickCallbacks.push(cb),
    $el: options?.el ?? document.createElement('div'),
  })

  const flushNextTick = () => {
    while (nextTickCallbacks.length > 0) {
      const cb = nextTickCallbacks.shift()
      cb?.()
    }
  }

  return { dispatchSpy, watchSpy, flushNextTick }
}

const mockAlpine = { initTree: () => {} }

describe('popup teleport to document.body', () => {
  afterEach(() => {
    document.body.querySelectorAll('.rc-popup-overlay').forEach((el) => el.remove())
    document.body.querySelectorAll('.rc-calendar').forEach((el) => el.remove())
  })

  it('teleports auto-rendered popup overlay to document.body', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    // Overlay should NOT be inside the component element
    expect(el.querySelector('.rc-popup-overlay')).toBeNull()

    // Overlay SHOULD be on document.body
    const overlay = document.body.querySelector('.rc-popup-overlay')
    expect(overlay).not.toBeNull()

    // Internal reference should be set
    expect((c as any)._popupOverlayEl).toBe(overlay)

    c.destroy()
  })

  it('destroy() removes teleported overlay from body', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    expect(document.body.querySelector('.rc-popup-overlay')).not.toBeNull()

    c.destroy()

    expect(document.body.querySelector('.rc-popup-overlay')).toBeNull()
    expect((c as any)._popupOverlayEl).toBeNull()
  })

  it('does not teleport in inline display mode', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    // No overlay on body for inline mode
    expect(document.body.querySelector('.rc-popup-overlay')).toBeNull()
    expect((c as any)._popupOverlayEl).toBeNull()

    // Calendar should still be rendered inside the element
    expect(el.querySelector('.rc-calendar')).not.toBeNull()
  })

  it('does not teleport when template is manually provided', () => {
    const el = document.createElement('div')
    // Add a manual .rc-calendar so auto-rendering is skipped
    const manualCal = document.createElement('div')
    manualCal.className = 'rc-calendar'
    el.appendChild(manualCal)

    const c = createCalendarData({ display: 'popup' })
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    // No teleporting since auto-rendering didn't happen
    expect(document.body.querySelector('.rc-popup-overlay')).toBeNull()
    expect((c as any)._popupOverlayEl).toBeNull()
  })

  it('_autoRendered is true after popup auto-rendering with teleport', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    expect((c as any)._autoRendered).toBe(true)

    c.destroy()
  })
})
