# Virtua Cop 2 — Three.js Game Framework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-playable Virtua Cop 2 rail shooter using Three.js with placeholder geometry for Stages 1–3, deployable to the existing Cloudflare Worker at `virtua-cop-2.wizard32232002.workers.dev`.

**Architecture:** A vanilla JavaScript Vite app lives in `game/` under the repo root. Game logic is split into small focused modules: `GameLoop` drives RAF ticks, `CameraRig` advances the camera along a CatmullRom rail, `LevelDirector` triggers enemy waves from JSON data, and `EnemyManager` owns the Three.js mesh lifecycle. HTML/CSS overlays serve as HUD (no Three.js sprites). Existing Unity C# files in `Assets/Scripts/` are reference material for game logic translation.

**Tech Stack:** Three.js r168, Vite 6, Vitest 2, vanilla JavaScript (JSDoc for type hints), Web Audio API for synthesized SFX, Cloudflare Workers static assets via Wrangler.

**Working directory for all commands:** `game/` inside the repo root (`C:\Users\oneda\OneDrive\02_創作\14_AI TEST\VirtuaCop2\game\`).

---

## File Map

```
game/
├── index.html
├── package.json
├── vite.config.js
├── src/
│   ├── main.js                    entry — init, wire everything
│   ├── GameLoop.js                RAF loop, delta time, pause/resume
│   ├── GameManager.js             state machine: MENU/PLAYING/CLEAR_POINT/STAGE_CLEAR/DEAD
│   ├── render/
│   │   ├── Renderer.js            WebGLRenderer, resize, lights
│   │   └── CameraRig.js           CatmullRomCurve3 rail, advance/pause
│   ├── input/
│   │   └── InputManager.js        normalised mouse coords, click events
│   ├── gameplay/
│   │   ├── Shooter.js             Three.js Raycaster, getHits(normalizedMouse, objects)
│   │   ├── Enemy.js               state machine, hp, mesh ref (mesh = null for tests)
│   │   └── EnemyManager.js        spawn meshes, update loop, cleanup dead
│   ├── scene/
│   │   └── StageEnvironment.js    per-stage placeholder geometry (floor, walls, pillars)
│   ├── level/
│   │   ├── LevelLoader.js         validate + return parsed level JSON
│   │   ├── LevelDirector.js       time-based wave/clearPoint/boss orchestration
│   │   └── levels/
│   │       ├── stage1.json
│   │       ├── stage2.json
│   │       └── stage3.json
│   ├── hud/
│   │   └── HUD.js                 DOM manipulation: health/ammo/score/hi-score
│   └── audio/
│       └── AudioManager.js        Web Audio API oscillator SFX
└── tests/
    ├── GameLoop.test.js
    ├── Enemy.test.js
    ├── EnemyManager.test.js
    ├── LevelLoader.test.js
    ├── LevelDirector.test.js
    └── HUD.test.js
```

---

## Task 1: Bootstrap Vite + Three.js project

**Files:**
- Create: `game/package.json`
- Create: `game/vite.config.js`
- Create: `game/index.html`
- Create: `game/src/main.js`

- [ ] **Step 1: Create `game/package.json`**

```json
{
  "name": "virtua-cop-2",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "three": "^0.168.0"
  },
  "devDependencies": {
    "vite": "^6.0.0",
    "vitest": "^2.0.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create `game/vite.config.js`**

```js
import { defineConfig } from 'vite'

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 3: Create `game/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Virtua Cop 2</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; }
    #canvas-container { width: 100vw; height: 100vh; }
    #canvas-container canvas { display: block; }
  </style>
</head>
<body>
  <div id="canvas-container"></div>
  <div id="hud"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create `game/src/main.js`** (hello world stub)

```js
import * as THREE from 'three'

const container = document.getElementById('canvas-container')
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
container.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x222222)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000)
camera.position.set(0, 2, 5)

const geo = new THREE.BoxGeometry(1, 1, 1)
const mat = new THREE.MeshBasicMaterial({ color: 0x00ff88 })
const box = new THREE.Mesh(geo, mat)
scene.add(box)

function animate() {
  requestAnimationFrame(animate)
  box.rotation.y += 0.01
  renderer.render(scene, camera)
}
animate()
```

- [ ] **Step 5: Install dependencies and start dev server**

```bash
cd game
npm install
npm run dev
```

Expected: Vite prints `Local: http://localhost:5173/`, browser shows a rotating green box on dark background.

- [ ] **Step 6: Verify build produces dist/**

```bash
npm run build
```

Expected: `dist/` directory created, `dist/index.html` + `dist/assets/*.js` present. No errors.

- [ ] **Step 7: Commit**

```bash
git add game/
git commit -m "feat(game): bootstrap Vite + Three.js project skeleton"
```

---

## Task 2: Renderer module

**Files:**
- Create: `game/src/render/Renderer.js`
- Modify: `game/src/main.js`

- [ ] **Step 1: Create `game/src/render/Renderer.js`**

```js
import * as THREE from 'three'

export class Renderer {
  /** @type {THREE.WebGLRenderer} */
  webgl
  /** @type {THREE.Scene} */
  scene
  /** @type {THREE.PerspectiveCamera} */
  camera

  constructor(container) {
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x111122)
    this.scene.fog = new THREE.Fog(0x111122, 20, 80)

    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500)

    this.webgl = new THREE.WebGLRenderer({ antialias: true })
    this.webgl.setPixelRatio(window.devicePixelRatio)
    this.webgl.setSize(window.innerWidth, window.innerHeight)
    this.webgl.shadowMap.enabled = true
    container.appendChild(this.webgl.domElement)

    this._addLights()
    window.addEventListener('resize', () => this._onResize())
  }

  _addLights() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.4)
    this.scene.add(ambient)

    const sun = new THREE.DirectionalLight(0xffffff, 1.2)
    sun.position.set(10, 20, 10)
    sun.castShadow = true
    this.scene.add(sun)
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.webgl.setSize(w, h)
  }

  render() {
    this.webgl.render(this.scene, this.camera)
  }
}
```

- [ ] **Step 2: Update `game/src/main.js` to use Renderer**

```js
import { Renderer } from './render/Renderer.js'

const container = document.getElementById('canvas-container')
const renderer = new Renderer(container)

// placeholder box
import * as THREE from 'three'
const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0x00ff88 })
)
renderer.scene.add(box)

renderer.camera.position.set(0, 2, 5)
renderer.camera.lookAt(0, 0, 0)

function animate() {
  requestAnimationFrame(animate)
  box.rotation.y += 0.01
  renderer.render()
}
animate()
```

- [ ] **Step 3: Run dev server and verify**

```bash
npm run dev
```

Expected: green box rendered with proper lighting (Lambert shading visible), window resize doesn't distort aspect ratio.

- [ ] **Step 4: Commit**

```bash
git add game/src/render/Renderer.js game/src/main.js
git commit -m "feat(render): extract Renderer module with lights and resize handler"
```

---

## Task 3: GameLoop with delta time

**Files:**
- Create: `game/src/GameLoop.js`
- Create: `game/tests/GameLoop.test.js`
- Modify: `game/src/main.js`

- [ ] **Step 1: Write the failing test**

```js
// game/tests/GameLoop.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/GameLoop.js'`

- [ ] **Step 3: Create `game/src/GameLoop.js`**

```js
export class GameLoop {
  /** @type {boolean} */ running = false
  /** @type {number} */ _lastTime = 0
  /** @type {(dt: number) => void} */ _onTick

  /** @param {(dt: number) => void} onTick - called each frame, dt in seconds */
  constructor(onTick) {
    this._onTick = onTick
    this._raf = null
  }

  start() {
    this.running = true
    this._lastTime = performance.now()
    this._raf = requestAnimationFrame((t) => this._tick(t))
  }

  stop() {
    this.running = false
    if (this._raf) cancelAnimationFrame(this._raf)
  }

  pause() {
    this.running = false
    if (this._raf) cancelAnimationFrame(this._raf)
  }

  resume() {
    if (this.running) return
    this.running = true
    this._lastTime = performance.now()
    this._raf = requestAnimationFrame((t) => this._tick(t))
  }

  /** @param {number} now - performance.now() ms timestamp */
  _tick(now) {
    if (!this.running) return
    const rawDt = (now - this._lastTime) / 1000
    const dt = Math.min(rawDt, 0.1) // cap at 100ms to prevent spiral of death
    this._lastTime = now
    this._onTick(dt)
    this._raf = requestAnimationFrame((t) => this._tick(t))
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 3 tests pass.

- [ ] **Step 5: Update `game/src/main.js` to use GameLoop**

```js
import * as THREE from 'three'
import { Renderer } from './render/Renderer.js'
import { GameLoop } from './GameLoop.js'

