import type { Grade, SrsState } from './types'

export const MINUTE = 60 * 1000
export const DAY = 24 * 60 * MINUTE

export function initSrs(id: string, now = Date.now()): SrsState {
  return { id, ease: 2.5, interval: 0, due: now, mistakes: 0, seen: 0, last: undefined }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * 简化版艾宾浩斯：
 * - 不认识：错误次数 +1，间隔 ×0.3（最少 10 分钟），难度系数下调 → 很快再出现
 * - 认识：间隔 × 难度系数（第二次起 ×2.5 递增），难度系数上调 → 隔几天再出现，但不消失
 */
export function grade(state: SrsState | undefined, id: string, result: Grade, now = Date.now()): SrsState {
  const s: SrsState = { ...(state ?? initSrs(id, now)) }
  s.seen += 1
  s.last = now

  if (result === 'unknown') {
    s.mistakes += 1
    s.ease = clamp(s.ease - 0.15, 1.3, 3)
    s.interval = Math.max(10 * MINUTE, Math.round((s.interval || 0) * 0.3))
  } else {
    s.ease = clamp(s.ease + 0.05, 1.3, 3)
    s.interval = s.interval <= 0 ? DAY : Math.min(Math.round(s.interval * s.ease), 180 * DAY)
  }

  s.due = now + s.interval
  return s
}

/** 排序权重：逾期越久、错得越多，越靠前 */
export function priority(s: SrsState | undefined, now = Date.now()): number {
  if (!s) return 0
  const overdue = Math.max(0, now - s.due) / DAY
  return overdue + s.mistakes * 3
}

export function isDue(s: SrsState | undefined, now = Date.now()): boolean {
  return !!s && s.due <= now
}
