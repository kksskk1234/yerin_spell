<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = withDefaults(defineProps<{ color: string; dashed?: boolean }>(), {
  dashed: false,
})

const canvas = ref<HTMLCanvasElement | null>(null)
let ctx: CanvasRenderingContext2D | null = null
let drawing = false

function getPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const rect = canvas.value!.getBoundingClientRect()
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY
  return { x: clientX - rect.left, y: clientY - rect.top }
}

function start(e: MouseEvent | TouchEvent): void {
  if (!ctx) return
  drawing = true
  const pos = getPos(e)
  ctx.beginPath()
  ctx.moveTo(pos.x, pos.y)
  if (e.type === 'touchstart') e.preventDefault()
}

function end(): void {
  if (!ctx) return
  drawing = false
  ctx.closePath()
}

function draw(e: MouseEvent | TouchEvent): void {
  if (!drawing || !ctx) return
  const pos = getPos(e)
  ctx.lineTo(pos.x, pos.y)
  ctx.stroke()
  if (e.type === 'touchmove') e.preventDefault()
}

/** Wipe the pad. Exposed to parent components via template ref. */
function clear(): void {
  if (!ctx || !canvas.value) return
  ctx.clearRect(0, 0, canvas.value.width, canvas.value.height)
}

onMounted(() => {
  const el = canvas.value
  if (!el) return
  // Size the backing store to the laid-out box so strokes aren't stretched.
  const rect = el.getBoundingClientRect()
  el.width = rect.width
  el.height = rect.height
  ctx = el.getContext('2d')
  if (!ctx) return
  ctx.lineWidth = 6
  ctx.lineCap = 'round'
  ctx.strokeStyle = props.color

  el.addEventListener('mousedown', start)
  el.addEventListener('touchstart', start, { passive: false })
  el.addEventListener('mousemove', draw)
  el.addEventListener('touchmove', draw, { passive: false })
  window.addEventListener('mouseup', end)
  window.addEventListener('touchend', end)
})

onBeforeUnmount(() => {
  const el = canvas.value
  if (el) {
    el.removeEventListener('mousedown', start)
    el.removeEventListener('touchstart', start)
    el.removeEventListener('mousemove', draw)
    el.removeEventListener('touchmove', draw)
  }
  window.removeEventListener('mouseup', end)
  window.removeEventListener('touchend', end)
})

watch(
  () => props.color,
  (c) => {
    if (ctx) ctx.strokeStyle = c
  },
)

defineExpose({ clear })
</script>

<template>
  <canvas
    id="draw-area"
    ref="canvas"
    :style="dashed ? 'border: 4px dashed var(--accent);' : undefined"
  ></canvas>
</template>
