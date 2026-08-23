<script setup lang="ts">
import {
  FazaSarze,
  StavSarze,
  TypZasahu,
  TypMerania,
  TypNadoby,
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
const showPresun = ref(false)
const showDanger = ref(false)

const formularMerania = reactive({
  type: TypMerania.TEPLOTA,
  value: undefined as number | undefined,
  zmeraneAt: new Date().toISOString().slice(0, 16),
})

const formularZasahu = reactive({
  type: TypZasahu.KVASENIE,
  vykonaneAt: new Date().toISOString().slice(0, 16),
  notes: '',
})

function emptyCiel() {
  return {
    nadoba: {
      name: '',
      type: TypNadoby.NEREZOVY_TANK,
      capacity: 100,
      location: '',
    },
    volume: 0,
  }
}

const formularPresunu = reactive({
  lossVolume: 0,
  vykonaneAt: new Date().toISOString().slice(0, 16),
  notes: '',
  ciele: [emptyCiel()],
})
const forceConfirmation = ref('')

const cielovaFaza = computed(() => {
  if (sarza.value?.faza === FazaSarze.MUST) return FazaSarze.ODKALENIE
  if (sarza.value?.faza === FazaSarze.ODKALENIE) return FazaSarze.KVASENIE
  if (sarza.value?.faza === FazaSarze.KVASENIE) return FazaSarze.ZRENIE
  return null
})
const typPresunu = computed(() => sarza.value?.faza === FazaSarze.MUST ? TypZasahu.ODKALENIE : TypZasahu.STACANIE)
const moved = computed(() => formularPresunu.ciele.reduce((sum, item) => sum + Number(item.volume || 0), 0))
const remaining = computed(() => (sarza.value?.volume ?? 0) - moved.value - Number(formularPresunu.lossVolume || 0))

function openMeranie() {
  showMeasure.value = true
}

function openZasah() {
  showZasah.value = true
}

function addCiel() {
  formularPresunu.ciele.push(emptyCiel())
}

function removeCiel(index: number) {
  if (formularPresunu.ciele.length > 1) formularPresunu.ciele.splice(index, 1)
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

async function saveZasah() {
  saving.value = true
  actionError.value = ''
  try {
    await $fetch(`/api/sarze/${id.value}/zasahy`, { method: 'POST', body: formularZasahu })
    await refresh()
    showZasah.value = false
    formularZasahu.notes = ''
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Zásah sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}

async function savePresun() {
  if (!cielovaFaza.value) return
  saving.value = true
  actionError.value = ''
  try {
    const result = await $fetch<{ vytvoreneSarzeIds: string[] }>('/api/presuny', {
      method: 'POST',
      body: { zdrojovaSarzaId: id.value, cielovaFaza: cielovaFaza.value, ...formularPresunu },
    })
    await navigateTo(`/sarze/${result.vytvoreneSarzeIds[0]}`)
  }
  catch (e) {
    actionError.value = apiErrorMessage(e, 'Presun sa nepodarilo dokončiť.')
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
        <button v-if="sarza.status === StavSarze.AKTIVNA && cielovaFaza" class="secondary-button" @click="showPresun = true">
          <AppIcon name="sarze" /> {{ nazvyZasahov[typPresunu] }} a presun
        </button>
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
            <b>{{ sarza.posledneMerania[option.value]?.value ?? '—' }} <small>{{ sarza.posledneMerania[option.value]?.unit || option.unit }}</small></b>
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
            <AppIcon name="zasah" :size="18" />
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
          <button class="danger-button" @click="showDanger = !showDanger">Administratívne FORCE delete</button>
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
              <span class="choice-card-icon meranie"><AppIcon name="meranie" :size="25" /></span>
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
      <form class="sheet" @submit.prevent="saveZasah">
        <div class="sheet-handle" />
        <div class="sheet-heading">
          <div><p class="eyebrow gold">{{ sarza?.nadoba.name }} · {{ sarza?.nazovVina }}</p><h2>Pridať zásah</h2></div>
          <button type="button" class="icon-button subtle" aria-label="Zavrieť" @click="showZasah = false"><AppIcon name="close" /></button>
        </div>
        <div class="form-grid">
          <div class="span-2 choice-grid" aria-label="Typ zásahu">
            <button
              v-for="option in moznostiZasahov"
              :key="option.value"
              type="button"
              class="choice-card"
              :class="{ active: formularZasahu.type === option.value }"
              @click="formularZasahu.type = option.value"
            >
              <span class="choice-card-icon zasah"><AppIcon name="zasah" :size="25" /></span>
              <span><strong>{{ option.label }}</strong></span>
            </button>
          </div>
          <label class="span-2">Čas<input v-model="formularZasahu.vykonaneAt" type="datetime-local" required></label>
          <label class="span-2">Poznámka<textarea v-model="formularZasahu.notes" rows="3" placeholder="Čo bolo vykonané?"></textarea></label>
          <p class="form-hint span-2">Zásah sa uloží ako záznam bez automatickej zmeny fázy alebo objemu.</p>
          <button class="primary-button span-2" :disabled="saving">{{ saving ? 'Ukladám…' : 'Uložiť zásah' }}</button>
        </div>
      </form>
    </div>

    <div v-if="showPresun && cielovaFaza" class="modal-backdrop" @click.self="showPresun = false">
      <form class="sheet presun-sheet" @submit.prevent="savePresun">
        <div class="sheet-handle" />
        <div class="sheet-heading">
          <div><p class="eyebrow gold">{{ nazvyZasahov[typPresunu] }}</p><h2>Presun do {{ nazvyFazSarze[cielovaFaza] }}</h2></div>
          <button type="button" class="icon-button subtle" aria-label="Zavrieť" @click="showPresun = false"><AppIcon name="close" /></button>
        </div>

        <fieldset v-for="(ciel, index) in formularPresunu.ciele" :key="index" class="ciel-card">
          <div class="ciel-heading">
            <strong>Cieľová nádoba {{ index + 1 }}</strong>
            <button v-if="formularPresunu.ciele.length > 1" type="button" class="text-button danger-text" @click="removeCiel(index)">Odstrániť</button>
          </div>
          <div class="ciel-fields">
            <label class="span-2">Názov<input v-model="ciel.nadoba.name" required placeholder="Tank T2"></label>
            <label>Typ<select v-model="ciel.nadoba.type" required><option v-for="type in TypNadoby" :key="type" :value="type">{{ nazvyTypovNadob[type] }}</option></select></label>
            <label>Kapacita (l)<input v-model.number="ciel.nadoba.capacity" type="number" min="0.1" step="0.1" inputmode="decimal" required></label>
            <label>Objem šarže (l)<input v-model.number="ciel.volume" type="number" min="0.1" step="0.1" inputmode="decimal" required></label>
            <label>Umiestnenie<input v-model="ciel.nadoba.location"></label>
          </div>
        </fieldset>

        <button type="button" class="secondary-button" @click="addCiel">+ Ďalšia cieľová nádoba</button>
        <div class="form-grid presun-meta">
          <label>Strata (l)<input v-model.number="formularPresunu.lossVolume" type="number" min="0" step="0.1" inputmode="decimal" required></label>
          <label>Čas<input v-model="formularPresunu.vykonaneAt" type="datetime-local" required></label>
          <label class="span-2">Poznámka<textarea v-model="formularPresunu.notes" rows="2" /></label>
        </div>
        <div class="presun-summary">
          <span>Presúvané <b>{{ moved }} l</b></span>
          <span>Strata <b>{{ formularPresunu.lossVolume }} l</b></span>
          <span :class="{ invalid: Math.abs(remaining) > 0.001 }">Zostáva <b>{{ remaining.toFixed(1) }} l</b></span>
        </div>
        <button class="primary-button full" :disabled="saving || Math.abs(remaining) > 0.001">{{ saving ? 'Presúvam…' : 'Dokončiť atomický presun' }}</button>
      </form>
    </div>
  </section>
</template>
