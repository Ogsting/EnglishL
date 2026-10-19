import type { Grade, SrsState } from './types'

export const MINUTE = 60 * 1000
export const DAY = 24 * 60 * MINUTE

/** 答错后的最短间隔 */
const LAPSE_MIN = 10 * MINUTE
/** 间隔封顶：半年 */
const MAX_INTERVAL = 180 * DAY
/** 每次答对，错误次数衰减多少 */
const MISTAKE_DECAY = 0.25
/** 模糊档的间隔倍率：比答对保守，比答错宽松 */
const FUZZY_FACTOR = 1.2

export function initSrs(id: string, now = Date.now()): SrsState {
  return { id, ease: 2.5, interval: 0, due: now, mistakes: 0, seen: 0, last: undefined }
}

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/**
 * 三档艾宾浩斯：
 *
 * - 认识（左滑）：间隔 × 难度系数，首次 1 天；ease +0.05；**累计错误数 -0.25**
 * - 模糊（长按）：间隔 × 1.2，首次 1 天；ease -0.05；错误数不变
 * - 不认识（右滑）：间隔 × 0.3（最少 10 分钟）；ease -0.15；错误数 +1
 */
export function grade(
  state: SrsState | undefined,
  id: string,
  result: Grade,
  now = Date.now()
): SrsState {
  const s: SrsState = { ...(state ?? initSrs(id, now)) }
  s.seen += 1
  s.last = now

  const base = s.interval || 0

  if (result === 'unknown') {
    s.mistakes += 1
    s.ease = clamp(s.ease - 0.15, 1.3, 3)
    // 答错就快速重来：×0.3，但最多不超过 1 天
    s.interval = Math.max(LAPSE_MIN, Math.min(Math.round(base * 0.3), DAY))
  } else if (result === 'fuzzy') {
    s.ease = clamp(s.ease - 0.05, 1.3, 3)
    s.interval = base <= 0 ? DAY : Math.min(Math.round(base * FUZZY_FACTOR), MAX_INTERVAL)
  } else {
    // know：答对时把之前的错误记录衰减掉，避免错词永久霸榜
    s.mistakes = Math.max(0, s.mistakes - MISTAKE_DECAY)
    s.ease = clamp(s.ease + 0.05, 1.3, 3)
    s.interval = base <= 0 ? DAY : Math.min(Math.round(base * s.ease), MAX_INTERVAL)
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

/** 给界面用的「下次复习」描述 */
export function describeInterval(ms: number): string {
  if (ms < 60 * MINUTE) return `${Math.max(1, Math.round(ms / MINUTE))} 分钟`
  if (ms < DAY) return `${Math.round(ms / (60 * MINUTE))} 小时`
  return `${Math.round(ms / DAY)} 天`
}
