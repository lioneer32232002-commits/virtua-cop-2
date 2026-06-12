import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CharacterAssembler, collectParts, CHANNEL_MAP, setConvention } from '../src/character/CharacterAssembler.js'
import { INT16_TO_RAD, ROT_CHANNELS } from '../src/character/MotionData.js'

// Synthetic part following the original convention: joint at the origin,
// geometry extending along -x by `len`.
function makePart(len, halfWidth = 0.1) {
  const geo = new THREE.BoxGeometry(len, halfWidth * 2, halfWidth * 2)
  geo.translate(-len / 2, 0, 0)
  return new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
}

// 15 parts, slot order. Distinct lengths so bone derivation is observable.
const LEN = [0.4, 0.2, 0.25, 0.24, 0.1, 0.25, 0.24, 0.1, 0.3, 0.39, 0.45, 0.2, 0.39, 0.45, 0.2]
function makeParts() {
  return LEN.map(l => makePart(l))
}

function makeMotion(frames) {
  return {
    frames,
    root: new Float32Array(frames * 3),
    rot: new Int16Array(frames * ROT_CHANNELS),
  }
}

describe('CharacterAssembler', () => {
  it('builds a joint hierarchy: torso and pelvis under root, arm and leg chains', () => {
    const asm = new CharacterAssembler(makeParts())
    expect(asm.bones[8].parent).toBe(asm.root)            // pelvis (legs adapter)
    expect(asm.bones[0].parent).toBe(asm.root)            // torso directly on root
    expect(asm.bones[1].parent).toBe(asm.bones[0])        // head on torso
    expect(asm.bones[2].parent).toBe(asm.bones[0])        // shoulder A on torso
    expect(asm.bones[3].parent).toBe(asm.bones[2])        // forearm A
    expect(asm.bones[4].parent).toBe(asm.bones[3])        // hand A (rigid)
    expect(asm.bones[9].parent).toBe(asm.bones[8])        // thigh A on hips
    expect(asm.bones[10].parent).toBe(asm.bones[9])       // shin A
    expect(asm.bones[11].parent).toBe(asm.bones[10])      // foot A
  })

  it('derives chain joint offsets from parent part length along -x', () => {
    const asm = new CharacterAssembler(makeParts())
    expect(asm.bones[1].position.x).toBeCloseTo(-LEN[0])  // head at torso end
    expect(asm.bones[3].position.x).toBeCloseTo(-LEN[2])  // forearm at upper-arm end
    expect(asm.bones[10].position.x).toBeCloseTo(-LEN[9]) // shin at thigh end
  })

  it('mirrors arm A/B and leg A/B attachments across z', () => {
    const asm = new CharacterAssembler(makeParts())
    expect(asm.bones[2].position.z).toBeGreaterThan(0)
    expect(asm.bones[5].position.z).toBeCloseTo(-asm.bones[2].position.z)
    expect(asm.bones[9].position.z).toBeGreaterThan(0)
    expect(asm.bones[12].position.z).toBeCloseTo(-asm.bones[9].position.z)
  })

  it('tags hit zones: head, hands, body', () => {
    const asm = new CharacterAssembler(makeParts())
    expect(asm.bones[1].children[0].userData.zone).toBe('head')
    expect(asm.bones[4].children[0].userData.zone).toBe('hand')
    expect(asm.bones[7].children[0].userData.zone).toBe('hand')
    expect(asm.bones[0].children.find(c => c.isMesh).userData.zone).toBe('body')
  })

  it('exposes the 16-joint channel map: 40 channels, hinges at 12/19/29/36', () => {
    const used = CHANNEL_MAP.reduce((s, m) => s + m.len, 0)
    expect(used).toBe(ROT_CHANNELS)
    const hinges = CHANNEL_MAP.filter(m => m.len === 1).map(m => m.ch)
    expect(hinges).toEqual([12, 19, 29, 36]) // elbows ≥0, knees ≤0 in the data
    expect(CHANNEL_MAP.filter(m => m.len === 1).map(m => m.slot)).toEqual([3, 6, 10, 13])
  })

  it('applyFrame maps channels through the active convention', () => {
    setConvention({ order: 'XYZ', perm: [0, 1, 2], sign: [1, 1, 1], hingeAxis: 'y', hingeSign: 1 })
    try {
      const asm = new CharacterAssembler(makeParts())
      const motion = makeMotion(2)
      motion.root.set([1, 2, 3], 1 * 3) // frame 1
      const base = 1 * ROT_CHANNELS
      motion.rot[base + 1] = 16384  // root yaw 90°
      motion.rot[base + 3] = 8192   // torso (slot 0) first channel: 45°
      motion.rot[base + 13] = -8192 // hand A (slot 4) first channel: -45°
      asm.applyFrame(motion, 1)
      expect(asm.root.position.toArray()).toEqual([1, 2, 3])
      expect(asm.root.rotation.y).toBeCloseTo(16384 * INT16_TO_RAD)
      expect(asm.bones[0].rotation.x).toBeCloseTo(8192 * INT16_TO_RAD)
      expect(asm.bones[4].rotation.x).toBeCloseTo(-8192 * INT16_TO_RAD)
    } finally {
      setConvention(null) // restore defaults
    }
  })

  it('setConvention permutes and flips channel triples', () => {
    setConvention({ order: 'ZYX', perm: [2, 1, 0], sign: [1, -1, -1], hingeAxis: 'z', hingeSign: -1 })
    try {
      const asm = new CharacterAssembler(makeParts())
      const motion = makeMotion(1)
      motion.rot[3] = 1000  // torso raw channel 0
      motion.rot[4] = 2000  // raw channel 1
      motion.rot[5] = 3000  // raw channel 2
      motion.rot[12] = 16384 // elbow A 90°
      asm.applyFrame(motion, 0)
      const torso = asm.bones[0].rotation
      expect(torso.order).toBe('ZYX')
      expect(torso.x).toBeCloseTo(3000 * INT16_TO_RAD)   // perm: raw[2] → x
      expect(torso.y).toBeCloseTo(-2000 * INT16_TO_RAD)  // sign flip
      expect(torso.z).toBeCloseTo(-1000 * INT16_TO_RAD)
      expect(asm.bones[3].rotation.z).toBeCloseTo(-Math.PI / 2) // hinge -z
    } finally {
      setConvention(null)
    }
  })

  it('supports 10-part upper-body rigs (slots 0..7 plus partial lower body)', () => {
    const asm = new CharacterAssembler(makeParts().slice(0, 10))
    expect(asm.bones[0]).toBeDefined()
    expect(asm.bones[7]).toBeDefined()
    expect(asm.bones[14]).toBeUndefined()
    const motion = makeMotion(1)
    expect(() => asm.applyFrame(motion, 0)).not.toThrow()
  })
})

describe('collectParts', () => {
  it('clones model_N nodes from a pack scene in character slot order', () => {
    const scene = new THREE.Group()
    for (const id of [5, 7, 9]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
      m.name = `model_${id}`
      scene.add(m)
    }
    const def = { index: 0, parts: [{ model: 9, stage: false }, { model: 5, stage: false }] }
    const parts = collectParts(def, { common: scene })
    expect(parts).toHaveLength(2)
    expect(parts[0].name).toBe('model_9')
    expect(parts[1].name).toBe('model_5')
    expect(parts[0]).not.toBe(scene.children[2]) // cloned, not reparented
  })

  it('resolves stage-pack parts from the stage scene', () => {
    const common = new THREE.Group()
    const stage = new THREE.Group()
    const m = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial())
    m.name = 'model_3'
    stage.add(m)
    const def = { index: 0, parts: [{ model: 3, stage: true }] }
    const parts = collectParts(def, { common, stage })
    expect(parts[0].name).toBe('model_3')
  })
})
