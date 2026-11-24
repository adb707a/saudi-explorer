import { useState } from 'react'
import { ArrowUpLeft, Check, Compass, Globe2, Map, ShieldCheck, Sun, X } from 'lucide-react'
import { googleMapsKey, loadGoogleMaps } from '../../maps/google'
import './showcase.css'

const models = [
  {
    id: 'orbit',
    index: '01',
    name: 'المدار',
    en: 'ORBIT',
    tag: 'السينمائي الغامر',
    desc: 'الخريطة هي المسرح. كرة أرضية ثم هبوط سينمائي، وكل شيء رحلة كاميرا متصلة من الفضاء إلى المكان.',
    default: 'داكن افتراضيًا',
    href: '#/orbit',
  },
  {
    id: 'scope',
    index: '02',
    name: 'المنظار',
    en: 'SCOPE',
    tag: 'الزجاج السائل',
    desc: 'لوحة قيادة مكانية من طبقات زجاجية ونظام Bento، البحث أولًا، والخريطة نافذة داخل الشبكة.',
    default: 'داكن افتراضيًا',
    href: '#/scope',
  },
  {
    id: 'fieldguide',
    index: '03',
    name: 'الدليل',
    en: 'FIELD GUIDE',
    tag: 'التحريري السردي',
    desc: 'المملكة تُقرأ ككتاب: كل مدينة فصل بلونها وهويتها، والمسارات صفحات يوم-بيوم.',
    default: 'فاتح افتراضيًا',
    href: '#/fieldguide',
  },
]

function Preview({ kind }: { kind: string }) {
  if (kind === 'orbit') {
    return (
      <div className="sh-preview sh-preview--orbit" aria-hidden="true">
        <div className="sh-orb" />
        <span className="sh-chip">المدار</span>
        <span className="sh-tag">ORBIT → SURFACE</span>
      </div>
    )
  }
  if (kind === 'scope') {
    return (
      <div className="sh-preview sh-preview--scope" aria-hidden="true">
        <div className="sh-bento sh-bento--a" />
        <div className="sh-bento sh-bento--b" />
        <div className="sh-bento sh-bento--c" />
        <div className="sh-bento sh-bento--d" />
      </div>
    )
  }
  return (
    <div className="sh-preview sh-preview--fg" aria-hidden="true">
      <span className="sh-fg-rule" />
      <div className="sh-fg-no">04</div>
      <div className="sh-fg-lines"><i /><i /><i /></div>
      <span className="sh-fg-city">الطائف · الورد</span>
    </div>
  )
}

export function Showcase() {
  return (
    <div className="showcase">
      <header className="sh-nav">
        <span className="sh-brand"><Compass size={18} /> منصة استكشاف السعودية</span>
        <nav>
          <a href="#models">النماذج الثلاثة</a>
          <a href="#providers">التكامل والبيانات</a>
        </nav>
      </header>

      <section className="sh-hero">
        <span className="sh-eyebrow"><Globe2 size={14} /> نماذج قرار · قابلة للتجربة</span>
        <h1>ثلاث تجارب.<br /><em>هوية واحدة للسعودية.</em></h1>
        <p>
          ثلاثة نماذج مستقلة تمامًا — لا ثلاثة ألوان لتصميم واحد. نفس الكرة الأرضية، نفس البيانات الموثقة،
          ونفس الوظائف، بثلاث لغات بصرية مختلفة. افتحها، جرّب الفاتح والداكن على الجوال والكمبيوتر، واختر.
        </p>
        <div className="sh-meta">
          <span><Sun size={13} /> فاتح وداكن</span>
          <span><Map size={13} /> خريطة تفاعلية</span>
          <span><ShieldCheck size={13} /> بيانات موثقة فقط</span>
        </div>
      </section>

      <section className="sh-grid" id="models">
        {models.map((m) => (
          <a className={`sh-card sh-card--${m.id}`} href={m.href} key={m.id}>
            <div className="sh-card-top">
              <span>{m.index}</span>
              <span>{m.en}</span>
            </div>
            <Preview kind={m.id} />
            <div className="sh-card-body">
              <span className="sh-card-tag">{m.tag}</span>
              <h2>{m.name}</h2>
              <p>{m.desc}</p>
              <span className="sh-card-foot">
                <span>{m.default}</span>
                <span className="sh-open">افتح التجربة <ArrowUpLeft size={15} /></span>
              </span>
            </div>
          </a>
        ))}
      </section>

      <section className="sh-notes" id="providers">
        <div className="sh-note">
          <ShieldCheck size={18} />
          <div>
            <b>شفافية البيانات</b>
            <p>الأماكن من لقطة OpenStreetMap، الطقس من Open-Meteo، المسارات من OSRM. لا تقييمات ولا أسعار ولا ساعات عمل مُختلقة، والصور رسوم توضيحية.</p>
          </div>
        </div>
        <GoogleStatus />
      </section>

      <footer className="sh-footer">
        <p>نماذج قابلة للتجربة للمقارنة والاختيار — ليست المنتج النهائي.</p>
        <a href="https://github.com/vasturiano/globe.gl" target="_blank" rel="noreferrer noopener">ثلاثة أسماء عمل مؤقتة</a>
      </footer>
    </div>
  )
}

function GoogleStatus() {
  const [state, setState] = useState<'idle' | 'loading' | 'ok' | 'err'>('idle')
  const [detail, setDetail] = useState('')
  const key = googleMapsKey()

  const run = () => {
    setState('loading')
    setDetail('')
    loadGoogleMaps().then((r) => {
      if (r.ok) {
        setState('ok')
        setDetail('تم تحميل Google Maps بنجاح.')
      } else {
        setState('err')
        setDetail(r.error || 'خطأ غير معروف')
      }
    })
  }

  return (
    <div className="sh-gmaps">
      <div className="sh-gmaps-head">
        <Map size={18} />
        <div>
          <b>حالة Google Maps</b>
          <p>اختبار المفتاح المقدَّم فعليًا — يعرض النتيجة بدقة.</p>
        </div>
      </div>
      {state === 'idle' && <button className="sh-gmaps-btn" onClick={run}>اختبار المفتاح الآن</button>}
      {state === 'loading' && <span className="sh-gmaps-loading">يُحمَّل Google Maps…</span>}
      {state === 'ok' && <span className="sh-gmaps-ok"><Check size={14} /> {detail}</span>}
      {state === 'err' && (
        <div className="sh-gmaps-err">
          <X size={14} />
          <div>
            <b>تعذّر التحميل</b>
            <p>{detail}</p>
            {key && <small>المفتاح المُستخدم يبدأ بـ {key.slice(0, 4)}… (أُرسل كما هو دون تغيير).</small>}
          </div>
        </div>
      )}
    </div>
  )
}
