<script setup lang="ts">
import IconGlyph from '@/components/IconGlyph.vue'
</script>

<template>
  <section class="placeholder-view">
    <div class="placeholder-icon"><IconGlyph name="measurements" /></div>
    <p class="eyebrow gold">Merania</p>
    <h1>Prehľad meraní bude doplnený v ďalšej verzii.</h1>
    <p>Nové meranie môžete zatiaľ pridať priamo v detaile konkrétnej šarže.</p>
    <RouterLink class="primary-button" to="/">Otvoriť pivnicu</RouterLink>
  </section>
</template>