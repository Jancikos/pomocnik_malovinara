<script setup lang="ts">
defineProps<{ name: string; size?: number }>()
</script>

<template>
  <svg
    class="app-icon"
    :width="size || 20"
    :height="size || 20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <template v-if="name === 'home'">
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10M9 20v-6h6v6" />
    </template>
    <template v-else-if="name === 'vino'">
      <path d="M7 3h10l-1 7a4 4 0 0 1-8 0L7 3Z" />
      <path d="M12 14v7M8.5 21h7" />
    </template>
    <template v-else-if="name === 'sarze'">
      <path d="m12 3 9 5-9 5-9-5 9-5Z" />
      <path d="m3 12 9 5 9-5M3 16l9 5 9-5" />
    </template>
    <template v-else-if="name === 'flask' || name === 'meranie'">
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" />
      <path d="M7.5 16h9" />
    </template>
    <template v-else-if="name === 'zasah' || name === 'clarity'">
      <path d="m12 3 1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8L12 3Z" />
    </template>
    <template v-else-if="name === 'sweetness'">
      <path d="M4 8h16l-8 12L4 8Z" />
      <path d="m8 8 4 12 4-12" />
      <path d="M7 4h10l3 4H4l3-4Z" />
    </template>
    <template v-else-if="name === 'density'">
      <path d="M3 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 13c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
      <path d="M3 18c2-2 4-2 6 0s4 2 6 0 4-2 6 0" />
    </template>
    <template v-else-if="name === 'ph'">
      <circle cx="12" cy="12" r="8" />
      <text x="12" y="15" text-anchor="middle" font-size="7" font-weight="800" fill="currentColor" stroke="none">pH</text>
    </template>
    <template v-else-if="name === 'thermometer'">
      <path d="M10 14.5V5a2 2 0 1 1 4 0v9.5a5 5 0 1 1-4 0Z" />
      <path d="M12 6v10" />
    </template>
    <template v-else-if="name === 'filter'">
      <path d="M4 5h16l-6.5 7.5V19l-3 1v-7.5L4 5Z" />
    </template>
    <template v-else-if="name === 'transfer'">
      <path d="M5 8h13M14 4l4 4-4 4" />
      <path d="M19 16H6M10 12l-4 4 4 4" />
    </template>
    <template v-else-if="name === 'sprout'">
      <path d="M12 20V9" />
      <path d="M12 12c-4.5-.5-6-3-6-7 4 .5 6 3 6 7Z" />
      <path d="M12 14c4.5-.5 6-3 6-7-4 .5-6 3-6 7Z" />
    </template>
    <template v-else-if="name === 'shield-plus'">
      <path d="M12 3 19 6v5c0 4.5-2.8 8-7 10-4.2-2-7-5.5-7-10V6l7-3Z" />
      <path d="M12 8v6M9 11h6" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'edit'">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </template>
    <template v-else-if="name === 'logout'">
      <path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" />
    </template>
    <template v-else-if="name === 'arrow'">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m6 6 12 12M18 6 6 18" />
    </template>
    <template v-else-if="name === 'check'">
      <path d="m5 12 4 4L19 6" />
    </template>
    <template v-else>
      <circle cx="12" cy="12" r="8" />
    </template>
  </svg>
</template>
