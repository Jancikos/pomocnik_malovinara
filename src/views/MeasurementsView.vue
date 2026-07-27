<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { CatalogOptionProvider, catalogService } from '@/services/catalog'
import { formatDate, formatDateTime, formatNumber } from '@/shared/formatting'
import IconGlyph from '@/components/IconGlyph.vue'

const store = useAppStore()
const router = useRouter()
const search = ref('')
const type = ref('')
const wineId = ref('')
const batchId = ref('')
const showBatchPicker = ref(false)
const measurementOptions = new CatalogOptionProvider(catalogService, 'measurement-types').options()

const visibleMeasurements = computed(() => {
  const query = search.value.trim().toLocaleLowerCase('sk')
  return store.measurements
    .filter((item) => !item.deletedAt)
    .filter((item) => {
      const batch = store.batchById(item.batchId)
      const wine = batch ? store.wineFor(batch) : undefined
      const label = catalogService.label('measurement-types', item.type)
      const haystack =
        `${label} ${wine?.name ?? ''} ${batch?.container.label ?? ''} ${item.notes ?? ''}`.toLocaleLowerCase(
          'sk',
        )
      return (
        (!query || haystack.includes(query)) &&
        (!type.value || item.type === type.value) &&
        (!wineId.value || item.wineId === wineId.value) &&
        (!batchId.value || item.batchId === batchId.value)
      )
    })
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
})

const latestByType = computed(() => {
  const codes = new Set<string>()
  return [...store.measurements]
    .filter((item) => !item.deletedAt)
    .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))
    .filter((item) => {
      if (codes.has(item.type)) return false
      codes.add(item.type)
      return true
    })
})

const pendingMeasurements = computed(
  () => store.measurements.filter((item) => item.syncStatus !== 'synced' && !item.deletedAt).length,
)
const recentDate = computed(
  () =>
    store.measurements
      .filter((item) => !item.deletedAt)
      .sort((a, b) => b.measuredAt.localeCompare(a.measuredAt))[0]?.measuredAt,
)

function valueLabel(item: (typeof store.measurements)[number]) {
  if (item.numericValue !== undefined)
    return `${formatNumber(item.numericValue)} ${item.unit ? catalogService.label('units', item.unit) : ''}`.trim()
  if (item.sensoryRating) {
    const catalog = item.type === 'clarity' ? 'clarity-ratings' : 'sensory-ratings'
    return catalogService.label(catalog, item.sensoryRating)
  }
  return 'Bez číselnej hodnoty'
}

function chooseBatch(id: string) {
  showBatchPicker.value = false
  void router.push({ path: `/sarza/${id}`, query: { akcia: 'meranie' } })
}

function clearFilters() {
  search.value = ''
  type.value = ''
  wineId.value = ''
  batchId.value = ''
}
</script>

