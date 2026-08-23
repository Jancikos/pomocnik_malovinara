<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const state = ref<'loading' | 'success' | 'error'>('loading')
const message = ref('Overujeme vašu e-mailovú adresu…')

onMounted(async () => {
  const token = String(route.query.token ?? '')
  if (!token) {
    state.value = 'error'
    message.value = 'V odkaze chýba overovací kód.'
    return
  }
  try {
    const response = await $fetch<{ message: string }>('/api/auth/verify-email', { method: 'POST', body: { token } })
    state.value = 'success'
    message.value = response.message
  }
  catch (error) {
    state.value = 'error'
    message.value = apiErrorMessage(error, 'E-mail sa nepodarilo potvrdiť.')
  }
})
</script>

<template>
  <main class="login-page">
    <div class="login-card verification-card">
      <div class="login-logo" :class="{ 'success-mark': state === 'success' }">
        <AppIcon v-if="state !== 'loading'" :name="state === 'success' ? 'check' : 'close'" :size="30" />
        <span v-else class="loading-dot">V</span>
      </div>
      <p class="eyebrow gold">Overenie registrácie</p>
      <h1 v-if="state === 'loading'">Chvíľku<br><em>prosím</em></h1>
      <h1 v-else-if="state === 'success'">E-mail<br><em>potvrdený</em></h1>
      <h1 v-else>Odkaz<br><em>neplatí</em></h1>
      <p class="muted">{{ message }}</p>
      <NuxtLink v-if="state === 'success'" class="primary-button full" to="/login">Prejsť na prihlásenie</NuxtLink>
      <NuxtLink v-else-if="state === 'error'" class="secondary-button full" to="/register">Späť na registráciu</NuxtLink>
    </div>
  </main>
</template>
