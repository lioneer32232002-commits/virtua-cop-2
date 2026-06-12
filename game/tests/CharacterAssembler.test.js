import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CharacterAssembler, collectParts, ANIMATED_SLOTS } from '../src/character/CharacterAssembler.js'
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
  it('builds a joint hierarchy: hips under root, torso chain, arm and leg chains', () => {
    const asm = new CharacterAssembler(makeParts())
    expect(asm.bones[8].parent).toBe(asm.root)            // hips = root joint
    expect(asm.bones[0].parent).toBe(asm.bones[8])        // torso on hips
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

  it('applyFrame sets root position and per-bone euler rotations from channels', () => {
    const asm = new CharacterAssembler(makeParts())
    const motion = makeMotion(2)
    motion.root.set([1, 2, 3], 1 * 3) // frame 1
    // frame 1: animated bone 0 (slot 0, torso) channels 0..2
    motion.rot[1 * ROT_CHANNELS + 0] = 8192   // 45°
    motion.rot[1 * ROT_CHANNELS + 1] = -16384 // -90°
    motion.rot[1 * ROT_CHANNELS + 2] = 0
    asm.applyFrame(motion, 1)
    expect(asm.root.position.toArray()).toEqual([1, 2, 3])
    const torso = asm.bones[ANIMATED_SLOTS[0]]
    expect(torso.rotation.x).toBeCloseTo(8192 * INT16_TO_RAD)
    expect(torso.rotation.y).toBeCloseTo(-16384 * INT16_TO_RAD)
    expect(torso.rotation.z).toBeCloseTo(0)
  })

  it('hands stay rigid: applyFrame leaves slots 4 and 7 unrotated', () => {
    const asm = new CharacterAssembler(makeParts())
    const motion = makeMotion(1)
    motion.rot.fill(1000)
    asm.applyFrame(motion, 0)
    expect(asm.bones[4].rotation.x).toBe(0)
    expect(asm.bones[7].rotation.x).toBe(0)
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
