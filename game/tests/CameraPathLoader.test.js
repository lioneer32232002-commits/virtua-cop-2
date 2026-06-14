import { describe, it, expect, vi, afterEach } from 'vitest'
import { loadCameraPath } from '../src/render/CameraPathLoader.js'

// Build a valid camera.bin ArrayBuffer: [u32 frameCount][u32 fps][f32 × N×5]
function makeCameraBin(frameCount, fps) {
  const buf = new ArrayBuffer(8 + frameCount * 5 * 4)
  const u = new Uint32Array(buf, 0, 2)
  u[0] = frameCount; u[1] = fps
  new Float32Array(buf, 8, frameCount * 5).fill(1)
  return buf
}

function mockFetch({ ok = true, contentType = 'application/octet-stream', buffer = new ArrayBuffer(0) }) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    headers: { get: () => contentType },
    arrayBuffer: async () => buffer,
  })
}

afterEach(() => { vi.restoreAllMocks(); delete global.fetch })

describe('loadCameraPath', () => {
  it('parses a valid camera.bin', async () => {
    mockFetch({ buffer: makeCameraBin(3, 60) })
    const data = await loadCameraPath('stage1')
    expect(data).not.toBeNull()
    expect(data.frameCount).toBe(3)
    expect(data.fps).toBe(60)
    expect(data.frames.length).toBe(15)
  })

  it('returns null on a 404', async () => {
    mockFetch({ ok: false })
    expect(await loadCameraPath('downtown1')).toBeNull()
  })

  it('returns null on an HTML SPA fallback served at 200 (the downtown1 bug)', async () => {
    // A dev server answers a missing asset with index.html, not a 404.
    const html = new TextEncoder().encode('<!doctype html><html>…</html>').buffer
    mockFetch({ ok: true, contentType: 'text/html', buffer: html })
    expect(await loadCameraPath('downtown1')).toBeNull()
  })

  it('returns null when the header does not match the payload size', async () => {
    // octet-stream but bytes don't describe frameCount×5 floats → not a camera.bin
    const bogus = new ArrayBuffer(64)
    new Uint32Array(bogus, 0, 2).set([99999, 60])
    mockFetch({ buffer: bogus })
    expect(await loadCameraPath('downtown1')).toBeNull()
  })

  it('returns null on a network error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('offline'))
    expect(await loadCameraPath('stage1')).toBeNull()
  })
})
