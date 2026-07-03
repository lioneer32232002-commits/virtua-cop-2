import * as THREE from 'three'
import { shadedBox, flatStrip, pushWindows, streetlight } from './streetKit.js'

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
// (per-segment horizons in render/sky.js: DUSK_TAIPEI / DUSK_HARBOR) once fog blends them.
const GROUND_COLOR    = 0x23262d   // wet asphalt
const SIDEWALK_COLOR  = 0x4b4f59   // concrete kerb
const LANE_COLOR      = 0xb8a23a   // worn yellow centre line
const BUILDING_COLORS = [0x3c4456, 0x4a3d46, 0x37463f, 0x47434f, 0x33414e, 0x453f38]

export const DOWNTOWN_PRESET = {
  seed: 1337,
  zStart: 10,        // street near edge (just behind the camera start)
  zEnd: -184,        // far end, capped by a backdrop building
  streetHalf: 6,     // road half-width (camera + combat happen within this)
  sidewalk: 3,       // kerb width each side
  bayDepth: 13,      // spacing between buildings along the street
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

// ── DARKLINE rail presets (M1 placeholder; reuse the downtown corridor builder
// with warm-grey / harbour-scaled dims). The real 1950s arcade colonnade and the
// real harbour water/pier are art upgrades deferred to M2 (spec §7.3, §11). This
// is additive only — buildOriginalEnvironment / DOWNTOWN_PRESET are untouched, so
// stage1 / downtown1 see zero regression.
// ─────────────────────────────────────────────────────────────────────────────

// 1950s Taipei arcade street: slightly narrower road, denser blocks.
export const TAIPEI1950S_PRESET = {
  seed: 1953,
  zStart: 10,
  zEnd: -180,
  streetHalf: 5,
  sidewalk: 3.5,
  bayDepth: 11,
}

// Harbour: wider and more open, sparser blocks.
export const HARBOR_PRESET = {
  seed: 1949,
  zStart: 10,
  zEnd: -200,
  streetHalf: 8,
  sidewalk: 2,
  bayDepth: 18,
}
