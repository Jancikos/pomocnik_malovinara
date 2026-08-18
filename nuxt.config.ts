export default defineNuxtConfig({
  compatibilityDate: '2026-07-15',
  devtools: { enabled: false },
  app: {
    head: {
      title: 'Vinársky Pomocník',
      meta: [{ name: 'description', content: 'Evidencia vín, nádob, šarží, meraní a presunov pre malovinára.' }],
    },
  },
  css: ['~/assets/styles.css'],
  runtimeConfig: {
    databaseUrl: process.env.DATABASE_URL || './data/dev.sqlite',
  },
  nitro: {
    preset: 'node-server',
    externals: { external: ['better-sqlite3'] },
  },
  typescript: { typeCheck: true, strict: true },
})