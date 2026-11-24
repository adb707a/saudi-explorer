/**
 * Per-city visual identity, grounded in each city's real nature.
 * `accent` is a modern hue (not the retired global palette); `tagline` is factual.
 */
export interface CityIdentity {
  accent: string
  tagline: string
  motif: 'sea' | 'urban' | 'mountain' | 'desert' | 'oasis' | 'heritage' | 'coast' | 'rose'
}

const ID: Record<string, CityIdentity> = {
  riyadh: { accent: '#5b7a9d', tagline: 'العمران الحديث', motif: 'urban' },
  jeddah: { accent: '#2f9ec2', tagline: 'البحر والواجهة', motif: 'sea' },
  dammam: { accent: '#2aa8a0', tagline: 'ساحل الخليج', motif: 'coast' },
  makkah: { accent: '#b3933f', tagline: 'قلب المقدّس', motif: 'heritage' },
  madinah: { accent: '#3fa66b', tagline: 'النخيل والطمأنينة', motif: 'oasis' },
  attaif: { accent: '#d16d8a', tagline: 'المرتفعات والورد', motif: 'rose' },
  abha: { accent: '#5f86c4', tagline: 'الجبال والضباب', motif: 'mountain' },
  alula: { accent: '#c9855a', tagline: 'التكوينات الصخرية', motif: 'desert' },
  tabuk: { accent: '#4a9e8c', tagline: 'الواحة الشمالية', motif: 'oasis' },
  buraydah: { accent: '#7aa05a', tagline: 'أرض النخيل', motif: 'oasis' },
  hail: { accent: '#c2984a', tagline: 'جبال أجا وسلمى', motif: 'mountain' },
  najran: { accent: '#b07a3f', tagline: 'الأخدود والتراث', motif: 'heritage' },
  yanbualbahr: { accent: '#2f9ec2', tagline: 'بحر وشعب مرجانية', motif: 'sea' },
  jizan: { accent: '#2fae9b', tagline: 'السهول الاستوائية', motif: 'oasis' },
  albahah: { accent: '#4a9e6b', tagline: 'الغابات والجبال', motif: 'mountain' },
  qatif: { accent: '#2aa8a0', tagline: 'الواحة الساحلية', motif: 'coast' },
  alahsahofuf: { accent: '#7aa05a', tagline: 'أكبر واحة نخيل', motif: 'oasis' },
  dhahran: { accent: '#5b7a9d', tagline: 'قلب الطاقة', motif: 'urban' },
  khamismushait: { accent: '#5f86c4', tagline: 'المرتفعات', motif: 'mountain' },
  alkharjdilam: { accent: '#4a9e8c', tagline: 'العيون والواحات', motif: 'oasis' },
}

const FALLBACK: CityIdentity = { accent: '#d84b3f', tagline: 'وجهة سعودية', motif: 'heritage' }

export function cityIdentity(id: string): CityIdentity {
  return ID[id] ?? FALLBACK
}
