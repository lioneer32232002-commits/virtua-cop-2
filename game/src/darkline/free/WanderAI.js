// game/src/darkline/free/WanderAI.js
// 一隻敵人最笨的腦：超出射程就朝玩家直線走；進射程就站定、冷卻到 0 就「舉槍」開火。
// 回傳新狀態（不可變）。整合層把回傳的新 x/z 過 clampToSegments（天然沿障礙滑動），
// 並把 fired=true 轉成一發子彈。線性巷弄不需要真 pathfinding。
// 中腿（leg）後 `s.slowed` 為 true → 移動速度乘 slowFactor（預設 0.5），「四肢拖慢但殺不死」。
//
// 開火 tell（舉槍預警，VC2 手感基因）：進射程且冷卻好時，不即時擊發，而是先進「舉槍」態
// （windup 計時 = cfg.windup），站定倒數；windup 歸零才 fired。整合層讀 aiming 切 sprite
// 到「舉槍格」當可見預警，給玩家反應窗口。cfg.windup 未設（=0）→ 退回舊的即時開火行為
// （向後相容，舊 mission/測試不受影響）。舉起槍即承諾擊發，不因玩家跑出射程而取消。
export function stepAI(s, player, dt, cfg) {
  const dx = player.x - s.x, dz = player.z - s.z
  const dist = Math.hypot(dx, dz) || 1
  let { x, z, cooldown, windup = 0 } = s
  let fired = false
  if (windup > 0) {
    // 舉槍中：站定倒數 wind-up；歸零就擊發並回充冷卻、退出舉槍態。
    windup = Math.max(0, windup - dt)
    if (windup === 0) { fired = true; cooldown = cfg.fireCooldown }
  } else if (dist > cfg.range) {
    const slow = s.slowed ? (cfg.slowFactor ?? 0.5) : 1
    const step = cfg.speed * slow * dt
    x += (dx / dist) * step
    z += (dz / dist) * step
    cooldown = Math.max(0, cooldown - dt)
  } else if (cooldown <= 0) {
    // 進射程、冷卻好：起手舉槍（進 wind-up），本幀不開火（tell）。windup=0 → 即時擊發。
    const w = cfg.windup ?? 0
    if (w > 0) windup = w
    else { fired = true; cooldown = cfg.fireCooldown }
  } else {
    cooldown = Math.max(0, cooldown - dt)
  }
  return { x, z, cooldown, windup, fired, aiming: windup > 0 }
}
