import { GameManager } from '../src/GameManager.js'

describe('GameManager', () => {
  it('starts in MENU state', () => {
    const gm = new GameManager()
    expect(gm.state).toBe('menu')
  })

  it('startStage transitions to PLAYING', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    expect(gm.state).toBe('playing')
    expect(gm.currentStage).toBe('stage1')
    expect(gm.difficulty).toBe('normal')
  })

  it('onClearPoint transitions to CLEAR_POINT', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onClearPoint()
    expect(gm.state).toBe('clear_point')
  })

  it('onAllEnemiesDead resumes from CLEAR_POINT', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onClearPoint()
    gm.onAllEnemiesDead()
    expect(gm.state).toBe('playing')
  })

  it('onPlayerDead transitions to DEAD', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onPlayerDead()
    expect(gm.state).toBe('dead')
  })

  it('onStageClear transitions to STAGE_CLEAR', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onStageClear()
    expect(gm.state).toBe('stage_clear')
  })

  it('toMenu resets to MENU', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onPlayerDead()
    gm.toMenu()
    expect(gm.state).toBe('menu')
  })

  it('inPlay is true while PLAYING and at a CLEAR_POINT, false otherwise', () => {
    const gm = new GameManager()
    expect(gm.inPlay).toBe(false)            // menu
    gm.startStage('stage1', 'normal')
    expect(gm.inPlay).toBe(true)             // playing
    gm.onClearPoint()
    expect(gm.inPlay).toBe(true)             // clear point — must stay shootable
    gm.onAllEnemiesDead()
    expect(gm.inPlay).toBe(true)             // back to playing
    gm.onPlayerDead()
    expect(gm.inPlay).toBe(false)            // dead
    gm.startStage('stage1', 'normal')
    gm.onStageClear()
    expect(gm.inPlay).toBe(false)            // stage clear
  })
})
