// game/src/darkline/free/AlleyScene.js
// 線性 L 形台北巷弄。layout 是純資料（房間段/障礙/出入點/spawn）——可單測、給 clamp 與
// 整合層用；buildAlleyGroup 把 layout 變成 unlit three 幾何，用共用 streetKit 詞彙（地面＋
// 面分色騎樓牆＋亮窗＋路燈＋封閉 backdrop＋出口光帶），與軌道街景同調。1950s 暖調，seed 決定性。
import * as THREE from 'three'
import { shadedBox, pushWindows, streetlight } from '../../scene/streetKit.js'

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const GROUND = 0x352f29, STALL = 0x4a3a2a, EXIT = 0xffe6a8

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

// 把 layout 變成可加進 scene 的 three.Group。改用共用 keeper 街道詞彙（streetKit）：
// 面分色塊體牆/木箱（shadedBox）＋亮窗格網（pushWindows）＋路燈（streetlight），與軌道
// 街同一套視覺，讀起來是同一個世界（不再是扁平 debug box）。
export function buildAlleyGroup(layout) {
  const g = new THREE.Group()
  g.name = 'taipei_alley'
  const mat = hex => new THREE.MeshBasicMaterial({ color: hex })
  const minX = Math.min(...layout.segments.map(s => s.minX))
  const maxX = Math.max(...layout.segments.map(s => s.maxX))
  const minZ = Math.min(...layout.segments.map(s => s.minZ))
  const maxZ = Math.max(...layout.segments.map(s => s.maxZ))
  const midZ = (minZ + maxZ) / 2
  const lenZ = maxZ - minZ

  // 地面（保留平面；街面 y=0 grounding 不變）
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(maxX - minX + 2, lenZ + 2), mat(GROUND))
  floor.rotation.x = -Math.PI / 2
  floor.position.set((minX + maxX) / 2, 0, midZ)
  g.add(floor)

  // 兩側牆＝面分色塊體（騎樓壁），各帶一面亮窗
  const win = { pos: [], col: [] }
  for (const side of [-1, 1]) {
    const wx = side === -1 ? layout.segments[0].minX : layout.segments[0].maxX
    const wall = shadedBox(0.4, 5, lenZ, side === -1 ? 0x39322b : 0x332d27)
    wall.position.set(wx, 2.5, midZ)
    g.add(wall)
    // 街面朝向的窗（牆內側面）
    const faceX = wx - side * 0.22
    pushWindows(win, faceX, midZ, lenZ, 5, () => 0.3) // 決定性：偏多亮窗（巷弄燈火）
  }
  if (win.pos.length) {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(win.pos, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(win.col, 3))
    const windows = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }))
    windows.name = 'alley_windows'
    g.add(windows)
  }

  // 攤位＝面分色木箱
  for (const o of layout.obstacles) {
    const box = shadedBox(o.maxX - o.minX, 1.1, o.maxZ - o.minZ, STALL)
    box.position.set((o.minX + o.maxX) / 2, 0.55, (o.minZ + o.maxZ) / 2)
    g.add(box)
  }

  // 一盞路燈（巷中段）+ 封閉 backdrop（巷尾，免露天空洞）
  g.add(streetlight(layout.segments[0].minX + 0.4, midZ, -1))
  const backdrop = shadedBox(maxX - minX + 6, 7, 0.6, 0x2c2620)
  backdrop.position.set((minX + maxX) / 2, 3.5, minZ - 0.6)
  g.add(backdrop)

  // 出口光帶（保留）
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(3, 1.5), mat(EXIT))
  exit.rotation.x = -Math.PI / 2
  exit.position.set((layout.exitTrigger.minX + layout.exitTrigger.maxX) / 2, 0.02, (layout.exitTrigger.minZ + layout.exitTrigger.maxZ) / 2)
  g.add(exit)
  return g
}
