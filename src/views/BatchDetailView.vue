<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { calculateDisplayStatus, latestMeasurements } from '@/domain/rules'
import statusRules from '@/data/config/status-rules.json'
import { CatalogOptionProvider, catalogService } from '@/services/catalog'
import { formatDateTime, formatNumber, localDateTimeValue } from '@/shared/formatting'
import ContainerVisual from '@/components/ContainerVisual.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import IconGlyph from '@/components/IconGlyph.vue'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const batch = computed(() => store.batchById(String(route.params.id)))
const wine = computed(() => (batch.value ? store.wineFor(batch.value) : undefined))
const batchMeasurements = computed(() =>
  store.measurements.filter((item) => item.batchId === batch.value?.id && !item.deletedAt),
)
const batchInterventions = computed(() =>
  store.interventions
    .filter((item) => item.batchId === batch.value?.id && !item.deletedAt)
    .sort((a, b) => b.performedAt.localeCompare(a.performedAt)),
)
const status = computed(() =>
  batch.value
    ? calculateDisplayStatus(batch.value, batchMeasurements.value, statusRules)
    : { code: 'maturing', reasons: [] },
)
const fill = computed(() =>
  batch.value
    ? Math.round((batch.value.currentVolumeLiters / batch.value.container.capacityLiters) * 100)
    : 0,
)
const currentMeasurements = computed(() =>
  Array.from(latestMeasurements(batchMeasurements.value).values()),
)

const showEntry = ref(false)
const entryMode = ref<
  'choose' | 'measurement-types' | 'measurement' | 'intervention-types' | 'intervention'
>('choose')
const selectedMeasurement = ref('')
const selectedIntervention = ref('')
const saving = ref(false)
const formError = ref('')
const measurementOptions = new CatalogOptionProvider(catalogService, 'measurement-types').options()
const interventionOptions = new CatalogOptionProvider(
  catalogService,
  'intervention-types',
).options()
const sensoryOptions = new CatalogOptionProvider(catalogService, 'sensory-ratings').options()
const clarityOptions = new CatalogOptionProvider(catalogService, 'clarity-ratings').options()
const containerOptions = new CatalogOptionProvider(catalogService, 'container-types').options()
const measurementForm = ref({
  value: '',
  sensoryRating: '',
  appearance: '',
  aroma: '',
  taste: '',
  notes: '',
  measuredAt: localDateTimeValue(),
})
const interventionForm = ref({
  substance: '',
  amount: '',
  notes: '',
  performedAt: localDateTimeValue(),
  targetLabel: '',
  targetType: containerOptions[0]?.value ?? '',
  capacity: 0,
  volume: 0,
  loss: 0,
  secondSourceId: '',
  target2Label: '',
  target2Type: containerOptions[0]?.value ?? '',
  target2Capacity: 0,
  target2Volume: 0,
})

const measurementCatalog = computed(() =>
  catalogService.get('measurement-types', selectedMeasurement.value),
)
const interventionCatalog = computed(() =>
  catalogService.get('intervention-types', selectedIntervention.value),
)
const unitLabel = computed(() => {
  const code = measurementCatalog.value?.unitCode
  return code ? catalogService.label('units', code) : ''
})
const isSensory = computed(() => ['sensory', 'clarity'].includes(selectedMeasurement.value))
const isTransfer = computed(() =>
  ['transfer', 'bottling'].includes(interventionCatalog.value?.behavior ?? ''),
)
const isSplit = computed(() => interventionCatalog.value?.behavior === 'split')
const isMerge = computed(() => interventionCatalog.value?.behavior === 'merge')
const mergeCandidates = computed(() =>
  store.activeBatches.filter(
    (item) => item.id !== batch.value?.id && item.wineId === batch.value?.wineId,
  ),
)

function openEntry() {
  entryMode.value = 'choose'
  showEntry.value = true
  formError.value = ''
}

function openMeasurementTypes() {
  entryMode.value = 'measurement-types'
  showEntry.value = true
}

onMounted(() => {
  if (route.query.akcia === 'meranie') openMeasurementTypes()
})

function openInterventionTypes() {
  entryMode.value = 'intervention-types'
  showEntry.value = true
}

function chooseMeasurement(code: string) {
  selectedMeasurement.value = code
  entryMode.value = 'measurement'
}

