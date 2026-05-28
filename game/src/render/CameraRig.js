import * as THREE from 'three'

export class CameraRig {
  /** @type {number} 0–1 */ progress = 0
  /** @type {boolean} */ paused = false
  /** @type {THREE.PerspectiveCamera|null} */ camera
  /** @type {THREE.CatmullRomCurve3} */ curve
  /** @type {number} total duration in seconds */ duration

  /**
   * @param {THREE.PerspectiveCamera|null} camera
   * @param {THREE.Vector3[]} waypoints - world-space rail control points
   * @param {number} duration - total seconds to traverse the full rail
   */
  constructor(camera, waypoints, duration) {
    this.camera = camera
    this.curve = new THREE.CatmullRomCurve3(waypoints)
    this.duration = duration
  }

  pause() { this.paused = true }
  resume() { this.paused = false }

  /** @param {number} dt - seconds */
  advance(dt) {
    if (this.paused) return
    this.progress = Math.min(1, this.progress + dt / this.duration)
    if (this.camera) this._applyToCamera()
  }

  _applyToCamera() {
    const pos = this.curve.getPoint(this.progress)
    const tangent = this.curve.getTangent(this.progress)
    this.camera.position.copy(pos)
    const lookTarget = pos.clone().addScaledVector(tangent, 1)
    this.camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z)
  }

  reset() {
    this.progress = 0
    this.paused = false
  }
}
