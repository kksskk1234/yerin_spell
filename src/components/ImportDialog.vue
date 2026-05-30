<script setup lang="ts">
import { ref } from 'vue'
import { useStudy } from '../composables/useStudy'
import { useVision } from '../composables/useVision'
import { parseVocabText } from '../utils/parseVocab'
import { generateSentence } from '../utils/generateSentence'
import type { WordData } from '../types'

const emit = defineEmits<{ close: [] }>()

const { applyWordData, resetWordData } = useStudy()
const { recognizeImages } = useVision()

interface EditRow {
  word: string
  def: string
  sent: string
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
const pasteText = ref('')

function pickFiles(): void {
  fileInput.value?.click()
}

/** Parse text (from OCR or paste) into editable sections and enter review. */
function buildSectionsFrom(text: string): void {
  const parsed = parseVocabText(text)
  sections.value = Object.entries(parsed).map(([date, words]) => ({
    date,
    rows: words.map((w) => ({ word: w.word, def: w.def, sent: w.sent ?? '' })),
  }))
  if (sections.value.length === 0) {
    // Give the user an empty row to fill in manually if parsing found nothing.
    sections.value = [{ date: '', rows: [{ word: '', def: '', sent: '' }] }]
  }
  phase.value = 'review'
  // Kick off best-effort example sentences in the background; the user can
  // still edit rows while these fill in.
  void autoFillSentences()
}

/** Register words from text pasted out of a digital document (no OCR). */
function importFromText(): void {
  const text = pasteText.value.trim()
  if (!text) {
    errorMsg.value = '붙여넣은 텍스트가 없어요.'
    return
  }
  errorMsg.value = ''
  rawText.value = text
  buildSectionsFrom(text)
}

async function onFilesSelected(e: Event): Promise<void> {
  const input = e.target as HTMLInputElement
  const files = input.files ? Array.from(input.files) : []
  if (files.length === 0) return

  phase.value = 'processing'
  errorMsg.value = ''
  rawText.value = ''
  progressLabel.value = `AI가 시험지 ${files.length}장을 읽는 중...`

  try {
    const visionSections = await recognizeImages(files)
    // Claude returns the example sentence too, so no separate generation step.
    sections.value = visionSections.map((s) => ({
      date: s.date,
      rows: s.words.map((w) => ({ word: w.word, def: w.definition, sent: w.sentence })),
    }))
    if (sections.value.length === 0) {
      sections.value = [{ date: '', rows: [{ word: '', def: '', sent: '' }] }]
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
  section.rows.push({ word: '', def: '', sent: '' })
}
function removeRow(section: EditSection, index: number): void {
  section.rows.splice(index, 1)
}
function addSection(): void {
  sections.value.push({ date: '', rows: [{ word: '', def: '', sent: '' }] })
}

const generating = ref(false)
const genLabel = ref('')

/**
 * Fill the example sentence for every row that has a word but no sentence yet.
 * Skips rows the user already edited. Runs sequentially to stay gentle on the
 * free dictionary API.
 */
async function autoFillSentences(): Promise<void> {
  if (generating.value) return
  const targets = sections.value
    .flatMap((s) => s.rows)
    .filter((r) => r.word.trim() && !r.sent.trim())
  if (targets.length === 0) return

  generating.value = true
  try {
    for (let i = 0; i < targets.length; i++) {
      const row = targets[i]
      genLabel.value = `예문 생성 중… (${i + 1}/${targets.length})`
      row.sent = await generateSentence(row.word)
    }
  } finally {
    generating.value = false
    genLabel.value = ''
  }
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
      .map((r) => {
        const word = r.word.trim()
        const def = r.def.trim()
        const sent = r.sent.trim()
        return sent ? { word, def, sent } : { word, def }
      })
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
  if (confirm('기본 단어 목록으로 되돌릴까요? 모든 기기에서 업로드한 데이터가 사라집니다.')) {
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
            시험지 이미지를 선택하면 AI가 단어·뜻·예문까지 자동으로 정리합니다.
            (여러 장 선택 가능)
          </p>
          <button class="btn btn-blue big" @click="pickFiles">🖼️ 이미지 선택</button>

          <div class="divider"><span>또는</span></div>

          <p class="hint">
            구글 문서·PDF 같은 디지털 문서라면 표를 복사해 아래에 붙여넣으면 훨씬 정확해요.
            (날짜 줄도 함께 붙여넣으세요)
          </p>
          <textarea
            v-model="pasteText"
            class="paste-area"
            placeholder="여기에 단어 표를 붙여넣기…&#10;예) Mon, June 1st: Subject Link&#10;coldest&#9;Superlative adjective&#9;Having a very low temperature"
          ></textarea>
          <button class="btn btn-green big" @click="importFromText">📋 텍스트로 등록</button>

          <p v-if="errorMsg" class="error">{{ errorMsg }}</p>
          <button class="btn btn-orange small reset" @click="onReset">기본 단어로 초기화</button>
        </template>

        <!-- 2. 인식 중 -->
        <template v-else-if="phase === 'processing'">
          <div class="spinner"></div>
          <p class="hint">AI가 시험지를 읽고 예문을 만드는 중...</p>
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
            <div v-for="(row, ri) in section.rows" :key="ri" class="row-group">
              <div class="row">
                <input v-model="row.word" class="word-input" placeholder="단어" />
                <input v-model="row.def" class="def-input" placeholder="뜻" />
                <button class="x-btn" title="단어 삭제" @click="removeRow(section, ri)">✕</button>
              </div>
              <input v-model="row.sent" class="sent-input" placeholder="예문 (자동 생성됨 · 수정 가능)" />
            </div>
            <button class="btn btn-blue tiny" @click="addRow(section)">+ 단어 추가</button>
          </div>

          <div class="actions">
            <button class="btn btn-blue small" @click="addSection">+ 날짜 추가</button>
            <button class="btn btn-orange small" :disabled="generating" @click="autoFillSentences">
              {{ generating ? genLabel : '✨ 예문 자동 채우기' }}
            </button>
          </div>

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
.divider {
  display: flex;
  align-items: center;
  text-align: center;
  color: #aaa;
  font-size: 0.85rem;
  margin: 18px 0 6px;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #eee;
}
.divider span {
  padding: 0 10px;
}
.paste-area {
  width: 100%;
  min-height: 110px;
  padding: 10px;
  border: 1.5px solid #ddd;
  border-radius: 12px;
  font-size: 0.85rem;
  font-family: inherit;
  resize: vertical;
  margin-bottom: 8px;
  box-sizing: border-box;
}
.paste-area:focus {
  outline: none;
  border-color: var(--primary);
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
.row-group {
  margin-bottom: 10px;
}
.row {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 4px;
}
.sent-input {
  width: 100%;
  font-size: 0.85rem;
  color: #555;
  background: #fafafa;
}
.actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.actions .btn {
  flex: 1;
}
.btn:disabled {
  opacity: 0.6;
  cursor: default;
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
