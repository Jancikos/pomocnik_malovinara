<script setup lang="ts">
import type { VinoFormBody } from '~~/shared/types/vino-form'

const saving = ref(false)
const errorMessage = ref('')

async function save(form: VinoFormBody) {
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
    <VinoForm submit-label="Vytvoriť víno" :saving="saving" :error-message="errorMessage" @save="save" />
  </section>
</template>