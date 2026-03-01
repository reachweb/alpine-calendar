import { vi } from 'vitest'
import type { createCalendarData } from '../src/plugin/calendar-component'

type CalendarComponent = ReturnType<typeof createCalendarData>

/**
 * Inject Alpine magic properties ($watch, $refs, $nextTick, $el) and
 * a `_rootEl` with an intercepted `dispatchEvent` so tests can assert
 * on dispatched CustomEvents via `dispatchSpy`.
 */
export function withAlpineMocks(
  component: CalendarComponent,
  options?: { refs?: Record<string, HTMLElement>; el?: HTMLElement },
) {
  const dispatchSpy = vi.fn()
  const watchCallbacks = new Map<string, (() => void)[]>()
  const watchSpy = vi.fn((prop: string, cb: () => void) => {
    if (!watchCallbacks.has(prop)) watchCallbacks.set(prop, [])
    watchCallbacks.get(prop)!.push(cb)
  })
  const nextTickCallbacks: (() => void)[] = []

  const rootEl = options?.el ?? document.createElement('div')
  rootEl.dispatchEvent = ((event: Event) => {
    if (event instanceof CustomEvent) {
      dispatchSpy(event.type, event.detail)
    }
    return true
  }) as typeof rootEl.dispatchEvent

  Object.assign(component, {
    $watch: watchSpy,
    $refs: options?.refs ?? {},
    $nextTick: (cb: () => void) => nextTickCallbacks.push(cb),
    $el: rootEl,
    _rootEl: rootEl,
  })

  const flushNextTick = () => {
    while (nextTickCallbacks.length > 0) {
      const cb = nextTickCallbacks.shift()
      cb?.()
    }
  }

  const triggerWatch = (prop: string) => {
    const cbs = watchCallbacks.get(prop) ?? []
    for (const cb of cbs) cb()
  }

  return { dispatchSpy, watchSpy, flushNextTick, triggerWatch }
}
