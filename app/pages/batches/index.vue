<script setup lang="ts">
import { BatchStatus } from '~~/shared/domain'
const filter = ref<'active' | 'all'>('active')
const { data: batches } = await useBatches()
const visible = computed(() => filter.value === 'all' ? batches.value ?? [] : (batches.value ?? []).filter((batch) => batch.status === BatchStatus.ACTIVE))
</script>
<template><section><PageHeading eyebrow="Životný cyklus vína" title="Šarže" :description="`${visible.length} zobrazených šarží`"><NuxtLink class="primary-button" to="/batches/new">+ Nová šarža</NuxtLink></PageHeading><div class="tabs"><button :class="{ active: filter === 'active' }" @click="filter = 'active'">Aktívne</button><button :class="{ active: filter === 'all' }" @click="filter = 'all'">Všetky</button></div><div class="batch-grid"><BatchCard v-for="batch in visible" :key="batch.id" :batch="batch" /></div><p v-if="visible.length === 0" class="empty-state">Žiadne šarže.</p></section></template>