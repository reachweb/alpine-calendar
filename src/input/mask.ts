/**
 * Lightweight input mask engine for date format strings.
 *
 * Maps format tokens (DD, MM, YYYY, etc.) to digit slots and
 * auto-inserts separator characters as the user types.
 * No external dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MaskSlot {
  type: 'digit' | 'literal'
  char: string
}

export interface InputMask {
  /** Apply mask to a raw input string, returning the formatted string */
  apply(rawInput: string): string
  /** The mask pattern, e.g. "99/99/9999" */
  readonly pattern: string
  /** The format string used to create the mask */
  readonly format: string
  /** Total character length of a fully-filled mask */
  readonly length: number
  /** The slot definitions */
  readonly slots: readonly MaskSlot[]
  /** Maximum number of digit characters the mask accepts */
  readonly maxDigits: number
}

export interface MaskEventHandlers {
  onInput: (e: Event) => void
  onKeyDown: (e: KeyboardEvent) => void
  onPaste: (e: ClipboardEvent) => void
}

// ---------------------------------------------------------------------------
// Token → digit count mapping
// ---------------------------------------------------------------------------

const TOKEN_DIGIT_COUNT: Record<string, number> = {
  YYYY: 4,
  YY: 2,
  MM: 2,
  M: 2,
  DD: 2,
  D: 2,
}

// Sorted longest-first so YYYY matches before YY, DD before D, MM before M
const TOKEN_NAMES = Object.keys(TOKEN_DIGIT_COUNT).sort((a, b) => b.length - a.length)

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function extractDigits(str: string): string {
  return str.replace(/\D/g, '')
}

function countDigits(str: string): number {
  let count = 0
  for (const ch of str) {
    if (ch >= '0' && ch <= '9') count++
  }
  return count
}

/**
 * Fill digit slots with provided digits and insert literals.
 * Literals are included after a digit group is filled (auto-insert behavior).
 * Stops when digits run out.
 */
function applyMaskSlots(digits: string, slots: readonly MaskSlot[]): string {
  let result = ''
  let digitIndex = 0

  for (const slot of slots) {
    if (slot.type === 'digit') {
      if (digitIndex >= digits.length) break
      result += digits[digitIndex]
      digitIndex++
    } else {
      // Include literal only if at least one digit has been placed
      if (digitIndex > 0) {
        result += slot.char
      } else {
        break
      }
    }
  }

  return result
}

/**
 * Find the cursor position in a masked string that places the cursor
 * after the Nth digit, advancing past any trailing literals.
 */
