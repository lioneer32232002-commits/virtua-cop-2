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
import { projectThreats } from './combat/projectThreats.js'
import { BillboardSprite } from './combat/BillboardSprite.js'
import { loadImage, processToCanvas } from './combat/buildSprite.js'
import { RailController } from './mission/RailController.js'
import { resolveEnemy, zoneOfHit, resolveProjectile } from '../gameplay/EnemyManager.js'
import { buildOriginalEnvironment, TAIPEI1950S_PRESET, HARBOR_PRESET } from '../scene/OriginalEnvironment.js'
import { loadEnemyModels } from '../gameplay/EnemyModelLoader.js'
import { renderCard } from './core/cards.js'
import { HUD } from '../hud/HUD.js'
import { PlayerState } from './core/PlayerState.js'

const i18n = new I18n(zh)
const renderer = new Renderer(document.getElementById('c'))
const save = new SaveStore()
const dom = document.getElementById('c')
const canvas = dom.querySelector('canvas') || dom   // pointerlock 鎖在真 canvas 上（見 f41ba65）
const crosshair = document.getElementById('crosshair')
const hint = document.getElementById('hint')
const overlay = document.getElementById('overlay')
const shooter = new Shooter(renderer.camera)
const hud = new HUD(document.getElementById('hud'), { maxHealth: 5, maxAmmo: 7 })
const player = new PlayerState({ maxHealth: 5, maxAmmo: 7 })   // HP/彈藥扣減在 Task 1.2 接
const BASE_KILL = 100        // 佔位基礎擊殺分（待平衡）
const JUSTICE_BONUS = 200    // 繳械（justice shot）獎勵，同 VC2
const SHOOTDOWN_SCORE = 50   // 射落在途彈丸分（VC2 佔位，待考證）
let free = null   // { controller, group, layout, enemies[], intelMesh, exitTrigger, intelTaken }
let rail = null   // { controller, env, key }
let enemyModels = null   // 程序人形 Map（含 head/body/hand zone）；首次進軌道段時載一次
let cursorNDC = { x: 0, y: 0 }   // rail 段自由游標的 NDC
const PRESETS = { taipei1950s: TAIPEI1950S_PRESET, harbor: HARBOR_PRESET }

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

function showOverlay(titleKey, bodyKey, continueKey = 'brief.continue') {
  overlay.classList.remove('hidden')
  renderCard(overlay, i18n, titleKey, bodyKey)
  overlay.querySelector('p').textContent += '\n\n' + i18n.t(continueKey)
}
function hideOverlay() { overlay.classList.add('hidden') }

// ── 玩家受擊 / 死亡 / 開火彈藥 ──────────────────────────────────────────────
let gameOver = false

// 敵彈丸抵達（rail onEnemyAttack）或 free 敵開火命中時呼叫：扣血、閃白、死亡判定。
function damagePlayer(amount = 1) {
  if (gameOver) return
  const dead = player.takeDamage(amount)
  hud.setHealth(player.health)
  hud.flashDamage()
  if (dead) onPlayerDead()
}
function onPlayerDead() {
  gameOver = true
  hud.updateLockOns([])          // 清掉殘留鎖定圈（同 VC2 C-3 修正）
  hud.hideBossBar()
  setInputMode('none')
  showOverlay('over.title', 'over.body', 'over.retry')
}

// 一發子彈的彈藥閘門。回 true＝可射擊（已耗 1 發）；false＝這一下被吃掉（換彈/死亡），不射。
// 射空後下一下＝畫面外換彈（VC2「off-screen reload」remake），不發子彈；右鍵可提前換彈。
function tryFire() {
  if (gameOver) return false
  if (player.ammo <= 0) { player.reload(); hud.setAmmo(player.ammo); return false }
  player.consumeAmmo()
  hud.setAmmo(player.ammo)
  return true
}

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

