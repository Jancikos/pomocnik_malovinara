<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { CatalogOptionProvider, catalogService } from '@/services/catalog'
import BatchCard from '@/components/BatchCard.vue'
import ContainerVisual from '@/components/ContainerVisual.vue'

const store = useAppStore()
const showForm = ref(false)
const saving = ref(false)
const formError = ref('')
const search = ref('')
const containerOptions = new CatalogOptionProvider(catalogService, 'container-types').options()
const phaseOptions = new CatalogOptionProvider(catalogService, 'batch-phases').options()
const form = ref({
  wineName: '',
  vintageYear: new Date().getFullYear(),
  color: 'white' as 'white' | 'rose' | 'red' | 'other',
  batchName: '',
  containerLabel: '',
  containerType: containerOptions[0]?.value ?? '',
  capacity: 100,
  volume: 90,
  phase: phaseOptions[0]?.value ?? '',
  location: '',
  notes: '',
})

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

async function submit() {
  formError.value = ''
  saving.value = true
  try {
    await store.addWineAndBatch({
      wineName: form.value.wineName,
      vintageYear: form.value.vintageYear,
      color: form.value.color,
      batchName: form.value.batchName,
      container: {
        label: form.value.containerLabel,
        type: form.value.containerType,
        capacityLiters: form.value.capacity,
        location: form.value.location || undefined,
        imageKey:
          catalogService.get('container-types', form.value.containerType)?.imageKey ?? 'tank',
      },
      volume: form.value.volume,
      phase: form.value.phase,
      notes: form.value.notes,
    })
    showForm.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Šaržu sa nepodarilo uložiť.'
  } finally {
    saving.value = false
  }
}
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
      <button class="primary-button desktop-add" @click="showForm = true">＋ Pridať šaržu</button>
    </div>
    <div class="toolbar">
      <label class="search-field">
        <span>⌕</span>
        <input
          v-model="search"
          aria-label="Hľadať v pivnici"
          placeholder="Hľadať víno alebo nádobu…"
        />
      </label>
      <div class="legend">
        <span><i class="dot fermenting"></i>Kvasenie</span>
        <span><i class="dot maturing"></i>Zrenie</span>
        <span><i class="dot action"></i>Vyžaduje zásah</span>
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
    <button class="floating-add" aria-label="Pridať šaržu" @click="showForm = true">＋</button>

    <div v-if="showForm" class="sheet-backdrop" @click.self="showForm = false">
      <section
        class="sheet form-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-batch-title"
      >
        <div class="sheet-handle"></div>
        <div class="sheet-heading">
          <div>
            <p class="eyebrow gold">Nová evidencia</p>
            <h2 id="new-batch-title">Pridať víno a prvú šaržu</h2>
          </div>
          <button class="icon-button" aria-label="Zavrieť" @click="showForm = false">×</button>
        </div>
        <form class="form-grid" @submit.prevent="submit">
          <label class="span-2"
            >Názov vína<input v-model="form.wineName" required placeholder="Napr. Rulandské biele"
          /></label>
          <label
            >Ročník<input
              v-model.number="form.vintageYear"
              type="number"
              min="1900"
              max="2100"
              required
          /></label>
          <label
            >Farba<select v-model="form.color">
              <option value="white">Biele</option>
              <option value="rose">Ružové</option>
              <option value="red">Červené</option>
              <option value="other">Iné</option>
            </select></label
          >
          <label class="span-2"
            >Názov šarže<input v-model="form.batchName" required placeholder="Napr. Hlavná šarža"
          /></label>
          <div class="form-section-title span-2">
            <span>Umiestnenie šarže</span><small>Nádoba sa uloží priamo do šarže</small>
          </div>
          <label
            >Označenie nádoby<input
              v-model="form.containerLabel"
              required
              placeholder="Napr. Tank D1"
          /></label>
          <label
            >Typ nádoby<select v-model="form.containerType">
              <option v-for="option in containerOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select></label
          >
          <div class="container-preview span-2">
            <ContainerVisual
              :image-key="
                catalogService.get('container-types', form.containerType)?.imageKey ?? 'tank'
              "
              compact
            /><span>{{ catalogService.label('container-types', form.containerType) }}</span>
          </div>
          <label
            >Kapacita (l)<input
              v-model.number="form.capacity"
              type="number"
              inputmode="decimal"
              min="0.1"
              step="0.1"
              required
          /></label>
          <label
            >Aktuálny objem (l)<input
              v-model.number="form.volume"
              type="number"
              inputmode="decimal"
              min="0"
              step="0.1"
              required
          /></label>
          <label
            >Fáza<select v-model="form.phase">
              <option v-for="option in phaseOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select></label
          >
          <label>Umiestnenie<input v-model="form.location" placeholder="Voliteľné" /></label>
          <label class="span-2">Poznámka<textarea v-model="form.notes" rows="2"></textarea></label>
          <p v-if="formError" class="form-error span-2" role="alert">{{ formError }}</p>
          <button class="primary-button full span-2" :disabled="saving">
            {{ saving ? 'Ukladám…' : 'Uložiť víno a šaržu' }}
          </button>
        </form>
      </section>
    </div>
  </section>
</template>