const container = document.getElementById('canvas-container')
const renderer = new Renderer(container)

const box = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshLambertMaterial({ color: 0x00ff88 })
)
renderer.scene.add(box)
renderer.camera.position.set(0, 2, 5)
renderer.camera.lookAt(0, 0, 0)

const loop = new GameLoop((dt) => {
  box.rotation.y += dt * 1.5
  renderer.render()
})
loop.start()
```

- [ ] **Step 6: Verify in browser — box rotates smoothly regardless of frame rate**

```bash
npm run dev
```

Expected: rotation is smooth, no jitter.

- [ ] **Step 7: Commit**

```bash
git add game/src/GameLoop.js game/tests/GameLoop.test.js game/src/main.js
git commit -m "feat(game): add GameLoop with delta time and 100ms cap"
```

---

## Task 4: CameraRig — rail camera

**Files:**
- Create: `game/src/render/CameraRig.js`
- Create: `game/tests/CameraRig.test.js`

- [ ] **Step 1: Write the failing test**

```js
// game/tests/CameraRig.test.js
import { CameraRig } from '../src/render/CameraRig.js'

// Mock THREE since no WebGL in test env
vi.mock('three', () => ({
  CatmullRomCurve3: class {
    constructor(pts) { this._pts = pts }
    getPoint(t) { return { x: t, y: 0, z: -t * 10, clone: () => ({ x: t, y: 0, z: -t * 10 }) } }
    getTangent(t) { return { x: 0, y: 0, z: -1 } }
  },
  Vector3: class {
    constructor(x=0, y=0, z=0) { this.x = x; this.y = y; this.z = z }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this }
    addScaledVector(v, s) { this.x += v.x*s; this.y += v.y*s; this.z += v.z*s; return this }
    clone() { return new this.constructor(this.x, this.y, this.z) }
  },
}))

