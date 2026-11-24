import { useEffect, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowUpLeft,
  ArrowDown,
  ArrowUp,
  CalendarDays,
  ChevronLeft,
  CloudSun,
  Compass,
  LocateFixed,
  Minus,
  Moon,
  Navigation,
  Plus,
  Route,
  Sparkles,
  Sun,
  Timer,
  Trash2,
  Wallet,
  X,
} from 'lucide-react'
import { useExplorer } from '../../lib/useExplorer'
import { maplibregl, SAUDI_BOUNDS, SAUDI_PADDING } from '../../maps/engine'
import { OrbitGlobe, type OrbitGlobePhase } from '../../globe/OrbitGlobe'
import { ALL_CATEGORIES, CATEGORY_META, cities, cityById, directionsUrl, displayTime, featuredCities, formatDateAr, formatNum, places, placesInCity, weatherLabel } from '../../lib/catalog'
import { defaultPlanInput, GROUP_LABEL } from '../../lib/planner'
import type { Category, Plan, PlanInput, Place } from '../../lib/types'
import { CategoryIcon } from '../../components/CategoryIcon'
import { PlaceArt } from '../../ui/PlaceArt'
import { SourceNote, EventsNote } from '../../ui/Honesty'
import { cityTheme, ENV_LABEL } from '../../ui/cityTheme'
import { CityBackdrop } from '../../ui/CityBackdrop'
import '../../globe/orbitGlobe.css'
import './orbit.css'

