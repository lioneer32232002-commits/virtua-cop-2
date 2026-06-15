// game/src/darkline/mission/RailController.js
// 驅動「一段軌道」：CameraRig curve 沿 path 推進相機；到每個 wave.time spawn 該波；
// clearPoint 波未清完前凍結相機「與計時」（對齊 production LevelDirector：paused→計時停，
// 慢戰不會讓下一波/boss 提早觸發）；boss 用 BossController 跑階段。重用 game/ 引擎的
// CameraRig / EnemyManager / BossController。段落結束＝相機推到底（progress≥1）且全清。
import * as THREE from 'three'
import { CameraRig } from '../../render/CameraRig.js'
import { EnemyManager } from '../../gameplay/EnemyManager.js'
import { BossController } from '../../gameplay/BossController.js'

export class RailController {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.PerspectiveCamera} camera
   * @param {object} railData MISSION.rail1 / MISSION.rail2boss
   * @param {object} [opts] { models, difficulty, onComplete, onEnemyAttack, onBossPhase }
   */
  constructor(scene, camera, railData, opts = {}) {
    this.scene = scene; this.camera = camera; this.data = railData; this.opts = opts
    const waypoints = railData.path.map(p => new THREE.Vector3(p[0], p[1], p[2]))
    this.rig = new CameraRig(camera, waypoints, railData.duration)
    // 灌入程序人形 model（含 head/body/hand zone）——空 map 會 fallback 成無 zone 的裸
    // 色塊，爆頭/justice 判定就失效（zoneOfHit 永遠回 body）。對齊 production main.js。
    this.enemies = new EnemyManager(scene, opts.models ?? new Map(), camera)
    this.enemies.difficulty = opts.difficulty ?? 'normal'
    this.enemies.onEnemyAttack = opts.onEnemyAttack ?? (() => {})
    this._waves = railData.waves.map(w => ({ ...w, fired: false }))
    this._boss = railData.boss ? { ...railData.boss, fired: false } : null
    this.bossController = null
    this._elapsed = 0
    this._done = false
    // 先把相機擺到 path 起點，免得進段第一幀閃過上一段的 pose（rig.advance 下幀接管）。
    if (waypoints.length) {
      camera.position.copy(waypoints[0])
      const look = waypoints[1] ?? waypoints[0]
      camera.lookAt(look.x, look.y, look.z)
    }
  }

  /** @param {number} dt seconds */
  update(dt) {
    if (this._done) return
    // 任一已觸發的 clearPoint 波（或 boss）尚有存活敵人 → 閘門：同時凍結相機與計時。
    const gating = this._waves.some(w => w.fired && w.clearPoint) || !!this._boss?.fired
    const blocked = gating && this.enemies.aliveCount() > 0

    if (blocked) {
      this.rig.pause()
    } else {
      this.rig.resume()
      this._elapsed += dt
      for (const w of this._waves) {
        if (!w.fired && this._elapsed >= w.time) {
          w.fired = true
          this.enemies.spawnWave(w.enemies)
        }
      }
      if (this._boss && !this._boss.fired && this._elapsed >= this._boss.time) {
        this._boss.fired = true
        this.enemies.spawnWave([{ type: 'boss', position: this._boss.position, hp: this._boss.hp }])
        const bossEnemy = this.enemies.enemies[this.enemies.enemies.length - 1]
        this.bossController = new BossController(bossEnemy, {
          phases: this._boss.phases,
          onPhase: p => this.opts.onBossPhase?.(p, this.bossController),
        })
      }
      this.rig.advance(dt)
    }

    this.enemies.update(dt)
    if (this.bossController && !this.bossController.boss.isDead()) this.bossController.update()

    // 完成：相機到底 + 全部波次/boss 都已觸發且清空。
    const atEnd = this.rig.progress != null && this.rig.progress >= 1
    if (atEnd && this.enemies.aliveCount() === 0 &&
        this._waves.every(w => w.fired) && (!this._boss || this._boss.fired)) {
      this._done = true
      this.opts.onComplete?.()
    }
  }

  /** @returns {THREE.Object3D[]} 可被玩家 raycast 的敵人 mesh */
  enemyMeshes() { return this.enemies.getActiveMeshes() }
  /** @returns {Array} 有 lock-on 相位的活躍敵人（供 HUD 投影鎖定圈，排除 innocent/disarmed/非 VISIBLE） */
  activeThreats() { return this.enemies.enemies.filter(e => e.lockPhase) }
  /** @returns {THREE.Mesh[]} 在途彈丸 mesh（可射落，M1 暫未接） */
  projectileMeshes() { return this.enemies.getProjectileMeshes() }
  dispose() { this.enemies.clear() }
}
