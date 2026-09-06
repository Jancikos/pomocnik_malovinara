<script setup lang="ts">
const auth = useAuth()
const switching = ref(false)
const errorMessage = ref('')
async function change(event: Event) {
  switching.value = true
  errorMessage.value = ''
  try { await auth.select((event.target as HTMLSelectElement).value) }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Pivnicu sa nepodarilo prepnúť.')
    ;(event.target as HTMLSelectElement).value = auth.current.value?.pivnica.id ?? ''
  }
  finally { switching.value = false }
}
</script>
<template>
  <div class="cellar-selector">
    <img v-if="auth.current.value?.pivnica.logo" :src="auth.current.value.pivnica.logo" class="cellar-logo" alt="Logo pivnice">
    <label>
      <select :value="auth.current.value?.pivnica.id" :disabled="switching" aria-label="Vybrať pivnicu" @change="change">
        <option v-for="cellar in auth.current.value?.pivnice" :key="cellar.id" :value="cellar.id">{{ cellar.name }}</option>
      </select>
    </label>
    <small v-if="!auth.canEdit.value">Iba na čítanie</small>
    <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
  </div>
</template>
