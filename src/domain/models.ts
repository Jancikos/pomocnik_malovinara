export type CatalogCode = string
export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed'
export type BatchLifecycleStatus = 'active' | 'closed'

export interface Wine {
  id: string
  code: string
  name: string
  vintageYear: number
  color: 'white' | 'rose' | 'red' | 'other'
  notes?: string
  createdAt: string
}

export interface BatchContainer {
  label: string
  type: CatalogCode
  material?: string
  capacityLiters: number
  location?: string
  imageKey: string
  notes?: string
}

export interface Batch {
  id: string
  wineId: string
  code: string
  name: string
  status: BatchLifecycleStatus
  phase: CatalogCode
  container: BatchContainer
  currentVolumeLiters: number
  startedAt: string
  closedAt?: string
  closeReason?: 'transfer' | 'split' | 'merge' | 'bottling' | 'other'
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Measurement {
  id: string
  wineId: string
  batchId: string
  type: CatalogCode
  numericValue?: number
  unit?: CatalogCode
  sensoryRating?: CatalogCode
  appearance?: string
  aroma?: string
  taste?: string
  notes?: string
  measuredAt: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  syncStatus: SyncStatus
}

export interface Intervention {
  id: string
  wineId: string
  batchId: string
  type: CatalogCode
  performedAt: string
  substance?: string
  amount?: number
  amountUnit?: CatalogCode
  volumeBeforeLiters?: number
  volumeAfterLiters?: number
  sourceBatchIds?: string[]
  targetBatchIds?: string[]
  lossLiters?: number
  notes?: string
  operationGroupId?: string
  createdAt: string
  updatedAt: string
  deletedAt?: string
  syncStatus: SyncStatus
}

export interface AuditEntry {
  id: string
  entityType: string
  entityId: string
  action: 'create' | 'update' | 'delete'
  changedAt: string
  changedFields: string[]
  before?: Record<string, unknown>
  after?: Record<string, unknown>
  reason?: string
  syncStatus: SyncStatus
}

export interface SyncQueueItem {
  id: string
  idempotencyKey: string
  entityType: string
  entityId: string
  operation: 'create' | 'update' | 'delete' | 'transaction'
  payload: Record<string, unknown>
  dependencyIds: string[]
  status: SyncStatus
  retryCount: number
  lastError?: string
  createdAt: string
  lastAttemptAt?: string
  syncedAt?: string
}

export interface CatalogItem {
  code: string
  label: string
  description?: string
  enabled: boolean
  sortOrder: number
  color?: string
  iconKey?: string
  imageKey?: string
  unitCode?: string
  behavior?: string
  fields?: Array<{
    key: string
    label: string
    inputType: 'text' | 'number' | 'textarea' | 'date' | 'time' | 'select'
    required: boolean
    unitCode?: string
  }>
  validation?: {
    min?: number
    max?: number
    step?: number
    warningMin?: number
    warningMax?: number
  }
  metadata?: Record<string, unknown>
}

export interface CatalogFile {
  catalog: string
  version: number
  items: CatalogItem[]
}

export interface DisplayStatus {
  code: string
  reasons: string[]
}

export type HistoryEvent =
  ({ eventKind: 'measurement' } & Measurement) | ({ eventKind: 'intervention' } & Intervention)
