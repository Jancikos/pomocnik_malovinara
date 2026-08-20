<script setup lang="ts">
import { FazaSarze, TypMerania, nazvyFazSarze, nazvyTypovNadob } from '~~/shared/domain'
import type { PrehladSarzeDto } from '~~/shared/types/api'

const props = defineProps<{ sarza: PrehladSarzeDto }>()
const fill = computed(() => Math.min(100, Math.round((props.sarza.volume / props.sarza.nadoba.capacity) * 100)))
const temperature = computed(() => props.sarza.posledneMerania[TypMerania.TEPLOTA])
const ikonaFazy = computed(() => props.sarza.faza === FazaSarze.ZRENIE ? 'check' : 'zasah')
</script>

<template>
  <NuxtLink class="sarza-card" :to="`/sarze/${sarza.id}`">
    <div class="card-top">
      <span class="status-chip" :class="sarza.faza.toLowerCase()">
        <AppIcon :name="ikonaFazy" :size="14" />
        {{ nazvyFazSarze[sarza.faza] }}
      </span>
      <small>{{ temperature ? `${temperature.value} ${temperature.unit}` : nazvyFazSarze[sarza.faza] }}</small>
    </div>
    <VizualNadoby :type="sarza.nadoba.type" />
    <div class="card-copy">
      <p class="eyebrow">{{ nazvyTypovNadob[sarza.nadoba.type] }}</p>
      <h2>{{ sarza.nadoba.name }}</h2>
      <p>{{ sarza.nazovVina }} <b>{{ sarza.rocnik }}</b></p>
      <div class="volume-row">
        <strong>{{ sarza.volume.toLocaleString('sk-SK') }} l</strong>
        <span>{{ fill }} %</span>
      </div>
      <div class="progress"><span :style="{ width: `${fill}%` }" /></div>
    </div>
  </NuxtLink>
</template>
