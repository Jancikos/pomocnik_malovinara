<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { enumLabels } from '@/domain/enums'
import { catalogService } from '@/services/catalog'
import { formatDate, formatDateTime, formatNumber } from '@/shared/formatting'
import ContainerVisual from '@/components/ContainerVisual.vue'
import CreateFlow from '@/components/CreateFlow.vue'
import IconGlyph from '@/components/IconGlyph.vue'

const route = useRoute()
const router = useRouter()
const store = useAppStore()
const tab = ref<'all' | 'active' | 'history'>('all')
const showCreate = ref(false)
const wine = computed(() => store.wineById(String(route.params.id)))
const allBatches = computed(() =>
  store.batches
    .filter((batch) => batch.wineId === wine.value?.id)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
)
const visibleBatches = computed(() =>
  allBatches.value.filter(
    (batch) =>
      tab.value === 'all' ||
      (tab.value === 'active' ? batch.status === 'active' : batch.status === 'closed'),
  ),
)
const activeBatches = computed(() => allBatches.value.filter((batch) => batch.status === 'active'))
const activeVolume = computed(() =>
  activeBatches.value.reduce((sum, batch) => sum + batch.currentVolumeLiters, 0),
)
const wineMeasurements = computed(() =>
  store.measurements.filter((item) => item.wineId === wine.value?.id && !item.deletedAt),
)
const wineInterventions = computed(() =>
  store.interventions.filter((item) => item.wineId === wine.value?.id && !item.deletedAt),
)
const latestEvent = computed(
  () =>
    [
      ...wineMeasurements.value.map((item) => ({
        date: item.measuredAt,
        label: catalogService.label('measurement-types', item.type),
        kind: 'Meranie',
      })),
      ...wineInterventions.value.map((item) => ({
        date: item.performedAt,
        label: catalogService.label('intervention-types', item.type),
        kind: 'Zásah',
      })),
    ].sort((a, b) => b.date.localeCompare(a.date))[0],
)
</script>

<template>
  <section v-if="wine" class="wine-detail-view">
    <button class="back-button" @click="router.push('/vina')">
      <IconGlyph name="arrow-left" /><span>Späť na prehľad vín</span>
    </button>
    <div class="wine-detail-hero" :data-color="wine.color">
      <div class="wine-emblem">
        <IconGlyph name="wine" /><span>{{ wine.vintageYear }}</span>
      </div>
      <div class="wine-detail-copy">
        <p class="eyebrow gold">{{ wine.code }} · {{ enumLabels.wineColor[wine.color] }} víno</p>
        <h1>{{ wine.name }}</h1>
        <p>{{ wine.notes || 'K tomuto vínu zatiaľ nebola pridaná poznámka.' }}</p>
        <div class="wine-detail-date">
          <IconGlyph name="history" /> Evidované od {{ formatDate(wine.createdAt) }}
        </div>
      </div>
      <button class="primary-button" @click="showCreate = true">
        <IconGlyph name="plus" /> Pridať šaržu
      </button>
    </div>
    <div class="wine-kpis">
      <div class="panel">
        <span class="kpi-icon"><IconGlyph name="batch" /></span>
        <div>
          <b>{{ activeBatches.length }}</b
          ><span>aktívnych šarží</span>
        </div>
      </div>
      <div class="panel">
        <span class="kpi-icon"><IconGlyph name="drop" /></span>
        <div>
          <b>{{ formatNumber(activeVolume) }} l</b><span>aktuálny objem</span>
        </div>
      </div>
      <div class="panel">
        <span class="kpi-icon"><IconGlyph name="measurements" /></span>
        <div>
          <b>{{ wineMeasurements.length }}</b
          ><span>meraní spolu</span>
        </div>
      </div>
      <div class="panel">
        <span class="kpi-icon"><IconGlyph name="history" /></span>
        <div>
          <b>{{ allBatches.filter((batch) => batch.status === 'closed').length }}</b
          ><span>historických šarží</span>
        </div>
      </div>
    </div>
    <section v-if="latestEvent" class="latest-wine-event panel">
      <span class="kpi-icon"><IconGlyph name="activity" /></span>
      <div>
        <p class="eyebrow">Posledná aktivita</p>
        <strong>{{ latestEvent.kind }} · {{ latestEvent.label }}</strong
        ><span>{{ formatDateTime(latestEvent.date) }}</span>
      </div>
    </section>
    <section class="wine-batches-section">
      <div class="section-heading">
        <div>
          <p class="eyebrow gold">Rodokmeň vína</p>
          <h2>Všetky šarže</h2>
        </div>
        <div class="segmented-control">
          <button :class="{ active: tab === 'all' }" @click="tab = 'all'">Všetky</button
          ><button :class="{ active: tab === 'active' }" @click="tab = 'active'">Aktívne</button
          ><button :class="{ active: tab === 'history' }" @click="tab = 'history'">História</button>
        </div>
      </div>
      <div class="wine-batch-list">
        <RouterLink
          v-for="batch in visibleBatches"
          :key="batch.id"
          class="wine-batch-row"
          :to="`/sarza/${batch.id}`"
        >
          <ContainerVisual :image-key="batch.container.imageKey" compact />
          <div class="wine-batch-main">
            <div>
              <span class="lifecycle" :class="batch.status">{{
                batch.status === 'active' ? 'Aktívna' : 'Uzavretá'
              }}</span
              ><span>{{ batch.code }}</span>
            </div>
            <h3>{{ batch.name }}</h3>
            <p>
              {{ batch.container.label }} ·
              {{ catalogService.label('container-types', batch.container.type) }}
            </p>
          </div>
          <div class="wine-batch-phase">
            <span>Fáza</span
            ><strong>{{ catalogService.label('batch-phases', batch.phase) }}</strong>
          </div>
          <div class="wine-batch-volume">
            <span>{{ batch.status === 'active' ? 'Objem' : 'Ukončená' }}</span
            ><strong>{{
              batch.status === 'active'
                ? `${formatNumber(batch.currentVolumeLiters)} l`
                : formatDate(batch.closedAt ?? batch.updatedAt)
            }}</strong>
          </div>
          <IconGlyph name="arrow-right" />
        </RouterLink>
      </div>
      <p v-if="visibleBatches.length === 0" class="empty-state">
        V tejto skupine zatiaľ nie sú žiadne šarže.
      </p>
    </section>
    <CreateFlow
      :open="showCreate"
      initial-mode="batch"
      :wine-id="wine.id"
      @close="showCreate = false"
      @created="showCreate = false"
    />
  </section>
  <section v-else class="empty-state">
    <h1>Víno sa nenašlo</h1>
    <RouterLink to="/vina">Späť na prehľad vín</RouterLink>
  </section>
</template>
