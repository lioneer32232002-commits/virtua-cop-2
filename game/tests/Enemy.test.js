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

describe('Enemy lock-on', () => {
  it('phase runs green → yellow → red while visible, then fires at expiry', () => {
    // attackInterval is the lock-on window: green for the first 60%, yellow to
    // 85%, red for the final warning, then the enemy fires.
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 1 })
    e.state = 'visible'
    expect(e.lockPhase).toBe('green')         // t=0
    e.update(0.6)
    expect(e.lockPhase).toBe('yellow')        // f=0.60
    e.update(0.3)
    expect(e.lockPhase).toBe('red')           // f=0.90
    e.update(0.2)
    expect(e.state).toBe('attacking')         // f>1 → fires
  })

  it('has no lock phase before it is visible', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.5, attackInterval: 1 })
    expect(e.lockPhase).toBe(null)            // idle
    e.state = 'emerging'
    expect(e.lockPhase).toBe(null)            // still rising
  })

  it('lockRemaining counts down from 1 to 0 across the lock window', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 1 })
    e.state = 'visible'
    expect(e.lockRemaining).toBe(1)
    e.update(0.5)
    expect(e.lockRemaining).toBeCloseTo(0.5)
    e.update(0.4)
    expect(e.lockRemaining).toBeCloseTo(0.1)
  })

  it('lockRemaining is 0 when there is no active lock', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 1 })
    expect(e.lockRemaining).toBe(0)           // idle, no ring
    e.state = 'visible'
    e.hit(1, 'hand')                          // disarmed
    expect(e.lockRemaining).toBe(0)
  })

  it('kill multiplier reflects the lock phase at the lethal hit (faster = more)', () => {
    const green = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 1 })
    green.state = 'visible'
    green.hit(1)                              // f=0 green
    expect(green.killMultiplier).toBe(3)

    const yellow = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 1 })
    yellow.state = 'visible'
    yellow.update(0.7)
    yellow.hit(1)                             // f=0.7 yellow
    expect(yellow.killMultiplier).toBe(2)

    const red = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 1 })
    red.state = 'visible'
    red.update(0.9)
    red.hit(1)                               // f=0.9 red
    expect(red.killMultiplier).toBe(1)
  })

  it('non-lethal hits do not set a kill multiplier', () => {
    const e = new Enemy({ type: 'heavy', hp: 3, emergeTime: 0.1, attackInterval: 1 })
    e.state = 'visible'
    e.hit(1)                                 // survives
    expect(e.state).toBe('visible')
    expect(e.killMultiplier).toBe(null)
  })

  it('a kill during EMERGING earns the top multiplier (the fastest possible kill)', () => {
    // The enemy has no lock phase yet while rising, but killing it that early is
    // the quickest shot of all and must score the best, not the worst.
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 1, attackInterval: 1 })
    e.state = 'emerging'
    e.hit(1)
    expect(e.state).toBe('dying')
    expect(e.killMultiplier).toBe(3)
  })
})

describe('Enemy hit zones', () => {
  it('headshot is an instant kill regardless of remaining hp', () => {
    const e = new Enemy({ type: 'heavy', hp: 4, emergeTime: 0.1, attackInterval: 5 })
    e.state = 'visible'
    e.hit(1, 'head')
    expect(e.hp).toBe(0)
    expect(e.state).toBe('dying')
  })

  it('hand shot is a justice shot: disarms the enemy so it can never fire', () => {
    const e = new Enemy({ type: 'gunman', hp: 2, emergeTime: 0.1, attackInterval: 1 })
    e.state = 'visible'
    e.hit(1, 'hand')
    expect(e.disarmed).toBe(true)
    expect(e.justiceShot).toBe(true)
    expect(e.state).toBe('visible')          // survived (2hp − 1)
    expect(e.lockPhase).toBe(null)           // no threat ring once disarmed
    e.update(2)                              // lock window long expired
    expect(e.state).toBe('visible')          // but a disarmed enemy never attacks
  })

  it('body shot deals normal damage', () => {
    const e = new Enemy({ type: 'gunman', hp: 2, emergeTime: 0.1, attackInterval: 5 })
    e.state = 'visible'
    e.hit(1, 'body')
    expect(e.hp).toBe(1)
    expect(e.state).toBe('visible')
  })

  it('headshot does NOT instakill a boss — only deals its damage', () => {
    const e = new Enemy({ type: 'boss', hp: 10, emergeTime: 0.1, attackInterval: 5 })
    e.state = 'visible'
    e.hit(1, 'head')
    expect(e.hp).toBe(9)
    expect(e.state).toBe('visible')
  })
})

describe('Enemy despawn / lifetime', () => {
  it('a civilian with a lifetime leaves (despawns) after it elapses while visible', () => {
    const e = new Enemy({ type: 'innocent', hp: 1, emergeTime: 0.1, attackInterval: 999, lifetime: 3 })
    e.state = 'visible'
    e.update(2.9)
    expect(e.shouldRemove()).toBe(false)
    e.update(0.2)                            // total 3.1 > lifetime
    expect(e.shouldRemove()).toBe(true)
  })

  it('despawn() marks the enemy for removal without counting as a death', () => {
    const e = new Enemy({ type: 'innocent', hp: 1, emergeTime: 0.1, attackInterval: 999 })
    e.state = 'visible'
    expect(e.shouldRemove()).toBe(false)
    e.despawn()
    expect(e.shouldRemove()).toBe(true)
    expect(e.isDead()).toBe(false)           // it left, it was not killed
  })

  it('an enemy without a lifetime never auto-despawns', () => {
    const e = new Enemy({ type: 'grunt', hp: 1, emergeTime: 0.1, attackInterval: 2.5 })
    e.state = 'visible'
    e.update(10)
    expect(e.gone).toBe(false)
  })
})
