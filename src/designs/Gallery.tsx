import { ArrowLeft, ArrowUpRight, Compass, Database, Map, Moon, ShieldCheck, Sun } from 'lucide-react'
import './gallery.css'

const designs = [
  {
    id: 'atlas',
    index: '01',
    name: 'أثر',
    en: 'ATHAR',
    kicker: 'الأطلس التحريري',
    line: 'خريطة كورقية، هوامش، أرقام فصول، وبطاقات أشبه بصفحات مجلة سفر.',
    notes: ['خريطة ورقية ملوّنة', 'تنقل علوي تحريري', 'دفتر طلعة عمودي'],
    href: '#/atlas',
    theme: 'paper',
  },
  {
    id: 'pulse',
    index: '02',
    name: 'نبض',
    en: 'NABD',
    kicker: 'رادار الاستكشاف',
    line: 'واجهة ليلية كثيفة البيانات، تضاريس ثلاثية الأبعاد، ومحطات تنبض على الخريطة.',
    notes: ['تضاريس 3D', 'لوحة قيادة جانبية', 'مسار حيّ على الرادار'],
    href: '#/pulse',
    theme: 'night',
  },
  {
    id: 'darb',
    index: '03',
    name: 'درب',
    en: 'DARB',
    kicker: 'رفيق الطلعة',
    line: 'ملصقات، بطاقات سميكة، خريطة داخل نافذة مائلة، وتخطيط يشبه ترتيب يوم جميل.',
    notes: ['خريطة ملصقات', 'شريط مدن دائري', 'تذاكر طلعة قابلة للسحب'],
    href: '#/darb',
    theme: 'sticker',
  },
]

function Preview({ kind }: { kind: string }) {
  if (kind === 'paper') {
    return (
      <div className="g-preview g-preview--paper" aria-hidden="true">
        <div className="g-paper-grid" />
        <div className="g-paper-title">أثر</div>
        <svg viewBox="0 0 500 280">
          <path d="M80 215 C 140 80, 215 250, 285 140 S 390 80, 430 170" fill="none" stroke="#B4512E" strokeWidth="2" strokeDasharray="4 6" />
          <path d="M95 60 C 150 30, 200 115, 265 80 S 365 35, 420 90" fill="none" stroke="#135957" strokeWidth="1" opacity=".5" />
          <circle cx="130" cy="195" r="5" fill="#B4512E" />
          <circle cx="285" cy="140" r="5" fill="#135957" />
          <circle cx="430" cy="170" r="5" fill="#B4512E" />
          <text x="130" y="220" fill="#1B1916" fontSize="14">الرياض</text>
          <text x="285" y="165" fill="#1B1916" fontSize="14">العلا</text>
          <text x="430" y="195" fill="#1B1916" fontSize="14">أبها</text>
        </svg>
        <div className="g-paper-card">
          <span>الرياض · ٠٤ أماكن</span>
          <b>قهوة، ثم أثر، ثم غروب</b>
        </div>
      </div>
    )
  }
  if (kind === 'night') {
    return (
      <div className="g-preview g-preview--night" aria-hidden="true">
        <div className="g-radar" />
        <div className="g-pulse-line" />
        <div className="g-pulse-hud">
          <span>NABD // 24.71°N</span>
          <b>الرياض</b>
          <em>LIVE MAP</em>
        </div>
        <div className="g-pulse-coords">46.67°E<br />29°C · CLEAR</div>
        <div className="g-pulse-city g-pulse-city--1"><i />الخرج</div>
        <div className="g-pulse-city g-pulse-city--2"><i />الرياض</div>
        <div className="g-pulse-city g-pulse-city--3"><i />الدمام</div>
      </div>
    )
  }
  return (
    <div className="g-preview g-preview--sticker" aria-hidden="true">
      <div className="g-sticker-sun" />
      <div className="g-sticker-map">
        <svg viewBox="0 0 420 220">
          <path d="M50 165 C 105 120, 130 180, 185 125 S 275 65, 340 130" fill="none" stroke="#B4512E" strokeWidth="3" strokeDasharray="7 8" strokeLinecap="round" />
        </svg>
        <span className="g-sticker-pin g-sticker-pin--1">الرياض</span>
        <span className="g-sticker-pin g-sticker-pin--2">جدة</span>
        <span className="g-sticker-pin g-sticker-pin--3">أبها</span>
      </div>
      <div className="g-sticker-ticket">طلعة الجمعة <b>4 محطات</b></div>
      <div className="g-sticker-badge">درب</div>
    </div>
  )
}

