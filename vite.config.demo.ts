import { defineConfig } from 'vite'

export default defineConfig({
  root: 'demo',
  base: '/alpine-calendar/',
  build: {
    outDir: '../dist-demo',
    emptyOutDir: true,
  },
})
