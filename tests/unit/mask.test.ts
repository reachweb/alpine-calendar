import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  parseFormatToSlots,
  createMask,
  createMaskHandlers,
  attachMask,
} from '../../src/input/mask'

// ---------------------------------------------------------------------------
// parseFormatToSlots
// ---------------------------------------------------------------------------

describe('parseFormatToSlots', () => {
  it('parses DD/MM/YYYY into 10 slots', () => {
    const slots = parseFormatToSlots('DD/MM/YYYY')
    expect(slots).toHaveLength(10)
  })

  it('maps DD to two digit slots', () => {
    const slots = parseFormatToSlots('DD/MM/YYYY')
    expect(slots[0]).toEqual({ type: 'digit', char: '9' })
    expect(slots[1]).toEqual({ type: 'digit', char: '9' })
  })

  it('maps / to a literal slot', () => {
    const slots = parseFormatToSlots('DD/MM/YYYY')
    expect(slots[2]).toEqual({ type: 'literal', char: '/' })
    expect(slots[5]).toEqual({ type: 'literal', char: '/' })
  })

  it('maps MM to two digit slots', () => {
    const slots = parseFormatToSlots('DD/MM/YYYY')
    expect(slots[3]).toEqual({ type: 'digit', char: '9' })
    expect(slots[4]).toEqual({ type: 'digit', char: '9' })
  })

  it('maps YYYY to four digit slots', () => {
    const slots = parseFormatToSlots('DD/MM/YYYY')
    expect(slots[6]).toEqual({ type: 'digit', char: '9' })
    expect(slots[7]).toEqual({ type: 'digit', char: '9' })
    expect(slots[8]).toEqual({ type: 'digit', char: '9' })
    expect(slots[9]).toEqual({ type: 'digit', char: '9' })
  })

  it('parses YYYY-MM-DD correctly', () => {
    const slots = parseFormatToSlots('YYYY-MM-DD')
    expect(slots).toHaveLength(10)
    expect(slots[4]).toEqual({ type: 'literal', char: '-' })
    expect(slots[7]).toEqual({ type: 'literal', char: '-' })
  })

  it('parses DD.MM.YYYY with dot separators', () => {
    const slots = parseFormatToSlots('DD.MM.YYYY')
    expect(slots[2]).toEqual({ type: 'literal', char: '.' })
    expect(slots[5]).toEqual({ type: 'literal', char: '.' })
  })

  it('parses DD/MM/YY into 8 slots', () => {
    const slots = parseFormatToSlots('DD/MM/YY')
    expect(slots).toHaveLength(8)
    expect(slots[6]).toEqual({ type: 'digit', char: '9' })
    expect(slots[7]).toEqual({ type: 'digit', char: '9' })
  })

  it('maps D and M tokens to 2 digit slots each', () => {
    const slots = parseFormatToSlots('D/M/YYYY')
    expect(slots).toHaveLength(10)
    expect(slots[0]).toEqual({ type: 'digit', char: '9' })
    expect(slots[1]).toEqual({ type: 'digit', char: '9' })
    expect(slots[2]).toEqual({ type: 'literal', char: '/' })
    expect(slots[3]).toEqual({ type: 'digit', char: '9' })
    expect(slots[4]).toEqual({ type: 'digit', char: '9' })
  })

  it('handles MM/DD/YYYY (US format)', () => {
    const slots = parseFormatToSlots('MM/DD/YYYY')
    expect(slots).toHaveLength(10)
    expect(slots.filter((s) => s.type === 'digit')).toHaveLength(8)
    expect(slots.filter((s) => s.type === 'literal')).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// createMask — properties
// ---------------------------------------------------------------------------

describe('createMask', () => {
  describe('DD/MM/YYYY', () => {
    const mask = createMask('DD/MM/YYYY')

    it('has correct pattern', () => {
      expect(mask.pattern).toBe('99/99/9999')
    })

    it('has correct format', () => {
      expect(mask.format).toBe('DD/MM/YYYY')
    })

    it('has correct length', () => {
      expect(mask.length).toBe(10)
    })

    it('has correct maxDigits', () => {
      expect(mask.maxDigits).toBe(8)
    })

    it('exposes readonly slots', () => {
      expect(mask.slots).toHaveLength(10)
    })
  })

  describe('YYYY-MM-DD', () => {
    const mask = createMask('YYYY-MM-DD')

    it('has correct pattern', () => {
      expect(mask.pattern).toBe('9999-99-99')
    })

    it('has correct length', () => {
      expect(mask.length).toBe(10)
    })

    it('has correct maxDigits', () => {
      expect(mask.maxDigits).toBe(8)
    })
  })

  describe('DD/MM/YY', () => {
    const mask = createMask('DD/MM/YY')

    it('has correct pattern', () => {
      expect(mask.pattern).toBe('99/99/99')
    })

    it('has maxDigits of 6', () => {
      expect(mask.maxDigits).toBe(6)
    })
  })
})

// ---------------------------------------------------------------------------
// createMask — apply()
// ---------------------------------------------------------------------------

describe('createMask — apply()', () => {
  describe('DD/MM/YYYY format', () => {
    const mask = createMask('DD/MM/YYYY')

    it('returns empty string for empty input', () => {
      expect(mask.apply('')).toBe('')
    })

    it('applies a single digit', () => {
      expect(mask.apply('1')).toBe('1')
    })

    it('applies two digits with auto-inserted separator', () => {
      expect(mask.apply('15')).toBe('15/')
    })

    it('applies three digits', () => {
      expect(mask.apply('150')).toBe('15/0')
    })

    it('applies four digits with second separator', () => {
      expect(mask.apply('1506')).toBe('15/06/')
    })

    it('applies partial year', () => {
      expect(mask.apply('150620')).toBe('15/06/20')
    })

    it('applies full date', () => {
      expect(mask.apply('15062025')).toBe('15/06/2025')
    })

    it('strips non-digit characters from input', () => {
      expect(mask.apply('15/06/2025')).toBe('15/06/2025')
    })

    it('strips letters from input', () => {
      expect(mask.apply('1a5b0c6d2e0f2g5')).toBe('15/06/2025')
    })

    it('truncates extra digits beyond mask capacity', () => {
      expect(mask.apply('150620251')).toBe('15/06/2025')
      expect(mask.apply('1506202512345')).toBe('15/06/2025')
    })

    it('handles whitespace-only input', () => {
      expect(mask.apply('   ')).toBe('')
    })
  })

  describe('YYYY-MM-DD format', () => {
    const mask = createMask('YYYY-MM-DD')

    it('applies four digits with separator', () => {
      expect(mask.apply('2025')).toBe('2025-')
    })

    it('applies full ISO date', () => {
      expect(mask.apply('20250615')).toBe('2025-06-15')
    })
  })

  describe('DD.MM.YYYY format', () => {
    const mask = createMask('DD.MM.YYYY')

    it('applies two digits with dot separator', () => {
      expect(mask.apply('15')).toBe('15.')
    })

    it('applies full date with dots', () => {
      expect(mask.apply('15062025')).toBe('15.06.2025')
    })
  })

  describe('DD/MM/YY format', () => {
    const mask = createMask('DD/MM/YY')

    it('applies full short-year date', () => {
      expect(mask.apply('150625')).toBe('15/06/25')
    })

    it('truncates at 6 digits', () => {
      expect(mask.apply('15062525')).toBe('15/06/25')
    })
  })
})

// ---------------------------------------------------------------------------
// Helper: create a mock input element with proper selectionStart/End support
// ---------------------------------------------------------------------------

function createInput(): HTMLInputElement {
  const input = document.createElement('input')
  input.type = 'text'
  document.body.appendChild(input)
  return input
}

/**
 * Create a mock event with the input as target.
 * jsdom events dispatched via dispatchEvent set `target` correctly,
 * but for direct handler calls we need to mock the target.
 */
function mockInputEvent(input: HTMLInputElement): Event {
  const event = new Event('input', { bubbles: true })
  Object.defineProperty(event, 'target', { value: input, writable: false })
  return event
}

function mockKeyDownEvent(
  input: HTMLInputElement,
  key: string,
): KeyboardEvent & { _defaultPrevented: boolean } {
  let prevented = false
  const event = {
    type: 'keydown',
    key,
    target: input,
    bubbles: true,
    cancelable: true,
    _defaultPrevented: false,
    get defaultPrevented() {
      return prevented
    },
    preventDefault() {
      prevented = true
      this._defaultPrevented = true
    },
  } as unknown as KeyboardEvent & { _defaultPrevented: boolean }
  return event
}

function mockPasteEvent(
  input: HTMLInputElement,
  text: string,
): ClipboardEvent & { _defaultPrevented: boolean } {
  let prevented = false
  const event = {
    type: 'paste',
    target: input,
    bubbles: true,
    cancelable: true,
    _defaultPrevented: false,
    get defaultPrevented() {
      return prevented
    },
    preventDefault() {
      prevented = true
      this._defaultPrevented = true
    },
    clipboardData: {
      getData: (type: string) => (type === 'text' ? text : ''),
    },
  } as unknown as ClipboardEvent & { _defaultPrevented: boolean }
  return event
}

// ---------------------------------------------------------------------------
// Event handlers — onInput
// ---------------------------------------------------------------------------

describe('createMaskHandlers — onInput', () => {
  let input: HTMLInputElement
  let handlers: ReturnType<typeof createMaskHandlers>

  beforeEach(() => {
    input = createInput()
    handlers = createMaskHandlers(createMask('DD/MM/YYYY'))
  })

  function simulateInput(value: string, cursorPos?: number) {
    input.value = value
    input.setSelectionRange(cursorPos ?? value.length, cursorPos ?? value.length)
    handlers.onInput(mockInputEvent(input))
  }

  it('masks a single digit', () => {
    simulateInput('1')
    expect(input.value).toBe('1')
  })

  it('masks two digits and auto-inserts separator', () => {
    simulateInput('15')
    expect(input.value).toBe('15/')
  })

  it('masks a full date from raw digits', () => {
    simulateInput('15062025')
    expect(input.value).toBe('15/06/2025')
  })

  it('strips non-digit characters typed by user', () => {
    simulateInput('15a06')
    expect(input.value).toBe('15/06/')
  })

  it('truncates digits beyond mask capacity', () => {
    simulateInput('150620251')
    expect(input.value).toBe('15/06/2025')
  })

  it('handles typing a separator character', () => {
    simulateInput('15/')
    expect(input.value).toBe('15/')
  })

  it('places cursor after auto-inserted separator', () => {
    simulateInput('15', 2)
    expect(input.value).toBe('15/')
    expect(input.selectionStart).toBe(3)
  })

  it('places cursor at end for full date', () => {
    simulateInput('15062025')
    expect(input.value).toBe('15/06/2025')
    expect(input.selectionStart).toBe(10)
  })

  it('places cursor correctly for partial input', () => {
    simulateInput('150', 3)
    expect(input.value).toBe('15/0')
    expect(input.selectionStart).toBe(4)
  })
})

// ---------------------------------------------------------------------------
// Event handlers — onKeyDown (backspace over separator)
// ---------------------------------------------------------------------------

describe('createMaskHandlers — onKeyDown backspace', () => {
  let input: HTMLInputElement
  let handlers: ReturnType<typeof createMaskHandlers>

  beforeEach(() => {
    input = createInput()
    handlers = createMaskHandlers(createMask('DD/MM/YYYY'))
  })

  it('prevents default when backspace is at a separator position', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(3, 3)
    const event = mockKeyDownEvent(input, 'Backspace')
    handlers.onKeyDown(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('deletes the digit before the separator on backspace', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(3, 3)
    handlers.onKeyDown(mockKeyDownEvent(input, 'Backspace'))
    expect(input.value).toBe('10/62/025')
  })

  it('positions cursor at the deleted digit location', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(3, 3)
    handlers.onKeyDown(mockKeyDownEvent(input, 'Backspace'))
    expect(input.selectionStart).toBe(1)
  })

  it('does not prevent default for backspace on a digit position', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(2, 2)
    const event = mockKeyDownEvent(input, 'Backspace')
    handlers.onKeyDown(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('does nothing with a selection active', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(2, 5)
    const event = mockKeyDownEvent(input, 'Backspace')
    handlers.onKeyDown(event)
    expect(event.defaultPrevented).toBe(false)
  })

  it('handles backspace at second separator', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(6, 6)
    handlers.onKeyDown(mockKeyDownEvent(input, 'Backspace'))
    expect(input.value).toBe('15/02/025')
  })
})

// ---------------------------------------------------------------------------
// Event handlers — onKeyDown (delete over separator)
// ---------------------------------------------------------------------------

describe('createMaskHandlers — onKeyDown delete', () => {
  let input: HTMLInputElement
  let handlers: ReturnType<typeof createMaskHandlers>

  beforeEach(() => {
    input = createInput()
    handlers = createMaskHandlers(createMask('DD/MM/YYYY'))
  })

  it('prevents default when delete is at a separator position', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(2, 2)
    const event = mockKeyDownEvent(input, 'Delete')
    handlers.onKeyDown(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('deletes the digit after the separator on delete', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(2, 2)
    handlers.onKeyDown(mockKeyDownEvent(input, 'Delete'))
    expect(input.value).toBe('15/62/025')
  })

  it('does not prevent default for delete on a digit position', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(0, 0)
    const event = mockKeyDownEvent(input, 'Delete')
    handlers.onKeyDown(event)
    expect(event.defaultPrevented).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// Event handlers — onPaste
// ---------------------------------------------------------------------------

describe('createMaskHandlers — onPaste', () => {
  let input: HTMLInputElement
  let handlers: ReturnType<typeof createMaskHandlers>

  beforeEach(() => {
    input = createInput()
    handlers = createMaskHandlers(createMask('DD/MM/YYYY'))
  })

  it('prevents default on paste', () => {
    input.value = ''
    input.setSelectionRange(0, 0)
    const event = mockPasteEvent(input, '15062025')
    handlers.onPaste(event)
    expect(event.defaultPrevented).toBe(true)
  })

  it('pastes a full date from raw digits', () => {
    input.value = ''
    input.setSelectionRange(0, 0)
    handlers.onPaste(mockPasteEvent(input, '15062025'))
    expect(input.value).toBe('15/06/2025')
  })

  it('pastes a formatted date, stripping separators', () => {
    input.value = ''
    input.setSelectionRange(0, 0)
    handlers.onPaste(mockPasteEvent(input, '15/06/2025'))
    expect(input.value).toBe('15/06/2025')
  })

  it('pastes into the middle of existing content', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(3, 3)
    handlers.onPaste(mockPasteEvent(input, '12'))
    // Digits: "15" + "12" + "062025" = "1512062025" → trimmed to 8: "15120620"
    expect(input.value).toBe('15/12/0620')
  })

  it('replaces selected text on paste', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(3, 5) // select "06"
    handlers.onPaste(mockPasteEvent(input, '12'))
    // Digits: "15" + "12" + "2025" = "15122025"
    expect(input.value).toBe('15/12/2025')
  })

  it('ignores paste with no digits', () => {
    input.value = '15/06/2025'
    input.setSelectionRange(0, 0)
    handlers.onPaste(mockPasteEvent(input, 'abc'))
    expect(input.value).toBe('15/06/2025')
  })

  it('truncates paste that exceeds mask capacity', () => {
    input.value = ''
    input.setSelectionRange(0, 0)
    handlers.onPaste(mockPasteEvent(input, '1506202512345'))
    expect(input.value).toBe('15/06/2025')
  })
})

// ---------------------------------------------------------------------------
// attachMask
// ---------------------------------------------------------------------------

describe('attachMask', () => {
  it('applies mask to existing value on attach', () => {
    const input = createInput()
    input.value = '15062025'
    attachMask(input, 'DD/MM/YYYY')
    expect(input.value).toBe('15/06/2025')
  })

  it('does not modify empty input on attach', () => {
    const input = createInput()
    input.value = ''
    attachMask(input, 'DD/MM/YYYY')
    expect(input.value).toBe('')
  })

  it('returns a detach function', () => {
    const input = createInput()
    const detach = attachMask(input, 'DD/MM/YYYY')
    expect(typeof detach).toBe('function')
  })

  it('detach removes event listeners', () => {
    const input = createInput()
    const detach = attachMask(input, 'DD/MM/YYYY')

    // Manually fire input with a mock event to verify handler runs
    input.value = '15'
    input.setSelectionRange(2, 2)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(input.value).toBe('15/')

    // Detach
    detach()

    // Set value again — handler should be gone
    input.value = '99'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    expect(input.value).toBe('99')
  })

  it('works with different formats', () => {
    const input = createInput()
    input.value = '20250615'
    attachMask(input, 'YYYY-MM-DD')
    expect(input.value).toBe('2025-06-15')
  })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------

describe('edge cases', () => {
  it('handles format with no separators', () => {
    const mask = createMask('DDMMYYYY')
    expect(mask.pattern).toBe('99999999')
    expect(mask.apply('15062025')).toBe('15062025')
  })

  it('handles consecutive separators', () => {
    const mask = createMask('DD//MM//YYYY')
    expect(mask.pattern).toBe('99//99//9999')
    expect(mask.apply('15062025')).toBe('15//06//2025')
  })

  it('handles single digit followed by more digits', () => {
    const mask = createMask('DD/MM/YYYY')
    expect(mask.apply('1')).toBe('1')
    expect(mask.apply('15')).toBe('15/')
    expect(mask.apply('150')).toBe('15/0')
  })

  it('apply is idempotent', () => {
    const mask = createMask('DD/MM/YYYY')
    const first = mask.apply('15062025')
    const second = mask.apply(first)
    expect(first).toBe(second)
    expect(first).toBe('15/06/2025')
  })
})
