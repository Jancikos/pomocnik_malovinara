<script setup lang="ts">
const props = defineProps<{ label: string; defaultValue: number; disabled?: boolean }>()
const model = defineModel<number | string>({ required: true })
const isPreset = (value: number | string) => value === props.defaultValue || value === 1.25
const choice = ref(isPreset(model.value) ? String(model.value) : 'custom')
const customValue = ref<number | string>(isPreset(model.value) ? '' : model.value)
const format = (value: number) => value.toLocaleString('sk-SK', { minimumFractionDigits: 2 })

function selectValue() {
  model.value = choice.value === 'custom' ? customValue.value : Number(choice.value)
}
function enterCustomValue(event: Event) {
  customValue.value = (event.target as HTMLInputElement).value
  model.value = customValue.value
}
</script>

<template>
  <div class="form-grid coefficient-field">
    <label class="span-2">
      {{ label }}
      <select v-model="choice" :disabled="disabled" @change="selectValue">
        <option :value="String(defaultValue)">{{ format(defaultValue) }} (predvolené)</option>
        <option value="1.25">1,25</option>
        <option value="custom">Vlastné</option>
      </select>
    </label>
    <label v-if="choice === 'custom'" class="span-2">
      Vlastná hodnota — {{ label.toLocaleLowerCase('sk-SK') }}
      <input :value="customValue" type="text" inputmode="decimal" pattern="[0-9]+([.,][0-9]+)?" required :disabled="disabled" placeholder="Napr. 1,15" @input="enterCustomValue">
      <span class="form-hint">Zadajte kladné číslo. Môžete použiť čiarku aj bodku.</span>
    </label>
  </div>
</template>

<style scoped>
.coefficient-field {
  align-self: start;
  min-width: 0;
}
</style>
