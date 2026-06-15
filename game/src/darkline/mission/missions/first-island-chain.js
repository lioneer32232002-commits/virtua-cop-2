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
    assist: { radius: 0.22, strength: 0.5 },   // free 段磁吸力度較高
    intelScore: 300,
  },
}
