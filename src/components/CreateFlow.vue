<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { CatalogOptionProvider, catalogService } from '@/services/catalog'
import ContainerVisual from '@/components/ContainerVisual.vue'
import IconGlyph from '@/components/IconGlyph.vue'

const props = withDefaults(
  defineProps<{ open: boolean; initialMode?: 'choose' | 'wine' | 'batch'; wineId?: string }>(),
  { initialMode: 'choose', wineId: '' },
)
const emit = defineEmits<{ close: []; created: [] }>()
const store = useAppStore()
const mode = ref<'choose' | 'wine' | 'batch'>('choose')
const saving = ref(false)
const formError = ref('')
const containerOptions = new CatalogOptionProvider(catalogService, 'container-types').options()
const phaseOptions = new CatalogOptionProvider(catalogService, 'batch-phases').options()

const wineForm = ref({
  name: '',
  vintageYear: new Date().getFullYear(),
  color: 'white' as 'white' | 'rose' | 'red' | 'other',
  notes: '',
})
const batchForm = ref({
  wineId: '',
  name: '',
  containerLabel: '',
  containerType: containerOptions[0]?.value ?? '',
  capacity: 100,
  volume: 90,
  phase: phaseOptions[0]?.value ?? '',
  location: '',
  notes: '',
})

const title = computed(() => {
  if (mode.value === 'wine') return 'Pridať nové víno'
  if (mode.value === 'batch') return 'Pridať šaržu'
  return 'Čo chcete vytvoriť?'
})

watch(
  () => props.open,
  (open) => {
    if (open) {
      mode.value = props.initialMode
      formError.value = ''
      batchForm.value.wineId = props.wineId || batchForm.value.wineId || store.wines[0]?.id || ''
    }
  },
)

function close() {
  if (!saving.value) emit('close')
}

async function saveWine() {
  formError.value = ''
  saving.value = true
  try {
    await store.addWine(wineForm.value)
    emit('created')
    close()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Víno sa nepodarilo uložiť.'
  } finally {
    saving.value = false
  }
}

