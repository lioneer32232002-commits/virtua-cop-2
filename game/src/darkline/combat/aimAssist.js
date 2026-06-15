// game/src/darkline/combat/aimAssist.js
// 輕量磁吸瞄準。準心與候選目標點皆為 normalized device coords（NDC, [-1,1]）。
// 把準心往「半徑內最近的目標」拉近 strength（0=無輔助、1=完全吸附）。無目標在範圍內
// → 原樣返回。rail/free 共用、力度各設（free 高、rail 低或 0）。純函式。
export function assistAim(cross, targets, { radius = 0.18, strength = 0.5 } = {}) {
  let best = null, bestD = Infinity
  for (const t of targets) {
    const d = Math.hypot(t.x - cross.x, t.y - cross.y)
    if (d < radius && d < bestD) { bestD = d; best = t }
  }
  if (!best || strength === 0) return { x: cross.x, y: cross.y }
  return {
    x: cross.x + (best.x - cross.x) * strength,
    y: cross.y + (best.y - cross.y) * strength,
  }
}
