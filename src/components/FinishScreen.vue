<script setup lang="ts">
import { useStudy } from '../composables/useStudy'

const { mode, uniqueWrongs, setMode, startReview, showCelebration } = useStudy()
</script>

<template>
  <div v-if="uniqueWrongs.length > 0">
    <h1>⭐</h1>
    <h2>Review Mode</h2>
    <p>You missed {{ uniqueWrongs.length }} words.</p>
    <button
      class="btn btn-orange"
      style="width: 200px; padding: 15px; font-size: 1.2rem"
      @click="startReview"
    >
      Start 3x Review
    </button>
  </div>

  <div v-else>
    <h1>🏆</h1>
    <h2 style="margin-bottom: 15px">Step {{ mode }} Clear!</h2>
    <div class="btn-group-row">
      <button class="btn btn-blue btn-action" @click="setMode(1)">Step 1</button>
      <button class="btn btn-blue btn-action" @click="setMode(2)">Step 2</button>
      <button class="btn btn-blue btn-action" @click="setMode(3)">Step 3</button>
    </div>
    <button
      v-if="mode === 3"
      class="btn btn-green"
      style="width: 90%; margin-top: 15px; padding: 18px; font-size: 1.3rem"
      @click="showCelebration"
    >
      I'm ready! 💯
    </button>
  </div>
</template>
