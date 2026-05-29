<script setup lang="ts">
defineProps<{ modelValue: string }>()
defineEmits<{ 'update:modelValue': [color: string] }>()

const COLORS: { c: string; title: string }[] = [
  { c: '#FFAD33', title: 'Light Orange' },
  { c: '#FF9800', title: 'Orange' },
  { c: '#FFFF00', title: 'Yellow' },
  { c: '#99FF33', title: 'Lime Green' },
  { c: '#4CAF50', title: 'Green' },
  { c: '#7FFFD4', title: 'Aquamarine' },
  { c: '#81D4FA', title: 'Sky Blue' },
  { c: '#0000FF', title: 'Blue' },
  { c: '#FFB6C1', title: 'Pink' },
  { c: '#FFFFFF', title: 'White' },
]

function dotStyle(c: string): string {
  // White needs a visible outline so it doesn't disappear on the white card.
  return c === '#FFFFFF' ? `background:${c}; border:1px solid #ccc;` : `background:${c}`
}
</script>

<template>
  <div class="color-grid">
    <div
      v-for="col in COLORS"
      :key="col.c"
      class="color-dot"
      :class="{ active: col.c === modelValue }"
      :style="dotStyle(col.c)"
      :title="col.title"
      @click="$emit('update:modelValue', col.c)"
    ></div>
  </div>
</template>