function chooseIntervention(code: string) {
  selectedIntervention.value = code
  entryMode.value = 'intervention'
  if (batch.value) {
    interventionForm.value.capacity = batch.value.currentVolumeLiters
    interventionForm.value.volume = batch.value.currentVolumeLiters
    interventionForm.value.target2Capacity = Math.max(1, batch.value.currentVolumeLiters / 2)
    interventionForm.value.target2Volume = Math.max(0, batch.value.currentVolumeLiters / 2)
    if (code === 'split') {
      interventionForm.value.volume = Math.max(0, batch.value.currentVolumeLiters / 2)
    }
    interventionForm.value.secondSourceId = mergeCandidates.value[0]?.id ?? ''
  }
}

async function saveMeasurement() {
  if (!batch.value) return
  formError.value = ''
  saving.value = true
  try {
    if (isSensory.value && !measurementForm.value.sensoryRating) {
      throw new Error('Vyberte hodnotenie.')
    }
    const validation = measurementCatalog.value?.validation
    const normalized = Number(measurementForm.value.value.replace(',', '.'))
    if (
      !isSensory.value &&
      validation &&
      (normalized < (validation.warningMin ?? -Infinity) ||
        normalized > (validation.warningMax ?? Infinity))
    ) {
      const proceed = window.confirm(
        'Hodnota je mimo demo rozsahu. Rozsah nie je odborným odporúčaním. Chcete ju uložiť?',
      )
      if (!proceed) return
    }
    await store.addMeasurement({
      batchId: batch.value.id,
      type: selectedMeasurement.value,
      value: isSensory.value ? undefined : measurementForm.value.value,
      sensoryRating: measurementForm.value.sensoryRating,
      appearance: measurementForm.value.appearance,
      aroma: measurementForm.value.aroma,
      taste: measurementForm.value.taste,
      notes: measurementForm.value.notes,
      measuredAt: measurementForm.value.measuredAt,
      unit: measurementCatalog.value?.unitCode,
    })
    showEntry.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Meranie sa nepodarilo uložiť.'
  } finally {
    saving.value = false
  }
}

