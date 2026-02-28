import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  root: 'demo',
  base: '/alpine-calendar/',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
})
