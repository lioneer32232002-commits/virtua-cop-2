import * as THREE from 'three'
import { Renderer } from '../render/Renderer.js'
import { setAtmosphere, DUSK_TAIPEI, DUSK_HARBOR } from '../render/sky.js'
import { WeaponViewModel } from '../render/WeaponViewModel.js'
import { GameLoop } from '../GameLoop.js'
import { I18n } from './core/i18n.js'
import { pickLang, dictFor } from './core/lang.js'
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
import { BulletField } from './combat/BulletField.js'
import { BillboardSprite } from './combat/BillboardSprite.js'
import { billboardZone } from './combat/billboardZone.js'
import { rollMagDrop } from './combat/ammoDrop.js'
import { loadImage, processToCanvas } from './combat/buildSprite.js'
import { RailController } from './mission/RailController.js'
import { resolveEnemy, zoneOfHit, resolveProjectile } from '../gameplay/EnemyManager.js'
import { Enemy } from '../gameplay/Enemy.js'
import { buildOriginalEnvironment, TAIPEI1950S_PRESET, HARBOR_PRESET } from '../scene/OriginalEnvironment.js'
import { loadEnemyModels } from '../gameplay/EnemyModelLoader.js'
import { renderCard } from './core/cards.js'
import { HUD } from '../hud/HUD.js'
import { PlayerState } from './core/PlayerState.js'
import { mountMenu } from './ui/menu.js'
import { makePuzzle } from './intel/decode.js'
import { mountDecodePanel } from './intel/DecodePanel.js'

const params = new URLSearchParams(location.search)
const lang = pickLang({ query: params.get('lang'), stored: globalThis.localStorage?.getItem('darkline.lang') })
const i18n = new I18n(dictFor(lang))
const renderer = new Renderer(document.getElementById('c'), { cinematic: true })
const save = new SaveStore()
const dom = document.getElementById('c')
const canvas = dom.querySelector('canvas') || dom   // pointerlock 鎖在真 canvas 上（見 f41ba65）
const crosshair = document.getElementById('crosshair')
const hint = document.getElementById('hint')
const overlay = document.getElementById('overlay')
// 情報解碼面板（自由段按 E 開）。開啟期間暫停戰鬥/輸入、解除 pointerlock。
const decode = mountDecodePanel(document.getElementById('decode'), { i18n })
const shooter = new Shooter(renderer.camera)
// free 段有限彈藥設定（彈匣大小、起始備彈、換彈耗時、掉落率/保底/撿取半徑）。
const FREE_AMMO = MISSION.free.ammo
const hud = new HUD(document.getElementById('hud'), { maxHealth: 5, maxAmmo: FREE_AMMO.magSize })
const player = new PlayerState({ maxHealth: 5, maxAmmo: FREE_AMMO.magSize, reserveMags: FREE_AMMO.startReserveMags, reloadTime: FREE_AMMO.reloadTime })
// 玩家 M1911 view model（primitive 剪影＋後座力，重用引擎類別）。掛在相機上 → 軌道/自由
// 兩段都跟著相機固定在右下；不在 raycast 目標列表，故不擋射擊。
const weapon = new WeaponViewModel()
weapon.attachTo(renderer.camera)
// three.js 只渲染 scene 後代 → 相機要進 scene graph，掛在相機上的 view model 才會被畫出來。
renderer.scene.add(renderer.camera)
const BASE_KILL = 100        // 佔位基礎擊殺分（待平衡）
const JUSTICE_BONUS = 200    // 繳械（justice shot）獎勵，同 VC2
const SHOOTDOWN_SCORE = 50   // 射落在途彈丸分（VC2 佔位，待考證）
let free = null   // { controller, group, layout, enemies[], intelMesh, scrapMesh, bullets, exitTrigger, intelTaken, keyFound, mags[], killsSinceDrop }
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

