import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { materialKey, mergeStaticMeshes } from '../src/render/mergeStatic.js'

// A minimal textured triangle so vertex counts are exact and predictable.
function tri() {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(
    new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), 3))
  g.setAttribute('normal', new THREE.BufferAttribute(
    new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3))
  g.setAttribute('uv', new THREE.BufferAttribute(
    new Float32Array([0, 0, 1, 0, 0, 1]), 2))
  return g
}

function texMat(texture) {
  return new THREE.MeshBasicMaterial({ map: texture })
}

function meshAt(geo, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat)
  m.position.set(x, y, z)
  return m
}

describe('materialKey', () => {
  it('two materials sharing a texture get the same key', () => {
    const tex = new THREE.Texture()
    expect(materialKey(texMat(tex))).toBe(materialKey(texMat(tex)))
  })

  it('different textures get different keys', () => {
    expect(materialKey(texMat(new THREE.Texture())))
      .not.toBe(materialKey(texMat(new THREE.Texture())))
  })

  it('transparency separates otherwise-identical materials', () => {
    const tex = new THREE.Texture()
    const opaque = new THREE.MeshBasicMaterial({ map: tex })
    const trans = new THREE.MeshBasicMaterial({ map: tex, transparent: true })
    expect(materialKey(opaque)).not.toBe(materialKey(trans))
  })
})

describe('mergeStaticMeshes', () => {
  it('collapses meshes to one child per texture', () => {
    const texA = new THREE.Texture()
    const texB = new THREE.Texture()
    const matA = texMat(texA)
    const matB = texMat(texB)
    const root = new THREE.Group()
    root.add(meshAt(tri(), matA), meshAt(tri(), matA), meshAt(tri(), matA))
    root.add(meshAt(tri(), matB), meshAt(tri(), matB))

    const merged = mergeStaticMeshes(root)

    // 5 source meshes / 2 textures -> 2 draw calls
    expect(merged.children).toHaveLength(2)
    expect(merged.children.length).toBeLessThan(5)
  })

  it('merged geometry holds the summed vertices of its group', () => {
    const tex = new THREE.Texture()
    const mat = texMat(tex)
    const root = new THREE.Group()
    root.add(meshAt(tri(), mat), meshAt(tri(), mat), meshAt(tri(), mat))

    const merged = mergeStaticMeshes(root)
    const geo = merged.children[0].geometry
    // 3 triangles x 3 verts each
    expect(geo.attributes.position.count).toBe(9)
  })

  it('bakes each source world transform into the merged vertices', () => {
    const tex = new THREE.Texture()
    const mat = texMat(tex)
    const root = new THREE.Group()
    root.add(meshAt(tri(), mat, 0, 0, 0))
    root.add(meshAt(tri(), mat, 10, 0, 0)) // translated +10 on x

    const merged = mergeStaticMeshes(root)
    const pos = merged.children[0].geometry.attributes.position
    let maxX = -Infinity
    for (let i = 0; i < pos.count; i++) maxX = Math.max(maxX, pos.getX(i))
    // a vertex from the translated triangle must land near x=10..11, not 0..1
    expect(maxX).toBeGreaterThanOrEqual(10)
  })

  it('respects a parent group transform when baking', () => {
    const tex = new THREE.Texture()
    const mat = texMat(tex)
    const root = new THREE.Group()
    const inner = new THREE.Group()
    inner.position.set(0, 5, 0)
    inner.add(meshAt(tri(), mat))
    root.add(inner)

    const merged = mergeStaticMeshes(root)
    const pos = merged.children[0].geometry.attributes.position
    let maxY = -Infinity
    for (let i = 0; i < pos.count; i++) maxY = Math.max(maxY, pos.getY(i))
    expect(maxY).toBeGreaterThanOrEqual(5)
  })

  it('reuses the original material/texture on the merged mesh', () => {
    const tex = new THREE.Texture()
    const mat = texMat(tex)
    const root = new THREE.Group()
    root.add(meshAt(tri(), mat), meshAt(tri(), mat))

    const merged = mergeStaticMeshes(root)
    expect(merged.children[0].material.map).toBe(tex)
  })

  it('drops normals (unlit needs none, so buffers shrink)', () => {
    const tex = new THREE.Texture()
    const mat = texMat(tex)
    const root = new THREE.Group()
    root.add(meshAt(tri(), mat), meshAt(tri(), mat))

    const merged = mergeStaticMeshes(root)
    expect(merged.children[0].geometry.attributes.normal).toBeUndefined()
  })

  it('leaves the source root untouched', () => {
    const tex = new THREE.Texture()
    const mat = texMat(tex)
    const a = meshAt(tri(), mat)
    const root = new THREE.Group()
    root.add(a)

    mergeStaticMeshes(root)
    expect(root.children).toHaveLength(1)
    expect(a.geometry.attributes.position.count).toBe(3) // original intact
    expect(a.geometry.attributes.normal).toBeDefined()   // original keeps normals
  })

  it('consume mode reuses the source geometry (no clone, faster load)', () => {
    const mat = texMat(new THREE.Texture())
    const src = tri()
    const root = new THREE.Group()
    root.add(new THREE.Mesh(src, mat))

    const merged = mergeStaticMeshes(root, { consume: true })
    expect(merged.children[0].geometry).toBe(src) // same object, not a clone
    expect(src.attributes.normal).toBeUndefined() // mutated in place (normals dropped)
  })

  it('pure mode (default) leaves the source geometry a separate object', () => {
    const mat = texMat(new THREE.Texture())
    const src = tri()
    const root = new THREE.Group()
    root.add(new THREE.Mesh(src, mat))

    const merged = mergeStaticMeshes(root)
    expect(merged.children[0].geometry).not.toBe(src)
    expect(src.attributes.normal).toBeDefined()
  })

  it('consume mode still clones geometry shared by >1 mesh (no corruption)', () => {
    const mat = texMat(new THREE.Texture())
    const shared = tri()
    const a = new THREE.Mesh(shared, mat); a.position.set(0, 0, 0)
    const b = new THREE.Mesh(shared, mat); b.position.set(10, 0, 0)
    const root = new THREE.Group()
    root.add(a, b)

    const merged = mergeStaticMeshes(root, { consume: true })
    const pos = merged.children[0].geometry.attributes.position
    let minX = Infinity, maxX = -Infinity
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i); minX = Math.min(minX, x); maxX = Math.max(maxX, x) }
    expect(pos.count).toBe(6)               // both triangles survive
    expect(maxX).toBeGreaterThanOrEqual(10) // b's translated triangle
    expect(minX).toBeLessThan(5)            // a's triangle NOT dragged to +10
  })

  it('passes multi-material meshes through world-baked', () => {
    const tex = new THREE.Texture()
    const geo = tri()
    geo.addGroup(0, 3, 0)
    const mats = [texMat(tex)]
    const root = new THREE.Group()
    root.add(meshAt(geo, mats, 0, 7, 0))

    const merged = mergeStaticMeshes(root)
    expect(merged.children).toHaveLength(1)
    expect(Array.isArray(merged.children[0].material)).toBe(true)
    const pos = merged.children[0].geometry.attributes.position
    let maxY = -Infinity
    for (let i = 0; i < pos.count; i++) maxY = Math.max(maxY, pos.getY(i))
    expect(maxY).toBeGreaterThanOrEqual(7)
  })
})
