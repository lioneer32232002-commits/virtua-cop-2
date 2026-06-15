// 平地 2D 碰撞：把點夾進房間矩形，再推出每個 AABB 障礙。刻意極簡（M0 不做物理）。
export function clampToRoom(p, room, obstacles = [], radius = 0.3) {
  let x = Math.min(Math.max(p.x, room.minX + radius), room.maxX - radius)
  let z = Math.min(Math.max(p.z, room.minZ + radius), room.maxZ - radius)
  for (const o of obstacles) {
    const insideX = x > o.minX - radius && x < o.maxX + radius
    const insideZ = z > o.minZ - radius && z < o.maxZ + radius
    if (!(insideX && insideZ)) continue
    // 四個面各自的「推出距離」，取最小的那一面推出去
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
