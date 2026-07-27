<script setup lang="ts">
defineProps<{ name: string }>()

const glyphs: Record<string, string> = {
  barrel: '▤',
  tank: '▥',
  demijohn: '◉',
  vat: '▱',
  'plastic-barrel': '▣',
  bottle: '♙',
  alert: '!',
  bubbles: '◌',
  leaf: '⌁',
  drop: '●',
  lock: '•',
  sugar: '◇',
  acid: '◒',
  density: '≋',
  shield: '◆',
  ph: 'pH',
  temperature: '°',
  sensory: '◎',
  clarity: '✦',
  nutrition: '✣',
  filter: '▽',
  transfer: '→',
  split: '⑂',
  merge: '⇥',
  note: '≡',
}
</script>

<template>
  <span class="icon-glyph" aria-hidden="true">{{ glyphs[name] ?? '•' }}</span>
</template>
