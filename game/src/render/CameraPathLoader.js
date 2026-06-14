/**
 * Fetches and parses a camera.bin asset (the original CAMMOV path).
 * Returns null when the file is absent or isn't a valid camera.bin, so callers
 * fall back to the JSON-authored rail (CameraRig curve mode).
 *
 * Robustness: a missing asset does NOT always surface as a clean 404 — the vite
 * dev server (and SPA hosts) answer with the index.html fallback at status 200.
 * So we reject HTML payloads and require the header to exactly describe the
 * binary (frameCount × 5 float32 + an 8-byte header); a fully-original level
 * with no camera.bin lands here and quietly uses its railPath instead.
 *
 * @param {string} stageId  e.g. 'stage1'
 * @returns {Promise<{ frameCount: number, fps: number, frames: Float32Array }|null>}
 */
export async function loadCameraPath(stageId) {
  const url = `/assets/${stageId}/camera.bin`
  let resp
  try {
    resp = await fetch(url)
  } catch {
    return null
  }
  if (!resp.ok) return null
  const type = resp.headers.get('content-type') || ''
  if (type.includes('text/html')) return null   // SPA fallback for a missing file

  const buf = await resp.arrayBuffer()
  if (buf.byteLength < 8) return null
  const header     = new Uint32Array(buf, 0, 2)
  const frameCount = header[0]
  const fps        = header[1]
  // The header must account for every byte, or this isn't a camera.bin.
  if (frameCount <= 0 || fps <= 0 || 8 + frameCount * 5 * 4 !== buf.byteLength) return null
  const frames = new Float32Array(buf, 8, frameCount * 5)
  return { frameCount, fps, frames }
}
