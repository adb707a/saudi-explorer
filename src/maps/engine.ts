import * as maplibregl from 'maplibre-gl'
import { setWorkerUrl, type Map as MlMap, type StyleSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { City, DriveRoute, Place } from '../lib/types'
import { catColor } from '../ui/palette'

setWorkerUrl(workerUrl)

export type ExplorerTheme = 'light' | 'dark'

let stylePromise: Promise<StyleSpecification> | null = null
function loadLiberty(): Promise<StyleSpecification> {
  if (!stylePromise) {
    stylePromise = fetch('https://tiles.openfreemap.org/styles/liberty')
      .then((r) => {
        if (!r.ok) throw new Error('style')
        return r.json() as Promise<StyleSpecification>
      })
      .catch(() => {
        stylePromise = null
        throw new Error('تعذر تحميل نمط الخريطة')
      })
  }
  return stylePromise
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

type Layer = Record<string, any>

function paint(layer: Layer, patch: Record<string, unknown>): Layer {
  return { ...layer, paint: { ...(layer.paint as object), ...patch } }
}

interface GeoPalette {
  bg: string
  water: string
  waterLine: string
  green: string
  greenLine: string
  sand: string
  built: string
  road: string
  roadCasing: string
  major: string
  border: string
  label: string
  labelHalo: string
  saudiFill: string
  saudiLine: string
}

function paletteFor(dark: boolean, accent: string): GeoPalette {
  if (dark) {
    return {
      bg: '#0a1420',
      water: '#0d2134',
      waterLine: '#173950',
      green: '#14251d',
      greenLine: '#1f3627',
      sand: '#28220f',
      built: '#16222f',
      road: '#2c3d51',
      roadCasing: '#0a1420',
      major: '#47688c',
      border: '#35465c',
      label: '#b9c8d8',
      labelHalo: '#0a1420',
      saudiFill: `${accent}1f`,
      saudiLine: accent,
    }
  }
  return {
    bg: '#e9eef3',
    water: '#a7c6e0',
    waterLine: '#7ba6c4',
    green: '#cfe3ce',
    greenLine: '#a8c2a6',
    sand: '#eadfc2',
    built: '#e1e6ea',
    road: '#ffffff',
    roadCasing: '#c8d1d9',
    major: '#f0c23f',
    border: '#bfb6cf',
    label: '#33404d',
    labelHalo: '#ffffff',
    saudiFill: `${accent}22`,
    saudiLine: accent,
  }
}

export function transformStyle(style: StyleSpecification, dark: boolean, accent: string): StyleSpecification {
  const p = paletteFor(dark, accent)
  const s = clone(style)
  const layers = s.layers as Layer[]

  const mapped = layers
    .filter((l) => l.id !== 'natural_earth')
    .map((raw): Layer => {
      const l = raw
      const id: string = l.id
      if (l.type === 'symbol') {
        // Hide neighbouring country name labels — Saudi's title comes from our own UI.
        if (id.toLowerCase().includes('country')) {
          return { ...l, layout: { ...(l.layout as object), visibility: 'none' } }
        }
        return dark
          ? paint(l, { 'text-color': p.label, 'text-halo-color': p.labelHalo, 'text-halo-width': 1.2 })
          : l
      }
      if (id === 'background') return paint(l, { 'background-color': p.bg })
      if (id === 'water') return paint(l, { 'fill-color': p.water })
      if (id.startsWith('waterway')) return paint(l, { 'line-color': p.waterLine })
      if (id === 'park' || id.startsWith('landcover_wood') || id === 'landcover_grass' || id === 'landuse_forest')
        return paint(l, { 'fill-color': p.green })
      if (id === 'park_outline') return paint(l, { 'line-color': p.greenLine })
      if (id === 'landcover_sand') return paint(l, { 'fill-color': p.sand })
      if (id === 'landuse_residential' || id === 'landuse_pitch' || id === 'landuse_track' || id === 'landuse_cemetery' || id === 'landuse_hospital' || id === 'landuse_school')
        return paint(l, { 'fill-color': p.built })
      if (id === 'building' || id === 'building-3d') return l
      if (id === 'aeroway_fill') return paint(l, { 'fill-color': p.built })
      if (id.startsWith('aeroway_')) return paint(l, { 'line-color': p.roadCasing })
      if (id.startsWith('boundary'))
        return paint(l, { 'line-color': p.border, 'line-opacity': id === 'boundary_2' ? 0.6 : 0.45 })
      if (id === 'road_area_pattern') return l
      if (id.startsWith('road_') || id.startsWith('bridge_') || id.startsWith('tunnel_')) {
        if (id.includes('rail')) return paint(l, { 'line-color': p.roadCasing, 'line-opacity': 0.6 })
        if (id.includes('path')) return paint(l, { 'line-color': p.road, 'line-opacity': 0.5 })
        if (id.includes('casing')) return paint(l, { 'line-color': p.roadCasing, 'line-opacity': 0.9 })
        const isMajor = id.includes('motorway') || id.includes('trunk') || id.includes('primary')
        return paint(l, { 'line-color': isMajor ? p.major : p.road })
      }
      return l
    })

  s.sources = {
    ...s.sources,
    terrain: {
      type: 'raster-dem',
      tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
      tileSize: 256,
      encoding: 'terrarium',
      maxzoom: 14,
      attribution: 'Terrain: Mapzen / AWS Open Data',
    },
    saudi: {
      type: 'geojson',
      data: import.meta.env.BASE_URL + 'data/saudi.geojson',
      attribution: 'حدود السعودية: geoBoundaries (ODbL)',
    },
  } as unknown as StyleSpecification['sources']

  // Subtle shaded relief (only visible when 3D terrain is enabled).
  mapped.splice(
    mapped.findIndex((l) => l.id === 'background') + 1,
    0,
    {
      id: 'hillshade',
      type: 'hillshade',
      source: 'terrain',
      paint: {
        'hillshade-exaggeration': 0.32,
        'hillshade-shadow-color': dark ? '#05070d' : '#8a94a3',
        'hillshade-highlight-color': dark ? '#1b2c44' : '#ffffff',
        'hillshade-accent-color': dark ? '#0a1420' : '#d7dfe8',
        'hillshade-illumination-anchor': 'map',
        'hillshade-illumination-direction': 315,
      },
    } as never,
  )

  const firstSymbol = mapped.findIndex((l) => l.type === 'symbol')
  const insertAt = firstSymbol > -1 ? firstSymbol : mapped.length
  mapped.splice(
    insertAt,
    0,
    {
      id: 'saudi-fill',
      type: 'fill',
      source: 'saudi',
      paint: { 'fill-color': p.saudiFill, 'fill-opacity': 0.5 },
    } as never,
    {
      id: 'saudi-line',
      type: 'line',
      source: 'saudi',
      paint: { 'line-color': p.saudiLine, 'line-width': 1.3, 'line-opacity': dark ? 0.85 : 0.7 },
    } as never,
  )

  s.layers = mapped as StyleSpecification['layers']
  return s
}

export interface CreateMapOptions {
  dark: boolean
  accent: string
  center: [number, number]
  zoom: number
  pitch?: number
  bearing?: number
  minZoom?: number
  maxZoom?: number
  interactive?: boolean
  terrain?: boolean
  terrainExaggeration?: number
  projection?: 'globe' | 'mercator'
}

export async function createMap(container: HTMLElement, opts: CreateMapOptions): Promise<MlMap> {
  const style = transformStyle(await loadLiberty(), opts.dark, opts.accent)
  const map = new maplibregl.Map({
    container,
    style,
    center: opts.center,
    zoom: opts.zoom,
    pitch: opts.pitch ?? 0,
    bearing: opts.bearing ?? 0,
    maxZoom: opts.maxZoom ?? 17,
    minZoom: opts.minZoom ?? 4.2,
    attributionControl: { compact: true },
  })
  if (opts.terrain || opts.projection === 'globe') map.setMaxPitch(85)
  if (opts.projection === 'globe') map.setProjection({ type: 'globe' } as any)
  if (opts.interactive === false) {
    map.scrollZoom.disable()
    map.dragPan.disable()
    map.doubleClickZoom.disable()
    map.touchZoomRotate.disable()
  }
  if (opts.terrain) {
    map.on('load', () => {
      map.setTerrain({ source: 'terrain', exaggeration: opts.terrainExaggeration ?? 1.15 })
    })
  }
  return map
}

export function setTerrainMode(map: MlMap, on: boolean, exaggeration = 1.15) {
  if (on) {
    if (!map.getTerrain()) map.setTerrain({ source: 'terrain', exaggeration })
  } else {
    map.setTerrain(null)
  }
}

export async function applyMapTheme(map: MlMap, dark: boolean, accent: string): Promise<void> {
  const style = transformStyle(await loadLiberty(), dark, accent)
  map.setStyle(style)
}

/* ----------------------------- place layers ----------------------------- */

function placeFeature(p: Place) {
  return {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
    properties: { id: p.id, name: p.name, cat: p.cat, kind: p.kind, city: p.city },
  }
}

export function addPlaceLayers(map: MlMap, list: Place[], dark: boolean, accent: string) {
  const data = { type: 'FeatureCollection' as const, features: list.map(placeFeature) }
  if (map.getSource('places')) {
    ;(map.getSource('places') as maplibregl.GeoJSONSource).setData(data as any)
    return
  }
  map.addSource('places', {
    type: 'geojson',
    data: data as any,
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 48,
    promoteId: 'id',
  })

  const stroke = dark ? '#0a1420' : '#ffffff'
  map.addLayer({
    id: 'poi-clusters', type: 'circle', source: 'places',
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': accent,
      'circle-radius': ['step', ['get', 'point_count'], 16, 10, 22, 30, 28],
      'circle-stroke-width': 2,
      'circle-stroke-color': stroke,
      'circle-opacity': 0.95,
    },
  })
  map.addLayer({
    id: 'poi-cluster-count', type: 'symbol', source: 'places',
    filter: ['has', 'point_count'],
    layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
    paint: { 'text-color': dark ? '#0a1420' : '#ffffff' },
  })
  map.addLayer({
    id: 'poi-points', type: 'circle', source: 'places',
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-color': ['match', ['get', 'cat'], 'food', catColor('food'), 'cafe', catColor('cafe'), 'nature', catColor('nature'), 'culture', catColor('culture'), 'shop', catColor('shop'), 'photo', catColor('photo'), accent],
      'circle-radius': 5,
      'circle-stroke-width': 1.6,
      'circle-stroke-color': stroke,
    },
  })
}

