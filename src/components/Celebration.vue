<script setup lang="ts">
import { ref } from 'vue'
import { useStudy } from '../composables/useStudy'
import ColorPicker from './ColorPicker.vue'
import DrawingCanvas from './DrawingCanvas.vue'

const { currentColor, goHome } = useStudy()

const pad = ref<InstanceType<typeof DrawingCanvas> | null>(null)
</script>

<template>
  <h2 style="color: #e91e63; margin-top: 0; font-size: 1.4rem">🎉 Great Job, Yerin! 🎉</h2>
  <div class="color-picker-main">
    <ColorPicker v-model="currentColor" />
  </div>
  <div class="draw-container" style="flex: 1.5">
    <DrawingCanvas ref="pad" :color="currentColor" dashed />
  </div>
  <div class="btn-group">
    <button class="btn btn-red btn-action" @click="pad?.clear()">🧹 Clear</button>
    <button class="btn btn-blue btn-action" @click="goHome">🏠 Home</button>
  </div>
</template>
