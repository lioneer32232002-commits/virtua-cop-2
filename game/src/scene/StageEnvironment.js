import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// Each stage is split into several model packs in the original game data;
// the CAMMOV camera path traverses all of them, so load every chunk.
const STAGE_SCENE_CHUNKS = {
  stage1: ['stage1/P_STG10.glb', 'stage1/P_STG11.glb', 'stage1/P_STG12.glb', 'stage1/P_STG1C.glb'],
  stage2: ['stage2/P_STG20.glb', 'stage2/P_STG21.glb', 'stage2/P_STG22.glb', 'stage2/P_STG2C.glb'],
  stage3: ['stage3/P_STG30.glb', 'stage3/P_STG31.glb', 'stage3/P_STG32.glb', 'stage3/P_STG3C.glb'],
}

const loader = new GLTFLoader()

function loadGlb(path) {
  return new Promise((resolve, reject) => {
    loader.load(path, resolve, undefined, reject)
  })
}

export class StageEnvironment {
  /** @type {THREE.Object3D|null} */
  root = null
  /** @type {THREE.Mesh|null} */
  _ground = null
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
    const chunks = STAGE_SCENE_CHUNKS[stageId] ?? STAGE_SCENE_CHUNKS.stage1

    const results = await Promise.allSettled(
      chunks.map(c => loadGlb(`/assets/${c}`))
    )
    const loaded = results.filter(r => r.status === 'fulfilled').map(r => r.value)
    results.forEach((r, i) => {
      if (r.status === 'rejected') console.warn(`StageEnvironment: chunk ${chunks[i]} unavailable`)
    })

    if (loaded.length > 0) {
      // Keep original game world coordinates — the CAMMOV camera path and the
      // stage geometry share the same coordinate system, so no scaling/centering.
      const root = new THREE.Group()
      root.name = `stage_${stageId}`
      for (const gltf of loaded) root.add(gltf.scene)

      // Original VC2 shading is baked into the textures — swap GLTFLoader's
      // PBR materials for unlit ones so textures render exactly as authored.
      root.traverse(child => {
        if (!child.isMesh) return
        const convert = m => {
          if (!m?.isMeshStandardMaterial) return m
          const basic = new THREE.MeshBasicMaterial({
            map: m.map ?? null,
            color: m.color.clone(),
            transparent: m.transparent,
            opacity: m.opacity,
            alphaTest: m.alphaTest,
            side: m.side,
          })
          m.dispose()
          return basic
        }
        child.material = Array.isArray(child.material)
          ? child.material.map(convert)
          : convert(child.material)
      })

      env.root = root
      scene.add(root)
    } else {
      console.warn(`StageEnvironment: no GLB chunks for ${stageId}, using fallback`)
      env._buildFallback()
      env._addGroundPlane(scene)
    }

    return env
  }

  _buildFallback() {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.2, 60),
      new THREE.MeshBasicMaterial({ color: 0x334455 })
    )
    mesh.position.set(0, -0.1, -25)
    this.root = mesh
    this.scene.add(mesh)
  }

  /** Fallback-only flat plane so the placeholder world has a floor. */
  _addGroundPlane(scene) {
    const geo = new THREE.PlaneGeometry(400, 400)
    const mat = new THREE.MeshBasicMaterial({ color: 0x556655 })
    const plane = new THREE.Mesh(geo, mat)
    plane.rotation.x = -Math.PI / 2
    plane.position.set(0, -0.02, -50)
    this._ground = plane
    scene.add(plane)
  }

  /**
   * Street height at (x, z), found by raycasting straight down from above refY.
   * Returns null when there is no geometry below (e.g. fallback world).
   * @param {number} x
   * @param {number} z
   * @param {number} refY  reference height to cast from (e.g. camera y)
   * @returns {number|null}
   */
  groundYAt(x, z, refY = 0) {
    if (!this.root) return null
    const ray = new THREE.Raycaster(
      new THREE.Vector3(x, refY + 10, z),
      new THREE.Vector3(0, -1, 0),
      0,
      200
    )
    const hits = ray.intersectObject(this.root, true)
    return hits.length > 0 ? hits[0].point.y : null
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
    if (this._ground) {
      this.scene.remove(this._ground)
      this._ground.geometry.dispose()
      this._ground.material.dispose()
      this._ground = null
    }
  }
}