async function saveBatch() {
  formError.value = ''
  saving.value = true
  try {
    await store.addBatch({
      wineId: batchForm.value.wineId,
      name: batchForm.value.name,
      container: {
        label: batchForm.value.containerLabel,
        type: batchForm.value.containerType,
        capacityLiters: batchForm.value.capacity,
        location: batchForm.value.location || undefined,
        imageKey:
          catalogService.get('container-types', batchForm.value.containerType)?.imageKey ?? 'tank',
      },
      volume: batchForm.value.volume,
      phase: batchForm.value.phase,
      notes: batchForm.value.notes,
    })
    emit('created')
    close()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Šaržu sa nepodarilo uložiť.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-if="open" class="sheet-backdrop" @click.self="close">
    <section
      class="sheet form-sheet create-flow"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-flow-title"
    >
      <div class="sheet-handle"></div>
      <div class="sheet-heading">
        <div>
          <p class="eyebrow gold">Nová evidencia</p>
          <h2 id="create-flow-title">{{ title }}</h2>
        </div>
        <button class="icon-button" aria-label="Zavrieť" @click="close">
          <IconGlyph name="close" />
        </button>
      </div>

      <div v-if="mode === 'choose'" class="create-choice">
        <button @click="mode = 'wine'">
          <span class="choice-icon wine-bg"><IconGlyph name="wine" /></span>
          <div>
            <strong>Nové víno</strong><small>Založiť nový ročník a jeho základné údaje</small>
          </div>
          <IconGlyph name="arrow-right" />
        </button>
        <button @click="mode = 'batch'">
          <span class="choice-icon gold-bg"><IconGlyph name="batch" /></span>
          <div>
            <strong>Nová šarža</strong><small>Priradiť ju k jednému z existujúcich vín</small>
          </div>
          <IconGlyph name="arrow-right" />
        </button>
        <p class="choice-help">
          Nádoba sa vždy eviduje priamo v šarži, nie ako samostatná položka.
        </p>
      </div>

      <form v-else-if="mode === 'wine'" class="form-grid" @submit.prevent="saveWine">
        <button class="mini-back span-2" type="button" @click="mode = 'choose'">
          <IconGlyph name="arrow-left" /> Späť na výber
        </button>
        <label class="span-2"
          >Názov vína<input v-model="wineForm.name" required placeholder="Napr. Rulandské biele"
        /></label>
        <label
          >Ročník<input
            v-model.number="wineForm.vintageYear"
            type="number"
            min="1900"
            max="2100"
            required
        /></label>
        <label
          >Farba<select v-model="wineForm.color">
            <option value="white">Biele</option>
            <option value="rose">Ružové</option>
            <option value="red">Červené</option>
            <option value="other">Iné</option>
          </select></label
        >
        <label class="span-2"
          >Poznámka<textarea
            v-model="wineForm.notes"
            rows="4"
            placeholder="Charakter vína, pôvod alebo zámer…"
          ></textarea>
        </label>
        <div class="form-info span-2">
          <IconGlyph name="info" /><span
            >Po uložení môžete k vínu pridať jednu alebo viac šarží.</span
          >
        </div>
        <p v-if="formError" class="form-error span-2" role="alert">{{ formError }}</p>
        <button class="primary-button full span-2" :disabled="saving">
          {{ saving ? 'Ukladám…' : 'Vytvoriť víno' }}
        </button>
      </form>

      <form v-else class="form-grid" @submit.prevent="saveBatch">
        <button class="mini-back span-2" type="button" @click="mode = 'choose'">
          <IconGlyph name="arrow-left" /> Späť na výber
        </button>
        <label class="span-2"
          >Priradiť k vínu<select v-model="batchForm.wineId" required>
            <option value="" disabled>Vyberte víno</option>
            <option v-for="wine in store.wines" :key="wine.id" :value="wine.id">
              {{ wine.name }} · {{ wine.vintageYear }}
            </option>
          </select></label
        >
        <label class="span-2"
          >Názov šarže<input
            v-model="batchForm.name"
            required
            placeholder="Napr. Výber z južného svahu"
        /></label>
        <div class="form-section-title span-2">
          <span>Umiestnenie šarže</span><small>Nádoba sa uloží priamo do šarže</small>
        </div>
        <label
          >Označenie nádoby<input
            v-model="batchForm.containerLabel"
            required
            placeholder="Napr. Tank D1"
        /></label>
        <label
          >Typ nádoby<select v-model="batchForm.containerType">
            <option v-for="option in containerOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select></label
        >
        <div class="container-preview span-2">
          <ContainerVisual
            :image-key="
              catalogService.get('container-types', batchForm.containerType)?.imageKey ?? 'tank'
            "
            compact
          /><span>{{ catalogService.label('container-types', batchForm.containerType) }}</span>
        </div>
        <label
          >Kapacita (l)<input
            v-model.number="batchForm.capacity"
            type="number"
            inputmode="decimal"
            min="0.1"
            step="0.1"
            required
        /></label>
        <label
          >Aktuálny objem (l)<input
            v-model.number="batchForm.volume"
            type="number"
            inputmode="decimal"
            min="0"
            step="0.1"
            required
        /></label>
        <label
          >Fáza<select v-model="batchForm.phase">
            <option v-for="option in phaseOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select></label
        >
        <label>Umiestnenie<input v-model="batchForm.location" placeholder="Voliteľné" /></label>
        <label class="span-2"
          >Poznámka<textarea v-model="batchForm.notes" rows="3"></textarea>
        </label>
        <p v-if="formError" class="form-error span-2" role="alert">{{ formError }}</p>
        <button class="primary-button full span-2" :disabled="saving">
          {{ saving ? 'Ukladám…' : 'Vytvoriť šaržu' }}
        </button>
      </form>
    </section>
  </div>
</template>
