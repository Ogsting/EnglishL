import type { Material, RankPart } from './types'

/** 段位是进位制：1 煤 → 10 煤 = 1 铜 → 10 铜 = 1 铁 → … */
export const BASE = 10

/** 段位牌上各数位的字号（从高到低） */
const SIZES = [30, 20, 15]

export function dateKey(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function shiftDate(key: string, deltaDays: number): string {
  const [y, m, d] = key.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + deltaDays)
  return dateKey(dt)
}

/**
 * 把累计煤数拆成各数位。
 * 11 → 1 铜 + 1 煤；5 → 5 煤；100 → 1 铁。
 */
export function breakdown(coals: number, materials: Material[], maxParts = 3): RankPart[] {
  const total = Math.max(0, Math.floor(coals))
  const digits: number[] = []
  let rest = total
  do {
    digits.push(rest % BASE)
    rest = Math.floor(rest / BASE)
  } while (rest > 0)

  const parts: RankPart[] = []
  for (let power = digits.length - 1; power >= 0 && parts.length < maxParts; power--) {
    const count = digits[power]
    if (count === 0) continue
    parts.push({
      material: materials[Math.min(power, materials.length - 1)],
      power,
      count,
      size: SIZES[parts.length] ?? 14
    })
  }

  if (parts.length === 0) {
    parts.push({ material: materials[0], power: 0, count: 0, size: SIZES[0] })
  }
  return parts
}

/** 11 → 「1 铜 + 1 煤」 */
export function breakdownText(coals: number, materials: Material[], maxParts = 3): string {
  return breakdown(coals, materials, maxParts)
    .map((p) => `${p.count} ${p.material.name}`)
    .join(' + ')
}

/** 距离下一颗煤（下一个小段位）还差多少 */
export function coalsToNextMaterial(coals: number): number {
  const step = BASE ** (Math.floor(Math.log(Math.max(coals, 1)) / Math.log(BASE)))
  const floor = Math.floor(coals / step) * step
  return floor + step - coals
}
