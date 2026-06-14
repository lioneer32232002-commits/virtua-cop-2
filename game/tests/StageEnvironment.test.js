import { describe, it, expect, vi } from 'vitest'
import * as THREE from 'three'

// Mock GLTFLoader: always fails, so fallback is triggered
vi.mock('three/examples/jsm/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    load(_path, _onLoad, _onProgress, onError) {
      onError(new Error('test environment, no GLB'))
    }
  },
}))

import { StageEnvironment } from '../src/scene/StageEnvironment.js'

describe('StageEnvironment', () => {
  it('create() resolves and uses fallback when GLB unavailable', async () => {
    const scene = new THREE.Scene()
    const env = await StageEnvironment.create(scene, { type: 'harbor' }, 'stage1')
    expect(env).toBeInstanceOf(StageEnvironment)
    expect(env.root).not.toBeNull()
  })

  it('dispose() removes root from scene', async () => {
    const scene = new THREE.Scene()
    const env = await StageEnvironment.create(scene, { type: 'harbor' }, 'stage1')
    env.dispose()
    expect(env.root).toBeNull()
    expect(scene.children).toHaveLength(0)
  })
})

describe('StageEnvironment void floor', () => {
  it('adds a horizontal backdrop plane at the given height', () => {
    const scene = new THREE.Scene()
    const env = new StageEnvironment(scene)
    env._addVoidFloor(scene, -11)
    expect(env._voidFloor).not.toBeNull()
    expect(scene.children).toContain(env._voidFloor)
    expect(env._voidFloor.name).toBe('void_floor')
    expect(env._voidFloor.position.y).toBe(-11)
    // rotated flat (normal points up)
    expect(env._voidFloor.rotation.x).toBeCloseTo(-Math.PI / 2)
  })

  it('is invisible to raycasters so it never grounds enemies', () => {
    const scene = new THREE.Scene()
    const env = new StageEnvironment(scene)
    env._addVoidFloor(scene, -11)
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 50, 0), new THREE.Vector3(0, -1, 0), 0, 200)
    const hits = []
    env._voidFloor.raycast(ray, hits)
    expect(hits).toHaveLength(0)
  })

  it('dispose() removes the void floor from the scene', () => {
    const scene = new THREE.Scene()
    const env = new StageEnvironment(scene)
    // give it a root so dispose() proceeds past its early return
    env.root = new THREE.Group()
    scene.add(env.root)
    env._addVoidFloor(scene, -11)
    env.dispose()
    expect(env._voidFloor).toBeNull()
    expect(scene.children).toHaveLength(0)
  })
})
