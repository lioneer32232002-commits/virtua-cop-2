import * as THREE from 'three'

// Original VC2 stage 1 is an outdoor harbour/city. The renderer used to paint
// the whole sky one flat blue (0x88aacc), which read as an obvious "blue void"
// wherever the stage geometry didn't cover the view — over the skyline, the
// harbour-water gaps, and especially the B2 arena where the camera floats on an
// elevated road with almost nothing beneath it.
//
// We approximate the original's atmospheric look with two cheap additions the
// Model-2-style unlit pipeline is compatible with:
//   1. a sky dome — a large inward-facing sphere with a vertical gradient
//      (deeper blue overhead, paler haze at the horizon) so empty view reads as
//      sky and tracks the camera as it pitches;
//   2. linear distance fog tuned to the horizon colour so distant geometry
//      dissolves into the haze instead of ending at a hard edge against blue.
//
// Both are additive and invisible to gameplay: the dome lives in the scene (not
// StageEnvironment.root) and is `raycast`-disabled, so neither the ground
// raycast (`groundYAt`) nor the shooter raycast (explicit object lists) see it.

// Legacy VC2 daytime-blue palette — no longer the sky default (DUSK_* below drive
// it now). Kept exported for back-compat; editing these two no longer changes the sky.
export const SKY_TOP = 0x4a78b0       // (legacy) deeper blue overhead
export const SKY_HORIZON = 0x9fbcd8   // (legacy) pale haze at the horizon
export const FOG_NEAR = 260
export const FOG_FAR = 1500
export const SKY_RADIUS = 2600        // < camera far (3000); world spans ~1300

// ── DARKLINE dusk atmospheres (M3 Phase B). Warm low horizon → cool deep top,
// matching the keeper street's warm dusk palette. fogColor === horizon so distant
// blocks dissolve into the sky, not a mismatched haze. Per-segment via setAtmosphere.
export const DUSK_TAIPEI = { top: 0x2b3350, horizon: 0xb07a52, fogColor: 0xb07a52, fogNear: 220, fogFar: 1400 }
export const DUSK_HARBOR = { top: 0x26304a, horizon: 0x8f8a6e, fogColor: 0x8f8a6e, fogNear: 200, fogFar: 1500 }

/**
 * Build the sky-dome mesh (no side effects). Inward-facing gradient sphere,
 * unaffected by fog, drawn before everything, never raycast.
 * @param {number} radius
 * @param {{top?:number,horizon?:number}} colours  defaults to dusk-taipei
 * @returns {THREE.Mesh}
 */
export function createSkyDome(radius = SKY_RADIUS, { top = DUSK_TAIPEI.top, horizon = DUSK_TAIPEI.horizon } = {}) {
  const geo = new THREE.SphereGeometry(radius, 32, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(top) },
      horizonColor: { value: new THREE.Color(horizon) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      varying vec3 vDir;
      void main() {
        // vDir.y: -1 straight down .. +1 straight up. Concentrate the blend just
        // above the horizon so most of the visible sky is the gradient, not flat.
        float t = smoothstep(0.0, 0.55, vDir.y);
        gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
      }
    `,
  })
  const dome = new THREE.Mesh(geo, mat)
  dome.name = 'sky_dome'
  dome.renderOrder = -1       // draw first, behind all stage/character geometry
  dome.frustumCulled = false  // always present regardless of camera orientation
  dome.raycast = () => {}     // never intersected by any Raycaster
  return dome
}

/**
 * Add the sky dome to a scene and set matching distance fog. Keeps a solid
 * `background` (horizon colour) as a one-frame fallback before the dome draws.
 * Returns the dome so the renderer can recentre it each frame via `updateSky`.
 * @param {THREE.Scene} scene
 * @param {{top:number,horizon:number,fogColor:number,fogNear:number,fogFar:number}} atmos  defaults to dusk-taipei
 * @returns {THREE.Mesh} the sky dome
 */
export function applyAtmosphere(scene, atmos = DUSK_TAIPEI) {
  const dome = createSkyDome(SKY_RADIUS, { top: atmos.top, horizon: atmos.horizon })
  scene.add(dome)
  scene.fog = new THREE.Fog(atmos.fogColor, atmos.fogNear, atmos.fogFar)
  scene.background = new THREE.Color(atmos.fogColor)
  return dome
}

/**
 * Recolour the existing sky dome + fog + background for a new segment, without
 * rebuilding the scene. Safe no-op on missing dome/scene.
 * @param {THREE.Scene} scene
 * @param {THREE.Mesh|null} dome  the mesh returned by applyAtmosphere (renderer.sky)
 * @param {{top:number,horizon:number,fogColor:number,fogNear:number,fogFar:number}} atmos  required (no default — a recolour with no target is a caller error)
 */
export function setAtmosphere(scene, dome, atmos) {
  if (dome && dome.material && dome.material.uniforms) {
    dome.material.uniforms.topColor.value.setHex(atmos.top)
    dome.material.uniforms.horizonColor.value.setHex(atmos.horizon)
  }
  if (scene) {
    if (scene.fog) { scene.fog.color.setHex(atmos.fogColor); scene.fog.near = atmos.fogNear; scene.fog.far = atmos.fogFar }
    else scene.fog = new THREE.Fog(atmos.fogColor, atmos.fogNear, atmos.fogFar)
    scene.background = new THREE.Color(atmos.fogColor)
  }
}

/**
 * Recentre the dome on the camera so its horizon stays effectively at infinity
 * and the player never reaches its edge. No-op on missing args.
 * @param {THREE.Mesh|null} dome
 * @param {THREE.Camera|null} camera
 */
export function updateSky(dome, camera) {
  if (dome && camera) dome.position.copy(camera.position)
}
