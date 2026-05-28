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
