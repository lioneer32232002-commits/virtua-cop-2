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
  return new THREE.MeshLambertMaterial({ color })
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

  // Torso
  group.add(mesh(new THREE.CylinderGeometry(0.18, 0.20, 0.55, 8), bodyColor, 0, 0.68, 0))

  // Head (skin tone)
  group.add(mesh(new THREE.SphereGeometry(0.16, 8, 6), SKIN, 0, 1.13, 0))

  // Legs
  group.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.48, 6), bodyColor, -0.10, 0.24, 0))
  group.add(mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.48, 6), bodyColor,  0.10, 0.24, 0))

  // Arms (angled outward)
  group.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.44, 6), bodyColor, -0.28, 0.68, 0,  0.28))
  group.add(mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.44, 6), bodyColor,  0.28, 0.68, 0, -0.28))

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
