import { computed, ref } from 'vue'
import { yerinData } from '../data/words'
import type { Mode, Word, WordData } from '../types'
import { useSpeech } from './useSpeech'

export type Screen = 'dates' | 'study' | 'celebration'

const STORAGE_KEY = 'yerin-word-data'

/** Load saved word data from localStorage, falling back to the built-in default. */
function loadWordData(): WordData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed: unknown = JSON.parse(raw)
      if (parsed && typeof parsed === 'object') return parsed as WordData
    }
  } catch {
    // Corrupt/inaccessible storage — just use the default.
  }
  return yerinData
}

/**
 * Central study state + navigation logic. Created once and shared across the
 * whole app (poor-man's store), so every component reads/writes the same state.
 */
function createStudy() {
  const { speak, stop } = useSpeech()

  const screen = ref<Screen>('dates')
  const mode = ref<Mode>(1)
  const idx = ref(0)
  const selDate = ref('')
  const currentList = ref<Word[]>([])
  const wrongList = ref<Word[]>([])
  const currentColor = ref('#0000FF')
  /** Which step the review loop should run in (the step where words were missed) */
  const reviewTargetMode = ref<Mode>(2)

  /** The active word set (from an uploaded test sheet, or the built-in default). */
  const wordData = ref<WordData>(loadWordData())
  const dates = computed(() => Object.keys(wordData.value))

  const currentWord = computed<Word | undefined>(() => currentList.value[idx.value])
  const finished = computed(() => idx.value >= currentList.value.length)
  const uniqueWrongs = computed<Word[]>(() => [
    ...new Map(wrongList.value.map((item) => [item.word, item])).values(),
  ])

  function goHome(): void {
    stop()
    screen.value = 'dates'
  }

  function setMode(m: Mode): void {
    stop()
    mode.value = m
    idx.value = 0
    if (!selDate.value) {
      screen.value = 'dates'
      return
    }
    currentList.value = [...wordData.value[selDate.value]]
    // Step 3 shuffles the words; Step 2 keeps the original order.
    if (m === 3) currentList.value.sort(() => Math.random() - 0.5)
    wrongList.value = []
    screen.value = 'study'
  }

  function startStudy(date: string): void {
    selDate.value = date
    setMode(1)
  }

  function next(): void {
    idx.value++
  }

  function startReview(): void {
    const list: Word[] = []
    // Repeat every missed word three times back-to-back.
    for (let round = 1; round <= 3; round++) {
      uniqueWrongs.value.forEach((item) => list.push({ ...item }))
    }
    currentList.value = list
    wrongList.value = []
    idx.value = 0
    mode.value = reviewTargetMode.value
  }

  function markWrong(): void {
    reviewTargetMode.value = mode.value
    const word = currentWord.value
    if (word && !wrongList.value.some((i) => i.word === word.word)) {
      wrongList.value.push(word)
    }
  }

  function showCelebration(): void {
    stop()
    screen.value = 'celebration'
  }

  /** Replace the word set with uploaded/imported data and persist it. */
  function applyWordData(data: WordData): void {
    stop()
    wordData.value = data
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // Persisting failed (e.g. private mode) — keep it in memory anyway.
    }
    selDate.value = ''
    screen.value = 'dates'
  }

  /** Forget any imported data and restore the built-in default word set. */
  function resetWordData(): void {
    stop()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // ignore
    }
    wordData.value = yerinData
    selDate.value = ''
    screen.value = 'dates'
  }

  return {
    // state
    screen,
    mode,
    idx,
    selDate,
    currentList,
    wrongList,
    currentColor,
    wordData,
    // derived
    dates,
    currentWord,
    finished,
    uniqueWrongs,
    // actions
    speak,
    stop,
    goHome,
    setMode,
    startStudy,
    next,
    startReview,
    markWrong,
    showCelebration,
    applyWordData,
    resetWordData,
  }
}

let store: ReturnType<typeof createStudy> | null = null

export function useStudy() {
  if (!store) store = createStudy()
  return store
}
