import * as THREE from 'three'

const RECOIL_DURATION = 0.12   // seconds for one kick to settle
const RECOIL_KICK     = 0.18   // metres pulled toward the camera at full recoil
const RECOIL_RISE     = 0.07   // metres lifted at full recoil
const RECOIL_PITCH    = 0.35   // radians the muzzle tips up at full recoil

// Resting pose in camera-local space: bottom-right of the view, in front of near plane.
const REST = { x: 0.32, y: -0.28, z: -0.7 }

/**
 * Linear recoil decay, clamped at zero. Pure so it can be unit-tested.
 * @param {number} recoil  current recoil amount in [0, 1]
 * @param {number} dt      seconds elapsed
 * @param {number} duration seconds for a full kick to settle
 */
export function decayRecoil(recoil, dt, duration) {
  return Math.max(0, recoil - dt / duration)
}

/**
 * A placeholder first-person pistol built from primitives (no external assets).
 * Parented to the camera so it tracks the rail automatically, and never added to
 * the raycast target list so it cannot block shots.
 */
export class WeaponViewModel {
  /** @type {THREE.Group} */ root
  /** @type {number} */ _recoil = 0

  constructor() {
    this.root = WeaponViewModel._build()
    this.root.position.set(REST.x, REST.y, REST.z)
  }

  /** Attach to a camera so the gun stays fixed on screen. */
  attachTo(camera) {
    camera.add(this.root)
  }

  /** Trigger a recoil kick (call on shoot). */
  fire() {
    this._recoil = 1
  }

  /** @param {number} dt seconds */
  update(dt) {
    this._recoil = decayRecoil(this._recoil, dt, RECOIL_DURATION)
    const r = this._recoil
    this.root.position.set(REST.x, REST.y + r * RECOIL_RISE, REST.z + r * RECOIL_KICK)
    this.root.rotation.x = r * RECOIL_PITCH
  }

  static _build() {
    const group = new THREE.Group()
    const metal = new THREE.MeshBasicMaterial({ color: 0x3a4049 })
    const grip  = new THREE.MeshBasicMaterial({ color: 0x4a382a })

    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.09, 0.34), metal)
    slide.position.set(0, 0, -0.05)
    group.add(slide)

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 12), metal)
    barrel.rotation.x = Math.PI / 2
    barrel.position.set(0, 0.01, -0.26)
    group.add(barrel)

    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.1), grip)
    handle.position.set(0, -0.13, 0.06)
    handle.rotation.x = -0.25
    group.add(handle)

    group.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false } })
    return group
  }
}
