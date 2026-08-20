<script setup lang="ts">
import { FazaSarze } from '~~/shared/domain'

const { data, status, error, refresh } = await usePivnica()
const search = ref('')
const showCreateMenu = ref(false)
const filtered = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('sk')
  if (!query) return data.value?.sarze ?? []
  return (data.value?.sarze ?? []).filter((sarza) =>
    `${sarza.nadoba.name} ${sarza.nazovVina} ${sarza.id}`.toLocaleLowerCase('sk').includes(query),
  )
})
</script>

<template>
  <section>
    <PageHeading
      :eyebrow="`${data?.pivnica.name || 'Pivnica'} · aktuálna výroba`"
      title="Moja pivnica"
      :description="data ? `${data.summary.aktivneSarze} aktívnych šarží vo vašej starostlivosti · ${data.summary.totalVolume.toLocaleString('sk-SK')} l` : ''"
    >
      <button class="primary-button" @click="showCreateMenu = true">
        <AppIcon name="plus" /> Vytvoriť
      </button>
    </PageHeading>

    <div class="toolbar pivnica-toolbar">
      <label class="search-field">
        <AppIcon name="search" :size="25" />
        <input v-model="search" aria-label="Hľadať v pivnici" placeholder="Hľadať víno alebo nádobu…">
      </label>
      <div class="faza-legend">
        <span><i class="faza-dot must" /> Mušt</span>
        <span><i class="faza-dot fermentation" /> Kvasenie</span>
        <span><i class="faza-dot aging" /> Zrenie</span>
      </div>
      <button class="ghost-button refresh-button" @click="refresh()">Obnoviť</button>
    </div>

    <p v-if="status === 'pending'" class="empty-state">Načítavam pivnicu…</p>
    <p v-else-if="error" class="form-error">Dashboard sa nepodarilo načítať.</p>
    <div v-else class="sarza-grid">
      <KartaSarze v-for="sarza in filtered" :key="sarza.id" :sarza="sarza" />
    </div>
    <p v-if="status !== 'pending' && filtered.length === 0" class="empty-state">Nenašla sa žiadna aktívna šarža.</p>

    <div v-if="showCreateMenu" class="modal-backdrop action-backdrop" @click.self="showCreateMenu = false">
      <section class="sheet action-sheet">
        <div class="sheet-handle" />
        <div class="sheet-heading">
          <div><p class="eyebrow gold">Pivnica</p><h2>Čo chcete vytvoriť?</h2></div>
          <button type="button" class="icon-button subtle" aria-label="Zavrieť" @click="showCreateMenu = false"><AppIcon name="close" /></button>
        </div>
        <NuxtLink class="action-choice" to="/vina/new">
          <span class="action-choice-icon vino"><AppIcon name="vino" :size="27" /></span>
          <span><strong>Víno</strong><small>Nové víno a jeho základné údaje</small></span>
          <AppIcon name="arrow" />
        </NuxtLink>
        <NuxtLink class="action-choice" to="/sarze/new">
          <span class="action-choice-icon sarza"><AppIcon name="sarze" :size="27" /></span>
          <span><strong>Šarža</strong><small>Nová výrobná šarža vo vybranej nádobe</small></span>
          <AppIcon name="arrow" />
        </NuxtLink>
      </section>
    </div>
  </section>
</template>
