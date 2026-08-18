<script setup lang="ts">
const route = useRoute()
const { data: wines } = await useWines()
const { data: vessels } = await useVessels()
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({ wineId: String(route.query.wine || ''), vesselId: '', volume: 100, openedAt: new Date().toISOString().slice(0, 16) })
const freeVessels = computed(() => vessels.value?.filter((vessel) => !vessel.activeVolume) ?? [])
async function save() {
  saving.value = true; errorMessage.value = ''
  try { const created = await $fetch<{ id: string }>('/api/batches', { method: 'POST', body: form }); await navigateTo(`/batches/${created.id}`) }
  catch (error) { errorMessage.value = apiErrorMessage(error, 'Šaržu sa nepodarilo vytvoriť.') }
  finally { saving.value = false }
}
</script>
<template><section class="narrow-page"><NuxtLink class="back-link" to="/batches">← Späť na šarže</NuxtLink><PageHeading eyebrow="Nový výrobný cyklus" title="Prvá šarža" description="Prvá šarža vznikne automaticky vo fáze Mušt a dostane stabilné ID." /><form class="panel form-grid" @submit.prevent="save"><label class="span-2">Víno<select v-model="form.wineId" required><option value="" disabled>Vyberte víno</option><option v-for="wine in wines" :key="wine.id" :value="wine.id">{{ wine.name }} · {{ wine.vintageYear }}</option></select></label><label class="span-2">Voľná nádoba<select v-model="form.vesselId" required><option value="" disabled>Vyberte nádobu</option><option v-for="vessel in freeVessels" :key="vessel.id" :value="vessel.id">{{ vessel.name }} · {{ vessel.capacity }} l</option></select></label><label>Objem (l)<input v-model.number="form.volume" type="number" min="0.1" step="0.1" inputmode="decimal" required></label><label>Otvorená<input v-model="form.openedAt" type="datetime-local" required></label><p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p><button class="primary-button span-2" :disabled="saving">{{ saving ? 'Vytváram…' : 'Vytvoriť šaržu' }}</button></form></section></template>