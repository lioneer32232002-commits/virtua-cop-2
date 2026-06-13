import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { CharacterFactory, TYPE_TO_RIG, RUN_MOTION, WALK_MOTION } from '../src/character/CharacterFactory.js'
import { ROT_CHANNELS } from '../src/character/MotionData.js'

// A pack scene whose model_N nodes are boxes with their joint at the origin
// extending along -x (the original part convention), distinct lengths so the
// assembler's geometry-derived offsets are observable.
function makePack(modelIds) {
  const scene = new THREE.Group()
  modelIds.forEach((id, i) => {
    const len = 0.2 + i * 0.03
    const geo = new THREE.BoxGeometry(len, 0.12, 0.12)
    geo.translate(-len / 2, 0, 0)
    const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial())
    m.name = `model_${id}`
    scene.add(m)
  })
  return scene
}

// 15 slot-ordered models present in the pack.
const MODELS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24]
function makeChar() {
  return { index: 0, parts: MODELS.map(model => ({ model, stage: false })) }
}
function makeMotions(frames = 2) {
  return [{ frames, root: new Float32Array(frames * 3), rot: new Int16Array(frames * ROT_CHANNELS) }]
}

function makeFactory(overrides = {}) {
  return new CharacterFactory({
    characters: [makeChar()],
    motions: makeMotions(),
    packs: { common: makePack(MODELS) },
    typeToRig: { grunt: 0 },
    pose: { motion: 0, frame: 0 },   // synthetic pack has one motion; don't couple to DEFAULT_POSE
    ...overrides,
  })
}

describe('CharacterFactory', () => {
  it('exposes a placeholder enemy-type → rig map for every enemy type', () => {
    for (const t of ['grunt', 'gunman', 'heavy', 'boss', 'innocent']) {
      expect(typeof TYPE_TO_RIG[t]).toBe('number')
    }
  })

  it('builds a wrapper Group holding the assembled real-part character', () => {
    const g = makeFactory().build('grunt')
    expect(g).toBeInstanceOf(THREE.Group)
    // wrapper → grounded group → assembler root (a "character"-named group)
    const character = g.getObjectByName('character')
    expect(character).toBeTruthy()
    // built from cloned pack parts (boxes), so it has mesh geometry
    let meshes = 0
    g.traverse(o => { if (o.isMesh) meshes++ })
    expect(meshes).toBe(MODELS.length)
  })

  it('grounds the character so its lowest point rests at the wrapper origin', () => {
    const g = makeFactory().build('grunt')
    g.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(g)
    expect(box.min.y).toBeCloseTo(0, 2)
  })

  it('is billboard-ready: rotating the wrapper yaw does not throw', () => {
    const g = makeFactory().build('grunt')
    expect(() => { g.rotation.y = 1.2; g.updateMatrixWorld(true) }).not.toThrow()
  })

  it('preserves head/hand/body hit zones on the parts (lock-on zone wiring)', () => {
    const g = makeFactory().build('grunt')
    const zones = new Set()
    g.traverse(o => { if (o.userData?.zone) zones.add(o.userData.zone) })
    expect(zones.has('head')).toBe(true)
    expect(zones.has('hand')).toBe(true)
    expect(zones.has('body')).toBe(true)
  })

  it('returns null for an unmapped enemy type (caller falls back)', () => {
    expect(makeFactory().build('mystery')).toBeNull()
  })

  it('returns null when the rig parts are missing from the pack', () => {
    const f = makeFactory({ packs: { common: makePack([999]) } })
    expect(f.build('grunt')).toBeNull()
  })

  it('returns null when motion data is absent (assets gitignored)', () => {
    const f = new CharacterFactory({ characters: [makeChar()], motions: null, packs: { common: makePack(MODELS) }, typeToRig: { grunt: 0 } })
    // still builds geometry; pose is simply skipped when there is no motion
    const g = f.build('grunt')
    expect(g).toBeInstanceOf(THREE.Group)
  })
})

describe('CharacterFactory locomotion', () => {
  // enough motions to index RUN/WALK (117/134)
  function makeLocoFactory() {
    const motions = Array.from({ length: WALK_MOTION + 1 }, () => makeMotions(2)[0])
    return new CharacterFactory({ characters: [makeChar()], motions, packs: { common: makePack(MODELS) }, typeToRig: { grunt: 0 }, pose: { motion: 0, frame: 0 } })
  }

  it('starts a looping run/walk player bound to the character assembler', () => {
    const f = makeLocoFactory()
    const wrapper = f.build('grunt')
    const run = f.playLocomotion(wrapper, 'run')
    expect(run.motion).toBe(f.motions[RUN_MOTION])
    expect(run.loop).toBe(true)
    expect(run.assembler).toBe(wrapper.userData.assembler)
    expect(wrapper.userData.assembler.anchorRoot).toBe(true)  // plays in place
    const walk = f.playLocomotion(wrapper, 'walk')
    expect(walk.motion).toBe(f.motions[WALK_MOTION])
  })

  it('returns null when the mesh has no assembler (procedural fallback)', () => {
    const f = makeLocoFactory()
    expect(f.playLocomotion(new THREE.Group(), 'run')).toBeNull()
    expect(f.playLocomotion(null, 'walk')).toBeNull()
  })
})
