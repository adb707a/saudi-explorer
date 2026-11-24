import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import './globe.css'

export type GlobeVariant = 'atlas' | 'pulse' | 'darb'
export type GlobePhase = 'intro' | 'leaving'

const VARIANTS = {
  atlas: {
    background: 'radial-gradient(circle at 42% 44%, #20302b 0%, #101b18 44%, #090e0c 100%)',
    atmosphere: 0xd9b47a,
    ambient: 0.16,
    sun: 0xfff0d4,
    stars: 0.45,
    autoRotate: 0.22,
    start: [0.85, 0.48, 3.05] as const,
    approach: 6400,
    reveal: 2400,
    endDistance: 1.62,
    speed: 1,
  },
  pulse: {
    background: 'radial-gradient(circle at 46% 42%, #0e3331 0%, #071a19 46%, #020807 100%)',
    atmosphere: 0x4fd0c8,
    ambient: 0.12,
    sun: 0xd7fff7,
    stars: 1,
    autoRotate: -0.35,
    start: [2.55, 1.1, 1.95] as const,
    approach: 5200,
    reveal: 1800,
    endDistance: 1.5,
    speed: 1.25,
  },
  darb: {
    background: 'radial-gradient(circle at 40% 46%, #3b291c 0%, #1f1711 45%, #0d0a08 100%)',
    atmosphere: 0xe8b980,
    ambient: 0.18,
    sun: 0xffe9c6,
    stars: 0.7,
    autoRotate: 0.5,
    start: [-1.6, 0.82, 2.75] as const,
    approach: 5800,
    reveal: 2100,
    endDistance: 1.66,
    speed: 1.1,
  },
} as const

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

