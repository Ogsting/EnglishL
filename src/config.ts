/**
 * 词库更新源（B 方案：增量 patch）。
 *
 * 留空 = 关闭联网更新，App 只用内置词库（默认就是关的，不影响离线使用）。
 * 有了静态托管之后，在这里填地址即可，例如：
 *   export const WORD_BASE = 'https://cdn.jsdelivr.net/gh/你的用户名/englishl@main/words'
 *   export const WORD_BASE = 'https://你的用户名.github.io/englishl/words'
 *
 * 也可以在构建时用环境变量注入：VITE_WORD_BASE=... npm run build
 * 调试时可以在地址后面加 ?wordbase=/mock 临时指定一个源。
 */
const fromQuery =
  typeof location !== 'undefined' ? new URLSearchParams(location.search).get('wordbase') : null

export const WORD_BASE: string =
  fromQuery ?? ((import.meta.env.VITE_WORD_BASE as string | undefined) ?? '')
