<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { formatDateTime } from '@/shared/formatting'
import IconGlyph from './IconGlyph.vue'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const showNavigation = computed(() => route.name !== 'login')

function signOut() {
  if (store.logout()) void router.push('/prihlasenie')
}
</script>

<template>
  <div v-if="showNavigation" class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">V</span>
        <span><strong>Vinársky</strong><small>Pomocník</small></span>
      </RouterLink>
      <div class="topbar-actions">
        <button
          class="connection-pill"
          :class="{ offline: !store.online }"
          @click="store.synchronize"
        >
          <span class="connection-dot"></span>
          {{ store.online ? 'Online' : 'Offline' }}
          <b v-if="store.pendingCount">{{ store.pendingCount }}</b>
        </button>
        <button class="icon-button" aria-label="Odhlásiť sa" @click="signOut">
          <IconGlyph name="logout" />
        </button>
      </div>
    </header>
    <div v-if="store.pendingCount || store.error" class="sync-strip">
      <span>
        {{ store.error || `${store.pendingCount} záznamov čaká na odoslanie` }}
        <small v-if="store.lastSyncAt">Naposledy {{ formatDateTime(store.lastSyncAt) }}</small>
      </span>
      <button @click="store.synchronize">
        {{ store.syncing ? 'Odosielam…' : 'Synchronizovať' }}
      </button>
    </div>
    <main class="page-content">
      <RouterView />
    </main>
    <nav class="bottom-nav" aria-label="Hlavná navigácia">
      <RouterLink to="/" :class="{ active: route.name === 'cellar' || route.name === 'batch' }">
        <IconGlyph name="home" />Pivnica
      </RouterLink>
      <RouterLink to="/merania" :class="{ active: route.name === 'measurements' }">
        <IconGlyph name="measurements" />Merania
      </RouterLink>
      <RouterLink to="/historia" :class="{ active: route.name === 'history' }">
        <IconGlyph name="history" />História
      </RouterLink>
    </nav>
  </div>
  <RouterView v-else />
</template>
