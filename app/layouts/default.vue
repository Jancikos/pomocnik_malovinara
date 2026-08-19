<script setup lang="ts">
const route = useRoute()
const auth = useAuth()
const { data: cellarData } = await useCellar()

const navigation = [
  { to: '/cellar', label: 'Pivnica', subtitle: 'Aktívne šarže', icon: 'home' },
  { to: '/wines', label: 'Vína', subtitle: 'Portfólio pivnice', icon: 'wine' },
  { to: '/batches', label: 'Šarže', subtitle: 'Výrobný cyklus', icon: 'batches' },
]

const pageTitle = computed(() => {
  if (route.path.startsWith('/wines')) return 'Vína'
  if (route.path.startsWith('/batches')) return 'Šarže'
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
      <NuxtLink to="/cellar" class="brand sidebar-brand">
        <span class="brand-mark">V</span>
        <span><strong>Vinársky</strong><small>Pomocník</small></span>
      </NuxtLink>

      <section class="cellar-switcher">
        <p class="eyebrow gold">Aktívna pivnica</p>
        <strong>{{ auth.current.value?.cellar.name || 'Moja pivnica' }}</strong>
        <small>
          {{ cellarData?.summary.activeBatches || 0 }} šarží ·
          {{ cellarData?.summary.totalVolume.toLocaleString('sk-SK') || 0 }} l
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
