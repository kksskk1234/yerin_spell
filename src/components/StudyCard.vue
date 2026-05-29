<script setup lang="ts">
import { watch } from 'vue'
import { useStudy } from '../composables/useStudy'

const { currentWord, speak, next } = useStudy()

// Read the word, then its definition, then its sentence — chained like the original.
watch(
  () => currentWord.value?.word,
  () => {
    const item = currentWord.value
    if (!item) return
    speak(item.word, () =>
      setTimeout(
        () => speak(item.def, () => item.sent && setTimeout(() => speak(item.sent!), 500)),
        500,
      ),
    )
  },
  { immediate: true },
)
</script>

<template>
  <template v-if="currentWord">
    <div class="study-word">{{ currentWord.word }}</div>
    <div class="study-def">{{ currentWord.def }}</div>
    <div class="study-sentence">{{ currentWord.sent || '' }}</div>
    <button class="btn-next-long" @click="next">Next Word ▶</button>
  </template>
</template>
