<script setup lang="ts">
import { TypNadoby, nazvyTypovNadob } from '~~/shared/domain'
import type { DetailSarzeFormBody } from '~~/shared/types/sarza-form'
import { navrhniNazovNadoby } from '~~/shared/utils/nazov-nadoby'

const props = withDefaults(defineProps<{
  modelValue: DetailSarzeFormBody
  title?: string
  volumeLabel?: string
}>(), {
  title: 'Nádoba šarže',
  volumeLabel: 'Objem šarže (l)',
})

const emit = defineEmits<{
  'update:modelValue': [value: DetailSarzeFormBody]
}>()

function update(value: DetailSarzeFormBody) {
  emit('update:modelValue', value)
}

function updateNadoba(next: Partial<DetailSarzeFormBody['nadoba']>) {
  update({
    ...props.modelValue,
    nadoba: {
      ...props.modelValue.nadoba,
      ...next,
    },
  })
}

function updateVolume(volume: number) {
  update({ ...props.modelValue, volume })
}

function inputValue(event: Event) {
  return (event.target as HTMLInputElement).value
}

function inputNumber(event: Event) {
  return Number(inputValue(event))
}

function updateTypNadoby(event: Event) {
  updateNadoba({ type: inputValue(event) as TypNadoby })
}

function updateCapacity(event: Event) {
  updateNadoba({ capacity: inputNumber(event) })
}

function updateName(event: Event) {
  updateNadoba({ name: inputValue(event) })
}

function updateLocation(event: Event) {
  updateNadoba({ location: inputValue(event) })
}

function updateVolumeFromInput(event: Event) {
  updateVolume(inputNumber(event))
}

const poslednyAutomatickyNazovNadoby = ref(
  props.modelValue.nadoba.name
    ? navrhniNazovNadoby(props.modelValue.nadoba.type, Number(props.modelValue.nadoba.capacity || 0))
    : '',
)

watch([
  () => props.modelValue.nadoba.type,
  () => props.modelValue.nadoba.capacity,
], ([type, capacity]) => {
  const novyNazov = navrhniNazovNadoby(type, Number(capacity || 0))
  if (
    props.modelValue.nadoba.name !== novyNazov
    && (!props.modelValue.nadoba.name || props.modelValue.nadoba.name === poslednyAutomatickyNazovNadoby.value)
  ) {
    updateNadoba({ name: novyNazov })
  }
  poslednyAutomatickyNazovNadoby.value = novyNazov
})
</script>

<template>
  <h2 class="span-2 form-section-title">{{ title }}</h2>
  <label>
    Typ nádoby
    <select :value="modelValue.nadoba.type" required @change="updateTypNadoby">
      <option v-for="type in TypNadoby" :key="type" :value="type">{{ nazvyTypovNadob[type] }}</option>
    </select>
  </label>
  <label>
    Kapacita (l)
    <input :value="modelValue.nadoba.capacity" type="number" min="0.1" step="0.1" inputmode="decimal" required @input="updateCapacity">
  </label>
  <label class="span-2">
    Názov nádoby
    <input :value="modelValue.nadoba.name" required placeholder="Tank 100L" @input="updateName">
  </label>
  <label class="span-2">
    Umiestnenie (voliteľné)
    <input :value="modelValue.nadoba.location" placeholder="Hlavná miestnosť" @input="updateLocation">
  </label>

  <h2 class="span-2 form-section-title">Obsah šarže</h2>
  <label>
    {{ volumeLabel }}
    <input :value="modelValue.volume" type="number" min="0.1" step="0.1" inputmode="decimal" required @input="updateVolumeFromInput">
  </label>
</template>
