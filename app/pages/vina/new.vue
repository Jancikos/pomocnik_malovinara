<script setup lang="ts">
import { FarbaVina, nazvyFariebVina } from '~~/shared/domain'

const saving = ref(false)
const errorMessage = ref('')
const form = reactive({
  name: '',
  code: '',
  rocnik: new Date().getFullYear(),
  color: FarbaVina.BIELE,
  notes: '',
  vstupneSuroviny: [{
    odrodaHrozna: '',
    percentage: 100,
    weightKg: undefined as number | undefined,
    volumeLiters: undefined as number | undefined,
    cukornatostPriZbere: undefined as number | undefined,
  }],
})

function addMaterial() {
  form.vstupneSuroviny.push({
    odrodaHrozna: '',
    percentage: 0,
    weightKg: undefined,
    volumeLiters: undefined,
    cukornatostPriZbere: undefined,
  })
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    const created = await $fetch<{ id: string }>('/api/vina', { method: 'POST', body: form })
    await navigateTo(`/vina/${created.id}`)
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Víno sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="narrow-page">
    <NuxtLink class="back-link" to="/vina">← Späť na vína</NuxtLink>
    <PageHeading
      eyebrow="Portfólio pivnice"
      title="Nové víno"
      description="Zadajte základné údaje o víne a jeho zdrojovom materiáli."
    />
    <form class="panel form-grid elevated-form" @submit.prevent="save">
      <label class="span-2">Názov<input v-model="form.name" required></label>
      <label>Kód<input v-model="form.code" maxlength="8" required placeholder="IO"></label>
      <label>Ročník<input v-model.number="form.rocnik" type="number" min="1900" max="2100" required></label>
      <label class="span-2">Farba<select v-model="form.color"><option v-for="color in FarbaVina" :key="color" :value="color">{{ nazvyFariebVina[color] }}</option></select></label>
      <label class="span-2">Poznámka<textarea v-model="form.notes" rows="3" /></label>

      <div class="span-2 section-title"><h2 class="form-section-title">Zdrojový materiál</h2><button type="button" class="ghost-button" @click="addMaterial">+ Odroda</button></div>
      <div v-for="(material, index) in form.vstupneSuroviny" :key="index" class="material-row span-2">
        <label>Odroda<input v-model="material.odrodaHrozna" required></label>
        <label>Podiel %<input v-model.number="material.percentage" type="number" min="0.01" max="100" step="0.01" inputmode="decimal" required></label>
        <label>Hmotnosť kg<input v-model.number="material.weightKg" type="number" min="0" step="0.1" inputmode="decimal"></label>
        <label>Objem l<input v-model.number="material.volumeLiters" type="number" min="0" step="0.1" inputmode="decimal"></label>
        <label>Cukornatosť °NM<input v-model.number="material.cukornatostPriZbere" type="number" min="0" step="0.1" inputmode="decimal"></label>
      </div>
      <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
      <button class="primary-button span-2" :disabled="saving"><AppIcon name="plus" /> {{ saving ? 'Vytváram…' : 'Vytvoriť víno' }}</button>
    </form>
  </section>
</template>