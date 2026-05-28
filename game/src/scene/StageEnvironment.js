import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const WORLD_DEPTH = 60   // target depth of gameplay world in units

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

      // Scale GLB (original game coords) down to fit the 60-unit gameplay world
      const box1 = new THREE.Box3().setFromObject(env.root)
      const size1 = box1.getSize(new THREE.Vector3())
      const horizSpan = Math.max(size1.x, size1.z)
      if (horizSpan > 0) env.root.scale.setScalar(WORLD_DEPTH / horizSpan)

      // Centre on X/Z, sit floor at y = 0
      const box2 = new THREE.Box3().setFromObject(env.root)
      const c = box2.getCenter(new THREE.Vector3())
      env.root.position.set(-c.x, -box2.min.y, -c.z - WORLD_DEPTH / 2)

      // Normalise materials and enable shadows
      env.root.traverse(child => {
        if (!child.isMesh) return
        child.castShadow = true
        child.receiveShadow = true
        // PBR materials with metalness=1 look pitch-black without env maps;
        // clamp to diffuse-dominant values so directional lights register.
        const mats = Array.isArray(child.material) ? child.material : [child.material]
        mats.forEach(m => {
          if (m?.isMeshStandardMaterial) {
            m.roughness = Math.max(m.roughness, 0.6)
            m.metalness = Math.min(m.metalness, 0.1)
            // Boost dark diffuse colors — original VC2 used baked lighting in textures
            m.color.multiplyScalar(2.0)
          }
        })
      })

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
