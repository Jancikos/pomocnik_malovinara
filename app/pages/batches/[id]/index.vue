<script setup lang="ts">
import {
  BatchPhase,
  BatchStatus,
  InterventionType,
  MeasurementType,
  VesselType,
  batchPhaseLabels,
  interventionLabels,
  measurementOptions,
  vesselTypeLabels,
} from '~~/shared/domain'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: batch, error, refresh } = await useBatch(id)
const actionError = ref('')
const saving = ref(false)
const showMeasure = ref(false)
const showTransfer = ref(false)
const showDanger = ref(false)

const measurementForm = reactive({
  type: MeasurementType.TEMPERATURE,
  value: undefined as number | undefined,
  measuredAt: new Date().toISOString().slice(0, 16),
})

function emptyDestination() {
  return {
    vessel: {
      name: '',
      type: VesselType.STEEL_TANK,
      capacity: 100,
      location: '',
    },
    volume: 0,
  }
}

const transferForm = reactive({
  lossVolume: 0,
  performedAt: new Date().toISOString().slice(0, 16),
  notes: '',
  destinations: [emptyDestination()],
})
const forceConfirmation = ref('')

const targetPhase = computed(() => {
  if (batch.value?.phase === BatchPhase.MUST) return BatchPhase.CLARIFICATION
  if (batch.value?.phase === BatchPhase.CLARIFICATION) return BatchPhase.FERMENTATION
  if (batch.value?.phase === BatchPhase.FERMENTATION) return BatchPhase.AGING
  return null
})
const transferType = computed(() => batch.value?.phase === BatchPhase.MUST ? InterventionType.CLARIFICATION : InterventionType.RACKING)
const moved = computed(() => transferForm.destinations.reduce((sum, item) => sum + Number(item.volume || 0), 0))
const remaining = computed(() => (batch.value?.volume ?? 0) - moved.value - Number(transferForm.lossVolume || 0))

function addDestination() {
  transferForm.destinations.push(emptyDestination())
}

function removeDestination(index: number) {
  if (transferForm.destinations.length > 1) transferForm.destinations.splice(index, 1)
}

async function saveMeasurement() {
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/batches/${id.value}/measurements`, { method: 'POST', body: measurementForm })
    await refresh()
    showMeasure.value = false
    measurementForm.value = undefined
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Meranie sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}

async function saveFermentation() {
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/batches/${id.value}/interventions`, {
      method: 'POST',
      body: { type: InterventionType.FERMENTATION, performedAt: new Date().toISOString() },
    })
    await refresh()
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Zásah sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}

async function saveTransfer() {
  if (!targetPhase.value) return
  saving.value = true
  actionError.value = ''
  try {
    const result = await $fetch<{ createdBatchIds: string[] }>('/api/transfers', {
      method: 'POST',
      body: { sourceBatchId: id.value, targetPhase: targetPhase.value, ...transferForm },
    })
    await navigateTo(`/batches/${result.createdBatchIds[0]}`)
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Presun sa nepodarilo dokončiť.')
  }
  finally {
    saving.value = false
  }
}

