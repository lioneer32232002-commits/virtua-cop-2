// 把四個未知數接成一條可跑迴圈：briefing → 短 rail → 自由房間(走+敵人+射) → 存檔 → done。
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
import { loadImage, processToCanvas } from './buildSprite.js'

installLatencyProbe()

const renderer = new Renderer(document.getElementById('c'))
const shooter = new Shooter(renderer.camera)
const save = new SaveStore()
const ROOM = { minX: -6, maxX: 6, minZ: -10, maxZ: 2 }

// 簡單房間：地板 + 燈光。
const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12),
  new THREE.MeshStandardMaterial({ color: 0x55504a }))
floor.rotation.x = -Math.PI / 2; floor.position.z = -4; renderer.scene.add(floor)
renderer.scene.add(new THREE.HemisphereLight(0xffe9c0, 0x202028, 1.1))

// 敵人 sprite（過調色盤管線；圖放 game/public/m0/enemy.png）。
let enemy = null
const ai = { x: 0, z: -8, cooldown: 1 }
const AICFG = { speed: 1.6, range: 4, fireCooldown: 1.5 }
let enemyAlive = true
async function spawnEnemy() {
  const img = await loadImage('/m0/enemy.png')
  const tex = new THREE.CanvasTexture(processToCanvas(img))
  enemy = new BillboardSprite(tex, { cols: 1, rows: 1, worldSize: 1.8 })
  enemy.sprite.position.set(ai.x, 0.9, ai.z)
  renderer.scene.add(enemy.sprite)
}

// 段落切換。
const free = new FreeRoamController(renderer.camera, document.getElementById('c'), ROOM)
const seq = new Sequencer({ onEnter: async seg => {
  document.getElementById('hint').textContent = `段落：${seg}`
  if (seg === 'rail') { renderer.camera.position.set(0, 1.6, 4) }
  if (seg === 'free') { free.attach(); await spawnEnemy(); save.save({ segment: 'free', score: 0 }) }
  if (seg === 'done') { free.detach(); document.getElementById('hint').textContent = 'DONE — 存檔已寫入，重整可見 segment=free' }
}})

window.addEventListener('keydown', e => { if (e.code === 'KeyN') seq.next() })

// 左鍵射擊：自由段時對 enemy.sprite 做 raycast。
window.addEventListener('mousedown', e => {
  if (e.button !== 0 || seq.current !== 'free' || !enemyAlive || !enemy) return
  const hits = shooter.getHits({ x: 0, y: 0 }, [enemy.sprite]) // pointerlock 下準心在中央
  if (hits.length) { enemyAlive = false; enemy.sprite.visible = false }
})

const loop = new GameLoop(dt => {
  if (seq.current === 'free') {
    free.update(dt)
    if (enemyAlive && enemy) {
      const r = stepAI(ai, renderer.camera.position, dt, AICFG)
      ai.x = r.x; ai.z = r.z; ai.cooldown = r.cooldown
      enemy.sprite.position.set(ai.x, 0.9, ai.z)
      enemy.faceFrame(0, renderer.camera.position, enemy.sprite.position)
    }
  }
  renderer.render()
})
loop.start()
window.__m0 = { seq, save, renderer, get enemyAlive() { return enemyAlive } }
