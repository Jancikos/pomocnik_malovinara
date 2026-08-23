<script setup lang="ts">
import {
  StavSarze,
  TypZasahu,
  TypMerania,
  nazvyFazSarze,
  nazvyZasahov,
  moznostiZasahov,
  moznostiMerani,
  nazvyTypovNadob,
} from '~~/shared/domain'

const route = useRoute()
const id = computed(() => String(route.params.id))
const { data: sarza, error, refresh } = await useSarza(id)
const actionError = ref('')
const saving = ref(false)
const showMeasure = ref(false)
const showZasah = ref(false)
const showDanger = ref(false)

const formularMerania = reactive({
  type: TypMerania.TEPLOTA,
  value: undefined as number | undefined,
  zmeraneAt: new Date().toISOString().slice(0, 16),
})

const ikonyMerani: Record<TypMerania, string> = {
  [TypMerania.CUKORNATOST]: 'sweetness',
  [TypMerania.PH]: 'ph',
  [TypMerania.HUSTOTA]: 'density',
  [TypMerania.TEPLOTA]: 'thermometer',
}

const ikonyZasahov: Record<TypZasahu, string> = {
  [TypZasahu.KVASENIE]: 'sprout',
  [TypZasahu.ODKALENIE]: 'filter',
  [TypZasahu.STACANIE]: 'transfer',
  [TypZasahu.SIRENIE]: 'shield-plus',
}

const forceConfirmation = ref('')

function openMeranie() {
  showMeasure.value = true
}

function openZasah() {
  showZasah.value = true
}

function openZasahForm(type: TypZasahu) {
  showZasah.value = false
  return navigateTo('/sarze/' + id.value + '/zasahy/' + type.toLowerCase() + '/new')
}