function showOverlay(titleKey, bodyKey, continueKey = 'brief.continue', vars) {
  overlay.classList.remove('hidden')
  renderCard(overlay, i18n, titleKey, bodyKey, vars)
  if (continueKey) overlay.querySelector('p').textContent += '\n\n' + i18n.t(continueKey)
  // 重觸發淡入動畫（每頁/每次顯示都淡入，電報字卡逐張浮現）。
  overlay.classList.remove('fade'); void overlay.offsetWidth; overlay.classList.add('fade')
}
function hideOverlay() { overlay.classList.add('hidden') }

// 接縫/拾取故事卡：在兩段之間或自由段內演一張單頁卡，按 N 收卡才執行續行動作。
// 非 null 期間暫停戰鬥/AI/彈丸更新（見 GameLoop 閘）。
let pendingCard = null   // { onContinue }
function showStoryCard(titleKey, bodyKey, vars, onContinue) {
  pendingCard = { onContinue }
  setInputMode('none')
  showOverlay(titleKey, bodyKey, 'brief.more', vars)
}

// 多頁字卡（簡報/結尾）：N 翻頁，末頁 N 進下一段。最後一頁用各自的收尾提示
// （簡報＝出發；結尾＝無提示，任務已結束）。
const CARD_PAGES = {
  briefing: { title: 'brief.title', bodies: ['brief.body', 'brief.body2'], last: 'brief.continue' },
  ending:   { title: 'ending.title', bodies: ['ending.body', 'ending.body2'], last: null },
}
let pager = null   // { seg, idx, title, bodies, last }
function showCardSeg(seg) {
  const p = CARD_PAGES[seg]
  pager = { seg, idx: 0, ...p }
  renderPage()
}
function renderPage() {
  const isLast = pager.idx === pager.bodies.length - 1
  showOverlay(pager.title, pager.bodies[pager.idx], isLast ? pager.last : 'brief.more')
}
// 回 true＝吃掉這次 N（翻到下一頁）；false＝已是末頁，交給呼叫端 seq.next()。
function advancePage() {
  if (!pager || (pager.seg !== seq.current)) return false
  if (pager.idx < pager.bodies.length - 1) { pager.idx++; renderPage(); return true }
  return false
}

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

// 一發子彈的彈藥閘門（分軸）。回 true＝可射擊（已耗 1 發）；false＝這一下被吃掉，不射。
// rail：空彈即時補滿（VC2「off-screen reload」街機手感，不耗備彈）。
function tryFireRail() {
  if (gameOver) return false
  if (player.ammo <= 0) { player.reload(); hud.setAmmo(player.ammo); return false }
  player.consumeAmmo()
  hud.setAmmo(player.ammo)
  return true
}
// free：空彈啟動計時換彈（耗 1 備彈匣，換彈空檔不能射）；右鍵亦可提前換彈。
function tryFireFree() {
  if (gameOver) return false
  if (player.reloading) return false
  if (player.ammo <= 0) { player.startReload(); hud.setReloading(player.reloading); return false }
  player.consumeAmmo()
  hud.setAmmo(player.ammo)
  return true
}

