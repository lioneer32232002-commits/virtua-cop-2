// game/src/darkline/free/clamp.js
// 平地 2D 碰撞：把點夾進「房間 AABB 段清單」的聯集（L 形巷弄 = 2+ 個相接矩形），
// 再推出每個 AABB 障礙。刻意極簡（M1 不做物理）。純函式（x/z 平面）。
export function clampToSegments(p, segments, obstacles = [], radius = 0.3) {
  // 已在某段內（扣半徑）→ 保留；否則 snap 到「夾進後最近」的那一段。
  let best = { x: p.x, z: p.z }, bestD = Infinity
  for (const s of segments) {
    const cx = Math.min(Math.max(p.x, s.minX + radius), s.maxX - radius)
    const cz = Math.min(Math.max(p.z, s.minZ + radius), s.maxZ - radius)
    if (cx === p.x && cz === p.z) { best = { x: cx, z: cz }; bestD = 0; break }
    const dx = cx - p.x, dz = cz - p.z
    const d = dx * dx + dz * dz
    if (d < bestD) { bestD = d; best = { x: cx, z: cz } }
  }
  let { x, z } = best
  for (const o of obstacles) {
    const insideX = x > o.minX - radius && x < o.maxX + radius
    const insideZ = z > o.minZ - radius && z < o.maxZ + radius
    if (!(insideX && insideZ)) continue
    const dl = x - (o.minX - radius)   // 往 -x 推
    const dr = (o.maxX + radius) - x   // 往 +x 推
    const db = z - (o.minZ - radius)   // 往 -z 推
    const dt = (o.maxZ + radius) - z   // 往 +z 推
    const m = Math.min(dl, dr, db, dt)
    if (m === dl) x = o.minX - radius
    else if (m === dr) x = o.maxX + radius
    else if (m === db) z = o.minZ - radius
    else z = o.maxZ + radius
  }
  return { x, z }
}
