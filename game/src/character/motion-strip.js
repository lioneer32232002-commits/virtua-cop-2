// Dev-only motion identifier: renders a set of motions as frame-strips (one
// motion per row, sampled frames across the columns) so animation semantics
// (death / fire / hit) can be identified by eye — the MOT set is undocumented
// (ROADMAP H-3 follow-up). Unlike the rig contact sheet this poses with
// anchorRoot OFF, so the root translation/orientation shows (a death fall is
// visible as the body dropping). Renders synchronously and POSTs to /__shot
// (hidden preview windows freeze rAF — see project-vc2-env-gotchas).
//
//   ?motions=65,63,48   one row per motion (default: death candidates)
//   ?char=30            rig to pose      ?frames=8  columns per row
//   ?yaw=25 ?cw=150 ?ch=210
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { loadMotionData } from './MotionData.js'
import { CharacterAssembler, collectParts } from './CharacterAssembler.js'
import { FACING_YAW } from './CharacterFactory.js'
import { toUnlit } from '../render/unlit.js'

const info = document.getElementById('info')
const q = new URLSearchParams(location.search)
const CHAR = Number(q.get('char') ?? 30)
const FRAMES = Number(q.get('frames')) || 8
const CELL_W = Number(q.get('cw')) || 150
const CELL_H = Number(q.get('ch')) || 210
const YAW = ((Number(q.get('yaw')) ?? 25) * Math.PI) / 180
// Default to the data-derived death candidates (root Y collapses to the floor).
const DEFAULT_MOTIONS = [65, 63, 48, 64, 102, 131, 133, 62, 49, 103]
const MOTIONS = q.get('motions') ? q.get('motions').split(',').map(s => Number(s.trim())) : DEFAULT_MOTIONS

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setClearColor(0x202830, 1)
renderer.autoClear = false
renderer.setScissorTest(true)

const scene = new THREE.Scene()
scene.add(new THREE.GridHelper(4, 8, 0x446688, 0x2a3a48)) // y=0 ground reference
const camera = new THREE.PerspectiveCamera(32, CELL_W / CELL_H, 0.01, 100)

async function main() {
  const [data, gltf] = await Promise.all([
    loadMotionData(),
    new Promise((res, rej) => new GLTFLoader().load('/assets/stage1/P_COMMON.glb', res, undefined, rej)),
  ])
  if (!data) { info.textContent = 'assets/common missing'; return }
  toUnlit(gltf.scene)

  // One assembler, re-posed per cell. anchorRoot OFF so the fall/translation shows.
  const parts = collectParts(data.characters[CHAR], { common: gltf.scene })
  const asm = new CharacterAssembler(parts)
  asm.anchorRoot = false
  const facing = new THREE.Group()
  facing.rotation.y = FACING_YAW
  facing.add(asm.root)
  scene.add(facing)

  const COLS = FRAMES
  const ROWS = MOTIONS.length
  const W = COLS * CELL_W
  const H = ROWS * CELL_H
  renderer.setSize(W, H)
  document.body.appendChild(renderer.domElement)

  // Fixed framing wide enough to see both a standing (~y1.6) and a fallen body.
  camera.position.set(4.5 * Math.sin(YAW), 1.1, 4.5 * Math.cos(YAW))
  camera.lookAt(0, 0.6, 0)
  camera.updateMatrixWorld(true)

  renderer.setViewport(0, 0, W, H)
  renderer.setScissor(0, 0, W, H)
  renderer.clear()

  for (let row = 0; row < ROWS; row++) {
    const motion = data.motions[MOTIONS[row]]
    if (!motion) continue
    for (let col = 0; col < COLS; col++) {
      const f = COLS === 1 ? 0 : Math.round((col / (COLS - 1)) * (motion.frames - 1))
      asm.applyFrame(motion, f)
      const vx = col * CELL_W
      const vyGl = H - (row + 1) * CELL_H
      renderer.setViewport(vx, vyGl, CELL_W, CELL_H)
      renderer.setScissor(vx, vyGl, CELL_W, CELL_H)
      renderer.render(scene, camera)
    }
  }

  const out = document.createElement('canvas')
  out.width = W; out.height = H
  const g = out.getContext('2d')
  g.drawImage(renderer.domElement, 0, 0)
  g.textBaseline = 'top'
  for (let row = 0; row < ROWS; row++) {
    const motion = data.motions[MOTIONS[row]]
    const y = row * CELL_H
    g.strokeStyle = 'rgba(120,150,180,0.35)'
    g.strokeRect(0.5, y + 0.5, W, CELL_H)
    g.font = 'bold 15px monospace'
    g.fillStyle = '#ffd24a'
    g.fillText(`motion ${MOTIONS[row]}`, 6, y + 5)
    g.font = '11px monospace'
    g.fillStyle = '#8fb0c8'
    g.fillText(`${motion ? motion.frames : '?'}f`, 6, y + 24)
  }
  const dataURL = out.toDataURL('image/jpeg', 0.92)
  const resp = await fetch('/__shot', { method: 'POST', body: dataURL })
  window.__sheetPath = await resp.text()
  window.__sheetReady = true
  info.textContent = `char ${CHAR}, ${ROWS} motions × ${COLS} frames → ${window.__sheetPath}`
}

main().catch(e => { info.textContent = String(e); window.__sheetError = String(e); console.error(e) })
