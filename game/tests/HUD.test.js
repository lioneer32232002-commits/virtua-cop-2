import { HUD } from '../src/hud/HUD.js'

describe('HUD', () => {
  let container
  beforeEach(() => {
    container = document.createElement('div')
    container.id = 'hud'
    document.body.appendChild(container)
  })
  afterEach(() => { document.body.removeChild(container) })

  it('renders initial health hearts', () => {
    new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    expect(container.querySelectorAll('.heart.full')).toHaveLength(5)
  })

  it('setHealth updates hearts', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.setHealth(3)
    expect(container.querySelectorAll('.heart.full')).toHaveLength(3)
    expect(container.querySelectorAll('.heart.empty')).toHaveLength(2)
  })

  it('setAmmo updates bullet icons', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.setAmmo(4)
    expect(container.querySelectorAll('.bullet.full')).toHaveLength(4)
    expect(container.querySelectorAll('.bullet.empty')).toHaveLength(2)
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
})
