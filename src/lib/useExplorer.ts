import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Map as MlMap } from 'maplibre-gl'
import {
  addCityMarkers,
  addPlaceLayers,
  addRouteLayer,
  addSelectedMarker,
  applyMapTheme,
  createMap,
  fitSaudi,
  flyToCity,
  flyToPlace,
  maplibregl,
} from '../maps/engine'
import { featuredCities, placesInCity } from './catalog'
import { buildPlan, defaultPlanInput, resequencePlan } from './planner'
import { useDriveRoute, useLocalTheme, useWeather } from './hooks'
import type { Category, City, Place, Plan, PlanInput } from './types'

export interface ExplorerOptions {
  id: 'orbit' | 'scope' | 'fieldguide'
  accent: string
  defaultDark?: boolean
  pitch?: number
  bearing?: number
  maxPitch?: number
  center?: [number, number]
  zoom?: number
  projection?: 'globe' | 'mercator'
  initialView?: 'saudi' | 'globe'
}

/**
 * Shared exploration state + map wiring for the three prototypes.
 * Owns the map lifecycle, city/place/filter/plan state, weather and route,
 * while leaving all presentation to each model.
 */
export function useExplorer(opts: ExplorerOptions) {
  const { theme, toggle } = useLocalTheme(opts.id, opts.defaultDark ? 'dark' : 'light')
  const dark = theme === 'dark'
  const accent = opts.accent

  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState('')

  const [city, setCity] = useState<City | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [stage, setStage] = useState<'intro' | 'leaving' | 'explore'>('intro')

  const cityRef = useRef(city)
  cityRef.current = city
  const placeRef = useRef(place)
  placeRef.current = place
  const filterRef = useRef(filter)
  filterRef.current = filter
  const planRef = useRef(plan)
  planRef.current = plan

  const poiList = useMemo(() => (city ? placesInCity(city.ar) : []), [city?.id])
  const filtered = filter === 'all' ? poiList : poiList.filter((p) => p.cat === filter)
  const placesRef = useRef(poiList)
  placesRef.current = poiList
  const filteredRef = useRef(filtered)
  filteredRef.current = filtered

  const { weather, status: weatherStatus } = useWeather(city?.id ?? null)
  const { route, status: routeStatus } = useDriveRoute(plan)
  const routeRef = useRef(route)
  routeRef.current = route

  const home = useCallback(
    (animate: boolean) => {
      const map = mapRef.current
      if (!map) return
      if (opts.initialView === 'globe') {
        map.easeTo({ center: [45, 22], zoom: 1.9, pitch: 0, bearing: 0, duration: animate ? 1400 : 0 })
      } else {
        fitSaudi(map, animate)
      }
    },
    [opts.initialView],
  )

  const syncLayers = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const c = cityRef.current
    const p = placeRef.current
    const r = routeRef.current
    addPlaceLayers(map, c ? filteredRef.current : [], dark, accent)
    addSelectedMarker(map, p, accent)
    addRouteLayer(map, planRef.current ? r : null, accent)
  }, [dark, accent])

  const clearPlanIfCity = useCallback((c: City) => {
    const current = planRef.current
    if (current && current.input.cityId !== c.id) setPlan(null)
  }, [])

  const pickCity = useCallback(
    (c: City) => {
      setCity(c)
      setPlace(null)
      setFilter('all')
      clearPlanIfCity(c)
      const map = mapRef.current
      if (map) flyToCity(map, c, { pitch: opts.pitch ?? 0 })
    },
    [clearPlanIfCity, opts.pitch],
  )

  const pickPlace = useCallback(
    (p: Place) => {
      setPlace(p)
      const map = mapRef.current
      if (map) flyToPlace(map, p, { pitch: opts.pitch ?? 0 })
    },
    [opts.pitch],
  )

  const reset = useCallback(() => {
    home(true)
    setCity(null)
    setPlace(null)
    setPlan(null)
  }, [home])

  const finishEntry = useCallback(() => {
    setStage('explore')
    window.setTimeout(() => {
      const map = mapRef.current
      if (map) {
        map.resize()
        home(true)
      }
    }, 260)
  }, [home])

  const enter = useCallback(
    (globeFailed: boolean) => {
      if (stage !== 'intro') return
      if (globeFailed) {
        setStage('explore')
        window.setTimeout(() => {
          const map = mapRef.current
          if (map) {
            map.resize()
            fitSaudi(map)
          }
        }, 80)
        return
      }
      setStage('leaving')
    },
    [stage],
  )

  // ---- map lifecycle (created once) ----
  useEffect(() => {
    if (!mapEl.current) return
    let cancelled = false
    setMapReady(false)
    setLoadError('')
    const initialDark = theme === 'dark'
    createMap(mapEl.current, {
      dark: initialDark,
      accent,
      center: opts.center ?? [45.2, 24.2],
      zoom: opts.zoom ?? 5.0,
      pitch: opts.pitch ?? 0,
      bearing: opts.bearing ?? 0,
      minZoom: 1.1,
      maxZoom: opts.maxPitch !== undefined ? 16.8 : 16.5,
      projection: opts.projection ?? 'mercator',
    })
      .then((map) => {
        if (cancelled) {
          map.remove()
          return
        }
        mapRef.current = map
        if (opts.maxPitch) map.setMaxPitch(opts.maxPitch)
        map.on('load', () => {
          if (cancelled) return
          home(false)
          if (opts.pitch && window.innerWidth > 860) map.easeTo({ pitch: opts.pitch, bearing: opts.bearing ?? 0, duration: 1200 })
          setMapReady(true)
          markersRef.current = addCityMarkers(map, featuredCities, {
            dark: initialDark,
            accent,
            onPick: (c) => pickCity(c),
          })
          syncLayers()
        })
        map.on('click', (e) => {
          const cluster = map.queryRenderedFeatures(e.point, { layers: ['poi-clusters'] })
          if (cluster.length) {
            const f = cluster[0]
            const src = map.getSource('places') as maplibregl.GeoJSONSource
            src.getClusterExpansionZoom(Number(f.properties?.cluster_id)).then((z: number) => {
              map.easeTo({ center: (f.geometry as { coordinates: [number, number] }).coordinates, zoom: z + 0.3, duration: 700 })
            })
            return
          }
          const hit = map.queryRenderedFeatures(e.point, { layers: ['poi-points'] })
          if (hit.length) {
            const id = String(hit[0].properties?.id || '')
            const found = placesRef.current.find((x) => x.id === id)
            if (found) pickPlace(found)
          }
        })
        map.on('mousemove', (e) => {
          map.getCanvas().style.cursor = map.queryRenderedFeatures(e.point, { layers: ['poi-clusters', 'poi-points'] }).length
            ? 'pointer'
            : ''
        })
      })
      .catch((e: Error) => {
        if (!cancelled) setLoadError(e.message || 'تعذر تحميل الخريطة')
      })
    return () => {
      cancelled = true
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- theme change: re-style in place ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    let cancelled = false
    applyMapTheme(map, dark, accent).then(() => {
      if (cancelled) return
      map.once('styledata', () => {
        if (cancelled) return
        syncLayers()
        markersRef.current.forEach((m) => m.getElement().classList.toggle('is-dark', dark))
      })
    })
    return () => {
      cancelled = true
    }
  }, [dark, accent, syncLayers])

  // ---- reactive layer sync (city / filter / place / plan) ----
  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return
    addPlaceLayers(map, filtered, dark, accent)
  }, [filtered, mapReady, dark, accent])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return
    addSelectedMarker(map, place, accent)
  }, [place, mapReady, accent])

  useEffect(() => {
    if (!mapReady) return
    const map = mapRef.current
    if (!map) return
    addRouteLayer(map, plan ? route : null, accent)
  }, [route, plan, mapReady, accent])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !plan?.stops.length || !mapReady) return
    const bounds = new maplibregl.LngLatBounds()
    plan.stops.forEach((s) => bounds.extend([s.place.lng, s.place.lat]))
    map.fitBounds(bounds, { padding: { top: 90, bottom: 140, left: 90, right: 90 }, duration: 1100, maxZoom: 12.5 })
  }, [plan?.id, mapReady])

  // ---- plan helpers ----
  const build = useCallback((input: PlanInput) => {
    setPlan(buildPlan(input))
  }, [])

  const regenerate = useCallback((input: PlanInput) => {
    setPlan(buildPlan(input))
  }, [])

  const addPlaceToPlan = useCallback((p: Place) => {
    const base = planRef.current ?? buildPlan(defaultPlanInput(cityRef.current?.id ?? 'riyadh'))
    if (!base.stops.some((s) => s.place.id === p.id)) {
      setPlan(resequencePlan(base, [...base.stops.map((s) => s.place), p]))
    }
  }, [])

  const removeStop = useCallback((id: string) => {
    const current = planRef.current
    if (!current) return
    setPlan(resequencePlan(current, current.stops.filter((s) => s.place.id !== id).map((s) => s.place)))
  }, [])

  const moveStop = useCallback((index: number, dir: -1 | 1) => {
    const current = planRef.current
    if (!current) return
    const next = [...current.stops]
    const to = index + dir
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    setPlan(resequencePlan(current, next.map((s) => s.place)))
  }, [])

  const reorderStops = useCallback((places: Place[]) => {
    const current = planRef.current
    if (!current) return
    setPlan(resequencePlan(current, places))
  }, [])

  const openPlanner = useCallback(() => {
    if (!planRef.current) setPlan(buildPlan(defaultPlanInput(cityRef.current?.id ?? 'riyadh')))
    setPlanOpen(true)
  }, [])

  return {
    dark,
    theme,
    toggle,
    accent,
    mapEl,
    mapRef,
    mapReady,
    loadError,
    city,
    setCity,
    place,
    setPlace,
    filter,
    setFilter,
    filtered,
    poiList,
    plan,
    setPlan,
    planOpen,
    setPlanOpen,
    stage,
    setStage,
    weather,
    weatherStatus,
    route,
    routeStatus,
    pickCity,
    pickPlace,
    reset,
    enter,
    finishEntry,
    build,
    regenerate,
    addPlaceToPlan,
    removeStop,
    moveStop,
    reorderStops,
    openPlanner,
  }
}
