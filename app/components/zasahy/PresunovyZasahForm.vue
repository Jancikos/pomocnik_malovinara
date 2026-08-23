<script setup lang="ts">
import { FazaSarze, TypNadoby, TypZasahu, moznostiFazSarze, nazvyFazSarze, nazvyZasahov } from '~~/shared/domain'
import type { DetailSarzeDto } from '~~/shared/types/api'
import type { DetailSarzeFormBody } from '~~/shared/types/sarza-form'
import { navrhniNazovNadoby } from '~~/shared/utils/nazov-nadoby'

const props = defineProps<{
  sarza: DetailSarzeDto
  typZasahu: Exclude<TypZasahu, TypZasahu.SIRENIE>
  icon: string
}>()

const auth = useAuth()
const saving = ref(false)
const errorMessage = ref('')

const pevnaCielovaFaza = computed(() => {
  if (props.typZasahu === TypZasahu.ODKALENIE) return FazaSarze.ODKALENIE
  if (props.typZasahu === TypZasahu.KVASENIE) return FazaSarze.KVASENIE
  return null
})
const moznostiCielovejFazy = computed(() => moznostiFazSarze.filter((option) => option.value !== props.sarza.faza))

const form = reactive({
  vykonaneAt: new Date().toISOString().slice(0, 16),
  notes: '',
  lossVolume: 0,
  cielovaFaza: pevnaCielovaFaza.value ?? moznostiCielovejFazy.value[0]?.value ?? FazaSarze.ZRENIE,
  ciele: [] as DetailSarzeFormBody[],
})

const moved = computed(() => form.ciele.reduce((sum, item) => sum + Number(item.volume || 0), 0))
const remaining = computed(() => props.sarza.volume - moved.value - Number(form.lossVolume || 0))

watch(pevnaCielovaFaza, (phase) => {
  if (phase) form.cielovaFaza = phase
}, { immediate: true })

watch(() => props.sarza.id, () => {
  form.ciele = [novyCiel(props.sarza.volume, props.sarza.nadoba.type, props.sarza.nadoba.capacity)]
}, { immediate: true })

function novyCiel(volume = props.sarza.volume, type: TypNadoby = props.sarza.nadoba.type, capacity = props.sarza.nadoba.capacity || Math.max(volume, 100)): DetailSarzeFormBody {
  return {
    nadoba: {
      name: navrhniNazovNadoby(type, capacity),
      type,
      capacity,
      location: auth.current.value?.preferences.defaultContainerLocation || props.sarza.nadoba.location || '',
    },
    volume,
  }
}

function addCiel() {
  form.ciele.push(novyCiel(Math.max(remaining.value, 0) || props.sarza.volume))
}

function removeCiel(index: number) {
  if (form.ciele.length > 1) form.ciele.splice(index, 1)
}

function updateCiel(index: number, value: DetailSarzeFormBody) {
  form.ciele[index] = value
}

async function save() {
  saving.value = true
  errorMessage.value = ''
  try {
    const result = await $fetch<{ vytvoreneSarzeIds: string[] }>('/api/presuny', {
      method: 'POST',
      body: {
        type: props.typZasahu,
        zdrojovaSarzaId: props.sarza.id,
        cielovaFaza: form.cielovaFaza,
        lossVolume: form.lossVolume,
        vykonaneAt: form.vykonaneAt,
        notes: form.notes,
        ciele: form.ciele,
      },
    })
    await refreshNuxtData(['sarza-' + props.sarza.id, 'sarze-all', 'sarze-AKTIVNA'])
    await navigateTo('/sarze/' + (result.vytvoreneSarzeIds[0] ?? props.sarza.id))
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Zásah sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="panel form-grid elevated-form" @submit.prevent="save">
    <div class="span-2 action-form-heading">
      <span class="choice-card-icon"><AppIcon :name="icon" :size="28" /></span>
      <div>
        <p class="eyebrow gold">{{ sarza.id }}</p>
        <h2>{{ nazvyZasahov[typZasahu] }}</h2>
      </div>
    </div>

    <label v-if="typZasahu === TypZasahu.STACANIE">
      Cieľová fáza
      <select v-model="form.cielovaFaza" required>
        <option v-for="option in moznostiCielovejFazy" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </label>
    <div v-else class="span-2 locked-field">
      <span>Cieľová fáza</span>
      <strong>{{ nazvyFazSarze[form.cielovaFaza] }}</strong>
    </div>
    <label>
      Strata (l)
      <input v-model.number="form.lossVolume" type="number" min="0" step="0.1" inputmode="decimal" required>
    </label>
    <label>
      Čas
      <input v-model="form.vykonaneAt" type="datetime-local" required>
    </label>
    <label class="span-2">
      Poznámka
      <textarea v-model="form.notes" rows="3" placeholder="Čo bolo vykonané?" />
    </label>

    <h2 class="span-2 form-section-title">Nové šarže</h2>
    <fieldset v-for="(ciel, index) in form.ciele" :key="index" class="ciel-card span-2">
      <div class="ciel-heading">
        <strong>Nová šarža {{ index + 1 }}</strong>
        <button v-if="form.ciele.length > 1" type="button" class="text-button danger-text" @click="removeCiel(index)">Odstrániť</button>
      </div>
      <div class="form-grid target-fields">
        <SarzaDetailFields :model-value="ciel" :title="'Detail novej šarže ' + (index + 1)" @update:model-value="(value) => updateCiel(index, value)" />
      </div>
    </fieldset>
    <button type="button" class="secondary-button span-2" @click="addCiel">+ Ďalšia nová šarža</button>
    <div class="presun-summary span-2">
      <span>Presúvané <b>{{ moved.toLocaleString('sk-SK') }} l</b></span>
      <span>Strata <b>{{ Number(form.lossVolume || 0).toLocaleString('sk-SK') }} l</b></span>
      <span :class="{ invalid: Math.abs(remaining) > 0.001 }">Zostáva <b>{{ remaining.toLocaleString('sk-SK', { maximumFractionDigits: 1 }) }} l</b></span>
    </div>

    <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
    <button class="primary-button span-2" :disabled="saving || Math.abs(remaining) > 0.001">
      <AppIcon name="check" /> {{ saving ? 'Ukladám…' : 'Uložiť zásah' }}
    </button>
  </form>
</template>