<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAppStore } from '@/stores/app'
import { CatalogOptionProvider, catalogService } from '@/services/catalog'
import { formatDate, formatDateTime, formatNumber } from '@/shared/formatting'
import IconGlyph from '@/components/IconGlyph.vue'

const store = useAppStore()
const query = ref('')
const kind = ref('')
const batchId = ref('')
const containerType = ref('')
const phase = ref('')
const from = ref('')
const to = ref('')
const selected = ref<(typeof store.history)[number]>()
const measurementOptions = new CatalogOptionProvider(catalogService, 'measurement-types').options()
const interventionOptions = new CatalogOptionProvider(
  catalogService,
  'intervention-types',
).options()
const containerOptions = new CatalogOptionProvider(catalogService, 'container-types').options()
const phaseOptions = new CatalogOptionProvider(catalogService, 'batch-phases').options()

const filtered = computed(() =>
  store.history.filter((event) => {
    const batch = store.batchById(event.batchId)
    const wine = batch ? store.wineFor(batch) : undefined
    const date = event.eventKind === 'measurement' ? event.measuredAt : event.performedAt
    const label =
      event.eventKind === 'measurement'
        ? catalogService.label('measurement-types', event.type)
        : catalogService.label('intervention-types', event.type)
    const haystack =
      `${label} ${event.notes ?? ''} ${batch?.container.label ?? ''} ${wine?.name ?? ''}`.toLocaleLowerCase(
        'sk',
      )
    return (
      (!query.value || haystack.includes(query.value.toLocaleLowerCase('sk'))) &&
      (!kind.value ||
        event.eventKind === kind.value ||
        `${event.eventKind}:${event.type}` === kind.value) &&
      (!batchId.value || event.batchId === batchId.value) &&
      (!containerType.value || batch?.container.type === containerType.value) &&
      (!phase.value || batch?.phase === phase.value) &&
      (!from.value || date >= new Date(`${from.value}T00:00:00`).toISOString()) &&
      (!to.value || date <= new Date(`${to.value}T23:59:59`).toISOString())
    )
  }),
)

const grouped = computed(() => {
  const groups = new Map<string, typeof filtered.value>()
  filtered.value.forEach((event) => {
    const date = event.eventKind === 'measurement' ? event.measuredAt : event.performedAt
    const key = date.slice(0, 10)
    const items = groups.get(key) ?? []
    items.push(event)
    groups.set(key, items)
  })
  return Array.from(groups.entries())
})

function clearFilters() {
  query.value = ''
  kind.value = ''
  batchId.value = ''
  containerType.value = ''
  phase.value = ''
  from.value = ''
  to.value = ''
}

function eventLabel(event: (typeof store.history)[number]) {
  return event.eventKind === 'measurement'
    ? catalogService.label('measurement-types', event.type)
    : catalogService.label('intervention-types', event.type)
}

function eventDate(event: (typeof store.history)[number]) {
  return event.eventKind === 'measurement' ? event.measuredAt : event.performedAt
}

function eventIcon(event: (typeof store.history)[number]) {
  return event.eventKind === 'measurement'
    ? (catalogService.get('measurement-types', event.type)?.iconKey ?? 'drop')
    : (catalogService.get('intervention-types', event.type)?.iconKey ?? 'note')
}

async function editSelected() {
  if (!selected.value) return
  const notes = window.prompt('Nová poznámka', selected.value.notes ?? '')
  if (notes === null) return
  await store.editPending(selected.value.eventKind, selected.value.id, notes)
  selected.value = undefined
}

async function removeSelected() {
  if (!selected.value) return
  await store.removePending(selected.value.eventKind, selected.value.id)
  selected.value = undefined
}
</script>

