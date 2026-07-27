<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import BatchCard from '@/components/BatchCard.vue'
import CreateFlow from '@/components/CreateFlow.vue'
import IconGlyph from '@/components/IconGlyph.vue'

const store = useAppStore()
const showCreate = ref(false)
const search = ref('')

const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('sk')
  if (!query) return store.activeBatches
  return store.activeBatches.filter((batch) => {
    const wine = store.wineFor(batch)
    return `${batch.container.label} ${batch.name} ${wine?.name ?? ''}`
      .toLocaleLowerCase('sk')
      .includes(query)
  })
})
</script>

<template>
  <section class="cellar-view">
    <div class="page-heading">
      <div>
        <p class="eyebrow gold">Oskarova pivnica · ročník 2026</p>
        <h1>Moja pivnica</h1>
        <p>
          <strong>{{ store.activeBatches.length }}</strong> aktívnych šarží vo vašej starostlivosti
        </p>
      </div>
      <button class="primary-button desktop-add" @click="showCreate = true">
        <IconGlyph name="plus" /> Vytvoriť
      </button>
    </div>
    <div class="toolbar">
      <label class="search-field"
        ><span><IconGlyph name="search" /></span
        ><input
          v-model="search"
          aria-label="Hľadať v pivnici"
          placeholder="Hľadať víno alebo nádobu…"
      /></label>
      <div class="legend">
        <span><i class="dot fermenting"></i>Kvasenie</span
        ><span><i class="dot maturing"></i>Zrenie</span
        ><span><i class="dot action"></i>Vyžaduje zásah</span>
      </div>
    </div>
    <div class="batch-grid">
      <BatchCard
        v-for="batch in filtered"
        :key="batch.id"
        :batch="batch"
        :wine="store.wineFor(batch)"
        :measurements="store.measurements.filter((item) => item.batchId === batch.id)"
      />
    </div>
    <p v-if="filtered.length === 0" class="empty-state">Nenašla sa žiadna zodpovedajúca šarža.</p>
    <button class="floating-add" aria-label="Vytvoriť víno alebo šaržu" @click="showCreate = true">
      <IconGlyph name="plus" />
    </button>
    <CreateFlow :open="showCreate" @close="showCreate = false" @created="showCreate = false" />
  </section>
</template>
