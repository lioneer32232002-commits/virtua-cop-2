# CAMMOV Camera Path Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace hand-crafted CatmullRom waypoints with frame-by-frame CAMMOV*.BIN camera playback so the in-game camera matches the original Virtua Cop 2 exactly.

**Architecture:** Extractor reads CAMMOV*.BIN files and writes `game/public/assets/stageN/camera.bin`; game loads the binary at stage start; CameraRig auto-detects frame-based vs. legacy-curve mode; main.js falls back to JSON waypoints when camera.bin is absent.

**Tech Stack:** Node.js ESM + `node:test` (extractor), Three.js + Vitest (game), binary protocol (uint32 header + float32 frame array)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `tools/extract-stage-assets/lib/camera-reader.mjs` | Create | Parse CAMMOV*.BIN → decoded frame objects |
| `tools/extract-stage-assets/test/camera-reader.test.mjs` | Create | Unit test with synthetic buffer |
| `tools/extract-stage-assets/extract-camera.mjs` | Create | CLI: read CAMMOV*.BIN → write camera.bin |
| `game/src/render/CameraPathLoader.js` | Create | fetch() + parse camera.bin → `{ frameCount, fps, frames }` |
| `game/tests/CameraRig.test.js` | Modify | Add Three.js Quaternion/Euler mocks + frame-mode tests |
| `game/src/render/CameraRig.js` | Modify | Add frame-based mode; keep curve mode as fallback |
| `game/src/main.js` | Modify | Call loadCameraPath() before creating CameraRig |
| `game/src/render/Renderer.js` | Modify | Boost ambient light; add fill light |
| `game/src/hud/HUD.js` | Modify | Add crosshair; add flashCrosshair() method |

---

## Task 1: camera-reader.mjs (TDD)

**Files:**
- Create: `tools/extract-stage-assets/test/camera-reader.test.mjs`
- Create: `tools/extract-stage-assets/lib/camera-reader.mjs`

### Binary format reference

Each frame is **16 bytes**:
```
offset 0-3:   float32  x (little-endian)
offset 4-7:   float32  y
offset 8-11:  float32  z
offset 12-13: int16    yaw   (int16_signed / 32768 * 180 = degrees)
offset 14-15: int16    pitch (same unit)
```

Coordinate transform before storing: `threejs_x = -cammov_x`, `threejs_yaw = -yaw_degrees`.

- [ ] **Step 1: Write the failing test**

`tools/extract-stage-assets/test/camera-reader.test.mjs`:
```javascript
import assert from 'node:assert/strict'
import { test, describe } from 'node:test'
import { readCammovBin } from '../lib/camera-reader.mjs'

describe('readCammovBin', () => {
  test('decodes a single frame with coordinate transform', () => {
    const buf = Buffer.alloc(16)
    buf.writeFloatLE(1.0, 0)    // cammov_x → threejs_x = -1
    buf.writeFloatLE(2.0, 4)    // y unchanged
    buf.writeFloatLE(3.0, 8)    // z unchanged
    buf.writeInt16LE(8192, 12)  // 8192/32768*180 = 45° → threejs_yaw = -45° = -π/4
    buf.writeInt16LE(0, 14)
    const frames = readCammovBin(buf)
    assert.strictEqual(frames.length, 1)
    assert.ok(Math.abs(frames[0].x - (-1.0)) < 1e-5, `x=${frames[0].x}`)
    assert.ok(Math.abs(frames[0].y - 2.0)    < 1e-5, `y=${frames[0].y}`)
    assert.ok(Math.abs(frames[0].z - 3.0)    < 1e-5, `z=${frames[0].z}`)
    assert.ok(Math.abs(frames[0].yaw_rad   - (-Math.PI / 4)) < 1e-5, `yaw_rad=${frames[0].yaw_rad}`)
    assert.ok(Math.abs(frames[0].pitch_rad - 0) < 1e-5, `pitch_rad=${frames[0].pitch_rad}`)
  })

  test('decodes multiple frames', () => {
    const buf = Buffer.alloc(32)
    buf.writeFloatLE(10.0, 0);  buf.writeFloatLE(0.0, 4);  buf.writeFloatLE(20.0, 8)
    buf.writeInt16LE(0, 12);    buf.writeInt16LE(0, 14)
    buf.writeFloatLE(15.0, 16); buf.writeFloatLE(5.0, 20); buf.writeFloatLE(25.0, 24)
    buf.writeInt16LE(16384, 28) // 90° → threejs_yaw = -π/2
    buf.writeInt16LE(0, 30)
    const frames = readCammovBin(buf)
    assert.strictEqual(frames.length, 2)
    assert.ok(Math.abs(frames[1].x - (-15.0)) < 1e-5)
    assert.ok(Math.abs(frames[1].yaw_rad - (-Math.PI / 2)) < 1e-5)
  })

  test('pitch converts without negation', () => {
    const buf = Buffer.alloc(16)
    buf.writeFloatLE(0, 0); buf.writeFloatLE(0, 4); buf.writeFloatLE(0, 8)
    buf.writeInt16LE(0, 12)
    buf.writeInt16LE(8192, 14) // 45° pitch, no negation
    const frames = readCammovBin(buf)
    assert.ok(Math.abs(frames[0].pitch_rad - (Math.PI / 4)) < 1e-5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
cd tools/extract-stage-assets
npm test
```

