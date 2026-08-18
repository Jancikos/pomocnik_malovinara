<script setup lang="ts">
import { VesselType, vesselTypeLabels } from '~~/shared/domain'
const { data: vessels, refresh } = await useVessels()
const open = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({ name: '', type: VesselType.STEEL_TANK, capacity: 100, location: '' })
async function save() {
  saving.value = true; errorMessage.value = ''
  try { await $fetch('/api/vessels', { method: 'POST', body: form }); await refresh(); open.value = false }
  catch (error) { errorMessage.value = apiErrorMessage(error, 'Nádobu sa nepodarilo uložiť.') }
  finally { saving.value = false }
}
</script>
<template><section><PageHeading eyebrow="Vybavenie pivnice" title="Nádoby" :description="`${vessels?.length || 0} evidovaných nádob`"><button class="primary-button" @click="open = true">+ Nová nádoba</button></PageHeading><div class="vessel-grid"><article v-for="vessel in vessels" :key="vessel.id" class="panel vessel-card"><VesselVisual :type="vessel.type" compact /><div><p class="eyebrow gold">{{ vesselTypeLabels[vessel.type] }}</p><h2>{{ vessel.name }}</h2><p class="muted">{{ vessel.location || 'Bez umiestnenia' }}</p></div><div class="capacity"><strong>{{ vessel.activeVolume || 0 }} / {{ vessel.capacity }} l</strong><span>{{ vessel.activeVolume ? 'Obsadená' : 'Voľná' }}</span></div></article></div><div v-if="open" class="modal-backdrop" @click.self="open = false"><form class="sheet" @submit.prevent="save"><div class="sheet-heading"><h2>Nová nádoba</h2><button type="button" class="ghost-button" @click="open = false">Zavrieť</button></div><div class="form-grid"><label class="span-2">Názov<input v-model="form.name" required placeholder="Tank T3"></label><label>Typ<select v-model="form.type"><option v-for="type in VesselType" :key="type" :value="type">{{ vesselTypeLabels[type] }}</option></select></label><label>Kapacita (l)<input v-model.number="form.capacity" type="number" min="0.1" step="0.1" inputmode="decimal" required></label><label class="span-2">Umiestnenie<input v-model="form.location"></label><p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p><button class="primary-button span-2" :disabled="saving">{{ saving ? 'Ukladám…' : 'Vytvoriť nádobu' }}</button></div></form></div></section></template>