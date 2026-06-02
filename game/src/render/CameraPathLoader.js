/**
 * Fetches and parses a camera.bin asset.
 * Returns null if the file is missing (404) so callers can fall back gracefully.
 *
 * @param {string} stageId  e.g. 'stage1'
 * @returns {Promise<{ frameCount: number, fps: number, frames: Float32Array }|null>}
 */
export async function loadCameraPath(stageId) {
  const url = `/assets/${stageId}/camera.bin`
  const resp = await fetch(url)
  if (!resp.ok) return null
  const buf        = await resp.arrayBuffer()
  const header     = new Uint32Array(buf, 0, 2)
  const frameCount = header[0]
  const fps        = header[1]
  const frames     = new Float32Array(buf, 8, frameCount * 5)
  return { frameCount, fps, frames }
}
