<script setup lang="ts">
import { FarbaVina, nazvyFariebVina } from '~~/shared/domain'
import type { VinoDto } from '~~/shared/types/api'
import type { VinoFormBody, VinoFormMaterial } from '~~/shared/types/vino-form'
import { navrhniKodVina } from '~~/shared/utils/kod-vina'


const props = defineProps<{
  initialValue?: VinoDto
  submitLabel: string
  saving?: boolean
  errorMessage?: string
}>()

const emit = defineEmits<{
  save: [body: VinoFormBody]
}>()

function emptyMaterial(percentage = 0): VinoFormMaterial {
  return {
    odrodaHrozna: '',
    percentage,
    weightKg: undefined,
    volumeLiters: undefined,
    cukornatostPriZbere: undefined,
  }
}

function materialFromInitial(material: NonNullable<VinoDto['vstupneSuroviny']>[number]): VinoFormMaterial {
  return {
    odrodaHrozna: material.odrodaHrozna,
    percentage: material.percentage,
    weightKg: material.weightKg ?? undefined,
    volumeLiters: material.volumeLiters ?? undefined,
    cukornatostPriZbere: material.cukornatostPriZbere ?? undefined,
  }
}

const initialMaterials = props.initialValue
  ? props.initialValue.vstupneSuroviny?.map(materialFromInitial) ?? []
  : [emptyMaterial(100)]

const form = reactive<VinoFormBody>({
  name: props.initialValue?.name ?? '',
  code: props.initialValue?.code ?? '',
  rocnik: props.initialValue?.rocnik ?? new Date().getFullYear(),
  color: props.initialValue?.color ?? FarbaVina.BIELE,
  notes: props.initialValue?.notes ?? '',
  vstupneSuroviny: initialMaterials,
})

const povodnyAutomatickyKod = navrhniKodVina(form.name)
const poslednyAutomatickyKod = ref(form.code === povodnyAutomatickyKod ? povodnyAutomatickyKod : '')
const poslednyAutomatickyNazovMaterialu = ref(form.vstupneSuroviny[0]?.odrodaHrozna === form.name ? form.name : '')

function syncFirstMaterialName(name: string) {
  const firstMaterial = form.vstupneSuroviny[0]
  if (!firstMaterial) return

  if (!firstMaterial.odrodaHrozna || firstMaterial.odrodaHrozna === poslednyAutomatickyNazovMaterialu.value) {
    firstMaterial.odrodaHrozna = name
  }
  poslednyAutomatickyNazovMaterialu.value = name
}

watch(() => form.name, (name) => {
  const novyKod = navrhniKodVina(name)
  if (!form.code || form.code === poslednyAutomatickyKod.value) form.code = novyKod
  poslednyAutomatickyKod.value = novyKod
  syncFirstMaterialName(name)
})

function addMaterial() {
  form.vstupneSuroviny.push(emptyMaterial())
  syncFirstMaterialName(form.name)
}

function removeMaterial(index: number) {
  form.vstupneSuroviny.splice(index, 1)
  syncFirstMaterialName(form.name)
}

function submit() {
  emit('save', form)
}
</script>

<template>
  <form class="panel form-grid elevated-form" @submit.prevent="submit">
    <label class="span-2">Názov<input v-model="form.name" required></label>
    <label>Kód (použije sa ako prefix pre ID šarže)<input v-model="form.code" maxlength="8" required placeholder="IO"></label>
    <label>Ročník<input v-model.number="form.rocnik" type="number" min="1900" max="2100" required></label>
    <label class="span-2">Farba<select v-model="form.color"><option v-for="color in FarbaVina" :key="color" :value="color">{{ nazvyFariebVina[color] }}</option></select></label>
    <label class="span-2">Poznámka<textarea v-model="form.notes" rows="3" /></label>

    <div class="span-2 section-title"><h2 class="form-section-title">Zdrojový materiál</h2><button type="button" class="ghost-button" @click="addMaterial">+ Odroda</button></div>
    <div v-for="(material, index) in form.vstupneSuroviny" :key="index" class="material-row span-2">
      <div class="material-heading span-2">
        <strong>Materiál {{ index + 1 }}</strong>
        <button type="button" class="text-button danger-text" @click="removeMaterial(index)">Odstrániť</button>
      </div>
      <label>Odroda<input v-model="material.odrodaHrozna" required></label>
      <label>Podiel %<input v-model.number="material.percentage" type="number" min="0.01" max="100" step="0.01" inputmode="decimal" required></label>
      <label>Hmotnosť kg<input v-model.number="material.weightKg" type="number" min="0" step="0.1" inputmode="decimal"></label>
      <label>Objem l<input v-model.number="material.volumeLiters" type="number" min="0" step="0.1" inputmode="decimal"></label>
      <label><span>Cukornatosť pri zbere <strong>°NM</strong></span><input v-model.number="material.cukornatostPriZbere" type="number" min="0" step="0.1" inputmode="decimal"></label>
    </div>
    <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
    <button class="primary-button span-2" :disabled="saving"><AppIcon name="check" /> {{ saving ? 'Ukladám…' : submitLabel }}</button>
  </form>
</template>