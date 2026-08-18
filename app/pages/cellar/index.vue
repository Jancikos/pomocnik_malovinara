<script setup lang="ts">
const { data, status, error, refresh } = await useCellar()
const search = ref('')
const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('sk')
  if (!query) return data.value?.batches ?? []
  return (data.value?.batches ?? []).filter((batch) => `${batch.vessel.name} ${batch.wineName} ${batch.id}`.toLocaleLowerCase('sk').includes(query))
})
</script>
<template><section><PageHeading :eyebrow="data?.cellar.name || 'Pivnica'" title="Moja pivnica" :description="data ? `${data.summary.activeBatches} aktívnych šarží · ${data.summary.totalVolume.toLocaleString('sk-SK')} l` : ''"><NuxtLink class="primary-button" to="/batches/new">+ Nová šarža</NuxtLink></PageHeading><div class="toolbar"><label class="search-field"><span>⌕</span><input v-model="search" aria-label="Hľadať v pivnici" placeholder="Hľadať víno alebo nádobu…"></label><button class="ghost-button" @click="refresh()">Obnoviť</button></div><p v-if="status === 'pending'" class="empty-state">Načítavam pivnicu…</p><p v-else-if="error" class="form-error">Dashboard sa nepodarilo načítať.</p><div v-else class="batch-grid"><BatchCard v-for="batch in filtered" :key="batch.id" :batch="batch" /></div><p v-if="status !== 'pending' && filtered.length === 0" class="empty-state">Nenašla sa žiadna aktívna šarža.</p></section></template>