import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const DIST = path.resolve(__dirname, '../../dist')

// ---------------------------------------------------------------------------
// Helper: read a dist file as string
// ---------------------------------------------------------------------------
function readDist(file: string): string {
  return fs.readFileSync(path.join(DIST, file), 'utf-8')
}

function distFileSize(file: string): number {
  return fs.statSync(path.join(DIST, file)).size
}

function distExists(file: string): boolean {
  return fs.existsSync(path.join(DIST, file))
}

// ---------------------------------------------------------------------------
// 7.3 Build & Distribution Verification
// ---------------------------------------------------------------------------
describe('Build & Distribution Verification', () => {
  // -------------------------------------------------------------------------
  // File existence checks
  // -------------------------------------------------------------------------
  describe('build output files exist', () => {
    const expectedFiles = [
      'alpine-calendar.es.js',
      'alpine-calendar.es.js.map',
      'alpine-calendar.umd.js',
      'alpine-calendar.umd.js.map',
      'alpine-calendar.cdn.js',
      'alpine-calendar.cdn.js.map',
      'alpine-calendar.css',
      'index.d.ts',
      'cdn.d.ts',
    ]

    for (const file of expectedFiles) {
      it(`dist/${file} exists`, () => {
        expect(distExists(file)).toBe(true)
      })
    }
  })

  describe('type declaration files exist', () => {
    const declFiles = [
      'core/calendar-date.d.ts',
      'core/constraints.d.ts',
      'core/grid.d.ts',
      'core/selection.d.ts',
      'input/formatter.d.ts',
      'input/mask.d.ts',
      'input/parser.d.ts',
      'plugin/calendar-component.d.ts',
      'positioning/popup.d.ts',
    ]

    for (const file of declFiles) {
      it(`dist/${file} exists`, () => {
        expect(distExists(file)).toBe(true)
      })
    }
  })

  // -------------------------------------------------------------------------
  // ESM bundle verification
  // -------------------------------------------------------------------------
  describe('ESM bundle (alpine-calendar.es.js)', () => {
    it('is a valid ES module with export statements', () => {
      const content = readDist('alpine-calendar.es.js')
      // ESM should have export statements (not wrapped in IIFE/UMD)
      expect(content).toMatch(/export\s*\{/)
    })

    it('exports calendarPlugin as default', () => {
      const content = readDist('alpine-calendar.es.js')
      // Vite may emit `export default` or `calendarPlugin as default` in the export block
      const hasDefaultExport =
        content.includes('export default') ||
        content.includes('as default')
      expect(hasDefaultExport).toBe(true)
    })

    it('exports key utilities', () => {
      const content = readDist('alpine-calendar.es.js')
      const expectedExports = [
        'CalendarDate',
        'SingleSelection',
        'MultipleSelection',
        'RangeSelection',
        'createCalendarData',
        'createDateConstraint',
        'createRangeValidator',
        'parseDate',
        'formatDate',
        'createMask',
        'attachMask',
        'computePosition',
        'autoUpdate',
        'generateMonth',
        'generateMonths',
        'generateMonthGrid',
        'generateYearGrid',
      ]
      for (const name of expectedExports) {
        expect(content).toContain(name)
      }
    })

    it('does NOT bundle Alpine.js source', () => {
      const content = readDist('alpine-calendar.es.js')
      // Alpine internals that would appear if Alpine were bundled
      expect(content).not.toContain('mutateDom')
      expect(content).not.toContain('startObserving')
      expect(content).not.toContain('x-data')
      expect(content).not.toContain('x-bind')
    })

    it('has a corresponding source map', () => {
      const content = readDist('alpine-calendar.es.js')
      expect(content).toContain('sourceMappingURL=alpine-calendar.es.js.map')
    })
  })

  // -------------------------------------------------------------------------
  // UMD bundle verification
  // -------------------------------------------------------------------------
  describe('UMD bundle (alpine-calendar.umd.js)', () => {
    it('uses UMD wrapper pattern (exports/define/globalThis)', () => {
      const content = readDist('alpine-calendar.umd.js')
      // UMD typically contains exports, define, and globalThis patterns
      expect(content).toContain('exports')
      expect(content).toContain('define')
    })

    it('exposes AlpineCalendar as global name', () => {
      const content = readDist('alpine-calendar.umd.js')
      expect(content).toContain('AlpineCalendar')
    })

    it('exports all key utilities', () => {
      const content = readDist('alpine-calendar.umd.js')
      const expectedExports = [
        'CalendarDate',
        'calendarPlugin',
        'createCalendarData',
        'SingleSelection',
        'MultipleSelection',
        'RangeSelection',
        'parseDate',
        'formatDate',
        'createMask',
      ]
      for (const name of expectedExports) {
        expect(content).toContain(name)
      }
    })

    it('does NOT bundle Alpine.js source', () => {
      const content = readDist('alpine-calendar.umd.js')
      expect(content).not.toContain('mutateDom')
      expect(content).not.toContain('startObserving')
    })

    it('has a corresponding source map', () => {
      const content = readDist('alpine-calendar.umd.js')
      expect(content).toContain('sourceMappingURL=alpine-calendar.umd.js.map')
    })
  })

  // -------------------------------------------------------------------------
  // CDN IIFE bundle verification
  // -------------------------------------------------------------------------
  describe('CDN IIFE bundle (alpine-calendar.cdn.js)', () => {
    it('is wrapped in an IIFE (starts with !function)', () => {
      const content = readDist('alpine-calendar.cdn.js')
      expect(content.trimStart()).toMatch(/^!function\s*\(/)
    })

    it('does NOT have ES module exports', () => {
      const content = readDist('alpine-calendar.cdn.js')
      // IIFE should not have top-level export/import
      expect(content).not.toMatch(/^export\s/m)
      expect(content).not.toMatch(/^import\s/m)
    })

    it('references window.Alpine for auto-registration', () => {
      const content = readDist('alpine-calendar.cdn.js')
      expect(content).toContain('window.Alpine')
    })

    it('listens for alpine:init event', () => {
      const content = readDist('alpine-calendar.cdn.js')
      expect(content).toContain('alpine:init')
    })

    it('does NOT contain Alpine.js source code', () => {
      const content = readDist('alpine-calendar.cdn.js')
      // Alpine internal function/variable names that would be present if bundled
      expect(content).not.toContain('mutateDom')
      expect(content).not.toContain('startObserving')
      expect(content).not.toContain('deferHandlingDirectives')
      expect(content).not.toContain('onAttributeRemoved')
      expect(content).not.toContain('onElRemoved')
    })

    it('is self-contained (includes CalendarDate, selection models, etc.)', () => {
      const content = readDist('alpine-calendar.cdn.js')
      // Should include core functionality inline
      expect(content).toContain('toISO')
      expect(content).toContain('isBefore')
      expect(content).toContain('isAfter')
      expect(content).toContain('addDays')
      expect(content).toContain('addMonths')
    })

    it('has a corresponding source map', () => {
      const content = readDist('alpine-calendar.cdn.js')
      expect(content).toContain('sourceMappingURL=alpine-calendar.cdn.js.map')
    })
  })

  // -------------------------------------------------------------------------
  // CSS verification
  // -------------------------------------------------------------------------
  describe('CSS bundle (alpine-calendar.css)', () => {
    it('contains calendar component styles (.rc-* classes)', () => {
      const content = readDist('alpine-calendar.css')
      expect(content).toContain('.rc-calendar')
      expect(content).toContain('.rc-day')
      expect(content).toContain('.rc-month')
      expect(content).toContain('.rc-year')
    })

    it('contains theme variables (--color-calendar-*)', () => {
      const content = readDist('alpine-calendar.css')
      expect(content).toContain('--color-calendar-bg')
      expect(content).toContain('--color-calendar-primary')
      expect(content).toContain('--color-calendar-text')
    })

    it('contains responsive styles', () => {
      const content = readDist('alpine-calendar.css')
      // Should have media queries for responsive behavior
      expect(content).toContain('@media')
    })

    it('contains prefers-reduced-motion styles', () => {
      const content = readDist('alpine-calendar.css')
      expect(content).toContain('prefers-reduced-motion')
    })

    it('is standalone (no JS dependency for loading)', () => {
      const content = readDist('alpine-calendar.css')
      // Should not contain JS-specific constructs
      expect(content).not.toContain('import ')
      expect(content).not.toContain('require(')
    })
  })

  // -------------------------------------------------------------------------
  // Type declarations verification
  // -------------------------------------------------------------------------
  describe('type declarations (index.d.ts)', () => {
    it('exports calendarPlugin function', () => {
      const content = readDist('index.d.ts')
      expect(content).toContain('calendarPlugin')
    })

    it('exports CalendarDate', () => {
      const content = readDist('index.d.ts')
      expect(content).toContain('CalendarDate')
    })

    it('exports selection types', () => {
      const content = readDist('index.d.ts')
      expect(content).toContain('SingleSelection')
      expect(content).toContain('MultipleSelection')
      expect(content).toContain('RangeSelection')
    })

    it('exports CalendarConfig type', () => {
      const content = readDist('index.d.ts')
      expect(content).toContain('CalendarConfig')
    })

    it('exports positioning types', () => {
      const content = readDist('index.d.ts')
      expect(content).toContain('Placement')
      expect(content).toContain('PositionOptions')
      expect(content).toContain('PositionResult')
    })

    it('exports constraint types', () => {
      const content = readDist('index.d.ts')
      expect(content).toContain('DateConstraintOptions')
      expect(content).toContain('DateConstraintRule')
    })

    it('exports input/mask types', () => {
      const content = readDist('index.d.ts')
      expect(content).toContain('InputMask')
      expect(content).toContain('MaskEventHandlers')
    })
  })

  // -------------------------------------------------------------------------
  // Bundle size checks
  // -------------------------------------------------------------------------
  describe('bundle sizes', () => {
    it('CDN IIFE bundle is under 40KB raw', () => {
      const size = distFileSize('alpine-calendar.cdn.js')
      expect(size).toBeLessThan(40_000)
    })

    it('ESM bundle is under 80KB raw', () => {
      const size = distFileSize('alpine-calendar.es.js')
      expect(size).toBeLessThan(80_000)
    })

    it('UMD bundle is under 40KB raw', () => {
      const size = distFileSize('alpine-calendar.umd.js')
      expect(size).toBeLessThan(40_000)
    })

    it('CSS is under 25KB raw', () => {
      const size = distFileSize('alpine-calendar.css')
      expect(size).toBeLessThan(25_000)
    })

    it('CDN IIFE is reasonably sized (not bloated with Alpine)', () => {
      const cdnSize = distFileSize('alpine-calendar.cdn.js')
      const esmSize = distFileSize('alpine-calendar.es.js')
      // CDN should be smaller than ESM (ESM is not minified the same way)
      // But CDN should not be >50KB which would indicate Alpine was bundled
      // (Alpine alone is ~43KB minified)
      expect(cdnSize).toBeLessThan(50_000)
    })
  })

  // -------------------------------------------------------------------------
  // ESM import verification (source-level)
  // -------------------------------------------------------------------------
  describe('ESM import works from source', () => {
    it('named imports resolve correctly', async () => {
      const mod = await import('../../src/index')
      expect(typeof mod.calendarPlugin).toBe('function')
      expect(typeof mod.CalendarDate).toBe('function')
      expect(typeof mod.SingleSelection).toBe('function')
      expect(typeof mod.MultipleSelection).toBe('function')
      expect(typeof mod.RangeSelection).toBe('function')
      expect(typeof mod.createCalendarData).toBe('function')
      expect(typeof mod.parseDate).toBe('function')
      expect(typeof mod.formatDate).toBe('function')
      expect(typeof mod.createMask).toBe('function')
      expect(typeof mod.attachMask).toBe('function')
      expect(typeof mod.computePosition).toBe('function')
      expect(typeof mod.autoUpdate).toBe('function')
      expect(typeof mod.generateMonth).toBe('function')
      expect(typeof mod.generateMonths).toBe('function')
      expect(typeof mod.generateMonthGrid).toBe('function')
      expect(typeof mod.generateYearGrid).toBe('function')
      expect(typeof mod.createDateConstraint).toBe('function')
      expect(typeof mod.createRangeValidator).toBe('function')
    })

    it('default export is calendarPlugin', async () => {
      const mod = await import('../../src/index')
      expect(mod.default).toBe(mod.calendarPlugin)
    })

    it('calendarPlugin registers with Alpine mock', async () => {
      const { calendarPlugin } = await import('../../src/index')
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
  })

  // -------------------------------------------------------------------------
  // CDN auto-registration verification
  // -------------------------------------------------------------------------
  describe('CDN auto-registration logic', () => {
    it('cdn.ts registers via window.Alpine if available', () => {
      const content = readDist('alpine-calendar.cdn.js')
      // Must check for window.Alpine
      expect(content).toContain('window.Alpine')
    })

    it('cdn.ts registers via alpine:init event listener', () => {
      const content = readDist('alpine-calendar.cdn.js')
      // Must add event listener for alpine:init
      expect(content).toContain('alpine:init')
      expect(content).toContain('addEventListener')
    })

    it('cdn.ts is idempotent (has registration guard)', () => {
      // The source uses a `registered` boolean flag
      const cdnSource = fs.readFileSync(
        path.resolve(__dirname, '../../src/cdn.ts'),
        'utf-8',
      )
      expect(cdnSource).toContain('registered')
      expect(cdnSource).toContain('if (registered) return')
    })
  })

  // -------------------------------------------------------------------------
  // CSS independence (no FOUC concerns)
  // -------------------------------------------------------------------------
  describe('CSS loads independently', () => {
    it('CSS file does not import JS', () => {
      const content = readDist('alpine-calendar.css')
      expect(content).not.toContain('import(')
      expect(content).not.toContain('require(')
      expect(content).not.toContain('<script')
    })

    it('CSS contains all necessary component styles without JS', () => {
      const content = readDist('alpine-calendar.css')
      // All major BEM classes must be present
      const requiredClasses = [
        '.rc-calendar',
        '.rc-day',
        '.rc-day--today',
        '.rc-day--selected',
        '.rc-day--disabled',
        '.rc-day--in-range',
        '.rc-month',
        '.rc-year',
        '.rc-grid',
      ]
      for (const cls of requiredClasses) {
        expect(content).toContain(cls)
      }
    })
  })
})
