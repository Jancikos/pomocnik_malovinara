<script setup lang="ts">
import { TypZasahu, nazvyZasahov } from '~~/shared/domain'
import type { DetailSarzeDto } from '~~/shared/types/api'

const props = defineProps<{
  sarza: DetailSarzeDto
  typZasahu: TypZasahu.SIRENIE
  icon: string
}>()

const saving = ref(false)
const errorMessage = ref('')

const form = reactive({
  vykonaneAt: new Date().toISOString().slice(0, 16),
  notes: '',
  sulfurMg: undefined as number | undefined,
})

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/sarze/' + props.sarza.id + '/zasahy', {
      method: 'POST',
      body: {
        type: props.typZasahu,
        sulfurMg: form.sulfurMg,
        vykonaneAt: form.vykonaneAt,
        notes: form.notes,
      },
    })
    await refreshNuxtData(['sarza-' + props.sarza.id])
    await navigateTo('/sarze/' + props.sarza.id)
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Zásah sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="panel form-grid elevated-form" @submit.prevent="save">
    <div class="span-2 action-form-heading">
      <span class="choice-card-icon"><AppIcon :name="icon" :size="28" /></span>
      <div>
        <p class="eyebrow gold">{{ sarza.id }}</p>
        <h2>{{ nazvyZasahov[typZasahu] }}</h2>
      </div>
    </div>

    <label class="span-2">
      Pridaná síra (mg)
      <input v-model.number="form.sulfurMg" type="number" min="0" step="0.01" inputmode="decimal" required>
    </label>
    <label class="span-2">
      Čas
      <input v-model="form.vykonaneAt" type="datetime-local" required>
    </label>
    <label class="span-2">
      Poznámka
      <textarea v-model="form.notes" rows="3" placeholder="Voliteľná poznámka k síreniu" />
    </label>
    <p class="form-hint span-2">Sírenie sa iba zaeviduje k aktuálnej šarži. Šarža zostane aktívna a nevznikne nová šarža.</p>

    <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
    <button class="primary-button span-2" :disabled="saving">
      <AppIcon name="check" /> {{ saving ? 'Ukladám…' : 'Uložiť zásah' }}
    </button>
  </form>
</template>