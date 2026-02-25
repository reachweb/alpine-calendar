import type { Alpine as AlpineType } from 'alpinejs'
import { calendarPlugin } from './index'

declare global {
  interface Window {
    Alpine?: AlpineType
  }
}

// Track whether the plugin has been registered (idempotent)
let registered = false

function register() {
  if (registered) return
  if (!window.Alpine) return
  window.Alpine.plugin(calendarPlugin)
  registered = true
}

// If Alpine is already loaded, register immediately
if (window.Alpine) {
  register()
}

// Also listen for alpine:init (Livewire v3 fires this during boot)
document.addEventListener('alpine:init', () => {
  register()
})
