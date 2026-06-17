// game/src/darkline/free/AlleyScene.js
// 線性 L 形台北巷弄（M1 佔位）。layout 是純資料（房間段/障礙/出入點/spawn）——可單測、
// 給 clamp 與整合層用；buildAlleyGroup 把 layout 變成 unlit three 幾何（地面/兩側牆/攤位/
// 出口光帶）。1950s 暖灰調，與 sprite 同氛圍。seed 決定性。
import * as THREE from 'three'

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const WALL = 0x2a2622, GROUND = 0x352f29, STALL = 0x4a3a2a, EXIT = 0xffe6a8

// 純資料 layout：主巷沿 -z（ARM_A），巷尾往 +x 轉折（ARM_B）；攤位障礙、出入點、spawn。
export function buildAlleyLayout(seed = 1) {
  const rng = mulberry32(seed)
  const ARM_A = { minX: -2.5, maxX: 2.5, minZ: -22, maxZ: 0 }
  const ARM_B = { minX: -2.5, maxX: 9, minZ: -22, maxZ: -17 }
  const segments = [ARM_A, ARM_B]
  // 兩三個攤位木箱障礙（主巷內，交錯擺，逼玩家繞）
  const obstacles = [
    { minX: -2.5, maxX: -0.6, minZ: -8, maxZ: -6.5 },
    { minX: 0.7, maxX: 2.5, minZ: -14, maxZ: -12.5 },
  ]
  return {
    seed,
    segments,
    obstacles,
    entry: { x: 0, z: -1 },                          // 下車點（接縫進入）
    exitTrigger: { minX: 5, maxX: 9, minZ: -22, maxZ: -17 },  // 巷尾轉折盡頭＝上車觸發區
    enemySpawns: [
      { x: 1.2, z: -10, type: 'agent' },
      { x: -1.0, z: -16, type: 'agent' },
      { x: 7, z: -19, type: 'agent' },               // 轉折處伏擊
    ],
    intel: { x: -1.8, z: -5 + rng() * 0.001 },        // 情報點（按 E 拾取）
    scrap: { x: 1.6, z: -3 },                         // 接頭人死信箱紙片（鑰匙；入口側，比情報點早遇到）
    innocent: { x: 1.5, z: -19 },                     // 投誠者（要保護）
  }
}

// 把 layout 變成可加進 scene 的 three.Group（unlit 佔位幾何）。
export function buildAlleyGroup(layout) {
  const g = new THREE.Group()
  g.name = 'taipei_alley'
  const mat = hex => new THREE.MeshBasicMaterial({ color: hex })
  // 地面：覆蓋兩臂聯集（取整體 bbox）
  const minX = Math.min(...layout.segments.map(s => s.minX))
  const maxX = Math.max(...layout.segments.map(s => s.maxX))
  const minZ = Math.min(...layout.segments.map(s => s.minZ))
  const maxZ = Math.max(...layout.segments.map(s => s.maxZ))
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX + 2, maxZ - minZ + 2), mat(GROUND))
  floor.rotation.x = -Math.PI / 2
  floor.position.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2)
  g.add(floor)
  // 兩側牆（沿主巷各一道矮牆，用 box 充當騎樓/巷壁）
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 4, maxZ - minZ), mat(WALL))
    wall.position.set(side === -1 ? layout.segments[0].minX : layout.segments[0].maxX, 2, (minZ + maxZ) / 2)
    g.add(wall)
  }
  // 攤位木箱
  for (const o of layout.obstacles) {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(o.maxX - o.minX, 1.1, o.maxZ - o.minZ), mat(STALL))
    box.position.set((o.minX + o.maxX) / 2, 0.55, (o.minZ + o.maxZ) / 2)
    g.add(box)
  }
  // 出口光帶（巷尾，提示上車點）
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), mat(EXIT))
  exit.rotation.x = -Math.PI / 2
  exit.position.set((layout.exitTrigger.minX + layout.exitTrigger.maxX) / 2, 0.02, (layout.exitTrigger.minZ + layout.exitTrigger.maxZ) / 2)
  g.add(exit)
  return g
}