// ── 自由段（取代 Phase A 的 freeStub）──────────────────────────────────────
async function enterFree() {
  // 為日後多 free 段：每次進自由段重置備彈匣與換彈狀態（單一 free 段時等同 boot 初值，
  // 行為不變；多段時避免上一段的殘餘備彈/換彈中狀態帶進下一段）。
  player.reserveMags = FREE_AMMO.startReserveMags
  player.reloading = false
  const layout = buildAlleyLayout(MISSION.free.alleySeed)
  const group = buildAlleyGroup(layout)
  renderer.scene.add(group)
  setAtmosphere(renderer.scene, renderer.sky, DUSK_TAIPEI)
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
    // 每隻附一個 Enemy 實例承載部位傷害狀態（hp/disarmed/justiceShot/slowed）。free 的
    // 移動/開火由 WanderAI 驅動（不靠 lock 計時），故 attackInterval 設大、不呼叫 ref.update()。
    const ref = new Enemy({ type: 'gunman', hp: MISSION.free.enemy.hp, emergeTime: 0, attackInterval: 999 })
    ref.state = 'visible'
    return { bb, ref, x: sp.x, z: sp.z, cooldown: 1, alive: true }
  })

  // 情報點（小發光方塊，按 E 拾取）
  const intelMesh = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4),
    new THREE.MeshBasicMaterial({ color: 0x6ad0ff }))
  intelMesh.position.set(layout.intel.x, 0.6, layout.intel.z)
  renderer.scene.add(intelMesh)

  // 死信箱紙片（鑰匙來源；按 E 拾取，比情報點早遇到）。淡紙白小方塊。
  const scrapMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.06, 0.22),
    new THREE.MeshBasicMaterial({ color: 0xf0e6c0 }))
  scrapMesh.position.set(layout.scrap.x, 0.5, layout.scrap.z)
  renderer.scene.add(scrapMesh)

  // 自由段敵彈丸場（跟軌道段一樣：可見彈丸朝相機飛、抵達才命中、可被射落）
  const bullets = new BulletField(renderer.scene, renderer.camera, {
    difficulty: 'normal',
    onHit: () => damagePlayer(1),
  })

  free = { controller, group, layout, enemies, intelMesh, scrapMesh, bullets, exitTrigger: layout.exitTrigger,
           intelTaken: false, keyFound: false, mags: [], killsSinceDrop: 0 }
  for (const sp of (MISSION.free.supplyPoints ?? [])) spawnMag(sp.x, sp.z)   // 固定補給點（各補 1 匣）
  hud.setReserve(player.reserveMags)   // free 段初始備彈匣顯示
}

function exitFree() {
  if (!free) return
  free.controller.detach()
  renderer.scene.remove(free.group)
  free.enemies.forEach(e => renderer.scene.remove(e.bb.sprite))
  renderer.scene.remove(free.intelMesh)
  if (free.scrapMesh) renderer.scene.remove(free.scrapMesh)
  free.mags.forEach(m => renderer.scene.remove(m))
  free.bullets.clear()
  free = null
}

function inside(trigger, p) {
  return p.x > trigger.minX && p.x < trigger.maxX && p.z > trigger.minZ && p.z < trigger.maxZ
}
function clampFreePos(x, z) {
  return clampToSegments({ x, z }, free.layout.segments, free.layout.obstacles, 0.3)
}

// free 段彈夾 mesh（小金色方塊）：擊殺掉落或固定補給點都用這個 spawn，走近自動撿。
function spawnMag(x, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.18),
    new THREE.MeshBasicMaterial({ color: 0xffe000 }))
  m.position.set(x, 0.4, z)
  renderer.scene.add(m)
  free.mags.push(m)
}

