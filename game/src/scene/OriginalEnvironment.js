import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Fully ORIGINAL stage geometry — zero extracted SEGA assets.
//
// The rest of the engine already has original fallbacks (procedural enemies in
// EnemyModelLoader, synth audio in AudioManager, a JSON-authored camera rail via
// CameraRig curve mode). The one piece that still pulled copyrighted data was the
// stage scenery (the SEGA stage GLBs). This module replaces it: a procedurally
// built "downtown at dusk" street corridor made entirely from primitives, so an
// original level (no `baseStage`) is playable with nothing from the original game.
//
// Built unlit (MeshBasicMaterial) to match the engine's pipeline. With no real
// lighting we fake depth two cheap ways: per-face box shading (a fixed light
// direction) and warm/cold lit windows. Everything is deterministic given a seed
// so the layout is stable across loads and unit-testable.
// ─────────────────────────────────────────────────────────────────────────────

// Small deterministic PRNG (mulberry32) — stable layout, seedable in tests.
function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Dusk palette, tuned so distant buildings fade into the sky-dome's horizon haze
// (see render/sky.js SKY_HORIZON ≈ 0x9fbcd8) once the renderer's fog blends them.
const GROUND_COLOR    = 0x23262d   // wet asphalt
const SIDEWALK_COLOR  = 0x4b4f59   // concrete kerb
const LANE_COLOR      = 0xb8a23a   // worn yellow centre line
const BUILDING_COLORS = [0x3c4456, 0x4a3d46, 0x37463f, 0x47434f, 0x33414e, 0x453f38]
const WINDOW_LIT      = [0xffe6a8, 0xffd27a, 0xe9f0ff]  // warm/cold lit panes
const WINDOW_DARK     = 0x1c2330
const LAMP_COLOR      = 0xffeccb   // streetlight glow

export const DOWNTOWN_PRESET = {
  seed: 1337,
  zStart: 10,        // street near edge (just behind the camera start)
  zEnd: -184,        // far end, capped by a backdrop building
  streetHalf: 6,     // road half-width (camera + combat happen within this)
  sidewalk: 3,       // kerb width each side
  bayDepth: 13,      // spacing between buildings along the street
}

/** BoxGeometry face order is [+x,-x,+y,-y,+z,-z]; shade each to fake a key light
 * from above/front so unlit boxes still read as 3D. */
function shadedBox(w, h, d, baseHex) {
  const base = new THREE.Color(baseHex)
  const face = f => new THREE.MeshBasicMaterial({ color: base.clone().multiplyScalar(f) })
  const mats = [face(0.84), face(0.66), face(1.0), face(0.45), face(0.92), face(0.74)]
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats)
}

function flatStrip(width, depth, color, y, x, z, { decorative = false } = {}) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(width, depth),
    new THREE.MeshBasicMaterial({ color })
  )
  m.rotation.x = -Math.PI / 2
  m.position.set(x, y, z)
  // Cosmetic overlays (kerbs, lane paint) sit a hair above the road; keep them
  // out of the grounding raycast so `groundYAt` always returns the true street
  // level (y = 0), never a 5 cm decoration on top of it.
  if (decorative) m.raycast = () => {}
  return m
}

/**
 * Accumulate one wall's window grid into shared position/color buffers. Windows
 * lie on an x-constant face (street-facing wall), so quads sit in the y–z plane.
 * @param {object} acc { pos: number[], col: number[] }
 */
function pushWindows(acc, faceX, zCenter, depth, height, rng) {
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
      // Quad corners (two triangles), constant x.
      const za = cz - WIN_W / 2, zb = cz + WIN_W / 2
      const ya = cy - WIN_H / 2, yb = cy + WIN_H / 2
      const quad = [
        [faceX, ya, za], [faceX, ya, zb], [faceX, yb, zb],
        [faceX, ya, za], [faceX, yb, zb], [faceX, yb, za],
      ]
      for (const [x, y, z] of quad) {
        acc.pos.push(x, y, z)
        acc.col.push(col.r, col.g, col.b)
      }
    }
  }
}

