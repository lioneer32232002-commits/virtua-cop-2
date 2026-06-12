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

// 40 rotation channels = 16 joints (H-2 data analysis, supersedes the H-1
// "13 bones × 3 + pad" guess — ch39 is fully animated, not padding):
//   [root orientation ×3][torso ×3][head ×3]
//   [upper arm A ×3][elbow A ×1][hand A ×3]
//   [upper arm B ×3][elbow B ×1][hand B ×3]
//   [pelvis ×3][thigh A ×3][knee A ×1][foot A ×3][thigh B ×3][knee B ×1][foot B ×3]
// Evidence: ch12/ch19 are ≥0 over all 3732 frames and ch29/ch36 are ≤0 —
// exactly four one-sided hinge channels = two elbows + two knees; the
// remaining 12 ball joints minus the virtual root = 15 = the part count.
// ch23/ch25 sit at a structural -90° (pelvis frame conversion).
export const CHANNEL_MAP = [
  { ch: 0, len: 3, slot: -1 }, // whole-body orientation → root group
  { ch: 3, len: 3, slot: 0 },  // torso
  { ch: 6, len: 3, slot: 1 },  // head
  { ch: 9, len: 3, slot: 2 },  // upper arm A
  { ch: 12, len: 1, slot: 3 }, // elbow A (hinge, ≥0)
  { ch: 13, len: 3, slot: 4 }, // hand A (wrist)
  { ch: 16, len: 3, slot: 5 }, // upper arm B
  { ch: 19, len: 1, slot: 6 }, // elbow B (hinge, ≥0)
  { ch: 20, len: 3, slot: 7 }, // hand B
  { ch: 23, len: 3, slot: 8 }, // pelvis
  { ch: 26, len: 3, slot: 9 }, // thigh A
  { ch: 29, len: 1, slot: 10 }, // knee A (hinge, ≤0)
  { ch: 30, len: 3, slot: 11 }, // foot A
  { ch: 33, len: 3, slot: 12 }, // thigh B
  { ch: 36, len: 1, slot: 13 }, // knee B (hinge, ≤0)
  { ch: 37, len: 3, slot: 14 }, // foot B
]

// Channel-interpretation convention. Defaults come from the stance-foot-slide
// search (tools/extract-stage-assets/search-conventions.mjs): channels are
// stored (z, y, x) with y/z flipped, euler applied ZYX, hinges about -z.
const DEFAULT_CONVENTION = {
  order: 'ZYX',
  perm: [2, 1, 0],   // euler.x = raw[perm[0]], etc.
  sign: [1, -1, -1],
  hingeAxis: 'z',
  hingeSign: -1,
}
let convention = { ...DEFAULT_CONVENTION }

/** Override the channel convention (visual-iteration knob). null → defaults. */
export function setConvention(c) {
  convention = c ? { ...DEFAULT_CONVENTION, ...c } : { ...DEFAULT_CONVENTION }
}
export function getConvention() {
  return { ...convention }
}

// How each joint attaches to its parent — the other H-2 iteration knobs.
// 'end' places the joint at the distal (-x) end of the parent's part;
// 'origin' keeps it at the parent joint. z mirrors A/+ vs B/- attachments
// using the parent part's half-width.
const ATTACH = [
  // torso hangs off the root, NOT the pelvis: the pelvis block (ch23-25)
  // carries a structural -90° that flips leg space downward — it only
  // parents the legs (H-2 visual iteration finding).
  /* 0 torso    */ { parent: -1 },
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

// Both the torso and the pelvis sit at the root; this stays the H-2 knob for
// a possible vertical offset between them (none observed so far).

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
    const { order, perm, sign, hingeAxis, hingeSign } = convention
    for (const { ch, len, slot } of CHANNEL_MAP) {
      const bone = slot < 0 ? this.root : this.bones[slot]
      if (!bone) continue
      if (len === 1) {
        bone.rotation.set(0, 0, 0, order)
        bone.rotation[hingeAxis] = hingeSign * motion.rot[base + ch] * INT16_TO_RAD
      } else {
        bone.rotation.set(
          sign[0] * motion.rot[base + ch + perm[0]] * INT16_TO_RAD,
          sign[1] * motion.rot[base + ch + perm[1]] * INT16_TO_RAD,
          sign[2] * motion.rot[base + ch + perm[2]] * INT16_TO_RAD,
          order,
        )
      }
    }
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
