import { GameLoop } from '../src/GameLoop.js'

describe('GameLoop', () => {
  it('starts paused', () => {
    const loop = new GameLoop(() => {})
    expect(loop.running).toBe(false)
  })

  it('pauses and resumes', () => {
    const loop = new GameLoop(() => {})
    loop.start()
    expect(loop.running).toBe(true)
    loop.pause()
    expect(loop.running).toBe(false)
    loop.resume()
    expect(loop.running).toBe(true)
    loop.stop()
  })

  it('caps delta time at 100ms', () => {
    const ticks = []
    const loop = new GameLoop((dt) => ticks.push(dt))
    loop._tick(0)
    loop._tick(500) // simulate huge gap
    expect(ticks[1]).toBe(0.1) // capped at 100ms = 0.1s
    loop.stop()
  })
})