// ── 軌道段（重用 CameraRig + EnemyManager + Boss）──────────────────────────────
async function enterRail(key) {
  const data = MISSION[key]
  const env = buildOriginalEnvironment(PRESETS[data.preset])
  renderer.scene.add(env)
  if (!enemyModels) enemyModels = await loadEnemyModels()   // 程序人形（含 zone）
  const controller = new RailController(renderer.scene, renderer.camera, data, {
    models: enemyModels,
    difficulty: 'normal',
    onComplete: () => seq.next(),            // 相機到底 + 全清 → 進下一段
    onEnemyAttack: () => damagePlayer(1),    // 敵彈丸抵達相機 → 扣命 + 閃白
    onBossPhase: () => { /* M1：可出增援，先留 */ },
  })
  rail = { controller, env, key }
}
function exitRail() {
  if (!rail) return
  rail.controller.dispose()
  renderer.scene.remove(rail.env)
  rail = null
}

// ── 接縫：套相機控制者 + 輸入模式 + 存檔（依 SEGMENT_MODES）────────────────────
async function applySegment(seg) {
  const mode = SEGMENT_MODES[seg]
  setInputMode(mode.input)
  if (seg === 'briefing') showOverlay('brief.title', 'brief.body')
  else if (seg === 'ending') showOverlay('ending.title', 'ending.body')
  else hideOverlay()
  if (seg === 'rail1' || seg === 'rail2boss') await enterRail(seg)   // RailController 接管相機
  else if (seg === 'free') await enterFree()
  const payload = savePayloadFor(seg, hud.score)
  if (payload) save.save(payload)
  hint.textContent = `段落：${seg}（${mode.camera}/${mode.input}）`
}

const seq = new MissionSequencer(SEGMENTS, {
  onEnter: applySegment,
  onExit: seg => {
    if (seg === 'free') exitFree()
    else if (seg === 'rail1' || seg === 'rail2boss') exitRail()
  },
})

// 讀檔重入（M1 佔位入口：URL ?resume）。有存檔點時跳到該段、還原分數；否則正常從
// briefing 開場。jumpTo 只 fire 目標段，不跑中間段的設定（見 SaveStore 段落級存檔）。
const saved = save.load()
if (new URLSearchParams(location.search).has('resume') && saved?.segment) {
  hud.addScore(saved.score ?? 0)   // HUD 從 0 起，加回存檔分數
  seq.jumpTo(saved.segment)
} else {
  applySegment(seq.current)   // 進 briefing
}

window.addEventListener('keydown', e => {
  if (e.code === 'KeyN' && !gameOver) seq.next()
  // game-over：R 從最近存檔點重來（無存檔則整輪重啟）
  else if (e.code === 'KeyR' && gameOver) location.href = save.load() ? '?resume' : location.pathname
})

// 情報拾取（E，需走近）
window.addEventListener('keydown', e => {
  if (e.code === 'KeyE' && !gameOver && seq.current === 'free' && free && !free.intelTaken) {
    const d = Math.hypot(renderer.camera.position.x - free.layout.intel.x,
                         renderer.camera.position.z - free.layout.intel.z)
    if (d < 1.6) {
      free.intelTaken = true; hud.addScore(MISSION.free.intelScore)
      free.intelMesh.visible = false
      hint.textContent = i18n.t('hud.intel')
    }
  }
})

// 左鍵射擊（pointerlock 下準心置中 NDC=(0,0)，過磁吸）
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || seq.current !== 'free' || !free) return
  if (!tryFire()) return   // 彈藥閘門（空彈＝這下換彈不射）
  const live = free.enemies.filter(en => en.alive)
  const targets = live.map(en => {
    const v = en.bb.sprite.position.clone().project(renderer.camera)
    return { x: v.x, y: v.y, ref: en }
  })
  const aim = assistAim({ x: 0, y: 0 }, targets, MISSION.free.assist)
  const hits = shooter.getHits(aim, live.map(en => en.bb.sprite))
  if (hits.length) {
    const en = free.enemies.find(en => en.bb.sprite === hits[0].object)
    if (en) {
      en.hp -= 1
      if (en.hp <= 0) { en.alive = false; en.bb.sprite.visible = false; hud.addScore(BASE_KILL) }
    }
  }
})

