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
