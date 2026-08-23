<script setup lang="ts">
definePageMeta({ layout: false })

interface RegistrationResult {
  email: string
  emailSent: boolean
  message: string
  developmentVerificationUrl?: string
}

const form = reactive({ email: '', nickname: '', password: '' })
const result = ref<RegistrationResult | null>(null)
const errorMessage = ref('')
const saving = ref(false)
const resending = ref(false)

async function submit() {
  saving.value = true
  errorMessage.value = ''
  try {
    result.value = await $fetch<RegistrationResult>('/api/auth/register', { method: 'POST', body: form })
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Registrácia sa nepodarila.')
  }
  finally {
    saving.value = false
  }
}

async function resend() {
  if (!result.value) return
  resending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch<{ message: string; developmentVerificationUrl?: string }>('/api/auth/resend-verification', {
      method: 'POST',
      body: { email: result.value.email },
    })
    result.value.message = response.message
    result.value.emailSent = true
    result.value.developmentVerificationUrl = response.developmentVerificationUrl
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'E-mail sa nepodarilo odoslať znova.')
  }
  finally {
    resending.value = false
  }
}
</script>

<template>
  <main class="login-page">
    <div class="login-card register-card">
      <template v-if="result">
        <div class="login-logo success-mark"><AppIcon name="check" :size="30" /></div>
        <p class="eyebrow gold">Ešte jeden krok</p>
        <h1>Potvrďte<br><em>e-mail</em></h1>
        <p class="muted">{{ result.message }}</p>
        <p class="verification-email">{{ result.email }}</p>
        <a v-if="result.developmentVerificationUrl" class="primary-button full" :href="result.developmentVerificationUrl">Otvoriť vývojový overovací odkaz</a>
        <button class="secondary-button full" :disabled="resending" @click="resend">{{ resending ? 'Odosielam…' : 'Poslať odkaz znova' }}</button>
        <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
        <p class="auth-switch"><NuxtLink to="/login">Späť na prihlásenie</NuxtLink></p>
      </template>
      <template v-else>
        <div class="login-logo">V</div>
        <p class="eyebrow gold">Vytvorte si vlastnú pivnicu</p>
        <h1>Nový<br><em>účet</em></h1>
        <p class="muted">Po registrácii vám pošleme e-mail s odkazom na jej potvrdenie.</p>
        <form @submit.prevent="submit">
          <label>
            Prezývka
            <input v-model="form.nickname" autocomplete="nickname" required>
          </label>
          <label>
            E-mail
            <input v-model="form.email" type="email" autocomplete="email" required>
          </label>
          <label>
            Heslo
            <input v-model="form.password" type="password" autocomplete="new-password" required>
          </label>
          <p class="form-hint">Heslo môže byť ľubovoľné, nesmie však zostať prázdne.</p>
          <p v-if="errorMessage" class="form-error">{{ errorMessage }}</p>
          <button class="primary-button" :disabled="saving">{{ saving ? 'Registrujem…' : 'Vytvoriť účet' }}</button>
        </form>
        <p class="auth-switch">Už máte účet? <NuxtLink to="/login">Prihlásiť sa</NuxtLink></p>
      </template>
    </div>
  </main>
</template>
