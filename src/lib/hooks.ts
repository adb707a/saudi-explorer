import { useEffect, useRef, useState } from 'react'
import { cityById } from './catalog'
import type { DriveRoute, Plan, WeatherNow } from './types'

const routeCache = new Map<string, DriveRoute>()
const weatherCache = new Map<string, WeatherNow>()

function estimateRoute(plan: Plan): DriveRoute | null {
  const city = cityById(plan.input.cityId)
  if (!city || !plan.stops.length) return null
  const points: [number, number][] = [
    [city.lng, city.lat],
    ...plan.stops.map((s) => [s.place.lng, s.place.lat] as [number, number]),
  ]
  return {
    coordinates: points,
    distanceKm: plan.summary.totalKm,
    durationMin: Math.round((plan.summary.totalKm / 38) * 60),
    legs: plan.stops.map((s) => ({ distanceKm: s.travelKm, durationMin: s.travelMin })),
    source: 'estimate',
  }
}

export function useDriveRoute(plan: Plan | null) {
  const [route, setRoute] = useState<DriveRoute | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'fallback'>('idle')
  const key = plan ? `${plan.id}-${plan.stops.map((s) => s.place.id).join(',')}` : ''

  useEffect(() => {
    if (!plan || !plan.stops.length) {
      setRoute(null)
      setStatus('idle')
      return
    }
    const cached = routeCache.get(key)
    if (cached) {
      setRoute(cached)
      setStatus(cached.source === 'OSRM' ? 'ready' : 'fallback')
      return
    }
    const city = cityById(plan.input.cityId)
    if (!city) return
    const fallback = estimateRoute(plan)
    setRoute(fallback)
    setStatus('loading')
    const coords = [
      [city.lng, city.lat],
      ...plan.stops.map((s) => [s.place.lng, s.place.lat]),
    ]
      .map((c) => c.join(','))
      .join(';')
    const ctrl = new AbortController()
    const timer = window.setTimeout(() => ctrl.abort(), 9000)
    fetch(
      `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`,
      { signal: ctrl.signal },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('route failed'))))
      .then((json) => {
        const r = json?.routes?.[0]
        if (!r?.geometry?.coordinates?.length) throw new Error('no route')
        const out: DriveRoute = {
          coordinates: r.geometry.coordinates as [number, number][],
          distanceKm: Math.round((r.distance / 1000) * 10) / 10,
          durationMin: Math.round(r.duration / 60),
          legs: (r.legs || []).map((l: { distance: number; duration: number }) => ({
            distanceKm: Math.round((l.distance / 1000) * 10) / 10,
            durationMin: Math.round(l.duration / 60),
          })),
          source: 'OSRM',
        }
        routeCache.set(key, out)
        setRoute(out)
        setStatus('ready')
      })
      .catch(() => {
        if (fallback) {
          routeCache.set(key, fallback)
          setRoute(fallback)
          setStatus('fallback')
        }
      })
      .finally(() => window.clearTimeout(timer))
    return () => {
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [key])

  return { route, status }
}

export function useWeather(cityId: string | null) {
  const [weather, setWeather] = useState<WeatherNow | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const city = cityId ? cityById(cityId) : null

  useEffect(() => {
    if (!city) {
      setWeather(null)
      setStatus('idle')
      return
    }
    const cached = weatherCache.get(city.id)
    if (cached) {
      setWeather(cached)
      setStatus('ready')
      return
    }
    const ctrl = new AbortController()
    setStatus('loading')
    fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Asia%2FRiyadh&forecast_days=3`,
      { signal: ctrl.signal },
    )
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('weather failed'))))
      .then((j) => {
        const w: WeatherNow = {
          temperature: Math.round(j.current.temperature_2m),
          apparent: Math.round(j.current.apparent_temperature),
          humidity: Math.round(j.current.relative_humidity_2m),
          wind: Math.round(j.current.wind_speed_10m),
          code: j.current.weather_code,
          time: j.current.time,
          daily: (j.daily.time || []).map((date: string, i: number) => ({
            date,
            max: Math.round(j.daily.temperature_2m_max[i]),
            min: Math.round(j.daily.temperature_2m_min[i]),
            code: j.daily.weather_code[i],
          })),
        }
        weatherCache.set(city.id, w)
        setWeather(w)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
    return () => ctrl.abort()
  }, [city?.id])

  return { weather, status }
}

export function useLocalTheme(key: string, fallback: 'light' | 'dark') {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      const saved = localStorage.getItem(`ard-theme-${key}`)
      return saved === 'light' || saved === 'dark' ? saved : fallback
    } catch {
      return fallback
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(`ard-theme-${key}`, theme)
    } catch {
      /* ignore */
    }
  }, [key, theme])
  return { theme, setTheme, toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }
}

export function useOutsideClick<T extends HTMLElement>(
  onOutside: () => void,
) {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onOutside])
  return ref
}
