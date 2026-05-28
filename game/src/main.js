import * as THREE from 'three'
import { Renderer } from './render/Renderer.js'
import { GameLoop } from './GameLoop.js'
import { CameraRig } from './render/CameraRig.js'
import { InputManager } from './input/InputManager.js'
import { Shooter } from './gameplay/Shooter.js'
import { EnemyManager } from './gameplay/EnemyManager.js'
import { StageEnvironment } from './scene/StageEnvironment.js'
import { HUD } from './hud/HUD.js'
import { LevelLoader } from './level/LevelLoader.js'
import { LevelDirector } from './level/LevelDirector.js'
import { GameManager, GameState } from './GameManager.js'
import { AudioManager } from './audio/AudioManager.js'

// ─── Global singletons ──────────────────────────────────────────────────────
const container = document.getElementById('canvas-container')
const hudEl = document.getElementById('hud')

const renderer  = new Renderer(container)
const input     = new InputManager()
const shooter   = new Shooter(renderer.camera)
const enemyMgr  = new EnemyManager(renderer.scene)
const hud       = new HUD(hudEl, { maxHealth: 5, maxAmmo: 6 })
const gameMgr   = new GameManager()
const audio     = new AudioManager()
let cameraRig   = null
let director    = null
let environment = null

// ─── Shooting ────────────────────────────────────────────────────────────────
input.onShoot(() => {
  if (gameMgr.state !== GameState.PLAYING) return
  if (!gameMgr.consumeAmmo()) { hud.setAmmo(0); return }
  hud.setAmmo(gameMgr.ammo)

  audio.gunshot()
  const hits = shooter.getHits(input.mouse, enemyMgr.getActiveMeshes())
  if (hits.length > 0) {
    const enemy = hits[0].object.userData.enemyRef
    if (enemy) {
      enemy.hit(1)
      audio.enemyHit()
      hud.addScore(enemy.type === 'boss' ? 500 : 100)
      hud.updateHiScore()
    }
  }

  // Auto-reload when empty
  if (gameMgr.ammo === 0) {
    gameMgr.reload()
    setTimeout(() => { hud.setAmmo(gameMgr.maxAmmo) }, 500)
  }
})

// ─── Enemy damage to player ──────────────────────────────────────────────────
enemyMgr.onEnemyAttack = (dmg) => {
  audio.playerHit()
  const dead = gameMgr.takeDamage(dmg)
  hud.setHealth(gameMgr.health)
  if (dead) {
    gameMgr.onPlayerDead()
    showOverlay('dead')
  }
}

// ─── Stage loading ───────────────────────────────────────────────────────────
async function loadStage(stageId, difficulty) {
  const level = await LevelLoader.load(stageId)

  if (environment) environment.dispose()
  enemyMgr.clear()
  hideOverlay()

  environment = new StageEnvironment(renderer.scene, level.environment)

  const pts = level.railPath.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  cameraRig = new CameraRig(renderer.camera, pts, level.duration)

  director = new LevelDirector(level, {
    onSpawnWave: (wave) => enemyMgr.spawnWave(wave.enemies),
    onClearPoint: () => {
      audio.clearPoint()
      gameMgr.onClearPoint()
      cameraRig.pause()
    },
    onBoss: (boss) => enemyMgr.spawnWave([boss]),
    onComplete: () => {
      audio.stageClear()
      gameMgr.onStageClear()
      showOverlay('clear')
    },
  })

  gameMgr.startStage(stageId, difficulty)
  hud.reset(true)
  hud.setHealth(gameMgr.maxHealth)
  hud.setAmmo(gameMgr.maxAmmo)
}

