/** Google Maps JS loader — uses the key from the environment only. */
const GOOGLE_KEY_PATTERN = /^AIza[0-9A-Za-z_-]{35}$/

export function googleMapsKey(): string | undefined {
  const raw = (import.meta.env.VITE_GOOGLE_MAPS_KEY as string | undefined) || ''
  const key = raw.trim()
  return key || undefined
}

/**
 * Returns a user-facing problem with the configured key, or null when it is
 * usable. Never includes the key itself. A Maps JS key is public by design;
 * it must be restricted by HTTP referrer and to the Maps JavaScript API in
 * Google Cloud (see .env.example and README).
 */
export function googleMapsKeyIssue(): string | null {
  const key = googleMapsKey()
  if (!key) return 'لم يُضبط VITE_GOOGLE_MAPS_KEY في ملف البيئة (.env.local)'
  if (!GOOGLE_KEY_PATTERN.test(key)) {
    return 'المفتاح لا يطابق صيغة Google (يبدأ بـ AIza ويتكوّن من 39 حرفًا) — راجع Google Cloud ولا تستخدمه قبل تصحيحه.'
  }
  return null
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
  const issue = googleMapsKeyIssue()
  if (issue) {
    return Promise.resolve({ ok: false, error: issue })
  }
  const key = googleMapsKey() as string
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
