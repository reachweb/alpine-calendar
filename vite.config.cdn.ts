import { defineConfig } from 'vite'

export default defineConfig({
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
