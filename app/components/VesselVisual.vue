<script setup lang="ts">
import { vesselTypeImages, type VesselType } from '~~/shared/domain'
const props = defineProps<{ type: VesselType; compact?: boolean }>()
const source = computed(() => `/assets/vessels/${vesselTypeImages[props.type]}.webp`)
</script>
<template><div class="vessel-visual" :class="{ compact }"><img :src="source" alt="Vínna nádoba" /></div></template>