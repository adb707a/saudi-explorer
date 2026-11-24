import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowDown, ArrowLeft, ArrowUp, Check, ChevronLeft,
  CloudSun, Compass, GripVertical, Heart, Info, MapPin, Minus, Moon, Navigation,
  Plus, Route, Search, ShieldCheck, Sparkles, Sun, Ticket, Trash2, User, Users,
  Wallet, X,
} from 'lucide-react'
import type { Map as MlMap } from 'maplibre-gl'
import { addPoiLayers, addRouteLayer, addSelectedMarker, bindCityLabelZoom, createMap, fitSaudi, maplibregl } from '../../maps/base'
import {
  ALL_CATEGORIES, CATEGORY_META, cities, cityById, directionsUrl,
  displayTime, featuredCities, formatDateAr, formatNum, placesInCity, weatherLabel,
} from '../../lib/catalog'
import { buildPlan, defaultPlanInput, resequencePlan } from '../../lib/planner'
import { useDriveRoute, useLocalTheme, useWeather } from '../../lib/hooks'
import type { Category, City, Plan, PlanInput, Place } from '../../lib/types'
import { CategoryIcon } from '../../components/CategoryIcon'
import { ArtTile } from '../../components/ArtTile'
import { EventsState } from '../../components/EventsState'
import { SourceLine } from '../../components/SourceLine'
import { GlobeIntro } from '../../components/GlobeIntro'
import './darb.css'

type BoardTab = 'discover' | 'trip'

