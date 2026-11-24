import { CATEGORY_META } from '../lib/catalog'
import type { Place } from '../lib/types'

/** Abstract, clearly non-photographic artwork — never a fake venue photo. */
export function ArtTile({
  place,
  className = '',
  ratio = '4 / 3',
}: {
  place: Place
  className?: string
  ratio?: string
}) {
  const meta = CATEGORY_META[place.cat]
  const hash = [...place.name].reduce((a, c) => a + c.charCodeAt(0), 0)
  const rot = (hash % 24) - 12
  return (
    <div
      className={`art-tile ${className}`}
      style={{ aspectRatio: ratio, ['--art-color' as string]: meta.color, ['--art-soft' as string]: meta.soft }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <rect width="400" height="300" fill="var(--art-soft)" />
        <g transform={`rotate(${rot} 200 150)`}>
          <circle cx="310" cy="64" r="78" fill="none" stroke="var(--art-color)" strokeWidth="1.2" opacity=".5" />
          <circle cx="310" cy="64" r="54" fill="none" stroke="var(--art-color)" strokeWidth="1" opacity=".35" strokeDasharray="4 7" />
          <path d="M-30 250 C 70 160, 130 290, 230 205 S 350 150, 450 225" fill="none" stroke="var(--art-color)" strokeWidth="2" opacity=".5" />
          <path d="M-20 268 C 80 185, 150 310, 250 230 S 360 180, 445 245" fill="none" stroke="var(--art-color)" strokeWidth="1" opacity=".3" />
        </g>
        <path d="M28 34 h56 M28 34 v56" stroke="var(--art-color)" strokeWidth="1.5" opacity=".55" />
        <path d="M372 266 h-56 M372 266 v-56" stroke="var(--art-color)" strokeWidth="1.5" opacity=".55" />
        <text x="36" y="270" fill="var(--art-color)" fontSize="10" fontFamily="monospace" letterSpacing="2" opacity=".75">
          {place.nameEn?.slice(0, 22).toUpperCase() || 'LOCATION'}
        </text>
        <text x="200" y="160" textAnchor="middle" fill="var(--art-color)" fontSize="42" fontFamily="Noto Kufi Arabic" fontWeight="600" opacity=".9">
          {place.name.slice(0, 12)}
        </text>
        <text x="200" y="190" textAnchor="middle" fill="var(--art-color)" fontSize="10" fontFamily="monospace" letterSpacing="4" opacity=".6">
          {meta.short.toUpperCase()}
        </text>
      </svg>
      <span className="art-tile-note">رسم توضيحي · لا توجد صورة موثوقة</span>
    </div>
  )
}
