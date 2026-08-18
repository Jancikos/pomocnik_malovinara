import { sql } from 'drizzle-orm'
import { index, integer, primaryKey, real, sqliteTable, text, uniqueIndex, type AnySQLiteColumn } from 'drizzle-orm/sqlite-core'
import type { BatchPhase, BatchStatus, InterventionType, MeasurementType, VesselType, WineColor } from '../../shared/domain'

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

export const cellars = sqliteTable('cellars', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  ...timestamps,
})

export const cellarMembers = sqliteTable('cellar_members', {
  cellarId: text('cellar_id').notNull().references(() => cellars.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role', { enum: ['OWNER', 'MEMBER'] }).notNull().default('MEMBER'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [primaryKey({ columns: [table.cellarId, table.userId] })])

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [index('sessions_user_idx').on(table.userId)])

export const wines = sqliteTable('wines', {
  id: text('id').primaryKey(),
  cellarId: text('cellar_id').notNull().references(() => cellars.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  code: text('code').notNull(),
  vintageYear: integer('vintage_year').notNull(),
  color: text('color').$type<WineColor>().notNull(),
  notes: text('notes'),
  ...timestamps,
}, (table) => [
  uniqueIndex('wines_cellar_code_unique').on(table.cellarId, table.code),
  uniqueIndex('wines_cellar_name_year_unique').on(table.cellarId, table.name, table.vintageYear),
])

export const wineSourceMaterials = sqliteTable('wine_source_materials', {
  id: text('id').primaryKey(),
  wineId: text('wine_id').notNull().references(() => wines.id, { onDelete: 'restrict' }),
  grapeVariety: text('grape_variety').notNull(),
  percentage: real('percentage').notNull(),
  weightKg: real('weight_kg'),
  volumeLiters: real('volume_liters'),
  harvestSugar: real('harvest_sugar'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [index('source_materials_wine_idx').on(table.wineId)])

export const vessels = sqliteTable('vessels', {
  id: text('id').primaryKey(),
  cellarId: text('cellar_id').notNull().references(() => cellars.id, { onDelete: 'restrict' }),
  name: text('name').notNull(),
  type: text('type').$type<VesselType>().notNull(),
  capacity: real('capacity').notNull(),
  location: text('location'),
  ...timestamps,
}, (table) => [uniqueIndex('vessels_cellar_name_unique').on(table.cellarId, table.name)])

export const batches = sqliteTable('batches', {
  id: text('id').primaryKey(),
  cellarId: text('cellar_id').notNull().references(() => cellars.id, { onDelete: 'restrict' }),
  wineId: text('wine_id').notNull().references(() => wines.id, { onDelete: 'restrict' }),
  phase: text('phase').$type<BatchPhase>().notNull(),
  vesselId: text('vessel_id').notNull().references(() => vessels.id, { onDelete: 'restrict' }),
  parentBatchId: text('parent_batch_id').references((): AnySQLiteColumn => batches.id, { onDelete: 'restrict' }),
  volume: real('volume').notNull(),
  status: text('status').$type<BatchStatus>().notNull(),
  openedAt: integer('opened_at', { mode: 'timestamp_ms' }).notNull(),
  closedAt: integer('closed_at', { mode: 'timestamp_ms' }),
  ...timestamps,
}, (table) => [
  index('batches_cellar_status_idx').on(table.cellarId, table.status),
  index('batches_wine_idx').on(table.wineId),
  index('batches_parent_idx').on(table.parentBatchId),
  index('batches_vessel_status_idx').on(table.vesselId, table.status),
])

export const measurements = sqliteTable('measurements', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').notNull().references(() => batches.id, { onDelete: 'restrict' }),
  type: text('type').$type<MeasurementType>().notNull(),
  value: real('value').notNull(),
  unit: text('unit').notNull(),
  measuredAt: integer('measured_at', { mode: 'timestamp_ms' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [index('measurements_batch_type_date_idx').on(table.batchId, table.type, table.measuredAt)])

export const interventions = sqliteTable('interventions', {
  id: text('id').primaryKey(),
  batchId: text('batch_id').notNull().references(() => batches.id, { onDelete: 'restrict' }),
  type: text('type').$type<InterventionType>().notNull(),
  performedAt: integer('performed_at', { mode: 'timestamp_ms' }).notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [index('interventions_batch_date_idx').on(table.batchId, table.performedAt)])

export const transfers = sqliteTable('transfers', {
  id: text('id').primaryKey(),
  cellarId: text('cellar_id').notNull().references(() => cellars.id, { onDelete: 'restrict' }),
  sourceBatchId: text('source_batch_id').notNull().references(() => batches.id, { onDelete: 'restrict' }),
  lossVolume: real('loss_volume').notNull(),
  targetPhase: text('target_phase').$type<BatchPhase>().notNull(),
  performedAt: integer('performed_at', { mode: 'timestamp_ms' }).notNull(),
  createdBy: text('created_by').notNull().references(() => users.id, { onDelete: 'restrict' }),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [uniqueIndex('transfers_source_unique').on(table.sourceBatchId)])

export const transferDestinations = sqliteTable('transfer_destinations', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id').notNull().references(() => transfers.id, { onDelete: 'restrict' }),
  vesselId: text('vessel_id').notNull().references(() => vessels.id, { onDelete: 'restrict' }),
  volume: real('volume').notNull(),
  createdBatchId: text('created_batch_id').notNull().references(() => batches.id, { onDelete: 'restrict' }),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull().default(sql`(unixepoch() * 1000)`),
}, (table) => [
  uniqueIndex('transfer_destinations_transfer_vessel_unique').on(table.transferId, table.vesselId),
  uniqueIndex('transfer_destinations_batch_unique').on(table.createdBatchId),
])