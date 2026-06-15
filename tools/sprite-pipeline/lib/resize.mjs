// tools/sprite-pipeline/lib/resize.mjs
// Area-average (box filter) downscale — pure function, no I/O.
//
// Each target pixel averages the source box it covers. RGB is alpha-premultiplied
// so fully-transparent (cut-out) pixels contribute no colour and don't darken the
// subject's edge; alpha itself is a plain box average, giving a soft anti-aliased
// silhouette after flood-fill cutout.
//
// img: { width, height, data: Uint8ClampedArray|Buffer (RGBA) }
// returns a new { width: tw, height: th, data: Uint8ClampedArray }.
export function areaDownscale(img, tw, th) {
  const { width: sw, height: sh, data: src } = img
  const out = new Uint8ClampedArray(tw * th * 4)
  for (let ty = 0; ty < th; ty++) {
    const y0 = Math.floor((ty * sh) / th)
    const y1 = Math.max(y0 + 1, Math.floor(((ty + 1) * sh) / th))
    for (let tx = 0; tx < tw; tx++) {
      const x0 = Math.floor((tx * sw) / tw)
      const x1 = Math.max(x0 + 1, Math.floor(((tx + 1) * sw) / tw))
      let r = 0, g = 0, b = 0, a = 0, n = 0
      for (let sy = y0; sy < y1; sy++) {
        for (let sx = x0; sx < x1; sx++) {
          const o = (sy * sw + sx) * 4
          const af = src[o + 3]
          r += src[o] * af; g += src[o + 1] * af; b += src[o + 2] * af
          a += af; n++
        }
      }
      const to = (ty * tw + tx) * 4
      if (a > 0) { out[to] = r / a; out[to + 1] = g / a; out[to + 2] = b / a }
      out[to + 3] = a / n
    }
  }
  return { width: tw, height: th, data: out }
}
