import * as THREE from 'three'

function lerp(a, b, t) { return a + (b - a) * t }

function eulerToQuat(yaw_rad, pitch_rad) {
  const q = new THREE.Quaternion()
  q.setFromEuler(new THREE.Euler(pitch_rad, yaw_rad, 0, 'YXZ'))
  return q
}

export class CameraRig {
  /** @type {boolean} */ paused = false
  /** @type {THREE.PerspectiveCamera|null} */ camera

  /**
   * Frame-based constructor (preferred):
   *   new CameraRig(camera, { frameCount, fps, frames: Float32Array })
   *
   * Curve-based fallback:
   *   new CameraRig(camera, waypoints: THREE.Vector3[], duration: number)
   */
  constructor(camera, dataOrWaypoints, duration) {
    this.camera = camera
    if (dataOrWaypoints?.frames instanceof Float32Array) {
      this._mode       = 'frames'
      this._frames     = dataOrWaypoints.frames
      this._frameCount = dataOrWaypoints.frameCount
      this._fps        = dataOrWaypoints.fps
      this._accumSec   = 0
    } else {
      this._mode     = 'curve'
      this._curve    = new THREE.CatmullRomCurve3(dataOrWaypoints)
      this._duration = duration
      this.progress  = 0
    }
  }

  pause()  { this.paused = true }
  resume() { this.paused = false }

  reset() {
    this.paused = false
    if (this._mode === 'frames') {
      this._accumSec = 0
    } else {
      this.progress = 0
    }
  }

  /** @param {number} dt - seconds elapsed */
  advance(dt) {
    if (this.paused) return
    if (this._mode === 'frames') {
      this._advanceFrames(dt)
    } else {
      this._advanceCurve(dt)
    }
  }

  _advanceFrames(dt) {
    this._accumSec += dt
    const rawFrame = this._accumSec * this._fps
    const f0 = Math.min(Math.floor(rawFrame), this._frameCount - 1)
    const f1 = Math.min(f0 + 1,              this._frameCount - 1)
    const t  = rawFrame - Math.floor(rawFrame)

    const p0 = f0 * 5
    const p1 = f1 * 5
    const x = lerp(this._frames[p0],     this._frames[p1],     t)
    const y = lerp(this._frames[p0 + 1], this._frames[p1 + 1], t)
    const z = lerp(this._frames[p0 + 2], this._frames[p1 + 2], t)

    const q0 = eulerToQuat(this._frames[p0 + 3], this._frames[p0 + 4])
    const q1 = eulerToQuat(this._frames[p1 + 3], this._frames[p1 + 4])
    q0.slerp(q1, t)

    if (this.camera) {
      this.camera.position.set(x, y, z)
      this.camera.quaternion.copy(q0)
    }
  }

  _advanceCurve(dt) {
    this.progress = Math.min(1, this.progress + dt / this._duration)
    if (this.camera) {
      const pos = this._curve.getPoint(this.progress)
      const tangent = this._curve.getTangent(this.progress)
      this.camera.position.copy(pos)
      const lookTarget = pos.clone().addScaledVector(tangent, 1)
      this.camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z)
    }
  }
}
