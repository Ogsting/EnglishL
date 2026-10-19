/**
 * 单词发音：用浏览器自带的 Web Speech API，不下载任何音频文件，离线也能读
 * （取决于系统是否装了英文语音包，Android 一般自带 Google TTS）。
 *
 * 注意：Android WebView（Capacitor 打包后的 APK）不实现 speechSynthesis，
 * 到那一步需要换成 @capacitor-community/text-to-speech，本文件的调用接口不用改。
 */

let cachedVoice: SpeechSynthesisVoice | null = null

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

function pickVoice() {
  if (!speechSupported()) return
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return
  cachedVoice =
    voices.find((v) => /^en[-_]US/i.test(v.lang) && /google|samantha|microsoft|natural/i.test(v.name)) ??
    voices.find((v) => /^en[-_]US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
}

/** 页面启动时调用一次，把语音列表预热好 */
export function primeSpeech() {
  if (!speechSupported()) return
  pickVoice()
  window.speechSynthesis.onvoiceschanged = pickVoice
}

export function speak(text: string, rate = 0.9) {
  if (!speechSupported() || !text) return
  try {
    window.speechSynthesis.cancel() // 避免上一张卡还在读
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = Math.min(1.5, Math.max(0.5, rate))
    if (cachedVoice) u.voice = cachedVoice
    window.speechSynthesis.speak(u)
  } catch {
    /* 不支持或被策略拦截时静默 */
  }
}

export function stopSpeaking() {
  if (speechSupported()) window.speechSynthesis.cancel()
}
