import { DAY } from './srs'
import { state } from './store'
import type { Word } from './types'

/**
 * 学习队列：加权随机抽取。
 *
 * 权重规则（对应需求「随机出现 + 错词权重更大 + 看的越久权重越高」）：
 * - 没学过的词：进入「新词池」，按配额随机抽，不按字母序
 * - 学过的词：到期后权重 = 1 + 逾期天数 × 0.5（艾宾浩斯：越久没复习，权重越大）
 * - 错过的词：再乘 (1 + 错误次数 × 0.9)，错得越多越容易被抽到
 * - 没到期但已出现过的词：极低权重 0.04，仍有机会「随机冒出来」
 */
const NEW_WEIGHT = 1
const SEEN_NOT_DUE_WEIGHT = 0.04

function weightOf(w: Word, now: number): number {
  const s = state.srs[w.id]
  if (!s || s.seen === 0) return NEW_WEIGHT

  const overdueDays = Math.max(0, (now - s.due) / DAY)
  let wgt = s.due <= now ? 1 + Math.min(overdueDays, 12) * 0.5 : SEEN_NOT_DUE_WEIGHT
  wgt *= 1 + s.mistakes * 0.9
  return wgt
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * @param source   候选词（首页传全量词库，单词本传自建词）
 * @param limit    这一组最多几张
 * @param newQuota 新词配额（默认按每天额度剩余量）
 */
export function pickQueue(source: Word[], limit = 60, newQuota?: number): Word[] {
  const now = Date.now()
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${`${today.getMonth() + 1}`.padStart(2, '0')}-${`${today.getDate()}`.padStart(2, '0')}`

  const quota =
    newQuota ??
    Math.max(0, state.newPerDay - (state.newSeenDate === todayKey ? state.newSeen : 0))

  const fresh: Word[] = []
  const seen: { w: Word; key: number }[] = []

  for (const w of source) {
    const s = state.srs[w.id]
    if (!s || s.seen === 0) {
      fresh.push(w)
    } else {
      // Efraimidis–Spirakis 加权无放回抽样：key = random^(1/weight)
      seen.push({ w, key: Math.random() ** (1 / weightOf(w, now)) })
    }
  }

  seen.sort((a, b) => b.key - a.key)
  const picked = seen.map((x) => x.w)
  const freshPick = shuffle(fresh).slice(0, Math.max(0, quota))

  // 每 4 张复习词插 1 张新词，避免一上来连着全是新词
  const out: Word[] = []
  let f = 0
  picked.forEach((w, i) => {
    out.push(w)
    if (i % 4 === 3 && f < freshPick.length) out.push(freshPick[f++])
  })
  while (f < freshPick.length) out.push(freshPick[f++])

  return out.slice(0, limit)
}
