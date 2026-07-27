<script setup lang="ts">
import { computed } from 'vue'
import { catalogService } from '@/services/catalog'
import IconGlyph from './IconGlyph.vue'

const props = defineProps<{ code: string }>()
const status = computed(() => catalogService.get('display-statuses', props.code))
</script>

<template>
  <span class="status-badge" :style="{ '--status-color': status?.color }">
    <IconGlyph :name="status?.iconKey ?? 'leaf'" />
    {{ status?.label ?? code }}
  </span>
</template>
