import { describe, it, expect } from 'vitest'
import { calendarPlugin } from '../../src/index'

describe('smoke test', () => {
  it('exports calendarPlugin as a function', () => {
    expect(typeof calendarPlugin).toBe('function')
  })

  it('plugin registers calendar data when called with Alpine mock', () => {
    const registered: Record<string, unknown> = {}
    const mockAlpine = {
      data: (name: string, factory: unknown) => {
        registered[name] = factory
      },
    }

    calendarPlugin(mockAlpine as never)

    expect(registered).toHaveProperty('calendar')
    expect(typeof registered['calendar']).toBe('function')
  })

  it('calendar factory returns correct default config', () => {
    let factory: ((config?: Record<string, unknown>) => Record<string, unknown>) | null = null
    const mockAlpine = {
      data: (_name: string, fn: typeof factory) => {
        factory = fn
      },
    }

    calendarPlugin(mockAlpine as never)

    const instance = factory!()
    expect(instance.mode).toBe('single')
    expect(instance.display).toBe('inline')
  })

  it('calendar factory respects passed config', () => {
    let factory: ((config?: Record<string, unknown>) => Record<string, unknown>) | null = null
    const mockAlpine = {
      data: (_name: string, fn: typeof factory) => {
        factory = fn
      },
    }

    calendarPlugin(mockAlpine as never)

    const instance = factory!({ mode: 'range', display: 'popup' })
    expect(instance.mode).toBe('range')
    expect(instance.display).toBe('popup')
  })
})
