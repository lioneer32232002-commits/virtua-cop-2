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

  it('setAmmo updates ammo display', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.setAmmo(4)
    expect(container.querySelector('#ammo-count').textContent).toBe('4')
  })

  it('addScore accumulates and updates display', () => {
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
    hud.addScore(100)
    hud.addScore(250)
    expect(hud.score).toBe(350)
    expect(container.querySelector('#score').textContent).toBe('00350')
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
})
