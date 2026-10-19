<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { computed, onMounted, ref } from 'vue'
import TabBar from './components/TabBar.vue'
import RankBadge from './components/RankBadge.vue'
import ThemeSheet from './components/ThemeSheet.vue'
import RankSheet from './components/RankSheet.vue'
import HomeView from './views/HomeView.vue'
import OwnView from './views/OwnView.vue'
import WrongView from './views/WrongView.vue'
import { ensureToday, state, theme } from './core/store'
import { checkForUpdates } from './core/update'
import { USE_THEME_IMAGES } from './config'

ensureToday()

onMounted(async () => {
  // 静默检查词库增量更新：没网 / 没配置源时什么都不做
  const r = await checkForUpdates()
  if (r && import.meta.env.DEV) console.info('[词库更新]', r)
})

const TABS = ['home', 'own', 'wrong'] as const
const initial = TABS.find((t) => location.hash === `#${t}`) ?? 'home'
const tab = ref<(typeof TABS)[number]>(initial)
const showTheme = ref(false)
const showRank = ref(false)

const SUBTITLE: Record<string, string> = {
  home: '四六级单词卡',
  own: '我的单词本',
  wrong: '错题本'
}

/**
 * 弹层返回键处理：
 * 打开时压一条历史记录，返回键（或浏览器后退）触发 popstate 就关掉弹层，
 * 而不是直接退出 App。UI 上的关闭按钮同样走 history.back()。
 */
function openSheet(kind: 'theme' | 'rank') {
  if (showTheme.value || showRank.value) return
  if (kind === 'theme') showTheme.value = true
  else showRank.value = true
  history.pushState({ sheet: kind }, '')
}

function closeSheet() {
  // 先无条件关掉，再尽量把历史记录清理掉（不依赖 popstate 是否触发）
  showTheme.value = false
  showRank.value = false
  if (history.state?.sheet) history.back()
}

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    showTheme.value = false
    showRank.value = false
  })
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && (showTheme.value || showRank.value)) closeSheet()
  })
}

/**
 * 安卓返回键：Capacitor 默认会直接退出 Activity，不经过网页历史。
 * 这里接管：弹层开着 → 关弹层；否则能后退就后退；不能才退出 App。
 */
if (Capacitor.isNativePlatform()) {
  CapApp.addListener('backButton', ({ canGoBack }) => {
    if (showTheme.value || showRank.value) {
      showTheme.value = false
      showRank.value = false
      return
    }
    if (canGoBack) history.back()
    else CapApp.exitApp()
  })
}

/** 4.1 / 4.2 / 4.3 / 4.4 的图片开关，见 src/config.ts */
const imgs = computed(() => (USE_THEME_IMAGES ? theme.value.images ?? {} : {}))

const vars = computed(() => {
  const i = imgs.value
  return {
    ...theme.value.colors,
    '--font': theme.value.font,
    '--radius': theme.value.radius,
    ...(i.navBg ? { '--img-nav-bg': `url("${i.navBg}")` } : {}),
    ...(i.ownPanel ? { '--img-own-panel': `url("${i.ownPanel}")` } : {}),
    ...(i.wrongPanel ? { '--img-wrong-panel': `url("${i.wrongPanel}")` } : {}),
    ...(i.cardFrame ? { '--img-card-frame': `url("${i.cardFrame}")` } : {}),
    ...(i.rankBadge ? { '--img-rank-badge': `url("${i.rankBadge}")` } : {})
  }
})

/** 4.1.x 每个页面自己的背景图 */
const screenStyle = computed(() => {
  const i = imgs.value
  const bg = tab.value === 'home' ? i.homeBg : tab.value === 'own' ? i.ownBg : i.wrongBg
  return bg ? { backgroundImage: `url("${bg}")` } : {}
})

/** 4.2 可移动装饰图 */
const decor = computed(() => imgs.value.decor ?? [])

function decorStyle(d: (typeof decor.value)[number]) {
  return {
    left: `${d.x}%`,
    top: `${d.y}%`,
    width: d.w ? `${d.w}%` : 'auto',
    opacity: d.opacity ?? 1,
    transform: d.rotate ? `rotate(${d.rotate}deg)` : undefined,
    zIndex: d.z ?? 0
  }
}
</script>

<template>
  <div class="app" :class="{ pixelated: theme.pixelated }" :style="vars">
    <!-- 4.2 可移动图片层（在内容之下，不挡点击） -->
    <img
      v-for="(d, i) in decor"
      :key="'decor-' + i"
      class="decor"
      :src="d.src"
      :style="decorStyle(d)"
      alt=""
      aria-hidden="true"
    />

    <header class="topbar">
      <div class="brand">
        <span class="logo">E</span>
        <div>
          <b>EnglishL</b>
          <small>{{ SUBTITLE[tab] }}</small>
        </div>
      </div>
      <div class="top-right">
        <button class="icon-btn" type="button" aria-label="设置" @click="openSheet('theme')">
          ⚙
        </button>
        <RankBadge :coals="state.rank.coals" @open="openSheet('rank')" />
      </div>
    </header>

    <main class="screen" :class="['screen-' + tab, { 'has-bg': !!screenStyle.backgroundImage }]" :style="screenStyle">
      <HomeView v-if="tab === 'home'" />
      <OwnView v-else-if="tab === 'own'" />
      <WrongView v-else />
    </main>

    <TabBar v-model="tab" />

    <ThemeSheet v-if="showTheme" @close="closeSheet" />
    <RankSheet v-if="showRank" @close="closeSheet" />
  </div>
</template>
