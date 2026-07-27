<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { formatDateTime, formatNumber } from '@/shared/formatting'
import IconGlyph from './IconGlyph.vue'

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const sidebarOpen = ref(false)
const showNavigation = computed(() => route.name !== 'login')
const pageTitle = computed(() => {
  const titles: Record<string, string> = {
    cellar: 'Pivnica',
    wines: 'Vína',
    wine: 'Detail vína',
    batch: 'Detail šarže',
    measurements: 'Merania',
    history: 'História',
  }
  return titles[String(route.name)] ?? 'Vinársky Pomocník'
})
const totalVolume = computed(() =>
  store.activeBatches.reduce((sum, batch) => sum + batch.currentVolumeLiters, 0),
)

watch(
  () => route.fullPath,
  () => {
    sidebarOpen.value = false
  },
)

function signOut() {
  if (store.logout()) void router.push('/prihlasenie')
}
</script>

<template>
  <div v-if="showNavigation" class="app-shell" :class="{ 'sidebar-is-open': sidebarOpen }">
    <button
      v-if="sidebarOpen"
      class="sidebar-overlay"
      aria-label="Zavrieť menu"
      @click="sidebarOpen = false"
    ></button>
    <aside class="sidebar" aria-label="Hlavné menu">
      <RouterLink class="sidebar-brand" to="/"
        ><span class="brand-mark">V</span
        ><span><strong>Vinársky</strong><small>Pomocník</small></span></RouterLink
      >
      <div class="sidebar-cellar">
        <p class="eyebrow gold">Aktívna pivnica</p>
        <strong>Oskarova pivnica</strong
        ><span>{{ store.activeBatches.length }} šarží · {{ formatNumber(totalVolume) }} l</span>
      </div>
      <nav class="sidebar-nav">
        <p>Prehľad</p>
        <RouterLink to="/" :class="{ active: route.name === 'cellar' || route.name === 'batch' }"
          ><IconGlyph name="home" /><span>Pivnica<small>Aktívne šarže</small></span></RouterLink
        >
        <RouterLink to="/vina" :class="{ active: route.name === 'wines' || route.name === 'wine' }"
          ><IconGlyph name="wine" /><span
            >Vína<small>{{ store.wines.length }} evidovaných vín</small></span
          ></RouterLink
        >
        <RouterLink to="/merania" :class="{ active: route.name === 'measurements' }"
          ><IconGlyph name="measurements" /><span
            >Merania<small>Kontrola hodnôt</small></span
          ></RouterLink
        >
        <RouterLink to="/historia" :class="{ active: route.name === 'history' }"
          ><IconGlyph name="history" /><span>História<small>Auditná stopa</small></span></RouterLink
        >
      </nav>
      <div class="sidebar-status">
        <span class="connection-dot" :class="{ offline: !store.online }"></span>
        <div>
          <strong>{{ store.online ? 'Pripojené' : 'Offline režim' }}</strong
          ><small v-if="store.lastSyncAt">Sync {{ formatDateTime(store.lastSyncAt) }}</small
          ><small v-else>Lokálne dáta sú pripravené</small>
        </div>
        <b v-if="store.pendingCount">{{ store.pendingCount }}</b>
      </div>
      <div class="sidebar-user">
        <span class="user-avatar">OV</span>
        <div><strong>Oskar Vinár</strong><small>oskar@example.sk</small></div>
        <button aria-label="Odhlásiť sa" @click="signOut"><IconGlyph name="logout" /></button>
      </div>
    </aside>

    <div class="app-main">
      <header class="topbar">
        <div class="topbar-page">
          <button class="menu-button" aria-label="Otvoriť menu" @click="sidebarOpen = true">
            <IconGlyph name="menu" />
          </button>
          <div>
            <span>Vinársky Pomocník</span><strong>{{ pageTitle }}</strong>
          </div>
        </div>
        <div class="topbar-actions">
          <button
            class="connection-pill"
            :class="{ offline: !store.online }"
            @click="store.synchronize"
          >
            <span class="connection-dot"></span>{{ store.online ? 'Online' : 'Offline'
            }}<b v-if="store.pendingCount">{{ store.pendingCount }}</b></button
          ><button class="icon-button topbar-logout" aria-label="Odhlásiť sa" @click="signOut">
            <IconGlyph name="logout" />
          </button>
        </div>
      </header>
      <div v-if="store.pendingCount || store.error" class="sync-strip">
        <span
          >{{ store.error || `${store.pendingCount} záznamov čaká na odoslanie`
          }}<small v-if="store.lastSyncAt"
            >Naposledy {{ formatDateTime(store.lastSyncAt) }}</small
          ></span
        ><button @click="store.synchronize">
          {{ store.syncing ? 'Odosielam…' : 'Synchronizovať' }}
        </button>
      </div>
      <main class="page-content"><RouterView /></main>
    </div>

    <nav class="bottom-nav" aria-label="Rýchla mobilná navigácia">
      <RouterLink to="/" :class="{ active: route.name === 'cellar' || route.name === 'batch' }"
        ><IconGlyph name="home" />Pivnica</RouterLink
      >
      <RouterLink to="/merania" :class="{ active: route.name === 'measurements' }"
        ><IconGlyph name="measurements" />Merania</RouterLink
      >
      <RouterLink to="/historia" :class="{ active: route.name === 'history' }"
        ><IconGlyph name="history" />História</RouterLink
      >
    </nav>
  </div>
  <RouterView v-else />
</template>
