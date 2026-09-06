<script setup lang="ts">
import { CELLAR_LOGO_MAX_BYTES } from '~~/shared/constants/cellar-logo'

const cellarFetch = useCellarFetch()
const auth = useAuth()
const saving = ref(false)
const errorMessage = ref('')
const message = ref('')
const developmentUrl = ref('')
const logoFileName = ref('')
const readingLogo = ref(false)
const form = reactive({ name: auth.current.value?.pivnica.name ?? '', logo: auth.current.value?.pivnica.logo ?? null as string | null,
  defaultContainerLocation: auth.current.value?.preferences.defaultContainerLocation ?? '' })
const invite = reactive({ email: '', role: 'VIEWER' })
const { data: sharing, refresh } = await useFetch('/api/cellars/sharing', { immediate: auth.isOwner.value })
async function run(action: () => Promise<void>) {
  saving.value = true
  errorMessage.value = ''
  message.value = ''
  try { await action() }
  catch (error) { errorMessage.value = apiErrorMessage(error, 'Zmenu sa nepodarilo uložiť.') }
  finally { saving.value = false }
}
async function save() {
  if (readingLogo.value) return
  await run(async () => {
    await cellarFetch('/api/pivnica', { method: 'PUT', body: form })
    await auth.load()
    await refreshNuxtData('prehlad-pivnice')
    message.value = 'Nastavenia pivnice boli uložené.'
  })
}
async function upload(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''
  errorMessage.value = ''
  message.value = ''
  if (file.size > CELLAR_LOGO_MAX_BYTES) {
    errorMessage.value = 'Logo je väčšie ako 10 MB.'
    return
  }
  const reader = new FileReader()
  readingLogo.value = true
  reader.onload = () => { form.logo = String(reader.result); logoFileName.value = file.name }
  reader.onerror = () => { errorMessage.value = 'Obrázok sa nepodarilo načítať.' }
  reader.onloadend = () => { readingLogo.value = false }
  reader.readAsDataURL(file)
}
function removeLogo() {
  form.logo = null
  logoFileName.value = ''
  errorMessage.value = ''
  message.value = ''
}
async function sendInvite() {
  developmentUrl.value = ''
  await run(async () => {
    const result = await cellarFetch('/api/cellars/invite', { method: 'POST', body: invite })
    developmentUrl.value = result.developmentUrl ?? ''
    message.value = developmentUrl.value ? 'Vývojová pozvánka bola vytvorená; email sa v tomto režime neposiela.' : 'Pozvánka bola odoslaná. Platí 24 hodín.'
    invite.email = ''
    await refresh()
  })
}
async function changeAccess(body: Record<string, unknown>) {
  await run(async () => {
    await cellarFetch('/api/cellars/sharing', { method: 'PUT', body })
    await refresh()
    message.value = 'Zdieľanie bolo aktualizované.'
  })
}
</script>
<template>
  <section class="narrow-page account-page cellar-settings">
    <NuxtLink class="back-link" to="/pivnica">← Späť na pivnicu</NuxtLink>
    <PageHeading eyebrow="Pivnica" title="Nastavenia pivnice" description="Údaje pivnice, logo a prístup ďalších používateľov." />
    <p v-if="errorMessage" class="form-error" role="alert">{{ errorMessage }}</p>
    <p v-if="message" class="form-success" role="status">{{ message }}</p>
    <form class="panel form-grid elevated-form" @submit.prevent="save">
      <label class="span-2">Názov pivnice<input v-model="form.name" required :disabled="!auth.canEdit.value"></label>
      <label class="span-2">Predvolené umiestnenie sudov a nádob<input v-model="form.defaultContainerLocation" :disabled="!auth.canEdit.value" placeholder="Napr. Hlavná miestnosť"><span class="form-hint">Predvyplní sa pri novej šarži a pri presune do novej nádoby.</span></label>
      <div class="span-2 logo-field">
        <label v-if="auth.canEdit.value" for="cellar-logo-file">Logo pivnice</label>
        <label v-if="auth.canEdit.value" class="logo-upload" :class="{ 'is-disabled': readingLogo || saving }" :aria-busy="readingLogo">
          <input id="cellar-logo-file" class="logo-upload-input" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Vybrať logo pivnice" aria-describedby="cellar-logo-hint" :disabled="readingLogo || saving" @change="upload">
          <span class="logo-upload-preview">
            <img v-if="form.logo" :src="form.logo" alt="Náhľad loga pivnice">
            <AppIcon v-else name="plus" :size="28" />
          </span>
          <span class="logo-upload-content">
            <strong>{{ readingLogo ? 'Načítavam obrázok…' : form.logo ? 'Zmeniť obrázok' : 'Vybrať obrázok' }}</strong>
            <span class="logo-upload-filename">{{ logoFileName || (form.logo ? 'Aktuálne logo pivnice' : 'Pridajte vlastné logo pivnice') }}</span>
            <span id="cellar-logo-hint" class="form-hint">PNG, JPEG alebo WebP · najviac 10 MB</span>
          </span>
        </label>
        <img v-else-if="form.logo" :src="form.logo" class="cellar-logo-preview" alt="Logo pivnice">
        <button v-if="form.logo && auth.canEdit.value" type="button" class="ghost-button logo-remove" :disabled="readingLogo || saving" @click="removeLogo">Odstrániť logo</button>
      </div>
      <button v-if="auth.canEdit.value" class="primary-button span-2" :disabled="saving || readingLogo">{{ saving ? 'Ukladám…' : 'Uložiť nastavenia' }}</button>
      <p v-else class="muted span-2">Do tejto pivnice máte prístup iba na čítanie.</p>
    </form>
    <template v-if="auth.isOwner.value">
      <h2>Zdieľanie pivnice</h2>
      <form class="panel form-grid elevated-form" @submit.prevent="sendInvite">
        <label class="span-2">Email pozvaného používateľa<input v-model="invite.email" type="email" required autocomplete="email"></label>
        <label class="span-2">Oprávnenie<select v-model="invite.role"><option value="VIEWER">Iba na čítanie</option><option value="MEMBER">Všetky úpravy</option></select></label>
        <p class="form-hint span-2">Pozvánka platí 24 hodín a iba pre uvedený email. Nový používateľ sa najprv zaregistruje a overí svoj email. Zdieľanie spravuje iba vlastník.</p>
        <button class="primary-button span-2" :disabled="saving">Odoslať pozvánku</button>
      </form>
      <a v-if="developmentUrl" :href="developmentUrl" class="gold">Otvoriť vývojovú pozvánku</a>
      <h3>Používatelia s prístupom</h3>
      <div v-for="member in sharing?.members" :key="member.id" class="panel sharing-row">
        <div><strong>{{ member.nickname }}</strong><small>{{ member.email }}</small></div>
        <span v-if="member.role === 'OWNER'">Vlastník</span>
        <template v-else>
          <select :value="member.role" :disabled="saving" :aria-label="`Oprávnenie pre ${member.email}`" @change="changeAccess({ userId: member.id, role: ($event.target as HTMLSelectElement).value })"><option value="VIEWER">Iba na čítanie</option><option value="MEMBER">Všetky úpravy</option></select>
          <button class="danger-button" :disabled="saving" @click="changeAccess({ userId: member.id, remove: true })">Odobrať prístup</button>
        </template>
      </div>
      <h3>Pozvánky</h3>
      <p v-if="!sharing?.invitations.length" class="muted">Žiadne čakajúce pozvánky.</p>
      <div v-for="invitation in sharing?.invitations" :key="invitation.id" class="panel sharing-row">
        <div><strong>{{ invitation.email }}</strong><small>{{ invitation.role === 'VIEWER' ? 'Iba na čítanie' : 'Všetky úpravy' }} · Platnosť do {{ new Date(invitation.expiresAt).toLocaleString('sk-SK') }}</small></div>
        <button class="ghost-button" :disabled="saving" @click="changeAccess({ invitationId: invitation.id })">Zrušiť pozvánku</button>
      </div>
    </template>
  </section>
</template>
