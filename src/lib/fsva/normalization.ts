import { INDICATOR_RANGES } from './constants'

type IndicatorKey = keyof typeof INDICATOR_RANGES

// Tentukan prioritas individu (1-6) berdasarkan range Tabel 2 Juknis
export function getPriorityIndividual(key: IndicatorKey, value: number): number {
  const range = INDICATOR_RANGES[key]
  const { breaks, inverse } = range

  // Stunting: 4 range (WHO), bukan 6
  if ('who' in range && range.who) {
    if (value >= 40) return 1
    if (value >= 30) return 2
    if (value >= 20) return 3
    return 4
  }

  // 6 range standar
  let priority: number
  if (inverse) {
    // Nilai besar = lebih buruk = prioritas rendah (1)
    if (value >= breaks[4]) priority = 1
    else if (value >= breaks[3]) priority = 2
    else if (value >= breaks[2]) priority = 3
    else if (value >= breaks[1]) priority = 4
    else if (value >= breaks[0]) priority = 5
    else priority = 6
  } else {
    // Nilai kecil = lebih buruk = prioritas rendah (1)
    if (value < breaks[0]) priority = 1
    else if (value < breaks[1]) priority = 2
    else if (value < breaks[2]) priority = 3
    else if (value < breaks[3]) priority = 4
    else if (value < breaks[4]) priority = 5
    else priority = 6
  }
  return priority
}

// Normalisasi nilai ke skala 0-1 berdasarkan min-max range
// Min = nilai terburuk (P1), Max = nilai terbaik (P6)
export function normalizeValue(key: IndicatorKey, value: number): number {
  const range = INDICATOR_RANGES[key]
  const { breaks, inverse } = range

  // Untuk stunting (WHO, 4 range)
  if ('who' in range && range.who) {
    const min_val = 40, max_val = 20
    const clamped = Math.min(Math.max(value, max_val), min_val)
    return (min_val - clamped) / (min_val - max_val)
  }

  let min_val: number, max_val: number
  if (inverse) {
    // Nilai besar = buruk: min = breaks[4] (batas P1/P2), max = breaks[0]
    min_val = breaks[4]; max_val = breaks[0]
    const clamped = Math.min(Math.max(value, max_val), min_val)
    return (min_val - clamped) / (min_val - max_val)
  } else {
    // Nilai kecil = buruk: min = breaks[0], max = breaks[4]
    min_val = breaks[0]; max_val = breaks[4]
    const clamped = Math.min(Math.max(value, min_val), max_val)
    return (clamped - min_val) / (max_val - min_val)
  }
}
