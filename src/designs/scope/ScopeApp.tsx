import { useMemo, useState, type CSSProperties } from 'react'
import {
  Activity,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  CloudSun,
  Compass,
  Droplets,
  LocateFixed,
  Minus,
  Moon,
  Navigation,
  Plus,
  Route,
  Search,
  Sparkles,
  Sun,
  Trash2,
  Wind,
  X,
} from 'lucide-react'
import { useExplorer } from '../../lib/useExplorer'
import { GlobeScene, type GlobeConfig } from '../../globe/GlobeScene'
import { ALL_CATEGORIES, CATEGORY_META, cities, cityById, DATA_SNAPSHOT, directionsUrl, displayTime, featuredCities, formatDateAr, formatNum, placesInCity, weatherLabel } from '../../lib/catalog'
import { defaultPlanInput, GROUP_LABEL } from '../../lib/planner'
import type { Category, Plan, PlanInput, Place } from '../../lib/types'
import { CategoryIcon } from '../../components/CategoryIcon'
import { PlaceArt } from '../../ui/PlaceArt'
import { SourceNote, EventsNote } from '../../ui/Honesty'
import { cityTheme, ENV_LABEL } from '../../ui/cityTheme'
import { CityBackdrop } from '../../ui/CityBackdrop'
import './scope.css'

const SCOPE_GLOBE: GlobeConfig = {
  background: 'radial-gradient(circle at 44% 42%, #0e2a3d 0%, #071a29 46%, #030a12 100%)',
  atmosphere: 0x4f9dff,
  sun: 0xdff3ff,
  starColor: 0x9fc8ff,
  starCount: 1200,
  starOpacity: 0.5,
  ambient: 0.16,
  autoRotate: 0.22,
  start: [1.4, 0.6, 2.4],
  approachMs: 5000,
  revealMs: 1900,
  leaveMs: 2300,
  endDistance: 1.58,
  cloudOpacity: 0.36,
  exposure: 1.08,
  tone: 'scope',
}

