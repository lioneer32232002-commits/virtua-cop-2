import { defineConfig } from 'vite'
import fs from 'node:fs'
import path from 'node:path'

// Dev-only screenshot sink for the H-2 character viewer: the hidden preview
// window can stall preview_screenshot, so the page POSTs canvas dataURLs to
// /__shot and we read the PNG/JPEG from disk instead.
function screenshotSink() {
  return {
    name: 'vc2-screenshot-sink',
    configureServer(server) {
      server.middlewares.use('/__shot', (req, res) => {
        let body = ''
        req.on('data', c => { body += c })
        req.on('end', () => {
          const m = /^data:image\/(png|jpeg);base64,(.+)$/.exec(body)
          if (!m) { res.statusCode = 400; res.end('bad dataURL'); return }
          const dir = path.resolve('.shots')
          fs.mkdirSync(dir, { recursive: true })
          const file = path.join(dir, `shot.${m[1] === 'png' ? 'png' : 'jpg'}`)
          fs.writeFileSync(file, Buffer.from(m[2], 'base64'))
          res.end(file)
        })
      })
    },
  }
}

export default defineConfig({
  root: '.',
  plugins: [screenshotSink()],
  server: {
    // Honour the port assigned by the Claude preview harness (autoPort)
    port: Number(process.env.PORT) || 5173,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: { main: './index.html', m0: './m0.html' },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
