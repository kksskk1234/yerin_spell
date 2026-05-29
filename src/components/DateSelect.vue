<script setup lang="ts">
import { useStudy } from '../composables/useStudy'
import ColorPicker from './ColorPicker.vue'

const { currentColor, dates, startStudy } = useStudy()
</script>

<template>
  <div class="color-picker-main">
    <span style="font-weight: bold; color: #555; font-size: 0.9rem">Pick your Pen Color! 🎨</span>
    <ColorPicker v-model="currentColor" />
  </div>
  <h2 style="color: var(--primary-dark); margin-bottom: 10px">June Week 1 Study</h2>
  <button
    v-for="d in dates"
    :key="d"
    class="btn btn-blue btn-date"
    @click="startStudy(d)"
  >
    {{ d }}
  </button>
</template>
