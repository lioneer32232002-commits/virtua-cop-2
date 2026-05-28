import { Enemy } from '../src/gameplay/Enemy.js'

describe('Enemy states', () => {
  it('starts IDLE', () => {
    const e = new Enemy({ type: 'grunt', hp: 2, emergeTime: 1, attackInterval: 2 })
    expect(e.state).toBe('idle')
  })

  it('transitions IDLE → EMERGING → VISIBLE on update', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.5, attackInterval: 5 })
    e.state = 'emerging'
    e.update(0.3)
    expect(e.state).toBe('emerging') // still emerging
    e.update(0.3)
    expect(e.state).toBe('visible')  // emerge complete
  })

  it('transitions VISIBLE → ATTACKING after attackInterval', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 1 })
    e.state = 'visible'
    e.update(0.5)
    expect(e.state).toBe('visible')
    e.update(0.6)
    expect(e.state).toBe('attacking')
  })

  it('takes damage; dies when hp reaches 0', () => {
    const e = new Enemy({ type: 'grunt', hp: 2, emergeTime: 1, attackInterval: 5 })
    e.state = 'visible'
    e.hit(1)
    expect(e.hp).toBe(1)
    expect(e.state).toBe('visible')
    e.hit(1)
    expect(e.hp).toBe(0)
    expect(e.state).toBe('dying')
  })

  it('ignores damage when dead', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 1, attackInterval: 5 })
    e.state = 'dead'
    e.hit(99)
    expect(e.hp).toBe(1)
  })

  it('transitions DYING → DEAD after dyingDuration', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 5 })
    e.state = 'dying'
    e.update(0.3)
    expect(e.state).toBe('dying')
    e.update(0.3)
    expect(e.state).toBe('dead')
  })

  it('isDead returns true only when dead', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 1, attackInterval: 5 })
    expect(e.isDead()).toBe(false)
    e.state = 'dead'
    expect(e.isDead()).toBe(true)
  })
})
