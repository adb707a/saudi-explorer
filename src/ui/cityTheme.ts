/**
 * Per-city visual identity, grounded in each city's real nature.
 * Each theme is multi-layered: environment tags + a light/dark accent pair.
 * Colors are modern hues (not the retired sand/clay/palm palette).
 */
export type Env =
  | 'sea'
  | 'coast'
  | 'island'
  | 'desert'
  | 'mountain'
  | 'highland'
  | 'forest'
  | 'oasis'
  | 'valley'
  | 'urban'
  | 'heritage'
  | 'historical'
  | 'agricultural'
  | 'volcanic'
  | 'rose'

export interface CityTheme {
  env: Env[]
  accent: string
  accentDark: string
  a2: string
  tagline: string
}

export const ENV_LABEL: Record<Env, string> = {
  sea: 'ساحل وبحر',
  coast: 'واجهة بحرية',
  island: 'جزر وشواطئ',
  desert: 'صحراء وكثبان',
  mountain: 'جبال',
  highland: 'مرتفعات وضباب',
  forest: 'غابات وخضرة',
  oasis: 'واحة ونخيل',
  valley: 'أودية',
  urban: 'عمران حديث',
  heritage: 'عمارة تراثية',
  historical: 'مواقع أثرية',
  agricultural: 'مناطق زراعية',
  volcanic: 'تكوينات بركانية',
  rose: 'ورد ومزارع',
}

const ENV_COLOR: Record<Env, { a: string; d: string; b: string }> = {
  sea: { a: '#0d86b8', d: '#3fb6e0', b: '#16a3c0' },
  coast: { a: '#0e8f94', d: '#34b8b2', b: '#159f8c' },
  island: { a: '#12849c', d: '#39b4cc', b: '#0e8f94' },
  desert: { a: '#c07a3a', d: '#e0a55c', b: '#a85f2a' },
  mountain: { a: '#557a63', d: '#79a68a', b: '#3f6a55' },
  highland: { a: '#6483a6', d: '#8aa8c8', b: '#4f6f94' },
  forest: { a: '#2f8f5f', d: '#4cb47e', b: '#1f6f4a' },
  oasis: { a: '#3f9e6b', d: '#58bd84', b: '#2c7f56' },
  valley: { a: '#77994d', d: '#9cbd6a', b: '#5c7f38' },
  urban: { a: '#5b6f8c', d: '#7a93ad', b: '#4e6e8e' },
  heritage: { a: '#b07a3f', d: '#c89a5a', b: '#8f6130' },
  historical: { a: '#a05a3f', d: '#c47a5a', b: '#824729' },
  agricultural: { a: '#6f9e4d', d: '#8fc26a', b: '#55813a' },
  volcanic: { a: '#8a5a5a', d: '#a87777', b: '#6d4444' },
  rose: { a: '#c96a8a', d: '#e08aa5', b: '#a85272' },
}

interface Entry {
  env: Env[]
  tagline: string
  accent?: string
  accentDark?: string
  a2?: string
}

