<script setup lang="ts">
definePageMeta({ layout: false })
const auth = useAuth()
const email = ref('oskar@example.sk')
const password = ref('vino2026')
const errorMessage = ref('')
const saving = ref(false)
async function submit() {
  errorMessage.value = ''
  saving.value = true
  try { await auth.login(email.value, password.value); await navigateTo('/cellar') }
  catch (error) { errorMessage.value = apiErrorMessage(error, 'Prihlásenie sa nepodarilo.') }
  finally { saving.value = false }
}
</script>
<template>
  <main class="login-page"><div class="login-card"><div class="login-logo">V</div><p class="eyebrow gold">Vitajte vo svojej pivnici</p><h1>Vinársky<br><em>Pomocník</em></h1><p class="muted">Majte každú šaržu, meranie aj zásah bezpečne pod kontrolou.</p><form @submit.prevent="submit"><label>E-mail<input v-model="email" type="email" autocomplete="username" required></label><label>Heslo<input v-model="password" type="password" autocomplete="current-password" required></label><p v-if="errorMessage" class="form-error">{{ errorMessage }}</p><button class="primary-button" :disabled="saving">{{ saving ? 'Prihlasujem…' : 'Vstúpiť do pivnice' }}</button></form><div class="demo-note"><b>Demo účet</b><span>oskar@example.sk / vino2026</span></div><small>Session sa ukladá výhradne v bezpečnej HTTP-only cookie.</small></div></main>
</template>