import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './orbitGlobe.css'

export type OrbitGlobePhase = 'idle' | 'flying'

interface OrbitGlobeProps {
  phase: OrbitGlobePhase
  onReady?: () => void
  onApproach?: () => void
  onLanding?: () => void
  onArrived?: () => void
  onFail?: () => void
}

/** The Kingdom — the point the camera lands on. */
const SAUDI = { lat: 23.9, lon: 45.05 }

function latLonToVector(lat: number, lon: number, radius = 1): THREE.Vector3 {
  const phi = ((lon + 180) * Math.PI) / 180
  const theta = ((90 - lat) * Math.PI) / 180
  return new THREE.Vector3(
    -Math.cos(phi) * Math.sin(theta),
    Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
  ).multiplyScalar(radius)
}

/** Local tangent frame at a lat/lon: east, north and up (= radial). */
function tangentFrame(lat: number, lon: number) {
  const up = latLonToVector(lat, lon).normalize()
  const east = latLonToVector(lat, lon + 0.05).sub(latLonToVector(lat, lon - 0.05)).normalize()
  const north = latLonToVector(lat + 0.05, lon).sub(latLonToVector(lat - 0.05, lon)).normalize()
  return { east, north, up }
}

/**
 * Orientation that puts `lat/lon` at the point facing `viewDir`
 * (the direction from the globe centre to the camera), north up.
 */
function facingQuaternion(lat: number, lon: number, viewDir: THREE.Vector3) {
  const f = tangentFrame(lat, lon)
  const v = viewDir.clone().normalize()
  let u = new THREE.Vector3(0, 1, 0).sub(v.clone().multiplyScalar(v.y))
  if (u.lengthSq() < 1e-5) u = new THREE.Vector3(1, 0, 0)
  u.normalize()
  const e = new THREE.Vector3().crossVectors(u, v).normalize()
  const local = new THREE.Matrix4().makeBasis(f.east, f.north, f.up)
  const world = new THREE.Matrix4().makeBasis(e, u, v)
  const r = world.multiply(local.transpose())
  return new THREE.Quaternion().setFromRotationMatrix(r)
}

/** Balanced cinematic acceleration and braking. */
const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

/** Tiny round star sprite, built once. */
function starSprite(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 32
  c.height = 32
  const g = c.getContext('2d')!
  const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.3, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 32, 32)
  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function buildStarLayer(
  count: number,
  spread: number,
  size: number,
  opacity: number,
  color: number,
  sprite: THREE.Texture,
): THREE.Points {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const r = 30 + Math.random() * spread
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

type GeoJSONGeometry =
  | { type: 'Polygon'; coordinates: number[][][] }
  | { type: 'MultiPolygon'; coordinates: number[][][][] }
  | { type: 'LineString'; coordinates: number[][] }
  | { type: 'MultiLineString'; coordinates: number[][][] }

/** Build a single draw call for every ring of the Saudi border. */
function buildBorderGeometry(geometries: GeoJSONGeometry[]): THREE.BufferGeometry | null {
  const verts: number[] = []
  const pushRing = (ring: number[][]) => {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = latLonToVector(ring[i][1], ring[i][0], 1.0032)
      const b = latLonToVector(ring[i + 1][1], ring[i + 1][0], 1.0032)
      verts.push(a.x, a.y, a.z, b.x, b.y, b.z)
    }
  }
  const walk = (g: GeoJSONGeometry) => {
    if (g.type === 'Polygon') g.coordinates.forEach(pushRing)
    else if (g.type === 'MultiPolygon') g.coordinates.forEach((poly) => poly.forEach(pushRing))
    else if (g.type === 'LineString') pushRing(g.coordinates)
    else if (g.type === 'MultiLineString') g.coordinates.forEach(pushRing)
  }
  geometries.forEach(walk)
  if (!verts.length) return null
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
  return geo
}

