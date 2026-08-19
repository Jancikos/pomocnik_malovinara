<script setup lang="ts">
const route = useRoute()
const auth = useAuth()
const navigation = [
  { to: '/cellar', label: 'Pivnica', icon: '⌂' },
  { to: '/wines', label: 'Vína', icon: '◉' },
  { to: '/batches', label: 'Šarže', icon: '≋' },
]
</script>

<template>
  <div v-if="route.path === '/login'"><slot /></div>
  <div v-else class="app-shell">
    <header class="topbar">
      <NuxtLink to="/cellar" class="brand"><span class="brand-mark">V</span><span><strong>Vinársky Pomocník</strong><small>{{ auth.current.value?.cellar.name }}</small></span></NuxtLink>
      <button class="ghost-button" @click="auth.logout">Odhlásiť</button>
    </header>
    <main class="page-content"><slot /></main>
    <nav class="bottom-nav" aria-label="Hlavná navigácia">
      <NuxtLink v-for="item in navigation" :key="item.to" :to="item.to" :class="{ active: route.path.startsWith(item.to) }"><span>{{ item.icon }}</span>{{ item.label }}</NuxtLink>
    </nav>
  </div>
</template>
