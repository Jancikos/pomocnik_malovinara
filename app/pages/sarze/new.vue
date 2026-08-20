<script setup lang="ts">
import { FazaSarze, TypNadoby, moznostiFazSarze, nazvyTypovNadob } from '~~/shared/domain'

const route = useRoute()
const { data: vina } = await useVina()
const saving = ref(false)
const errorMessage = ref('')
const form = reactive({
  vinoId: String(route.query.vino || ''),
  faza: FazaSarze.MUST,
  nadoba: {
    name: '',
    type: TypNadoby.NEREZOVY_TANK,
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
    const created = await $fetch<{ id: string }>('/api/sarze', { method: 'POST', body: form })
    await navigateTo(`/sarze/${created.id}`)
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
    <NuxtLink class="back-link" to="/sarze">← Späť na šarže</NuxtLink>
    <PageHeading
      eyebrow="Nový výrobný cyklus"
      title="Nová šarža"
      description="Zvoľte fázu šarže a zaznamenajte aktuálnu nádobu."
    />
    <form class="panel form-grid elevated-form" @submit.prevent="save">
      <label>
        Víno
        <select v-model="form.vinoId" required>
          <option value="" disabled>Vyberte víno</option>
          <option v-for="vino in vina" :key="vino.id" :value="vino.id">{{ vino.name }} · {{ vino.rocnik }}</option>
        </select>
      </label>
      <label>
        Fáza šarže
        <select v-model="form.faza" required>
          <option v-for="option in moznostiFazSarze" :key="option.value" :value="option.value">{{ option.label }}</option>
        </select>
      </label>

      <h2 class="span-2 form-section-title">Nádoba šarže</h2>
      <label class="span-2">Názov nádoby<input v-model="form.nadoba.name" required placeholder="Tank T1"></label>
      <label>
        Typ nádoby
        <select v-model="form.nadoba.type" required>
          <option v-for="type in TypNadoby" :key="type" :value="type">{{ nazvyTypovNadob[type] }}</option>
        </select>
      </label>
      <label>Kapacita (l)<input v-model.number="form.nadoba.capacity" type="number" min="0.1" step="0.1" inputmode="decimal" required></label>
      <label class="span-2">Umiestnenie (voliteľné)<input v-model="form.nadoba.location" placeholder="Hlavná miestnosť"></label>

      <h2 class="span-2 form-section-title">Obsah šarže</h2>
      <label>Objem (l)<input v-model.number="form.volume" type="number" min="0.1" step="0.1" inputmode="decimal" required></label>
      <label>Otvorená<input v-model="form.openedAt" type="datetime-local" required></label>
      <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
      <button class="primary-button span-2" :disabled="saving"><AppIcon name="plus" /> {{ saving ? 'Vytváram…' : 'Vytvoriť šaržu' }}</button>
    </form>
  </section>
</template>