/** A streetlight: thin pole + a small bright lamp quad facing the road. */
function streetlight(x, z, faceSign) {
  const g = new THREE.Group()
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 4.5, 6),
    new THREE.MeshBasicMaterial({ color: 0x14171c })
  )
  pole.position.set(x, 2.25, z)
  g.add(pole)
  const lamp = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.18, 0.9),
    new THREE.MeshBasicMaterial({ color: LAMP_COLOR })
  )
  lamp.position.set(x - faceSign * 0.6, 4.4, z)
  g.add(lamp)
  return g
}

/**
 * Build a fully original stage environment (a dusk downtown street corridor).
 * Returns a THREE.Group to use as StageEnvironment.root. Contains a flat ground
 * mesh (named 'ground') that the enemy-grounding raycast (`groundYAt`) hits at
 * y = 0, so enemies stand on the street.
 * @param {Partial<typeof DOWNTOWN_PRESET>} [config]
 * @returns {THREE.Group}
 */
export function buildOriginalEnvironment(config = {}) {
  const cfg = { ...DOWNTOWN_PRESET, ...config }
  const rng = mulberry32(cfg.seed)
  const root = new THREE.Group()
  root.name = 'original_downtown'

  const length = cfg.zStart - cfg.zEnd
  const zMid = (cfg.zStart + cfg.zEnd) / 2

  // Ground — the groundYAt target. Wide and long so a downward raycast anywhere
  // over the playfield lands at y = 0. Far edges dissolve into the renderer's fog.
  const ground = flatStrip(400, length + 200, GROUND_COLOR, 0, 0, zMid)
  ground.name = 'ground'
  root.add(ground)

  // Kerbs/sidewalks just above the road on each side.
  const swX = cfg.streetHalf + cfg.sidewalk / 2
  root.add(flatStrip(cfg.sidewalk, length, SIDEWALK_COLOR, 0.04, -swX, zMid, { decorative: true }))
  root.add(flatStrip(cfg.sidewalk, length, SIDEWALK_COLOR, 0.04,  swX, zMid, { decorative: true }))

  // Centre lane dashes (one merged-ish set of small bright quads via a strip each).
  for (let z = cfg.zStart; z > cfg.zEnd; z -= 6) {
    root.add(flatStrip(0.18, 2.2, LANE_COLOR, 0.05, 0, z - 1.1, { decorative: true }))
  }

  // Buildings line both sides; windows for every facade collect into ONE mesh.
  const win = { pos: [], col: [] }
  const innerX = cfg.streetHalf + cfg.sidewalk   // street-facing wall sits here
  for (let z = cfg.zStart - 2; z > cfg.zEnd + 4; z -= cfg.bayDepth) {
    for (const side of [-1, 1]) {
      const bw = 8 + rng() * 7
      const bd = cfg.bayDepth - 1 - rng() * 3
      const bh = 8 + rng() * 34
      const color = BUILDING_COLORS[(rng() * BUILDING_COLORS.length) | 0]
      const bx = side * (innerX + bw / 2)
      const bz = z - rng() * 2
      const b = shadedBox(bw, bh, bd, color)
      b.position.set(bx, bh / 2, bz)
      root.add(b)
      // Windows on the street-facing wall (+x for left buildings, -x for right).
      const faceX = bx - side * (bw / 2) - side * 0.06
      pushWindows(win, faceX, bz, bd, bh, rng)
    }
    // A streetlight on alternating sides every other bay.
    const side = rng() < 0.5 ? -1 : 1
    root.add(streetlight(side * cfg.streetHalf, z - 4, side))
  }

  if (win.pos.length) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(win.pos, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(win.col, 3))
    const windows = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
    )
    windows.name = 'windows'
    root.add(windows)
  }

  // Backdrop building closing the far end of the street so there's no void there.
  const backdrop = shadedBox(innerX * 2 + 30, 46, 8, BUILDING_COLORS[0])
  backdrop.position.set(0, 23, cfg.zEnd - 2)
  root.add(backdrop)

  return root
}
