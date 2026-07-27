<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ imageKey: string; compact?: boolean }>()

const vesselImages: Record<string, { src: string; alt: string }> = {
  barrel: { src: '/assets/vessels/oak-barrel.webp', alt: 'Drevený vínny sud' },
  tank: { src: '/assets/vessels/steel-tank.webp', alt: 'Nerezový vínny tank' },
  steel_tank: { src: '/assets/vessels/steel-tank.webp', alt: 'Nerezový vínny tank' },
  demijohn: { src: '/assets/vessels/demijohn.webp', alt: 'Sklenený demižón' },
  vat: { src: '/assets/vessels/plastic-vat.webp', alt: 'Plastová vinárska kaďa' },
  plastic_vat: { src: '/assets/vessels/plastic-vat.webp', alt: 'Plastová vinárska kaďa' },
  'plastic-barrel': { src: '/assets/vessels/plastic-barrel.webp', alt: 'Plastový vinársky sud' },
  plastic_barrel: { src: '/assets/vessels/plastic-barrel.webp', alt: 'Plastový vinársky sud' },
  bottle: { src: '/assets/vessels/wine-bottles.webp', alt: 'Fľaše vína' },
}

const fallbackVessel = { src: '/assets/vessels/steel-tank.webp', alt: 'Nerezový vínny tank' }
const vessel = computed(() => vesselImages[props.imageKey] ?? fallbackVessel)
</script>

<template>
  <div class="container-visual" :class="{ compact }" :data-kind="imageKey">
    <div class="vessel-shine"></div>
    <img class="vessel-image" :src="vessel.src" :alt="vessel.alt" loading="eager" decoding="async" />
  </div>
</template>