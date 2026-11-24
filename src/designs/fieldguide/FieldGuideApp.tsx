import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  ChevronLeft,
  CloudSun,
  LocateFixed,
  Minus,
  Moon,
  Navigation,
  Plus,
  Route,
  Sparkles,
  Sun,
  Trash2,
  X,
} from 'lucide-react'
import { useExplorer } from '../../lib/useExplorer'
import { GlobeScene, type GlobeConfig } from '../../globe/GlobeScene'
import { ALL_CATEGORIES, CATEGORY_META, cities, cityById, DATA_SNAPSHOT, directionsUrl, displayTime, featuredCities, formatDateAr, formatNum, placesInCity, weatherLabel } from '../../lib/catalog'
import { defaultPlanInput, GROUP_LABEL } from '../../lib/planner'
import type { Category, City, Plan, PlanInput, Place } from '../../lib/types'
import { CategoryIcon } from '../../components/CategoryIcon'
import { PlaceArt } from '../../ui/PlaceArt'
import { SourceNote, EventsNote, Disclosure } from '../../ui/Honesty'
import { cityTheme, ENV_LABEL } from '../../ui/cityTheme'
import { CityBackdrop } from '../../ui/CityBackdrop'
import './fieldguide.css'

const FG_GLOBE: GlobeConfig = {
  background: 'radial-gradient(circle at 42% 40%, #141b2c 0%, #0a0e18 46%, #04050a 100%)',
  atmosphere: 0xd9b47a,
  sun: 0xfff3e0,
  starColor: 0xe8dcc0,
  starCount: 1000,
  starOpacity: 0.5,
  ambient: 0.16,
  autoRotate: 0.2,
  start: [0.9, 0.5, 3.0],
  approachMs: 5200,
  revealMs: 2000,
  leaveMs: 2300,
  endDistance: 1.6,
  cloudOpacity: 0.38,
  exposure: 1.1,
  tone: 'fieldguide',
}

