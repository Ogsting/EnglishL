# EnglishL · 四六级单词卡

离线优先的四六级单词 App：滑动记忆 + 艾宾浩斯复习 + 错题本 + 进位制段位 + 可换主题（我的世界 / 极简）。

## 跑起来

```bash
npm install
npm run dev          # http://127.0.0.1:5173
npm run dev:lan      # 同一 WiFi 下用手机浏览器打开 http://<电脑IP>:5173
npm run build        # 产物在 dist/，静态托管即可
```

手机浏览器打开后「添加到主屏幕」，就是一个全屏、可断网使用的 App（Service Worker 会在首次加载后缓存全部资源）。

## 已经实现

| 需求 | 状态 | 说明 |
|---|---|---|
| 断网执行 | ✅ | 5805 词全部内置，Service Worker 缓存，无网可用 |
| 联网增量更新 | ✅ | 客户端已实现（B 方案：version.json + patch-N.json），在 `src/config.ts` 填地址即生效；不填则完全离线。见 [词库更新.md](docs/词库更新.md) |
| 底部三 Tab | ✅ | 首页 / 单词本 / 错题本 |
| 左滑不熟、右滑熟悉 | ✅ | 拖拽跟手、印章反馈、松手回弹 |
| 中英随机约 50% | ✅ | 每张卡独立掷硬币 |
| 滑后显示释义 | ✅ | 松手 → 回弹 → 翻面展示单词/音标/词性/释义 → 飞出 |
| 个人单词本 | ✅ | 自加词、增删、独立复习队列，交互与首页一致 |
| 错题本 | ✅ | 左中文右单词、错误次数角标、**左滑两次删除** |
| 艾宾浩斯权重 | ✅ | 左滑间隔 ×0.3（10 分钟后重现），右滑 ×2.5 递增，错词优先 |
| 段位奖惩 | ✅ | 每天 50 个右滑认识 = +1 煤；漏一天 −1 煤 |
| 进位制段位 | ✅ | 10 煤 = 1 铜，10 铜 = 1 铁 … 右上角常驻徽章，高位大低位小 |
| 主题包 | ✅ | 我的世界 / 极简；段位材料名、错题材质梯度、背景与装饰图都由主题包提供 |
| 单词发音 | ✅ | Web Speech API：英文面读 1 次、翻到答案再读 1 次、可手动重读；设置里可开关和调语速 |
| 滑卡节奏 | ✅ | 滑动判定后翻面**停住**，点一下才结算进入下一张 |

## 目录

```
src/
  core/        rank.ts(进位制段位) srs.ts(艾宾浩斯) store.ts(状态与队列)
  themes/      themes.ts  主题包（颜色 + 材料表 + 错题材质梯度）
  components/  SwipeCard / RankBadge / TabBar / PixelIcon(像素图标) / 弹层
  views/       HomeView / OwnView / WrongView
  data/        words.json  5805 词的离线词库
tools/
  build_words.py    从 research/ 的原始数据生成 words.json
  make_patch.py     对比两版词库，生成增量补丁 patch-<n>.json
  cdp_check.mjs     用 Edge DevTools 协议做真实手势回归测试
  cdp_update_check.mjs  测试词库增量更新
docs/
  需求分析.md / 段位与主题设计.md / 词库更新.md
```

## 词库来源与授权

- 单词与中文释义：**skywind3000/ECDICT**（MIT），按 `tag=cet4/cet6` 切片 → 3849 + 1956 = 5805 词
- 音标：ECDICT 自带（99.6% 覆盖），已把西里尔字母 `ә` 归一成 IPA `ə`、`.` 归一成 `ˌ`
- 生成脚本：`tools/build_words.py`（可重复执行）

> 原调研里另一份更"豪华"的数据（含例句，来自 kajweb/dict 分支）**没有使用**：
> 它上游是词典 App 抓取内容、仓库 license 为 null，分发有风险。例句留到后面换 CC 授权语料。

## 还没做

1. **Android APK**：用 Capacitor 包一层即可，需要你的确认（是否现在就出包）
2. **联网增量更新**：需要你提供一个词库地址（或我写个简单的静态 JSON + 版本号方案）
3. 发音（离线 TTS 或音频包）
4. 数据备份导入导出、深色/浅色切换、平板适配
