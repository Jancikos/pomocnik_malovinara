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
    appUrl: process.env.APP_URL || '',
    smtpHost: process.env.SMTP_HOST || '',
    smtpPort: Number(process.env.SMTP_PORT || 587),
    smtpSecure: process.env.SMTP_SECURE === 'true',
    smtpUser: process.env.SMTP_USER || '',
    smtpPassword: process.env.SMTP_PASSWORD || '',
    emailFrom: process.env.EMAIL_FROM || 'Vinársky Pomocník <noreply@example.com>',
  },
  nitro: {
    preset: 'node-server',
    externals: { external: ['better-sqlite3'] },
  },
  typescript: { typeCheck: true, strict: true },
})