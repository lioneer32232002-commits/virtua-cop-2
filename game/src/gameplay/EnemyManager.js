import * as THREE from 'three'
import { Enemy, EnemyState } from './Enemy.js'

const DYING_FLICKER_RATE = 30   // radians per second of the death blink

const ENEMY_COLORS = {
  grunt:    0xcc4444,
  gunman:   0x4444cc,
  heavy:    0x888844,
  boss:     0x222222,
  innocent: 0xffccaa,
}

/**
 * Resolve the Enemy a raycast intersection belongs to. GLB enemies are cloned
 * Groups whose enemyRef sits on the root, but a recursive raycast reports the
 * child mesh that was actually struck — so walk up the parent chain to find it.
 * @param {import('three').Object3D|null} object
 * @returns {Enemy|null}
 */
export function resolveEnemy(object) {
  let node = object
  while (node) {
    if (node.userData?.enemyRef) return node.userData.enemyRef
    node = node.parent
  }
  return null
}

export class EnemyManager {
  /** @type {Enemy[]} */ enemies = []
  /** @type {THREE.Scene} */ scene
  /** @type {Map<string, import('three').Object3D>} */ models
  /** @type {import('three').Camera|null} */ camera
  /** Called when any enemy deals damage: (damage: number) => void */
  onEnemyAttack = null

  /**
   * @param {THREE.Scene} scene
   * @param {Map<string, import('three').Object3D>} [models]
   * @param {import('three').Camera|null} [camera]
   */
  constructor(scene, models = new Map(), camera = null) {
    this.scene = scene
    this.models = models
    this.camera = camera
  }

  /** @param {Map<string, import('three').Object3D>} models */
  setModels(models) {
    this.models = models
  }

  /**
   * @param {{ type: string, position: [number,number,number], hp: number }[]} waveData
   */
  spawnWave(waveData) {
    for (const data of waveData) {
      const emergeTime     = data.type === 'heavy'    ? 1.5 : 0.8
      const attackInterval = data.type === 'innocent' ? 999 : 2.5
      const enemy = new Enemy({ type: data.type, hp: data.hp, emergeTime, attackInterval })
      enemy.onDamageDealt = () => { if (this.onEnemyAttack) this.onEnemyAttack(1) }

      let mesh
      const template = this.models.get(data.type)
      if (template) {
        mesh = template.clone(true)
        // Preserve base scale from template; heavy/boss are relatively larger
        const typeScale = data.type === 'heavy' ? 1.5 : data.type === 'boss' ? 2.5 : 1.0
        mesh.scale.multiplyScalar(typeScale)
      } else {
        const size = data.type === 'heavy' ? 0.8 : data.type === 'boss' ? 1.5 : 0.5
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(size, size * 2, size),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(ENEMY_COLORS[data.type] ?? 0xff0000) })
        )
      }

      mesh.position.set(...data.position)
      // Propagate ref into all children so recursive raycaster hits work
      mesh.traverse(o => { o.userData.enemyRef = enemy })
      enemy.mesh = mesh
      this.scene.add(mesh)
      this.enemies.push(enemy)
      enemy.emerge()
    }
  }

  /** @param {number} dt */
  update(dt) {
    const dead = []
    for (const enemy of this.enemies) {
      enemy.update(dt)
      if (enemy.mesh) {
        // Cylindrical billboard: rotate Y so the model faces the camera, stays upright
        if (this.camera) {
          const dx = this.camera.position.x - enemy.mesh.position.x
          const dz = this.camera.position.z - enemy.mesh.position.z
          enemy.mesh.rotation.y = Math.atan2(dx, dz)
        }
        // Blink while dying, driven by the enemy's own accumulated timer so the
        // flicker is frame-rate independent and deterministic (not wall-clock).
        if (enemy.state === EnemyState.DYING) enemy.mesh.visible = Math.sin(enemy._timer * DYING_FLICKER_RATE) > 0
        if (enemy.isDead()) {
          this.scene.remove(enemy.mesh)
          dead.push(enemy)
        }
      }
    }
    this.enemies = this.enemies.filter(e => !dead.includes(e))
  }

  /** @returns {THREE.Mesh[]} all active enemy meshes for raycasting */
  getActiveMeshes() {
    return this.enemies
      .filter(e => e.state === EnemyState.VISIBLE || e.state === EnemyState.ATTACKING)
      .map(e => e.mesh)
      .filter(Boolean)
  }

  aliveCount() {
    return this.enemies.filter(e => !e.isDead()).length
  }

  clear() {
    for (const enemy of this.enemies) {
      if (enemy.mesh) this.scene.remove(enemy.mesh)
    }
    this.enemies = []
  }
}