async function saveIntervention() {
  if (!batch.value) return
  formError.value = ''
  saving.value = true
  try {
    if (isTransfer.value) {
      await store.transferBatch({
        sourceBatchId: batch.value.id,
        type: selectedIntervention.value as 'transfer' | 'bottling',
        targetLabel: interventionForm.value.targetLabel,
        targetType: interventionForm.value.targetType,
        capacity: interventionForm.value.capacity,
        volume: interventionForm.value.volume,
        loss: interventionForm.value.loss,
        notes: interventionForm.value.notes,
        performedAt: interventionForm.value.performedAt,
      })
      showEntry.value = false
      await router.replace('/')
      return
    }
    if (isSplit.value) {
      await store.splitBatch({
        sourceBatchId: batch.value.id,
        targets: [
          {
            label: interventionForm.value.targetLabel,
            type: interventionForm.value.targetType,
            capacity: interventionForm.value.capacity,
            volume: interventionForm.value.volume,
          },
          {
            label: interventionForm.value.target2Label,
            type: interventionForm.value.target2Type,
            capacity: interventionForm.value.target2Capacity,
            volume: interventionForm.value.target2Volume,
          },
        ],
        loss: interventionForm.value.loss,
        notes: interventionForm.value.notes,
        performedAt: interventionForm.value.performedAt,
      })
      showEntry.value = false
      await router.replace('/')
      return
    }
    if (isMerge.value) {
      await store.mergeBatches({
        sourceBatchIds: [batch.value.id, interventionForm.value.secondSourceId],
        targetLabel: interventionForm.value.targetLabel,
        targetType: interventionForm.value.targetType,
        capacity: interventionForm.value.capacity,
        volume: interventionForm.value.volume,
        loss: interventionForm.value.loss,
        notes: interventionForm.value.notes,
        performedAt: interventionForm.value.performedAt,
      })
      showEntry.value = false
      await router.replace('/')
      return
    }
    await store.addIntervention({
      batchId: batch.value.id,
      type: selectedIntervention.value,
      performedAt: interventionForm.value.performedAt,
      substance: interventionForm.value.substance,
      amount: interventionForm.value.amount,
      amountUnit: interventionCatalog.value?.fields?.find((field) => field.key === 'amount')
        ?.unitCode,
      notes: interventionForm.value.notes,
    })
    showEntry.value = false
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Zásah sa nepodarilo uložiť.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <section v-if="batch" class="detail-view">
    <button class="back-button" @click="router.back()">
      <IconGlyph name="arrow-left" /><span>Späť do pivnice</span>
    </button>
    <div class="detail-hero">
      <div class="detail-vessel">
        <ContainerVisual :image-key="batch.container.imageKey" />
        <span>{{ catalogService.label('container-types', batch.container.type) }}</span>
      </div>
      <div class="detail-copy">
        <div class="detail-badges">
          <StatusBadge :code="status.code" />
          <span class="phase-chip">{{ catalogService.label('batch-phases', batch.phase) }}</span>
        </div>
        <p class="eyebrow gold">{{ batch.code }} · {{ wine?.name }} {{ wine?.vintageYear }}</p>
        <h1>{{ batch.container.label }}</h1>
        <p class="detail-subtitle">{{ batch.name }}</p>
        <p v-if="batch.container.location" class="location">
          <IconGlyph name="location" />{{ batch.container.location }}
        </p>
      </div>
      <button class="secondary-button edit-button" aria-label="Upraviť údaje šarže">Upraviť</button>
    </div>

    <div class="detail-grid">
      <section class="panel volume-panel">
        <div class="panel-title">
          <div>
            <p class="eyebrow">Objem šarže</p>
            <h2>{{ formatNumber(batch.currentVolumeLiters) }} <small>litrov</small></h2>
          </div>
          <strong>{{ fill }} %</strong>
        </div>
        <div class="large-progress"><span :style="{ width: `${fill}%` }"></span></div>
        <div class="capacity-row">
          <span>0 l</span><span>Kapacita {{ formatNumber(batch.container.capacityLiters) }} l</span>
        </div>
      </section>

      <section v-if="status.reasons.length" class="panel alert-panel">
        <div class="alert-icon">!</div>
        <div>
          <p class="eyebrow">Vyžaduje pozornosť</p>
          <h2>Skontrolujte túto šaržu</h2>
          <ul>
            <li v-for="reason in status.reasons" :key="reason">{{ reason }}</li>
          </ul>
          <small>Hranice sú iba demo a nie sú odborným odporúčaním.</small>
        </div>
      </section>

      <section class="panel measurements-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Aktuálne hodnoty</p>
            <h2>Posledné merania</h2>
          </div>
          <button class="text-button" @click="openMeasurementTypes">
            <IconGlyph name="plus" /> Pridať
          </button>
        </div>
        <div v-if="currentMeasurements.length" class="measurement-list">
          <div v-for="item in currentMeasurements" :key="item.type" class="measurement-row">
            <IconGlyph
              :name="catalogService.get('measurement-types', item.type)?.iconKey ?? 'drop'"
            />
            <div>
              <strong>{{ catalogService.label('measurement-types', item.type) }}</strong
              ><span>{{ formatDateTime(item.measuredAt) }}</span>
            </div>
            <b v-if="item.numericValue !== undefined"
              >{{ formatNumber(item.numericValue) }}
              <small>{{ item.unit ? catalogService.label('units', item.unit) : '' }}</small></b
            >
            <b v-else>{{
              item.sensoryRating ? catalogService.label('sensory-ratings', item.sensoryRating) : '—'
            }}</b>
          </div>
        </div>
        <p v-else class="empty-state compact">Zatiaľ bez meraní.</p>
      </section>

      <section class="panel interventions-panel">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Práca v pivnici</p>
            <h2>Posledné zásahy</h2>
          </div>
          <button class="text-button" @click="openInterventionTypes">
            <IconGlyph name="plus" /> Pridať
          </button>
        </div>
        <div v-if="batchInterventions.length" class="timeline">
          <div v-for="item in batchInterventions.slice(0, 5)" :key="item.id" class="timeline-row">
            <span class="timeline-dot"></span>
            <div>
              <strong>{{ catalogService.label('intervention-types', item.type) }}</strong>
              <p>{{ item.notes || item.substance || 'Bez poznámky' }}</p>
              <small
                >{{ formatDateTime(item.performedAt) }} ·
                {{ item.syncStatus === 'synced' ? 'Odoslané' : 'Čaká na odoslanie' }}</small
              >
            </div>
          </div>
        </div>
        <p v-else class="empty-state compact">Zatiaľ bez zásahov.</p>
      </section>
    </div>

    <button class="detail-cta primary-button" @click="openEntry">
      <IconGlyph name="plus" /> Pridať meranie / zásah
    </button>

    <div v-if="showEntry" class="sheet-backdrop" @click.self="showEntry = false">
      <section class="sheet entry-sheet" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <div class="sheet-heading">
          <div>
            <p class="eyebrow gold">{{ batch.container.label }} · {{ wine?.name }}</p>
            <h2>
              {{
                entryMode === 'choose'
                  ? 'Čo chcete zaznamenať?'
                  : entryMode.includes('measurement')
                    ? 'Pridať meranie'
                    : 'Pridať zásah'
              }}
            </h2>
          </div>
          <button class="icon-button" aria-label="Zavrieť" @click="showEntry = false">
            <IconGlyph name="close" />
          </button>
        </div>

        <div v-if="entryMode === 'choose'" class="entry-choice">
          <button @click="entryMode = 'measurement-types'">
            <span class="choice-icon gold-bg"><IconGlyph name="measurements" /></span>
            <div><strong>Meranie</strong><small>Hodnota bez zásahu do vína</small></div>
            <b><IconGlyph name="arrow-right" /></b>
          </button>
          <button @click="entryMode = 'intervention-types'">
            <span class="choice-icon wine-bg"><IconGlyph name="clarity" /></span>
            <div><strong>Zásah</strong><small>Úkon meniaci víno alebo objem</small></div>
            <b><IconGlyph name="arrow-right" /></b>
          </button>
        </div>

        <div v-else-if="entryMode === 'measurement-types'" class="option-grid">
          <button
            v-for="option in measurementOptions"
            :key="option.value"
            @click="chooseMeasurement(option.value)"
          >
            <IconGlyph :name="option.iconKey ?? 'drop'" /><span>{{ option.label }}</span>
          </button>
        </div>

        <form
          v-else-if="entryMode === 'measurement'"
          class="entry-form"
          @submit.prevent="saveMeasurement"
        >
          <button class="mini-back" type="button" @click="entryMode = 'measurement-types'">
            <IconGlyph name="arrow-left" /> Zmeniť typ
          </button>
          <div class="selected-type">
            <IconGlyph :name="measurementCatalog?.iconKey ?? 'drop'" />
            <div>
              <span>Typ merania</span><strong>{{ measurementCatalog?.label }}</strong>
            </div>
          </div>
          <template v-if="isSensory">
            <label
              >Hodnotenie<select v-model="measurementForm.sensoryRating" required>
                <option value="" disabled>Vyberte hodnotenie</option>
                <option
                  v-for="option in selectedMeasurement === 'clarity'
                    ? clarityOptions
                    : sensoryOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select></label
            >
            <label v-if="selectedMeasurement === 'sensory'"
              >Vzhľad a čírosť<select v-model="measurementForm.appearance">
                <option value="">Nezadané</option>
                <option v-for="option in clarityOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select></label
            >
            <label v-if="selectedMeasurement === 'sensory'"
              >Vôňa<textarea v-model="measurementForm.aroma" rows="2"></textarea>
            </label>
            <label v-if="selectedMeasurement === 'sensory'"
              >Chuť<textarea v-model="measurementForm.taste" rows="2"></textarea>
            </label>
          </template>
          <label v-else class="value-field"
            >Hodnota<span
              ><input
                v-model="measurementForm.value"
                inputmode="decimal"
                required
                placeholder="0,0"
              /><b>{{ unitLabel }}</b></span
            ></label
          >
          <p v-if="measurementCatalog?.validation" class="demo-range">
            Demo rozsah:
            {{ measurementCatalog.validation.warningMin ?? measurementCatalog.validation.min }}–{{
              measurementCatalog.validation.warningMax ?? measurementCatalog.validation.max
            }}
            {{ unitLabel }} · nie je odborným odporúčaním
          </p>
          <label
            >Dátum a čas<input v-model="measurementForm.measuredAt" type="datetime-local" required
          /></label>
          <label
            >Poznámka<textarea
              v-model="measurementForm.notes"
              rows="3"
              placeholder="Voliteľná poznámka"
            ></textarea>
          </label>
          <div v-if="!store.online" class="offline-note">
            ◉ Uloží sa bezpečne offline a odošle po pripojení.
          </div>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <button class="primary-button full" :disabled="saving">
            {{ saving ? 'Ukladám…' : 'Uložiť meranie' }}
          </button>
        </form>

        <div
          v-else-if="entryMode === 'intervention-types'"
          class="option-grid intervention-options"
        >
          <button
            v-for="option in interventionOptions"
            :key="option.value"
            @click="chooseIntervention(option.value)"
          >
            <IconGlyph :name="option.iconKey ?? 'note'" /><span>{{ option.label }}</span>
          </button>
        </div>

        <form v-else class="entry-form" @submit.prevent="saveIntervention">
          <button class="mini-back" type="button" @click="entryMode = 'intervention-types'">
            <IconGlyph name="arrow-left" /> Zmeniť typ
          </button>
          <div class="selected-type">
            <IconGlyph :name="interventionCatalog?.iconKey ?? 'note'" />
            <div>
              <span>Typ zásahu</span><strong>{{ interventionCatalog?.label }}</strong>
            </div>
          </div>
          <template v-if="isTransfer || isSplit || isMerge">
            <label v-if="isMerge"
              >Druhá zdrojová šarža<select v-model="interventionForm.secondSourceId" required>
                <option value="" disabled>Vyberte šaržu</option>
                <option
                  v-for="candidate in mergeCandidates"
                  :key="candidate.id"
                  :value="candidate.id"
                >
                  {{ candidate.container.label }} ·
                  {{ formatNumber(candidate.currentVolumeLiters) }} l
                </option>
              </select></label
            >
            <div class="form-section-title">
              <span>Cieľová nádoba</span><small>Vznikne nová aktívna šarža</small>
            </div>
            <label
              >Označenie nádoby<input
                v-model="interventionForm.targetLabel"
                required
                placeholder="Napr. Tank B2"
            /></label>
            <label
              >Typ nádoby<select v-model="interventionForm.targetType">
                <option
                  v-for="option in containerOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </option>
              </select></label
            >
            <div class="field-pair">
              <label
                >Kapacita (l)<input
                  v-model.number="interventionForm.capacity"
                  type="number"
                  min="0.1"
                  step="0.1"
                  inputmode="decimal"
                  required
              /></label>
              <label
                >Cieľový objem (l)<input
                  v-model.number="interventionForm.volume"
                  type="number"
                  min="0"
                  step="0.1"
                  inputmode="decimal"
                  required
              /></label>
            </div>
            <template v-if="isSplit">
              <div class="form-section-title">
                <span>Druhá cieľová nádoba</span><small>Povinná pri rozdelení</small>
              </div>
              <label
                >Označenie nádoby<input
                  v-model="interventionForm.target2Label"
                  required
                  placeholder="Napr. Demižón 9"
              /></label>
              <label
                >Typ nádoby<select v-model="interventionForm.target2Type">
                  <option
                    v-for="option in containerOptions"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </option>
                </select></label
              >
              <div class="field-pair">
                <label
                  >Kapacita (l)<input
                    v-model.number="interventionForm.target2Capacity"
                    type="number"
                    min="0.1"
                    step="0.1"
                    inputmode="decimal"
                    required
                /></label>
                <label
                  >Cieľový objem (l)<input
                    v-model.number="interventionForm.target2Volume"
                    type="number"
                    min="0"
                    step="0.1"
                    inputmode="decimal"
                    required
                /></label>
              </div>
            </template>
            <label
              >Strata (l)<input
                v-model.number="interventionForm.loss"
                type="number"
                min="0"
                step="0.1"
                inputmode="decimal"
                required
            /></label>
            <div class="operation-summary">
              <span>Zdroj</span
              ><strong
                >{{
                  formatNumber(
                    batch.currentVolumeLiters +
                      (isMerge
                        ? (store.batchById(interventionForm.secondSourceId)?.currentVolumeLiters ??
                          0)
                        : 0),
                  )
                }}
                l</strong
              ><span>Cieľ + strata</span
              ><strong
                >{{
                  formatNumber(
                    interventionForm.volume +
                      (isSplit ? interventionForm.target2Volume : 0) +
                      interventionForm.loss,
                  )
                }}
                l</strong
              >
            </div>
          </template>
          <template v-else>
            <label v-if="interventionCatalog?.fields?.some((field) => field.key === 'substance')"
              >Použitá látka<input v-model="interventionForm.substance" required
            /></label>
            <label
              v-if="interventionCatalog?.fields?.some((field) => field.key === 'amount')"
              class="value-field"
              >Skutočne pridané množstvo<span
                ><input v-model="interventionForm.amount" inputmode="decimal" required /><b>{{
                  catalogService.label(
                    'units',
                    interventionCatalog?.fields?.find((field) => field.key === 'amount')
                      ?.unitCode ?? '',
                  )
                }}</b></span
              ></label
            >
          </template>
          <label
            >Dátum a čas<input
              v-model="interventionForm.performedAt"
              type="datetime-local"
              required
          /></label>
          <label
            >Poznámka<textarea
              v-model="interventionForm.notes"
              rows="3"
              placeholder="Čo ste urobili?"
            ></textarea>
          </label>
          <div v-if="!store.online" class="offline-note">
            ◉ Zásah sa uloží ako jedna atomická offline operácia.
          </div>
          <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
          <button class="primary-button full" :disabled="saving">
            {{ saving ? 'Ukladám…' : 'Uložiť zásah' }}
          </button>
        </form>
      </section>
    </div>
  </section>
  <section v-else class="empty-state">
    <h1>Šarža sa nenašla</h1>
    <RouterLink to="/">Späť do pivnice</RouterLink>
  </section>
</template>
