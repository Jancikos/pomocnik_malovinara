<script setup lang="ts">
import { batchPhaseLabels, MeasurementType, vesselTypeLabels } from '~~/shared/domain'
import type { BatchSummaryDto } from '~~/shared/types/api'
const props = defineProps<{ batch: BatchSummaryDto }>()
const fill = computed(() => Math.min(100, Math.round((props.batch.volume / props.batch.vessel.capacity) * 100)))
const temperature = computed(() => props.batch.latestMeasurements[MeasurementType.TEMPERATURE])
</script>
<template>
  <NuxtLink class="batch-card" :to="`/batches/${batch.id}`">
    <div class="card-top"><span class="status-chip" :class="batch.phase.toLowerCase()">{{ batchPhaseLabels[batch.phase] }}</span><small v-if="temperature">{{ temperature.value }} {{ temperature.unit }}</small></div>
    <VesselVisual :type="batch.vessel.type" />
    <div class="card-copy"><p class="eyebrow">{{ vesselTypeLabels[batch.vessel.type] }}</p><h2>{{ batch.vessel.name }}</h2><p>{{ batch.wineName }} <b>{{ batch.vintageYear }}</b></p><div class="volume-row"><strong>{{ batch.volume.toLocaleString('sk-SK') }} l</strong><span>{{ fill }} %</span></div><div class="progress"><span :style="{ width: `${fill}%` }" /></div></div>
  </NuxtLink>
</template>