// ── 軌道段（重用 CameraRig + EnemyManager + Boss）──────────────────────────────
async function enterRail(key) {
  const data = MISSION[key]
  const env = buildOriginalEnvironment(PRESETS[data.preset])
  renderer.scene.add(env)
  setAtmosphere(renderer.scene, renderer.sky, data.preset === 'harbor' ? DUSK_HARBOR : DUSK_TAIPEI)
  if (!enemyModels) enemyModels = await loadEnemyModels()   // 程序人形（含 zone）
  const controller = new RailController(renderer.scene, renderer.camera, data, {
    models: enemyModels,
    difficulty: 'normal',
    onComplete: () => {                          // 相機到底 + 全清
      if (key === 'rail1') showStoryCard('card.dropoff.title', 'card.dropoff.body', undefined, () => seq.next())
      else seq.next()                            // rail2boss → 直接進 ending
    },
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
  if (seg === 'briefing' || seg === 'ending') showCardSeg(seg)
  else hideOverlay()
  if (seg === 'rail1' || seg === 'rail2boss') {
    await enterRail(seg)   // RailController 接管相機
    // rail 分軸：無限即時換彈、不顯備彈匣 → 清掉 free 段殘留的備彈/換彈顯示。
    hud.setReloading(false)
    const el = hud._container.querySelector('#reserve-mags'); if (el) el.textContent = ''
  } else if (seg === 'free') await enterFree()
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
function continueFromSave() {
  hud.addScore(saved.score ?? 0)   // HUD 從 0 起，加回存檔分數
  seq.jumpTo(saved.segment)
}
if (params.has('resume') && saved?.segment) {
  continueFromSave()   // game-over「按 R 重來」路徑：跳過選單，直接續關
} else {
  // boot 先進選單（開始／繼續／中英切換）。選單蓋在 overlay(8) 之上(z=10)，期間輸入關閉。
  setInputMode('none')
  const menu = mountMenu(document.getElementById('menu'), {
    i18n, lang, hasSave: !!saved?.segment,
    onStart: () => { menu.hide(); applySegment(seq.current) },        // 收選單 → 進 briefing
    onContinue: () => { menu.hide(); continueFromSave() },            // 收選單 → 跳存檔點
    onLang: next => {                                                 // 最簡：寫 storage + reload 帶 ?lang=
      globalThis.localStorage?.setItem('darkline.lang', next)
      location.href = '?lang=' + next   // boot 的 pickLang 會重選字典、選單以新語言重繪
    },
  })
}

window.addEventListener('keydown', e => {
  if (decode.isOpen) return   // 解碼中：N/R 不作用（面板自管 ← → / Enter / Esc）
  if (e.code === 'KeyN' && !gameOver) {
    if (pendingCard) { const cont = pendingCard.onContinue; pendingCard = null; hideOverlay(); cont?.(); return }
    if (!advancePage()) seq.next()   // 多頁字卡：先翻頁，末頁才進下一段
  }
  // game-over：R 從最近存檔點重來（無存檔則整輪重啟）
  else if (e.code === 'KeyR' && gameOver) location.href = save.load() ? '?resume' : location.pathname
})

// 情報解碼（E，需走近）：開解碼面板，解出才得分 + 揭露線索（餵結尾 1996 鉤子）。
function openDecode() {
  // 同任務固定謎題（決定性，承 alleySeed）；與紙片共用同一道 → 紙片教的對應正好是面板要對齊的。
  const puzzle = makePuzzle(MISSION.free.alleySeed)
  setInputMode('none')   // 暫解除 pointerlock，游標可點轉盤/確認/收起
  decode.open(puzzle, {
    keyFound: !!free?.keyFound,
    onSolve: () => {
      if (free?.intelTaken) return
      free.intelTaken = true
      hud.addScore(MISSION.free.intelScore)
      if (free.intelMesh) free.intelMesh.visible = false
      hint.textContent = i18n.t('hud.intel')
    },
    // 收起 → 復原自由段 pointerlock（仍在 free 且未死亡時）。
    onClose: () => { if (!gameOver && seq.current === 'free') setInputMode('pointerlock') },
  })
}

// 拾死信箱紙片 → 設 keyFound、移除 mesh、演鑰匙故事卡（含 crib 對應，與解碼面板共用同謎題）。
function takeScrap() {
  free.keyFound = true
  if (free.scrapMesh) { renderer.scene.remove(free.scrapMesh); free.scrapMesh = null }
  const puzzle = makePuzzle(MISSION.free.alleySeed)
  showStoryCard('scrap.title', 'scrap.body', { c: puzzle.crib.cipher, p: puzzle.crib.plain },
    () => { if (!gameOver && seq.current === 'free') setInputMode('pointerlock') })
}
window.addEventListener('keydown', e => {
  if (e.code !== 'KeyE' || gameOver || decode.isOpen || pendingCard) return
  if (seq.current !== 'free' || !free) return
  const cam = renderer.camera.position
  // 先判紙片（鑰匙，較靠入口）：未拾且走近 → 拾取。
  if (!free.keyFound) {
    const ds = Math.hypot(cam.x - free.layout.scrap.x, cam.z - free.layout.scrap.z)
    if (ds < 1.6) { takeScrap(); return }
  }
  // 再判情報密件：未取且走近 → 開解碼面板。
  if (!free.intelTaken) {
    const di = Math.hypot(cam.x - free.layout.intel.x, cam.z - free.layout.intel.z)
    if (di < 1.6) openDecode()
  }
})

// 左鍵射擊（pointerlock 下準心置中 NDC=(0,0)，過磁吸）
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || seq.current !== 'free' || !free || decode.isOpen) return
  if (!tryFireFree()) return   // free 彈藥閘門（空彈＝啟動計時換彈，這下不射）
  weapon.fire()                // M1911 後座力
  const live = free.enemies.filter(en => en.alive)
  const targets = live.map(en => {
    const v = en.bb.sprite.position.clone().project(renderer.camera)
    return { x: v.x, y: v.y, ref: en }
  })
  const aim = assistAim({ x: 0, y: 0 }, targets, MISSION.free.assist)
  // 對敵 sprite 與在途彈丸一起 raycast，最近者勝（同軌道段）。
  const hits = shooter.getHits(aim, [...live.map(en => en.bb.sprite), ...free.bullets.meshes()])
  if (!hits.length) return
  // 最近是在途彈丸 → 射落（+分、不傷敵）
  const proj = resolveProjectile(hits[0].object)
  if (proj) { proj.shootDown(); hud.addScore(SHOOTDOWN_SCORE); return }
  const en = free.enemies.find(en => en.bb.sprite === hits[0].object)
  if (en && en.alive) {
    // 命中點相對 sprite 中心 → 部位（上=head/下=leg/中段外=hand/其餘=body），交給 Enemy.hit。
    const zone = billboardZone(hits[0].point, en.bb.sprite.position, { worldSize: MISSION.free.enemy.worldSize })
    en.ref.hit(1, zone)   // head=即死 / hand=繳械不致死 / leg=減速不致死 / body=一般
    if (en.ref.justiceShot && !en._dlJustice) { en._dlJustice = true; hud.addScore(JUSTICE_BONUS) }
    // 計分用 _dlScored 旗標防重複（與 rail 段 enemy._dlScored 一致；en.alive 另管渲染/AI）。
    if (en.ref.hp <= 0 && !en.ref._dlScored) {
      en.ref._dlScored = true
      en.alive = false; en.bb.sprite.visible = false; hud.addScore(BASE_KILL)
      // 擊殺掉彈夾：基率 dropRate，連續未掉 pityThreshold 次保底；掉了就 spawn 在敵人腳下。
      const { drop } = rollMagDrop(
        { killsSinceDrop: free.killsSinceDrop, dropRate: FREE_AMMO.dropRate, pityThreshold: FREE_AMMO.pityThreshold },
        Math.random)
      if (drop) { spawnMag(en.x, en.z); free.killsSinceDrop = 0 } else { free.killsSinceDrop += 1 }
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
  if (e.button !== 0 || !rail || decode.isOpen) return
  if (!tryFireRail()) return   // rail 彈藥閘門（射不射都算開火；空彈＝這下即時補滿不射）
  weapon.fire()                // M1911 後座力
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
  if (gameOver || decode.isOpen) return
  // free：計時換彈（耗備彈匣）；rail：即時補滿（街機）。
  if (seq.current === 'free') { player.startReload(); hud.setReloading(player.reloading) }
  else { player.reload(); hud.setAmmo(player.ammo) }
})

// ── 軌道段 lock-on 圈：投影有相位的敵人到螢幕 → HUD（只 rail 有；其餘段清空）─────────
// 用敵人 world bounding box 算圈：中心＝bbox 中心（自動置中軀幹，含 boss）、直徑＝投影身高
// （大目標大圈、遠處小圈），解決「boss 圈不變大、落下半身」。
const _box = new THREE.Box3()
const _ctr = new THREE.Vector3()
const _top = new THREE.Vector3()
function updateRailLockRings() {
  if (!rail) { hud.updateLockOns([]); return }
  const vp = { width: window.innerWidth, height: window.innerHeight }
  const cam = renderer.camera
  const locks = projectThreats(rail.controller.activeThreats(), en => {
    if (!en.mesh) return null
    _box.setFromObject(en.mesh)
    if (_box.isEmpty()) return null
    _box.getCenter(_ctr)
    _top.set(_ctr.x, _box.max.y, _ctr.z)        // bbox 頂端（同 x/z）→ 量投影身高
    _ctr.project(cam)
    if (_ctr.z > 1) return null                 // 相機後方 → 不畫
    _top.project(cam)
    const halfPx = Math.abs(_top.y - _ctr.y) * 0.5 * vp.height   // 中心→頂端的螢幕半高(px)
    const size = Math.max(28, halfPx * 2 * 1.18)                 // 圈直徑＝投影身高 ×1.18（略大於身形）
    return { x: _ctr.x, y: _ctr.y, size }
  }, vp)
  hud.updateLockOns(locks)
}

const loop = new GameLoop(dt => {
  weapon.update(dt)                             // M1911 後座力衰減（每段都推進）
  if (gameOver) { renderer.render(); return }   // 死亡：停戰鬥更新，只渲染
  if (decode.isOpen) { renderer.render(); return }   // 解碼中：暫停戰鬥/AI/彈丸，只渲染
  if (pendingCard) { renderer.render(); return }   // 故事卡演出中：暫停戰鬥/AI/彈丸，只渲染
  const inRail = (seq.current === 'rail1' || seq.current === 'rail2boss') && rail
  if (inRail) {
    rail.controller.update(dt)
  } else if (seq.current === 'free' && free) {
    free.controller.update(dt)
    const cam = renderer.camera.position
    for (const en of free.enemies) {
      if (!en.alive) continue
      en.slowed = en.ref.slowed   // 腿傷拖慢移動（leg zone → WanderAI 讀 s.slowed）
      const r = stepAI(en, { x: cam.x, z: cam.z }, dt, MISSION.free.enemy.ai)
      const c = clampFreePos(r.x, r.z)   // 過巷弄碰撞（沿障礙滑）
      en.x = c.x; en.z = c.z; en.cooldown = r.cooldown
      en.bb.sprite.position.set(en.x, 0.95, en.z)
      en.bb.faceFrame(0, cam, en.bb.sprite.position)
      // 開火 → 發一發可見彈丸朝相機飛（抵達才命中，跟軌道段同一套；origin 抬到軀幹高）。
      // 繳械（hand/justice shot）後不再開火（spec §2：手＝繳械不再開火）；free 敵不跑
      // Enemy.update 的 disarmed 閘，故在此明確擋掉。
      if (r.fired && !en.ref.disarmed) free.bullets.fireAt({ x: en.x, y: 1.1, z: en.z })
    }
    free.bullets.update(dt)   // 推進在途彈丸（抵達 onHit→damagePlayer、飛過/射落退場）
    player.updateReload(dt)   // 推進 free 計時換彈；完成時補滿並耗 1 備彈匣
    if (!player.reloading) hud.setReloading(false)
    hud.setAmmo(player.ammo)
    // 走近彈夾自動撿取（補 1 備彈匣 + 移除 mesh + 更新 HUD）
    for (let i = free.mags.length - 1; i >= 0; i--) {
      const m = free.mags[i]
      if (Math.hypot(cam.x - m.position.x, cam.z - m.position.z) < FREE_AMMO.pickupRadius) {
        player.addMag(1); hud.setReserve(player.reserveMags)
        renderer.scene.remove(m); free.mags.splice(i, 1)
      }
    }
    // 走到巷尾出口 → 演上車卡，按 N 才趕赴碼頭（進 rail2boss）。pendingCard 一設、
    // 下一幀 loop 開頭的閘就擋住，不會重觸發。
    if (inside(free.exitTrigger, cam)) showStoryCard('card.embark.title', 'card.embark.body', undefined, () => seq.next())
  }
  renderer.render()
  // render 後矩陣最新 → 投影 lock 圈（只 rail 有；其餘段自清空）
  if (inRail) updateRailLockRings()
  else hud.updateLockOns([])
})
loop.start()

// debug 出口
window.__dl = {
  seq, save, i18n, renderer, shooter, hud, player, loop, weapon, decode, openDecode,
  damagePlayer, tryFireRail, tryFireFree, updateRailLockRings,
  get score() { return hud.score },
  get gameOver() { return gameOver },
  get free() { return free },
  get rail() { return rail },
}