export function DarbApp() {
  const { theme, toggle } = useLocalTheme('darb', 'light')
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
  const [tab, setTab] = useState<BoardTab>('discover')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [planOpen, setPlanOpen] = useState(false)
  const [cityPicking, setCityPicking] = useState(false)
  const [stage, setStage] = useState<'intro' | 'leaving' | 'explore'>('intro')
  const [globeRevealed, setGlobeRevealed] = useState(false)
  const [globeSettled, setGlobeSettled] = useState(false)
  const [globeFailed, setGlobeFailed] = useState(false)
  const stageRef = useRef(stage)
  stageRef.current = stage
  const { weather } = useWeather(city?.id ?? null)
  const { route, status: routeStatus } = useDriveRoute(plan)
  const poiList = useMemo(() => (city ? placesInCity(city.ar) : []), [city?.id])
  placesRef.current = poiList
  const filtered = filter === 'all' ? poiList : poiList.filter((p) => p.cat === filter)

  const refs = useRef({ onCity: (_c: City) => {}, onPlace: (_p: Place) => {} })
  refs.current.onCity = (c) => {
    setCity(c); setPlace(null); setFilter('all'); setTab('discover')
    if (plan && plan.input.cityId !== c.id) setPlan(null)
  }
  refs.current.onPlace = (p) => setPlace(p)

  useEffect(() => {
    if (!mapEl.current) return
    let cancelled = false
    setMapReady(false); setError('')
    createMap(mapEl.current, 'darb', {
      dark, center: [45, 24], zoom: 4.9,
      minZoom: 1.1, maxZoom: 16.5,
    }).then((map) => {
      if (cancelled) { map.remove(); return }
      mapRef.current = map
      map.on('load', () => {
        if (cancelled) return
        fitSaudi(map)
        setMapReady(true)
        featuredCities.forEach((c) => {
          const el = document.createElement('button')
          el.type = 'button'
          el.className = 'd-city'
          if (!['riyadh', 'jeddah', 'dammam', 'madinah', 'tabuk', 'abha', 'hail', 'alula'].includes(c.id)) {
            el.dataset.labelMinZoom = '6.4'
          }
          el.setAttribute('aria-label', `استكشف ${c.ar}`)
          el.innerHTML = `<span class="d-city-pin"></span><span class="d-city-label"><b>${c.ar}</b><i>${c.en}</i></span>`
          el.addEventListener('click', (e) => {
            e.stopPropagation()
            map.flyTo({ center: [c.lng, c.lat], zoom: 10.4, duration: 1350 })
            refs.current.onCity(c)
          })
          markersRef.current.push(new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([c.lng, c.lat]).addTo(map))
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
        const hit = map.queryRenderedFeatures(e.point, { layers: ['poi-points'] })
        if (hit.length) {
          const p = placesRef.current.find((x) => x.id === String(hit[0].properties?.id))
          if (p) refs.current.onPlace(p)
        }
      })
      map.on('mousemove', (e) => {
        map.getCanvas().style.cursor = map.queryRenderedFeatures(e.point, { layers: ['poi-clusters', 'poi-points'] }).length ? 'pointer' : ''
      })
    }).catch((e: Error) => { if (!cancelled) setError(e.message || 'تعذر تحميل الخريطة') })
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
      const on = city && m.getElement().querySelector('.d-city-label b')?.textContent === city.ar
      m.getElement().classList.toggle('is-on', !!on)
    })
  }, [city, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addPoiLayers(map, filtered, 'darb', dark)
  }, [city?.id, filter, mapReady, dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addSelectedMarker(map, place, 'darb', dark)
  }, [place, mapReady, dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapReady) return
    addRouteLayer(map, plan ? route : null, 'darb')
  }, [route, plan, mapReady])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !plan?.stops.length || !mapReady) return
    const b = new maplibregl.LngLatBounds()
    plan.stops.forEach((s) => b.extend([s.place.lng, s.place.lat]))
    map.fitBounds(b, { padding: { top: 80, bottom: 100, left: 80, right: 460 }, duration: 1100, maxZoom: 12.5 })
  }, [plan?.id, mapReady])

  const chooseCity = (c: City) => {
    mapRef.current?.flyTo({ center: [c.lng, c.lat], zoom: 10.4, duration: 1300 })
    setCity(c); setPlace(null); setFilter('all'); setTab('discover'); setCityPicking(false)
    if (plan && plan.input.cityId !== c.id) setPlan(null)
  }
  const reset = () => {
    if (mapRef.current) fitSaudi(mapRef.current, true)
    setCity(null); setPlace(null)
  }
  const jump = (p: Place) => {
    mapRef.current?.flyTo({ center: [p.lng, p.lat], zoom: 14.3, duration: 750 })
    setPlace(p)
  }
  const openPlanner = () => {
    if (!plan) setPlan(buildPlan(defaultPlanInput(city?.id ?? 'riyadh')))
    setPlanOpen(true)
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
    if (skip) { setGlobeRevealed(true); setGlobeSettled(true) }
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

  return (
    <div className={`darb ${dark ? 'is-night' : ''} ${stage === 'intro' ? 'is-intro' : stage === 'leaving' ? 'is-leaving' : 'is-explore'}`} dir="rtl">
      {stage !== 'explore' && (
        <div className="d-intro">
          <GlobeIntro
            variant="darb"
            phase={stage === 'leaving' ? 'leaving' : 'intro'}
            onReveal={() => setGlobeRevealed(true)}
            onSettled={() => setGlobeSettled(true)}
            onArrived={finishEntry}
            onFail={() => { setGlobeFailed(true); setGlobeRevealed(true); setGlobeSettled(true) }}
          />
          <div className="d-intro-topline">
            <span>طلعة <i>/</i> درب</span>
            <span>٠١ — الكوكب أولًا</span>
          </div>
          <div className={`d-intro-copy ${globeRevealed ? 'is-ready' : ''}`}>
            <span className="d-intro-eyebrow">كرة أرضية حقيقية · ثلاثية الأبعاد</span>
            <h1>الكوكب<br /><em>يسع طلعة.</em></h1>
            <p>من الفضاء إلى السعودية، ثم إلى مدنك وأماكنك وطلعاتك. اختر البداية، والباقي علينا.</p>
          </div>
          <div className="d-intro-cta">
            <button className="d-intro-start" onClick={() => enter()} disabled={!globeSettled || stage === 'leaving'}>
              يلا نستكشف <ArrowLeft size={16} />
            </button>
            <span>اسحب الكرة لتلفّها</span>
          </div>
          <div className="d-intro-sticker" aria-hidden="true">أهلًا<br /><small>في طلعة</small></div>
          <div className="d-intro-doodle" aria-hidden="true">
            <svg viewBox="0 0 200 100"><path d="M8 70 C 45 20, 70 90, 110 55 S 165 15, 190 58" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 7" strokeLinecap="round" /><circle cx="10" cy="70" r="4" fill="currentColor" /><circle cx="190" cy="58" r="4" fill="currentColor" /></svg>
          </div>
          <div className="d-intro-foot">
            <span>{globeRevealed ? 'السعودية في المركز' : 'الكوكب يستدير…'}</span>
            <span>Globe / NASA textures</span>
          </div>
          <button className="d-intro-skip" onClick={() => enter(true)}>تخطّي المشهد</button>
          {!globeRevealed && <div className="d-intro-loading"><i /> نستدير نحو السعودية…</div>}
        </div>
      )}
      {stage === 'explore' && (
      <>
      <header className="d-nav">
        <a className="d-brand" href="#/">
          <span className="d-logo"><span>د</span></span>
          <span><b>درب</b><small>طلعات على كيفك</small></span>
        </a>
        <nav className="d-nav-center" aria-label="التنقل">
          <button className="is-on" onClick={reset}><MapPin size={14} /> استكشف</button>
          <button onClick={() => { setTab('trip'); setPlanOpen(false) }}><Ticket size={14} /> طلعتي</button>
          <button onClick={() => setCityPicking(true)}><Search size={14} /> المدن</button>
        </nav>
        <div className="d-nav-actions">
          <button className="d-round" onClick={toggle} aria-label="وضع داكن/فاتح">{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
          <button className="d-plan" onClick={openPlanner}><Sparkles size={15} /> خطط طلعتك</button>
          <a className="d-home" href="#/" aria-label="أرض"><ArrowLeft size={15} /></a>
        </div>
      </header>

      <main className="d-main">
        <section className="d-map-card">
          <div ref={mapEl} className="map-canvas" />
          {!mapReady && !error && <div className="map-loading d-loading"><span><i /> نجهز الخريطة…</span></div>}
          {error && <div className="d-map-error"><Info size={18} /><b>الخريطة ما تحمّلت</b><span>{error}</span><button onClick={() => location.reload()}>جرّب مرة ثانية</button></div>}
          <div className="d-map-tape" aria-hidden="true">خريطة سعودية · ٢٠٢٦</div>
          <div className="d-map-head">
            <span className="d-pill"><Compass size={12} /> على كيفك</span>
            <h1>{city ? city.ar : 'وين نروح؟'}</h1>
            <p>{city ? `${city.region} · اختر مكانًا وشوف بطاقته` : 'قرّب على أي مدينة، أو اسحب الخريطة واستكشف.'}</p>
          </div>
          {!city && (
            <div className="d-map-cta">
              <span>ما تحتاج تجاوب أسئلة عشان تستكشف</span>
              <button onClick={() => setCityPicking(true)}>اختر مدينة <ChevronLeft size={14} /></button>
            </div>
          )}
          <div className="d-map-tools">
            <button onClick={() => mapRef.current?.zoomIn()} aria-label="تكبير"><Plus size={16} /></button>
            <button onClick={() => mapRef.current?.zoomOut()} aria-label="تصغير"><Minus size={16} /></button>
            <button onClick={reset} aria-label="كل السعودية"><Compass size={16} /></button>
          </div>
          <div className="d-map-sticker d-map-sticker--sun" aria-hidden="true">☀</div>
          <div className="d-map-sticker d-map-sticker--note" aria-hidden="true"><b>ملاحظة</b><span>الخريطة تتحرك.<br />جرّب تسحبها.</span></div>
          <div className="d-map-legend">
            <span><i className="is-food" /> أكل</span><span><i className="is-nature" /> طبيعة</span><span><i className="is-culture" /> ثقافة</span>
          </div>
          <div className="d-city-carousel">
            <div className="d-carousel-head"><b>مدن ننصح بها</b><span>{featuredCities.length}</span></div>
            <div className="d-carousel-track thin-scroll">
              {featuredCities.map((c) => (
                <button key={c.id} className={city?.id === c.id ? 'is-on' : ''} onClick={() => chooseCity(c)}>
                  <span>{c.ar}</span><small>{c.en}</small>
                </button>
              ))}
            </div>
          </div>
        </section>

        <aside className="d-board">
          <header className="d-board-head">
            <div>
              <span>{city ? 'بطاقة المدينة' : 'أهلًا في درب'}</span>
              <h2>{city ? city.ar : 'وش تحب تسوي؟'}</h2>
            </div>
            <button className="d-city-pick" onClick={() => setCityPicking(true)}><MapPin size={13} /> {city ? 'غيّر' : 'اختر مدينة'}</button>
          </header>

          <div className="d-tabs">
            <button className={tab === 'discover' ? 'is-on' : ''} onClick={() => setTab('discover')}><Compass size={13} /> اكتشف</button>
            <button className={tab === 'trip' ? 'is-on' : ''} onClick={() => setTab('trip')}><Ticket size={13} /> طلعتي {plan ? <i>{plan.stops.length}</i> : null}</button>
          </div>

          {tab === 'discover' && (
            <div className="d-discover thin-scroll">
              {!city && (
                <>
                  <div className="d-hello-card">
                    <span className="d-hello-kicker">دربك يبدأ من هنا</span>
                    <p>اختر مدينة، شوف الأماكن المتوفرة، وجهّز طلعة على مزاجك. الأماكن كلها من بيانات موثقة، والصور رسوم لا صور مزيفة.</p>
                    <button onClick={() => setCityPicking(true)}><MapPin size={14} /> اختر محطة البداية</button>
                  </div>
                  <div className="d-category-bubbles">
                    {ALL_CATEGORIES.map((c) => (
                      <button key={c} onClick={() => { setCityPicking(true) }}>
                        <span style={{ background: CATEGORY_META[c].soft, color: CATEGORY_META[c].color }}><CategoryIcon cat={c} size={18} /></span>
                        <b>{CATEGORY_META[c].label}</b>
                      </button>
                    ))}
                  </div>
                  <div className="d-today">
                    <div className="d-sticker-title"><span>لقطات اليوم</span><small>من الخريطة</small></div>
                    <div className="d-mini-cities">
                      {featuredCities.slice(0, 4).map((c, i) => (
                        <button key={c.id} onClick={() => chooseCity(c)} style={{ transform: `rotate(${i % 2 ? 1.5 : -1.5}deg)` }}>
                          <b>{c.ar}</b><small>{c.en}</small><span>{placesInCity(c.ar).length} مكان</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <EventsState compact />
                </>
              )}

              {city && (
                <>
                  <div className="d-city-weather">
                    <span className="d-weather-icon"><CloudSun size={20} /></span>
                    <div><b>{weather ? `${weather.temperature}°` : '—'}</b><span>{weather ? weatherLabel(weather.code) : 'الطقس…'}</span></div>
                    <span className="d-weather-src">Open-Meteo</span>
                    <span className="d-weather-count">{poiList.length} مكان</span>
                  </div>
                  <div className="d-filters" aria-label="أصناف الأماكن">
                    <button className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>الكل</button>
                    {ALL_CATEGORIES.filter((c) => poiList.some((p) => p.cat === c)).map((c) => (
                      <button key={c} className={filter === c ? 'is-on' : ''} onClick={() => setFilter(c)}>
                        <CategoryIcon cat={c} size={13} /> {CATEGORY_META[c].short}
                      </button>
                    ))}
                  </div>
                  {filtered.length === 0 ? (
                    <div className="d-empty">
                      <span>⊙</span>
                      <b>ما فيه أماكن مفصّلة هنا</b>
                      <p>نعرض المدينة، لكن لقطة الأماكن ما تغطيها. ما بنخترع أسماء.</p>
                      <button onClick={() => setCityPicking(true)}>جرّب مدينة ثانية</button>
                    </div>
                  ) : (
                    <div className="d-cards">
                      {filtered.slice(0, 8).map((p, i) => (
                        <button className="d-place-card" key={p.id} onClick={() => jump(p)} style={{ ['--i' as string]: i }}>
                          <span className="d-card-art"><ArtTile place={p} ratio="1 / 1" /></span>
                          <span className="d-card-copy">
                            <span className="d-card-cat"><CategoryIcon cat={p.cat} size={11} /> {p.kind}</span>
                            <b>{p.name}</b>
                            <small>{p.nameEn || CATEGORY_META[p.cat].label}</small>
                            <span className="d-card-cta">شوف على الخريطة <ArrowLeft size={12} /></span>
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                  <button className="d-board-plan" onClick={openPlanner}><Sparkles size={15} /> خطط طلعتك هنا</button>
                </>
              )}
            </div>
          )}

          {tab === 'trip' && (
            <div className="d-trip thin-scroll">
              {plan ? (
                <>
                  <div className="d-trip-ticket">
                    <div className="d-trip-top">
                      <span className="d-trip-kicker">تذكرة طلعة</span>
                      <span className="d-trip-code">#{plan.input.cityId.toUpperCase()}-{String(plan.stops.length).padStart(2, '0')}</span>
                    </div>
                    <h3>{plan.summary.title}</h3>
                    <p>{formatDateAr(plan.input.date)} · {displayTime(plan.input.startTime)}</p>
                    <div className="d-trip-stats">
                      <span><b>{plan.summary.totalKm}</b> كم</span>
                      <span><b>{plan.stops.length}</b> محطات</span>
                      <span><b>{formatNum(plan.input.budget)}</b> ر.س</span>
                    </div>
                    <div className="d-trip-dots" />
                    <div className="d-trip-stops">
                      {plan.stops.map((s, i) => (
                        <div key={s.place.id}>
                          <span className="d-trip-num">{i + 1}</span>
                          <span><b>{s.place.name}</b><small>{displayTime(s.arrival)} · {s.stayMin} د</small></span>
                          <i><CategoryIcon cat={s.place.cat} size={11} /></i>
                        </div>
                      ))}
                    </div>
                    <div className="d-trip-bottom"><span>{routeStatus === 'ready' ? 'مسار قيادة حقيقي' : 'مسار تقديري'}</span><span>درب</span></div>
                  </div>
                  <button className="d-board-plan" onClick={openPlanner}><Route size={14} /> عدّل الطلعة</button>
                  <button className="d-clear" onClick={() => setPlan(null)}><Trash2 size={13} /> امسح الخطة</button>
                </>
              ) : (
                <div className="d-empty d-empty--trip">
                  <span>ت</span>
                  <b>ما فيه طلعة بعد</b>
                  <p>خلّنا نرتب لك يوم حلو. خطوتين وتخلص.</p>
                  <button className="d-board-plan" onClick={openPlanner}><Sparkles size={14} /> سوِّ طلعتك</button>
                </div>
              )}
            </div>
          )}
          <footer className="d-board-foot"><ShieldCheck size={12} /> OpenStreetMap · Open-Meteo · OSRM</footer>
        </aside>
      </main>

      <div className="d-dock">
        <button className="is-on" onClick={reset}><Compass size={17} /><span>استكشف</span></button>
        <button onClick={() => setCityPicking(true)}><Search size={17} /><span>المدن</span></button>
        <button className="d-dock-main" onClick={openPlanner}><Sparkles size={18} /><span>خطط</span></button>
        <button onClick={() => setTab('trip')}><Ticket size={17} /><span>طلعتي</span></button>
        <button onClick={toggle}>{dark ? <Sun size={17} /> : <Moon size={17} />}<span>الوضع</span></button>
      </div>

      {cityPicking && (
        <div className="d-modal" role="dialog" aria-modal="true" aria-label="اختيار مدينة">
          <button className="d-modal-bg" onClick={() => setCityPicking(false)} aria-label="إغلاق" />
          <div className="d-city-modal">
            <header><div><span>اختار محطتك</span><h2>وين تبي تروح؟</h2></div><button onClick={() => setCityPicking(false)}><X size={18} /></button></header>
            <div className="d-city-search"><Search size={15} /><input placeholder="ابحث باسم المدينة" onChange={(e) => {
              const q = e.target.value.trim()
              document.querySelectorAll<HTMLElement>('.d-city-option').forEach((el) => {
                el.style.display = !q || el.dataset.name?.includes(q) ? '' : 'none'
              })
            }} /></div>
            <div className="d-city-grid thin-scroll">
              {cities.filter((c) => c.featured || placesInCity(c.ar).length > 0).map((c) => (
                <button className="d-city-option" data-name={`${c.ar} ${c.en}`} key={c.id} onClick={() => chooseCity(c)}>
                  <span className="d-city-dot" style={{ background: c.featured ? 'var(--brand-clay)' : 'var(--brand-palm)' }} />
                  <span><b>{c.ar}</b><small>{c.en}</small></span>
                  <i>{placesInCity(c.ar).length || '—'}</i>
                </button>
              ))}
            </div>
            <p className="d-modal-note">المدن بلا رقم لا تحتوي أماكن في لقطة البيانات الحالية، لكن الخريطة تصلها.</p>
          </div>
        </div>
      )}

      {place && (
        <div className="d-place-modal" role="dialog" aria-modal="true" aria-label={place.name}>
          <button className="d-modal-bg" onClick={() => setPlace(null)} aria-label="إغلاق" />
          <article className="d-place-sheet">
            <button className="d-sheet-close" onClick={() => setPlace(null)}><X size={17} /></button>
            <div className="d-sheet-art"><ArtTile place={place} ratio="16 / 9" /><span className="d-sheet-sticker">بطاقة مكان</span></div>
            <div className="d-sheet-body">
              <span className="d-sheet-kicker">{CATEGORY_META[place.cat].label} · {place.city}</span>
              <h2>{place.name}</h2>
              <p>{place.kind}{place.nameEn ? ` · ${place.nameEn}` : ''}</p>
              <div className="d-sheet-tags">
                <span><ShieldCheck size={12} /> مصدر OSM</span>
                <span><Info size={12} /> بدون تقييمات</span>
                <span><Wallet size={12} /> بدون سعر</span>
              </div>
              <div className="d-sheet-note"><Info size={14} /><p>الصورة رسم توضيحي، وليست صورة للمكان. لا نعرض تقييمات أو أسعارًا أو ساعات عمل بلا مصدر موثوق.</p></div>
              <div className="d-sheet-actions">
                <a href={directionsUrl(place)} target="_blank" rel="noreferrer noopener"><Navigation size={14} /> اتجاهات</a>
                <button onClick={() => {
                  const base = plan ?? buildPlan(defaultPlanInput(city?.id ?? 'riyadh'))
                  if (!base.stops.some((s) => s.place.id === place.id)) setPlan(resequencePlan(base, [...base.stops.map((s) => s.place), place]))
                  setPlace(null); setPlanOpen(true)
                }}><Plus size={14} /> أضفها للطلعة</button>
              </div>
              <SourceLine place={place} />
            </div>
          </article>
        </div>
      )}

      {planOpen && (
        <DarbPlanner
          plan={plan}
          setPlan={setPlan}
          initialCity={city}
          routeStatus={routeStatus}
          onClose={() => setPlanOpen(false)}
          onPickCity={(id) => { const c = cityById(id); if (c) { setCity(c); if (plan && plan.input.cityId !== id) setPlan(null) } }}
        />
      )}
      </>)}
    </div>
  )
}

function DarbPlanner({
  plan, setPlan, initialCity, routeStatus, onClose, onPickCity,
}: {
  plan: Plan | null
  setPlan: (p: Plan | null) => void
  initialCity: City | null
  routeStatus: string
  onClose: () => void
  onPickCity: (id: string) => void
}) {
  const [step, setStep] = useState(1)
  const [input, setInput] = useState<PlanInput>(() => plan?.input ?? defaultPlanInput(initialCity?.id ?? 'riyadh'))
  const [dragged, setDragged] = useState<number | null>(null)
  const city = cityById(input.cityId)
  const cityPlaces = city ? placesInCity(city.ar) : []
  const togglePref = (c: Category) => setInput((s) => ({ ...s, prefs: s.prefs.includes(c) ? s.prefs.filter((x) => x !== c) : [...s.prefs, c] }))
  const generate = () => { setPlan(buildPlan(input)); setStep(3) }
  const move = (i: number, dir: number) => {
    if (!plan) return
    const next = [...plan.stops]
    const to = i + dir
    if (to < 0 || to >= next.length) return
    ;[next[i], next[to]] = [next[to], next[i]]
    setPlan(resequencePlan(plan, next.map((s) => s.place)))
  }
  const dropAt = (target: number) => {
    if (!plan || dragged === null || dragged === target) return
    const next = [...plan.stops]
    const [moved] = next.splice(dragged, 1)
    next.splice(target, 0, moved)
    setPlan(resequencePlan(plan, next.map((s) => s.place)))
    setDragged(null)
  }
  const remove = (id: string) => plan && setPlan(resequencePlan(plan, plan.stops.filter((s) => s.place.id !== id).map((s) => s.place)))
  const add = (p: Place) => plan && setPlan(resequencePlan(plan, [...plan.stops.map((s) => s.place), p]))

  return (
    <div className="d-planner" role="dialog" aria-modal="true" aria-label="مخطط الطلعة">
      <button className="d-modal-bg" onClick={onClose} aria-label="إغلاق" />
      <div className="d-planner-sheet">
        <header className="d-planner-head">
          <div><span>دفتر الطلعة / درب</span><h2>{step === 3 ? 'هذي طلعتك' : 'نرتبها سوا'}</h2></div>
          <div className="d-step-dots">
            {[1, 2, 3].map((n) => <button key={n} className={step === n ? 'is-on' : step > n ? 'is-done' : ''} onClick={() => setStep(n)}>{step > n ? <Check size={11} /> : n}</button>)}
          </div>
          <button className="d-planner-close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </header>

        <div className="d-planner-body thin-scroll">
          {step === 1 && (
            <div className="d-step-page">
              <div className="d-big-q"><span>أول شي</span><h3>مين معك؟</h3></div>
              <div className="d-groups">
                {([
                  ['family', Users, 'عائلة', 'وقت أهدأ'],
                  ['friends', Heart, 'أصدقاء', 'قهوة ووناسة'],
                  ['solo', User, 'لحالي', 'على راحتي'],
                ] as const).map(([g, Icon, label, sub]) => (
                  <button key={g} className={input.group === g ? 'is-on' : ''} onClick={() => setInput({ ...input, group: g })}>
                    <span><Icon size={20} /></span><b>{label}</b><small>{sub}</small>
                  </button>
                ))}
              </div>
              <div className="d-two">
                <label className="d-big-field"><span>عددكم</span><div><button onClick={() => setInput({ ...input, people: Math.max(1, input.people - 1) })}><Minus size={14} /></button><b>{input.people}</b><button onClick={() => setInput({ ...input, people: Math.min(20, input.people + 1) })}><Plus size={14} /></button></div></label>
                <label className="d-big-field"><span>المدينة</span><select value={input.cityId} onChange={(e) => { setInput({ ...input, cityId: e.target.value }); onPickCity(e.target.value) }}>{cities.filter((c) => placesInCity(c.ar).length > 0).map((c) => <option key={c.id} value={c.id}>{c.ar}</option>)}</select></label>
              </div>
              <div className="d-step-nav"><span /><button className="d-next" onClick={() => setStep(2)}>التالي <ChevronLeft size={15} /></button></div>
            </div>
          )}

          {step === 2 && (
            <div className="d-step-page">
              <div className="d-big-q"><span>ثاني شي</span><h3>وش يعجبك؟</h3></div>
              <div className="d-pref-grid">
                {ALL_CATEGORIES.map((c) => (
                  <button key={c} className={input.prefs.includes(c) ? 'is-on' : ''} onClick={() => togglePref(c)}>
                    <span style={{ background: CATEGORY_META[c].soft, color: CATEGORY_META[c].color }}><CategoryIcon cat={c} size={18} /></span>
                    <b>{CATEGORY_META[c].label}</b>
                    {input.prefs.includes(c) && <i><Check size={11} /></i>}
                  </button>
                ))}
              </div>
              <div className="d-two d-two--three">
                <label className="d-big-field"><span>الميزانية (ر.س)</span><input type="number" min={0} step={50} value={input.budget} onChange={(e) => setInput({ ...input, budget: Number(e.target.value) })} /></label>
                <label className="d-big-field"><span>التاريخ</span><input type="date" value={input.date} onChange={(e) => setInput({ ...input, date: e.target.value })} /></label>
                <label className="d-big-field"><span>الوقت</span><input type="time" value={input.startTime} onChange={(e) => setInput({ ...input, startTime: e.target.value })} /></label>
              </div>
              <label className="d-duration"><span>كم ساعة؟ <b>{input.durationHours}</b></span><input type="range" min={3} max={12} value={input.durationHours} onChange={(e) => setInput({ ...input, durationHours: Number(e.target.value) })} /></label>
              <div className="d-honest-note"><Info size={14} /><p>بنقترح من الأماكن المتوفرة في اللقطة، وبالترتيب الأقرب. ما عندنا تقييمات أو أسعار أو ساعات عمل، فما بنخترعها.</p></div>
              <div className="d-step-nav"><button className="d-back" onClick={() => setStep(1)}>رجوع</button><button className="d-next" onClick={generate}>يالله سوِّها <Sparkles size={14} /></button></div>
            </div>
          )}

          {step === 3 && (
            <div className="d-step-page d-step-page--plan">
              {!plan ? (
                <div className="d-empty d-empty--trip"><b>ما فيه خطة</b><button className="d-next" onClick={() => setStep(1)}>ابدأ</button></div>
              ) : (
                <>
                  <div className="d-plan-summary">
                    <div><span>المحطات</span><b>{plan.stops.length}</b></div>
                    <div><span>المسافة</span><b>{plan.summary.totalKm} كم</b></div>
                    <div><span>الوقت</span><b>{Math.floor(plan.summary.totalMin / 60)}س {plan.summary.totalMin % 60}د</b></div>
                    <div><span>الميزانية</span><b>{formatNum(plan.input.budget)} ر.س</b></div>
                  </div>
                  <div className="d-route-hint"><GripVertical size={13} /> اسحب البطاقات أو استخدم الأسهم لتغيير الترتيب</div>
                  <div className="d-ticket-stack">
                    {plan.stops.map((s, i) => (
                      <article
                        key={s.place.id}
                        className={`d-stop-ticket ${dragged === i ? 'is-dragging' : ''}`}
                        draggable
                        onDragStart={() => setDragged(i)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => dropAt(i)}
                        onDragEnd={() => setDragged(null)}
                      >
                        <div className="d-stop-ticket-side">
                          <span>{i + 1}</span>
                          <i><CategoryIcon cat={s.place.cat} size={13} /></i>
                        </div>
                        <div className="d-stop-ticket-main">
                          <div className="d-stop-ticket-head">
                            <span>{displayTime(s.arrival)} — {displayTime(s.departure)}</span>
                            <b>{s.stayMin} د</b>
                          </div>
                          <h4>{s.place.name}</h4>
                          <p>{s.reason}</p>
                          <div className="d-stop-ticket-meta"><span><Navigation size={10} /> {s.travelKm} كم</span><span><Route size={10} /> {s.travelMin} د</span><span>{CATEGORY_META[s.place.cat].label}</span></div>
                          <div className="d-stop-ticket-actions">
                            <button onClick={() => move(i, -1)} disabled={i === 0}><ArrowUp size={12} /></button>
                            <button onClick={() => move(i, 1)} disabled={i === plan.stops.length - 1}><ArrowDown size={12} /></button>
                            <button onClick={() => remove(s.place.id)}><Trash2 size={12} /></button>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  <div className="d-plan-extra">
                    <div><span>توزيع الميزانية</span><b>{plan.budget.experiences} تجارب · {plan.budget.food} طعام · {plan.budget.transport} تنقل</b><small>توزيع مقترح فقط، ليس أسعار الأماكن.</small></div>
                    <div><span>مصدر المسار</span><b>{routeStatus === 'ready' ? 'OSRM — مسار قيادة' : 'تقدير خطي'}</b><small>يتحدث تلقائيًا عند توفر الخدمة.</small></div>
                  </div>
                  <div className="d-add-more">
                    <span>زيد محطة؟</span>
                    <div>{cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).slice(0, 5).map((p) => <button key={p.id} onClick={() => add(p)}><Plus size={11} />{p.name}</button>)}</div>
                  </div>
                  <EventsState compact />
                  <div className="d-step-nav">
                    <button className="d-back" onClick={() => setStep(2)}>تعديل</button>
                    <button className="d-next" onClick={onClose}><Check size={14} /> خلصنا، شوف الخريطة</button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <footer className="d-planner-foot"><span>لا أسعار مخترعة</span><span>بيانات مفتوحة</span><span>درب ٠٣</span></footer>
      </div>
    </div>
  )
}
