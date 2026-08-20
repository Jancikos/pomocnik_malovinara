<script setup lang="ts">
import type { SarzaFormBody } from '~~/shared/types/sarza-form'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: sarza, error } = await useSarza(id)
const { data: vina } = await useVina()
const saving = ref(false)
const errorMessage = ref('')

async function save(form: SarzaFormBody) {
  saving.value = true
  errorMessage.value = ''
  try {
    const updated = await $fetch<{ id: string }>(`/api/sarze/${id.value}`, { method: 'PUT', body: form })
    await refreshNuxtData([`sarza-${updated.id}`, 'sarze-all', 'sarze-AKTIVNA'])
    await navigateTo(`/sarze/${updated.id}`)
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Šaržu sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="narrow-page">
    <NuxtLink class="back-link" :to="`/sarze/${id}`">← Späť na šaržu</NuxtLink>
    <p v-if="error" class="form-error">Šarža sa nenašla.</p>
    <template v-else-if="sarza">
      <PageHeading
        eyebrow="Základné údaje šarže"
        :title="`Upraviť ${sarza.nadoba.name}`"
        description="Upravte víno, fázu, nádobu, objem a dátum otvorenia."
      />
      <SarzaForm :vina="vina" :initial-value="sarza" submit-label="Uložiť zmeny" :saving="saving" :error-message="errorMessage" @save="save" />
    </template>
  </section>
</template>