import { lazy, Suspense, useEffect, useState } from 'react'
import { OrbitApp } from './designs/orbit/OrbitApp'
import { ScopeApp } from './designs/scope/ScopeApp'
import { FieldGuideApp } from './designs/fieldguide/FieldGuideApp'
import { Gallery } from './designs/Gallery'
import { AtlasApp } from './designs/atlas/AtlasApp'
import { PulseApp } from './designs/pulse/PulseApp'
import { DarbApp } from './designs/darb/DarbApp'

// Loaded only when #showcase is opened. This also keeps the optional Google
// Maps key out of the main ORBIT bundle when one is configured at build time.
const Showcase = lazy(() => import('./designs/showcase/Showcase').then((m) => ({ default: m.Showcase })))

/**
 * ORBIT is the official experience: the bare URL opens it directly.
 * The other builds stay reachable by hash for reference and development.
 */
type Route =
  | 'orbit'
  | 'showcase'
  | 'scope'
  | 'fieldguide'
  | 'legacy'
  | 'atlas'
  | 'pulse'
  | 'darb'

function readRoute(): Route {
  const h = window.location.hash.replace(/^#\/?/, '').split('?')[0]
  if (h === 'showcase') return 'showcase'
  if (h === 'scope' || h === 'fieldguide') return h
  if (h === 'legacy') return 'legacy'
  if (h === 'atlas' || h === 'pulse' || h === 'darb') return h
  return 'orbit'
}

export default function App() {
  const [route, setRoute] = useState<Route>(readRoute)

  useEffect(() => {
    const onHash = () => {
      setRoute(readRoute())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  if (route === 'showcase') {
    return (
      <Suspense fallback={<div style={{ minHeight: '60vh', display: 'grid', placeItems: 'center', fontFamily: 'var(--font-ui)', color: 'var(--ink-500)' }}>نجهّز النماذج…</div>}>
        <Showcase />
      </Suspense>
    )
  }
  if (route === 'scope') return <ScopeApp />
  if (route === 'fieldguide') return <FieldGuideApp />
  if (route === 'legacy') return <Gallery about={false} />
  if (route === 'atlas') return <AtlasApp />
  if (route === 'pulse') return <PulseApp />
  if (route === 'darb') return <DarbApp />
  return <OrbitApp />
}