// ── rail 段：自由游標光槍（滑鼠位置即 NDC，crosshair 跟著游標）──────────────────
window.addEventListener('mousemove', e => {
  cursorNDC = { x: (e.clientX / window.innerWidth) * 2 - 1, y: -(e.clientY / window.innerHeight) * 2 + 1 }
  if (seq.current === 'rail1' || seq.current === 'rail2boss') {
    crosshair.style.left = e.clientX + 'px'; crosshair.style.top = e.clientY + 'px'
  }
})
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || !rail) return
  if (!tryFire()) return   // 彈藥閘門（射不射都算開火；空彈＝這下換彈不射）
  // rail 段不加磁吸（純手瞄，接近原版光槍）。對敵人與在途彈丸一起 raycast，最近者勝。
  const hits = shooter.getHits(cursorNDC, [
    ...rail.controller.enemyMeshes(), ...rail.controller.projectileMeshes(),
  ])
  if (!hits.length) return
  // 最近命中是在途彈丸 → 射落（銷毀 + 加分，不傷敵）；原版：飛行中可擊落取消攻擊。
  const proj = resolveProjectile(hits[0].object)
  if (proj) { proj.shootDown(); hud.addScore(SHOOTDOWN_SCORE); return }
  const enemy = resolveEnemy(hits[0].object)
  if (enemy) {
    const zone = zoneOfHit(hits[0].object)
    const aliveBefore = enemy.hp > 0
    enemy.hit(1, zone)   // head=即死 / hand=justice / body=一般
    // 首次繳械（hand）給 justice 獎勵；擊殺給 base × lock 倍率（綠×3/黃×2/紅×1，Task 1.3 視覺化）。
    if (enemy.justiceShot && !enemy._dlJustice) { enemy._dlJustice = true; hud.addScore(JUSTICE_BONUS) }
    if (aliveBefore && enemy.hp <= 0 && !enemy._dlScored) {
      enemy._dlScored = true
      hud.addScore(BASE_KILL * (enemy.killMultiplier ?? 1))
    }
  }
})

// 右鍵提前換彈（隱藏瀏覽器右鍵選單）。VC2「畫面外開槍 reload」的 remake 對應。
window.addEventListener('contextmenu', e => {
  e.preventDefault()
  if (gameOver) return
  player.reload(); hud.setAmmo(player.ammo)
})

// ── 軌道段 lock-on 圈：投影有相位的敵人到螢幕 → HUD（只 rail 有；其餘段清空）─────────
const _lockV = new THREE.Vector3()
function updateRailLockRings() {
  if (!rail) { hud.updateLockOns([]); return }
  const vp = { width: window.innerWidth, height: window.innerHeight }
  const locks = projectThreats(rail.controller.activeThreats(), en => {
    if (!en.mesh) return null
    en.mesh.getWorldPosition(_lockV).project(renderer.camera)
    if (_lockV.z > 1) return null               // 相機後方 → 不畫
    return { x: _lockV.x, y: _lockV.y }
  }, vp)
  hud.updateLockOns(locks)
}

const loop = new GameLoop(dt => {
  if (gameOver) { renderer.render(); return }   // 死亡：停戰鬥更新，只渲染
  const inRail = (seq.current === 'rail1' || seq.current === 'rail2boss') && rail
  if (inRail) {
    rail.controller.update(dt)
  } else if (seq.current === 'free' && free) {
    free.controller.update(dt)
    const cam = renderer.camera.position
    for (const en of free.enemies) {
      if (!en.alive) continue
      const r = stepAI(en, { x: cam.x, z: cam.z }, dt, MISSION.free.enemy.ai)
      const c = clampFreePos(r.x, r.z)   // 過巷弄碰撞（沿障礙滑）
      en.x = c.x; en.z = c.z; en.cooldown = r.cooldown
      en.bb.sprite.position.set(en.x, 0.95, en.z)
      en.bb.faceFrame(0, cam, en.bb.sprite.position)
      if (r.fired) damagePlayer(1)   // free 敵開火命中（功能性首版：無可見彈丸，威脅即命中，待平衡）
    }
    // 走到巷尾出口 → 進下一段（rail2boss）
    if (inside(free.exitTrigger, cam)) seq.next()
  }
  renderer.render()
  // render 後矩陣最新 → 投影 lock 圈（只 rail 有；其餘段自清空）
  if (inRail) updateRailLockRings()
  else hud.updateLockOns([])
})
loop.start()

// debug 出口
window.__dl = {
  seq, save, i18n, renderer, shooter, hud, player,
  damagePlayer, tryFire, updateRailLockRings,
  get score() { return hud.score },
  get gameOver() { return gameOver },
  get free() { return free },
  get rail() { return rail },
}
