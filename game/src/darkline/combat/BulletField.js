// game/src/darkline/combat/BulletField.js
// 自由段的敵彈丸場：讓自由段「開火跟軌道段一樣」——可見彈丸朝相機飛、抵達才命中、
// 飛行中可被玩家射落。重用 production 的 Projectile（飛行/命中/取消邏輯）與 EnemyManager
// 的 driftDirectionFromYaw / 命中率常數，視覺常數對齊 rail（同色同半徑同放大）。
// 軌道段的等價物是 EnemyManager 內建的 projectiles；這裡是自由段的輕量對應。
import * as THREE from 'three'
import { Projectile, HIT_RATE_BY_DIFFICULTY, rollHit, aimPoint } from '../../gameplay/Projectile.js'
import { driftDirectionFromYaw } from '../../gameplay/EnemyManager.js'

const BULLET_RADIUS = 0.18      // = EnemyManager PROJECTILE_RADIUS（與 rail 一致）
const BULLET_NEAR_SCALE = 3     // = EnemyManager PROJECTILE_NEAR_SCALE
const BULLET_COLOR = 0xffffcc

export class BulletField {
  /**
   * @param {THREE.Scene} scene
   * @param {THREE.Camera} camera
   * @param {{difficulty?:string, rng?:()=>number, onHit?:()=>void}} [opts]
   *        onHit：彈丸抵達且 willHit 時呼叫（接 damagePlayer）。
   */
  constructor(scene, camera, { difficulty = 'normal', rng = Math.random, onHit } = {}) {
    this.scene = scene
    this.camera = camera
    this.difficulty = difficulty
    this.rng = rng
    this.onHit = onHit
    /** @type {Projectile[]} */
    this.bullets = []
  }

  /**
   * 從 origin（世界座標）朝玩家（相機）開一發。命中/miss 在發射時就 roll 定（決定性）。
   * @param {{x:number,y:number,z:number}} origin
   * @returns {Projectile}
   */
  fireAt(origin) {
    const rate = HIT_RATE_BY_DIFFICULTY[this.difficulty] ?? HIT_RATE_BY_DIFFICULTY.normal
    const willHit = rollHit(rate, this.rng)
    const cam = this.camera.position
    const yaw = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ').y
    const target = aimPoint(cam, driftDirectionFromYaw(yaw), willHit)   // miss 側偏掠過
    const p = new Projectile({ origin, target, willHit })
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BULLET_RADIUS, 8, 8),
      new THREE.MeshBasicMaterial({ color: BULLET_COLOR }),
    )
    mesh.position.set(origin.x, origin.y, origin.z)
    mesh.userData.projectileRef = p   // 讓 resolveProjectile 能認出 → 共用射落判定
    p.mesh = mesh
    this.scene.add(mesh)
    this.bullets.push(p)
    return p
  }

  /** @param {number} dt 推進飛行；抵達且 willHit → onHit；飛過/射落/取消 → 退場。 */
  update(dt) {
    for (const p of this.bullets) {
      p.update(dt)
      if (p.arrived && !p.resolved) {
        p.resolved = true
        if (p.willHit) this.onHit?.()
      }
      if (p.mesh) {
        const pos = p.position
        p.mesh.position.set(pos.x, pos.y, pos.z)
        p.mesh.scale.setScalar(1 + p.progress * (BULLET_NEAR_SCALE - 1))   // 近相機放大
      }
    }
    this.bullets = this.bullets.filter(p => {
      if (p.isDone()) { if (p.mesh) this.scene.remove(p.mesh); return false }
      return true
    })
  }

  /** @returns {THREE.Object3D[]} 可被玩家 raycast 射落的在途彈丸 mesh */
  meshes() { return this.bullets.filter(p => !p.isDone() && p.mesh).map(p => p.mesh) }

  /** 退場全部（離開自由段時清乾淨）。 */
  clear() {
    for (const p of this.bullets) if (p.mesh) this.scene.remove(p.mesh)
    this.bullets = []
  }
}
