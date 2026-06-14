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

export const SKY_TOP = 0x4a78b0       // deeper blue overhead
export const SKY_HORIZON = 0x9fbcd8   // pale haze at the horizon (= fog colour)
export const FOG_NEAR = 260
export const FOG_FAR = 1500
export const SKY_RADIUS = 2600        // < camera far (3000); world spans ~1300

/**
 * Build the sky-dome mesh (no side effects). Inward-facing gradient sphere,
 * unaffected by fog, drawn before everything, never raycast.
 * @param {number} radius
 * @returns {THREE.Mesh}
 */
export function createSkyDome(radius = SKY_RADIUS) {
  const geo = new THREE.SphereGeometry(radius, 32, 16)
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(SKY_TOP) },
      horizonColor: { value: new THREE.Color(SKY_HORIZON) },
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
 * @returns {THREE.Mesh} the sky dome
 */
export function applyAtmosphere(scene) {
  const dome = createSkyDome()
  scene.add(dome)
  scene.fog = new THREE.Fog(SKY_HORIZON, FOG_NEAR, FOG_FAR)
  scene.background = new THREE.Color(SKY_HORIZON)
  return dome
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
