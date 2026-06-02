import { Shooter } from '../src/gameplay/Shooter.js'

vi.mock('three', () => {
  class FakeRaycaster {
    setFromCamera() {}
    intersectObjects(objects, recursive) {
      // Mirror three.js: when recursive, also test descendants.
      const all = []
      const collect = (o) => {
        all.push(o)
        if (recursive && o.children) o.children.forEach(collect)
      }
      objects.forEach(collect)
      return all
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

  it('hits geometry nested inside a group (GLB enemy)', () => {
    const shooter = new Shooter(null)
    // A cloned GLB enemy: the added object is a Group whose mesh lives in a child.
    const childMesh = { userData: { hit: true }, children: [] }
    const group = { userData: {}, children: [childMesh] }
    const hits = shooter.getHits({ x: 0, y: 0 }, [group])
    expect(hits).toHaveLength(1)
    expect(hits[0].object).toBe(childMesh)
  })
})
