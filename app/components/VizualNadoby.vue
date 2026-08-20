<script setup lang="ts">
import { obrazkyTypovNadob, type TypNadoby } from '~~/shared/domain'
const props = defineProps<{ type: TypNadoby; compact?: boolean }>()
const source = computed(() => `/assets/nadoby/${obrazkyTypovNadob[props.type]}.webp`)
</script>
<template><div class="nadoba-visual" :class="{ compact }"><img :src="source" alt="Vínna nádoba" /></div></template>