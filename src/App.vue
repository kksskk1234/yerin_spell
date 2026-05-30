<script setup lang="ts">
import { ref } from 'vue'
import { useStudy } from './composables/useStudy'
import Celebration from './components/Celebration.vue'
import DateSelect from './components/DateSelect.vue'
import FinishScreen from './components/FinishScreen.vue'
import ImportDialog from './components/ImportDialog.vue'
import SpellingPad from './components/SpellingPad.vue'
import StudyCard from './components/StudyCard.vue'

const { screen, mode, idx, currentList, finished, goHome, setMode } = useStudy()

const showImport = ref(false)
</script>

<template>
  <div class="app-container">
    <div class="header">
      <button
        style="background: none; border: none; color: white; font-size: 24px; cursor: pointer"
        @click="goHome"
      >
        🏠
      </button>
      <span>Yerin's Spelling Master</span>
      <button
        title="단어 시험지 등록"
        style="background: none; border: none; color: white; font-size: 24px; cursor: pointer"
        @click="showImport = true"
      >
        📄
      </button>
    </div>

    <div style="display: flex; flex-direction: column; flex: 1; min-height: 0">
      <template v-if="screen === 'study'">
        <div class="nav-tabs">
          <div class="tab" :class="{ active: mode === 1 }" @click="setMode(1)">Step 1</div>
          <div class="tab" :class="{ active: mode === 2 }" @click="setMode(2)">Step 2</div>
          <div class="tab" :class="{ active: mode === 3 }" @click="setMode(3)">Step 3</div>
        </div>
        <div v-if="!finished" style="text-align: center; flex-shrink: 0">
          <div class="progress-info">Word {{ idx + 1 }} / {{ currentList.length }}</div>
        </div>
      </template>

      <div class="content">
        <DateSelect v-if="screen === 'dates'" />
        <Celebration v-else-if="screen === 'celebration'" />
        <template v-else>
          <FinishScreen v-if="finished" />
          <StudyCard v-else-if="mode === 1" />
          <SpellingPad v-else />
        </template>
      </div>
    </div>

    <ImportDialog v-if="showImport" @close="showImport = false" />
  </div>
</template>