export function OrbitApp() {
  const x = useExplorer({ id: 'orbit', accent: '#7c6dff', defaultDark: true, pitch: 46, bearing: -12, maxPitch: 60 })
  const [globeReady, setGlobeReady] = useState(false)
  const [globePhase, setGlobePhase] = useState<OrbitGlobePhase>('idle')
  const [globeFailed, setGlobeFailed] = useState(false)
  const [approaching, setApproaching] = useState(false)
  const [landing, setLanding] = useState(false)
  const landingTimer = useRef<number | null>(null)
  const finalView = useRef<{ center: [number, number]; zoom: number } | null>(null)
  const theme = x.city ? cityTheme(x.city.id) : null
  const uiAccent = theme ? (x.dark ? theme.accentDark : theme.accent) : x.accent
  const canLaunch = (globeReady || globeFailed) && (x.mapReady || !!x.loadError)

  useEffect(() => () => {
    if (landingTimer.current) window.clearTimeout(landingTimer.current)
  }, [])

  const start = () => {
    if (globeFailed) {
      x.finishEntry()
      return
    }
    setGlobePhase('flying')
    // Park the hidden map on the exact camera the globe lands on, so the
    // dissolve happens between two views of the same place at the same scale.
    const map = x.mapRef.current
    if (map) {
      const cam = map.cameraForBounds(SAUDI_BOUNDS, { padding: SAUDI_PADDING })
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const center = cam?.center ? maplibregl.LngLat.convert(cam.center) : null
      if (center && typeof cam?.zoom === 'number') {
        finalView.current = { center: [center.lng, center.lat], zoom: cam.zoom }
        // Land a touch wider than the final frame: the globe's perspective
        // shows the country smaller than a flat map at the same field of view.
        const view = { center, zoom: cam.zoom - 0.22, pitch: 0, bearing: 0 }
        if (reduced) map.jumpTo(view)
        else map.easeTo({ ...view, duration: 2400, essential: true })
      }
    }
  }

  const onLanding = () => {
    if (landing) return
    setLanding(true)
    landingTimer.current = window.setTimeout(() => {
      x.finishEntry(false)
      // Let the last few degrees of the approach finish on the real map.
      const map = x.mapRef.current
      const target = finalView.current
      if (map && target) {
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        window.setTimeout(() => {
          if (!x.mapRef.current) return
          map.easeTo({ center: target.center, zoom: target.zoom, pitch: 0, bearing: 0, duration: reduced ? 0 : 700, essential: true })
        }, 180)
      }
    }, 720)
  }

  const skip = () => x.finishEntry()

  return (
    <div className={`orbit ${x.dark ? 'is-dark' : 'is-light'} ${x.stage === 'intro' ? 'is-intro' : x.stage === 'leaving' ? 'is-leaving' : 'is-explore'}`} dir="rtl" style={{ '--accent': uiAccent, '--city-accent': uiAccent } as CSSProperties}>
      <main className="orbit-stage">
        <div ref={x.mapEl} className="map-canvas" />
        {theme && x.stage === 'explore' && <CityBackdrop theme={theme} dark={x.dark} active className="orbit-ambient" />}
        {!x.mapReady && !x.loadError && <div className="ui-loading"><span><i /> نجهّز المشهد…</span></div>}
        {x.loadError && (
          <div className="orbit-error">
            <b>تعذر تحميل الخريطة</b>
            <span>{x.loadError}</span>
            <button onClick={() => window.location.reload()}>إعادة</button>
          </div>
        )}

        {x.stage !== 'explore' && (
          <div className={`orb-intro ${globeReady || globeFailed ? 'is-ready' : ''} ${globePhase === 'flying' ? 'is-launching' : ''} ${approaching ? 'is-approach' : ''} ${landing ? 'is-landing' : ''} ${x.dark ? '' : 'is-light-map'}`}>
            <OrbitGlobe
              phase={globePhase}
              onReady={() => setGlobeReady(true)}
              onApproach={() => setApproaching(true)}
              onLanding={onLanding}
              onArrived={onLanding}
              onFail={() => {
                setGlobeFailed(true)
                setGlobeReady(true)
              }}
            />
            <div className="orb-hero">
              <div className="orb-copy">
                <span className="orb-eyebrow">ORBIT · منصة استكشاف السعودية</span>
                <h1>
                  السعودية…
                  <span className="orb-accent">أقرب مما تتخيّل.</span>
                </h1>
                <p className="orb-lead">
                  من قلب المدن إلى هدوء الطبيعة، اكتشف أماكن جديدة، تعرّف على تفاصيل كل وجهة،
                  وارسم رحلتك القادمة على خريطة واحدة.
                </p>
                <div className="orb-actions">
                  <button className="orb-cta" onClick={start} disabled={!canLaunch || globePhase === 'flying'}>
                    ابدأ الاستكشاف
                    <ArrowUpLeft size={17} strokeWidth={2.2} />
                  </button>
                  <button className="orb-skip" onClick={skip}>تخطّي المشهد</button>
                </div>
                <div className="orb-meta">
                  {globePhase === 'flying' ? (
                    <span className="orb-loading"><b /> نهبط في المملكة…</span>
                  ) : globeReady && !x.mapReady && !x.loadError ? (
                    <span className="orb-loading"><b /> نجهّز الخريطة…</span>
                  ) : globeReady ? (
                    <>
                      <span>{cities.length} مدينة</span>
                      <i />
                      <span>{places.length} مكانًا</span>
                      <i />
                      <span>خريطة واحدة</span>
                    </>
                  ) : (
                    <span className="orb-loading"><b /> نجهّز الكوكب…</span>
                  )}
                </div>
              </div>
            </div>
            <a
              className="orb-credit"
              href="https://www.solarsystemscope.com/textures/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Earth imagery · Solar System Scope · CC BY 4.0
            </a>
          </div>
        )}

        {x.stage === 'explore' && (
          <>
            <header className="orbit-top">
              <button className="orbit-brand" onClick={x.reset} aria-label="العودة للسعودية">
                <Compass size={18} />
                <span><b>المدار</b><small>ORBIT</small></span>
              </button>
              <div className="orbit-top-actions">
                <button className="orbit-plan" onClick={x.openPlanner}><Sparkles size={15} /> خطط طلعة</button>
                <button className="orbit-icon" onClick={x.toggle} aria-label="تبديل الوضع">{x.dark ? <Sun size={17} /> : <Moon size={17} />}</button>
              </div>
            </header>

            <div className="orbit-title">
              <span>المملكة العربية السعودية</span>
              <h1>{x.city ? x.city.ar : 'اكتشف السعودية'}</h1>
            </div>

            <div className="orbit-controls">
              <button onClick={() => x.mapRef.current?.zoomIn()} aria-label="تكبير"><Plus size={16} /></button>
              <button onClick={() => x.mapRef.current?.zoomOut()} aria-label="تصغير"><Minus size={16} /></button>
              <button onClick={x.reset} aria-label="عرض السعودية"><LocateFixed size={16} /></button>
            </div>

            <div className="orbit-cities">
              <div className="orbit-cities-scroll">
                {featuredCities.map((c) => (
                  <button key={c.id} className={x.city?.id === c.id ? 'is-on' : ''} onClick={() => x.pickCity(c)}>
                    <i style={{ background: x.city?.id === c.id ? x.accent : undefined }} />
                    {c.ar}
                  </button>
                ))}
              </div>
            </div>

            {x.city && (
              <aside className="orbit-sheet">
                <button className="orbit-sheet-close" onClick={() => { x.setCity(null); x.reset() }} aria-label="إغلاق"><X size={16} /></button>
                <div className="orbit-sheet-head">
                  <div>
                    <span className="orbit-kicker">استكشاف / {x.city.en.toUpperCase()}</span>
                    <h2>{x.city.ar}</h2>
                    <p>{x.city.region} · {x.poiList.length} مكانًا في اللقطة</p>
                    {theme && <span className="orbit-env">{theme.env.map((e) => ENV_LABEL[e]).join(' · ')} — {theme.tagline}</span>}
                  </div>
                  <div className="orbit-weather">
                    <CloudSun size={22} />
                    <div>
                      <b>{x.weather ? `${x.weather.temperature}°` : '—'}</b>
                      <span>{x.weather ? weatherLabel(x.weather.code) : x.weatherStatus === 'error' ? 'غير متاح' : '…'}</span>
                    </div>
                  </div>
                </div>
                <div className="orbit-filters">
                  <button className={x.filter === 'all' ? 'is-on' : ''} onClick={() => x.setFilter('all')}>الكل</button>
                  {ALL_CATEGORIES.filter((c) => x.poiList.some((p) => p.cat === c)).map((c) => (
                    <button key={c} className={x.filter === c ? 'is-on' : ''} onClick={() => x.setFilter(c)}>
                      <CategoryIcon cat={c} size={13} /> {CATEGORY_META[c].label}
                    </button>
                  ))}
                </div>
                {x.filtered.length === 0 ? (
                  <div className="orbit-empty">
                    <p>لا توجد أماكن مفصّلة لهذه المدينة في لقطة البيانات الحالية. لن نملأها بأسماء غير موثقة.</p>
                  </div>
                ) : (
                  <div className="orbit-places">
                    {x.filtered.map((p) => (
                      <button key={p.id} className={`orbit-scene ${x.place?.id === p.id ? 'is-on' : ''}`} onClick={() => x.pickPlace(p)}>
                        <PlaceArt place={p} ratio="16 / 10" />
                        <span className="orbit-scene-cat"><CategoryIcon cat={p.cat} size={11} /> {CATEGORY_META[p.cat].short}</span>
                        <b>{p.name}</b>
                      </button>
                    ))}
                  </div>
                )}
              </aside>
            )}

            {x.place && (
              <div className="orbit-place">
                <button className="orbit-place-close" onClick={() => x.setPlace(null)} aria-label="إغلاق"><X size={15} /></button>
                <PlaceArt place={x.place} ratio="16 / 9" />
                <div className="orbit-place-body">
                  <span className="orbit-kicker">{CATEGORY_META[x.place.cat].label} · {x.place.city}</span>
                  <h2>{x.place.name}</h2>
                  <p className="orbit-place-kind">{x.place.kind}</p>
                  <div className="orbit-place-actions">
                    <a href={directionsUrl(x.place)} target="_blank" rel="noreferrer noopener"><Navigation size={13} /> الاتجاهات</a>
                    <button onClick={() => x.place && x.addPlaceToPlan(x.place)}><Plus size={13} /> أضف للطلعة</button>
                  </div>
                  <SourceNote place={x.place} />
                </div>
              </div>
            )}

            {!x.planOpen && x.plan && (
              <button className="orbit-plan-float" onClick={() => x.setPlanOpen(true)}>
                <Route size={15} /> طلعتك جاهزة · {x.plan.stops.length} محطات <ChevronLeft size={13} />
              </button>
            )}
          </>
        )}
      </main>

      {x.planOpen && (
        <OrbitPlanner
          plan={x.plan}
          city={x.city}
          routeStatus={x.routeStatus}
          onClose={() => x.setPlanOpen(false)}
          onBuild={x.build}
          onRegenerate={x.regenerate}
          onAdd={x.addPlaceToPlan}
          onRemove={x.removeStop}
          onMove={x.moveStop}
          onPickCity={(id) => {
            const c = cityById(id)
            if (c) x.pickCity(c)
          }}
        />
      )}
    </div>
  )
}

