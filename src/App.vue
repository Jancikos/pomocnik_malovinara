<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'
import AppShell from '@/components/AppShell.vue'

const store = useAppStore()
onMounted(() => store.initialize())
</script>

<template>
  <div v-if="!store.ready" class="loading-screen">
    <span class="brand-mark">V</span>
    <p>Otváram pivnicu…</p>
  </div>
  <AppShell v-else />
</template>
