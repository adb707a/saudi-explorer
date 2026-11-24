import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft, ArrowRight, ArrowUp, ArrowDown, CalendarDays, ChevronLeft,
  CloudSun, Compass, Droplets, Info, LocateFixed, MapPin,
  Minus, Moon, Navigation, Plus, Route, ShieldCheck, Sparkles, Sun, Timer, Trash2, Users,
  Wallet, Wind, X,
} from 'lucide-react'
import type { Map as MlMap } from 'maplibre-gl'
import { addPoiLayers, addRouteLayer, addSelectedMarker, bindCityLabelZoom, createMap, fitSaudi, maplibregl } from '../../maps/base'
import { CATEGORY_META, ALL_CATEGORIES, cities, cityById, DATA_SNAPSHOT, directionsUrl, displayTime, featuredCities, formatDateAr, formatNum, placesInCity, weatherLabel } from '../../lib/catalog'
import { buildPlan, defaultPlanInput, GROUP_LABEL, resequencePlan } from '../../lib/planner'
import { useDriveRoute, useLocalTheme, useWeather } from '../../lib/hooks'
import type { Category, City, Plan, PlanInput, Place } from '../../lib/types'
import { ArtTile } from '../../components/ArtTile'
import { CategoryIcon } from '../../components/CategoryIcon'
import { EventsState } from '../../components/EventsState'
import { SourceLine } from '../../components/SourceLine'
import { GlobeIntro } from '../../components/GlobeIntro'
import './atlas.css'

