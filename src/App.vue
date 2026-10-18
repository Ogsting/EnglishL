<script setup lang="ts">
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

const vars = computed(() => ({
  ...theme.value.colors,
  '--font': theme.value.font,
  '--radius': theme.value.radius
}))
</script>

<template>
  <div class="app" :style="vars">
    <header class="topbar">
      <div class="brand">
        <span class="logo">E</span>
        <div>
          <b>EnglishL</b>
          <small>{{ SUBTITLE[tab] }}</small>
        </div>
      </div>
      <div class="top-right">
        <button class="icon-btn" type="button" aria-label="主题设置" @click="showTheme = true">
          ⚙
        </button>
        <RankBadge :coals="state.rank.coals" @open="showRank = true" />
      </div>
    </header>

    <main class="screen">
      <HomeView v-if="tab === 'home'" />
      <OwnView v-else-if="tab === 'own'" />
      <WrongView v-else />
    </main>

    <TabBar v-model="tab" />

    <ThemeSheet v-if="showTheme" @close="showTheme = false" />
    <RankSheet v-if="showRank" @close="showRank = false" />
  </div>
</template>
