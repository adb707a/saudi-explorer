import * as maplibregl from 'maplibre-gl'
import { setWorkerUrl, type Map as MlMap, type StyleSpecification } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import type { DriveRoute, Place } from '../lib/types'

setWorkerUrl(workerUrl)

export type MapVariant = 'atlas' | 'pulse' | 'darb'

type Palette = {
  bg: string
  land: string
  landAlt: string
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
  saudiFill: string
  saudiLine: string
  hill: number
  terrain: boolean
  labels: boolean
}

const PALETTES: Record<MapVariant, { light: Palette; dark: Palette }> = {
  atlas: {
    light: {
      bg: '#F3E9D6', land: '#F3E9D6', landAlt: '#ECDFC6', water: '#135957', waterLine: '#0E4745',
      green: '#D8DFC6', greenLine: '#B2C2A3', sand: '#E7D3AE', built: '#EADCC3', road: '#FBF6EC',
      roadCasing: '#D7BC8D', major: '#B4512E', border: '#B4512E', saudiFill: '#E7D3AE',
      saudiLine: '#B4512E', hill: 0.12, terrain: false, labels: false,
    },
    dark: {
      bg: '#1B1916', land: '#24211C', landAlt: '#2B2721', water: '#0B3534', waterLine: '#135957',
      green: '#283025', greenLine: '#374334', sand: '#332B20', built: '#2C2822', road: '#4A4337',
      roadCasing: '#1B1916', major: '#C9724D', border: '#D7BC8D', saudiFill: '#2E2920',
      saudiLine: '#E7D3AE', hill: 0.2, terrain: false, labels: false,
    },
  },
  pulse: {
    light: {
      bg: '#EDE3CF', land: '#EDE3CF', landAlt: '#E4D7BE', water: '#3F7E7A', waterLine: '#135957',
      green: '#D2DAC0', greenLine: '#AEBE9C', sand: '#DCC59D', built: '#E7D8BE', road: '#FBF5E8',
      roadCasing: '#CDB68C', major: '#B4512E', border: '#B4512E', saudiFill: '#E7D3AE',
      saudiLine: '#B4512E', hill: 0.2, terrain: true, labels: false,
    },
    dark: {
      bg: '#0B1B1A', land: '#102625', landAlt: '#14302E', water: '#041312', waterLine: '#2F7471',
      green: '#19322D', greenLine: '#2D524B', sand: '#25281E', built: '#162B29', road: '#274743',
      roadCasing: '#0A1716', major: '#D07853', border: '#357773', saudiFill: '#11302D',
      saudiLine: '#5D9995', hill: 0.42, terrain: true, labels: false,
    },
  },
  darb: {
    light: {
      bg: '#F7EDDC', land: '#F7EDDC', landAlt: '#EFE1C8', water: '#4C8D89', waterLine: '#135957',
      green: '#D9DFC2', greenLine: '#B6C49A', sand: '#E7D3AE', built: '#EADCC3', road: '#FFFDF8',
      roadCasing: '#D7BC8D', major: '#B4512E', border: '#135957', saudiFill: '#EFE1C8',
      saudiLine: '#135957', hill: 0, terrain: false, labels: false,
    },
    dark: {
      bg: '#1B1916', land: '#24211C', landAlt: '#2A261F', water: '#0C3E3D', waterLine: '#135957',
      green: '#293024', greenLine: '#3A4533', sand: '#33291D', built: '#2B2620', road: '#443D32',
      roadCasing: '#1A1815', major: '#D07853', border: '#E7D3AE', saudiFill: '#2A251D',
      saudiLine: '#E7D3AE', hill: 0, terrain: false, labels: false,
    },
  },
}

let rawStylePromise: Promise<StyleSpecification> | null = null
function loadLiberty(): Promise<StyleSpecification> {
  if (!rawStylePromise) {
    rawStylePromise = fetch('https://tiles.openfreemap.org/styles/liberty')
      .then((r) => {
        if (!r.ok) throw new Error('style')
        return r.json()
      })
      .catch(() => {
        rawStylePromise = null
        throw new Error('تعذر تحميل نمط الخريطة')
      })
  }
  return rawStylePromise
}

const clone = <T,>(v: T): T => JSON.parse(JSON.stringify(v))

function hide(layer: Record<string, unknown>) {
  return { ...layer, layout: { ...(layer.layout as object), visibility: 'none' } }
}

function paint(layer: Record<string, unknown>, patch: Record<string, unknown>) {
  return { ...layer, paint: { ...(layer.paint as object), ...patch } }
}