export function Gallery({ about }: { about: boolean }) {
  return (
    <div className="gallery">
      <header className="g-nav">
        <a className="g-brand" href="#/" aria-label="أرض — الرئيسية">
          <span className="g-brand-mark">أ</span>
          <span><b>أرض</b><small>ARD</small></span>
        </a>
        <nav aria-label="روابط رئيسية">
          <a href="#experiences">التجارب الثلاث</a>
          <a href="#palette">الهوية</a>
          <a href="#sources">البيانات</a>
        </nav>
        <a className="g-nav-cta" href="#experiences">جرّب الآن <ArrowLeft size={15} /></a>
      </header>

      <main>
        <section className="g-hero">
          <div className="g-hero-copy">
            <span className="g-eyebrow"><Compass size={14} /> منصة استكشاف سعودية · نماذج تصميم</span>
            <h1>
              السعودية،<br />
              <span>ثلاث طرق</span><br />
              لاكتشافها.
            </h1>
            <p>
              ثلاث تجارب مستقلة — لا ثلاث ألوان لتصميم واحد. نفس البيانات، نفس الهوية اللونية،
              وثلاث طرق جذرية لعرض الخريطة والمدن والطلعة.
            </p>
            <div className="g-hero-actions">
              <a className="g-btn g-btn--solid" href="#experiences">اختر تجربتك <ArrowLeft size={17} /></a>
              <a className="g-btn g-btn--ghost" href="#sources">من أين البيانات؟ <ArrowUpRight size={16} /></a>
            </div>
            <div className="g-meta">
              <span><i className="dot dot--clay" /> 166 مدينة ومنطقة</span>
              <span><i className="dot dot--palm" /> خرائط MapLibre</span>
              <span><i className="dot dot--sand" /> بيانات موثّقة فقط</span>
            </div>
          </div>
          <div className="g-hero-art">
            <div className="g-orbit g-orbit--1" />
            <div className="g-orbit g-orbit--2" />
            <Preview kind="paper" />
            <Preview kind="night" />
            <Preview kind="sticker" />
            <div className="g-hero-stamp">3<br /><span>تجارب</span></div>
          </div>
        </section>

        <section className="g-section" id="experiences">
          <div className="g-section-head">
            <div>
              <span className="g-kicker">BETA / 01–03</span>
              <h2>ثلاث بوابات،<br />اختر ما يشبهك.</h2>
            </div>
            <p>
              كل نموذج يعمل مستقلًا: خريطة تفاعلية، مدن، أماكن، طقس، وتخطيط طلعة.
              افتحها على الجوال والكمبيوتر وجرّب الفرق.
            </p>
          </div>
          <div className="g-cards">
            {designs.map((d) => (
              <a className={`g-card g-card--${d.theme}`} href={d.href} key={d.id}>
                <div className="g-card-top">
                  <span>{d.index}</span>
                  <span>{d.en}</span>
                </div>
                <Preview kind={d.theme} />
                <div className="g-card-body">
                  <span className="g-card-kicker">{d.kicker}</span>
                  <h3>{d.name}</h3>
                  <p>{d.line}</p>
                  <ul>
                    {d.notes.map((n) => <li key={n}>{n}</li>)}
                  </ul>
                  <span className="g-card-link">افتح التجربة <ArrowUpRight size={16} /></span>
                </div>
              </a>
            ))}
          </div>
        </section>

        <section className="g-section g-diff" id="palette">
          <div className="g-diff-intro">
            <span className="g-kicker">هوية واحدة</span>
            <h2>ثلاثة ألوان.<br />ثلاث حكايات.</h2>
            <p>
              الألوان ليست هوية منفصلة لكل نموذج. الرملي والطيني والنخيلي حاضرون في كل تجربة،
              وتتغير نسبتهم وأدوارهم فقط — كما تتغير الحكاية لا اللغة.
            </p>
            <div className="g-palette">
              <div style={{ background: '#E7D3AE' }}><b>الرملي</b><span>#E7D3AE</span></div>
              <div style={{ background: '#B4512E', color: '#FFFDF8' }}><b>الطيني</b><span>#B4512E</span></div>
              <div style={{ background: '#135957', color: '#FFFDF8' }}><b>النخيلي</b><span>#135957</span></div>
            </div>
          </div>
          <div className="g-diff-grid">
            <article>
              <span><Map size={18} /> أثر</span>
              <h4>الخريطة كلوحة</h4>
              <p>الورق أولًا. ألوان البحر والطرق تخدم القراءة الهادئة، والمدينة ملاحظة هامش.</p>
            </article>
            <article>
              <span><Moon size={18} /> نبض</span>
              <h4>الخريطة كمرصد</h4>
              <p>البيانات أولًا. تضاريس، شبكة، ومحطات مضيئة تحوّل الاستكشاف إلى رادار.</p>
            </article>
            <article>
              <span><Sun size={18} /> درب</span>
              <h4>الخريطة كنزهة</h4>
              <p>اللعب أولًا. نافذة دافئة، ملصقات، ومسار مرسوم كأنه على ورقة مطوية.</p>
            </article>
          </div>
        </section>

        <section className="g-section g-sources" id="sources">
          <div className="g-section-head">
            <div>
              <span className="g-kicker">شفافية البيانات</span>
              <h2>لا نملأ الفراغ<br />بمعلومة مخترعة.</h2>
            </div>
            <p>
              النماذج مصممة لتُظهر ما نعرفه، وتقول بصراحة ما لا نعرفه. الصور رسوم توضيحية،
              ولا نعرض تقييمات أو أسعار أو ساعات عمل بلا مصدر.
            </p>
          </div>
          <div className="g-source-grid">
            <article><Database size={19} /><b>OpenStreetMap</b><span>أسماء الأماكن والإحداثيات · لقطة 21 نوفمبر 2026</span></article>
            <article><Map size={19} /><b>OpenFreeMap + MapLibre</b><span>بلاطات متجهة وتضاريس · بلا مفتاح ولا فوترة</span></article>
            <article><ShieldCheck size={19} /><b>Open-Meteo + OSRM</b><span>طقس حالي ومسارات قيادة · عند توفر الخدمة</span></article>
          </div>
          <div className="g-security">
            <ShieldCheck size={18} />
            <p>
              لا يوجد أي مفتاح API داخل هذه الملفات العامة. المشروع يعمل بالكامل على مصادر
              مفتوحة بلا فوترة. أي مفاتيح مستقبلية تُوضع في الخادم فقط.
            </p>
          </div>
        </section>

        {about && (
          <section className="g-section">
            <h2>عن المرحلة</h2>
            <p>هذه هي المرحلة الثانية: ثلاثة نماذج قابلة للتجربة، بانتظار اختيارك.</p>
          </section>
        )}
      </main>

      <footer className="g-footer">
        <div className="g-footer-brand"><span className="g-brand-mark">أ</span><b>أرض</b></div>
        <p>ثلاث تجارب لاستكشاف السعودية. صُنعت كنماذج قرار، لا كمنتج نهائي.</p>
        <div><a href="#/atlas">أثر</a><a href="#/pulse">نبض</a><a href="#/darb">درب</a></div>
      </footer>
    </div>
  )
}
