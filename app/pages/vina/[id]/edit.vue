<script setup lang="ts">
import type { VinoFormBody } from '~~/shared/types/vino-form'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: vino, error } = await useVino(id)
const saving = ref(false)
const errorMessage = ref('')

async function save(form: VinoFormBody) {
  saving.value = true
  errorMessage.value = ''
  try {
    const updated = await $fetch<{ id: string }>(`/api/vina/${id.value}`, { method: 'PUT', body: form })
    await refreshNuxtData([`vino-${updated.id}`, 'vina'])
    await navigateTo(`/vina/${updated.id}`)
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
    <NuxtLink class="back-link" :to="`/vina/${id}`">← Späť na víno</NuxtLink>
    <p v-if="error" class="form-error">Víno sa nenašlo.</p>
    <template v-else-if="vino">
      <PageHeading
        eyebrow="Portfólio pivnice"
        :title="`Upraviť ${vino.name}`"
        description="Upravte základné údaje o víne a jeho zdrojovom materiáli."
      />
      <VinoForm :initial-value="vino" submit-label="Uložiť zmeny" :saving="saving" :error-message="errorMessage" @save="save" />
    </template>
  </section>
</template>