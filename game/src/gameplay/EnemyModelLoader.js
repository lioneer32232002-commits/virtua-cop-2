import * as THREE from 'three'

const BODY_COLORS = {
  grunt:    0x3355bb,   // blue police officer
  gunman:   0xbb3333,   // red criminal
  innocent: 0xddbb66,   // tan civilian
  heavy:    0x445544,   // dark heavy armour
  boss:     0x111133,   // near-black boss
}

const SKIN = 0xd4a070

function mat(color) {
  return new THREE.MeshBasicMaterial({ color })
}

// Unlit rendering gives no shape cues, so fake them: limbs use a darkened
// shade of the body colour to keep the silhouette readable.
function shade(color, factor) {
  return new THREE.Color(color).multiplyScalar(factor).getHex()
}

function mesh(geo, color, x = 0, y = 0, z = 0, rotZ = 0) {
  const m = new THREE.Mesh(geo, mat(color))
  m.position.set(x, y, z)
  if (rotZ !== 0) m.rotation.z = rotZ
  return m
}

/**
 * Build a simple low-poly humanoid group, standing upright with feet at y=0.
 * Total height ≈ 1.35 units. Scale is handled by EnemyManager per type.
 */
function createHumanoid(bodyColor) {
  const group = new THREE.Group()

  // Tag a part mesh with its hit zone (read by zoneOfHit on raycast).
  const zoned = (m, zone) => { m.userData.zone = zone; return m }

  // Torso (body zone is the default, but tag it explicitly for clarity)
  group.add(zoned(mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.55, 8), bodyColor, 0, 0.68, 0), 'body'))

  // Head (skin tone) — headshots are an instant kill
  group.add(zoned(mesh(new THREE.SphereGeometry(0.16, 8, 6), SKIN, 0, 1.13, 0), 'head'))

  // Legs — leg hits are low-value (slow, never kill)
  const limbColor = shade(bodyColor, 0.65)
  group.add(zoned(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.48, 6), limbColor, -0.10, 0.24, 0), 'leg'))
  group.add(zoned(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.48, 6), limbColor,  0.10, 0.24, 0), 'leg'))

  // Arms (angled outward) — hand/arm hits are justice shots (disarm)
  group.add(zoned(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.44, 6), limbColor, -0.28, 0.68, 0,  0.28), 'hand'))
  group.add(zoned(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.44, 6), limbColor,  0.28, 0.68, 0, -0.28), 'hand'))

  return group
}

/**
 * @param {string} _stageId  (unused — models are procedural)
 * @returns {Promise<Map<string, import('three').Object3D>>}
 */
export async function loadEnemyModels(_stageId = 'stage1') {
  const map = new Map()
  for (const [type, color] of Object.entries(BODY_COLORS)) {
    map.set(type, createHumanoid(color))
  }
  return map
}
