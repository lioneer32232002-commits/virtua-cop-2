import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  server: {
    // Honour the port assigned by the Claude preview harness (autoPort)
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
