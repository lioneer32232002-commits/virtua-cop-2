import * as THREE from 'three'
import { INT16_TO_RAD, ROT_CHANNELS } from './MotionData.js'

// Part slots within a character's parts list (RE'd from ppj2dd.exe, see
// ROADMAP H-1 #5). Parts follow the original modelling convention: joint at
// the origin, geometry extending along local -x; left/right pairs mirror in z.
export const SLOT_NAMES = [
  'torso', 'head',
  'upperArmA', 'forearmA', 'handA',
  'upperArmB', 'forearmB', 'handB',
  'hips',
  'thighA', 'shinA', 'footA',
  'thighB', 'shinB', 'footB',
]

// 40 rotation channels = 13 animated bones × 3 euler angles + 1 pad.
// Working assumption (H-2): bone order = slot order minus the rigid hands.
export const ANIMATED_SLOTS = [0, 1, 2, 3, 5, 6, 8, 9, 10, 11, 12, 13, 14]

// Knob for the visual-iteration pass: euler application order.
export const EULER_ORDER = 'XYZ'

// How each joint attaches to its parent — the other H-2 iteration knobs.
// 'end' places the joint at the distal (-x) end of the parent's part;
// 'origin' keeps it at the parent joint. z mirrors A/+ vs B/- attachments
// using the parent part's half-width.
const ATTACH = [
  /* 0 torso    */ { parent: 8, at: 'end' },
  /* 1 head     */ { parent: 0, at: 'end' },
  /* 2 upArmA   */ { parent: 0, at: 'end', z: +1 },
  /* 3 forearmA */ { parent: 2, at: 'end' },
  /* 4 handA    */ { parent: 3, at: 'end' },
  /* 5 upArmB   */ { parent: 0, at: 'end', z: -1 },
  /* 6 forearmB */ { parent: 5, at: 'end' },
  /* 7 handB    */ { parent: 6, at: 'end' },
  /* 8 hips     */ { parent: -1 },
  /* 9 thighA   */ { parent: 8, at: 'origin', z: +1 },
  /* 10 shinA   */ { parent: 9, at: 'end' },
  /* 11 footA   */ { parent: 10, at: 'end' },
  /* 12 thighB  */ { parent: 8, at: 'origin', z: -1 },
  /* 13 shinB   */ { parent: 12, at: 'end' },
  /* 14 footB   */ { parent: 13, at: 'end' },
]

// Build order guaranteeing every joint's parent joint exists first.
const BUILD_ORDER = [8, 0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14]

function zoneOf(slot) {
  if (slot === 1) return 'head'
  if (slot === 4 || slot === 7) return 'hand'
  return 'body'
}

/**
 * Assembles one original-game character from its parts list: builds the
 * 13-bone joint hierarchy, derives joint offsets from part geometry, and
 * applies motion frames. Bind offsets are not stored in the game data
 * (ROADMAP H-1 #6) — they are derived here and tuned visually.
 */
export class CharacterAssembler {
  /** @type {THREE.Group} */
  root
  /** @type {THREE.Group[]} sparse, indexed by slot */
  bones = []

  /**
   * @param {THREE.Object3D[]} parts slot-ordered (15 full / 10 upper-body),
   *   each modelled with its joint at the origin extending along -x.
   */
  constructor(parts) {
    this.root = new THREE.Group()
    this.root.name = 'character'
    const bbox = parts.map(p => (p ? new THREE.Box3().setFromObject(p) : null))

    for (const slot of BUILD_ORDER) {
      if (slot >= parts.length || !parts[slot]) continue
      const rule = ATTACH[slot]
      const bone = new THREE.Group()
      bone.name = `joint_${SLOT_NAMES[slot]}`

      const parentBone = rule.parent >= 0 ? this.bones[rule.parent] : this.root
      if (!parentBone) continue
      if (rule.parent >= 0) {
        const pb = bbox[rule.parent]
        if (rule.at === 'end') bone.position.x = pb.min.x
        if (rule.z) bone.position.z = rule.z * pb.max.z
      }
      parentBone.add(bone)

      const part = parts[slot]
      const zone = zoneOf(slot)
      part.traverse(o => { if (o.isMesh) o.userData.zone = zone })
      if (part.isMesh) part.userData.zone = zone
      bone.add(part)
      this.bones[slot] = bone
    }
  }

  /**
   * Pose the skeleton at one motion frame.
   * @param {{ frames: number, root: Float32Array, rot: Int16Array }} motion
   * @param {number} f frame index
   */
  applyFrame(motion, f) {
    this.root.position.set(motion.root[f * 3], motion.root[f * 3 + 1], motion.root[f * 3 + 2])
    const base = f * ROT_CHANNELS
    ANIMATED_SLOTS.forEach((slot, i) => {
      const bone = this.bones[slot]
      if (!bone) return
      bone.rotation.set(
        motion.rot[base + i * 3] * INT16_TO_RAD,
        motion.rot[base + i * 3 + 1] * INT16_TO_RAD,
        motion.rot[base + i * 3 + 2] * INT16_TO_RAD,
        EULER_ORDER,
      )
    })
  }
}

/**
 * Clone a character's parts out of the loaded model packs, slot-ordered.
 * @param {{ parts: { model: number, stage: boolean }[] }} characterDef
 * @param {{ common: THREE.Object3D, stage?: THREE.Object3D }} packs
 * @returns {(THREE.Object3D|null)[]}
 */
export function collectParts(characterDef, packs) {
  return characterDef.parts.map(({ model, stage }) => {
    const pack = stage ? packs.stage : packs.common
    const node = pack?.getObjectByName(`model_${model}`)
    if (!node) {
      console.warn(`CharacterAssembler: model_${model} not found in ${stage ? 'stage' : 'common'} pack`)
      return null
    }
    return node.clone(true)
  })
}
