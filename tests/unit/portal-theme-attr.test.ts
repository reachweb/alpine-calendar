import { describe, it, expect, afterEach } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { withAlpineMocks } from '../helpers'

const mockAlpine = { initTree: () => undefined }

describe('data-rc-theme forwarding to teleported portal', () => {
  afterEach(() => {
    document.body.querySelectorAll('.rc-popup-overlay').forEach((el) => el.remove())
    document.body.querySelectorAll('.rc-calendar').forEach((el) => el.remove())
  })

  it('forwards data-rc-theme from x-data root to the teleported overlay', () => {
    const el = document.createElement('div')
    el.setAttribute('data-rc-theme', 'dark')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    const overlay = document.body.querySelector('.rc-popup-overlay')
    expect(overlay).not.toBeNull()
    if (overlay === null) throw new Error('overlay missing')
    expect(overlay.getAttribute('data-rc-theme')).toBe('dark')

    c.destroy()
  })

  it('does not set data-rc-theme on the overlay when not present on the root', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    const overlay = document.body.querySelector('.rc-popup-overlay')
    expect(overlay).not.toBeNull()
    if (overlay === null) throw new Error('overlay missing')
    expect(overlay.hasAttribute('data-rc-theme')).toBe(false)

    c.destroy()
  })

  it('re-syncs data-rc-theme on open() when the consumer toggles it between opens', () => {
    const el = document.createElement('div')
    el.setAttribute('data-rc-theme', 'dark')
    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()
    const overlay = document.body.querySelector('.rc-popup-overlay')
    if (overlay === null) throw new Error('overlay missing')
    expect(overlay.getAttribute('data-rc-theme')).toBe('dark')

    // Consumer toggles to a different theme between opens
    el.setAttribute('data-rc-theme', 'compact')
    c.open()
    expect(overlay.getAttribute('data-rc-theme')).toBe('compact')

    // Consumer removes the theme entirely — overlay should drop it too
    el.removeAttribute('data-rc-theme')
    c.open()
    expect(overlay.hasAttribute('data-rc-theme')).toBe(false)

    c.destroy()
  })

  it('does not affect inline display (no overlay to forward to)', () => {
    const el = document.createElement('div')
    el.setAttribute('data-rc-theme', 'dark')
    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })

    c.init()
    flushNextTick()

    // Inline calendar inherits data-rc-theme via DOM ancestry — no portal hop needed.
    expect(document.body.querySelector('.rc-popup-overlay')).toBeNull()
    expect(el.querySelector('.rc-calendar')).not.toBeNull()
  })
})
