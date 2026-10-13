// Sound and voice cues for timed intervals, so the phone can be put down.
// iPhone Safari only plays audio started from a tap, so `unlockCues()` must be
// called from the Start button; later cues can then play on their own.

const KEY = 'cues'
export type CueSettings = { sound: boolean; voice: boolean }

export function cueSettings(): CueSettings {
  try {
    return { sound: true, voice: true, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { sound: true, voice: true }
  }
}

export function saveCueSettings(s: CueSettings) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s))
  } catch {
    // Storage unavailable: the setting lasts until the app is closed.
  }
}

let ctx: AudioContext | null = null

/** Prepares audio and speech; call it from a tap (Start, Resume). */
export function unlockCues() {
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!ctx && Ctor) ctx = new Ctor()
    void ctx?.resume()
    // A silent utterance from a tap allows later speech on iPhone.
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance('')
      u.volume = 0
      speechSynthesis.speak(u)
    }
  } catch {
    // No audio support: the session still works visually.
  }
}

/** A short tone. `long` marks the start of work; short tones count down. */
export function beep(kind: 'tick' | 'start' | 'end' = 'tick') {
  if (!cueSettings().sound || !ctx) return
  const freq = kind === 'start' ? 880 : kind === 'end' ? 523 : 660
  const length = kind === 'tick' ? 0.12 : 0.35
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.4, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + length)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + length + 0.02)
}

let voice: SpeechSynthesisVoice | null | undefined

function englishVoice(): SpeechSynthesisVoice | null {
  if (voice !== undefined) return voice
  const voices = speechSynthesis.getVoices()
  if (!voices.length) return null // not loaded yet; try again next time
  voice = voices.find((v) => v.lang === 'en-GB') ?? voices.find((v) => v.lang.startsWith('en')) ?? null
  return voice
}

/** Speaks a short phrase, replacing anything still being said. */
export function say(text: string) {
  if (!cueSettings().voice || !('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const v = englishVoice()
  if (v) u.voice = v
  u.lang = v?.lang ?? 'en-GB'
  u.rate = 1.02
  speechSynthesis.speak(u)
}

export function stopSpeech() {
  if ('speechSynthesis' in window) speechSynthesis.cancel()
}