Expected: `ERR_MODULE_NOT_FOUND` for `../lib/camera-reader.mjs`

- [ ] **Step 3: Write the implementation**

`tools/extract-stage-assets/lib/camera-reader.mjs`:
```javascript
const FRAME_SIZE = 16
const DEG_TO_RAD = Math.PI / 180

/**
 * @param {Buffer} buf  raw bytes of a CAMMOV*.BIN file
 * @returns {{ x, y, z, yaw_rad, pitch_rad }[]}
 */
export function readCammovBin(buf) {
  const frameCount = Math.floor(buf.length / FRAME_SIZE)
  const frames = []
  for (let i = 0; i < frameCount; i++) {
    const off = i * FRAME_SIZE
    const x        = buf.readFloatLE(off)
    const y        = buf.readFloatLE(off + 4)
    const z        = buf.readFloatLE(off + 8)
    const yawInt   = buf.readInt16LE(off + 12)
    const pitchInt = buf.readInt16LE(off + 14)
    const yaw_deg   = yawInt   / 32768 * 180
    const pitch_deg = pitchInt / 32768 * 180
    frames.push({
      x:         -x,
      y,
      z,
      yaw_rad:   -yaw_deg   * DEG_TO_RAD,
      pitch_rad:  pitch_deg * DEG_TO_RAD,
    })
  }
  return frames
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npm test
```

Expected: 3 passing tests, 0 failures.

- [ ] **Step 5: Commit**

```
git add tools/extract-stage-assets/lib/camera-reader.mjs tools/extract-stage-assets/test/camera-reader.test.mjs
git commit -m "feat(extractor): add camera-reader.mjs for CAMMOV*.BIN decoding"
```

---

## Task 2: extract-camera.mjs CLI

**Files:**
- Create: `tools/extract-stage-assets/extract-camera.mjs`

No unit test — this is a thin CLI glue script verified manually in Task 9.

- [ ] **Step 1: Write the CLI**

