export type Category = 'food' | 'cafe' | 'nature' | 'culture' | 'shop' | 'photo'

export interface City {
  id: string
  ar: string
  en: string
  lat: number
  lng: number
  region: string
  featured: boolean
}

export interface Place {
  id: string
  city: string
  name: string
  nameEn?: string
  lat: number
  lng: number
  kind: string
  cat: Category
  source: string
  sourceUrl: string
  tags?: {
    cuisine?: string
    religion?: string
    historic?: string
    tourism?: string
  }
}

export interface RouteLeg {
  distanceKm: number
  durationMin: number
}

export interface DriveRoute {
  coordinates: [number, number][]
  distanceKm: number
  durationMin: number
  legs: RouteLeg[]
  source: 'OSRM' | 'estimate'
}

export type GroupKind = 'family' | 'friends' | 'solo'

export interface PlanInput {
  cityId: string
  people: number
  budget: number
  date: string
  startTime: string
  durationHours: number
  group: GroupKind
  prefs: Category[]
}

export interface PlanStop {
  place: Place
  stayMin: number
  arrival: string
  departure: string
  travelKm: number
  travelMin: number
  reason: string
}

export interface Plan {
  id: string
  input: PlanInput
  stops: PlanStop[]
  alternatives: Place[]
  summary: {
    totalKm: number
    totalMin: number
    visitMin: number
    title: string
    note: string
  }
  budget: {
    experiences: number
    food: number
    transport: number
  }
}

export interface WeatherNow {
  temperature: number
  apparent: number
  humidity: number
  wind: number
  code: number
  time: string
  daily: Array<{ date: string; max: number; min: number; code: number }>
}