<template>
  <section class="history-view">
    <div class="page-heading">
      <div>
        <p class="eyebrow gold">Kompletná auditná stopa</p>
        <h1>História pivnice</h1>
        <p>{{ filtered.length }} udalostí v časovej osi</p>
      </div>
    </div>
    <section class="history-filters panel">
      <label class="search-field span-2"
        ><span><IconGlyph name="search" /></span
        ><input
          v-model="query"
          aria-label="Hľadať v histórii"
          placeholder="Hľadať poznámku, víno alebo nádobu…"
      /></label>
      <label
        >Udalosť<select v-model="kind">
          <option value="">Všetky udalosti</option>
          <option value="measurement">Všetky merania</option>
          <option
            v-for="option in measurementOptions"
            :key="`m-${option.value}`"
            :value="`measurement:${option.value}`"
          >
            {{ option.label }}
          </option>
          <option value="intervention">Všetky zásahy</option>
          <option
            v-for="option in interventionOptions"
            :key="`i-${option.value}`"
            :value="`intervention:${option.value}`"
          >
            {{ option.label }}
          </option>
        </select></label
      >
      <label
        >Šarža<select v-model="batchId">
          <option value="">Všetky šarže</option>
          <option v-for="item in store.batches" :key="item.id" :value="item.id">
            {{ item.container.label }} · {{ item.code }}
          </option>
        </select></label
      >
      <label
        >Typ nádoby<select v-model="containerType">
          <option value="">Všetky nádoby</option>
          <option v-for="option in containerOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select></label
      >
      <label
        >Fáza<select v-model="phase">
          <option value="">Všetky fázy</option>
          <option v-for="option in phaseOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select></label
      >
      <label>Od<input v-model="from" type="date" /></label>
      <label>Do<input v-model="to" type="date" /></label>
      <button class="text-button clear-filter" @click="clearFilters">Vyčistiť filtre</button>
    </section>

    <div class="history-timeline">
      <section v-for="[date, events] in grouped" :key="date" class="history-day">
        <h2>
          {{ formatDate(`${date}T12:00:00Z`) }} <span>{{ events.length }}</span>
        </h2>
        <button
          v-for="event in events"
          :key="event.id"
          class="history-event"
          @click="selected = event"
        >
          <span class="event-icon" :class="event.eventKind"
            ><IconGlyph :name="eventIcon(event)"
          /></span>
          <div class="event-main">
            <p class="eyebrow">{{ event.eventKind === 'measurement' ? 'Meranie' : 'Zásah' }}</p>
            <strong>{{ eventLabel(event) }}</strong>
            <span
              >{{ store.batchById(event.batchId)?.container.label }} ·
              {{ store.wineFor(store.batchById(event.batchId)!)?.name }}</span
            >
          </div>
          <div class="event-value">
            <b v-if="event.eventKind === 'measurement' && event.numericValue !== undefined"
              >{{ formatNumber(event.numericValue) }}
              {{ event.unit ? catalogService.label('units', event.unit) : '' }}</b
            >
            <b v-else-if="event.eventKind === 'measurement' && event.sensoryRating">{{
              catalogService.label('sensory-ratings', event.sensoryRating)
            }}</b>
            <span>{{ formatDateTime(eventDate(event)) }}</span>
            <small :class="event.syncStatus">{{
              event.syncStatus === 'synced'
                ? 'Odoslané'
                : event.syncStatus === 'failed'
                  ? 'Chyba'
                  : 'Čaká'
            }}</small>
          </div>
          <span class="event-arrow"><IconGlyph name="arrow-right" /></span>
        </button>
      </section>
      <p v-if="!grouped.length" class="empty-state">
        Žiadne udalosti nezodpovedajú zvoleným filtrom.
      </p>
    </div>

    <div v-if="selected" class="sheet-backdrop" @click.self="selected = undefined">
      <section class="sheet event-detail" role="dialog" aria-modal="true">
        <div class="sheet-handle"></div>
        <div class="sheet-heading">
          <div>
            <p class="eyebrow gold">Detail udalosti</p>
            <h2>{{ eventLabel(selected) }}</h2>
          </div>
          <button class="icon-button" aria-label="Zavrieť" @click="selected = undefined">
            <IconGlyph name="close" />
          </button>
        </div>
        <dl>
          <div>
            <dt>Typ</dt>
            <dd>{{ selected.eventKind === 'measurement' ? 'Meranie' : 'Zásah' }}</dd>
          </div>
          <div>
            <dt>Šarža</dt>
            <dd>{{ store.batchById(selected.batchId)?.name }}</dd>
          </div>
          <div>
            <dt>Nádoba</dt>
            <dd>{{ store.batchById(selected.batchId)?.container.label }}</dd>
          </div>
          <div>
            <dt>Dátum a čas</dt>
            <dd>{{ formatDateTime(eventDate(selected)) }}</dd>
          </div>
          <div>
            <dt>Synchronizácia</dt>
            <dd>{{ selected.syncStatus === 'synced' ? 'Odoslané' : 'Čaká na odoslanie' }}</dd>
          </div>
          <div v-if="selected.notes">
            <dt>Poznámka</dt>
            <dd>{{ selected.notes }}</dd>
          </div>
        </dl>
        <section class="audit-box">
          <p class="eyebrow">Auditná stopa</p>
          <p>Vytvorenie záznamu bolo uložené spolu s doménovou zmenou. Audit je nemenný.</p>
          <small
            >{{ store.audits.filter((item) => item.entityId === selected?.id).length }} auditných
            záznamov</small
          >
        </section>
        <div v-if="selected.syncStatus === 'pending'" class="pending-actions">
          <button class="secondary-button" @click="editSelected">Upraviť poznámku</button>
          <button class="danger-button" @click="removeSelected">Odstrániť</button>
        </div>
      </section>
    </div>
  </section>
</template>
