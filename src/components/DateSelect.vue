<script setup lang="ts">
import { useStudy } from '../composables/useStudy'
import ColorPicker from './ColorPicker.vue'

const { currentColor, dates, startStudy } = useStudy()
</script>

<template>
  <div class="date-screen">
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
  </div>
</template>

<style scoped>
/* Fill the content area and scroll vertically when there are many dates.
   touch-action: pan-y re-enables touch scrolling (body sets touch-action:none
   to stop the drawing pad from scrolling the page). */
.date-screen {
  flex: 1;
  align-self: stretch;
  width: 100%;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 4px 2px 12px;
}
</style>