function transform(style: StyleSpecification, variant: MapVariant, dark: boolean): StyleSpecification {
  const p = PALETTES[variant][dark ? 'dark' : 'light']
  const s = clone(style)
  const baseLayers = (s.layers as Record<string, any>[]).filter((l) => l.id !== 'natural_earth')

  s.sources = {
    ...s.sources,
    openmaptiles: {
      type: 'vector',
      url: 'https://tiles.openfreemap.org/planet',
      attribution:
        '© OpenFreeMap · © OpenMapTiles · Data © OpenStreetMap contributors',
    },
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

  s.layers = baseLayers.map((raw) => {
    const l = raw as Record<string, any>
    const id: string = l.id
    if (l.type === 'symbol') return p.labels ? l : hide(l)
    if (id === 'background') return paint(l, { 'background-color': p.bg })
    if (id === 'water') return paint(l, { 'fill-color': p.water, 'fill-opacity': dark ? 0.95 : 0.9 })
    if (id.startsWith('waterway')) return paint(l, { 'line-color': p.waterLine })
    if (id === 'park' || id.startsWith('landcover_wood') || id === 'landcover_grass') return paint(l, { 'fill-color': p.green, 'fill-opacity': 0.9 })
    if (id === 'park_outline') return paint(l, { 'line-color': p.greenLine, 'line-opacity': 0.7 })
    if (id === 'landcover_sand') return paint(l, { 'fill-color': p.sand, 'fill-opacity': 0.65 })
    if (id === 'landuse_residential' || id === 'landuse_pitch' || id === 'landuse_track' || id === 'landuse_cemetery' || id === 'landuse_hospital' || id === 'landuse_school') return paint(l, { 'fill-color': p.built, 'fill-opacity': 0.75 })
    if (id === 'building' || id === 'building-3d') return hide(l)
    if (id === 'aeroway_fill') return paint(l, { 'fill-color': p.built })
    if (id.startsWith('aeroway_')) return paint(l, { 'line-color': p.roadCasing })
    if (id.startsWith('boundary')) return paint(l, { 'line-color': p.border, 'line-opacity': id === 'boundary_2' ? 0.55 : 0.4, 'line-width': id === 'boundary_2' ? 1.1 : 0.7 })
    if (id === 'road_area_pattern') return hide(l)
    if (id.startsWith('road_') || id.startsWith('bridge_') || id.startsWith('tunnel_')) {
      if (id.includes('rail')) return paint(l, { 'line-color': p.roadCasing, 'line-opacity': 0.6 })
      if (id.includes('path')) return paint(l, { 'line-color': p.road, 'line-opacity': 0.5 })
      if (id.includes('casing')) return paint(l, { 'line-color': p.roadCasing, 'line-opacity': 0.9 })
      const isMajor = id.includes('motorway') || id.includes('trunk') || id.includes('primary')
      return paint(l, {
        'line-color': isMajor ? p.major : p.road,
        'line-opacity': isMajor ? (dark ? 0.65 : 0.8) : (dark ? 0.55 : 1),
      })
    }
    return l
  }) as StyleSpecification['layers']

  const hillshade: Record<string, unknown> = {
    id: 'terrain-hillshade',
    type: 'hillshade',
    source: 'terrain',
    paint: {
      'hillshade-exaggeration': p.hill,
      'hillshade-shadow-color': dark ? '#000000' : '#6D573B',
      'hillshade-highlight-color': dark ? '#2F7471' : '#FFFDF8',
      'hillshade-accent-color': dark ? '#135957' : '#B4512E',
    },
  }
  if (variant === 'atlas') {
    hillshade.paint = { ...(hillshade.paint as object), 'hillshade-exaggeration': 0.09, 'hillshade-shadow-color': dark ? '#000000' : '#8B7455' }
  }
  if (variant === 'darb') {
    s.layers.unshift({
      id: 'terrain-hillshade',
      type: 'hillshade',
      source: 'terrain',
      paint: { 'hillshade-exaggeration': 0, 'hillshade-shadow-color': '#000000' },
    } as never)
  } else {
    const bgIndex = s.layers.findIndex((l) => (l as { id: string }).id === 'background')
    s.layers.splice(bgIndex + 1, 0, hillshade as never)
  }

  const firstSymbol = s.layers.findIndex((l) => (l as { type: string }).type === 'symbol')
  const insertAt = firstSymbol > -1 ? firstSymbol : s.layers.length
  s.layers.splice(
    insertAt,
    0,
    {
      id: 'saudi-fill',
      type: 'fill',
      source: 'saudi',
      paint: {
        'fill-color': p.saudiFill,
        'fill-opacity': variant === 'pulse' ? (dark ? 0.38 : 0.26) : variant === 'atlas' ? 0.3 : 0.18,
      },
    } as never,
    {
      id: 'saudi-outline-glow',
      type: 'line',
      source: 'saudi',
      paint: {
        'line-color': p.saudiLine,
        'line-width': variant === 'pulse' ? 6 : 5,
        'line-opacity': variant === 'pulse' ? 0.18 : 0.08,
        'line-blur': 3,
      },
    } as never,
    {
      id: 'saudi-outline',
      type: 'line',
      source: 'saudi',
      paint: {
        'line-color': p.saudiLine,
        'line-width': variant === 'pulse' ? 1.4 : 1.3,
        'line-opacity': variant === 'pulse' ? 0.9 : 0.72,
      },
    } as never,
  )

  if (p.terrain) {
    s.terrain = { source: 'terrain', exaggeration: variant === 'pulse' ? 1.25 : 1 }
  }
  return s
}

export async function createMap(
  container: HTMLElement,
  variant: MapVariant,
  opts: {
    dark: boolean
    center: [number, number]
    zoom: number
    pitch?: number
    bearing?: number
    interactive?: boolean
    maxZoom?: number
    minZoom?: number
  },
): Promise<MlMap> {
  const style = transform(await loadLiberty(), variant, opts.dark)
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
    dragRotate: false,
    pitchWithRotate: false,
  })
  if (variant === 'pulse') {
    map.setMaxPitch(62)
    map.dragRotate.enable()
  }
  if (opts.interactive === false) {
    map.scrollZoom.disable()
    map.dragPan.disable()
  }
  return map
}

