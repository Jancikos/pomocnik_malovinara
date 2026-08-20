<script setup lang="ts">
import { FazaSarze, TypNadoby, moznostiFazSarze, nazvyTypovNadob } from '~~/shared/domain'
import type { DetailSarzeDto, VinoDto } from '~~/shared/types/api'
import type { SarzaFormBody } from '~~/shared/types/sarza-form'
import { navrhniNazovNadoby } from '~~/shared/utils/nazov-nadoby'

const props = defineProps<{
  vina?: VinoDto[] | null
  initialValue?: DetailSarzeDto
  initialVinoId?: string
  submitLabel: string
  saving?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  save: [body: SarzaFormBody]
}>()

function toDateTimeLocal(value: string) {
  return new Date(value).toISOString().slice(0, 16)
}

const initialType = props.initialValue?.nadoba.type ?? TypNadoby.NEREZOVY_TANK
const initialCapacity = props.initialValue?.nadoba.capacity ?? 100
const initialAutoName = navrhniNazovNadoby(initialType, initialCapacity)

const form = reactive<SarzaFormBody>({
  vinoId: props.initialValue?.vinoId ?? props.initialVinoId ?? '',
  faza: props.initialValue?.faza ?? FazaSarze.MUST,
  nadoba: {
    name: props.initialValue?.nadoba.name ?? initialAutoName,
    type: initialType,
    capacity: initialCapacity,
    location: props.initialValue?.nadoba.location ?? '',
  },
  volume: props.initialValue?.volume ?? 100,
  openedAt: props.initialValue ? toDateTimeLocal(props.initialValue.openedAt) : new Date().toISOString().slice(0, 16),
})

const poslednyAutomatickyNazovNadoby = ref(!props.initialValue || props.initialValue.nadoba.name === initialAutoName ? initialAutoName : '')

watch(() => [form.nadoba.type, form.nadoba.capacity] as const, ([type, capacity]) => {
  const novyNazov = navrhniNazovNadoby(type, Number(capacity || 0))
  if (!form.nadoba.name || form.nadoba.name === poslednyAutomatickyNazovNadoby.value) {
    form.nadoba.name = novyNazov
  }
  poslednyAutomatickyNazovNadoby.value = novyNazov
})

function submit() {
  emit('save', form)
}
</script>

<template>
  <form class="panel form-grid elevated-form" @submit.prevent="submit">
    <label>
      Víno
      <select v-model="form.vinoId" required>
        <option value="" disabled>Vyberte víno</option>
        <option v-for="vino in vina ?? []" :key="vino.id" :value="vino.id">{{ vino.name }} · {{ vino.rocnik }}</option>
      </select>
    </label>
    <label>
      Fáza šarže
      <select v-model="form.faza" required>
        <option v-for="option in moznostiFazSarze" :key="option.value" :value="option.value">{{ option.label }}</option>
      </select>
    </label>

    <h2 class="span-2 form-section-title">Nádoba šarže</h2>
    <label>
      Typ nádoby
      <select v-model="form.nadoba.type" required>
        <option v-for="type in TypNadoby" :key="type" :value="type">{{ nazvyTypovNadob[type] }}</option>
      </select>
    </label>
    <label>Kapacita (l)<input v-model.number="form.nadoba.capacity" type="number" min="0.1" step="0.1" inputmode="decimal" required></label>
    <label class="span-2">Názov nádoby<input v-model="form.nadoba.name" required placeholder="Tank 100L"></label>
    <label class="span-2">Umiestnenie (voliteľné)<input v-model="form.nadoba.location" placeholder="Hlavná miestnosť"></label>

    <h2 class="span-2 form-section-title">Obsah šarže</h2>
    <label>Objem (l)<input v-model.number="form.volume" type="number" min="0.1" step="0.1" inputmode="decimal" required></label>
    <label>Otvorená<input v-model="form.openedAt" type="datetime-local" required></label>
    <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
    <button class="primary-button span-2" :disabled="saving"><AppIcon name="check" /> {{ saving ? 'Ukladám…' : submitLabel }}</button>
  </form>
</template>