`tools/extract-stage-assets/extract-camera.mjs`:
```javascript
#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { readCammovBin } from './lib/camera-reader.mjs'

const STAGE_MAP = [
  { bin: 'CAMMOV0.BIN', stageId: 'stage1' },
  { bin: 'CAMMOV1.BIN', stageId: 'stage2' },
  { bin: 'CAMMOV2.BIN', stageId: 'stage3' },
]

const [,, gameRoot, outBase] = process.argv
if (!gameRoot || !outBase) {
  console.error('Usage: node extract-camera.mjs <game-root> <out-base>')
  console.error('  <game-root>  path to VirtuaCop2 installation (contains BIN/ folder)')
  console.error('  <out-base>   output base dir (e.g. ../game/public/assets)')
  process.exit(1)
}

const binDir = path.join(path.resolve(gameRoot), 'BIN')
const outDir = path.resolve(outBase)

for (const { bin, stageId } of STAGE_MAP) {
  const srcPath = path.join(binDir, bin)
  if (!fs.existsSync(srcPath)) {
    console.log(`Skipping ${bin} (not found at ${srcPath})`)
    continue
  }
  const raw    = fs.readFileSync(srcPath)
  const frames = readCammovBin(raw)
  const count  = frames.length
  const FPS    = 30

  // 8-byte header + 20 bytes per frame (5 × float32)
  const outBuf = Buffer.alloc(8 + count * 20)
  outBuf.writeUInt32LE(count, 0)
  outBuf.writeUInt32LE(FPS, 4)
  for (let i = 0; i < count; i++) {
    const off = 8 + i * 20
    const f   = frames[i]
    outBuf.writeFloatLE(f.x,         off)
    outBuf.writeFloatLE(f.y,         off + 4)
    outBuf.writeFloatLE(f.z,         off + 8)
    outBuf.writeFloatLE(f.yaw_rad,   off + 12)
    outBuf.writeFloatLE(f.pitch_rad, off + 16)
  }

  const stageOutDir = path.join(outDir, stageId)
  fs.mkdirSync(stageOutDir, { recursive: true })
  const outPath = path.join(stageOutDir, 'camera.bin')
  fs.writeFileSync(outPath, outBuf)
  console.log(`Wrote ${outPath}  (${count} frames, ${outBuf.length} bytes)`)
}
```

- [ ] **Step 2: Commit**

```
git add tools/extract-stage-assets/extract-camera.mjs
git commit -m "feat(extractor): add extract-camera.mjs CLI for CAMMOV*.BIN → camera.bin"
```

---

## Task 3: CameraPathLoader.js

**Files:**
- Create: `game/src/render/CameraPathLoader.js`

No unit test — it wraps `fetch()` which is a browser API not easily testable in Vitest without mocking.

- [ ] **Step 1: Write the loader**

`game/src/render/CameraPathLoader.js`:
```javascript
/**
 * Fetches and parses a camera.bin asset.
 * Returns null if the file is missing (404) so callers can fall back gracefully.
 *
 * @param {string} stageId  e.g. 'stage1'
 * @returns {Promise<{ frameCount: number, fps: number, frames: Float32Array }|null>}
 */
export async function loadCameraPath(stageId) {
  const url = `/assets/${stageId}/camera.bin`
  const resp = await fetch(url)
  if (!resp.ok) return null
  const buf        = await resp.arrayBuffer()
  const header     = new Uint32Array(buf, 0, 2)
  const frameCount = header[0]
  const fps        = header[1]
  const frames     = new Float32Array(buf, 8, frameCount * 5)
  return { frameCount, fps, frames }
}
```

- [ ] **Step 2: Commit**

```
git add game/src/render/CameraPathLoader.js
git commit -m "feat(game): add CameraPathLoader to fetch camera.bin from assets"
```

---

## Task 4: Update CameraRig tests (TDD first)

**Files:**
- Modify: `game/tests/CameraRig.test.js`

Write new tests for frame-based mode. The Three.js mock must include `Quaternion` and `Euler` — the current mock is missing them, so the refactored `CameraRig` will fail unless we add them.

- [ ] **Step 1: Replace the test file**

