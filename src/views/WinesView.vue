<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { enumLabels } from '@/domain/enums'
import { formatDate, formatNumber } from '@/shared/formatting'
import CreateFlow from '@/components/CreateFlow.vue'
import IconGlyph from '@/components/IconGlyph.vue'

const store = useAppStore()
const search = ref('')
const showCreate = ref(false)
const filteredWines = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('sk')
  return store.wines
    .filter(
      (wine) =>
        !query ||
        `${wine.name} ${wine.vintageYear} ${wine.code}`.toLocaleLowerCase('sk').includes(query),
    )
    .sort((a, b) => b.vintageYear - a.vintageYear || a.name.localeCompare(b.name, 'sk'))
})

function batchesFor(wineId: string) {
  return store.batches.filter((batch) => batch.wineId === wineId)
}

function activeVolume(wineId: string) {
  return batchesFor(wineId)
    .filter((batch) => batch.status === 'active')
    .reduce((sum, batch) => sum + batch.currentVolumeLiters, 0)
}

function lastActivity(wineId: string) {
  const dates = [
    ...batchesFor(wineId).map((batch) => batch.updatedAt),
    ...store.measurements.filter((item) => item.wineId === wineId).map((item) => item.measuredAt),
    ...store.interventions.filter((item) => item.wineId === wineId).map((item) => item.performedAt),
  ]
    .sort()
    .reverse()
  return dates[0]
}
</script>

<template>
  <section class="wines-view">
    <div class="page-heading">
      <div>
        <p class="eyebrow gold">Portfólio pivnice</p>
        <h1>Moje vína</h1>
        <p>
          <strong>{{ store.wines.length }}</strong> vín naprieč všetkými ročníkmi
        </p>
      </div>
      <button class="primary-button" @click="showCreate = true">
        <IconGlyph name="plus" /> Vytvoriť
      </button>
    </div>
    <div class="toolbar wines-toolbar">
      <label class="search-field"
        ><span><IconGlyph name="search" /></span
        ><input
          v-model="search"
          aria-label="Hľadať víno"
          placeholder="Hľadať podľa názvu, ročníka alebo kódu…"
      /></label>
      <div class="portfolio-summary">
        <span
          ><b>{{ store.activeBatches.length }}</b> aktívnych šarží</span
        ><span
          ><b
            >{{
              formatNumber(
                store.activeBatches.reduce((sum, batch) => sum + batch.currentVolumeLiters, 0),
              )
            }}
            l</b
          >
          vo výrobe</span
        >
      </div>
    </div>
    <div class="wine-grid">
      <RouterLink
        v-for="wine in filteredWines"
        :key="wine.id"
        class="wine-card"
        :to="`/vina/${wine.id}`"
      >
        <div class="wine-card-accent" :data-color="wine.color">
          <IconGlyph name="wine" /><span>{{ wine.vintageYear }}</span>
        </div>
        <div class="wine-card-body">
          <div class="wine-card-meta">
            <span>{{ wine.code }}</span
            ><span>{{ enumLabels.wineColor[wine.color] }}</span>
          </div>
          <h2>{{ wine.name }}</h2>
          <p>{{ wine.notes || 'Bez doplňujúcej poznámky.' }}</p>
          <div class="wine-stats">
            <div>
              <b>{{ batchesFor(wine.id).filter((batch) => batch.status === 'active').length }}</b
              ><span>aktívne šarže</span>
            </div>
            <div>
              <b>{{ formatNumber(activeVolume(wine.id)) }} l</b><span>aktuálny objem</span>
            </div>
          </div>
          <div class="wine-card-footer">
            <span v-if="lastActivity(wine.id)"
              >Aktualizované {{ formatDate(lastActivity(wine.id)!) }}</span
            ><strong>Detail <IconGlyph name="arrow-right" /></strong>
          </div>
        </div>
      </RouterLink>
    </div>
    <p v-if="filteredWines.length === 0" class="empty-state">
      Nenašlo sa žiadne zodpovedajúce víno.
    </p>
    <CreateFlow :open="showCreate" @close="showCreate = false" @created="showCreate = false" />
  </section>
</template>
