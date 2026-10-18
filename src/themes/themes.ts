import type { IconShape, Material } from '../core/types'

export interface MistakeMaterial {
  name: string
  min: number
  color: string
  shape: IconShape
}

export interface Theme {
  id: string
  name: string
  desc: string
  colors: Record<string, string>
  materials: Material[]
  mistakeLadder: MistakeMaterial[]
  font: string
  radius: string
  pixelated: boolean
}

const mcMaterials: Material[] = [
  { name: '煤炭', color: '#2f2f2f', shape: 'lump' },
  { name: '铜', color: '#c87f5a', shape: 'ingot' },
  { name: '铁', color: '#d8d8d8', shape: 'ingot' },
  { name: '金', color: '#f2c318', shape: 'ingot' },
  { name: '红石', color: '#d8342a', shape: 'gem' },
  { name: '青金石', color: '#2d4fc4', shape: 'gem' },
  { name: '绿宝石', color: '#2fbf5a', shape: 'gem' },
  { name: '钻石', color: '#3fe0e0', shape: 'gem' },
  { name: '下界合金', color: '#4a3f45', shape: 'ingot' },
  { name: '基岩', color: '#1b1b1b', shape: 'block' }
]

const plainMaterials: Material[] = [
  { name: '青铜', color: '#b87333', shape: 'ingot' },
  { name: '白银', color: '#c9d1d9', shape: 'ingot' },
  { name: '黄金', color: '#e5b73b', shape: 'ingot' },
  { name: '铂金', color: '#9fd8e0', shape: 'ingot' },
  { name: '钻石', color: '#59c8f0', shape: 'gem' },
  { name: '星耀', color: '#8f7bf0', shape: 'gem' },
  { name: '王冠', color: '#f06fa8', shape: 'gem' },
  { name: '传说', color: '#f08c4a', shape: 'gem' },
  { name: '神话', color: '#4ae0a8', shape: 'gem' },
  { name: '永恒', color: '#e2e8f0', shape: 'gem' }
]

export const THEMES: Theme[] = [
  {
    id: 'minecraft',
    name: '我的世界',
    desc: '像素方块 · 煤炭到基岩',
    pixelated: true,
    radius: '4px',
    font: '"Press Start 2P", "Zpix", "Courier New", ui-monospace, monospace',
    colors: {
      '--bg': '#11161c',
      '--bg2': '#1a232c',
      '--card': '#c6c6c6',
      '--card-hi': '#dcdcdc',
      '--card-ink': '#262626',
      '--card-sub': '#5c5c5c',
      '--border': '#3a3a3a',
      '--text': '#e8eef4',
      '--sub': '#8b9aa8',
      '--accent': '#5e9c3e',
      '--accent-ink': '#0f1a0a',
      '--know': '#5e9c3e',
      '--unknown': '#a83a2c',
      '--nav': '#242b33',
      '--nav-ink': '#9aa8b5',
      '--nav-active': '#5e9c3e',
      '--edge': '#00000066'
    },
    materials: mcMaterials,
    mistakeLadder: [
      { name: '橡木', min: 1, color: '#a9855a', shape: 'block' },
      { name: '丛林原木', min: 3, color: '#8a5c3b', shape: 'block' },
      { name: '深色橡木', min: 6, color: '#5c3d22', shape: 'block' },
      { name: '绯红木', min: 10, color: '#7a2b3a', shape: 'block' },
      { name: '下界合金', min: 20, color: '#4a3f45', shape: 'block' }
    ]
  },
  {
    id: 'plain',
    name: '极简',
    desc: '干净深色 · 青铜到永恒',
    pixelated: false,
    radius: '18px',
    font: '"PingFang SC", "Microsoft YaHei", system-ui, -apple-system, sans-serif',
    colors: {
      '--bg': '#0e1116',
      '--bg2': '#161b23',
      '--card': '#1b2230',
      '--card-hi': '#222b3c',
      '--card-ink': '#e8eef7',
      '--card-sub': '#93a2b8',
      '--border': '#2a3444',
      '--text': '#e8eef7',
      '--sub': '#7d8ca1',
      '--accent': '#4f9cf9',
      '--accent-ink': '#061222',
      '--know': '#3ecf8e',
      '--unknown': '#ef5f5f',
      '--nav': '#151b24',
      '--nav-ink': '#7d8ca1',
      '--nav-active': '#4f9cf9',
      '--edge': '#00000055'
    },
    materials: plainMaterials,
    mistakeLadder: [
      { name: '灰卡', min: 1, color: '#5b6472', shape: 'block' },
      { name: '深灰', min: 3, color: '#414a58', shape: 'block' },
      { name: '琥珀', min: 6, color: '#a4632f', shape: 'block' },
      { name: '赤红', min: 10, color: '#a83a3a', shape: 'block' },
      { name: '黑曜', min: 20, color: '#2a2330', shape: 'block' }
    ]
  }
]

export function getTheme(id: string): Theme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0]
}

export function mistakeMaterial(theme: Theme, count: number): MistakeMaterial {
  let hit = theme.mistakeLadder[0]
  for (const m of theme.mistakeLadder) if (count >= m.min) hit = m
  return hit
}
