<script setup lang="ts">
import { computed } from 'vue'
import type { Batch, Measurement, Wine } from '@/domain/models'
import { calculateDisplayStatus } from '@/domain/rules'
import statusRules from '@/data/config/status-rules.json'
import { catalogService } from '@/services/catalog'
import { formatNumber } from '@/shared/formatting'
import ContainerVisual from './ContainerVisual.vue'
import StatusBadge from './StatusBadge.vue'

const props = defineProps<{ batch: Batch; wine?: Wine; measurements: Measurement[] }>()
const status = computed(() => calculateDisplayStatus(props.batch, props.measurements, statusRules))
const fill = computed(() =>
  Math.round((props.batch.currentVolumeLiters / props.batch.container.capacityLiters) * 100),
)
</script>

<template>
  <RouterLink class="batch-card" :to="`/sarza/${batch.id}`">
    <div class="batch-card-top">
      <StatusBadge :code="status.code" />
      <span class="phase">{{ catalogService.label('batch-phases', batch.phase) }}</span>
    </div>
    <ContainerVisual :image-key="batch.container.imageKey" />
    <div class="batch-card-copy">
      <p class="eyebrow">{{ catalogService.label('container-types', batch.container.type) }}</p>
      <h2>{{ batch.container.label }}</h2>
      <p class="wine-name">
        {{ wine?.name }} <span>{{ wine?.vintageYear }}</span>
      </p>
      <div class="volume-row">
        <span>{{ formatNumber(batch.currentVolumeLiters) }} l</span>
        <span>{{ fill }} %</span>
      </div>
      <div class="progress"><span :style="{ width: `${fill}%` }"></span></div>
    </div>
  </RouterLink>
</template>
