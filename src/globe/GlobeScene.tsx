import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './globe.css'

export type GlobePhase = 'intro' | 'leaving'

export interface GlobeConfig {
  /** CSS background behind the canvas (deep space gradient). */
  background: string
  /** Atmosphere rim color as hex number. */
  atmosphere: number
  sun: number
  starColor: number
  starCount: number
  starOpacity: number
  ambient: number
  autoRotate: number
  start: [number, number, number]
  approachMs: number
  revealMs: number
  leaveMs: number
  endDistance: number
  cloudOpacity: number
  exposure: number
  tone: 'orbit' | 'scope' | 'fieldguide'
}

function latLonToVector(lat: number, lon: number): THREE.Vector3 {
  const phi = ((lon + 180) * Math.PI) / 180
  const theta = ((90 - lat) * Math.PI) / 180
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
  ).normalize()
}

const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Soft circular sprite for round, realistic stars. */
function makeStarSprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.85)')
  grad.addColorStop(0.6, 'rgba(255,255,255,0.25)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  return new THREE.CanvasTexture(c)
}

function buildStars(count: number, spread: number, color: number, size: number, opacity: number, sprite: THREE.Texture) {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = 12 + Math.random() * spread
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.cos(phi)
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  const mat = new THREE.PointsMaterial({
    color,
    size,
    map: sprite,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  })
  return new THREE.Points(geo, mat)
}