export function GlobeIntro({
  variant,
  phase,
  onReady,
  onReveal,
  onSettled,
  onArrived,
  onFail,
}: {
  variant: GlobeVariant
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
    const config = VARIANTS[variant]
    let disposed = false
    let raf = 0
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' })
    } catch {
      callbacks.current.onFail?.()
      return
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = variant === 'pulse' ? 1.18 : 1.1
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(38, 1, 0.001, 200)
    camera.position.set(config.start[0], config.start[1], config.start[2])
    camera.lookAt(0, 0, 0)

    const controls = new OrbitControls(camera, canvas)
    controls.enablePan = false
    controls.enableDamping = true
    controls.dampingFactor = 0.05
    controls.minDistance = 1.48
    controls.maxDistance = 4.2
    controls.rotateSpeed = 0.42
    controls.zoomSpeed = 0.55
    controls.autoRotate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    controls.autoRotateSpeed = config.autoRotate
    controls.enableZoom = true

    const ambient = new THREE.AmbientLight(0xffffff, config.ambient)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(config.sun, variant === 'pulse' ? 2.4 : 2.1)
    sun.position.set(4.5, 2.4, 3.6)
    scene.add(sun)
    const rim = new THREE.DirectionalLight(config.atmosphere, 0.55)
    rim.position.set(-4, -1.5, -2.4)
    scene.add(rim)

    const earthGroup = new THREE.Group()
    earthGroup.rotation.z = -0.075
    scene.add(earthGroup)

    const earthGeo = new THREE.SphereGeometry(1, 96, 96)
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 9,
      specular: new THREE.Color(0x223c3c),
    })
    const earth = new THREE.Mesh(earthGeo, earthMat)
    earthGroup.add(earth)

    const load = new THREE.TextureLoader()
    const base = import.meta.env.BASE_URL
    const dayTex = load.load(base + 'textures/earth_day_2048.jpg')
    dayTex.colorSpace = THREE.SRGBColorSpace
    dayTex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 8)
    const specTex = load.load(base + 'textures/earth_specular_2048.jpg')
    specTex.anisotropy = 4
    const normalTex = load.load(base + 'textures/earth_normal_2048.jpg')
    normalTex.anisotropy = 4
    const cloudTex = load.load(base + 'textures/earth_clouds_1024.png')
    cloudTex.anisotropy = 4

    earthMat.map = dayTex
    earthMat.specularMap = specTex
    earthMat.normalMap = normalTex
    earthMat.normalScale = new THREE.Vector2(0.65, 0.65)
    earthMat.needsUpdate = true

    const cloudMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      alphaMap: cloudTex,
      transparent: true,
      opacity: variant === 'pulse' ? 0.46 : 0.38,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })
    const clouds = new THREE.Mesh(new THREE.SphereGeometry(1.004, 80, 80), cloudMat)
    earthGroup.add(clouds)

    const atmosphereMat = new THREE.ShaderMaterial({
      uniforms: {
        glowColor: { value: new THREE.Color(config.atmosphere) },
        intensity: { value: variant === 'pulse' ? 1.2 : 1 },
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vNormal = normalize(normalMatrix * normal);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform vec3 glowColor;
        uniform float intensity;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float rim = 1.0 - max(dot(vNormal, vView), 0.0);
          float a = pow(rim, 3.2) * 0.92 * intensity;
          gl_FragColor = vec4(glowColor, a);
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
    })
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.045, 64, 64), atmosphereMat)
    scene.add(atmosphere)

    // Realistic starfield is decorative, not geographic data.
    const starCount = variant === 'pulse' ? 1600 : 900
    const starPositions = new Float32Array(starCount * 3)
    for (let i = 0; i < starCount; i++) {
      const r = 16 + Math.random() * 28
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.cos(phi)
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    const starMat = new THREE.PointsMaterial({
      color: variant === 'pulse' ? 0x9fd8d2 : 0xf1ddb9,
      size: variant === 'pulse' ? 0.035 : 0.028,
      transparent: true,
      opacity: config.stars * 0.55,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    const stars = new THREE.Points(starGeo, starMat)
    scene.add(stars)

    const targetLocal = latLonToVector(24.7136, 46.6753)
    const targetWorld = targetLocal.clone().applyQuaternion(earthGroup.quaternion).normalize()

    let mode: 'idle' | 'approach' | 'leave' = 'idle'
    let startedAt = 0
    let startPos = new THREE.Vector3()
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
      if (fromApproach) {
        // if the user starts early, finish the approach against a shorter clock
        approachDist = Math.min(approachDist, startDist)
      }
    }

    const clock = new THREE.Clock()
    const startTimeout = window.setTimeout(() => beginApproach(), 900)
    const revealTimeout = window.setTimeout(() => callbacks.current.onReveal?.(), config.reveal)
    let settledTimer = 0
    const readyCheck = window.setInterval(() => {
      if (dayTex.image && cloudTex.image) {
        window.clearInterval(readyCheck)
        callbacks.current.onReady?.()
        settledTimer = window.setTimeout(() => {
          if (mode === 'approach') finishApproach()
        }, config.approach)
      }
    }, 80)
    // If textures fail, still never trap the visitor.
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
        const p = Math.min(1, (performance.now() - startedAt) / config.approach)
        const e = easeInOutSine(p)
        const dir = camera.position.clone().normalize().lerp(targetWorld, e).normalize()
        if (variant === 'darb') {
          const swirl = Math.sin(p * Math.PI) * 0.26 * (1 - p)
          dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), swirl)
        }
        const dist = startDist + (approachDist - startDist) * e
        camera.position.copy(dir.multiplyScalar(dist))
        if (variant === 'pulse') {
          camera.up.set(Math.sin(p * Math.PI) * 0.12, 1, 0).normalize()
        }
        camera.lookAt(0, 0, 0)
        if (p >= 1) finishApproach()
      } else if (mode === 'leave') {
        const p = Math.min(1, (performance.now() - startedAt) / 2300)
        const e = easeOutCubic(p)
        const targetEnd = 1.045
        const dir = startPos.clone().normalize().lerp(targetWorld, Math.min(0.2, p * 0.25)).normalize()
        const dist = startDist + (targetEnd - startDist) * e
        camera.position.copy(dir.multiplyScalar(dist))
        camera.lookAt(0, 0, 0)
        renderer.toneMappingExposure = (variant === 'pulse' ? 1.18 : 1.1) * (1 - e * 0.25)
        if (p >= 1) {
          mode = 'idle'
          callbacks.current.onArrived?.()
        }
      } else {
        camera.lookAt(0, 0, 0)
      }

      clouds.rotation.y = elapsed * (variant === 'darb' ? 0.009 : 0.005)
      stars.rotation.y = elapsed * 0.0018
      if (variant === 'pulse') {
        starMat.opacity = 0.55 + Math.sin(elapsed * 1.6) * 0.08
      }
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
        scene.traverse((obj) => {
          if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
            obj.geometry?.dispose()
            const mat = obj.material
            if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
            else mat?.dispose()
          }
        })
        dayTex.dispose(); specTex.dispose(); normalTex.dispose(); cloudTex.dispose()
        renderer.dispose()
      },
    }

    return () => {
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [variant])

  useEffect(() => {
    if (phase === 'leaving') sceneRef.current?.leave()
  }, [phase])

  return (
    <div className={`globe-stage globe-stage--${variant}`} style={{ background: VARIANTS[variant].background }}>
      <canvas ref={canvasRef} className="globe-canvas" aria-label="كرة أرضية ثلاثية الأبعاد" />
      <div className="globe-vignette" aria-hidden="true" />
      <div className="globe-ui" aria-hidden="true">
        <span className="globe-ui-line" />
        <span className="globe-ui-label">EARTH / 3D</span>
      </div>
      <span className="globe-hint">اسحب الكرة لتدويرها · قرّب بعجلة الفأرة</span>
      <span className="globe-credit">Earth textures: NASA / three.js</span>
    </div>
  )
}
