import { InputManager } from '../src/input/InputManager.js'

describe('InputManager', () => {
  it('onReload fires registered callbacks on a right-click (contextmenu)', () => {
    const input = new InputManager()
    let reloads = 0
    input.onReload(() => { reloads++ })
    window.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }))
    expect(reloads).toBe(1)
  })

  it('onShoot still fires on a left click', () => {
    const input = new InputManager()
    let shots = 0
    input.onShoot(() => { shots++ })
    window.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    expect(shots).toBe(1)
  })
})
