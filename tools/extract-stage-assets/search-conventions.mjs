#!/usr/bin/env node
// H-2 convention search: brute-force (euler order × channel→axis permutation ×
// sign flips × hinge axis) against anatomical plausibility, scored over many
// frames. Narrows the visual iteration to the top few candidates.
//
// Usage: node search-conventions.mjs  (expects extracted assets in game/public)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { decodeMotionPack } from './lib/motion-pack.mjs'

const here = dirnameOf(import.meta.url)
function dirnameOf(u) { return path.dirname(fileURLToPath(u)) }
const three = await import(
  'file://' + path.join(here, '..', '..', 'game', 'node_modules', 'three', 'build', 'three.module.js')
)
const { Euler, Quaternion, Vector3, Matrix4 } = three

const motions = decodeMotionPack(
  fs.readFileSync(path.join(here, '..', '..', 'game', 'public', 'assets', 'common', 'motions.bin'))
)
const INT16_TO_RAD = Math.PI / 32768

// char-30 part lengths along -x / half widths (from P_COMMON bbox dump)
const LEN = { torso: 0.39, head: 0.13, upArm: 0.23, fore: 0.20, hand: 0.16, hips: 0.25, thigh: 0.38, shin: 0.44, foot: 0.20 }
const TORSO_HALF_Z = 0.20
const HIPS_HALF_Z = 0.15

// joints: [name, parentIdx, localOffset, channelStart, channelLen]
// offsets follow the assembler's ATTACH rules (joint at parent part's -x end,
// shoulders/thighs mirrored in z)
const J = [
  ['root', -1, [0, 0, 0], 0, 3],
  ['pelvis', 0, [0, 0, 0], 23, 3],
  ['torso', 1, [-LEN.hips, 0, 0], 3, 3],
  ['head', 2, [-LEN.torso, 0, 0], 6, 3],
  ['upArmA', 2, [-LEN.torso, 0, TORSO_HALF_Z], 9, 3],
  ['elbowA', 4, [-LEN.upArm, 0, 0], 12, 1],
  ['handA', 5, [-LEN.fore, 0, 0], 13, 3],
  ['upArmB', 2, [-LEN.torso, 0, -TORSO_HALF_Z], 16, 3],
  ['elbowB', 7, [-LEN.upArm, 0, 0], 19, 1],
  ['handB', 8, [-LEN.fore, 0, 0], 20, 3],
  ['thighA', 1, [0, 0, HIPS_HALF_Z], 26, 3],
  ['kneeA', 10, [-LEN.thigh, 0, 0], 29, 1],
  ['footA', 11, [-LEN.shin, 0, 0], 30, 3],
  ['thighB', 1, [0, 0, -HIPS_HALF_Z], 33, 3],
  ['kneeB', 13, [-LEN.thigh, 0, 0], 36, 1],
  ['footB', 14, [-LEN.shin, 0, 0], 37, 3],
]
// distal tips beyond the last joint (for ground/extent checks)
const TIPS = [
  ['headTip', 3, [-LEN.head, 0, 0]],
  ['toeA', 12, [-LEN.foot, 0, 0]],
  ['toeB', 15, [-LEN.foot, 0, 0]],
]

const ORDERS = ['XYZ', 'XZY', 'YXZ', 'YZX', 'ZXY', 'ZYX']
const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]]
const SIGNS = []
for (const sx of [1, -1]) for (const sy of [1, -1]) for (const sz of [1, -1]) SIGNS.push([sx, sy, sz])
const HINGES = [['x', 1], ['x', -1], ['y', 1], ['y', -1], ['z', 1], ['z', -1]]

const HEAD_TIP = 0, TOE_A = 1, TOE_B = 2

// world positions of the joints + tips for one frame, in WORLD space
// (root channel position included so locomotion is part of the chain)
function poseWorld(m, f, order, perm, sign, hingeAxis, hingeSign) {
  const ch40 = m.rot[f]
  const world = []
  const q = new Quaternion()
  const e = new Euler()
  const mat = []
  for (let j = 0; j < J.length; j++) {
    const [, parent, off, ch, len] = J[j]
    if (len === 3) {
      const raw = [ch40[ch], ch40[ch + 1], ch40[ch + 2]]
      e.set(
        sign[0] * raw[perm[0]] * INT16_TO_RAD,
        sign[1] * raw[perm[1]] * INT16_TO_RAD,
        sign[2] * raw[perm[2]] * INT16_TO_RAD,
        order,
      )
    } else {
      e.set(0, 0, 0, order)
      e[hingeAxis] = hingeSign * ch40[ch] * INT16_TO_RAD
    }
    q.setFromEuler(e)
    const pos = j === 0 ? new Vector3(m.root[f].x, m.root[f].y, m.root[f].z) : new Vector3(...off)
    const local = new Matrix4().compose(pos, q, new Vector3(1, 1, 1))
    mat[j] = parent < 0 ? local : new Matrix4().multiplyMatrices(mat[parent], local)
    world[j] = new Vector3().setFromMatrixPosition(mat[j])
  }
  const tips = TIPS.map(([, parent, off]) => new Vector3(...off).applyMatrix4(mat[parent]))
  return { world, tips }
}

const jIdx = Object.fromEntries(J.map((j, i) => [j[0], i]))

// Score (lower = better):
//  1. stance-foot slide: during locomotion one foot is planted — under the
//     correct convention min(|Δtoe|) across a frame step is ~0.
//  2. upside-down penalty: feet should sit below the pelvis on average.
function comboScore(order, perm, sign, hAxis, hSign) {
  let slide = 0, nSlide = 0, updown = 0, nPose = 0
  for (let mi = 0; mi < motions.length; mi += 2) {
    const m = motions[mi]
    const F = m.root.length
    let prev = null
    for (let f = 0; f < F; f += 3) {
      const { world, tips } = poseWorld(m, f, order, perm, sign, hAxis, hSign)
      const pelvis = world[jIdx.pelvis]
      const footY = Math.min(tips[TOE_A].y, tips[TOE_B].y)
      updown += Math.max(0, footY - pelvis.y) // feet above pelvis = bad
      nPose++
      if (prev) {
        const dA = tips[TOE_A].distanceTo(prev[TOE_A])
        const dB = tips[TOE_B].distanceTo(prev[TOE_B])
        slide += Math.min(dA, dB)
        nSlide++
      }
      prev = tips.map(t => t.clone())
    }
  }
  return slide / nSlide + 2 * (updown / nPose)
}

const results = []
for (const order of ORDERS) {
  for (const perm of PERMS) {
    for (const sign of SIGNS) {
      for (const [hAxis, hSign] of HINGES) {
        results.push({
          order, perm: perm.join(''), sign: sign.join(','), hAxis, hSign,
          score: comboScore(order, perm, sign, hAxis, hSign),
        })
      }
    }
  }
}
results.sort((a, b) => a.score - b.score)
console.log('top 15 of', results.length, 'combos (lower = less stance-foot slide):')
for (const r of results.slice(0, 15)) {
  console.log(
    `score ${r.score.toFixed(4)}  order=${r.order} perm=${r.perm} sign=${r.sign} hinge=${r.hSign > 0 ? '+' : '-'}${r.hAxis}`
  )
}
