import { CameraRig } from '../src/render/CameraRig.js'

vi.mock('three', () => ({
  CatmullRomCurve3: class {
    constructor(pts) { this._pts = pts }
    getPoint(t) { return { x: t, y: 0, z: -t * 10, clone: () => ({ x: t, y: 0, z: -t * 10 }) } }
    getTangent() { return { x: 0, y: 0, z: -1 } }
  },
  Vector3: class {
    constructor(x=0, y=0, z=0) { this.x = x; this.y = y; this.z = z }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this }
    addScaledVector(v, s) { this.x += v.x*s; this.y += v.y*s; this.z += v.z*s; return this }
    clone() { return new this.constructor(this.x, this.y, this.z) }
  },
}))

describe('CameraRig', () => {
  it('starts at progress 0', () => {
    const rig = new CameraRig(null, [], 30)
    expect(rig.progress).toBe(0)
  })

  it('advances progress with advance(dt)', () => {
    const rig = new CameraRig(null, [], 30)
    rig.advance(3) // 3s out of 30s = 0.1
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
