import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Activity, ArrowDown, ArrowRight, ArrowUp, CalendarDays, ChevronLeft,
  CloudSun, Command, Compass, Crosshair, Droplets, Layers3, MapPin,
  Minus, Moon, Navigation, Plus, Radio, RotateCcw, Route, Search, ShieldCheck,
  SlidersHorizontal, Sparkles, Sun, Trash2, Wind, X, Zap,
} from 'lucide-react'
import type { Map as MlMap } from 'maplibre-gl'
import { addPoiLayers, addRouteLayer, addSelectedMarker, bindCityLabelZoom, createMap, fitSaudi, maplibregl } from '../../maps/base'
import {
  ALL_CATEGORIES, CATEGORY_META, cities, cityById, DATA_SNAPSHOT, directionsUrl,
  displayTime, featuredCities, formatDateAr, formatNum, placesInCity, weatherLabel,
} from '../../lib/catalog'
import { buildPlan, defaultPlanInput, GROUP_LABEL, resequencePlan } from '../../lib/planner'
import { useDriveRoute, useLocalTheme, useWeather } from '../../lib/hooks'
import type { Category, City, Plan, PlanInput, Place } from '../../lib/types'
import { CategoryIcon } from '../../components/CategoryIcon'
import { ArtTile } from '../../components/ArtTile'
import { EventsState } from '../../components/EventsState'
import { SourceLine } from '../../components/SourceLine'
import { GlobeIntro } from '../../components/GlobeIntro'
import './pulse.css'

type PanelTab = 'places' | 'events'
type ConsoleMode = 'overview' | 'city' | 'place'

