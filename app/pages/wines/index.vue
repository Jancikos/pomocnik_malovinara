<script setup lang="ts">
import { wineColorLabels } from '~~/shared/domain'
import type { WineDto } from '~~/shared/types/api'

const { data: wines } = await useWines()
const { data: batches } = await useBatches()
const search = ref('')

const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('sk')
  if (!query) return wines.value ?? []
  return (wines.value ?? []).filter((wine) =>
    `${wine.name} ${wine.code} ${wine.vintageYear}`.toLocaleLowerCase('sk').includes(query),
  )
})

const totalVolume = computed(() => (batches.value ?? [])
  .filter((batch) => batch.status === 'ACTIVE')
  .reduce((sum, batch) => sum + batch.volume, 0))

function wineStats(wine: WineDto) {
  const active = (batches.value ?? []).filter((batch) => batch.wineId === wine.id && batch.status === 'ACTIVE')
  return {
    count: active.length,
    volume: active.reduce((sum, batch) => sum + batch.volume, 0),
  }
}
</script>

<template>
  <section>
    <PageHeading eyebrow="Portfólio pivnice" title="Moje vína" :description="`${wines?.length || 0} vín naprieč všetkými ročníkmi`">
      <NuxtLink class="primary-button" to="/wines/new"><AppIcon name="plus" /> Vytvoriť</NuxtLink>
    </PageHeading>

    <div class="toolbar wines-toolbar">
      <label class="search-field">
        <AppIcon name="search" :size="25" />
        <input v-model="search" aria-label="Hľadať víno" placeholder="Hľadať podľa názvu, ročníka alebo kódu…">
      </label>
      <div class="portfolio-summary">
        <span><strong>{{ (batches || []).filter(batch => batch.status === 'ACTIVE').length }}</strong><small>aktívnych šarží</small></span>
        <span><strong>{{ totalVolume.toLocaleString('sk-SK') }} l</strong><small>vo výrobe</small></span>
      </div>
    </div>

    <div class="wine-grid">
      <NuxtLink
        v-for="wine in filtered"
        :key="wine.id"
        class="wine-portfolio-card"
        :class="wine.color.toLowerCase()"
        :to="`/wines/${wine.id}`"
      >
        <div class="wine-year-rail">
          <AppIcon name="wine" :size="34" />
          <strong>{{ wine.vintageYear }}</strong>
        </div>
        <div class="wine-card-content">
          <div class="wine-card-meta">
            <span>{{ wine.code }}</span>
            <span>{{ wineColorLabels[wine.color] }}</span>
          </div>
          <h2>{{ wine.name }}</h2>
          <p>{{ wine.notes || 'Bez doplňujúcej poznámky.' }}</p>
          <div class="wine-metrics">
            <span><strong>{{ wineStats(wine).count }}</strong><small>aktívne šarže</small></span>
            <span><strong>{{ wineStats(wine).volume.toLocaleString('sk-SK') }} l</strong><small>aktuálny objem</small></span>
          </div>
          <div class="wine-card-footer">
            <small>Ročník {{ wine.vintageYear }}</small>
            <strong>Detail <AppIcon name="arrow" :size="14" /></strong>
          </div>
        </div>
      </NuxtLink>
    </div>

    <p v-if="filtered.length === 0" class="empty-state">Nenašlo sa žiadne víno.</p>
  </section>
</template>