const T: Record<string, Entry> = {
  riyadh: { env: ['urban'], tagline: 'العمران الحديث وناطحات السحاب' },
  jeddah: { env: ['sea', 'coast'], tagline: 'البحر والواجهة البحرية', accent: '#0d7fb5', accentDark: '#3fb6e0' },
  dammam: { env: ['coast', 'urban'], tagline: 'ساحل الخليج' },
  khobar: { env: ['coast', 'urban'], tagline: 'الكورنيش والخليج', accent: '#0e8f94', accentDark: '#34b8b2' },
  makkah: { env: ['heritage'], tagline: 'قلب المقدّس', accent: '#a8823a', accentDark: '#c8a556' },
  madinah: { env: ['oasis'], tagline: 'النخيل والطمأنينة' },
  attaif: { env: ['highland', 'rose'], tagline: 'المرتفعات والورد', accent: '#c96a8a', accentDark: '#e08aa5', a2: '#8a5a9e' },
  abha: { env: ['highland', 'forest'], tagline: 'الجبال والضباب', accent: '#4f7ea8', accentDark: '#79a6cc' },
  alula: { env: ['desert', 'historical'], tagline: 'التكوينات الصخرية والأثر', accent: '#c9855a', accentDark: '#e0a578' },
  tabuk: { env: ['oasis', 'mountain'], tagline: 'الواحة الشمالية' },
  buraydah: { env: ['agricultural', 'oasis'], tagline: 'أرض النخيل' },
  hail: { env: ['mountain', 'desert'], tagline: 'جبال أجا وسلمى', accent: '#b0863a', accentDark: '#d0a556' },
  najran: { env: ['historical', 'agricultural'], tagline: 'الأخدود والتراث', accent: '#a8723a', accentDark: '#c8945a' },
  yanbualbahr: { env: ['sea', 'coast'], tagline: 'البحر والشعاب المرجانية', accent: '#0d86b8', accentDark: '#3fb6e0' },
  jizan: { env: ['coast', 'agricultural'], tagline: 'السهول الاستوائية', accent: '#159f7c', accentDark: '#3cc09a' },
  albahah: { env: ['forest', 'mountain'], tagline: 'الغابات والجبال' },
  qatif: { env: ['coast', 'oasis'], tagline: 'الواحة الساحلية' },
  alahsahofuf: { env: ['oasis', 'agricultural'], tagline: 'أكبر واحة نخيل', accent: '#4f9e5c', accentDark: '#74bd80' },
  dhahran: { env: ['urban'], tagline: 'قلب الطاقة' },
  khamismushait: { env: ['highland'], tagline: 'المرتفعات' },
  alkharjdilam: { env: ['oasis', 'agricultural'], tagline: 'العيون والواحات' },
  arar: { env: ['desert'], tagline: 'بوابة الشمال' },
  sakakah: { env: ['desert', 'agricultural'], tagline: 'الجوف الزراعية' },
  dawmataljandal: { env: ['historical', 'oasis'], tagline: 'الآثار والنخيل', accent: '#a8723a', accentDark: '#c8945a' },
  rafha: { env: ['desert'], tagline: 'الكثبان الشمالية' },
  qurayyat: { env: ['desert', 'agricultural'], tagline: 'الحدود والزراعة' },
  turaif: { env: ['desert', 'volcanic'], tagline: 'الحَرّات الشمالية', accent: '#8a5a5a', accentDark: '#a87777' },
  hafaralbatin: { env: ['desert'], tagline: 'الصحراء الشرقية' },
  aljubayl: { env: ['coast', 'urban'], tagline: 'المدينة الصناعية والبحر' },
  rastanura: { env: ['sea', 'coast'], tagline: 'ساحل الطاقة', accent: '#0d86b8', accentDark: '#3fb6e0' },
  khafji: { env: ['coast'], tagline: 'شاطئ الحدود الشمالية' },
  salwa: { env: ['coast', 'desert'], tagline: 'ساحل الربع الخالي' },
  sharurah: { env: ['desert'], tagline: 'الربع الخالي' },
  wadiaddawasir: { env: ['desert', 'valley'], tagline: 'وادي الدواسر', accent: '#a58a3a', accentDark: '#c8ad5a' },
  assulayyil: { env: ['desert'], tagline: 'رمال الربع الخالي' },
  bisha: { env: ['valley', 'agricultural'], tagline: 'وادي بيشة' },
  sabya: { env: ['agricultural', 'coast'], tagline: 'سهول تهامة' },
  farasan: { env: ['island', 'sea'], tagline: 'الجزر المرجانية', accent: '#12849c', accentDark: '#39b4cc' },
  baljurashi: { env: ['forest', 'mountain'], tagline: 'الغابات الجنوبية' },
  alnamas: { env: ['mountain', 'forest'], tagline: 'مرتفعات النماص' },
  rijalalmaa: { env: ['heritage', 'mountain'], tagline: 'القرية التراثية', accent: '#a8723a', accentDark: '#c8945a' },
  mahayelasir: { env: ['mountain'], tagline: 'جبال عسير' },
  tayma: { env: ['historical', 'desert'], tagline: 'الآثار القديمة', accent: '#a8723a', accentDark: '#c8945a' },
  umluj: { env: ['island', 'sea'], tagline: 'جزر مالديف السعودية', accent: '#12849c', accentDark: '#39b4cc' },
  alwajh: { env: ['coast', 'sea'], tagline: 'ساحل البحر الأحمر', accent: '#0d86b8', accentDark: '#3fb6e0' },
  duba: { env: ['coast', 'mountain'], tagline: 'ساحل ومشروع نيوم' },
  haql: { env: ['coast', 'mountain'], tagline: 'شواطئ الحقل' },
  badr: { env: ['heritage', 'historical'], tagline: 'بدر التاريخية', accent: '#a8723a', accentDark: '#c8945a' },
  rabigh: { env: ['coast', 'urban'], tagline: 'الساحل الصناعي' },
  allith: { env: ['coast', 'mountain'], tagline: 'ساحل الليث' },
  alqunfudhah: { env: ['coast'], tagline: 'ساحل القنفذة' },
  almajmaah: { env: ['oasis', 'historical'], tagline: 'المجمعة التراثية' },
  zulfi: { env: ['oasis', 'agricultural'], tagline: 'الزلفي والنخيل' },
  shaqra: { env: ['heritage'], tagline: 'شقراء التراثية', accent: '#a8723a', accentDark: '#c8945a' },
  dawadmi: { env: ['desert', 'agricultural'], tagline: 'الدوادمي' },
  alquwayiyah: { env: ['desert'], tagline: 'القويعية' },
  alghat: { env: ['oasis', 'heritage'], tagline: 'الغاط التراثية', accent: '#a8723a', accentDark: '#c8945a' },
  alrass: { env: ['agricultural'], tagline: 'الرس الزراعية' },
  albukayriyah: { env: ['agricultural'], tagline: 'البكيرية والنخيل' },
  unayzah: { env: ['agricultural', 'oasis'], tagline: 'عنيزة والتمور' },
  almithnab: { env: ['agricultural'], tagline: 'المذنب الزراعية' },
  buqayq: { env: ['desert', 'urban'], tagline: 'بقيق الطاقة' },
  annuayriyah: { env: ['desert'], tagline: 'النعيرية' },
}

const FALLBACK: CityTheme = {
  env: ['heritage'],
  accent: '#a0723f',
  accentDark: '#c2945a',
  a2: '#8f6130',
  tagline: 'وجهة سعودية',
}

export function cityTheme(id: string): CityTheme {
  const e = T[id]
  if (!e) return FALLBACK
  const base = ENV_COLOR[e.env[0]] ?? ENV_COLOR.heritage
  return {
    env: e.env,
    accent: e.accent ?? base.a,
    accentDark: e.accentDark ?? base.d,
    a2: e.a2 ?? base.b,
    tagline: e.tagline,
  }
}

/** CSS gradient string for a themed backdrop (light/dark aware). */
export function cityGradient(theme: CityTheme, dark: boolean): string {
  const accent = dark ? theme.accentDark : theme.accent
  return dark
    ? `radial-gradient(120% 90% at 15% 0%, ${accent}33 0%, transparent 45%), radial-gradient(120% 90% at 90% 110%, ${theme.a2}2e 0%, transparent 50%), var(--bg1)`
    : `radial-gradient(120% 90% at 15% 0%, ${accent}26 0%, transparent 46%), radial-gradient(120% 90% at 90% 110%, ${theme.a2}20 0%, transparent 50%), var(--bg1)`
}
