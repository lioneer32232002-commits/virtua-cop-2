// 一隻敵人最笨的腦：超出射程就朝玩家直線走；進射程就站定、冷卻到 0 就開一槍。
// 回傳新狀態（不可變）。整合層負責把 fired=true 轉成一發子彈。
export function stepAI(s, player, dt, cfg) {
  const dx = player.x - s.x, dz = player.z - s.z
  const dist = Math.hypot(dx, dz) || 1
  let { x, z, cooldown } = s
  let fired = false
  if (dist > cfg.range) {
    const step = cfg.speed * dt
    x += (dx / dist) * step
    z += (dz / dist) * step
    cooldown = Math.max(0, cooldown - dt)
  } else if (cooldown <= 0) {
    fired = true
    cooldown = cfg.fireCooldown
  } else {
    cooldown = Math.max(0, cooldown - dt)
  }
  return { x, z, cooldown, fired }
}
