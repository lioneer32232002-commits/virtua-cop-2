// tools/sprite-pipeline/lib/floodfill.mjs
// Edge flood-fill background removal — pure function, no I/O.
//
// Gemini sprites come on a roughly-flat backdrop. We seed a 4-connected flood
// from each of the four corners (each carrying its own corner colour as the
// reference), and set alpha=0 on every pixel reachable from a corner that stays
// within `tolerance` of that seed colour. A pixel whose colour differs by more
// than the tolerance acts as a barrier — so a background-coloured region that is
// *enclosed* by the subject (not connected to any edge) is preserved. This is
// connectivity-based, not colour-key, which is what keeps the subject intact even
// when it happens to contain background-like tones.
//
// img: { width, height, data: Uint8ClampedArray|Buffer (RGBA) }
// returns a new { width, height, data: Uint8ClampedArray } with bg alpha zeroed.
export function floodFillCutout(img, { tolerance = 60 } = {}) {
  const { width: w, height: h, data: src } = img
  const data = new Uint8ClampedArray(src) // copy; only alpha is mutated
  const tol2 = tolerance * tolerance
  const visited = new Uint8Array(w * h)

  // queue of [x, y, seedR, seedG, seedB]; seed colour rides along the flood front
  const queue = []
  const seed = (x, y) => {
    const p = y * w + x
    if (visited[p]) return
    visited[p] = 1
    const o = p * 4
    queue.push([x, y, src[o], src[o + 1], src[o + 2]])
  }
  seed(0, 0); seed(w - 1, 0); seed(0, h - 1); seed(w - 1, h - 1)

  for (let head = 0; head < queue.length; head++) {
    const [x, y, sr, sg, sb] = queue[head]
    const o = (y * w + x) * 4
    const dr = src[o] - sr, dg = src[o + 1] - sg, db = src[o + 2] - sb
    if (dr * dr + dg * dg + db * db > tol2) continue // barrier: keep, don't spread
    data[o + 3] = 0 // background -> transparent
    // spread to 4-neighbours carrying the same seed colour
    if (x > 0)     push(x - 1, y, sr, sg, sb)
    if (x < w - 1) push(x + 1, y, sr, sg, sb)
    if (y > 0)     push(x, y - 1, sr, sg, sb)
    if (y < h - 1) push(x, y + 1, sr, sg, sb)
  }
  function push(nx, ny, sr, sg, sb) {
    const np = ny * w + nx
    if (visited[np]) return
    visited[np] = 1
    queue.push([nx, ny, sr, sg, sb])
  }

  return { width: w, height: h, data }
}
