import {
  Camera,
  Coffee,
  Landmark,
  ShoppingBag,
  Trees,
  Utensils,
  type LucideIcon,
} from 'lucide-react'
import { CATEGORY_META } from '../lib/catalog'
import type { Category } from '../lib/types'

const ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  coffee: Coffee,
  trees: Trees,
  landmark: Landmark,
  bag: ShoppingBag,
  camera: Camera,
}

export function CategoryIcon({
  cat,
  size = 16,
  strokeWidth = 1.8,
}: {
  cat: Category
  size?: number
  strokeWidth?: number
}) {
  const Icon = ICONS[CATEGORY_META[cat].icon] ?? Landmark
  return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" />
}
