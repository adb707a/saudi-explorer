import { ExternalLink, ShieldCheck } from 'lucide-react'
import type { Place } from '../lib/types'

export function SourceLine({ place, compact = false }: { place: Place; compact?: boolean }) {
  return (
    <p className={`source-line ${compact ? 'is-compact' : ''}`}>
      <ShieldCheck size={12} /> المصدر: {place.source}
      {!compact && (
        <a href={place.sourceUrl} target="_blank" rel="noreferrer noopener">
          عرض السجل <ExternalLink size={11} />
        </a>
      )}
    </p>
  )
}

export function DataDisclosure() {
  return (
    <div className="data-disclosure">
      <ShieldCheck size={16} />
      <p>
        نعرض فقط ما نملكه فعلًا: الاسم، النوع، والإحداثيات. لا تقييمات ولا أسعار ولا ساعات عمل
        مُختلقة. الطقس من Open-Meteo، المسارات من OSRM، والأماكن من لقطة OpenStreetMap.
      </p>
    </div>
  )
}
