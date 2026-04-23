import { describe, it, expect, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { withAlpineMocks } from '../helpers'

const mockAlpine = { initTree: () => undefined }

interface CalendarInternals {
  _popupOverlayEl: HTMLElement | null
  _autoRendered: boolean
}

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
    expect((c as unknown as CalendarInternals)._popupOverlayEl).toBe(overlay)

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
    expect((c as unknown as CalendarInternals)._popupOverlayEl).toBeNull()
  })

  it('does not teleport in inline display mode', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    // No overlay on body for inline mode
    expect(document.body.querySelector('.rc-popup-overlay')).toBeNull()
    expect((c as unknown as CalendarInternals)._popupOverlayEl).toBeNull()

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
    expect((c as unknown as CalendarInternals)._popupOverlayEl).toBeNull()
  })

  it('_autoRendered is true after popup auto-rendering with teleport', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    expect((c as unknown as CalendarInternals)._autoRendered).toBe(true)

    c.destroy()
  })

  it('teleported overlay has data-rc-portal attribute for host outside-click whitelisting', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    const overlay = document.body.querySelector('.rc-popup-overlay') as HTMLElement
    expect(overlay).not.toBeNull()
    expect(overlay.hasAttribute('data-rc-portal')).toBe(true)

    c.destroy()
  })

  it('clicks inside the teleported overlay still bubble to document', () => {
    // The library does NOT call stopPropagation. Host apps with document-level
    // click handlers (analytics, custom outside-click) receive clicks from the
    // calendar and can whitelist them via the data-rc-portal attribute.
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    const overlay = document.body.querySelector('.rc-popup-overlay')
    expect(overlay).not.toBeNull()
    if (!overlay) throw new Error('Expected teleported overlay to exist')

    let documentClicked = false
    const handler = () => {
      documentClicked = true
    }
    document.addEventListener('click', handler)

    try {
      overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      expect(documentClicked).toBe(true)
    } finally {
      document.removeEventListener('click', handler)
      c.destroy()
    }
  })
})
