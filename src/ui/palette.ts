import type { Category } from '../lib/types'

/**
 * Modern semantic category colors (shared meaning across the three models).
 * These replace the retired earthy palette — they are neutral, high-contrast
 * semantic hues, and each model may tint them via its own CSS variables.
 */
export const CAT_COLOR: Record<Category, string> = {
  food: '#E4573D',
  cafe: '#D99A2B',
  nature: '#3FA66B',
  culture: '#5B7CFA',
  shop: '#9A5CFF',
  photo: '#EC6AB0',
}

export const CAT_SOFT: Record<Category, string> = {
  food: 'rgba(228, 87, 61, 0.14)',
  cafe: 'rgba(217, 154, 43, 0.16)',
  nature: 'rgba(63, 166, 107, 0.16)',
  culture: 'rgba(91, 124, 250, 0.15)',
  shop: 'rgba(154, 92, 255, 0.15)',
  photo: 'rgba(236, 106, 176, 0.15)',
}

export function catColor(cat: Category): string {
  return CAT_COLOR[cat]
}

export function catSoft(cat: Category): string {
  return CAT_SOFT[cat]
}