function OrbitPlanner({
  plan,
  city,
  routeStatus,
  onClose,
  onBuild,
  onRegenerate,
  onAdd,
  onRemove,
  onMove,
  onPickCity,
}: {
  plan: Plan | null
  city: ReturnType<typeof useExplorer>['city']
  routeStatus: string
  onClose: () => void
  onBuild: (i: PlanInput) => void
  onRegenerate: (i: PlanInput) => void
  onAdd: (p: Place) => void
  onRemove: (id: string) => void
  onMove: (i: number, d: -1 | 1) => void
  onPickCity: (id: string) => void
}) {
  const [input, setInput] = useState<PlanInput>(() => plan?.input ?? defaultPlanInput(city?.id ?? 'riyadh'))
  const [step, setStep] = useState(plan ? 2 : 1)
  const selectedCity = cityById(input.cityId)
  const cityPlaces = selectedCity ? placesInCity(selectedCity.ar) : []
  const togglePref = (c: Category) =>
    setInput((s) => ({ ...s, prefs: s.prefs.includes(c) ? s.prefs.filter((p) => p !== c) : [...s.prefs, c] }))

  return (
    <div className="orbit-planner" role="dialog" aria-modal="true" aria-label="مخطط الطلعة">
      <button className="orbit-planner-bg" onClick={onClose} aria-label="إغلاق" />
      <section className="orbit-planner-panel">
        <header>
          <div>
            <span className="orbit-kicker">مهمة / خطط طلعتك</span>
            <h2>{plan?.summary.title ?? 'طلعة جديدة'}</h2>
          </div>
          <button onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        </header>

        {step === 1 && (
          <div className="orbit-form">
            <label><span>المدينة</span>
              <select value={input.cityId} onChange={(e) => { setInput({ ...input, cityId: e.target.value }); onPickCity(e.target.value) }}>
                {cities.filter((c) => placesInCity(c.ar).length > 0).map((c) => <option key={c.id} value={c.id}>{c.ar}</option>)}
              </select>
            </label>
            <div className="orbit-form-row">
              <label><span>الأشخاص</span><input type="number" min={1} max={20} value={input.people} onChange={(e) => setInput({ ...input, people: Number(e.target.value) })} /></label>
              <label><span>الميزانية (ر.س)</span><input type="number" min={0} step={50} value={input.budget} onChange={(e) => setInput({ ...input, budget: Number(e.target.value) })} /></label>
            </div>
            <div className="orbit-form-row">
              <label><span>التاريخ</span><input type="date" value={input.date} onChange={(e) => setInput({ ...input, date: e.target.value })} /></label>
              <label><span>البداية</span><input type="time" value={input.startTime} onChange={(e) => setInput({ ...input, startTime: e.target.value })} /></label>
            </div>
            <label><span>المدة · {input.durationHours} ساعات</span><input type="range" min={3} max={12} value={input.durationHours} onChange={(e) => setInput({ ...input, durationHours: Number(e.target.value) })} /></label>
            <div className="orbit-seg">
              {(['family', 'friends', 'solo'] as const).map((g) => (
                <button key={g} className={input.group === g ? 'is-on' : ''} onClick={() => setInput({ ...input, group: g })}>{GROUP_LABEL[g]}</button>
              ))}
            </div>
            <div className="orbit-prefs">
              {ALL_CATEGORIES.map((c) => (
                <button key={c} className={input.prefs.includes(c) ? 'is-on' : ''} onClick={() => togglePref(c)}>
                  <CategoryIcon cat={c} size={13} /> {CATEGORY_META[c].label}
                </button>
              ))}
            </div>
            <button className="orbit-go" onClick={() => { onBuild(input); setStep(2) }}>اكتب الطلعة <Sparkles size={15} /></button>
          </div>
        )}

        {step === 2 && plan && (
          <div className="orbit-result">
            <div className="orbit-metrics">
              <div><Route size={15} /><b>{plan.summary.totalKm} كم</b><span>مسافة</span></div>
              <div><Timer size={15} /><b>{Math.floor(plan.summary.totalMin / 60)}س {plan.summary.totalMin % 60}د</b><span>الوقت</span></div>
              <div><Wallet size={15} /><b>{formatNum(plan.input.budget)}</b><span>ر.س</span></div>
              <div><CalendarDays size={15} /><b>{formatDateAr(plan.input.date)}</b><span>{displayTime(plan.input.startTime)}</span></div>
            </div>
            <div className="orbit-timeline">
              {plan.stops.map((s, i) => (
                <article key={s.place.id}>
                  <div className="orbit-tl-time"><b>{displayTime(s.arrival)}</b><span>{s.stayMin} د</span></div>
                  <div className="orbit-tl-dot">{i + 1}</div>
                  <div className="orbit-tl-body">
                    <span><CategoryIcon cat={s.place.cat} size={11} /> {CATEGORY_META[s.place.cat].label}</span>
                    <h3>{s.place.name}</h3>
                    <p>{s.reason}</p>
                    <small>{s.travelKm} كم · {s.travelMin} د تنقل</small>
                    <div className="orbit-tl-actions">
                      <button onClick={() => onMove(i, -1)} disabled={i === 0}><ArrowUp size={12} /></button>
                      <button onClick={() => onMove(i, 1)} disabled={i === plan.stops.length - 1}><ArrowDown size={12} /></button>
                      <button onClick={() => onRemove(s.place.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).length > 0 && (
              <div className="orbit-add">
                <span>أضف محطة</span>
                <div>{cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).slice(0, 5).map((p) => <button key={p.id} onClick={() => onAdd(p)}><Plus size={11} />{p.name}</button>)}</div>
              </div>
            )}
            <div className="orbit-plan-foot">
              <span>مصدر المسار: {routeStatus === 'ready' ? 'OSRM' : 'تقدير خطي'}</span>
              <button onClick={() => onRegenerate(input)}><Sparkles size={13} /> أعد الحساب</button>
              <button onClick={() => setStep(1)}>تعديل</button>
            </div>
            <EventsNote compact />
          </div>
        )}
      </section>
    </div>
  )
}
