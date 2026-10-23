import { defineConfig } from 'vite';

// GitHub Pages: base debe ser '/nombre-repo/' para que los assets carguen correctamente
const base = '/bus-in-live/';

export default defineConfig({
  base,
  root: '.',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  resolve: {
    alias: {
      '@': '/src',
      '@services': '/src/services',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@utils': '/src/utils',
      '@styles': '/src/styles'
    }
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js']
  }
});