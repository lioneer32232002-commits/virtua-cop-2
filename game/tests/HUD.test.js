import { HUD } from '../src/hud/HUD.js'

describe('HUD', () => {
  let container
  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'hud'
    document.body.appendChild(container)
  })
  afterEach(() => { document.body.removeChild(container) })

  it('renders initial life badges', () => {
    new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    expect(container.querySelectorAll('.life.full')).toHaveLength(5)
  })

  it('setHealth updates life badges', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.setHealth(3)
    expect(container.querySelectorAll('.life.full')).toHaveLength(3)
    expect(container.querySelectorAll('.life.empty')).toHaveLength(2)
  })

  it('setAmmo updates magazine slots', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.setAmmo(4)
    expect(container.querySelectorAll('.ammo-slot.full')).toHaveLength(4)
    expect(container.querySelectorAll('.ammo-slot.empty')).toHaveLength(2)
  })

  it('addScore accumulates and updates display', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.addScore(100)
    hud.addScore(250)
    expect(hud.score).toBe(350)
    expect(container.querySelector('#score').textContent).toBe('00000350')
  })

  it('updateHiScore only updates when score exceeds hiScore', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.addScore(1000)
    hud.updateHiScore()
    expect(hud.hiScore).toBe(1000)
    hud.addScore(500) // score now 1500
    hud.updateHiScore()
    expect(hud.hiScore).toBe(1500)
  })

  it('updateLockOns renders one ring per active lock, coloured by phase', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.updateLockOns([
      { x: 100, y: 50, phase: 'green', remaining: 1 },
      { x: 200, y: 80, phase: 'red',   remaining: 0.1 },
    ])
    const rings = container.querySelectorAll('.lock-ring')
    expect(rings).toHaveLength(2)
    expect(rings[0].classList.contains('green')).toBe(true)
    expect(rings[1].classList.contains('red')).toBe(true)
  })

  it('updateLockOns positions and sizes a ring (bigger when more time remains)', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.updateLockOns([{ x: 120, y: 60, phase: 'green', remaining: 1 }])
    const full = container.querySelector('.lock-ring')
    expect(full.style.left).toBe('120px')
    expect(full.style.top).toBe('60px')
    const fullSize = parseFloat(full.style.width)
    hud.updateLockOns([{ x: 120, y: 60, phase: 'red', remaining: 0 }])
    const empty = container.querySelector('.lock-ring')
    expect(parseFloat(empty.style.width)).toBeLessThan(fullSize)
  })

  it('updateLockOns removes rings when locks disappear', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.updateLockOns([{ x: 10, y: 10, phase: 'green', remaining: 1 }])
    expect(container.querySelectorAll('.lock-ring')).toHaveLength(1)
    hud.updateLockOns([])
    expect(container.querySelectorAll('.lock-ring')).toHaveLength(0)
  })

  it('flashDamage activates the damage overlay (enemy-fire screen telegraph)', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    const overlay = container.querySelector('#damage-flash')
    expect(overlay).not.toBeNull()
    expect(overlay.classList.contains('active')).toBe(false)
    hud.flashDamage()
    expect(overlay.classList.contains('active')).toBe(true)
  })

  it('showCard displays the given text and marks the card active', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    const card = container.querySelector('#hud-card')
    expect(card).not.toBeNull()
    expect(card.classList.contains('active')).toBe(false)
    hud.showCard('JUSTICE SHOT')
    expect(card.textContent).toBe('JUSTICE SHOT')
    expect(card.classList.contains('active')).toBe(true)
  })

  it('setBossBar shows the boss health bar scaled to the hp fraction', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    const bar = container.querySelector('#boss-bar')
    expect(bar).not.toBeNull()
    expect(bar.classList.contains('active')).toBe(false)
    hud.setBossBar(6, 12)
    expect(bar.classList.contains('active')).toBe(true)
    expect(container.querySelector('#boss-bar-fill').style.width).toBe('50%')
  })

  it('hideBossBar removes the boss health bar', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.setBossBar(12, 12)
    hud.hideBossBar()
    expect(container.querySelector('#boss-bar').classList.contains('active')).toBe(false)
  })

  it('setReserve shows the reserve mag count', () => {
    const hud = new HUD(document.createElement('div'), { maxHealth: 5, maxAmmo: 7 })
    hud.setReserve(2)
    expect(hud._container.querySelector('#reserve-mags').textContent).toContain('2')
  })

  it('lock ring grows with remaining time (40px empty → 100px full)', () => {
    const hud = new HUD(document.createElement('div'), { maxHealth: 5, maxAmmo: 7 })
    hud.updateLockOns([{ x: 10, y: 10, phase: 'green', remaining: 1 }])
    const ring = hud._container.querySelector('.lock-ring')
    expect(ring.style.width).toBe('100px')
  })
})
