<script setup lang="ts">
import { BatchPhase, VesselType, batchPhaseOptions, vesselTypeLabels } from '~~/shared/domain'

const route = useRoute()
const { data: wines } = await useWines()
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({
  wineId: String(route.query.wine || ''),
  phase: BatchPhase.MUST,
  vessel: {
    name: '',
    type: VesselType.STEEL_TANK,
    capacity: 100,
    location: '',
  },
  volume: 100,
  openedAt: new Date().toISOString().slice(0, 16),
})

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    const created = await $fetch<{ id: string }>('/api/batches', { method: 'POST', body: form })
    await navigateTo(`/batches/${created.id}`)
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Šaržu sa nepodarilo vytvoriť.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="narrow-page">
    <NuxtLink class="back-link" to="/batches">← Späť na šarže</NuxtLink>
    <PageHeading
      eyebrow="Nový výrobný cyklus"
      title="Nová šarža"
      description="Zvoľte fázu šarže a zaznamenajte aktuálnu nádobu."
    />
    <form class="panel form-grid elevated-form" @submit.prevent="save">
      <label>
        Víno
        <select v-model="form.wineId" required>
          <option value="" disabled>Vyberte víno</option>
          <option v-for="wine in wines" :key="wine.id" :value="wine.id">{{ wine.name }} · {{ wine.vintageYear }}</option>
        </select>
      </label>
      <label>
        Fáza šarže
        <select v-model="form.phase" required>
          <option v-for="option in batchPhaseOptions" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>

      <h2 class="span-2 form-section-title">Nádoba šarže</h2>
      <label class="span-2">Názov nádoby<input v-model="form.vessel.name" required placeholder="Tank T1"></label>
      <label>
        Typ nádoby
        <select v-model="form.vessel.type" required>
          <option v-for="type in VesselType" :key="type" :value="type">{{ vesselTypeLabels[type] }}</option>
        </select>
      </label>
      <label>Kapacita (l)<input v-model.number="form.vessel.capacity" type="number" min="0.1" step="0.1" inputmode="decimal" required></label>
      <label class="span-2">Umiestnenie (voliteľné)<input v-model="form.vessel.location" placeholder="Hlavná miestnosť"></label>

      <h2 class="span-2 form-section-title">Obsah šarže</h2>
      <label>Objem (l)<input v-model.number="form.volume" type="number" min="0.1" step="0.1" inputmode="decimal" required></label>
      <label>Otvorená<input v-model="form.openedAt" type="datetime-local" required></label>
      <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
      <button class="primary-button span-2" :disabled="saving"><AppIcon name="plus" /> {{ saving ? 'Vytváram…' : 'Vytvoriť šaržu' }}</button>
    </form>
  </section>
</template>
