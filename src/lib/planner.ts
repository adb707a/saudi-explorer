import { cityById, CATEGORY_META, distanceKm, displayTime, fromMinutes, placesInCity, toMinutes } from './catalog'
import type { Plan, PlanInput, PlanStop, Place, Category } from './types'

const STAY: Record<Category, number> = {
  food: 75,
  cafe: 55,
  nature: 100,
  culture: 85,
  shop: 60,
  photo: 40,
}

const GROUP_AFFINITY: Record<PlanInput['group'], Partial<Record<Category, number>>> = {
  family: { nature: 8, culture: 7, shop: 5, food: 4 },
  friends: { cafe: 8, food: 7, photo: 6, shop: 3 },
  solo: { cafe: 8, culture: 8, photo: 8, nature: 5 },
}

export const GROUP_LABEL: Record<PlanInput['group'], string> = {
  family: 'عائلة',
  friends: 'أصدقاء',
  solo: 'فرد',
}

export function defaultPlanInput(cityId: string): PlanInput {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  const iso = d.toISOString().slice(0, 10)
  return {
    cityId,
    people: 3,
    budget: 600,
    date: iso,
    startTime: '16:00',
    durationHours: 6,
    group: 'friends',
    prefs: ['cafe', 'food', 'culture', 'photo'],
  }
}

function groupReason(group: PlanInput['group'], cat: Category): string {
  if (group === 'family') {
    if (cat === 'nature') return 'مساحة مفتوحة تناسب وقفة عائلية هادئة'
    if (cat === 'culture') return 'تجربة ثقافية خفيفة تناسب المجموعة'
    if (cat === 'shop') return 'خيار عملي داخل مسار الطلعة'
  }
  if (group === 'friends') {
    if (cat === 'cafe') return 'محطة قهوة مناسبة لجلسة الأصدقاء'
    if (cat === 'food') return 'محطة طعام في منتصف المسار'
    if (cat === 'photo') return 'نقطة تصوير قريبة من بقية المحطات'
  }
  if (cat === 'cafe') return 'محطة هادئة لفرد واحد'
  if (cat === 'culture') return 'وقت مخصص للاستكشاف الثقافي'
  return 'تنويع مناسب لطلعة فردية'
}

/**
 * A transparent, deterministic recommendation engine.
 * It is deliberately NOT presented as AI. Every reason is derived from the
 * filters the visitor chose, category and distance only. No ratings, prices,
 * opening hours or venue suitability data are invented.
 */
export function buildPlan(input: PlanInput, pool?: Place[]): Plan {
  const city = cityById(input.cityId)
  const all = pool ?? (city ? placesInCity(city.ar) : [])
  const prefs = input.prefs.length ? input.prefs : (['culture', 'nature', 'food', 'cafe'] as Category[])

  const targetCount = Math.max(2, Math.min(6, Math.round(input.durationHours / 1.8)))

  const scored = all
    .map((p) => {
      let score = prefs.includes(p.cat) ? 40 : 0
      score += GROUP_AFFINITY[input.group][p.cat] ?? 0
      if (city) score += Math.max(0, 9 - distanceKm(city, p))
      return { p, score }
    })
    .sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id))

  // Encourage category variety, then fill by score.
  const picked: Place[] = []
  for (const cat of prefs) {
    const hit = scored.find((s) => s.p.cat === cat && !picked.some((p) => p.id === s.p.id))
    if (hit) picked.push(hit.p)
    if (picked.length >= targetCount) break
  }
  for (const s of scored) {
    if (picked.length >= targetCount) break
    if (!picked.some((p) => p.id === s.p.id)) picked.push(s.p)
  }

  // Greedy nearest-neighbour ordering from the city centre.
  const ordered: Place[] = []
  let cursor = city ?? picked[0]
  const remaining = [...picked]
  while (remaining.length && cursor) {
    remaining.sort((a, b) => distanceKm(cursor!, a) - distanceKm(cursor!, b))
    const next = remaining.shift()!
    ordered.push(next)
    cursor = next
  }

  const start = toMinutes(input.startTime)
  let clock = start
  let prev: Place | { lat: number; lng: number } | null = city ?? null
  let totalKm = 0
  const stops: PlanStop[] = ordered.map((p) => {
    const km = prev ? distanceKm(prev, p) : 0
    const travelMin = Math.round((km / 32) * 60) // conservative urban estimate
    totalKm += km
    clock += travelMin
    const arrival = fromMinutes(clock)
    const stay = STAY[p.cat]
    clock += stay
    const departure = fromMinutes(clock)
    const reason = prefs.includes(p.cat)
      ? `${CATEGORY_META[p.cat].label} ضمن ما اخترته، و${groupReason(input.group, p.cat)}`
      : groupReason(input.group, p.cat)
    prev = p
    return {
      place: p,
      stayMin: stay,
      arrival,
      departure,
      travelKm: Math.round(km * 10) / 10,
      travelMin,
      reason,
    }
  })

  const alternatives = scored
    .filter((s) => !picked.some((p) => p.id === s.p.id))
    .slice(0, 4)
    .map((s) => s.p)

  const visitMin = stops.reduce((sum, s) => sum + s.stayMin, 0)
  const travelMin = stops.reduce((sum, s) => sum + s.travelMin, 0)

  return {
    id: `plan-${Date.now()}`,
    input,
    stops,
    alternatives,
    summary: {
      totalKm: Math.round(totalKm * 10) / 10,
      totalMin: visitMin + travelMin,
      visitMin,
      title: city ? `طلعة ${city.ar}` : 'طلعة مقترحة',
      note:
        'ترتيب المحطات وأوقاتها تقديري. المسافة تُحسب أوليًا بخط مباشر ثم تُحدَّث إن نجح مسار OSRM. الأسعار غير متوفرة لهذه الأماكن.',
    },
    budget: {
      experiences: Math.round(input.budget * 0.4),
      food: Math.round(input.budget * 0.35),
      transport: Math.round(input.budget * 0.25),
    },
  }
}

