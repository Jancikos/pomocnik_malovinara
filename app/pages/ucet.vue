<script setup lang="ts">
import type { AuthState } from '~/composables/useAuth'

const auth = useAuth()
const saving = ref(false)
const saved = ref(false)
const errorMessage = ref('')

const form = reactive({
  nickname: auth.current.value?.user.nickname ?? '',
  cellarName: auth.current.value?.pivnica.name ?? '',
  defaultContainerLocation: auth.current.value?.preferences.defaultContainerLocation ?? '',
})

async function save() {
  saving.value = true
  saved.value = false
  errorMessage.value = ''
  try {
    const result = await $fetch<AuthState>('/api/account', { method: 'PUT', body: form })
    auth.updateCurrent(result)
    saved.value = true
  }
  catch (error) {
    errorMessage.value = apiErrorMessage(error, 'Nastavenia účtu sa nepodarilo uložiť.')
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <section class="narrow-page account-page">
    <PageHeading
      eyebrow="Osobné nastavenia"
      title="Detail účtu"
      description="Upravte údaje zobrazované v aplikácii a predvolenú miestnosť nových nádob."
    />
    <form class="panel form-grid elevated-form" @submit.prevent="save">
      <div class="span-2 account-identity">
        <span class="user-avatar account-avatar">{{ form.nickname.slice(0, 2).toUpperCase() || 'VP' }}</span>
        <div>
          <strong>{{ auth.current.value?.user.nickname }}</strong>
          <small>{{ auth.current.value?.user.email }}</small>
        </div>
      </div>
      <label class="span-2">
        E-mail
        <input :value="auth.current.value?.user.email" type="email" disabled>
      </label>
      <label class="span-2">
        Prezývka
        <input v-model="form.nickname" required>
      </label>
      <label class="span-2">
        Názov pivnice
        <input v-model="form.cellarName" required>
      </label>
      <label class="span-2">
        Predvolené umiestnenie sudov a nádob
        <input v-model="form.defaultContainerLocation" placeholder="Napr. Hlavná miestnosť">
        <span class="form-hint">Túto hodnotu predvyplníme pri zakladaní novej šarže a pri presune do novej nádoby.</span>
      </label>
      <p v-if="errorMessage" class="form-error span-2">{{ errorMessage }}</p>
      <p v-else-if="saved" class="form-success span-2">Nastavenia boli uložené.</p>
      <button class="primary-button span-2" :disabled="saving"><AppIcon name="check" /> {{ saving ? 'Ukladám…' : 'Uložiť nastavenia' }}</button>
    </form>
  </section>
</template>