export function AtlasApp() {
  const { theme, toggle } = useLocalTheme('atlas', 'light')
  const dark = theme === 'dark'
  const mapEl = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MlMap | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const [mapReady, setMapReady] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [city, setCity] = useState<City | null>(null)
  const [filter, setFilter] = useState<Category | 'all'>('all')
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [stage, setStage] = useState<'intro' | 'leaving' | 'explore'>('intro')
  const [globeRevealed, setGlobeRevealed] = useState(false)
  const [globeSettled, setGlobeSettled] = useState(false)
  const [globeFailed, setGlobeFailed] = useState(false)
  const stageRef = useRef(stage)
  stageRef.current = stage
  const { weather, status: weatherStatus } = useWeather(city?.id ?? null)
  const { route, status: routeStatus } = useDriveRoute(plan)

  const allCityPlaces = city ? placesInCity(city.ar) : []
  const filtered = filter === 'all' ? allCityPlaces : allCityPlaces.filter((p) => p.cat === filter)
  const poiList = useMemo(
    () => (city ? placesInCity(city.ar) : []),
    [city?.id],
  )
  const placesRef = useRef<Place[]>(poiList)
  placesRef.current = poiList

  const callbacks = useRef({
    onCity: (_c: City) => {},
    onPlace: (_p: Place) => {},
  })
  callbacks.current.onCity = (c) => {
    setCity(c)
    setSelectedPlace(null)
    setFilter('all')
    setSheetOpen(true)
    if (plan && plan.input.cityId !== c.id) setPlan(null)
  }
  callbacks.current.onPlace = (p) => {
    setSelectedPlace(p)
    setSheetOpen(true)
  }

  // map lifecycle
  useEffect(() => {
    if (!mapEl.current) return
    let cancelled = false
    setMapReady(false)
    setLoadError('')
    createMap(mapEl.current, 'atlas', {
      dark,
      center: [45.2, 24.2],
      zoom: 5.1,
      minZoom: 1.1,
      maxZoom: 16.5,
    })
      .then((map) => {
        if (cancelled) {
          map.remove()
          return
        }
        mapRef.current = map
        map.on('load', () => {
          if (cancelled) return
          fitSaudi(map)
          setMapReady(true)
          featuredCities.forEach((c) => {
            const el = document.createElement('button')
            el.type = 'button'
            el.className = 'atlas-city-marker' + (c.featured ? ' is-featured' : '')
            if (!['riyadh', 'jeddah', 'dammam', 'madinah', 'tabuk', 'abha', 'hail', 'alula'].includes(c.id)) {
              el.dataset.labelMinZoom = '6.3'
            }
            el.setAttribute('aria-label', `اذهب إلى ${c.ar}`)
            el.innerHTML = `<span class="city-dot"></span><span class="city-label"><b>${c.ar}</b><i>${c.en}</i></span>`
            el.addEventListener('click', (e) => {
              e.stopPropagation()
              map.flyTo({ center: [c.lng, c.lat], zoom: 10.7, duration: 1600, essential: true })
              callbacks.current.onCity(c)
            })
            const marker = new maplibregl.Marker({ element: el, anchor: 'bottom' })
              .setLngLat([c.lng, c.lat])
              .addTo(map)
            markersRef.current.push(marker)
          })
          bindCityLabelZoom(map, markersRef.current)
        })
        map.on('click', (e) => {
          const cluster = map.queryRenderedFeatures(e.point, { layers: ['poi-clusters'] })
          if (cluster.length) {
            const feature = cluster[0]
            const src = map.getSource('places') as maplibregl.GeoJSONSource
            src.getClusterExpansionZoom(Number(feature.properties?.cluster_id)).then((zoom: number) => {
              map.easeTo({ center: (feature.geometry as { coordinates: [number, number] }).coordinates, zoom: zoom + 0.2, duration: 800 })
            })
            return
          }
          const poi = map.queryRenderedFeatures(e.point, { layers: ['poi-points'] })
          if (poi.length) {
            const id = String(poi[0].properties?.id || '')
            const place = placesRef.current.find((p) => p.id === id)
            if (place) callbacks.current.onPlace(place)
          }
        })
        map.on('mousemove', (e) => {
          const hits = map.queryRenderedFeatures(e.point, { layers: ['poi-clusters', 'poi-points'] })
          map.getCanvas().style.cursor = hits.length ? 'pointer' : ''
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
  }, [dark])

  // markers active state
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach((m) => {
      const el = m.getElement()
      const label = el.querySelector('.city-label b')?.textContent
      el.classList.toggle('is-active', !!city && label === city.ar)
    })
  }, [city, mapReady])

  // pois
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addPoiLayers(map, filtered, 'atlas', dark)
  }, [city?.id, filter, mapReady, dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addSelectedMarker(map, selectedPlace, 'atlas', dark)
  }, [selectedPlace, mapReady, dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addRouteLayer(map, plan ? route : null, 'atlas')
  }, [route, plan, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !plan || !plan.stops.length || !mapReady) return
    const bounds = new maplibregl.LngLatBounds()
    plan.stops.forEach((s) => bounds.extend([s.place.lng, s.place.lat]))
    map.fitBounds(bounds, { padding: { top: 90, bottom: 120, left: 90, right: 440 }, duration: 1200, maxZoom: 12.5 })
  }, [plan?.id, mapReady])

  const flyCity = (c: City) => {
    mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 10.7, duration: 1500 })
    setCity(c)
    setSelectedPlace(null)
    setFilter('all')
    setSheetOpen(true)
    if (plan && plan.input.cityId !== c.id) setPlan(null)
  }

  const resetSaudi = () => {
    if (mapRef.current) fitSaudi(mapRef.current, true)
    setCity(null)
    setSelectedPlace(null)
    setPlan(null)
  }

  const startPlan = () => {
    setPlanOpen(true)
    if (!plan && city) setPlan(buildPlan(defaultPlanInput(city.id)))
  }

  const enter = (skip = false) => {
    if (stageRef.current !== 'intro') return
    if (globeFailed) {
      setStage('explore')
      window.setTimeout(() => {
        const map = mapRef.current
        if (map) { map.resize(); fitSaudi(map) }
      }, 80)
      return
    }
    setStage('leaving')
    if (skip) {
      // The globe still performs its hand-off, but we don't wait for the full reveal.
      setGlobeRevealed(true)
      setGlobeSettled(true)
    }
  }

  const finishEntry = () => {
    setStage('explore')
    window.setTimeout(() => {
      const map = mapRef.current
      if (!map) return
      map.resize()
      fitSaudi(map, true)
    }, 260)
  }

  const jumpToPlace = (p: Place) => {
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14.5, duration: 900 })
    setSelectedPlace(p)
  }

  return (
    <div className={`atlas ${dark ? 'is-dark' : ''} ${stage === 'intro' ? 'is-intro' : stage === 'leaving' ? 'is-leaving' : 'is-explore'}`} dir="rtl">
      {stage !== 'explore' && (
        <div className="a-intro">
          <GlobeIntro
            variant="atlas"
            phase={stage === 'leaving' ? 'leaving' : 'intro'}
            onReveal={() => setGlobeRevealed(true)}
            onSettled={() => setGlobeSettled(true)}
            onArrived={finishEntry}
            onFail={() => { setGlobeFailed(true); setGlobeRevealed(true); setGlobeSettled(true) }}
          />
          <div className="a-intro-frame">
            <div className="a-intro-mast">
              <span className="a-intro-brand">طلعة <i>/</i> مدار</span>
              <span className="a-intro-chapter">٠١ — من المدار إلى الأرض</span>
            </div>
            <div className={`a-intro-copy ${globeRevealed ? 'is-ready' : ''}`}>
              <span className="a-intro-kicker">أطلس السعودية · كرة أرضية حقيقية</span>
              <h1>الأرض<br /><em>تبدأ من هنا.</em></h1>
              <p>
                مدن، أماكن، مقاهٍ وطلعات — في خريطة واحدة.
                قرّب على السعودية وابدأ من حيث تشاء.
              </p>
              <div className="a-intro-actions">
                <button className="a-intro-start" onClick={() => enter()} disabled={!globeSettled || stage === 'leaving'}>
                  ابدأ الرحلة <span className="a-intro-arrow">↗</span>
                </button>
                <button className="a-intro-skip-text" onClick={() => enter(true)}>تخطّي المشهد</button>
              </div>
              <div className="a-intro-meta">
                <span><b>٣</b> نماذج</span>
                <span><b>{formatNum(cities.length)}</b> مدينة</span>
                <span><b>NASA</b> خامات الأرض</span>
              </div>
            </div>
            <aside className="a-intro-side">
              <span>24.7136° N</span>
              <i />
              <span>46.6753° E</span>
              <b>اسحب الكرة لتدويرها<br />ثم ابدأ الرحلة</b>
            </aside>
            <div className="a-intro-foot">
              <span>حالة المشهد: {globeRevealed ? 'السعودية في المركز' : 'الكوكب يستدير'}</span>
              <span>بيانات الأماكن · OpenStreetMap</span>
            </div>
            {!globeRevealed && <div className="a-intro-loading"><i /> نرسم الحدود ونقترب من السعودية…</div>}
          </div>
          <div className="a-intro-scan" aria-hidden="true" />
        </div>
      )}
      {stage === 'explore' && (
      <header className="a-nav">
        <a className="a-brand" href="#/">
          <span className="a-brand-symbol">م</span>
          <span className="a-brand-meta"><b>مدار</b><small>MADAR / من طلعة</small></span>
        </a>
        <nav className="a-nav-links" aria-label="التنقل">
          <button className="is-active" onClick={resetSaudi}>الخريطة</button>
          <button onClick={() => document.getElementById('a-cities')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })}>المدن</button>
          <button onClick={() => setSheetOpen(true)}>ملاحظات الميدان</button>
        </nav>
        <div className="a-nav-actions">
          <span className="a-edition">الإصدار ٠١ — مدار</span>
          <button className="a-icon" onClick={toggle} aria-label={dark ? 'وضع فاتح' : 'وضع داكن'}>
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button className="a-plan-btn" onClick={startPlan}>
            <Compass size={15} /> خطط طلعتك
          </button>
        </div>
      </header>
      )}

      <main className="a-stage">
        <section className="a-map" aria-label="خريطة السعودية التفاعلية">
          <div ref={mapEl} className="map-canvas" />
          {!mapReady && !loadError && <div className="map-loading"><span><i /> نرسم الأطلس…</span></div>}
          {loadError && (
            <div className="a-map-error">
              <Info size={20} />
              <b>تعذر تحميل الخريطة</b>
              <span>{loadError}</span>
              <button onClick={() => window.location.reload()}>إعادة المحاولة</button>
            </div>
          )}
          <div className="a-map-wash" aria-hidden="true" />
          <div className="a-map-title">
            <span>المملكة العربية السعودية</span>
            <strong>خريطة الاستكشاف</strong>
            <small>٢١ نوفمبر ٢٠٢٦ · لقطة بيانات</small>
          </div>
          <div className="a-coordinates" aria-hidden="true">
            <span>24° 38′ N</span><span>46° 43′ E</span>
          </div>
          <div className="a-compass" aria-hidden="true">
            <span>N</span>
            <i />
            <small>أثر</small>
          </div>
          <div className="a-map-controls">
            <button onClick={() => mapRef.current?.zoomIn()} aria-label="تكبير"><Plus size={17} /></button>
            <button onClick={() => mapRef.current?.zoomOut()} aria-label="تصغير"><Minus size={17} /></button>
            <button onClick={resetSaudi} aria-label="عرض السعودية كاملة"><LocateFixed size={17} /></button>
          </div>
          <div className="a-map-legend">
            <span><i style={{ background: '#B4512E' }} /> طعام وتجارب</span>
            <span><i style={{ background: '#135957' }} /> طبيعة وثقافة</span>
            <span><i style={{ background: '#7B5A23' }} /> إطلالات</span>
          </div>
          <div className="a-map-hint">اسحب الخريطة، قرّب، واضغط مدينة لقراءة ملاحظاتها</div>
          <div className="a-city-strip" id="a-cities">
            <div className="a-strip-label"><span>فهرس المدن</span><b>اختر محطة</b></div>
            <div className="a-strip-scroll thin-scroll">
              {featuredCities.map((c, i) => (
                <button key={c.id} className={`a-city-chip ${city?.id === c.id ? 'is-active' : ''}`} onClick={() => flyCity(c)}>
                  <span className="a-chip-index">{String(i + 1).padStart(2, '0')}</span>
                  <span><b>{c.ar}</b><small>{c.region.replace('منطقة ', '')}</small></span>
                  {city?.id === c.id && <ArrowLeft size={13} />}
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className={`a-side ${sheetOpen ? 'is-open' : ''}`} aria-label="ملاحظات الميدان">
          <button className="a-side-close" onClick={() => setSheetOpen(false)} aria-label="إغلاق الملاحظات"><X size={18} /></button>
          {city ? (
            <>
              <div className="a-side-head">
                <span className="a-side-kicker">ملاحظات الميدان / {city.id.toUpperCase()}</span>
                <h1>{city.ar}</h1>
                <p>{city.region} · {formatNum(allCityPlaces.length)} مكانًا في اللقطة</p>
                <div className="a-weather">
                  <span className="a-weather-icon"><CloudSun size={22} /></span>
                  <div>
                    <b>{weather ? `${weather.temperature}°` : '—'}</b>
                    <span>{weather ? weatherLabel(weather.code) : weatherStatus === 'error' ? 'الطقس غير متاح' : 'نقرأ الطقس…'}</span>
                  </div>
                  {weather && (
                    <div className="a-weather-facts">
                      <span><Droplets size={11} /> {weather.humidity}%</span>
                      <span><Wind size={11} /> {weather.wind} كم/س</span>
                    </div>
                  )}
                </div>
                <div className="a-side-actions">
                  <button className="a-cta" onClick={startPlan}><Compass size={14} /> خطط طلعتك هنا</button>
                  <button className="a-reset" onClick={resetSaudi}>كل السعودية</button>
                </div>
              </div>

              <div className="a-filters" role="tablist" aria-label="تصفية الأماكن">
                <button className={filter === 'all' ? 'is-active' : ''} onClick={() => setFilter('all')}>الكل <span>{allCityPlaces.length}</span></button>
                {ALL_CATEGORIES.filter((c) => allCityPlaces.some((p) => p.cat === c)).map((c) => (
                  <button key={c} className={filter === c ? 'is-active' : ''} onClick={() => setFilter(c)}>
                    <CategoryIcon cat={c} size={12} /> {CATEGORY_META[c].label}
                  </button>
                ))}
              </div>

              <div className="a-places thin-scroll">
                {filtered.length === 0 && (
                  <div className="a-empty">
                    <MapPin size={20} />
                    <b>لا توجد أماكن مفصلة لهذه المدينة في اللقطة</b>
                    <p>نعرض المدن كلها، لكن بيانات الأماكن المتصلة تغطي مدنًا محددة فقط حتى الآن. لن نملأها بأسماء غير موثقة.</p>
                  </div>
                )}
                {filtered.map((p, i) => (
                  <button className={`a-place ${selectedPlace?.id === p.id ? 'is-active' : ''}`} key={p.id} onClick={() => jumpToPlace(p)}>
                    <span className="a-place-index">{String(i + 1).padStart(2, '0')}</span>
                    <span className="a-place-icon"><CategoryIcon cat={p.cat} size={15} /></span>
                    <span className="a-place-copy">
                      <b>{p.name}</b>
                      <small>{p.kind} · {CATEGORY_META[p.cat].label}</small>
                    </span>
                    <ChevronLeft size={14} className="a-place-arrow" />
                  </button>
                ))}
              </div>
              <div className="a-side-foot">
                <ShieldCheck size={12} /> بيانات الأسماء والمواقع: OpenStreetMap · {DATA_SNAPSHOT}
              </div>
            </>
          ) : (
            <>
              <div className="a-side-head a-side-head--intro">
                <span className="a-side-kicker">مقدمة الأطلس / ٠٠</span>
                <h1>اقرأ الأرض<br />قبل أن تخطط.</h1>
                <p>
                  ابدأ من الخريطة. حرّكها بحرية، قرّب على أي مدينة، واقرأ ما نعرفه فعلًا
                  عن الأماكن. لا أسئلة إجبارية قبل الاستكشاف.
                </p>
                <div className="a-stats">
                  <div><b>{cities.length}</b><span>مدينة ومحطة</span></div>
                  <div><b>{formatNum(cities.filter((c) => placesInCity(c.ar).length > 0).length)}</b><span>مدينة ببيانات أماكن</span></div>
                  <div><b>{featuredCities.length}</b><span>محطة بارزة</span></div>
                </div>
              </div>
              <div className="a-index">
                <div className="a-index-head"><span>فهرس المحطات</span><small>اضغط للانتقال</small></div>
                {featuredCities.slice(0, 9).map((c, i) => (
                  <button key={c.id} className="a-index-row" onClick={() => flyCity(c)}>
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <b>{c.ar}</b>
                    <small>{c.en}</small>
                    <ArrowLeft size={13} />
                  </button>
                ))}
              </div>
              <button className="a-index-more" onClick={() => setSheetOpen(true)}>كل المحطات <ArrowLeft size={13} /></button>
              <div className="a-editorial-note">
                <span>ملاحظة المحرر</span>
                <p>الخرائط هنا أطلس للاستكشاف، لا كتالوج. الأماكن التي لا نملك عنها بيانات موثوقة تبقى فارغة بدل أن تُزيّن بمعلومات مخترعة.</p>
              </div>
              <div className="a-side-foot"><ShieldCheck size={12} /> OpenStreetMap · OpenFreeMap · MapLibre</div>
            </>
          )}
        </aside>

        {selectedPlace && (
          <div className="a-place-detail">
            <button className="a-detail-close" onClick={() => setSelectedPlace(null)} aria-label="إغلاق"><X size={16} /></button>
            <ArtTile place={selectedPlace} ratio="16 / 10" />
            <div className="a-detail-body">
              <span className="a-detail-kicker">{CATEGORY_META[selectedPlace.cat].label} · {selectedPlace.city}</span>
              <h2>{selectedPlace.name}</h2>
              <p className="a-detail-kind">{selectedPlace.kind}</p>
              <div className="a-detail-unavailable">
                <Info size={13} />
                <span>لا تتوفر صورة أو تقييم أو سعر أو ساعات عمل موثوقة لهذا المكان. نعرض الاسم والنوع والموقع فقط.</span>
              </div>
              <div className="a-detail-actions">
                <a href={directionsUrl(selectedPlace)} target="_blank" rel="noreferrer noopener"><Navigation size={14} /> الاتجاهات</a>
                <button onClick={() => {
                  const base = plan ?? buildPlan(defaultPlanInput(city?.id || 'riyadh'))
                  if (!base.stops.some((s) => s.place.id === selectedPlace.id)) {
                    setPlan(resequencePlan(base, [...base.stops.map((s) => s.place), selectedPlace]))
                  }
                  setPlanOpen(true)
                }}><Plus size={14} /> أضف للطلعة</button>
              </div>
              <SourceLine place={selectedPlace} />
            </div>
          </div>
        )}
      </main>

      {planOpen && (
        <AtlasPlanner
          plan={plan}
          setPlan={setPlan}
          city={city}
          weather={weather}
          routeStatus={routeStatus}
          onClose={() => setPlanOpen(false)}
          onSelectCity={(id) => {
            const c = cityById(id)
            if (c) { setCity(c); setSelectedPlace(null); mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 10.7, duration: 1200 }) }
          }}
        />
      )}

      {!planOpen && plan && (
        <button className="a-floating-plan" onClick={() => setPlanOpen(true)}>
          <Route size={16} />
          <span>طلعتك جاهزة · {plan.stops.length} محطات</span>
          <ArrowLeft size={14} />
        </button>
      )}
    </div>
  )
}

