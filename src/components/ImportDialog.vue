<script setup lang="ts">
import { ref } from 'vue'
import { useStudy } from '../composables/useStudy'
import { useOcr } from '../composables/useOcr'
import { parseVocabText } from '../utils/parseVocab'
import type { WordData } from '../types'

const emit = defineEmits<{ close: [] }>()

const { applyWordData, resetWordData } = useStudy()
const { recognize } = useOcr()

interface EditRow {
  word: string
  def: string
}
interface EditSection {
  date: string
  rows: EditRow[]
}

type Phase = 'select' | 'processing' | 'review'

const phase = ref<Phase>('select')
const sections = ref<EditSection[]>([])
const rawText = ref('')
const showRaw = ref(false)
const errorMsg = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const progressLabel = ref('')

function pickFiles(): void {
  fileInput.value?.click()
}

async function onFilesSelected(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length === 0) return

  phase.value = 'processing'
  errorMsg.value = ''
  rawText.value = ''

  try {
    const texts: string[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      progressLabel.value = `(${i + 1}/${files.length}) ${file.name} — 0%`
      const text = await recognize(file, (p) => {
        progressLabel.value = `(${i + 1}/${files.length}) ${file.name} — ${Math.round(p * 100)}%`
      })
      texts.push(text)
    }
    rawText.value = texts.join('\n\n')
    const parsed = parseVocabText(rawText.value)
    sections.value = Object.entries(parsed).map(([date, words]) => ({
      date,
      rows: words.map((w) => ({ word: w.word, def: w.def })),
    }))
    if (sections.value.length === 0) {
      // Give the user an empty row to fill in manually if parsing found nothing.
      sections.value = [{ date: '', rows: [{ word: '', def: '' }] }]
    }
    phase.value = 'review'
  } catch (err) {
    errorMsg.value = `이미지 인식 중 오류가 발생했습니다: ${(err as Error).message}`
    phase.value = 'select'
  } finally {
    // Allow re-selecting the same file later.
    input.value = ''
  }
}

function addRow(section: EditSection): void {
  section.rows.push({ word: '', def: '' })
}
function removeRow(section: EditSection, index: number): void {
  section.rows.splice(index, 1)
}
function addSection(): void {
  sections.value.push({ date: '', rows: [{ word: '', def: '' }] })
}
function removeSection(index: number): void {
  sections.value.splice(index, 1)
}

function apply(): void {
  const data: WordData = {}
  for (const section of sections.value) {
    const date = section.date.trim()
    if (!date) continue
    const rows = section.rows
      .filter((r) => r.word.trim() && r.def.trim())
      .map((r) => ({ word: r.word.trim(), def: r.def.trim() }))
    if (rows.length > 0) data[date] = rows
  }
  if (Object.keys(data).length === 0) {
    errorMsg.value = '적용할 단어가 없습니다. 날짜와 단어/뜻을 채워주세요.'
    return
  }
  applyWordData(data)
  emit('close')
}

function onReset(): void {
  if (confirm('기본 단어 목록으로 되돌릴까요? 업로드한 데이터는 사라집니다.')) {
    resetWordData()
    emit('close')
  }
}
</script>

