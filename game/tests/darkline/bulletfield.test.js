import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { BulletField } from '../../src/darkline/combat/BulletField.js'

function fakeScene() {
  const added = []
  return {
    add: o => added.push(o),
    remove: o => { const i = added.indexOf(o); if (i >= 0) added.splice(i, 1) },
    _added: added,
  }
}
const cam = () => ({ position: new THREE.Vector3(0, 1.6, 0), quaternion: new THREE.Quaternion() })

describe('BulletField', () => {
  it('fireAt spawns a tracked bullet whose mesh resolves back to the projectile', () => {
    const scene = fakeScene()
    const bf = new BulletField(scene, cam(), { rng: () => 0 })
    const p = bf.fireAt({ x: 0, y: 1, z: -10 })
    expect(bf.bullets).toHaveLength(1)
    expect(scene._added).toHaveLength(1)
    expect(p.mesh.userData.projectileRef).toBe(p)   // resolveProjectile 能認 → 共用射落
    expect(bf.meshes()).toHaveLength(1)
  })

  it('a hit fires onHit once on arrival and retires the bullet', () => {
    const scene = fakeScene()
    let hits = 0
    const bf = new BulletField(scene, cam(), { rng: () => 0, onHit: () => hits++ })   // rng 0 → willHit
    bf.fireAt({ x: 0, y: 1, z: -10 })
    bf.update(0.5)   // > flightTime(~0.4) → arrived
    expect(hits).toBe(1)
    expect(bf.bullets).toHaveLength(0)        // retired same frame on arrival
    expect(scene._added).toHaveLength(0)      // mesh removed from scene
  })

  it('a miss never calls onHit', () => {
    const scene = fakeScene()
    let hits = 0
    const bf = new BulletField(scene, cam(), { rng: () => 0.99, onHit: () => hits++ })   // rng high → miss
    bf.fireAt({ x: 0, y: 1, z: -10 })
    bf.update(1.2)
    expect(hits).toBe(0)
    expect(bf.bullets).toHaveLength(0)
  })

  it('shootDown retires the bullet with no hit', () => {
    const scene = fakeScene()
    let hits = 0
    const bf = new BulletField(scene, cam(), { rng: () => 0, onHit: () => hits++ })
    const p = bf.fireAt({ x: 0, y: 1, z: -10 })
    p.shootDown()
    bf.update(0.1)
    expect(hits).toBe(0)
    expect(bf.bullets).toHaveLength(0)
    expect(bf.meshes()).toHaveLength(0)
  })

  it('clear() removes all in-flight bullets from the scene', () => {
    const scene = fakeScene()
    const bf = new BulletField(scene, cam(), { rng: () => 0 })
    bf.fireAt({ x: 0, y: 1, z: -10 })
    bf.fireAt({ x: 2, y: 1, z: -8 })
    expect(scene._added).toHaveLength(2)
    bf.clear()
    expect(bf.bullets).toHaveLength(0)
    expect(scene._added).toHaveLength(0)
  })
})
