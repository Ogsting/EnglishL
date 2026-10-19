export type WordTag = 'cet4' | 'cet6' | 'own'

export interface Word {
  id: string
  w: string
  ph?: string
  pos?: string
  cn: string
  tag: WordTag
}

export interface SrsState {
  id: string
  /** 难度系数（1.3 ~ 3.0） */
  ease: number
  /** 当前记忆间隔（毫秒） */
  interval: number
  /** 下次到期时间戳 */
  due: number
  /** 累计错误次数（答对会衰减，见 srs.ts） */
  mistakes: number
  seen: number
  last?: number
}

export interface RankDay {
  count: number
  settled: boolean
}

export interface Material {
  name: string
  color: string
  shape: IconShape
}

export type IconShape = 'lump' | 'ingot' | 'gem' | 'block'

export interface RankPart {
  material: Material
  power: number
  count: number
  size: number
}

/** know = 认识（左滑）· fuzzy = 模糊（长按）· unknown = 不认识（右滑） */
export type Grade = 'know' | 'fuzzy' | 'unknown'