<template>
  <section class="measurements-overview">
    <div class="page-heading">
      <div>
        <p class="eyebrow gold">Kontrola kvality</p>
        <h1>Merania</h1>
        <p>Aktuálne hodnoty a kompletný prehľad meraní zo všetkých šarží</p>
      </div>
      <button class="primary-button" @click="showBatchPicker = true">
        <IconGlyph name="plus" /> Pridať meranie
      </button>
    </div>
    <div class="measurement-kpis">
      <div class="panel">
        <span class="kpi-icon"><IconGlyph name="measurements" /></span>
        <div>
          <b>{{ store.measurements.filter((item) => !item.deletedAt).length }}</b
          ><span>meraní spolu</span>
        </div>
      </div>
      <div class="panel">
        <span class="kpi-icon"><IconGlyph name="clarity" /></span>
        <div>
          <b>{{ latestByType.length }}</b
          ><span>sledovaných typov</span>
        </div>
      </div>
      <div class="panel">
        <span class="kpi-icon"><IconGlyph name="sync" /></span>
        <div>
          <b>{{ pendingMeasurements }}</b
          ><span>čaká na odoslanie</span>
        </div>
      </div>
      <div class="panel">
        <span class="kpi-icon"><IconGlyph name="history" /></span>
        <div>
          <b>{{ recentDate ? formatDate(recentDate) : '—' }}</b
          ><span>posledné meranie</span>
        </div>
      </div>
    </div>

    <section class="latest-measurements panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow gold">Rýchly prehľad</p>
          <h2>Posledné hodnoty podľa typu</h2>
        </div>
      </div>
      <div class="latest-value-grid">
        <div v-for="item in latestByType.slice(0, 6)" :key="item.type" class="latest-value-card">
          <span class="measurement-type-icon"
            ><IconGlyph
              :name="catalogService.get('measurement-types', item.type)?.iconKey ?? 'drop'"
          /></span>
          <div>
            <span>{{ catalogService.label('measurement-types', item.type) }}</span
            ><strong>{{ valueLabel(item) }}</strong
            ><small
              >{{ store.batchById(item.batchId)?.container.label }} ·
              {{ formatDate(item.measuredAt) }}</small
            >
          </div>
        </div>
      </div>
    </section>

    <section class="measurement-register">
      <div class="section-heading">
        <div>
          <p class="eyebrow gold">Register</p>
          <h2>Všetky merania</h2>
        </div>
        <button class="text-button" @click="clearFilters">Vyčistiť filtre</button>
      </div>
      <div class="measurement-filters panel">
        <label class="search-field"
          ><span><IconGlyph name="search" /></span
          ><input
            v-model="search"
            aria-label="Hľadať v meraniach"
            placeholder="Hľadať víno, nádobu alebo poznámku…"
        /></label>
        <label
          >Typ merania<select v-model="type">
            <option value="">Všetky typy</option>
            <option v-for="option in measurementOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select></label
        >
        <label
          >Víno<select v-model="wineId">
            <option value="">Všetky vína</option>
            <option v-for="wine in store.wines" :key="wine.id" :value="wine.id">
              {{ wine.name }} · {{ wine.vintageYear }}
            </option>
          </select></label
        >
        <label
          >Šarža<select v-model="batchId">
            <option value="">Všetky šarže</option>
            <option v-for="batch in store.batches" :key="batch.id" :value="batch.id">
              {{ batch.container.label }} · {{ batch.code }}
            </option>
          </select></label
        >
      </div>
      <div class="measurement-table-wrap panel">
        <div class="measurement-table-head">
          <span>Meranie</span><span>Víno a šarža</span><span>Dátum</span><span>Stav</span>
        </div>
        <RouterLink
          v-for="item in visibleMeasurements"
          :key="item.id"
          class="measurement-register-row"
          :to="`/sarza/${item.batchId}`"
        >
          <div class="measurement-register-value">
            <span class="measurement-type-icon"
              ><IconGlyph
                :name="catalogService.get('measurement-types', item.type)?.iconKey ?? 'drop'"
            /></span>
            <div>
              <strong>{{ catalogService.label('measurement-types', item.type) }}</strong
              ><b>{{ valueLabel(item) }}</b>
            </div>
          </div>
          <div>
            <strong>{{ store.wineFor(store.batchById(item.batchId)!)?.name }}</strong
            ><span
              >{{ store.batchById(item.batchId)?.container.label }} ·
              {{ store.batchById(item.batchId)?.code }}</span
            >
          </div>
          <div>
            <strong>{{ formatDateTime(item.measuredAt) }}</strong
            ><span>{{ item.notes || 'Bez poznámky' }}</span>
          </div>
          <div>
            <span class="sync-status" :class="item.syncStatus">{{
              item.syncStatus === 'synced'
                ? 'Odoslané'
                : item.syncStatus === 'failed'
                  ? 'Chyba'
                  : 'Čaká'
            }}</span
            ><IconGlyph name="arrow-right" />
          </div>
        </RouterLink>
        <p v-if="visibleMeasurements.length === 0" class="empty-state compact">
          Žiadne merania nezodpovedajú zvoleným filtrom.
        </p>
      </div>
    </section>

    <div v-if="showBatchPicker" class="sheet-backdrop" @click.self="showBatchPicker = false">
      <section
        class="sheet batch-picker"
        role="dialog"
        aria-modal="true"
        aria-labelledby="batch-picker-title"
      >
        <div class="sheet-handle"></div>
        <div class="sheet-heading">
          <div>
            <p class="eyebrow gold">Nový záznam</p>
            <h2 id="batch-picker-title">Vyberte šaržu</h2>
          </div>
          <button class="icon-button" aria-label="Zavrieť" @click="showBatchPicker = false">
            <IconGlyph name="close" />
          </button>
        </div>
        <p class="sheet-intro">Meranie sa vždy ukladá ku konkrétnej aktívnej šarži.</p>
        <div class="batch-picker-list">
          <button
            v-for="batch in store.activeBatches"
            :key="batch.id"
            @click="chooseBatch(batch.id)"
          >
            <span class="measurement-type-icon"><IconGlyph name="batch" /></span>
            <div>
              <strong>{{ batch.container.label }}</strong
              ><span
                >{{ store.wineFor(batch)?.name }} · {{ store.wineFor(batch)?.vintageYear }}</span
              >
            </div>
            <b>{{ formatNumber(batch.currentVolumeLiters) }} l</b><IconGlyph name="arrow-right" />
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
