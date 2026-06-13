import * as THREE from 'three'

// Original VC2 shading is baked into the textures, so GLTFLoader's PBR
// (MeshStandardMaterial) lighting would double-darken them. Swap every
// standard material for an unlit MeshBasicMaterial that renders the texture
// exactly as authored. Shared by StageEnvironment, the character parts loader,
// and the H-2 viewer (ROADMAP A note: "材質走 unlit，抽共用函式").
/**
 * Convert every MeshStandardMaterial under `root` to an equivalent unlit
 * MeshBasicMaterial, in place. The original material is disposed.
 * @param {import('three').Object3D} root
 * @returns {import('three').Object3D} the same root, for chaining
 */
export function toUnlit(root) {
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
  return root
}