describe('CameraRig', () => {
  function makePoints() {
    const V3 = require('three').Vector3
    return [new V3(0,1,0), new V3(0,1,-10), new V3(0,1,-20)]
  }

  it('starts at progress 0', () => {
    const rig = new CameraRig(null, makePoints(), 30)
    expect(rig.progress).toBe(0)
  })

  it('advances progress with advance(dt)', () => {
    const rig = new CameraRig(null, makePoints(), 30)
    rig.advance(3) // 3s out of 30s = 0.1
    expect(rig.progress).toBeCloseTo(0.1)
  })

  it('clamps progress at 1', () => {
    const rig = new CameraRig(null, makePoints(), 30)
    rig.advance(100)
    expect(rig.progress).toBe(1)
  })

  it('does not advance when paused', () => {
    const rig = new CameraRig(null, makePoints(), 30)
    rig.pause()
    rig.advance(5)
    expect(rig.progress).toBe(0)
  })

  it('resumes advancing after resume()', () => {
    const rig = new CameraRig(null, makePoints(), 30)
    rig.pause()
    rig.resume()
    rig.advance(3)
    expect(rig.progress).toBeCloseTo(0.1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/render/CameraRig.js'`

- [ ] **Step 3: Create `game/src/render/CameraRig.js`**

```js
import * as THREE from 'three'

export class CameraRig {
  /** @type {number} 0–1 */ progress = 0
  /** @type {boolean} */ paused = false
  /** @type {THREE.PerspectiveCamera|null} */ camera
  /** @type {THREE.CatmullRomCurve3} */ curve
  /** @type {number} total duration in seconds */ duration

  /**
   * @param {THREE.PerspectiveCamera|null} camera
   * @param {THREE.Vector3[]} waypoints - world-space rail control points
   * @param {number} duration - total seconds to traverse the full rail
   */
  constructor(camera, waypoints, duration) {
    this.camera = camera
    this.curve = new THREE.CatmullRomCurve3(waypoints)
    this.duration = duration
  }

  pause() { this.paused = true }
  resume() { this.paused = false }

  /** @param {number} dt - seconds */
  advance(dt) {
    if (this.paused) return
    this.progress = Math.min(1, this.progress + dt / this.duration)
    if (this.camera) this._applyToCamera()
  }

  _applyToCamera() {
    const pos = this.curve.getPoint(this.progress)
    const tangent = this.curve.getTangent(this.progress)
    this.camera.position.copy(pos)
    const lookTarget = pos.clone().addScaledVector(tangent, 1)
    this.camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z)
  }

  reset() {
    this.progress = 0
    this.paused = false
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 5 CameraRig tests pass.

- [ ] **Step 5: Commit**

```bash
git add game/src/render/CameraRig.js game/tests/CameraRig.test.js
git commit -m "feat(render): add CameraRig with CatmullRom rail and pause/resume"
```

---

## Task 5: InputManager — mouse crosshair + click

**Files:**
- Create: `game/src/input/InputManager.js`
- Modify: `game/index.html` (add crosshair CSS)

- [ ] **Step 1: Add crosshair CSS to `game/index.html`**

Replace the `<style>` block with:

```html
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; cursor: none; }
    #canvas-container { width: 100vw; height: 100vh; }
    #canvas-container canvas { display: block; }
    #hud { position: fixed; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; }
    #crosshair {
      position: fixed;
      width: 28px; height: 28px;
      pointer-events: none;
      transform: translate(-50%, -50%);
    }
    #crosshair::before, #crosshair::after {
      content: '';
      position: absolute;
      background: rgba(255,255,0,0.9);
    }
    #crosshair::before { width: 2px; height: 100%; left: 50%; top: 0; transform: translateX(-50%); }
    #crosshair::after  { width: 100%; height: 2px; top: 50%; left: 0; transform: translateY(-50%); }
    #crosshair .ring {
      position: absolute; inset: 4px;
      border: 2px solid rgba(255,255,0,0.6);
      border-radius: 50%;
    }
  </style>
```

Also add crosshair div after `<div id="hud">`:
```html
  <div id="crosshair"><div class="ring"></div></div>
```

- [ ] **Step 2: Create `game/src/input/InputManager.js`**

```js
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

  _onClick(e) {
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
```

- [ ] **Step 3: Run dev server and verify crosshair follows mouse**

```bash
npm run dev
```

Expected: yellow crosshair (crosshair lines + ring) moves with mouse cursor; system cursor is hidden.

- [ ] **Step 4: Commit**

```bash
git add game/src/input/InputManager.js game/index.html
git commit -m "feat(input): add InputManager with normalised mouse coords and CSS crosshair"
```

---

## Task 6: Shooter — raycasting

**Files:**
- Create: `game/src/gameplay/Shooter.js`
- Create: `game/tests/Shooter.test.js`

- [ ] **Step 1: Write the failing test**

```js
// game/tests/Shooter.test.js
import { Shooter } from '../src/gameplay/Shooter.js'

vi.mock('three', () => {
  class FakeRaycaster {
    setFromCamera() {}
    intersectObjects(objects) {
      // return any object that has userData.hit === true
      return objects
        .filter(o => o.userData?.hit)
        .map(o => ({ object: o, distance: 5 }))
    }
  }
  return { Raycaster: FakeRaycaster, Vector2: class { constructor(x,y){this.x=x;this.y=y} } }
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/gameplay/Shooter.js'`

- [ ] **Step 3: Create `game/src/gameplay/Shooter.js`**

```js
import * as THREE from 'three'

export class Shooter {
  /** @type {THREE.PerspectiveCamera|null} */ camera
  /** @type {THREE.Raycaster} */ raycaster

  /** @param {THREE.PerspectiveCamera|null} camera */
  constructor(camera) {
    this.camera = camera
    this.raycaster = new THREE.Raycaster()
  }

  /**
   * @param {{ x: number, y: number }} normalizedMouse - in [-1, 1]
   * @param {THREE.Object3D[]} objects - meshes to test against
   * @returns {THREE.Intersection[]}
   */
  getHits(normalizedMouse, objects) {
    if (!this.camera) return []
    this.raycaster.setFromCamera(
      new THREE.Vector2(normalizedMouse.x, normalizedMouse.y),
      this.camera
    )
    return this.raycaster.intersectObjects(objects, false)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 2 Shooter tests pass, all other tests still pass.

- [ ] **Step 5: Commit**

```bash
git add game/src/gameplay/Shooter.js game/tests/Shooter.test.js
git commit -m "feat(gameplay): add Shooter with raycasting abstraction"
```

---

## Task 7: Enemy class — state machine

**Files:**
- Create: `game/src/gameplay/Enemy.js`
- Create: `game/tests/Enemy.test.js`

- [ ] **Step 1: Write the failing test**

```js
// game/tests/Enemy.test.js
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/gameplay/Enemy.js'`

- [ ] **Step 3: Create `game/src/gameplay/Enemy.js`**

```js
export const EnemyState = Object.freeze({
  IDLE: 'idle',
  EMERGING: 'emerging',
  VISIBLE: 'visible',
  ATTACKING: 'attacking',
  DYING: 'dying',
  DEAD: 'dead',
})

export class Enemy {
  static DYING_DURATION = 0.5

  /**
   * @param {{ type: string, hp: number, emergeTime: number, attackInterval: number }} config
   */
  constructor(config) {
    this.type = config.type
    this.hp = config.hp
    this.emergeTime = config.emergeTime
    this.attackInterval = config.attackInterval
    this.state = EnemyState.IDLE
    this._timer = 0
    /** @type {import('three').Mesh|null} Three.js mesh — null during tests */
    this.mesh = null
    this.onDamageDealt = null // () => void — set by EnemyManager
  }

  /** @param {number} dt seconds */
  update(dt) {
    this._timer += dt
    switch (this.state) {
      case EnemyState.EMERGING:
        if (this._timer >= this.emergeTime) {
          this.state = EnemyState.VISIBLE
          this._timer = 0
        }
        break
      case EnemyState.VISIBLE:
        if (this._timer >= this.attackInterval) {
          this.state = EnemyState.ATTACKING
          this._timer = 0
          if (this.onDamageDealt) this.onDamageDealt()
        }
        break
      case EnemyState.ATTACKING:
        // return to visible after short attack pose (0.3s)
        if (this._timer >= 0.3) {
          this.state = EnemyState.VISIBLE
          this._timer = 0
        }
        break
      case EnemyState.DYING:
        if (this._timer >= Enemy.DYING_DURATION) {
          this.state = EnemyState.DEAD
        }
        break
    }
  }

  /** @param {number} damage */
  hit(damage) {
    if (this.state === EnemyState.DEAD || this.state === EnemyState.DYING) return
    this.hp -= damage
    if (this.hp <= 0) {
      this.hp = 0
      this.state = EnemyState.DYING
      this._timer = 0
    }
  }

  isDead() { return this.state === EnemyState.DEAD }
  isActive() { return this.state !== EnemyState.IDLE && !this.isDead() }

  emerge() {
    if (this.state !== EnemyState.IDLE) return
    this.state = EnemyState.EMERGING
    this._timer = 0
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 7 Enemy tests pass.

- [ ] **Step 5: Commit**

```bash
git add game/src/gameplay/Enemy.js game/tests/Enemy.test.js
git commit -m "feat(gameplay): add Enemy state machine (idle/emerging/visible/attacking/dying/dead)"
```

---

## Task 8: EnemyManager — spawn, update, cleanup

**Files:**
- Create: `game/src/gameplay/EnemyManager.js`
- Create: `game/tests/EnemyManager.test.js`

- [ ] **Step 1: Write the failing test**

```js
// game/tests/EnemyManager.test.js
import { EnemyManager } from '../src/gameplay/EnemyManager.js'

vi.mock('three', () => ({
  Mesh: class { constructor() { this.position = {x:0,y:0,z:0,set:()=>{}}; this.visible = true; this.userData = {} } },
  BoxGeometry: class {},
  MeshLambertMaterial: class {},
  Color: class {},
  Vector3: class { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z} },
}))

describe('EnemyManager', () => {
  function makeManager() {
    const scene = { add: vi.fn(), remove: vi.fn() }
    return new EnemyManager(scene)
  }

  it('starts with no enemies', () => {
    const mgr = makeManager()
    expect(mgr.enemies).toHaveLength(0)
  })

  it('spawns enemies from wave data', () => {
    const mgr = makeManager()
    mgr.spawnWave([
      { type: 'grunt', position: [5, 0, -10], hp: 1 },
      { type: 'gunman', position: [-5, 0, -10], hp: 2 },
    ])
    expect(mgr.enemies).toHaveLength(2)
  })

  it('removes dead enemies after update', () => {
    const mgr = makeManager()
    mgr.spawnWave([{ type: 'grunt', position: [0, 0, -10], hp: 1 }])
    const enemy = mgr.enemies[0]
    enemy.state = 'dead'
    mgr.update(0.1)
    expect(mgr.enemies).toHaveLength(0)
  })

  it('aliveCount returns non-dead enemies', () => {
    const mgr = makeManager()
    mgr.spawnWave([
      { type: 'grunt', position: [0,0,-5], hp: 1 },
      { type: 'grunt', position: [2,0,-5], hp: 1 },
    ])
    mgr.enemies[0].state = 'dead'
    expect(mgr.aliveCount()).toBe(1)
  })

  it('clear() removes all enemies from scene', () => {
    const mgr = makeManager()
    mgr.spawnWave([{ type: 'grunt', position: [0,0,-5], hp: 1 }])
    mgr.clear()
    expect(mgr.enemies).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/gameplay/EnemyManager.js'`

- [ ] **Step 3: Create `game/src/gameplay/EnemyManager.js`**

```js
import * as THREE from 'three'
import { Enemy, EnemyState } from './Enemy.js'

const ENEMY_COLORS = {
  grunt:  0xcc4444,
  gunman: 0x4444cc,
  heavy:  0x888844,
  boss:   0x222222,
  innocent: 0xffccaa,
}

export class EnemyManager {
  /** @type {Enemy[]} */ enemies = []
  /** @type {THREE.Scene} */ scene
  /** Called when any enemy deals damage: (damage: number) => void */
  onEnemyAttack = null

  /** @param {THREE.Scene} scene */
  constructor(scene) {
    this.scene = scene
  }

  /**
   * @param {{ type: string, position: [number,number,number], hp: number }[]} waveData
   */
  spawnWave(waveData) {
    for (const data of waveData) {
      const emergeTime = data.type === 'heavy' ? 1.5 : 0.8
      const attackInterval = data.type === 'innocent' ? 999 : 2.5
      const enemy = new Enemy({ type: data.type, hp: data.hp, emergeTime, attackInterval })
      enemy.onDamageDealt = () => { if (this.onEnemyAttack) this.onEnemyAttack(1) }

      const size = data.type === 'heavy' ? 0.8 : data.type === 'boss' ? 1.5 : 0.5
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(size, size * 2, size),
        new THREE.MeshLambertMaterial({ color: new THREE.Color(ENEMY_COLORS[data.type] ?? 0xff0000) })
      )
      mesh.position.set(...data.position)
      mesh.userData.enemyRef = enemy
      enemy.mesh = mesh
      this.scene.add(mesh)
      this.enemies.push(enemy)
      enemy.emerge()
    }
  }

  /** @param {number} dt */
  update(dt) {
    const dead = []
    for (const enemy of this.enemies) {
      enemy.update(dt)
      if (enemy.mesh) {
        // flash mesh red while dying
        if (enemy.state === EnemyState.DYING) enemy.mesh.visible = Math.sin(Date.now() * 0.02) > 0
        if (enemy.isDead()) {
          this.scene.remove(enemy.mesh)
          dead.push(enemy)
        }
      }
    }
    this.enemies = this.enemies.filter(e => !dead.includes(e))
  }

  /** @returns {THREE.Mesh[]} all active enemy meshes for raycasting */
  getActiveMeshes() {
    return this.enemies
      .filter(e => e.state === EnemyState.VISIBLE || e.state === EnemyState.ATTACKING)
      .map(e => e.mesh)
      .filter(Boolean)
  }

  aliveCount() {
    return this.enemies.filter(e => !e.isDead()).length
  }

  clear() {
    for (const enemy of this.enemies) {
      if (enemy.mesh) this.scene.remove(enemy.mesh)
    }
    this.enemies = []
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 5 EnemyManager tests pass.

- [ ] **Step 5: Commit**

```bash
git add game/src/gameplay/EnemyManager.js game/tests/EnemyManager.test.js
git commit -m "feat(gameplay): add EnemyManager with spawn, update, and cleanup"
```

---

## Task 9: HUD module

**Files:**
- Create: `game/src/hud/HUD.js`
- Create: `game/tests/HUD.test.js`
- Modify: `game/index.html` (add HUD inner elements)

- [ ] **Step 1: Write the failing test**

```js
// game/tests/HUD.test.js
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
    const hud = new HUD(container, { maxHealth: 5, maxAmmo: 6 })
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/hud/HUD.js'`

- [ ] **Step 3: Create `game/src/hud/HUD.js`**

```js
export class HUD {
  score = 0
  hiScore = 0
  health
  maxHealth
  ammo
  maxAmmo

  /**
   * @param {HTMLElement} container
   * @param {{ maxHealth: number, maxAmmo: number }} config
   */
  constructor(container, config) {
    this.maxHealth = config.maxHealth
    this.health = config.maxHealth
    this.maxAmmo = config.maxAmmo
    this.ammo = config.maxAmmo
    this._build(container)
  }

  _build(container) {
    container.innerHTML = `
      <div id="hud-inner">
        <div id="health-bar"></div>
        <div id="ammo-bar">AMMO: <span id="ammo-count">${this.ammo}</span> / ${this.maxAmmo}</div>
        <div id="score-panel">
          SCORE <span id="score">00000</span> &nbsp; HI <span id="hi-score">00000</span>
        </div>
      </div>
    `
    const style = document.createElement('style')
    style.textContent = `
      #hud-inner { position:absolute; top:0; left:0; right:0; padding:8px 16px;
        display:flex; justify-content:space-between; align-items:center;
        color:#fff; font:bold 16px monospace; text-shadow:1px 1px 2px #000; }
      #health-bar { display:flex; gap:4px; }
      .heart { font-size:20px; }
      .heart.full::before { content:'♥'; color:#f44; }
      .heart.empty::before { content:'♡'; color:#888; }
    `
    container.appendChild(style)
    this._renderHearts()
  }

  _renderHearts() {
    const bar = document.querySelector('#health-bar')
    if (!bar) return
    bar.innerHTML = ''
    for (let i = 0; i < this.maxHealth; i++) {
      const span = document.createElement('span')
      span.className = 'heart ' + (i < this.health ? 'full' : 'empty')
      bar.appendChild(span)
    }
  }

  /** @param {number} hp */
  setHealth(hp) {
    this.health = Math.max(0, Math.min(this.maxHealth, hp))
    this._renderHearts()
  }

  /** @param {number} ammo */
  setAmmo(ammo) {
    this.ammo = Math.max(0, ammo)
    const el = document.querySelector('#ammo-count')
    if (el) el.textContent = String(this.ammo)
  }

  /** @param {number} points */
  addScore(points) {
    this.score += points
    const el = document.querySelector('#score')
    if (el) el.textContent = String(this.score).padStart(5, '0')
  }

  updateHiScore() {
    if (this.score > this.hiScore) {
      this.hiScore = this.score
      const el = document.querySelector('#hi-score')
      if (el) el.textContent = String(this.hiScore).padStart(5, '0')
    }
  }

  reset(keepHiScore = true) {
    const prev = keepHiScore ? this.hiScore : 0
    this.score = 0
    this.hiScore = prev
    this.setHealth(this.maxHealth)
    this.setAmmo(this.maxAmmo)
    this.addScore(0)
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 5 HUD tests pass.

- [ ] **Step 5: Commit**

```bash
git add game/src/hud/HUD.js game/tests/HUD.test.js
git commit -m "feat(hud): add HUD with health hearts, ammo counter, score, hi-score"
```

---

## Task 10: Level JSON format + LevelLoader

**Files:**
- Create: `game/src/level/LevelLoader.js`
- Create: `game/src/level/levels/stage1.json`
- Create: `game/tests/LevelLoader.test.js`

- [ ] **Step 1: Write the failing test**

```js
// game/tests/LevelLoader.test.js
import { LevelLoader } from '../src/level/LevelLoader.js'
import stage1 from '../src/level/levels/stage1.json'

describe('LevelLoader', () => {
  it('loads and validates stage1', () => {
    const data = LevelLoader.validate(stage1)
    expect(data.id).toBe('stage1')
    expect(data.railPath.length).toBeGreaterThan(2)
    expect(data.waves.length).toBeGreaterThan(0)
    expect(typeof data.duration).toBe('number')
  })

  it('throws on missing id', () => {
    expect(() => LevelLoader.validate({ ...stage1, id: undefined })).toThrow('id')
  })

  it('throws on missing railPath', () => {
    expect(() => LevelLoader.validate({ ...stage1, railPath: undefined })).toThrow('railPath')
  })

  it('throws on railPath with fewer than 3 points', () => {
    expect(() => LevelLoader.validate({ ...stage1, railPath: [[0,0,0],[1,1,1]] })).toThrow('railPath')
  })

  it('wave enemies have required fields', () => {
    const data = LevelLoader.validate(stage1)
    for (const wave of data.waves) {
      for (const enemy of wave.enemies) {
        expect(enemy.type).toBeTruthy()
        expect(Array.isArray(enemy.position)).toBe(true)
        expect(typeof enemy.hp).toBe('number')
      }
    }
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/level/LevelLoader.js'`

- [ ] **Step 3: Create `game/src/level/levels/stage1.json`**

```json
{
  "id": "stage1",
  "name": "Stage 1 — Harbor District",
  "duration": 35,
  "railPath": [
    [0, 1.5,  0],
    [0, 1.5, -8],
    [3, 1.5, -16],
    [0, 1.5, -24],
    [-3, 1.5, -32],
    [0, 1.5, -40]
  ],
  "environment": { "type": "harbor", "floorColor": "#334", "wallColor": "#556" },
  "waves": [
    {
      "time": 3,
      "enemies": [
        { "type": "grunt",  "position": [ 4, 0, -12], "hp": 1 },
        { "type": "grunt",  "position": [-4, 0, -12], "hp": 1 }
      ]
    },
    {
      "time": 8,
      "enemies": [
        { "type": "gunman", "position": [ 5, 0, -20], "hp": 2 },
        { "type": "innocent","position": [ 2, 0, -18], "hp": 1 }
      ]
    },
    {
      "time": 14,
      "enemies": [
        { "type": "heavy",  "position": [ 0, 0, -28], "hp": 4 },
        { "type": "grunt",  "position": [-5, 0, -26], "hp": 1 },
        { "type": "grunt",  "position": [ 5, 0, -26], "hp": 1 }
      ]
    }
  ],
  "clearPoints": [12, 20],
  "boss": {
    "time": 25,
    "type": "boss",
    "position": [0, 0, -38],
    "hp": 10
  }
}
```

- [ ] **Step 4: Create `game/src/level/LevelLoader.js`**

```js
export class LevelLoader {
  /**
   * Validates a raw level JSON object and returns it typed.
   * Throws a descriptive Error on any missing or invalid field.
   * @param {object} raw
   */
  static validate(raw) {
    if (!raw.id) throw new Error('Level missing required field: id')
    if (!raw.railPath) throw new Error('Level missing required field: railPath')
    if (!Array.isArray(raw.railPath) || raw.railPath.length < 3)
      throw new Error('Level railPath must have at least 3 points')
    if (!Array.isArray(raw.waves)) throw new Error('Level missing required field: waves')
    if (typeof raw.duration !== 'number') throw new Error('Level missing required field: duration')
    return raw
  }

  /**
   * Import a level module dynamically by stage id.
   * @param {'stage1'|'stage2'|'stage3'} stageId
   * @returns {Promise<object>}
   */
  static async load(stageId) {
    const modules = {
      stage1: () => import('./levels/stage1.json'),
      stage2: () => import('./levels/stage2.json'),
      stage3: () => import('./levels/stage3.json'),
    }
    if (!modules[stageId]) throw new Error(`Unknown stage: ${stageId}`)
    const mod = await modules[stageId]()
    return LevelLoader.validate(mod.default ?? mod)
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 5 LevelLoader tests pass.

- [ ] **Step 6: Commit**

```bash
git add game/src/level/LevelLoader.js game/src/level/levels/stage1.json game/tests/LevelLoader.test.js
git commit -m "feat(level): add LevelLoader with JSON validation and stage1.json"
```

---

## Task 11: LevelDirector — time-based orchestration

**Files:**
- Create: `game/src/level/LevelDirector.js`
- Create: `game/tests/LevelDirector.test.js`

- [ ] **Step 1: Write the failing test**

```js
// game/tests/LevelDirector.test.js
import { LevelDirector } from '../src/level/LevelDirector.js'

const LEVEL = {
  id: 'test', duration: 30, railPath: [[0,0,0],[0,0,-5],[0,0,-10]],
  waves: [
    { time: 3,  enemies: [{ type: 'grunt', position: [0,0,-5], hp: 1 }] },
    { time: 10, enemies: [{ type: 'gunman', position: [0,0,-8], hp: 2 }] },
  ],
  clearPoints: [8],
  boss: { time: 20, type: 'boss', position: [0,0,-10], hp: 10 },
}

describe('LevelDirector', () => {
  it('triggers wave at correct time', () => {
    const spawned = []
    const dir = new LevelDirector(LEVEL, { onSpawnWave: (w) => spawned.push(w) })
    dir.update(2.9)
    expect(spawned).toHaveLength(0)
    dir.update(0.2) // t = 3.1
    expect(spawned).toHaveLength(1)
    expect(spawned[0].enemies[0].type).toBe('grunt')
  })

  it('does not double-trigger a wave', () => {
    const spawned = []
    const dir = new LevelDirector(LEVEL, { onSpawnWave: (w) => spawned.push(w) })
    dir.update(5) // well past t=3
    dir.update(5) // still past t=3
    expect(spawned).toHaveLength(1) // still only once
  })

  it('pauses at clearPoint until resume() called', () => {
    let clearFired = false
    const dir = new LevelDirector(LEVEL, {
      onSpawnWave: () => {},
      onClearPoint: () => { clearFired = true },
    })
    dir.update(8.5) // past clearPoint at t=8
    expect(clearFired).toBe(true)
    expect(dir.paused).toBe(true)
    const tBefore = dir.elapsed
    dir.update(2)
    expect(dir.elapsed).toBeCloseTo(tBefore) // time did NOT advance
    dir.resume()
    dir.update(2)
    expect(dir.elapsed).toBeGreaterThan(tBefore) // time advances after resume
  })

  it('triggers boss at correct time', () => {
    let bossFired = null
    const dir = new LevelDirector(LEVEL, {
      onSpawnWave: () => {},
      onBoss: (b) => { bossFired = b },
    })
    dir.update(21)
    expect(bossFired).not.toBeNull()
    expect(bossFired.type).toBe('boss')
  })

  it('fires onComplete when elapsed >= duration', () => {
    let done = false
    const dir = new LevelDirector(LEVEL, { onSpawnWave: () => {}, onComplete: () => { done = true } })
    dir.update(35)
    expect(done).toBe(true)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/level/LevelDirector.js'`

- [ ] **Step 3: Create `game/src/level/LevelDirector.js`**

```js
export class LevelDirector {
  elapsed = 0
  paused = false
  _wavesFired = new Set()
  _bossFired = false
  _completeFired = false

  /**
   * @param {object} level - validated level data from LevelLoader
   * @param {{
   *   onSpawnWave?: (wave: object) => void,
   *   onClearPoint?: () => void,
   *   onBoss?: (boss: object) => void,
   *   onComplete?: () => void,
   * }} callbacks
   */
  constructor(level, callbacks) {
    this.level = level
    this.cb = callbacks
    this._clearPointsFired = new Set()
  }

  /** @param {number} dt seconds */
  update(dt) {
    if (this.paused || this._completeFired) return
    this.elapsed += dt

    // waves
    for (let i = 0; i < this.level.waves.length; i++) {
      const wave = this.level.waves[i]
      if (!this._wavesFired.has(i) && this.elapsed >= wave.time) {
        this._wavesFired.add(i)
        this.cb.onSpawnWave?.(wave)
      }
    }

    // clear points
    for (let i = 0; i < (this.level.clearPoints ?? []).length; i++) {
      const t = this.level.clearPoints[i]
      if (!this._clearPointsFired.has(i) && this.elapsed >= t) {
        this._clearPointsFired.add(i)
        this.paused = true
        this.cb.onClearPoint?.()
        return // stop advancing until resumed
      }
    }

    // boss
    if (!this._bossFired && this.level.boss && this.elapsed >= this.level.boss.time) {
      this._bossFired = true
      this.cb.onBoss?.(this.level.boss)
    }

    // complete
    if (!this._completeFired && this.elapsed >= this.level.duration) {
      this._completeFired = true
      this.cb.onComplete?.()
    }
  }

  resume() {
    this.paused = false
  }

  reset() {
    this.elapsed = 0
    this.paused = false
    this._wavesFired.clear()
    this._clearPointsFired.clear()
    this._bossFired = false
    this._completeFired = false
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 5 LevelDirector tests pass.

- [ ] **Step 5: Commit**

```bash
git add game/src/level/LevelDirector.js game/tests/LevelDirector.test.js
git commit -m "feat(level): add LevelDirector with wave/clearPoint/boss/complete orchestration"
```

---

## Task 12: Stage environment geometry

**Files:**
- Create: `game/src/scene/StageEnvironment.js`

No unit tests (pure Three.js geometry, visually verified).

- [ ] **Step 1: Create `game/src/scene/StageEnvironment.js`**

```js
import * as THREE from 'three'

const STAGE_THEMES = {
  harbor:    { floor: 0x334455, wall: 0x445566, accent: 0x667788 },
  factory:   { floor: 0x443322, wall: 0x554433, accent: 0x886644 },
  citynight: { floor: 0x222233, wall: 0x333344, accent: 0x4466aa },
}

export class StageEnvironment {
  /** @type {THREE.Object3D[]} */ objects = []

  /**
   * @param {THREE.Scene} scene
   * @param {{ type: string, floorColor?: string, wallColor?: string }} config
   */
  constructor(scene, config) {
    this.scene = scene
    const theme = STAGE_THEMES[config.type] ?? STAGE_THEMES.harbor
    this._buildHarbor(theme)
  }

  _mesh(geo, color, castShadow = false, receiveShadow = true) {
    const m = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color }))
    m.castShadow = castShadow
    m.receiveShadow = receiveShadow
    this.scene.add(m)
    this.objects.push(m)
    return m
  }

  _buildHarbor(theme) {
    // Floor strip 8 wide, 60 long
    const floor = this._mesh(new THREE.BoxGeometry(8, 0.2, 60), theme.floor)
    floor.position.set(0, -0.1, -25)

    // Left wall
    const wallL = this._mesh(new THREE.BoxGeometry(0.3, 5, 60), theme.wall)
    wallL.position.set(-4, 2.5, -25)

    // Right wall
    const wallR = this._mesh(new THREE.BoxGeometry(0.3, 5, 60), theme.wall)
    wallR.position.set(4, 2.5, -25)

    // Ceiling beams every 8 units
    for (let z = -4; z >= -48; z -= 8) {
      const beam = this._mesh(new THREE.BoxGeometry(8, 0.3, 0.4), theme.accent)
      beam.position.set(0, 4.8, z)
    }

    // Cargo crates (cover/obstacle visual, not destructible)
    const cratePositions = [
      [ 2.5, 0.4, -10], [-2.5, 0.4, -10],
      [ 3,   0.4, -22], [-2,   0.4, -22],
      [ 2,   0.4, -34], [-3,   0.4, -36],
    ]
    for (const [x, y, z] of cratePositions) {
      const crate = this._mesh(new THREE.BoxGeometry(0.9, 0.9, 0.9), theme.accent, true)
      crate.position.set(x, y, z)
    }
  }

  dispose() {
    for (const obj of this.objects) {
      this.scene.remove(obj)
      obj.geometry?.dispose()
      obj.material?.dispose()
    }
    this.objects = []
  }
}
```

- [ ] **Step 2: Wire StageEnvironment into main.js temporarily to visually verify**

In `game/src/main.js`, add after Renderer init:

```js
import { StageEnvironment } from './scene/StageEnvironment.js'
// ...
const env = new StageEnvironment(renderer.scene, { type: 'harbor' })
renderer.camera.position.set(0, 2, 8)
renderer.camera.lookAt(0, 1, 0)
```

Run `npm run dev` and verify: a dark-themed harbor corridor with floor, walls, beams, and crates is visible.

- [ ] **Step 3: Commit**

```bash
git add game/src/scene/StageEnvironment.js game/src/main.js
git commit -m "feat(scene): add StageEnvironment with harbor placeholder geometry"
```

---

## Task 13: GameManager state machine

**Files:**
- Create: `game/src/GameManager.js`
- Create: `game/tests/GameManager.test.js`

- [ ] **Step 1: Write the failing test**

```js
// game/tests/GameManager.test.js
import { GameManager } from '../src/GameManager.js'

describe('GameManager', () => {
  it('starts in MENU state', () => {
    const gm = new GameManager()
    expect(gm.state).toBe('menu')
  })

  it('startStage transitions to PLAYING', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    expect(gm.state).toBe('playing')
    expect(gm.currentStage).toBe('stage1')
    expect(gm.difficulty).toBe('normal')
  })

  it('onClearPoint transitions to CLEAR_POINT', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onClearPoint()
    expect(gm.state).toBe('clear_point')
  })

  it('onAllEnemiesDead resumes from CLEAR_POINT', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onClearPoint()
    gm.onAllEnemiesDead()
    expect(gm.state).toBe('playing')
  })

  it('onPlayerDead transitions to DEAD', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onPlayerDead()
    expect(gm.state).toBe('dead')
  })

  it('onStageClear transitions to STAGE_CLEAR', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onStageClear()
    expect(gm.state).toBe('stage_clear')
  })

  it('toMenu resets to MENU', () => {
    const gm = new GameManager()
    gm.startStage('stage1', 'normal')
    gm.onPlayerDead()
    gm.toMenu()
    expect(gm.state).toBe('menu')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test
```

Expected: FAIL — `Cannot find module '../src/GameManager.js'`

- [ ] **Step 3: Create `game/src/GameManager.js`**

```js
export const GameState = Object.freeze({
  MENU:        'menu',
  PLAYING:     'playing',
  CLEAR_POINT: 'clear_point',
  STAGE_CLEAR: 'stage_clear',
  DEAD:        'dead',
})

export class GameManager {
  state = GameState.MENU
  currentStage = null
  difficulty = 'normal'
  health = 5
  maxHealth = 5
  ammo = 6
  maxAmmo = 6

  startStage(stageId, difficulty) {
    this.currentStage = stageId
    this.difficulty = difficulty
    this.health = this.maxHealth
    this.ammo = this.maxAmmo
    this.state = GameState.PLAYING
  }

  onClearPoint() {
    if (this.state === GameState.PLAYING) this.state = GameState.CLEAR_POINT
  }

  onAllEnemiesDead() {
    if (this.state === GameState.CLEAR_POINT) this.state = GameState.PLAYING
  }

  onPlayerDead() {
    this.state = GameState.DEAD
  }

  onStageClear() {
    this.state = GameState.STAGE_CLEAR
  }

  toMenu() {
    this.state = GameState.MENU
    this.currentStage = null
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount)
    return this.health === 0
  }

  consumeAmmo() {
    if (this.ammo <= 0) return false
    this.ammo--
    return true
  }

  reload() { this.ammo = this.maxAmmo }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test
```

Expected: PASS — 7 GameManager tests pass.

- [ ] **Step 5: Commit**

```bash
git add game/src/GameManager.js game/tests/GameManager.test.js
git commit -m "feat(game): add GameManager state machine (menu/playing/clear_point/stage_clear/dead)"
```

---

## Task 14: Wire everything into main.js (playable Stage 1)

**Files:**
- Modify: `game/src/main.js` (full integration)
- Create: `game/src/level/levels/stage2.json`
- Create: `game/src/level/levels/stage3.json`

- [ ] **Step 1: Create `game/src/level/levels/stage2.json`**

```json
{
  "id": "stage2",
  "name": "Stage 2 — Industrial Factory",
  "duration": 38,
  "railPath": [
    [ 0, 1.5,   0],
    [-2, 1.5,  -9],
    [ 2, 1.5, -18],
    [ 0, 2.5, -27],
    [-2, 2.0, -36],
    [ 0, 1.5, -44]
  ],
  "environment": { "type": "factory", "floorColor": "#443322", "wallColor": "#554433" },
  "waves": [
    {
      "time": 3,
      "enemies": [
        { "type": "gunman", "position": [ 3, 0, -10], "hp": 2 },
        { "type": "grunt",  "position": [-3, 0, -10], "hp": 1 }
      ]
    },
    {
      "time": 9,
      "enemies": [
        { "type": "heavy",  "position": [ 0, 0, -20], "hp": 4 },
        { "type": "innocent","position": [-2, 0, -18], "hp": 1 }
      ]
    },
    {
      "time": 16,
      "enemies": [
        { "type": "gunman", "position": [-4, 0, -28], "hp": 2 },
        { "type": "gunman", "position": [ 4, 0, -28], "hp": 2 },
        { "type": "grunt",  "position": [ 0, 0, -30], "hp": 1 }
      ]
    }
  ],
  "clearPoints": [13, 21],
  "boss": {
    "time": 28,
    "type": "boss",
    "position": [0, 0, -42],
    "hp": 12
  }
}
```

- [ ] **Step 2: Create `game/src/level/levels/stage3.json`**

```json
{
  "id": "stage3",
  "name": "Stage 3 — City at Night",
  "duration": 42,
  "railPath": [
    [ 0, 1.5,   0],
    [ 3, 1.5,  -8],
    [ 0, 1.5, -16],
    [-3, 2.0, -24],
    [ 0, 1.5, -32],
    [ 3, 1.0, -40],
    [ 0, 1.5, -48]
  ],
  "environment": { "type": "citynight", "floorColor": "#222233", "wallColor": "#333344" },
  "waves": [
    {
      "time": 3,
      "enemies": [
        { "type": "gunman", "position": [ 3, 0, -10], "hp": 2 },
        { "type": "gunman", "position": [-3, 0, -10], "hp": 2 }
      ]
    },
    {
      "time": 9,
      "enemies": [
        { "type": "heavy",  "position": [ 2, 0, -20], "hp": 5 },
        { "type": "grunt",  "position": [-3, 0, -18], "hp": 1 },
        { "type": "innocent","position": [ 0, 0, -17], "hp": 1 }
      ]
    },
    {
      "time": 17,
      "enemies": [
        { "type": "heavy",  "position": [-3, 0, -30], "hp": 5 },
        { "type": "gunman", "position": [ 3, 0, -28], "hp": 2 },
        { "type": "gunman", "position": [-1, 0, -32], "hp": 2 }
      ]
    }
  ],
  "clearPoints": [14, 23],
  "boss": {
    "time": 31,
    "type": "boss",
    "position": [0, 0, -46],
    "hp": 15
  }
}
```

- [ ] **Step 3: Rewrite `game/src/main.js` as full integration**

```js
import * as THREE from 'three'
import { Renderer } from './render/Renderer.js'
import { GameLoop } from './GameLoop.js'
import { CameraRig } from './render/CameraRig.js'
import { InputManager } from './input/InputManager.js'
import { Shooter } from './gameplay/Shooter.js'
import { EnemyManager } from './gameplay/EnemyManager.js'
import { StageEnvironment } from './scene/StageEnvironment.js'
import { HUD } from './hud/HUD.js'
import { LevelLoader } from './level/LevelLoader.js'
import { LevelDirector } from './level/LevelDirector.js'
import { GameManager, GameState } from './GameManager.js'

// ─── Global singletons ──────────────────────────────────────────────────────
const container = document.getElementById('canvas-container')
const hudEl = document.getElementById('hud')

const renderer  = new Renderer(container)
const input     = new InputManager()
const shooter   = new Shooter(renderer.camera)
const enemyMgr  = new EnemyManager(renderer.scene)
const hud       = new HUD(hudEl, { maxHealth: 5, maxAmmo: 6 })
const gameMgr   = new GameManager()
let cameraRig   = null
let director    = null
let environment = null

// ─── Shooting ────────────────────────────────────────────────────────────────
input.onShoot(() => {
  if (gameMgr.state !== GameState.PLAYING) return
  if (!gameMgr.consumeAmmo()) { hud.setAmmo(0); return }
  hud.setAmmo(gameMgr.ammo)

  const hits = shooter.getHits(input.mouse, enemyMgr.getActiveMeshes())
  if (hits.length > 0) {
    const enemy = hits[0].object.userData.enemyRef
    if (enemy) {
      enemy.hit(1)
      hud.addScore(enemy.type === 'boss' ? 500 : 100)
      hud.updateHiScore()
    }
  }

  // Auto-reload when empty (instant for now)
  if (gameMgr.ammo === 0) {
    gameMgr.reload()
    setTimeout(() => { hud.setAmmo(gameMgr.maxAmmo) }, 500)
  }
})

// ─── Enemy damage to player ──────────────────────────────────────────────────
enemyMgr.onEnemyAttack = (dmg) => {
  const dead = gameMgr.takeDamage(dmg)
  hud.setHealth(gameMgr.health)
  if (dead) {
    gameMgr.onPlayerDead()
    showOverlay('dead')
  }
}

// ─── Stage loading ───────────────────────────────────────────────────────────
async function loadStage(stageId, difficulty) {
  const level = await LevelLoader.load(stageId)

  if (environment) environment.dispose()
  enemyMgr.clear()
  hideOverlay()

  environment = new StageEnvironment(renderer.scene, level.environment)

  const pts = level.railPath.map(([x, y, z]) => new THREE.Vector3(x, y, z))
  cameraRig = new CameraRig(renderer.camera, pts, level.duration)

  director = new LevelDirector(level, {
    onSpawnWave: (wave) => enemyMgr.spawnWave(wave.enemies),
    onClearPoint: () => {
      gameMgr.onClearPoint()
      cameraRig.pause()
    },
    onBoss: (boss) => enemyMgr.spawnWave([boss]),
    onComplete: () => {
      gameMgr.onStageClear()
      showOverlay('clear')
    },
  })

  gameMgr.startStage(stageId, difficulty)
  hud.reset(true)
  hud.setHealth(gameMgr.maxHealth)
  hud.setAmmo(gameMgr.maxAmmo)
}

// ─── Main loop ───────────────────────────────────────────────────────────────
const loop = new GameLoop((dt) => {
  if (gameMgr.state === GameState.PLAYING) {
    director?.update(dt)
    cameraRig?.advance(dt)
    enemyMgr.update(dt)

    // Resume from clear point when all enemies dead
    if (gameMgr.state === GameState.CLEAR_POINT && enemyMgr.aliveCount() === 0) {
      gameMgr.onAllEnemiesDead()
      director?.resume()
      cameraRig?.resume()
    }
  }
  renderer.render()
})

// ─── Overlay UI (menu / game-over / stage-clear) ─────────────────────────────
function buildOverlays() {
  const overlay = document.createElement('div')
  overlay.id = 'overlay'
  overlay.style.cssText = `
    display:none; position:fixed; inset:0; background:rgba(0,0,0,0.75);
    color:#fff; font:bold 24px monospace; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:20px; z-index:10;
  `
  overlay.innerHTML = `
    <div id="overlay-title" style="font-size:40px"></div>
    <div id="overlay-sub"></div>
    <div style="display:flex;gap:12px">
      <button id="btn-s1">Stage 1</button>
      <button id="btn-s2">Stage 2</button>
      <button id="btn-s3">Stage 3</button>
    </div>
    <div style="display:flex;gap:12px">
      <button id="btn-easy">Easy</button>
      <button id="btn-normal" style="color:#ff0">Normal</button>
      <button id="btn-hard">Hard</button>
    </div>
  `
  const btnStyle = 'padding:8px 20px;background:#333;color:#fff;border:2px solid #888;cursor:pointer;font:inherit;'
  overlay.querySelectorAll('button').forEach(b => b.style.cssText = btnStyle)
  document.body.appendChild(overlay)

  let selectedStage = 'stage1'
  let selectedDiff  = 'normal'

  overlay.querySelector('#btn-s1').onclick = () => { selectedStage = 'stage1' }
  overlay.querySelector('#btn-s2').onclick = () => { selectedStage = 'stage2' }
  overlay.querySelector('#btn-s3').onclick = () => { selectedStage = 'stage3' }
  overlay.querySelector('#btn-easy').onclick   = () => { selectedDiff = 'easy' }
  overlay.querySelector('#btn-normal').onclick = () => { selectedDiff = 'normal' }
  overlay.querySelector('#btn-hard').onclick   = () => { selectedDiff = 'hard' }

  document.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' && gameMgr.state !== GameState.PLAYING) {
      hideOverlay()
      loadStage(selectedStage, selectedDiff)
      loop.resume()
    }
  })
  // Also click-start
  overlay.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return
    hideOverlay()
    loadStage(selectedStage, selectedDiff)
    loop.resume()
  })
}

function showOverlay(mode) {
  const overlay = document.getElementById('overlay')
  if (!overlay) return
  overlay.style.display = 'flex'
  const title = overlay.querySelector('#overlay-title')
  const sub   = overlay.querySelector('#overlay-sub')
  if (mode === 'menu') {
    title.textContent = 'VIRTUA COP 2'
    sub.textContent   = 'Click or press ENTER to start'
  } else if (mode === 'dead') {
    title.textContent = 'GAME OVER'
    sub.textContent   = 'Click or press ENTER to return to menu'
    gameMgr.toMenu()
  } else if (mode === 'clear') {
    title.textContent = 'STAGE CLEAR'
    sub.textContent   = `Score: ${hud.score.toString().padStart(5,'0')} — Click for menu`
  }
}

function hideOverlay() {
  const el = document.getElementById('overlay')
  if (el) el.style.display = 'none'
}

// ─── Boot ────────────────────────────────────────────────────────────────────
buildOverlays()
showOverlay('menu')
loop.start()
loop.pause() // paused until stage selected
```

- [ ] **Step 4: Run all tests to ensure no regressions**

```bash
npm test
```

Expected: PASS — all tests pass.

- [ ] **Step 5: Run dev server and play Stage 1**

```bash
npm run dev
```

Manual verification checklist:
- [ ] Menu overlay shows "VIRTUA COP 2"
- [ ] Click menu → Stage 1 starts, harbor corridor visible
- [ ] Camera advances along corridor
- [ ] Enemies (colored boxes) appear at ~3s
- [ ] Click on enemy → enemy disappears, score increases
- [ ] ClearPoint at ~12s: camera pauses, kills remaining enemies → camera resumes
- [ ] Boss box appears at ~25s, takes 10 hits to kill
- [ ] Stage Clear overlay shows correct score
- [ ] Health hearts decrease when enemy attacks

- [ ] **Step 6: Commit**

```bash
git add game/src/main.js game/src/level/levels/stage2.json game/src/level/levels/stage3.json
git commit -m "feat(game): wire full Stage 1 integration — playable in browser"
```

---

## Task 15: AudioManager — Web Audio API SFX

**Files:**
- Create: `game/src/audio/AudioManager.js`

- [ ] **Step 1: Create `game/src/audio/AudioManager.js`**

```js
export class AudioManager {
  /** @type {AudioContext|null} */ ctx = null

  _ensureCtx() {
    if (!this.ctx) this.ctx = new AudioContext()
    if (this.ctx.state === 'suspended') this.ctx.resume()
  }

  /**
   * Synthesize a short sound using an oscillator.
   * @param {{ freq: number, type?: OscillatorType, duration: number, decay?: number }} opts
   */
  _beep({ freq, type = 'sawtooth', duration, decay = duration }) {
    this._ensureCtx()
    const osc = this.ctx.createOscillator()
    const gain = this.ctx.createGain()
    osc.connect(gain)
    gain.connect(this.ctx.destination)
    osc.frequency.value = freq
    osc.type = type
    gain.gain.setValueAtTime(0.3, this.ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + decay)
    osc.start(this.ctx.currentTime)
    osc.stop(this.ctx.currentTime + duration)
  }

  gunshot() {
    this._beep({ freq: 180, type: 'sawtooth', duration: 0.12, decay: 0.1 })
    // layered click
    setTimeout(() => this._beep({ freq: 80, type: 'square', duration: 0.05, decay: 0.04 }), 20)
  }

  enemyHit() {
    this._beep({ freq: 440, type: 'triangle', duration: 0.08, decay: 0.07 })
  }

  enemyDeath() {
    this._beep({ freq: 220, type: 'sawtooth', duration: 0.25, decay: 0.2 })
    setTimeout(() => this._beep({ freq: 110, type: 'sawtooth', duration: 0.2, decay: 0.18 }), 80)
  }

  playerHit() {
    this._beep({ freq: 100, type: 'square', duration: 0.3, decay: 0.25 })
  }

  clearPoint() {
    // rising arpeggio
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._beep({ freq: f, type: 'sine', duration: 0.2, decay: 0.18 }), i * 80)
    })
  }

  stageClear() {
    // fanfare
    [523, 784, 1047, 784, 1047, 1319].forEach((f, i) => {
      setTimeout(() => this._beep({ freq: f, type: 'square', duration: 0.18, decay: 0.15 }), i * 120)
    })
  }
}
```

- [ ] **Step 2: Wire AudioManager into `game/src/main.js`**

At top of main.js, add import:
```js
import { AudioManager } from './audio/AudioManager.js'
const audio = new AudioManager()
```

In the `input.onShoot` callback, after hit detection:
```js
audio.gunshot()
if (hits.length > 0) {
  audio.enemyHit()
  // ...existing score/hp logic...
}
```

In `enemyMgr.onEnemyAttack`:
```js
audio.playerHit()
```

In `director` callbacks:
```js
onClearPoint: () => { audio.clearPoint(); /* existing logic */ },
onComplete:   () => { audio.stageClear(); /* existing logic */ },
```

- [ ] **Step 3: Run dev server and verify SFX play**

```bash
npm run dev
```

Expected: gunshot sound on click, hit feedback sound when enemy hit, clearpoint arpeggio.

- [ ] **Step 4: Commit**

```bash
git add game/src/audio/AudioManager.js game/src/main.js
git commit -m "feat(audio): add AudioManager with Web Audio oscillator SFX"
```

---

## Task 16: Run full test suite and build verification

- [ ] **Step 1: Run all tests**

```bash
npm test
```

Expected output (all passing):
```
✓ tests/GameLoop.test.js (3)
✓ tests/CameraRig.test.js (5)
✓ tests/Enemy.test.js (7)
✓ tests/EnemyManager.test.js (5)
✓ tests/LevelLoader.test.js (5)
✓ tests/LevelDirector.test.js (5)
✓ tests/HUD.test.js (5)
✓ tests/GameManager.test.js (7)
Test Files  8 passed (8)
Tests      42 passed (42)
```

- [ ] **Step 2: Production build**

```bash
npm run build
```

Expected:
- No errors
- `dist/` contains `index.html` + `assets/*.js` (gzipped bundle should be under 300KB)

- [ ] **Step 3: Preview production build locally**

```bash
npm run preview
```

Open http://localhost:4173/ and run the Stage 1 manual playthrough checklist from Task 14.

- [ ] **Step 4: Commit if any fixes needed**

```bash
git add -A
git commit -m "fix: production build verification passes"
```

---

## Task 17: Update CI + wrangler.toml for Three.js

**Files:**
- Modify: `wrangler.toml` (repo root)
- Modify: `.github/workflows/build-deploy.yml`

- [ ] **Step 1: Update `wrangler.toml`**

Replace full content of `wrangler.toml`:

```toml
name = "virtua-cop-2"
compatibility_date = "2024-10-01"

# Serve the Three.js Vite build output as a Workers static-assets site.
[assets]
directory = "./game/dist"
not_found_handling = "single-page-application"
```

- [ ] **Step 2: Update `.github/workflows/build-deploy.yml`**

Replace full content of `.github/workflows/build-deploy.yml`:

```yaml
name: Build and Deploy to Cloudflare

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: game/package-lock.json

      - name: Install dependencies
        run: cd game && npm ci

      - name: Build
        run: cd game && npm run build

      - name: Deploy Worker with static assets
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: deploy
```

- [ ] **Step 3: Add `game/package-lock.json` by running install on CI-equivalent**

```bash
cd game && npm install
```

(This ensures `package-lock.json` exists for CI cache.)

- [ ] **Step 4: Verify wrangler can read the new config locally**

```bash
npx wrangler deploy --dry-run
```

Expected: prints deployment config pointing to `game/dist`, no errors.

- [ ] **Step 5: Commit and push to main to trigger CI**

```bash
git add wrangler.toml .github/workflows/build-deploy.yml game/package-lock.json
git commit -m "ci: replace Unity build with Vite build, update wrangler.toml to game/dist"
git push origin main
```

Expected: GitHub Actions runs the new CI, deploys to `virtua-cop-2.wizard32232002.workers.dev`.

---

## Task 18: Integration smoke test on live URL

No code — manual playtest checklist.

- [ ] Open `https://virtua-cop-2.wizard32232002.workers.dev` in Chrome
- [ ] Menu overlay loads within 3 seconds
- [ ] Select Stage 1, click to start
- [ ] Camera advances (environment moves toward camera)
- [ ] Enemies appear at ~3s as colored boxes
- [ ] Crosshair visible, follows mouse
- [ ] Click enemy: disappears, score increases, gunshot sound plays
- [ ] ClearPoint at ~12s: camera stops, resume after killing all enemies
- [ ] Boss box appears at ~25s, requires 10 clicks to kill
- [ ] Stage Clear overlay shows score
- [ ] Stage 2 and Stage 3 selectable from menu, different visual themes
- [ ] Player damage reduces hearts
- [ ] Reaching 0 health → Game Over screen

If any check fails, open browser console and note the error before fixing.

---

## Self-Review

### Spec Coverage

The handoff (`docs/superpowers/handoffs/2026-05-28-threejs-migration-handoff.md`) defines:

| Requirement | Covered in |
|-------------|-----------|
| Rail camera along spline | T04 CameraRig |
| Mouse crosshair + click to shoot | T05 InputManager, T06 Shooter |
| Enemy emerge/attack/die | T07 Enemy, T08 EnemyManager |
| HUD (health, ammo, score, hi-score) | T09 HUD |
| JSON level format | T10 LevelLoader |
| Wave triggers, ClearPoints, Boss | T11 LevelDirector |
| Game state machine (menu/playing/dead/clear) | T13 GameManager |
| Stage 1–3 with different environments | T12 StageEnvironment, T14 levels JSON |
| Audio SFX | T15 AudioManager |
| Cloudflare deployment | T17 CI + wrangler.toml |
| All 42 unit tests pass | T16 |

### Placeholder Scan
No TBDs, TODOs, or "similar to Task N" patterns found in code blocks.

### Type Consistency
- `Enemy.state` always uses string literals (IDLE='idle' etc.) — consistent across Enemy, EnemyManager, GameManager
- `EnemyManager.getActiveMeshes()` returns `THREE.Mesh[]` — matches `Shooter.getHits()` input type
- `LevelLoader.validate()` throws on bad input — LevelDirector constructor receives already-validated data
- `HUD.addScore()` and `GameManager` both track `health`/`ammo` separately — HUD is display-only, GameManager is source of truth. `main.js` bridges them.
