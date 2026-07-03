import * as THREE from 'three'

// Shared "downtown at dusk" street vocabulary — used by both the rail street
// (OriginalEnvironment) and the free-roam alley (AlleyScene) so they read as the
// same world. Unlit (MeshBasicMaterial); depth faked by per-face box shading +
// warm/cold lit windows. Extracted verbatim from OriginalEnvironment (no behaviour change).

export const WINDOW_LIT  = [0xffe6a8, 0xffd27a, 0xe9f0ff]
export const WINDOW_DARK = 0x1c2330
export const LAMP_COLOR  = 0xffeccb

/** BoxGeometry face order is [+x,-x,+y,-y,+z,-z]; shade each to fake a key light. */
export function shadedBox(w, h, d, baseHex) {
  const base = new THREE.Color(baseHex)
  const face = f => new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(f) })
  const mats = [face(0.84), face(0.66), face(1.0), face(0.45), face(0.92), face(0.74)]
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats)
}

/**
 * A flat ground/overlay strip lying in the x–z plane (rotated −90° about x).
 * Param order puts the vertical `y` before the horizontal `x`/`z` centre.
 * @param {number} width @param {number} depth @param {number} color
 * @param {number} y vertical height @param {number} x @param {number} z centre
 * @param {{decorative?:boolean}} [opts]  decorative overlays (kerbs, lane paint) sit a
 *   hair above the road; we null their `raycast` to keep them OUT of the grounding
 *   raycast, so `groundYAt` returns the true street level (y=0), not a 5 cm decoration.
 */
export function flatStrip(width, depth, color, y, x, z, { decorative = false } = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshBasicMaterial({ color }))
  m.rotation.x = -Math.PI / 2
  m.position.set(x, y, z)
  if (decorative) m.raycast = () => {}
  return m
}

/**
 * Accumulate one wall's window grid into shared position/color buffers. Windows
 * lie on an x-constant face (street-facing wall), so the quads sit in the y–z plane.
 * @param {{pos:number[],col:number[]}} acc  shared buffers the caller later wraps in a BufferGeometry
 */
export function pushWindows(acc, faceX, zCenter, depth, height, rng) {
  const WIN_W = 0.7, WIN_H = 1.0, GAP_Z = 1.3, GAP_Y = 1.6, MARGIN = 1.2
  const usableZ = depth - MARGIN * 2
  const usableY = height - MARGIN * 2
  if (usableZ < WIN_W || usableY < WIN_H) return
  const cols = Math.max(1, Math.floor(usableZ / GAP_Z))
  const rows = Math.max(1, Math.floor(usableY / GAP_Y))
  const z0 = zCenter - (cols - 1) * GAP_Z / 2
  for (let r = 0; r < rows; r++) {
    const cy = MARGIN + r * GAP_Y + WIN_H / 2
    for (let c = 0; c < cols; c++) {
      const cz = z0 + c * GAP_Z
      const lit = rng() < 0.45
      const hex = lit ? WINDOW_LIT[(rng() * WINDOW_LIT.length) | 0] : WINDOW_DARK
      const col = new THREE.Color(hex)
      const za = cz - WIN_W / 2, zb = cz + WIN_W / 2
      const ya = cy - WIN_H / 2, yb = cy + WIN_H / 2
      const quad = [
        [faceX, ya, za], [faceX, ya, zb], [faceX, yb, zb],
        [faceX, ya, za], [faceX, yb, zb], [faceX, yb, za],
      ]
      for (const [x, y, z] of quad) { acc.pos.push(x, y, z); acc.col.push(col.r, col.g, col.b) }
    }
  }
}

/** A streetlight: thin pole + a small bright lamp quad facing the road. */
export function streetlight(x, z, faceSign) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 4.5, 6), new THREE.MeshBasicMaterial({ color: 0x14171c }))
  pole.position.set(x, 2.25, z)
  g.add(pole)
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.9), new THREE.MeshBasicMaterial({ color: LAMP_COLOR }))
  lamp.position.set(x - faceSign * 0.6, 4.4, z)
  g.add(lamp)
  return g
}
