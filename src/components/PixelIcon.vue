<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{ shape: string; color: string; size?: number }>(),
  { size: 24 }
)

/** 8×8 像素画，d=暗边 b=主色 l=亮面 */
const SHAPES: Record<string, string[]> = {
  lump: [
    '........',
    '..dddd..',
    '.dbbbbl.',
    'dbblbbbd',
    'dbbbbbbd',
    '.dbbbld.',
    '..dddd..',
    '........'
  ],
  ingot: [
    '........',
    '........',
    '..dddd..',
    '.dbbbbl.',
    '.dbbbbd.',
    'dbbbbbld',
    'dddddddd',
    '........'
  ],
  gem: [
    '........',
    '...dd...',
    '..dbbd..',
    '.dbblbd.',
    'dbblbbbd',
    '.dbbbld.',
    '..dddd..',
    '........'
  ],
  block: [
    'dddddddd',
    'dlllllld',
    'dbbbbbbd',
    'dlllllld',
    'dbbbbbbd',
    'dlllllld',
    'dbbbbbbd',
    'dddddddd'
  ],
  home: [
    '...dd...',
    '..dbbd..',
    '.dbbbld.',
    'dbbbbbld',
    '.dbbbbd.',
    '.dbbbbd.',
    '.dddddd.',
    '........'
  ],
  book: [
    '.dddd...',
    '.dbbd...',
    '.dbbd...',
    '.dbbd...',
    '.dbbd...',
    '.dbbd...',
    '.dddd...',
    '........'
  ],
  cross: [
    '........',
    '.dd..dd.',
    '.ddd.dd.',
    '..dddd..',
    '...dd...',
    '..dddd..',
    '.dd.ddd.',
    '.dd..dd.'
  ],
  flame: [
    '...dd...',
    '..dbbd..',
    '.dbbbd..',
    '.dbbbld.',
    'dbbbbbld',
    'dbbbbbld',
    '.dbbbld.',
    '..dddd..'
  ]
}

function toRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]
}

function mix(hex: string, to: number, amt: number): string {
  const [r, g, b] = toRgb(hex)
  const f = (v: number) => Math.round(v + (to - v) * amt)
  return `rgb(${f(r)},${f(g)},${f(b)})`
}

const cells = computed(() => {
  const rows = SHAPES[props.shape] ?? SHAPES.gem
  const dark = mix(props.color, 0, 0.55)
  const light = mix(props.color, 255, 0.45)
  const out: { x: number; y: number; fill: string }[] = []
  rows.forEach((row, y) => {
    ;[...row].forEach((ch, x) => {
      if (ch === '.') return
      out.push({ x, y, fill: ch === 'd' ? dark : ch === 'l' ? light : props.color })
    })
  })
  return out
})
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 8 8"
    shape-rendering="crispEdges"
    style="display: block; image-rendering: pixelated"
    aria-hidden="true"
  >
    <rect v-for="(c, i) in cells" :key="i" :x="c.x" :y="c.y" width="1" height="1" :fill="c.fill" />
  </svg>
</template>
