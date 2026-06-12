// H-2 debug viewer: assembles one original character and poses it at a
// motion frame. Render-on-demand (no rAF loop — hidden preview windows
// freeze rAF; drive it via window.viewer from preview_eval instead).
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { loadMotionData } from './MotionData.js'
import { CharacterAssembler, collectParts, SLOT_NAMES, setConvention, getConvention } from './CharacterAssembler.js'

const info = document.getElementById('info')

// preserveDrawingBuffer: screenshots are taken via canvas.toDataURL from
// preview_eval (preview_screenshot can time out when the window is hidden)
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x202830)
scene.add(new THREE.GridHelper(4, 8, 0x446688, 0x334455))
scene.add(new THREE.AxesHelper(1))

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.01, 100)

function toUnlit(rootObj) {
  rootObj.traverse(child => {
    if (!child.isMesh) return
    const convert = m => {
      if (!m?.isMeshStandardMaterial) return m
      return new THREE.MeshBasicMaterial({
        map: m.map ?? null, color: m.color.clone(),
        transparent: m.transparent, opacity: m.opacity,
        alphaTest: m.alphaTest, side: m.side,
      })
    }
    child.material = Array.isArray(child.material) ? child.material.map(convert) : convert(child.material)
  })
}

const state = { data: null, common: null, asm: null, char: 30, motion: 0, frame: 0, yaw: 30 }

function rebuild() {
  if (state.asm) scene.remove(state.asm.root)
  const def = state.data.characters[state.char]
  const parts = collectParts(def, { common: state.common })
  state.asm = new CharacterAssembler(parts)
  scene.add(state.asm.root)
  pose(state.motion, state.frame)
}

function pose(motionIndex, frame) {
  state.motion = motionIndex
  state.frame = frame
  const motion = state.data.motions[motionIndex]
  state.asm.applyFrame(motion, Math.min(frame, motion.frames - 1))
  render()
}

function render() {
  // frame the character: keep its root in view from a yaw-orbiting camera
  const target = state.asm.root.position.clone().add(new THREE.Vector3(0, 0.2, 0))
  const a = (state.yaw * Math.PI) / 180
  camera.position.set(target.x + 3 * Math.sin(a), target.y + 1.2, target.z + 3 * Math.cos(a))
  camera.lookAt(target)
  renderer.render(scene, camera)
  const m = state.data.motions[state.motion]
  info.textContent =
    `char ${state.char} (${state.data.characters[state.char].parts.length} parts)  ` +
    `motion ${state.motion}/${state.data.motions.length - 1}  frame ${state.frame}/${m.frames - 1}\n` +
    `root (${m.root[state.frame * 3].toFixed(2)}, ${m.root[state.frame * 3 + 1].toFixed(2)}, ${m.root[state.frame * 3 + 2].toFixed(2)})  yaw ${state.yaw}`
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
  state.data = data
  state.common = gltf.scene

  const q = new URLSearchParams(location.search)
  state.char = Number(q.get('char') ?? 30)
  state.motion = Number(q.get('motion') ?? 0)
  state.frame = Number(q.get('frame') ?? 0)
  rebuild()

  // eval-driven iteration hooks
  window.viewer = {
    state,
    setChar(i) { state.char = i; rebuild() },
    pose,
    setYaw(deg) { state.yaw = deg; render() },
    render,
    SLOT_NAMES,
    getConvention,
    setConvention(c) { setConvention(c); pose(state.motion, state.frame) },
    // dump world positions of all joints for geometric (non-visual) checks
    joints() {
      const out = {}
      state.asm.bones.forEach((b, slot) => {
        if (!b) return
        const v = new THREE.Vector3()
        b.updateWorldMatrix(true, false)
        v.setFromMatrixPosition(b.matrixWorld)
        out[SLOT_NAMES[slot]] = [+v.x.toFixed(3), +v.y.toFixed(3), +v.z.toFixed(3)]
      })
      return out
    },
  }
  // render + POST a canvas screenshot to the dev-server sink, returns file path
  window.viewer.shot = async () => {
    render()
    const dataURL = renderer.domElement.toDataURL('image/jpeg', 0.85)
    const resp = await fetch('/__shot', { method: 'POST', body: dataURL })
    return resp.text()
  }
  window.__viewerReady = true
}

main().catch(e => { info.textContent = String(e); console.error(e) })
