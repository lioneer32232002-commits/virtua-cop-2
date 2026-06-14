// Dev-only rig contact sheet: renders every character rig from the EXE table
// (characters.json, 47 rigs RE'd in ROADMAP H-1) at the in-game static pose
// into one labelled grid, so TYPE_TO_RIG can be calibrated by eye. The current
// placeholder assignments (grunt/gunman/heavy/boss/innocent) are tagged on
// their cells. Renders synchronously and POSTs the composited image to the
// /__shot sink — hidden preview windows freeze rAF and stall preview_screenshot
// (see project-vc2-env-gotchas). No rAF loop; the work runs once on load.
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { loadMotionData } from './MotionData.js'
import { CharacterAssembler, collectParts } from './CharacterAssembler.js'
import { DEFAULT_POSE, FACING_YAW, TYPE_TO_RIG } from './CharacterFactory.js'
import { toUnlit } from '../render/unlit.js'

const info = document.getElementById('info')

const q = new URLSearchParams(location.search)
// ?only=3,12,16,26,30 renders just those rigs (e.g. the final TYPE_TO_RIG picks)
const ONLY = q.get('only') ? q.get('only').split(',').map(s => Number(s.trim())) : null
const COLS = Number(q.get('cols')) || (ONLY ? Math.min(ONLY.length, 8) : 8)
const CELL_W = Number(q.get('cw')) || 200
const CELL_H = Number(q.get('ch')) || 280
const YAW = ((Number(q.get('yaw')) ?? 20) * Math.PI) / 180

const BG = 0x202830

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setClearColor(BG, 1)
renderer.autoClear = false
renderer.setScissorTest(true)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(30, CELL_W / CELL_H, 0.01, 100)

// rig index → enemy type(s), to tag the current placeholder assignments
const rigToType = {}
for (const [type, rig] of Object.entries(TYPE_TO_RIG)) {
  rigToType[rig] = rigToType[rig] ? `${rigToType[rig]},${type}` : type
}

// Assemble one rig at the in-game static pose, grounded + facing the camera,
// hidden until its cell renders. Mirrors CharacterFactory.build() so the sheet
// shows exactly what enemies look like in-game.
function buildRig(def, common, motions) {
  const parts = collectParts(def, { common })
  const asm = new CharacterAssembler(parts)
  asm.anchorRoot = true
  const motion = motions?.[DEFAULT_POSE.motion]
  if (motion) asm.applyFrame(motion, Math.min(DEFAULT_POSE.frame, motion.frames - 1))

  const grounded = new THREE.Group()
  grounded.rotation.y = FACING_YAW
  grounded.add(asm.root)
  asm.root.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(asm.root)
  if (Number.isFinite(box.min.y)) grounded.position.y = -box.min.y
  grounded.visible = false
  return grounded
}

async function main() {
  const [data, gltf] = await Promise.all([
    loadMotionData(),
    new Promise((res, rej) => new GLTFLoader().load('/assets/stage1/P_COMMON.glb', res, undefined, rej)),
  ])
  if (!data) {
    info.textContent = 'assets/common missing — run tools/extract-stage-assets/extract-motions.mjs'
    return
  }
  toUnlit(gltf.scene)
  const chars = data.characters
  const indices = ONLY ?? chars.map((_, i) => i)
  const N = indices.length
  const ROWS = Math.ceil(N / COLS)
  const W = COLS * CELL_W
  const H = ROWS * CELL_H
  renderer.setSize(W, H)
  document.body.appendChild(renderer.domElement)

  const rigs = indices.map(idx => buildRig(chars[idx], gltf.scene, data.motions))
  rigs.forEach(r => scene.add(r))

  // Fixed framing for every cell so rig heights stay comparable.
  const targetY = 0.85
  const dist = 4.0
  camera.position.set(dist * Math.sin(YAW), targetY + 0.25, dist * Math.cos(YAW))
  camera.lookAt(0, targetY, 0)
  camera.updateMatrixWorld(true)

  // Clear the whole canvas once, then render each rig into its own scissored cell.
  renderer.setViewport(0, 0, W, H)
  renderer.setScissor(0, 0, W, H)
  renderer.clear()
  for (let i = 0; i < N; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const vx = col * CELL_W
    const vyGl = H - (row + 1) * CELL_H // WebGL viewport origin is bottom-left
    renderer.setViewport(vx, vyGl, CELL_W, CELL_H)
    renderer.setScissor(vx, vyGl, CELL_W, CELL_H)
    rigs[i].visible = true
    renderer.render(scene, camera)
    rigs[i].visible = false
  }

  // Composite labels (text can't be drawn on a WebGL canvas) onto a 2D canvas.
  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const g = out.getContext('2d')
  g.drawImage(renderer.domElement, 0, 0)
  g.textBaseline = 'top'
  for (let i = 0; i < N; i++) {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    const x = col * CELL_W
    const y = row * CELL_H
    g.strokeStyle = 'rgba(120,150,180,0.35)'
    g.strokeRect(x + 0.5, y + 0.5, CELL_W, CELL_H)

    const idx = indices[i]
    const c = chars[idx]
    const type = rigToType[idx]
    g.font = 'bold 16px monospace'
    g.fillStyle = type ? '#ffd24a' : '#bfe3ff'
    g.fillText(`#${idx}`, x + 6, y + 5)

    g.font = '11px monospace'
    g.fillStyle = '#8fb0c8'
    let tag = `${c.parts.length}p`
    if (c.parts.length === 10) tag += ' upper'
    if (c.parts.some(p => p.stage)) tag += ' stage*'
    g.fillText(tag, x + 42, y + 7)

    if (type) {
      g.font = 'bold 14px monospace'
      g.fillStyle = '#ffd24a'
      g.fillText(`◀ ${type}`, x + 6, y + CELL_H - 20)
    }
  }

  const dataURL = out.toDataURL('image/jpeg', 0.92)
  const resp = await fetch('/__shot', { method: 'POST', body: dataURL })
  window.__sheetPath = await resp.text()
  window.__sheetReady = true
  info.textContent = `${N} rigs → ${window.__sheetPath}  (* stage-part rigs render incomplete from P_COMMON alone)`

  // eval hooks for re-shooting with different framing if needed
  window.contactSheet = { renderer, scene, camera }
}

main().catch(e => {
  info.textContent = String(e)
  window.__sheetError = String(e)
  console.error(e)
})
