// game/src/darkline/free/WanderAI.js
// 一隻敵人最笨的腦：超出射程就朝玩家直線走；進射程就站定、冷卻到 0 就開一槍。
// 回傳新狀態（不可變）。整合層把回傳的新 x/z 過 clampToSegments（天然沿障礙滑動），
// 並把 fired=true 轉成一發子彈。線性巷弄不需要真 pathfinding。
// 中腿（leg）後 `s.slowed` 為 true → 移動速度乘 slowFactor（預設 0.5），「四肢拖慢但殺不死」。
export function stepAI(s, player, dt, cfg) {
  const dx = player.x - s.x, dz = player.z - s.z
  const dist = Math.hypot(dx, dz) || 1
  let { x, z, cooldown } = s
  let fired = false
  if (dist > cfg.range) {
    const slow = s.slowed ? (cfg.slowFactor ?? 0.5) : 1
    const step = cfg.speed * slow * dt
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
