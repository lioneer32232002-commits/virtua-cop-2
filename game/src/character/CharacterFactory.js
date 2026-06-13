import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { CharacterAssembler, collectParts } from './CharacterAssembler.js'
import { loadMotionData } from './MotionData.js'
import { toUnlit } from '../render/unlit.js'

// Enemy-type → character-table rig index (ROADMAP H-1: 47 rigs RE'd from
// ppj2dd.exe). The original game's exact type↔rig identity is unknown — like
// the SE manifest, these are PLACEHOLDERS to be verified against the real game
// (`?char=N` in viewer.html shows each rig). All chosen rigs use common-pack
// parts only (no stage-pack `S`-parts, which can render all-black — ROADMAP
// H-3 note), so they render correctly from P_COMMON alone.
export const TYPE_TO_RIG = {
  grunt: 8,     // common models 21-35
  gunman: 9,    // common models 83-194
  heavy: 0,     // common models 181-197
  boss: 30,     // "hero" rig, common models 0-14 (distinctive)
  innocent: 7,  // common models 122-134
}

// Static pose the standing enemy is frozen at (motion index + frame). Live
// per-enemy animation (MotionPlayer) is a follow-up cut — see ROADMAP H-3.
// The assembler is stashed on the wrapper (userData.assembler) so that cut can
// drive it without rebuilding. Motion 24 frame 0 is an upright combat stance
// (head up, arms at sides) — chosen visually in the viewer over the "getting-up"
// motion 0, whose frame 0 is a crouch. Tunable in preview.
export const DEFAULT_POSE = { motion: 24, frame: 0 }

// Yaw applied to the model inside the billboard wrapper so its front (chest)
// faces the wrapper's +z — the direction EnemyManager turns the wrapper to face
// the camera. The parts are modelled facing local +x, so a +90° turn maps the
// chest onto +z. Calibrated in the viewer (yaw 0 = the billboard view).
export const FACING_YAW = Math.PI / 2

/**
 * Builds animated original-game characters on demand from the loaded part packs
 * + motion data. Each build() produces a fresh, independent character (parts
 * are cloned), wrapped so EnemyManager can position / scale / billboard it
 * without fighting the motion-driven inner pose.
 */
export class CharacterFactory {
  /**
   * @param {{
   *   characters: { index: number, parts: { model: number, stage: boolean }[] }[],
   *   motions: { frames: number, root: Float32Array, rot: Int16Array }[]|null,
   *   packs: { common: THREE.Object3D, stage?: THREE.Object3D },
   *   typeToRig?: Record<string, number>,
   *   pose?: { motion: number, frame: number },
   * }} opts
   */
  constructor({ characters, motions, packs, typeToRig = TYPE_TO_RIG, pose = DEFAULT_POSE }) {
    this.characters = characters
    this.motions = motions
    this.packs = packs
    this.typeToRig = typeToRig
    this.pose = pose
  }

  /**
   * Assemble one character for an enemy type.
   * @param {string} type
   * @returns {THREE.Group|null} a billboard-ready wrapper, or null when the
   *   type is unmapped or its parts are missing (caller falls back).
   */
  build(type) {
    const rig = this.typeToRig[type]
    if (rig == null) return null
    const def = this.characters?.[rig]
    if (!def) return null

    const parts = collectParts(def, this.packs)
    if (!parts.some(Boolean)) return null

    const asm = new CharacterAssembler(parts)
    const motion = this.motions?.[this.pose.motion]
    if (motion) asm.applyFrame(motion, Math.min(this.pose.frame, motion.frames - 1))

    // Outer wrapper: EnemyManager sets world position / scale / billboard yaw.
    // Inner "grounded" group: lifts the posed character so its feet rest at the
    // wrapper origin (street level) and applies the facing offset. The motion
    // also writes asm.root.position/rotation, so keeping these on a separate
    // parent leaves the animation untouched.
    const wrapper = new THREE.Group()
    wrapper.name = `char_${type}`
    const grounded = new THREE.Group()
    grounded.rotation.y = FACING_YAW
    grounded.add(asm.root)

    asm.root.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(asm.root)
    if (Number.isFinite(box.min.y)) grounded.position.y = -box.min.y

    wrapper.add(grounded)
    wrapper.userData.assembler = asm
    return wrapper
  }
}

/**
 * Load the common part pack (P_COMMON.glb) + motion data and build a factory.
 * Returns null when the gitignored motion assets are missing, so callers fall
 * back to the procedural humanoids.
 * @param {string} [stageId]
 * @returns {Promise<CharacterFactory|null>}
 */
export async function loadCharacterFactory(stageId = 'stage1') {
  const [data, common] = await Promise.all([
    loadMotionData(),
    new Promise((resolve, reject) =>
      new GLTFLoader().load(`/assets/${stageId}/P_COMMON.glb`, g => resolve(g.scene), undefined, reject))
      .catch(() => null),
  ])
  if (!data || !common) return null
  toUnlit(common)
  return new CharacterFactory({ characters: data.characters, motions: data.motions, packs: { common } })
}