export function addPoiLayers(map: MlMap, list: Place[], variant: MapVariant, dark: boolean) {
  const data = {
    type: 'FeatureCollection' as const,
    features: list.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { id: p.id, name: p.name, cat: p.cat, kind: p.kind, city: p.city },
    })),
  }
  if (map.getSource('places')) {
    ;(map.getSource('places') as maplibregl.GeoJSONSource).setData(data)
    return
  }
  map.addSource('places', {
    type: 'geojson',
    data,
    cluster: true,
    clusterMaxZoom: 13,
    clusterRadius: 48,
    promoteId: 'id',
  })

  if (variant === 'atlas') {
    map.addLayer({
      id: 'poi-clusters', type: 'circle', source: 'places',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': dark ? '#E7D3AE' : '#B4512E',
        'circle-radius': ['step', ['get', 'point_count'], 15, 10, 20, 30, 26],
        'circle-stroke-width': 2,
        'circle-stroke-color': dark ? '#1B1916' : '#FFFDF8',
        'circle-opacity': 0.96,
      },
    })
    map.addLayer({
      id: 'poi-cluster-count', type: 'symbol', source: 'places',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': ['get', 'point_count_abbreviated'],
        'text-font': ['Noto Sans Regular'],
        'text-size': 11,
      },
      paint: { 'text-color': dark ? '#1B1916' : '#FFFDF8' },
    })
    map.addLayer({
      id: 'poi-points', type: 'circle', source: 'places',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['match', ['get', 'cat'], 'food', '#B4512E', 'cafe', '#B4512E', 'nature', '#135957', 'culture', '#135957', 'shop', '#B4512E', 'photo', '#7B5A23', '#B4512E'],
        'circle-radius': 5,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFDF8',
      },
    })
  } else if (variant === 'pulse') {
    map.addLayer({
      id: 'poi-clusters', type: 'circle', source: 'places',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': dark ? '#0B1B1A' : '#FFFDF8',
        'circle-radius': ['step', ['get', 'point_count'], 17, 10, 22, 30, 28],
        'circle-stroke-width': 1.5,
        'circle-stroke-color': dark ? '#5D9995' : '#135957',
      },
    })
    map.addLayer({
      id: 'poi-cluster-glow', type: 'circle', source: 'places',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': dark ? '#5D9995' : '#135957',
        'circle-radius': ['step', ['get', 'point_count'], 24, 10, 30, 30, 36],
        'circle-opacity': 0.14,
        'circle-blur': 0.6,
      },
    })
    map.addLayer({
      id: 'poi-cluster-count', type: 'symbol', source: 'places',
      filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
      paint: { 'text-color': dark ? '#E7D3AE' : '#135957' },
    })
    map.addLayer({
      id: 'poi-points', type: 'circle', source: 'places',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['match', ['get', 'cat'], 'culture', '#5D9995', 'nature', '#5D9995', 'food', '#D07853', 'cafe', '#D07853', 'shop', '#D07853', '#5D9995'],
        'circle-radius': 4.5,
        'circle-stroke-width': 1,
        'circle-stroke-color': dark ? '#E7D3AE' : '#135957',
      },
    })
  } else {
    map.addLayer({
      id: 'poi-clusters', type: 'circle', source: 'places',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': '#FFFDF8',
        'circle-radius': ['step', ['get', 'point_count'], 16, 10, 21, 30, 27],
        'circle-stroke-width': 2.5,
        'circle-stroke-color': '#B4512E',
      },
    })
    map.addLayer({
      id: 'poi-cluster-count', type: 'symbol', source: 'places',
      filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Regular'], 'text-size': 11 },
      paint: { 'text-color': '#B4512E' },
    })
    map.addLayer({
      id: 'poi-points', type: 'circle', source: 'places',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': ['match', ['get', 'cat'], 'nature', '#135957', 'culture', '#135957', 'photo', '#135957', '#B4512E'],
        'circle-radius': 5.5,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#FFFDF8',
      },
    })
  }
}