function AtlasPlanner({
  plan, setPlan, city, weather, routeStatus, onClose, onSelectCity,
}: {
  plan: Plan | null
  setPlan: (p: Plan | null) => void
  city: City | null
  weather: { temperature: number; code: number } | null
  routeStatus: string
  onClose: () => void
  onSelectCity: (id: string) => void
}) {
  const [step, setStep] = useState(1)
  const [input, setInput] = useState<PlanInput>(() => plan?.input ?? defaultPlanInput(city?.id ?? 'riyadh'))
  const [placesOpen, setPlacesOpen] = useState(false)

  useEffect(() => {
    if (city) setInput((s) => ({ ...s, cityId: city.id }))
  }, [city?.id])

  const selectedCity = cityById(input.cityId)
  const cityPlaces = selectedCity ? placesInCity(selectedCity.ar) : []

  const togglePref = (c: Category) => {
    setInput((s) => ({ ...s, prefs: s.prefs.includes(c) ? s.prefs.filter((x) => x !== c) : [...s.prefs, c] }))
  }

  const generate = () => {
    setPlan(buildPlan(input))
    setStep(3)
  }

  const removeStop = (id: string) => {
    if (!plan) return
    setPlan(resequencePlan(plan, plan.stops.filter((s) => s.place.id !== id).map((s) => s.place)))
  }
  const move = (index: number, dir: -1 | 1) => {
    if (!plan) return
    const next = [...plan.stops]
    const to = index + dir
    if (to < 0 || to >= next.length) return
    ;[next[index], next[to]] = [next[to], next[index]]
    setPlan(resequencePlan(plan, next.map((s) => s.place)))
  }
  const addPlace = (p: Place) => {
    if (!plan) return
    setPlan(resequencePlan(plan, [...plan.stops.map((s) => s.place), p]))
  }

  return (
    <div className="a-planner" role="dialog" aria-modal="true" aria-label="دفتر تخطيط الطلعة">
      <button className="a-planner-close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
      <div className="a-planner-rail">
        <span className="a-planner-brand">دفتر الرحلة</span>
        {[1, 2, 3].map((n) => (
          <button key={n} className={step === n ? 'is-active' : step > n ? 'is-done' : ''} onClick={() => setStep(n)}>
            <span>{step > n ? '✓' : `0${n}`}</span>
            <b>{n === 1 ? 'الشكل' : n === 2 ? 'النبض' : 'المسار'}</b>
          </button>
        ))}
        <div className="a-rail-footer">
          <span>أثر / دفتر ٠١</span>
          <p>كل خطوة قابلة للتعديل. لا شيء نهائي.</p>
        </div>
      </div>

      <div className="a-planner-main thin-scroll">
        {step === 1 && (
          <div className="a-step">
            <div className="a-step-head">
              <span>الخطوة الأولى / الشكل</span>
              <h2>كيف تحب أن تكون<br />طلعته؟</h2>
              <p>هذه إجاباتك، لا أسئلة إجبارية. يمكنك دائمًا العودة واستكشاف الخريطة يدويًا.</p>
            </div>
            <div className="a-form-grid">
              <label className="a-field">
                <span>المدينة</span>
                <select value={input.cityId} onChange={(e) => { setInput({ ...input, cityId: e.target.value }); onSelectCity(e.target.value) }}>
                  {cities.filter((c) => placesInCity(c.ar).length > 0).map((c) => <option key={c.id} value={c.id}>{c.ar}</option>)}
                </select>
              </label>
              <div className="a-field">
                <span>عدد الأشخاص</span>
                <div className="a-stepper">
                  <button onClick={() => setInput({ ...input, people: Math.max(1, input.people - 1) })}><Minus size={14} /></button>
                  <b>{input.people}</b>
                  <button onClick={() => setInput({ ...input, people: Math.min(20, input.people + 1) })}><Plus size={14} /></button>
                </div>
              </div>
              <label className="a-field">
                <span>الميزانية الإجمالية (ر.س)</span>
                <input type="number" min={0} step={50} value={input.budget} onChange={(e) => setInput({ ...input, budget: Number(e.target.value) })} />
              </label>
              <label className="a-field">
                <span>التاريخ</span>
                <input type="date" value={input.date} onChange={(e) => setInput({ ...input, date: e.target.value })} />
              </label>
              <label className="a-field">
                <span>وقت البداية</span>
                <input type="time" value={input.startTime} onChange={(e) => setInput({ ...input, startTime: e.target.value })} />
              </label>
              <label className="a-field">
                <span>مدة الطلعة: {input.durationHours} ساعات</span>
                <input type="range" min={3} max={12} step={1} value={input.durationHours} onChange={(e) => setInput({ ...input, durationHours: Number(e.target.value) })} />
              </label>
            </div>
            <div className="a-field a-field--wide">
              <span>نوع المجموعة</span>
              <div className="a-segments">
                {(['family', 'friends', 'solo'] as const).map((g) => (
                  <button key={g} className={input.group === g ? 'is-active' : ''} onClick={() => setInput({ ...input, group: g })}>
                    <Users size={15} /> {GROUP_LABEL[g]}
                  </button>
                ))}
              </div>
            </div>
            <div className="a-field a-field--wide">
              <span>ما الذي تريد رؤيته؟</span>
              <div className="a-prefs">
                {ALL_CATEGORIES.map((c) => (
                  <button key={c} className={input.prefs.includes(c) ? 'is-active' : ''} onClick={() => togglePref(c)}>
                    <CategoryIcon cat={c} size={14} /> {CATEGORY_META[c].label}
                  </button>
                ))}
              </div>
            </div>
            <div className="a-step-footer">
              <button className="a-next" onClick={() => setStep(2)}>إلى النبض <ArrowLeft size={15} /></button>
              <button className="a-skip" onClick={generate}>اقترح مباشرة</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="a-step">
            <div className="a-step-head">
              <span>الخطوة الثانية / النبض</span>
              <h2>لحظة صغيرة<br />قبل المسار.</h2>
              <p>نضيف الطقس الحقيقي للمدينة، ونراجع ما اخترته. لا نعرض ازدحامًا مباشرًا لعدم توفر مصدر يدعمه.</p>
            </div>
            <div className="a-review">
              <div className="a-review-weather">
                <CloudSun size={26} />
                <div>
                  <b>{selectedCity?.ar}</b>
                  <span>{weather ? `${weather.temperature}° · ${weatherLabel(weather.code)}` : 'الطقس غير متاح الآن'}</span>
                </div>
                <small>Open-Meteo · الآن</small>
              </div>
              <div className="a-review-line"><CalendarDays size={16} /><span>{formatDateAr(input.date)} · {displayTime(input.startTime)}</span></div>
              <div className="a-review-line"><Timer size={16} /><span>{input.durationHours} ساعات · {GROUP_LABEL[input.group]} · {input.people} أشخاص</span></div>
              <div className="a-review-line"><Wallet size={16} /><span>{formatNum(input.budget)} ر.س · توزيع مقترح لا أسعار أماكن</span></div>
              <div className="a-review-prefs">
                {input.prefs.map((c) => <span key={c}><CategoryIcon cat={c} size={12} /> {CATEGORY_META[c].label}</span>)}
              </div>
              <div className="a-review-note">
                <Info size={14} />
                <p>المحرّك قواعد شفافة، وليس ذكاءً اصطناعيًا. يرتّب الأماكن بحسب اختياراتك والقرب فقط، ويشرح السبب مع كل محطة.</p>
              </div>
            </div>
            <div className="a-step-footer">
              <button className="a-back" onClick={() => setStep(1)}><ArrowRight size={15} /> تعديل الإجابات</button>
              <button className="a-next" onClick={generate}>اكتب الطلعة <ArrowLeft size={15} /></button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="a-step a-step--plan">
            <div className="a-plan-head">
              <div>
                <span>الخطوة الثالثة / المسار</span>
                <h2>{plan?.summary.title ?? 'طلعتك'}</h2>
                <p>{plan ? `${formatDateAr(plan.input.date)} · بداية ${displayTime(plan.input.startTime)}` : 'لم تُنشأ خطة بعد.'}</p>
              </div>
              {plan && <span className="a-plan-badge">{plan.stops.length} محطات</span>}
            </div>
            {plan && (
              <>
                <div className="a-plan-metrics">
                  <div><Route size={16} /><b>{plan.summary.totalKm} كم</b><span>مسافة تقديرية</span></div>
                  <div><Timer size={16} /><b>{Math.floor(plan.summary.totalMin / 60)}س {plan.summary.totalMin % 60}د</b><span>إجمالي الوقت</span></div>
                  <div><Wallet size={16} /><b>{formatNum(plan.input.budget)} ر.س</b><span>ميزانيتك</span></div>
                  <div><Sparkles size={16} /><b>{routeStatus === 'ready' ? 'OSRM' : 'تقديري'}</b><span>مصدر المسار</span></div>
                </div>
                <div className="a-timeline">
                  {plan.stops.map((s, i) => (
                    <article className="a-stop" key={s.place.id}>
                      <div className="a-stop-time">
                        <b>{displayTime(s.arrival)}</b>
                        <span>{s.stayMin} د</span>
                      </div>
                      <div className="a-stop-line"><i>{String(i + 1).padStart(2, '0')}</i></div>
                      <div className="a-stop-body">
                        <span className="a-stop-cat"><CategoryIcon cat={s.place.cat} size={12} /> {CATEGORY_META[s.place.cat].label}</span>
                        <h3>{s.place.name}</h3>
                        <p>{s.reason}</p>
                        <div className="a-stop-meta">
                          <span><Navigation size={11} /> {s.travelKm} كم من المحطة السابقة</span>
                          <span><Timer size={11} /> {s.travelMin} د تنقل</span>
                        </div>
                        <div className="a-stop-actions">
                          <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="أعلى"><ArrowUp size={13} /></button>
                          <button onClick={() => move(i, 1)} disabled={i === plan.stops.length - 1} aria-label="أسفل"><ArrowDown size={13} /></button>
                          <button onClick={() => removeStop(s.place.id)} aria-label="حذف"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="a-budget">
                  <div><span>تجارب</span><b>{formatNum(plan.budget.experiences)} ر.س</b><i style={{ width: '40%' }} /></div>
                  <div><span>طعام وقهوة</span><b>{formatNum(plan.budget.food)} ر.س</b><i style={{ width: '35%' }} /></div>
                  <div><span>تنقل</span><b>{formatNum(plan.budget.transport)} ر.س</b><i style={{ width: '25%' }} /></div>
                  <p>توزيع مقترح لميزانيتك الإجمالية، وليس أسعارًا للأماكن.</p>
                </div>
                <div className="a-plan-actions">
                  <button className="a-next" onClick={() => setPlacesOpen((v) => !v)}><Plus size={14} /> أضف محطة</button>
                  <button className="a-skip" onClick={grenerateAgain}><Sparkles size={14} /> اقترح من جديد</button>
                  <button className="a-skip a-skip--danger" onClick={() => setPlan(null)}><Trash2 size={14} /> امسح الخطة</button>
                </div>
                {placesOpen && (
                  <div className="a-add-list thin-scroll">
                    {cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).slice(0, 10).map((p) => (
                      <button key={p.id} onClick={() => addPlace(p)}>
                        <CategoryIcon cat={p.cat} size={13} />
                        <span><b>{p.name}</b><small>{p.kind}</small></span>
                        <Plus size={13} />
                      </button>
                    ))}
                  </div>
                )}
                {plan.alternatives.length > 0 && (
                  <div className="a-alts">
                    <span>بدائل قريبة</span>
                    <div>
                      {plan.alternatives.map((p) => (
                        <button key={p.id} onClick={() => addPlace(p)}>
                          <b>{p.name}</b><small>{CATEGORY_META[p.cat].label}</small><Plus size={12} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="a-plan-source">
                  <ShieldCheck size={13} />
                  <p>{plan.summary.note} الطقس: Open-Meteo. المسار: {routeStatus === 'ready' ? 'OSRM' : 'تقدير خطي'}.</p>
                </div>
                <EventsState compact />
              </>
            )}
            {!plan && (
              <div className="a-empty"><Compass size={22} /><b>لم تُنشأ خطة بعد</b><p>ابدأ من الخطوة الأولى.</p><button className="a-next" onClick={() => setStep(1)}>ابدأ</button></div>
            )}
          </div>
        )}
      </div>
    </div>
  )

  function grenerateAgain() {
    setPlan(buildPlan(input))
  }
}