async function closeBatch() {
  if (!confirm('Naozaj chcete šaržu manuálne uzavrieť?')) return
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/batches/${id.value}/close`, { method: 'POST' })
    await refresh()
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Šaržu sa nepodarilo uzavrieť.')
  }
  finally {
    saving.value = false
  }
}

async function forceDelete() {
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/batches/${id.value}`, {
      method: 'DELETE',
      body: { confirmation: forceConfirmation.value },
    })
    await navigateTo('/batches')
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Šaržu nemožno vymazať.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section>
    <NuxtLink class="back-link" to="/batches">← Späť na šarže</NuxtLink>
    <p v-if="error" class="form-error">Šarža sa nenašla.</p>

    <template v-else-if="batch">
      <div class="detail-hero">
        <VesselVisual :type="batch.vessel.type" />
        <div>
          <p class="eyebrow gold">{{ batch.id }}</p>
          <h1>{{ batch.vessel.name }}</h1>
          <p class="detail-subtitle">{{ batch.wineName }} · {{ batch.vintageYear }}</p>
          <div class="chips">
            <span>{{ batchPhaseLabels[batch.phase] }}</span>
            <span>{{ batch.status === BatchStatus.ACTIVE ? 'Aktívna' : 'Uzavretá' }}</span>
            <span>{{ vesselTypeLabels[batch.vessel.type] }}</span>
            <span v-if="batch.vessel.location">{{ batch.vessel.location }}</span>
          </div>
        </div>
        <div class="hero-volume">
          <strong>{{ batch.volume.toLocaleString('sk-SK') }} l</strong>
          <small>z {{ batch.vessel.capacity }} l</small>
        </div>
      </div>

      <p v-if="actionError" class="form-error">{{ actionError }}</p>
      <div v-if="batch.status === BatchStatus.ACTIVE" class="action-bar">
        <button class="primary-button" @click="showMeasure = true">+ Meranie</button>
        <button v-if="batch.phase === BatchPhase.FERMENTATION" class="secondary-button" :disabled="saving" @click="saveFermentation">Zapísať kvasenie</button>
        <button v-if="targetPhase" class="secondary-button" @click="showTransfer = true">{{ interventionLabels[transferType] }}</button>
        <button class="ghost-button" @click="closeBatch">Uzavrieť</button>
      </div>

      <div class="detail-columns">
        <section class="panel">
          <div class="panel-heading">
            <h2>Posledné merania</h2>
            <button class="text-button" @click="showMeasure = true">Pridať</button>
          </div>
          <div v-for="option in measurementOptions" :key="option.value" class="data-row">
            <div>
              <strong>{{ option.label }}</strong>
              <small>{{ batch.latestMeasurements[option.value]?.measuredAt ? new Date(batch.latestMeasurements[option.value]!.measuredAt).toLocaleString('sk-SK') : 'Zatiaľ bez merania' }}</small>
            </div>
            <b>{{ batch.latestMeasurements[option.value]?.value ?? '—' }} <small>{{ batch.latestMeasurements[option.value]?.unit }}</small></b>
          </div>
        </section>

        <section class="panel">
          <h2>História zásahov</h2>
          <div v-for="item in batch.interventions" :key="item.id" class="data-row">
            <div>
              <strong>{{ interventionLabels[item.type] }}</strong>
              <small>{{ new Date(item.performedAt).toLocaleString('sk-SK') }}</small>
            </div>
          </div>
          <p v-if="batch.interventions.length === 0" class="muted">Zatiaľ bez zásahov.</p>
        </section>

        <section class="panel span-panel">
          <h2>Lineage</h2>
          <p v-if="batch.parentBatchId">
            Vznikla zo šarže
            <NuxtLink class="gold" :to="`/batches/${batch.parentBatchId}`">{{ batch.parentBatchId }}</NuxtLink>.
          </p>
          <div v-for="child in batch.children" :key="child.id" class="data-row">
            <div>
              <strong>{{ child.id }}</strong>
              <small>{{ child.vesselName }} · {{ child.volume }} l · {{ batchPhaseLabels[child.phase] }}</small>
            </div>
            <NuxtLink :to="`/batches/${child.id}`">→</NuxtLink>
          </div>
          <p v-if="!batch.parentBatchId && batch.children.length === 0" class="muted">Prvá šarža bez následníkov.</p>
        </section>
      </div>

      <section class="danger-zone">
        <button class="danger-button" @click="showDanger = !showDanger">Administratívne FORCE delete</button>
        <div v-if="showDanger" class="panel">
          <p>Vymazanie je možné iba bez meraní, zásahov, transferov a následníkov. Zadajte <b>FORCE DELETE</b>.</p>
          <div class="inline-form">
            <input v-model="forceConfirmation" aria-label="Potvrdenie force delete">
            <button class="danger-button" :disabled="saving || forceConfirmation !== 'FORCE DELETE'" @click="forceDelete">Natrvalo vymazať</button>
          </div>
        </div>
      </section>
    </template>

    <div v-if="showMeasure" class="modal-backdrop" @click.self="showMeasure = false">
      <form class="sheet" @submit.prevent="saveMeasurement">
        <div class="sheet-heading">
          <h2>Nové meranie</h2>
          <button type="button" class="ghost-button" @click="showMeasure = false">Zavrieť</button>
        </div>
        <div class="form-grid">
          <label class="span-2">
            Typ
            <select v-model="measurementForm.type">
              <option v-for="option in measurementOptions" :key="option.value" :value="option.value">{{ option.label }} · {{ option.unit }}</option>
            </select>
          </label>
          <label>
            Hodnota
            <input v-model.number="measurementForm.value" type="number" step="any" inputmode="decimal" required>
          </label>
          <label>
            Čas
            <input v-model="measurementForm.measuredAt" type="datetime-local" required>
          </label>
          <button class="primary-button span-2" :disabled="saving">{{ saving ? 'Ukladám…' : 'Uložiť meranie' }}</button>
        </div>
      </form>
    </div>

    <div v-if="showTransfer && targetPhase" class="modal-backdrop" @click.self="showTransfer = false">
      <form class="sheet transfer-sheet" @submit.prevent="saveTransfer">
        <div class="sheet-heading">
          <div>
            <p class="eyebrow gold">{{ interventionLabels[transferType] }}</p>
            <h2>Presun do {{ batchPhaseLabels[targetPhase] }}</h2>
          </div>
          <button type="button" class="ghost-button" @click="showTransfer = false">Zavrieť</button>
        </div>

        <fieldset v-for="(destination, index) in transferForm.destinations" :key="index" class="destination-card">
          <div class="destination-heading">
            <strong>Cieľová nádoba {{ index + 1 }}</strong>
            <button v-if="transferForm.destinations.length > 1" type="button" class="text-button danger-text" @click="removeDestination(index)">Odstrániť</button>
          </div>
          <div class="destination-fields">
            <label class="span-2">
              Názov
              <input v-model="destination.vessel.name" required placeholder="Tank T2">
            </label>
            <label>
              Typ
              <select v-model="destination.vessel.type" required>
                <option v-for="type in VesselType" :key="type" :value="type">{{ vesselTypeLabels[type] }}</option>
              </select>
            </label>
            <label>
              Kapacita (l)
              <input v-model.number="destination.vessel.capacity" type="number" min="0.1" step="0.1" inputmode="decimal" required>
            </label>
            <label>
              Objem šarže (l)
              <input v-model.number="destination.volume" type="number" min="0.1" step="0.1" inputmode="decimal" required>
            </label>
            <label>
              Umiestnenie (voliteľné)
              <input v-model="destination.vessel.location">
            </label>
          </div>
        </fieldset>

        <button type="button" class="secondary-button" @click="addDestination">+ Ďalšia cieľová nádoba</button>

        <div class="form-grid transfer-meta">
          <label>
            Strata (l)
            <input v-model.number="transferForm.lossVolume" type="number" min="0" step="0.1" inputmode="decimal" required>
          </label>
          <label>
            Čas
            <input v-model="transferForm.performedAt" type="datetime-local" required>
          </label>
          <label class="span-2">
            Poznámka
            <textarea v-model="transferForm.notes" rows="2" />
          </label>
        </div>

        <div class="transfer-summary">
          <span>Presúvané <b>{{ moved }} l</b></span>
          <span>Strata <b>{{ transferForm.lossVolume }} l</b></span>
          <span :class="{ invalid: Math.abs(remaining) > 0.001 }">Zostáva <b>{{ remaining.toFixed(1) }} l</b></span>
        </div>
        <button class="primary-button full" :disabled="saving || Math.abs(remaining) > 0.001">
          {{ saving ? 'Presúvam…' : 'Dokončiť atomický presun' }}
        </button>
      </form>
    </div>
  </section>
</template>
