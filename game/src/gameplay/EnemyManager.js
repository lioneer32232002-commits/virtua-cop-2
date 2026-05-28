import * as THREE from 'three'
import { Enemy, EnemyState } from './Enemy.js'

const ENEMY_COLORS = {
  grunt:    0xcc4444,
  gunman:   0x4444cc,
  heavy:    0x888844,
  boss:     0x222222,
  innocent: 0xffccaa,
}

export class EnemyManager {
  /** @type {Enemy[]} */ enemies = []
  /** @type {THREE.Scene} */ scene
  /** @type {Map<string, import('three').Object3D>} */ models
  /** Called when any enemy deals damage: (damage: number) => void */
  onEnemyAttack = null

  /**
   * @param {THREE.Scene} scene
   * @param {Map<string, import('three').Object3D>} [models]
   */
  constructor(scene, models = new Map()) {
    this.scene = scene
    this.models = models
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
        const scale = data.type === 'heavy' ? 1.5 : data.type === 'boss' ? 2.5 : 1.0
        mesh.scale.setScalar(scale)
      } else {
        const size = data.type === 'heavy' ? 0.8 : data.type === 'boss' ? 1.5 : 0.5
        mesh = new THREE.Mesh(
          new THREE.BoxGeometry(size, size * 2, size),
          new THREE.MeshLambertMaterial({ color: new THREE.Color(ENEMY_COLORS[data.type] ?? 0xff0000) })
        )
      }

      mesh.position.set(...data.position)
      mesh.userData.enemyRef = enemy
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
        if (enemy.state === EnemyState.DYING) enemy.mesh.visible = Math.sin(Date.now() * 0.02) > 0
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