`game/tests/CameraRig.test.js`:
```javascript
import { describe, it, expect, vi } from 'vitest'
import { CameraRig } from '../src/render/CameraRig.js'

vi.mock('three', () => {
  class Vector3 {
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z }
    copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this }
    addScaledVector(v, s) { this.x += v.x * s; this.y += v.y * s; this.z += v.z * s; return this }
    clone() { return new Vector3(this.x, this.y, this.z) }
    set(x, y, z) { this.x = x; this.y = y; this.z = z; return this }
  }
  class Quaternion {
    constructor() { this.x = 0; this.y = 0; this.z = 0; this.w = 1 }
    setFromEuler() { return this }
    slerp() { return this }
    copy(q) { Object.assign(this, q); return this }
  }
  class Euler {
    constructor(x = 0, y = 0, z = 0, order = 'XYZ') {
      this.x = x; this.y = y; this.z = z; this.order = order
    }
  }
  return {
    CatmullRomCurve3: class {
      constructor(pts) { this._pts = pts }
      getPoint(t) { return new Vector3(t, 0, -t * 10) }
      getTangent() { return new Vector3(0, 0, -1) }
    },
    Vector3,
    Quaternion,
    Euler,
  }
})

// ─── Curve mode (legacy fallback) ─────────────────────────────────────────────

describe('CameraRig – curve mode', () => {
  it('starts at progress 0', () => {
    const rig = new CameraRig(null, [], 30)
    expect(rig.progress).toBe(0)
  })

  it('advances progress with advance(dt)', () => {
    const rig = new CameraRig(null, [], 30)
    rig.advance(3)
    expect(rig.progress).toBeCloseTo(0.1)
  })

  it('clamps progress at 1', () => {
    const rig = new CameraRig(null, [], 30)
    rig.advance(100)
    expect(rig.progress).toBe(1)
  })

  it('does not advance when paused', () => {
    const rig = new CameraRig(null, [], 30)
    rig.pause()
    rig.advance(5)
    expect(rig.progress).toBe(0)
  })

  it('resumes advancing after resume()', () => {
    const rig = new CameraRig(null, [], 30)
    rig.pause()
    rig.resume()
    rig.advance(3)
    expect(rig.progress).toBeCloseTo(0.1)
  })
})

// ─── Frame mode ───────────────────────────────────────────────────────────────

function makeCamData(frameCount) {
  const frames = new Float32Array(frameCount * 5)
  for (let i = 0; i < frameCount; i++) {
    frames[i * 5 + 0] = i * 1.0  // x
    frames[i * 5 + 1] = 0        // y
    frames[i * 5 + 2] = i * 2.0  // z
    frames[i * 5 + 3] = 0        // yaw_rad
    frames[i * 5 + 4] = 0        // pitch_rad
  }
  return { frameCount, fps: 30, frames }
}

function makeCam() {
  return {
    position: { set: vi.fn() },
    quaternion: { copy: vi.fn() },
    lookAt: vi.fn(),
  }
}

describe('CameraRig – frame mode', () => {
  it('calls camera.position.set on advance', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(10))
    rig.advance(0.001)
    expect(cam.position.set).toHaveBeenCalled()
  })

  it('does not call camera.position.set when paused', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(10))
    rig.pause()
    rig.advance(1)
    expect(cam.position.set).not.toHaveBeenCalled()
  })

  it('reset() zeroes _accumSec', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(10))
    rig.advance(1)
    rig.reset()
    expect(rig._accumSec).toBe(0)
    expect(rig.paused).toBe(false)
  })

  it('resumes after pause/resume', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(10))
    rig.pause()
    rig.resume()
    rig.advance(0.001)
    expect(cam.position.set).toHaveBeenCalled()
  })

  it('clamps to last frame when accumSec exceeds duration', () => {
    const cam = makeCam()
    const rig = new CameraRig(cam, makeCamData(5))
    rig.advance(999)
    // Should not throw and should have called set
    expect(cam.position.set).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run tests to verify failures**

```
cd game
npm test
```

Expected: curve-mode tests pass (they still work), frame-mode tests fail because `CameraRig` doesn't support frame mode yet. Specifically, `cam.position.set` should not have been called because the constructor receives a `camData` object but treats it as `waypoints`.

- [ ] **Step 3: Commit the updated tests**

```
git add game/tests/CameraRig.test.js
git commit -m "test(game): update CameraRig tests – add frame-mode suite and Quaternion/Euler mock"
```

---

## Task 5: CameraRig.js refactor

**Files:**
- Modify: `game/src/render/CameraRig.js`

Replace with a version that auto-detects mode from the second constructor argument.

- [ ] **Step 1: Rewrite CameraRig.js**

`game/src/render/CameraRig.js`:
```javascript
import * as THREE from 'three'

function lerp(a, b, t) { return a + (b - a) * t }

