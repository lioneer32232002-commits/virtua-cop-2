import * as THREE from 'three'
import { Enemy, EnemyState } from './Enemy.js'

const DYING_FLICKER_RATE = 30   // radians per second of the death blink
const EYE_HEIGHT = 1.6          // camera height above the street (original world units)

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

/**
 * Resolve the hit zone (head/body/hand) from a raycast-struck object, walking up
 * the parent chain to a part mesh tagged with userData.zone. Defaults to 'body'
 * so untagged geometry (e.g. fallback box) still deals normal damage.
 * @param {import('three').Object3D|null} object
 * @returns {'head'|'body'|'hand'}
 */
export function zoneOfHit(object) {
  let node = object
  while (node) {
    if (node.userData?.zone) return node.userData.zone
    node = node.parent
  }
  return 'body'
}

export class EnemyManager {
  /** @type {Enemy[]} */ enemies = []
  /** @type {THREE.Scene} */ scene
  /** @type {Map<string, import('three').Object3D>} */ models
  /** @type {import('three').Camera|null} */ camera
  /** @type {import('../scene/StageEnvironment.js').StageEnvironment|null} */ environment = null
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
          new THREE.MeshBasicMaterial({ color: new THREE.Color(ENEMY_COLORS[data.type] ?? 0xff0000) })
        )
      }

      const [px, py, pz] = this._resolveSpawnPosition(data.position)
      mesh.position.set(px, py, pz)
      // Propagate ref into all children so recursive raycaster hits work
      mesh.traverse(o => { o.userData.enemyRef = enemy })
      enemy.mesh = mesh
      this.scene.add(mesh)
      this.enemies.push(enemy)
      enemy.emerge()
    }
  }

  /**
   * Level JSON enemy positions are camera-relative offsets (x = right,
   * negative z = ahead). At spawn time, rotate the offset by the camera's
   * current yaw and translate to world space, then drop the enemy onto the
   * street via a downward raycast. Without a camera (unit tests), positions
   * are treated as absolute world coordinates.
   * @param {[number, number, number]} offset
   * @returns {[number, number, number]}
   */
  _resolveSpawnPosition(offset) {
    if (!this.camera) return offset
    const yaw = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ').y
    const p = new THREE.Vector3(offset[0], 0, offset[2])
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), yaw)
      .add(this.camera.position)
    const ground = this.environment?.groundYAt(p.x, p.z, this.camera.position.y)
    p.y = ground ?? (this.camera.position.y - EYE_HEIGHT + offset[1])
    return [p.x, p.y, p.z]
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

  /**
   * Count of living *hostile* enemies. Innocents (civilians) are excluded so a
   * clear point is not deadlocked by a civilian the player is meant to spare —
   * shooting innocents costs a life, so they can never be the thing that gates
   * progression. See main.js clear-point resume gate.
   */
  aliveCount() {
    return this.enemies.filter(e => !e.isDead() && e.type !== 'innocent').length
  }

  clear() {
    for (const enemy of this.enemies) {
      if (enemy.mesh) this.scene.remove(enemy.mesh)
    }
    this.enemies = []
  }
}