// ─── Main loop ───────────────────────────────────────────────────────────────
const loop = new GameLoop((dt) => {
  if (gameMgr.state === GameState.PLAYING || gameMgr.state === GameState.CLEAR_POINT) {
    director?.update(dt)
    cameraRig?.advance(dt)
    enemyMgr.update(dt)

    // Resume from clear point when all enemies dead
    if (gameMgr.state === GameState.CLEAR_POINT && enemyMgr.aliveCount() === 0) {
      gameMgr.onAllEnemiesDead()
      director?.resume()
      cameraRig?.resume()
    }
  }
  renderer.render()
})

// ─── Overlay UI ──────────────────────────────────────────────────────────────
function buildOverlays() {
  const overlay = document.createElement('div')
  overlay.id = 'overlay'
  overlay.style.cssText = [
    'display:none', 'position:fixed', 'inset:0', 'background:rgba(0,0,0,0.80)',
    'color:#fff', 'font:bold 20px monospace', 'flex-direction:column',
    'align-items:center', 'justify-content:center', 'gap:20px', 'z-index:10',
  ].join(';')
  overlay.innerHTML = `
    <div id="overlay-title" style="font-size:40px;letter-spacing:4px"></div>
    <div id="overlay-sub" style="color:#aaa;font-size:14px"></div>
    <div style="display:flex;gap:12px;margin-top:8px">
      <button data-stage="stage1">Stage 1</button>
      <button data-stage="stage2">Stage 2</button>
      <button data-stage="stage3">Stage 3</button>
    </div>
    <div style="display:flex;gap:12px">
      <button data-diff="easy">Easy</button>
      <button data-diff="normal" style="color:#ff0">Normal ★</button>
      <button data-diff="hard">Hard</button>
    </div>
    <div id="overlay-hint" style="color:#666;font-size:12px;margin-top:4px">Click screen or press ENTER to start</div>
  `
  const btnStyle = 'padding:8px 20px;background:#333;color:#fff;border:2px solid #666;cursor:pointer;font:inherit;'
  overlay.querySelectorAll('button').forEach(b => { b.style.cssText = btnStyle })
  document.body.appendChild(overlay)

  let selectedStage = 'stage1'
  let selectedDiff  = 'normal'

  overlay.addEventListener('click', (e) => {
    const btn = e.target.closest('button')
    if (btn?.dataset.stage) { selectedStage = btn.dataset.stage; return }
    if (btn?.dataset.diff)  { selectedDiff  = btn.dataset.diff;  return }
    // Click anywhere else on overlay = start
    if (gameMgr.state !== GameState.PLAYING) startGame(selectedStage, selectedDiff)
  })

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && gameMgr.state !== GameState.PLAYING) {
      startGame(selectedStage, selectedDiff)
    }
  })
}

function startGame(stage, diff) {
  hideOverlay()
  loadStage(stage, diff)
  loop.resume()
}

function showOverlay(mode) {
  const overlay = document.getElementById('overlay')
  if (!overlay) return
  overlay.style.display = 'flex'
  const title = overlay.querySelector('#overlay-title')
  const sub   = overlay.querySelector('#overlay-sub')
  const hint  = overlay.querySelector('#overlay-hint')
  if (mode === 'menu') {
    title.textContent = 'VIRTUA COP 2'
    sub.textContent   = 'Select stage and difficulty'
    hint.textContent  = 'Click screen or press ENTER to start'
  } else if (mode === 'dead') {
    title.textContent = 'GAME OVER'
    sub.textContent   = ''
    hint.textContent  = 'Click screen or press ENTER to return to menu'
    gameMgr.toMenu()
  } else if (mode === 'clear') {
    title.textContent = 'STAGE CLEAR'
    sub.textContent   = `Score: ${String(hud.score).padStart(5, '0')}`
    hint.textContent  = 'Click screen or press ENTER for menu'
    gameMgr.toMenu()
  }
}

function hideOverlay() {
  const el = document.getElementById('overlay')
  if (el) el.style.display = 'none'
}

// ─── Boot ────────────────────────────────────────────────────────────────────
buildOverlays()
showOverlay('menu')
loop.start()
loop.pause() // paused until stage selected
