import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    lib: {
      entry: 'src/cdn.ts',
      name: 'AlpineCalendar',
      formats: ['iife'],
      fileName: () => 'alpine-calendar.cdn.js',
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {},
        assetFileNames: 'alpine-calendar.[ext]',
      },
    },
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: 'terser',
  },
})
