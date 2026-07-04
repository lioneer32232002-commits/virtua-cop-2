export const SEGMENTS = ['briefing', 'rail1', 'free', 'rail2boss', 'ending']

export const SEGMENT_MODES = {
  briefing:  { camera: 'none', input: 'none',        save: false },
  rail1:     { camera: 'rail', input: 'cursor',      save: false },
  free:      { camera: 'free', input: 'pointerlock', save: true  },
  rail2boss: { camera: 'rail', input: 'cursor',      save: true  },
  ending:    { camera: 'none', input: 'none',        save: false },
}

export const MISSION = {
  id: 'first-island-chain',
  briefingKey: 'brief.body',
  endingKey: 'ending.body',
  free: {
    alleySeed: 1953,
    // sprite = Milestone E authored art. agent.png = 內勤科 secret-police (fedora + dark
    // suit, hidden revolver) — the free-segment enemy per E0 定調. enemy*.png are M2 placeholders.
    enemy: { hp: 2, ai: { speed: 1.6, range: 4.5, fireCooldown: 1.6 }, sprite: '/darkline/sprites/agent.png', worldSize: 1.9 },
    // free 段磁吸力度較高。radius 0.22→0.30（Phase D 調校）：敵人 sprite 中心在地面、
    // 投影落「置中準心」下方 ~0.25 NDC，舊 0.22 半徑咬不到 → 放寬到能涵蓋。
    assist: { radius: 0.30, strength: 0.5 },
    intelScore: 300,
    // 有限彈藥（spec 2026-06-16）
    ammo: { magSize: 7, startReserveMags: 2, reloadTime: 1.0, dropRate: 0.4, pityThreshold: 3, pickupRadius: 1.2 },
    // 固定補給點（各補 1 匣）；座標為巷弄 segment 上的世界 x/z
    supplyPoints: [ { x: 0, z: -14 }, { x: 2, z: -30 } ],
  },
  // 軌道段：相機沿 path 推進（CameraRig curve），到 wave.time spawn 該波；clearPoint 波
  // 未清完前凍結相機+計時（見 RailController，對齊 production LevelDirector 語意）。
  // position 為相機相對 offset [x右, y, z前負]；duration 含內容後的收尾運鏡（~6s）。
  rail1: {
    preset: 'taipei1950s',
    path: [[0, 1.6, 8], [0, 1.6, -20], [3, 1.6, -55], [0, 1.6, -95], [-2, 1.6, -140]],
    duration: 26,
    waves: [
      { time: 3,  clearPoint: true, enemies: [
        { type: 'grunt', position: [-2, 0, -10], hp: 2 },
        { type: 'grunt', position: [2, 0, -12], hp: 2 },
        { type: 'gunman', position: [0, 0, -14], hp: 3 } ] },
      { time: 16, clearPoint: true, enemies: [
        { type: 'grunt', position: [-3, 0, -11], hp: 2 },
        { type: 'heavy', position: [2, 0, -13], hp: 5 } ] },
    ],
  },
  rail2boss: {
    preset: 'harbor',
    path: [[0, 1.6, 8], [0, 1.6, -30], [4, 1.6, -70], [0, 1.6, -120]],
    duration: 20,
    waves: [
      { time: 3, clearPoint: true, enemies: [
        { type: 'grunt', position: [-2, 0, -12], hp: 2 },
        { type: 'gunman', position: [2, 0, -13], hp: 3 } ] },
    ],
    boss: { time: 14, hp: 16, position: [0, 0, -16], phases: 3 },
  },
}