function formatHodnotaMerania(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('sk-SK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

async function saveMeranie() {
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/sarze/${id.value}/merania`, { method: 'POST', body: formularMerania })
    await refresh()
    showMeasure.value = false
    formularMerania.value = undefined
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Meranie sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}

async function uzavriSarzu() {
  if (!confirm('Naozaj chcete šaržu manuálne uzavrieť?')) return
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/sarze/${id.value}/uzavriet`, { method: 'POST' })
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
    await $fetch(`/api/sarze/${id.value}`, {
      method: 'DELETE',
      body: { confirmation: forceConfirmation.value },
    })
    await navigateTo('/sarze')
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
    <NuxtLink class="back-link" to="/sarze">← Späť na šarže</NuxtLink>
    <p v-if="error" class="form-error">Šarža sa nenašla.</p>

    <template v-else-if="sarza">
      <div class="detail-hero">
        <VizualNadoby :type="sarza.nadoba.type" />
        <div class="detail-hero-copy">
          <p class="eyebrow gold">{{ sarza.id }}</p>
          <h1>{{ sarza.nadoba.name }}</h1>
          <p class="detail-subtitle">{{ sarza.nazovVina }} · {{ sarza.rocnik }}</p>
          <div class="chips">
            <span :class="sarza.faza.toLowerCase()">{{ nazvyFazSarze[sarza.faza] }}</span>
            <span>{{ sarza.status === StavSarze.AKTIVNA ? 'Aktívna' : 'Uzavretá' }}</span>
            <span>{{ nazvyTypovNadob[sarza.nadoba.type] }}</span>
            <span v-if="sarza.nadoba.location">{{ sarza.nadoba.location }}</span>
          </div>
        </div>
        <div class="hero-volume">
          <strong>{{ sarza.volume.toLocaleString('sk-SK') }} l</strong>
          <small>z {{ sarza.nadoba.capacity }} l</small>
          <div class="progress"><span :style="{ width: `${Math.min(100, sarza.volume / sarza.nadoba.capacity * 100)}%` }" /></div>
        </div>
      </div>

      <div class="action-bar">
        <button v-if="sarza.status === StavSarze.AKTIVNA" class="primary-button" @click="openMeranie"><AppIcon name="plus" /> Meranie</button>
        <button v-if="sarza.status === StavSarze.AKTIVNA" class="secondary-button" @click="openZasah"><AppIcon name="plus" /> Zásah</button>

        <button v-if="sarza.status === StavSarze.AKTIVNA" class="ghost-button" @click="uzavriSarzu">Uzavrieť šaržu</button>
      </div>
      <p v-if="actionError" class="form-error">{{ actionError }}</p>

      <div class="detail-columns">
        <section class="panel">
          <div class="panel-heading">
            <div><p class="eyebrow gold">Kontrola hodnôt</p><h2>Posledné merania</h2></div>
            <button v-if="sarza.status === StavSarze.AKTIVNA" class="text-button" @click="openMeranie">+ Pridať</button>
          </div>
          <div v-for="option in moznostiMerani" :key="option.value" class="data-row">
            <div>
              <strong>{{ option.label }}</strong>
              <small>{{ sarza.posledneMerania[option.value]?.zmeraneAt ? new Date(sarza.posledneMerania[option.value]!.zmeraneAt).toLocaleString('sk-SK') : 'Zatiaľ bez merania' }}</small>
            </div>
            <b>{{ formatHodnotaMerania(sarza.posledneMerania[option.value]?.value) }} <small>{{ sarza.posledneMerania[option.value]?.unit || option.unit }}</small></b>
          </div>
        </section>

        <section class="panel">
          <div class="panel-heading">
            <div><p class="eyebrow gold">Auditná stopa</p><h2>História zásahov</h2></div>
            <button v-if="sarza.status === StavSarze.AKTIVNA" class="text-button" @click="openZasah">+ Pridať</button>
          </div>
          <div v-for="item in sarza.zasahy" :key="item.id" class="data-row">
            <div>
              <strong>{{ nazvyZasahov[item.type] }}</strong>
              <small>{{ new Date(item.vykonaneAt).toLocaleString('sk-SK') }}</small>
              <small v-if="item.notes">{{ item.notes }}</small>
            </div>
            <AppIcon :name="ikonyZasahov[item.type]" :size="18" />
          </div>
          <p v-if="sarza.zasahy.length === 0" class="muted">Zatiaľ bez zásahov.</p>
        </section>

        <section class="panel span-panel">
          <p class="eyebrow gold">Pôvod a pokračovanie</p>
          <h2>Lineage šarže</h2>
          <p v-if="sarza.rodicovskaSarzaId">
            Vznikla zo šarže
            <NuxtLink class="gold" :to="`/sarze/${sarza.rodicovskaSarzaId}`">{{ sarza.rodicovskaSarzaId }}</NuxtLink>.
          </p>
          <div v-for="child in sarza.children" :key="child.id" class="data-row">
            <div>
              <strong>{{ child.id }}</strong>
              <small>{{ child.nazovNadoby }} · {{ child.volume }} l · {{ nazvyFazSarze[child.faza] }}</small>
            </div>
            <NuxtLink :to="`/sarze/${child.id}`"><AppIcon name="arrow" /></NuxtLink>
          </div>
          <p v-if="!sarza.rodicovskaSarzaId && sarza.children.length === 0" class="muted">Prvá šarža bez následníkov.</p>
        </section>
      </div>

      <section class="danger-zone">
        <div class="admin-actions">
          <NuxtLink class="ghost-button" :to="`/sarze/${sarza.id}/edit`"><AppIcon name="edit" /> Upraviť základ</NuxtLink>
          <button class="danger-button" @click="showDanger = !showDanger">Nezvratné vymazanie</button>
        </div>
        <div v-if="showDanger" class="panel">
          <p>Vymazanie je možné iba bez meraní, zásahov, presunov a následníkov. Zadajte <b>FORCE DELETE</b>.</p>
          <div class="inline-form">
            <input v-model="forceConfirmation" aria-label="Potvrdenie force delete">
            <button class="danger-button" :disabled="saving || forceConfirmation !== 'FORCE DELETE'" @click="forceDelete">Natrvalo vymazať</button>
          </div>
        </div>
      </section>
    </template>

    <div v-if="showMeasure" class="modal-backdrop" @click.self="showMeasure = false">
      <form class="sheet" @submit.prevent="saveMeranie">
        <div class="sheet-handle" />
        <div class="sheet-heading">
          <div><p class="eyebrow gold">{{ sarza?.nadoba.name }} · {{ sarza?.nazovVina }}</p><h2>Pridať meranie</h2></div>
          <button type="button" class="icon-button subtle" aria-label="Zavrieť" @click="showMeasure = false"><AppIcon name="close" /></button>
        </div>
        <div class="form-grid">
          <div class="span-2 choice-grid" aria-label="Typ merania">
            <button
              v-for="option in moznostiMerani"
              :key="option.value"
              type="button"
              class="choice-card"
              :class="{ active: formularMerania.type === option.value }"
              @click="formularMerania.type = option.value"
            >
              <span class="choice-card-icon"><AppIcon :name="ikonyMerani[option.value]" :size="27" /></span>
              <span><strong>{{ option.label }}</strong><small>{{ option.unit }}</small></span>
            </button>
          </div>
          <label>Hodnota<input v-model.number="formularMerania.value" type="number" step="any" inputmode="decimal" required></label>
          <label>Čas<input v-model="formularMerania.zmeraneAt" type="datetime-local" required></label>
          <button class="primary-button span-2" :disabled="saving">{{ saving ? 'Ukladám…' : 'Uložiť meranie' }}</button>
        </div>
      </form>
    </div>

    <div v-if="showZasah" class="modal-backdrop" @click.self="showZasah = false">
      <section class="sheet action-sheet">
        <div class="sheet-handle" />
        <div class="sheet-heading">
          <div><p class="eyebrow gold">{{ sarza?.nadoba.name }} · {{ sarza?.nazovVina }}</p><h2>Pridať zásah</h2></div>
          <button type="button" class="icon-button subtle" aria-label="Zavrieť" @click="showZasah = false"><AppIcon name="close" /></button>
        </div>
        <div class="choice-grid" aria-label="Typ zásahu">
          <button
            v-for="option in moznostiZasahov"
            :key="option.value"
            type="button"
            class="choice-card"
            @click="openZasahForm(option.value)"
          >
            <span class="choice-card-icon"><AppIcon :name="ikonyZasahov[option.value]" :size="27" /></span>
            <span><strong>{{ option.label }}</strong></span>
          </button>
        </div>
      </section>
    </div>
  </section>
</template>
