<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'

const store = useAppStore()
const router = useRouter()
const email = ref('oskar@example.sk')
const password = ref('vino2026')
const showPassword = ref(false)

function submit() {
  if (store.login(email.value, password.value)) void router.replace('/')
}
</script>

<template>
  <main class="login-page">
    <div class="login-atmosphere"></div>
    <section class="login-card">
      <div class="login-logo">V</div>
      <p class="eyebrow gold">Vitajte vo svojej pivnici</p>
      <h1>Vinársky<br /><em>Pomocník</em></h1>
      <p class="login-intro">Majte každú šaržu, meranie aj zásah bezpečne pod kontrolou.</p>
      <form @submit.prevent="submit">
        <label>
          E-mail
          <input v-model="email" type="email" autocomplete="username" required />
        </label>
        <label>
          Heslo
          <span class="password-field">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              required
            />
            <button type="button" @click="showPassword = !showPassword">
              {{ showPassword ? 'Skryť' : 'Ukázať' }}
            </button>
          </span>
        </label>
        <p v-if="store.error" class="form-error" role="alert">{{ store.error }}</p>
        <button class="primary-button full" type="submit">Vstúpiť do pivnice <span>→</span></button>
      </form>
      <div class="demo-credentials">
        <span>Demo účet</span>
        <strong>oskar@example.sk</strong>
        <strong>vino2026</strong>
      </div>
      <p class="security-note">Simulované prihlásenie pre lokálny prototyp. Heslo sa neukladá.</p>
    </section>
  </main>
</template>
