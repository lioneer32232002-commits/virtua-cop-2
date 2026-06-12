import * as THREE from 'three'
import { Enemy, EnemyState } from './Enemy.js'
import { Projectile, rollHit, aimPoint, HIT_RATE_BY_DIFFICULTY } from './Projectile.js'

const DYING_FLICKER_RATE = 30   // radians per second of the death blink
const EYE_HEIGHT = 1.6          // camera height above the street (original world units)
const CIVILIAN_LIFETIME = 4.5   // seconds a civilian is on screen before running off
const CIVILIAN_SPEED = 2.5      // world units/sec a civilian drifts across the street
const FLEE_SPEED = 3.5          // world units/sec a disarmed enemy runs off
const PASSED_MARGIN = 3         // units behind the camera before an enemy is culled
const PROJECTILE_RADIUS = 0.18  // base sphere radius of an enemy bullet
const PROJECTILE_NEAR_SCALE = 3 // how much bigger the bullet looks as it reaches the camera

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
 * Resolve the Projectile a raycast intersection belongs to (its mesh, or a child
 * of it), so the player can shoot enemy bullets out of the air. Mirrors
 * resolveEnemy.
 * @param {import('three').Object3D|null} object
 * @returns {Projectile|null}
 */
export function resolveProjectile(object) {
  let node = object
  while (node) {
    if (node.userData?.projectileRef) return node.userData.projectileRef
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

/**
 * Camera-relative "right" direction on the ground plane for a given camera yaw —
 * the world-space (x, z) a civilian walks along, fixed at spawn so it keeps its
 * course even if the camera later turns. Matches the spawn-offset rotation.
 * @param {number} yaw camera yaw (radians)
 * @returns {{ x: number, z: number }}
 */
export function driftDirectionFromYaw(yaw) {
  return { x: Math.cos(yaw), z: -Math.sin(yaw) }
}

/**
 * Whether an enemy has fallen behind the camera by more than `margin` units along
 * the camera's facing — i.e. the rail has carried the view past it. Node enemies
 * stay ahead of a paused camera, so they're never behind. Pure (x/z only).
 * @param {{x:number,z:number}} enemyPos
 * @param {{x:number,z:number}} camPos
 * @param {number} camYaw camera yaw (radians)
 * @param {number} [margin] units behind before it counts (default 3)
 * @returns {boolean}
 */
export function isBehindCamera(enemyPos, camPos, camYaw, margin = 3) {
  const fwdX = -Math.sin(camYaw), fwdZ = -Math.cos(camYaw)
  const forward = (enemyPos.x - camPos.x) * fwdX + (enemyPos.z - camPos.z) * fwdZ
  return forward < -margin
}

export class EnemyManager {
  /** @type {Enemy[]} */ enemies = []
  /** @type {Projectile[]} In-flight enemy bullets. */ projectiles = []
  /** @type {THREE.Scene} */ scene
  /** @type {Map<string, import('three').Object3D>} */ models
  /** @type {import('three').Camera|null} */ camera
  /** @type {import('../scene/StageEnvironment.js').StageEnvironment|null} */ environment = null
  /** Difficulty driving the projectile hit rate (easy/normal/hard). */ difficulty = 'normal'
  /** Injectable RNG for the hit roll; Math.random in play, seeded in tests. */ rng = Math.random
  /** Called when an enemy projectile *hits* the player: (damage: number) => void */
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
    // Camera-relative "right" at spawn — civilians walk along it, disarmed enemies
    // flee along it. Fixed here so direction doesn't change if the camera turns.
    const spawnYaw = this.camera
      ? new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ').y
      : 0
    const drift = driftDirectionFromYaw(spawnYaw)
    for (const data of waveData) {
      const emergeTime     = data.type === 'heavy'    ? 1.5 : 0.8
      const attackInterval = data.type === 'innocent' ? 999 : 2.5
      const lifetime       = data.type === 'innocent' ? CIVILIAN_LIFETIME : null
      const enemy = new Enemy({ type: data.type, hp: data.hp, emergeTime, attackInterval, lifetime })
      enemy.drift = drift
      // Firing no longer deals damage on the spot — it launches a projectile
      // that only judges its hit on arrival (cancellable mid-flight).
      enemy.onDamageDealt = () => this.fireProjectile(enemy)

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

  /**
   * Launch an enemy bullet at the player. Origin = enemy mesh position, target =
   * camera (the player). The hit/miss verdict is rolled here, at fire time, so it
   * is deterministic; arrival merely applies it.
   * @param {Enemy} enemy
   * @returns {Projectile}
   */
  fireProjectile(enemy) {
    const m = enemy.mesh
    const origin = m
      ? { x: m.position.x, y: m.position.y, z: m.position.z }
      : { x: 0, y: 0, z: 0 }
    const hitRate = HIT_RATE_BY_DIFFICULTY[this.difficulty] ?? HIT_RATE_BY_DIFFICULTY.normal
    const willHit = rollHit(hitRate, this.rng)

    let target
    if (this.camera) {
      const cam = this.camera.position
      const yaw = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ').y
      target = aimPoint(cam, driftDirectionFromYaw(yaw), willHit)
    } else {
      target = { ...origin }   // no camera (tests): degenerate flight, logic only
    }

    const p = new Projectile({ origin, target, willHit })
    p.owner = enemy
    if (this.camera) this._attachProjectileMesh(p)   // visual only in-game
    this.projectiles.push(p)
    return p
  }

  /** Build the bright unlit bullet sphere and add it to the scene. */
  _attachProjectileMesh(p) {
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(PROJECTILE_RADIUS, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffffcc })
    )
    const pos = p.position
    mesh.position.set(pos.x, pos.y, pos.z)
    mesh.userData.projectileRef = p
    p.mesh = mesh
    this.scene.add(mesh)
  }

  /**
   * Advance in-flight projectiles. A kill/despawn of the firer cancels its shot
   * (original: a mid-flight kill cancels the attack); arrival applies the verdict
   * rolled at fire time. Done projectiles (arrived or cancelled) are retired.
   * @param {number} dt
   */
  _updateProjectiles(dt) {
    for (const p of this.projectiles) {
      const o = p.owner
      if (o && (o.state === EnemyState.DYING || o.isDead() || o.gone)) p.cancel()
      p.update(dt)
      if (p.arrived && !p.resolved) {
        p.resolved = true
        if (p.willHit && this.onEnemyAttack) this.onEnemyAttack(1)
      }
      // Fly the bullet along its path, swelling as it nears the camera.
      if (p.mesh) {
        const pos = p.position
        p.mesh.position.set(pos.x, pos.y, pos.z)
        p.mesh.scale.setScalar(1 + p.progress * (PROJECTILE_NEAR_SCALE - 1))
      }
    }
    this.projectiles = this.projectiles.filter(p => {
      if (p.isDone()) { if (p.mesh) this.scene.remove(p.mesh); return false }
      return true
    })
  }

  /** @param {number} dt */
  update(dt) {
    const dead = []
    const camYaw = this.camera
      ? new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ').y
      : 0
    for (const enemy of this.enemies) {
      enemy.update(dt)
      if (enemy.mesh) {
        // Cylindrical billboard: rotate Y so the model faces the camera, stays upright
        if (this.camera) {
          const dx = this.camera.position.x - enemy.mesh.position.x
          const dz = this.camera.position.z - enemy.mesh.position.z
          enemy.mesh.rotation.y = Math.atan2(dx, dz)
        }
        // Cull enemies the rail has carried past (well behind the camera). Node
        // enemies stay ahead of a paused camera, so they're never culled. Dying
        // enemies finish their death blink first.
        if (this.camera && enemy.state !== EnemyState.DYING && !enemy.isDead() &&
            isBehindCamera(enemy.mesh.position, this.camera.position, camYaw, PASSED_MARGIN)) {
          enemy.despawn()
        }
        // Drift along the spawn-fixed camera-relative right vector: civilians walk
        // across while up; a disarmed enemy turns and runs (justice shot) — both
        // then leave the field (lifetime / flee despawn).
        if (enemy.drift && enemy.state === EnemyState.VISIBLE &&
            (enemy.type === 'innocent' || enemy.fleeing)) {
          const speed = enemy.fleeing ? FLEE_SPEED : CIVILIAN_SPEED
          enemy.mesh.position.x += enemy.drift.x * speed * dt
          enemy.mesh.position.z += enemy.drift.z * speed * dt
        }
        // Blink while dying, driven by the enemy's own accumulated timer so the
        // flicker is frame-rate independent and deterministic (not wall-clock).
        if (enemy.state === EnemyState.DYING) enemy.mesh.visible = Math.sin(enemy._timer * DYING_FLICKER_RATE) > 0
        if (enemy.shouldRemove()) {
          this.scene.remove(enemy.mesh)
          dead.push(enemy)
        }
      }
    }
    this.enemies = this.enemies.filter(e => !dead.includes(e))
    // Advance after the enemy step so this frame's kills cancel their shots.
    this._updateProjectiles(dt)
  }

  /** @returns {THREE.Mesh[]} in-flight projectile meshes the player can shoot down */
  getProjectileMeshes() {
    return this.projectiles.filter(p => !p.isDone() && p.mesh).map(p => p.mesh)
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
    for (const p of this.projectiles) {
      if (p.mesh) this.scene.remove(p.mesh)
    }
    this.enemies = []
    this.projectiles = []
  }
}
