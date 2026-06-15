import * as THREE from 'three'
import { Renderer } from '../render/Renderer.js'
import { GameLoop } from '../GameLoop.js'
import { I18n } from './core/i18n.js'
import zh from '../locales/zh.json'
import { SaveStore } from './core/SaveStore.js'
import { MissionSequencer } from './mission/MissionSequencer.js'
import { SEGMENTS, SEGMENT_MODES } from './mission/missions/first-island-chain.js'
import { savePayloadFor } from './mission/SeamController.js'

const i18n = new I18n(zh)
const renderer = new Renderer(document.getElementById('c'))
const save = new SaveStore()
const dom = document.getElementById('c')
const canvas = dom.querySelector('canvas') || dom
const crosshair = document.getElementById('crosshair')
const hint = document.getElementById('hint')
const overlay = document.getElementById('overlay')
let score = 0

function setInputMode(mode) {
  if (mode === 'pointerlock') {
    crosshair.style.display = 'block'
    crosshair.style.left = '50%'; crosshair.style.top = '50%'
    canvas.requestPointerLock?.()
  } else if (mode === 'cursor') {
    crosshair.style.display = 'block'
    if (document.pointerLockElement) document.exitPointerLock?.()
  } else {
    crosshair.style.display = 'none'
    if (document.pointerLockElement) document.exitPointerLock?.()
  }
}

function showOverlay(titleKey, bodyKey) {
  overlay.classList.remove('hidden')
  overlay.querySelector('h1').textContent = i18n.t(titleKey)
  overlay.querySelector('p').textContent = i18n.t(bodyKey) + '\n\n' + i18n.t('brief.continue')
}
function hideOverlay() { overlay.classList.add('hidden') }

const freeStub = new THREE.Group()
function buildFreeStub() {
  if (freeStub.children.length) return
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 24),
    new THREE.MeshBasicMaterial({ color: 0x3a3530 }))
  floor.rotation.x = -Math.PI / 2; floor.position.z = -8
  freeStub.add(floor)
  renderer.scene.add(freeStub)
}

function applySegment(seg) {
  const mode = SEGMENT_MODES[seg]
  setInputMode(mode.input)
  if (seg === 'briefing') showOverlay('brief.title', 'brief.body')
  else if (seg === 'ending') showOverlay('ending.title', 'ending.body')
  else hideOverlay()
  if (seg === 'rail1' || seg === 'rail2boss') renderer.camera.position.set(0, 1.6, 4)
  if (seg === 'free') { renderer.camera.position.set(0, 1.6, 0); buildFreeStub() }
  const payload = savePayloadFor(seg, score)
  if (payload) save.save(payload)
  hint.textContent = `段落：${seg}（${mode.camera}/${mode.input}）`
}

const seq = new MissionSequencer(SEGMENTS, { onEnter: applySegment })
applySegment(seq.current)

window.addEventListener('keydown', e => { if (e.code === 'KeyN') seq.next() })

const loop = new GameLoop(() => { renderer.render() })
loop.start()

window.__dl = { seq, save, i18n, renderer, get score() { return score } }