function cursorAfterNDigits(
  masked: string,
  slots: readonly MaskSlot[],
  digitCount: number,
): number {
  if (digitCount <= 0) return 0

  let seen = 0
  for (let i = 0; i < masked.length && i < slots.length; i++) {
    const slot = slots[i]
    if (slot && slot.type === 'digit') {
      seen++
      if (seen === digitCount) {
        let pos = i + 1
        // Advance past trailing literals (auto-inserted separators)
        while (pos < slots.length && pos < masked.length) {
          const next = slots[pos]
          if (!next || next.type !== 'literal') break
          pos++
        }
        return pos
      }
    }
  }

  return masked.length
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a format string into an array of mask slots.
 *
 * Each format token (DD, MM, YYYY, etc.) becomes digit slots,
 * and all other characters become literal slots.
 */
export function parseFormatToSlots(format: string): MaskSlot[] {
  const slots: MaskSlot[] = []
  let remaining = format

  while (remaining.length > 0) {
    let matched = false
    for (const token of TOKEN_NAMES) {
      if (remaining.startsWith(token)) {
        const count = TOKEN_DIGIT_COUNT[token]
        if (count === undefined) continue
        for (let i = 0; i < count; i++) {
          slots.push({ type: 'digit', char: '9' })
        }
        remaining = remaining.slice(token.length)
        matched = true
        break
      }
    }
    if (!matched) {
      slots.push({ type: 'literal', char: remaining[0] as string })
      remaining = remaining.slice(1)
    }
  }

  return slots
}

/**
 * Create a mask from a date format string.
 *
 * @param format - The date format (e.g., "DD/MM/YYYY")
 * @returns An InputMask object with apply() and metadata
 */
export function createMask(format: string): InputMask {
  const slots = parseFormatToSlots(format)
  const maxDigits = slots.filter((s) => s.type === 'digit').length
  const pattern = slots.map((s) => (s.type === 'digit' ? '9' : s.char)).join('')

  return {
    apply(rawInput: string): string {
      const digits = extractDigits(rawInput).slice(0, maxDigits)
      return applyMaskSlots(digits, slots)
    },
    get pattern() {
      return pattern
    },
    get format() {
      return format
    },
    get length() {
      return slots.length
    },
    get slots() {
      return slots
    },
    get maxDigits() {
      return maxDigits
    },
  }
}

/**
 * Create event handlers for masking an HTMLInputElement.
 *
 * Handles input, keydown (backspace/delete over separators), and paste.
 *
 * @param mask - The InputMask to use
 * @returns Event handlers to attach to the input element
 */
export function createMaskHandlers(mask: InputMask): MaskEventHandlers {
  const { slots, maxDigits } = mask

  function onInput(e: Event) {
    const el = e.target as HTMLInputElement
    const rawValue = el.value
    const cursorPos = el.selectionStart ?? rawValue.length

    // Count digits before cursor in the raw (browser-modified) value
    const digitsBefore = countDigits(rawValue.slice(0, cursorPos))

    // Extract all digits and re-apply mask
    const digits = extractDigits(rawValue).slice(0, maxDigits)
    const masked = applyMaskSlots(digits, slots)

    el.value = masked

    // Restore cursor position based on digit count
    const newCursor = cursorAfterNDigits(masked, slots, digitsBefore)
    el.setSelectionRange(newCursor, newCursor)
  }

  function onKeyDown(e: KeyboardEvent) {
    const el = e.target as HTMLInputElement
    const pos = el.selectionStart ?? 0
    const selEnd = el.selectionEnd ?? pos

    // Only handle single-cursor (no selection) for special cases
    if (pos !== selEnd) return

    // Backspace over a literal: skip back to the digit before it and delete
    if (e.key === 'Backspace' && pos > 0) {
      const prevSlot = pos <= slots.length ? slots[pos - 1] : undefined
      if (prevSlot && prevSlot.type === 'literal') {
        e.preventDefault()
        // Skip back past consecutive literals
        let targetPos = pos - 1
        while (targetPos > 0) {
          const s = slots[targetPos - 1]
          if (!s || s.type !== 'literal') break
          targetPos--
        }
        if (targetPos > 0) {
          const currentDigits = extractDigits(el.value)
          const digitIndex = countDigits(el.value.slice(0, targetPos))
          if (digitIndex > 0) {
            const newDigits =
              currentDigits.slice(0, digitIndex - 1) + currentDigits.slice(digitIndex)
            const masked = applyMaskSlots(newDigits, slots)
            el.value = masked
            const newCursor = cursorAfterNDigits(masked, slots, digitIndex - 1)
            el.setSelectionRange(newCursor, newCursor)
          }
        }
      }
    }

    // Delete over a literal: skip forward to the digit after it and delete
    if (e.key === 'Delete' && pos < el.value.length) {
      const curSlot = pos < slots.length ? slots[pos] : undefined
      if (curSlot && curSlot.type === 'literal') {
        e.preventDefault()
        // Skip forward past consecutive literals
        let targetPos = pos + 1
        while (targetPos < slots.length) {
          const s = slots[targetPos]
          if (!s || s.type !== 'literal') break
          targetPos++
        }
        if (targetPos < el.value.length) {
          const currentDigits = extractDigits(el.value)
          const digitIndex = countDigits(el.value.slice(0, targetPos))
          const newDigits = currentDigits.slice(0, digitIndex) + currentDigits.slice(digitIndex + 1)
          const masked = applyMaskSlots(newDigits, slots)
          el.value = masked
          const newCursor = cursorAfterNDigits(masked, slots, digitIndex)
          el.setSelectionRange(newCursor, newCursor)
        }
      }
    }
  }

  function onPaste(e: ClipboardEvent) {
    e.preventDefault()
    const el = e.target as HTMLInputElement
    const pasted = e.clipboardData?.getData('text') ?? ''
    const pastedDigits = extractDigits(pasted)
    if (pastedDigits.length === 0) return

    const pos = el.selectionStart ?? 0
    const end = el.selectionEnd ?? pos
    const currentDigits = extractDigits(el.value)
    const digitsBefore = countDigits(el.value.slice(0, pos))
    const digitsInSelection = countDigits(el.value.slice(pos, end))

    const newDigits = (
      currentDigits.slice(0, digitsBefore) +
      pastedDigits +
      currentDigits.slice(digitsBefore + digitsInSelection)
    ).slice(0, maxDigits)

    const masked = applyMaskSlots(newDigits, slots)
    el.value = masked

    const targetDigitCount = Math.min(digitsBefore + pastedDigits.length, maxDigits)
    const newCursor = cursorAfterNDigits(masked, slots, targetDigitCount)
    el.setSelectionRange(newCursor, newCursor)
  }

  return { onInput, onKeyDown, onPaste }
}

/**
 * Attach mask event handlers to an input element.
 * Returns a detach function to remove the handlers.
 *
 * @param input - The HTML input element
 * @param format - The date format string (e.g., "DD/MM/YYYY")
 * @returns Detach function to remove event listeners
 */
export function attachMask(input: HTMLInputElement, format: string): () => void {
  const mask = createMask(format)
  const handlers = createMaskHandlers(mask)

  input.addEventListener('input', handlers.onInput)
  input.addEventListener('keydown', handlers.onKeyDown)
  input.addEventListener('paste', handlers.onPaste as EventListener)

  // Apply mask to any existing value
  if (input.value) {
    input.value = mask.apply(input.value)
  }

  return () => {
    input.removeEventListener('input', handlers.onInput)
    input.removeEventListener('keydown', handlers.onKeyDown)
    input.removeEventListener('paste', handlers.onPaste as EventListener)
  }
}