function eulerToQuat(yaw_rad, pitch_rad) {
  const q = new THREE.Quaternion()
  q.setFromEuler(new THREE.Euler(pitch_rad, yaw_rad, 0, 'YXZ'))
  return q
}

export class CameraRig {
  /** @type {boolean} */ paused = false
  /** @type {THREE.PerspectiveCamera|null} */ camera

  /**
   * Frame-based constructor (preferred):
   *   new CameraRig(camera, { frameCount, fps, frames: Float32Array })
   *
   * Curve-based fallback:
   *   new CameraRig(camera, waypoints: THREE.Vector3[], duration: number)
   */
  constructor(camera, dataOrWaypoints, duration) {
    this.camera = camera
    if (dataOrWaypoints?.frames instanceof Float32Array) {
      this._mode       = 'frames'
      this._frames     = dataOrWaypoints.frames
      this._frameCount = dataOrWaypoints.frameCount
      this._fps        = dataOrWaypoints.fps
      this._accumSec   = 0
    } else {
      this._mode     = 'curve'
      this._curve    = new THREE.CatmullRomCurve3(dataOrWaypoints)
      this._duration = duration
      this.progress  = 0
    }
  }

  pause()  { this.paused = true }
  resume() { this.paused = false }

  reset() {
    this.paused = false
    if (this._mode === 'frames') {
      this._accumSec = 0
    } else {
      this.progress = 0
    }
  }

  /** @param {number} dt - seconds elapsed */
  advance(dt) {
    if (this.paused) return
    if (this._mode === 'frames') {
      this._advanceFrames(dt)
    } else {
      this._advanceCurve(dt)
    }
  }

  _advanceFrames(dt) {
    this._accumSec += dt
    const rawFrame = this._accumSec * this._fps
    const f0 = Math.min(Math.floor(rawFrame), this._frameCount - 1)
    const f1 = Math.min(f0 + 1,              this._frameCount - 1)
    const t  = rawFrame - Math.floor(rawFrame)

    const p0 = f0 * 5
    const p1 = f1 * 5
    const x = lerp(this._frames[p0],     this._frames[p1],     t)
    const y = lerp(this._frames[p0 + 1], this._frames[p1 + 1], t)
    const z = lerp(this._frames[p0 + 2], this._frames[p1 + 2], t)

    const q0 = eulerToQuat(this._frames[p0 + 3], this._frames[p0 + 4])
    const q1 = eulerToQuat(this._frames[p1 + 3], this._frames[p1 + 4])
    q0.slerp(q1, t)

    if (this.camera) {
      this.camera.position.set(x, y, z)
      this.camera.quaternion.copy(q0)
    }
  }

  _advanceCurve(dt) {
    this.progress = Math.min(1, this.progress + dt / this._duration)
    if (this.camera) {
      const pos = this._curve.getPoint(this.progress)
      const tangent = this._curve.getTangent(this.progress)
      this.camera.position.copy(pos)
      const lookTarget = pos.clone().addScaledVector(tangent, 1)
      this.camera.lookAt(lookTarget.x, lookTarget.y, lookTarget.z)
    }
  }
}
```

- [ ] **Step 2: Run tests**

```
cd game
npm test
```

Expected: all tests pass (5 curve-mode + 5 frame-mode = 10 total).

- [ ] **Step 3: Commit**

```
git add game/src/render/CameraRig.js
git commit -m "feat(game): refactor CameraRig – add frame-based mode with CatmullRom fallback"
```

---

## Task 6: main.js – wire in CameraPathLoader

**Files:**
- Modify: `game/src/main.js`

- [ ] **Step 1: Add import at top of main.js**

After the existing imports (around line 14), add:
```javascript
import { loadCameraPath } from './render/CameraPathLoader.js'
```

- [ ] **Step 2: Replace CameraRig construction in loadStage()**

Current code in `loadStage()` (lines 80–81):
```javascript
const pts = level.railPath.map(([x, y, z]) => new THREE.Vector3(x, y, z))
cameraRig = new CameraRig(renderer.camera, pts, level.duration)
```

Replace with:
```javascript
const camData = await loadCameraPath(stageId)
cameraRig = camData
  ? new CameraRig(renderer.camera, camData)
  : new CameraRig(renderer.camera, level.railPath.map(([x, y, z]) => new THREE.Vector3(x, y, z)), level.duration)
