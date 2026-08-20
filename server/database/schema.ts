import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { FazaSarze, StavSarze, TypZasahu, TypMerania, TypNadoby, FarbaVina } from '../../shared/domain'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  ...timestamps,
})

export const pivnice = sqliteTable('pivnice', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ...timestamps,
})

export const clenoviaPivnice = sqliteTable('pivnica_members', {
  pivnicaId: text('pivnica_id').notNull().references(() => pivnice.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['OWNER', 'MEMBER'] }).notNull().default('MEMBER'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [primaryKey({ columns: [table.pivnicaId, table.userId] })])

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [index('sessions_user_idx').on(table.userId)])

export const vina = sqliteTable('vina', {
  id: text('id').primaryKey(),
  pivnicaId: text('pivnica_id').notNull().references(() => pivnice.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  rocnik: integer('rocnik').notNull(),
  color: text('color').$type<FarbaVina>().notNull(),
  notes: text('notes'),
  ...timestamps,
}, (table) => [
  uniqueIndex('vina_pivnica_code_year_unique').on(table.pivnicaId, table.code, table.rocnik),
  uniqueIndex('vina_pivnica_name_year_unique').on(table.pivnicaId, table.name, table.rocnik),
])

export const vstupneSurovinyVina = sqliteTable('vstupne_suroviny_vina', {
  id: text('id').primaryKey(),
  vinoId: text('vino_id').notNull().references(() => vina.id, { onDelete: 'restrict' }),
  odrodaHrozna: text('odroda_hrozna').notNull(),
  percentage: real('percentage').notNull(),
  weightKg: real('weight_kg'),
  volumeLiters: real('volume_liters'),
  cukornatostPriZbere: real('cukornatost_pri_zbere'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [index('vstupne_suroviny_vino_idx').on(table.vinoId)])

export const sarze = sqliteTable('sarze', {
  id: text('id').primaryKey(),
  pivnicaId: text('pivnica_id').notNull().references(() => pivnice.id, { onDelete: 'restrict' }),
  vinoId: text('vino_id').notNull().references(() => vina.id, { onDelete: 'restrict' }),
  faza: text('faza').$type<FazaSarze>().notNull(),
  nazovNadoby: text('nazov_nadoby').notNull(),
  typNadoby: text('typ_nadoby').$type<TypNadoby>().notNull(),
  kapacitaNadoby: real('kapacita_nadoby').notNull(),
  umiestnenieNadoby: text('umiestnenie_nadoby'),
  rodicovskaSarzaId: text('rodicovska_sarza_id').references((): AnySQLiteColumn => sarze.id, { onDelete: 'restrict' }),
  volume: real('volume').notNull(),
  status: text('status').$type<StavSarze>().notNull(),
  openedAt: integer('opened_at', { mode: 'timestamp_ms' }).notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
  ...timestamps,
}, (table) => [
  index('sarze_pivnica_status_idx').on(table.pivnicaId, table.status),
  index('sarze_vino_idx').on(table.vinoId),
  index('sarze_parent_idx').on(table.rodicovskaSarzaId),
  index('sarze_nazov_nadoby_idx').on(table.pivnicaId, table.nazovNadoby),
  uniqueIndex('sarze_one_active_per_nazov_nadoby').on(table.pivnicaId, table.nazovNadoby).where(sql`${table.status} = 'AKTIVNA'`),
])

export const merania = sqliteTable('merania', {
  id: text('id').primaryKey(),
  sarzaId: text('sarza_id').notNull().references(() => sarze.id, { onDelete: 'restrict' }),
  type: text('type').$type<TypMerania>().notNull(),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  zmeraneAt: integer('zmerane_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [index('merania_sarza_type_date_idx').on(table.sarzaId, table.type, table.zmeraneAt)])

export const zasahy = sqliteTable('zasahy', {
  id: text('id').primaryKey(),
  sarzaId: text('sarza_id').notNull().references(() => sarze.id, { onDelete: 'restrict' }),
  type: text('type').$type<TypZasahu>().notNull(),
  vykonaneAt: integer('vykonane_at', { mode: 'timestamp_ms' }).notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [index('zasahy_sarza_date_idx').on(table.sarzaId, table.vykonaneAt)])

export const presuny = sqliteTable('presuny', {
  id: text('id').primaryKey(),
  pivnicaId: text('pivnica_id').notNull().references(() => pivnice.id, { onDelete: 'restrict' }),
  zdrojovaSarzaId: text('zdrojova_sarza_id').notNull().references(() => sarze.id, { onDelete: 'restrict' }),
  lossVolume: real('loss_volume').notNull(),
  cielovaFaza: text('cielova_faza').$type<FazaSarze>().notNull(),
  vykonaneAt: integer('vykonane_at', { mode: 'timestamp_ms' }).notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [uniqueIndex('presuny_source_unique').on(table.zdrojovaSarzaId)])

export const cielePresunu = sqliteTable('ciele_presunov', {
  id: text('id').primaryKey(),
  presunId: text('presun_id').notNull().references(() => presuny.id, { onDelete: 'restrict' }),
  volume: real('volume').notNull(),
  vytvorenaSarzaId: text('vytvorena_sarza_id').notNull().references(() => sarze.id, { onDelete: 'restrict' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [
  uniqueIndex('ciele_presunov_sarza_unique').on(table.vytvorenaSarzaId),
])