// 一隻敵人最笨的腦：沒視線或超出射程就朝玩家直線走；有視線且進射程就站定、冷卻到 0 開一槍。
// 沒視線時即使進射程也只貼近、不開火（故意不繞路——這個笨剛好拿來驗 AI 成本）。
// 回傳新狀態（不可變）。整合層用 los.js 算 hasLOS、把 fired=true 轉成扣血。
export function stepAI(s, player, dt, cfg, hasLOS = true) {
  const dx = player.x - s.x, dz = player.z - s.z
  const dist = Math.hypot(dx, dz) || 1
  let { x, z, cooldown } = s
  let fired = false
  // 能開火 = 有視線 且 進射程；否則朝玩家走、冷卻遞減。
  if (!(hasLOS && dist <= cfg.range)) {
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
