<script setup lang="ts">
import { StavSarze } from '~~/shared/domain'

const filter = ref<'active' | 'all'>('active')
const search = ref('')
const { data: sarze } = await useSarze()
const visible = computed(() => {
  const selected = filter.value === 'all'
    ? sarze.value ?? []
    : (sarze.value ?? []).filter((sarza) => sarza.status === StavSarze.AKTIVNA)
  const query = search.value.trim().toLocaleLowerCase('sk')
  if (!query) return selected
  return selected.filter((sarza) =>
    `${sarza.id} ${sarza.nazovVina} ${sarza.nadoba.name}`.toLocaleLowerCase('sk').includes(query),
  )
})
</script>

<template>
  <section>
    <PageHeading eyebrow="Životný cyklus vína" title="Šarže" :description="`${visible.length} zobrazených výrobných šarží`">
      <NuxtLink class="primary-button" to="/sarze/new"><AppIcon name="plus" /> Nová šarža</NuxtLink>
    </PageHeading>
    <div class="toolbar">
      <label class="search-field">
        <AppIcon name="search" :size="25" />
        <input v-model="search" aria-label="Hľadať šaržu" placeholder="Hľadať šaržu, víno alebo nádobu…">
      </label>
      <div class="tabs">
        <button :class="{ active: filter === 'active' }" @click="filter = 'active'">Aktívne</button>
        <button :class="{ active: filter === 'all' }" @click="filter = 'all'">Všetky</button>
      </div>
    </div>
    <div class="sarza-grid">
      <KartaSarze v-for="sarza in visible" :key="sarza.id" :sarza="sarza" />
    </div>
    <p v-if="visible.length === 0" class="empty-state">Žiadne šarže.</p>
  </section>
</template>
