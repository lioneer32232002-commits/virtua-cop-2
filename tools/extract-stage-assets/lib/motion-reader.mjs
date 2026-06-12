// Reader for Virtua Cop 2's MOT*.BIN skeletal motion data.
//
// The MOT files are headerless blobs; their directory lives in ppj2dd.exe
// (same pattern as the texture-pack metadata). Reverse-engineered 2026-06-12,
// verified byte-exact against MOTCMN.BIN — see ROADMAP.md H appendix.
//
// EXE-side structures (file offsets in ppj2dd.exe):
//   0x71268  file-load table: 20-byte entries [16B filename][u32 load address].
//            MOTCMN.BIN loads at 0x576000; all stage MOTs share 0x5d69d0;
//            P_COMMON.BIN at 0x6069d0; P_STGxC at 0x6569d0.
//   0x52d48  motion directory: 272 u32 pointers (VAs into MOTCMN's buffer)
//            = 136 motions × (rootPtr, rotPtr). 7 identical copies exist in
//            the EXE; this is the first.
//   0x8f298  character table: NULL-terminated lists of 16-byte-aligned
//            pointers to model headers — 15 parts per character, ~36 entries.
//            Pointers into P_COMMON (0x6069d0 + modelIndex*16) or the stage
//            pack (0x6569d0 + i*16, exposed as stage:true).
//
// Motion data layout (MOTCMN.BIN):
//   per motion: [root channel: F × Vec3 float32 (world-ish position)]
//               [rotation channel: F × 40 int16]
//   Σ F×92 bytes = exact file size (3732 frames over 136 motions).
//   40 int16 = 13 animated bones × 3 euler angles + 1 pad (the two hand
//   parts are rigid attachments). Angle convention assumed CAMMOV-style
//   (int16 full scale = ±180°) pending visual confirmation.
//
// Part slots (order within a character's 15-part list, classified by bbox):
//   0 torso, 1 head, 2-4 arm A (upper/fore/hand), 5-7 arm B,
//   8 hips, 9-11 leg A (thigh/shin/foot), 12-14 leg B.
//   Slots 4/7 (hands) are often shared models across characters (gun hand).

export const EXE_MOTION_TABLE = 0x52d48
export const EXE_CHAR_TABLE = 0x8f298
export const MOTCMN_BASE = 0x576000
export const P_COMMON_BASE = 0x6069d0
export const STAGE_PACK_BASE = 0x6569d0
export const MOTION_COUNT = 136
export const ROT_CHANNELS = 40
export const PARTS_PER_CHARACTER = 15
export const INT16_TO_RAD = Math.PI / 32768

/**
 * Read the motion directory from the EXE and validate the pair structure
 * against the MOT file size.
 * @param {Buffer} exeBuf  ppj2dd.exe
 * @param {number} motSize byte length of MOTCMN.BIN (validation)
 * @param {{ tableOffset?: number, base?: number, count?: number }} [opts]
 * @returns {{ index, rootOffset, rotOffset, frames }[]}
 */
export function readMotionDirectory(exeBuf, motSize, opts = {}) {
  const table = opts.tableOffset ?? EXE_MOTION_TABLE
  const base = opts.base ?? MOTCMN_BASE
  const count = opts.count ?? MOTION_COUNT
  const motions = []
  for (let m = 0; m < count; m++) {
    const rootOffset = exeBuf.readUInt32LE(table + (2 * m) * 4) - base
    const rotOffset = exeBuf.readUInt32LE(table + (2 * m + 1) * 4) - base
    const frames = (rotOffset - rootOffset) / 12
    const end = m < count - 1 ? exeBuf.readUInt32LE(table + (2 * m + 2) * 4) - base : motSize
    if (!Number.isInteger(frames) || frames <= 0 || rotOffset + frames * (ROT_CHANNELS * 2) !== end) {
      throw new Error(`motion ${m}: directory does not match F*12 + F*80 layout`)
    }
    motions.push({ index: m, rootOffset, rotOffset, frames })
  }
  return motions
}

/**
 * Read one motion's frames from a MOT buffer.
 * @param {Buffer} motBuf
 * @param {{ rootOffset, rotOffset, frames }} entry from readMotionDirectory
 * @returns {{ root: {x,y,z}[], rot: Int16Array[] }} per-frame root positions and
 *   40 raw int16 rotation channels (multiply by INT16_TO_RAD for radians).
 */
export function readMotion(motBuf, entry) {
  const root = []
  const rot = []
  for (let f = 0; f < entry.frames; f++) {
    const ro = entry.rootOffset + f * 12
    root.push({
      x: motBuf.readFloatLE(ro),
      y: motBuf.readFloatLE(ro + 4),
      z: motBuf.readFloatLE(ro + 8),
    })
    const ch = new Int16Array(ROT_CHANNELS)
    for (let c = 0; c < ROT_CHANNELS; c++) {
      ch[c] = motBuf.readInt16LE(entry.rotOffset + f * ROT_CHANNELS * 2 + c * 2)
    }
    rot.push(ch)
  }
  return { root, rot }
}

export const UPPER_BODY_PARTS = 10 // torso/head/arms only — window & cover poppers

/**
 * Read the character → parts table from the EXE: NULL-terminated lists of
 * model-header pointers. 42 of the 43 lists are 15-part full humanoids; one
 * list in the shipped EXE is 25 long — a 10-part upper-body rig fused with the
 * next full rig by a missing NULL — and is split here.
 * @param {Buffer} exeBuf
 * @param {{ tableOffset?: number, maxChars?: number }} [opts]
 * @returns {{ index: number, parts: { model: number, stage: boolean }[] }[]}
 *   model = index into P_COMMON (stage:false) or the loaded stage pack
 *   (stage:true). parts.length is 15 (full) or 10 (upper-body rig).
 */
export function readCharacterTable(exeBuf, opts = {}) {
  const table = opts.tableOffset ?? EXE_CHAR_TABLE
  const maxChars = opts.maxChars ?? 64
  const rigs = []
  let off = table
  while (rigs.length < maxChars) {
    const parts = []
    while (true) {
      const v = exeBuf.readUInt32LE(off)
      off += 4
      if (v === 0) break // NULL terminator
      let model, stage
      if (v >= STAGE_PACK_BASE && (v - STAGE_PACK_BASE) % 16 === 0 && (v - STAGE_PACK_BASE) / 16 < 4096) {
        model = (v - STAGE_PACK_BASE) / 16
        stage = true
      } else if (v >= P_COMMON_BASE && (v - P_COMMON_BASE) % 16 === 0) {
        model = (v - P_COMMON_BASE) / 16
        stage = false
      } else {
        return rigs.map((parts, index) => ({ index, parts })) // past the table
      }
      parts.push({ model, stage })
      if (parts.length > PARTS_PER_CHARACTER + UPPER_BODY_PARTS) {
        return rigs.map((parts, index) => ({ index, parts })) // malformed
      }
    }
    if (parts.length === 0) break // double NULL: end of table
    if (parts.length === PARTS_PER_CHARACTER + UPPER_BODY_PARTS) {
      // fused [upper 10][full 15] pair missing its separator
      rigs.push(parts.slice(0, UPPER_BODY_PARTS), parts.slice(UPPER_BODY_PARTS))
    } else {
      rigs.push(parts)
    }
  }
  return rigs.map((parts, index) => ({ index, parts }))
}