export function PulseApp() {
  const { theme, toggle } = useLocalTheme('pulse', 'dark')
  const dark = theme === 'dark'
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const placesRef = useRef<Place[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [error, setError] = useState('')
  const [city, setCity] = useState<City | null>(null)
  const [place, setPlace] = useState<Place | null>(null)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [panelTab, setPanelTab] = useState<PanelTab>('places')
  const [planOpen, setPlanOpen] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [terrain, setTerrain] = useState(true)
  const [sheet, setSheet] = useState(false)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [stage, setStage] = useState<'intro' | 'leaving' | 'explore'>('intro')
  const [globeRevealed, setGlobeRevealed] = useState(false)
  const [globeSettled, setGlobeSettled] = useState(false)
  const [globeFailed, setGlobeFailed] = useState(false)
  const stageRef = useRef(stage)
  stageRef.current = stage
  const { weather, status: weatherStatus } = useWeather(city?.id ?? null)
  const { route, status: routeStatus } = useDriveRoute(plan)
  const poiList = useMemo(() => (city ? placesInCity(city.ar) : []), [city?.id])
  placesRef.current = poiList
  const filtered = filter === 'all' ? poiList : poiList.filter((p) => p.cat === filter)
  const mode: ConsoleMode = place ? 'place' : city ? 'city' : 'overview'

  const cityHits = useMemo(() => {
    const q = search.trim()
    if (!q) return cities.filter((c) => c.featured).slice(0, 6)
    return cities.filter((c) => c.ar.includes(q) || c.en.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  }, [search])

  const refs = useRef({ onCity: (_c: City) => {}, onPlace: (_p: Place) => {} })
  refs.current.onCity = (c) => {
    setCity(c); setPlace(null); setSheet(true); setPanelTab('places'); setFilter('all')
    if (plan && plan.input.cityId !== c.id) setPlan(null)
  }
  refs.current.onPlace = (p) => { setPlace(p); setSheet(true) }

  useEffect(() => {
    if (!mapEl.current) return
    let cancelled = false
    setMapReady(false); setError('')
    createMap(mapEl.current, 'pulse', {
      dark, center: [45.1, 24.2], zoom: 4.9,
      pitch: dark ? 42 : 36, bearing: -8,
      minZoom: 1.1, maxZoom: 16.8,
    }).then((map) => {
      if (cancelled) { map.remove(); return }
      mapRef.current = map
      map.on('load', () => {
        if (cancelled) return
        fitSaudi(map)
        if (window.innerWidth > 860) map.easeTo({ pitch: 42, bearing: -7, duration: 1300 })
        setMapReady(true)
        featuredCities.forEach((c) => {
          const el = document.createElement('button')
          el.type = 'button'
          el.className = 'p-city'
          if (!['riyadh', 'jeddah', 'dammam', 'madinah', 'tabuk', 'abha', 'hail', 'alula'].includes(c.id)) {
            el.dataset.labelMinZoom = '6.4'
          }
          el.setAttribute('aria-label', `فتح ${c.ar}`)
          el.innerHTML = `<span class="p-city-ring"></span><span class="p-city-core"></span><span class="p-city-txt"><b>${c.ar}</b><i>${c.en}</i></span>`
          el.addEventListener('click', (e) => {
            e.stopPropagation()
            map.flyTo({ center: [c.lng, c.lat], zoom: 10.2, pitch: 47, duration: 1500 })
            refs.current.onCity(c)
          })
          markersRef.current.push(new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([c.lng, c.lat]).addTo(map))
        })
        bindCityLabelZoom(map, markersRef.current)
      })
      map.on('click', (e) => {
        const cl = map.queryRenderedFeatures(e.point, { layers: ['poi-clusters'] })
        if (cl.length) {
          const f = cl[0]
          ;(map.getSource('places') as maplibregl.GeoJSONSource).getClusterExpansionZoom(Number(f.properties?.cluster_id)).then((z: number) => {
            map.easeTo({ center: (f.geometry as { coordinates: [number, number] }).coordinates, zoom: z + 0.3, duration: 700 })
          })
          return
        }
        const hits = map.queryRenderedFeatures(e.point, { layers: ['poi-points'] })
        if (hits.length) {
          const p = placesRef.current.find((x) => x.id === String(hits[0].properties?.id))
          if (p) refs.current.onPlace(p)
        }
      })
      map.on('mousemove', (e) => {
        map.getCanvas().style.cursor = map.queryRenderedFeatures(e.point, { layers: ['poi-clusters', 'poi-points'] }).length ? 'pointer' : ''
      })
    }).catch((e: Error) => { if (!cancelled) setError(e.message || 'MAP OFFLINE') })
    return () => {
      cancelled = true
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      mapRef.current?.remove()
      mapRef.current = null
    }
  }, [dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((m) => {
      const on = city && m.getElement().querySelector('.p-city-txt b')?.textContent === city.ar
      m.getElement().classList.toggle('is-on', !!on)
    })
  }, [city, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addPoiLayers(map, filtered, 'pulse', dark)
  }, [city?.id, filter, mapReady, dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addSelectedMarker(map, place, 'pulse', dark)
  }, [place, mapReady, dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addRouteLayer(map, plan ? route : null, 'pulse')
  }, [route, plan, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !plan?.stops.length || !mapReady) return
    const b = new maplibregl.LngLatBounds()
    plan.stops.forEach((s) => b.extend([s.place.lng, s.place.lat]))
    map.fitBounds(b, { padding: { top: 100, bottom: 160, left: 420, right: 420 }, duration: 1100, maxZoom: 12.4 })
  }, [plan?.id, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    if (terrain) {
      if (!map.getTerrain()) map.setTerrain({ source: 'terrain', exaggeration: 1.2 })
      map.easeTo({ pitch: Math.max(38, map.getPitch()), duration: 700 })
    } else {
      map.setTerrain(null)
      map.easeTo({ pitch: 0, bearing: 0, duration: 700 })
    }
  }, [terrain, mapReady])

  const selectCity = (c: City) => {
    mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 10.2, pitch: terrain ? 47 : 0, duration: 1400 })
    setCity(c); setPlace(null); setFilter('all'); setPanelTab('places'); setSheet(true); setShowSearch(false); setSearch('')
    if (plan && plan.input.cityId !== c.id) setPlan(null)
  }
  const reset = () => {
    if (mapRef.current) {
      fitSaudi(mapRef.current, true)
      if (terrain) mapRef.current.easeTo({ pitch: 42, bearing: -7, duration: 1000 })
    }
    setCity(null); setPlace(null); setPlan(null); setSheet(false)
  }
  const openPlan = () => {
    if (!plan) setPlan(buildPlan(defaultPlanInput(city?.id ?? 'riyadh')))
    setPlanOpen(true)
  }
  const focusPlace = (p: Place) => {
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14.4, pitch: terrain ? 48 : 0, duration: 900 })
    setPlace(p)
  }

  const enter = (skip = false) => {
    if (stageRef.current !== 'intro') return
    if (globeFailed) {
      setStage('explore')
      window.setTimeout(() => {
        const map = mapRef.current
        if (map) { map.resize(); fitSaudi(map); if (window.innerWidth > 860) map.easeTo({ pitch: 42, bearing: -7, duration: 500 }) }
      }, 80)
      return
    }
    setStage('leaving')
    if (skip) { setGlobeRevealed(true); setGlobeSettled(true) }
  }

  const finishEntry = () => {
    setStage('explore')
    window.setTimeout(() => {
      const map = mapRef.current
      if (!map) return
      map.resize()
      fitSaudi(map, true)
      if (window.innerWidth > 860) map.easeTo({ pitch: 42, bearing: -7, duration: 900 })
    }, 260)
  }

  return (
    <div className={`pulse ${dark ? '' : 'is-light'} ${stage === 'intro' ? 'is-intro' : stage === 'leaving' ? 'is-leaving' : 'is-explore'}`} dir="rtl">
      {stage !== 'explore' && (
        <div className="p-intro">
          <GlobeIntro
            variant="pulse"
            phase={stage === 'leaving' ? 'leaving' : 'intro'}
            onReveal={() => setGlobeRevealed(true)}
            onSettled={() => setGlobeSettled(true)}
            onArrived={finishEntry}
            onFail={() => { setGlobeFailed(true); setGlobeRevealed(true); setGlobeSettled(true) }}
          />
          <div className="p-intro-boot">
            <span>NABD OS / ORBITAL BOOT</span>
            <b>تهيئة طبقة الاستكشاف</b>
            <div className="p-boot-lines">
              <span><i /> EARTH TEXTURE <em>NASA</em></span>
              <span><i /> SAUDI BOUNDARY <em>LOCKED</em></span>
              <span><i /> TERRAIN LAYER <em>ON</em></span>
              <span><i /> LIVE TRAFFIC <em>UNAVAILABLE</em></span>
            </div>
          </div>
          <div className={`p-intro-copy ${globeRevealed ? 'is-ready' : ''}`}>
            <span className="p-intro-kicker">NABD / EXPLORATION OS · 02</span>
            <h1>من المدار<br /><em>إلى طلعتك.</em></h1>
            <p>
              كرة أرضية حقيقية، ثم هبوط بصري إلى السعودية.
              قرّب على أي محطة، وابنِ مسارك على قواعد واضحة.
            </p>
            <div className="p-intro-actions">
              <button className="p-intro-start" onClick={() => enter()} disabled={!globeSettled || stage === 'leaving'}>
                ابدأ المسح <ChevronLeft size={15} />
              </button>
              <button className="p-intro-skip" onClick={() => enter(true)}>تخطّي</button>
            </div>
            <div className="p-intro-facts">
              <span><b>03</b> نماذج</span>
              <span><b>3D</b> كرة حقيقية</span>
              <span><b>OSM</b> بيانات أماكن</span>
            </div>
          </div>
          <div className="p-intro-rail" aria-hidden="true">
            <span>ORBIT</span><i /><span>ATMOSPHERE</span><i /><span>SURFACE</span>
          </div>
          <div className="p-intro-coords">
            <span>LAT 24.7136</span><span>LNG 46.6753</span><span>ORBIT → SURFACE</span>
          </div>
          <div className="p-intro-scanline" aria-hidden="true" />
          {!globeRevealed && <div className="p-intro-status"><span className="p-loader" /> ACQUIRING SIGNAL…</div>}
        </div>
      )}
      {stage === 'explore' && (
      <header className="p-top">
        <a className="p-brand" href="#/">
          <span className="p-brand-mark"><Activity size={18} /></span>
          <span><b>نبض</b><small>NABD / EXPLORATION OS</small></span>
        </a>
        <div className="p-statusbar">
          <span className="p-live"><i /> MAP ONLINE</span>
          <span>SAU / 24.71°N 46.67°E</span>
          <span className="p-snapshot">SNAPSHOT {DATA_SNAPSHOT}</span>
        </div>
        <div className="p-top-actions">
          <button className={`p-query ${showSearch ? 'is-open' : ''}`} onClick={() => setShowSearch((v) => !v)}>
            <Search size={14} /><span>ابحث عن مدينة</span><kbd>⌘K</kbd>
          </button>
          <button className="p-iconbtn" onClick={toggle} aria-label="تبديل الوضع">{dark ? <Sun size={15} /> : <Moon size={15} />}</button>
          <button className="p-action" onClick={openPlan}><Command size={14} /> خطط الطلعة</button>
        </div>
        {showSearch && (
          <div className="p-search-pop">
            <label><Search size={14} /><input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الرياض، العلا، أبها…" /></label>
            <div>
              {cityHits.map((c) => (
                <button key={c.id} onClick={() => selectCity(c)}>
                  <span><b>{c.ar}</b><small>{c.region}</small></span>
                  <ChevronLeft size={13} />
                </button>
              ))}
              {!cityHits.length && <p>لا نتائج. جرّب اسمًا آخر.</p>}
            </div>
            <small>بحث محلي في فهرس المدن فقط.</small>
          </div>
        )}
      </header>
      )}

      <main className="p-main">
        <div ref={mapEl} className="map-canvas" />
        {!mapReady && !error && <div className="p-loading"><span className="p-loader" /> INITIALIZING SPATIAL LAYER…</div>}
        {error && <div className="p-map-error"><Radio size={22} /><b>MAP OFFLINE</b><span>{error}</span><button onClick={() => window.location.reload()}>RETRY</button></div>}
        <div className="p-grid" aria-hidden="true" />
        <div className="p-vignette" aria-hidden="true" />

        <div className="p-map-head">
          <span className="p-eyebrow"><Crosshair size={12} /> EXPLORATION GRID / SAUDI ARABIA</span>
          <h1>{city ? city.ar : 'المرصد'}<i>.</i></h1>
          <p>{city ? `${city.region} · ${poiList.length} عنصرًا في اللقطة` : 'حرّك، قرّب، واضغط محطة. الخريطة تعمل قبل أي سؤال.'}</p>
        </div>

        <div className="p-telemetry">
          <span>ZOOM <b>{mapReady ? '05.1' : '--'}</b></span>
          <span>PITCH <b>{terrain ? '42°' : '00°'}</b></span>
          <span>POINTS <b>{poiList.length || cities.length}</b></span>
          <span>LIVE <i className="p-live-dot" /> <b>NO</b></span>
        </div>

        <div className="p-compass" aria-hidden="true">
          <span>N</span>
          <div className="p-compass-ring"><i /><i /><i /><i /></div>
          <b>{terrain ? '3D' : '2D'}</b>
        </div>

        <aside className="p-rail" aria-label="أدوات الخريطة">
          <button className={terrain ? 'is-on' : ''} onClick={() => setTerrain((v) => !v)} title="تبديل التضاريس"><Layers3 size={17} /><small>{terrain ? '3D' : '2D'}</small></button>
          <button onClick={() => mapRef.current?.zoomIn()} title="تكبير"><Plus size={17} /></button>
          <button onClick={() => mapRef.current?.zoomOut()} title="تصغير"><Minus size={17} /></button>
          <button onClick={reset} title="عرض السعودية"><RotateCcw size={17} /></button>
          <span />
          <button onClick={toggle} title="الوضع"><Moon size={16} /></button>
        </aside>

        <aside className={`p-console ${sheet ? 'is-open' : ''}`} aria-label="لوحة الاستكشاف">
          <button className="p-sheet-handle" onClick={() => setSheet((v) => !v)} aria-label="فتح اللوحة"><span /></button>
          <div className="p-console-head">
            <div className="p-console-title">
              <span>CONSOLE / {mode.toUpperCase()}</span>
              <b>{mode === 'place' ? 'سجل المكان' : mode === 'city' ? 'بيانات المحطة' : 'الوضع العام'}</b>
            </div>
            <button className="p-close" onClick={() => { setSheet(false); setPlace(null) }} aria-label="إغلاق"><X size={16} /></button>
          </div>

          {mode === 'overview' && (
            <div className="p-overview thin-scroll">
              <div className="p-hero-stat">
                <span>نطاق الاستكشاف</span>
                <strong>{cities.length}</strong>
                <small>مدينة ومحطة في الفهرس</small>
                <div className="p-bars"><i /><i /><i /><i /><i /><i /><i /></div>
              </div>
              <div className="p-mini-grid">
                <div><b>{formatNum(cities.filter((c) => placesInCity(c.ar).length > 0).length)}</b><span>مدن ببيانات أماكن</span></div>
                <div><b>{formatNum(cities.reduce((n, c) => n + placesInCity(c.ar).length, 0))}</b><span>مكان في اللقطة</span></div>
                <div><b>{featuredCities.length}</b><span>محطات بارزة</span></div>
                <div><b>0</b><span>فعاليات موثقة</span></div>
              </div>
              <div className="p-stations">
                <header><span>أقرب المحطات</span><small>QUICK ACCESS</small></header>
                {featuredCities.slice(0, 6).map((c, i) => (
                  <button key={c.id} onClick={() => selectCity(c)}>
                    <span className="p-station-idx">0{i + 1}</span>
                    <span><b>{c.ar}</b><small>{c.en}</small></span>
                    <span className="p-station-count">{placesInCity(c.ar).length}</span>
                    <ChevronLeft size={13} />
                  </button>
                ))}
              </div>
              <div className="p-system-note"><ShieldCheck size={13} /><p>فهرس فقط حتى الآن. الأماكن تُحمّل عند فتح مدينة تغطيها البيانات.</p></div>
            </div>
          )}

          {mode === 'city' && city && (
            <div className="p-city-panel thin-scroll">
              <div className="p-city-meta">
                <span><MapPin size={11} /> {city.region}</span>
                <span className="p-coord">{city.lat.toFixed(3)}°N / {city.lng.toFixed(3)}°E</span>
              </div>
              <div className="p-weather">
                <div className="p-weather-main">
                  <CloudSun size={25} />
                  <strong>{weather ? `${weather.temperature}°` : '—'}</strong>
                  <span>{weather ? weatherLabel(weather.code) : weatherStatus === 'error' ? 'WEATHER OFFLINE' : 'FETCHING…'}</span>
                </div>
                <div className="p-weather-details">
                  <span><Droplets size={11} /> {weather ? `${weather.humidity}%` : '—'}</span>
                  <span><Wind size={11} /> {weather ? `${weather.wind} km/h` : '—'}</span>
                  <span><Activity size={11} /> Open-Meteo</span>
                </div>
              </div>
              <div className="p-tabs" role="tablist">
                <button className={panelTab === 'places' ? 'is-on' : ''} onClick={() => setPanelTab('places')}>أماكن <span>{poiList.length}</span></button>
                <button className={panelTab === 'events' ? 'is-on' : ''} onClick={() => setPanelTab('events')}>فعاليات <span>0</span></button>
              </div>
              {panelTab === 'places' && (
                <>
                  <div className="p-filters">
                    <button className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>ALL</button>
                    {ALL_CATEGORIES.filter((c) => poiList.some((p) => p.cat === c)).map((c) => (
                      <button key={c} className={filter === c ? 'is-on' : ''} onClick={() => setFilter(c)}>{CATEGORY_META[c].short}</button>
                    ))}
                  </div>
                  <div className="p-place-list">
                    {filtered.length === 0 && <div className="p-empty"><Radio size={18} /><b>NO LAYER DATA</b><p>لا توجد أماكن في هذه المدينة ضمن اللقطة.</p></div>}
                    {filtered.map((p, i) => (
                      <button key={p.id} className="p-place-row" onClick={() => focusPlace(p)}>
                        <span className="p-place-idx">{String(i + 1).padStart(2, '0')}</span>
                        <span className="p-cat-icon"><CategoryIcon cat={p.cat} size={13} /></span>
                        <span className="p-place-info"><b>{p.name}</b><small>{p.kind} // {CATEGORY_META[p.cat].label}</small></span>
                        <span className="p-place-signal"><i /><i /><i /></span>
                      </button>
                    ))}
                  </div>
                </>
              )}
              {panelTab === 'events' && <div className="p-events"><EventsState /><a className="p-official" href="https://events.sa" target="_blank" rel="noreferrer noopener">فتح المنصة الرسمية للفعاليات <ChevronLeft size={12} /></a></div>}
              <div className="p-console-actions">
                <button className="p-primary" onClick={openPlan}><Route size={14} /> بناء مسار</button>
                <button className="p-secondary" onClick={reset}>كل السعودية</button>
              </div>
            </div>
          )}

          {mode === 'place' && place && (
            <div className="p-place-detail thin-scroll">
              <div className="p-place-art"><ArtTile place={place} ratio="16 / 9" /><span className="p-art-label">ABSTRACT / NO VENUE PHOTO</span></div>
              <span className="p-detail-kicker">{CATEGORY_META[place.cat].label} // {place.city}</span>
              <h2>{place.name}</h2>
              <p className="p-detail-kind">{place.kind} {place.nameEn ? `· ${place.nameEn}` : ''}</p>
              <div className="p-data-grid">
                <div><span>COORD</span><b>{place.lat.toFixed(4)}, {place.lng.toFixed(4)}</b></div>
                <div><span>SOURCE</span><b>OSM</b></div>
                <div><span>RATING</span><b className="is-muted">N/A</b></div>
                <div><span>HOURS</span><b className="is-muted">N/A</b></div>
              </div>
              <div className="p-disclaimer"><ShieldCheck size={13} /><p>لا تتوفر صور أو تقييمات أو أسعار أو ساعات موثوقة. الحقول غير المتاحة تظهر N/A ولا تُملأ تقديرًا.</p></div>
              <div className="p-detail-actions">
                <a href={directionsUrl(place)} target="_blank" rel="noreferrer noopener"><Navigation size={13} /> الاتجاهات</a>
                <button onClick={() => {
                  const base = plan ?? buildPlan(defaultPlanInput(city?.id ?? 'riyadh'))
                  if (!base.stops.some((s) => s.place.id === place.id)) setPlan(resequencePlan(base, [...base.stops.map((s) => s.place), place]))
                  setPlanOpen(true)
                }}><Plus size={13} /> أضف للمسار</button>
              </div>
              <SourceLine place={place} />
              <button className="p-detail-back" onClick={() => setPlace(null)}><ArrowRight size={13} /> رجوع للمحطة</button>
            </div>
          )}

          <div className="p-console-foot">
            <span>LATENCY 12ms</span><span>DATA / OSM</span><span>UI / 02</span>
          </div>
        </aside>

        <div className="p-city-dock">
          <span className="p-dock-label">CITY INDEX</span>
          <div className="p-dock-scroll thin-scroll">
            {featuredCities.map((c) => (
              <button key={c.id} className={city?.id === c.id ? 'is-on' : ''} onClick={() => selectCity(c)}>
                <i />{c.ar}
              </button>
            ))}
          </div>
          <span className="p-dock-hint">SCROLL →</span>
        </div>

        <div className="p-docknav">
          <button className={!plan && !place ? 'is-on' : ''} onClick={reset}><Compass size={16} /><span>الاستكشاف</span></button>
          <button className={plan ? 'is-on' : ''} onClick={openPlan}><Route size={16} /><span>المسار</span></button>
          <button onClick={() => { setPanelTab('events'); setSheet(true) }}><CalendarDays size={16} /><span>الفعاليات</span></button>
          <button onClick={() => setShowSearch(true)}><Search size={16} /><span>بحث</span></button>
        </div>

        <div className="p-ticker">
          <span className="p-ticker-live"><i /> LIVE</span>
          <p>لا يوجد بث مباشر للازدحام أو الفعاليات. نعرض بيانات موثقة فقط.</p>
          <span className="p-ticker-date">{DATA_SNAPSHOT}</span>
        </div>
      </main>

      {planOpen && (
        <PulsePlanner
          plan={plan}
          setPlan={setPlan}
          initialCity={city}
          routeStatus={routeStatus}
          onClose={() => setPlanOpen(false)}
          onPickCity={(id) => { const c = cityById(id); if (c) setCity(c) }}
        />
      )}
    </div>
  )
}

