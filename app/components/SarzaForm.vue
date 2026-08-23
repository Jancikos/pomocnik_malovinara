<script setup lang="ts">
import { FazaSarze, moznostiFazSarze, TypNadoby } from '~~/shared/domain'
import type { DetailSarzeDto, VinoDto } from '~~/shared/types/api'
import type { DetailSarzeFormBody, SarzaFormBody } from '~~/shared/types/sarza-form'
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

const form = reactive({
  vinoId: props.initialValue?.vinoId ?? props.initialVinoId ?? '',
  faza: props.initialValue?.faza ?? FazaSarze.MUST,
  openedAt: props.initialValue ? toDateTimeLocal(props.initialValue.openedAt) : new Date().toISOString().slice(0, 16),
})

const detail = reactive<DetailSarzeFormBody>({
  nadoba: {
    name: props.initialValue?.nadoba.name ?? initialAutoName,
    type: initialType,
    capacity: initialCapacity,
    location: props.initialValue?.nadoba.location ?? '',
  },
  volume: props.initialValue?.volume ?? 100,
})

function updateDetail(value: DetailSarzeFormBody) {
  detail.nadoba = { ...value.nadoba }
  detail.volume = value.volume
}

function submit() {
  emit('save', {
    ...form,
    nadoba: { ...detail.nadoba },
    volume: detail.volume,
  })
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

    <SarzaDetailFields :model-value="detail" @update:model-value="updateDetail" />

    <label>
      Založená
      <input v-model="form.openedAt" type="datetime-local" required>
    </label>
    <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
    <button class="primary-button span-2" :disabled="saving"><AppIcon name="check" /> {{ saving ? 'Ukladám…' : submitLabel }}</button>
  </form>
</template>