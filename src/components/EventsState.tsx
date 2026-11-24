import { CalendarDays, ExternalLink } from 'lucide-react'

/** Honest events state: no official live feed is connected yet. */
export function EventsState({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`events-state ${compact ? 'is-compact' : ''}`}>
      <span className="events-state-icon"><CalendarDays size={18} /></span>
      <div>
        <strong>الفعاليات بانتظار مصدر رسمي</strong>
        <p>
          لم نربط بعد تقويمًا رسميًا للفعاليات، ولن نعرض فعالية أو موعدًا غير موثوق.
          {!compact && ' الواجهة جاهزة لاستقبال مصدر معتمد عند ربطه.'}
        </p>
      </div>
      <a href="https://events.sa" target="_blank" rel="noreferrer noopener">
        المنصة الرسمية <ExternalLink size={12} />
      </a>
    </div>
  )
}
