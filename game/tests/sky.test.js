import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import {
  createSkyDome, applyAtmosphere, updateSky,
  SKY_HORIZON, FOG_NEAR, FOG_FAR,
} from '../src/render/sky.js'

describe('createSkyDome', () => {
  it('is an inward-facing sphere drawn behind everything', () => {
    const dome = createSkyDome()
    expect(dome.isMesh).toBe(true)
    expect(dome.geometry.type).toBe('SphereGeometry')
    expect(dome.material.side).toBe(THREE.BackSide)
    expect(dome.renderOrder).toBe(-1)
  })

  it('does not write depth, ignores fog, and is never frustum-culled', () => {
    const dome = createSkyDome()
    expect(dome.material.depthWrite).toBe(false)
    expect(dome.material.fog).toBe(false)
    expect(dome.frustumCulled).toBe(false)
  })

  it('is invisible to raycasters (no intersections contributed)', () => {
    const dome = createSkyDome(10)
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1))
    const hits = []
    // A real BackSide sphere around the origin would be hit; the override must
    // contribute nothing so gameplay raycasts never see the sky.
    dome.raycast(ray, hits)
    expect(hits).toHaveLength(0)
  })
})

describe('applyAtmosphere', () => {
  it('adds the dome and sets matching fog + background', () => {
    const scene = new THREE.Scene()
    const dome = applyAtmosphere(scene)

    expect(scene.children).toContain(dome)
    expect(scene.fog).toBeInstanceOf(THREE.Fog)
    expect(scene.fog.color.getHex()).toBe(SKY_HORIZON)
    expect(scene.fog.near).toBe(FOG_NEAR)
    expect(scene.fog.far).toBe(FOG_FAR)
    expect(scene.background.getHex()).toBe(SKY_HORIZON)
  })

  it('fog far stays inside the camera far plane (3000)', () => {
    // Geometry past the far plane is clipped anyway; fog must fade it before then.
    expect(FOG_FAR).toBeLessThan(3000)
    expect(FOG_NEAR).toBeLessThan(FOG_FAR)
  })
})

describe('updateSky', () => {
  it('recentres the dome on the camera', () => {
    const dome = createSkyDome()
    const cam = new THREE.PerspectiveCamera()
    cam.position.set(12, -3, 48)
    updateSky(dome, cam)
    expect(dome.position.x).toBe(12)
    expect(dome.position.y).toBe(-3)
    expect(dome.position.z).toBe(48)
  })

  it('is a no-op on missing args', () => {
    expect(() => updateSky(null, null)).not.toThrow()
    expect(() => updateSky(createSkyDome(), null)).not.toThrow()
  })
})
