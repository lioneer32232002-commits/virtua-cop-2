// M0 spike：把四個未知數接成一條可跑迴圈，並補到「能感受好不好玩」的最小可玩量級——
// briefing → rail（佔位）→ 自由房間（牆+掩體+多敵人+會還手+玩家生命）→ 清光過關 → 存檔。
// 重用 production 的 Renderer/Shooter/GameLoop；其餘全用 m0/ 模組。丟棄式，不接主選單。
import * as THREE from 'three'
import { installLatencyProbe } from './latencyProbe.js'
import { Renderer } from '../../render/Renderer.js'
import { GameLoop } from '../../GameLoop.js'
import { Shooter } from '../../gameplay/Shooter.js'
import { Sequencer } from './Sequencer.js'
import { SaveStore } from './SaveStore.js'
import { FreeRoamController } from './FreeRoamController.js'
import { BillboardSprite } from './BillboardSprite.js'
import { stepAI } from './WanderAI.js'
import { clampToRoom } from './clamp.js'
import { segmentClearsBoxes } from './los.js'
import { loadImage, processToCanvas } from './buildSprite.js'

installLatencyProbe()

// ---- 場景 ----
const renderer = new Renderer(document.getElementById('c'))
// 室內場景：移除 Renderer 預設的 sky dome / fog，背景設暗。
const skyDome = renderer.scene.getObjectByName('sky_dome')
if (skyDome) renderer.scene.remove(skyDome)
renderer.scene.fog = null
renderer.scene.background = new THREE.Color(0x14161c)
renderer.camera.position.set(0, 1.6, 1)

const shooter = new Shooter(renderer.camera)
const save = new SaveStore()

const ROOM = { minX: -6, maxX: 6, minZ: -10, maxZ: 2 }
// 掩體箱：AABB 給 clamp（擋走位）+ los（擋視線）；對應的 mesh 也當玩家射擊的遮擋目標。
const OBSTACLES = [
  { minX: -3.5, maxX: -2, minZ: -6, maxZ: -4.5 },
  { minX: 2, maxX: 3.5, minZ: -8, maxZ: -6.5 },
]

// 地板 + 環境光
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12),
  new THREE.MeshStandardMaterial({ color: 0x55504a }))
floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, -4); renderer.scene.add(floor)
renderer.scene.add(new THREE.HemisphereLight(0xffe9c0, 0x202028, 1.2))

// 四面牆——純色空盒沒有視覺參照，轉視角看起來像沒動；加牆讓走動/看的方向看得出來。
;(function addWalls() {
  const h = 3, t = 0.2, mat = new THREE.MeshStandardMaterial({ color: 0x3a4350 })
  const w = ROOM.maxX - ROOM.minX, d = ROOM.maxZ - ROOM.minZ
  const cx = (ROOM.minX + ROOM.maxX) / 2, cz = (ROOM.minZ + ROOM.maxZ) / 2
  for (const [x, z, sx, sz] of [
    [cx, ROOM.minZ, w, t], [cx, ROOM.maxZ, w, t],   // 前 / 後
    [ROOM.minX, cz, t, d], [ROOM.maxX, cz, t, d],   // 左 / 右
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(sx, h, sz), mat)
    wall.position.set(x, h / 2, z); renderer.scene.add(wall)
  }
})()

// 掩體 mesh（同時是玩家射擊的遮擋目標：raycast 最近若是箱 → 子彈被擋下）
const boxMeshes = OBSTACLES.map(o => {
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(o.maxX - o.minX, 1.4, o.maxZ - o.minZ),
    new THREE.MeshStandardMaterial({ color: 0x6b5d4f }))
  box.position.set((o.minX + o.maxX) / 2, 0.7, (o.minZ + o.maxZ) / 2)
  renderer.scene.add(box)
  return box
})

// ---- 敵人 ----
const AICFG = { speed: 1.6, range: 5, fireCooldown: 1.5 }
const ENEMY_HP = 3
const ENEMY_RADIUS = 0.45
const WAVES = [
  [{ x: -2, z: -9 }, { x: 2, z: -9 }],
  [{ x: -4, z: -7 }, { x: 4, z: -9 }],
]
let enemyTex = null
let enemies = []
let waveIndex = 0

async function ensureEnemyTexture() {
  if (enemyTex) return
  const img = await loadImage('/m0/enemy.png')
  enemyTex = new THREE.CanvasTexture(processToCanvas(img))
}
function spawnWave(i) {
  for (const pos of WAVES[i]) {
    const spr = new BillboardSprite(enemyTex, { cols: 1, rows: 1, worldSize: 1.8 })
    spr.sprite.position.set(pos.x, 0.9, pos.z)
    renderer.scene.add(spr.sprite)
    enemies.push({ x: pos.x, z: pos.z, cooldown: 1, hp: ENEMY_HP, spr })
  }
}
function clearEnemySprites() {
  for (const en of enemies) renderer.scene.remove(en.spr.sprite)
  enemies = []
}

