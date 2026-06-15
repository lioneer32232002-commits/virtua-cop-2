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
}