```

- [ ] **Step 3: Run game tests**

```
cd game
npm test
```

Expected: all tests still pass (no test imports main.js directly).

- [ ] **Step 4: Commit**

```
git add game/src/main.js
git commit -m "feat(game): loadStage() uses camera.bin if available, falls back to JSON railPath"
```

---

## Task 7: Renderer.js – lighting

**Files:**
- Modify: `game/src/render/Renderer.js`

- [ ] **Step 1: Update _addLights()**

Current `_addLights()` (lines 28–35):
```javascript
_addLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.4)
  this.scene.add(ambient)

  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(10, 20, 10)
  sun.castShadow = true
  this.scene.add(sun)
}
```

Replace with:
```javascript
_addLights() {
  const ambient = new THREE.AmbientLight(0xffffff, 0.8)
  this.scene.add(ambient)

  const sun = new THREE.DirectionalLight(0xffffff, 1.2)
  sun.position.set(10, 20, 10)
  sun.castShadow = true
  this.scene.add(sun)

  const fill = new THREE.DirectionalLight(0x8899bb, 0.6)
  fill.position.set(-10, 5, -10)
  this.scene.add(fill)
}
```

- [ ] **Step 2: Commit**

```
git add game/src/render/Renderer.js
git commit -m "fix(game): boost ambient light and add fill light for brighter scene"
```

---

## Task 8: HUD.js – crosshair

**Files:**
- Modify: `game/src/hud/HUD.js`

- [ ] **Step 1: Add crosshair element and style in _build()**

In `_build(container)`, append a crosshair element **after** the existing style tag setup. The crosshair must be added directly to `document.body` (not the HUD container) so it's truly fixed-center regardless of HUD layout.

Replace the entire `_build` method:
```javascript
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
    .heart.full::before  { content:'♥'; color:#f44; }
    .heart.empty::before { content:'♡'; color:#888; }
    #crosshair {
      position:fixed; left:50%; top:50%;
      transform:translate(-50%,-50%);
      color:#fff; font-size:20px; line-height:1;
      pointer-events:none; user-select:none;
      text-shadow:0 0 3px #000;
      transition:color 0.05s;
    }
    #crosshair.hit { color:#f00; }
  `
  container.appendChild(style)

  this._crosshair = document.createElement('div')
  this._crosshair.id = 'crosshair'
  this._crosshair.textContent = '+'
  document.body.appendChild(this._crosshair)

  this._renderHearts()
}
```

- [ ] **Step 2: Add flashCrosshair() method**

Add this method to the `HUD` class (after `reset()`):
```javascript
flashCrosshair() {
  if (!this._crosshair) return
  this._crosshair.classList.add('hit')
  clearTimeout(this._crosshairTimer)
  this._crosshairTimer = setTimeout(() => {
    this._crosshair.classList.remove('hit')
  }, 100)
}
```

- [ ] **Step 3: Wire up flash in main.js shoot handler**

In `game/src/main.js`, inside the `input.onShoot(...)` callback, add `hud.flashCrosshair()` right after `if (hits.length > 0) {` on line 39:

Current block (lines 38–47):
```javascript
const hits = shooter.getHits(input.mouse, enemyMgr.getActiveMeshes())
if (hits.length > 0) {
  const enemy = hits[0].object.userData.enemyRef
  if (enemy) {
    enemy.hit(1)
    audio.enemyHit()
    hud.addScore(enemy.type === 'boss' ? 500 : 100)
    hud.updateHiScore()
  }
}
```

Replace with:
```javascript
const hits = shooter.getHits(input.mouse, enemyMgr.getActiveMeshes())
if (hits.length > 0) {
  hud.flashCrosshair()
  const enemy = hits[0].object.userData.enemyRef
  if (enemy) {
    enemy.hit(1)
    audio.enemyHit()
    hud.addScore(enemy.type === 'boss' ? 500 : 100)
    hud.updateHiScore()
  }
}
```

- [ ] **Step 4: Run game tests**

```
cd game
npm test
```

Expected: all tests pass (HUD tests run in jsdom which provides `document.body`).

- [ ] **Step 5: Commit**

```
git add game/src/hud/HUD.js game/src/main.js
git commit -m "feat(game): add crosshair to HUD, flash red on enemy hit"
```

---

## Task 9: Run extractor + verify in browser

- [ ] **Step 1: Run the extractor for Stage 1**

From `tools/extract-stage-assets/`:
```
node extract-camera.mjs "<path-to-vc2-installation>" "../game/public/assets"
```

Where `<path-to-vc2-installation>` is the root folder containing the `BIN/` directory with `CAMMOV0.BIN` etc.

Expected output:
```
Wrote ../game/public/assets/stage1/camera.bin  (9118 frames, 182368 bytes)
Skipping CAMMOV1.BIN (not found ...)   ← OK, Stage 2 is optional for now
Skipping CAMMOV2.BIN (not found ...)
```

- [ ] **Step 2: Verify camera.bin exists and has correct size**

```
node -e "
const fs = require('fs')
const buf = fs.readFileSync('../game/public/assets/stage1/camera.bin')
const count = buf.readUInt32LE(0)
const fps   = buf.readUInt32LE(4)
console.log('frameCount:', count, 'fps:', fps, 'bytes:', buf.length)
console.log('first frame x:', buf.readFloatLE(8).toFixed(3),
            'y:', buf.readFloatLE(12).toFixed(3),
            'z:', buf.readFloatLE(16).toFixed(3))
"
```

Expected:
```
frameCount: 9118  fps: 30  bytes: 182368
first frame x: -122.xxx  y: -8.xxx  z: 274.xxx
```

(x is negated from original: `cammov_x ≈ 122.5 → threejs_x ≈ -122.5`)

- [ ] **Step 3: Start dev server**

```
cd game
npm run dev
```

Open browser at `http://localhost:5173` (or whichever port Vite reports).

- [ ] **Step 4: Verify camera moves correctly**

1. Start Stage 1.
2. Camera should sweep through the harbour scene — the path now comes from CAMMOV data.
3. The scene should be noticeably brighter than before (lighting fix).
4. A white `+` crosshair appears at dead-centre.
5. Click an enemy — crosshair briefly flashes red.

If the camera **does not move at all**: open DevTools → Network tab → verify `/assets/stage1/camera.bin` returns 200. If 404, check that the file was written to `game/public/assets/stage1/camera.bin`.

If the camera **moves but direction looks wrong**: the coordinate transform may need adjustment. Check first-frame yaw by running the verify script from Step 2.

- [ ] **Step 5: Final commit**

```
git add game/public/assets/stage1/camera.bin
git commit -m "feat(game): add Stage 1 camera.bin extracted from CAMMOV0.BIN"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered in |
|---|---|
| CAMMOV*.BIN 16-byte frame decode | Task 1 |
| Coordinate transform x→−x, yaw→−yaw | Task 1 |
| extract-camera.mjs CLI → camera.bin | Task 2 |
| camera.bin format: 8-byte header + 20-byte frame | Task 2 |
| CameraPathLoader fetch + parse | Task 3 |
| CameraRig frame-based advance (lerp + slerp) | Task 5 |
| CameraRig fallback to CatmullRom | Task 5 (detect by `frames instanceof Float32Array`) |
| main.js loadStage() tries camera.bin first | Task 6 |
| AmbientLight 0.4 → 0.8 + fill DirectionalLight | Task 7 |
| Crosshair fixed-center CSS element | Task 8 |
| Crosshair flashes red 0.1s on hit | Task 8 |
| Unit tests for camera-reader | Task 1 |
| Unit tests for CameraRig frame mode | Task 4 |
| Browser verification | Task 9 |

**Type consistency:** `{ frameCount, fps, frames: Float32Array }` is produced by `loadCameraPath()` in Task 3 and consumed by `CameraRig` constructor in Task 5. Identical shape.

**No placeholders detected.**
