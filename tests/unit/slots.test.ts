import { describe, it, expect, afterEach, vi } from 'vitest'
import { createCalendarData } from '../../src/plugin/calendar-component'
import { withAlpineMocks } from '../helpers'

const mockAlpine = { initTree: () => undefined }

afterEach(() => {
  document.body.querySelectorAll('.rc-popup-overlay').forEach((el) => el.remove())
  document.body.querySelectorAll('.rc-calendar').forEach((el) => el.remove())
})

describe('header / footer slots — extraction & rendering', () => {
  it('renders a footer slot inside .rc-calendar with the slot HTML', () => {
    const el = document.createElement('div')
    const tpl = document.createElement('template')
    tpl.setAttribute('data-rc-slot', 'footer')
    tpl.innerHTML = '<p class="my-footer">Charters Sat to Sat. <a href="/c">Contact</a></p>'
    el.appendChild(tpl)

    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    const footer = el.querySelector('.rc-calendar__footer')
    expect(footer).not.toBeNull()
    if (footer === null) throw new Error('footer missing')
    expect(footer.querySelector('.my-footer')).not.toBeNull()
    expect(footer.textContent).toContain('Charters Sat to Sat')
  })

  it('renders a header slot inside .rc-calendar with the slot HTML', () => {
    const el = document.createElement('div')
    const tpl = document.createElement('template')
    tpl.setAttribute('data-rc-slot', 'header')
    tpl.innerHTML = '<p class="my-header">Pick a date</p>'
    el.appendChild(tpl)

    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    const header = el.querySelector('.rc-calendar__header')
    expect(header).not.toBeNull()
    if (header === null) throw new Error('header missing')
    expect(header.querySelector('.my-header')).not.toBeNull()
  })

  it('places the header slot above the day grid and the footer slot below it', () => {
    const el = document.createElement('div')
    const headerTpl = document.createElement('template')
    headerTpl.setAttribute('data-rc-slot', 'header')
    headerTpl.innerHTML = '<p>HEADER</p>'
    const footerTpl = document.createElement('template')
    footerTpl.setAttribute('data-rc-slot', 'footer')
    footerTpl.innerHTML = '<p>FOOTER</p>'
    el.appendChild(headerTpl)
    el.appendChild(footerTpl)

    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    const calendar = el.querySelector('.rc-calendar')
    if (calendar === null) throw new Error('calendar missing')
    const children = Array.from(calendar.children)
    const headerIdx = children.findIndex((child) => child.classList.contains('rc-calendar__header'))
    const footerIdx = children.findIndex((child) => child.classList.contains('rc-calendar__footer'))

    expect(headerIdx).toBeGreaterThanOrEqual(0)
    expect(footerIdx).toBeGreaterThanOrEqual(0)
    expect(headerIdx).toBeLessThan(footerIdx)
  })

  it('removes the source <template data-rc-slot> after extraction', () => {
    const el = document.createElement('div')
    const tpl = document.createElement('template')
    tpl.setAttribute('data-rc-slot', 'footer')
    tpl.innerHTML = '<p>x</p>'
    el.appendChild(tpl)

    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(el.querySelector('template[data-rc-slot]')).toBeNull()
  })

  it('does not render slot containers when no slots are provided (zero overhead)', () => {
    const el = document.createElement('div')
    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(el.querySelector('.rc-calendar__header')).toBeNull()
    expect(el.querySelector('.rc-calendar__footer')).toBeNull()
  })

  it('forwards slots through to the teleported popup overlay', () => {
    const el = document.createElement('div')
    const tpl = document.createElement('template')
    tpl.setAttribute('data-rc-slot', 'footer')
    tpl.innerHTML = '<p class="my-footer">portal-footer</p>'
    el.appendChild(tpl)

    const c = createCalendarData({ display: 'popup' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    const overlay = document.body.querySelector('.rc-popup-overlay')
    if (overlay === null) throw new Error('overlay missing')
    const footer = overlay.querySelector('.rc-calendar__footer')
    expect(footer).not.toBeNull()
    if (footer === null) throw new Error('footer missing')
    expect(footer.querySelector('.my-footer')).not.toBeNull()

    c.destroy()
  })

  it('skips slots whose innerHTML is whitespace-only', () => {
    const el = document.createElement('div')
    const tpl = document.createElement('template')
    tpl.setAttribute('data-rc-slot', 'footer')
    tpl.innerHTML = '   '
    el.appendChild(tpl)

    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(el.querySelector('.rc-calendar__footer')).toBeNull()
  })

  it('warns and leaves unknown slot names in place for debuggability', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    const el = document.createElement('div')
    const typoTpl = document.createElement('template')
    typoTpl.setAttribute('data-rc-slot', 'heder')
    typoTpl.innerHTML = '<p>typo</p>'
    el.appendChild(typoTpl)

    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    expect(el.querySelector('template[data-rc-slot="heder"]')).not.toBeNull()
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('unknown data-rc-slot="heder"'))
    warnSpy.mockRestore()
  })

  it('only honors the first occurrence per slot name (additional templates ignored)', () => {
    const el = document.createElement('div')
    const tpl1 = document.createElement('template')
    tpl1.setAttribute('data-rc-slot', 'footer')
    tpl1.innerHTML = '<p>FIRST</p>'
    const tpl2 = document.createElement('template')
    tpl2.setAttribute('data-rc-slot', 'footer')
    tpl2.innerHTML = '<p>SECOND</p>'
    el.appendChild(tpl1)
    el.appendChild(tpl2)

    const c = createCalendarData({ display: 'inline' }, mockAlpine)
    const { flushNextTick } = withAlpineMocks(c, { el })
    c.init()
    flushNextTick()

    const footer = el.querySelector('.rc-calendar__footer')
    if (footer === null) throw new Error('footer missing')
    expect(footer.textContent).toContain('FIRST')
    expect(footer.textContent).not.toContain('SECOND')
  })
})
