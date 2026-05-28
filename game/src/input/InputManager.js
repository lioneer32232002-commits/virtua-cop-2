export class InputManager {
  /** Normalised mouse coords in [-1, 1] */
  mouse = { x: 0, y: 0 }
  /** Raw pixel coords */
  mousePixels = { x: 0, y: 0 }
  /** Whether a click happened this frame (consumed by caller) */
  clicked = false

  /** @type {(() => void)[]} */ _clickListeners = []

  constructor() {
    this._crosshair = document.getElementById('crosshair')
    window.addEventListener('mousemove', (e) => this._onMove(e))
    window.addEventListener('click', (e) => this._onClick(e))
  }

  _onMove(e) {
    this.mousePixels.x = e.clientX
    this.mousePixels.y = e.clientY
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1
    if (this._crosshair) {
      this._crosshair.style.left = e.clientX + 'px'
      this._crosshair.style.top = e.clientY + 'px'
    }
  }

  _onClick() {
    this.clicked = true
    this._clickListeners.forEach(fn => fn())
  }

  /** Call once per frame to consume the click flag */
  consumeClick() {
    const c = this.clicked
    this.clicked = false
    return c
  }

  /** @param {() => void} fn */
  onShoot(fn) { this._clickListeners.push(fn) }
}
