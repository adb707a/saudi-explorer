import citiesRaw from '../data/cities.json'
import placesRaw from '../data/places.json'
import type { Category, City, Place } from './types'

export const cities = citiesRaw as City[]
export const places = placesRaw as Place[]

export const featuredCities = cities.filter((c) => c.featured)

export const CATEGORY_META: Record<
  Category,
  { label: string; short: string; color: string; soft: string; icon: string }
> = {
  food: { label: 'مطاعم', short: 'مطعم', color: '#B4512E', soft: '#F1DCCF', icon: 'utensils' },
  cafe: { label: 'مقاهٍ', short: 'مقهى', color: '#8A4A2B', soft: '#ECD9C8', icon: 'coffee' },
  nature: { label: 'طبيعة', short: 'طبيعة', color: '#135957', soft: '#D6E3D9', icon: 'trees' },
  culture: { label: 'تاريخ وثقافة', short: 'ثقافة', color: '#135957', soft: '#D9E4E1', icon: 'landmark' },
  shop: { label: 'تسوق', short: 'تسوق', color: '#B4512E', soft: '#F3DED0', icon: 'bag' },
  photo: { label: 'إطلالات وتصوير', short: 'إطلالة', color: '#7B5A23', soft: '#F0E3C8', icon: 'camera' },
}

export const ALL_CATEGORIES = Object.keys(CATEGORY_META) as Category[]

export const DATA_SNAPSHOT = '21 نوفمبر 2026'
export const DATA_SOURCE_NOTE =
  'أسماء الأماكن والمواقع من لقطة OpenStreetMap. لا تتوفر تقييمات أو أسعار أو ساعات عمل موثوقة، لذلك لا نعرضها.'

export function cityById(id: string): City | undefined {
  return cities.find((c) => c.id === id)
}

export function placesInCity(cityName: string): Place[] {
  return places.filter((p) => p.city === cityName)
}

export function countByCategory(list: Place[]): Record<Category, number> {
  const base = { food: 0, cafe: 0, nature: 0, culture: 0, shop: 0, photo: 0 }
  for (const p of list) base[p.cat] = (base[p.cat] || 0) + 1
  return base
}

export function formatNum(n: number, digits = 0): string {
  return new Intl.NumberFormat('ar-SA-u-nu-latn', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  }).format(n)
}

export function formatDateAr(date: string): string {
  if (!date) return ''
  const d = new Date(date + 'T12:00:00')
  if (Number.isNaN(d.getTime())) return date
  return new Intl.DateTimeFormat('ar-SA-u-nu-latn', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(d)
}

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function fromMinutes(total: number): string {
  const t = ((Math.round(total) % 1440) + 1440) % 1440
  const h = Math.floor(t / 60)
  const m = t % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function displayTime(time: string): string {
  const [h, m] = time.split(':').map(Number)
  const suffix = h < 12 ? 'ص' : 'م'
  const hr = h % 12 || 12
  return `${hr}:${String(m || 0).padStart(2, '0')} ${suffix}`
}

/** Haversine distance in km. */
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const la1 = (a.lat * Math.PI) / 180
  const la2 = (b.lat * Math.PI) / 180
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function directionsUrl(p: Place): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
}

export function weatherLabel(code: number): string {
  if (code === 0) return 'صافٍ'
  if (code <= 3) return 'غائم جزئيًا'
  if (code <= 48) return 'ضباب'
  if (code <= 57) return 'رذاذ'
  if (code <= 67) return 'مطر'
  if (code <= 77) return 'ثلج'
  if (code <= 82) return 'زخات مطر'
  if (code <= 86) return 'زخات ثلج'
  return 'عاصفة رعدية'
}
