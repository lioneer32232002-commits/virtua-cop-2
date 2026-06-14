import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Draw-call optimisation for the static stage scenery.
//
// stage1 is draw-call bound: ~4000 draw calls for only ~23K triangles, i.e.
// thousands of tiny independent meshes (~6 tris/call). The fix is to merge all
// static geometry that shares a material into one big geometry per material, so
// the GPU draws each texture in a single call. This runs ONCE at stage load.
//
// Must run AFTER toUnlit() — we group by the unlit MeshBasicMaterial's texture
// and blend state, and (being unlit) we can drop normals entirely, which both
// shrinks the buffers and lets more meshes share an attribute layout.
//
// Only ever applied to StageEnvironment's static world geometry — never to the
// CharacterFactory enemies/civilians, which are dynamic and carry per-part
// raycast zone tags.

/**
 * Visual identity of a material for merging: two meshes can collapse into one
 * draw call iff they use the same texture and the same blend/opacity/side state.
 * @param {import('three').Material} mat
 * @returns {string}
 */
export function materialKey(mat) {
  return [
    mat.map ? mat.map.uuid : 'no-map',
    mat.color ? mat.color.getHexString() : 'ffffff',
    mat.transparent ? 't' : 'o',
    mat.opacity ?? 1,
    mat.alphaTest ?? 0,
    mat.side ?? THREE.FrontSide,
    mat.vertexColors ? 'vc' : 'nc',
  ].join('|')
}

// mergeGeometries requires every input to share the same attribute layout, so
// we fold the layout into the group key too and never feed it a mismatch.
function attrSignature(geo) {
  const names = Object.keys(geo.attributes).sort()
  return (geo.index ? 'i:' : 'n:') + names.map(n => `${n}${geo.attributes[n].itemSize}`).join(',')
}

/**
 * Merge all static meshes under `root` by material into a new Group whose
 * children each carry one merged geometry (one draw call per material/texture).
 *
 * Pure: leaves `root` untouched (clones geometries), reuses the surviving
 * materials/textures, and bakes each source mesh's world transform into its
 * vertices so the result renders at identity. The caller adds the returned
 * Group to the scene and disposes the original per-mesh geometries.
 *
 * @param {import('three').Object3D} root
 * @returns {import('three').Group}
 */
export function mergeStaticMeshes(root) {
  root.updateMatrixWorld(true)

  const groups = new Map() // key -> { material, geometries: [] , multi?: bool }
  const order = []         // deterministic output order

  root.traverse(obj => {
    if (!obj.isMesh || !obj.geometry) return

    // GLTFLoader emits one mesh per primitive (single material), but guard the
    // material-array case anyway: pass it through world-baked, unmerged.
    if (Array.isArray(obj.material)) {
      const key = `multi:${order.length}`
      const geo = obj.geometry.clone().applyMatrix4(obj.matrixWorld)
      groups.set(key, { material: obj.material, geometries: [geo], multi: true })
      order.push(key)
      return
    }

    const geo = obj.geometry.clone()
    geo.deleteAttribute('normal') // unlit: normals are unused; dropping them merges more
    geo.applyMatrix4(obj.matrixWorld)

    const key = `${materialKey(obj.material)}#${attrSignature(geo)}`
    let g = groups.get(key)
    if (!g) {
      g = { material: obj.material, geometries: [] }
      groups.set(key, g)
      order.push(key)
    }
    g.geometries.push(geo)
  })

  const out = new THREE.Group()

  for (const key of order) {
    const g = groups.get(key)

    if (g.multi || g.geometries.length === 1) {
      out.add(new THREE.Mesh(g.geometries[0], g.material))
      continue
    }

    const merged = mergeGeometries(g.geometries, false)
    if (merged) {
      g.geometries.forEach(c => c.dispose()) // throwaway input clones
      out.add(new THREE.Mesh(merged, g.material))
    } else {
      // Incompatible layout (should not happen given the key) — keep each
      // mesh world-baked rather than dropping geometry.
      for (const c of g.geometries) out.add(new THREE.Mesh(c, g.material))
    }
  }

  return out
}
