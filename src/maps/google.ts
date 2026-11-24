/** Google Maps JS loader — uses the key from the environment only. */

export function googleMapsKey(): string | undefined {
  return import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined
}

export interface GoogleResult {
  ok: boolean
  error?: string
}

interface GoogleWindow extends Window {
  __gmapsReady?: () => void
  google?: unknown
}

export function loadGoogleMaps(): Promise<GoogleResult> {
  const key = googleMapsKey()
  if (!key) {
    return Promise.resolve({ ok: false, error: 'لم يُضبط VITE_GOOGLE_MAPS_KEY في ملف البيئة (.env.local)' })
  }
  if (document.querySelector('script[data-gmaps]')) {
    return Promise.resolve({ ok: true })
  }
  return new Promise((resolve) => {
    const w = window as GoogleWindow
    let settled = false
    const done = (r: GoogleResult) => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(r)
    }

    const timer = window.setTimeout(() => done({ ok: false, error: 'انتهت مهلة تحميل Google Maps (timeout)' }), 15000)

    // Fired by Google when the key is invalid, deactivated, or the API isn't enabled.
    const onAuthFailure = () => done({ ok: false, error: 'gm_authFailure: المفتاح غير صالح أو API غير مفعّل أو فوترة غير مفعّلة' })
    w.addEventListener('gm_authFailure', onAuthFailure, { once: true })

    w.__gmapsReady = () => {
      window.removeEventListener('gm_authFailure', onAuthFailure)
      done({ ok: true })
    }

    const s = document.createElement('script')
    s.dataset.gmaps = '1'
    s.async = true
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&callback=__gmapsReady&v=weekly&loading=async`
    s.onerror = () => done({ ok: false, error: 'فشل تحميل برنامج Google Maps النصي (network/HTTP error)' })
    document.head.appendChild(s)
  })
}
