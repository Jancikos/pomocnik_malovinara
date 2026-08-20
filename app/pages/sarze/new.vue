<script setup lang="ts">
import type { SarzaFormBody } from '~~/shared/types/sarza-form'

const route = useRoute()
const { data: vina } = await useVina()
const saving = ref(false)
const errorMessage = ref('')

async function save(form: SarzaFormBody) {
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
    <SarzaForm :vina="vina" :initial-vino-id="String(route.query.vino || '')" submit-label="Vytvoriť šaržu" :saving="saving" :error-message="errorMessage" @save="save" />
  </section>
</template>