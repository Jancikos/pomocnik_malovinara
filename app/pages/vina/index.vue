<script setup lang="ts">
import { nazvyFariebVina } from '~~/shared/domain'
import type { VinoDto } from '~~/shared/types/api'

const { data: vina } = await useVina()
const { data: sarze } = await useSarze()
const search = ref('')

const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('sk')
  if (!query) return vina.value ?? []
  return (vina.value ?? []).filter((vino) =>
    `${vino.name} ${vino.code} ${vino.rocnik}`.toLocaleLowerCase('sk').includes(query),
  )
})

const totalVolume = computed(() => (sarze.value ?? [])
  .filter((sarza) => sarza.status === 'AKTIVNA')
  .reduce((sum, sarza) => sum + sarza.volume, 0))

function statistikyVina(vino: VinoDto) {
  const active = (sarze.value ?? []).filter((sarza) => sarza.vinoId === vino.id && sarza.status === 'AKTIVNA')
  return {
    count: active.length,
    volume: active.reduce((sum, sarza) => sum + sarza.volume, 0),
  }
}
</script>

<template>
  <section>
    <PageHeading eyebrow="Portfólio pivnice" title="Moje vína" :description="`${vina?.length || 0} vín naprieč všetkými ročníkmi`">
      <NuxtLink class="primary-button" to="/vina/new"><AppIcon name="plus" /> Vytvoriť</NuxtLink>
    </PageHeading>

    <div class="toolbar vina-toolbar">
      <label class="search-field">
        <AppIcon name="search" :size="25" />
        <input v-model="search" aria-label="Hľadať víno" placeholder="Hľadať podľa názvu, ročníka alebo kódu…">
      </label>
      <div class="portfolio-summary">
        <span><strong>{{ (sarze || []).filter(sarza => sarza.status === 'AKTIVNA').length }}</strong><small>aktívnych šarží</small></span>
        <span><strong>{{ totalVolume.toLocaleString('sk-SK') }} l</strong><small>vo výrobe</small></span>
      </div>
    </div>

    <div class="vino-grid">
      <NuxtLink
        v-for="vino in filtered"
        :key="vino.id"
        class="vino-portfolio-card"
        :class="vino.color.toLowerCase()"
        :to="`/vina/${vino.id}`"
      >
        <div class="vino-year-rail">
          <AppIcon name="vino" :size="34" />
          <strong>{{ vino.rocnik }}</strong>
        </div>
        <div class="vino-card-content">
          <div class="vino-card-meta">
            <span>{{ vino.code }}</span>
            <span>{{ nazvyFariebVina[vino.color] }}</span>
          </div>
          <h2>{{ vino.name }}</h2>
          <p>{{ vino.notes || 'Bez doplňujúcej poznámky.' }}</p>
          <div class="vino-metrics">
            <span><strong>{{ statistikyVina(vino).count }}</strong><small>aktívne šarže</small></span>
            <span><strong>{{ statistikyVina(vino).volume.toLocaleString('sk-SK') }} l</strong><small>aktuálny objem</small></span>
          </div>
          <div class="vino-card-footer">
            <small>Ročník {{ vino.rocnik }}</small>
            <strong>Detail <AppIcon name="arrow" :size="14" /></strong>
          </div>
        </div>
      </NuxtLink>
    </div>

    <p v-if="filtered.length === 0" class="empty-state">Nenašlo sa žiadne víno.</p>
  </section>
</template>