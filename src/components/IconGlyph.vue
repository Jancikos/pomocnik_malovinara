<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ name: string }>()

const icons: Record<string, string[]> = {
  barrel: ['M6 4.5c-1.3 2-2 4.5-2 7.5s.7 5.5 2 7.5', 'M18 4.5c1.3 2 2 4.5 2 7.5s-.7 5.5-2 7.5', 'M6 4.5h12M4.5 8h15M4.5 16h15M6 19.5h12'],
  tank: ['M7 5h10v13H7z', 'M9 3h6v2M9 18v3M15 18v3', 'M10 10h4M12 8v4'],
  demijohn: ['M10 3h4v4c0 1.2.8 2 1.8 3 1.4 1.3 2.2 3.1 2.2 5 0 3.3-2.7 5-6 5s-6-1.7-6-5c0-1.9.8-3.7 2.2-5C9.2 9 10 8.2 10 7V3Z', 'M9.5 6h5'],
  vat: ['M5 7h14l-1.2 13H6.2L5 7Z', 'M4 4h16v3H4z', 'M8 11h8'],
  'plastic-barrel': ['M7 4h10l2 3v10l-2 3H7l-2-3V7l2-3Z', 'M6 9h12M6 15h12M9 4V2h6v2'],
  bottle: ['M10 2h4v5l2 3v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3V2Z', 'M10 5h4M8 14h8'],
  alert: ['M12 3 2.8 20h18.4L12 3Z', 'M12 9v5M12 17.5v.1'],
  bubbles: ['M8 15a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M16.5 10a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z', 'M16.5 20a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z'],
  leaf: ['M20 4C11 4 5 8 5 14c0 3 2 5 5 5 6 0 9-7 10-15Z', 'M5 20c3-5 7-8 12-11'],
  drop: ['M12 2S5.5 9.5 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 9.5 12 2 12 2Z'],
  lock: ['M6 10h12v10H6z', 'M8.5 10V7.5a3.5 3.5 0 0 1 7 0V10', 'M12 14v2.5'],
  sugar: ['M6 4h12l2 5-8 11L4 9l2-5Z', 'M4 9h16M9 4l3 16 3-16'],
  acid: ['M9 3h6M10 3v6l-4.5 8a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 9V3', 'M8 15h8'],
  density: ['M4 7c2-2 4-2 6 0s4 2 6 0 4-2 4 0', 'M4 12c2-2 4-2 6 0s4 2 6 0 4-2 4 0', 'M4 17c2-2 4-2 6 0s4 2 6 0 4-2 4 0'],
  shield: ['M12 3 20 6v5c0 5-3.4 8.5-8 10-4.6-1.5-8-5-8-10V6l8-3Z', 'M9 12h6M12 9v6'],
  temperature: ['M10 5a2 2 0 0 1 4 0v8.2a4 4 0 1 1-4 0V5Z', 'M12 8v7'],
  sensory: ['M4 12s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z'],
  clarity: ['M12 2l1.4 6.6L20 10l-6.6 1.4L12 18l-1.4-6.6L4 10l6.6-1.4L12 2Z'],
  nutrition: ['M12 21V9', 'M12 13c-4 0-6-2-6-6 4 0 6 2 6 6ZM12 17c4 0 6-2 6-6-4 0-6 2-6 6Z'],
  filter: ['M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5Z'],
  transfer: ['M4 7h13M14 4l3 3-3 3', 'M20 17H7M10 14l-3 3 3 3'],
  split: ['M5 4v4c0 2.2 1.8 4 4 4h10', 'M14 7l5 5-5 5', 'M5 20v-4c0-2.2 1.8-4 4-4'],
  merge: ['M5 4v4c0 2.2 1.8 4 4 4h10', 'M5 20v-4c0-2.2 1.8-4 4-4', 'M14 7l5 5-5 5'],
  note: ['M5 4h14v16H5z', 'M8 8h8M8 12h8M8 16h5'],
  home: ['M3 11 12 3l9 8', 'M5 10v10h14V10', 'M9 20v-6h6v6'],
  measurements: ['M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3', 'M8 15h8'],
  history: ['M4 7v5h5', 'M5.5 17a8 8 0 1 0 .5-10', 'M12 8v5l3 2'],
  logout: ['M10 4H5v16h5', 'M14 8l4 4-4 4M9 12h9'],
  search: ['M10.5 18a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z', 'M16 16l5 5'],
  close: ['M5 5l14 14M19 5 5 19'],
  plus: ['M12 5v14M5 12h14'],
  'arrow-left': ['M19 12H5M11 6l-6 6 6 6'],
  'arrow-right': ['M5 12h14M13 6l6 6-6 6'],
  location: ['M12 21s6-5.2 6-11a6 6 0 1 0-12 0c0 5.8 6 11 6 11Z', 'M12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z'],
}

const paths = computed(() => icons[props.name] ?? icons.note)
</script>

<template>
  <svg v-if="name !== 'ph'" class="icon-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="path in paths" :key="path" :d="path" />
  </svg>
  <svg v-else class="icon-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <text x="12" y="15" fill="currentColor" stroke="none" text-anchor="middle" font-family="system-ui, sans-serif" font-size="8" font-weight="700">pH</text>
  </svg>
</template>