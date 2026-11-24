import type { Place } from '../lib/types'
import { catColor } from './palette'

/**
 * Honest, non-photographic place visual: a modern abstract composition derived
 * from the place name and category. Never presented as a real venue photo.
 */
export function PlaceArt({ place, ratio = '4 / 3', className = '' }: { place: Place; ratio?: string; className?: string }) {
  const color = catColor(place.cat)
  const gid = `pa-${place.id.replace(/[^a-zA-Z0-9]/g, '')}`
  return (
    <div
      className={`place-art ${className}`}
      style={{ aspectRatio: ratio, ['--art' as string]: color }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="var(--art)" stopOpacity="0.16" />
            <stop offset="0.55" stopColor="var(--art)" stopOpacity="0.05" />
            <stop offset="1" stopColor="var(--art)" stopOpacity="0.24" />
          </linearGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#${gid})`} />
        <g opacity="0.5">
          {[0, 1, 2, 3].map((i) => (
            <circle
              key={i}
              cx={110 + i * 66}
              cy={150 + (i % 2) * 30}
              r={34 + i * 12}
              fill="none"
              stroke="var(--art)"
              strokeWidth="1.1"
              opacity={0.5 - i * 0.1}
            />
          ))}
        </g>
        <path d="M-20 210 C 90 150, 150 240, 250 170 S 380 130, 430 180" fill="none" stroke="var(--art)" strokeWidth="1.4" opacity="0.5" />
        <text x="24" y="38" fill="var(--art)" fontSize="11" fontFamily="var(--font-data)" letterSpacing="3" opacity="0.7">
          {place.nameEn ? place.nameEn.slice(0, 18).toUpperCase() : 'LOCATION'}
        </text>
        <text x="200" y="162" textAnchor="middle" fill="var(--art)" fontSize="40" fontFamily="var(--font-display)" fontWeight="700" opacity="0.92">
          {place.name.slice(0, 10)}
        </text>
      </svg>
      <span className="place-art-note">رسم توضيحي · لا توجد صورة موثوقة</span>
    </div>
  )
}
