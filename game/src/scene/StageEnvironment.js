import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { toUnlit } from '../render/unlit.js'
import { mergeStaticMeshes } from '../render/mergeStatic.js'

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
      toUnlit(root)

      // The stage ships as thousands of tiny meshes (~9400 → ~11K draw calls,
      // draw-call bound). Merging by material into one geometry per texture cuts
      // that ~8×, which measured ~9× faster rendering at a fixed pose (see
      // ROADMAP「效能 merge 完成」). consume:true reuses the source geometries to
      // keep the one-time load merge fast; world transforms bake into the
      // vertices, so the result renders at identity. `?nomerge` skips the merge
      // for an A/B comparison against the original draw-call-bound path.
      const flag = name =>
        typeof location !== 'undefined' && new URLSearchParams(location.search).has(name)
      const noMerge = flag('nomerge')

      // `?perfdebug`: full triangle accounting (extra traversals) to catch a
      // failed chunk or dropped geometry. Captured BEFORE the merge consumes the
      // source geometries. Off by default so a normal load pays no traversal cost.
      let debug = null
      if (flag('perfdebug')) {
        const triCount = o => {
          let t = 0
          o.traverse(m => {
            if (!m.isMesh || !m.geometry) return
            const i = m.geometry.index, p = m.geometry.attributes.position
            t += i ? i.count / 3 : (p ? p.count / 3 : 0)
          })
          return t
        }
        let srcMeshes = 0; root.traverse(o => { if (o.isMesh) srcMeshes++ })
        debug = {
          triCount,
          srcMeshes,
          srcTris: Math.round(triCount(root)),
          perChunk: loaded.map((g, i) => `${chunks[i].split('/').pop()}=${Math.round(triCount(g.scene))}t`),
        }
      }

      const t0 = performance.now()
      const stageRoot = noMerge ? root : mergeStaticMeshes(root, { consume: true })
      const mergeMs = performance.now() - t0
      stageRoot.name = `stage_${stageId}`

      if (debug) {
        let mrgMeshes = 0; stageRoot.traverse(o => { if (o.isMesh) mrgMeshes++ })
        console.info(`[stage] ${stageId}${noMerge ? ' NO-MERGE' : ''}: ${loaded.length}/${chunks.length} chunks ` +
          `[${debug.perChunk.join(' ')}] | ${debug.srcMeshes}→${mrgMeshes} meshes, ` +
          `${debug.srcTris}→${Math.round(debug.triCount(stageRoot))} tris, merge ${mergeMs.toFixed(0)}ms`)
      } else {
        console.info(`[stage] ${stageId}${noMerge ? ' NO-MERGE' : ''}: ${loaded.length}/${chunks.length} chunks, ` +
          `${stageRoot.children.length} draw groups, merge ${mergeMs.toFixed(0)}ms`)
      }

      // consume:true reuses/disposes the source geometries internally — do not
      // dispose `root` here. (In ?nomerge mode stageRoot IS root.)
      env.root = stageRoot
      scene.add(stageRoot)
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
