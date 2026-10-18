import type { Word } from '../core/types'
import raw from './words.json'

interface Row {
  w: string
  ph: string
  pos: string
  cn: string
  tag: string
}

/**
 * 内置离线词库：6662 个四六级词（含音标 / 词性 / 中文释义）。
 * 由 tools/build_words.py 从 kajweb/dict（BSD-3-Clause）+ ECDICT（MIT）生成，
 * 安装包自带，断网也能完整使用；之后可通过 /api 增量更新。
 */
export const CET_WORDS: Word[] = (raw as Row[]).map((r) => ({
  id: r.w.toLowerCase(),
  w: r.w,
  ph: r.ph,
  pos: r.pos,
  cn: r.cn,
  tag: r.tag === 'cet6' ? 'cet6' : 'cet4'
}))
