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
  ease: number
  /** 当前记忆间隔（毫秒） */
  interval: number
  /** 下次到期时间戳 */
  due: number
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

export type Grade = 'know' | 'unknown'
