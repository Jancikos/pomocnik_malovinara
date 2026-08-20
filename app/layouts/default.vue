<script setup lang="ts">
const route = useRoute()
const auth = useAuth()
const { data: dataPivnice } = await usePivnica()

const navigation = [
  { to: '/pivnica', label: 'Pivnica', subtitle: 'Aktívne šarže', icon: 'home' },
  { to: '/vina', label: 'Vína', subtitle: 'Portfólio pivnice', icon: 'vino' },
  { to: '/sarze', label: 'Šarže', subtitle: 'Výrobný cyklus', icon: 'sarze' },
]

const pageTitle = computed(() => {
  if (route.path.startsWith('/vina')) return 'Vína'
  if (route.path.startsWith('/sarze')) return 'Šarže'
  return 'Pivnica'
})

const initials = computed(() => auth.current.value?.user.name
  .split(' ')
  .map((part) => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase() || 'VP')
</script>

<template>
  <div class="app-shell">
    <aside class="sidebar">
      <NuxtLink to="/pivnica" class="brand sidebar-brand">
        <span class="brand-mark">V</span>
        <span><strong>Vinársky</strong><small>Pomocník</small></span>
      </NuxtLink>

      <section class="pivnica-switcher">
        <p class="eyebrow gold">Aktívna pivnica</p>
        <strong>{{ auth.current.value?.pivnica.name || 'Moja pivnica' }}</strong>
        <small>
          {{ dataPivnice?.summary.aktivneSarze || 0 }} šarží ·
          {{ dataPivnice?.summary.totalVolume.toLocaleString('sk-SK') || 0 }} l
        </small>
      </section>

      <p class="nav-label">Prehľad</p>
      <nav class="side-nav" aria-label="Hlavná navigácia">
        <NuxtLink
          v-for="item in navigation"
          :key="item.to"
          :to="item.to"
          :class="{ active: route.path.startsWith(item.to) }"
        >
          <AppIcon :name="item.icon" :size="22" />
          <span><strong>{{ item.label }}</strong><small>{{ item.subtitle }}</small></span>
        </NuxtLink>
      </nav>

      <div class="sidebar-footer">
        <div class="connection-state">
          <span class="online-dot" />
          <span><strong>Pripojené</strong><small>Serverová databáza</small></span>
        </div>
        <div class="user-card">
          <span class="user-avatar">{{ initials }}</span>
          <span>
            <strong>{{ auth.current.value?.user.name }}</strong>
            <small>{{ auth.current.value?.user.email }}</small>
          </span>
          <button class="icon-button subtle" aria-label="Odhlásiť" title="Odhlásiť" @click="auth.logout">
            <AppIcon name="logout" />
          </button>
        </div>
      </div>
    </aside>

    <div class="workspace">
      <header class="topbar">
        <div>
          <small>Vinársky Pomocník</small>
          <strong>{{ pageTitle }}</strong>
        </div>
        <div class="topbar-actions">
          <span class="online-chip"><span class="online-dot" /> Online</span>
          <button class="icon-button subtle" aria-label="Odhlásiť" title="Odhlásiť" @click="auth.logout">
            <AppIcon name="logout" />
          </button>
        </div>
      </header>
      <main class="page-content"><slot /></main>
    </div>

    <nav class="bottom-nav" aria-label="Mobilná navigácia">
      <NuxtLink
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :class="{ active: route.path.startsWith(item.to) }"
      >
        <AppIcon :name="item.icon" :size="21" />
        {{ item.label }}
      </NuxtLink>
    </nav>
  </div>
</template>
