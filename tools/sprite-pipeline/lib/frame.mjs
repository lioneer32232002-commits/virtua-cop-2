// tools/sprite-pipeline/lib/frame.mjs
// Re-framing helpers — pure functions, no I/O.
//
// Gemini frames a subject wherever it likes inside a wide canvas. To converge on
// a consistent billboard sprite we (1) crop to the cut-out subject's bounding box,
// then (2) fit that crop into a square, aspect-preserved and centred. This removes
// the horizontal squash you'd get from forcing a landscape source into a square,
// and makes the pipeline robust to whatever composition the source happens to have.
import { areaDownscale } from './resize.mjs'

// Despeckle: keep only opaque 4-connected components that are at least
// `minFraction` of the largest one; everything smaller (stray marks, corner
// watermarks, light glints the flood-fill couldn't reach) is zeroed. Without
// this, a tiny corner blob inflates the crop bbox and shrinks the real subject.
export function keepLargestComponents(img, { minFraction = 0.05, alphaThreshold = 8 } = {}) {
  const { width: w, height: h, data: src } = img
  const data = new Uint8ClampedArray(src)
  const label = new Int32Array(w * h).fill(-1)
  const sizes = []
  for (let s = 0; s < w * h; s++) {
    if (label[s] !== -1 || src[s * 4 + 3] <= alphaThreshold) continue
    const id = sizes.length
    let n = 0
    const q = [s]
    label[s] = id
    while (q.length) {
      const p = q.pop(); n++
      const x = p % w, y = (p / w) | 0
      const nb = []
      if (x > 0) nb.push(p - 1)
      if (x < w - 1) nb.push(p + 1)
      if (y > 0) nb.push(p - w)
      if (y < h - 1) nb.push(p + w)
      for (const np of nb) {
        if (label[np] === -1 && src[np * 4 + 3] > alphaThreshold) { label[np] = id; q.push(np) }
      }
    }
    sizes.push(n)
  }
  if (!sizes.length) return { width: w, height: h, data }
  const minSize = Math.max(...sizes) * minFraction
  for (let p = 0; p < w * h; p++) {
    const id = label[p]
    if (id >= 0 && sizes[id] < minSize) data[p * 4 + 3] = 0
  }
  return { width: w, height: h, data }
}

// Tight bounding box of pixels with alpha > threshold -> cropped sub-image.
// alphaThreshold ignores faint anti-alias fringe so a stray ghost pixel can't
// blow the box up. Returns a copy of the input if nothing is opaque.
export function cropToContent(img, { alphaThreshold = 8, pad = 0 } = {}) {
  const { width: w, height: h, data } = img
  let minX = w, minY = h, maxX = -1, maxY = -1
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > alphaThreshold) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < 0) return { width: w, height: h, data: new Uint8ClampedArray(data) }
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad)
  maxX = Math.min(w - 1, maxX + pad); maxY = Math.min(h - 1, maxY + pad)
  const cw = maxX - minX + 1, ch = maxY - minY + 1
  const out = new Uint8ClampedArray(cw * ch * 4)
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const so = ((minY + y) * w + (minX + x)) * 4
      const to = (y * cw + x) * 4
      out[to] = data[so]; out[to + 1] = data[so + 1]
      out[to + 2] = data[so + 2]; out[to + 3] = data[so + 3]
    }
  }
  return { width: cw, height: ch, data: out }
}

// Aspect-preserving fit into a size×size square, centred, transparent margins.
// `margin` keeps the subject off the frame edges (px on every side).
export function fitContain(img, size, { margin = 0 } = {}) {
  const inner = Math.max(1, size - margin * 2)
  const scale = Math.min(inner / img.width, inner / img.height)
  const dw = Math.max(1, Math.round(img.width * scale))
  const dh = Math.max(1, Math.round(img.height * scale))
  const scaled = areaDownscale(img, dw, dh)
  const out = new Uint8ClampedArray(size * size * 4)
  const ox = Math.floor((size - dw) / 2), oy = Math.floor((size - dh) / 2)
  for (let y = 0; y < dh; y++) {
    for (let x = 0; x < dw; x++) {
      const so = (y * dw + x) * 4
      const to = ((oy + y) * size + (ox + x)) * 4
      out[to] = scaled.data[so]; out[to + 1] = scaled.data[so + 1]
      out[to + 2] = scaled.data[so + 2]; out[to + 3] = scaled.data[so + 3]
    }
  }
  return { width: size, height: size, data: out }
}
