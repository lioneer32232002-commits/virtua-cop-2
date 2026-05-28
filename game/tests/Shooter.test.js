import { Shooter } from '../src/gameplay/Shooter.js'

vi.mock('three', () => {
  class FakeRaycaster {
    setFromCamera() {}
    intersectObjects(objects) {
      return objects
        .filter(o => o.userData?.hit)
        .map(o => ({ object: o, distance: 5 }))
    }
  }
  return {
    Raycaster: FakeRaycaster,
    Vector2: class { constructor(x, y) { this.x = x; this.y = y } },
  }
})

describe('Shooter', () => {
  it('returns empty array when nothing hit', () => {
    const shooter = new Shooter(null)
    const objs = [{ userData: {} }]
    expect(shooter.getHits({ x: 0, y: 0 }, objs)).toHaveLength(0)
  })

  it('returns hit objects', () => {
    const shooter = new Shooter(null)
    const objs = [{ userData: { hit: true } }, { userData: {} }]
    const hits = shooter.getHits({ x: 0, y: 0 }, objs)
    expect(hits).toHaveLength(1)
    expect(hits[0].object.userData.hit).toBe(true)
  })
})
