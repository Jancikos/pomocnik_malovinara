<script setup lang="ts">
import { StavSarze, TypZasahu, nazvyZasahov } from '~~/shared/domain'

const route = useRoute()
const id = computed(() => String(route.params.id))
const rawType = computed(() => String(route.params.type || '').toUpperCase())
const typZasahu = computed<TypZasahu | null>(() => Object.values(TypZasahu).includes(rawType.value as TypZasahu) ? rawType.value as TypZasahu : null)
const presunovyTypZasahu = computed<Exclude<TypZasahu, TypZasahu.SIRENIE | TypZasahu.DOSLADZANIE> | null>(() => {
  if (!typZasahu.value || typZasahu.value === TypZasahu.SIRENIE || typZasahu.value === TypZasahu.DOSLADZANIE) return null
  return typZasahu.value as Exclude<TypZasahu, TypZasahu.SIRENIE | TypZasahu.DOSLADZANIE>
})
const { data: sarza, error } = await useSarza(id)

const ikonyZasahov: Record<TypZasahu, string> = {
  [TypZasahu.KVASENIE]: 'sprout',
  [TypZasahu.ODKALENIE]: 'filter',
  [TypZasahu.STACANIE]: 'transfer',
  [TypZasahu.SIRENIE]: 'shield-plus',
  [TypZasahu.DOSLADZANIE]: 'sweetness',
}

const jeSirenie = computed(() => typZasahu.value === TypZasahu.SIRENIE)
const pageTitle = computed(() => typZasahu.value ? 'Pridať zásah: ' + nazvyZasahov[typZasahu.value] : 'Pridať zásah')
const pageDescription = computed(() => jeSirenie.value
  ? 'Zaevidujte pridanú síru bez uzatvorenia šarže.'
  : typZasahu.value === TypZasahu.DOSLADZANIE
    ? 'Zaevidujte cukornatosť a skutočne pridaný cukor.'
    : 'Zásah uzavrie aktuálnu šaržu a vytvorí nové následné šarže.')
</script>

<template>
  <section class="narrow-page">
    <NuxtLink class="back-link" :to="'/sarze/' + id">← Späť na šaržu</NuxtLink>
    <p v-if="error || !typZasahu" class="form-error">Zásah alebo šarža sa nenašli.</p>
    <template v-else-if="sarza">
      <PageHeading
        :eyebrow="sarza.nadoba.name + ' · ' + sarza.nazovVina"
        :title="pageTitle"
        :description="pageDescription"
      />
      <p v-if="sarza.status !== StavSarze.AKTIVNA" class="form-error">Do uzavretej šarže nemožno zapisovať zásahy.</p>
      <ZasahySirenieForm
        v-else-if="typZasahu === TypZasahu.SIRENIE"
        :sarza="sarza"
        :typ-zasahu="TypZasahu.SIRENIE"
        :icon="ikonyZasahov[TypZasahu.SIRENIE]"
      />
      <ZasahyDosladzanieForm
        v-else-if="typZasahu === TypZasahu.DOSLADZANIE"
        :sarza="sarza"
      />
      <ZasahyPresunovyZasahForm
        v-else-if="presunovyTypZasahu"
        :sarza="sarza"
        :typ-zasahu="presunovyTypZasahu"
        :icon="ikonyZasahov[presunovyTypZasahu]"
      />
    </template>
  </section>
</template>