<script setup lang="ts">
import { TypMerania, TypZasahu } from '~~/shared/domain'
import { PrepocetCukru } from '~~/shared/domain/prepocet-cukru'
import type { DetailSarzeDto } from '~~/shared/types/api'

const props = defineProps<{ sarza: DetailSarzeDto }>()
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({
  pridanaVodaLitrov: '' as number | string,
  pozadovanaCukornatost: props.sarza.posledneMerania[TypMerania.CUKORNATOST]?.value ?? '' as number | string,
  pridanyCukorKg: '' as number | string,
  vykonaneAt: new Date().toISOString().slice(0, 16),
  notes: '',
})
const odporucaneKg = computed(() => {
  const initial = form.pridanaVodaLitrov
  const target = form.pozadovanaCukornatost
  if (typeof initial !== 'number' || typeof target !== 'number' || !Number.isFinite(initial) || !Number.isFinite(target) || initial < 0 || target < 0) return null
  return Math.round(PrepocetCukru.potrebneKilogramy(initial, 0, target) * 100) / 100
})
watch([() => form.pridanaVodaLitrov, () => form.pozadovanaCukornatost, () => props.sarza.volume], () => {
  form.pridanyCukorKg = odporucaneKg.value ?? ''
})

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/sarze/' + props.sarza.id + '/zasahy', {
      method: 'POST',
      body: { type: TypZasahu.PRIDANIE_VODY, ...form },
    })
    await refreshNuxtData()
    await navigateTo('/sarze/' + props.sarza.id)
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Pridanie vody sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="panel form-grid elevated-form" @submit.prevent="save">
    <div class="span-2 action-form-heading">
      <span class="choice-card-icon"><AppIcon name="h2o" :size="28" /></span>
      <div><p class="eyebrow gold">{{ sarza.id }}</p><h2>Pridanie vody</h2></div>
    </div>
    <label>
      Doliata voda (l)
      <input v-model.number="form.pridanaVodaLitrov" type="number" min="0.01" step="any" inputmode="decimal" required>
    </label>
    <label>
      Dosladiť vodu na (°NM)
      <input v-model.number="form.pozadovanaCukornatost" type="number" min="0" step="any" inputmode="decimal" required>
    </label>
    <label class="span-2">
      <span>Cukor skutočne pridaný do vody (kg)<template v-if="odporucaneKg !== null"> — vypočítané: {{ odporucaneKg.toLocaleString('sk-SK', { maximumFractionDigits: 2 }) }} kg</template></span>
      <input v-model.number="form.pridanyCukorKg" type="number" min="0" step="any" inputmode="decimal" required>
    </label>
    <p v-if="odporucaneKg !== null" class="form-hint span-2">
      Doliatych {{ Number(form.pridanaVodaLitrov).toLocaleString('sk-SK') }} l vody doslaďte na {{ Number(form.pozadovanaCukornatost).toLocaleString('sk-SK') }} °NM. Je potrebné pridať {{ odporucaneKg.toLocaleString('sk-SK', { maximumFractionDigits: 2 }) }} kg cukru.
    </p>
    <p class="form-hint span-2">Cukornatosť je predvyplnená z posledného merania šarže; môžete ju upraviť. Objem šarže po doliatí: {{ (sarza.volume + Number(form.pridanaVodaLitrov || 0)).toLocaleString('sk-SK') }} l / {{ sarza.nadoba.capacity.toLocaleString('sk-SK') }} l.</p>
    <label class="span-2">
      Čas
      <input v-model="form.vykonaneAt" type="datetime-local" required>
    </label>
    <label class="span-2">
      Poznámka
      <textarea v-model="form.notes" rows="3" placeholder="Voliteľná poznámka k pridaniu vody" />
    </label>
    <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
    <button class="primary-button span-2" :disabled="saving">
      <AppIcon name="check" /> {{ saving ? 'Ukladám…' : 'Uložiť zásah' }}
    </button>
  </form>
</template>
