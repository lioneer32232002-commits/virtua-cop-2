// 視線判定（平地 XZ 平面）：線段 a→b 是否「清晰」（不穿過任何 AABB 箱）。
// 用 slab method——線段參數 t∈[0,1] 逐軸夾擠 [tmin,tmax]，交集非空即相交。
// 用途：敵人看不看得到玩家（決定能否開火）。box: { minX, maxX, minZ, maxZ }。
export function segmentClearsBoxes(ax, az, bx, bz, boxes = []) {
  for (const box of boxes) {
    if (segmentHitsBox(ax, az, bx, bz, box)) return false
  }
  return true
}

function segmentHitsBox(ax, az, bx, bz, box) {
  const dx = bx - ax, dz = bz - az
  let tmin = 0, tmax = 1
  // X slab
  if (Math.abs(dx) < 1e-9) {
    if (ax < box.minX || ax > box.maxX) return false  // 平行且在 slab 外
  } else {
    let t1 = (box.minX - ax) / dx, t2 = (box.maxX - ax) / dx
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2)
    if (tmin > tmax) return false
  }
  // Z slab
  if (Math.abs(dz) < 1e-9) {
    if (az < box.minZ || az > box.maxZ) return false
  } else {
    let t1 = (box.minZ - az) / dz, t2 = (box.maxZ - az) / dz
    if (t1 > t2) [t1, t2] = [t2, t1]
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2)
    if (tmin > tmax) return false
  }
  return true
}