export function addSelectedMarker(map: MlMap, place: Place | null, accent: string) {
  for (const id of ['selected-point', 'selected-halo']) if (map.getLayer(id)) map.removeLayer(id)
  if (map.getSource('selected-place')) map.removeSource('selected-place')
  if (!place) return
  map.addSource('selected-place', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'Point', coordinates: [place.lng, place.lat] }, properties: {} },
  })
  map.addLayer({
    id: 'selected-halo', type: 'circle', source: 'selected-place',
    paint: { 'circle-radius': 18, 'circle-color': accent, 'circle-opacity': 0.2, 'circle-blur': 0.5 },
  })
  map.addLayer({
    id: 'selected-point', type: 'circle', source: 'selected-place',
    paint: { 'circle-radius': 7, 'circle-color': accent, 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' },
  })
}

export function addRouteLayer(map: MlMap, route: DriveRoute | null, accent: string) {
  for (const id of ['route-glow', 'route-line']) if (map.getLayer(id)) map.removeLayer(id)
  if (map.getSource('route')) map.removeSource('route')
  if (!route) return
  map.addSource('route', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'LineString', coordinates: route.coordinates }, properties: {} },
  })
  map.addLayer({
    id: 'route-glow', type: 'line', source: 'route',
    paint: { 'line-color': accent, 'line-width': 12, 'line-opacity': 0.16, 'line-blur': 6 },
  })
  map.addLayer({
    id: 'route-line', type: 'line', source: 'route',
    paint: { 'line-color': accent, 'line-width': 3, 'line-opacity': 0.95 },
  })
  if (route.source === 'estimate') {
    map.setPaintProperty('route-line', 'line-dasharray', [1.4, 1.4])
  }
}