export function addSelectedMarker(map: MlMap, place: Place | null, variant: MapVariant, dark: boolean) {
  if (map.getLayer('selected-point')) map.removeLayer('selected-point')
  if (map.getLayer('selected-halo')) map.removeLayer('selected-halo')
  if (!place) return
  map.addSource('selected-place', {
    type: 'geojson',
    data: { type: 'Feature', geometry: { type: 'Point', coordinates: [place.lng, place.lat] }, properties: {} },
  })
  map.addLayer({
    id: 'selected-halo', type: 'circle', source: 'selected-place',
    paint: {
      'circle-radius': 18, 'circle-color': variant === 'pulse' ? '#5D9995' : '#B4512E',
      'circle-opacity': 0.18, 'circle-blur': 0.5,
    },
  })
  map.addLayer({
    id: 'selected-point', type: 'circle', source: 'selected-place',
    paint: {
      'circle-radius': 7, 'circle-color': variant === 'pulse' ? '#E7D3AE' : dark ? '#E7D3AE' : '#B4512E',
      'circle-stroke-width': 2, 'circle-stroke-color': dark ? '#0B1B1A' : '#FFFDF8',
    },
  })
}

export function addRouteLayer(map: MlMap, route: DriveRoute | null, variant: MapVariant) {
  for (const id of ['route-glow', 'route-line', 'route-dash']) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
  if (map.getSource('route')) map.removeSource('route')
  if (!route) return
  map.addSource('route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: { type: 'LineString', coordinates: route.coordinates },
      properties: {},
    },
  })
  const color = variant === 'pulse' ? '#5D9995' : variant === 'darb' ? '#B4512E' : '#B4512E'
  map.addLayer({
    id: 'route-glow', type: 'line', source: 'route',
    paint: { 'line-color': color, 'line-width': 12, 'line-opacity': 0.16, 'line-blur': 6 },
  })
  map.addLayer({
    id: 'route-line', type: 'line', source: 'route',
    paint: { 'line-color': color, 'line-width': variant === 'pulse' ? 2 : 3, 'line-opacity': 0.95 },
  })
  if (route.source === 'estimate') {
    map.setPaintProperty('route-line', 'line-dasharray', [1.4, 1.4])
  }
}

export function fitSaudi(map: MlMap, animate = false) {
  map.fitBounds(
    [
      [34.4, 15.9],
      [56.1, 32.3],
    ],
    { padding: { top: 70, bottom: 145, left: 35, right: 35 }, duration: animate ? 1300 : 0, pitch: 0 },
  )
}

/** Hide crowded city labels at low zoom while keeping every marker dot visible. */
export function bindCityLabelZoom(map: MlMap, markers: maplibregl.Marker[]) {
  const apply = () => {
    const z = map.getZoom()
    for (const marker of markers) {
      const el = marker.getElement()
      const min = Number(el.dataset.labelMinZoom || 0)
      el.classList.toggle('is-label-hidden', z < min)
    }
  }
  map.on('zoom', apply)
  apply()
  return () => map.off('zoom', apply)
}

export { maplibregl }