<template>
  <div class="overlay" @click.self="emit('close')">
    <div class="dialog">
      <div class="dialog-header">
        <span>📄 단어 시험지 등록</span>
        <button class="x-btn" @click="emit('close')">✕</button>
      </div>

      <div class="dialog-body">
        <!-- 1. 파일 선택 -->
        <template v-if="phase === 'select'">
          <p class="hint">
            시험지 이미지를 선택하면 글자를 자동으로 읽어 날짜별 단어로 정리합니다.
            (여러 장 선택 가능)
          </p>
          <button class="btn btn-blue big" @click="pickFiles">🖼️ 이미지 선택</button>
          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
          <button class="btn btn-orange small reset" @click="onReset">기본 단어로 초기화</button>
        </template>

        <!-- 2. 인식 중 -->
        <template v-else-if="phase === 'processing'">
          <div class="spinner"></div>
          <p class="hint">이미지에서 글자를 읽는 중...</p>
          <p class="progress">{{ progressLabel }}</p>
        </template>

        <!-- 3. 미리보기 / 수정 -->
        <template v-else>
          <p class="hint">
            인식 결과예요. 틀린 부분을 고치고 <b>적용</b>을 누르세요.
            (날짜 형식 예: <code>Mon, June 1st</code>)
          </p>
          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

          <div v-for="(section, si) in sections" :key="si" class="section">
            <div class="section-head">
              <input v-model="section.date" class="date-input" placeholder="날짜 (예: Mon, June 1st)" />
              <button class="x-btn" title="날짜 삭제" @click="removeSection(si)">🗑️</button>
            </div>
            <div v-for="(row, ri) in section.rows" :key="ri" class="row">
              <input v-model="row.word" class="word-input" placeholder="단어" />
              <input v-model="row.def" class="def-input" placeholder="뜻" />
              <button class="x-btn" title="단어 삭제" @click="removeRow(section, ri)">✕</button>
            </div>
            <button class="btn btn-blue tiny" @click="addRow(section)">+ 단어 추가</button>
          </div>

          <button class="btn btn-blue small" @click="addSection">+ 날짜 추가</button>

          <details class="raw" :open="showRaw">
            <summary @click="showRaw = !showRaw">원문(OCR) 텍스트 보기</summary>
            <pre>{{ rawText }}</pre>
          </details>
        </template>
      </div>

      <div v-if="phase === 'review'" class="dialog-footer">
        <button class="btn btn-red" @click="emit('close')">취소</button>
        <button class="btn btn-green" @click="apply">적용 ✅</button>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        multiple
        style="display: none"
        @change="onFilesSelected"
      />
    </div>
  </div>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  padding: 12px;
}
.dialog {
  background: #fff;
  width: 100%;
  max-width: 460px;
  max-height: 90vh;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.3);
}
.dialog-header {
  background: var(--primary);
  color: #fff;
  font-weight: bold;
  font-size: 1.1rem;
  padding: 14px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
}
.dialog-body {
  padding: 16px;
  overflow-y: auto;
  text-align: center;
}
.dialog-footer {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  border-top: 1px solid #eee;
  flex-shrink: 0;
}
.dialog-footer .btn {
  flex: 1;
}
.hint {
  color: #555;
  font-size: 0.9rem;
  line-height: 1.4;
  margin: 4px 0 12px;
}
.hint code,
code {
  background: #eef3fb;
  padding: 1px 5px;
  border-radius: 5px;
  font-size: 0.85em;
}
.error {
  color: #e53935;
  font-weight: bold;
  font-size: 0.9rem;
  margin: 8px 0;
}
.btn.big {
  width: 100%;
  padding: 16px;
  font-size: 1.1rem;
  border-radius: 14px;
}
.btn.small {
  padding: 10px 14px;
  border-radius: 12px;
  margin-top: 8px;
}
.btn.tiny {
  padding: 6px 10px;
  font-size: 0.85rem;
  border-radius: 10px;
  margin-top: 4px;
}
.reset {
  display: block;
  margin: 18px auto 0;
}
.section {
  border: 2px solid #eee;
  border-radius: 14px;
  padding: 10px;
  margin-bottom: 12px;
  text-align: left;
}
.section-head {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 8px;
}
.date-input {
  flex: 1;
  font-weight: bold;
  color: var(--primary-dark);
}
.row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 6px;
}
.word-input {
  flex: 0 0 34%;
}
.def-input {
  flex: 1;
}
input {
  padding: 8px 10px;
  border: 1.5px solid #ddd;
  border-radius: 10px;
  font-size: 0.9rem;
  min-width: 0;
}
input:focus {
  outline: none;
  border-color: var(--primary);
}
.x-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1rem;
  color: #999;
  flex-shrink: 0;
}
.raw {
  margin-top: 14px;
  text-align: left;
  font-size: 0.8rem;
  color: #666;
}
.raw summary {
  cursor: pointer;
}
.raw pre {
  white-space: pre-wrap;
  background: #f7f7f7;
  padding: 8px;
  border-radius: 8px;
  max-height: 180px;
  overflow: auto;
}
.spinner {
  width: 44px;
  height: 44px;
  border: 5px solid #e3f2fd;
  border-top-color: var(--primary);
  border-radius: 50%;
  margin: 20px auto 10px;
  animation: spin 0.9s linear infinite;
}
.progress {
  font-weight: bold;
  color: var(--primary-dark);
  font-size: 0.9rem;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