/* ----------------------------- camera helpers ----------------------------- */

export function fitSaudi(map: MlMap, animate = false) {
  map.fitBounds(
    [
      [34.4, 15.9],
      [56.1, 32.3],
    ],
    { padding: { top: 70, bottom: 120, left: 40, right: 40 }, duration: animate ? 1300 : 0, pitch: 0 },
  )
}

export function flyToCity(map: MlMap, city: City, opts?: { pitch?: number; duration?: number }) {
  map.flyTo({
    center: [city.lng, city.lat],
    zoom: 10.4,
    pitch: opts?.pitch ?? 0,
    duration: opts?.duration ?? 1500,
    essential: true,
  })
}

export function flyToPlace(map: MlMap, place: Place, opts?: { pitch?: number; duration?: number }) {
  map.flyTo({ center: [place.lng, place.lat], zoom: 14.4, pitch: opts?.pitch ?? 0, duration: opts?.duration ?? 900 })
}

/* ----------------------------- city markers ----------------------------- */

export function cityMarkerElement(city: City, opts: { dark: boolean; accent: string }): HTMLButtonElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'geo-city'
  if (opts.dark) el.classList.add('is-dark')
  el.style.setProperty('--accent', opts.accent)
  el.setAttribute('aria-label', city.ar)
  el.innerHTML = `<span class="geo-city-dot"></span><span class="geo-city-label">${city.ar}</span>`
  return el
}

export function addCityMarkers(
  map: MlMap,
  cities: City[],
  opts: { dark: boolean; accent: string; onPick: (city: City) => void },
): maplibregl.Marker[] {
  const markers: maplibregl.Marker[] = []
  for (const c of cities) {
    const el = cityMarkerElement(c, opts)
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      opts.onPick(c)
    })
    markers.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([c.lng, c.lat]).addTo(map))
  }
  return markers
}

export { maplibregl }
