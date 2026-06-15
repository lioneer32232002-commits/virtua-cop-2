// game/src/darkline/free/FreeRoamController.js
import { clampToSegments } from './clamp.js'

// 純函式：依按鍵 + 偏航角算本幀位移（未夾擠）。yaw=0 時「前」= -z。
export function moveDelta(keys, yaw, speed, dt) {
  let fx = 0, fz = 0
  if (keys.forward) fz -= 1
  if (keys.back) fz += 1
  if (keys.left) fx -= 1
  if (keys.right) fx += 1
  const len = Math.hypot(fx, fz)
  if (len === 0) return { dx: 0, dz: 0 }
  fx /= len; fz /= len
  const sin = Math.sin(yaw), cos = Math.cos(yaw)
  const wx = fx * cos + fz * sin
  const wz = -fx * sin + fz * cos
  return { dx: wx * speed * dt, dz: wz * speed * dt }
}

// 整合類：綁 PointerLock + 鍵盤；每幀 update(dt) 把相機夾在巷弄段聯集內。
export class FreeRoamController {
  constructor(camera, dom, segments, obstacles = [], { speed = 3, eye = 1.6, radius = 0.3 } = {}) {
    this.camera = camera; this.dom = dom; this.segments = segments
    this.obstacles = obstacles; this.speed = speed; this.eye = eye; this.radius = radius
    this.yaw = 0; this.pitch = 0; this.enabled = false
    this.keys = { forward: false, back: false, left: false, right: false }
    this._onKey = (e, down) => {
      const k = { KeyW: 'forward', KeyS: 'back', KeyA: 'left', KeyD: 'right' }[e.code]
      if (k) this.keys[k] = down
    }
    this._kd = e => this._onKey(e, true)
    this._ku = e => this._onKey(e, false)
    this._mm = e => {
      if (!this.enabled) return
      this.yaw -= e.movementX * 0.0025
      this.pitch -= e.movementY * 0.0025
      this.pitch = Math.max(-1.2, Math.min(1.2, this.pitch))
    }
    this._lock = () => { this.enabled = document.pointerLockElement === this.dom }
  }
  attach() {
    this._click = () => this.dom.requestPointerLock()
    this.dom.addEventListener('click', this._click)
    document.addEventListener('pointerlockchange', this._lock)
    document.addEventListener('mousemove', this._mm)
    window.addEventListener('keydown', this._kd)
    window.addEventListener('keyup', this._ku)
  }
  detach() {
    this.dom.removeEventListener('click', this._click)
    document.removeEventListener('pointerlockchange', this._lock)
    document.removeEventListener('mousemove', this._mm)
    window.removeEventListener('keydown', this._kd)
    window.removeEventListener('keyup', this._ku)
    this.keys = { forward: false, back: false, left: false, right: false }
  }
  update(dt) {
    const { dx, dz } = moveDelta(this.keys, this.yaw, this.speed, dt)
    const p = clampToSegments(
      { x: this.camera.position.x + dx, z: this.camera.position.z + dz },
      this.segments, this.obstacles, this.radius,
    )
    this.camera.position.set(p.x, this.eye, p.z)
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ')
  }
}
