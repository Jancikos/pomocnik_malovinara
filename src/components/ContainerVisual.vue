<script setup lang="ts">
import IconGlyph from './IconGlyph.vue'

defineProps<{ imageKey: string; compact?: boolean }>()
</script>

<template>
  <div class="container-visual" :class="{ compact }" :data-kind="imageKey">
    <div class="vessel-shine"></div>
    <IconGlyph :name="imageKey" />
  </div>
</template>