export function ScopeApp() {
  const x = useExplorer({ id: 'scope', accent: '#4f9dff', defaultDark: true, projection: 'globe', initialView: 'globe', center: [45, 22], zoom: 1.9 })
  const [globeRevealed, setGlobeRevealed] = useState(false)
  const [globeSettled, setGlobeSettled] = useState(false)
  const [globeFailed, setGlobeFailed] = useState(false)
  const [search, setSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)

  const theme = x.city ? cityTheme(x.city.id) : null
  const uiAccent = theme ? (x.dark ? theme.accentDark : theme.accent) : x.accent

  const cityHits = useMemo(() => {
    const q = search.trim()
    if (!q) return featuredCities.slice(0, 6)
    return cities.filter((c) => c.ar.includes(q) || c.en.toLowerCase().includes(q.toLowerCase())).slice(0, 8)
  }, [search])

  return (
    <div className={`scope ${x.dark ? 'is-dark' : 'is-light'} ${x.stage === 'intro' ? 'is-intro' : x.stage === 'leaving' ? 'is-leaving' : 'is-explore'}`} dir="rtl" style={{ '--accent': uiAccent, '--city-accent': uiAccent } as CSSProperties}>
      {x.stage !== 'explore' && (
        <div className="scope-intro">
          <GlobeScene
            config={SCOPE_GLOBE}
            phase={x.stage === 'leaving' ? 'leaving' : 'intro'}
            onReveal={() => setGlobeRevealed(true)}
            onSettled={() => setGlobeSettled(true)}
            onArrived={x.finishEntry}
            onFail={() => {
              setGlobeFailed(true)
              setGlobeRevealed(true)
              setGlobeSettled(true)
            }}
          />
          <div className={`scope-intro-card ${globeRevealed ? 'is-ready' : ''}`}>
            <div className="scope-intro-glyph"><Activity size={18} /></div>
            <span className="scope-kicker">SCOPE / كرة أرضية حية</span>
            <h1>الأرض بين يديك،<br /><em>لفّها بنفسك.</em></h1>
            <p>مجسم أرضي حقيقي تفاعلي. دوّر الكرة، قرّب على السعودية، واختر مدينة لتفتح بيئتها.</p>
            <div className="scope-actions">
              <button className="scope-go" onClick={() => (globeFailed ? x.finishEntry() : x.enter(false))} disabled={!globeSettled || x.stage === 'leaving'}>
                دخول <ChevronLeft size={15} />
              </button>
              <button className="scope-skip" onClick={() => x.finishEntry()}>تخطّي</button>
            </div>
            {!globeRevealed && <div className="scope-boot"><i /> تهيئة المجسم…</div>}
          </div>
        </div>
      )}

      {x.stage === 'explore' && (
        <>
          <div className="scope-stage">
            <div ref={x.mapEl} className="map-canvas" />
            {!x.mapReady && !x.loadError && <div className="ui-loading"><span><i /> تحميل المجسم الأرضي…</span></div>}
            {x.loadError && <div className="scope-error"><b>GLOBE OFFLINE</b><span>{x.loadError}</span><button onClick={() => window.location.reload()}>إعادة</button></div>}
            <div className="scope-spin-hint">اسحب لتدوير الكرة · مرّر للتقريب</div>
          </div>

          <header className="scope-top">
            <button className="scope-brand" onClick={x.reset}>
              <span className="scope-brand-mark"><Activity size={17} /></span>
              <span><b>المنظار</b><small>SCOPE</small></span>
            </button>
            <button className="scope-search" onClick={() => setSearchOpen(true)}>
              <Search size={15} />
              <span>{x.city ? x.city.ar : 'ابحث عن مدينة…'}</span>
            </button>
            <div className="scope-top-actions">
              <button className="scope-chip" onClick={x.openPlanner}><Sparkles size={14} /> طلعة</button>
              <button className="scope-icondot" onClick={x.toggle} aria-label="تبديل الوضع">{x.dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            </div>
            {searchOpen && (
              <div className="scope-search-pop">
                <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="الرياض، جدة، أبها…" />
                <div>
                  {cityHits.map((c) => (
                    <button key={c.id} onClick={() => { x.pickCity(c); setSearchOpen(false); setSearch('') }}>
                      <span className="scope-citydot" />
                      <span><b>{c.ar}</b><small>{c.region}</small></span>
                      <i>{placesInCity(c.ar).length || '—'}</i>
                    </button>
                  ))}
                  {!cityHits.length && <p>لا نتائج.</p>}
                </div>
              </div>
            )}
          </header>

          <div className="scope-tools">
            <button onClick={() => x.mapRef.current?.zoomIn()} title="تقريب"><Plus size={16} /></button>
            <button onClick={() => x.mapRef.current?.zoomOut()} title="إبعاد"><Minus size={16} /></button>
            <button onClick={x.reset} title="الكرة كاملة"><LocateFixed size={16} /></button>
          </div>

          <div className="scope-dock">
            <span className="scope-dock-label">CITIES</span>
            <div className="scope-dock-scroll">
              {featuredCities.map((c) => (
                <button key={c.id} className={x.city?.id === c.id ? 'is-on' : ''} onClick={() => x.pickCity(c)}>
                  <i />{c.ar}
                </button>
              ))}
            </div>
          </div>

          {x.city && theme && (
            <aside className="scope-panel">
              <CityBackdrop theme={theme} dark={x.dark} active className="scope-panel-bg" />
              <div className="scope-panel-content">
                <button className="scope-close" onClick={() => { x.setCity(null); x.reset() }} aria-label="إغلاق"><X size={16} /></button>
                <div className="scope-panel-head">
                  <span className="scope-kicker">{x.city.en.toUpperCase()} · {DATA_SNAPSHOT}</span>
                  <h2>{x.city.ar}</h2>
                  <p className="scope-env">{theme.env.map((e) => ENV_LABEL[e]).join(' · ')} — {theme.tagline}</p>
                  <div className="scope-weather">
                    <CloudSun size={20} />
                    <div><b>{x.weather ? `${x.weather.temperature}°` : '—'}</b><span>{x.weather ? weatherLabel(x.weather.code) : x.weatherStatus === 'error' ? 'غير متاح' : '…'}</span></div>
                    <span className="scope-weather-facts">
                      <i><Droplets size={11} /> {x.weather ? `${x.weather.humidity}%` : '—'}</i>
                      <i><Wind size={11} /> {x.weather ? `${x.weather.wind}` : '—'}</i>
                    </span>
                  </div>
                </div>
                <div className="scope-filters">
                  <button className={x.filter === 'all' ? 'is-on' : ''} onClick={() => x.setFilter('all')}>الكل</button>
                  {ALL_CATEGORIES.filter((c) => x.poiList.some((p) => p.cat === c)).map((c) => (
                    <button key={c} className={x.filter === c ? 'is-on' : ''} onClick={() => x.setFilter(c)}>
                      <CategoryIcon cat={c} size={12} /> {CATEGORY_META[c].short}
                    </button>
                  ))}
                </div>
                {x.filtered.length === 0 ? (
                  <div className="scope-empty">لا أماكن مفصّلة لهذه المدينة في لقطة البيانات الحالية. لن نملأها بأسماء غير موثقة.</div>
                ) : (
                  <div className="scope-places">
                    {x.filtered.map((p, i) => (
                      <button key={p.id} className={`scope-place ${x.place?.id === p.id ? 'is-on' : ''}`} onClick={() => x.pickPlace(p)}>
                        <span className="scope-place-idx">{String(i + 1).padStart(2, '0')}</span>
                        <span className="scope-place-icon"><CategoryIcon cat={p.cat} size={13} /></span>
                        <span><b>{p.name}</b><small>{p.kind}</small></span>
                        <ChevronLeft size={13} />
                      </button>
                    ))}
                  </div>
                )}
                <button className="scope-go scope-plan" onClick={x.openPlanner}><Route size={14} /> خطط طلعة في {x.city.ar}</button>
              </div>
            </aside>
          )}

          {x.place && (
            <div className="scope-modal" role="dialog" aria-modal="true">
              <button className="scope-modal-bg" onClick={() => x.setPlace(null)} />
              <article className="scope-place-card">
                <button className="scope-close" onClick={() => x.setPlace(null)}><X size={16} /></button>
                <PlaceArt place={x.place} ratio="16 / 9" />
                <div className="scope-place-body">
                  <span className="scope-kicker">{CATEGORY_META[x.place.cat].label} · {x.place.city}</span>
                  <h2>{x.place.name}</h2>
                  <p>{x.place.kind}{x.place.nameEn ? ` · ${x.place.nameEn}` : ''}</p>
                  <div className="scope-place-actions">
                    <a href={directionsUrl(x.place)} target="_blank" rel="noreferrer noopener"><Navigation size={13} /> الاتجاهات</a>
                    <button onClick={() => x.place && x.addPlaceToPlan(x.place)}><Plus size={13} /> أضف للطلعة</button>
                  </div>
                  <SourceNote place={x.place} />
                </div>
              </article>
            </div>
          )}
        </>
      )}

      {x.planOpen && (
        <ScopePlanner
          plan={x.plan}
          city={x.city}
          routeStatus={x.routeStatus}
          onClose={() => x.setPlanOpen(false)}
          onBuild={x.build}
          onRegenerate={x.regenerate}
          onAdd={x.addPlaceToPlan}
          onRemove={x.removeStop}
          onMove={x.moveStop}
          onPickCity={(id) => { const c = cityById(id); if (c) x.pickCity(c) }}
        />
      )}
    </div>
  )
}

function ScopePlanner({
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
  const [tab, setTab] = useState<'config' | 'route'>('config')
  const selectedCity = cityById(input.cityId)
  const cityPlaces = selectedCity ? placesInCity(selectedCity.ar) : []
  const togglePref = (c: Category) => setInput((s) => ({ ...s, prefs: s.prefs.includes(c) ? s.prefs.filter((p) => p !== c) : [...s.prefs, c] }))

  return (
    <div className="scope-planner" role="dialog" aria-modal="true">
      <button className="scope-modal-bg" onClick={onClose} />
      <section className="scope-planner-panel">
        <header>
          <div><span className="scope-kicker">ROUTE BUILDER</span><h2>خطط الطلعة</h2></div>
          <button onClick={onClose}><X size={18} /></button>
        </header>
        <div className="scope-tabs">
          <button className={tab === 'config' ? 'is-on' : ''} onClick={() => setTab('config')}><Compass size={13} /> الإدخال</button>
          <button className={tab === 'route' ? 'is-on' : ''} onClick={() => setTab('route')}><Route size={13} /> المسار {plan ? `(${plan.stops.length})` : ''}</button>
        </div>
        {tab === 'config' && (
          <div className="scope-config">
            <div className="scope-config-grid">
              <label><span>المدينة</span><select value={input.cityId} onChange={(e) => { setInput({ ...input, cityId: e.target.value }); onPickCity(e.target.value) }}>{cities.filter((c) => placesInCity(c.ar).length > 0).map((c) => <option key={c.id} value={c.id}>{c.ar}</option>)}</select></label>
              <label><span>المجموعة</span><select value={input.group} onChange={(e) => setInput({ ...input, group: e.target.value as PlanInput['group'] })}>{(['family', 'friends', 'solo'] as const).map((g) => <option key={g} value={g}>{GROUP_LABEL[g]}</option>)}</select></label>
              <label><span>الأشخاص</span><input type="number" min={1} max={20} value={input.people} onChange={(e) => setInput({ ...input, people: Number(e.target.value) })} /></label>
              <label><span>الميزانية (ر.س)</span><input type="number" min={0} step={50} value={input.budget} onChange={(e) => setInput({ ...input, budget: Number(e.target.value) })} /></label>
              <label><span>التاريخ</span><input type="date" value={input.date} onChange={(e) => setInput({ ...input, date: e.target.value })} /></label>
              <label><span>البداية</span><input type="time" value={input.startTime} onChange={(e) => setInput({ ...input, startTime: e.target.value })} /></label>
            </div>
            <label className="scope-range"><span>المدة · {input.durationHours} ساعات</span><input type="range" min={3} max={12} value={input.durationHours} onChange={(e) => setInput({ ...input, durationHours: Number(e.target.value) })} /></label>
            <div className="scope-config-prefs">
              {ALL_CATEGORIES.map((c) => (
                <button key={c} className={input.prefs.includes(c) ? 'is-on' : ''} onClick={() => togglePref(c)}><CategoryIcon cat={c} size={12} /> {CATEGORY_META[c].short}</button>
              ))}
            </div>
            <button className="scope-go" onClick={() => { onBuild(input); setTab('route') }}><Sparkles size={14} /> احسب المسار</button>
          </div>
        )}
        {tab === 'route' && plan && (
          <div className="scope-route">
            <div className="scope-metrics">
              <div><span>المسافة</span><b>{plan.summary.totalKm}<small> كم</small></b></div>
              <div><span>الوقت</span><b>{Math.floor(plan.summary.totalMin / 60)}:{String(plan.summary.totalMin % 60).padStart(2, '0')}</b></div>
              <div><span>المحطات</span><b>{plan.stops.length}</b></div>
              <div><span>الميزانية</span><b>{formatNum(plan.input.budget)}</b></div>
            </div>
            <div className="scope-route-head"><div><span className="scope-kicker">{formatDateAr(plan.input.date)} · {displayTime(plan.input.startTime)}</span><h3>{plan.summary.title}</h3></div><span className="scope-route-status">{routeStatus === 'ready' ? 'OSRM' : 'تقديري'}</span></div>
            <div className="scope-stops">
              {plan.stops.map((s, i) => (
                <article key={s.place.id}>
                  <div className="scope-stop-dot">{String(i + 1).padStart(2, '0')}</div>
                  <div>
                    <span>{displayTime(s.arrival)} — {displayTime(s.departure)} · {s.stayMin} د</span>
                    <h4>{s.place.name}</h4>
                    <p>{s.reason}</p>
                    <small>{s.travelKm} كم · {s.travelMin} د · {CATEGORY_META[s.place.cat].label}</small>
                    <div className="scope-stop-actions">
                      <button onClick={() => onMove(i, -1)} disabled={i === 0}><ArrowUp size={11} /></button>
                      <button onClick={() => onMove(i, 1)} disabled={i === plan.stops.length - 1}><ArrowDown size={11} /></button>
                      <button onClick={() => onRemove(s.place.id)}><Trash2 size={11} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).length > 0 && (
              <div className="scope-add">
                <span>إضافة محطة</span>
                <div>{cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).slice(0, 6).map((p) => <button key={p.id} onClick={() => onAdd(p)}><Plus size={11} />{p.name}</button>)}</div>
              </div>
            )}
            <div className="scope-budget">
              <span>توزيع الميزانية (مقترح)</span>
              <div><i style={{ width: '40%' }} />{formatNum(plan.budget.experiences)} تجارب</div>
              <div><i style={{ width: '35%' }} />{formatNum(plan.budget.food)} طعام</div>
              <div><i style={{ width: '25%' }} />{formatNum(plan.budget.transport)} تنقل</div>
            </div>
            <div className="scope-plan-foot">
              <span>لا أسعار مخترعة</span>
              <button onClick={() => onRegenerate(input)}><Sparkles size={13} /> إعادة</button>
              <button onClick={() => setTab('config')}>تعديل</button>
            </div>
            <EventsNote compact />
          </div>
        )}
      </section>
    </div>
  )
}
