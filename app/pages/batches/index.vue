<script setup lang="ts">
import { BatchStatus } from '~~/shared/domain'

const filter = ref<'active' | 'all'>('active')
const search = ref('')
const { data: batches } = await useBatches()
const visible = computed(() => {
  const selected = filter.value === 'all'
    ? batches.value ?? []
    : (batches.value ?? []).filter((batch) => batch.status === BatchStatus.ACTIVE)
  const query = search.value.trim().toLocaleLowerCase('sk')
  if (!query) return selected
  return selected.filter((batch) =>
    `${batch.id} ${batch.wineName} ${batch.vessel.name}`.toLocaleLowerCase('sk').includes(query),
  )
})
</script>

<template>
  <section>
    <PageHeading eyebrow="Životný cyklus vína" title="Šarže" :description="`${visible.length} zobrazených výrobných šarží`">
      <NuxtLink class="primary-button" to="/batches/new"><AppIcon name="plus" /> Nová šarža</NuxtLink>
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
    <div class="batch-grid">
      <BatchCard v-for="batch in visible" :key="batch.id" :batch="batch" />
    </div>
    <p v-if="visible.length === 0" class="empty-state">Žiadne šarže.</p>
  </section>
</template>