export function OrbitGlobe({ phase, onReady, onApproach, onLanding, onArrived, onFail }: OrbitGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<{ fly: () => void } | null>(null)
  const callbacks = useRef({ onReady, onApproach, onLanding, onArrived, onFail })
  callbacks.current = { onReady, onApproach, onLanding, onArrived, onFail }

  useEffect(() => {
    const canvas = canvasRef.current
    const root = rootRef.current
    if (!root || !canvas) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      })
    } catch {
      callbacks.current.onFail?.()
      return
    }

    const mobile = window.innerWidth < 760
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.8 : 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.1
    renderer.setClearColor(0x000000, 0)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 400)
    const baseDir = new THREE.Vector3(0, 0.14, 1).normalize()

    // ---- lights: warm sun upper right, cool fill, low ambient ----
    scene.add(new THREE.AmbientLight(0xcfd9f2, 0.09))
    const sunDir = new THREE.Vector3(4.6, 2.6, 3.4).normalize()
    const sun = new THREE.DirectionalLight(0xfff0d8, 3.3)
    sun.position.copy(sunDir).multiplyScalar(10)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x7f9cc9, 0.26)
    fill.position.set(-5, -2, -3.5)
    scene.add(fill)

    // ---- earth ----
    const earthGroup = new THREE.Group()
    scene.add(earthGroup)

    const segs = mobile ? 96 : 160
    const earthMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      shininess: 20,
      specular: new THREE.Color(0x2b4a63),
    })
    const earth = new THREE.Mesh(new THREE.SphereGeometry(1, segs, segs), earthMat)
    earthGroup.add(earth)

    const load = new THREE.TextureLoader()
    const base = import.meta.env.BASE_URL
    let readyOnce = false
    let dayLoaded = false
    const markReady = () => {
      if (readyOnce) return
      readyOnce = true
      callbacks.current.onReady?.()
    }

    const finishDay = (tex: THREE.Texture) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = Math.min(renderer.capabilities.getMaxAnisotropy(), 16)
      earthMat.map = tex
      earthMat.needsUpdate = true
      dayLoaded = true
      markReady()
    }

    const dayTex = load.load(
      `${base}textures/earth_day_4096.jpg`,
      finishDay,
      undefined,
      () => load.load(`${base}textures/earth_day_2048.jpg`, finishDay),
    )
    const specTex = load.load(`${base}textures/earth_specular_2048.jpg`)
    specTex.anisotropy = 8
    const normalTex = load.load(`${base}textures/earth_normal_2048.jpg`)
    normalTex.anisotropy = 8
    const cloudTex = load.load(`${base}textures/earth_clouds_2048.jpg`)
    cloudTex.anisotropy = 8

    earthMat.specularMap = specTex
    earthMat.normalMap = normalTex
    earthMat.normalScale = new THREE.Vector2(0.7, 0.7)
    earthMat.needsUpdate = true

    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(1.0045, segs, segs),
      new THREE.MeshPhongMaterial({
        color: 0xffffff,
        alphaMap: cloudTex,
        transparent: true,
        opacity: 0.44,
        depthWrite: false,
      }),
    )
    earthGroup.add(clouds)

    // Thin sunward-only limb light: no coloured ring around the planet.
    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.022, 96, 96),
      new THREE.ShaderMaterial({
        uniforms: {
          glowColor: { value: new THREE.Color(0xb9cdf0) },
          sunDirection: { value: sunDir.clone() },
          intensity: { value: 0.48 },
        },
        vertexShader: /* glsl */ `
          varying vec3 vNormalW;
          varying vec3 vWorldPos;
          void main() {
            vNormalW = normalize(mat3(modelMatrix) * normal);
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorldPos = wp.xyz;
            gl_Position = projectionMatrix * viewMatrix * wp;
          }
        `,
        fragmentShader: /* glsl */ `
          uniform vec3 glowColor;
          uniform vec3 sunDirection;
          uniform float intensity;
          varying vec3 vNormalW;
          varying vec3 vWorldPos;
          void main() {
            vec3 n = normalize(vNormalW);
            vec3 v = normalize(cameraPosition - vWorldPos);
            float rim = pow(clamp(1.0 - abs(dot(n, v)), 0.0, 1.0), 5.0);
            float lit = smoothstep(-0.1, 0.62, dot(n, normalize(sunDirection)));
            gl_FragColor = vec4(glowColor, rim * lit * intensity);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      }),
    )
    earthGroup.add(atmosphere)

    // ---- Saudi border: one geometry, two passes (core + soft glow) ----
    let borderCore: THREE.LineSegments | null = null
    let borderGlow: THREE.LineSegments | null = null
    let borderGeo: THREE.BufferGeometry | null = null
    let borderOpacity = 0.14
    let borderLoaded = false

    fetch(`${base}data/saudi.geojson`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('geojson'))))
      .then((fc: { features?: Array<{ geometry: GeoJSONGeometry }> }) => {
        const geoms = (fc.features || []).map((f) => f.geometry).filter(Boolean)
        borderGeo = buildBorderGeometry(geoms)
        if (!borderGeo) return
        borderCore = new THREE.LineSegments(
          borderGeo,
          new THREE.LineBasicMaterial({
            color: 0xf8e3b4,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        )
        borderGlow = new THREE.LineSegments(
          borderGeo,
          new THREE.LineBasicMaterial({
            color: 0xd5a35f,
            transparent: true,
            opacity: 0,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        )
        borderGlow.scale.setScalar(1.004)
        earthGroup.add(borderGlow, borderCore)
        borderLoaded = true
      })
      .catch(() => {})

    // ---- sparse, natural starfield ----
    const sprite = starSprite()
    const dim = buildStarLayer(540, 40, 0.013, 0.28, 0xc7d3ee, sprite)
    const mid = buildStarLayer(150, 34, 0.022, 0.52, 0xe8eeff, sprite)
    const bright = buildStarLayer(24, 28, 0.042, 0.9, 0xffffff, sprite)
    scene.add(dim, mid, bright)

    // ---- framing ----
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2)
    let baseDist = 4
    let baseTargetY = 0.6
    let baseTargetX = 0
    const computeFraming = () => {
      const w = root.clientWidth || 1
      const h = root.clientHeight || 1
      const aspect = w / h
      const shortLandscape = h < 560 && w > h
      const phone = w < 760 || aspect < 0.85

      let wanted: number
      let centerY: number
      let centerX: number
      if (shortLandscape) {
        wanted = Math.min(h * 0.82, w * 0.5)
        centerY = 0.56
        centerX = 0.72
      } else if (phone) {
        wanted = Math.min(h * 0.48, w * 1.02)
        centerY = 0.82
        centerX = 0.5
      } else {
        wanted = Math.min(h * 0.56, w * 0.9)
        centerY = 0.76
        centerX = 0.5
      }
      const frac = clamp(wanted / h, 0.2, 1.15)
      const theta = Math.atan(frac * Math.tan(halfFov))
      baseDist = clamp(1 / Math.sin(theta), 2.4, 9.5)
      const halfWorld = baseDist * Math.tan(halfFov)
      baseTargetY = (centerY - 0.5) * 2 * halfWorld
      baseTargetX = -(centerX - 0.5) * 2 * halfWorld * aspect
    }

    computeFraming()
    let baseQuat = facingQuaternion(SAUDI.lat, SAUDI.lon, baseDir)
    earthGroup.quaternion.copy(baseQuat)

    const target = new THREE.Vector3(baseTargetX, baseTargetY, 0)
    camera.position.copy(target).add(baseDir.clone().multiplyScalar(baseDist))
    camera.lookAt(target)

    // ---- gentle pointer parallax ----
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    const onPointer = (e: PointerEvent) => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5) * 2
      pointer.ty = (e.clientY / window.innerHeight - 0.5) * 2
    }
    if (!reduced) window.addEventListener('pointermove', onPointer, { passive: true })

    // ---- flight state ----
    let mode: 'idle' | 'flying' = 'idle'
    let startedAt = 0
    let flightMs = 2400
    let fromDist = baseDist
    let fromTargetY = baseTargetY
    let fromTargetX = baseTargetX
    const endDir = new THREE.Vector3(-0.05, 0.1, 1).normalize()
    let q0 = earthGroup.quaternion.clone()
    let q1 = earthGroup.quaternion.clone()
    let approachSent = false
    let landingSent = false
    let arrivedSent = false
    let raf = 0

    const fly = () => {
      if (mode === 'flying') return
      mode = 'flying'
      startedAt = performance.now()
      flightMs = reduced ? 420 : 2400
      fromDist = camera.position.distanceTo(target)
      fromTargetY = target.y
      fromTargetX = target.x
      q0 = earthGroup.quaternion.clone()
      q1 = facingQuaternion(SAUDI.lat, SAUDI.lon, endDir)
    }

    const resize = () => {
      const w = root.clientWidth
      const h = root.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      if (mode === 'idle') {
        computeFraming()
        target.set(baseTargetX, baseTargetY, 0)
        camera.position.copy(target).add(baseDir.clone().multiplyScalar(baseDist))
        camera.lookAt(target)
      }
    }

    const ro = new ResizeObserver(resize)
    ro.observe(root)
    resize()

    const clock = new THREE.Clock()
    let elapsed = 0
    const swayAxis = new THREE.Vector3(0, 1, 0)
    const sway = new THREE.Quaternion()

    const render = () => {
      raf = requestAnimationFrame(render)
      if (document.hidden) return
      const dt = Math.min(clock.getDelta(), 0.05)
      elapsed += dt

      if (mode === 'idle') {
        if (!reduced) {
          sway.setFromAxisAngle(swayAxis, Math.sin(elapsed * 0.16) * 0.016)
          earthGroup.quaternion.copy(baseQuat).multiply(sway)
          clouds.rotation.y += dt * 0.0025
          ;(bright.material as THREE.PointsMaterial).opacity = 0.74 + Math.sin(elapsed * 1.4) * 0.12
        }
        pointer.x += (pointer.tx - pointer.x) * 0.04
        pointer.y += (pointer.ty - pointer.y) * 0.04
        const view = baseDir.clone().multiplyScalar(baseDist)
        const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), baseDir).normalize()
        view.add(right.multiplyScalar(pointer.x * 0.16))
        view.add(new THREE.Vector3(0, 1, 0).multiplyScalar(-pointer.y * 0.1))
        camera.position.copy(target).add(view)
        camera.lookAt(target)
        borderOpacity += (0.14 - borderOpacity) * 0.05
      } else {
        const t = clamp((performance.now() - startedAt) / flightMs, 0, 1)
        const e = reduced ? 1 : easeInOutSine(t)

        const dir = baseDir.clone().lerp(endDir, e).normalize()
        const dist = fromDist + (1.9 - fromDist) * e
        // Narrow the lens as we descend: magnifies the Kingdom and flattens
        // the curvature so the frame can dissolve into the flat map.
        camera.fov = 32 - 12 * e
        camera.updateProjectionMatrix()
        target.set(fromTargetX * (1 - e), fromTargetY * (1 - e), 0)
        camera.position.copy(target).add(dir.multiplyScalar(dist))
        camera.lookAt(target)

        earthGroup.quaternion.slerpQuaternions(q0, q1, e)
        const wantedBorder = 0.18 + 0.82 * clamp((t - 0.18) / 0.62, 0, 1)
        borderOpacity += (wantedBorder - borderOpacity) * 0.18

        if (!approachSent && t >= 0.6) {
          approachSent = true
          callbacks.current.onApproach?.()
        }
        if (!landingSent && t >= 0.94) {
          landingSent = true
          callbacks.current.onLanding?.()
        }
        if (t >= 1 && !arrivedSent) {
          arrivedSent = true
          callbacks.current.onArrived?.()
        }
      }

      if (borderLoaded && borderCore && borderGlow) {
        ;(borderCore.material as THREE.LineBasicMaterial).opacity = borderOpacity
        ;(borderGlow.material as THREE.LineBasicMaterial).opacity = borderOpacity * 0.3
      }

      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(render)

    const readyPoll = window.setInterval(() => {
      if (dayLoaded) {
        window.clearInterval(readyPoll)
        markReady()
      }
    }, 90)
    const failsafe = window.setTimeout(markReady, 6000)

    apiRef.current = { fly }

    return () => {
      cancelAnimationFrame(raf)
      window.clearInterval(readyPoll)
      window.clearTimeout(failsafe)
      window.removeEventListener('pointermove', onPointer)
      ro.disconnect()
      apiRef.current = null
      sprite.dispose()
      borderGeo?.dispose()
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.LineSegments) {
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
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (phase === 'flying') apiRef.current?.fly()
  }, [phase])

  return (
    <div ref={rootRef} className={`orbit-globe ${phase === 'flying' ? 'is-flying' : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className="orbit-globe-canvas" />
      <div className="orbit-globe-veil" />
    </div>
  )
}
