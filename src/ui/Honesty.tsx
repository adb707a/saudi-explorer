import { CalendarDays, ExternalLink, Info, ShieldCheck } from 'lucide-react'
import type { Place } from '../lib/types'

/** Honest data-source line (fresh implementation, model-independent). */
export function SourceNote({ place }: { place: Place }) {
  return (
    <p className="ui-source">
      <ShieldCheck size={12} /> المصدر: {place.source}
      <a href={place.sourceUrl} target="_blank" rel="noreferrer noopener">
        السجل <ExternalLink size={11} />
      </a>
    </p>
  )
}

/** Honest events state — no official live feed connected yet. */
export function EventsNote({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`ui-events ${compact ? 'is-compact' : ''}`}>
      <span className="ui-events-icon">
        <CalendarDays size={16} />
      </span>
      <div>
        <strong>الفعاليات بانتظار مصدر رسمي</strong>
        <p>{compact ? 'لا نعرض فعالية غير موثوقة.' : 'لم نربط بعد تقويمًا رسميًا للفعاليات، ولن نعرض فعالية أو موعدًا غير موثوق.'}</p>
      </div>
      <a href="https://events.sa" target="_blank" rel="noreferrer noopener">
        المنصة الرسمية <ExternalLink size={12} />
      </a>
    </div>
  )
}

/** Data disclosure banner. */
export function Disclosure() {
  return (
    <div className="ui-disclosure">
      <Info size={15} />
      <p>
        نعرض ما نملكه فعلًا: الاسم، النوع، والإحداثيات. لا تقييمات ولا أسعار ولا ساعات عمل مُختلقة.
        الطقس من Open-Meteo، المسارات من OSRM، والأماكن من لقطة OpenStreetMap.
      </p>
    </div>
  )
}
