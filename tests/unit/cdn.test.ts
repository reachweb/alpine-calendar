import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * Tests for the CDN auto-registration entry point (src/cdn.ts).
 *
 * The CDN build is an IIFE that:
 *  1. Registers the plugin immediately if window.Alpine exists
 *  2. Listens for 'alpine:init' to register later (Livewire v3 compat)
 *  3. Is idempotent — safe to trigger both paths without double-registration
 *  4. Does NOT bundle Alpine — it reads window.Alpine at runtime
 */
describe('CDN auto-registration', () => {
  // Track event listeners added during each test so we can clean them up.
  // Each import of cdn.ts adds a permanent 'alpine:init' listener — without
  // cleanup, later tests would trigger stale listeners from previous imports.
  const trackedListeners: Array<[string, EventListener]> = []
  let originalAddEventListener: typeof document.addEventListener

  beforeEach(() => {
    // Reset the module registry so each test re-evaluates cdn.ts from scratch
    vi.resetModules()
    // Clean up window.Alpine between tests
    delete (window as Record<string, unknown>).Alpine

    // Intercept addEventListener to track and later remove listeners
    originalAddEventListener = document.addEventListener.bind(document)
    vi.spyOn(document, 'addEventListener').mockImplementation(
      (
        type: string,
        listener: EventListenerOrEventListenerObject,
        options?: boolean | AddEventListenerOptions,
      ) => {
        trackedListeners.push([type, listener as EventListener])
        originalAddEventListener(type, listener, options)
      },
    )
  })

  afterEach(() => {
    // Remove all event listeners added during this test
    for (const [type, listener] of trackedListeners) {
      document.removeEventListener(type, listener)
    }
    trackedListeners.length = 0
    vi.restoreAllMocks()
  })

  it('registers plugin immediately when window.Alpine exists at load time', async () => {
    const pluginSpy = vi.fn()
    ;(window as Record<string, unknown>).Alpine = {
      plugin: pluginSpy,
      data: vi.fn(),
    }

    await import('../../src/cdn')

    expect(pluginSpy).toHaveBeenCalledOnce()
    expect(pluginSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('does not register when window.Alpine is absent at load time', async () => {
    // window.Alpine is undefined — no registration should happen on import
    await import('../../src/cdn')

    // If Alpine becomes available later, registration hasn't happened yet
    const pluginSpy = vi.fn()
    ;(window as Record<string, unknown>).Alpine = {
      plugin: pluginSpy,
      data: vi.fn(),
    }

    // Without dispatching alpine:init, plugin should NOT have been called
    expect(pluginSpy).not.toHaveBeenCalled()
  })

  it('registers plugin on alpine:init event when Alpine was not present at load time', async () => {
    // Load cdn.ts without Alpine on window
    await import('../../src/cdn')

    // Now Alpine becomes available (e.g., script loaded later)
    const pluginSpy = vi.fn()
    ;(window as Record<string, unknown>).Alpine = {
      plugin: pluginSpy,
      data: vi.fn(),
    }

    // Simulate Alpine firing its init event
    document.dispatchEvent(new Event('alpine:init'))

    expect(pluginSpy).toHaveBeenCalledOnce()
    expect(pluginSpy).toHaveBeenCalledWith(expect.any(Function))
  })

  it('is idempotent — does not register twice when both paths fire', async () => {
    const pluginSpy = vi.fn()
    ;(window as Record<string, unknown>).Alpine = {
      plugin: pluginSpy,
      data: vi.fn(),
    }

    // Alpine is present at load time → immediate registration
    await import('../../src/cdn')
    expect(pluginSpy).toHaveBeenCalledOnce()

    // alpine:init fires afterward → should NOT re-register
    document.dispatchEvent(new Event('alpine:init'))
    expect(pluginSpy).toHaveBeenCalledOnce()
  })

  it('registers the calendar data factory via the plugin function', async () => {
    const dataRegistrations: Record<string, unknown> = {}

    ;(window as Record<string, unknown>).Alpine = {
      plugin: (fn: (alpine: Record<string, unknown>) => void) => {
        // Execute the plugin function with our mock Alpine
        fn((window as Record<string, unknown>).Alpine as Record<string, unknown>)
      },
      data: (name: string, factory: unknown) => {
        dataRegistrations[name] = factory
      },
    }

    await import('../../src/cdn')

    expect(dataRegistrations).toHaveProperty('calendar')
    expect(typeof dataRegistrations['calendar']).toBe('function')
  })

  it('calendar factory from CDN returns correct default config', async () => {
    let calendarFactory: ((config?: Record<string, unknown>) => Record<string, unknown>) | null =
      null

    ;(window as Record<string, unknown>).Alpine = {
      plugin: (fn: (alpine: Record<string, unknown>) => void) => {
        fn((window as Record<string, unknown>).Alpine as Record<string, unknown>)
      },
      data: (_name: string, factory: typeof calendarFactory) => {
        calendarFactory = factory
      },
    }

    await import('../../src/cdn')

    expect(calendarFactory).not.toBeNull()

    const instance = calendarFactory!()
    expect(instance.mode).toBe('single')
    expect(instance.display).toBe('inline')
    expect(instance.format).toBe('DD/MM/YYYY')
  })

  it('does not throw when window.Alpine is present but alpine:init fires anyway', async () => {
    ;(window as Record<string, unknown>).Alpine = {
      plugin: vi.fn(),
      data: vi.fn(),
    }

    await import('../../src/cdn')

    // Fire alpine:init — should not throw even though already registered
    expect(() => {
      document.dispatchEvent(new Event('alpine:init'))
    }).not.toThrow()
  })
})
