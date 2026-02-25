import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
  build: {
    lib: {
      entry: 'src/index.ts',
      name: 'AlpineCalendar',
      formats: ['es', 'umd'],
      fileName: (format) => `alpine-calendar.${format === 'es' ? 'es' : 'umd'}.js`,
    },
    rollupOptions: {
      external: ['alpinejs'],
      output: {
        exports: 'named',
        globals: {
          alpinejs: 'Alpine',
        },
        assetFileNames: 'alpine-calendar.[ext]',
      },
    },
    sourcemap: true,
    minify: 'terser',
  },
})
