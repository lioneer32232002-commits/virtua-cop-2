import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const loader = new GLTFLoader()

/**
 * 載入 P_COMMON.glb，回傳各 enemy type 對應的 THREE.Object3D 模板
 * @param {string} stageId
 * @returns {Promise<Map<string, import('three').Object3D>>}
 */
export async function loadEnemyModels(stageId = 'stage1') {
  const glbPath = `/assets/${stageId}/P_COMMON.glb`
  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(glbPath, resolve, undefined, reject)
    })

    // Collect top-level children that contain actual geometry
    const groups = gltf.scene.children.filter(child => {
      let hasMesh = false
      child.traverse(o => { if (o.isMesh) hasMesh = true })
      return hasMesh
    })
    // Fall back to whole scene if nothing found
    const pool = groups.length > 0 ? groups : [gltf.scene]

    const types = ['grunt', 'gunman', 'heavy', 'boss', 'innocent']
    const map = new Map()
    types.forEach((type, i) => map.set(type, pool[i % pool.length]))
    return map
  } catch (err) {
    console.warn(`EnemyModelLoader: failed to load ${glbPath}, enemies will be boxes`, err)
    return new Map()
  }
}