function makeReason(plan: Plan, place: Place): string {
  if (plan.input.prefs.includes(place.cat)) {
    return `${CATEGORY_META[place.cat].label} ضمن ما اخترته، و${groupReason(plan.input.group, place.cat)}`
  }
  return groupReason(plan.input.group, place.cat)
}

/** Rebuild a plan after the visitor adds, removes or reorders stops. */
export function resequencePlan(plan: Plan, places: Place[]): Plan {
  const city = cityById(plan.input.cityId)
  let clock = toMinutes(plan.input.startTime)
  let prev: { lat: number; lng: number } | null = city ?? null
  let totalKm = 0
  let visitMin = 0
  let travelMin = 0
  const stops: PlanStop[] = places.map((p) => {
    const km = prev ? distanceKm(prev, p) : 0
    const travel = Math.round((km / 32) * 60)
    totalKm += km
    travelMin += travel
    clock += travel
    const arrival = fromMinutes(clock)
    const stay = STAY[p.cat]
    clock += stay
    visitMin += stay
    prev = p
    return {
      place: p,
      stayMin: stay,
      arrival,
      departure: fromMinutes(clock),
      travelKm: Math.round(km * 10) / 10,
      travelMin: travel,
      reason: makeReason(plan, p),
    }
  })
  return {
    ...plan,
    stops,
    summary: {
      ...plan.summary,
      totalKm: Math.round(totalKm * 10) / 10,
      totalMin: visitMin + travelMin,
      visitMin,
    },
  }
}

export function retimePlan(plan: Plan): Plan {
  const start = toMinutes(plan.input.startTime)
  let clock = start
  let totalKm = 0
  let visitMin = 0
  let travelMin = 0
  const stops = plan.stops.map((s, i) => {
    const prev = i === 0 ? cityById(plan.input.cityId) : plan.stops[i - 1].place
    const km = s.travelKm
    const travel = prev ? s.travelMin : 0
    totalKm += km
    travelMin += travel
    clock += travel
    const arrival = fromMinutes(clock)
    clock += s.stayMin
    visitMin += s.stayMin
    return { ...s, arrival, departure: fromMinutes(clock) }
  })
  return {
    ...plan,
    stops,
    summary: {
      ...plan.summary,
      totalKm: Math.round(totalKm * 10) / 10,
      totalMin: visitMin + travelMin,
      visitMin,
    },
  }
}

export function describePlan(plan: Plan): string[] {
  if (!plan.stops.length) return []
  const cats = new Set(plan.stops.map((s) => s.place.cat))
  const lines: string[] = []
  lines.push(`المسار يضم ${plan.stops.length} محطات و${cats.size} فئات مختلفة.`)
  if (plan.stops.length > 1) {
    lines.push(`المسافة التقديرية بين المحطات ${plan.summary.totalKm} كم.`)
  }
  const first = plan.stops[0]
  const last = plan.stops[plan.stops.length - 1]
  lines.push(`تبدأ ${displayTime(first.arrival)} وتنتهي تقديريًا ${displayTime(last.departure)}.`)
  if (plan.input.people > 1) {
    lines.push(`الميزانية ${plan.input.budget} ر.س لـ ${plan.input.people} أشخاص، موزّعة كاقتراح لا كأسعار أماكن.`)
  }
  return lines
}