function PulsePlanner({
  plan, setPlan, initialCity, routeStatus, onClose, onPickCity,
}: {
  plan: Plan | null
  setPlan: (p: Plan | null) => void
  initialCity: City | null
  routeStatus: string
  onClose: () => void
  onPickCity: (id: string) => void
}) {
  const [input, setInput] = useState<PlanInput>(() => plan?.input ?? defaultPlanInput(initialCity?.id ?? 'riyadh'))
  const [tab, setTab] = useState<'config' | 'route'>('config')
  const city = cityById(input.cityId)
  const cityPlaces = city ? placesInCity(city.ar) : []
  const togglePref = (c: Category) => setInput((s) => ({ ...s, prefs: s.prefs.includes(c) ? s.prefs.filter((x) => x !== c) : [...s.prefs, c] }))
  const generate = () => { setPlan(buildPlan(input)); setTab('route') }
  const move = (i: number, dir: number) => {
    if (!plan) return
    const next = [...plan.stops]
    const to = i + dir
    if (to < 0 || to >= next.length) return
    ;[next[i], next[to]] = [next[to], next[i]]
    setPlan(resequencePlan(plan, next.map((s) => s.place)))
  }
  const remove = (id: string) => plan && setPlan(resequencePlan(plan, plan.stops.filter((s) => s.place.id !== id).map((s) => s.place)))
  const add = (p: Place) => plan && setPlan(resequencePlan(plan, [...plan.stops.map((s) => s.place), p]))

  return (
    <div className="p-planner" role="dialog" aria-modal="true" aria-label="مخطط المسار">
      <div className="p-planner-backdrop" onClick={onClose} />
      <section className="p-planner-panel">
        <header className="p-planner-head">
          <div><span>MISSION CONSOLE / ROUTE BUILDER</span><h2>خطط الطلعة</h2></div>
          <button onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </header>
        <div className="p-planner-tabs">
          <button className={tab === 'config' ? 'is-on' : ''} onClick={() => setTab('config')}><SlidersHorizontal size={13} /> الإدخال</button>
          <button className={tab === 'route' ? 'is-on' : ''} onClick={() => setTab('route')}><Route size={13} /> المسار {plan ? `(${plan.stops.length})` : ''}</button>
        </div>
        <div className="p-planner-body thin-scroll">
          {tab === 'config' && (
            <>
              <div className="p-config-grid">
                <label><span>CITY / المدينة</span><select value={input.cityId} onChange={(e) => { setInput({ ...input, cityId: e.target.value }); onPickCity(e.target.value) }}>{cities.filter((c) => placesInCity(c.ar).length > 0).map((c) => <option key={c.id} value={c.id}>{c.ar}</option>)}</select></label>
                <label><span>GROUP / المجموعة</span><select value={input.group} onChange={(e) => setInput({ ...input, group: e.target.value as PlanInput['group'] })}>{(['family', 'friends', 'solo'] as const).map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}</select></label>
                <label><span>PEOPLE / الأشخاص</span><input type="number" min={1} max={20} value={input.people} onChange={(e) => setInput({ ...input, people: Number(e.target.value) })} /></label>
                <label><span>BUDGET / الميزانية (SAR)</span><input type="number" min={0} step={50} value={input.budget} onChange={(e) => setInput({ ...input, budget: Number(e.target.value) })} /></label>
                <label><span>DATE / التاريخ</span><input type="date" value={input.date} onChange={(e) => setInput({ ...input, date: e.target.value })} /></label>
                <label><span>START / البداية</span><input type="time" value={input.startTime} onChange={(e) => setInput({ ...input, startTime: e.target.value })} /></label>
              </div>
              <label className="p-range"><span>DURATION / المدة <b>{input.durationHours}h</b></span><input type="range" min={3} max={12} value={input.durationHours} onChange={(e) => setInput({ ...input, durationHours: Number(e.target.value) })} /></label>
              <div className="p-config-block"><span>INTERESTS / الفئات</span><div className="p-config-prefs">{ALL_CATEGORIES.map((c) => <button key={c} className={input.prefs.includes(c) ? 'is-on' : ''} onClick={() => togglePref(c)}><CategoryIcon cat={c} size={12} />{CATEGORY_META[c].short}</button>)}</div></div>
              <div className="p-engine">
                <Zap size={16} />
                <div><b>محرّك اقتراحات محلي</b><p>قواعد شفافة ترتّب بحسب الفئات والقرب. ليس ذكاءً اصطناعيًا، ولا يدّعي معرفة تقييمات أو أسعار.</p></div>
              </div>
              <button className="p-primary p-generate" onClick={generate}><Sparkles size={14} /> احسب المسار</button>
            </>
          )}
          {tab === 'route' && (
            <>
              {!plan && <div className="p-empty p-empty--tall"><Route size={22} /><b>NO ROUTE</b><p>اضبط الإدخال ثم احسب المسار.</p><button className="p-primary" onClick={() => setTab('config')}>إلى الإدخال</button></div>}
              {plan && (
                <>
                  <div className="p-route-head"><div><span>ROUTE / {plan.input.cityId.toUpperCase()}</span><h3>{plan.summary.title}</h3><p>{formatDateAr(plan.input.date)} · {displayTime(plan.input.startTime)}</p></div><span className="p-route-status"><i /> {routeStatus === 'ready' ? 'OSRM' : 'ESTIMATE'}</span></div>
                  <div className="p-metrics">
                    <div><span>DISTANCE</span><b>{plan.summary.totalKm}<small>km</small></b></div>
                    <div><span>TOTAL</span><b>{Math.floor(plan.summary.totalMin / 60)}:<small>{String(plan.summary.totalMin % 60).padStart(2, '0')}</small></b></div>
                    <div><span>STOPS</span><b>{plan.stops.length}</b></div>
                    <div><span>BUDGET</span><b>{formatNum(plan.input.budget)}<small>SAR</small></b></div>
                  </div>
                  <div className="p-route-line">
                    {plan.stops.map((s, i) => (
                      <article key={s.place.id}>
                        <div className="p-route-dot"><span>{String(i + 1).padStart(2, '0')}</span></div>
                        <div className="p-route-info">
                          <span>{displayTime(s.arrival)} — {displayTime(s.departure)} · {s.stayMin} MIN</span>
                          <h4>{s.place.name}</h4>
                          <p>{s.reason}</p>
                          <div className="p-route-sub"><span>{s.travelKm} km</span><span>{s.travelMin} min</span><span>{CATEGORY_META[s.place.cat].label}</span></div>
                          <div className="p-route-actions"><button onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={11} /></button><button onClick={() => move(i, 1)} disabled={i === plan.stops.length - 1}><ArrowDown size={11} /></button><button onClick={() => remove(s.place.id)}><Trash2 size={11} /></button></div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="p-budget">
                    <span>توزيع مقترح للميزانية</span>
                    <div><i style={{ width: '40%' }} /><b>{formatNum(plan.budget.experiences)} تجارب</b></div>
                    <div><i style={{ width: '35%' }} /><b>{formatNum(plan.budget.food)} طعام</b></div>
                    <div><i style={{ width: '25%' }} /><b>{formatNum(plan.budget.transport)} تنقل</b></div>
                    <small>ليس أسعارًا فعلية للأماكن.</small>
                  </div>
                  <div className="p-add">
                    <span>ADD STOP / أضف محطة</span>
                    <div>{cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).slice(0, 6).map((p) => <button key={p.id} onClick={() => add(p)}><Plus size={11} />{p.name}</button>)}</div>
                  </div>
                  <button className="p-secondary p-regenerate" onClick={generate}><RotateCcw size={13} /> أعد الحساب</button>
                  <EventsState compact />
                </>
              )}
            </>
          )}
        </div>
        <footer className="p-planner-foot"><span>NO LIVE CLAIMS</span><span>RULES ENGINE v1</span><span>OPEN DATA</span></footer>
      </section>
    </div>
  )
}
