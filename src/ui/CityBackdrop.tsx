import type { CityTheme, Env } from './cityTheme'
import { cityGradient } from './cityTheme'
import type { CSSProperties } from 'react'

function MotifShape({ env, color }: { env: Env; color: string }) {
  const c = color
  switch (env) {
    case 'sea':
    case 'coast':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M0 150 C 50 130, 90 170, 140 150 S 230 120, 280 150 S 360 180, 400 150" opacity="0.5" />
          <path d="M0 190 C 60 170, 110 210, 160 190 S 260 160, 320 190 S 380 210, 400 190" opacity="0.35" />
          <path d="M0 230 C 70 215, 120 245, 180 230 S 290 210, 400 230" opacity="0.22" />
          <circle cx="330" cy="60" r="26" opacity="0.35" />
        </g>
      )
    case 'island':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M120 210 C 150 180, 200 180, 230 210 C 260 230, 200 250, 170 240 C 150 235, 120 235, 120 210 Z" opacity="0.5" />
          <path d="M0 235 C 80 220, 160 250, 400 235" opacity="0.3" />
          <path d="M0 260 C 100 245, 240 275, 400 260" opacity="0.2" />
        </g>
      )
    case 'desert':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M0 190 C 80 130, 150 230, 240 160 S 360 120, 400 180" opacity="0.5" />
          <path d="M0 225 C 90 175, 170 255, 260 195 S 370 165, 400 215" opacity="0.32" />
          <circle cx="90" cy="80" r="3" fill={c} opacity="0.4" />
          <circle cx="150" cy="60" r="2" fill={c} opacity="0.3" />
          <circle cx="210" cy="90" r="2.4" fill={c} opacity="0.35" />
        </g>
      )
    case 'mountain':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 210 L90 90 L170 210 Z" opacity="0.4" />
          <path d="M120 210 L220 70 L320 210 Z" opacity="0.5" />
          <path d="M260 210 L340 120 L400 210 Z" opacity="0.3" />
        </g>
      )
    case 'highland':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M0 200 L120 110 L230 200 Z" opacity="0.42" />
          <path d="M170 200 L300 100 L400 200 Z" opacity="0.32" />
          <path d="M20 90 C 90 80, 150 95, 210 88 S 340 80, 390 90" opacity="0.35" />
          <path d="M40 120 C 110 110, 180 124, 250 116" opacity="0.25" />
        </g>
      )
    case 'forest':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M60 210 L110 130 L160 210" opacity="0.45" />
          <path d="M180 210 L240 100 L300 210" opacity="0.5" />
          <path d="M300 210 L350 150 L400 210" opacity="0.35" />
        </g>
      )
    case 'oasis':
    case 'valley':
    case 'agricultural':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M200 240 C 200 200, 170 195, 170 175 C 150 175, 150 195, 120 190" opacity="0.5" />
          <path d="M200 240 C 200 205, 230 200, 230 180 C 250 180, 250 200, 280 195" opacity="0.5" />
          <path d="M60 200 L140 200 M70 220 L150 220" opacity="0.3" />
          <path d="M260 205 L340 205 M270 225 L350 225" opacity="0.3" />
        </g>
      )
    case 'urban':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinejoin="round">
          <rect x="40" y="130" width="40" height="90" opacity="0.45" />
          <rect x="90" y="90" width="34" height="130" opacity="0.5" />
          <rect x="134" y="150" width="44" height="70" opacity="0.4" />
          <rect x="190" y="70" width="30" height="150" opacity="0.55" />
          <rect x="230" y="140" width="46" height="80" opacity="0.42" />
          <rect x="290" y="100" width="34" height="120" opacity="0.5" />
          <rect x="334" y="150" width="44" height="70" opacity="0.4" />
        </g>
      )
    case 'heritage':
    case 'historical':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinejoin="round">
          <path d="M60 210 L60 120 C 60 90, 80 90, 80 120 L80 210" opacity="0.5" />
          <path d="M150 210 L150 90 C 150 60, 178 60, 178 90 L178 210" opacity="0.5" />
          <path d="M120 120 C 140 100, 170 100, 190 120" opacity="0.35" />
          <path d="M0 210 L400 210" opacity="0.3" />
        </g>
      )
    case 'volcanic':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
          <path d="M80 230 L200 70 L320 230 Z" opacity="0.45" />
          <path d="M200 70 L220 120 L180 120 Z" opacity="0.4" />
          <path d="M0 230 C 120 210, 280 250, 400 230" opacity="0.3" />
        </g>
      )
    case 'rose':
      return (
        <g stroke={c} strokeWidth="2" fill="none" strokeLinecap="round">
          <circle cx="200" cy="140" r="26" opacity="0.4" />
          <circle cx="200" cy="140" r="46" opacity="0.28" />
          <path d="M200 66 C 205 100, 205 180, 200 214" opacity="0.4" />
          <path d="M140 96 C 170 100, 230 100, 260 96" opacity="0.3" />
          <path d="M138 184 C 168 180, 232 180, 262 184" opacity="0.3" />
        </g>
      )
    default:
      return null
  }
}

export function CityBackdrop({
  theme,
  dark,
  active,
  className = '',
}: {
  theme: CityTheme
  dark: boolean
  active: boolean
  className?: string
}) {
  const accent = dark ? theme.accentDark : theme.accent
  return (
    <div
      className={`city-backdrop ${active ? 'is-active' : ''} ${className}`}
      style={
        {
          background: cityGradient(theme, dark),
          '--city-accent': accent,
          '--city-a2': theme.a2,
        } as CSSProperties
      }
      aria-hidden="true"
    >
      <div className="city-motif">
        <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
          <MotifShape env={theme.env[0]} color={accent} />
        </svg>
      </div>
    </div>
  )
}
