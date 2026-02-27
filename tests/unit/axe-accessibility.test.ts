import { describe, it, expect } from 'vitest'
import axe from 'axe-core'
import { generateCalendarTemplate } from '../../src/plugin/template'
import type { TemplateOptions } from '../../src/plugin/template'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Renders a calendar template into a jsdom document and runs axe-core on it.
 *
 * Alpine directives (:aria-label, x-for, etc.) won't be evaluated in jsdom,
 * so we pre-populate key attributes with static values for axe to evaluate.
 * We also disable rules that don't apply in a jsdom test environment.
 */
async function runAxe(options: TemplateOptions): Promise<axe.AxeResults> {
  let html = generateCalendarTemplate(options)

  // Replace Alpine dynamic bindings with static values for axe evaluation
  html = html
    // :aria-label → aria-label with a placeholder value
    .replace(/:aria-label="[^"]+"/g, 'aria-label="Calendar"')
    // :aria-expanded → aria-expanded
    .replace(/:aria-expanded="[^"]+"/g, 'aria-expanded="false"')
    // :aria-selected → aria-selected
    .replace(/:aria-selected="[^"]+"/g, 'aria-selected="false"')
    // :aria-disabled → aria-disabled
    .replace(/:aria-disabled="[^"]+"/g, 'aria-disabled="false"')
    // :aria-activedescendant → remove (null value means no attribute)
    .replace(/:aria-activedescendant="[^"]+"/g, '')
    // :id bindings → id with static value
    .replace(/:id="[^"]+"/g, 'id="axe-test-id"')
    // :disabled → remove (keep button enabled)
    .replace(/:disabled="[^"]+"/g, '')
    // :tabindex → tabindex
    .replace(/:tabindex="[^"]+"/g, 'tabindex="-1"')
    // :role bindings → remove (row divs have no ARIA role; cells have static role="option")
    .replace(/:role="[^"]+"/g, '')
    // :title bindings → title
    .replace(/:title="[^"]+"/g, 'title="Date"')
    // :style bindings → remove
    .replace(/:style="[^"]+"/g, '')
    // :class bindings → remove (keep static class)
    .replace(/:class="[^"]+"/g, '')
    // Remove Alpine x-* directives that aren't valid HTML
    .replace(/x-ref="[^"]+"/g, '')
    .replace(/x-show="[^"]+"/g, '')
    // x-text → inject placeholder text content into element
    // Handle x-text anywhere in attribute list (not just as last attr before >)
    .replace(/(<[^>]*?)x-text="[^"]+"([^>]*>)\s*(<\/)/g, '$1$2Label$3')
    .replace(/x-text="[^"]+"/g, '')
    .replace(/x-if="[^"]+"/g, '')
    .replace(/x-for="[^"]+"/g, '')
    .replace(/x-transition:[^"]*="[^"]*"/g, '')
    .replace(/:key="[^"]+"/g, '')
    .replace(/@[a-z.]+="[^"]+"/g, '')
    // Remove <template> wrappers (axe can't evaluate template content)
    .replace(/<template[^>]*>/g, '')
    .replace(/<\/template>/g, '')

  // Wrap in a minimal HTML document
  const doc = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>axe test</title></head>
<body>${html}</body>
</html>`

  // Set up the document
  document.documentElement.innerHTML = ''
  document.open()
  document.write(doc)
  document.close()

  // Run axe with rules disabled that don't apply in jsdom / static templates
  const results = await axe.run(document.body, {
    rules: {
      // Color contrast can't be computed in jsdom (no rendering engine)
      'color-contrast': { enabled: false },
      // No page-level landmark structure in unit tests
      'region': { enabled: false },
      'landmark-one-main': { enabled: false },
      'page-has-heading-one': { enabled: false },
      // Duplicate IDs expected since Alpine x-for generates unique IDs at runtime
      'duplicate-id': { enabled: false },
      'duplicate-id-active': { enabled: false },
      'duplicate-id-aria': { enabled: false },
      // Day grid uses role="listbox" > role="option" (flat, no row wrappers).
      // Row layout divs have no ARIA role and are transparent to the a11y tree.
      'aria-required-children': { enabled: true },
      'aria-required-parent': { enabled: true },
    },
  })

  return results
}

function formatViolations(violations: axe.Result[]): string {
  return violations
    .map((v) => {
      const nodes = v.nodes.map((n) => `  ${n.html}`).join('\n')
      return `[${v.id}] ${v.help} (${v.impact}): ${v.nodes.length} instance(s)\n${nodes}`
    })
    .join('\n')
}

// ---------------------------------------------------------------------------
// Test matrix
// ---------------------------------------------------------------------------

describe('axe-core accessibility audits', () => {
  it('inline single-month calendar has no violations', async () => {
    const results = await runAxe({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0)
  })

  it('inline dual-month calendar has no violations', async () => {
    const results = await runAxe({
      display: 'inline',
      isDualMonth: true,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0)
  })

  it('popup calendar has no violations', async () => {
    const results = await runAxe({
      display: 'popup',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0)
  })

  it('wizard calendar has no violations', async () => {
    const results = await runAxe({
      display: 'inline',
      isDualMonth: false,
      isWizard: true,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0)
  })

  it('calendar with presets has no violations', async () => {
    const results = await runAxe({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: true,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0)
  })

  it('calendar with week numbers has no violations', async () => {
    const results = await runAxe({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: true,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0)
  })

  it('scrollable calendar has no violations', async () => {
    const results = await runAxe({
      display: 'inline',
      isDualMonth: false,
      isWizard: false,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: true,
      scrollHeight: 400,
    })
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0)
  })

  it('popup wizard calendar has no violations', async () => {
    const results = await runAxe({
      display: 'popup',
      isDualMonth: false,
      isWizard: true,
      hasName: false,
      showWeekNumbers: false,
      hasPresets: false,
      isScrollable: false,
      scrollHeight: 300,
    })
    expect(results.violations, formatViolations(results.violations)).toHaveLength(0)
  })
})
