<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ meta: [{ name: 'referrer', content: 'no-referrer' }] })
const route = useRoute()
const auth = useAuth()
const token = String(route.query.token ?? '')
const pending = useCookie<string | null>('pending-cellar-invite', { sameSite: 'lax', maxAge: 86400 })
if (token) pending.value = token
const { data: invitation, error } = await useFetch('/api/invitations', { query: { token } })
const errorMessage = ref('')
const saving = ref(false)
onMounted(async () => { try { await auth.load() } catch { auth.current.value = null } })
async function accept() {
  saving.value = true
  errorMessage.value = ''
  try {
    await $fetch('/api/invitations/accept', { method: 'POST', body: { token } })
    pending.value = null
    await navigateTo('/pivnica', { external: true })
  } catch (error) { errorMessage.value = apiErrorMessage(error, 'Pozvánku sa nepodarilo prijať.') }
  finally { saving.value = false }
}
</script>
<template>
  <main class="login-page">
    <div class="login-card verification-card">
      <div class="login-logo">V</div><p class="eyebrow gold">Pozvánka do pivnice</p>
      <template v-if="invitation">
        <h1>{{ invitation.name }}</h1>
        <p>Pozvánka pre <strong>{{ invitation.email }}</strong></p>
        <p class="muted">{{ invitation.role === 'VIEWER' ? 'Iba na čítanie' : 'Všetky úpravy' }} · Platnosť do {{ new Date(invitation.expiresAt).toLocaleString('sk-SK') }}</p>
        <template v-if="auth.current.value">
          <button v-if="auth.current.value.user.email === invitation.email" class="primary-button full" :disabled="saving" @click="accept">{{ saving ? 'Prijímam…' : 'Prijať pozvánku' }}</button>
          <template v-else><p class="form-error">Ste prihlásení ako {{ auth.current.value.user.email }}. Pozvánka je určená inému emailu.</p><button class="secondary-button full" @click="auth.logout">Prihlásiť sa iným účtom</button></template>
        </template>
        <template v-else>
          <NuxtLink class="primary-button full" :to="{ path: '/login', query: { email: invitation.email } }">Prihlásiť sa</NuxtLink>
          <NuxtLink class="secondary-button full" :to="{ path: '/register', query: { email: invitation.email } }">Vytvoriť účet</NuxtLink>
          <p class="form-hint">Po registrácii potvrďte email. Po prihlásení sa vrátite k pozvánke.</p>
        </template>
      </template>
      <p v-else class="form-error">{{ error ? apiErrorMessage(error, 'Pozvánka je neplatná alebo vypršala. Požiadajte vlastníka o novú.') : 'Načítavam pozvánku…' }}</p>
      <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
      <NuxtLink to="/pivnica" class="back-link" @click="pending = null">Pokračovať bez pozvánky</NuxtLink>
    </div>
  </main>
</template>