export function GlobeScene({
  config,
  phase,
  onReady,
  onReveal,
  onSettled,
  onArrived,
  onFail,
}: {
  config: GlobeConfig
  phase: GlobePhase
  onReady?: () => void
  onReveal?: () => void
  onSettled?: () => void
  onArrived?: () => void
  onFail?: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<{ leave: () => void; dispose: () => void } | null>(null)
  const callbacks = useRef({ onReady, onReveal, onSettled, onArrived, onFail })
  callbacks.current = { onReady, onReveal, onSettled, onArrived, onFail }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let disposed = false
    let raf = 0
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      callbacks.current.onFail?.()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = config.exposure
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.001, 200)
    camera.position.set(config.start[0], config.start[1], config.start[2])
    camera.lookAt(0, 0, 0)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const controls = new OrbitControls(camera, canvas)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 1.48
    controls.maxDistance = 4.2
    controls.rotateSpeed = 0.42
    controls.zoomSpeed = 0.55
    controls.autoRotate = !reduceMotion
    controls.autoRotateSpeed = config.autoRotate
    controls.enableZoom = true

    // Lighting — key sun, cool fill, warm rim (no halo).
    scene.add(new THREE.AmbientLight(0xffffff, config.ambient))
    const sun = new THREE.DirectionalLight(config.sun, 2.4)
    sun.position.set(4.5, 2.4, 3.6)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xbcd6ff, 0.35)
    fill.position.set(-3, -1, -2)
    scene.add(fill)

    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = -0.075
    scene.add(earthGroup)

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1, 128, 128),
      new THREE.MeshPhongMaterial({ color: 0xffffff, shininess: 14, specular: new THREE.Color(0x1a2c2c) }),
    )
    earthGroup.add(earth)

    const load = new THREE.TextureLoader()
    const base = import.meta.env.BASE_URL
    const dayTex = load.load(base + 'textures/earth_day_2048.jpg')
    dayTex.colorSpace = THREE.SRGBColorSpace
    dayTex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16)
    const specTex = load.load(base + 'textures/earth_specular_2048.jpg')
    specTex.anisotropy = 8
    const normalTex = load.load(base + 'textures/earth_normal_2048.jpg')
    normalTex.anisotropy = 8
    const cloudTex = load.load(base + 'textures/earth_clouds_1024.png')
    cloudTex.anisotropy = 8

    const earthMat = earth.material as THREE.MeshPhongMaterial
    earthMat.map = dayTex
    earthMat.specularMap = specTex
    earthMat.normalMap = normalTex
    earthMat.normalScale = new THREE.Vector2(0.7, 0.7)
    earthMat.needsUpdate = true

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.006, 96, 96),
      new THREE.MeshPhongMaterial({
        color: 0xffffff,
        alphaMap: cloudTex,
        transparent: true,
        opacity: config.cloudOpacity,
        depthWrite: false,
      }),
    )
    earthGroup.add(clouds)

    // Thin fresnel atmosphere rim — hugs the limb, no big blue circle.
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.022, 96, 96),
      new THREE.ShaderMaterial({
        uniforms: { glowColor: { value: new THREE.Color(config.atmosphere) }, intensity: { value: 1.0 } },
        vertexShader: `
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vN = normalize(normalMatrix * normal);
            vV = normalize(-mv.xyz);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 glowColor;
          uniform float intensity;
          varying vec3 vN;
          varying vec3 vV;
          void main() {
            float d = clamp(dot(normalize(vN), normalize(vV)), 0.0, 1.0);
            float rim = pow(1.0 - d, 4.0);
            float alpha = rim * 0.85 * intensity;
            gl_FragColor = vec4(glowColor, alpha);
          }
        `,
        blending: THREE.AdditiveBlending,
        side: THREE.FrontSide,
        transparent: true,
        depthWrite: false,
      }),
    )
    scene.add(atmosphere)

    // Realistic starfield — three depth layers, soft sprites, subtle twinkle.
    const sprite = makeStarSprite()
    const starLayers: Array<{ pts: THREE.Points; base: number }> = []
    const dims = buildStars(Math.floor(config.starCount * 0.6), 26, config.starColor, 0.035, config.starOpacity * 0.5, sprite)
    const mids = buildStars(Math.floor(config.starCount * 0.3), 24, config.starColor, 0.07, config.starOpacity * 0.75, sprite)
    const brights = buildStars(Math.floor(config.starCount * 0.1) + 40, 22, 0xffffff, 0.15, 1, sprite)
    starLayers.push({ pts: dims, base: dims.material.opacity }, { pts: mids, base: mids.material.opacity }, { pts: brights, base: 1 })
    scene.add(dims, mids, brights)

    const targetWorld = latLonToVector(24.7136, 46.6753).clone().applyQuaternion(earthGroup.quaternion).normalize()

    let mode: 'idle' | 'approach' | 'leave' = 'idle'
    let startedAt = 0
    const startPos = new THREE.Vector3()
    let startDist = 3
    let approachDist = 1.6

    const finishApproach = () => {
      mode = 'idle'
      camera.up.set(0, 1, 0)
      callbacks.current.onSettled?.()
    }

    const beginApproach = () => {
      if (mode !== 'idle') return
      mode = 'approach'
      startedAt = performance.now()
      startPos.copy(camera.position)
      startDist = camera.position.length()
      approachDist = config.endDistance
      controls.autoRotate = false
      controls.enabled = false
    }

    const leave = () => {
      if (mode === 'leave') return
      const fromApproach = mode === 'approach'
      mode = 'leave'
      startedAt = performance.now()
      startPos.copy(camera.position)
      startDist = camera.position.length()
      if (fromApproach) approachDist = Math.min(approachDist, startDist)
    }

    const clock = new THREE.Clock()
    const startTimeout = window.setTimeout(() => beginApproach(), reduceMotion ? 300 : 900)
    const revealTimeout = window.setTimeout(() => callbacks.current.onReveal?.(), config.revealMs)
    let settledTimer = 0
    const readyCheck = window.setInterval(() => {
      if (dayTex.image && cloudTex.image) {
        window.clearInterval(readyCheck)
        callbacks.current.onReady?.()
        settledTimer = window.setTimeout(() => {
          if (mode === 'approach') finishApproach()
        }, config.approachMs)
      }
    }, 80)
    const failsafe = window.setTimeout(() => {
      callbacks.current.onReady?.()
      callbacks.current.onSettled?.()
    }, 7000)

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const w = parent.clientWidth
      const h = parent.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    const ro = new ResizeObserver(resize)
    if (canvas.parentElement) ro.observe(canvas.parentElement)

    const render = () => {
      if (disposed) return
      raf = requestAnimationFrame(render)
      if (document.hidden) return
      const elapsed = clock.getElapsedTime()
      if (mode === 'idle' && controls.enabled) controls.update()

      if (mode === 'approach') {
        const p = Math.min(1, (performance.now() - startedAt) / config.approachMs)
        const e = easeInOutSine(p)
        const dir = camera.position.clone().normalize().lerp(targetWorld, e).normalize()
        const dist = startDist + (approachDist - startDist) * e
        camera.position.copy(dir.multiplyScalar(dist))
        camera.lookAt(0, 0, 0)
        if (p >= 1) finishApproach()
      } else if (mode === 'leave') {
        const p = Math.min(1, (performance.now() - startedAt) / config.leaveMs)
        const e = easeOutCubic(p)
        const targetEnd = 1.022
        const dir = startPos.clone().normalize().lerp(targetWorld, Math.min(0.2, p * 0.25)).normalize()
        const dist = startDist + (targetEnd - startDist) * e
        camera.position.copy(dir.multiplyScalar(dist))
        camera.lookAt(0, 0, 0)
        renderer.toneMappingExposure = config.exposure * (1 - e * 0.25)
        if (p >= 1) {
          mode = 'idle'
          callbacks.current.onArrived?.()
        }
      } else {
        camera.lookAt(0, 0, 0)
      }

      clouds.rotation.y = elapsed * 0.005
      dims.rotation.y = elapsed * 0.0012
      mids.rotation.y = elapsed * 0.0016
      brights.rotation.y = elapsed * 0.002
      // subtle twinkle on the bright layer
      ;(brights.material as THREE.PointsMaterial).opacity = 0.8 + Math.sin(elapsed * 2.4) * 0.2
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(render)

    sceneRef.current = {
      leave,
      dispose: () => {
        disposed = true
        cancelAnimationFrame(raf)
        window.clearTimeout(startTimeout)
        window.clearTimeout(revealTimeout)
        window.clearTimeout(settledTimer)
        window.clearInterval(readyCheck)
        window.clearTimeout(failsafe)
        ro.disconnect()
        controls.dispose()
        sprite.dispose()
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
            obj.geometry?.dispose()
            const mat = obj.material
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
            else mat?.dispose()
          }
        })
        dayTex.dispose()
        specTex.dispose()
        normalTex.dispose()
        cloudTex.dispose()
        renderer.dispose()
      },
    }

    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase === 'leaving') sceneRef.current?.leave()
  }, [phase])

  return (
    <div className={`globe globe--${config.tone}`} style={{ background: config.background }} data-phase={phase}>
      <canvas ref={canvasRef} className="globe-canvas" aria-label="كرة أرضية ثلاثية الأبعاد" />
      <div className="globe-vignette" aria-hidden="true" />
      <span className="globe-hint">اسحب الكرة لتدويرها · قرّب بعجلة الفأرة</span>
      <span className="globe-credit">Earth textures · NASA / three.js</span>
    </div>
  )
}