// ---- 玩家 / 狀態 ----
const PLAYER_HP = 5
let playerHp = PLAYER_HP
// idle → loading → playing → (gameover | clear) → done
let phase = 'idle'
const free = new FreeRoamController(renderer.camera, document.getElementById('c'), ROOM, OBSTACLES)

const hintEl = document.getElementById('hint')
const hudEl = document.getElementById('hud')
const bannerEl = document.getElementById('banner')
const crossEl = document.getElementById('crosshair')

function updateHud() {
  hudEl.textContent = phase === 'playing'
    ? `HP ${playerHp}　敵人 ${enemies.length}　波次 ${waveIndex + 1}/${WAVES.length}`
    : ''
}
function banner(text) {
  bannerEl.textContent = text
  bannerEl.style.display = text ? 'flex' : 'none'
}

async function startFree() {
  phase = 'loading'
  hintEl.textContent = '載入中…'
  await ensureEnemyTexture()
  clearEnemySprites()
  waveIndex = 0; playerHp = PLAYER_HP
  spawnWave(0)
  free.attach()
  crossEl.style.display = 'block'
  banner('')
  hintEl.textContent = '點畫面鎖游標 → WASD 走、滑鼠看、左鍵射；躲掩體後敵人打不到你。清光敵人過關'
  save.save({ segment: 'free', score: 0 })
  phase = 'playing'
  updateHud()
}
function gameOver() {
  phase = 'gameover'
  free.detach(); crossEl.style.display = 'none'
  banner('GAME OVER\n按 R 重來')
  updateHud()
}
function nextWaveOrClear() {
  if (waveIndex < WAVES.length - 1) {
    waveIndex++; spawnWave(waveIndex); updateHud()
  } else {
    phase = 'clear'
    free.detach(); crossEl.style.display = 'none'
    banner('STAGE CLEAR\n按 N 存檔結束')
  }
}

// ---- 段落 ----
const seq = new Sequencer({ onEnter: async seg => {
  if (seg === 'rail') {
    renderer.camera.position.set(0, 1.6, 4)
    hintEl.textContent = 'RAIL 段（佔位）— 按 N 進自由段'
  }
  if (seg === 'free') { await startFree() }
  if (seg === 'done') {
    free.detach(); crossEl.style.display = 'none'; phase = 'done'; banner('')
    hintEl.textContent = 'DONE — 存檔已寫入，重整後在 console 跑 __m0.save.load() 可見 segment=free'
  }
}})
hintEl.textContent = 'BRIEFING — 按 N 開始（→ rail → free）'

// ---- 輸入 ----
window.addEventListener('keydown', e => {
  if (e.code === 'KeyN') {
    if (phase === 'loading' || phase === 'playing' || phase === 'gameover') return
    seq.next()
  }
  if (e.code === 'KeyR' && phase === 'gameover') startFree()
})
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || phase !== 'playing') return
  renderer.scene.updateMatrixWorld(true)
  const targets = [...enemies.map(en => en.spr.sprite), ...boxMeshes]
  const hits = shooter.getHits({ x: 0, y: 0 }, targets)  // pointerlock 準心在中央
  if (!hits.length) return
  const en = enemies.find(en => en.spr.sprite === hits[0].object)
  if (!en) return  // 最近命中是掩體 → 子彈被擋
  if (--en.hp <= 0) {
    renderer.scene.remove(en.spr.sprite)
    enemies = enemies.filter(x => x !== en)
    if (enemies.length === 0) nextWaveOrClear()
  }
  updateHud()
})

// ---- 迴圈 ----
const loop = new GameLoop(dt => {
  if (phase === 'playing') {
    free.update(dt)
    const cam = renderer.camera.position
    for (const en of enemies) {
      const hasLOS = segmentClearsBoxes(en.x, en.z, cam.x, cam.z, OBSTACLES)
      const r = stepAI(en, cam, dt, AICFG, hasLOS)
      const c = clampToRoom({ x: r.x, z: r.z }, ROOM, OBSTACLES, ENEMY_RADIUS)
      en.x = c.x; en.z = c.z; en.cooldown = r.cooldown
      en.spr.sprite.position.set(en.x, 0.9, en.z)
      en.spr.faceFrame(0, cam, en.spr.sprite.position)
      if (r.fired) {
        playerHp -= 1; updateHud()
        if (playerHp <= 0) { gameOver(); break }
      }
    }
  }
  renderer.render()
})
loop.start()

window.__m0 = {
  seq, save, renderer, free,
  get phase() { return phase },
  get playerHp() { return playerHp },
  get enemies() { return enemies },
}
