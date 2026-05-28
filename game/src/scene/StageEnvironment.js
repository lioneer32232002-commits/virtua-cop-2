import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const STAGE_SCENE_MAP = {
  stage1: 'stage1/P_STG10.glb',
  stage2: 'stage2/P_STG20.glb',
  stage3: 'stage3/P_STG30.glb',
}

const loader = new GLTFLoader()

export class StageEnvironment {
  /** @type {THREE.Object3D|null} */
  root = null
  /** @type {THREE.Scene} */
  scene

  constructor(scene) {
    this.scene = scene
  }

  /**
   * Async factory — await this before continuing
   * @param {THREE.Scene} scene
   * @param {{ type: string }} config
   * @param {string} stageId  'stage1' | 'stage2' | 'stage3'
   * @returns {Promise<StageEnvironment>}
   */
  static async create(scene, config, stageId = 'stage1') {
    const env = new StageEnvironment(scene)
    const glbPath = `/assets/${STAGE_SCENE_MAP[stageId] ?? STAGE_SCENE_MAP.stage1}`
    try {
      const gltf = await new Promise((resolve, reject) => {
        loader.load(glbPath, resolve, undefined, reject)
      })
      env.root = gltf.scene
      scene.add(env.root)
    } catch (err) {
      console.warn(`StageEnvironment: failed to load ${glbPath}, using fallback`, err)
      env._buildFallback()
    }
    return env
  }

  _buildFallback() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 60),
      new THREE.MeshLambertMaterial({ color: 0x334455 })
    )
    mesh.position.set(0, -0.1, -25)
    this.root = mesh
    this.scene.add(mesh)
  }

  dispose() {
    if (!this.root) return
    this.scene.remove(this.root)
    this.root.traverse(obj => {
      obj.geometry?.dispose()
      if (Array.isArray(obj.material)) {
        obj.material.forEach(m => m.dispose())
      } else {
        obj.material?.dispose()
      }
    })
    this.root = null
  }
}
