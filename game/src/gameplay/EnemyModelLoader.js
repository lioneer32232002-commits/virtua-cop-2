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

    const template = gltf.scene.children[0] ?? gltf.scene

    const map = new Map()
    for (const type of ['grunt', 'gunman', 'heavy', 'boss', 'innocent']) {
      map.set(type, template)
    }
    return map
  } catch (err) {
    console.warn(`EnemyModelLoader: failed to load ${glbPath}, enemies will be boxes`, err)
    return new Map()
  }
}
