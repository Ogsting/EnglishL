import { addOwnWord, pool, recordGrade, state } from '../core/store'

/** 仅开发环境：?demo=1 时灌入一份演示数据，方便截图和检查各页面 */
export function seedDemo() {
  if (state.rank.coals !== 0 || Object.keys(state.wrong).length > 0) return

  state.rank.coals = 11
  const day = new Date()
  const key = `${day.getFullYear()}-${`${day.getMonth() + 1}`.padStart(2, '0')}-${`${day.getDate()}`.padStart(2, '0')}`
  state.rank.days[key] = { count: 23, settled: false }

  const wrongPlan: [string, number][] = [
    ['ambiguous', 21],
    ['vulnerable', 12],
    ['aesthetic', 8],
    ['reluctant', 5],
    ['inevitable', 4],
    ['sufficient', 2],
    ['perspective', 1]
  ]
  for (const [w, times] of wrongPlan) {
    for (let i = 0; i < times; i++) recordGrade(w, 'unknown')
  }

  addOwnWord('serendipity', '意外发现珍奇事物的运气', '/ˌserənˈdɪpəti/')
  addOwnWord('resilient', '有韧性的；能恢复的', '/rɪˈzɪliənt/')
  addOwnWord('ephemeral', '短暂的；转瞬即逝的', '/ɪˈfemərəl/')

  pool.value.slice(0, 6).forEach((w) => recordGrade(w.id, 'know'))
}