export function FieldGuideApp() {
  const x = useExplorer({ id: 'fieldguide', accent: '#d84b3f', defaultDark: false, pitch: 0 })
  const [globeRevealed, setGlobeRevealed] = useState(false)
  const [globeSettled, setGlobeSettled] = useState(false)
  const [globeFailed, setGlobeFailed] = useState(false)
  const activeTheme = x.city ? cityTheme(x.city.id) : null
  const uiAccent = activeTheme ? (x.dark ? activeTheme.accentDark : activeTheme.accent) : x.accent

  const activate = useMemo(() => {
    return (c: City) => {
      if (x.city?.id !== c.id) x.pickCity(c)
    }
  }, [x.city?.id, x.pickCity])

  return (
    <div className={`fg ${x.dark ? 'is-dark' : 'is-light'} ${x.stage === 'intro' ? 'is-intro' : x.stage === 'leaving' ? 'is-leaving' : 'is-explore'}`} dir="rtl" style={{ '--accent': uiAccent, '--city-accent': uiAccent } as CSSProperties}>
      {x.stage !== 'explore' && (
        <div className="fg-intro">
          <GlobeScene
            config={FG_GLOBE}
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
          <div className={`fg-intro-copy ${globeRevealed ? 'is-ready' : ''}`}>
            <span className="fg-rule" />
            <span className="fg-kicker">الدليل · قصة جغرافية</span>
            <h1>السعودية،<br /><em>فصلًا فصلًا.</em></h1>
            <p>مرّر لتسافر. الخريطة تثبت، والكاميرا تنتقل من مدينة إلى مدينة عبر الفصول.</p>
            <div className="fg-actions">
              <button className="fg-start" onClick={() => (globeFailed ? x.finishEntry() : x.enter(false))} disabled={!globeSettled || x.stage === 'leaving'}>
                افتح الدليل <ChevronLeft size={15} />
              </button>
              <button className="fg-skip" onClick={() => x.finishEntry()}>تخطّي</button>
            </div>
            {!globeRevealed && <div className="fg-status"><i /> نفتح الصفحة الأولى…</div>}
          </div>
        </div>
      )}

      {x.stage === 'explore' && (
        <>
          <div className="fg-map">
            <div ref={x.mapEl} className="map-canvas" />
            {!x.mapReady && !x.loadError && <div className="ui-loading"><span><i /> نرسم الخريطة…</span></div>}
            {x.loadError && <div className="fg-error"><b>تعذر تحميل الخريطة</b><span>{x.loadError}</span></div>}
          </div>

          <header className="fg-nav">
            <button className="fg-brand" onClick={x.reset}>
              <span className="fg-brand-mark"><BookOpen size={16} /></span>
              <span><b>الدليل</b><small>FIELD GUIDE</small></span>
            </button>
            <div className="fg-nav-hint">مرّر للأسفل لتسافر بين المدن</div>
            <div className="fg-nav-actions">
              <button className="fg-plan" onClick={x.openPlanner}><Sparkles size={14} /> طلعة</button>
              <button className="fg-round" onClick={x.toggle} aria-label="تبديل الوضع">{x.dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            </div>
          </header>

          <div className="fg-tools">
            <button onClick={() => x.mapRef.current?.zoomIn()}><Plus size={15} /></button>
            <button onClick={() => x.mapRef.current?.zoomOut()}><Minus size={15} /></button>
            <button onClick={x.reset}><LocateFixed size={15} /></button>
          </div>

          <main className="fg-scroll">
            <section className="fg-opener">
              <div className="fg-opener-card">
                <span className="fg-kicker">المقدمة · {DATA_SNAPSHOT}</span>
                <h2>أرضٌ تُقرأ<br />كفصول.</h2>
                <p>{cities.length} مدينة في الفهرس، و{formatNum(cities.reduce((n, c) => n + placesInCity(c.ar).length, 0))} مكانًا موثقًا. كل فصل يلوّن نفسه بلون مدينته.</p>
                <Disclosure />
              </div>
            </section>

            {featuredCities.map((c, i) => (
              <Chapter
                key={c.id}
                city={c}
                index={i}
                active={x.city?.id === c.id}
                dark={x.dark}
                onActivate={activate}
                poiList={x.city?.id === c.id ? x.poiList : []}
                filtered={x.city?.id === c.id ? x.filtered : []}
                filter={x.filter}
                setFilter={x.setFilter}
                weather={x.city?.id === c.id ? x.weather : null}
                weatherStatus={x.weatherStatus}
                onPickPlace={x.pickPlace}
                onPlan={x.openPlanner}
              />
            ))}

            <section className="fg-closer">
              <div className="fg-closer-card">
                <span className="fg-kicker">نهاية الفصول</span>
                <h2>اختر فصلك،<br />وخطط طلعتك.</h2>
                <p>كل مدينة لها بيئتها ولونها. اضغط أي مدينة على الخريطة، أو خطط طلعة في مدينة تحبها.</p>
                <button className="fg-start" onClick={x.openPlanner}><Sparkles size={14} /> خطط طلعة</button>
              </div>
            </section>
          </main>
        </>
      )}

      {x.place && (
        <div className="fg-modal" role="dialog" aria-modal="true">
          <button className="fg-modal-bg" onClick={() => x.setPlace(null)} />
          <article className="fg-place">
            <button className="fg-close" onClick={() => x.setPlace(null)}><X size={16} /></button>
            <div className="fg-place-art"><PlaceArt place={x.place} ratio="16 / 9" /></div>
            <div className="fg-place-body">
              <span className="fg-kicker" style={{ color: activeTheme?.accent }}>{CATEGORY_META[x.place.cat].label} · {x.place.city}</span>
              <h2>{x.place.name}</h2>
              <p className="fg-place-kind">{x.place.kind}{x.place.nameEn ? ` · ${x.place.nameEn}` : ''}</p>
              <div className="fg-place-note"><p>الصورة رسم توضيحي، وليست صورة للمكان. لا نعرض تقييمات أو أسعارًا أو ساعات عمل بلا مصدر موثوق.</p></div>
              <div className="fg-place-actions">
                <a href={directionsUrl(x.place)} target="_blank" rel="noreferrer noopener"><Navigation size={13} /> الاتجاهات</a>
                <button onClick={() => x.place && x.addPlaceToPlan(x.place)}><Plus size={13} /> أضفها للطلعة</button>
              </div>
              <SourceNote place={x.place} />
            </div>
          </article>
        </div>
      )}

      {x.planOpen && (
        <FieldGuidePlanner
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

function Chapter({
  city,
  index,
  active,
  dark,
  onActivate,
  poiList,
  filtered,
  filter,
  setFilter,
  weather,
  weatherStatus,
  onPickPlace,
  onPlan,
}: {
  city: City
  index: number
  active: boolean
  dark: boolean
  onActivate: (c: City) => void
  poiList: Place[]
  filtered: Place[]
  filter: Category | 'all'
  setFilter: (f: Category | 'all') => void
  weather: { temperature: number; code: number } | null
  weatherStatus: string
  onPickPlace: (p: Place) => void
  onPlan: () => void
}) {
  const ref = useRef<HTMLElement>(null)
  const theme = cityTheme(city.id)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) onActivate(city)
        })
      },
      { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [city.id, onActivate])

  const accent = dark ? theme.accentDark : theme.accent

  return (
    <section className={`fg-chapter ${active ? 'is-active' : ''}`} ref={ref} style={{ '--city': accent } as CSSProperties}>
      <article className="fg-chapter-card">
        {active && <CityBackdrop theme={theme} dark={dark} active className="fg-chapter-bg" />}
        <div className="fg-chapter-body">
          <div className="fg-chapter-no">
            <span>الفصل</span>
            <b>{String(index + 1).padStart(2, '0')}</b>
          </div>
          <div className="fg-chapter-title">
            <span className="fg-kicker">{city.region} · {theme.env.map((e) => ENV_LABEL[e]).join(' · ')}</span>
            <h2>{city.ar}</h2>
            <p>{theme.tagline}</p>
          </div>

          {active && (
            <>
              <div className="fg-weather">
                <CloudSun size={18} />
                <div><b>{weather ? `${weather.temperature}°` : '—'}</b><span>{weather ? weatherLabel(weather.code) : weatherStatus === 'error' ? 'غير متاح' : '…'}</span></div>
                <small>{poiList.length} مكان</small>
              </div>
              <div className="fg-filters">
                <button className={filter === 'all' ? 'is-on' : ''} onClick={() => setFilter('all')}>الكل</button>
                {ALL_CATEGORIES.filter((c) => poiList.some((p) => p.cat === c)).map((c) => (
                  <button key={c} className={filter === c ? 'is-on' : ''} onClick={() => setFilter(c)}>
                    <CategoryIcon cat={c} size={11} /> {CATEGORY_META[c].short}
                  </button>
                ))}
              </div>
              {filtered.length === 0 ? (
                <p className="fg-empty">لا أماكن مفصّلة لهذا الفصل في لقطة البيانات الحالية.</p>
              ) : (
                <div className="fg-cards">
                  {filtered.slice(0, 6).map((p, i) => (
                    <button className="fg-card" key={p.id} onClick={() => onPickPlace(p)}>
                      <PlaceArt place={p} ratio="16 / 9" />
                      <span className="fg-card-copy">
                        <i>{String(i + 1).padStart(2, '0')}</i>
                        <span><b>{p.name}</b><small>{p.kind}</small></span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <button className="fg-chapter-plan" onClick={onPlan}><Route size={13} /> خطط طلعة في {city.ar}</button>
            </>
          )}
        </div>
      </article>
    </section>
  )
}

function FieldGuidePlanner({
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
  const [step, setStep] = useState(plan ? 3 : 1)
  const selectedCity = cityById(input.cityId)
  const cityPlaces = selectedCity ? placesInCity(selectedCity.ar) : []
  const togglePref = (c: Category) => setInput((s) => ({ ...s, prefs: s.prefs.includes(c) ? s.prefs.filter((p) => p !== c) : [...s.prefs, c] }))

  return (
    <div className="fg-planner" role="dialog" aria-modal="true">
      <button className="fg-modal-bg" onClick={onClose} />
      <section className="fg-planner-sheet">
        <header>
          <div><span className="fg-kicker">دفتر الطلعة</span><h2>{step === 3 && plan ? plan.summary.title : 'رتّب يومك'}</h2></div>
          <button onClick={onClose}><X size={18} /></button>
        </header>
        <div className="fg-steps">
          {[1, 2, 3].map((n) => (
            <button key={n} className={step === n ? 'is-on' : step > n ? 'is-done' : ''} onClick={() => setStep(n)}>
              <i>{step > n ? '✓' : n}</i><span>{n === 1 ? 'الشكل' : n === 2 ? 'الميول' : 'المسار'}</span>
            </button>
          ))}
        </div>

        {step === 1 && (
          <div className="fg-step">
            <div className="fg-q"><span>أولًا</span><h3>مع من تطلع؟</h3></div>
            <div className="fg-groups">
              {(['family', 'friends', 'solo'] as const).map((g) => (
                <button key={g} className={input.group === g ? 'is-on' : ''} onClick={() => setInput({ ...input, group: g })}>{GROUP_LABEL[g]}</button>
              ))}
            </div>
            <div className="fg-fields">
              <label><span>المدينة</span><select value={input.cityId} onChange={(e) => { setInput({ ...input, cityId: e.target.value }); onPickCity(e.target.value) }}>{cities.filter((c) => placesInCity(c.ar).length > 0).map((c) => <option key={c.id} value={c.id}>{c.ar}</option>)}</select></label>
              <label><span>عددكم</span><input type="number" min={1} max={20} value={input.people} onChange={(e) => setInput({ ...input, people: Number(e.target.value) })} /></label>
            </div>
            <button className="fg-next" onClick={() => setStep(2)}>التالي <ChevronLeft size={14} /></button>
          </div>
        )}

        {step === 2 && (
          <div className="fg-step">
            <div className="fg-q"><span>ثانيًا</span><h3>ما الذي يعجبك؟</h3></div>
            <div className="fg-prefs">
              {ALL_CATEGORIES.map((c) => (
                <button key={c} className={input.prefs.includes(c) ? 'is-on' : ''} onClick={() => togglePref(c)}><CategoryIcon cat={c} size={13} /> {CATEGORY_META[c].label}</button>
              ))}
            </div>
            <div className="fg-fields fg-fields--3">
              <label><span>الميزانية (ر.س)</span><input type="number" min={0} step={50} value={input.budget} onChange={(e) => setInput({ ...input, budget: Number(e.target.value) })} /></label>
              <label><span>التاريخ</span><input type="date" value={input.date} onChange={(e) => setInput({ ...input, date: e.target.value })} /></label>
              <label><span>البداية</span><input type="time" value={input.startTime} onChange={(e) => setInput({ ...input, startTime: e.target.value })} /></label>
            </div>
            <label className="fg-duration"><span>المدة · {input.durationHours} ساعات</span><input type="range" min={3} max={12} value={input.durationHours} onChange={(e) => setInput({ ...input, durationHours: Number(e.target.value) })} /></label>
            <button className="fg-next" onClick={() => { onBuild(input); setStep(3) }}>اكتب المسار <Sparkles size={14} /></button>
          </div>
        )}

        {step === 3 && plan && (
          <div className="fg-step">
            <div className="fg-summary">
              <div><span>المحطات</span><b>{plan.stops.length}</b></div>
              <div><span>المسافة</span><b>{plan.summary.totalKm} كم</b></div>
              <div><span>الوقت</span><b>{Math.floor(plan.summary.totalMin / 60)}س {plan.summary.totalMin % 60}د</b></div>
              <div><span>الميزانية</span><b>{formatNum(plan.input.budget)} ر.س</b></div>
            </div>
            <div className="fg-route">
              {plan.stops.map((s, i) => (
                <article key={s.place.id}>
                  <div className="fg-route-time"><b>{displayTime(s.arrival)}</b><span>{s.stayMin} د</span></div>
                  <div className="fg-route-num">{i + 1}</div>
                  <div>
                    <span className="fg-card-cat"><CategoryIcon cat={s.place.cat} size={11} /> {CATEGORY_META[s.place.cat].label}</span>
                    <h4>{s.place.name}</h4>
                    <p>{s.reason}</p>
                    <small>{s.travelKm} كم · {s.travelMin} د تنقل</small>
                    <div className="fg-route-actions">
                      <button onClick={() => onMove(i, -1)} disabled={i === 0}><ArrowUp size={11} /></button>
                      <button onClick={() => onMove(i, 1)} disabled={i === plan.stops.length - 1}><ArrowDown size={11} /></button>
                      <button onClick={() => onRemove(s.place.id)}><Trash2 size={11} /></button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).length > 0 && (
              <div className="fg-add">
                <span>أضف محطة</span>
                <div>{cityPlaces.filter((p) => !plan.stops.some((s) => s.place.id === p.id)).slice(0, 5).map((p) => <button key={p.id} onClick={() => onAdd(p)}><Plus size={11} />{p.name}</button>)}</div>
              </div>
            )}
            <div className="fg-plan-foot">
              <span>{formatDateAr(plan.input.date)} · {displayTime(plan.input.startTime)} · {routeStatus === 'ready' ? 'OSRM' : 'تقديري'}</span>
              <button onClick={() => onRegenerate(input)}><Sparkles size={13} /> أعد</button>
              <button onClick={() => setStep(1)}>تعديل</button>
            </div>
            <EventsNote compact />
          </div>
        )}
      </section>
    </div>
  )
}
