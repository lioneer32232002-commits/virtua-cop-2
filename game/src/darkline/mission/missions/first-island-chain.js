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
    enemy: { hp: 2, ai: { speed: 1.6, range: 4.5, fireCooldown: 1.6 }, sprite: '/m0/enemy.png', worldSize: 1.9 },
    // free 段磁吸力度較高。radius 0.22→0.30（Phase D 調校）：敵人 sprite 中心在地面、
    // 投影落「置中準心」下方 ~0.25 NDC，舊 0.22 半徑咬不到 → 放寬到能涵蓋。
    assist: { radius: 0.30, strength: 0.5 },
    intelScore: 300,
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
        { type: 'grunt', position: [-2, 0, -10], hp: 1 },
        { type: 'grunt', position: [2, 0, -12], hp: 1 },
        { type: 'gunman', position: [0, 0, -14], hp: 2 } ] },
      { time: 16, clearPoint: true, enemies: [
        { type: 'grunt', position: [-3, 0, -11], hp: 1 },
        { type: 'heavy', position: [2, 0, -13], hp: 3 } ] },
    ],
  },
  rail2boss: {
    preset: 'harbor',
    path: [[0, 1.6, 8], [0, 1.6, -30], [4, 1.6, -70], [0, 1.6, -120]],
    duration: 20,
    waves: [
      { time: 3, clearPoint: true, enemies: [
        { type: 'grunt', position: [-2, 0, -12], hp: 1 },
        { type: 'gunman', position: [2, 0, -13], hp: 2 } ] },
    ],
    boss: { time: 14, hp: 16, position: [0, 0, -16], phases: 3 },
  },
}
