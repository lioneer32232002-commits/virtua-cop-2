import * as THREE from 'three'
import { Renderer } from '../render/Renderer.js'
import { GameLoop } from '../GameLoop.js'
import { I18n } from './core/i18n.js'
import zh from '../locales/zh.json'
import { SaveStore } from './core/SaveStore.js'
import { MissionSequencer } from './mission/MissionSequencer.js'
import { SEGMENTS, SEGMENT_MODES, MISSION } from './mission/missions/first-island-chain.js'
import { savePayloadFor } from './mission/SeamController.js'
import { Shooter } from '../gameplay/Shooter.js'
import { FreeRoamController } from './free/FreeRoamController.js'
import { buildAlleyLayout, buildAlleyGroup } from './free/AlleyScene.js'
import { clampToSegments } from './free/clamp.js'
import { stepAI } from './free/WanderAI.js'
import { assistAim } from './combat/aimAssist.js'
import { BillboardSprite } from './combat/BillboardSprite.js'
import { loadImage, processToCanvas } from './combat/buildSprite.js'

const i18n = new I18n(zh)
const renderer = new Renderer(document.getElementById('c'))
const save = new SaveStore()
const dom = document.getElementById('c')
const canvas = dom.querySelector('canvas') || dom   // pointerlock 鎖在真 canvas 上（見 f41ba65）
const crosshair = document.getElementById('crosshair')
const hint = document.getElementById('hint')
const overlay = document.getElementById('overlay')
const shooter = new Shooter(renderer.camera)
let score = 0
let free = null   // { controller, group, layout, enemies[], intelMesh, exitTrigger, intelTaken }

// ── 輸入模式切換（接縫的一半）──────────────────────────────────────────────
function setInputMode(mode) {
  if (mode === 'pointerlock') {
    crosshair.style.display = 'block'
    crosshair.style.left = '50%'; crosshair.style.top = '50%'   // 置中
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

// ── 自由段（取代 Phase A 的 freeStub）──────────────────────────────────────
async function enterFree() {
  const layout = buildAlleyLayout(MISSION.free.alleySeed)
  const group = buildAlleyGroup(layout)
  renderer.scene.add(group)
  renderer.camera.position.set(layout.entry.x, 1.6, layout.entry.z)
  const controller = new FreeRoamController(renderer.camera, canvas, layout.segments, layout.obstacles)
  controller.attach()

  // sprite 敵人（過調色盤管線；單張 billboard，每隻一份 CanvasTexture）
  const img = await loadImage(MISSION.free.enemy.sprite)
  const enemies = layout.enemySpawns.map(sp => {
    const bb = new BillboardSprite(new THREE.CanvasTexture(processToCanvas(img)),
      { worldSize: MISSION.free.enemy.worldSize })
    bb.sprite.position.set(sp.x, 0.95, sp.z)
    renderer.scene.add(bb.sprite)
    return { bb, x: sp.x, z: sp.z, cooldown: 1, hp: MISSION.free.enemy.hp, alive: true }
  })

  // 情報點（小發光方塊，按 E 拾取）
  const intelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x6ad0ff }))
  intelMesh.position.set(layout.intel.x, 0.6, layout.intel.z)
  renderer.scene.add(intelMesh)

  free = { controller, group, layout, enemies, intelMesh, exitTrigger: layout.exitTrigger, intelTaken: false }
}

function exitFree() {
  if (!free) return
  free.controller.detach()
  renderer.scene.remove(free.group)
  free.enemies.forEach(e => renderer.scene.remove(e.bb.sprite))
  renderer.scene.remove(free.intelMesh)
  free = null
}

function inside(trigger, p) {
  return p.x > trigger.minX && p.x < trigger.maxX && p.z > trigger.minZ && p.z < trigger.maxZ
}
function clampFreePos(x, z) {
  return clampToSegments({ x, z }, free.layout.segments, free.layout.obstacles, 0.3)
}

// ── 接縫：套相機控制者 + 輸入模式 + 存檔（依 SEGMENT_MODES）────────────────────
async function applySegment(seg) {
  const mode = SEGMENT_MODES[seg]
  setInputMode(mode.input)
  if (seg === 'briefing') showOverlay('brief.title', 'brief.body')
  else if (seg === 'ending') showOverlay('ending.title', 'ending.body')
  else hideOverlay()
  if (seg === 'rail1' || seg === 'rail2boss') {
    renderer.camera.position.set(0, 1.6, 4)
    renderer.camera.rotation.set(0, 0, 0)   // 清掉自由段殘留的 yaw/pitch
  }
  if (seg === 'free') await enterFree()
  const payload = savePayloadFor(seg, score)
  if (payload) save.save(payload)
  hint.textContent = `段落：${seg}（${mode.camera}/${mode.input}）`
}

const seq = new MissionSequencer(SEGMENTS, {
  onEnter: applySegment,
  onExit: seg => { if (seg === 'free') exitFree() },
})
applySegment(seq.current)   // 進 briefing

window.addEventListener('keydown', e => { if (e.code === 'KeyN') seq.next() })

// 情報拾取（E，需走近）
window.addEventListener('keydown', e => {
  if (e.code === 'KeyE' && seq.current === 'free' && free && !free.intelTaken) {
    const d = Math.hypot(renderer.camera.position.x - free.layout.intel.x,
                         renderer.camera.position.z - free.layout.intel.z)
    if (d < 1.6) {
      free.intelTaken = true; score += MISSION.free.intelScore
      free.intelMesh.visible = false
      hint.textContent = i18n.t('hud.intel')
    }
  }
})

// 左鍵射擊（pointerlock 下準心置中 NDC=(0,0)，過磁吸）
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || seq.current !== 'free' || !free) return
  const live = free.enemies.filter(en => en.alive)
  const targets = live.map(en => {
    const v = en.bb.sprite.position.clone().project(renderer.camera)
    return { x: v.x, y: v.y, ref: en }
  })
  const aim = assistAim({ x: 0, y: 0 }, targets, MISSION.free.assist)
  const hits = shooter.getHits(aim, live.map(en => en.bb.sprite))
  if (hits.length) {
    const en = free.enemies.find(en => en.bb.sprite === hits[0].object)
    if (en) { en.hp -= 1; if (en.hp <= 0) { en.alive = false; en.bb.sprite.visible = false } }
  }
})

const loop = new GameLoop(dt => {
  if (seq.current === 'free' && free) {
    free.controller.update(dt)
    const cam = renderer.camera.position
    for (const en of free.enemies) {
      if (!en.alive) continue
      const r = stepAI(en, { x: cam.x, z: cam.z }, dt, MISSION.free.enemy.ai)
      const c = clampFreePos(r.x, r.z)   // 過巷弄碰撞（沿障礙滑）
      en.x = c.x; en.z = c.z; en.cooldown = r.cooldown
      en.bb.sprite.position.set(en.x, 0.95, en.z)
      en.bb.faceFrame(0, cam, en.bb.sprite.position)
      // r.fired → M1 暫不接玩家 HP（傷害系統留 HUD 整合，spec 標可選）
    }
    // 走到巷尾出口 → 進下一段（rail2boss）
    if (inside(free.exitTrigger, cam)) seq.next()
  }
  renderer.render()
})
loop.start()

// debug 出口
window.__dl = {
  seq, save, i18n, renderer, shooter,
  get score() { return score },
  get free() { return free },
}
