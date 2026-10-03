<script setup lang="ts">
const cellarFetch = useCellarFetch()
import { TypMerania, TypZasahu } from '~~/shared/domain'
import { PrepocetCukru } from '~~/shared/domain/prepocet-cukru'
import type { DetailSarzeDto } from '~~/shared/types/api'

const props = defineProps<{ sarza: DetailSarzeDto }>()
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({
  pociatocnaCukornatost: props.sarza.posledneMerania[TypMerania.CUKORNATOST]?.value ?? '' as number | string,
  pozadovanaCukornatost: '' as number | string,
  pridanyCukorKg: '' as number | string,
  vykonaneAt: new Date().toISOString().slice(0, 16),
  notes: '',
})
const odporucaneKg = computed(() => {
  const initial = form.pociatocnaCukornatost
  const target = form.pozadovanaCukornatost
  if (typeof initial !== 'number' || typeof target !== 'number' || !Number.isFinite(initial) || !Number.isFinite(target) || initial < 0 || target < 0) return null
  return Math.round(PrepocetCukru.potrebneKilogramy(props.sarza.volume, initial, target, props.sarza.pivnica.koeficientDosladzaniaMustu) * 100) / 100
})
watch([() => form.pociatocnaCukornatost, () => form.pozadovanaCukornatost, () => props.sarza.volume, () => props.sarza.pivnica.koeficientDosladzaniaMustu], () => {
  form.pridanyCukorKg = odporucaneKg.value ?? ''
})

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    await cellarFetch('/api/sarze/' + props.sarza.id + '/zasahy', {
      method: 'POST',
      body: { type: TypZasahu.DOSLADZANIE, ...form },
    })
    await refreshNuxtData(['sarza-' + props.sarza.id, 'sarze-all', 'sarze-AKTIVNA'])
    await navigateTo('/sarze/' + props.sarza.id)
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Dosládzanie sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="panel form-grid elevated-form" @submit.prevent="save">
    <div class="span-2 action-form-heading">
      <span class="choice-card-icon"><AppIcon name="sweetness" :size="28" /></span>
      <div><p class="eyebrow gold">{{ sarza.id }}</p><h2>Dosládzanie</h2></div>
    </div>
    <label>
      Počiatočná cukornatosť (°NM)
      <input v-model.number="form.pociatocnaCukornatost" type="number" min="0" step="any" inputmode="decimal" required>
    </label>
    <label>
      Požadovaná cukornatosť (°NM)
      <input v-model.number="form.pozadovanaCukornatost" type="number" min="0" step="any" inputmode="decimal" required>
    </label>
    <label class="span-2">
      <span>Skutočne pridaný cukor (kg)<template v-if="odporucaneKg !== null"> — vypočítané: {{ odporucaneKg.toLocaleString('sk-SK', { maximumFractionDigits: 2 }) }} kg</template></span>
      <input v-model.number="form.pridanyCukorKg" type="number" min="0" step="any" inputmode="decimal" required>
    </label>
    <p v-if="odporucaneKg !== null" class="form-hint span-2">
      Na zvýšenie cukornatosti objemu {{ sarza.volume.toLocaleString('sk-SK') }} l o {{ Math.max(0, Number(form.pozadovanaCukornatost) - Number(form.pociatocnaCukornatost)).toLocaleString('sk-SK') }} °NM je potrebné pridať {{ odporucaneKg.toLocaleString('sk-SK', { maximumFractionDigits: 2 }) }} kg cukru.
    </p>
    <p class="form-hint span-2">Koeficient dosládzania muštu tejto pivnice: {{ sarza.pivnica.koeficientDosladzaniaMustu.toLocaleString('sk-SK', { maximumFractionDigits: 10 }) }}.</p>
    <label class="span-2">
      Čas
      <input v-model="form.vykonaneAt" type="datetime-local" required>
    </label>
    <label class="span-2">
      Poznámka
      <textarea v-model="form.notes" rows="3" placeholder="Voliteľná poznámka k dosládzeniu" />
    </label>
    <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
    <button class="primary-button span-2" :disabled="saving">
      <AppIcon name="check" /> {{ saving ? 'Ukladám…' : 'Uložiť zásah' }}
    </button>
  </form>
</template>
