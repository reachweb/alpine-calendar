import type { Alpine as AlpineType } from 'alpinejs'
import '../styles/calendar.css'

export function calendarPlugin(Alpine: AlpineType) {
  Alpine.data('calendar', (config = {}) => ({
    // Stub — will be fleshed out in Phase 3
    mode: (config as Record<string, unknown>).mode ?? 'single',
    display: (config as Record<string, unknown>).display ?? 'inline',
    init() {
      // placeholder
    },
  }))
}

export default calendarPlugin
