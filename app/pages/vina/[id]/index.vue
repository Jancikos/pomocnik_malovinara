<script setup lang="ts">
const cellarFetch = useCellarFetch()
const { canEdit } = useAuth()
const route = useRoute()
const { data: vino, error } = await useVino(() => String(route.params.id))
const { data: sarze } = await useSarze()
const vinoSarze = computed(() => sarze.value?.filter((sarza) => sarza.vinoId === vino.value?.id) ?? [])
const actionError = ref('')
const saving = ref(false)
const showDanger = ref(false)
const forceConfirmation = ref('')

async function forceDelete() {
  if (saving.value || forceConfirmation.value !== 'FORCE DELETE') return
  saving.value = true
  actionError.value = ''
  try {
    await cellarFetch(`/api/vina/${route.params.id}`, {
      method: 'DELETE',
      body: { confirmation: forceConfirmation.value },
    })
    await navigateTo('/vina')
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Víno nemožno vymazať.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section>
    <NuxtLink class="back-link" to="/vina">← Späť na vína</NuxtLink>
    <p v-if="error" class="form-error">Víno sa nenašlo.</p>
    <template v-else-if="vino">
      <PageHeading :eyebrow="`${vino.code} · ${vino.rocnik}`" :title="vino.name" :description="vino.notes || ''">
        <NuxtLink v-if="canEdit" class="ghost-button" :to="`/vina/${vino.id}/edit`"><AppIcon name="edit" /> Upraviť</NuxtLink>
        <NuxtLink v-if="canEdit" class="primary-button" :to="`/sarze/new?vino=${vino.id}`">+ Prvá šarža</NuxtLink>
      </PageHeading>
      <div class="detail-columns">
        <section class="panel">
          <h2>Zdrojový materiál</h2>
          <div v-for="material in vino.vstupneSuroviny" :key="material.id" class="data-row">
            <div><strong>{{ material.odrodaHrozna }}</strong><small>{{ material.weightKg ?? '—' }} kg · {{ material.volumeLiters ?? '—' }} l · {{ material.cukornatostPriZbere ?? '—' }} °NM</small></div>
            <b>{{ material.percentage }} %</b>
          </div>
        </section>
        <section class="panel">
          <h2>Šarže a lineage</h2>
          <NuxtLink v-for="sarza in vinoSarze" :key="sarza.id" class="data-row" :to="`/sarze/${sarza.id}`">
            <div><strong>{{ sarza.id }}</strong><small>{{ sarza.nadoba.name }} · {{ sarza.volume }} l</small></div>
            <span>→</span>
          </NuxtLink>
        </section>
      </div>
      <section v-if="canEdit" class="danger-zone">
        <div class="admin-actions">
          <button class="danger-button" :disabled="saving" @click="showDanger = !showDanger">Nezvratné vymazanie</button>
        </div>
        <div v-if="showDanger" class="panel">
          <p>Víno sa natrvalo vymaže spolu so vstupnými surovinami a všetkými svojimi šaržami vrátane ich meraní, zásahov a väzieb na presuny. Na potvrdenie zadajte <b>FORCE DELETE</b>.</p>
          <div class="inline-form">
            <input v-model="forceConfirmation" aria-label="Potvrdenie force delete" :disabled="saving">
            <button class="danger-button" :disabled="saving || forceConfirmation !== 'FORCE DELETE'" @click="forceDelete">Natrvalo vymazať</button>
          </div>
          <p v-if="actionError" class="form-error">{{ actionError }}</p>
        </div>
      </section>
    </template>
  </section>
</template>
