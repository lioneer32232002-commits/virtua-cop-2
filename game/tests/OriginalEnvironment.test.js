import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { buildOriginalEnvironment, DOWNTOWN_PRESET } from '../src/scene/OriginalEnvironment.js'

describe('buildOriginalEnvironment', () => {
  it('returns a Group containing a named ground mesh', () => {
    const root = buildOriginalEnvironment()
    expect(root.isGroup).toBe(true)
    const ground = root.getObjectByName('ground')
    expect(ground).toBeTruthy()
    expect(ground.isMesh).toBe(true)
  })

  it('is groundable: a downward ray over the street hits y ≈ 0', () => {
    const root = buildOriginalEnvironment()
    root.updateMatrixWorld(true)
    // Cast straight down at a mid-street point an enemy would spawn on.
    const ray = new THREE.Raycaster(
      new THREE.Vector3(0, 11.5, -40), new THREE.Vector3(0, -1, 0), 0, 200)
    const hits = ray.intersectObject(root, true)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].point.y).toBeCloseTo(0, 3)
  })

  it('places buildings on both sides of the street', () => {
    const root = buildOriginalEnvironment()
    let left = false, right = false
    root.traverse(o => {
      if (!o.isMesh || o.geometry?.type !== 'BoxGeometry') return
      if (o.position.x < -DOWNTOWN_PRESET.streetHalf) left = true
      if (o.position.x >  DOWNTOWN_PRESET.streetHalf) right = true
    })
    expect(left).toBe(true)
    expect(right).toBe(true)
  })

  it('is deterministic for a given seed', () => {
    const a = buildOriginalEnvironment({ seed: 42 })
    const b = buildOriginalEnvironment({ seed: 42 })
    const boxXs = root => {
      const xs = []
      root.traverse(o => { if (o.isMesh && o.geometry?.type === 'BoxGeometry') xs.push(o.position.x) })
      return xs
    }
    expect(boxXs(a)).toEqual(boxXs(b))
  })

  it('different seeds produce different layouts', () => {
    const firstBoxX = seed => {
      const root = buildOriginalEnvironment({ seed })
      let x = null
      root.traverse(o => { if (x === null && o.isMesh && o.geometry?.type === 'BoxGeometry') x = o.position.x })
      return x
    }
    expect(firstBoxX(1)).not.toBe(firstBoxX(99999))
  })
})
