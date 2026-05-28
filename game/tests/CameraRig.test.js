import { describe, it, expect, vi } from 'vitest'
import { CameraRig } from '../src/render/CameraRig.js'

vi.mock('three', () => {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this }
    clone() { return new Vector3(this.x, this.y, this.z) }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this }
  }
  class Quaternion {
    constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1 }
    setFromEuler() { return this }
    slerp() { return this }
    copy(q) { Object.assign(this, q); return this }
  }
  class Euler {
    constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
      this.x = x; this.y = y; this.z = z; this.order = order
    }
  }
  return {
    CatmullRomCurve3: class {
      constructor(pts) { this._pts = pts }
      getPoint(t) { return new Vector3(t, 0, -t * 10) }
      getTangent() { return new Vector3(0, 0, -1) }
    },
    Vector3,
    Quaternion,
    Euler,
  }
})

// ─── Curve mode (legacy fallback) ─────────────────────────────────────────────

describe('CameraRig – curve mode', () => {
  it('starts at progress 0', () => {
    const rig = new CameraRig(null, [], 30)
    expect(rig.progress).toBe(0)
  })

  it('advances progress with advance(dt)', () => {
    const rig = new CameraRig(null, [], 30)
    rig.advance(3)
    expect(rig.progress).toBeCloseTo(0.1)
  })

  it('clamps progress at 1', () => {
    const rig = new CameraRig(null, [], 30)
    rig.advance(100)
    expect(rig.progress).toBe(1)
  })

  it('does not advance when paused', () => {
    const rig = new CameraRig(null, [], 30)
    rig.pause()
    rig.advance(5)
    expect(rig.progress).toBe(0)
  })

  it('resumes advancing after resume()', () => {
    const rig = new CameraRig(null, [], 30)
    rig.pause()
    rig.resume()
    rig.advance(3)
    expect(rig.progress).toBeCloseTo(0.1)
  })
})

// ─── Frame mode ───────────────────────────────────────────────────────────────

function makeCamData(frameCount) {
  const frames = new Float32Array(frameCount * 5)
  for (let i = 0; i < frameCount; i++) {
    frames[i * 5 + 0] = i * 1.0  // x
    frames[i * 5 + 1] = 0        // y
    frames[i * 5 + 2] = i * 2.0  // z
    frames[i * 5 + 3] = 0        // yaw_rad
    frames[i * 5 + 4] = 0        // pitch_rad
  }
  return { frameCount, fps: 30, frames }
}

function makeCam() {
  return {
    position: { set: vi.fn() },
    quaternion: { copy: vi.fn() },
    lookAt: vi.fn(),
  }
}

describe('CameraRig – frame mode', () => {
  it('calls camera.position.set on advance', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(10))
    rig.advance(0.001)
    expect(cam.position.set).toHaveBeenCalled()
  })

  it('does not call camera.position.set when paused', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(10))
    rig.pause()
    rig.advance(1)
    expect(cam.position.set).not.toHaveBeenCalled()
  })

  it('reset() zeroes _accumSec', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(10))
    rig.advance(1)
    rig.reset()
    expect(rig._accumSec).toBe(0)
    expect(rig.paused).toBe(false)
  })

  it('resumes after pause/resume', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(10))
    rig.pause()
    rig.resume()
    rig.advance(0.001)
    expect(cam.position.set).toHaveBeenCalled()
  })

  it('clamps to last frame when accumSec exceeds duration', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(5))
    rig.advance(999)
    // Should not throw and should have called set
    expect(cam.position.set).toHaveBeenCalled()
  })
})
