<script setup lang="ts">
import { ref, watch } from 'vue'
import { useStudy } from '../composables/useStudy'
import DrawingCanvas from './DrawingCanvas.vue'

const { currentWord, currentColor, speak, next, markWrong } = useStudy()

const pad = ref<InstanceType<typeof DrawingCanvas> | null>(null)
const hintVisible = ref(false)
const answerShown = ref(false)

function showHint(): void {
  if (!currentWord.value) return
  hintVisible.value = true
  speak('Starts with ' + currentWord.value.word.substring(0, 2))
}

function erase(): void {
  pad.value?.clear()
  hintVisible.value = false
}

function showAns(): void {
  if (!currentWord.value) return
  answerShown.value = true
  speak(currentWord.value.word)
}

function onCorrect(): void {
  speak('Good job!')
  setTimeout(() => next(), 800)
}

function onWrong(): void {
  speak('Try again!')
  markWrong()
  pad.value?.clear()
  hintVisible.value = false
  answerShown.value = false
}

// On every new word: reset the pad/answer/hint and read the definition aloud.
watch(
  () => currentWord.value?.word,
  () => {
    if (!currentWord.value) return
    answerShown.value = false
    hintVisible.value = false
    pad.value?.clear()
    speak(currentWord.value.def)
  },
  { immediate: true },
)
</script>

<template>
  <template v-if="currentWord">
    <p class="study-def">"{{ currentWord.def }}"</p>
    <div class="draw-container">
      <div id="hint-text" v-show="hintVisible">Hint: {{ currentWord.word.substring(0, 2) }}...</div>
      <DrawingCanvas ref="pad" :color="currentColor" />
    </div>
    <div id="ans-box">{{ answerShown ? currentWord.word : '? ? ?' }}</div>

    <div v-if="!answerShown" class="btn-group">
      <button class="btn btn-blue btn-action" @click="showHint">💡 Hint</button>
      <button class="btn btn-red btn-action" @click="erase">🧹 Eraser</button>
      <button class="btn btn-green btn-action" @click="showAns">Check ✅</button>
    </div>
    <div v-else class="btn-group">
      <button class="btn btn-red btn-action" @click="onWrong">Try again 💪</button>
      <button class="btn btn-green btn-action" @click="onCorrect">I got it! 😍</button>
    </div>
  </template>
</template>
